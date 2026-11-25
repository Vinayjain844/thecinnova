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

let cachedGenres: { map: Record<number, string>; fetchedAt: number } | null = null;

function getTmdbCredentials() {
  const token = process.env.TMDB_READ_ACCESS_TOKEN?.trim() || '';
  const apiKey = process.env.TMDB_API_KEY?.trim() || '';
  return { token, apiKey, configured: Boolean(token || apiKey) };
}

async function fetchFromTmdb<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const { token, apiKey } = getTmdbCredentials();
  if (!token && !apiKey) {
    throw new Error('TMDB credentials are not configured.');
  }

  const url = new URL(`${TMDB_BASE}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (apiKey) {
    url.searchParams.set('api_key', apiKey);
  }

  const resp = await fetch(url.toString(), { headers });
  if (!resp.ok) {
    throw new Error(`TMDB returned status ${resp.status}`);
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

function formatVoteCount(count: number): string {
  return count >= 1000 ? `${(count / 1000).toFixed(1)}K` : String(count);
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

  return {
    id: `tmdb-${raw.id}`,
    tmdbId: raw.id,
    title: raw.title || raw.original_title || 'Untitled Feature',
    tagline: raw.tagline || 'In cinemas & laser multiplexes.',
    genres: genreNames.length > 0 ? genreNames.slice(0, 2) : ['Drama'],
    language: LANG_NAMES[raw.original_language || 'en'] || (raw.original_language || 'English').toUpperCase(),
    formats: ['2D', 'Dolby Atmos', 'IMAX 2D'],
    duration: `${Math.floor(runtimeMins / 60)}h ${String(runtimeMins % 60).padStart(2, '0')}m`,
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

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async function handler(req: Request): Promise<Response> {
  const { configured } = getTmdbCredentials();
  const url = new URL(req.url);
  const pathname = url.pathname.replace(/^\/\.netlify\/functions\/tmdb/, '').replace(/^\/api\/tmdb/, '');

  if (pathname === '/movies' || pathname === '') {
    if (!configured) {
      return jsonResponse({ source: 'local', tmdbConfigured: false, movies: [] });
    }
    const category = url.searchParams.get('category') || 'all';
    try {
      const genreMap = await getGenreMap();
      if (category === 'top-rated') {
        const [p1, p2] = await Promise.all([
          fetchFromTmdb<{ results: TmdbMovieRaw[] }>('/movie/top_rated', { page: '1', region: 'IN' }),
          fetchFromTmdb<{ results: TmdbMovieRaw[] }>('/movie/top_rated', { page: '2', region: 'IN' }),
        ]);
        const movies = [...p1.results, ...p2.results]
          .filter((m) => m.poster_path)
          .slice(0, 30)
          .map((m) => normalizeTmdbMovie(m, genreMap, 'now-showing'));
        return jsonResponse({ source: 'tmdb', tmdbConfigured: true, movies });
      }
      if (category === 'upcoming') {
        const [p1, p2] = await Promise.all([
          fetchFromTmdb<{ results: TmdbMovieRaw[] }>('/movie/upcoming', { page: '1', region: 'IN' }),
          fetchFromTmdb<{ results: TmdbMovieRaw[] }>('/movie/upcoming', { page: '2', region: 'IN' }),
        ]);
        const seen = new Set<number>();
        const movies = [...p1.results, ...p2.results]
          .filter((m) => {
            if (!m.poster_path || seen.has(m.id)) return false;
            seen.add(m.id);
            return true;
          })
          .slice(0, 20)
          .map((m) => normalizeTmdbMovie(m, genreMap, 'upcoming'));
        return jsonResponse({ source: 'tmdb', tmdbConfigured: true, movies });
      }
      if (category === 'now-showing') {
        const [p1, p2] = await Promise.all([
          fetchFromTmdb<{ results: TmdbMovieRaw[] }>('/movie/now_playing', { page: '1', region: 'IN' }),
          fetchFromTmdb<{ results: TmdbMovieRaw[] }>('/movie/now_playing', { page: '2', region: 'IN' }),
        ]);
        const seen = new Set<number>();
        const movies = [...p1.results, ...p2.results]
          .filter((m) => {
            if (!m.poster_path || seen.has(m.id)) return false;
            seen.add(m.id);
            return true;
          })
          .slice(0, 25)
          .map((m) => normalizeTmdbMovie(m, genreMap, 'now-showing'));
        return jsonResponse({ source: 'tmdb', tmdbConfigured: true, movies });
      }

      const [now1, pop1, up1] = await Promise.all([
        fetchFromTmdb<{ results: TmdbMovieRaw[] }>('/movie/now_playing', { page: '1', region: 'IN' }),
        fetchFromTmdb<{ results: TmdbMovieRaw[] }>('/movie/popular', { page: '1', region: 'IN' }),
        fetchFromTmdb<{ results: TmdbMovieRaw[] }>('/movie/upcoming', { page: '1', region: 'IN' }),
      ]);
      const seen = new Set<number>();
      const combined: ReturnType<typeof normalizeTmdbMovie>[] = [];
      for (const m of now1.results || []) {
        if (m.poster_path && !seen.has(m.id)) {
          seen.add(m.id);
          combined.push(normalizeTmdbMovie(m, genreMap, 'now-showing'));
        }
      }
      for (const m of pop1.results || []) {
        if (m.poster_path && !seen.has(m.id) && combined.length < 24) {
          seen.add(m.id);
          combined.push(normalizeTmdbMovie(m, genreMap, 'now-showing'));
        }
      }
      for (const m of up1.results || []) {
        if (m.poster_path && !seen.has(m.id) && combined.length < 30) {
          seen.add(m.id);
          combined.push(normalizeTmdbMovie(m, genreMap, 'upcoming'));
        }
      }
      return jsonResponse({ source: 'tmdb', tmdbConfigured: true, movies: combined.slice(0, 30) });
    } catch {
      return jsonResponse({ source: 'local', tmdbConfigured: true, movies: [] }, 502);
    }
  }

  if (pathname === '/search') {
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    if (!configured || !q) {
      return jsonResponse({ source: 'local', movies: [] });
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
      return jsonResponse({ source: 'tmdb', movies });
    } catch {
      return jsonResponse({ source: 'local', movies: [] }, 502);
    }
  }

  const movieMatch = pathname.match(/^\/movie\/(\d+)$/);
  if (movieMatch) {
    if (!configured) {
      return jsonResponse({ error: 'TMDB not configured' }, 400);
    }
    try {
      const genreMap = await getGenreMap();
      const raw = await fetchFromTmdb<TmdbMovieRaw>(`/movie/${movieMatch[1]}`, {
        append_to_response: 'credits',
      });
      return jsonResponse({ movie: normalizeTmdbMovie(raw, genreMap) });
    } catch {
      return jsonResponse({ error: 'Failed to load TMDB movie details' }, 502);
    }
  }

  return jsonResponse({ error: 'Not found' }, 404);
}
