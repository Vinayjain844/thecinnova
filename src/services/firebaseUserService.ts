import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { BookingRecord, GenderOption, Movie, UserProfile } from '../types/cinema';

const ID_PATTERN = /^[a-zA-Z0-9_\-]+$/;
const VALID_GENDERS = new Set<GenderOption>([
  '',
  'Female',
  'Male',
  'Non-binary',
  'Prefer not to say',
]);
const pendingProfileUpserts = new Map<string, Promise<void>>();

function clampStr(value: string | undefined, maxLen: number, fallback = ''): string {
  const clean = (value ?? '').trim();
  const effective = clean.length > 0 ? clean : fallback;
  return effective.slice(0, maxLen);
}

function sanitizeId(value: string, fallbackPrefix: string): string {
  const cleaned = value.trim().replace(/[^a-zA-Z0-9_\-]/g, '-').slice(0, 128);
  return ID_PATTERN.test(cleaned) ? cleaned : `${fallbackPrefix}-${Date.now()}`;
}

function normalizeGender(value: unknown): GenderOption {
  if (typeof value === 'string' && VALID_GENDERS.has(value as GenderOption)) {
    return value as GenderOption;
  }
  return '';
}

function normalizeAge(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  const rounded = Math.trunc(value);
  return rounded >= 10 && rounded <= 120 ? rounded : undefined;
}

function normalizeCategories(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const unique: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const clean = item.trim().slice(0, 32);
    if (clean.length > 0 && !unique.includes(clean)) {
      unique.push(clean);
      if (unique.length >= 8) break;
    }
  }
  return unique;
}

export interface CalendarAlertItem {
  movieId: string;
  title: string;
  releaseDate: string;
  genres: string[];
  language: string;
  posterImage?: string;
}

export async function loadUserPrivateProfile(uid: string): Promise<UserProfile | null> {
  const safeUid = sanitizeId(uid, 'user');
  const path = `users/${safeUid}/private/profile`;
  try {
    const snap = await getDoc(doc(db, 'users', safeUid, 'private', 'profile'));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      uid: safeUid,
      name: String(data.name || ''),
      email: String(data.email || ''),
      phone: String(data.phone || ''),
      age: normalizeAge(data.age),
      gender: normalizeGender(data.gender),
      favoriteCategories: normalizeCategories(data.favoriteCategories),
      preferredCity: typeof data.preferredCity === 'string' ? data.preferredCity : undefined,
      preferredLanguage:
        typeof data.preferredLanguage === 'string' ? data.preferredLanguage : undefined,
      preferredFormat:
        typeof data.preferredFormat === 'string' ? data.preferredFormat : undefined,
      provider: data.provider === 'password' ? 'password' : 'google',
      emailVerified: Boolean(auth.currentUser?.emailVerified),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function upsertUserPrivateProfile(
  uid: string,
  profile: {
    name: string;
    email: string;
    phone?: string;
    age?: number;
    gender?: GenderOption;
    favoriteCategories?: string[];
    preferredCity: string;
    preferredLanguage?: string;
    preferredFormat?: string;
    provider: 'google' | 'password';
  }
): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return;
  const safeUid = sanitizeId(uid, 'user');

  const existingInFlight = pendingProfileUpserts.get(safeUid);
  if (existingInFlight) {
    return existingInFlight;
  }

  const path = `users/${safeUid}/private/profile`;
  const ref = doc(db, 'users', safeUid, 'private', 'profile');
  const cleanAge = normalizeAge(profile.age);
  const cleanGender = normalizeGender(profile.gender);
  const cleanCategories = normalizeCategories(profile.favoriteCategories);
  const cleanLanguage = (profile.preferredLanguage ?? '').trim().slice(0, 40);
  const cleanFormat = (profile.preferredFormat ?? '').trim().slice(0, 40);

  const task = (async () => {
    try {
      const existing = await getDoc(ref);
      if (existing.exists()) {
        const existingData = existing.data();
        const updatePayload: Record<string, unknown> = {
          name: clampStr(profile.name, 80, 'CinNova Member'),
          phone: (profile.phone ?? '').trim().slice(0, 24),
          preferredCity: clampStr(profile.preferredCity, 60, 'Gwalior'),
          updatedAt: serverTimestamp(),
        };

        if (profile.age !== undefined || 'age' in existingData) {
          updatePayload.age = cleanAge !== undefined ? cleanAge : deleteField();
        }
        if (profile.gender !== undefined) {
          updatePayload.gender = cleanGender;
        }
        if (profile.favoriteCategories !== undefined) {
          updatePayload.favoriteCategories = cleanCategories;
        }
        if (profile.preferredLanguage !== undefined) {
          updatePayload.preferredLanguage = cleanLanguage;
        }
        if (profile.preferredFormat !== undefined) {
          updatePayload.preferredFormat = cleanFormat;
        }

        await updateDoc(ref, updatePayload);
      } else {
        const createPayload: Record<string, unknown> = {
          uid: safeUid,
          name: clampStr(profile.name, 80, 'CinNova Member'),
          email: clampStr(profile.email, 160, 'user@cinnova.app'),
          phone: (profile.phone ?? '').trim().slice(0, 24),
          preferredCity: clampStr(profile.preferredCity, 60, 'Gwalior'),
          provider: profile.provider,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        if (cleanAge !== undefined) {
          createPayload.age = cleanAge;
        }
        if (cleanGender) {
          createPayload.gender = cleanGender;
        }
        if (cleanCategories.length > 0) {
          createPayload.favoriteCategories = cleanCategories;
        }
        if (cleanLanguage) {
          createPayload.preferredLanguage = cleanLanguage;
        }
        if (cleanFormat) {
          createPayload.preferredFormat = cleanFormat;
        }

        await setDoc(ref, createPayload);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      pendingProfileUpserts.delete(safeUid);
    }
  })();

  pendingProfileUpserts.set(safeUid, task);
  return task;
}

export function subscribeUserBookings(
  uid: string,
  onBookings: (bookings: BookingRecord[]) => void
): () => void {
  const safeUid = sanitizeId(uid, 'user');
  const path = `users/${safeUid}/bookings`;
  const q = query(collection(db, 'users', safeUid, 'bookings'), where('uid', '==', safeUid));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: (BookingRecord & { _sortMs: number })[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        const createdMs =
          d.createdAt && typeof d.createdAt.toMillis === 'function' ? d.createdAt.toMillis() : 0;
        return {
          bookingId: String(d.bookingId || docSnap.id),
          paymentId: String(d.paymentId || ''),
          movieId: String(d.movieId || ''),
          movieTitle: String(d.movieTitle || ''),
          movieLanguage: String(d.movieLanguage || ''),
          movieCertification: String(d.movieCertification || ''),
          posterImage: typeof d.posterImage === 'string' && d.posterImage ? d.posterImage : undefined,
          city: String(d.city || ''),
          theatreName: String(d.theatreName || ''),
          theatreArea: String(d.theatreArea || ''),
          dateLabel: String(d.dateLabel || ''),
          showtime: String(d.showtime || ''),
          format: String(d.format || ''),
          screen: String(d.screen || ''),
          seats: Array.isArray(d.seats) ? d.seats.map(String) : [],
          ticketSubtotal: Number(d.ticketSubtotal || 0),
          convenienceFee: Number(d.convenienceFee || 0),
          gst: Number(d.gst || 0),
          totalAmount: Number(d.totalAmount || 0),
          paymentMethod: String(d.paymentMethod || ''),
          bookedAt: String(d.bookedAt || ''),
          customerEmail: String(d.customerEmail || ''),
          _sortMs: createdMs,
        };
      });
      items.sort((a, b) => b._sortMs - a._sortMs);
      onBookings(items.map(({ _sortMs: _unused, ...rest }) => rest));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveUserBooking(uid: string, booking: BookingRecord): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return;
  const safeUid = sanitizeId(uid, 'user');
  const safeBookingId = sanitizeId(booking.bookingId, 'CNV');
  const path = `users/${safeUid}/bookings/${safeBookingId}`;

  const payload: Record<string, unknown> = {
    uid: safeUid,
    bookingId: safeBookingId.slice(0, 64),
    paymentId: clampStr(booking.paymentId, 64, 'pay_sandbox'),
    movieId: clampStr(booking.movieId, 64, 'movie'),
    movieTitle: clampStr(booking.movieTitle, 160, 'Feature Film'),
    movieLanguage: clampStr(booking.movieLanguage, 60, 'English'),
    movieCertification: clampStr(booking.movieCertification, 20, 'UA 13+'),
    city: clampStr(booking.city, 60, 'Gwalior'),
    theatreName: clampStr(booking.theatreName, 140, 'CinNova Multiplex'),
    theatreArea: clampStr(booking.theatreArea, 140, 'Central Square'),
    dateLabel: clampStr(booking.dateLabel, 40, 'Today'),
    showtime: clampStr(booking.showtime, 30, '06:00 PM'),
    format: clampStr(booking.format, 40, '2D'),
    screen: clampStr(booking.screen, 40, 'AUDI 1'),
    seats: booking.seats.slice(0, 8).map((s) => clampStr(s, 10, 'A1')),
    ticketSubtotal: Math.max(0, Number(booking.ticketSubtotal) || 0),
    convenienceFee: Math.max(0, Number(booking.convenienceFee) || 0),
    gst: Math.max(0, Number(booking.gst) || 0),
    totalAmount: Math.max(0, Number(booking.totalAmount) || 0),
    paymentMethod: clampStr(booking.paymentMethod, 60, 'UPI'),
    bookedAt: clampStr(booking.bookedAt, 60, new Date().toISOString()),
    customerEmail: clampStr(booking.customerEmail, 160, auth.currentUser.email || 'user@cinnova.app'),
    createdAt: serverTimestamp(),
  };

  if (booking.posterImage) {
    payload.posterImage = clampStr(booking.posterImage, 500);
  }

  try {
    await setDoc(doc(db, 'users', safeUid, 'bookings', safeBookingId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteUserBooking(uid: string, bookingId: string): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return;
  const safeUid = sanitizeId(uid, 'user');
  const safeBookingId = sanitizeId(bookingId, 'CNV');
  const path = `users/${safeUid}/bookings/${safeBookingId}`;

  try {
    await deleteDoc(doc(db, 'users', safeUid, 'bookings', safeBookingId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function clearUserBookings(uid: string, bookingIds: string[]): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified || bookingIds.length === 0) return;
  const safeUid = sanitizeId(uid, 'user');
  const path = `users/${safeUid}/bookings`;

  try {
    const batch = writeBatch(db);
    bookingIds.forEach((id) => {
      const safeId = sanitizeId(id, 'CNV');
      batch.delete(doc(db, 'users', safeUid, 'bookings', safeId));
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeUserCalendarAlerts(
  uid: string,
  onAlerts: (alerts: CalendarAlertItem[]) => void
): () => void {
  const safeUid = sanitizeId(uid, 'user');
  const path = `users/${safeUid}/calendarAlerts`;
  const q = query(collection(db, 'users', safeUid, 'calendarAlerts'), where('uid', '==', safeUid));

  return onSnapshot(
    q,
    (snapshot) => {
      const alerts: CalendarAlertItem[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          movieId: String(d.movieId || docSnap.id),
          title: String(d.title || ''),
          releaseDate: String(d.releaseDate || 'Coming Soon'),
          genres: Array.isArray(d.genres) ? d.genres.map(String) : ['Drama'],
          language: String(d.language || 'English'),
          posterImage: typeof d.posterImage === 'string' && d.posterImage ? d.posterImage : undefined,
        };
      });
      onAlerts(alerts);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveUserCalendarAlert(uid: string, movie: Movie): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return;
  const safeUid = sanitizeId(uid, 'user');
  const safeMovieId = sanitizeId(movie.id, 'movie').slice(0, 64);
  const path = `users/${safeUid}/calendarAlerts/${safeMovieId}`;

  const genres = (movie.genres.length > 0 ? movie.genres : ['Drama'])
    .slice(0, 5)
    .map((g) => clampStr(g, 40, 'Drama'));

  const payload: Record<string, unknown> = {
    uid: safeUid,
    movieId: safeMovieId,
    title: clampStr(movie.title, 160, 'Upcoming Release'),
    releaseDate: clampStr(movie.releaseDate, 40, 'Coming Soon'),
    genres,
    language: clampStr(movie.language, 60, 'English'),
    createdAt: serverTimestamp(),
  };

  if (movie.posterImage) {
    payload.posterImage = clampStr(movie.posterImage, 500);
  }

  try {
    await setDoc(doc(db, 'users', safeUid, 'calendarAlerts', safeMovieId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteUserCalendarAlert(uid: string, movieId: string): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return;
  const safeUid = sanitizeId(uid, 'user');
  const safeMovieId = sanitizeId(movieId, 'movie').slice(0, 64);
  const path = `users/${safeUid}/calendarAlerts/${safeMovieId}`;

  try {
    await deleteDoc(doc(db, 'users', safeUid, 'calendarAlerts', safeMovieId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
