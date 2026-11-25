import React from 'react';
import { CategoryTab } from '../types/cinema';

interface FooterProps {
  onSelectTab: (tab: CategoryTab) => void;
  onOpenMyTickets: () => void;
  onOpenCityModal: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onSelectTab,
  onOpenMyTickets,
  onOpenCityModal,
}) => {
  const handleNavClick = (tab: CategoryTab) => {
    onSelectTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="mt-14 border-t border-stone-200 bg-white transition-colors duration-200 dark:border-zinc-800 dark:bg-[#151519]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-600 text-white">
                <svg viewBox="0 0 32 32" className="h-4 w-4" fill="none" aria-hidden="true">
                  <rect x="4" y="6" width="24" height="20" rx="4" stroke="currentColor" strokeWidth="2.2" />
                  <polygon points="13,11 22,16 13,21" fill="currentColor" />
                </svg>
              </div>
              <span className="font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-stone-100">
                Cin<span className="text-red-600 dark:text-rose-500">Nova</span>
              </span>
            </div>
            <p className="mt-2.5 text-sm text-stone-600 dark:text-zinc-400">
              Movie tickets, live auditorium seat selection, and digital QR passes.
            </p>
            <p className="mt-2 text-sm font-medium text-zinc-800 dark:text-stone-200">
              Created by <span className="font-semibold text-red-600 dark:text-rose-400">The Neon</span>
            </p>
          </div>

          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-stone-600 dark:text-zinc-400"
          >
            <button
              type="button"
              onClick={() => handleNavClick('all')}
              className="transition-colors hover:text-zinc-950 whitespace-nowrap dark:hover:text-white"
            >
              All Movies
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('top-rated')}
              className="transition-colors hover:text-zinc-950 whitespace-nowrap dark:hover:text-white"
            >
              Top Rated
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('now-showing')}
              className="transition-colors hover:text-zinc-950 whitespace-nowrap dark:hover:text-white"
            >
              Now Showing
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('upcoming')}
              className="transition-colors hover:text-zinc-950 whitespace-nowrap dark:hover:text-white"
            >
              Upcoming
            </button>
            <button
              type="button"
              onClick={onOpenCityModal}
              className="transition-colors hover:text-zinc-950 whitespace-nowrap dark:hover:text-white"
            >
              Select City
            </button>
            <button
              type="button"
              onClick={onOpenMyTickets}
              className="transition-colors hover:text-zinc-950 whitespace-nowrap dark:hover:text-white"
            >
              My Tickets
            </button>
          </nav>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-stone-200/80 pt-6 text-xs text-stone-500 sm:flex-row dark:border-zinc-800 dark:text-zinc-500">
          <p>© {new Date().getFullYear()} CinNova. All rights reserved.</p>
          <p>Cinema data powered by MovieGlu · Created by The Neon</p>
        </div>
      </div>
    </footer>
  );
};
