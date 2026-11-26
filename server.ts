import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG_W500 = 'https://image.tmdb.org/t/p/w500';
const TMDB_IMG_ORIG = 'https://image.tmdb.org/t/p/original';

interface TmdbMovieRaw {
  id: number;
  title?: string;
  original_title?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  vote_count?: number;
  release_date?: string;
  genre_ids?: number[];
  original_language?: string;
  adult?: boolean;
  runtime?: number;
  tagline?: string;
  genres?: { id: number; name: string }[];
  credits?: {
    cast?: { name: string }[];
    crew?: { name: string; job: string }[];
  };
}

let cachedGenres: { map: Record<number, string>; fetchedAt: number } | null = null;

function getTmdbCredentials() {
  const token = process.env.TMDB_READ_ACCESS_TOKEN?.trim() || '';
  const apiKey = process.env.TMDB_API_KEY?.trim() || '';
  return { token, apiKey, configured: Boolean(token || apiKey) };
}

async function fetchFromTmdb<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const { token, apiKey } = getTmdbCredentials();
  if (!token && !apiKey) {
    throw new Error('TMDB credentials are not configured on the server.');
  }

  const url = new URL(`${TMDB_BASE}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (apiKey) {
    url.searchParams.set('api_key', apiKey);
  }

  const resp = await fetch(url.toString(), { headers });
  if (!resp.ok) {
    throw new Error(`TMDB responded with status ${resp.status}`);
  }
  return (await resp.json()) as T;
}

async function getGenreMap(): Promise<Record<number, string>> {
  const now = Date.now();
  if (cachedGenres && now - cachedGenres.fetchedAt < 3600_000) {
    return cachedGenres.map;
  }

  const data = await fetchFromTmdb<{ genres: { id: number; name: string }[] }>(
    '/genre/movie/list',
    { language: 'en-US' }
  );
  const map: Record<number, string> = {};
  for (const g of data.genres || []) {
    map[g.id] = g.name;
  }
  cachedGenres = { map, fetchedAt: now };
  return map;
}

const LANG_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
  ml: 'Malayalam',
  kn: 'Kannada',
  ja: 'Japanese',
  ko: 'Korean',
  fr: 'French',
  es: 'Spanish',
};

function formatVoteCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return String(count);
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

function normalizeTmdbMovie(
  raw: TmdbMovieRaw,
  genreMap: Record<number, string>,
  forcedStatus?: 'now-showing' | 'upcoming'
) {
  const genreNames =
    raw.genres?.map((g) => g.name) ||
    (raw.genre_ids || []).map((id) => genreMap[id]).filter(Boolean);

  const releaseDateMs = raw.release_date ? new Date(raw.release_date).getTime() : 0;
  const inferredStatus: 'now-showing' | 'upcoming' =
    forcedStatus || (releaseDateMs > Date.now() ? 'upcoming' : 'now-showing');

  const director =
    raw.credits?.crew?.find((c) => c.job === 'Director')?.name || 'Theatrical Feature';
  const cast = raw.credits?.cast?.slice(0, 3).map((c) => c.name) || ['Ensemble Cast'];
  const runtimeMins = raw.runtime || 128;
  const hours = Math.floor(runtimeMins / 60);
  const mins = runtimeMins % 60;

  return {
    id: `tmdb-${raw.id}`,
    tmdbId: raw.id,
    title: raw.title || raw.original_title || 'Untitled Feature',
    tagline: raw.tagline || 'In cinemas & laser multiplexes.',
    genres: genreNames.length > 0 ? genreNames.slice(0, 2) : ['Drama'],
    language:
      LANG_NAMES[raw.original_language || 'en'] ||
      (raw.original_language || 'English').toUpperCase(),
    formats: ['2D', 'Dolby Atmos', 'IMAX 2D'],
    duration: `${hours}h ${String(mins).padStart(2, '0')}m`,
    certification: raw.adult ? 'A' : 'UA 13+',
    rating: raw.vote_average ? Number(raw.vote_average.toFixed(1)) : 8.1,
    votes: formatVoteCount(raw.vote_count || 1240),
    status: inferredStatus,
    releaseDate: formatReleaseDate(raw.release_date),
    director,
    cast,
    synopsis: raw.overview || 'Experience this feature presentation on the big screen.',
    posterImage: raw.poster_path ? `${TMDB_IMG_W500}${raw.poster_path}` : undefined,
    backdropImage: raw.backdrop_path ? `${TMDB_IMG_ORIG}${raw.backdrop_path}` : undefined,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req: Request, res: Response) => {
    const { configured } = getTmdbCredentials();
    res.json({ ok: true, provider: 'tmdb', tmdbConfigured: configured });
  });

  app.get('/api/tmdb/movies', async (req: Request, res: Response) => {
    const { configured } = getTmdbCredentials();
    if (!configured) {
      return res.json({ source: 'local', tmdbConfigured: false, movies: [] });
    }

    const category = String(req.query.category || 'all');
    try {
      const genreMap = await getGenreMap();

      if (category === 'top-rated') {
        const [p1, p2] = await Promise.all([
          fetchFromTmdb<{ results: TmdbMovieRaw[] }>('/movie/top_rated', { page: '1', region: 'IN' }),
          fetchFromTmdb<{ results: TmdbMovieRaw[] }>('/movie/top_rated', { page: '2', region: 'IN' }),
        ]);
        const seen = new Set<number>();
        const movies = [...(p1.results || []), ...(p2.results || [])]
          .filter((m) => {
            if (!m.poster_path || seen.has(m.id)) return false;
            seen.add(m.id);
            return true;
          })
          .slice(0, 30)
          .map((m) => normalizeTmdbMovie(m, genreMap, 'now-showing'));
        return res.json({ source: 'tmdb', tmdbConfigured: true, movies });
      }

      if (category === 'upcoming') {
        const [in1, in2, global1] = await Promise.all([
          fetchFromTmdb<{ results: TmdbMovieRaw[] }>('/movie/upcoming', { page: '1', region: 'IN' }),
          fetchFromTmdb<{ results: TmdbMovieRaw[] }>('/movie/upcoming', { page: '2', region: 'IN' }),
          fetchFromTmdb<{ results: TmdbMovieRaw[] }>('/movie/upcoming', { page: '1', language: 'en-US' }),
        ]);

        const seen = new Set<number>();
        const todayCutoffMs = Date.now() - 86400_000;
        const upcomingPool = [...(in1.results || []), ...(in2.results || []), ...(global1.results || [])]
          .filter((m) => {
            if (!m.poster_path || seen.has(m.id)) return false;
            const relMs = m.release_date ? new Date(m.release_date).getTime() : 0;
            if (relMs && relMs < todayCutoffMs) return false;
            seen.add(m.id);
            return true;
          })
          .slice(0, 24);

        // Enrich the top featured upcoming movies (with backdrop + overview) with full TMDB details & credits
        const featuredIds = upcomingPool
          .filter((m) => Boolean(m.backdrop_path && m.overview && m.overview.trim().length > 20))
          .slice(0, 6)
          .map((m) => m.id);

        const detailResults = await Promise.allSettled(
          featuredIds.map((id) =>
            fetchFromTmdb<TmdbMovieRaw>(`/movie/${id}`, { append_to_response: 'credits' })
          )
        );
        const enrichedMap = new Map<number, TmdbMovieRaw>();
        detailResults.forEach((result) => {
          if (result.status === 'fulfilled' && result.value?.id) {
            enrichedMap.set(result.value.id, result.value);
          }
        });

        const movies = upcomingPool
          .slice(0, 20)
          .map((m) => normalizeTmdbMovie(enrichedMap.get(m.id) || m, genreMap, 'upcoming'));
        return res.json({ source: 'tmdb', tmdbConfigured: true, movies });
      }

      if (category === 'now-showing' || category === 'all') {
        const [in1, in2, global1, global2] = await Promise.all([
          fetchFromTmdb<{ results: TmdbMovieRaw[] }>('/movie/now_playing', { page: '1', region: 'IN' }),
          fetchFromTmdb<{ results: TmdbMovieRaw[] }>('/movie/now_playing', { page: '2', region: 'IN' }),
          fetchFromTmdb<{ results: TmdbMovieRaw[] }>('/movie/now_playing', { page: '1', language: 'en-US' }),
          fetchFromTmdb<{ results: TmdbMovieRaw[] }>('/movie/now_playing', { page: '2', language: 'en-US' }),
        ]);

        const seen = new Set<number>();
        const pool: TmdbMovieRaw[] = [];
        const cutoffMs = Date.now() + 2 * 86400_000;
        const minRecentMs = Date.now() - 180 * 86400_000;

        for (const m of [...(in1.results || []), ...(in2.results || []), ...(global1.results || []), ...(global2.results || [])]) {
          if (!m.poster_path || seen.has(m.id)) continue;
          const relMs = m.release_date ? new Date(m.release_date).getTime() : 0;
          if (!relMs || relMs > cutoffMs || relMs < minRecentMs) continue;
          seen.add(m.id);
          pool.push(m);
        }

        // Sort newest theatrical releases first
        pool.sort((a, b) => {
          const da = a.release_date ? new Date(a.release_date).getTime() : 0;
          const db = b.release_date ? new Date(b.release_date).getTime() : 0;
          if (db !== da) return db - da;
          return (b.vote_count || 0) - (a.vote_count || 0);
        });

        const movies = pool
          .slice(0, 30)
          .map((m) => normalizeTmdbMovie(m, genreMap, 'now-showing'));
        return res.json({ source: 'tmdb', tmdbConfigured: true, movies });
      }

      return res.json({ source: 'local', tmdbConfigured: true, movies: [] });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to reach TMDB';
      return res.status(502).json({ source: 'local', tmdbConfigured: true, error: message, movies: [] });
    }
  });

  app.get('/api/tmdb/search', async (req: Request, res: Response) => {
    const { configured } = getTmdbCredentials();
    const q = String(req.query.q || '').trim().slice(0, 100);
    if (!configured || !q) {
      return res.json({ source: 'local', movies: [] });
    }

    try {
      const genreMap = await getGenreMap();
      const data = await fetchFromTmdb<{ results: TmdbMovieRaw[] }>('/search/movie', {
        query: q,
        include_adult: 'false',
        page: '1',
      });
      const movies = (data.results || [])
        .filter((m) => m.poster_path)
        .slice(0, 20)
        .map((m) => normalizeTmdbMovie(m, genreMap));
      return res.json({ source: 'tmdb', movies });
    } catch {
      return res.status(502).json({ source: 'local', movies: [] });
    }
  });

  app.get('/api/tmdb/movie/:id', async (req: Request, res: Response) => {
    const { configured } = getTmdbCredentials();
    const rawId = String(req.params.id || '');
    if (!configured || !/^\d+$/.test(rawId)) {
      return res.status(400).json({ error: 'Invalid or unconfigured TMDB movie lookup' });
    }

    try {
      const genreMap = await getGenreMap();
      const raw = await fetchFromTmdb<TmdbMovieRaw>(`/movie/${rawId}`, {
        append_to_response: 'credits',
      });
      return res.json({ movie: normalizeTmdbMovie(raw, genreMap) });
    } catch {
      return res.status(502).json({ error: 'Failed to load TMDB movie details' });
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
