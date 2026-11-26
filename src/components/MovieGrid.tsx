import React from 'react';
import { Film, Loader2, RotateCcw } from 'lucide-react';
import { CategoryTab, Movie } from '../types/cinema';
import { MovieCard } from './MovieCard';

interface MovieGridProps {
  movies: Movie[];
  activeTab: CategoryTab;
  selectedCity: string;
  searchQuery: string;
  selectedGenre: string;
  genres: string[];
  isLoading: boolean;
  dataSource: 'tmdb' | 'local';
  onSelectGenre: (genre: string) => void;
  onSelectMovie: (movie: Movie) => void;
  notifiedIds: string[];
  onToggleNotify: (movieId: string) => void;
  onResetFilters: () => void;
}

export const MovieGrid: React.FC<MovieGridProps> = ({
  movies,
  activeTab,
  selectedCity,
  searchQuery,
  selectedGenre,
  genres,
  isLoading,
  onSelectGenre,
  onSelectMovie,
  notifiedIds,
  onToggleNotify,
  onResetFilters,
}) => {
  const headingParts: Record<CategoryTab, { prefix: string; cursive: string; suffix: string }> = {
    all: { prefix: 'Recommended', cursive: 'Movies', suffix: `in ${selectedCity}` },
    'top-rated': { prefix: 'Top Rated', cursive: 'Movies', suffix: `in ${selectedCity}` },
    'now-showing': { prefix: 'Now', cursive: 'Showing', suffix: `in ${selectedCity}` },
    upcoming: { prefix: 'Upcoming', cursive: 'Releases', suffix: `in ${selectedCity}` },
  };

  const activeHeading = headingParts[activeTab];
  const ariaHeading = searchQuery.trim()
    ? `Results for "${searchQuery.trim()}" in ${selectedCity}`
    : `${activeHeading.prefix} ${activeHeading.cursive} ${activeHeading.suffix}`;

  return (
    <section
      aria-label={ariaHeading}
      className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
    >
      {/* Section Header & Genre Filter Strip */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between dark:border-slate-800">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#070910] sm:text-[32px] dark:text-slate-100">
            {searchQuery.trim() ? (
              <>
                Results for{' '}
                <span className="font-cursive px-1 text-[1.22em] leading-none text-blue-600 dark:text-lime-400">
                  &ldquo;{searchQuery.trim()}&rdquo;
                </span>{' '}
                in {selectedCity}
              </>
            ) : (
              <>
                {activeHeading.prefix}{' '}
                <span className="font-cursive px-0.5 text-[1.24em] leading-none text-blue-600 dark:text-lime-400">
                  {activeHeading.cursive}
                </span>{' '}
                {activeHeading.suffix}
              </>
            )}
          </h1>
        </div>

        {/* Genre Filter Buttons */}
        <div
          role="group"
          aria-label="Filter by genre"
          className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0"
        >
          {genres.map((genre) => {
            const active = selectedGenre === genre;
            return (
              <button
                key={genre}
                type="button"
                onClick={() => onSelectGenre(genre)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  active
                    ? 'bg-blue-600 text-white shadow-xs dark:bg-lime-400 dark:text-[#070910]'
                    : 'bg-slate-200/80 text-slate-700 hover:bg-blue-100 hover:text-blue-800 dark:bg-[#0D111C] dark:text-slate-300 dark:ring-1 dark:ring-slate-800 dark:hover:ring-blue-500/50 dark:hover:text-lime-300'
                }`}
              >
                {genre}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="mt-10 flex flex-col items-center justify-center py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-lime-400" />
          <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-400">
            Loading movies from TMDB...
          </p>
        </div>
      ) : movies.length > 0 ? (
        /* 5 Movies Per Row Grid */
        <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-x-6 lg:gap-y-10">
          {movies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              onSelect={onSelectMovie}
              isNotified={notifiedIds.includes(movie.id)}
              onToggleNotify={onToggleNotify}
            />
          ))}
        </div>
      ) : (
        <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-[#0D111C]">
          <Film className="h-10 w-10 text-blue-500 dark:text-lime-400" aria-hidden="true" />
          <h2 className="mt-3 font-display text-lg font-semibold text-[#070910] dark:text-slate-100">
            No matching movies found
          </h2>
          <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Try clearing your search or switching back to all genres to browse every release.
          </p>
          <button
            type="button"
            onClick={onResetFilters}
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-blue-500 dark:bg-lime-400 dark:text-[#070910] dark:hover:bg-lime-300"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset Filters
          </button>
        </div>
      )}
    </section>
  );
};
