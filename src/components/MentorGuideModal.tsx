import React, { useState } from 'react';
import {
  BookOpen,
  Code2,
  CreditCard,
  Database,
  Layers,
  Lock,
  QrCode,
  Server,
  ShieldCheck,
  X,
} from 'lucide-react';

interface MentorGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type GuideSection = 'overview' | 'architecture' | 'api' | 'workflows';

export const MentorGuideModal: React.FC<MentorGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [section, setSection] = useState<GuideSection>('overview');

  if (!isOpen) return null;

  const tabs: { id: GuideSection; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Project Overview', icon: <BookOpen className="h-3.5 w-3.5" /> },
    { id: 'architecture', label: 'Architecture & Stack', icon: <Layers className="h-3.5 w-3.5" /> },
    { id: 'api', label: 'TMDB & REST API Guide', icon: <Server className="h-3.5 w-3.5" /> },
    { id: 'workflows', label: 'Booking & Payment Flow', icon: <QrCode className="h-3.5 w-3.5" /> },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mentor and API Guide"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#070910]/85 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-blue-500/25 dark:bg-[#0D111C]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white dark:bg-lime-400 dark:text-[#070910]">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-[#070910] dark:text-slate-100">
                Mentor & API Guide
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                CinNova Online Movie Ticket Booking System · Created by The Neon
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close mentor and API guide"
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#070910] dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto border-b border-slate-200 bg-[#F4F7FC] px-6 py-2.5 dark:border-slate-800 dark:bg-[#0B0F1A]">
          {tabs.map((tab) => {
            const active = section === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSection(tab.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-blue-600 text-white shadow-xs dark:bg-lime-400 dark:text-[#070910]'
                    : 'text-slate-600 hover:bg-slate-200/70 hover:text-[#070910] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-6 space-y-6 text-sm text-slate-700 dark:text-slate-300">
          {section === 'overview' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-[#F4F7FC] p-5 dark:border-slate-800 dark:bg-[#070910]">
                <h3 className="font-display text-base font-bold text-[#070910] dark:text-white">
                  1. Project Introduction & Scope
                </h3>
                <p className="mt-2 leading-relaxed">
                  <strong>CinNova</strong> is a full-featured online movie ticket booking web application built as a college micro-project by <strong>The Neon</strong>. It delivers a multiplex booking journey inspired by modern ticketing platforms—combining live theatrical listings from TMDB, city-aware showtimes, an interactive tiered seat selection dashboard, a Sandbox payment gateway simulation, and instant QR M-Ticket passes.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <h4 className="font-display text-sm font-bold text-[#070910] dark:text-white">
                    Core Objectives
                  </h4>
                  <ul className="mt-2.5 space-y-2 text-xs leading-relaxed">
                    <li>• Display the latest 30 theatrical cinema releases cleanly in a 5×6 interactive poster grid.</li>
                    <li>• Showcase upcoming releases from TMDB in a floating spotlight carousel with cast, synopsis, and calendar alerts.</li>
                    <li>• Prevent double-booking through seat status modeling (Available, Selected, Locked, Sold) with a 5-minute lock timer.</li>
                    <li>• Support city switching (Gwalior default), theme persistence (Light/Dark), and instant QR M-Ticket generation.</li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <h4 className="font-display text-sm font-bold text-[#070910] dark:text-white">
                    User Roles & Capabilities
                  </h4>
                  <ul className="mt-2.5 space-y-2 text-xs leading-relaxed">
                    <li>
                      <strong className="text-[#070910] dark:text-slate-100">Guest Moviegoer:</strong> Browse All, Top Rated, Now Showing, and Upcoming titles, filter by genre or search, switch cities, and preview movie details &amp; showtimes (sign-in required to book tickets).
                    </li>
                    <li>
                      <strong className="text-[#070910] dark:text-slate-100">Signed-In User:</strong> Select showtimes &amp; seats, complete Sandbox checkout, add upcoming movies to their Release Calendar, access <em>My Bookings</em>, and manage QR M-Ticket passes.
                    </li>
                    <li>
                      <strong className="text-[#070910] dark:text-slate-100">Backend Proxy:</strong> Validates inputs, maps TMDB genres, enriches upcoming spotlights, and keeps credentials server-side.
                    </li>
                  </ul>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <h4 className="font-display text-sm font-bold text-[#070910] dark:text-white">
                  Functional & Non-Functional Highlights
                </h4>
                <div className="mt-3 grid gap-3 text-xs sm:grid-cols-3">
                  <div className="rounded-xl bg-[#F4F7FC] p-3 dark:bg-[#070910]">
                    <p className="font-semibold text-[#070910] dark:text-lime-400">Live Data Sync</p>
                    <p className="mt-1 text-slate-500 dark:text-slate-400">
                      Real-time TMDB v3 theatrical queries with automatic fallback catalog resilience.
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#F4F7FC] p-3 dark:bg-[#070910]">
                    <p className="font-semibold text-[#070910] dark:text-blue-400">Responsive & Accessible</p>
                    <p className="mt-1 text-slate-500 dark:text-slate-400">
                      Keyboard-navigable dialogs, ARIA seat labels, and adaptive Light/Dark palettes.
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#F4F7FC] p-3 dark:bg-[#070910]">
                    <p className="font-semibold text-[#070910] dark:text-lime-400">Zero Client Secrets</p>
                    <p className="mt-1 text-slate-500 dark:text-slate-400">
                      TMDB keys and tokens remain strictly on the Express / Netlify Functions server tier.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {section === 'architecture' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-display text-base font-bold text-[#070910] dark:text-white">
                  Technology Stack
                </h3>
                <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F4F7FC] text-[#070910] dark:bg-[#070910] dark:text-slate-100">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Layer</th>
                        <th className="px-4 py-3 font-semibold">Technology</th>
                        <th className="px-4 py-3 font-semibold">Purpose</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      <tr>
                        <td className="px-4 py-3 font-medium text-[#070910] dark:text-white">Frontend</td>
                        <td className="px-4 py-3">React 19, TypeScript, Tailwind CSS v4, Motion, Vite</td>
                        <td className="px-4 py-3">Interactive UI, carousel transitions, seat grid, QR rendering</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium text-[#070910] dark:text-white">Backend Proxy</td>
                        <td className="px-4 py-3">Node.js + Express (`server.ts`) & Netlify Functions</td>
                        <td className="px-4 py-3">REST proxy routes, credential protection, TMDB normalization</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium text-[#070910] dark:text-white">Movie Database</td>
                        <td className="px-4 py-3">TMDB v3 REST API</td>
                        <td className="px-4 py-3">Now Playing, Top Rated, Upcoming, Search, Credits & Posters</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium text-[#070910] dark:text-white">User DB & Auth</td>
                        <td className="px-4 py-3">Firebase Authentication & Cloud Firestore</td>
                        <td className="px-4 py-3">Google / Email Auth, isolated user profiles, bookings & calendar alerts</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium text-[#070910] dark:text-white">Payment Gateway</td>
                        <td className="px-4 py-3">Sandbox Payment Gateway</td>
                        <td className="px-4 py-3">Simulated UPI, Card, Netbanking & Wallet checkout with Approve/Decline test states</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <h4 className="flex items-center gap-2 font-display text-sm font-bold text-[#070910] dark:text-white">
                  <Database className="h-4 w-4 text-blue-600 dark:text-lime-400" />
                  <span>Core System Entities</span>
                </h4>
                <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                  <div className="rounded-xl bg-[#F4F7FC] p-3 dark:bg-[#070910]">
                    <p className="font-mono-tabular font-semibold text-[#070910] dark:text-lime-400">Movie</p>
                    <p className="mt-1 text-slate-500 dark:text-slate-400">
                      id, tmdbId, title, genres, language, duration, rating, releaseDate, director, cast, posterImage, backdropImage.
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#F4F7FC] p-3 dark:bg-[#070910]">
                    <p className="font-mono-tabular font-semibold text-[#070910] dark:text-blue-400">Theatre & ShowtimeSlot</p>
                    <p className="mt-1 text-slate-500 dark:text-slate-400">
                      City-indexed multiplexes with amenities, screens, formats (IMAX 2D, 4DX, Dolby Atmos), and tier price multipliers.
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#F4F7FC] p-3 dark:bg-[#070910]">
                    <p className="font-mono-tabular font-semibold text-[#070910] dark:text-blue-400">SeatItem</p>
                    <p className="mt-1 text-slate-500 dark:text-slate-400">
                      Row A–J (Royal Recliner ₹550, Prime Executive ₹320, Classic ₹190) with available / sold / locked state.
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#F4F7FC] p-3 dark:bg-[#070910]">
                    <p className="font-mono-tabular font-semibold text-[#070910] dark:text-lime-400">BookingRecord</p>
                    <p className="mt-1 text-slate-500 dark:text-slate-400">
                      Unique bookingId, paymentId, seat list, GST breakdown, payment method, and deterministic QR pass data.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {section === 'api' && (
            <div className="space-y-5">
              <div className="flex items-start gap-3 rounded-2xl border border-lime-500/40 bg-lime-50/70 p-4 text-xs text-[#070910] dark:border-lime-400/30 dark:bg-lime-400/10 dark:text-lime-200">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-lime-600 dark:text-lime-400" />
                <div>
                  <p className="font-semibold">Server-Side Credential Isolation</p>
                  <p className="mt-1 leading-relaxed">
                    All TMDB requests route through <code className="font-mono-tabular">/api/tmdb/*</code> on Express (or <code className="font-mono-tabular">/.netlify/functions/tmdb</code> in production). <code className="font-mono-tabular">TMDB_READ_ACCESS_TOKEN</code> and <code className="font-mono-tabular">TMDB_API_KEY</code> are read from server environment variables and never exposed to the browser bundle.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="flex items-center gap-2 font-display text-base font-bold text-[#070910] dark:text-white">
                  <Code2 className="h-4 w-4 text-blue-600 dark:text-lime-400" />
                  <span>REST API Endpoints</span>
                </h3>

                <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                  <div className="p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono-tabular rounded bg-lime-400/25 px-2 py-0.5 text-[11px] font-bold text-[#070910] dark:bg-lime-400/20 dark:text-lime-400">
                        GET
                      </span>
                      <code className="font-mono-tabular text-xs font-semibold text-[#070910] dark:text-white">
                        /api/health
                      </code>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
                      Verifies server status and confirms whether TMDB credentials are configured (`tmdbConfigured: true`).
                    </p>
                  </div>

                  <div className="p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono-tabular rounded bg-lime-400/25 px-2 py-0.5 text-[11px] font-bold text-[#070910] dark:bg-lime-400/20 dark:text-lime-400">
                        GET
                      </span>
                      <code className="font-mono-tabular text-xs font-semibold text-[#070910] dark:text-white">
                        /api/tmdb/movies?category=all|now-showing|top-rated|upcoming
                      </code>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
                      Returns normalized movie arrays. <strong>all</strong> &amp; <strong>now-showing</strong> fetch the latest 30 theatrical cinema releases sorted newest first; <strong>upcoming</strong> enriches top spotlight releases with director, cast, and runtime.
                    </p>
                  </div>

                  <div className="p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono-tabular rounded bg-lime-400/25 px-2 py-0.5 text-[11px] font-bold text-[#070910] dark:bg-lime-400/20 dark:text-lime-400">
                        GET
                      </span>
                      <code className="font-mono-tabular text-xs font-semibold text-[#070910] dark:text-white">
                        /api/tmdb/search?q=&lt;query&gt;
                      </code>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
                      Debounced live search against TMDB `/search/movie` with query length capped and `include_adult=false`.
                    </p>
                  </div>

                  <div className="p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono-tabular rounded bg-lime-400/25 px-2 py-0.5 text-[11px] font-bold text-[#070910] dark:bg-lime-400/20 dark:text-lime-400">
                        GET
                      </span>
                      <code className="font-mono-tabular text-xs font-semibold text-[#070910] dark:text-white">
                        /api/tmdb/movie/:id
                      </code>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
                      Validates numeric TMDB ID (`^\d+$`) and fetches full movie details including cast, crew/director, runtime, and tagline.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {section === 'workflows' && (
            <div className="space-y-4">
              <h3 className="font-display text-base font-bold text-[#070910] dark:text-white">
                End-to-End Ticket Booking Workflow
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-center gap-2 font-display text-sm font-bold text-[#070910] dark:text-white">
                    <Lock className="h-4 w-4 text-blue-500" />
                    <span>Step 1 · Showtime & Seat Locking</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    Choose a city, theatre, date, and showtime. Selecting seats (manually or via 1–4 adjacent Quick Pick) starts a 5-minute seat-lock countdown timer and computes tier prices, convenience fee, and 18% GST.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-center gap-2 font-display text-sm font-bold text-[#070910] dark:text-white">
                    <CreditCard className="h-4 w-4 text-blue-600 dark:text-lime-400" />
                    <span>Step 2 · Sandbox Payment Gateway</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    Proceed to the integrated Sandbox checkout modal supporting UPI/QR, Debit/Credit Card, Netbanking, and Wallet methods with simulated Approve or Decline responses.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-center gap-2 font-display text-sm font-bold text-[#070910] dark:text-white">
                    <QrCode className="h-4 w-4 text-lime-600 dark:text-lime-400" />
                    <span>Step 3 · QR M-Ticket & My Bookings</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    Completed bookings permanently mark chosen seats as sold for that showtime and store a scannable QR M-Ticket accessible under <strong>My Bookings</strong> once signed in.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-center gap-2 font-display text-sm font-bold text-[#070910] dark:text-white">
                    <Server className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                    <span>Step 4 · Verification & Deployment</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    Verified via TypeScript strict compilation (<code className="font-mono-tabular">tsc --noEmit</code>) and Vite production bundling (<code className="font-mono-tabular">npm run build</code>), ready for Node/Express or Netlify deployment.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-[#F4F7FC] px-6 py-3.5 text-xs text-slate-500 dark:border-slate-800 dark:bg-[#0B0F1A] dark:text-slate-400">
          <span>CinNova Micro Project · The Neon</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-blue-600 px-4 py-1.5 font-semibold text-white transition-colors hover:bg-blue-500 dark:bg-lime-400 dark:text-[#070910] dark:hover:bg-lime-300"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
