import React from 'react';
import { CategoryTab } from '../types/cinema';

interface FooterProps {
  isSignedIn: boolean;
  onSelectTab: (tab: CategoryTab) => void;
  onOpenProfile: () => void;
  onOpenMyBookings: () => void;
  onOpenMentorGuide: () => void;
  onOpenCityModal: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  isSignedIn,
  onSelectTab,
  onOpenProfile,
  onOpenMyBookings,
  onOpenMentorGuide,
  onOpenCityModal,
}) => {
  const handleNavClick = (tab: CategoryTab) => {
    onSelectTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="mt-14 border-t border-slate-200 bg-white transition-colors duration-200 dark:border-blue-500/20 dark:bg-[#0B0F1A]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#070910] ring-1 ring-blue-500/40 dark:ring-lime-400/35">
                <img
                  src="/cinnova-logo.jpg"
                  alt="CinNova Logo"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="font-display text-lg font-bold tracking-tight text-[#070910] dark:text-slate-100">
                Cin<span className="text-blue-600 dark:text-lime-400">Nova</span>
              </span>
            </div>
            <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-400">
              Movie tickets, live auditorium seat selection, and digital QR passes.
            </p>
            <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-200">
              Created by <span className="font-semibold text-blue-600 dark:text-lime-400">The Neon</span>
            </p>
          </div>

          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600 dark:text-slate-400"
          >
            <button
              type="button"
              onClick={() => handleNavClick('all')}
              className="transition-colors hover:text-blue-600 whitespace-nowrap dark:hover:text-lime-400"
            >
              All Movies
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('top-rated')}
              className="transition-colors hover:text-blue-600 whitespace-nowrap dark:hover:text-lime-400"
            >
              Top Rated
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('now-showing')}
              className="transition-colors hover:text-blue-600 whitespace-nowrap dark:hover:text-lime-400"
            >
              Now Showing
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('upcoming')}
              className="transition-colors hover:text-blue-600 whitespace-nowrap dark:hover:text-lime-400"
            >
              Upcoming
            </button>
            <button
              type="button"
              onClick={onOpenCityModal}
              className="transition-colors hover:text-blue-600 whitespace-nowrap dark:hover:text-lime-400"
            >
              Select City
            </button>
            {isSignedIn && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onOpenProfile();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="transition-colors hover:text-blue-600 whitespace-nowrap dark:hover:text-lime-400"
                >
                  My Profile
                </button>
                <button
                  type="button"
                  onClick={onOpenMyBookings}
                  className="transition-colors hover:text-blue-600 whitespace-nowrap dark:hover:text-lime-400"
                >
                  My Bookings
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onOpenMentorGuide}
              className="transition-colors hover:text-blue-600 whitespace-nowrap dark:hover:text-lime-400"
            >
              Mentor and API Guide
            </button>
          </nav>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-slate-200/80 pt-6 text-xs text-slate-500 sm:flex-row dark:border-slate-800 dark:text-slate-500">
          <p>© {new Date().getFullYear()} CinNova. All rights reserved.</p>
          <p>Movie catalog powered by TMDB · Created by The Neon</p>
        </div>
      </div>
    </footer>
  );
};
