import React from 'react';
import {
  BookOpen,
  ChevronDown,
  MapPin,
  Moon,
  Search,
  Sun,
  Ticket,
  User,
  X,
} from 'lucide-react';
import { CategoryTab, UserProfile } from '../types/cinema';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedCity: string;
  onOpenCityModal: () => void;
  user: UserProfile | null;
  onOpenSignIn: () => void;
  onSignOut: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  activeTab: CategoryTab;
  onSelectTab: (tab: CategoryTab) => void;
  bookingsCount: number;
  onOpenMyBookings: () => void;
  onOpenMentorGuide: () => void;
}

/**
 * Drop your custom CinNova logo into /public/cinnova-logo.png to override the built-in emblem.
 */
const CUSTOM_LOGO_SRC = '/cinnova-logo.png';

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  selectedCity,
  onOpenCityModal,
  user,
  onOpenSignIn,
  onSignOut,
  isDark,
  onToggleTheme,
  activeTab,
  onSelectTab,
  bookingsCount,
  onOpenMyBookings,
  onOpenMentorGuide,
}) => {
  const [logoImgFailed, setLogoImgFailed] = React.useState(false);

  const navItems: { id: CategoryTab; label: string }[] = [
    { id: 'all', label: 'All Movies' },
    { id: 'top-rated', label: 'Top Rated' },
    { id: 'now-showing', label: 'Now Showing' },
    { id: 'upcoming', label: 'Upcoming' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-[#F4F7FC]/95 backdrop-blur-md transition-colors duration-200 dark:border-blue-500/20 dark:bg-[#070910]/95">
      {/* Main Top Bar */}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:gap-8 lg:px-8">
        {/* 1. Brand Logo & Name */}
        <button
          type="button"
          onClick={() => {
            onSelectTab('all');
            onSearchChange('');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="group flex shrink-0 items-center gap-2.5 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-blue-600 text-lime-300 shadow-sm ring-1 ring-blue-500/40 transition-transform duration-150 group-hover:-rotate-3 group-hover:scale-105">
            {!logoImgFailed ? (
              <img
                src={CUSTOM_LOGO_SRC}
                alt="CinNova Logo"
                onError={() => setLogoImgFailed(true)}
                className="h-full w-full object-contain p-1"
              />
            ) : (
              <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none" aria-hidden="true">
                <rect x="4" y="6" width="24" height="20" rx="4" stroke="currentColor" strokeWidth="2.2" />
                <polygon points="13,11 22,16 13,21" fill="currentColor" />
              </svg>
            )}
          </div>
          <span className="font-display text-[22px] font-bold tracking-tight text-[#070910] whitespace-nowrap dark:text-slate-100">
            Cin<span className="text-blue-600 dark:text-lime-400">Nova</span>
          </span>
        </button>

        {/* 2. Search Bar */}
        <div className="relative hidden max-w-xl flex-1 md:block">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search movies, genres, languages, or cast..."
            aria-label="Search movies"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-9 text-sm text-[#070910] placeholder:text-slate-400 shadow-2xs transition-colors focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-[#0D111C] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-lime-400 dark:focus:ring-lime-400/15"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-800 dark:hover:text-lime-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* 3. Right Controls: City -> Sign In -> Theme Toggle */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onOpenCityModal}
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-blue-50 hover:text-[#070910] whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-200 dark:hover:bg-[#131926] dark:hover:text-lime-300"
          >
            <MapPin className="h-4 w-4 text-blue-600 dark:text-lime-400" aria-hidden="true" />
            <span>{selectedCity}</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenMyBookings}
                className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-[#070910] transition-colors hover:border-blue-400 hover:bg-blue-50/50 whitespace-nowrap dark:border-blue-500/30 dark:bg-[#0D111C] dark:text-slate-100 dark:hover:border-lime-400/60 dark:hover:bg-[#131926]"
              >
                <User className="h-3.5 w-3.5 text-blue-600 dark:text-lime-400" />
                <span className="max-w-[90px] truncate">{user.name.split(' ')[0]}</span>
              </button>
              <button
                type="button"
                onClick={onSignOut}
                className="hidden h-10 items-center rounded-xl px-2.5 text-xs font-medium text-slate-500 hover:text-blue-600 sm:inline-flex dark:text-slate-400 dark:hover:text-lime-300"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenSignIn}
              className="h-10 shrink-0 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white shadow-xs transition-colors duration-150 hover:bg-blue-500 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:bg-lime-400 dark:text-[#070910] dark:hover:bg-lime-300 dark:focus-visible:ring-offset-[#070910]"
            >
              Sign in
            </button>
          )}

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-colors hover:border-blue-400 hover:bg-blue-50/50 hover:text-[#070910] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-800 dark:bg-[#0D111C] dark:text-slate-200 dark:hover:border-blue-500/50 dark:hover:bg-[#131926]"
          >
            {isDark ? <Sun className="h-4 w-4 text-lime-400" /> : <Moon className="h-4 w-4 text-blue-600" />}
          </button>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="border-t border-slate-200/70 px-4 py-2 md:hidden dark:border-slate-800/80">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search movies, genres, cast..."
            aria-label="Search movies"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm text-[#070910] placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-800 dark:bg-[#0D111C] dark:text-slate-100"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Secondary Navigation Row */}
      <div className="border-t border-slate-200/80 bg-[#EAF0FA]/90 dark:border-slate-800/80 dark:bg-[#0B0F1A]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <nav
            aria-label="Movie categories"
            className="no-scrollbar flex items-center gap-6 overflow-x-auto py-2.5 sm:gap-8"
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`relative py-1 text-sm whitespace-nowrap shrink-0 transition-colors focus:outline-none focus-visible:text-blue-600 ${
                    isActive
                      ? 'font-semibold text-blue-600 dark:text-lime-400'
                      : 'font-medium text-slate-600 hover:text-[#070910] dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute inset-x-0 -bottom-2.5 h-0.5 rounded-full bg-blue-600 dark:bg-lime-400" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-4">
            {user && (
              <button
                type="button"
                onClick={onOpenMyBookings}
                className="flex shrink-0 items-center gap-1.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:text-blue-600 whitespace-nowrap dark:text-slate-200 dark:hover:text-lime-400"
              >
                <Ticket className="h-3.5 w-3.5 text-blue-600 dark:text-lime-400" aria-hidden="true" />
                <span>My Bookings</span>
                {bookingsCount > 0 && (
                  <span className="font-mono-tabular text-xs font-semibold text-blue-600 dark:text-lime-400">
                    ({bookingsCount})
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onOpenMentorGuide}
              className="flex shrink-0 items-center gap-1.5 py-2 text-xs font-medium text-slate-600 transition-colors hover:text-blue-600 whitespace-nowrap dark:text-slate-300 dark:hover:text-lime-400"
            >
              <BookOpen className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <span>Mentor and API Guide</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
