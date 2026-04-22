/*
  The Nest — Post Match Player Review Dashboard

  Visualizes granular coaching ratings with Coach vs Self comparison.
  Modes: Player (Radar + Gap), Team (Matrix), By Round (Progression).
*/

import { useEffect, useState, useRef } from 'react';
import { ApiService, formatPlayerImage } from '../services/api';
import type { Player, CoachRating, TeamMatrixResponse, YearlyMatrixResponse } from '../services/api';
import { User, Activity, LayoutGrid, BarChart2 } from 'lucide-react';
import { clsx } from 'clsx';
import { NativeRadarChart } from '../components/common/NativeRadarChart';
import { useRounds } from '../hooks/useRounds';
import { RoundSelector } from '../components/common/RoundSelector';

type ViewMode = 'PLAYER' | 'TEAM' | 'ROUND';

const CATEGORIES = ["Technical", "Tactical", "Physical", "Mental"];

const RatingCell = ({ rating }: { rating: { coach: number; self: number } }) => {
    const gap = (rating.coach || 0) - (rating.self || 0);
    const hasData = rating.coach || rating.self;

    if (!hasData) return <div className="text-gray-500 text-[10px]">—</div>;

    return (
        <div className="flex flex-col items-center justify-center py-1">
            <div className="flex items-center gap-1.5 font-black text-xs">
                <span className="text-gray-100">{rating.coach || '-'}</span>
                <span className="text-gray-500">/</span>
                <span className="text-gold-500">{rating.self || '-'}</span>
            </div>
            {rating.coach > 0 && rating.self > 0 && (
                <div className={clsx(
                    "text-[8px] font-black px-1 rounded",
                    gap > 0 ? "text-emerald-400 bg-emerald-500/10" :
                    gap < 0 ? "text-rose-400 bg-rose-500/10" : "text-gray-500 bg-hawks-hover"
                )}>
                    {gap > 0 ? `+${gap}` : gap}
                </div>
            )}
        </div>
    );
};

export const RatingComparison = () => {
    const [viewMode, setViewMode] = useState<ViewMode>('PLAYER');
    const [players, setPlayers] = useState<Player[]>([]);
    const [selectedPlayerId, setSelectedPlayerId] = useState<number>(0);
    const [selectedCategory, setSelectedCategory] = useState<string>("Technical");

    const { seasons, selectedSeason, setSelectedSeason, rounds, selectedRound, setSelectedRound } = useRounds();

    // Data states
    const [ratings, setRatings] = useState<CoachRating[]>([]);
    const [teamMatrix, setTeamMatrix] = useState<TeamMatrixResponse | null>(null);
    const [yearlyMatrix, setYearlyMatrix] = useState<YearlyMatrixResponse | null>(null);

    const [loading, setLoading] = useState(true);
    const [radarSize, setRadarSize] = useState({ w: 600, h: 360 });
    const radarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        ApiService.getPlayers().then(setPlayers).finally(() => setLoading(false));
    }, []);

    // Fetch Player View Data
    useEffect(() => {
        if (viewMode === 'PLAYER' && selectedPlayerId && selectedRound) {
            ApiService.getRatings(selectedPlayerId.toString(), selectedRound.id).then(res => {
                setRatings(res.ratings || []);
            });
        }
    }, [selectedPlayerId, viewMode, selectedRound]);

    // Fetch Team Matrix Data
    useEffect(() => {
        if (viewMode === 'TEAM' && selectedRound) {
            setLoading(true);
            ApiService.getTeamMatrix(selectedCategory, selectedRound.id)
                .then(setTeamMatrix)
                .finally(() => setLoading(false));
        }
    }, [viewMode, selectedCategory, selectedRound]);

    // Fetch By Round Data
    useEffect(() => {
        if (viewMode === 'ROUND' && selectedPlayerId) {
            setLoading(true);
            ApiService.getYearlyMatrix(selectedPlayerId, selectedCategory)
                .then(setYearlyMatrix)
                .finally(() => setLoading(false));
        }
    }, [selectedPlayerId, viewMode, selectedCategory]);

    useEffect(() => {
        const obs = new ResizeObserver(() => {
            if (radarRef.current) {
                setRadarSize({
                    w: Math.min(radarRef.current.offsetWidth, 700),
                    h: 360
                });
            }
        });
        if (radarRef.current) obs.observe(radarRef.current);
        return () => obs.disconnect();
    }, []);

    // Filter ratings by selected category for the gap table
    const filteredRatings = ratings.filter(r => r.category === selectedCategory);

    // Radar data: show per-skill averages for the selected category (matching the table)
    const chartData = filteredRatings.map(r => ({
        subject: r.skill.length > 20 ? r.skill.substring(0, 18) + '…' : r.skill,
        Coach: r.coach_rating || 0,
        Self: r.self_rating || 0,
    }));

    if (loading && players.length === 0) return <div className="p-20 text-center text-gray-500">Initialising Tactical Suite...</div>;

    const selectedPlayer = players.find(p => p.jumper_no === selectedPlayerId);

    // Category filter pills — shown on all tabs
    const CategoryFilter = () => (
        <div className="flex gap-1 bg-hawks-hover p-1.5 rounded-2xl">
            {CATEGORIES.map(cat => (
                <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={clsx(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        selectedCategory === cat
                            ? "bg-hfc-brown text-white shadow-lg"
                            : "text-gray-400 hover:text-gray-100 hover:bg-hawks-card"
                    )}
                    style={{ fontFamily: 'Work Sans, sans-serif' }}
                >
                    {cat}
                </button>
            ))}
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 h-full">
            {/* Header */}
            <div className="flex flex-col gap-4 bg-hawks-card p-6 rounded-3xl shadow-card border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-hawks-gold/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>

                <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between relative z-10">
                    <div>
                        <h1 className="text-2xl font-black text-hawks-gold tracking-tight uppercase" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Post Match Review</h1>
                        <div className="flex gap-1 mt-3 bg-hawks-hover p-1 rounded-xl w-fit">
                            {[
                                { id: 'PLAYER', label: 'By Player', icon: User },
                                { id: 'TEAM', label: 'By Team', icon: LayoutGrid },
                                { id: 'ROUND', label: 'By Round', icon: BarChart2 },
                            ].map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => setViewMode(m.id as ViewMode)}
                                    className={clsx(
                                        "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                        viewMode === m.id
                                            ? "bg-hfc-brown text-white shadow-lg"
                                            : "text-gray-400 hover:text-gray-100 hover:bg-hawks-card"
                                    )}
                                >
                                    <m.icon size={14} />
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 relative z-10">
                        <RoundSelector seasons={seasons} selectedSeason={selectedSeason} onSeasonChange={setSelectedSeason} rounds={rounds} selectedRound={selectedRound} onRoundChange={setSelectedRound} />

                        {(viewMode === 'PLAYER' || viewMode === 'ROUND') && (
                            <div className="w-56 relative group">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-hawks-gold transition-colors" size={16} />
                                <select
                                    className="w-full pl-9 pr-3 py-2 bg-hawks-base border border-white/10 rounded-xl appearance-none focus:ring-2 focus:ring-hawks-gold/10 focus:border-hawks-gold outline-none font-bold text-sm text-gray-100 transition-all"
                                    value={selectedPlayerId}
                                    onChange={e => setSelectedPlayerId(Number(e.target.value))}
                                >
                                    <option value={0}>Select Player...</option>
                                    {players.map(p => (
                                        <option key={p.jumper_no} value={p.jumper_no}>#{p.jumper_no} {p.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                {/* Category filter — all tabs */}
                <div className="relative z-10">
                    <CategoryFilter />
                </div>
            </div>

            {/* View Mode Rendering */}
            <div className="flex-1">
                {viewMode === 'PLAYER' && (
                    selectedPlayerId === 0 ? (
                        <EmptyState message="Please select a player to begin analysis." />
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                             {/* Radar View — full width, capped height */}
                             <div className="bg-hfc-brown p-6 rounded-2xl text-white border border-white/10 shadow-2xl relative overflow-hidden">
                                <div className="flex items-center gap-3 mb-2 relative z-10">
                                    <div className="w-10 h-10 rounded-full border-2 border-gold-400 p-0.5 bg-hfc-brown">
                                        <img
                                            src={formatPlayerImage(selectedPlayerId, selectedPlayer?.photo_url, selectedPlayer?.name)}
                                            className="w-full h-full object-cover rounded-full bg-gray-800"
                                            alt={selectedPlayer?.name}
                                        />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-sm uppercase tracking-tight">{selectedPlayer?.name}</h3>
                                        <p className="text-[9px] text-amber-300 font-bold uppercase tracking-widest">{selectedCategory} — Coach vs Self</p>
                                    </div>
                                    <div className="ml-auto flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest">
                                        <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-white rounded"></div><span className="text-white/60">Coach</span></div>
                                        <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-amber-400 rounded"></div><span className="text-amber-400/60">Self</span></div>
                                    </div>
                                </div>
                                <div ref={radarRef} className="flex items-center justify-center h-[380px]">
                                    {chartData.length > 0 ? (
                                        <NativeRadarChart data={chartData} size={radarSize} categories={['Coach', 'Self']} colors={{ Coach: { stroke: '#fff', fill: '#fff', opacity: 0.15 }, Self: { stroke: '#fbbf24', fill: 'transparent', opacity: 0 } }} />
                                    ) : (
                                        <p className="text-white/30 text-xs">No ratings for this round</p>
                                    )}
                                </div>
                             </div>

                             {/* Gap Analysis Table — full width below */}
                             <div className="bg-hawks-card p-6 rounded-2xl shadow-card border border-white/5 flex flex-col overflow-hidden">
                                <h3 className="font-black text-lg uppercase tracking-tight text-gray-100 mb-4">{selectedCategory} Alignment Gaps</h3>
                                <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
                                    <table className="w-full">
                                        <thead className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5 sticky top-0 bg-hawks-card">
                                            <tr>
                                                <th className="pb-3 text-left">Skill</th>
                                                <th className="pb-3 text-center">Coach</th>
                                                <th className="pb-3 text-center">Self</th>
                                                <th className="pb-3 text-right">Gap</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {filteredRatings.map((r, i) => (
                                                <tr key={i} className="group hover:bg-hawks-hover/50 transition-colors">
                                                    <td className="py-3">
                                                        <div className="font-bold text-gray-100 text-sm">{r.skill}</div>
                                                    </td>
                                                    <td className="py-3 text-center font-black text-gray-100">{r.coach_rating || '—'}</td>
                                                    <td className="py-3 text-center font-black text-gold-500">{r.self_rating || '—'}</td>
                                                    <td className="py-3 text-right">
                                                        {r.coach_rating && r.self_rating ? (
                                                            <span className={clsx("px-2 py-1 rounded-lg text-xs font-black", (r.gap || 0) > 0 ? "bg-emerald-500/10 text-emerald-400" : (r.gap || 0) < 0 ? "bg-rose-500/10 text-rose-400" : "bg-hawks-hover text-gray-500")}>
                                                                {(r.gap || 0) > 0 ? `+${r.gap}` : r.gap}
                                                            </span>
                                                        ) : <span className="text-gray-600 text-xs">—</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredRatings.length === 0 && (
                                                <tr><td colSpan={4} className="py-8 text-center text-gray-500">No ratings for {selectedCategory} in this round</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                             </div>
                        </div>
                    )
                )}

                {viewMode === 'TEAM' && teamMatrix && (
                    <div className="bg-hawks-card rounded-2xl shadow-xl border border-white/5 overflow-hidden flex flex-col h-[calc(100vh-380px)] animate-in zoom-in-95 duration-500">
                        <div className="bg-hfc-brown p-5 text-white flex items-center justify-between">
                            <div>
                                <h2 className="font-black text-lg uppercase">{selectedCategory} — Team Matrix</h2>
                                <p className="text-amber-300 text-[10px] font-bold uppercase tracking-widest mt-1">{selectedRound?.name || 'Latest'}</p>
                            </div>
                            <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.15em]">
                                Coach / Self (Gap)
                            </div>
                        </div>

                        <div className="overflow-auto flex-1 custom-scrollbar relative">
                            <table className="w-full text-left border-collapse min-w-max">
                                <thead className="sticky top-0 z-30 bg-hawks-hover shadow-card">
                                    <tr>
                                        <th className="sticky left-0 z-40 bg-hawks-hover p-3 min-w-[180px] border-b border-white/10">
                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Player</div>
                                        </th>
                                        {teamMatrix.skills.map(skill => (
                                            <th key={skill} className="p-3 border-b border-white/10 text-center min-w-[110px]">
                                                <div className="text-[9px] font-black text-gray-100 uppercase tracking-tight leading-tight max-w-[100px] mx-auto whitespace-normal">
                                                    {skill}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {teamMatrix.players.map((p, idx) => (
                                        <tr key={p.id} className={clsx("hover:bg-hawks-hover transition-colors", idx % 2 === 0 ? "bg-hawks-card" : "bg-hawks-base/30")}>
                                            <td className="sticky left-0 z-20 bg-inherit p-3 border-b border-white/5 font-bold text-gray-100 text-sm flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full overflow-hidden bg-hawks-gold/5 border border-white/10 hidden md:block shrink-0">
                                                    <img src={formatPlayerImage(p.id, players.find(pl => pl.jumper_no === p.id)?.photo_url, p.name)} className="w-full h-full object-cover" alt="" />
                                                </div>
                                                <span className="truncate">{p.name}</span>
                                            </td>
                                            {teamMatrix.skills.map(skill => (
                                                <td key={skill} className="p-3 border-b border-white/5 text-center">
                                                    <RatingCell rating={teamMatrix.matrix[p.id]?.[skill] || { coach: 0, self: 0 }} />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {viewMode === 'ROUND' && (
                    selectedPlayerId === 0 ? (
                        <EmptyState message="Select a player to view their round-by-round progression." />
                    ) : yearlyMatrix ? (
                        <div className="bg-hawks-card rounded-2xl shadow-xl border border-white/5 overflow-hidden flex flex-col h-[calc(100vh-380px)] animate-in zoom-in-95 duration-500">
                            <div className="bg-hfc-brown p-5 text-white flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 p-0.5 border border-white/20">
                                        <img src={formatPlayerImage(selectedPlayerId, selectedPlayer?.photo_url, selectedPlayer?.name)} className="w-full h-full object-cover rounded-lg" alt="" />
                                    </div>
                                    <div>
                                        <h2 className="font-black text-lg uppercase">{selectedPlayer?.name} — {selectedCategory}</h2>
                                        <p className="text-amber-300 text-[10px] font-bold uppercase tracking-widest mt-0.5">Round-by-Round Progression</p>
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-auto flex-1 custom-scrollbar relative">
                                <table className="w-full text-left border-collapse min-w-max">
                                    <thead className="sticky top-0 z-30 bg-hawks-hover shadow-card">
                                        <tr>
                                            <th className="sticky left-0 z-40 bg-hawks-hover p-3 min-w-[130px] border-b border-white/10">
                                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Round</div>
                                            </th>
                                            {yearlyMatrix.skills.map(skill => (
                                                <th key={skill} className="p-3 border-b border-white/10 text-center min-w-[110px]">
                                                    <div className="text-[9px] font-black text-gray-100 uppercase tracking-tight leading-tight max-w-[100px] mx-auto whitespace-normal">
                                                        {skill}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {yearlyMatrix.rounds.map((round, idx) => (
                                            <tr key={round} className={clsx("hover:bg-hawks-hover transition-colors", idx % 2 === 0 ? "bg-hawks-card" : "bg-hawks-base/30")}>
                                                <td className="sticky left-0 z-20 bg-inherit p-3 border-b border-white/5 font-bold text-hawks-gold text-sm">
                                                    {round}
                                                </td>
                                                {yearlyMatrix.skills.map(skill => (
                                                    <td key={skill} className="p-3 border-b border-white/5 text-center">
                                                        <RatingCell rating={yearlyMatrix.matrix[round]?.[skill] || { coach: 0, self: 0 }} />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                        {yearlyMatrix.rounds.length === 0 && (
                                            <tr><td colSpan={(yearlyMatrix.skills.length || 0) + 1} className="py-8 text-center text-gray-500">No ratings found for this player</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : <EmptyState message="Loading round progression..." />
                )}

                {viewMode === 'TEAM' && !teamMatrix && !loading && (
                    <EmptyState message="No team ratings found for this round." />
                )}
            </div>
        </div>
    );
};

const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center p-20 bg-hawks-card rounded-2xl border-2 border-dashed border-white/10 shadow-card">
        <div className="p-5 bg-hawks-base rounded-full mb-4">
            <Activity size={36} className="text-gray-500" />
        </div>
        <h2 className="text-lg font-bold text-gray-100 mb-1">Awaiting Selection</h2>
        <p className="text-gray-400 font-medium text-sm">{message}</p>
    </div>
);
