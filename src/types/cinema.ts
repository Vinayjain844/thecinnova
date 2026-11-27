export type CategoryTab = 'all' | 'top-rated' | 'now-showing' | 'upcoming';

export type MovieStatus = 'now-showing' | 'upcoming';

export interface Movie {
  id: string;
  tmdbId?: number;
  title: string;
  tagline: string;
  genres: string[];
  language: string;
  formats: string[];
  duration: string;
  certification: string;
  rating: number;
  votes: string;
  status: MovieStatus;
  releaseDate: string;
  director: string;
  cast: string[];
  synopsis: string;
  posterImage?: string;
  backdropImage?: string;
  artworkTheme?: {
    bgFrom: string;
    bgTo: string;
    accent: string;
    motif:
      | 'eclipse'
      | 'piano'
      | 'skyline'
      | 'waves'
      | 'prism'
      | 'clockwork'
      | 'mountain'
      | 'reel'
      | 'compass'
      | 'lotus'
      | 'neon-rain'
      | 'arch'
      | 'flame'
      | 'orbit'
      | 'curtain'
      | 'crown'
      | 'train'
      | 'forest'
      | 'radar'
      | 'vinyl'
      | 'saturn';
    subtitle: string;
  };
}

export interface AdSlide {
  id: string;
  kicker: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  image: string;
  movieId: string;
  movie: Movie;
}

export interface ShowtimeSlot {
  id: string;
  time: string;
  format: string;
  screen: string;
  availability: 'available' | 'filling-fast' | 'almost-full';
  priceMultiplier: number;
}

export interface Theatre {
  id: string;
  name: string;
  area: string;
  amenities: string[];
  showtimes: ShowtimeSlot[];
}

export type SeatTierName = 'Royal Recliner' | 'Prime Executive' | 'Classic';

export interface SeatItem {
  id: string;
  row: string;
  number: number;
  tier: SeatTierName;
  price: number;
  status: 'available' | 'sold' | 'locked';
}

export interface BookingRecord {
  bookingId: string;
  paymentId: string;
  movieId: string;
  movieTitle: string;
  movieLanguage: string;
  movieCertification: string;
  posterImage?: string;
  city: string;
  theatreName: string;
  theatreArea: string;
  dateLabel: string;
  showtime: string;
  format: string;
  screen: string;
  seats: string[];
  ticketSubtotal: number;
  convenienceFee: number;
  gst: number;
  totalAmount: number;
  paymentMethod: string;
  bookedAt: string;
  customerEmail: string;
}

export type UserRole = 'user' | 'admin' | 'staff' | 'system';

export const BOOTSTRAP_ADMIN_EMAILS = [
  '26tc1vi148@mitsgwl.ac.in',
  '26tc1ta137@mitsgwl.ac.in',
] as const;

export function isBootstrapAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return BOOTSTRAP_ADMIN_EMAILS.includes(
    email.trim().toLowerCase() as (typeof BOOTSTRAP_ADMIN_EMAILS)[number]
  );
}

export type GenderOption = '' | 'Female' | 'Male' | 'Non-binary' | 'Prefer not to say';

export interface UserProfile {
  uid?: string;
  name: string;
  email: string;
  phone: string;
  age?: number;
  gender?: GenderOption;
  favoriteCategories?: string[];
  preferredCity?: string;
  preferredLanguage?: string;
  preferredFormat?: string;
  provider?: 'google' | 'password';
  emailVerified?: boolean;
  role?: UserRole;
}

export interface SeatTierPricing {
  royalRecliner: number;
  primeExecutive: number;
  classic: number;
  convenienceFee: number;
  gstPercent: number;
}

export interface PlatformCatalogConfig {
  pricing: SeatTierPricing;
  hiddenMovieIds: string[];
  moviePriceMultipliers: Record<string, number>;
  updatedBy?: string;
}

export const DEFAULT_SEAT_PRICING: SeatTierPricing = {
  royalRecliner: 550,
  primeExecutive: 320,
  classic: 190,
  convenienceFee: 35,
  gstPercent: 18,
};

export const DEFAULT_PLATFORM_CATALOG: PlatformCatalogConfig = {
  pricing: DEFAULT_SEAT_PRICING,
  hiddenMovieIds: [],
  moviePriceMultipliers: {},
};

export interface RoleAssignmentRecord {
  emailKey: string;
  email: string;
  role: UserRole;
  label?: string;
  assignedBy: string;
}

export interface SeatLockEntry {
  uid: string;
  holderName: string;
  expiresAtMs: number;
}

export interface ShowtimeSeatState {
  showKey: string;
  movieId: string;
  city: string;
  theatreId: string;
  dateId: string;
  showtimeId: string;
  soldSeats: string[];
  blockedSeats: string[];
  seatLocks: Record<string, SeatLockEntry>;
  lockDurationSeconds: number;
  systemPaused: boolean;
  updatedBy?: string;
}

export type TicketPassStatus = 'valid' | 'checked-in' | 'cancelled';

export interface TicketPassRecord {
  bookingId: string;
  uid: string;
  holderName: string;
  movieId: string;
  movieTitle: string;
  city: string;
  theatreName: string;
  theatreArea: string;
  dateLabel: string;
  showtime: string;
  format: string;
  screen: string;
  seats: string[];
  totalAmount: number;
  status: TicketPassStatus;
  bookedAt: string;
  checkedInAt?: string;
  checkedInBy?: string;
}

export const AUDITORIUM_ROWS_CONFIG: { row: string; tier: SeatTierName }[] = [
  { row: 'A', tier: 'Royal Recliner' },
  { row: 'B', tier: 'Royal Recliner' },
  { row: 'C', tier: 'Prime Executive' },
  { row: 'D', tier: 'Prime Executive' },
  { row: 'E', tier: 'Prime Executive' },
  { row: 'F', tier: 'Prime Executive' },
  { row: 'G', tier: 'Classic' },
  { row: 'H', tier: 'Classic' },
  { row: 'J', tier: 'Classic' },
];

export const AUDITORIUM_SEATS_PER_ROW = 14;

export const SHOW_DATE_OPTIONS = [
  { id: 'today', day: 'Today', dateNum: '25 Nov', label: 'Wed, 25 Nov' },
  { id: 'tomorrow', day: 'Thu', dateNum: '26 Nov', label: 'Thu, 26 Nov' },
  { id: 'fri', day: 'Fri', dateNum: '27 Nov', label: 'Fri, 27 Nov' },
  { id: 'sat', day: 'Sat', dateNum: '28 Nov', label: 'Sat, 28 Nov' },
] as const;

export function buildShowKey(
  movieId: string,
  city: string,
  theatreId: string,
  dateId: string,
  showtimeId: string
): string {
  const safe = (v: string) => v.trim().replace(/[^a-zA-Z0-9_\-]/g, '-');
  return `${safe(movieId)}__${safe(city)}__${safe(theatreId)}__${safe(dateId)}__${safe(showtimeId)}`.slice(
    0,
    128
  );
}

export function seededSoldSeatsForShow(showKey: string): Set<string> {
  let hash = 0;
  for (let i = 0; i < showKey.length; i++) {
    hash = (hash * 31 + showKey.charCodeAt(i)) >>> 0;
  }
  const sold = new Set<string>();
  AUDITORIUM_ROWS_CONFIG.forEach((rCfg, rIdx) => {
    for (let num = 1; num <= AUDITORIUM_SEATS_PER_ROW; num++) {
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

export function isProfileComplete(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'staff' || user.role === 'system') {
    return true;
  }
  const hasName = Boolean(user.name && user.name.trim().length > 0);
  const phoneDigits = (user.phone || '').replace(/\D/g, '');
  const hasPhone = phoneDigits.length >= 7;
  const hasAge =
    typeof user.age === 'number' &&
    Number.isInteger(user.age) &&
    user.age >= 10 &&
    user.age <= 120;
  const hasGender = Boolean(
    user.gender &&
      (user.gender === 'Female' ||
        user.gender === 'Male' ||
        user.gender === 'Non-binary' ||
        user.gender === 'Prefer not to say')
  );
  return hasName && hasPhone && hasAge && hasGender;
}
