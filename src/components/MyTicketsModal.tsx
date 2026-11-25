import React from 'react';
import { Calendar, MapPin, Ticket, X } from 'lucide-react';
import { BookingRecord } from '../types/cinema';
import { QrCodeMatrix } from './QrCodeMatrix';

interface MyTicketsModalProps {
  isOpen: boolean;
  bookings: BookingRecord[];
  onClose: () => void;
}

export const MyTicketsModal: React.FC<MyTicketsModalProps> = ({
  isOpen,
  bookings,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="My Booked Tickets"
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/75 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-[#16161B]"
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-stone-100">
              My Booked M-Tickets
            </h2>
            <p className="text-xs text-stone-500 dark:text-zinc-400">
              Present your QR pass at the auditorium entrance
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close my tickets"
            className="rounded-xl p-1.5 text-stone-400 hover:bg-stone-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 sm:p-6">
          {bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 py-14 text-center dark:border-zinc-800">
              <Ticket className="h-10 w-10 text-stone-400" />
              <h3 className="mt-3 font-display text-base font-semibold text-zinc-900 dark:text-stone-100">
                No tickets booked yet
              </h3>
              <p className="mt-1 max-w-sm text-xs text-stone-500 dark:text-zinc-400">
                Pick any movie, select your seats on the auditorium map, and complete demo Razorpay checkout.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((b) => (
                <div
                  key={b.bookingId}
                  className="flex flex-col items-center gap-5 rounded-xl border border-stone-200 bg-[#FAF8F5] p-4 sm:flex-row dark:border-zinc-800 dark:bg-zinc-900/60"
                >
                  <div className="shrink-0 text-center sm:border-r sm:border-dashed sm:border-stone-300 sm:pr-5 dark:sm:border-zinc-700">
                    <QrCodeMatrix value={b.bookingId} size={104} />
                    <p className="font-mono-tabular mt-1.5 text-[11px] font-semibold text-zinc-700 dark:text-stone-300">
                      {b.bookingId}
                    </p>
                  </div>

                  <div className="w-full flex-1 space-y-1.5 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-base font-bold text-zinc-900 dark:text-white">
                        {b.movieTitle}
                      </h3>
                      <span className="font-mono-tabular shrink-0 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        Confirmed
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-zinc-400">
                      {b.movieLanguage} · {b.format} · {b.screen}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-red-500" />
                      <span>{b.theatreName}</span>
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                      <Calendar className="h-3.5 w-3.5 shrink-0 text-stone-400" />
                      <span>
                        {b.dateLabel} · {b.showtime}
                      </span>
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 pt-2 text-xs dark:border-zinc-800">
                      <span className="font-mono-tabular font-semibold text-zinc-900 dark:text-white">
                        Seats: {b.seats.join(', ')}
                      </span>
                      <span className="font-mono-tabular text-stone-500 dark:text-zinc-400">
                        Paid ₹{b.totalAmount}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
