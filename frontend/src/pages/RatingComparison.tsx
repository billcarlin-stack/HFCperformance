/*
  The Hawk Hub — Post Match Review

  Whole-squad coach 1-5 game ratings, by player × round.
  Cells show the rating; "—" means the player did not play that round.
*/

import { useEffect, useMemo, useState } from 'react';
import { ApiService } from '../services/api';
import type { Player, CoachGameRatingMatrix } from '../services/api';
import { Search, Trophy, Star } from 'lucide-react';
import { useFavourites } from '../hooks/useFavourites';
import { Link } from 'react-router-dom';

const RATING_COLORS: Record<number, string> = {
    1: 'bg-red-500/20 text-red-300 ring-red-500/30',
    2: 'bg-orange-500/20 text-orange-300 ring-orange-500/30',
    3: 'bg-amber-500/20 text-amber-300 ring-amber-500/30',
    4: 'bg-lime-500/20 text-lime-300 ring-lime-500/30',
    5: 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/30',
};

export const RatingComparison = () => {
    const [players, setPlayers] = useState<Player[]>([]);
    const [matrix, setMatrix] = useState<CoachGameRatingMatrix | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const { isFavourite } = useFavourites();

    useEffect(() => {
        (async () => {
            try {
                const [squad, m] = await Promise.all([
                    ApiService.getPlayers(),
                    ApiService.getCoachGameRatingMatrix(),
                ]);
                setPlayers(squad);
                setMatrix(m);
            } catch (e) {
                console.error('Failed to load post-match review', e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const rounds = matrix?.rounds || [];

    const sorted = useMemo(() => {
        const q = search.trim().toLowerCase();
        const list = players.filter(p => {
            if (!q) return true;
            return p.name?.toLowerCase().includes(q) || String(p.jumper_no).includes(q);
        });
        return [...list].sort((a, b) => {
            const aFav = isFavourite(a.jumper_no) ? 1 : 0;
            const bFav = isFavourite(b.jumper_no) ? 1 : 0;
            if (aFav !== bFav) return bFav - aFav;
            const aAvg = playerAverage(matrix, a.jumper_no);
            const bAvg = playerAverage(matrix, b.jumper_no);
            return bAvg - aAvg;
        });
    }, [players, matrix, search, isFavourite]);

    if (loading) return <div className="p-10 text-amber-200/70">Loading post match review…</div>;

    return (
        <div className="p-6 md:p-10 space-y-6 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight uppercase" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        Post Match <span className="text-hawks-gold">Review</span>
                    </h1>
                    <p className="text-gray-400 text-sm mt-2 max-w-2xl">
                        Coach 1–5 game ratings across the season. Each row is a player, each column a round.
                        A dash (—) means the player did not feature in the AFL side that week.
                    </p>
                </div>

                <div className="relative w-72">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Filter by name or jumper"
                        className="w-full bg-hawks-card border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-hawks-gold/40"
                    />
                </div>
            </div>

            <Legend />

            <div className="bg-hawks-card/80 border border-white/5 rounded-2xl shadow-2xl overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                    <thead className="bg-white/5 text-[10px] uppercase tracking-widest text-amber-300/60">
                        <tr>
                            <th className="sticky left-0 bg-hawks-card z-10 px-4 py-3 text-left w-64 border-b border-white/5">Player</th>
                            {rounds.map(r => (
                                <th key={r} className="px-3 py-3 text-center border-b border-white/5 whitespace-nowrap">{r}</th>
                            ))}
                            <th className="px-3 py-3 text-center border-b border-white/5">Avg</th>
                            <th className="px-3 py-3 text-center border-b border-white/5">Gms</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map(p => {
                            const playerRatings = matrix?.matrix[String(p.jumper_no)] || {};
                            const avg = playerAverage(matrix, p.jumper_no);
                            const games = Object.keys(playerRatings).length;
                            const fav = isFavourite(p.jumper_no);
                            return (
                                <tr key={p.jumper_no} className={`border-t border-white/5 ${fav ? 'bg-hawks-gold/[0.04]' : 'hover:bg-white/[0.02]'}`}>
                                    <td className="sticky left-0 bg-hawks-card z-10 px-4 py-3 border-b border-white/5">
                                        <Link to={`/players/${p.jumper_no}`} className="flex items-center gap-2 group">
                                            {fav && <Star size={12} className="text-hawks-gold fill-hawks-gold" />}
                                            <span className="text-amber-300 font-bold w-6">{p.jumper_no}</span>
                                            <span className="text-white font-medium group-hover:text-hawks-gold transition-colors">{p.name}</span>
                                        </Link>
                                    </td>
                                    {rounds.map(r => {
                                        const v = playerRatings[r];
                                        return (
                                            <td key={r} className="px-3 py-3 text-center border-b border-white/5">
                                                {v ? (
                                                    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ring-1 font-bold text-xs ${RATING_COLORS[v]}`}>
                                                        {v}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-600">—</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td className="px-3 py-3 text-center border-b border-white/5">
                                        {avg > 0 ? (
                                            <span className="text-hawks-gold font-bold">{avg.toFixed(1)}</span>
                                        ) : <span className="text-gray-600">—</span>}
                                    </td>
                                    <td className="px-3 py-3 text-center border-b border-white/5 text-gray-400 text-xs">{games}</td>
                                </tr>
                            );
                        })}
                        {sorted.length === 0 && (
                            <tr>
                                <td colSpan={rounds.length + 3} className="px-4 py-10 text-center text-gray-500">
                                    No players match "{search}".
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {rounds.length === 0 && (
                <div className="bg-hawks-card/40 border border-dashed border-white/10 rounded-2xl p-10 text-center">
                    <Trophy size={28} className="text-hawks-gold/60 mx-auto mb-3" />
                    <p className="text-gray-300 font-bold">No game ratings have been entered yet.</p>
                    <p className="text-gray-500 text-sm mt-1">Coaches can add weekly 1–5 ratings from <Link to="/ratings/game-entry" className="text-hawks-gold hover:underline">Game Ratings (1–5)</Link>.</p>
                </div>
            )}
        </div>
    );
};

const Legend = () => (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-400">
        <span className="uppercase tracking-widest text-amber-300/60 font-bold">Scale:</span>
        {[1, 2, 3, 4, 5].map(v => (
            <span key={v} className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ring-1 ${RATING_COLORS[v]}`}>
                <span className="font-bold">{v}</span>
                <span className="opacity-80">{['Poor', 'Below Avg', 'Average', 'Strong', 'Elite'][v - 1]}</span>
            </span>
        ))}
        <span className="ml-2 text-gray-500">— = did not play</span>
    </div>
);

function playerAverage(matrix: CoachGameRatingMatrix | null, jumperNo: number): number {
    if (!matrix) return 0;
    const m = matrix.matrix[String(jumperNo)];
    if (!m) return 0;
    const vals = Object.values(m);
    if (vals.length === 0) return 0;
    return vals.reduce((s, v) => s + v, 0) / vals.length;
}

export default RatingComparison;
