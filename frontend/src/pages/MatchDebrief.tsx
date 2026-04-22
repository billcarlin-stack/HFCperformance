import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Sparkles, AlertTriangle, TrendingUp, Users, Zap, Loader2, Activity } from 'lucide-react';

interface Match { match_id: string; match_name: string; match_date: string; round_name: string; venue_name: string; player_count: number; cached: boolean; }
interface Debrief {
    match_id: string; match_name: string; round_name: string; match_date: string;
    headline: string;
    key_points?: string[];
    key_performers: { player: string; summary: string }[];
    concerns: { player: string; issue: string }[];
    position_groups: { midfield: string; defence: string; forward: string; ruck: string };
    quarter_breakdown?: { summary: string; q1?: string; q2?: string; q3?: string; q4?: string };
    workrate_analysis?: string;
    fatigue_analysis?: string;
    tactical_observations?: string;
    recommendations: string[];
}

const MatchDebrief = () => {
    const [matches, setMatches] = useState<Match[]>([]);
    const [selectedMatch, setSelectedMatch] = useState('');
    const [debrief, setDebrief] = useState<Debrief | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get('/debrief/matches').then(r => {
            setMatches(r.data);
            if (r.data.length) setSelectedMatch(r.data[0].match_id);
        });
    }, []);

    const generateDebrief = async (force = false) => {
        if (!selectedMatch) return;
        setLoading(true);
        setError('');
        setDebrief(null);
        try {
            const r = await api.get(`/debrief/match/${selectedMatch}${force ? '?force=true' : ''}`);
            setDebrief(r.data);
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed to generate debrief');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-[900px] mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <Sparkles size={24} className="text-hawks-gold" />
                <h1 className="text-2xl font-black text-white">AI Match Debrief</h1>
            </div>

            {/* Match selector + generate button */}
            <div className="flex gap-3 items-center mb-6 flex-wrap">
                <select value={selectedMatch} onChange={e => { setSelectedMatch(e.target.value); setDebrief(null); }}
                    className="bg-hawks-card border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-hawks-gold flex-1 min-w-[200px]">
                    {matches.map(m => (
                        <option key={m.match_id} value={m.match_id}>
                            {m.round_name} — {m.match_name} ({m.match_date?.slice(0, 10)}) {m.cached ? '(cached)' : ''}
                        </option>
                    ))}
                </select>
                <button onClick={() => generateDebrief(false)} disabled={loading || !selectedMatch}
                    className="bg-hawks-gold text-hawks-base px-5 py-2 rounded-lg font-bold text-sm hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center gap-2">
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {loading ? 'Generating...' : 'Generate Debrief'}
                </button>
                {debrief && (
                    <button onClick={() => generateDebrief(true)} disabled={loading}
                        className="bg-hawks-card border border-white/10 text-gray-400 px-4 py-2 rounded-lg font-bold text-xs hover:text-white hover:border-white/20 transition-colors disabled:opacity-50">
                        Regenerate
                    </button>
                )}
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            )}

            {loading && (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 size={40} className="text-hawks-gold animate-spin" />
                    <p className="text-amber-300/50 text-sm font-bold uppercase tracking-widest">Analysing match data with AI...</p>
                    <p className="text-gray-500 text-xs">This takes 10-20 seconds</p>
                </div>
            )}

            {debrief && !loading && (
                <div className="space-y-5">
                    {/* Headline */}
                    <div className="bg-hawks-card rounded-xl border border-hawks-gold/20 p-5">
                        <div className="text-xs text-hawks-gold font-bold uppercase tracking-wider mb-1">{debrief.round_name} — {debrief.match_date?.slice(0, 10)}</div>
                        <h2 className="text-lg font-black text-white">{debrief.headline}</h2>
                    </div>

                    {/* Key Points */}
                    {debrief.key_points && debrief.key_points.length > 0 && (
                        <div className="bg-hawks-card rounded-xl border border-white/5 p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <Zap size={16} className="text-hawks-gold" />
                                <h3 className="text-sm font-bold text-hawks-gold uppercase tracking-wider">Key Points</h3>
                            </div>
                            <ul className="space-y-2">
                                {debrief.key_points.map((point, i) => (
                                    <li key={i} className="flex gap-2 text-sm">
                                        <span className="text-hawks-gold font-bold mt-0.5">-</span>
                                        <span className="text-gray-200">{point}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Key Performers */}
                    <div className="bg-hawks-card rounded-xl border border-white/5 p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp size={16} className="text-emerald-400" />
                            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">Key Performers</h3>
                        </div>
                        <div className="space-y-3">
                            {debrief.key_performers.map((kp, i) => (
                                <div key={i} className="flex gap-3">
                                    <div className="text-hawks-gold font-black text-sm min-w-[120px]">{kp.player}</div>
                                    <div className="text-gray-300 text-sm">{kp.summary}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Concerns */}
                    {debrief.concerns.length > 0 && (
                        <div className="bg-hawks-card rounded-xl border border-white/5 p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertTriangle size={16} className="text-amber-400" />
                                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Concerns</h3>
                            </div>
                            <div className="space-y-3">
                                {debrief.concerns.map((c, i) => (
                                    <div key={i} className="flex gap-3">
                                        <div className="text-red-400 font-bold text-sm min-w-[120px]">{c.player}</div>
                                        <div className="text-gray-300 text-sm">{c.issue}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Position Groups */}
                    <div className="bg-hawks-card rounded-xl border border-white/5 p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Users size={16} className="text-blue-400" />
                            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider">Position Groups</h3>
                        </div>
                        <div className="space-y-3">
                            {Object.entries(debrief.position_groups).map(([group, analysis]) => (
                                <div key={group}>
                                    <div className="text-hawks-gold text-xs font-bold uppercase mb-1">{group}</div>
                                    <p className="text-gray-300 text-sm">{analysis}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quarter Breakdown */}
                    {debrief.quarter_breakdown && (
                        <div className="bg-hawks-card rounded-xl border border-white/5 p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <Zap size={16} className="text-orange-400" />
                                <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wider">Quarter Breakdown</h3>
                            </div>
                            <p className="text-gray-300 text-sm mb-3">{debrief.quarter_breakdown.summary}</p>
                            <div className="grid grid-cols-4 gap-2">
                                {(['q1', 'q2', 'q3', 'q4'] as const).map((q, i) => (
                                    <div key={q} className="bg-white/5 rounded-lg p-2.5">
                                        <div className="text-[10px] font-bold text-hawks-gold mb-1">Q{i + 1}</div>
                                        <p className="text-[11px] text-gray-300">{debrief.quarter_breakdown?.[q] || '—'}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Workrate Analysis */}
                    {debrief.workrate_analysis && (
                        <div className="bg-hawks-card rounded-xl border border-white/5 p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <Activity size={16} className="text-purple-400" />
                                <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider">Workrate Analysis</h3>
                            </div>
                            <p className="text-gray-300 text-sm">{debrief.workrate_analysis}</p>
                        </div>
                    )}

                    {/* Fallback for old format */}
                    {debrief.fatigue_analysis && !debrief.quarter_breakdown && (
                        <div className="bg-hawks-card rounded-xl border border-white/5 p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <Zap size={16} className="text-orange-400" />
                                <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wider">Fatigue Analysis</h3>
                            </div>
                            <p className="text-gray-300 text-sm">{debrief.fatigue_analysis}</p>
                        </div>
                    )}

                    {/* Recommendations */}
                    <div className="bg-hawks-card rounded-xl border border-hawks-gold/20 p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles size={16} className="text-hawks-gold" />
                            <h3 className="text-sm font-bold text-hawks-gold uppercase tracking-wider">Recommendations</h3>
                        </div>
                        <ul className="space-y-2">
                            {debrief.recommendations.map((rec, i) => (
                                <li key={i} className="flex gap-2 text-sm">
                                    <span className="text-hawks-gold font-bold">{i + 1}.</span>
                                    <span className="text-gray-300">{rec}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MatchDebrief;
