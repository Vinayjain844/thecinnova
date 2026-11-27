import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Eye,
  EyeOff,
  Film,
  IndianRupee,
  Plus,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import {
  BOOTSTRAP_ADMIN_EMAILS,
  DEFAULT_SEAT_PRICING,
  Movie,
  PlatformCatalogConfig,
  RoleAssignmentRecord,
  UserProfile,
  UserRole,
} from '../types/cinema';
import {
  assignUserRole,
  removeUserRole,
  savePlatformCatalogConfig,
  subscribeAllRoleAssignments,
} from '../services/rbacService';

interface AdminConsoleProps {
  user: UserProfile;
  movies: Movie[];
  catalogConfig: PlatformCatalogConfig;
  onOptimisticConfigChange: (config: PlatformCatalogConfig) => void;
  onBackToUserPlatform: () => void;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  user,
  movies,
  catalogConfig,
  onOptimisticConfigChange,
  onBackToUserPlatform,
}) => {
  const [draftConfig, setDraftConfig] = useState<PlatformCatalogConfig>(catalogConfig);
  const [movieSearch, setMovieSearch] = useState('');
  const [savingCatalog, setSavingCatalog] = useState(false);
  const [catalogMsg, setCatalogMsg] = useState<string | null>(null);
  const [catalogErr, setCatalogErr] = useState<string | null>(null);

  const [roleAssignments, setRoleAssignments] = useState<RoleAssignmentRecord[]>([]);
  const [roleListErr, setRoleListErr] = useState<string | null>(null);
  const [newRoleEmail, setNewRoleEmail] = useState('');
  const [newRoleType, setNewRoleType] = useState<UserRole>('staff');
  const [newRoleLabel, setNewRoleLabel] = useState('');
  const [savingRole, setSavingRole] = useState(false);
  const [roleMsg, setRoleMsg] = useState<string | null>(null);
  const [roleErr, setRoleErr] = useState<string | null>(null);

  useEffect(() => {
    setDraftConfig(catalogConfig);
  }, [catalogConfig]);

  useEffect(() => {
    const unsub = subscribeAllRoleAssignments(
      (list) => {
        setRoleAssignments(list);
        setRoleListErr(null);
      },
      () => {
        setRoleListErr(
          'Unable to list /roleAssignments from Firestore. Ensure updated firestore.rules are published in cinnova-001.'
        );
      }
    );
    return () => unsub();
  }, []);

  const filteredMovies = useMemo(() => {
    const q = movieSearch.trim().toLowerCase();
    if (!q) return movies;
    return movies.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.language.toLowerCase().includes(q) ||
        m.genres.some((g) => g.toLowerCase().includes(q))
    );
  }, [movies, movieSearch]);

  const hiddenSet = useMemo(
    () => new Set(draftConfig.hiddenMovieIds),
    [draftConfig.hiddenMovieIds]
  );

  const visibleCount = movies.filter((m) => !hiddenSet.has(m.id)).length;

  const handlePricingChange = (
    field: keyof PlatformCatalogConfig['pricing'],
    rawValue: string
  ) => {
    const num = Number(rawValue);
    setDraftConfig((prev) => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        [field]: Number.isFinite(num) ? num : 0,
      },
    }));
  };

  const handleToggleMovieVisibility = (movieId: string) => {
    setDraftConfig((prev) => {
      const exists = prev.hiddenMovieIds.includes(movieId);
      const nextHidden = exists
        ? prev.hiddenMovieIds.filter((id) => id !== movieId)
        : [...prev.hiddenMovieIds, movieId];
      return {
        ...prev,
        hiddenMovieIds: nextHidden,
      };
    });
  };

  const handleMultiplierChange = (movieId: string, rawValue: string) => {
    const num = Number(rawValue);
    setDraftConfig((prev) => {
      const nextMap = { ...prev.moviePriceMultipliers };
      if (!rawValue || !Number.isFinite(num) || num === 1) {
        delete nextMap[movieId];
      } else {
        nextMap[movieId] = Math.min(5, Math.max(0.5, Math.round(num * 100) / 100));
      }
      return {
        ...prev,
        moviePriceMultipliers: nextMap,
      };
    });
  };

  const handleSaveCatalogConfig = async () => {
    setSavingCatalog(true);
    setCatalogMsg(null);
    setCatalogErr(null);
    try {
      onOptimisticConfigChange(draftConfig);
      await savePlatformCatalogConfig(draftConfig, user.email);
      setCatalogMsg('Movie pricing and visibility saved to Firebase Firestore.');
    } catch (err) {
      console.error('Failed to save platform config:', err);
      setCatalogErr(
        'Saved in session preview, but Firestore rejected the write. Ensure updated firestore.rules are published in cinnova-001.'
      );
    } finally {
      setSavingCatalog(false);
    }
  };

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoleErr(null);
    setRoleMsg(null);
    if (!newRoleEmail.trim() || !newRoleEmail.includes('@')) {
      setRoleErr('Enter a valid email address.');
      return;
    }
    setSavingRole(true);
    try {
      await assignUserRole(newRoleEmail, newRoleType, newRoleLabel, user.email);
      setRoleMsg(`Assigned ${newRoleType.toUpperCase()} role to ${newRoleEmail.trim().toLowerCase()}.`);
      setNewRoleEmail('');
      setNewRoleLabel('');
    } catch (err) {
      console.error('Failed to assign role:', err);
      setRoleErr(
        'Could not save role assignment to Firestore. Ensure updated firestore.rules are published in cinnova-001.'
      );
    } finally {
      setSavingRole(false);
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between dark:border-blue-500/20">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-blue-600 uppercase dark:text-lime-400">
            <ShieldCheck className="h-4 w-4" />
            <span>Role 2 · Admin Control Center</span>
          </div>
          <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-[#070910] sm:text-3xl dark:text-slate-100">
            Pricing, Catalog &amp;{' '}
            <span className="font-cursive text-3xl text-blue-600 sm:text-4xl dark:text-lime-400">
              Permissions
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Control auditorium ticket prices, decide which movies appear on the user platform, and authorize Staff or System operators.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onBackToUserPlatform}
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:bg-[#0D111C] dark:text-slate-200 dark:hover:border-lime-400 dark:hover:text-lime-400"
          >
            Preview User Platform
          </button>
          <button
            type="button"
            disabled={savingCatalog}
            onClick={handleSaveCatalogConfig}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-blue-500 disabled:opacity-60 dark:bg-lime-400 dark:text-[#070910] dark:hover:bg-lime-300"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{savingCatalog ? 'Saving...' : 'Publish Changes'}</span>
          </button>
        </div>
      </div>

      {catalogMsg && (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-lime-500/40 bg-lime-50 px-4 py-3 text-xs font-medium text-lime-900 dark:border-lime-400/35 dark:bg-lime-400/10 dark:text-lime-300">
          <Check className="h-4 w-4 shrink-0" />
          <span>{catalogMsg}</span>
        </div>
      )}
      {catalogErr && (
        <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-300">
          {catalogErr}
        </div>
      )}

      {/* Top Grid: Global Pricing + Summary KPIs */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 lg:col-span-7 dark:border-blue-500/20 dark:bg-[#0D111C]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-blue-600 dark:text-lime-400" />
              <h2 className="font-display text-base font-bold text-[#070910] dark:text-slate-100">
                Global Ticket Tier Pricing
              </h2>
            </div>
            <button
              type="button"
              onClick={() =>
                setDraftConfig((prev) => ({
                  ...prev,
                  pricing: DEFAULT_SEAT_PRICING,
                }))
              }
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-lime-400"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Defaults</span>
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Base auditorium pricing before per-showtime &amp; per-movie multipliers.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Royal Recliner (₹)
              </span>
              <input
                type="number"
                min={50}
                max={5000}
                value={draftConfig.pricing.royalRecliner}
                onChange={(e) => handlePricingChange('royalRecliner', e.target.value)}
                className="font-mono-tabular mt-1.5 w-full rounded-xl border border-slate-200 bg-[#F4F7FC] px-3 py-2 text-sm font-semibold text-[#070910] focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-[#070910] dark:text-lime-300"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Prime Executive (₹)
              </span>
              <input
                type="number"
                min={50}
                max={5000}
                value={draftConfig.pricing.primeExecutive}
                onChange={(e) => handlePricingChange('primeExecutive', e.target.value)}
                className="font-mono-tabular mt-1.5 w-full rounded-xl border border-slate-200 bg-[#F4F7FC] px-3 py-2 text-sm font-semibold text-[#070910] focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-[#070910] dark:text-lime-300"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Classic Seats (₹)
              </span>
              <input
                type="number"
                min={50}
                max={5000}
                value={draftConfig.pricing.classic}
                onChange={(e) => handlePricingChange('classic', e.target.value)}
                className="font-mono-tabular mt-1.5 w-full rounded-xl border border-slate-200 bg-[#F4F7FC] px-3 py-2 text-sm font-semibold text-[#070910] focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-[#070910] dark:text-lime-300"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Convenience Fee / Seat (₹)
              </span>
              <input
                type="number"
                min={0}
                max={500}
                value={draftConfig.pricing.convenienceFee}
                onChange={(e) => handlePricingChange('convenienceFee', e.target.value)}
                className="font-mono-tabular mt-1.5 w-full rounded-xl border border-slate-200 bg-[#F4F7FC] px-3 py-2 text-sm font-semibold text-[#070910] focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-[#070910] dark:text-slate-100"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                GST on Fee (%)
              </span>
              <input
                type="number"
                min={0}
                max={50}
                value={draftConfig.pricing.gstPercent}
                onChange={(e) => handlePricingChange('gstPercent', e.target.value)}
                className="font-mono-tabular mt-1.5 w-full rounded-xl border border-slate-200 bg-[#F4F7FC] px-3 py-2 text-sm font-semibold text-[#070910] focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-[#070910] dark:text-slate-100"
              />
            </label>
          </div>
        </div>

        {/* Role & Catalog Status Summary */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 lg:col-span-5 dark:border-blue-500/20 dark:bg-[#0D111C]">
          <h2 className="font-display text-base font-bold text-[#070910] dark:text-slate-100">
            Platform Snapshot
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 bg-[#F4F7FC] p-3.5 dark:border-slate-800 dark:bg-[#070910]">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Displayed Movies
              </p>
              <p className="font-mono-tabular mt-1 text-2xl font-bold text-blue-600 dark:text-lime-400">
                {visibleCount}/{movies.length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-[#F4F7FC] p-3.5 dark:border-slate-800 dark:bg-[#070910]">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Hidden Titles
              </p>
              <p className="font-mono-tabular mt-1 text-2xl font-bold text-[#070910] dark:text-slate-100">
                {draftConfig.hiddenMovieIds.length}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-blue-500/20 bg-blue-50/70 p-3.5 dark:border-blue-500/25 dark:bg-blue-950/25">
            <p className="text-xs font-semibold text-[#070910] dark:text-slate-100">
              Primary Admin Accounts
            </p>
            <ul className="mt-1.5 space-y-1 text-xs text-slate-600 dark:text-slate-300">
              {BOOTSTRAP_ADMIN_EMAILS.map((email) => (
                <li key={email} className="font-mono-tabular flex items-center justify-between gap-2">
                  <span className="truncate">{email}</span>
                  <span className="shrink-0 font-sans text-[11px] font-semibold text-blue-600 dark:text-lime-400">
                    Bootstrap Admin
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Movie Visibility & Per-Movie Pricing */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-blue-500/20 dark:bg-[#0D111C]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Film className="h-4 w-4 text-blue-600 dark:text-lime-400" />
              <h2 className="font-display text-base font-bold text-[#070910] dark:text-slate-100">
                Movies Displayed on User Platform &amp; Title Pricing
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Hide or display individual movies and set custom price multipliers per movie. Click Publish Changes above to sync live.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={movieSearch}
              onChange={(e) => setMovieSearch(e.target.value)}
              placeholder="Filter catalog movies..."
              className="w-full rounded-xl border border-slate-200 bg-[#F4F7FC] py-2 pl-9 pr-3 text-xs text-[#070910] focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-[#070910] dark:text-slate-100"
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="py-2.5 pr-4 font-semibold">Movie</th>
                <th className="py-2.5 pr-4 font-semibold">Status</th>
                <th className="py-2.5 pr-4 font-semibold">Base Classic → Royal</th>
                <th className="py-2.5 pr-4 font-semibold">Price Multiplier</th>
                <th className="py-2.5 text-right font-semibold">User Platform</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredMovies.map((movie) => {
                const isHidden = hiddenSet.has(movie.id);
                const mult = draftConfig.moviePriceMultipliers[movie.id] ?? 1;
                const classicEff = Math.round((draftConfig.pricing.classic * mult) / 10) * 10;
                const royalEff = Math.round((draftConfig.pricing.royalRecliner * mult) / 10) * 10;

                return (
                  <tr
                    key={movie.id}
                    className={isHidden ? 'opacity-60' : ''}
                  >
                    <td className="py-3 pr-4">
                      <p className="font-display font-bold text-[#070910] dark:text-slate-100">
                        {movie.title}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {movie.language} · {movie.genres.slice(0, 2).join(', ')}
                      </p>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-medium text-slate-600 capitalize dark:text-slate-300">
                        {movie.status.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="font-mono-tabular py-3 pr-4 text-slate-700 dark:text-slate-200">
                      ₹{classicEff} – ₹{royalEff}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.05"
                          min="0.5"
                          max="5"
                          value={mult}
                          onChange={(e) => handleMultiplierChange(movie.id, e.target.value)}
                          aria-label={`Price multiplier for ${movie.title}`}
                          className="font-mono-tabular w-20 rounded-lg border border-slate-200 bg-[#F4F7FC] px-2 py-1 text-xs font-semibold text-[#070910] focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-[#070910] dark:text-lime-300"
                        />
                        <span className="text-[11px] text-slate-400">×</span>
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleMovieVisibility(movie.id)}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                          isHidden
                            ? 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300'
                            : 'border-lime-500/50 bg-lime-50 text-lime-800 hover:bg-lime-100 dark:border-lime-400/40 dark:bg-lime-400/15 dark:text-lime-300'
                        }`}
                      >
                        {isHidden ? (
                          <>
                            <EyeOff className="h-3.5 w-3.5" />
                            <span>Hidden</span>
                          </>
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5" />
                            <span>Displayed</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Assignments Manager */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-blue-500/20 dark:bg-[#0D111C]">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-600 dark:text-lime-400" />
          <h2 className="font-display text-base font-bold text-[#070910] dark:text-slate-100">
            Staff, System &amp; Admin Role Assignments
          </h2>
        </div>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Assign Theatre Staff (ticket scanner &amp; seating access), System operators (real-time seat interface), or additional Admins by verified email.
        </p>

        <form onSubmit={handleAssignRole} className="mt-4 grid gap-3 sm:grid-cols-12">
          <input
            type="email"
            required
            value={newRoleEmail}
            onChange={(e) => setNewRoleEmail(e.target.value)}
            placeholder="operator@mitsgwl.ac.in"
            className="rounded-xl border border-slate-200 bg-[#F4F7FC] px-3.5 py-2 text-xs text-[#070910] focus:border-blue-600 focus:outline-none sm:col-span-5 dark:border-slate-700 dark:bg-[#070910] dark:text-slate-100"
          />
          <select
            value={newRoleType}
            onChange={(e) => setNewRoleType(e.target.value as UserRole)}
            className="rounded-xl border border-slate-200 bg-[#F4F7FC] px-3 py-2 text-xs font-semibold text-[#070910] focus:border-blue-600 focus:outline-none sm:col-span-2 dark:border-slate-700 dark:bg-[#070910] dark:text-slate-100"
          >
            <option value="staff">Staff</option>
            <option value="system">System</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
          <input
            type="text"
            value={newRoleLabel}
            onChange={(e) => setNewRoleLabel(e.target.value)}
            placeholder="Gate / Desk label (optional)"
            maxLength={80}
            className="rounded-xl border border-slate-200 bg-[#F4F7FC] px-3.5 py-2 text-xs text-[#070910] focus:border-blue-600 focus:outline-none sm:col-span-3 dark:border-slate-700 dark:bg-[#070910] dark:text-slate-100"
          />
          <button
            type="submit"
            disabled={savingRole}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60 sm:col-span-2 dark:bg-lime-400 dark:text-[#070910] dark:hover:bg-lime-300"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{savingRole ? 'Saving...' : 'Assign'}</span>
          </button>
        </form>

        {roleMsg && (
          <p className="mt-3 text-xs font-medium text-lime-700 dark:text-lime-400">{roleMsg}</p>
        )}
        {(roleErr || roleListErr) && (
          <p className="mt-3 text-xs font-medium text-amber-700 dark:text-amber-300">
            {roleErr || roleListErr}
          </p>
        )}

        <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {roleAssignments.length === 0 ? (
            <p className="px-4 py-4 text-xs text-slate-500 dark:text-slate-400">
              No extra role assignments yet. Add an email above to grant Staff or System access.
            </p>
          ) : (
            roleAssignments.map((rec) => (
              <div
                key={rec.emailKey}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs"
              >
                <div>
                  <p className="font-mono-tabular font-semibold text-[#070910] dark:text-slate-100">
                    {rec.email}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {rec.label ? `${rec.label} · ` : ''}Assigned by {rec.assignedBy}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono-tabular font-semibold text-blue-600 uppercase dark:text-lime-400">
                    {rec.role}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeUserRole(rec.emailKey).catch(() => {})}
                    aria-label={`Remove role for ${rec.email}`}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};
