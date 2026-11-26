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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#070910]/80 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-blue-500/25 dark:bg-[#0D111C]"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="font-display text-lg font-bold text-[#070910] dark:text-slate-100">
            Select Your City
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close city selector"
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#070910] dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search for your city..."
              className="w-full rounded-xl border border-slate-200 bg-[#F4F7FC] py-2.5 pl-10 pr-4 text-sm text-[#070910] focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-black dark:text-white dark:placeholder:text-slate-500 dark:focus:border-lime-400 dark:focus:bg-black"
            />
          </div>

          <p className="mt-4 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
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
                      ? 'border-blue-600 bg-blue-600/10 text-blue-700 dark:border-lime-400 dark:bg-lime-400 dark:text-[#070910]'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50/50 dark:border-slate-800 dark:bg-[#131926] dark:text-slate-200 dark:hover:border-blue-500/50 dark:hover:bg-blue-950/30'
                  }`}
                >
                  <MapPin
                    className={`h-4 w-4 ${
                      active
                        ? 'text-blue-600 dark:text-[#070910]'
                        : 'text-slate-400 dark:text-blue-400'
                    }`}
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
