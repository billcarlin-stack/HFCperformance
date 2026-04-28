import { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
    Sparkles, AlertTriangle, TrendingUp, Users, Zap, Loader2, Activity,
    Shield, Target, Crosshair, GitBranch, BookOpen, ClipboardList, Eye,
} from 'lucide-react';

interface Match {
    match_id: string; match_name: string; match_date: string; round_name: string;
    venue_name: string; player_count: number; cached: boolean;
}

interface CoachLine {
    story_of_game: string;
    positives: string[];
    rfis: string[];
    recommendations: string[];
}

interface Debrief {
    match_id: string;
    match_name: string;
    round_name: string;
    match_date: string;
    schema_version?: number;

    // Score
    hawks_score?: string;
    opp_name?: string;
    opp_score?: string;

    // v2 schema
    headline: string;
    score_summary?: string;
    copilot_themes?: string[];
    coach_summaries?: {
        midfield_stoppages: CoachLine;
        contest: CoachLine;
        defenders: CoachLine;
        forwards: CoachLine;
    };
    structure?: {
        d50: string; bta: string; f50: string;
        kick_in_defence: string; kick_ins: string;
        recommendations?: string[];
    };
    oppo?: { what_worked: string[]; learnings: string[] };
    development?: { positives: string[]; rfis: string[]; recommendations: string[] };
    review_focuses?: Record<string, string[]>;
    physical_summary?: {
        headline?: string;
        team_workrate?: string;
        quarter_curve?: { summary?: string; q1?: string; q2?: string; q3?: string; q4?: string };
        key_performers?: { player: string; summary: string }[];
        concerns?: { player: string; issue: string }[];
    };
    recurring_themes?: string[];

    // v1 fallback
    key_points?: string[];
    key_performers?: { player: string; summary: string }[];
    concerns?: { player: string; issue: string }[];
    position_groups?: { midfield?: string; defence?: string; forward?: string; ruck?: string };
    quarter_breakdown?: { summary?: string; q1?: string; q2?: string; q3?: string; q4?: string };
    workrate_analysis?: string;
    recommendations?: string[];
}

const Card = ({ icon, title, color, children }: any) => (
    <div className="bg-hawks-card rounded-xl border border-white/5 p-5">
        <div className="flex items-center gap-2 mb-3">
            <span className={color}>{icon}</span>
            <h3 className={`text-sm font-bold uppercase tracking-wider ${color}`}>{title}</h3>
        </div>
        {children}
    </div>
);

const BulletList = ({ items, accent = 'text-hawks-gold' }: { items?: string[]; accent?: string }) => {
    if (!items?.length) return null;
    return (
        <ul className="space-y-1.5">
            {items.map((b, i) => (
                <li key={i} className="flex gap-2 text-sm">
                    <span className={`${accent} font-bold mt-0.5`}>-</span>
                    <span className="text-gray-200">{b}</span>
                </li>
            ))}
        </ul>
    );
};

const CoachLineCard = ({ title, line, icon }: { title: string; line?: CoachLine; icon: any }) => {
    if (!line) return null;
    return (
        <div className="bg-hawks-card rounded-xl border border-white/5 p-5">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-hawks-gold">{icon}</span>
                <h3 className="text-sm font-bold text-hawks-gold uppercase tracking-wider">{title}</h3>
            </div>
            {line.story_of_game && <p className="text-gray-200 text-sm mb-4 leading-relaxed">{line.story_of_game}</p>}
            <div className="grid md:grid-cols-3 gap-4">
                <div>
                    <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2">Positives</div>
                    <BulletList items={line.positives} accent="text-emerald-400" />
                </div>
                <div>
                    <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-2">RFIs</div>
                    <BulletList items={line.rfis} accent="text-amber-400" />
                </div>
                <div>
                    <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Recommendations</div>
                    <BulletList items={line.recommendations} accent="text-blue-400" />
                </div>
            </div>
        </div>
    );
};

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

    const isV2 = debrief && (debrief.schema_version === 2 || debrief.coach_summaries);

    return (
        <div className="p-6 max-w-[1100px] mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <Sparkles size={24} className="text-hawks-gold" />
                <h1 className="text-2xl font-black text-white">AI Match Debrief</h1>
            </div>

            <div className="flex gap-3 items-center mb-6 flex-wrap">
                <select
                    value={selectedMatch}
                    onChange={e => { setSelectedMatch(e.target.value); setDebrief(null); }}
                    className="bg-hawks-card border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-hawks-gold flex-1 min-w-[200px]"
                >
                    {matches.map(m => (
                        <option key={m.match_id} value={m.match_id}>
                            {m.round_name} — {m.match_name} ({m.match_date?.slice(0, 10)}) {m.cached ? '(cached)' : ''}
                        </option>
                    ))}
                </select>
                <button
                    onClick={() => generateDebrief(false)}
                    disabled={loading || !selectedMatch}
                    className="bg-hawks-gold text-hawks-base px-5 py-2 rounded-lg font-bold text-sm hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {loading ? 'Generating...' : 'Generate Debrief'}
                </button>
                {debrief && (
                    <button
                        onClick={() => generateDebrief(true)}
                        disabled={loading}
                        className="bg-hawks-card border border-white/10 text-gray-400 px-4 py-2 rounded-lg font-bold text-xs hover:text-white hover:border-white/20 transition-colors disabled:opacity-50"
                    >
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
                    <p className="text-amber-300/50 text-sm font-bold uppercase tracking-widest">
                        Analysing match data with AI...
                    </p>
                    <p className="text-gray-500 text-xs">This takes 30-60 seconds — pulling recent coach reports for context</p>
                </div>
            )}

            {debrief && !loading && (
                <div className="space-y-5">
                    {/* Headline + score */}
                    <div className="bg-hawks-card rounded-xl border border-hawks-gold/20 p-5">
                        <div className="flex justify-between items-start gap-4 flex-wrap mb-2">
                            <div className="text-xs text-hawks-gold font-bold uppercase tracking-wider">
                                {debrief.round_name} — {debrief.match_date?.slice(0, 10)}
                            </div>
                            {debrief.hawks_score && (
                                <div className="text-xs text-gray-400 font-mono">
                                    Hawks {debrief.hawks_score}
                                    {debrief.opp_name && debrief.opp_score && (
                                        <> &nbsp;vs&nbsp; {debrief.opp_name} {debrief.opp_score}</>
                                    )}
                                </div>
                            )}
                        </div>
                        <h2 className="text-lg font-black text-white">{debrief.headline}</h2>
                        {debrief.score_summary && (
                            <p className="text-gray-300 text-sm mt-2">{debrief.score_summary}</p>
                        )}
                    </div>

                    {/* Recurring themes */}
                    {isV2 && debrief.recurring_themes && debrief.recurring_themes.length > 0 && (
                        <Card icon={<Eye size={16} />} title="Recurring Themes" color="text-purple-400">
                            <BulletList items={debrief.recurring_themes} accent="text-purple-400" />
                        </Card>
                    )}

                    {/* Copilot themes */}
                    {isV2 && debrief.copilot_themes && debrief.copilot_themes.length > 0 && (
                        <Card icon={<Zap size={16} />} title="Copilot Summary" color="text-hawks-gold">
                            <ol className="space-y-3 list-decimal list-inside">
                                {debrief.copilot_themes.map((t, i) => (
                                    <li key={i} className="text-sm text-gray-200 leading-relaxed">{t}</li>
                                ))}
                            </ol>
                        </Card>
                    )}

                    {/* Coach summaries — 4 lines */}
                    {isV2 && debrief.coach_summaries && (
                        <>
                            <CoachLineCard
                                title="Midfield / Stoppages"
                                line={debrief.coach_summaries.midfield_stoppages}
                                icon={<GitBranch size={16} />}
                            />
                            <CoachLineCard
                                title="Contest"
                                line={debrief.coach_summaries.contest}
                                icon={<Crosshair size={16} />}
                            />
                            <CoachLineCard
                                title="Defenders / Back Half"
                                line={debrief.coach_summaries.defenders}
                                icon={<Shield size={16} />}
                            />
                            <CoachLineCard
                                title="Forwards / Hawks Ball"
                                line={debrief.coach_summaries.forwards}
                                icon={<Target size={16} />}
                            />
                        </>
                    )}

                    {/* Structure */}
                    {isV2 && debrief.structure && (
                        <Card icon={<GitBranch size={16} />} title="Structure" color="text-cyan-400">
                            <div className="grid md:grid-cols-2 gap-4">
                                {[
                                    ['D50', debrief.structure.d50],
                                    ['BTA', debrief.structure.bta],
                                    ['F50', debrief.structure.f50],
                                    ['Kick-In Defence', debrief.structure.kick_in_defence],
                                    ['Kick-Ins', debrief.structure.kick_ins],
                                ].map(([k, v]) => v ? (
                                    <div key={k}>
                                        <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-1">{k}</div>
                                        <p className="text-gray-200 text-sm">{v}</p>
                                    </div>
                                ) : null)}
                            </div>
                            {debrief.structure.recommendations && debrief.structure.recommendations.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-white/5">
                                    <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">
                                        Recommendations
                                    </div>
                                    <BulletList items={debrief.structure.recommendations} accent="text-blue-400" />
                                </div>
                            )}
                        </Card>
                    )}

                    {/* Oppo */}
                    {isV2 && debrief.oppo && (
                        <Card icon={<BookOpen size={16} />} title="Oppo" color="text-pink-400">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2">
                                        What Worked
                                    </div>
                                    <BulletList items={debrief.oppo.what_worked} accent="text-emerald-400" />
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-2">
                                        Learnings
                                    </div>
                                    <BulletList items={debrief.oppo.learnings} accent="text-amber-400" />
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Development */}
                    {isV2 && debrief.development && (
                        <Card icon={<TrendingUp size={16} />} title="Development" color="text-emerald-400">
                            <div className="grid md:grid-cols-3 gap-4">
                                <div>
                                    <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2">Positives</div>
                                    <BulletList items={debrief.development.positives} accent="text-emerald-400" />
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-2">RFIs</div>
                                    <BulletList items={debrief.development.rfis} accent="text-amber-400" />
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Recs</div>
                                    <BulletList items={debrief.development.recommendations} accent="text-blue-400" />
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Review focuses */}
                    {isV2 && debrief.review_focuses && Object.keys(debrief.review_focuses).length > 0 && (
                        <Card icon={<ClipboardList size={16} />} title="Review Focuses" color="text-yellow-300">
                            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {Object.entries(debrief.review_focuses).map(([coach, focuses]) => (
                                    <div key={coach} className="bg-white/5 rounded-lg p-3">
                                        <div className="text-yellow-300 text-xs font-black mb-1.5">{coach}</div>
                                        <ul className="space-y-1">
                                            {(focuses || []).map((f, i) => (
                                                <li key={i} className="text-[12px] text-gray-300 leading-snug">{f}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Physical summary (demoted GPS section) */}
                    {isV2 && debrief.physical_summary && (
                        <Card icon={<Activity size={16} />} title="Physical Summary" color="text-purple-400">
                            {debrief.physical_summary.headline && (
                                <p className="text-white font-bold text-sm mb-2">{debrief.physical_summary.headline}</p>
                            )}
                            {debrief.physical_summary.team_workrate && (
                                <p className="text-gray-300 text-sm mb-4">{debrief.physical_summary.team_workrate}</p>
                            )}
                            {debrief.physical_summary.quarter_curve && (
                                <div className="mb-4">
                                    {debrief.physical_summary.quarter_curve.summary && (
                                        <p className="text-gray-300 text-sm mb-2">{debrief.physical_summary.quarter_curve.summary}</p>
                                    )}
                                    <div className="grid grid-cols-4 gap-2">
                                        {(['q1', 'q2', 'q3', 'q4'] as const).map((q, i) => (
                                            <div key={q} className="bg-white/5 rounded-lg p-2.5">
                                                <div className="text-[10px] font-bold text-purple-400 mb-1">Q{i + 1}</div>
                                                <p className="text-[11px] text-gray-300">
                                                    {debrief.physical_summary?.quarter_curve?.[q] || '—'}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {debrief.physical_summary.key_performers && debrief.physical_summary.key_performers.length > 0 && (
                                <div className="mb-3">
                                    <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2">
                                        Key Performers
                                    </div>
                                    <div className="space-y-2">
                                        {debrief.physical_summary.key_performers.map((kp, i) => (
                                            <div key={i} className="flex gap-3 text-sm">
                                                <div className="text-emerald-400 font-black min-w-[120px]">{kp.player}</div>
                                                <div className="text-gray-300">{kp.summary}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {debrief.physical_summary.concerns && debrief.physical_summary.concerns.length > 0 && (
                                <div>
                                    <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-2">
                                        Concerns
                                    </div>
                                    <div className="space-y-2">
                                        {debrief.physical_summary.concerns.map((c, i) => (
                                            <div key={i} className="flex gap-3 text-sm">
                                                <div className="text-amber-400 font-bold min-w-[120px]">{c.player}</div>
                                                <div className="text-gray-300">{c.issue}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </Card>
                    )}

                    {/* ============= v1 backwards-compat fallback ============= */}
                    {!isV2 && (
                        <>
                            {debrief.key_points && debrief.key_points.length > 0 && (
                                <Card icon={<Zap size={16} />} title="Key Points" color="text-hawks-gold">
                                    <BulletList items={debrief.key_points} />
                                </Card>
                            )}
                            {debrief.key_performers && (
                                <Card icon={<TrendingUp size={16} />} title="Key Performers" color="text-emerald-400">
                                    <div className="space-y-3">
                                        {debrief.key_performers.map((kp, i) => (
                                            <div key={i} className="flex gap-3">
                                                <div className="text-hawks-gold font-black text-sm min-w-[120px]">{kp.player}</div>
                                                <div className="text-gray-300 text-sm">{kp.summary}</div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}
                            {debrief.concerns && debrief.concerns.length > 0 && (
                                <Card icon={<AlertTriangle size={16} />} title="Concerns" color="text-amber-400">
                                    <div className="space-y-3">
                                        {debrief.concerns.map((c, i) => (
                                            <div key={i} className="flex gap-3">
                                                <div className="text-red-400 font-bold text-sm min-w-[120px]">{c.player}</div>
                                                <div className="text-gray-300 text-sm">{c.issue}</div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}
                            {debrief.position_groups && (
                                <Card icon={<Users size={16} />} title="Position Groups" color="text-blue-400">
                                    <div className="space-y-3">
                                        {Object.entries(debrief.position_groups).map(([group, analysis]) => analysis ? (
                                            <div key={group}>
                                                <div className="text-hawks-gold text-xs font-bold uppercase mb-1">{group}</div>
                                                <p className="text-gray-300 text-sm">{analysis}</p>
                                            </div>
                                        ) : null)}
                                    </div>
                                </Card>
                            )}
                            {debrief.workrate_analysis && (
                                <Card icon={<Activity size={16} />} title="Workrate Analysis" color="text-purple-400">
                                    <p className="text-gray-300 text-sm">{debrief.workrate_analysis}</p>
                                </Card>
                            )}
                            {debrief.recommendations && debrief.recommendations.length > 0 && (
                                <Card icon={<Sparkles size={16} />} title="Recommendations" color="text-hawks-gold">
                                    <ol className="space-y-2 list-decimal list-inside">
                                        {debrief.recommendations.map((rec, i) => (
                                            <li key={i} className="text-sm text-gray-300">{rec}</li>
                                        ))}
                                    </ol>
                                </Card>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default MatchDebrief;
