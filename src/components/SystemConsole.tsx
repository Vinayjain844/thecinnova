import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Clock,
  Cpu,
  Lock,
  PauseCircle,
  PlayCircle,
  Radio,
  Unlock,
  Wrench,
} from 'lucide-react';
import { CITIES, getTheatresForCity } from '../data/movies';
import {
  AUDITORIUM_ROWS_CONFIG,
  AUDITORIUM_SEATS_PER_ROW,
  buildShowKey,
  Movie,
  SeatLockEntry,
  seededSoldSeatsForShow,
  SHOW_DATE_OPTIONS,
  ShowtimeSeatState,
  UserProfile,
} from '../types/cinema';
import {
  subscribeAllShowtimeSeats,
  subscribeShowtimeSeats,
  systemUpdateShowtimeSeats,
} from '../services/rbacService';

type SystemToolMode = 'lock' | 'block' | 'release' | 'sold';

interface SystemConsoleProps {
  user: UserProfile;
  movies: Movie[];
  defaultCity: string;
  onBackToUserPlatform: () => void;
}

export const SystemConsole: React.FC<SystemConsoleProps> = ({
  user,
  movies,
  defaultCity,
  onBackToUserPlatform,
}) => {
  const nowShowingMovies = useMemo(
    () => movies.filter((m) => m.status === 'now-showing'),
    [movies]
  );

  const [city, setCity] = useState(defaultCity || CITIES[0]);
  const theatres = useMemo(() => getTheatresForCity(city), [city]);
  const [theatreId, setTheatreId] = useState(theatres[0]?.id || '');
  const [dateId, setDateId] = useState<string>(SHOW_DATE_OPTIONS[0].id);
  const [movieId, setMovieId] = useState(nowShowingMovies[0]?.id || movies[0]?.id || '');
  const activeTheatre = useMemo(
    () => theatres.find((t) => t.id === theatreId) || theatres[0],
    [theatres, theatreId]
  );
  const [showtimeId, setShowtimeId] = useState(activeTheatre?.showtimes[0]?.id || '');
  const activeShowtime = useMemo(
    () => activeTheatre?.showtimes.find((s) => s.id === showtimeId) || activeTheatre?.showtimes[0],
    [activeTheatre, showtimeId]
  );

  const [toolMode, setToolMode] = useState<SystemToolMode>('lock');
  const [liveState, setLiveState] = useState<ShowtimeSeatState | null>(null);
  const [activeFeedStates, setActiveFeedStates] = useState<ShowtimeSeatState[]>([]);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [statusErr, setStatusErr] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (theatres.length > 0 && !theatres.some((t) => t.id === theatreId)) {
      setTheatreId(theatres[0].id);
    }
  }, [theatres, theatreId]);

  useEffect(() => {
    if (
      activeTheatre &&
      activeTheatre.showtimes.length > 0 &&
      !activeTheatre.showtimes.some((s) => s.id === showtimeId)
    ) {
      setShowtimeId(activeTheatre.showtimes[0].id);
    }
  }, [activeTheatre, showtimeId]);

  useEffect(() => {
    if (nowShowingMovies.length > 0 && !nowShowingMovies.some((m) => m.id === movieId)) {
      setMovieId(nowShowingMovies[0].id);
    }
  }, [nowShowingMovies, movieId]);

  const showKey = useMemo(() => {
    if (!movieId || !activeTheatre || !showtimeId) return '';
    return buildShowKey(movieId, city, activeTheatre.id, dateId, showtimeId);
  }, [movieId, city, activeTheatre, dateId, showtimeId]);

  useEffect(() => {
    if (!showKey || !activeTheatre) {
      setLiveState(null);
      return;
    }
    const unsub = subscribeShowtimeSeats(
      {
        showKey,
        movieId,
        city,
        theatreId: activeTheatre.id,
        dateId,
        showtimeId,
      },
      setLiveState
    );
    return () => unsub();
  }, [showKey, movieId, city, activeTheatre, dateId, showtimeId]);

  useEffect(() => {
    const unsub = subscribeAllShowtimeSeats(setActiveFeedStates);
    return () => unsub();
  }, []);

  const baseSeedSold = useMemo(
    () => (showKey ? seededSoldSeatsForShow(showKey) : new Set<string>()),
    [showKey]
  );

  const showMeta = activeTheatre
    ? {
        showKey,
        movieId,
        city,
        theatreId: activeTheatre.id,
        dateId,
        showtimeId,
      }
    : null;

  const commitPatch = async (
    patch: {
      soldSeats?: string[];
      blockedSeats?: string[];
      seatLocks?: Record<string, SeatLockEntry>;
      lockDurationSeconds?: number;
      systemPaused?: boolean;
    },
    successLabel: string
  ) => {
    if (!showMeta) return;
    setStatusErr(null);
    setStatusMsg(null);
    try {
      await systemUpdateShowtimeSeats(showMeta, patch, user.email);
      setStatusMsg(successLabel);
    } catch (err) {
      console.error('System seat update failed:', err);
      setStatusErr(
        'Could not update real-time seat document in Firestore. Ensure updated firestore.rules are published.'
      );
    }
  };

  const handleSeatInteraction = async (seatId: string) => {
    if (!liveState || !showMeta) return;
    const soldSet = new Set(liveState.soldSeats);
    const blockedSet = new Set(liveState.blockedSeats);
    const nextLocks = { ...liveState.seatLocks };

    if (toolMode === 'lock') {
      const existing = nextLocks[seatId];
      if (existing && existing.expiresAtMs > nowMs) {
        delete nextLocks[seatId];
        await commitPatch({ seatLocks: nextLocks }, `Released live lock on seat ${seatId}.`);
      } else {
        nextLocks[seatId] = {
          uid: user.uid || 'system',
          holderName: 'System Hold',
          expiresAtMs: nowMs + liveState.lockDurationSeconds * 1000,
        };
        await commitPatch(
          { seatLocks: nextLocks },
          `Locked seat ${seatId} in real time for ${liveState.lockDurationSeconds}s.`
        );
      }
      return;
    }

    if (toolMode === 'block') {
      if (blockedSet.has(seatId)) {
        blockedSet.delete(seatId);
        await commitPatch(
          { blockedSeats: Array.from(blockedSet) },
          `Unblocked seat ${seatId} back to available.`
        );
      } else {
        blockedSet.add(seatId);
        delete nextLocks[seatId];
        await commitPatch(
          { blockedSeats: Array.from(blockedSet), seatLocks: nextLocks },
          `Blocked seat ${seatId} for maintenance/reserved control.`
        );
      }
      return;
    }

    if (toolMode === 'sold') {
      if (soldSet.has(seatId)) {
        soldSet.delete(seatId);
        await commitPatch(
          { soldSeats: Array.from(soldSet) },
          `Cleared custom sold mark on seat ${seatId}.`
        );
      } else {
        soldSet.add(seatId);
        blockedSet.delete(seatId);
        delete nextLocks[seatId];
        await commitPatch(
          {
            soldSeats: Array.from(soldSet),
            blockedSeats: Array.from(blockedSet),
            seatLocks: nextLocks,
          },
          `Marked seat ${seatId} sold in real time.`
        );
      }
      return;
    }

    // toolMode === 'release'
    soldSet.delete(seatId);
    blockedSet.delete(seatId);
    delete nextLocks[seatId];
    await commitPatch(
      {
        soldSeats: Array.from(soldSet),
        blockedSeats: Array.from(blockedSet),
        seatLocks: nextLocks,
      },
      `Force-released seat ${seatId} to available.`
    );
  };

  const activeLocksList = useMemo(() => {
    if (!liveState) return [];
    return Object.entries(liveState.seatLocks)
      .filter(([, entry]) => entry.expiresAtMs > nowMs)
      .map(([seatId, entry]) => ({
        seatId,
        ...entry,
        secondsLeft: Math.max(0, Math.ceil((entry.expiresAtMs - nowMs) / 1000)),
      }));
  }, [liveState, nowMs]);

  const handlePurgeExpiredLocks = async () => {
    if (!liveState) return;
    const pruned: Record<string, SeatLockEntry> = {};
    Object.entries(liveState.seatLocks).forEach(([k, v]) => {
      if (v.expiresAtMs > nowMs) pruned[k] = v;
    });
    await commitPatch({ seatLocks: pruned }, 'Purged expired real-time seat locks.');
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between dark:border-blue-500/20">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-blue-600 uppercase dark:text-lime-400">
            <Cpu className="h-4 w-4" />
            <span>Role 4 · System Real-Time Seat Engine</span>
          </div>
          <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-[#070910] sm:text-3xl dark:text-slate-100">
            Live Seat{' '}
            <span className="font-cursive text-3xl text-blue-600 sm:text-4xl dark:text-lime-400">
              Synchronizer
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Control real-time seat locks, hold timers, maintenance blocks, and emergency showtime pauses across all connected clients.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-lime-700 dark:text-lime-400">
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            Live Stream Active
          </span>
          <button
            type="button"
            onClick={onBackToUserPlatform}
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:bg-[#0D111C] dark:text-slate-200 dark:hover:border-lime-400 dark:hover:text-lime-400"
          >
            User Platform
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="mt-4 rounded-xl border border-lime-500/40 bg-lime-50 px-4 py-2.5 text-xs font-medium text-lime-900 dark:border-lime-400/35 dark:bg-lime-400/10 dark:text-lime-300">
          {statusMsg}
        </div>
      )}
      {statusErr && (
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-300">
          {statusErr}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        {/* Left Controls */}
        <div className="space-y-5 lg:col-span-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-blue-500/20 dark:bg-[#0D111C]">
            <h2 className="font-display text-base font-bold text-[#070910] dark:text-slate-100">
              Showtime Stream Target
            </h2>
            <div className="mt-3 space-y-2.5">
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                aria-label="City"
                className="w-full rounded-xl border border-slate-200 bg-[#F4F7FC] px-3 py-2 text-xs font-medium text-[#070910] dark:border-slate-700 dark:bg-[#070910] dark:text-slate-100"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={activeTheatre?.id || ''}
                onChange={(e) => setTheatreId(e.target.value)}
                aria-label="Theatre"
                className="w-full rounded-xl border border-slate-200 bg-[#F4F7FC] px-3 py-2 text-xs font-medium text-[#070910] dark:border-slate-700 dark:bg-[#070910] dark:text-slate-100"
              >
                {theatres.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <select
                value={movieId}
                onChange={(e) => setMovieId(e.target.value)}
                aria-label="Movie"
                className="w-full rounded-xl border border-slate-200 bg-[#F4F7FC] px-3 py-2 text-xs font-medium text-[#070910] dark:border-slate-700 dark:bg-[#070910] dark:text-slate-100"
              >
                {nowShowingMovies.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={dateId}
                  onChange={(e) => setDateId(e.target.value)}
                  aria-label="Date"
                  className="rounded-xl border border-slate-200 bg-[#F4F7FC] px-3 py-2 text-xs font-medium text-[#070910] dark:border-slate-700 dark:bg-[#070910] dark:text-slate-100"
                >
                  {SHOW_DATE_OPTIONS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
                <select
                  value={activeShowtime?.id || ''}
                  onChange={(e) => setShowtimeId(e.target.value)}
                  aria-label="Showtime"
                  className="rounded-xl border border-slate-200 bg-[#F4F7FC] px-3 py-2 text-xs font-medium text-[#070910] dark:border-slate-700 dark:bg-[#070910] dark:text-slate-100"
                >
                  {activeTheatre?.showtimes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.time} ({s.format})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Lock TTL & System Pause */}
            <div className="mt-5 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
                    <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-lime-400" />
                    Seat Hold TTL
                  </span>
                  <span className="font-mono-tabular font-bold text-blue-600 dark:text-lime-400">
                    {liveState?.lockDurationSeconds ?? 300}s
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[60, 180, 300, 600].map((secs) => (
                    <button
                      key={secs}
                      type="button"
                      onClick={() =>
                        commitPatch(
                          { lockDurationSeconds: secs },
                          `Seat hold timer updated to ${secs}s.`
                        )
                      }
                      className={`font-mono-tabular rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                        (liveState?.lockDurationSeconds ?? 300) === secs
                          ? 'border-blue-600 bg-blue-600 text-white dark:border-lime-400 dark:bg-lime-400 dark:text-[#070910]'
                          : 'border-slate-200 bg-[#F4F7FC] text-slate-700 dark:border-slate-700 dark:bg-[#070910] dark:text-slate-300'
                      }`}
                    >
                      {secs}s
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  commitPatch(
                    { systemPaused: !liveState?.systemPaused },
                    liveState?.systemPaused
                      ? 'Resumed live booking for this showtime.'
                      : 'Paused live booking for this showtime.'
                  )
                }
                className={`flex h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-semibold transition-colors ${
                  liveState?.systemPaused
                    ? 'bg-lime-400 text-[#070910] hover:bg-lime-300'
                    : 'border border-amber-400/60 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300'
                }`}
              >
                {liveState?.systemPaused ? (
                  <>
                    <PlayCircle className="h-4 w-4" />
                    <span>Resume Showtime Booking</span>
                  </>
                ) : (
                  <>
                    <PauseCircle className="h-4 w-4" />
                    <span>Pause Showtime Booking</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Active Real-Time Locks */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-blue-500/20 dark:bg-[#0D111C]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-[#070910] dark:text-slate-100">
                <Activity className="h-4 w-4 text-blue-600 dark:text-lime-400" />
                <span>Active Real-Time Locks ({activeLocksList.length})</span>
              </h2>
              <button
                type="button"
                onClick={handlePurgeExpiredLocks}
                className="text-[11px] font-semibold text-blue-600 hover:underline dark:text-lime-400"
              >
                Purge Expired
              </button>
            </div>

            <div className="mt-3 max-h-52 space-y-2 overflow-y-auto">
              {activeLocksList.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No active user or system locks on this showtime.
                </p>
              ) : (
                activeLocksList.map((lk) => (
                  <div
                    key={lk.seatId}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-[#F4F7FC] px-3 py-2 text-xs dark:border-slate-800 dark:bg-[#070910]"
                  >
                    <div>
                      <p className="font-mono-tabular font-bold text-[#070910] dark:text-lime-300">
                        Seat {lk.seatId} · {lk.secondsLeft}s
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {lk.holderName}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!liveState) return;
                        const nextLocks = { ...liveState.seatLocks };
                        delete nextLocks[lk.seatId];
                        commitPatch(
                          { seatLocks: nextLocks },
                          `Unlocked seat ${lk.seatId}.`
                        );
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-blue-500 hover:text-blue-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-lime-400 dark:hover:text-lime-400"
                    >
                      <Unlock className="h-3 w-3" />
                      <span>Release</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            {activeFeedStates.length > 0 && (
              <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
                <p className="text-[11px] font-semibold text-slate-500 uppercase dark:text-slate-400">
                  Recently Synced Showtimes
                </p>
                <div className="mt-2 space-y-1.5">
                  {activeFeedStates.slice(0, 4).map((st) => (
                    <div
                      key={st.showKey}
                      className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300"
                    >
                      <span className="truncate pr-2">
                        {st.city} · {st.theatreId} · {st.showtimeId}
                      </span>
                      <span className="font-mono-tabular shrink-0 text-blue-600 dark:text-lime-400">
                        {st.soldSeats.length} sold · {st.blockedSeats.length} blk
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Interactive Real-Time Seat Interface */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 lg:col-span-8 dark:border-blue-500/20 dark:bg-[#0D111C]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-[#070910] dark:text-slate-100">
                Real-Time Auditorium Seat Matrix
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose a control mode below and click any seat to broadcast live state updates.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'lock', label: 'Lock Seat', icon: Lock },
                  { id: 'block', label: 'Block / Maint.', icon: Wrench },
                  { id: 'sold', label: 'Mark Sold', icon: Activity },
                  { id: 'release', label: 'Release', icon: Unlock },
                ] as const
              ).map((m) => {
                const Icon = m.icon;
                const active = toolMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setToolMode(m.id)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      active
                        ? 'border-blue-600 bg-blue-600 text-white dark:border-lime-400 dark:bg-lime-400 dark:text-[#070910]'
                        : 'border-slate-200 bg-[#F4F7FC] text-slate-700 hover:border-blue-400 dark:border-slate-700 dark:bg-[#070910] dark:text-slate-300'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-y border-slate-200 py-2.5 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3.5 w-3.5 rounded-sm border border-blue-500 bg-white dark:bg-[#070910]" />
                Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3.5 w-3.5 rounded-sm bg-blue-600" />
                Live Locked
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3.5 w-3.5 rounded-sm bg-amber-400" />
                Blocked
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3.5 w-3.5 rounded-sm bg-slate-300 dark:bg-slate-800" />
                Sold
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                commitPatch(
                  { seatLocks: {}, blockedSeats: [] },
                  'Cleared all live seat locks & blocks for this showtime.'
                )
              }
              className="text-xs font-semibold text-blue-600 hover:underline dark:text-lime-400"
            >
              Reset Locks &amp; Blocks
            </button>
          </div>

          <div className="mt-5 overflow-x-auto pb-2">
            <div className="mx-auto min-w-[520px] space-y-2">
              {AUDITORIUM_ROWS_CONFIG.map((rowCfg) => (
                <div key={rowCfg.row} className="flex items-center justify-between gap-2">
                  <span className="font-mono-tabular w-5 text-xs font-semibold text-slate-400">
                    {rowCfg.row}
                  </span>
                  <div className="flex flex-1 items-center justify-center gap-1.5">
                    {Array.from({ length: AUDITORIUM_SEATS_PER_ROW }, (_, idx) => {
                      const num = idx + 1;
                      const seatId = `${rowCfg.row}${num}`;
                      const isSeedSold = baseSeedSold.has(seatId);
                      const isCustomSold = Boolean(liveState?.soldSeats.includes(seatId));
                      const isBlocked = Boolean(liveState?.blockedSeats.includes(seatId));
                      const lock = liveState?.seatLocks[seatId];
                      const isLocked = Boolean(lock && lock.expiresAtMs > nowMs);

                      let cls =
                        'border-blue-500/50 bg-white text-slate-700 hover:border-lime-500 dark:border-blue-500/40 dark:bg-[#070910] dark:text-slate-200';
                      if (isLocked) {
                        cls = 'border-blue-600 bg-blue-600 text-white font-semibold';
                      } else if (isBlocked) {
                        cls = 'border-amber-500 bg-amber-400 text-[#070910] font-semibold';
                      } else if (isCustomSold || isSeedSold) {
                        cls =
                          'border-slate-300 bg-slate-200 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400';
                      }

                      return (
                        <React.Fragment key={seatId}>
                          {idx === 7 && <div className="w-4 shrink-0" />}
                          <button
                            type="button"
                            onClick={() => handleSeatInteraction(seatId)}
                            title={`${seatId} (${rowCfg.tier})`}
                            className={`font-mono-tabular flex h-7 w-7 items-center justify-center rounded-t-md rounded-b-xs border text-[11px] transition-colors ${cls}`}
                          >
                            {isLocked ? (
                              <Lock className="h-3 w-3" />
                            ) : isBlocked ? (
                              '!'
                            ) : isCustomSold || isSeedSold ? (
                              '×'
                            ) : (
                              num
                            )}
                          </button>
                        </React.Fragment>
                      );
                    })}
                  </div>
                  <span className="font-mono-tabular w-5 text-right text-xs font-semibold text-slate-400">
                    {rowCfg.row}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
