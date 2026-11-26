import { useEffect, useMemo, useState } from 'react';
import { AD_SLIDES, MOVIES as FALLBACK_MOVIES } from './data/movies';
import { AdSlide, BookingRecord, CategoryTab, Movie, UserProfile } from './types/cinema';
import { Header } from './components/Header';
import { FloatingAdCarousel } from './components/FloatingAdCarousel';
import { MovieGrid } from './components/MovieGrid';
import { Footer } from './components/Footer';
import { BookingModal, PendingCheckoutPayload } from './components/BookingModal';
import { SandboxPaymentModal } from './components/SandboxPaymentModal';
import { CityModal } from './components/CityModal';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import {
  CalendarAlertItem,
  clearUserBookings,
  deleteUserBooking,
  deleteUserCalendarAlert,
  loadUserPrivateProfile,
  saveUserBooking,
  saveUserCalendarAlert,
  subscribeUserBookings,
  subscribeUserCalendarAlerts,
  upsertUserPrivateProfile,
} from './services/firebaseUserService';
import { SignInModal } from './components/SignInModal';
import { MyTicketsModal } from './components/MyTicketsModal';
import { MentorGuideModal } from './components/MentorGuideModal';

export default function App() {
  // Light / Dark Theme state (defaults to Midnight Black, persisted)
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = window.localStorage.getItem('cinnova_theme_v3');
    if (saved) return saved === 'dark';
    return true;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    window.localStorage.setItem('cinnova_theme_v3', isDark ? 'dark' : 'light');
  }, [isDark]);

  // Navigation, search, and city state
  const [activeTab, setActiveTab] = useState<CategoryTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedCity, setSelectedCity] = useState('Gwalior');

  // TMDB Catalog State (hydrates via /api/tmdb/* when configured, falls back seamlessly to local catalog)
  const [catalogMovies, setCatalogMovies] = useState<Movie[]>(FALLBACK_MOVIES);
  const [upcomingAdMovies, setUpcomingAdMovies] = useState<Movie[]>([]);
  const [searchResults, setSearchResults] = useState<Movie[] | null>(null);
  const [dataSource, setDataSource] = useState<'tmdb' | 'local'>('local');
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [isSearchingMovies, setIsSearchingMovies] = useState(false);

  // Modals & User state
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isMyTicketsOpen, setIsMyTicketsOpen] = useState(false);
  const [isMentorGuideOpen, setIsMentorGuideOpen] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signInPrompt, setSignInPrompt] = useState<string | null>(null);

  const canBook = Boolean(authReady && user && user.emailVerified);
  const needsEmailVerification = Boolean(authReady && user && !user.emailVerified);

  // Booking & Seat Lock / Sold state
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [pendingCheckout, setPendingCheckout] = useState<PendingCheckoutPayload | null>(null);
  const [notifiedIds, setNotifiedIds] = useState<string[]>([]);
  const [firestoreCalendarAlerts, setFirestoreCalendarAlerts] = useState<CalendarAlertItem[]>([]);
  const [pendingNotifyMovieId, setPendingNotifyMovieId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [soldSeatMap, setSoldSeatMap] = useState<Record<string, string[]>>(() => {
    try {
      const saved = window.localStorage.getItem('cinnova_sold_seats');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    window.localStorage.setItem('cinnova_sold_seats', JSON.stringify(soldSeatMap));
  }, [soldSeatMap]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setBookings([]);
        setNotifiedIds([]);
        setFirestoreCalendarAlerts([]);
        setAuthReady(true);
        return;
      }

      const provider: 'google' | 'password' = fbUser.providerData.some(
        (p) => p.providerId === 'google.com'
      )
        ? 'google'
        : 'password';

      setUser((prev) => {
        const sameUid = prev?.uid === fbUser.uid;
        return {
          uid: fbUser.uid,
          name:
            fbUser.displayName ||
            (sameUid ? prev?.name : undefined) ||
            fbUser.email?.split('@')[0] ||
            'CinNova Member',
          email: fbUser.email || (sameUid ? prev?.email : '') || '',
          phone: fbUser.phoneNumber || (sameUid ? prev?.phone : '') || '',
          preferredCity: (sameUid ? prev?.preferredCity : undefined) || selectedCity,
          provider,
          emailVerified: fbUser.emailVerified,
        };
      });
      setAuthReady(true);
    });

    return () => {
      unsubAuth();
    };
  }, []);

  // Sync Firestore private profile and attach bookings/calendar listeners once verified
  useEffect(() => {
    const uid = user?.uid;
    if (!user || !uid || !user.emailVerified) return;

    let cancelled = false;
    const initialProfile = {
      name: user.name,
      email: user.email,
      phone: user.phone,
      preferredCity: user.preferredCity || selectedCity,
      provider: user.provider || ('google' as const),
    };

    (async () => {
      try {
        const savedProfile = await loadUserPrivateProfile(uid);
        if (cancelled) return;
        if (savedProfile) {
          setUser((prev) =>
            prev && prev.uid === savedProfile.uid
              ? { ...prev, ...savedProfile, emailVerified: true }
              : savedProfile
          );
          if (savedProfile.preferredCity) {
            setSelectedCity(savedProfile.preferredCity);
          }
        } else {
          await upsertUserPrivateProfile(uid, initialProfile);
        }
      } catch (err) {
        console.error('Failed to sync user profile from Firestore:', err);
      }
    })();

    const unsubBookings = subscribeUserBookings(uid, (items) => {
      setBookings(items);
    });
    const unsubAlerts = subscribeUserCalendarAlerts(uid, (alerts) => {
      setFirestoreCalendarAlerts(alerts);
      setNotifiedIds(alerts.map((a) => a.movieId));
    });

    return () => {
      cancelled = true;
      unsubBookings();
      unsubAlerts();
    };
  }, [user?.uid, user?.emailVerified]);

  // Fetch category movies from backend TMDB proxy
  useEffect(() => {
    let cancelled = false;
    setIsLoadingCatalog(true);

    fetch(`/api/tmdb/movies?category=${encodeURIComponent(activeTab)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.source === 'tmdb' && Array.isArray(data.movies)) {
          setCatalogMovies(data.movies);
          setDataSource('tmdb');
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
        if (!cancelled) setIsLoadingCatalog(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  // Fetch upcoming movies from TMDB database specifically for the advertisement section
  useEffect(() => {
    let cancelled = false;
    fetch('/api/tmdb/movies?category=upcoming')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.source === 'tmdb' && Array.isArray(data.movies) && data.movies.length > 0) {
          setUpcomingAdMovies(data.movies);
        }
      })
      .catch(() => {
        // Fallback to local upcoming catalog if TMDB is unreachable
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced live search via TMDB proxy when TMDB is active
  useEffect(() => {
    const q = searchQuery.trim();
    setSearchResults(null);
    if (!q || dataSource !== 'tmdb') {
      setIsSearchingMovies(false);
      return;
    }

    let cancelled = false;
    setIsSearchingMovies(true);
    const timer = window.setTimeout(() => {
      fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!cancelled && data?.source === 'tmdb' && Array.isArray(data.movies)) {
            setSearchResults(data.movies);
          }
        })
        .catch(() => {
          if (!cancelled) setSearchResults(null);
        })
        .finally(() => {
          if (!cancelled) setIsSearchingMovies(false);
        });
    }, 320);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery, dataSource]);

  const findMovieById = (movieId: string): Movie | undefined => {
    return (
      upcomingAdMovies.find((m) => m.id === movieId) ||
      catalogMovies.find((m) => m.id === movieId) ||
      FALLBACK_MOVIES.find((m) => m.id === movieId)
    );
  };

  const handleAuthComplete = (profile: UserProfile) => {
    setUser(profile);
    if (pendingNotifyMovieId) {
      const movieIdToSave = pendingNotifyMovieId;
      setPendingNotifyMovieId(null);
      setNotifiedIds((prev) => (prev.includes(movieIdToSave) ? prev : [...prev, movieIdToSave]));
      if (profile.uid && profile.emailVerified) {
        const movieObj = findMovieById(movieIdToSave);
        if (movieObj) {
          saveUserCalendarAlert(profile.uid, movieObj).catch((err) => {
            console.error('Failed to persist pending calendar alert:', err);
          });
        }
      }
    }
  };

  const handleSignOut = async () => {
    setIsMyTicketsOpen(false);
    setPendingCheckout(null);
    setPendingNotifyMovieId(null);
    setSignInPrompt(null);
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Firebase signOut failed:', err);
    }
    setUser(null);
    setBookings([]);
    setNotifiedIds([]);
    setFirestoreCalendarAlerts([]);
  };

  const openSignInWithPrompt = (message?: string) => {
    setSignInPrompt(message ?? null);
    setIsSignInOpen(true);
  };

  const handleToggleNotify = async (movieId: string) => {
    if (!user || !authReady) {
      setPendingNotifyMovieId(movieId);
      openSignInWithPrompt('Sign in to add this movie release to your calendar');
      return;
    }

    const exists = notifiedIds.includes(movieId);
    setNotifiedIds((prev) =>
      exists ? prev.filter((id) => id !== movieId) : [...prev, movieId]
    );

    if (user.uid && user.emailVerified) {
      try {
        if (exists) {
          await deleteUserCalendarAlert(user.uid, movieId);
        } else {
          const movieObj = findMovieById(movieId);
          if (movieObj) {
            await saveUserCalendarAlert(user.uid, movieObj);
          }
        }
      } catch (err) {
        console.error('Failed to sync calendar alert to Firestore:', err);
      }
    }
  };

  // Dynamic genre chips extracted from active movie list
  const availableGenres = useMemo(() => {
    const baseList = searchResults ?? catalogMovies;
    const genreSet = new Set<string>();
    baseList.forEach((m) => m.genres.forEach((g) => genreSet.add(g)));
    return ['All', ...Array.from(genreSet)];
  }, [catalogMovies, searchResults]);

  // Reset selected genre if it doesn't exist in newly loaded TMDB category
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

  // Dynamic Floating Ad Slides: showcase upcoming movies strictly from the TMDB database
  const activeAdSlides: AdSlide[] = useMemo(() => {
    if (upcomingAdMovies.length > 0) {
      const spotlightPool = upcomingAdMovies.filter(
        (m) => Boolean(m.backdropImage && m.synopsis && m.synopsis.trim().length > 0)
      );
      const chosen = (spotlightPool.length > 0 ? spotlightPool : upcomingAdMovies).slice(0, 5);
      return chosen.map((m) => ({
        id: `tmdb-upcoming-ad-${m.id}`,
        kicker: 'Upcoming Movie Spotlight',
        title: m.title,
        subtitle: m.synopsis,
        ctaLabel: 'View Details & Alerts',
        image: m.backdropImage || m.posterImage || AD_SLIDES[0].image,
        movieId: m.id,
        movie: m,
      }));
    }
    return AD_SLIDES;
  }, [upcomingAdMovies]);

  const handleSelectAdSlide = (slide: AdSlide) => {
    const found =
      upcomingAdMovies.find((m) => m.id === slide.movieId) ||
      catalogMovies.find((m) => m.id === slide.movieId) ||
      slide.movie;
    if (found) setSelectedMovie(found);
  };

  const handleProceedToPayment = (payload: PendingCheckoutPayload) => {
    if (!canBook) {
      openSignInWithPrompt(
        needsEmailVerification
          ? 'Verify your email address to book tickets.'
          : 'Sign in or create an account to book tickets.'
      );
      return;
    }
    setPendingCheckout(payload);
  };

  const handlePaymentSuccess = (booking: BookingRecord) => {
    if (!user?.uid || !user.emailVerified || !auth.currentUser) {
      return;
    }

    setBookings((prev) => [booking, ...prev]);

    saveUserBooking(user.uid, booking).catch((err) => {
      console.error('Failed to save booking to Firestore:', err);
    });

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

  const handleRefreshTickets = async () => {
    if (user?.uid && user.emailVerified) {
      try {
        const refreshed = await loadUserPrivateProfile(user.uid);
        if (refreshed) setUser(refreshed);
      } catch (err) {
        console.error('Refresh error:', err);
      }
    }
  };

  const handleClearBookings = async () => {
    const ids = bookings.map((b) => b.bookingId);
    setBookings([]);
    setSoldSeatMap({});
    window.localStorage.removeItem('cinnova_sold_seats');
    if (user?.uid && user.emailVerified && ids.length > 0) {
      try {
        await clearUserBookings(user.uid, ids);
      } catch (err) {
        console.error('Failed to clear bookings in Firestore:', err);
      }
    }
  };

  const handleRemoveBooking = async (bookingId: string) => {
    setBookings((prev) => prev.filter((b) => b.bookingId !== bookingId));
    if (user?.uid && user.emailVerified) {
      try {
        await deleteUserBooking(user.uid, bookingId);
      } catch (err) {
        console.error('Failed to remove booking in Firestore:', err);
      }
    }
  };

  const calendarMovies = useMemo(() => {
    if (!user || notifiedIds.length === 0) return [];
    const pool = [...upcomingAdMovies, ...catalogMovies, ...FALLBACK_MOVIES];
    const byId = new Map<string, Movie>();
    pool.forEach((m) => {
      if (!byId.has(m.id)) byId.set(m.id, m);
    });
    return notifiedIds
      .map((id) => {
        const matched = byId.get(id);
        if (matched) return matched;
        const alert = firestoreCalendarAlerts.find((a) => a.movieId === id);
        if (!alert) return null;
        return {
          id: alert.movieId,
          title: alert.title,
          tagline: 'Upcoming theatrical release',
          genres: alert.genres,
          language: alert.language,
          formats: ['2D'],
          duration: 'TBA',
          certification: 'UA 13+',
          rating: 8.1,
          votes: 'Interested',
          status: 'upcoming' as const,
          releaseDate: alert.releaseDate,
          director: 'Theatrical Feature',
          cast: ['Ensemble Cast'],
          synopsis: 'Saved in your CinNova Firebase Release Calendar.',
          posterImage: alert.posterImage,
        };
      })
      .filter((m): m is Movie => Boolean(m));
  }, [user, notifiedIds, upcomingAdMovies, catalogMovies, firestoreCalendarAlerts]);

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F7FC] text-[#070910] transition-colors duration-200 dark:bg-[#070910] dark:text-slate-100">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCity={selectedCity}
        onOpenCityModal={() => setIsCityModalOpen(true)}
        user={user}
        onOpenSignIn={() => openSignInWithPrompt()}
        onSignOut={handleSignOut}
        isDark={isDark}
        onToggleTheme={() => setIsDark((prev) => !prev)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        bookingsCount={bookings.length}
        onOpenMyBookings={() => {
          if (user) setIsMyTicketsOpen(true);
        }}
        onOpenMentorGuide={() => setIsMentorGuideOpen(true)}
      />

      <main className="flex-1">
        <FloatingAdCarousel
          slides={activeAdSlides}
          isSignedIn={Boolean(user)}
          notifiedIds={user ? notifiedIds : []}
          onToggleNotify={handleToggleNotify}
          onSelectSlide={handleSelectAdSlide}
        />

        <MovieGrid
          movies={filteredMovies}
          activeTab={activeTab}
          selectedCity={selectedCity}
          searchQuery={searchQuery}
          selectedGenre={selectedGenre}
          genres={availableGenres}
          isLoading={isLoadingCatalog || isSearchingMovies}
          dataSource={dataSource}
          onSelectGenre={setSelectedGenre}
          onSelectMovie={setSelectedMovie}
          isSignedIn={canBook}
          notifiedIds={user ? notifiedIds : []}
          onToggleNotify={handleToggleNotify}
          onResetFilters={() => {
            setActiveTab('all');
            setSelectedGenre('All');
            setSearchQuery('');
          }}
        />
      </main>

      <Footer
        isSignedIn={Boolean(user)}
        onSelectTab={setActiveTab}
        onOpenMyBookings={() => {
          if (user) setIsMyTicketsOpen(true);
        }}
        onOpenMentorGuide={() => setIsMentorGuideOpen(true)}
        onOpenCityModal={() => setIsCityModalOpen(true)}
      />

      <BookingModal
        movie={selectedMovie}
        city={selectedCity}
        soldSeatMap={soldSeatMap}
        canBook={canBook}
        needsEmailVerification={needsEmailVerification}
        isNotified={Boolean(user && selectedMovie && notifiedIds.includes(selectedMovie.id))}
        onToggleNotify={handleToggleNotify}
        onRequireAuth={(msg) => openSignInWithPrompt(msg)}
        onClose={() => setSelectedMovie(null)}
        onProceedToPayment={handleProceedToPayment}
      />

      <SandboxPaymentModal
        checkout={canBook ? pendingCheckout : null}
        user={user}
        onClose={handleClosePaymentModal}
        onPaymentSuccess={handlePaymentSuccess}
      />

      <CityModal
        isOpen={isCityModalOpen}
        selectedCity={selectedCity}
        onSelectCity={(city) => {
          setSelectedCity(city);
          if (user?.uid && user.emailVerified) {
            upsertUserPrivateProfile(user.uid, {
              name: user.name,
              email: user.email,
              phone: user.phone,
              preferredCity: city,
              provider: user.provider || 'google',
            }).catch(() => {});
          }
        }}
        onClose={() => setIsCityModalOpen(false)}
      />

      <SignInModal
        isOpen={isSignInOpen}
        promptMessage={
          signInPrompt ||
          (pendingNotifyMovieId
            ? 'Sign in to add this movie release to your calendar'
            : undefined)
        }
        selectedCity={selectedCity}
        onClose={() => {
          setIsSignInOpen(false);
          setPendingNotifyMovieId(null);
          setSignInPrompt(null);
        }}
        onAuthComplete={handleAuthComplete}
      />

      <MyTicketsModal
        isOpen={Boolean(user) && isMyTicketsOpen}
        bookings={bookings}
        calendarMovies={calendarMovies}
        isSignedIn={Boolean(user)}
        onRefresh={handleRefreshTickets}
        onClearBookings={handleClearBookings}
        onRemoveBooking={handleRemoveBooking}
        onRemoveCalendarMovie={handleToggleNotify}
        onSelectMovie={setSelectedMovie}
        onClose={() => setIsMyTicketsOpen(false)}
      />

      <MentorGuideModal
        isOpen={isMentorGuideOpen}
        onClose={() => setIsMentorGuideOpen(false)}
      />
    </div>
  );
}
