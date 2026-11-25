import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Calendar,
  Check,
  Clock,
  Lock,
  MapPin,
  Sparkles,
  Star,
  Ticket,
  X,
} from 'lucide-react';
import { getTheatresForCity } from '../data/movies';
import { Movie, SeatItem, SeatTierName, ShowtimeSlot, Theatre } from '../types/cinema';
import { PosterArtwork } from './PosterArtwork';

export interface PendingCheckoutPayload {
  movie: Movie;
  city: string;
  theatre: Theatre;
  showtime: ShowtimeSlot;
  dateLabel: string;
  seats: SeatItem[];
  ticketSubtotal: number;
  convenienceFee: number;
  gst: number;
  totalAmount: number;
}

interface BookingModalProps {
  movie: Movie | null;
  city: string;
  soldSeatMap: Record<string, string[]>;
  isNotified: boolean;
  onToggleNotify: (movieId: string) => void;
  onClose: () => void;
  onProceedToPayment: (payload: PendingCheckoutPayload) => void;
}

const DATE_OPTIONS = [
  { id: 'today', day: 'Today', dateNum: '25 Nov', label: 'Wed, 25 Nov', isoDate: '2026-11-25' },
  { id: 'tomorrow', day: 'Thu', dateNum: '26 Nov', label: 'Thu, 26 Nov', isoDate: '2026-11-26' },
  { id: 'fri', day: 'Fri', dateNum: '27 Nov', label: 'Fri, 27 Nov', isoDate: '2026-11-27' },
  { id: 'sat', day: 'Sat', dateNum: '28 Nov', label: 'Sat, 28 Nov', isoDate: '2026-11-28' },
];

const ROWS_CONFIG: { row: string; tier: SeatTierName; basePrice: number }[] = [
  { row: 'A', tier: 'Royal Recliner', basePrice: 550 },
  { row: 'B', tier: 'Royal Recliner', basePrice: 550 },
  { row: 'C', tier: 'Prime Executive', basePrice: 320 },
  { row: 'D', tier: 'Prime Executive', basePrice: 320 },
  { row: 'E', tier: 'Prime Executive', basePrice: 320 },
  { row: 'F', tier: 'Prime Executive', basePrice: 320 },
  { row: 'G', tier: 'Classic', basePrice: 190 },
  { row: 'H', tier: 'Classic', basePrice: 190 },
  { row: 'J', tier: 'Classic', basePrice: 190 },
];

const SEATS_PER_ROW = 14;
const MAX_SELECTABLE_SEATS = 8;

function seededSoldSeats(showKey: string): Set<string> {
  let hash = 0;
  for (let i = 0; i < showKey.length; i++) {
    hash = (hash * 31 + showKey.charCodeAt(i)) >>> 0;
  }
  const sold = new Set<string>();
  ROWS_CONFIG.forEach((rCfg, rIdx) => {
    for (let num = 1; num <= SEATS_PER_ROW; num++) {
      const code = `${rCfg.row}${num}`;
      const val = (hash + rIdx * 17 + num * 29) % 100;
      const centerBias = num >= 5 && num <= 10 ? 18 : 6;
      if (val < centerBias) {
        sold.add(code);
      }
    }
  });
  return sold;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  movie,
  city,
  soldSeatMap,
  isNotified,
  onToggleNotify,
  onClose,
  onProceedToPayment,
}) => {
  const [hydratedMovie, setHydratedMovie] = useState<Movie | null>(movie);
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [selectedTheatre, setSelectedTheatre] = useState<Theatre | null>(null);
  const [selectedShowtime, setSelectedShowtime] = useState<ShowtimeSlot | null>(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [lockSecondsLeft, setLockSecondsLeft] = useState(300);
  const [seatLimitWarning, setSeatLimitWarning] = useState(false);

  const fallbackTheatres = useMemo(() => getTheatresForCity(city), [city]);
  const [liveTheatres, setLiveTheatres] = useState<Theatre[] | null>(null);
  const theatres = liveTheatres && liveTheatres.length > 0 ? liveTheatres : fallbackTheatres;
  const activeDate = DATE_OPTIONS[selectedDateIdx];

  useEffect(() => {
    setHydratedMovie(movie);
    setLiveTheatres(null);
    setSelectedDateIdx(0);
    setSelectedTheatre(null);
    setSelectedShowtime(null);
    setSelectedSeatIds([]);
    setLockSecondsLeft(300);
    setSeatLimitWarning(false);

    if (!movie?.moviegluId) return;
    let cancelled = false;
    fetch(`/api/movieglu/movie/${movie.moviegluId}?city=${encodeURIComponent(city)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.movie) {
          setHydratedMovie((prev) => (prev ? { ...prev, ...data.movie } : data.movie));
        }
      })
      .catch(() => {
        // Keep initial movie summary on network error
      });

    return () => {
      cancelled = true;
    };
  }, [movie?.id, movie?.moviegluId, city]);

  // Fetch MovieGlu live showtimes for selected movie, city, and date
  useEffect(() => {
    if (!movie?.moviegluId || movie.status === 'upcoming') {
      setLiveTheatres(null);
      return;
    }
    let cancelled = false;
    fetch(
      `/api/movieglu/showtimes/${movie.moviegluId}?city=${encodeURIComponent(city)}&date=${encodeURIComponent(activeDate.isoDate)}`
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.source === 'movieglu' && Array.isArray(data.theatres) && data.theatres.length > 0) {
          setLiveTheatres(data.theatres);
        } else if (!cancelled) {
          setLiveTheatres(null);
        }
      })
      .catch(() => {
        if (!cancelled) setLiveTheatres(null);
      });

    return () => {
      cancelled = true;
    };
  }, [movie?.moviegluId, movie?.status, city, activeDate.isoDate]);

  useEffect(() => {
    if (selectedSeatIds.length === 0) {
      setLockSecondsLeft(300);
      return;
    }
    const timer = window.setInterval(() => {
      setLockSecondsLeft((prev) => {
        if (prev <= 1) {
          setSelectedSeatIds([]);
          return 300;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [selectedSeatIds.length]);

  const activeMovie = hydratedMovie || movie;

  const showKey =
    activeMovie && selectedTheatre && selectedShowtime
      ? `${activeMovie.id}__${city}__${selectedTheatre.id}__${activeDate.id}__${selectedShowtime.id}`
      : '';

  const seatGrid = useMemo(() => {
    if (!selectedShowtime || !showKey) return [];
    const baseSold = seededSoldSeats(showKey);
    const userSold = new Set(soldSeatMap[showKey] || []);

    return ROWS_CONFIG.map((rCfg) => {
      const unitPrice = Math.round((rCfg.basePrice * selectedShowtime.priceMultiplier) / 10) * 10;
      const seats: SeatItem[] = [];
      for (let num = 1; num <= SEATS_PER_ROW; num++) {
        const id = `${rCfg.row}${num}`;
        let status: SeatItem['status'] = 'available';
        if (baseSold.has(id) || userSold.has(id)) {
          status = 'sold';
        } else if (
          rCfg.row === 'D' &&
          (num === 1 || num === 2) &&
          selectedShowtime.availability === 'almost-full'
        ) {
          status = 'locked';
        }
        seats.push({
          id,
          row: rCfg.row,
          number: num,
          tier: rCfg.tier,
          price: unitPrice,
          status,
        });
      }
      return {
        ...rCfg,
        unitPrice,
        seats,
      };
    });
  }, [selectedShowtime, showKey, soldSeatMap]);

  if (!activeMovie) return null;

  const flatSeats = seatGrid.flatMap((r) => r.seats);
  const selectedSeatObjects = flatSeats.filter((s) => selectedSeatIds.includes(s.id));
  const ticketSubtotal = selectedSeatObjects.reduce((sum, s) => sum + s.price, 0);
  const convenienceFee = selectedSeatObjects.length * 35;
  const gst = Math.round(convenienceFee * 0.18);
  const totalAmount = ticketSubtotal + convenienceFee + gst;

  const toggleSeat = (seat: SeatItem) => {
    if (seat.status !== 'available') return;
    setSeatLimitWarning(false);
    setSelectedSeatIds((prev) => {
      if (prev.includes(seat.id)) {
        return prev.filter((id) => id !== seat.id);
      }
      if (prev.length >= MAX_SELECTABLE_SEATS) {
        setSeatLimitWarning(true);
        return prev;
      }
      return [...prev, seat.id];
    });
  };

  // Human-friendly quick seat picker for N adjacent center seats
  const quickPickAdjacentSeats = (count: number) => {
    setSeatLimitWarning(false);
    const preferredRows = ['E', 'F', 'D', 'C', 'G', 'H', 'B', 'A', 'J'];
    for (const rowCode of preferredRows) {
      const rowObj = seatGrid.find((r) => r.row === rowCode);
      if (!rowObj) continue;
      // Search outward from center seats
      const available = rowObj.seats;
      for (let start = 3; start <= SEATS_PER_ROW - count; start++) {
        const slice = available.slice(start, start + count);
        if (slice.every((s) => s.status === 'available')) {
          setSelectedSeatIds(slice.map((s) => s.id));
          return;
        }
      }
      for (let start = 0; start <= SEATS_PER_ROW - count; start++) {
        const slice = available.slice(start, start + count);
        if (slice.every((s) => s.status === 'available')) {
          setSelectedSeatIds(slice.map((s) => s.id));
          return;
        }
      }
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleChooseShowtime = (theatre: Theatre, slot: ShowtimeSlot) => {
    setSelectedTheatre(theatre);
    setSelectedShowtime(slot);
    setSelectedSeatIds([]);
    setLockSecondsLeft(300);
    setSeatLimitWarning(false);
  };

  const isSeatStep = Boolean(selectedTheatre && selectedShowtime);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Book tickets for ${activeMovie.title}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/75 p-2 backdrop-blur-xs sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-stone-200 bg-[#FAF8F5] shadow-2xl dark:border-zinc-800 dark:bg-[#141418]"
      >
        {/* Top Modal Header */}
        <div className="flex items-center justify-between gap-4 border-b border-stone-200 bg-white px-5 py-3.5 dark:border-zinc-800 dark:bg-[#1A1A1F]">
          <div className="flex min-w-0 items-center gap-3">
            {isSeatStep && (
              <button
                type="button"
                onClick={() => {
                  setSelectedShowtime(null);
                  setSelectedTheatre(null);
                  setSelectedSeatIds([]);
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-200 text-zinc-700 hover:bg-stone-100 dark:border-zinc-700 dark:text-stone-200 dark:hover:bg-zinc-800"
                aria-label="Back to showtimes"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-display truncate text-lg font-bold text-zinc-900 sm:text-xl dark:text-stone-100">
                  {activeMovie.title}
                </h2>
                <span className="font-mono-tabular shrink-0 text-xs font-medium text-stone-500 dark:text-zinc-400">
                  {activeMovie.certification}
                </span>
              </div>
              <p className="truncate text-xs text-stone-500 dark:text-zinc-400">
                {isSeatStep && selectedTheatre && selectedShowtime
                  ? `${selectedTheatre.name} · ${activeDate.label} · ${selectedShowtime.time} (${selectedShowtime.format})`
                  : `${activeMovie.genres.join(' · ')} · ${activeMovie.duration} · ${activeMovie.language}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close booking dialog"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step 1: Movie Details & Showtimes */}
        {!isSeatStep ? (
          <div className="overflow-y-auto p-5 sm:p-6">
            <div className="flex flex-col gap-6 border-b border-stone-200 pb-6 md:flex-row dark:border-zinc-800">
              <div className="mx-auto h-60 w-40 shrink-0 overflow-hidden rounded-xl bg-zinc-900 shadow-md md:mx-0">
                <PosterArtwork movie={activeMovie} />
              </div>

              <div className="flex-1">
                <p className="text-xs font-semibold tracking-wide text-red-600 uppercase dark:text-rose-400">
                  {activeMovie.status === 'upcoming'
                    ? `Releasing ${activeMovie.releaseDate}`
                    : 'Now Playing in Cinemas'}
                </p>
                <p className="mt-1 text-base font-medium italic text-stone-600 dark:text-zinc-300">
                  "{activeMovie.tagline}"
                </p>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {activeMovie.synopsis}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-stone-600 dark:text-zinc-400">
                  <span className="flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-stone-100">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-mono-tabular">{activeMovie.rating.toFixed(1)}/10</span>
                    <span className="font-normal text-stone-500">({activeMovie.votes})</span>
                  </span>
                  <span>
                    Director:{' '}
                    <strong className="font-medium text-zinc-900 dark:text-stone-200">
                      {activeMovie.director}
                    </strong>
                  </span>
                  <span>
                    Cast:{' '}
                    <strong className="font-medium text-zinc-900 dark:text-stone-200">
                      {activeMovie.cast.join(', ')}
                    </strong>
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-zinc-400">
                  <span className="font-medium text-zinc-800 dark:text-stone-300">Formats:</span>
                  <span>{activeMovie.formats.join(' / ')}</span>
                </div>
              </div>
            </div>

            {activeMovie.status === 'upcoming' ? (
              <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-xl border border-stone-200 bg-white p-5 sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-[#1A1A1F]">
                <div>
                  <h3 className="font-display text-base font-bold text-zinc-900 dark:text-stone-100">
                    Advance bookings opening soon in {city}
                  </h3>
                  <p className="mt-1 text-sm text-stone-500 dark:text-zinc-400">
                    Scheduled release on {activeMovie.releaseDate}. Turn on alerts to grab front-center seats first.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleNotify(activeMovie.id)}
                  className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-xs font-semibold transition-colors ${
                    isNotified
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {isNotified ? <Check className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                  {isNotified ? 'Alert Enabled' : 'Notify Me on Release'}
                </button>
              </div>
            ) : (
              <div className="mt-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="flex items-center gap-2 font-display text-base font-bold text-zinc-900 dark:text-stone-100">
                    <Calendar className="h-4 w-4 text-red-600 dark:text-rose-400" />
                    Pick a Date & Showtime in {city}
                  </h3>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                    {DATE_OPTIONS.map((d, idx) => {
                      const active = idx === selectedDateIdx;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setSelectedDateIdx(idx)}
                          className={`flex shrink-0 flex-col items-center rounded-xl px-3.5 py-2 text-xs transition-colors whitespace-nowrap ${
                            active
                              ? 'bg-red-600 text-white shadow-xs dark:bg-rose-600'
                              : 'border border-stone-200 bg-white text-zinc-700 hover:bg-stone-100 dark:border-zinc-800 dark:bg-[#1A1A1F] dark:text-zinc-300 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <span className="font-semibold">{d.day}</span>
                          <span
                            className={`font-mono-tabular text-[11px] ${
                              active ? 'text-red-100' : 'text-stone-400'
                            }`}
                          >
                            {d.dateNum}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-5 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-[#1A1A1F]">
                  {theatres.map((theatre) => (
                    <div key={theatre.id} className="p-4 sm:p-5">
                      <div>
                        <h4 className="font-display text-sm font-bold text-zinc-900 sm:text-base dark:text-stone-100">
                          {theatre.name}
                        </h4>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-stone-500 dark:text-zinc-400">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span>{theatre.area}</span>
                          <span aria-hidden="true">·</span>
                          <span>{theatre.amenities.slice(0, 3).join(' · ')}</span>
                        </p>
                      </div>

                      <div className="mt-3.5 flex flex-wrap gap-2.5">
                        {theatre.showtimes.map((slot) => {
                          const statusColor =
                            slot.availability === 'available'
                              ? 'border-emerald-600/35 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/40 dark:text-emerald-400 dark:hover:bg-emerald-950/40'
                              : slot.availability === 'filling-fast'
                              ? 'border-amber-600/45 text-amber-700 hover:bg-amber-50 dark:border-amber-500/40 dark:text-amber-400 dark:hover:bg-amber-950/40'
                              : 'border-red-600/45 text-red-700 hover:bg-red-50 dark:border-rose-500/40 dark:text-rose-400 dark:hover:bg-rose-950/40';

                          return (
                            <button
                              key={slot.id}
                              type="button"
                              onClick={() => handleChooseShowtime(theatre, slot)}
                              className={`flex flex-col items-center rounded-xl border px-4 py-2 text-center transition-all duration-150 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 ${statusColor}`}
                            >
                              <span className="font-mono-tabular text-xs font-semibold sm:text-sm">
                                {slot.time}
                              </span>
                              <span className="mt-0.5 text-[10px] font-medium text-stone-500 dark:text-zinc-400">
                                {slot.format}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Step 2: Tactile Seat Selection Dashboard */
          <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {/* Top Legend + Quick Seat Count Picker */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-4 dark:border-zinc-800">
                <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-700 dark:text-zinc-300">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-4 w-4 rounded-t-md rounded-b-xs border border-emerald-600 bg-white dark:bg-zinc-900" />
                    Available
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-t-md rounded-b-xs bg-red-600 text-[10px] text-white">
                      ✓
                    </span>
                    Selected
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-t-md rounded-b-xs bg-stone-200 text-[10px] text-stone-400 dark:bg-zinc-800 dark:text-zinc-600">
                      ×
                    </span>
                    Sold
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-t-md rounded-b-xs bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-400">
                      <Lock className="h-2.5 w-2.5" />
                    </span>
                    Locked
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500 dark:text-zinc-400">Quick pick:</span>
                  {[1, 2, 3, 4].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => quickPickAdjacentSeats(count)}
                      className="font-mono-tabular flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 bg-white text-xs font-semibold text-zinc-700 transition-colors hover:border-red-500 hover:text-red-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-200 dark:hover:border-rose-500"
                    >
                      {count}
                    </button>
                  ))}
                  {selectedSeatIds.length > 0 && (
                    <span className="ml-2 flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="font-mono-tabular font-semibold">{formatTimer(lockSecondsLeft)}</span>
                    </span>
                  )}
                </div>
              </div>

              {seatLimitWarning && (
                <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  You can select up to {MAX_SELECTABLE_SEATS} seats per booking.
                </p>
              )}

              {/* Curved Auditorium Screen */}
              <div className="mx-auto mt-6 mb-7 max-w-xl text-center">
                <svg viewBox="0 0 400 34" className="mx-auto w-full max-w-md" aria-hidden="true">
                  <path
                    d="M 20 28 Q 200 2 380 28"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    className="text-red-600/80 dark:text-rose-500/90"
                  />
                  <path
                    d="M 38 30 Q 200 10 362 30"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-stone-300 dark:text-zinc-700"
                  />
                </svg>
                <p className="mt-1 text-[11px] font-medium tracking-wider text-stone-400 uppercase dark:text-zinc-500">
                  Screen this way · {selectedShowtime?.screen}
                </p>
              </div>

              {/* Armchair-style Seat Grid */}
              <div className="overflow-x-auto pb-4">
                <div className="mx-auto min-w-[540px] max-w-2xl space-y-2">
                  {seatGrid.map((rowGroup, idx) => {
                    const prevTier = idx > 0 ? seatGrid[idx - 1].tier : null;
                    const showTierHeader = prevTier !== rowGroup.tier;

                    return (
                      <React.Fragment key={rowGroup.row}>
                        {showTierHeader && (
                          <div className="flex items-center justify-between border-b border-stone-200 pt-3 pb-1 text-xs font-semibold text-stone-500 dark:border-zinc-800 dark:text-zinc-400">
                            <span>{rowGroup.tier}</span>
                            <span className="font-mono-tabular text-zinc-800 dark:text-stone-200">
                              ₹{rowGroup.unitPrice}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-3 py-0.5">
                          <span className="font-mono-tabular w-5 text-xs font-semibold text-stone-400">
                            {rowGroup.row}
                          </span>
                          <div className="flex flex-1 items-center justify-center gap-1.5">
                            {rowGroup.seats.map((seat, seatIdx) => {
                              const isSelected = selectedSeatIds.includes(seat.id);
                              const isAisle = seatIdx === 7;

                              let seatClasses =
                                'border-emerald-600/55 bg-white text-zinc-700 hover:border-red-600 hover:bg-red-50 dark:border-emerald-500/50 dark:bg-zinc-900 dark:text-stone-200 dark:hover:border-rose-400 dark:hover:bg-rose-950/40';
                              if (isSelected) {
                                seatClasses =
                                  'border-red-600 bg-red-600 text-white shadow-xs scale-105 dark:border-rose-500 dark:bg-rose-600';
                              } else if (seat.status === 'sold') {
                                seatClasses =
                                  'cursor-not-allowed border-stone-200 bg-stone-200 text-stone-400 dark:border-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-600';
                              } else if (seat.status === 'locked') {
                                seatClasses =
                                  'cursor-not-allowed border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-800/70 dark:bg-amber-950/60 dark:text-amber-500';
                              }

                              return (
                                <React.Fragment key={seat.id}>
                                  {isAisle && <div className="w-5 shrink-0" aria-hidden="true" />}
                                  <button
                                    type="button"
                                    disabled={seat.status !== 'available'}
                                    onClick={() => toggleSeat(seat)}
                                    aria-label={`Seat ${seat.id}, ${seat.tier}, ₹${seat.price}, ${
                                      isSelected ? 'Selected' : seat.status
                                    }`}
                                    aria-pressed={isSelected}
                                    className={`font-mono-tabular flex h-7 w-7 items-center justify-center rounded-t-lg rounded-b-xs border border-b-2 text-[11px] font-medium transition-all duration-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 ${seatClasses}`}
                                  >
                                    {seat.status === 'sold' ? (
                                      '×'
                                    ) : seat.status === 'locked' ? (
                                      <Lock className="h-3 w-3" />
                                    ) : (
                                      seat.number
                                    )}
                                  </button>
                                </React.Fragment>
                              );
                            })}
                          </div>
                          <span className="font-mono-tabular w-5 text-right text-xs font-semibold text-stone-400">
                            {rowGroup.row}
                          </span>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Tactile Ticket-Stub Summary Panel */}
            <aside className="flex w-full shrink-0 flex-col justify-between border-t border-stone-200 bg-white p-5 lg:w-88 lg:border-t-0 lg:border-l dark:border-zinc-800 dark:bg-[#1A1A1F]">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-bold text-zinc-900 dark:text-stone-100">
                    Your Ticket Summary
                  </h3>
                  <span className="font-mono-tabular text-xs font-medium text-stone-500 dark:text-zinc-400">
                    {selectedSeatObjects.length}/{MAX_SELECTABLE_SEATS} Seats
                  </span>
                </div>

                <div className="mt-4 rounded-xl border border-stone-200 bg-[#FAF8F5] p-3.5 dark:border-zinc-800 dark:bg-[#141418]">
                  {selectedSeatObjects.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between text-xs text-stone-500 dark:text-zinc-400">
                        <span>Selected Seats</span>
                        <button
                          type="button"
                          onClick={() => setSelectedSeatIds([])}
                          className="font-medium text-red-600 hover:underline dark:text-rose-400"
                        >
                          Clear
                        </button>
                      </div>
                      <p className="font-mono-tabular mt-1.5 text-sm font-semibold text-zinc-900 dark:text-stone-100">
                        {selectedSeatObjects.map((s) => s.id).join(', ')}
                      </p>
                      <p className="mt-1 text-xs text-stone-500 dark:text-zinc-400">
                        {Array.from(new Set(selectedSeatObjects.map((s) => s.tier))).join(' · ')}
                      </p>
                    </>
                  ) : (
                    <div className="flex items-center gap-2.5 py-2 text-xs text-stone-500 dark:text-zinc-400">
                      <Ticket className="h-4 w-4 shrink-0 text-stone-400" />
                      <span>Tap seats on the map or use Quick Pick above.</span>
                    </div>
                  )}
                </div>

                <div className="mt-5 space-y-2.5 text-sm">
                  <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
                    <span>Tickets ({selectedSeatObjects.length})</span>
                    <span className="font-mono-tabular font-medium">₹{ticketSubtotal}</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
                    <span>Convenience Fee</span>
                    <span className="font-mono-tabular font-medium">₹{convenienceFee}</span>
                  </div>
                  <div className="flex items-center justify-between text-stone-500 dark:text-zinc-400">
                    <span>GST (18% on fee)</span>
                    <span className="font-mono-tabular">₹{gst}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-dashed border-stone-300 pt-3 text-base font-bold text-zinc-900 dark:border-zinc-700 dark:text-stone-100">
                    <span>Total Payable</span>
                    <span className="font-mono-tabular text-lg">₹{totalAmount}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  disabled={selectedSeatObjects.length === 0 || !selectedTheatre || !selectedShowtime}
                  onClick={() => {
                    if (!selectedTheatre || !selectedShowtime || selectedSeatObjects.length === 0) return;
                    onProceedToPayment({
                      movie: activeMovie,
                      city,
                      theatre: selectedTheatre,
                      showtime: selectedShowtime,
                      dateLabel: activeDate.label,
                      seats: selectedSeatObjects,
                      ticketSubtotal,
                      convenienceFee,
                      gst,
                      totalAmount,
                    });
                  }}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 dark:bg-rose-600 dark:hover:bg-rose-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600"
                >
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {selectedSeatObjects.length > 0
                      ? `Proceed to Pay ₹${totalAmount}`
                      : 'Select Seats to Continue'}
                  </span>
                </button>
                <p className="mt-2.5 text-center text-[11px] text-stone-400 dark:text-zinc-500">
                  Razorpay Demo Checkout · Instant QR M-Ticket
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
};
