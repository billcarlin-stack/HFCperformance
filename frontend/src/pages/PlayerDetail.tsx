/*
  The Nest — Player Detail Page

  Deep dive into a specific player's performance.
  Redesigned to match "Hawthorn Style" with dark header and card layout.
*/

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ApiService, formatPlayerImage, getMatchRatings } from '../services/api';
import type { Player, Injury, PlayerStats } from '../services/api';
import { ChevronLeft, Share2, Printer, Activity, Target } from 'lucide-react';
import { clsx } from 'clsx';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    Cell,
    Legend
} from 'recharts';
import { FitnessTab } from '../components/FitnessTab';

// Sub-components for clean code
const ProfileHeader = ({ player, stats2025 }: { player: Player, stats2025: PlayerStats | null }) => (
    <div className="bg-hfc-brown rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
        {/* Background Gradient Accent */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-hfc-brown/20 to-transparent"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            {/* Photo with Gold Ring */}
            <div className="relative group">
                <div className="absolute inset-0 bg-gold-400 rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                <div className="w-40 h-40 rounded-full border-4 border-gold-400 p-1 bg-hfc-brown shadow-lg relative z-10">
                    <img
                        src={formatPlayerImage(player.jumper_no, player.photo_url, player.name)}
                        alt={player.name}
                        className="w-full h-full object-cover rounded-full bg-gray-800"
                        onError={(e) => {
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=4D2004&color=F6B000&size=200&length=2&font-size=0.4`;
                        }}
                    />
                </div>
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gold-400 text-hfc-brown text-sm font-bold px-3 py-1 rounded-full shadow-md z-20">
                    #{player.jumper_no}
                </div>
            </div>

            {/* Info Block */}
            <div className="text-center md:text-left flex-1">
                <h1 className="text-4xl md:text-5xl font-bold mb-2">{player.name}</h1>
                <div className="flex flex-wrap justify-center md:justify-start gap-4 text-amber-200 text-sm font-medium uppercase tracking-wider mb-4">
                    <span>{player.position}</span>
                    <span className="text-gold-400">•</span>
                    <span>{player.originally_from || 'VIC Metro'}</span>
                </div>

                {/* Stats Row */}
                <div className="flex flex-wrap justify-center md:justify-start gap-8 mt-6">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-white">{player.age}</div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-widest">Age</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-white">{player.height_cm}</div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-widest">Height (cm)</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-white">{player.weight_kg}</div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-widest">Weight (kg)</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-gold-400">{player.games}</div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-widest">Games</div>
                    </div>
                </div>

                {/* Season Averages Summary (If available) */}
                {stats2025 && (
                    <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap justify-center md:justify-start gap-x-8 gap-y-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-amber-300 font-black uppercase tracking-widest mb-1">AF Avg</span>
                            <span className="text-xl font-black text-white">{stats2025.af_avg.toFixed(1)}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-amber-300 font-black uppercase tracking-widest mb-1">Disposals</span>
                            <span className="text-xl font-black text-white">{stats2025.disposals_avg.toFixed(1)}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-amber-300 font-black uppercase tracking-widest mb-1">Marks</span>
                            <span className="text-xl font-black text-white">{stats2025.marks_avg.toFixed(1)}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-amber-300 font-black uppercase tracking-widest mb-1">Tackles</span>
                            <span className="text-xl font-black text-white">{stats2025.tackles_avg.toFixed(1)}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-amber-300 font-black uppercase tracking-widest mb-1">Goals</span>
                            <span className="text-xl font-black text-white">{stats2025.goals_avg.toFixed(1)}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Readiness Score (Big Number) */}
            <div className="hidden md:block text-right">
                <div className={`text-6xl font-black ${player.readiness && player.readiness.score > 8 ? 'text-green-400' : 'text-gold-400'}`}>
                    {player.readiness?.score?.toFixed(1) || '—'}
                </div>
                <div className="text-xs text-amber-300 uppercase tracking-widest">Readiness</div>
            </div>
        </div>
    </div>
);

const AttributeCard = ({ title, text }: { title: string; text?: string }) => (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full">
        <h3 className="text-gold-600 text-xs font-bold uppercase tracking-widest mb-2">{title}</h3>
        <p className="text-gray-800 font-medium text-lg leading-snug">{text || '—'}</p>
    </div>
);

export const PlayerDetail = () => {
    const { id } = useParams();
    const [player, setPlayer] = useState<Player | null>(null);
    const [matchRatings, setMatchRatings] = useState<any[]>([]);
    const [aggregatedRatings, setAggregatedRatings] = useState<any[]>([]);
    const [playerInjuries, setPlayerInjuries] = useState<Injury[]>([]);
    const [stats2025, setStats2025] = useState<PlayerStats | null>(null);
    const [latestWellbeing, setLatestWellbeing] = useState<any>(null);
    const [woopGoals, setWoopGoals] = useState<any[]>([]);
    const [fitnessSession, setFitnessSession] = useState<any>(null);
    const [fitnessPBs, setFitnessPBs] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'fitness'>('overview');

    useEffect(() => {
        if (id) {
            Promise.allSettled([
                ApiService.getPlayer(id),
                ApiService.getRatings(id),
                ApiService.getInjuries(),
                ApiService.getStats2025({ jumper_no: Number(id) }),
                ApiService.getWellbeing(id, 1),
                ApiService.getWoopGoals(Number(id)),
                ApiService.getFitnessSession(id),
                ApiService.getFitnessPbs(id)
            ]).then(([p, r, allInj, s, w, woop, fitS, fitP]) => {
                if (p.status === 'fulfilled') {
                    setPlayer(p.value);
                    setMatchRatings(getMatchRatings(p.value.jumper_no));
                }
                if (r.status === 'fulfilled') {
                    setAggregatedRatings(r.value.aggregated);
                }
                if (allInj.status === 'fulfilled') setPlayerInjuries(allInj.value.filter((i: Injury) => i.player_id === Number(id)));
                if (s.status === 'fulfilled' && s.value.length > 0) setStats2025(s.value[0]);
                if (w.status === 'fulfilled' && w.value.length > 0) setLatestWellbeing(w.value[0]);
                if (woop.status === 'fulfilled') setWoopGoals(woop.value);
                if (fitS.status === 'fulfilled') setFitnessSession(fitS.value.session);
                if (fitP.status === 'fulfilled') setFitnessPBs(fitP.value.pbs);
            }).finally(() => setLoading(false));
        }
    }, [id]);

    if (loading) return <div className="p-20 text-center text-gray-400">Loading Profile...</div>;
    if (!player) return <div className="p-20 text-center text-gray-400">Player not found</div>;

    // Moving average calculation with safety
    const chartMatchData = matchRatings.map((m, idx) => {
        const last3 = matchRatings.slice(Math.max(0, idx - 2), idx + 1);
        const sum = last3.reduce((s, r) => s + (r.rating || 0), 0);
        const avg3 = last3.length > 0 ? sum / last3.length : 0;
        return {
            ...m,
            avg3: Number(avg3.toFixed(1))
        };
    });

    // Aggregated data for cleaner radar matching the professional look
    const idpData = aggregatedRatings.map(r => ({
        subject: r.category,
        Coach: r.coach,
        Self: r.self,
        Squad: r.squad,
        fullMark: 10
    }));

    const compositeScore = idpData.length > 0
        ? (idpData.reduce((sum, d) => sum + (d.Coach || 0), 0) / idpData.length).toFixed(1)
        : '0.0';

    const matchAvg = matchRatings.length > 0
        ? (matchRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / matchRatings.length).toFixed(1)
        : '0.0';

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Navigation */}
            <div className="flex items-center justify-between">
                <Link to="/players" className="flex items-center gap-2 text-gray-500 hover:text-hfc-brown transition-colors font-medium">
                    <ChevronLeft size={20} />
                    Back to Squad
                </Link>
                <div className="flex gap-2">
                    <button className="p-2 hover:bg-white rounded-xl text-gray-400 hover:text-amber-600 transition-colors"><Share2 size={18} /></button>
                    <button className="p-2 hover:bg-white rounded-xl text-gray-400 hover:text-amber-600 transition-colors"><Printer size={18} /></button>
                </div>
            </div>

            {/* Header */}
            <ProfileHeader player={player} stats2025={stats2025} />

            {/* Tab Navigation */}
            <div className="flex gap-1 p-1 bg-gray-100/50 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={clsx(
                        "px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all duration-300",
                        activeTab === 'overview'
                            ? "bg-hfc-brown text-white shadow-lg"
                            : "text-gray-400 hover:text-gray-600 hover:bg-white"
                    )}
                >
                    Overview
                </button>
                <button
                    onClick={() => setActiveTab('fitness')}
                    className={clsx(
                        "px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all duration-300",
                        activeTab === 'fitness'
                            ? "bg-hfc-brown text-white shadow-lg"
                            : "text-gray-400 hover:text-gray-600 hover:bg-white"
                    )}
                >
                    Fitness Performance
                </button>
            </div>

            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">

                {activeTab === 'overview' && (
                    <>
                        {/* Attribute Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <AttributeCard title="Weapon" text={player.description?.weapon} />
                            <AttributeCard title="Craft" text={player.description?.craft} />
                            <AttributeCard title="Pyramid" text={player.description?.pyramid} />
                            <AttributeCard title="Mental Skills" text={player.description?.mental} />
                        </div>

                        {/* Latest Wellbeing Card */}
                        {latestWellbeing && (
                            <div className="bg-hfc-brown rounded-[2.5rem] p-8 text-white border border-white/10 shadow-2xl overflow-hidden relative">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-gold-400/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                                <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-black uppercase tracking-tight mb-6 flex items-center gap-3">
                                            <Activity className="text-gold-400" size={24} />
                                            Latest Wellbeing Check-In
                                            <span className="text-[10px] text-amber-300 font-bold bg-white/5 px-3 py-1 rounded-full border border-white/10 uppercase tracking-widest ml-auto">
                                                {new Date(latestWellbeing.submitted_at).toLocaleDateString()}
                                            </span>
                                        </h3>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                                            <div className="space-y-1">
                                                <div className="text-[10px] font-black text-amber-300 uppercase tracking-widest">Sleep</div>
                                                <div className="text-2xl font-black text-white">{latestWellbeing.sleep_score}/10</div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-[10px] font-black text-amber-300 uppercase tracking-widest">Soreness</div>
                                                <div className="text-2xl font-black text-white">{latestWellbeing.soreness_score}/10</div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-[10px] font-black text-amber-300 uppercase tracking-widest">Mood</div>
                                                <div className="text-2xl font-black text-white">{10 - latestWellbeing.stress_score}/10</div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-[10px] font-black text-gold-400 uppercase tracking-widest">Readiness</div>
                                                <div className="text-2xl font-black text-gold-400">
                                                    {latestWellbeing.readiness ? latestWellbeing.readiness.toFixed(1) : ((latestWellbeing.sleep_score + latestWellbeing.soreness_score + (10 - latestWellbeing.stress_score)) / 3).toFixed(1)}
                                                </div>
                                            </div>
                                        </div>

                                        {latestWellbeing.notes && (
                                            <div className="mt-8 p-5 bg-white/5 rounded-2xl border border-white/10">
                                                <div className="text-[10px] font-black text-amber-300 uppercase tracking-widest mb-2">Check-In Notes</div>
                                                <p className="text-sm font-medium text-white italic leading-relaxed">"{latestWellbeing.notes}"</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                            {/* IDP Radar */}
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-xl text-gray-900 border-b-2 border-gold-400 pb-2 mb-6">
                                    Skill Radar — Coach vs Self vs Squad Avg
                                </h3>
                                <div className="h-96 w-full relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={idpData}>
                                            <PolarGrid stroke="#e5e7eb" />
                                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 500 }} />
                                            <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />

                                            {/* Squad Avg - Blue Dashed */}
                                            <Radar name="Squad Average" dataKey="Squad" stroke="#6366f1" strokeWidth={2} strokeDasharray="4 4" fill="transparent" />

                                            {/* Player Self-Rating - Gold Outline */}
                                            <Radar name="Player Self-Rating" dataKey="Self" stroke="#fbbf24" strokeWidth={3} fill="#fbbf24" fillOpacity={0.1} />

                                            {/* Coach Rating - Brown/Taupe Block */}
                                            <Radar name="Coach Rating" dataKey="Coach" stroke="#6a5a52" strokeWidth={2} fill="#6a5a52" fillOpacity={0.5} />

                                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                                            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 'bold' }} />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                    <div className="absolute top-0 right-0 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <div className="text-xl font-bold text-gray-900">{compositeScore}</div>
                                        <div className="text-[10px] text-gray-500 uppercase">Coach Avg</div>
                                    </div>
                                </div>
                            </div>

                            {/* Match Ratings Chart */}
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between border-b-2 border-gold-400 pb-2 mb-8">
                                    <h3 className="font-bold text-xl text-gray-900">2026 Match Ratings</h3>
                                    <div className="text-right">
                                        <span className="text-amber-500 font-bold text-lg">Avg: {matchAvg} / 5</span>
                                        <span className="text-gray-400 text-xs ml-2">({matchRatings.length} matches)</span>
                                    </div>
                                </div>

                                <div className="h-80 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={chartMatchData}>
                                            <XAxis
                                                dataKey="round"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 10, fill: '#9ca3af' }}
                                                angle={-45}
                                                textAnchor="end"
                                                height={50}
                                            />
                                            <YAxis hide domain={[0, 5]} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                            />
                                            <Legend verticalAlign="top" height={36} iconType="rect" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />

                                            <Bar name="Match Rating" dataKey="rating" radius={[4, 4, 0, 0]} barSize={20}>
                                                {chartMatchData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.rating >= 4 ? '#10B981' : entry.rating >= 3 ? '#F59E0B' : '#EF4444'} />
                                                ))}
                                            </Bar>

                                            <Line
                                                name="3-Match Avg"
                                                type="monotone"
                                                dataKey="avg3"
                                                stroke="#fbbf24"
                                                strokeWidth={3}
                                                dot={{ fill: '#fbbf24', r: 4, strokeWidth: 2, stroke: '#fff' }}
                                                activeDot={{ r: 6 }}
                                            />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Injury History Table */}
                            <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-xl text-gray-900 mb-6 flex items-center gap-2">
                                    <Activity className="text-red-500" size={24} />
                                    Personal Injury History
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-gray-400 font-medium border-b border-gray-100">
                                            <tr>
                                                <th className="pb-3 px-4">Date</th>
                                                <th className="pb-3 px-4">Injury Type</th>
                                                <th className="pb-3 px-4">Severity</th>
                                                <th className="pb-3 px-4 text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {playerInjuries.map((inj, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                    <td className="py-4 px-4 text-gray-500">{inj.date}</td>
                                                    <td className="py-4 px-4 font-bold text-gray-900">{inj.injury_type}</td>
                                                    <td className="py-4 px-4">
                                                        <span className={clsx(
                                                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                                            inj.severity === 'Major' ? 'bg-red-100 text-red-700' :
                                                                inj.severity === 'Moderate' ? 'bg-amber-100 text-amber-700' :
                                                                    'bg-green-100 text-green-700'
                                                        )}>
                                                            {inj.severity}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <div className={clsx(
                                                                "w-2 h-2 rounded-full",
                                                                inj.status === 'Active' ? 'bg-red-500' :
                                                                    inj.status === 'Recovering' ? 'bg-amber-500' : 'bg-green-500'
                                                            )}></div>
                                                            <span className="text-gray-700">{inj.status}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {playerInjuries.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="py-10 text-center text-gray-400 italic">No injury history recorded.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* WOOP Goals Section */}
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-xl text-gray-900 mb-6 flex items-center gap-2">
                                <Target className="text-hfc-brown" size={24} />
                                Player WOOP Goals (Wish, Outcome, Obstacle, Plan)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {woopGoals.length > 0 ? woopGoals.map((goal, idx) => (
                                    <div key={idx} className="p-6 rounded-2xl bg-amber-50 border border-amber-100 space-y-4">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-hfc-brown text-lg">{goal.wish}</h4>
                                            <span className={clsx(
                                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                                goal.status === 'active' ? "bg-hfc-brown text-white" : "bg-green-500 text-white"
                                            )}>
                                                {goal.status}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3 text-sm">
                                            <div><span className="font-black text-hfc-brown uppercase text-[10px] block mb-1">Outcome</span> <p className="text-gray-700 font-medium">{goal.outcome}</p></div>
                                            <div><span className="font-black text-hfc-brown uppercase text-[10px] block mb-1">Obstacle</span> <p className="text-gray-700 font-medium">{goal.obstacle}</p></div>
                                            <div><span className="font-black text-hfc-brown uppercase text-[10px] block mb-1">Plan</span> <p className="text-gray-700 font-medium">{goal.plan}</p></div>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-gray-400 italic">No active WOOP goals for this period.</p>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'fitness' && (
                    /* Fitness & Performance Section */
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h3 className="font-bold text-xl text-gray-900 mb-6 flex items-center gap-2">
                            <Activity className="text-hfc-brown" size={24} />
                            Fitness & GPS Performance
                        </h3>
                        <FitnessTab
                            session={fitnessSession}
                            pbs={fitnessPBs}
                            playerName={player.name}
                            isInjured={player.status !== 'Green'}
                        />
                    </div>
                )}
            </div>
        </div >
    );
};
