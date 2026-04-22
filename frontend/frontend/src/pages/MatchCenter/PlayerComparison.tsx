import { useEffect, useState, useMemo } from 'react';
import { ApiService, formatPlayerImage } from '../../services/api';
import type { Player, PlayerStats, RatingResponse } from '../../services/api';
import { Search, Sword, X, ChevronRight, Activity, TrendingUp, Users, Target, Zap, Shield, Brain, Award } from 'lucide-react';
import clsx from 'clsx';

const PlayerComparison = () => {
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [p1, setP1] = useState<Player | null>(null);
    const [p2, setP2] = useState<Player | null>(null);
    const [p1Stats, setP1Stats] = useState<PlayerStats | null>(null);
    const [p2Stats, setP2Stats] = useState<PlayerStats | null>(null);
    const [p1Ratings, setP1Ratings] = useState<RatingResponse | null>(null);
    const [p2Ratings, setP2Ratings] = useState<RatingResponse | null>(null);
    const [fetchingComparison, setFetchingComparison] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        ApiService.getPlayers()
            .then(setPlayers)
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        const fetchComparison = async () => {
            if (p1 && p2) {
                setFetchingComparison(true);
                try {
                    const [s1, s2, r1, r2] = await Promise.all([
                        ApiService.getStats2025({ jumper_no: p1.jumper_no }),
                        ApiService.getStats2025({ jumper_no: p2.jumper_no }),
                        ApiService.getRatings(p1.jumper_no),
                        ApiService.getRatings(p2.jumper_no)
                    ]);
                    setP1Stats(Array.isArray(s1) && s1.length > 0 ? s1[0] : null);
                    setP2Stats(Array.isArray(s2) && s2.length > 0 ? s2[0] : null);
                    setP1Ratings(r1);
                    setP2Ratings(r2);
                } catch (err) {
                    console.error("Failed to fetch comparison data", err);
                } finally {
                    setFetchingComparison(false);
                }
            } else {
                setP1Stats(null);
                setP2Stats(null);
                setP1Ratings(null);
                setP2Ratings(null);
            }
        };
        fetchComparison();
    }, [p1, p2]);

    const filteredPlayers = useMemo(() => {
        return players.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.jumper_no.toString().includes(searchTerm)
        );
    }, [players, searchTerm]);

    const statsRows = useMemo(() => {
        if (!p1Stats || !p2Stats) return [];
        return [
            { label: 'AF Score', key: 'af_avg', icon: <Target size={14} /> },
            { label: 'Rating', key: 'rating_points', icon: <Award size={14} /> },
            { label: 'Goals', key: 'goals_avg', icon: <Activity size={14} /> },
            { label: 'Disposals', key: 'disposals_avg', icon: <Zap size={14} /> },
            { label: 'Marks', key: 'marks_avg', icon: <TrendingUp size={14} /> },
            { label: 'Tackles', key: 'tackles_avg', icon: <Shield size={14} /> },
            { label: 'Clearances', key: 'clearances_avg', icon: <Activity size={14} /> },
            { label: 'Kicks', key: 'kicks_avg', icon: <Zap size={14} /> },
            { label: 'Handballs', key: 'handballs_avg', icon: <Activity size={14} /> }
        ].map(s => ({
            label: s.label,
            icon: s.icon,
            p1Value: p1Stats[s.key as keyof PlayerStats] ?? 0,
            p2Value: p2Stats[s.key as keyof PlayerStats] ?? 0
        }));
    }, [p1Stats, p2Stats]);

    const ratingsRows = useMemo(() => {
        if (!p1Ratings || !p2Ratings || !p1 || !p2) return [];
        const categories = Array.from(new Set([
            ...p1Ratings.ratings.map(r => r.category),
            ...p2Ratings.ratings.map(r => r.category)
        ])).sort();

        return categories.map(cat => ({
            category: cat,
            skills: Array.from(new Set([
                ...p1Ratings.ratings.filter(r => r.category === cat).map(r => r.skill),
                ...p2Ratings.ratings.filter(r => r.category === cat).map(r => r.skill)
            ])).map(skill => ({
                skill,
                p1Value: p1Ratings.ratings.find(r => r.category === cat && r.skill === skill)?.coach_rating ?? 0,
                p2Value: p2Ratings.ratings.find(r => r.category === cat && r.skill === skill)?.coach_rating ?? 0
            }))
        }));
    }, [p1Ratings, p2Ratings, p1, p2]);

    const ComparisonRow = ({ label, p1Val, p2Val, icon, isRating = false, isText = false }: { label: string, p1Val: any, p2Val: any, icon?: React.ReactNode, isRating?: boolean, isText?: boolean }) => {
        if (isText) {
            return (
                <div className="flex items-center gap-4 py-3 group border-b border-white/5 last:border-0">
                    <div className="flex-1 flex justify-end items-center gap-3">
                        <span className="text-sm text-gray-100 font-black">{p1Val || '-'}</span>
                    </div>
                    <div className="w-[120px] text-center flex flex-col items-center gap-1">
                        {icon && <div className="text-gray-400 transition-colors">{icon}</div>}
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 group-hover:text-gray-100 transition-colors">{label}</span>
                    </div>
                    <div className="flex-1 flex justify-start items-center gap-3">
                        <span className="text-sm text-gray-100 font-black">{p2Val || '-'}</span>
                    </div>
                </div>
            );
        }

        const p1N = Number(p1Val) || 0;
        const p2N = Number(p2Val) || 0;
        const isP1Better = p1N > p2N;
        const isP2Better = p2N > p1N;
        const maxVal = isRating ? 10 : Math.max(p1N, p2N, 1);

        return (
            <div className="flex items-center gap-4 py-3 group border-b border-white/5 last:border-0">
                {/* P1 Bar */}
                <div className="flex-1 flex justify-end items-center gap-3">
                    <span className={clsx("text-sm transition-colors", isP1Better ? "text-hawks-gold font-black" : "text-gray-400 font-bold")}>
                        {p1N > 0 ? p1N : '-'}
                    </span>
                    <div className="h-2 bg-white/10 rounded-full w-full max-w-[140px] overflow-hidden flex justify-end">
                        <div
                            className={clsx("h-full transition-all duration-700", isP1Better ? "bg-hawks-gold shadow-[0_0_10px_#F6B000]" : "bg-hawks-gold/20")}
                            style={{ width: `${(p1N / maxVal) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Label */}
                <div className="w-[120px] text-center flex flex-col items-center gap-1">
                    {icon && <div className="text-gray-400 group-hover:text-hawks-gold/80 transition-colors">{icon}</div>}
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 group-hover:text-gray-100 transition-colors">{label}</span>
                </div>

                {/* P2 Bar */}
                <div className="flex-1 flex justify-start items-center gap-3">
                    <div className="h-2 bg-white/10 rounded-full w-full max-w-[140px] overflow-hidden flex justify-start">
                        <div
                            className={clsx("h-full transition-all duration-700", isP2Better ? "bg-hawks-gold shadow-[0_0_10px_#F6B000]" : "bg-hawks-gold/20")}
                            style={{ width: `${(p2N / maxVal) * 100}%` }}
                        />
                    </div>
                    <span className={clsx("text-sm transition-colors", isP2Better ? "text-hawks-gold font-black" : "text-gray-400 font-bold")}>
                        {p2N > 0 ? p2N : '-'}
                    </span>
                </div>
            </div>
        );
    };

    const PlayerSelector = ({ selected, onSelect, label, side }: { selected: Player | null, onSelect: (p: Player | null) => void, label: string, side: 'A' | 'B' }) => (
        <div className="flex-1 min-w-[300px] flex flex-col gap-4">
            <div className="flex items-center justify-between px-4">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">{label}</span>
                {selected && (
                    <button onClick={() => onSelect(null)} className="text-[10px] font-black text-red-400/80 uppercase hover:text-red-400 transition-colors">Reset</button>
                )}
            </div>

            {selected ? (
                <div className={clsx(
                    "p-6 rounded-3xl border animate-in zoom-in-95 duration-300 overflow-hidden relative group shadow-2xl",
                    side === 'A' ? "bg-gradient-to-br from-hawks-gold/80 to-hawks-gold/60 border-white/10" : "bg-gradient-to-br from-hawks-gold/70 to-hawks-gold/50 border-white/10"
                )}>
                    <div className="flex items-center gap-6">
                        <div className="relative shrink-0">
                            <img
                                src={formatPlayerImage(selected.jumper_no, selected.photo_url, selected.name)}
                                className={clsx("h-24 w-24 rounded-2xl object-cover relative z-10 border-2 filter grayscale-[15%] sepia-[0.35] brightness-95", side === 'A' ? "border-hawks-base" : "border-hawks-base/60")}
                                alt={selected.name}
                            />
                            <div className={clsx("absolute -bottom-2 -right-2 font-black text-sm px-3 py-1.5 rounded-xl z-20 shadow-xl", side === 'A' ? "bg-hawks-base text-hawks-gold" : "bg-hawks-base/80 text-hawks-gold")}>#{selected.jumper_no}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-2xl font-black text-hawks-base uppercase tracking-tight truncate">{selected.name}</h3>
                            <div className="flex gap-6 mt-4">
                                <div>
                                    <div className="text-[10px] text-hawks-base/50 font-black uppercase tracking-widest">Games</div>
                                    <div className="text-lg font-black text-hawks-base">{selected.games}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-hawks-base/50 font-black uppercase tracking-widest">Age</div>
                                    <div className="text-lg font-black text-hawks-base">{selected.age}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 bg-white/5 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center p-8 gap-4 text-center hover:bg-white/10 transition-colors cursor-pointer group" onClick={() => document.getElementById('player-search')?.focus()}>
                    <div className="h-16 w-16 rounded-2xl bg-white/10 flex items-center justify-center text-gray-400 group-hover:scale-110 transition-transform">
                        <Users size={32} />
                    </div>
                    <div>
                        <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Select Player {side}</p>
                        <p className="text-[11px] text-gray-500 font-bold mt-1 uppercase tracking-widest">Use the squad list to choose subjects</p>
                    </div>
                </div>
            )}
        </div>
    );

    if (loading) return <div className="p-20 text-center text-gray-400 uppercase font-black tracking-widest animate-pulse">Initializing Comparison Core...</div>;

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-12 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-10">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-hawks-gold p-2 rounded-lg text-hawks-base">
                            <Sword size={24} />
                        </div>
                        <span className="text-xs font-black text-gray-400 uppercase tracking-[0.4em]">Strategic Match Center</span>
                    </div>
                    <h1 className="text-7xl font-black text-gray-100 uppercase font-outfit tracking-tighter leading-none" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        Player <span className="text-hawks-base bg-hawks-gold px-4 rounded-2xl inline-block -rotate-2 transform shadow-lg">Comparison</span>
                    </h1>
                </div>

            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_2.5fr] gap-12 items-start">
                {/* Search & List */}
                <div className="space-y-6">
                    <div className="relative">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            id="player-search"
                            type="text"
                            placeholder="SEARCH SQUAD..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-hawks-card border-2 border-white/10 rounded-[2rem] py-6 pl-16 pr-6 text-base text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-hawks-gold/50 transition-all font-black uppercase tracking-widest shadow-sm"
                        />
                    </div>

                    <div className="bg-hawks-card border border-white/10 rounded-[2.5rem] overflow-hidden shadow-inner p-4 space-y-2 max-h-[700px] overflow-y-auto custom-scrollbar">
                        <div className="px-4 py-2 mb-2">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Active Roster</span>
                        </div>
                        {filteredPlayers.map(player => {
                            const isP1 = p1?.jumper_no === player.jumper_no;
                            const isP2 = p2?.jumper_no === player.jumper_no;
                            return (
                                <button
                                    key={player.jumper_no}
                                    onClick={() => {
                                        if (isP1) setP1(null);
                                        else if (isP2) setP2(null);
                                        else if (!p1) setP1(player);
                                        else if (!p2) setP2(player);
                                    }}
                                    className={clsx(
                                        "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300",
                                        isP1 ? "bg-hawks-gold/80 border-hawks-gold text-hawks-base shadow-md translate-x-1" :
                                        isP2 ? "bg-hawks-gold/70 border-hawks-gold/80 text-hawks-base shadow-md translate-x-1" :
                                        "bg-transparent border-transparent text-gray-100 hover:bg-hawks-hover hover:border-white/10"
                                    )}
                                >
                                    <div className={clsx(
                                        "h-12 w-12 rounded-xl flex items-center justify-center font-black text-sm shrink-0",
                                        isP1 || isP2 ? "bg-hawks-base text-hawks-gold" : "bg-white/10 text-gray-400"
                                    )}>
                                        {player.jumper_no}
                                    </div>
                                    <div className="text-left flex-1 min-w-0">
                                        <div className={clsx("text-sm font-black uppercase tracking-tight truncate", isP1 || isP2 ? "text-hawks-base" : "text-gray-100")}>{player.name}</div>
                                    </div>
                                    {(isP1 || isP2) ? (
                                        <div className="h-6 w-6 rounded-full bg-black/20 flex items-center justify-center text-hawks-base"><X size={14} /></div>
                                    ) : (
                                        <ChevronRight size={16} className="text-gray-500 group-hover:text-gray-300 transition-colors" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Comparison Display */}
                <div className="space-y-12">
                     {/* Selection Cards */}
                    <div className="flex flex-col sm:flex-row gap-8 items-stretch">
                        <PlayerSelector 
                            label="Comparison Subject A" 
                            side="A" 
                            selected={p1} 
                            onSelect={setP1} 
                        />
                        <PlayerSelector 
                            label="Comparison Subject B" 
                            side="B" 
                            selected={p2} 
                            onSelect={setP2} 
                        />
                    </div>

                    <div className="bg-hawks-card rounded-[3rem] border border-white/5 p-10 shadow-lg relative overflow-hidden min-h-[600px]">
                        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-hawks-gold/10 blur-[120px]" />
                        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-hawks-gold/5 blur-[120px]" />

                        {fetchingComparison ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-hawks-card/80 backdrop-blur-sm z-10 rounded-[3rem]">
                                <Activity className="text-hawks-gold animate-spin" size={48} />
                                <p className="text-xs font-black uppercase tracking-[0.5em] text-gray-100 animate-pulse">Running Projections...</p>
                            </div>
                        ) : p1 && p2 && p1Stats && p2Stats && p1Ratings && p2Ratings ? (
                            <div className="space-y-16 py-4 relative z-10">
                                {/* Physical Profile Section */}
                                <div>
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent to-white/10" />
                                        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-6 py-2 rounded-full">
                                            <Users size={16} className="text-gray-100" />
                                            <h2 className="text-lg font-black text-gray-100 uppercase tracking-widest">Physical Profile</h2>
                                        </div>
                                        <div className="h-0.5 flex-1 bg-gradient-to-l from-transparent to-white/10" />
                                    </div>
                                    <div className="flex flex-col">
                                        <ComparisonRow label="Height (cm)" p1Val={p1.height_cm} p2Val={p2.height_cm} />
                                        <ComparisonRow label="Weight (kg)" p1Val={p1.weight_kg} p2Val={p2.weight_kg} />
                                        <ComparisonRow label="Origin" p1Val={p1.originally_from} p2Val={p2.originally_from} isText />
                                    </div>
                                </div>

                                {/* Match Statistics Section */}
                                <div>
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent to-white/10" />
                                        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-6 py-2 rounded-full">
                                            <TrendingUp size={16} className="text-gray-100" />
                                            <h2 className="text-lg font-black text-gray-100 uppercase tracking-widest">Match Statistics</h2>
                                        </div>
                                        <div className="h-0.5 flex-1 bg-gradient-to-l from-transparent to-white/10" />
                                    </div>
                                    <div className="flex flex-col">
                                        {statsRows.map(row => (
                                            <ComparisonRow
                                                key={row.label}
                                                label={row.label}
                                                p1Val={row.p1Value}
                                                p2Val={row.p2Value}
                                                icon={row.icon}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Coach Ratings Section */}
                                {ratingsRows.map(cat => (
                                    <div key={cat.category}>
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent to-white/10" />
                                            <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-6 py-2 rounded-full">
                                                <Brain size={16} className="text-gray-100" />
                                                <h2 className="text-lg font-black text-gray-100 uppercase tracking-widest">{cat.category} Assessment</h2>
                                            </div>
                                            <div className="h-0.5 flex-1 bg-gradient-to-l from-transparent to-white/10" />
                                        </div>
                                        <div className="flex flex-col">
                                            {cat.skills.map(row => (
                                                <ComparisonRow
                                                    key={row.skill}
                                                    label={row.skill}
                                                    p1Val={row.p1Value}
                                                    p2Val={row.p2Value}
                                                    isRating
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex-1 min-h-[500px] flex flex-col items-center justify-center gap-8 text-center p-12 relative z-10">
                                <div className="h-32 w-32 rounded-[2.5rem] bg-white/5 border-2 border-white/10 flex items-center justify-center text-gray-500 group shadow-inner">
                                    <Sword size={64} className="group-hover:rotate-12 group-hover:text-hawks-gold transition-all duration-500" />
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-4xl font-black text-gray-100 uppercase tracking-tight">System Ready</h3>
                                    <p className="text-sm text-gray-400 font-bold uppercase tracking-widest max-w-[400px] leading-relaxed">
                                        Select two athletes to generate a comprehensive <span className="text-hawks-gold font-black">Player Comparison</span>.
                                    </p>
                                </div>
                                <div className="flex gap-4">
                                    <div className="h-1 w-20 bg-white/10 rounded-full" />
                                    <div className="h-1 w-4 bg-hawks-gold rounded-full" />
                                    <div className="h-1 w-20 bg-white/10 rounded-full" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerComparison;
