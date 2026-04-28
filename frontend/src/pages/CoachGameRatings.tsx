/*
  The Hawk Hub — Coach Game Ratings (1-5, Weekly)

  Fast bulk-entry table for coaches to rate the whole squad's game performance
  after every match. One rating per player per round. Re-submissions update.

  Distinct from the longitudinal 1-10 IDP / skill ratings in CoachRatings.
*/

import { useEffect, useMemo, useState } from 'react';
import { ApiService } from '../services/api';
import type { Player, CoachGameRatingInput, Round } from '../services/api';
import { Save, Search, CheckCircle2, ClipboardCheck } from 'lucide-react';

const DEFAULT_SEASON = '2026';

const RATING_SCALE = [1, 2, 3, 4, 5];
const RATING_LABELS: Record<number, string> = {
    1: 'Poor',
    2: 'Below Avg',
    3: 'Average',
    4: 'Strong',
    5: 'Elite',
};

type RatingMap = Record<number, { rating: number | null; notes: string }>;

export const CoachGameRatings = () => {
    const [players, setPlayers] = useState<Player[]>([]);
    const [rounds, setRounds] = useState<string[]>([]);
    const [seasonRounds, setSeasonRounds] = useState<Round[]>([]);
    const [roundLabel, setRoundLabel] = useState<string>('');
    const [ratings, setRatings] = useState<RatingMap>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [search, setSearch] = useState('');

    // Initial load — squad + season rounds + existing rating rounds
    useEffect(() => {
        (async () => {
            try {
                const [squad, availableRounds, seasonData] = await Promise.all([
                    ApiService.getPlayers(),
                    ApiService.getCoachGameRatingRounds(),
                    ApiService.getCurrentSeason().catch(() => null),
                ]);
                setPlayers(squad);
                setRounds(availableRounds);
                const sRounds = seasonData?.rounds || [];
                setSeasonRounds(sRounds);
                // Default: current round from season, otherwise most recent rated round
                const currentRoundName = seasonData?.current_round?.name;
                const defaultRound = currentRoundName || availableRounds[0] || (sRounds[0]?.name ?? '');
                setRoundLabel(defaultRound);
            } catch (e) {
                console.error('Failed to load coach game ratings page', e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // When round changes, reload any existing ratings for that round
    useEffect(() => {
        if (!roundLabel) return;
        (async () => {
            try {
                const data = await ApiService.getCoachGameRatings(roundLabel);
                const map: RatingMap = {};
                for (const r of data.ratings) {
                    map[r.player_id] = { rating: r.rating, notes: r.notes || '' };
                }
                setRatings(map);
            } catch (e) {
                console.error('Failed to load existing ratings for round', e);
                setRatings({});
            }
        })();
    }, [roundLabel]);

    const setPlayerRating = (playerId: number, rating: number | null) => {
        setRatings(prev => ({
            ...prev,
            [playerId]: { rating, notes: prev[playerId]?.notes || '' },
        }));
        setSaved(false);
    };

    const setPlayerNotes = (playerId: number, notes: string) => {
        setRatings(prev => ({
            ...prev,
            [playerId]: { rating: prev[playerId]?.rating ?? null, notes },
        }));
        setSaved(false);
    };

    const handleSubmit = async () => {
        if (!roundLabel) {
            alert('Please enter a round label (e.g. "R3 2026").');
            return;
        }
        const payload: CoachGameRatingInput[] = Object.entries(ratings)
            .filter(([, v]) => v.rating !== null && v.rating !== undefined)
            .map(([pid, v]) => ({
                player_id: Number(pid),
                rating: v.rating,
                notes: v.notes || undefined,
            }));

        if (payload.length === 0) {
            alert('Rate at least one player before saving.');
            return;
        }

        setSaving(true);
        try {
            await ApiService.submitCoachGameRatings(roundLabel, payload, DEFAULT_SEASON);
            setSaved(true);
            // Refresh round list in case this is a new round
            const refreshed = await ApiService.getCoachGameRatingRounds();
            setRounds(refreshed);
        } catch (e: any) {
            console.error(e);
            alert(`Failed to save ratings: ${e?.response?.data?.error || e.message}`);
        } finally {
            setSaving(false);
        }
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return players;
        return players.filter(
            p => p.name?.toLowerCase().includes(q) || String(p.jumper_no).includes(q)
        );
    }, [players, search]);

    const ratedCount = Object.values(ratings).filter(r => r.rating !== null && r.rating !== undefined).length;

    if (loading) {
        return (
            <div className="p-10 text-amber-200/70">Loading squad…</div>
        );
    }

    return (
        <div className="p-6 md:p-10 space-y-6 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight uppercase" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        Game Ratings <span className="text-hawks-gold">(1–5)</span>
                    </h1>
                    <p className="text-gray-400 text-sm mt-2 max-w-xl">
                        Weekly squad review. Rate each player's overall game performance on a 1–5 scale.
                        Re-submitting overwrites the previous entry for the round.
                    </p>
                </div>

                <div className="flex items-end gap-3">
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-amber-300/60">Round</label>
                        <select
                            value={roundLabel}
                            onChange={e => setRoundLabel(e.target.value)}
                            className="block mt-1 bg-hawks-card border border-white/10 rounded-xl px-4 py-2 text-white text-sm w-48 focus:outline-none focus:border-hawks-gold/50"
                        >
                            {seasonRounds.map(r => (
                                <option key={r.id} value={r.name}>{r.name}</option>
                            ))}
                            {rounds.filter(rl => !seasonRounds.some(sr => sr.name === rl)).map(rl => (
                                <option key={rl} value={rl}>{rl}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="flex items-center gap-2 bg-hawks-gold hover:bg-hawks-gold/90 disabled:opacity-50 text-black font-bold rounded-xl px-5 py-2 text-sm uppercase tracking-widest"
                    >
                        {saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
                        {saving ? 'Saving…' : saved ? 'Saved' : 'Save Ratings'}
                    </button>
                </div>
            </div>

            {/* Summary bar */}
            <div className="flex items-center gap-4 bg-hawks-card/60 border border-white/5 rounded-2xl px-5 py-3">
                <ClipboardCheck size={18} className="text-hawks-gold" />
                <span className="text-sm text-white">
                    <span className="font-bold text-hawks-gold">{ratedCount}</span>
                    <span className="text-gray-400"> / {players.length} players rated for </span>
                    <span className="font-bold">{roundLabel || '—'}</span>
                </span>

                <div className="ml-auto relative w-64">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Filter by name or number"
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-hawks-gold/40"
                    />
                </div>
            </div>

            {/* Ratings table */}
            <div className="bg-hawks-card/80 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                <table className="w-full text-sm">
                    <thead className="bg-white/5 text-[10px] uppercase tracking-widest text-amber-300/60">
                        <tr>
                            <th className="px-4 py-3 text-left w-16">#</th>
                            <th className="px-4 py-3 text-left">Player</th>
                            <th className="px-4 py-3 text-left w-24">Position</th>
                            <th className="px-4 py-3 text-center w-96">Rating</th>
                            <th className="px-4 py-3 text-left">Notes (optional)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(p => {
                            const current = ratings[p.jumper_no];
                            return (
                                <tr key={p.jumper_no} className="border-t border-white/5 hover:bg-white/[0.02]">
                                    <td className="px-4 py-3 text-amber-300 font-bold">{p.jumper_no}</td>
                                    <td className="px-4 py-3 text-white font-medium">{p.name}</td>
                                    <td className="px-4 py-3 text-gray-400 text-xs">{p.position || '—'}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center gap-1">
                                            {RATING_SCALE.map(v => {
                                                const active = current?.rating === v;
                                                return (
                                                    <button
                                                        key={v}
                                                        onClick={() => setPlayerRating(p.jumper_no, active ? null : v)}
                                                        title={RATING_LABELS[v]}
                                                        className={`h-9 w-9 rounded-lg text-sm font-bold transition-all ${
                                                            active
                                                                ? 'bg-hawks-gold text-black shadow-lg shadow-hawks-gold/40 scale-105'
                                                                : 'bg-white/5 text-gray-300 hover:bg-white/10'
                                                        }`}
                                                    >
                                                        {v}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            value={current?.notes || ''}
                                            onChange={e => setPlayerNotes(p.jumper_no, e.target.value)}
                                            placeholder="Optional context"
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-hawks-gold/40"
                                        />
                                    </td>
                                </tr>
                            );
                        })}

                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                    No players match "{search}".
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <p className="text-[10px] uppercase tracking-widest text-gray-600 text-center">
                Scale: 1 Poor · 2 Below Avg · 3 Average · 4 Strong · 5 Elite
            </p>
        </div>
    );
};

export default CoachGameRatings;
