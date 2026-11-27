import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import {
  BookingRecord,
  DEFAULT_PLATFORM_CATALOG,
  DEFAULT_SEAT_PRICING,
  isBootstrapAdminEmail,
  PlatformCatalogConfig,
  RoleAssignmentRecord,
  SeatLockEntry,
  ShowtimeSeatState,
  TicketPassRecord,
  TicketPassStatus,
  UserRole,
} from '../types/cinema';

const ID_PATTERN = /^[a-zA-Z0-9_\-]+$/;

export function emailToKey(email: string): string {
  return email
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .slice(0, 128);
}

function sanitizeId(value: string, fallback = 'item'): string {
  const cleaned = value.trim().replace(/[^a-zA-Z0-9_\-]/g, '-').slice(0, 128);
  return ID_PATTERN.test(cleaned) ? cleaned : `${fallback}-${Date.now()}`;
}

function clampNum(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n * 100) / 100));
}

function clampStr(value: unknown, maxLen: number, fallback = ''): string {
  const str = typeof value === 'string' ? value.trim() : '';
  return (str.length > 0 ? str : fallback).slice(0, maxLen);
}

export function resolveEffectiveRole(
  email: string | null | undefined,
  assignedRole?: UserRole | null
): UserRole {
  if (isBootstrapAdminEmail(email)) {
    return 'admin';
  }
  if (assignedRole === 'admin' || assignedRole === 'staff' || assignedRole === 'system') {
    return assignedRole;
  }
  return 'user';
}

export function subscribeMyRoleAssignment(
  email: string,
  onRole: (role: UserRole) => void
): () => void {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    onRole('user');
    return () => {};
  }
  if (isBootstrapAdminEmail(cleanEmail)) {
    onRole('admin');
    return () => {};
  }

  const key = emailToKey(cleanEmail);
  const path = `roleAssignments/${key}`;
  return onSnapshot(
    doc(db, 'roleAssignments', key),
    (snap) => {
      if (!snap.exists()) {
        onRole('user');
        return;
      }
      const data = snap.data();
      const raw = data?.role;
      const role: UserRole =
        raw === 'admin' || raw === 'staff' || raw === 'system' ? raw : 'user';
      onRole(role);
    },
    (error) => {
      console.warn(`Role lookup fallback to user for ${path}:`, error);
      onRole('user');
    }
  );
}

export function subscribeAllRoleAssignments(
  onList: (records: RoleAssignmentRecord[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const path = 'roleAssignments';
  const q = query(collection(db, 'roleAssignments'), orderBy('updatedAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const records: RoleAssignmentRecord[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        const rawRole = d.role;
        const role: UserRole =
          rawRole === 'admin' || rawRole === 'staff' || rawRole === 'system' ? rawRole : 'user';
        return {
          emailKey: String(d.emailKey || docSnap.id),
          email: String(d.email || ''),
          role,
          label: typeof d.label === 'string' ? d.label : undefined,
          assignedBy: String(d.assignedBy || ''),
        };
      });
      onList(records);
    },
    (error) => {
      onError?.(error);
      console.warn(`Unable to subscribe ${path}:`, error);
    }
  );
}

export async function assignUserRole(
  targetEmail: string,
  role: UserRole,
  label: string,
  assignedByEmail: string
): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) {
    throw new Error('Verified Admin authentication required.');
  }
  const cleanEmail = targetEmail.trim().toLowerCase().slice(0, 160);
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Enter a valid email address.');
  }
  const key = emailToKey(cleanEmail);
  const path = `roleAssignments/${key}`;
  const ref = doc(db, 'roleAssignments', key);

  try {
    const existing = await getDoc(ref);
    if (existing.exists()) {
      await updateDoc(ref, {
        role,
        label: clampStr(label, 80, ''),
        assignedBy: clampStr(assignedByEmail, 160, auth.currentUser.email || 'admin'),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        emailKey: key,
        email: cleanEmail,
        role,
        label: clampStr(label, 80, ''),
        assignedBy: clampStr(assignedByEmail, 160, auth.currentUser.email || 'admin'),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function removeUserRole(emailKey: string): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) {
    throw new Error('Verified Admin authentication required.');
  }
  const safeKey = sanitizeId(emailKey, 'role');
  const path = `roleAssignments/${safeKey}`;
  try {
    await deleteDoc(doc(db, 'roleAssignments', safeKey));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

function normalizePlatformCatalog(raw: Record<string, unknown> | undefined): PlatformCatalogConfig {
  if (!raw) return DEFAULT_PLATFORM_CATALOG;
  const rawPricing = (raw.pricing as Record<string, unknown> | undefined) || {};
  const hiddenRaw = Array.isArray(raw.hiddenMovieIds) ? raw.hiddenMovieIds : [];
  const hiddenMovieIds = hiddenRaw
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim().slice(0, 64))
    .slice(0, 200);

  const multRaw = (raw.moviePriceMultipliers as Record<string, unknown> | undefined) || {};
  const moviePriceMultipliers: Record<string, number> = {};
  Object.entries(multRaw)
    .slice(0, 200)
    .forEach(([k, v]) => {
      const n = Number(v);
      if (k.trim() && Number.isFinite(n) && n >= 0.5 && n <= 5) {
        moviePriceMultipliers[k.trim().slice(0, 64)] = Math.round(n * 100) / 100;
      }
    });

  return {
    pricing: {
      royalRecliner: clampNum(rawPricing.royalRecliner, 50, 5000, DEFAULT_SEAT_PRICING.royalRecliner),
      primeExecutive: clampNum(
        rawPricing.primeExecutive,
        50,
        5000,
        DEFAULT_SEAT_PRICING.primeExecutive
      ),
      classic: clampNum(rawPricing.classic, 50, 5000, DEFAULT_SEAT_PRICING.classic),
      convenienceFee: clampNum(
        rawPricing.convenienceFee,
        0,
        500,
        DEFAULT_SEAT_PRICING.convenienceFee
      ),
      gstPercent: clampNum(rawPricing.gstPercent, 0, 50, DEFAULT_SEAT_PRICING.gstPercent),
    },
    hiddenMovieIds,
    moviePriceMultipliers,
    updatedBy: typeof raw.updatedBy === 'string' ? raw.updatedBy : undefined,
  };
}

export function subscribePlatformCatalogConfig(
  onConfig: (config: PlatformCatalogConfig) => void
): () => void {
  const path = 'platformConfig/catalog';
  return onSnapshot(
    doc(db, 'platformConfig', 'catalog'),
    (snap) => {
      if (!snap.exists()) {
        onConfig(DEFAULT_PLATFORM_CATALOG);
        return;
      }
      onConfig(normalizePlatformCatalog(snap.data()));
    },
    (error) => {
      console.warn(`Fallback to default catalog config (${path}):`, error);
      onConfig(DEFAULT_PLATFORM_CATALOG);
    }
  );
}

export async function savePlatformCatalogConfig(
  config: PlatformCatalogConfig,
  updatedByEmail: string
): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) {
    throw new Error('Verified Admin authentication required.');
  }
  const normalized = normalizePlatformCatalog(config as unknown as Record<string, unknown>);
  const path = 'platformConfig/catalog';
  try {
    await setDoc(doc(db, 'platformConfig', 'catalog'), {
      pricing: normalized.pricing,
      hiddenMovieIds: normalized.hiddenMovieIds,
      moviePriceMultipliers: normalized.moviePriceMultipliers,
      updatedBy: clampStr(updatedByEmail, 160, auth.currentUser.email || 'admin'),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export interface ShowContextMeta {
  showKey: string;
  movieId: string;
  city: string;
  theatreId: string;
  dateId: string;
  showtimeId: string;
}

function normalizeShowtimeSeats(
  raw: Record<string, unknown> | undefined,
  meta: ShowContextMeta
): ShowtimeSeatState {
  if (!raw) {
    return {
      ...meta,
      soldSeats: [],
      blockedSeats: [],
      seatLocks: {},
      lockDurationSeconds: 300,
      systemPaused: false,
    };
  }
  const soldSeats = Array.isArray(raw.soldSeats)
    ? raw.soldSeats.filter((s): s is string => typeof s === 'string').slice(0, 126)
    : [];
  const blockedSeats = Array.isArray(raw.blockedSeats)
    ? raw.blockedSeats.filter((s): s is string => typeof s === 'string').slice(0, 126)
    : [];

  const seatLocks: Record<string, SeatLockEntry> = {};
  const rawLocks = (raw.seatLocks as Record<string, unknown> | undefined) || {};
  Object.entries(rawLocks)
    .slice(0, 126)
    .forEach(([seatId, val]) => {
      if (val && typeof val === 'object') {
        const entry = val as Record<string, unknown>;
        const expiresAtMs = Number(entry.expiresAtMs || 0);
        if (typeof entry.uid === 'string' && expiresAtMs > 0) {
          seatLocks[seatId.slice(0, 10)] = {
            uid: entry.uid.slice(0, 128),
            holderName: clampStr(entry.holderName, 60, 'Guest'),
            expiresAtMs,
          };
        }
      }
    });

  return {
    showKey: String(raw.showKey || meta.showKey),
    movieId: String(raw.movieId || meta.movieId),
    city: String(raw.city || meta.city),
    theatreId: String(raw.theatreId || meta.theatreId),
    dateId: String(raw.dateId || meta.dateId),
    showtimeId: String(raw.showtimeId || meta.showtimeId),
    soldSeats,
    blockedSeats,
    seatLocks,
    lockDurationSeconds: Math.trunc(clampNum(raw.lockDurationSeconds, 30, 900, 300)),
    systemPaused: Boolean(raw.systemPaused),
    updatedBy: typeof raw.updatedBy === 'string' ? raw.updatedBy : undefined,
  };
}

export function subscribeShowtimeSeats(
  meta: ShowContextMeta | null,
  onState: (state: ShowtimeSeatState | null) => void
): () => void {
  if (!meta?.showKey) {
    onState(null);
    return () => {};
  }
  const safeKey = sanitizeId(meta.showKey, 'show');
  return onSnapshot(
    doc(db, 'showtimeSeats', safeKey),
    (snap) => {
      if (!snap.exists()) {
        onState(normalizeShowtimeSeats(undefined, { ...meta, showKey: safeKey }));
        return;
      }
      onState(normalizeShowtimeSeats(snap.data(), { ...meta, showKey: safeKey }));
    },
    (error) => {
      console.warn(`Live seat stream fallback for ${safeKey}:`, error);
      onState(normalizeShowtimeSeats(undefined, { ...meta, showKey: safeKey }));
    }
  );
}

export function subscribeAllShowtimeSeats(
  onList: (states: ShowtimeSeatState[]) => void
): () => void {
  const q = query(collection(db, 'showtimeSeats'), orderBy('updatedAt', 'desc'), limit(40));
  return onSnapshot(
    q,
    (snapshot) => {
      const states = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return normalizeShowtimeSeats(d, {
          showKey: String(d.showKey || docSnap.id),
          movieId: String(d.movieId || ''),
          city: String(d.city || ''),
          theatreId: String(d.theatreId || ''),
          dateId: String(d.dateId || 'today'),
          showtimeId: String(d.showtimeId || ''),
        });
      });
      onList(states);
    },
    (error) => {
      console.warn('Unable to list showtimeSeats:', error);
    }
  );
}

export async function syncUserSeatLocks(
  meta: ShowContextMeta,
  selectedSeatIds: string[],
  uid: string,
  holderName: string
): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return;
  const safeKey = sanitizeId(meta.showKey, 'show');
  const ref = doc(db, 'showtimeSeats', safeKey);
  const now = Date.now();

  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const current = normalizeShowtimeSeats(snap.exists() ? snap.data() : undefined, {
        ...meta,
        showKey: safeKey,
      });

      if (current.systemPaused) {
        return;
      }

      const nextLocks: Record<string, SeatLockEntry> = {};
      Object.entries(current.seatLocks).forEach(([seatId, lock]) => {
        if (lock.expiresAtMs > now && lock.uid !== uid) {
          nextLocks[seatId] = lock;
        }
      });

      const expiresAtMs = now + current.lockDurationSeconds * 1000;
      selectedSeatIds.slice(0, 8).forEach((seatId) => {
        if (
          !current.soldSeats.includes(seatId) &&
          !current.blockedSeats.includes(seatId) &&
          !nextLocks[seatId]
        ) {
          nextLocks[seatId] = {
            uid,
            holderName: clampStr(holderName, 60, 'Guest'),
            expiresAtMs,
          };
        }
      });

      if (snap.exists()) {
        tx.update(ref, {
          seatLocks: nextLocks,
          updatedBy: clampStr(uid, 160, 'user'),
          updatedAt: serverTimestamp(),
        });
      } else if (selectedSeatIds.length > 0) {
        tx.set(ref, {
          showKey: safeKey,
          movieId: clampStr(meta.movieId, 64, 'movie'),
          city: clampStr(meta.city, 60, 'Gwalior'),
          theatreId: clampStr(meta.theatreId, 64, 'theatre'),
          dateId: clampStr(meta.dateId, 32, 'today'),
          showtimeId: clampStr(meta.showtimeId, 32, 'slot'),
          soldSeats: [],
          blockedSeats: [],
          seatLocks: nextLocks,
          lockDurationSeconds: 300,
          systemPaused: false,
          updatedBy: clampStr(uid, 160, 'user'),
          updatedAt: serverTimestamp(),
        });
      }
    });
  } catch (error) {
    console.warn('Real-time seat lock sync skipped:', error);
  }
}

export async function commitSoldSeats(
  meta: ShowContextMeta,
  seatIds: string[],
  uid: string
): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified || seatIds.length === 0) return;
  const safeKey = sanitizeId(meta.showKey, 'show');
  const ref = doc(db, 'showtimeSeats', safeKey);
  const now = Date.now();

  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const current = normalizeShowtimeSeats(snap.exists() ? snap.data() : undefined, {
        ...meta,
        showKey: safeKey,
      });

      const soldSet = new Set(current.soldSeats);
      seatIds.forEach((s) => soldSet.add(s));
      const nextSold = Array.from(soldSet).slice(0, 126);

      const nextLocks: Record<string, SeatLockEntry> = {};
      Object.entries(current.seatLocks).forEach(([seatId, lock]) => {
        if (!soldSet.has(seatId) && lock.expiresAtMs > now && lock.uid !== uid) {
          nextLocks[seatId] = lock;
        }
      });

      if (snap.exists()) {
        tx.update(ref, {
          soldSeats: nextSold,
          seatLocks: nextLocks,
          updatedBy: clampStr(uid, 160, 'user'),
          updatedAt: serverTimestamp(),
        });
      } else {
        tx.set(ref, {
          showKey: safeKey,
          movieId: clampStr(meta.movieId, 64, 'movie'),
          city: clampStr(meta.city, 60, 'Gwalior'),
          theatreId: clampStr(meta.theatreId, 64, 'theatre'),
          dateId: clampStr(meta.dateId, 32, 'today'),
          showtimeId: clampStr(meta.showtimeId, 32, 'slot'),
          soldSeats: nextSold,
          blockedSeats: [],
          seatLocks: nextLocks,
          lockDurationSeconds: 300,
          systemPaused: false,
          updatedBy: clampStr(uid, 160, 'user'),
          updatedAt: serverTimestamp(),
        });
      }
    });
  } catch (error) {
    console.warn('Commit sold seats to showtimeSeats skipped:', error);
  }
}

export async function systemUpdateShowtimeSeats(
  meta: ShowContextMeta,
  patch: {
    soldSeats?: string[];
    blockedSeats?: string[];
    seatLocks?: Record<string, SeatLockEntry>;
    lockDurationSeconds?: number;
    systemPaused?: boolean;
  },
  operatorEmail: string
): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) {
    throw new Error('Verified System/Admin account required.');
  }
  const safeKey = sanitizeId(meta.showKey, 'show');
  const ref = doc(db, 'showtimeSeats', safeKey);
  const path = `showtimeSeats/${safeKey}`;

  try {
    const snap = await getDoc(ref);
    const current = normalizeShowtimeSeats(snap.exists() ? snap.data() : undefined, {
      ...meta,
      showKey: safeKey,
    });

    const nextPayload = {
      showKey: safeKey,
      movieId: clampStr(meta.movieId, 64, 'movie'),
      city: clampStr(meta.city, 60, 'Gwalior'),
      theatreId: clampStr(meta.theatreId, 64, 'theatre'),
      dateId: clampStr(meta.dateId, 32, 'today'),
      showtimeId: clampStr(meta.showtimeId, 32, 'slot'),
      soldSeats: (patch.soldSeats ?? current.soldSeats).slice(0, 126),
      blockedSeats: (patch.blockedSeats ?? current.blockedSeats).slice(0, 126),
      seatLocks: patch.seatLocks ?? current.seatLocks,
      lockDurationSeconds: Math.trunc(
        clampNum(patch.lockDurationSeconds ?? current.lockDurationSeconds, 30, 900, 300)
      ),
      systemPaused: patch.systemPaused ?? current.systemPaused,
      updatedBy: clampStr(operatorEmail, 160, auth.currentUser.email || 'system'),
      updatedAt: serverTimestamp(),
    };

    if (snap.exists()) {
      await updateDoc(ref, nextPayload);
    } else {
      await setDoc(ref, nextPayload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function staffUpdateTheatreSeats(
  meta: ShowContextMeta,
  patch: {
    blockedSeats?: string[];
    soldSeats?: string[];
    seatLocks?: Record<string, SeatLockEntry>;
  },
  staffEmail: string
): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) {
    throw new Error('Verified Staff/Admin account required.');
  }
  const safeKey = sanitizeId(meta.showKey, 'show');
  const ref = doc(db, 'showtimeSeats', safeKey);
  const path = `showtimeSeats/${safeKey}`;

  try {
    const snap = await getDoc(ref);
    const current = normalizeShowtimeSeats(snap.exists() ? snap.data() : undefined, {
      ...meta,
      showKey: safeKey,
    });

    if (snap.exists()) {
      await updateDoc(ref, {
        blockedSeats: (patch.blockedSeats ?? current.blockedSeats).slice(0, 126),
        soldSeats: (patch.soldSeats ?? current.soldSeats).slice(0, 126),
        seatLocks: patch.seatLocks ?? current.seatLocks,
        updatedBy: clampStr(staffEmail, 160, auth.currentUser.email || 'staff'),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        showKey: safeKey,
        movieId: clampStr(meta.movieId, 64, 'movie'),
        city: clampStr(meta.city, 60, 'Gwalior'),
        theatreId: clampStr(meta.theatreId, 64, 'theatre'),
        dateId: clampStr(meta.dateId, 32, 'today'),
        showtimeId: clampStr(meta.showtimeId, 32, 'slot'),
        soldSeats: (patch.soldSeats ?? []).slice(0, 126),
        blockedSeats: (patch.blockedSeats ?? []).slice(0, 126),
        seatLocks: patch.seatLocks ?? {},
        lockDurationSeconds: 300,
        systemPaused: false,
        updatedBy: clampStr(staffEmail, 160, auth.currentUser.email || 'staff'),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

function normalizeTicketPass(raw: Record<string, unknown>, idFallback: string): TicketPassRecord {
  const rawStatus = raw.status;
  const status: TicketPassStatus =
    rawStatus === 'checked-in' || rawStatus === 'cancelled' ? rawStatus : 'valid';
  return {
    bookingId: String(raw.bookingId || idFallback),
    uid: String(raw.uid || ''),
    holderName: String(raw.holderName || 'CinNova Guest'),
    movieId: String(raw.movieId || ''),
    movieTitle: String(raw.movieTitle || ''),
    city: String(raw.city || ''),
    theatreName: String(raw.theatreName || ''),
    theatreArea: String(raw.theatreArea || ''),
    dateLabel: String(raw.dateLabel || ''),
    showtime: String(raw.showtime || ''),
    format: String(raw.format || ''),
    screen: String(raw.screen || ''),
    seats: Array.isArray(raw.seats) ? raw.seats.map(String) : [],
    totalAmount: Number(raw.totalAmount || 0),
    status,
    bookedAt: String(raw.bookedAt || ''),
    checkedInAt: typeof raw.checkedInAt === 'string' && raw.checkedInAt ? raw.checkedInAt : undefined,
    checkedInBy: typeof raw.checkedInBy === 'string' && raw.checkedInBy ? raw.checkedInBy : undefined,
  };
}

export async function createTicketPass(
  booking: BookingRecord,
  uid: string,
  holderName: string
): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return;
  const safeUid = sanitizeId(uid, 'user');
  const safeBookingId = sanitizeId(booking.bookingId, 'CNV').slice(0, 64);
  const path = `ticketPasses/${safeBookingId}`;

  try {
    await setDoc(doc(db, 'ticketPasses', safeBookingId), {
      bookingId: safeBookingId,
      uid: safeUid,
      holderName: clampStr(holderName, 80, 'CinNova Member'),
      movieId: clampStr(booking.movieId, 64, 'movie'),
      movieTitle: clampStr(booking.movieTitle, 160, 'Feature Film'),
      city: clampStr(booking.city, 60, 'Gwalior'),
      theatreName: clampStr(booking.theatreName, 140, 'CinNova Multiplex'),
      theatreArea: clampStr(booking.theatreArea, 140, 'Central Square'),
      dateLabel: clampStr(booking.dateLabel, 40, 'Today'),
      showtime: clampStr(booking.showtime, 30, '06:00 PM'),
      format: clampStr(booking.format, 40, '2D'),
      screen: clampStr(booking.screen, 40, 'AUDI 1'),
      seats: booking.seats.slice(0, 8).map((s) => clampStr(s, 10, 'A1')),
      totalAmount: Math.max(0, Number(booking.totalAmount) || 0),
      status: 'valid',
      bookedAt: clampStr(booking.bookedAt, 60, new Date().toISOString()),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn(`Unable to publish ticketPass ${path}:`, error);
  }
}

export async function lookupTicketPass(bookingId: string): Promise<TicketPassRecord | null> {
  const safeId = sanitizeId(bookingId, 'CNV').slice(0, 64);
  const path = `ticketPasses/${safeId}`;
  try {
    const snap = await getDoc(doc(db, 'ticketPasses', safeId));
    if (!snap.exists()) return null;
    return normalizeTicketPass(snap.data(), safeId);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function subscribeRecentTicketPasses(
  onPasses: (passes: TicketPassRecord[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const q = query(collection(db, 'ticketPasses'), orderBy('createdAt', 'desc'), limit(40));
  return onSnapshot(
    q,
    (snapshot) => {
      onPasses(snapshot.docs.map((d) => normalizeTicketPass(d.data(), d.id)));
    },
    (error) => {
      onError?.(error);
      console.warn('Unable to list ticketPasses:', error);
    }
  );
}

export async function checkInTicketPass(
  bookingId: string,
  staffEmail: string,
  nextStatus: TicketPassStatus = 'checked-in'
): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) {
    throw new Error('Verified Staff/Admin authentication required.');
  }
  const safeId = sanitizeId(bookingId, 'CNV').slice(0, 64);
  const path = `ticketPasses/${safeId}`;
  try {
    await updateDoc(doc(db, 'ticketPasses', safeId), {
      status: nextStatus,
      checkedInAt: new Date().toISOString().slice(0, 60),
      checkedInBy: clampStr(staffEmail, 160, auth.currentUser.email || 'staff'),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
