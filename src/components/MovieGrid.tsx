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
  dataSource: 'movieglu' | 'local';
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
  dataSource,
  onSelectGenre,
  onSelectMovie,
  notifiedIds,
  onToggleNotify,
  onResetFilters,
}) => {
  const headingMap: Record<CategoryTab, string> = {
    all: `Recommended Movies in ${selectedCity}`,
    'top-rated': `Top Rated Movies in ${selectedCity}`,
    'now-showing': `Now Showing in ${selectedCity}`,
    upcoming: `Upcoming Releases in ${selectedCity}`,
  };

  return (
    <section
      aria-label={headingMap[activeTab]}
      className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
    >
      {/* Section Header & Genre Filter Strip */}
      <div className="flex flex-col gap-4 border-b border-stone-200 pb-5 sm:flex-row sm:items-end sm:justify-between dark:border-zinc-800">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-zinc-900 sm:text-[30px] dark:text-stone-100">
            {searchQuery.trim()
              ? `Results for "${searchQuery.trim()}" in ${selectedCity}`
              : headingMap[activeTab]}
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
                className={`rounded-xl px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 ${
                  active
                    ? 'bg-zinc-900 text-white dark:bg-rose-600 dark:text-white'
                    : 'bg-stone-200/70 text-zinc-700 hover:bg-stone-200 hover:text-zinc-950 dark:bg-zinc-800/90 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white'
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
          <Loader2 className="h-8 w-8 animate-spin text-red-600 dark:text-rose-500" />
          <p className="mt-3 text-sm font-medium text-stone-600 dark:text-zinc-400">
            Loading movies from MovieGlu...
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
        <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center dark:border-zinc-800 dark:bg-[#1A1A1F]">
          <Film className="h-10 w-10 text-stone-400 dark:text-zinc-500" aria-hidden="true" />
          <h2 className="mt-3 font-display text-lg font-semibold text-zinc-900 dark:text-stone-100">
            No matching movies found
          </h2>
          <p className="mt-1 max-w-md text-sm text-stone-500 dark:text-zinc-400">
            Try clearing your search or switching back to all genres to browse every release.
          </p>
          <button
            type="button"
            onClick={onResetFilters}
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-red-700"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset Filters
          </button>
        </div>
      )}
    </section>
  );
};
