export type CategoryTab = 'all' | 'top-rated' | 'now-showing' | 'upcoming';

export type MovieStatus = 'now-showing' | 'upcoming';

export interface Movie {
  id: string;
  moviegluId?: number;
  title: string;
  tagline: string;
  genres: string[];
  trailerUrl?: string;
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
  movieId?: string;
  promoCode?: string;
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

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
}
