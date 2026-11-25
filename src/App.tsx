import { useEffect, useMemo, useState } from 'react';
import { AD_SLIDES, MOVIES as FALLBACK_MOVIES } from './data/movies';
import { AdSlide, BookingRecord, CategoryTab, Movie, UserProfile } from './types/cinema';
import { Header } from './components/Header';
import { FloatingAdCarousel } from './components/FloatingAdCarousel';
import { MovieGrid } from './components/MovieGrid';
import { Footer } from './components/Footer';
import { BookingModal, PendingCheckoutPayload } from './components/BookingModal';
import { RazorpayDemoModal } from './components/RazorpayDemoModal';
import { CityModal } from './components/CityModal';
import { SignInModal } from './components/SignInModal';
import { MyTicketsModal } from './components/MyTicketsModal';

export default function App() {
  // Light / Dark Theme state (persisted)
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = window.localStorage.getItem('cinnova_theme');
    if (saved) return saved === 'dark';
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    window.localStorage.setItem('cinnova_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // Navigation, search, and city state
  const [activeTab, setActiveTab] = useState<CategoryTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedCity, setSelectedCity] = useState('Gwalior');

  // MovieGlu Catalog State (hydrates via /api/movieglu/* when configured, falls back seamlessly to local catalog)
  const [catalogMovies, setCatalogMovies] = useState<Movie[]>(FALLBACK_MOVIES);
  const [searchResults, setSearchResults] = useState<Movie[] | null>(null);
  const [dataSource, setDataSource] = useState<'movieglu' | 'local'>('local');
  const [isLoadingMovies, setIsLoadingMovies] = useState(false);

  // Modals & User state
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isMyTicketsOpen, setIsMyTicketsOpen] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = window.localStorage.getItem('cinnova_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Booking & Seat Lock / Sold state
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [pendingCheckout, setPendingCheckout] = useState<PendingCheckoutPayload | null>(null);
  const [notifiedIds, setNotifiedIds] = useState<string[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>(() => {
    try {
      const saved = window.localStorage.getItem('cinnova_bookings');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [soldSeatMap, setSoldSeatMap] = useState<Record<string, string[]>>(() => {
    try {
      const saved = window.localStorage.getItem('cinnova_sold_seats');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    window.localStorage.setItem('cinnova_bookings', JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    window.localStorage.setItem('cinnova_sold_seats', JSON.stringify(soldSeatMap));
  }, [soldSeatMap]);

  // Fetch category movies from backend MovieGlu proxy
  useEffect(() => {
    let cancelled = false;
    setIsLoadingMovies(true);

    fetch(
      `/api/movieglu/movies?category=${encodeURIComponent(activeTab)}&city=${encodeURIComponent(selectedCity)}`
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.source === 'movieglu' && Array.isArray(data.movies) && data.movies.length > 0) {
          setCatalogMovies(data.movies);
          setDataSource('movieglu');
        } else {
          setCatalogMovies(FALLBACK_MOVIES);
          setDataSource('local');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCatalogMovies(FALLBACK_MOVIES);
          setDataSource('local');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMovies(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, selectedCity]);

  // Debounced live search via MovieGlu proxy when MovieGlu is active
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || dataSource !== 'movieglu') {
      setSearchResults(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setIsLoadingMovies(true);
      fetch(
        `/api/movieglu/search?q=${encodeURIComponent(q)}&city=${encodeURIComponent(selectedCity)}`
      )
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!cancelled && data?.source === 'movieglu' && Array.isArray(data.movies)) {
            setSearchResults(data.movies);
          }
        })
        .catch(() => {
          if (!cancelled) setSearchResults(null);
        })
        .finally(() => {
          if (!cancelled) setIsLoadingMovies(false);
        });
    }, 320);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery, dataSource, selectedCity]);

  const handleSignIn = (profile: UserProfile) => {
    setUser(profile);
    window.localStorage.setItem('cinnova_user', JSON.stringify(profile));
  };

  const handleSignOut = () => {
    setUser(null);
    window.localStorage.removeItem('cinnova_user');
  };

  const handleToggleNotify = (movieId: string) => {
    setNotifiedIds((prev) =>
      prev.includes(movieId) ? prev.filter((id) => id !== movieId) : [...prev, movieId]
    );
  };

  // Dynamic genre chips extracted from active movie list
  const availableGenres = useMemo(() => {
    const baseList = searchResults ?? catalogMovies;
    const genreSet = new Set<string>();
    baseList.forEach((m) => m.genres.forEach((g) => genreSet.add(g)));
    return ['All', ...Array.from(genreSet)];
  }, [catalogMovies, searchResults]);

  // Reset selected genre if it doesn't exist in newly loaded MovieGlu category
  useEffect(() => {
    if (selectedGenre !== 'All' && !availableGenres.includes(selectedGenre)) {
      setSelectedGenre('All');
    }
  }, [availableGenres, selectedGenre]);

  const filteredMovies = useMemo(() => {
    if (searchResults !== null) {
      return selectedGenre === 'All'
        ? searchResults
        : searchResults.filter((m) => m.genres.includes(selectedGenre));
    }

    let list = [...catalogMovies];

    if (dataSource === 'local') {
      if (activeTab === 'now-showing') {
        list = list.filter((m) => m.status === 'now-showing');
      } else if (activeTab === 'upcoming') {
        list = list.filter((m) => m.status === 'upcoming');
      } else if (activeTab === 'top-rated') {
        list = list.filter((m) => m.rating >= 8.6).sort((a, b) => b.rating - a.rating);
      }
    }

    if (selectedGenre !== 'All') {
      list = list.filter((m) => m.genres.includes(selectedGenre));
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.genres.some((g) => g.toLowerCase().includes(q)) ||
          m.language.toLowerCase().includes(q) ||
          m.cast.some((c) => c.toLowerCase().includes(q)) ||
          m.director.toLowerCase().includes(q)
      );
    }

    return list;
  }, [catalogMovies, searchResults, dataSource, activeTab, selectedGenre, searchQuery]);

  // Dynamic Floating Ad Slides: enrich with live MovieGlu backdrop highlights when available
  const activeAdSlides: AdSlide[] = useMemo(() => {
    if (dataSource === 'movieglu' && catalogMovies.length > 0) {
      const backdropMovies = catalogMovies.filter((m) => m.backdropImage).slice(0, 3);
      if (backdropMovies.length >= 2) {
        return backdropMovies.map((m, idx) => ({
          id: `mg-ad-${m.id}`,
          kicker:
            idx === 0
              ? `Featured in ${selectedCity} · MovieGlu Live`
              : idx === 1
              ? 'Trending in Multiplexes'
              : 'CinNova Luxe Screening',
          title: m.title,
          subtitle: m.synopsis.slice(0, 130) + (m.synopsis.length > 130 ? '...' : ''),
          ctaLabel: m.status === 'upcoming' ? 'Preview Release' : 'Book Seats Now',
          image: m.backdropImage!,
          movieId: m.id,
          promoCode: idx === 2 ? 'CINNOVA20' : undefined,
        }));
      }
    }
    return AD_SLIDES;
  }, [dataSource, catalogMovies, selectedCity]);

  const handleSelectAdSlide = (slide: AdSlide) => {
    if (slide.movieId) {
      const found =
        catalogMovies.find((m) => m.id === slide.movieId) ||
        FALLBACK_MOVIES.find((m) => m.id === slide.movieId) ||
        catalogMovies[0];
      if (found) setSelectedMovie(found);
    }
  };

  const handlePaymentSuccess = (booking: BookingRecord) => {
    setBookings((prev) => [booking, ...prev]);

    if (pendingCheckout) {
      const dateOptionsMap: Record<string, string> = {
        'Wed, 25 Nov': 'today',
        'Thu, 26 Nov': 'tomorrow',
        'Fri, 27 Nov': 'fri',
        'Sat, 28 Nov': 'sat',
      };
      const dateId = dateOptionsMap[pendingCheckout.dateLabel] || 'today';
      const showKey = `${pendingCheckout.movie.id}__${pendingCheckout.city}__${pendingCheckout.theatre.id}__${dateId}__${pendingCheckout.showtime.id}`;
      const newSeatIds = pendingCheckout.seats.map((s) => s.id);

      setSoldSeatMap((prev) => ({
        ...prev,
        [showKey]: Array.from(new Set([...(prev[showKey] || []), ...newSeatIds])),
      }));
    }
  };

  const handleClosePaymentModal = () => {
    setPendingCheckout(null);
    setSelectedMovie(null);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF8F5] text-zinc-900 transition-colors duration-200 dark:bg-[#111114] dark:text-stone-100">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCity={selectedCity}
        onOpenCityModal={() => setIsCityModalOpen(true)}
        user={user}
        onOpenSignIn={() => setIsSignInOpen(true)}
        onSignOut={handleSignOut}
        isDark={isDark}
        onToggleTheme={() => setIsDark((prev) => !prev)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        bookingsCount={bookings.length}
        onOpenMyTickets={() => setIsMyTicketsOpen(true)}
      />

      <main className="flex-1">
        <FloatingAdCarousel
          slides={activeAdSlides}
          onSelectSlide={handleSelectAdSlide}
        />

        <MovieGrid
          movies={filteredMovies}
          activeTab={activeTab}
          selectedCity={selectedCity}
          searchQuery={searchQuery}
          selectedGenre={selectedGenre}
          genres={availableGenres}
          isLoading={isLoadingMovies}
          dataSource={dataSource}
          onSelectGenre={setSelectedGenre}
          onSelectMovie={setSelectedMovie}
          notifiedIds={notifiedIds}
          onToggleNotify={handleToggleNotify}
          onResetFilters={() => {
            setActiveTab('all');
            setSelectedGenre('All');
            setSearchQuery('');
          }}
        />
      </main>

      <Footer
        onSelectTab={setActiveTab}
        onOpenMyTickets={() => setIsMyTicketsOpen(true)}
        onOpenCityModal={() => setIsCityModalOpen(true)}
      />

      <BookingModal
        movie={selectedMovie}
        city={selectedCity}
        soldSeatMap={soldSeatMap}
        isNotified={selectedMovie ? notifiedIds.includes(selectedMovie.id) : false}
        onToggleNotify={handleToggleNotify}
        onClose={() => setSelectedMovie(null)}
        onProceedToPayment={(payload) => setPendingCheckout(payload)}
      />

      <RazorpayDemoModal
        checkout={pendingCheckout}
        user={user}
        onClose={handleClosePaymentModal}
        onPaymentSuccess={handlePaymentSuccess}
      />

      <CityModal
        isOpen={isCityModalOpen}
        selectedCity={selectedCity}
        onSelectCity={setSelectedCity}
        onClose={() => setIsCityModalOpen(false)}
      />

      <SignInModal
        isOpen={isSignInOpen}
        onClose={() => setIsSignInOpen(false)}
        onSignIn={handleSignIn}
      />

      <MyTicketsModal
        isOpen={isMyTicketsOpen}
        bookings={bookings}
        onClose={() => setIsMyTicketsOpen(false)}
      />
    </div>
  );
}
