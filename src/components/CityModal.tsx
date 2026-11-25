import React, { useState } from 'react';
import { MapPin, Search, X } from 'lucide-react';
import { CITIES } from '../data/movies';

interface CityModalProps {
  isOpen: boolean;
  selectedCity: string;
  onSelectCity: (city: string) => void;
  onClose: () => void;
}

export const CityModal: React.FC<CityModalProps> = ({
  isOpen,
  selectedCity,
  onSelectCity,
  onClose,
}) => {
  const [filter, setFilter] = useState('');

  if (!isOpen) return null;

  const filteredCities = CITIES.filter((c) =>
    c.toLowerCase().includes(filter.trim().toLowerCase())
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Select your city"
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-[#16161B]"
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4 dark:border-zinc-800">
          <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-stone-100">
            Select Your City
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close city selector"
            className="rounded-xl p-1.5 text-stone-400 hover:bg-stone-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search for your city..."
              className="w-full rounded-xl border border-stone-200 bg-[#FAF8F5] py-2.5 pl-10 pr-4 text-sm text-zinc-900 focus:border-red-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
            />
          </div>

          <p className="mt-4 text-xs font-semibold tracking-wider text-stone-500 uppercase dark:text-zinc-400">
            Popular Cities
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {filteredCities.map((city) => {
              const active = city === selectedCity;
              return (
                <button
                  key={city}
                  type="button"
                  onClick={() => {
                    onSelectCity(city);
                    onClose();
                  }}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-semibold transition-all ${
                    active
                      ? 'border-red-600 bg-red-50 text-red-700 dark:border-rose-500 dark:bg-rose-950/40 dark:text-rose-300'
                      : 'border-stone-200 bg-white text-zinc-700 hover:border-stone-300 hover:bg-stone-50 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-stone-200 dark:hover:bg-zinc-800'
                  }`}
                >
                  <MapPin
                    className={`h-4 w-4 ${active ? 'text-red-600 dark:text-rose-400' : 'text-stone-400'}`}
                  />
                  <span>{city}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
