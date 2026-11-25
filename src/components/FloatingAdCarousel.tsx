import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { AdSlide } from '../types/cinema';

interface FloatingAdCarouselProps {
  slides: AdSlide[];
  onSelectSlide: (slide: AdSlide) => void;
}

export const FloatingAdCarousel: React.FC<FloatingAdCarouselProps> = ({
  slides,
  onSelectSlide,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setDirection(1);
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [isPaused, slides.length]);

  const goTo = (nextIdx: number, dir: number) => {
    setDirection(dir);
    setActiveIndex((nextIdx + slides.length) % slides.length);
  };

  const currentSlide = slides[activeIndex];

  return (
    <section
      aria-label="Featured promotions"
      className="mx-auto max-w-7xl px-4 pt-6 pb-2 sm:px-6 lg:px-8"
    >
      <div
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="group relative overflow-hidden rounded-2xl bg-zinc-900 shadow-[0_22px_50px_-16px_rgba(24,24,27,0.32)] ring-1 ring-stone-900/10 transition-transform duration-300 hover:-translate-y-0.5 dark:shadow-[0_24px_54px_-16px_rgba(0,0,0,0.8)] dark:ring-white/10"
      >
        <div className="relative aspect-[16/8.4] sm:aspect-[16/5.7] lg:aspect-[16/4.8] w-full overflow-hidden">
          <AnimatePresence initial={false} mode="popLayout" custom={direction}>
            <motion.div
              key={currentSlide.id}
              custom={direction}
              initial={{ opacity: 0, x: direction > 0 ? 44 : -44, scale: 1.03 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: direction > 0 ? -44 : 44, scale: 0.98 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0"
            >
              <img
                src={currentSlide.image}
                alt={currentSlide.title}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/88 via-zinc-950/50 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/75 via-transparent to-zinc-950/15" />

              <div className="relative z-10 flex h-full flex-col justify-end p-5 sm:justify-center sm:p-8 lg:px-14">
                <div className="max-w-xl">
                  <p className="text-xs font-semibold tracking-wide text-amber-300">
                    {currentSlide.kicker}
                  </p>
                  <h2 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-white text-balance sm:text-3xl lg:text-4xl">
                    {currentSlide.title}
                  </h2>
                  <p className="mt-2 hidden max-w-md text-sm leading-relaxed text-stone-200 sm:block">
                    {currentSlide.subtitle}
                  </p>
                  <div className="mt-4 flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => onSelectSlide(currentSlide)}
                      className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-5 text-xs font-semibold text-white shadow-md transition-all duration-150 hover:bg-red-500 active:scale-[0.98] sm:text-sm whitespace-nowrap"
                    >
                      <span>{currentSlide.ctaLabel}</span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                    {currentSlide.promoCode && (
                      <span className="font-mono-tabular text-xs font-medium text-amber-300">
                        Use code {currentSlide.promoCode}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <button
            type="button"
            onClick={() => goTo(activeIndex - 1, -1)}
            aria-label="Previous advertisement"
            className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-all duration-150 hover:bg-black/75 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => goTo(activeIndex + 1, 1)}
            aria-label="Next advertisement"
            className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-all duration-150 hover:bg-black/75 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-3.5 right-5 z-20 flex items-center gap-2 sm:bottom-5 sm:right-8">
            {slides.map((slide, idx) => {
              const active = idx === activeIndex;
              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => goTo(idx, idx > activeIndex ? 1 : -1)}
                  aria-label={`View promotion ${idx + 1}: ${slide.title}`}
                  aria-current={active ? 'true' : undefined}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    active ? 'w-7 bg-red-500' : 'w-2 bg-white/45 hover:bg-white/80'
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
