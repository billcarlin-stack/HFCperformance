import { useState, useEffect, useMemo } from 'react';
import type { PlayerStats } from '../services/api';
import { ApiService } from '../services/api';
import {
    ChevronUp,
    ChevronDown,
    Search
} from 'lucide-react';
import clsx from 'clsx';

type SortConfig = {
    key: keyof PlayerStats;
    direction: 'asc' | 'desc';
};

const StatsPage = () => {
    const [stats, setStats] = useState<PlayerStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'disposals_avg', direction: 'desc' });
    const [viewMode, setViewMode] = useState<'Average' | 'Total'>('Average');
    const [leagueId, setLeagueId] = useState<1 | 2>(1);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const data = await ApiService.getStats2025({ league_id: leagueId });
                setStats(data);
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [leagueId]);

    const handleSort = (key: keyof PlayerStats) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const sortedStats = useMemo(() => {
        let sortableItems = [...stats];
        if (searchTerm) {
            sortableItems = sortableItems.filter(item =>
                item.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        sortableItems.sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];

            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
            }
            return 0;
        });
        return sortableItems;
    }, [stats, sortConfig, searchTerm]);

    const TableHeader = ({ label, sortKey, shortLabel }: { label: string; sortKey: keyof PlayerStats; shortLabel?: string }) => (
        <th
            onClick={() => handleSort(sortKey)}
            className={clsx(
                "px-4 py-5 text-center text-[11px] font-black uppercase tracking-[0.2em] cursor-pointer hover:bg-white/10 transition-colors group relative",
                sortConfig.key === sortKey ? "text-gold-400 bg-white/5" : "text-amber-200/60"
            )}
        >
            <div className="flex items-center gap-2 justify-center">
                <span className="hidden xl:inline">{label}</span>
                <span className="xl:hidden">{shortLabel || label}</span>
                <div className="flex flex-col opacity-40 group-hover:opacity-100 transition-opacity">
                    <ChevronUp size={10} className={clsx(sortConfig.key === sortKey && sortConfig.direction === 'asc' ? 'text-gold-400 opacity-100' : 'opacity-40')} />
                    <ChevronDown size={10} className={clsx(sortConfig.key === sortKey && sortConfig.direction === 'desc' ? 'text-gold-400 opacity-100' : 'opacity-40')} />
                </div>
            </div>
            {sortConfig.key === sortKey && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold-400" />
            )}
        </th>
    );

    if (loading) return (
        <div className="p-8 space-y-4">
            <div className="h-20 w-full bg-white/5 animate-pulse rounded-3xl" />
            <div className="h-[600px] w-full bg-white/5 animate-pulse rounded-3xl" />
        </div>
    );

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
                <div>
                    <h1 className="text-5xl font-black text-hawks-gold tracking-tighter font-outfit uppercase" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        SQUAD <span className="text-hawks-gold">STATS</span>
                    </h1>
                    <p className="text-amber-300 font-bold uppercase tracking-widest text-[10px] mt-2">2025 Performance Analytics Engine</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* League Toggle */}
                    <div className="bg-hawks-base p-1.5 rounded-2xl border border-white/10 flex shadow-inner">
                        {([{ id: 1, label: 'AFL' }, { id: 2, label: 'VFL' }] as const).map(({ id, label }) => (
                            <button
                                key={id}
                                onClick={() => setLeagueId(id)}
                                className={clsx(
                                    "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                                    leagueId === id
                                        ? "bg-hawks-gold text-hawks-base shadow-lg"
                                        : "text-amber-200/40 hover:text-white"
                                )}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* View Toggle */}
                    <div className="bg-hawks-base p-1.5 rounded-2xl border border-white/10 flex shadow-inner">
                        {['Total', 'Average'].map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode as any)}
                                className={clsx(
                                    "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                                    viewMode === mode
                                        ? "bg-hfc-brown text-white shadow-lg"
                                        : "text-amber-200/40 hover:text-white"
                                )}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-300/40 group-focus-within:text-gold-400 transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="SEARCH PERSONNEL..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-hawks-base border border-white/10 rounded-2xl py-3 pl-12 pr-6 text-xs font-bold text-white placeholder:text-amber-300/30 focus:outline-none focus:ring-2 focus:ring-hawks-gold/30 focus:border-hawks-gold/40 transition-all w-72 uppercase tracking-widest"
                        />
                    </div>
                </div>
            </div>

            {/* Table Container */}
            <div className="rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl bg-hawks-card">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-hawks-base border-b border-white/10">
                                <th className="px-6 py-5 text-left text-[11px] font-black text-amber-200/70 uppercase tracking-[0.2em]">RK</th>
                                <th className="px-6 py-5 text-left text-[11px] font-black text-amber-200/70 uppercase tracking-[0.2em] min-w-[240px]">Personnel</th>
                                <TableHeader label="AF SCORE" sortKey="af_avg" shortLabel="AF" />
                                <TableHeader label="RATING" sortKey="rating_points" shortLabel="R" />
                                <TableHeader label="GOALS" sortKey="goals_avg" shortLabel="G" />
                                <TableHeader label="DISPOSALS" sortKey="disposals_avg" shortLabel="D" />
                                <TableHeader label="MARKS" sortKey="marks_avg" shortLabel="M" />
                                <TableHeader label="TACKLES" sortKey="tackles_avg" shortLabel="T" />
                                <TableHeader label="CLEARANCES" sortKey="clearances_avg" shortLabel="CLR" />
                                <TableHeader label="KICKS" sortKey="kicks_avg" shortLabel="K" />
                                <TableHeader label="HANDBALLS" sortKey="handballs_avg" shortLabel="H" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {sortedStats.map((player, index) => (
                                <tr
                                    key={player.jumper_no}
                                    className={clsx(
                                        "transition-colors group cursor-default",
                                        index % 2 === 0 ? "bg-transparent" : "bg-white/[0.02]",
                                        "hover:bg-white/10"
                                    )}
                                >
                                    <td className="px-6 py-5">
                                        <span className="text-xs font-black text-amber-200/40 border-r border-white/10 pr-4">{index + 1}</span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-hfc-brown to-hfc-brown border border-hfc-brown/60 flex items-center justify-center text-sm font-black text-white shadow-xl shadow-hfc-brown/20 group-hover:scale-110 transition-transform">
                                                {player.jumper_no}
                                            </div>
                                            <div>
                                                <div className="text-base font-black text-white group-hover:text-gold-400 transition-colors uppercase tracking-tight">{player.name}</div>
                                                <div className="text-[10px] font-bold text-amber-300/70 uppercase tracking-[0.15em]">{player.position}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className={clsx("px-4 py-5 text-center font-black text-sm transition-all", sortConfig.key === 'af_avg' ? "text-gold-400" : "text-white/90")}>{player.af_avg}</td>
                                    <td className={clsx("px-4 py-5 text-center font-black text-sm transition-all", sortConfig.key === 'rating_points' ? "text-gold-400" : "text-white/90")}>{player.rating_points}</td>
                                    <td className={clsx("px-4 py-5 text-center font-black text-sm transition-all", sortConfig.key === 'goals_avg' ? "text-gold-400" : "text-white/90")}>{player.goals_avg}</td>
                                    <td className={clsx(
                                        "px-4 py-5 text-center font-black transition-all",
                                        sortConfig.key === 'disposals_avg' ? "text-gold-400 text-base" : "text-white/90 text-sm"
                                    )}>
                                        {player.disposals_avg}
                                    </td>
                                    <td className={clsx("px-4 py-5 text-center font-black text-sm transition-all", sortConfig.key === 'marks_avg' ? "text-gold-400" : "text-white/90")}>{player.marks_avg}</td>
                                    <td className={clsx("px-4 py-5 text-center font-black text-sm transition-all", sortConfig.key === 'tackles_avg' ? "text-gold-400" : "text-white/90")}>{player.tackles_avg}</td>
                                    <td className={clsx("px-4 py-5 text-center font-black text-sm transition-all", sortConfig.key === 'clearances_avg' ? "text-gold-400" : "text-white/90")}>{player.clearances_avg}</td>
                                    <td className={clsx("px-4 py-5 text-center font-black text-sm transition-all", sortConfig.key === 'kicks_avg' ? "text-gold-400" : "text-white/90")}>{player.kicks_avg}</td>
                                    <td className={clsx("px-4 py-5 text-center font-black text-sm transition-all", sortConfig.key === 'handballs_avg' ? "text-gold-400" : "text-white/90")}>{player.handballs_avg}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StatsPage;
