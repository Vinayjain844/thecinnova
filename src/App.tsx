import { useEffect, useMemo, useState } from 'react';
import { AD_SLIDES, MOVIES as FALLBACK_MOVIES } from './data/movies';
import {
  AdSlide,
  BookingRecord,
  buildShowKey,
  CategoryTab,
  DEFAULT_PLATFORM_CATALOG,
  GenderOption,
  isProfileComplete,
  Movie,
  PlatformCatalogConfig,
  UserProfile,
} from './types/cinema';
import { AppViewMode, Header } from './components/Header';
import { FloatingAdCarousel } from './components/FloatingAdCarousel';
import { MovieGrid } from './components/MovieGrid';
import { Footer } from './components/Footer';
import { BookingModal, PendingCheckoutPayload } from './components/BookingModal';
import { SandboxPaymentModal } from './components/SandboxPaymentModal';
import { CityModal } from './components/CityModal';
import { onAuthStateChanged, signOut, updateProfile } from 'firebase/auth';
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
import {
  commitSoldSeats,
  createTicketPass,
  resolveEffectiveRole,
  subscribeMyRoleAssignment,
  subscribePlatformCatalogConfig,
} from './services/rbacService';
import { SignInModal } from './components/SignInModal';
import { MyTicketsModal } from './components/MyTicketsModal';
import { MentorGuideModal } from './components/MentorGuideModal';
import { ProfilePage } from './components/ProfilePage';
import { AdminConsole } from './components/AdminConsole';
import { StaffConsole } from './components/StaffConsole';
import { SystemConsole } from './components/SystemConsole';

const PENDING_PROFILE_PREFIX = 'cinnova_pending_profile_';

function loadPendingProfile(uid: string): UserProfile | null {
  if (typeof window === 'undefined' || !uid) return null;
  try {
    const raw = window.sessionStorage.getItem(`${PENDING_PROFILE_PREFIX}${uid}`);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

function savePendingProfile(uid: string, profile: UserProfile): void {
  if (typeof window === 'undefined' || !uid) return;
  try {
    window.sessionStorage.setItem(`${PENDING_PROFILE_PREFIX}${uid}`, JSON.stringify(profile));
  } catch {
    // Ignore storage errors
  }
}

function clearPendingProfile(uid: string): void {
  if (typeof window === 'undefined' || !uid) return;
  try {
    window.sessionStorage.removeItem(`${PENDING_PROFILE_PREFIX}${uid}`);
  } catch {
    // Ignore storage errors
  }
}

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
  const [activeView, setActiveView] = useState<AppViewMode>('home');
  const [catalogConfig, setCatalogConfig] = useState<PlatformCatalogConfig>(
    DEFAULT_PLATFORM_CATALOG
  );
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
  const [profileCheckedUid, setProfileCheckedUid] = useState<string | null>(null);
  const [profileSyncedToFirebase, setProfileSyncedToFirebase] = useState(false);
  const [profileSyncError, setProfileSyncError] = useState<string | null>(null);
  const [bookingSyncError, setBookingSyncError] = useState<string | null>(null);

  const needsEmailVerification = Boolean(authReady && user && !user.emailVerified);
  const needsProfileCompletion = Boolean(authReady && user && !isProfileComplete(user));
  const isOnboardingProfile = Boolean(
    authReady &&
      user &&
      !isProfileComplete(user) &&
      (!user.emailVerified || profileCheckedUid === user.uid)
  );
  const canBook = Boolean(authReady && user && user.emailVerified && isProfileComplete(user));

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
        setProfileCheckedUid(null);
        setProfileSyncedToFirebase(false);
        setProfileSyncError(null);
        setBookingSyncError(null);
        setAuthReady(true);
        return;
      }

      const provider: 'google' | 'password' = fbUser.providerData.some(
        (p) => p.providerId === 'google.com'
      )
        ? 'google'
        : 'password';
      const pending = loadPendingProfile(fbUser.uid);

      setUser((prev) => {
        const sameUid = prev?.uid === fbUser.uid;
        return {
          uid: fbUser.uid,
          name:
            fbUser.displayName ||
            pending?.name ||
            (sameUid ? prev?.name : undefined) ||
            fbUser.email?.split('@')[0] ||
            'CinNova Member',
          email: fbUser.email || (sameUid ? prev?.email : '') || '',
          phone: pending?.phone || fbUser.phoneNumber || (sameUid ? prev?.phone : '') || '',
          age: pending?.age ?? (sameUid ? prev?.age : undefined),
          gender: pending?.gender ?? (sameUid ? prev?.gender : undefined),
          favoriteCategories:
            pending?.favoriteCategories ?? (sameUid ? prev?.favoriteCategories : undefined),
          preferredCity:
            pending?.preferredCity || (sameUid ? prev?.preferredCity : undefined) || selectedCity,
          preferredLanguage:
            pending?.preferredLanguage ?? (sameUid ? prev?.preferredLanguage : undefined),
          preferredFormat:
            pending?.preferredFormat ?? (sameUid ? prev?.preferredFormat : undefined),
          provider,
          emailVerified: fbUser.emailVerified,
          role: resolveEffectiveRole(fbUser.email, sameUid ? prev?.role : undefined),
        };
      });
      setAuthReady(true);
    });

    return () => {
      unsubAuth();
    };
  }, []);

  // Subscribe globally to Admin-controlled movie pricing & catalog visibility
  useEffect(() => {
    const unsub = subscribePlatformCatalogConfig(setCatalogConfig);
    return () => unsub();
  }, []);

  // Resolve verified user's RBAC role ('user' | 'admin' | 'staff' | 'system')
  useEffect(() => {
    if (!user?.email || !user.emailVerified) return;
    const unsub = subscribeMyRoleAssignment(user.email, (assignedRole) => {
      const effectiveRole = resolveEffectiveRole(user.email, assignedRole);
      setUser((prev) =>
        prev && prev.email === user.email && prev.role !== effectiveRole
          ? { ...prev, role: effectiveRole }
          : prev
      );
    });
    return () => unsub();
  }, [user?.email, user?.emailVerified]);

  // Automatically route newly signed-up or incomplete-profile users to Profile Page first
  useEffect(() => {
    if (isOnboardingProfile) {
      setActiveView('profile');
    }
  }, [isOnboardingProfile]);

  // Sync Firestore private profile and attach bookings/calendar listeners once verified
  useEffect(() => {
    const uid = user?.uid;
    if (!user || !uid || !user.emailVerified) return;

    let cancelled = false;
    setProfileSyncError(null);

    (async () => {
      try {
        const savedProfile = await loadUserPrivateProfile(uid);
        if (cancelled) return;
        const pending = loadPendingProfile(uid);

        if (savedProfile) {
          if (pending && isProfileComplete(pending) && !isProfileComplete(savedProfile)) {
            const merged: UserProfile = {
              ...savedProfile,
              name: pending.name || savedProfile.name,
              phone: pending.phone || savedProfile.phone,
              age: pending.age ?? savedProfile.age,
              gender: pending.gender || savedProfile.gender,
              favoriteCategories:
                pending.favoriteCategories && pending.favoriteCategories.length > 0
                  ? pending.favoriteCategories
                  : savedProfile.favoriteCategories,
              preferredCity: pending.preferredCity || savedProfile.preferredCity || selectedCity,
              preferredLanguage: pending.preferredLanguage || savedProfile.preferredLanguage,
              preferredFormat: pending.preferredFormat || savedProfile.preferredFormat,
              emailVerified: true,
            };
            await upsertUserPrivateProfile(uid, {
              name: merged.name,
              email: merged.email,
              phone: merged.phone,
              age: merged.age,
              gender: merged.gender,
              favoriteCategories: merged.favoriteCategories,
              preferredCity: merged.preferredCity || selectedCity,
              preferredLanguage: merged.preferredLanguage,
              preferredFormat: merged.preferredFormat,
              provider: merged.provider === 'password' ? 'password' : 'google',
            });
            clearPendingProfile(uid);
            if (!cancelled) {
              setUser(merged);
              if (merged.preferredCity) setSelectedCity(merged.preferredCity);
              setProfileSyncedToFirebase(true);
            }
          } else {
            setUser((prev) =>
              prev && prev.uid === savedProfile.uid
                ? {
                    ...prev,
                    ...savedProfile,
                    emailVerified: true,
                    role: resolveEffectiveRole(savedProfile.email, prev?.role),
                  }
                : {
                    ...savedProfile,
                    role: resolveEffectiveRole(savedProfile.email),
                  }
            );
            if (savedProfile.preferredCity) {
              setSelectedCity(savedProfile.preferredCity);
            }
            if (isProfileComplete(savedProfile)) {
              clearPendingProfile(uid);
            }
            setProfileSyncedToFirebase(true);
          }
        } else {
          const sourceProfile = pending && isProfileComplete(pending) ? pending : user;
          if (isProfileComplete(sourceProfile)) {
            await upsertUserPrivateProfile(uid, {
              name: sourceProfile.name,
              email: user.email,
              phone: sourceProfile.phone,
              age: sourceProfile.age,
              gender: sourceProfile.gender,
              favoriteCategories: sourceProfile.favoriteCategories,
              preferredCity: sourceProfile.preferredCity || selectedCity,
              preferredLanguage: sourceProfile.preferredLanguage,
              preferredFormat: sourceProfile.preferredFormat,
              provider: user.provider === 'password' ? 'password' : 'google',
            });
            clearPendingProfile(uid);
            if (!cancelled) {
              setUser((prev) => (prev ? { ...prev, ...sourceProfile, emailVerified: true } : prev));
              setProfileSyncedToFirebase(true);
            }
          } else {
            // Brand-new user with incomplete profile: send directly to Profile Page first
            setProfileSyncedToFirebase(false);
            setActiveView('profile');
          }
        }
      } catch (err) {
        console.error('Failed to sync user profile from Firestore:', err);
        if (!cancelled) {
          setProfileSyncedToFirebase(false);
          setProfileSyncError(
            'Could not read/write Firestore in cinnova-001. Ensure firestore.rules are published.'
          );
        }
      } finally {
        if (!cancelled) {
          setProfileCheckedUid(uid);
        }
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
    const pending = profile.uid ? loadPendingProfile(profile.uid) : null;
    setUser((prev) => {
      const sameUid = prev?.uid === profile.uid;
      const merged: UserProfile = {
        ...profile,
        name: profile.name || pending?.name || (sameUid ? prev?.name : '') || 'CinNova Member',
        phone: profile.phone || pending?.phone || (sameUid ? prev?.phone : '') || '',
        age: profile.age ?? pending?.age ?? (sameUid ? prev?.age : undefined),
        gender: profile.gender ?? pending?.gender ?? (sameUid ? prev?.gender : undefined),
        favoriteCategories:
          profile.favoriteCategories ??
          pending?.favoriteCategories ??
          (sameUid ? prev?.favoriteCategories : undefined),
        preferredCity:
          profile.preferredCity ||
          pending?.preferredCity ||
          (sameUid ? prev?.preferredCity : undefined) ||
          selectedCity,
        preferredLanguage:
          profile.preferredLanguage ??
          pending?.preferredLanguage ??
          (sameUid ? prev?.preferredLanguage : undefined),
        preferredFormat:
          profile.preferredFormat ??
          pending?.preferredFormat ??
          (sameUid ? prev?.preferredFormat : undefined),
        role: resolveEffectiveRole(profile.email, sameUid ? prev?.role : profile.role),
      };
      if (!isProfileComplete(merged)) {
        setActiveView('profile');
      }
      return merged;
    });

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
    if (user?.uid) {
      clearPendingProfile(user.uid);
    }
    setActiveView('home');
    setIsMyTicketsOpen(false);
    setPendingCheckout(null);
    setPendingNotifyMovieId(null);
    setSignInPrompt(null);
    setProfileCheckedUid(null);
    setProfileSyncedToFirebase(false);
    setProfileSyncError(null);
    setBookingSyncError(null);
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

  const handleSelectNavTab = (tab: CategoryTab) => {
    if (isOnboardingProfile) {
      setActiveView('profile');
      return;
    }
    setActiveTab(tab);
    setActiveView('home');
  };

  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value);
    if (isOnboardingProfile) {
      setActiveView('profile');
      return;
    }
    if (value.trim().length > 0 && activeView === 'profile') {
      setActiveView('home');
    }
  };

  const handleSaveProfile = async (updated: {
    name: string;
    phone: string;
    age?: number;
    gender: GenderOption;
    favoriteCategories: string[];
    preferredCity: string;
    preferredLanguage: string;
    preferredFormat: string;
  }) => {
    if (!user) return;

    const wasOnboarding = !isProfileComplete(user);
    const nextUser: UserProfile = {
      ...user,
      name: updated.name,
      phone: updated.phone,
      age: updated.age,
      gender: updated.gender,
      favoriteCategories: updated.favoriteCategories,
      preferredCity: updated.preferredCity,
      preferredLanguage: updated.preferredLanguage,
      preferredFormat: updated.preferredFormat,
    };

    setUser(nextUser);
    setSelectedCity(updated.preferredCity);

    if (auth.currentUser && updated.name !== user.name) {
      await updateProfile(auth.currentUser, { displayName: updated.name }).catch(() => {});
    }

    if (user.uid && !user.emailVerified) {
      savePendingProfile(user.uid, nextUser);
      setProfileSyncedToFirebase(false);
      return;
    }

    if (user.uid && user.emailVerified) {
      try {
        await upsertUserPrivateProfile(user.uid, {
          name: updated.name,
          email: user.email,
          phone: updated.phone,
          age: updated.age,
          gender: updated.gender,
          favoriteCategories: updated.favoriteCategories,
          preferredCity: updated.preferredCity,
          preferredLanguage: updated.preferredLanguage,
          preferredFormat: updated.preferredFormat,
          provider: user.provider === 'password' ? 'password' : 'google',
        });
        clearPendingProfile(user.uid);
        setProfileSyncedToFirebase(true);
        setProfileSyncError(null);
        setProfileCheckedUid(user.uid);
        if (wasOnboarding && isProfileComplete(nextUser)) {
          setActiveView('home');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } catch (err) {
        setProfileSyncedToFirebase(false);
        setProfileSyncError(
          'Failed to write profile to Firebase Firestore. Check your firestore.rules in cinnova-001.'
        );
        throw err;
      }
    }
  };

  const handleToggleNotify = async (movieId: string) => {
    if (!user || !authReady) {
      setPendingNotifyMovieId(movieId);
      openSignInWithPrompt('Sign in to add this movie release to your calendar');
      return;
    }

    const exists = notifiedIds.includes(movieId);
    const nextIds = exists
      ? notifiedIds.filter((id) => id !== movieId)
      : [...notifiedIds, movieId];
    setNotifiedIds(nextIds);

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

  // Complete movie catalog passed to Admin / Staff / System consoles
  const allKnownMovies = useMemo(() => {
    const map = new Map<string, Movie>();
    [...catalogMovies, ...upcomingAdMovies, ...FALLBACK_MOVIES].forEach((m) => {
      if (!map.has(m.id)) map.set(m.id, m);
    });
    return Array.from(map.values());
  }, [catalogMovies, upcomingAdMovies]);

  const hiddenMovieSet = useMemo(
    () => new Set(catalogConfig.hiddenMovieIds),
    [catalogConfig.hiddenMovieIds]
  );

  // Dynamic genre chips extracted from active visible movie list
  const availableGenres = useMemo(() => {
    const baseList = (searchResults ?? catalogMovies).filter((m) => !hiddenMovieSet.has(m.id));
    const genreSet = new Set<string>();
    baseList.forEach((m) => m.genres.forEach((g) => genreSet.add(g)));
    return ['All', ...Array.from(genreSet)];
  }, [catalogMovies, searchResults, hiddenMovieSet]);

  // Reset selected genre if it doesn't exist in newly loaded TMDB category
  useEffect(() => {
    if (selectedGenre !== 'All' && !availableGenres.includes(selectedGenre)) {
      setSelectedGenre('All');
    }
  }, [availableGenres, selectedGenre]);

  const filteredMovies = useMemo(() => {
    if (searchResults !== null) {
      const visibleSearch = searchResults.filter((m) => !hiddenMovieSet.has(m.id));
      return selectedGenre === 'All'
        ? visibleSearch
        : visibleSearch.filter((m) => m.genres.includes(selectedGenre));
    }

    let list = catalogMovies.filter((m) => !hiddenMovieSet.has(m.id));

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
  }, [catalogMovies, searchResults, hiddenMovieSet, dataSource, activeTab, selectedGenre, searchQuery]);

  // Dynamic Floating Ad Slides: showcase visible upcoming movies from TMDB
  const activeAdSlides: AdSlide[] = useMemo(() => {
    const visibleUpcoming = upcomingAdMovies.filter((m) => !hiddenMovieSet.has(m.id));
    if (visibleUpcoming.length > 0) {
      const spotlightPool = visibleUpcoming.filter(
        (m) => Boolean(m.backdropImage && m.synopsis && m.synopsis.trim().length > 0)
      );
      const chosen = (spotlightPool.length > 0 ? spotlightPool : visibleUpcoming).slice(0, 5);
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
    const visibleFallbackAds = AD_SLIDES.filter((s) => !hiddenMovieSet.has(s.movieId));
    return visibleFallbackAds.length > 0 ? visibleFallbackAds : AD_SLIDES;
  }, [upcomingAdMovies, hiddenMovieSet]);

  const handleSelectAdSlide = (slide: AdSlide) => {
    const found =
      upcomingAdMovies.find((m) => m.id === slide.movieId) ||
      catalogMovies.find((m) => m.id === slide.movieId) ||
      slide.movie;
    if (found) setSelectedMovie(found);
  };

  const handleProceedToPayment = (payload: PendingCheckoutPayload) => {
    if (!canBook) {
      if (needsProfileCompletion && user?.emailVerified) {
        setSelectedMovie(null);
        setActiveView('profile');
        return;
      }
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

    setBookingSyncError(null);
    saveUserBooking(user.uid, booking)
      .then(() => {
        setBookingSyncError(null);
      })
      .catch((err) => {
        console.error('Failed to save booking to Firestore:', err);
        setBookingSyncError(
          'Ticket booked locally, but Firebase Firestore rejected the save. Ensure firestore.rules are published in cinnova-001.'
        );
      });

    createTicketPass(booking, user.uid, user.name || 'CinNova Member').catch(() => {});

    if (pendingCheckout) {
      const dateOptionsMap: Record<string, string> = {
        'Wed, 25 Nov': 'today',
        'Thu, 26 Nov': 'tomorrow',
        'Fri, 27 Nov': 'fri',
        'Sat, 28 Nov': 'sat',
      };
      const dateId = dateOptionsMap[pendingCheckout.dateLabel] || 'today';
      const showKey = buildShowKey(
        pendingCheckout.movie.id,
        pendingCheckout.city,
        pendingCheckout.theatre.id,
        dateId,
        pendingCheckout.showtime.id
      );
      const newSeatIds = pendingCheckout.seats.map((s) => s.id);

      setSoldSeatMap((prev) => ({
        ...prev,
        [showKey]: Array.from(new Set([...(prev[showKey] || []), ...newSeatIds])),
      }));

      commitSoldSeats(
        {
          showKey,
          movieId: pendingCheckout.movie.id,
          city: pendingCheckout.city,
          theatreId: pendingCheckout.theatre.id,
          dateId,
          showtimeId: pendingCheckout.showtime.id,
        },
        newSeatIds,
        user.uid
      );
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
        onSearchChange={handleSearchInputChange}
        selectedCity={selectedCity}
        onOpenCityModal={() => setIsCityModalOpen(true)}
        user={user}
        onOpenSignIn={() => openSignInWithPrompt()}
        onSignOut={handleSignOut}
        isDark={isDark}
        onToggleTheme={() => setIsDark((prev) => !prev)}
        activeTab={activeTab}
        activeView={
          isOnboardingProfile
            ? 'profile'
            : user
            ? activeView
            : 'home'
        }
        isOnboardingProfile={isOnboardingProfile}
        onSelectTab={handleSelectNavTab}
        onOpenProfile={() => {
          if (user) {
            setActiveView('profile');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            openSignInWithPrompt('Sign in to view and manage your CinNova profile.');
          }
        }}
        onOpenView={(view) => {
          if (!user || isOnboardingProfile) return;
          if (view === 'admin' && user.role !== 'admin') return;
          if (view === 'staff' && user.role !== 'staff' && user.role !== 'admin') return;
          if (view === 'system' && user.role !== 'system' && user.role !== 'admin') return;
          setActiveView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        bookingsCount={bookings.length}
        onOpenMyBookings={() => {
          if (user && !isOnboardingProfile) setIsMyTicketsOpen(true);
        }}
        onOpenMentorGuide={() => setIsMentorGuideOpen(true)}
      />

      <main className="flex-1">
        {(isOnboardingProfile || activeView === 'profile') && user ? (
          <ProfilePage
            user={user}
            selectedCity={selectedCity}
            bookingsCount={bookings.length}
            calendarAlertsCount={notifiedIds.length}
            isOnboarding={isOnboardingProfile}
            isSyncedToFirebase={profileSyncedToFirebase}
            profileSyncError={profileSyncError}
            onSaveProfile={handleSaveProfile}
            onBackToMovies={(filterGenre) => {
              if (isOnboardingProfile) return;
              if (filterGenre) {
                setActiveTab('all');
                setSelectedGenre(filterGenre);
              }
              setActiveView('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenMyBookings={() => {
              if (!isOnboardingProfile) setIsMyTicketsOpen(true);
            }}
            onOpenMentorGuide={() => setIsMentorGuideOpen(true)}
            onOpenVerifyModal={() =>
              openSignInWithPrompt('Verify your email to sync your profile with Firestore.')
            }
            onSignOut={handleSignOut}
          />
        ) : activeView === 'admin' && user?.role === 'admin' ? (
          <AdminConsole
            user={user}
            movies={allKnownMovies}
            catalogConfig={catalogConfig}
            onOptimisticConfigChange={setCatalogConfig}
            onBackToUserPlatform={() => setActiveView('home')}
          />
        ) : activeView === 'staff' && (user?.role === 'staff' || user?.role === 'admin') ? (
          <StaffConsole
            user={user}
            movies={allKnownMovies}
            defaultCity={selectedCity}
            onBackToUserPlatform={() => setActiveView('home')}
          />
        ) : activeView === 'system' && (user?.role === 'system' || user?.role === 'admin') ? (
          <SystemConsole
            user={user}
            movies={allKnownMovies}
            defaultCity={selectedCity}
            onBackToUserPlatform={() => setActiveView('home')}
          />
        ) : (
          <>
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
          </>
        )}
      </main>

      <Footer
        isSignedIn={Boolean(user)}
        onSelectTab={handleSelectNavTab}
        onOpenProfile={() => {
          if (user) {
            setActiveView('profile');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        onOpenMyBookings={() => {
          if (user && !isOnboardingProfile) setIsMyTicketsOpen(true);
        }}
        onOpenMentorGuide={() => setIsMentorGuideOpen(true)}
        onOpenCityModal={() => setIsCityModalOpen(true)}
      />

      <BookingModal
        movie={selectedMovie}
        city={selectedCity}
        soldSeatMap={soldSeatMap}
        catalogConfig={catalogConfig}
        currentUserUid={user?.uid}
        currentUserName={user?.name}
        canBook={canBook}
        needsEmailVerification={needsEmailVerification}
        isNotified={Boolean(user && selectedMovie && notifiedIds.includes(selectedMovie.id))}
        onToggleNotify={handleToggleNotify}
        onRequireAuth={(msg) => {
          if (needsProfileCompletion && user?.emailVerified) {
            setSelectedMovie(null);
            setActiveView('profile');
            return;
          }
          openSignInWithPrompt(msg);
        }}
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
          setUser((prev) => (prev ? { ...prev, preferredCity: city } : prev));
          if (user?.uid && user.emailVerified && isProfileComplete(user)) {
            upsertUserPrivateProfile(user.uid, {
              name: user.name,
              email: user.email,
              phone: user.phone,
              age: user.age,
              gender: user.gender,
              favoriteCategories: user.favoriteCategories,
              preferredCity: city,
              preferredLanguage: user.preferredLanguage,
              preferredFormat: user.preferredFormat,
              provider: user.provider === 'password' ? 'password' : 'google',
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
        bookingSyncError={bookingSyncError}
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
