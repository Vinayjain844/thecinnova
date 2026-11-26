import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  Bell,
  Calendar,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Film,
  Globe,
  Star,
} from 'lucide-react';
import { AdSlide } from '../types/cinema';
import { PosterArtwork } from './PosterArtwork';

interface FloatingAdCarouselProps {
  slides: AdSlide[];
  isSignedIn: boolean;
  notifiedIds: string[];
  onToggleNotify: (movieId: string) => void;
  onSelectSlide: (slide: AdSlide) => void;
}

export const FloatingAdCarousel: React.FC<FloatingAdCarouselProps> = ({
  slides,
  isSignedIn,
  notifiedIds,
  onToggleNotify,
  onSelectSlide,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (activeIndex >= slides.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, slides.length]);

  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setDirection(1);
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 5800);
    return () => window.clearInterval(timer);
  }, [isPaused, slides.length]);

  if (slides.length === 0) return null;

  const safeIndex = activeIndex < slides.length ? activeIndex : 0;
  const currentSlide = slides[safeIndex];
  const movie = currentSlide.movie;
  const isAddedToCalendar = isSignedIn && notifiedIds.includes(movie.id);
  const hasRealDirector =
    Boolean(movie.director) && movie.director !== 'Theatrical Feature';
  const hasRealCast =
    movie.cast.length > 0 && movie.cast[0] !== 'Ensemble Cast';
  const hasRealTagline =
    Boolean(movie.tagline) &&
    movie.tagline !== 'In cinemas & laser multiplexes.';

  const goTo = (nextIdx: number, dir: number) => {
    setDirection(dir);
    setActiveIndex((nextIdx + slides.length) % slides.length);
  };

  return (
    <section
      aria-label="Upcoming movie spotlight"
      className="mx-auto max-w-7xl px-4 pt-6 pb-2 sm:px-6 lg:px-8"
    >
      <div
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="group relative overflow-hidden rounded-2xl bg-[#070910] shadow-[0_24px_56px_-18px_rgba(37,99,235,0.38)] ring-1 ring-blue-500/30 transition-transform duration-300 hover:-translate-y-0.5 dark:shadow-[0_26px_60px_-16px_rgba(0,0,0,0.9)] dark:ring-blue-500/35"
      >
        <div className="relative min-h-[360px] w-full overflow-hidden sm:min-h-[370px] lg:min-h-[395px]">
          <AnimatePresence initial={false} mode="popLayout" custom={direction}>
            <motion.div
              key={currentSlide.id}
              custom={direction}
              initial={{ opacity: 0, x: direction > 0 ? 44 : -44, scale: 1.02 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: direction > 0 ? -44 : 44, scale: 0.98 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="relative min-h-[360px] w-full sm:min-h-[370px] lg:min-h-[395px]"
            >
              <img
                src={currentSlide.image}
                alt={currentSlide.title}
                referrerPolicy="no-referrer"
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#070910]/96 via-[#080E21]/84 to-[#070910]/45" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070910]/92 via-[#070910]/20 to-[#0B1736]/35" />

              <div className="relative z-10 flex min-h-[360px] items-center justify-between gap-8 px-6 py-8 sm:min-h-[370px] sm:px-10 lg:min-h-[395px] lg:px-14">
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold tracking-wide text-lime-300">
                    <span className="uppercase">{currentSlide.kicker}</span>
                    <span className="text-blue-400/60" aria-hidden="true">
                      |
                    </span>
                    <span className="inline-flex items-center gap-1 font-medium text-slate-200">
                      <Calendar className="h-3.5 w-3.5 text-blue-400" aria-hidden="true" />
                      <span>{movie.releaseDate}</span>
                    </span>
                  </div>

                  <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white text-balance sm:text-3xl lg:text-4xl">
                    {movie.title}
                  </h2>

                  {hasRealTagline && (
                    <p className="mt-1 text-xs font-medium italic text-slate-300 sm:text-sm">
                      &ldquo;{movie.tagline}&rdquo;
                    </p>
                  )}

                  {/* Movie Specs Strip */}
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-200 sm:text-[13px]">
                    <span className="inline-flex items-center gap-1.5 font-medium text-white">
                      <Film className="h-3.5 w-3.5 text-blue-400" aria-hidden="true" />
                      <span>{movie.genres.join(' · ')}</span>
                    </span>
                    <span className="text-white/30" aria-hidden="true">
                      •
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />
                      <span>{movie.language}</span>
                    </span>
                    <span className="text-white/30" aria-hidden="true">
                      •
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-mono-tabular">
                      <Clock className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />
                      <span>{movie.duration}</span>
                    </span>
                    <span className="text-white/30" aria-hidden="true">
                      •
                    </span>
                    <span className="font-mono-tabular font-medium text-slate-300">
                      {movie.certification}
                    </span>
                    <span className="text-white/30" aria-hidden="true">
                      •
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono-tabular font-semibold text-lime-300">
                      <Star className="h-3.5 w-3.5 fill-lime-400 text-lime-400" aria-hidden="true" />
                      <span>{movie.rating.toFixed(1)}</span>
                    </span>
                  </div>

                  {/* Synopsis */}
                  <p className="mt-3 line-clamp-2 max-w-xl text-xs leading-relaxed text-slate-200/95 sm:line-clamp-3 sm:text-sm">
                    {movie.synopsis}
                  </p>

                  {/* Cast & Director */}
                  {(hasRealDirector || hasRealCast) && (
                    <p className="mt-2.5 line-clamp-1 text-xs text-slate-300">
                      {hasRealDirector && (
                        <>
                          <span className="text-slate-400">Director:</span>{' '}
                          <span className="font-medium text-white">{movie.director}</span>
                        </>
                      )}
                      {hasRealDirector && hasRealCast && (
                        <span className="mx-2 text-blue-400/60">·</span>
                      )}
                      {hasRealCast && (
                        <>
                          <span className="text-slate-400">Starring:</span>{' '}
                          <span className="font-medium text-white">{movie.cast.join(', ')}</span>
                        </>
                      )}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="mt-5 flex flex-wrap items-center gap-3 pb-4 sm:pb-0">
                    <button
                      type="button"
                      onClick={() => onSelectSlide(currentSlide)}
                      className="inline-flex h-10 items-center gap-2 rounded-xl bg-lime-400 px-5 text-xs font-bold text-[#070910] shadow-md transition-all duration-150 hover:bg-lime-300 active:scale-[0.98] sm:text-sm whitespace-nowrap"
                    >
                      <span>{currentSlide.ctaLabel}</span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleNotify(movie.id)}
                      className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-xs font-semibold backdrop-blur-sm transition-all duration-150 sm:text-sm whitespace-nowrap ${
                        isAddedToCalendar
                          ? 'border-lime-400/60 bg-lime-400/15 text-lime-200 hover:bg-lime-400/25'
                          : 'border-blue-400/45 bg-blue-600/25 text-white hover:bg-blue-600/45'
                      }`}
                    >
                      {isAddedToCalendar ? (
                        <CalendarCheck className="h-4 w-4 text-lime-300" aria-hidden="true" />
                      ) : (
                        <Bell className="h-4 w-4 text-lime-300" aria-hidden="true" />
                      )}
                      <span>{isAddedToCalendar ? 'Added to Calendar' : 'Notify Me'}</span>
                    </button>
                  </div>
                </div>

                {/* Framed Poster Card from TMDB */}
                <div className="hidden shrink-0 md:block">
                  <button
                    type="button"
                    onClick={() => onSelectSlide(currentSlide)}
                    aria-label={`Open full details for ${movie.title}`}
                    className="block h-56 w-38 overflow-hidden rounded-xl bg-[#0D111C] shadow-2xl ring-1 ring-blue-400/40 transition-transform duration-300 hover:scale-[1.03] hover:ring-lime-400/70 lg:h-64 lg:w-44 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400"
                  >
                    <PosterArtwork movie={movie} />
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <button
            type="button"
            onClick={() => goTo(safeIndex - 1, -1)}
            aria-label="Previous upcoming movie"
            className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#070910]/65 text-white ring-1 ring-blue-500/35 backdrop-blur-sm transition-all duration-150 hover:bg-blue-600 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => goTo(safeIndex + 1, 1)}
            aria-label="Next upcoming movie"
            className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#070910]/65 text-white ring-1 ring-blue-500/35 backdrop-blur-sm transition-all duration-150 hover:bg-blue-600 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-3.5 right-5 z-20 flex items-center gap-2 sm:bottom-5 sm:right-8">
            {slides.map((slide, idx) => {
              const active = idx === safeIndex;
              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => goTo(idx, idx > safeIndex ? 1 : -1)}
                  aria-label={`View upcoming movie ${idx + 1}: ${slide.title}`}
                  aria-current={active ? 'true' : undefined}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    active ? 'w-7 bg-lime-400' : 'w-2 bg-white/40 hover:bg-blue-400'
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
