import React from 'react';
import { Star, Ticket } from 'lucide-react';
import { Movie } from '../types/cinema';
import { PosterArtwork } from './PosterArtwork';

interface MovieCardProps {
  movie: Movie;
  onSelect: (movie: Movie) => void;
  isNotified?: boolean;
  onToggleNotify?: (movieId: string) => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({
  movie,
  onSelect,
  isNotified = false,
  onToggleNotify,
}) => {
  const isUpcoming = movie.status === 'upcoming';

  return (
    <article className="group flex flex-col">
      {/* Authentic 2:3 Cinema Poster Frame */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(movie)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(movie);
          }
        }}
        aria-label={`${movie.title} — ${isUpcoming ? 'Preview release' : 'Pick seats'}`}
        className="relative aspect-[2/3] w-full cursor-pointer overflow-hidden rounded-xl bg-slate-200 shadow-sm ring-1 ring-slate-900/10 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1.5 group-hover:ring-blue-500/60 group-hover:shadow-xl group-hover:shadow-blue-900/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-[#0D111C] dark:ring-blue-500/20 dark:group-hover:ring-lime-400/65 dark:group-hover:shadow-blue-950/60"
      >
        <PosterArtwork
          movie={movie}
          className="transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
        />

        {/* Measured bottom scrim for crisp rating contrast */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#070910]/95 via-[#070910]/60 to-transparent" />

        {/* Subtle Hover Action Reveal */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#070910]/45 opacity-0 backdrop-blur-[1px] transition-opacity duration-200 group-hover:opacity-100">
          <span className="inline-flex translate-y-2 items-center gap-1.5 rounded-xl bg-lime-400 px-3.5 py-2 text-xs font-bold text-[#070910] shadow-lg transition-transform duration-200 group-hover:translate-y-0 whitespace-nowrap">
            <Ticket className="h-3.5 w-3.5" aria-hidden="true" />
            {isUpcoming ? 'Preview Movie' : 'Book Seats'}
          </span>
        </div>

        {/* Bottom Poster Rating / Release Bar */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 px-3 py-2.5 text-xs text-white">
          <div className="flex items-center gap-1.5 font-medium">
            <Star
              className="h-3.5 w-3.5 shrink-0 fill-lime-400 text-lime-400"
              aria-hidden="true"
            />
            <span className="font-mono-tabular font-semibold">{movie.rating.toFixed(1)}/10</span>
          </div>
          <span className="font-mono-tabular truncate text-[11px] text-slate-300">
            {isUpcoming ? movie.releaseDate : `${movie.votes} Votes`}
          </span>
        </div>
      </div>

      {/* Metadata Below Poster */}
      <div className="mt-2.5 flex flex-1 flex-col justify-between px-0.5">
        <div>
          <h3 className="font-display text-[15px] font-bold leading-snug text-[#070910] transition-colors group-hover:text-blue-600 line-clamp-1 dark:text-slate-100 dark:group-hover:text-lime-400">
            <button
              type="button"
              onClick={() => onSelect(movie)}
              className="text-left focus:outline-none"
            >
              {movie.title}
            </button>
          </h3>
          <p className="mt-0.5 text-xs text-slate-600 line-clamp-1 dark:text-slate-400">
            {movie.genres.join(' · ')}
          </p>
        </div>

        <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="truncate">{movie.language}</span>
          {isUpcoming && onToggleNotify ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleNotify(movie.id);
              }}
              className={`shrink-0 font-semibold transition-colors ${
                isNotified
                  ? 'text-lime-600 dark:text-lime-400'
                  : 'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-lime-300'
              }`}
            >
              {isNotified ? 'Notified ✓' : 'Notify Me'}
            </button>
          ) : (
            <span className="font-mono-tabular shrink-0 text-slate-400 dark:text-slate-500">
              {movie.certification}
            </span>
          )}
        </div>
      </div>
    </article>
  );
};
