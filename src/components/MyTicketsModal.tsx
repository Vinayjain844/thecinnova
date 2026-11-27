import React, { useState } from 'react';
import {
  Calendar,
  CalendarCheck,
  Film,
  MapPin,
  RefreshCw,
  Ticket,
  Trash2,
  X,
} from 'lucide-react';
import { BookingRecord, Movie } from '../types/cinema';
import { QrCodeMatrix } from './QrCodeMatrix';

interface MyTicketsModalProps {
  isOpen: boolean;
  bookings: BookingRecord[];
  calendarMovies: Movie[];
  isSignedIn: boolean;
  bookingSyncError?: string | null;
  onRefresh: () => void;
  onClearBookings: () => void;
  onRemoveBooking: (bookingId: string) => void;
  onRemoveCalendarMovie: (movieId: string) => void;
  onSelectMovie: (movie: Movie) => void;
  onClose: () => void;
}

export const MyTicketsModal: React.FC<MyTicketsModalProps> = ({
  isOpen,
  bookings,
  calendarMovies,
  isSignedIn,
  bookingSyncError,
  onRefresh,
  onClearBookings,
  onRemoveBooking,
  onRemoveCalendarMovie,
  onSelectMovie,
  onClose,
}) => {
  const [activeView, setActiveView] = useState<'tickets' | 'calendar'>('tickets');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [justRefreshed, setJustRefreshed] = useState(false);

  if (!isOpen) return null;

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    onRefresh();
    window.setTimeout(() => {
      setIsRefreshing(false);
      setJustRefreshed(true);
      window.setTimeout(() => setJustRefreshed(false), 1800);
    }, 350);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="My Bookings"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#070910]/85 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-blue-500/25 dark:bg-[#0D111C]"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="font-display text-lg font-bold text-[#070910] dark:text-slate-100">
              My Bookings
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {justRefreshed
                ? 'Bookings synced and up to date'
                : 'Synced with Firebase Firestore (cinnova-001) · Present QR at entrance'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefreshClick}
              aria-label="Refresh bookings"
              title="Refresh My Bookings"
              className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-[#F4F7FC] px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-[#131926] dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-blue-600 dark:text-lime-400' : ''}`}
                aria-hidden="true"
              />
              <span>{justRefreshed ? 'Refreshed' : 'Refresh'}</span>
            </button>

            {activeView === 'tickets' && bookings.length > 0 && (
              <button
                type="button"
                onClick={onClearBookings}
                className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 px-2.5 text-xs font-medium text-slate-500 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-lime-400 dark:hover:text-lime-400"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close my tickets"
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#070910] dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-6 border-b border-slate-200 bg-[#F4F7FC] px-6 dark:border-slate-800 dark:bg-[#0B0F1A]">
          <button
            type="button"
            onClick={() => setActiveView('tickets')}
            className={`relative py-2.5 text-xs font-semibold transition-colors ${
              activeView === 'tickets'
                ? 'text-blue-600 dark:text-lime-400'
                : 'text-slate-500 hover:text-[#070910] dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Booked M-Tickets ({bookings.length})
            {activeView === 'tickets' && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-blue-600 dark:bg-lime-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveView('calendar')}
            className={`relative py-2.5 text-xs font-semibold transition-colors ${
              activeView === 'calendar'
                ? 'text-blue-600 dark:text-lime-400'
                : 'text-slate-500 hover:text-[#070910] dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Release Calendar ({isSignedIn ? calendarMovies.length : 0})
            {activeView === 'calendar' && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-blue-600 dark:bg-lime-400" />
            )}
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 sm:p-6">
          {bookingSyncError && (
            <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-300">
              {bookingSyncError}
            </div>
          )}
          {activeView === 'tickets' ? (
            bookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-[#F4F7FC]/60 px-6 py-12 text-center dark:border-slate-800 dark:bg-[#070910]/60">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600 dark:bg-lime-400/15 dark:text-lime-400">
                  <Ticket className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-display text-base font-bold text-[#070910] dark:text-slate-100">
                  Your ticket wallet is fresh and empty
                </h3>
                <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Select any movie now showing, pick your seats on the auditorium map, and check out to generate your QR M-Ticket.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-5 inline-flex h-9 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-blue-500 dark:bg-lime-400 dark:text-[#070910] dark:hover:bg-lime-300"
                >
                  <Film className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Browse Movies</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((b) => (
                  <div
                    key={b.bookingId}
                    className="relative flex flex-col items-center gap-5 rounded-2xl border border-slate-200 bg-[#F4F7FC] p-4 sm:flex-row dark:border-slate-800 dark:bg-[#070910]"
                  >
                    <div className="shrink-0 text-center sm:border-r sm:border-dashed sm:border-slate-300 sm:pr-5 dark:sm:border-slate-700">
                      <QrCodeMatrix value={b.bookingId} size={104} />
                      <p className="font-mono-tabular mt-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        {b.bookingId}
                      </p>
                    </div>

                    <div className="w-full flex-1 space-y-1.5 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-display text-base font-bold text-[#070910] dark:text-white">
                            {b.movieTitle}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {b.movieLanguage} · {b.format} · {b.screen}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono-tabular shrink-0 text-xs font-semibold text-lime-600 dark:text-lime-400">
                            Confirmed
                          </span>
                          <button
                            type="button"
                            onClick={() => onRemoveBooking(b.bookingId)}
                            aria-label={`Remove ticket ${b.bookingId}`}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/70 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-lime-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                        <span>
                          {b.theatreName} ({b.city})
                        </span>
                      </p>
                      <p className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span>
                          {b.dateLabel} · {b.showtime}
                        </span>
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2 text-xs dark:border-slate-800">
                        <span className="font-mono-tabular font-semibold text-[#070910] dark:text-lime-400">
                          Seats: {b.seats.join(', ')}
                        </span>
                        <span className="font-mono-tabular text-slate-500 dark:text-slate-400">
                          Paid ₹{b.totalAmount} · {b.paymentMethod}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : !isSignedIn ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-[#F4F7FC]/60 px-6 py-12 text-center dark:border-slate-800 dark:bg-[#070910]/60">
              <CalendarCheck className="h-8 w-8 text-blue-500" aria-hidden="true" />
              <h3 className="mt-3 font-display text-base font-bold text-[#070910] dark:text-slate-100">
                Sign in to view your release calendar
              </h3>
              <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
                Sign in and click Notify Me on any upcoming movie to track its premiere date here.
              </p>
            </div>
          ) : calendarMovies.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-[#F4F7FC]/60 px-6 py-12 text-center dark:border-slate-800 dark:bg-[#070910]/60">
              <CalendarCheck className="h-8 w-8 text-blue-500" aria-hidden="true" />
              <h3 className="mt-3 font-display text-base font-bold text-[#070910] dark:text-slate-100">
                No upcoming movies in your calendar yet
              </h3>
              <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
                Click Notify Me on any upcoming spotlight release to add it to your calendar.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {calendarMovies.map((movie) => (
                <div
                  key={movie.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-[#F4F7FC] p-3.5 dark:border-slate-800 dark:bg-[#070910]"
                >
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSelectMovie(movie);
                      }}
                      className="text-left font-display text-sm font-bold text-[#070910] hover:text-blue-600 dark:text-white dark:hover:text-lime-400"
                    >
                      {movie.title}
                    </button>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Releasing {movie.releaseDate} · {movie.genres.join(' · ')} · {movie.language}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveCalendarMovie(movie.id)}
                    className="shrink-0 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-lime-400 dark:hover:text-lime-400"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
