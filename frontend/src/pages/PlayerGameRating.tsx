/*
  The Hawk Hub — Player Self Game Rating (1-5)

  Each player rates their own performance after every match on a 1-5 scale.
  Only the player (and admins impersonating them) can see their own history —
  never another player's. Separate from the longitudinal 1-10 IDP scale.
*/

import { useEffect, useState } from 'react';
import { ApiService } from '../services/api';
import type { SelfGameRating, Round } from '../services/api';
import { Save, CheckCircle2, User, History } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DEFAULT_SEASON = '2026';

const RATING_SCALE = [1, 2, 3, 4, 5];
const RATING_LABELS: Record<number, string> = {
    1: 'Poor',
    2: 'Below Avg',
    3: 'Average',
    4: 'Strong',
    5: 'Elite',
};

export const PlayerGameRating = () => {
    const { user } = useAuth();

    const [history, setHistory] = useState<SelfGameRating[]>([]);
    const [seasonRounds, setSeasonRounds] = useState<Round[]>([]);
    const [roundLabel, setRoundLabel] = useState<string>('');
    const [rating, setRating] = useState<number | null>(null);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const [rows, seasonData] = await Promise.all([
                    ApiService.getSelfGameRatings(),
                    ApiService.getCurrentSeason().catch(() => null),
                ]);
                setHistory(rows);
                const sRounds = seasonData?.rounds || [];
                setSeasonRounds(sRounds);
                // Default: current round, then most recent self-rated round, then first season round
                const currentRoundName = seasonData?.current_round?.name;
                if (rows.length > 0) {
                    setRoundLabel(rows[0].round_label);
                    setRating(rows[0].rating);
                    setNotes(rows[0].notes || '');
                } else if (currentRoundName) {
                    setRoundLabel(currentRoundName);
                } else if (sRounds.length > 0) {
                    setRoundLabel(sRounds[0].name);
                } else {
                    setRoundLabel(suggestRoundLabel());
                }
            } catch (e) {
                console.error('Failed to load self ratings', e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const handleSubmit = async () => {
        if (!roundLabel) {
            alert('Please enter a round (e.g. "R3 2026").');
            return;
        }
        if (rating === null) {
            alert('Pick a rating from 1 to 5.');
            return;
        }
        setSaving(true);
        try {
            await ApiService.submitSelfGameRating(roundLabel, rating, notes || undefined, DEFAULT_SEASON);
            setSaved(true);
            // Reload history
            const rows = await ApiService.getSelfGameRatings();
            setHistory(rows);
        } catch (e: any) {
            console.error(e);
            alert(`Failed to save rating: ${e?.response?.data?.error || e.message}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-10 text-amber-200/70">Loading your ratings…</div>;
    }

    const average = history.length
        ? (history.reduce((s, r) => s + r.rating, 0) / history.length).toFixed(1)
        : '—';

    return (
        <div className="p-6 md:p-10 space-y-8 min-h-screen max-w-4xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight uppercase" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    Rate <span className="text-hawks-gold">My Game</span>
                </h1>
                <p className="text-gray-400 text-sm mt-2 max-w-xl">
                    Private self-assessment. Only you (and admins) can see these ratings — never your teammates.
                </p>
            </div>

            {/* Rating entry card */}
            <div className="bg-hawks-card/80 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-hawks-gold to-amber-600 text-hfc-brown flex items-center justify-center font-black text-sm">
                        {user?.initials || '??'}
                    </div>
                    <div>
                        <p className="text-white font-bold">{user?.name}</p>
                        <p className="text-[10px] text-amber-300/60 font-bold uppercase tracking-widest">Your self-rating for this match</p>
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-amber-300/60">Round</label>
                    <select
                        value={roundLabel}
                        onChange={e => { setRoundLabel(e.target.value); setSaved(false); }}
                        className="block mt-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm w-56 focus:outline-none focus:border-hawks-gold/50"
                    >
                        {seasonRounds.map(r => (
                            <option key={r.id} value={r.name}>{r.name}</option>
                        ))}
                        {/* Include previously rated rounds not in season schedule */}
                        {history
                            .filter(h => !seasonRounds.some(sr => sr.name === h.round_label))
                            .filter((h, i, arr) => arr.findIndex(x => x.round_label === h.round_label) === i)
                            .map(h => (
                                <option key={h.round_label} value={h.round_label}>{h.round_label}</option>
                            ))
                        }
                    </select>
                </div>

                <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-amber-300/60">Rating</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {RATING_SCALE.map(v => {
                            const active = rating === v;
                            return (
                                <button
                                    key={v}
                                    onClick={() => { setRating(active ? null : v); setSaved(false); }}
                                    className={`flex flex-col items-center justify-center h-16 w-16 rounded-2xl font-bold transition-all ${
                                        active
                                            ? 'bg-hawks-gold text-black shadow-lg shadow-hawks-gold/40 scale-105'
                                            : 'bg-white/5 text-gray-300 hover:bg-white/10'
                                    }`}
                                >
                                    <span className="text-xl">{v}</span>
                                    <span className="text-[9px] uppercase tracking-wider opacity-70">{RATING_LABELS[v]}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-amber-300/60">Reflection (optional)</label>
                    <textarea
                        value={notes}
                        onChange={e => { setNotes(e.target.value); setSaved(false); }}
                        placeholder="What went well? What could have gone better?"
                        rows={4}
                        className="block mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-hawks-gold/50 resize-none"
                    />
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={saving || rating === null}
                    className="w-full flex items-center justify-center gap-2 bg-hawks-gold hover:bg-hawks-gold/90 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-xl py-3 text-sm uppercase tracking-widest"
                >
                    {saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
                    {saving ? 'Saving…' : saved ? 'Saved' : 'Submit Rating'}
                </button>

                <p className="text-[10px] uppercase tracking-widest text-gray-600 text-center">
                    Scale: 1 Poor · 2 Below Avg · 3 Average · 4 Strong · 5 Elite
                </p>
            </div>

            {/* History */}
            <div className="bg-hawks-card/60 border border-white/5 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <History size={18} className="text-hawks-gold" />
                        <h2 className="text-white font-bold uppercase text-sm tracking-widest">Your History</h2>
                    </div>
                    <div className="text-xs text-gray-400">
                        Average: <span className="text-hawks-gold font-bold">{average}</span>
                        <span className="ml-4">Entries: <span className="text-white font-bold">{history.length}</span></span>
                    </div>
                </div>

                {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                        <User size={32} className="mb-3 opacity-30" />
                        <p className="text-sm">No ratings submitted yet.</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="text-[10px] uppercase tracking-widest text-amber-300/60">
                            <tr className="border-b border-white/5">
                                <th className="px-2 py-2 text-left">Round</th>
                                <th className="px-2 py-2 text-left w-20">Rating</th>
                                <th className="px-2 py-2 text-left">Notes</th>
                                <th className="px-2 py-2 text-right w-32">Submitted</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((r, i) => (
                                <tr key={`${r.round_label}-${i}`} className="border-b border-white/5 last:border-0">
                                    <td className="px-2 py-3 text-white font-bold">{r.round_label}</td>
                                    <td className="px-2 py-3">
                                        <span className="inline-flex h-7 w-7 rounded-lg bg-hawks-gold/20 text-hawks-gold font-bold items-center justify-center">
                                            {r.rating}
                                        </span>
                                    </td>
                                    <td className="px-2 py-3 text-gray-400 text-xs">
                                        {r.notes || <span className="text-gray-600 italic">—</span>}
                                    </td>
                                    <td className="px-2 py-3 text-gray-500 text-xs text-right">
                                        {r.updated_at ? new Date(r.updated_at).toLocaleDateString() : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

function suggestRoundLabel(): string {
    const now = new Date();
    const year = now.getFullYear();
    const start = new Date(year, 2, 15);
    const diffWeeks = Math.max(1, Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 3600 * 1000)) + 1);
    return `R${diffWeeks} ${year}`;
}

export default PlayerGameRating;
