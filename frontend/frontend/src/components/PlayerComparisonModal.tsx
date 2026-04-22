import React, { useEffect, useState } from 'react';
import { ApiService } from '../services/api';
import type { Player, RatingResponse } from '../services/api';
import { X, Swords } from 'lucide-react';
import clsx from 'clsx';
import { formatPlayerImage } from '../services/api';

interface PlayerComparisonModalProps {
    p1: Player;
    p2: Player;
    opponentContext: string;
    onClose: () => void;
}

interface SkillComparisonRow {
    category: string;
    skill: string;
    p1Value: number;
    p2Value: number;
}

const PlayerComparisonModal: React.FC<PlayerComparisonModalProps> = ({ p1, p2, onClose }) => {
    const [ratingsData, setRatingsData] = useState<{ p1Ratings: RatingResponse, p2Ratings: RatingResponse } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRatings = async () => {
            setLoading(true);
            try {
                const [p1Res, p2Res] = await Promise.all([
                    ApiService.getRatings(p1.jumper_no),
                    ApiService.getRatings(p2.jumper_no)
                ]);
                setRatingsData({ p1Ratings: p1Res, p2Ratings: p2Res });
            } catch (err) {
                console.error("Failed to fetch player ratings", err);
            } finally {
                setLoading(false);
            }
        };
        fetchRatings();
    }, [p1, p2]);

    const comparisonRows: { category: string, rows: SkillComparisonRow[] }[] = React.useMemo(() => {
        if (!ratingsData) return [];
        // Extract categories
        const categoriesSet = new Set<string>();
        ratingsData.p1Ratings.ratings.forEach(r => categoriesSet.add(r.category));
        ratingsData.p2Ratings.ratings.forEach(r => categoriesSet.add(r.category));

        const categories = Array.from(categoriesSet).sort();
        
        return categories.map(category => {
            const p1Skills = ratingsData.p1Ratings.ratings.filter(r => r.category === category);
            const p2Skills = ratingsData.p2Ratings.ratings.filter(r => r.category === category);
            
            // Collect all unique skills in this category
            const skillsSet = new Set<string>();
            p1Skills.forEach(r => skillsSet.add(r.skill));
            p2Skills.forEach(r => skillsSet.add(r.skill));
            
            const rows: SkillComparisonRow[] = Array.from(skillsSet).map(skill => {
                const p1Match = p1Skills.find(r => r.skill === skill);
                const p2Match = p2Skills.find(r => r.skill === skill);
                return {
                    category,
                    skill,
                    p1Value: p1Match ? p1Match.coach_rating : 0,
                    p2Value: p2Match ? p2Match.coach_rating : 0
                };
            }).sort((a, b) => a.skill.localeCompare(b.skill));
            
            return { category, rows };
        });
    }, [ratingsData]);

    const PlayerCard = ({ player, color }: { player: Player, color: string }) => (
        <div className="flex flex-col items-center p-4 bg-white/[0.02] border border-white/5 rounded-2xl shrink-0 w-48">
            <img 
                src={formatPlayerImage(player.jumper_no, player.photo_url, player.name)}
                alt={player.name}
                className={clsx("w-20 h-20 rounded-full border-2 object-cover object-top", color)}
                onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = formatPlayerImage(player.jumper_no, undefined, player.name);
                }}
            />
            <h3 className="text-white font-black uppercase text-sm mt-3 tracking-tight text-center">{player.name}</h3>
            <p className="text-amber-300/50 text-[10px] font-bold uppercase tracking-widest mt-0.5">#{player.jumper_no} · {player.position}</p>
            <div className="flex gap-2 mt-3 text-[10px] uppercase font-black tracking-widest text-white/40">
                <span>{player.age || '25'} YRS</span>
                <span>•</span>
                <span>{player.games || '0'} GMS</span>
            </div>
            {player.status && (
                <div className={clsx(
                    "mt-3 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border",
                    player.status === 'Green' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                    player.status === 'Amber' ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/30" :
                    "bg-red-500/10 text-red-400 border-red-500/30"
                )}>
                    {player.status === 'Green' ? 'Fit' : player.status === 'Amber' ? 'Test' : 'Out'}
                </div>
            )}
        </div>
    );

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 fade-in duration-200">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-5xl bg-gradient-to-br from-[#0a1828] to-[#040e18] rounded-[2rem] border border-white/15 shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/[0.02]">
                    <div>
                        <div className="flex items-center gap-2">
                            <Swords size={18} className="text-gold-400" />
                            <h2 className="text-xl font-black text-white uppercase font-outfit tracking-tight">Coach Rating Comparison</h2>
                        </div>
                        <p className="text-[11px] text-amber-300/50 font-bold uppercase tracking-widest mt-1">
                            Technical, Tactical, Physical & Mental Assessment
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
                        <X size={18} className="text-white/50" />
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-[10px] font-black text-gold-400 uppercase tracking-widest animate-pulse">Gathering Ratings...</div>
                        </div>
                    ) : (
                        <div className="flex flex-col lg:flex-row gap-8 items-start">
                            
                            {/* P1 Column */}
                            <PlayerCard player={p1} color="border-gold-400 shadow-[0_0_15px_rgba(246,176,0,0.3)]" />
                            
                            {/* Ratings Comparison */}
                            <div className="flex-1 w-full flex flex-col gap-6">
                                {comparisonRows.map(({ category, rows }) => (
                                    <div key={category} className="bg-white/[0.02] rounded-2xl p-5 border border-white/5 shadow-inner">
                                        <h4 className="text-white/40 uppercase font-black text-xs tracking-widest text-center mb-5">{category} Attributes</h4>
                                        <div className="flex flex-col gap-4">
                                            {rows.map(row => {
                                                const maxVal = 10;
                                                const isP1Better = row.p1Value > row.p2Value;
                                                const isP2Better = row.p2Value > row.p1Value;

                                                return (
                                                    <div key={row.skill} className="flex items-center gap-2 sm:gap-4 group">
                                                        {/* P1 Bar */}
                                                        <div className="flex-1 flex justify-end items-center gap-3">
                                                            <span className={clsx("text-xs transition-colors w-6 text-right", isP1Better ? "text-gold-400 font-black drop-shadow-[0_0_5px_rgba(246,176,0,0.5)]" : "text-white/40 font-bold")}>
                                                                {row.p1Value > 0 ? row.p1Value : '-'}
                                                            </span>
                                                            <div className="h-1.5 sm:h-2 bg-black/40 rounded-full w-full max-w-[120px] sm:max-w-[160px] overflow-hidden flex justify-end transform transition-transform group-hover:scale-[1.02]">
                                                                <div 
                                                                    className={clsx("h-full transition-all duration-700 ease-out", isP1Better ? "bg-gold-400 shadow-[0_0_8px_#F6B000]" : "bg-gold-400/30")}
                                                                    style={{ width: `${(row.p1Value / maxVal) * 100}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Skill Label */}
                                                        <div className="w-[110px] sm:w-[140px] text-center text-[9px] sm:text-[10px] uppercase font-black tracking-widest text-white/50 shrink-0 leading-tight group-hover:text-white transition-colors">
                                                            {row.skill}
                                                        </div>

                                                        {/* P2 Bar */}
                                                        <div className="flex-1 flex justify-start items-center gap-3">
                                                            <div className="h-1.5 sm:h-2 bg-black/40 rounded-full w-full max-w-[120px] sm:max-w-[160px] overflow-hidden flex justify-start transform transition-transform group-hover:scale-[1.02]">
                                                                <div 
                                                                    className={clsx("h-full bg-amber-600 transition-all duration-700 ease-out", isP2Better ? "bg-amber-500 shadow-[0_0_8px_rgba(217,119,6,0.8)]" : "bg-amber-600/30")}
                                                                    style={{ width: `${(row.p2Value / maxVal) * 100}%` }}
                                                                />
                                                            </div>
                                                            <span className={clsx("text-xs transition-colors w-6 text-left", isP2Better ? "text-amber-500 font-black drop-shadow-[0_0_5px_rgba(217,119,6,0.5)]" : "text-white/40 font-bold")}>
                                                                {row.p2Value > 0 ? row.p2Value : '-'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                                {comparisonRows.length === 0 && !loading && (
                                    <div className="text-center text-white/40 text-xs font-bold uppercase tracking-widest mt-10">
                                        No coach ratings available for comparison.
                                    </div>
                                )}
                            </div>

                            {/* P2 Column */}
                            <PlayerCard player={p2} color="border-amber-600 shadow-[0_0_15px_rgba(217,119,6,0.3)]" />

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PlayerComparisonModal;
