import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  BookOpen,
  Check,
  CheckCircle2,
  Film,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Ticket,
  User,
} from 'lucide-react';
import { CITIES } from '../data/movies';
import { GenderOption, UserProfile } from '../types/cinema';

interface ProfilePageProps {
  user: UserProfile;
  selectedCity: string;
  bookingsCount: number;
  calendarAlertsCount: number;
  isOnboarding: boolean;
  isSyncedToFirebase: boolean;
  profileSyncError?: string | null;
  onSaveProfile: (updated: {
    name: string;
    phone: string;
    age?: number;
    gender: GenderOption;
    favoriteCategories: string[];
    preferredCity: string;
    preferredLanguage: string;
    preferredFormat: string;
  }) => Promise<void>;
  onBackToMovies: (filterGenre?: string) => void;
  onOpenMyBookings: () => void;
  onOpenMentorGuide: () => void;
  onOpenVerifyModal: () => void;
  onSignOut: () => void;
}

const MOVIE_CATEGORIES = [
  'Action',
  'Thriller',
  'Sci-Fi',
  'Drama',
  'Comedy',
  'Romance',
  'Mystery',
  'Horror',
  'Crime',
  'Adventure',
  'Animation',
  'Fantasy',
];

const GENDER_OPTIONS: { value: GenderOption; label: string }[] = [
  { value: '', label: 'Select gender' },
  { value: 'Female', label: 'Female' },
  { value: 'Male', label: 'Male' },
  { value: 'Non-binary', label: 'Non-binary' },
  { value: 'Prefer not to say', label: 'Prefer not to say' },
];

const LANGUAGE_OPTIONS = [
  'Any',
  'Hindi',
  'English',
  'Tamil',
  'Telugu',
  'Malayalam',
  'Kannada',
  'Marathi',
  'Bengali',
];

const FORMAT_OPTIONS = ['Any', '2D', 'IMAX 2D', '4DX', 'Dolby Atmos'];

export const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  selectedCity,
  bookingsCount,
  calendarAlertsCount,
  isOnboarding,
  isSyncedToFirebase,
  profileSyncError,
  onSaveProfile,
  onBackToMovies,
  onOpenMyBookings,
  onOpenMentorGuide,
  onOpenVerifyModal,
  onSignOut,
}) => {
  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [ageInput, setAgeInput] = useState(user.age !== undefined ? String(user.age) : '');
  const [gender, setGender] = useState<GenderOption>(user.gender || '');
  const [favoriteCategories, setFavoriteCategories] = useState<string[]>(
    user.favoriteCategories || []
  );
  const [preferredCity, setPreferredCity] = useState(user.preferredCity || selectedCity);
  const [preferredLanguage, setPreferredLanguage] = useState(user.preferredLanguage || 'Any');
  const [preferredFormat, setPreferredFormat] = useState(user.preferredFormat || 'Any');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    setName(user.name || '');
    setPhone(user.phone || '');
    setAgeInput(user.age !== undefined ? String(user.age) : '');
    setGender(user.gender || '');
    setFavoriteCategories(user.favoriteCategories || []);
    setPreferredCity(user.preferredCity || selectedCity);
    setPreferredLanguage(user.preferredLanguage || 'Any');
    setPreferredFormat(user.preferredFormat || 'Any');
  }, [
    user.uid,
    user.name,
    user.phone,
    user.age,
    user.gender,
    user.favoriteCategories,
    user.preferredCity,
    user.preferredLanguage,
    user.preferredFormat,
    selectedCity,
  ]);

  const initials = (name || user.name || 'CN')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  const toggleCategory = (category: string) => {
    setSavedMsg('');
    setErrorMsg('');
    setFavoriteCategories((prev) => {
      if (prev.includes(category)) {
        return prev.filter((item) => item !== category);
      }
      if (prev.length >= 8) {
        setErrorMsg('You can select up to 8 favorite movie categories.');
        return prev;
      }
      return [...prev, category];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSavedMsg('');

    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMsg('Full name is required.');
      return;
    }

    const cleanPhone = phone.trim();
    const phoneDigits = cleanPhone.replace(/\D/g, '');
    if (phoneDigits.length < 7) {
      setErrorMsg('Phone number is required (enter at least 7 digits).');
      return;
    }

    const trimmedAge = ageInput.trim();
    if (trimmedAge === '') {
      setErrorMsg('Age is required.');
      return;
    }
    const parsedAge = Number(trimmedAge);
    if (!Number.isInteger(parsedAge) || parsedAge < 10 || parsedAge > 120) {
      setErrorMsg('Please enter a valid age between 10 and 120.');
      return;
    }

    if (!gender) {
      setErrorMsg('Please select your gender.');
      return;
    }

    setIsSaving(true);
    try {
      await onSaveProfile({
        name: cleanName.slice(0, 80),
        phone: cleanPhone.slice(0, 24),
        age: parsedAge,
        gender,
        favoriteCategories,
        preferredCity,
        preferredLanguage,
        preferredFormat,
      });
      setSavedMsg(
        user.emailVerified
          ? 'Profile completed and saved to Firebase Firestore (cinnova-001).'
          : 'Required profile details saved locally. Verify your email below to save them to Firebase Firestore.'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.startsWith('{') && msg.includes('"operationType"')) {
        setErrorMsg(
          'Could not save profile to Firebase Firestore. Check your email verification and publish the updated firestore.rules in Firebase Console (cinnova-001).'
        );
      } else {
        setErrorMsg(msg || 'Failed to save profile changes. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section
      aria-label="User Profile"
      className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
    >
      {/* Top Bar & Back Action */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between dark:border-slate-800">
        <div>
          {!isOnboarding && (
            <button
              type="button"
              onClick={() => onBackToMovies()}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700 dark:text-lime-400 dark:hover:text-lime-300"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Back to Movies</span>
            </button>
          )}
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-[#070910] sm:text-[32px] dark:text-slate-100">
            {isOnboarding ? 'Complete Your' : 'My'}{' '}
            <span className="font-cursive px-0.5 text-[1.22em] leading-none text-blue-600 dark:text-lime-400">
              Profile
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {isOnboarding
              ? 'First step for new members: complete all required personal details below to start booking.'
              : 'Personal details, favorite movie genres, and cinema booking preferences.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {!isOnboarding && (
            <button
              type="button"
              onClick={onOpenMyBookings}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-[#070910] transition-colors hover:border-blue-400 hover:bg-blue-50/50 whitespace-nowrap dark:border-blue-500/30 dark:bg-[#0D111C] dark:text-slate-100 dark:hover:border-lime-400/60"
            >
              <Ticket className="h-3.5 w-3.5 text-blue-600 dark:text-lime-400" aria-hidden="true" />
              <span>My Bookings ({bookingsCount})</span>
            </button>
          )}
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition-colors hover:border-amber-400 hover:text-amber-700 whitespace-nowrap dark:border-slate-800 dark:bg-[#0D111C] dark:text-slate-300 dark:hover:border-amber-400/60 dark:hover:text-amber-300"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Onboarding Gate Banner */}
      {isOnboarding && (
        <div className="mt-6 rounded-2xl border border-blue-500/30 bg-blue-50/80 p-4 text-xs text-[#070910] dark:border-lime-400/35 dark:bg-lime-400/10 dark:text-slate-100">
          <p className="font-semibold text-blue-700 dark:text-lime-300">
            Step 1: Complete Your Profile Before Continuing
          </p>
          <p className="mt-1 leading-relaxed text-slate-700 dark:text-slate-300">
            All personal information fields (Full Name, Phone Number, Age, and Gender) are required.
            Favorite Movie Categories and Theatre Preferences are optional.
          </p>
        </div>
      )}

      {/* Verification Warning Banner if signed in via unverified email */}
      {!user.emailVerified && (
        <div className="mt-6 flex flex-col items-start justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center dark:border-amber-500/40 dark:bg-amber-950/35">
          <div className="text-xs text-amber-900 dark:text-amber-200">
            <p className="font-semibold">Email verification required for Firebase sync</p>
            <p className="mt-0.5 text-amber-800 dark:text-amber-300/90">
              Verify your email address so your saved profile details and bookings appear in Firebase Firestore.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenVerifyModal}
            className="h-9 shrink-0 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-blue-500 whitespace-nowrap dark:bg-lime-400 dark:text-[#070910] dark:hover:bg-lime-300"
          >
            Verify Email
          </button>
        </div>
      )}

      {/* Main 2-Column Content */}
      <div className="mt-7 grid gap-6 lg:grid-cols-12 lg:items-start">
        {/* Left Column: Summary & Important Project Details */}
        <aside className="space-y-6 lg:col-span-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-blue-500/20 dark:bg-[#0D111C]">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 font-display text-lg font-bold text-white shadow-sm ring-1 ring-blue-500/40 dark:bg-lime-400 dark:text-[#070910]">
                {initials || <User className="h-6 w-6" />}
              </div>
              <div className="min-w-0">
                <h2 className="font-display truncate text-lg font-bold text-[#070910] dark:text-slate-100">
                  {name.trim() || user.name || 'CinNova Member'}
                </h2>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {user.email || 'No email on file'}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <ShieldCheck
                    className={`h-3.5 w-3.5 ${
                      user.emailVerified
                        ? 'text-lime-600 dark:text-lime-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                    aria-hidden="true"
                  />
                  <span>
                    {user.provider === 'google' ? 'Google Sign-In' : 'Email Account'} ·{' '}
                    {user.emailVerified ? 'Verified' : 'Unverified'}
                  </span>
                </p>
              </div>
            </div>

            {/* Key Profile Snapshot */}
            <dl className="mt-6 space-y-3 border-t border-slate-200 pt-5 text-xs dark:border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500 dark:text-slate-400">Age / Gender</dt>
                <dd className="font-mono-tabular font-semibold text-[#070910] dark:text-slate-100">
                  {ageInput.trim() ? `${ageInput.trim()} yrs` : 'Not set'} ·{' '}
                  {gender || 'Not set'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500 dark:text-slate-400">Phone</dt>
                <dd className="font-mono-tabular font-semibold text-[#070910] dark:text-slate-100">
                  {phone.trim() || 'Not added'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500 dark:text-slate-400">Cinema City</dt>
                <dd className="font-semibold text-blue-600 dark:text-lime-400">
                  {preferredCity}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500 dark:text-slate-400">Audio / Screen</dt>
                <dd className="font-semibold text-[#070910] dark:text-slate-100">
                  {preferredLanguage} · {preferredFormat}
                </dd>
              </div>
            </dl>

            {/* Activity Metrics */}
            <div className="mt-6 grid grid-cols-3 gap-2 border-t border-slate-200 pt-5 text-center dark:border-slate-800">
              <div className="rounded-xl bg-[#F4F7FC] p-3 dark:bg-[#070910]">
                <p className="font-mono-tabular text-lg font-bold text-[#070910] dark:text-lime-400">
                  {bookingsCount}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Bookings</p>
              </div>
              <div className="rounded-xl bg-[#F4F7FC] p-3 dark:bg-[#070910]">
                <p className="font-mono-tabular text-lg font-bold text-[#070910] dark:text-blue-400">
                  {calendarAlertsCount}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Alerts</p>
              </div>
              <div className="rounded-xl bg-[#F4F7FC] p-3 dark:bg-[#070910]">
                <p className="font-mono-tabular text-lg font-bold text-[#070910] dark:text-slate-100">
                  {favoriteCategories.length}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Genres</p>
              </div>
            </div>
          </div>

          {/* Important Project Details Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-blue-500/20 dark:bg-[#0D111C]">
            <h3 className="font-display text-sm font-bold text-[#070910] dark:text-slate-100">
              CinNova Account &amp; Project Details
            </h3>
            <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-lime-400" />
                <span>
                  <strong className="text-[#070910] dark:text-slate-200">City Multiplexes:</strong>{' '}
                  Showtimes and seat layouts adapt automatically to your home city ({preferredCity}).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Ticket className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-lime-400" />
                <span>
                  <strong className="text-[#070910] dark:text-slate-200">Checkout &amp; QR Passes:</strong>{' '}
                  Bookings process via Sandbox Payment Gateway and store digital QR M-Tickets under My Bookings.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-lime-400" />
                <span>
                  <strong className="text-[#070910] dark:text-slate-200">Firebase Storage:</strong>{' '}
                  {isSyncedToFirebase
                    ? `Profile & bookings are synced to Firebase Firestore (users/${user.uid}/private/profile).`
                    : profileSyncError
                    ? `Firebase sync issue: ${profileSyncError}`
                    : user.emailVerified
                    ? `Profile saves directly to Firebase Firestore (users/${user.uid}/private/profile).`
                    : 'Verify your email so your saved profile and bookings write to Firebase Firestore.'}
                </span>
              </li>
            </ul>

            <button
              type="button"
              onClick={onOpenMentorGuide}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline dark:text-lime-400"
            >
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              <span>View Full Mentor &amp; API Guide</span>
            </button>
          </div>
        </aside>

        {/* Right Column: Editable Profile & Movie Preferences Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 lg:col-span-8 dark:border-blue-500/20 dark:bg-[#0D111C]"
        >
          {/* Section 1: Personal Details (All Required) */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-base font-bold text-[#070910] dark:text-slate-100">
                Personal Information
              </h2>
              <span className="text-[11px] font-semibold text-blue-600 dark:text-lime-400">
                * All fields required
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Used for your M-Ticket holder details, booking confirmations, and Firebase account record.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="profile-name"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Full Name <span className="text-blue-600 dark:text-lime-400">*</span>
                </label>
                <div className="relative mt-1.5">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="profile-name"
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setSavedMsg('');
                    }}
                    maxLength={80}
                    required
                    placeholder="Enter your full name"
                    className="w-full rounded-xl border border-slate-200 bg-[#F4F7FC] py-2.5 pl-9 pr-3 text-sm text-[#070910] focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-black dark:text-white dark:placeholder:text-slate-500 dark:focus:border-lime-400 dark:focus:bg-black"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="profile-email"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Email Address <span className="text-blue-600 dark:text-lime-400">*</span>
                </label>
                <div className="relative mt-1.5">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="profile-email"
                    type="email"
                    value={user.email}
                    readOnly
                    className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 py-2.5 pl-9 pr-3 text-sm text-slate-500 dark:border-slate-800 dark:bg-[#070910] dark:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="profile-phone"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Phone Number <span className="text-blue-600 dark:text-lime-400">*</span>
                </label>
                <div className="relative mt-1.5">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="profile-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setSavedMsg('');
                    }}
                    maxLength={24}
                    required
                    placeholder="+91 98765 43210"
                    className="font-mono-tabular w-full rounded-xl border border-slate-200 bg-[#F4F7FC] py-2.5 pl-9 pr-3 text-sm text-[#070910] focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-black dark:text-white dark:placeholder:text-slate-500 dark:focus:border-lime-400 dark:focus:bg-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="profile-age"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Age <span className="text-blue-600 dark:text-lime-400">*</span>
                  </label>
                  <input
                    id="profile-age"
                    type="number"
                    min={10}
                    max={120}
                    required
                    value={ageInput}
                    onChange={(e) => {
                      setAgeInput(e.target.value);
                      setSavedMsg('');
                    }}
                    placeholder="e.g. 21"
                    className="font-mono-tabular mt-1.5 w-full rounded-xl border border-slate-200 bg-[#F4F7FC] px-3 py-2.5 text-sm text-[#070910] focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-black dark:text-white dark:placeholder:text-slate-500 dark:focus:border-lime-400 dark:focus:bg-black"
                  />
                </div>

                <div>
                  <label
                    htmlFor="profile-gender"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Gender <span className="text-blue-600 dark:text-lime-400">*</span>
                  </label>
                  <select
                    id="profile-gender"
                    required
                    value={gender}
                    onChange={(e) => {
                      setGender(e.target.value as GenderOption);
                      setSavedMsg('');
                    }}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-[#F4F7FC] px-3 py-2.5 text-sm text-[#070910] focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-black dark:text-white dark:focus:border-lime-400 dark:focus:bg-black"
                  >
                    {GENDER_OPTIONS.map((opt) => (
                      <option key={opt.label} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Favorite Movie Categories (Optional) */}
          <div className="border-t border-slate-200 pt-6 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="flex items-center gap-2 font-display text-base font-bold text-[#070910] dark:text-slate-100">
                  <Film className="h-4 w-4 text-blue-600 dark:text-lime-400" aria-hidden="true" />
                  <span>Favorite Movie Categories</span>
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                    (Optional)
                  </span>
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Pick the genres you enjoy most (e.g. Action, Thriller, Sci-Fi) — up to 8.
                </p>
              </div>
              <span className="font-mono-tabular text-xs font-semibold text-blue-600 dark:text-lime-400">
                {favoriteCategories.length}/8 selected
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {MOVIE_CATEGORIES.map((category) => {
                const selected = favoriteCategories.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleCategory(category)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                      selected
                        ? 'border-blue-600 bg-blue-600 text-white shadow-2xs dark:border-lime-400 dark:bg-lime-400 dark:text-[#070910]'
                        : 'border-slate-200 bg-[#F4F7FC] text-slate-700 hover:border-blue-400 hover:text-blue-700 dark:border-slate-800 dark:bg-[#070910] dark:text-slate-300 dark:hover:border-lime-400/60 dark:hover:text-lime-300'
                    }`}
                  >
                    {selected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                    <span>{category}</span>
                  </button>
                );
              })}
            </div>

            {!isOnboarding && favoriteCategories.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>Quick filter in catalog:</span>
                {favoriteCategories.slice(0, 4).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => onBackToMovies(cat)}
                    className="font-semibold text-blue-600 hover:underline dark:text-lime-400"
                  >
                    Browse {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Cinema & Booking Preferences (Optional) */}
          <div className="border-t border-slate-200 pt-6 dark:border-slate-800">
            <h2 className="font-display text-base font-bold text-[#070910] dark:text-slate-100">
              Theatre &amp; Ticket Preferences{' '}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                (Optional)
              </span>
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Optional booking defaults tailored for your city and auditorium experience.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="profile-city"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Preferred City
                </label>
                <select
                  id="profile-city"
                  value={preferredCity}
                  onChange={(e) => {
                    setPreferredCity(e.target.value);
                    setSavedMsg('');
                  }}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-[#F4F7FC] px-3 py-2.5 text-sm text-[#070910] focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-black dark:text-white dark:focus:border-lime-400 dark:focus:bg-black"
                >
                  {CITIES.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="profile-language"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Preferred Language
                </label>
                <select
                  id="profile-language"
                  value={preferredLanguage}
                  onChange={(e) => {
                    setPreferredLanguage(e.target.value);
                    setSavedMsg('');
                  }}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-[#F4F7FC] px-3 py-2.5 text-sm text-[#070910] focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-black dark:text-white dark:focus:border-lime-400 dark:focus:bg-black"
                >
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="profile-format"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Preferred Format
                </label>
                <select
                  id="profile-format"
                  value={preferredFormat}
                  onChange={(e) => {
                    setPreferredFormat(e.target.value);
                    setSavedMsg('');
                  }}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-[#F4F7FC] px-3 py-2.5 text-sm text-[#070910] focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-black dark:text-white dark:focus:border-lime-400 dark:focus:bg-black"
                >
                  {FORMAT_OPTIONS.map((fmt) => (
                    <option key={fmt} value={fmt}>
                      {fmt}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {errorMsg && (
            <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-300">
              {errorMsg}
            </p>
          )}

          {savedMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-lime-500/40 bg-lime-50 px-4 py-2.5 text-xs font-medium text-[#070910] dark:border-lime-400/35 dark:bg-lime-400/10 dark:text-lime-200">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-lime-600 dark:text-lime-400" />
              <span>{savedMsg}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
            {!isOnboarding && (
              <button
                type="button"
                onClick={() => onBackToMovies()}
                className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Back to Movies
              </button>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 disabled:opacity-60 dark:bg-lime-400 dark:text-[#070910] dark:hover:bg-lime-300"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              <span>
                {isSaving
                  ? 'Saving to Firebase...'
                  : isOnboarding
                  ? 'Save Profile & Continue'
                  : 'Save Profile'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};
