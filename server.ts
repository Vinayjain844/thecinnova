import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const MOVIEGLU_BASE = 'https://api-gate2.movieglu.com';

const CITY_COORDS: Record<string, string> = {
  Gwalior: '26.2183;78.1828',
  Mumbai: '19.0760;72.8777',
  'Delhi-NCR': '28.6139;77.2090',
  Bengaluru: '12.9716;77.5946',
  Hyderabad: '17.3850;78.4867',
  Pune: '18.5204;73.8567',
  Chennai: '13.0827;80.2707',
  Kolkata: '22.5726;88.3639',
};

interface MovieGluImageEntry {
  film_image?: string;
}

interface MovieGluFilmRaw {
  film_id: number;
  imdb_title_id?: string;
  film_name?: string;
  synopsis_long?: string;
  duration_mins?: number;
  release_dates?: { release_date?: string; notes?: string }[];
  age_rating?: { rating?: string; age_advisory?: string }[];
  genres?: { genre_id?: number; genre_name?: string }[];
  cast?: { cast_name?: string }[];
  directors?: { director_name?: string }[];
  film_trailer?: string;
  images?: {
    poster?: Record<string, { medium?: string | MovieGluImageEntry; large?: string | MovieGluImageEntry }>;
    still?: Record<string, { medium?: string | MovieGluImageEntry; large?: string | MovieGluImageEntry }>;
    [key: string]: unknown;
  };
}

interface MovieGluCinemaRaw {
  cinema_id: number;
  cinema_name: string;
  address?: string;
  address2?: string;
  city?: string;
  distance?: number;
  showings?: Record<
    string,
    {
      film_id?: number;
      times?: { start_time?: string; end_time?: string }[];
    }
  >;
}

function getMovieGluCredentials() {
  const client = process.env.MOVIEGLU_CLIENT?.trim() || '';
  const apiKey = process.env.MOVIEGLU_API_KEY?.trim() || '';
  const rawAuth = process.env.MOVIEGLU_AUTHORIZATION?.trim() || '';
  const territory = process.env.MOVIEGLU_TERRITORY?.trim() || 'IN';
  const apiVersion = process.env.MOVIEGLU_API_VERSION?.trim() || 'v200';

  const authorization = rawAuth
    ? rawAuth.toLowerCase().startsWith('basic ')
      ? rawAuth
      : `Basic ${rawAuth}`
    : '';

  const configured = Boolean(client && apiKey && authorization);
  return { client, apiKey, authorization, territory, apiVersion, configured };
}

function getGeolocationForCity(city?: string): string {
  if (!city) return CITY_COORDS.Gwalior;
  return CITY_COORDS[city] || CITY_COORDS.Gwalior;
}

async function fetchFromMovieGlu<T>(
  endpoint: string,
  params: Record<string, string> = {},
  city?: string
): Promise<T | null> {
  const creds = getMovieGluCredentials();
  if (!creds.configured) {
    throw new Error('MovieGlu credentials are not configured on the server.');
  }

  const url = new URL(`${MOVIEGLU_BASE}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const resp = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      client: creds.client,
      'x-api-key': creds.apiKey,
      authorization: creds.authorization,
      territory: creds.territory,
      'api-version': creds.apiVersion,
      'device-datetime': new Date().toISOString(),
      geolocation: getGeolocationForCity(city),
    },
  });

  if (resp.status === 204) {
    return null;
  }

  if (!resp.ok) {
    throw new Error(`MovieGlu responded with status ${resp.status}`);
  }

  return (await resp.json()) as T;
}

function extractImageUrl(
  images: MovieGluFilmRaw['images'],
  kind: 'poster' | 'still'
): string | undefined {
  if (!images) return undefined;

  const unwrap = (entry?: string | MovieGluImageEntry): string | undefined => {
    if (!entry) return undefined;
    if (typeof entry === 'string') return entry;
    return entry.film_image;
  };

  // Standard v200 shape: images.poster["1"].medium.film_image or string
  const directGroup = images[kind];
  if (directGroup && typeof directGroup === 'object') {
    const firstKey = Object.keys(directGroup)[0];
    if (firstKey) {
      const slot = directGroup[firstKey];
      const candidate = unwrap(slot?.large) || unwrap(slot?.medium);
      if (candidate) return candidate;
    }
  }

  // Alternate numbered map shape: images["1"].poster["1"].medium
  const numericWrapper = images['1'] as
    | Record<string, Record<string, { medium?: string | MovieGluImageEntry; large?: string | MovieGluImageEntry }>>
    | undefined;
  if (numericWrapper && numericWrapper[kind]) {
    const firstSubKey = Object.keys(numericWrapper[kind])[0];
    if (firstSubKey) {
      const slot = numericWrapper[kind][firstSubKey];
      const candidate = unwrap(slot?.large) || unwrap(slot?.medium);
      if (candidate) return candidate;
    }
  }

  return undefined;
}

function formatReleaseDate(dateStr?: string): string {
  if (!dateStr) return 'Coming Soon';
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDuration(mins?: number): string {
  const total = mins && mins > 0 ? mins : 132;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function normalizeMovieGluFilm(
  raw: MovieGluFilmRaw,
  forcedStatus?: 'now-showing' | 'upcoming'
) {
  const releaseRaw = raw.release_dates?.[0]?.release_date;
  const releaseMs = releaseRaw ? new Date(releaseRaw).getTime() : 0;
  const inferredStatus: 'now-showing' | 'upcoming' =
    forcedStatus || (releaseMs > Date.now() ? 'upcoming' : 'now-showing');

  const genreNames =
    raw.genres?.map((g) => g.genre_name).filter((g): g is string => Boolean(g)) || [];
  const castNames =
    raw.cast?.map((c) => c.cast_name).filter((c): c is string => Boolean(c)).slice(0, 3) || [];
  const directorName =
    raw.directors?.find((d) => Boolean(d.director_name))?.director_name || 'Theatrical Feature';
  const cert = raw.age_rating?.[0]?.rating || 'UA 13+';

  // Deterministic friendly score when MovieGlu feed omits user ratings
  const syntheticScore = Number((7.8 + ((raw.film_id % 17) * 0.1)).toFixed(1));
  const syntheticVotes = `${(24 + (raw.film_id % 140)).toFixed(1)}K`;

  return {
    id: `mg-${raw.film_id}`,
    moviegluId: raw.film_id,
    title: raw.film_name || 'Untitled Feature',
    tagline: raw.age_rating?.[0]?.age_advisory || 'Experience it in theatres near you.',
    genres: genreNames.length > 0 ? genreNames.slice(0, 2) : ['Drama', 'Feature'],
    language: 'English / Hindi',
    formats: ['2D', 'Dolby Atmos', 'IMAX 2D'],
    duration: formatDuration(raw.duration_mins),
    certification: cert,
    rating: Math.min(9.5, syntheticScore),
    votes: syntheticVotes,
    status: inferredStatus,
    releaseDate: formatReleaseDate(releaseRaw),
    director: directorName,
    cast: castNames.length > 0 ? castNames : ['Ensemble Cast'],
    synopsis:
      raw.synopsis_long || 'Book tickets now for upcoming multiplex showtimes.',
    posterImage: extractImageUrl(raw.images, 'poster'),
    backdropImage: extractImageUrl(raw.images, 'still'),
    trailerUrl: raw.film_trailer,
  };
}

function formatShowtimeLabel(time24?: string): string {
  if (!time24) return '07:30 PM';
  const [hhStr, mmStr] = time24.split(':');
  const hh = Number(hhStr);
  const mm = Number(mmStr || 0);
  if (Number.isNaN(hh)) return time24;
  const suffix = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${String(h12).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${suffix}`;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req: Request, res: Response) => {
    const { configured } = getMovieGluCredentials();
    res.json({ ok: true, provider: 'movieglu', moviegluConfigured: configured });
  });

  app.get('/api/movieglu/movies', async (req: Request, res: Response) => {
    const { configured } = getMovieGluCredentials();
    if (!configured) {
      return res.json({ source: 'local', moviegluConfigured: false, movies: [] });
    }

    const category = String(req.query.category || 'all');
    const city = String(req.query.city || 'Gwalior');

    try {
      if (category === 'upcoming') {
        const data = await fetchFromMovieGlu<{ films?: MovieGluFilmRaw[] }>(
          '/filmsComingSoon/',
          { n: '20' },
          city
        );
        const movies = (data?.films || [])
          .filter((f) => extractImageUrl(f.images, 'poster'))
          .map((f) => normalizeMovieGluFilm(f, 'upcoming'));
        return res.json({ source: 'movieglu', moviegluConfigured: true, movies });
      }

      if (category === 'now-showing' || category === 'top-rated') {
        const data = await fetchFromMovieGlu<{ films?: MovieGluFilmRaw[] }>(
          '/filmsNowShowing/',
          { n: '25' },
          city
        );
        let movies = (data?.films || [])
          .filter((f) => extractImageUrl(f.images, 'poster'))
          .map((f) => normalizeMovieGluFilm(f, 'now-showing'));
        if (category === 'top-rated') {
          movies = [...movies].sort((a, b) => b.rating - a.rating);
        }
        return res.json({ source: 'movieglu', moviegluConfigured: true, movies });
      }

      // Default 'all': combine filmsNowShowing + filmsComingSoon up to 30 films
      const [nowData, soonData] = await Promise.all([
        fetchFromMovieGlu<{ films?: MovieGluFilmRaw[] }>('/filmsNowShowing/', { n: '22' }, city),
        fetchFromMovieGlu<{ films?: MovieGluFilmRaw[] }>('/filmsComingSoon/', { n: '12' }, city),
      ]);

      const seen = new Set<number>();
      const combined: ReturnType<typeof normalizeMovieGluFilm>[] = [];

      for (const f of nowData?.films || []) {
        if (!seen.has(f.film_id) && extractImageUrl(f.images, 'poster')) {
          seen.add(f.film_id);
          combined.push(normalizeMovieGluFilm(f, 'now-showing'));
        }
      }
      for (const f of soonData?.films || []) {
        if (!seen.has(f.film_id) && extractImageUrl(f.images, 'poster') && combined.length < 30) {
          seen.add(f.film_id);
          combined.push(normalizeMovieGluFilm(f, 'upcoming'));
        }
      }

      return res.json({
        source: 'movieglu',
        moviegluConfigured: true,
        movies: combined.slice(0, 30),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to reach MovieGlu';
      return res.status(502).json({
        source: 'local',
        moviegluConfigured: true,
        error: message,
        movies: [],
      });
    }
  });

  app.get('/api/movieglu/search', async (req: Request, res: Response) => {
    const { configured } = getMovieGluCredentials();
    const q = String(req.query.q || '').trim().slice(0, 100);
    const city = String(req.query.city || 'Gwalior');

    if (!configured || !q) {
      return res.json({ source: 'local', movies: [] });
    }

    try {
      const data = await fetchFromMovieGlu<{ films?: MovieGluFilmRaw[] }>(
        '/filmLiveSearch/',
        { query: q, n: '20' },
        city
      );
      const movies = (data?.films || [])
        .filter((f) => extractImageUrl(f.images, 'poster'))
        .map((f) => normalizeMovieGluFilm(f));
      return res.json({ source: 'movieglu', movies });
    } catch {
      return res.status(502).json({ source: 'local', movies: [] });
    }
  });

  app.get('/api/movieglu/movie/:id', async (req: Request, res: Response) => {
    const { configured } = getMovieGluCredentials();
    const rawId = String(req.params.id || '');
    const city = String(req.query.city || 'Gwalior');

    if (!configured || !/^\d+$/.test(rawId)) {
      return res.status(400).json({ error: 'Invalid or unconfigured MovieGlu film lookup' });
    }

    try {
      const detail = await fetchFromMovieGlu<MovieGluFilmRaw>(
        '/filmDetails/',
        { film_id: rawId },
        city
      );
      if (!detail) {
        return res.status(404).json({ error: 'Film not found' });
      }
      return res.json({ movie: normalizeMovieGluFilm(detail) });
    } catch {
      return res.status(502).json({ error: 'Failed to load MovieGlu film details' });
    }
  });

  app.get('/api/movieglu/showtimes/:id', async (req: Request, res: Response) => {
    const { configured } = getMovieGluCredentials();
    const rawId = String(req.params.id || '');
    const city = String(req.query.city || 'Gwalior');
    const dateParam = String(req.query.date || new Date().toISOString().slice(0, 10));

    if (!configured || !/^\d+$/.test(rawId) || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return res.json({ source: 'local', theatres: [] });
    }

    try {
      const data = await fetchFromMovieGlu<{ cinemas?: MovieGluCinemaRaw[] }>(
        '/filmShowTimes/',
        { film_id: rawId, date: dateParam, n: '6' },
        city
      );

      const cinemas = data?.cinemas || [];
      if (cinemas.length === 0) {
        return res.json({ source: 'local', theatres: [] });
      }

      const theatres = cinemas.map((c) => {
        const showingsObj = c.showings || {};
        const slots: {
          id: string;
          time: string;
          format: string;
          screen: string;
          availability: 'available' | 'filling-fast' | 'almost-full';
          priceMultiplier: number;
        }[] = [];

        Object.entries(showingsObj).forEach(([formatName, group]) => {
          (group.times || []).forEach((t, idx) => {
            slots.push({
              id: `mg-${c.cinema_id}-${formatName}-${idx}`,
              time: formatShowtimeLabel(t.start_time),
              format: formatName || 'Standard 2D',
              screen: `SCREEN ${((idx % 4) + 1)}`,
              availability: idx % 3 === 1 ? 'filling-fast' : 'available',
              priceMultiplier: formatName.toLowerCase().includes('imax') ? 1.2 : 1,
            });
          });
        });

        return {
          id: `mg-cinema-${c.cinema_id}`,
          name: c.cinema_name,
          area: [c.address, c.city || city].filter(Boolean).join(', '),
          amenities: ['M-Ticket', 'Dolby Sound', 'Online Booking'],
          showtimes: slots.slice(0, 8),
        };
      }).filter((t) => t.showtimes.length > 0);

      return res.json({
        source: theatres.length > 0 ? 'movieglu' : 'local',
        theatres,
      });
    } catch {
      return res.json({ source: 'local', theatres: [] });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CinNova server listening on http://localhost:${PORT}`);
  });
}

startServer();
