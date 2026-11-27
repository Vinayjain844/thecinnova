import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Lock,
  QrCode,
  ScanLine,
  Search,
  Ticket,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { CITIES, getTheatresForCity } from '../data/movies';
import {
  AUDITORIUM_ROWS_CONFIG,
  AUDITORIUM_SEATS_PER_ROW,
  buildShowKey,
  Movie,
  seededSoldSeatsForShow,
  SHOW_DATE_OPTIONS,
  ShowtimeSeatState,
  TicketPassRecord,
  UserProfile,
} from '../types/cinema';
import {
  checkInTicketPass,
  lookupTicketPass,
  staffUpdateTheatreSeats,
  subscribeRecentTicketPasses,
  subscribeShowtimeSeats,
} from '../services/rbacService';

interface StaffConsoleProps {
  user: UserProfile;
  movies: Movie[];
  defaultCity: string;
  onBackToUserPlatform: () => void;
}

export const StaffConsole: React.FC<StaffConsoleProps> = ({
  user,
  movies,
  defaultCity,
  onBackToUserPlatform,
}) => {
  const nowShowingMovies = useMemo(
    () => movies.filter((m) => m.status === 'now-showing'),
    [movies]
  );

  // Ticket Scanner State
  const [scanInput, setScanInput] = useState('');
  const [scannedPass, setScannedPass] = useState<TicketPassRecord | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [checkInBusy, setCheckInBusy] = useState(false);
  const [recentPasses, setRecentPasses] = useState<TicketPassRecord[]>([]);
  const [passesErr, setPassesErr] = useState<string | null>(null);

  // Optional live camera QR scanner (uses BarcodeDetector when supported)
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Theatre Seating Arrangement State
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
  const [liveSeatState, setLiveSeatState] = useState<ShowtimeSeatState | null>(null);
  const [seatActionMsg, setSeatActionMsg] = useState<string | null>(null);
  const [selectedSeatInfo, setSelectedSeatInfo] = useState<{
    seatId: string;
    status: string;
    pass?: TicketPassRecord;
  } | null>(null);

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

  useEffect(() => {
    const unsub = subscribeRecentTicketPasses(
      (passes) => {
        setRecentPasses(passes);
        setPassesErr(null);
      },
      () => {
        setPassesErr(
          'Unable to list /ticketPasses from Firestore. Ensure updated firestore.rules are published in cinnova-001.'
        );
      }
    );
    return () => unsub();
  }, []);

  const showKey = useMemo(() => {
    if (!movieId || !activeTheatre || !showtimeId) return '';
    return buildShowKey(movieId, city, activeTheatre.id, dateId, showtimeId);
  }, [movieId, city, activeTheatre, dateId, showtimeId]);

  useEffect(() => {
    if (!showKey || !activeTheatre) {
      setLiveSeatState(null);
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
      setLiveSeatState
    );
    return () => unsub();
  }, [showKey, movieId, city, activeTheatre, dateId, showtimeId]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleLookupPass = async (rawId: string) => {
    const cleanId = rawId.trim().toUpperCase();
    if (!cleanId) return;
    setScanLoading(true);
    setScanError(null);
    try {
      const found = await lookupTicketPass(cleanId);
      if (!found) {
        setScannedPass(null);
        setScanError(`No ticket pass found for Booking ID "${cleanId}".`);
      } else {
        setScannedPass(found);
      }
    } catch (err) {
      console.error('Ticket pass lookup failed:', err);
      setScanError(
        'Could not query ticket pass from Firestore. Ensure updated firestore.rules are published.'
      );
    } finally {
      setScanLoading(false);
    }
  };

  const handleStartQrCamera = async () => {
    setCameraError(null);
    if (!('mediaDevices' in navigator) || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is unavailable on this browser. Enter the Booking ID manually.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setCameraActive(true);
      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 60);

      const BarcodeDetectorCtor = (
        window as unknown as {
          BarcodeDetector?: new (opts: { formats: string[] }) => {
            detect: (source: HTMLVideoElement) => Promise<{ rawValue?: string }[]>;
          };
        }
      ).BarcodeDetector;

      if (!BarcodeDetectorCtor) {
        setCameraError('Live QR auto-decode is not supported on this browser; type the Booking ID shown on the pass.');
        return;
      }

      const detector = new BarcodeDetectorCtor({ formats: ['qr_code'] });
      const timer = window.setInterval(async () => {
        if (!videoRef.current || !streamRef.current) {
          window.clearInterval(timer);
          return;
        }
        try {
          const codes = await detector.detect(videoRef.current);
          const raw = codes[0]?.rawValue?.trim();
          if (raw) {
            window.clearInterval(timer);
            stopCamera();
            setScanInput(raw);
            handleLookupPass(raw);
          }
        } catch {
          // Ignore transient frame decode failures
        }
      }, 450);
    } catch {
      setCameraError('Camera permission denied or no camera available. Use manual Booking ID lookup.');
    }
  };

  const handleCheckIn = async (status: 'checked-in' | 'cancelled') => {
    if (!scannedPass) return;
    setCheckInBusy(true);
    setScanError(null);
    try {
      await checkInTicketPass(scannedPass.bookingId, user.email, status);
      setScannedPass((prev) =>
        prev
          ? {
              ...prev,
              status,
              checkedInAt: new Date().toISOString(),
              checkedInBy: user.email,
            }
          : null
      );
    } catch (err) {
      console.error('Check-in update failed:', err);
      setScanError('Failed to update ticket pass status in Firestore.');
    } finally {
      setCheckInBusy(false);
    }
  };

  const activeMovie = movies.find((m) => m.id === movieId);
  const activeShowtime = activeTheatre?.showtimes.find((s) => s.id === showtimeId);
  const activeDate = SHOW_DATE_OPTIONS.find((d) => d.id === dateId) || SHOW_DATE_OPTIONS[0];

  const baseSeedSold = useMemo(
    () => (showKey ? seededSoldSeatsForShow(showKey) : new Set<string>()),
    [showKey]
  );
  const firestoreSold = useMemo(
    () => new Set(liveSeatState?.soldSeats || []),
    [liveSeatState?.soldSeats]
  );
  const blockedSeats = useMemo(
    () => new Set(liveSeatState?.blockedSeats || []),
    [liveSeatState?.blockedSeats]
  );

  // Match recent checked-in/booked passes for this showtime so staff can inspect occupant info
  const passBySeat = useMemo(() => {
    const map = new Map<string, TicketPassRecord>();
    if (!activeMovie || !activeTheatre || !activeShowtime) return map;
    recentPasses.forEach((p) => {
      if (
        p.movieId === activeMovie.id &&
        p.theatreName === activeTheatre.name &&
        p.showtime === activeShowtime.time &&
        p.dateLabel === activeDate.label
      ) {
        p.seats.forEach((seatCode) => map.set(seatCode, p));
      }
    });
    return map;
  }, [recentPasses, activeMovie, activeTheatre, activeShowtime, activeDate]);

  const handleStaffSeatClick = async (seatId: string) => {
    if (!showKey || !activeTheatre) return;
    const isSold = baseSeedSold.has(seatId) || firestoreSold.has(seatId);
    const matchingPass = passBySeat.get(seatId);

    if (isSold) {
      setSelectedSeatInfo({
        seatId,
        status: matchingPass?.status === 'checked-in' ? 'Checked-In Guest' : 'Sold Seat',
        pass: matchingPass,
      });
      return;
    }

    const nextBlocked = blockedSeats.has(seatId)
      ? Array.from(blockedSeats).filter((s) => s !== seatId)
      : [...Array.from(blockedSeats), seatId];

    setSelectedSeatInfo({
      seatId,
      status: blockedSeats.has(seatId) ? 'Released to Available' : 'Walk-in / Staff Reserved',
    });

    try {
      await staffUpdateTheatreSeats(
        {
          showKey,
          movieId,
          city,
          theatreId: activeTheatre.id,
          dateId,
          showtimeId,
        },
        { blockedSeats: nextBlocked },
        user.email
      );
      setSeatActionMsg(
        `Seat ${seatId} ${blockedSeats.has(seatId) ? 'released' : 'reserved by Staff'} in live seating map.`
      );
    } catch (err) {
      console.error('Staff seat update error:', err);
      setSeatActionMsg(
        'Could not save seat arrangement change to Firestore. Ensure firestore.rules are published.'
      );
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between dark:border-blue-500/20">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-blue-600 uppercase dark:text-lime-400">
            <ScanLine className="h-4 w-4" />
            <span>Role 3 · Theatre Staff Portal</span>
          </div>
          <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-[#070910] sm:text-3xl dark:text-slate-100">
            Ticket Scanner &amp;{' '}
            <span className="font-cursive text-3xl text-blue-600 sm:text-4xl dark:text-lime-400">
              Seating Arrangement
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Scan QR M-Tickets at the auditorium entrance, admit guests, and manage theatre seating arrangements live.
          </p>
        </div>

        <button
          type="button"
          onClick={onBackToUserPlatform}
          className="h-10 shrink-0 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:bg-[#0D111C] dark:text-slate-200 dark:hover:border-lime-400 dark:hover:text-lime-400"
        >
          View User Platform
        </button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        {/* Left: Ticket Scanner & Verification */}
        <div className="space-y-5 lg:col-span-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-blue-500/20 dark:bg-[#0D111C]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-blue-600 dark:text-lime-400" />
                <h2 className="font-display text-base font-bold text-[#070910] dark:text-slate-100">
                  M-Ticket Scanner
                </h2>
              </div>
              <button
                type="button"
                onClick={cameraActive ? stopCamera : handleStartQrCamera}
                className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-[#F4F7FC] px-3 text-xs font-semibold text-slate-700 hover:border-blue-500 hover:text-blue-600 dark:border-slate-700 dark:bg-[#070910] dark:text-slate-200 dark:hover:border-lime-400 dark:hover:text-lime-400"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>{cameraActive ? 'Stop Camera' : 'Scan QR'}</span>
              </button>
            </div>

            {cameraActive && (
              <div className="mt-3 overflow-hidden rounded-xl border border-blue-500/40 bg-black">
                <video ref={videoRef} className="h-44 w-full object-cover" muted playsInline />
              </div>
            )}
            {cameraError && (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{cameraError}</p>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLookupPass(scanInput);
              }}
              className="mt-4 flex gap-2"
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder="Enter Booking ID (e.g. CNV-842190)"
                  className="font-mono-tabular w-full rounded-xl border border-slate-200 bg-[#F4F7FC] py-2 pl-9 pr-3 text-xs uppercase text-[#070910] focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-[#070910] dark:text-slate-100"
                />
              </div>
              <button
                type="submit"
                disabled={scanLoading}
                className="h-9 shrink-0 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-60 dark:bg-lime-400 dark:text-[#070910] dark:hover:bg-lime-300"
              >
                {scanLoading ? 'Checking...' : 'Verify'}
              </button>
            </form>

            {scanError && (
              <div className="mt-3 rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
                {scanError}
              </div>
            )}

            {scannedPass && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-[#F4F7FC] p-4 dark:border-slate-800 dark:bg-[#070910]">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono-tabular text-xs font-bold text-blue-600 dark:text-lime-400">
                      {scannedPass.bookingId}
                    </p>
                    <h3 className="font-display mt-0.5 text-base font-bold text-[#070910] dark:text-white">
                      {scannedPass.movieTitle}
                    </h3>
                  </div>
                  <span
                    className={`font-mono-tabular text-xs font-bold uppercase ${
                      scannedPass.status === 'checked-in'
                        ? 'text-lime-600 dark:text-lime-400'
                        : scannedPass.status === 'cancelled'
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    {scannedPass.status}
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  <p>
                    Guest: <strong className="text-[#070910] dark:text-white">{scannedPass.holderName}</strong>
                  </p>
                  <p>
                    Venue: {scannedPass.theatreName} ({scannedPass.city}) · {scannedPass.screen}
                  </p>
                  <p>
                    Show: {scannedPass.dateLabel} · {scannedPass.showtime} ({scannedPass.format})
                  </p>
                  <p className="font-mono-tabular font-semibold text-[#070910] dark:text-lime-300">
                    Seats: {scannedPass.seats.join(', ')} · ₹{scannedPass.totalAmount}
                  </p>
                  {scannedPass.checkedInAt && (
                    <p className="text-[11px] text-lime-700 dark:text-lime-400">
                      Checked in by {scannedPass.checkedInBy}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    disabled={checkInBusy || scannedPass.status === 'checked-in'}
                    onClick={() => handleCheckIn('checked-in')}
                    className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-lime-400 dark:text-[#070910] dark:hover:bg-lime-300"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>
                      {scannedPass.status === 'checked-in' ? 'Already Checked In' : 'Check In & Admit'}
                    </span>
                  </button>
                  {scannedPass.status === 'valid' && (
                    <button
                      type="button"
                      disabled={checkInBusy}
                      onClick={() => handleCheckIn('cancelled')}
                      className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-rose-300 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-400 dark:hover:bg-rose-500/10"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Void</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Live Ticket Passes Queue */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-blue-500/20 dark:bg-[#0D111C]">
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-blue-600 dark:text-lime-400" />
              <h2 className="font-display text-sm font-bold text-[#070910] dark:text-slate-100">
                Recent Ticket Passes ({recentPasses.length})
              </h2>
            </div>
            {passesErr && (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{passesErr}</p>
            )}
            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
              {recentPasses.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No recent passes recorded in Firestore yet.
                </p>
              ) : (
                recentPasses.map((p) => (
                  <button
                    key={p.bookingId}
                    type="button"
                    onClick={() => {
                      setScanInput(p.bookingId);
                      setScannedPass(p);
                      setScanError(null);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-[#F4F7FC] px-3 py-2.5 text-left text-xs transition-colors hover:border-blue-500 dark:border-slate-800 dark:bg-[#070910] dark:hover:border-lime-400"
                  >
                    <div className="min-w-0">
                      <p className="font-mono-tabular truncate font-bold text-[#070910] dark:text-slate-100">
                        {p.bookingId} · {p.seats.join(', ')}
                      </p>
                      <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {p.movieTitle} · {p.holderName}
                      </p>
                    </div>
                    <span
                      className={`font-mono-tabular shrink-0 text-[11px] font-semibold uppercase ${
                        p.status === 'checked-in'
                          ? 'text-lime-600 dark:text-lime-400'
                          : 'text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {p.status}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Theatre Seating Arrangement Inspector & Ushering Control */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 lg:col-span-7 dark:border-blue-500/20 dark:bg-[#0D111C]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-bold text-[#070910] dark:text-slate-100">
                Theatre Seating Arrangement
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click any sold seat to view the guest pass, or click an available seat to toggle walk-in reservation.
              </p>
            </div>
            {liveSeatState?.systemPaused && (
              <span className="font-mono-tabular text-xs font-semibold text-amber-600 dark:text-amber-300">
                System Paused
              </span>
            )}
          </div>

          {/* Show Selector Controls */}
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              aria-label="Select city"
              className="rounded-xl border border-slate-200 bg-[#F4F7FC] px-3 py-2 text-xs font-medium text-[#070910] dark:border-slate-700 dark:bg-[#070910] dark:text-slate-100"
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
              aria-label="Select theatre"
              className="rounded-xl border border-slate-200 bg-[#F4F7FC] px-3 py-2 text-xs font-medium text-[#070910] dark:border-slate-700 dark:bg-[#070910] dark:text-slate-100"
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
              aria-label="Select movie"
              className="rounded-xl border border-slate-200 bg-[#F4F7FC] px-3 py-2 text-xs font-medium text-[#070910] dark:border-slate-700 dark:bg-[#070910] dark:text-slate-100"
            >
              {nowShowingMovies.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
            <select
              value={dateId}
              onChange={(e) => setDateId(e.target.value)}
              aria-label="Select date"
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
              aria-label="Select showtime"
              className="rounded-xl border border-slate-200 bg-[#F4F7FC] px-3 py-2 text-xs font-medium text-[#070910] sm:col-span-2 dark:border-slate-700 dark:bg-[#070910] dark:text-slate-100"
            >
              {activeTheatre?.showtimes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.time} · {s.format} · {s.screen}
                </option>
              ))}
            </select>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-4 border-y border-slate-200 py-2.5 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-3.5 rounded-sm border border-blue-500 bg-white dark:bg-[#070910]" />
              Available
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-3.5 rounded-sm bg-slate-300 dark:bg-slate-800" />
              Sold
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-3.5 rounded-sm bg-lime-400" />
              Checked-In
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-3.5 rounded-sm bg-amber-400" />
              Staff / System Held
            </span>
          </div>

          {/* Auditorium Map */}
          <div className="mt-4 overflow-x-auto pb-2">
            <div className="mx-auto min-w-[500px] space-y-1.5">
              {AUDITORIUM_ROWS_CONFIG.map((rowCfg) => (
                <div key={rowCfg.row} className="flex items-center justify-between gap-2">
                  <span className="font-mono-tabular w-5 text-xs font-semibold text-slate-400">
                    {rowCfg.row}
                  </span>
                  <div className="flex flex-1 items-center justify-center gap-1">
                    {Array.from({ length: AUDITORIUM_SEATS_PER_ROW }, (_, idx) => {
                      const num = idx + 1;
                      const seatId = `${rowCfg.row}${num}`;
                      const isSold = baseSeedSold.has(seatId) || firestoreSold.has(seatId);
                      const isBlocked = blockedSeats.has(seatId);
                      const lock = liveSeatState?.seatLocks[seatId];
                      const isLocked = Boolean(lock && lock.expiresAtMs > Date.now());
                      const pass = passBySeat.get(seatId);
                      const isCheckedIn = pass?.status === 'checked-in';

                      let cls =
                        'border-blue-500/50 bg-white text-slate-700 hover:border-lime-500 dark:border-blue-500/40 dark:bg-[#070910] dark:text-slate-200';
                      if (isCheckedIn) {
                        cls = 'border-lime-500 bg-lime-400 text-[#070910] font-bold';
                      } else if (isSold) {
                        cls =
                          'border-slate-300 bg-slate-200 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
                      } else if (isBlocked || isLocked) {
                        cls =
                          'border-amber-500 bg-amber-400/90 text-[#070910] font-semibold';
                      }

                      return (
                        <React.Fragment key={seatId}>
                          {idx === 7 && <div className="w-4 shrink-0" />}
                          <button
                            type="button"
                            onClick={() => handleStaffSeatClick(seatId)}
                            title={`${seatId} (${rowCfg.tier})`}
                            className={`font-mono-tabular flex h-7 w-7 items-center justify-center rounded-t-md rounded-b-xs border text-[11px] transition-colors ${cls}`}
                          >
                            {isCheckedIn ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : isBlocked || isLocked ? (
                              <Lock className="h-3 w-3" />
                            ) : isSold ? (
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

          {seatActionMsg && (
            <p className="mt-3 text-xs font-medium text-blue-600 dark:text-lime-400">
              {seatActionMsg}
            </p>
          )}

          {selectedSeatInfo && (
            <div className="mt-3 rounded-xl border border-slate-200 bg-[#F4F7FC] p-3.5 text-xs dark:border-slate-800 dark:bg-[#070910]">
              <p className="font-mono-tabular font-bold text-[#070910] dark:text-slate-100">
                Seat {selectedSeatInfo.seatId} · {selectedSeatInfo.status}
              </p>
              {selectedSeatInfo.pass ? (
                <p className="mt-1 text-slate-600 dark:text-slate-300">
                  Booking <span className="font-mono-tabular font-semibold">{selectedSeatInfo.pass.bookingId}</span> · Holder:{' '}
                  {selectedSeatInfo.pass.holderName} · Status: {selectedSeatInfo.pass.status}
                </p>
              ) : (
                <p className="mt-1 text-slate-500 dark:text-slate-400">
                  Seat state synchronized with Firestore showtime seating arrangement.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
