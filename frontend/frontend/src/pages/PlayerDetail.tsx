/*
  The Nest — Player Detail Page

  3-tab player profile:
    1. Personal Information (bio, engagement, education, community)
    2. Footy Overview (training plan, stats, IDP radar, WOOP goals, match ratings, injuries)
    3. Fitness Performance (GPS session, PBs)

  FIX: All useState/useEffect hooks are declared at the top of the component,
       BEFORE any early returns, to comply with React Rules of Hooks.
  FIX: Replaced Recharts with native SVG charts to resolve React 19 compatibility issues.
*/

import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiService, formatPlayerImage, getMatchRatings } from '../services/api';

import type { Player, Injury, PlayerStats, PlayerEngagement } from '../services/api';
import {
    ChevronLeft, Share2, Printer, Activity, Target,
    User, Trophy, MapPin, GraduationCap, Heart,
    BookOpen, Users, Dumbbell, Calendar, Award, Plus
} from 'lucide-react';
import clsx from 'clsx';
import { FitnessTab } from '../components/FitnessTab';
import AddPlayerToTeamModal from '../components/modals/AddPlayerToTeamModal';



// ─── Native SVG Charts ────────────────────────────────────────────────────────



const NativeMatchRatingsChart = ({ data, size }: { data: any[]; size: { w: number; h: number } }) => {
    if (!data || data.length === 0) return <div className="flex h-full items-center justify-center text-gray-500 font-medium">No match rating data available.</div>;

    const padding = { top: 40, right: 20, bottom: 60, left: 20 };
    const chartW = size.w - padding.left - padding.right;
    const chartH = size.h - padding.top - padding.bottom;
    const barWidth = Math.min(25, (chartW / data.length) * 0.6);
    const xStep = chartW / (data.length || 1);

    const getY = (val: number) => padding.top + chartH - (val / 5) * chartH;

    const linePoints = data.map((d, i) => {
        const x = padding.left + i * xStep + xStep / 2;
        const y = getY(d.avg3);
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`}>
            {/* Bars */}
            {data.map((d, i) => {
                const x = padding.left + i * xStep + (xStep - barWidth) / 2;
                const h = (d.rating / 5) * chartH;
                const y = padding.top + chartH - h;
                const color = d.rating >= 4 ? '#22C55E' : d.rating >= 3 ? '#F59E0B' : '#EF4444';

                return (
                    <g key={`bar-${i}`}>
                        <rect x={x} y={y} width={barWidth} height={h} fill={color} rx="4" />
                        <text
                            x={padding.left + i * xStep + xStep / 2}
                            y={size.h - padding.bottom + 20}
                            textAnchor="middle"
                            fill="#6b7280"
                            fontSize="10"
                            transform={`rotate(-45, ${padding.left + i * xStep + xStep / 2}, ${size.h - padding.bottom + 20})`}
                        >
                            {d.round}
                        </text>
                    </g>
                );
            })}

            {/* Line for 3-Match Avg */}
            <polyline
                points={linePoints}
                fill="none"
                stroke="#C8A951"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Line Dots */}
            {data.map((d, i) => {
                const x = padding.left + i * xStep + xStep / 2;
                const y = getY(d.avg3);
                return (
                    <circle key={`dot-${i}`} cx={x} cy={y} r="4" fill="#C8A951" stroke="#1a1a2e" strokeWidth="2" />
                );
            })}
        </svg>
    );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const ProfileHeader = ({ player, stats2025, isCoach }: { player: Player; stats2025: PlayerStats | null; isCoach: boolean }) => (

    <div className="bg-hfc-brown rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-hfc-brown/20 to-transparent" />
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            {/* Photo */}
            <div className="relative group">
                <div className="absolute inset-0 bg-gold-400 rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity" />
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

            {/* Info */}
            <div className="text-center md:text-left flex-1">
                <h1 className="text-4xl md:text-5xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{player.name}</h1>
                <div className="flex flex-wrap justify-center md:justify-start gap-4 text-amber-200 text-sm font-medium uppercase tracking-wider mb-4" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                    <span>{player.position}</span>
                    <span className="text-gold-400">•</span>
                    <span>{player.originally_from || 'VIC Metro'}</span>
                </div>

                <div className="flex flex-wrap justify-center md:justify-start gap-8 mt-6">
                    {[
                        { value: player.age, label: 'Age' },
                        { value: player.height_cm, label: 'Height (cm)' },
                        { value: player.weight_kg, label: 'Weight (kg)' },
                        { value: player.games, label: 'Games', gold: true },
                    ].map(({ value, label, gold }) => (
                        <div key={label} className="text-center">
                            <div className={`text-2xl font-bold ${gold ? 'text-gold-400' : 'text-white'}`}>{value}</div>
                            <div className="text-[10px] text-gray-400 uppercase tracking-widest" style={{ fontFamily: 'Work Sans, sans-serif' }}>{label}</div>
                        </div>
                    ))}
                </div>

                {stats2025 && (
                    <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap justify-center md:justify-start gap-x-8 gap-y-4">
                        {[
                            { label: 'AF Avg', value: stats2025.af_avg },
                            { label: 'Disposals', value: stats2025.disposals_avg },
                            { label: 'Marks', value: stats2025.marks_avg },
                            { label: 'Tackles', value: stats2025.tackles_avg },
                            { label: 'Goals', value: stats2025.goals_avg },
                        ].map(({ label, value }) => (
                            <div key={label} className="flex flex-col">
                                <span className="text-[10px] text-amber-300 font-black uppercase tracking-widest mb-1" style={{ fontFamily: 'Work Sans, sans-serif' }}>{label}</span>
                                <span className="text-xl font-black text-white">{Number(value ?? 0).toFixed(1)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Readiness */}
            <div className="hidden md:flex flex-col items-end gap-4">
                <div className="text-right">
                    <div className={`text-6xl font-black ${player.readiness && player.readiness.score > 8 ? 'text-green-400' : 'text-gold-400'}`}>
                        {player.readiness?.score ? Number(player.readiness.score).toFixed(1) : '—'}
                    </div>
                    <div className="text-xs text-amber-300 uppercase tracking-widest">Readiness</div>
                </div>

                {isCoach && (
                    <button
                        onClick={() => (window as any).openTeamModal?.()}
                        className="flex items-center gap-2 px-6 py-3 bg-gold-400 text-hfc-brown rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-white transition-all shadow-[0_10px_20px_-5px_rgba(246,176,0,0.4)]"
                    >
                        <Plus size={16} />
                        Add to Team
                    </button>
                )}
            </div>

        </div>
    </div>
);

const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value?: string | boolean | number | null }) => {
    if (value === null || value === undefined || value === '') return null;
    const display = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
    return (
        <div className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0">
            <Icon size={16} className="text-hawks-gold mt-0.5 flex-shrink-0" />
            <div className="flex-1 flex justify-between items-start">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest" style={{ fontFamily: 'Work Sans, sans-serif' }}>{label}</span>
                <span className="text-sm font-semibold text-gray-100 text-right max-w-[60%]">{display}</span>
            </div>
        </div>
    );
};

const Card = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
    <div className="bg-hawks-card p-6 rounded-2xl border border-white/5">
        <h3 className="font-bold text-base text-gray-100 mb-4 flex items-center gap-2 border-b-2 border-hawks-gold pb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            <Icon size={18} className="text-hawks-gold" />
            {title}
        </h3>
        {children}
    </div>
);

const TierBadge = ({ tier }: { tier?: number | null }) => {
    const colors = ['', 'bg-green-500/10 text-green-400', 'bg-blue-500/10 text-blue-400', 'bg-amber-500/10 text-amber-400', 'bg-red-500/10 text-red-400'];
    const labels = ['', 'Tier 1 — Light', 'Tier 2 — Moderate', 'Tier 3 — High', 'Tier 4 — Elite'];
    if (!tier) return <span className="text-gray-500 text-sm">—</span>;
    return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${colors[tier] ?? 'bg-hawks-hover text-gray-400'}`}>
            {labels[tier] ?? `Tier ${tier}`}
        </span>
    );
};

const AttributeCard = ({ title, text }: { title: string; text?: string }) => (
    <div className="bg-hawks-card p-5 rounded-2xl border border-white/5 flex flex-col h-full">
        <h3 className="text-hawks-gold text-xs font-bold uppercase tracking-widest mb-2" style={{ fontFamily: 'Work Sans, sans-serif' }}>{title}</h3>
        <p className="text-gray-100 font-medium text-lg leading-snug">{text || '—'}</p>
    </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────

export const PlayerDetail = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const isCoach = user?.role === 'coach' || user?.role === 'admin';


    // ── ALL hooks must be declared here, before any early returns ──
    const [player, setPlayer] = useState<Player | null>(null);
    const [matchRatings, setMatchRatings] = useState<any[]>([]);

    const [playerInjuries, setPlayerInjuries] = useState<Injury[]>([]);
    const [stats2025, setStats2025] = useState<PlayerStats | null>(null);
    const [latestWellbeing, setLatestWellbeing] = useState<any>(null);
    const [woopGoals, setWoopGoals] = useState<any[]>([]);
    const [fitnessSession, setFitnessSession] = useState<any>(null);
    const [fitnessPBs, setFitnessPBs] = useState<any>(null);
    const [engagement, setEngagement] = useState<PlayerEngagement | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'personal' | 'footy' | 'fitness'>('personal');
    const [showTeamModal, setShowTeamModal] = useState(false);

    const chartRef = useRef<HTMLDivElement>(null);

    const [chartSize, setChartSize] = useState({ w: 500, h: 300 });

    useEffect(() => {
        const obs = new ResizeObserver(() => {
            if (chartRef.current) {
                setChartSize({ w: chartRef.current.offsetWidth, h: chartRef.current.offsetHeight });
            }
        });
        if (chartRef.current) obs.observe(chartRef.current);
        return () => obs.disconnect();
    }, []);


    useEffect(() => {
        if (id) {
            Promise.allSettled([
                ApiService.getPlayer(id),
                ApiService.getInjuries(),
                ApiService.getStats2025({ jumper_no: Number(id) }),
                ApiService.getWellbeing(id, 1),
                ApiService.getWoopGoals(Number(id)),
                ApiService.getFitnessSession(id),

                ApiService.getFitnessPbs(id),
                ApiService.getEngagement(id),
            ]).then(([p, allInj, s, w, woop, fitS, fitP, eng]) => {

                if (p.status === 'fulfilled' && p.value) {
                    setPlayer(p.value);
                    if (p.value.jumper_no) {
                        setMatchRatings(getMatchRatings(p.value.jumper_no));
                    }
                }
                if (allInj.status === 'fulfilled' && Array.isArray(allInj.value)) setPlayerInjuries(allInj.value.filter((i: Injury) => i.player_id === Number(id)));

                if (s.status === 'fulfilled' && Array.isArray(s.value) && s.value.length > 0) setStats2025(s.value[0]);
                if (w.status === 'fulfilled' && Array.isArray(w.value) && w.value.length > 0) setLatestWellbeing(w.value[0]);
                if (woop.status === 'fulfilled' && Array.isArray(woop.value)) setWoopGoals(woop.value);
                if (fitS.status === 'fulfilled') setFitnessSession(fitS.value?.session ?? null);
                if (fitP.status === 'fulfilled') setFitnessPBs(fitP.value?.pbs ?? null);
                if (eng.status === 'fulfilled') setEngagement(eng.value?.engagement ?? null);
            }).catch(console.error).finally(() => setLoading(false));
        }
    }, [id]);



    // Expose modal toggle to sub-component
    useEffect(() => {
        (window as any).openTeamModal = () => setShowTeamModal(true);
        return () => { delete (window as any).openTeamModal; };
    }, []);

    // ── Early returns AFTER all hooks ──
    if (loading) return <div className="p-20 text-center text-gray-500">Loading Profile...</div>;
    if (!player) return <div className="p-20 text-center text-gray-500">Player not found</div>;

    // ── Derived state (computed after hooks) ──
    const chartMatchData = matchRatings.map((m, idx) => {
        const last3 = matchRatings.slice(Math.max(0, idx - 2), idx + 1);
        const sum = last3.reduce((s, r) => s + (Number(r.rating) || 0), 0);
        return { ...m, avg3: Number((last3.length > 0 ? sum / last3.length : 0).toFixed(1)) };
    });



    const matchAvg = matchRatings.length > 0
        ? (matchRatings.reduce((sum, r) => sum + Number(r.rating || 0), 0) / matchRatings.length).toFixed(1)
        : '0.0';

    const TABS = [
        { key: 'personal', label: 'Personal Info', icon: User },
        { key: 'footy',    label: 'Footy Overview', icon: Trophy },
        { key: 'fitness',  label: 'Fitness Performance', icon: Activity },
    ] as const;

    const studyDays = [
        engagement?.study_monday && 'Monday',
        engagement?.study_wednesday && 'Wednesday',
        engagement?.study_thursday && 'Thursday',
    ].filter(Boolean).join(', ') || 'None';

    return (
        <div className="space-y-8 animate-in fade-in duration-500 relative">
            {showTeamModal && player && (
                <AddPlayerToTeamModal
                    player={player}
                    onClose={() => setShowTeamModal(false)}
                    onSuccess={() => {
                        // Optionally refresh data
                    }}
                />
            )}
            {/* Navigation */}
            <div className="flex items-center justify-between">
                <Link to="/players" className="flex items-center gap-2 text-gray-400 hover:text-hawks-gold transition-colors font-medium">
                    <ChevronLeft size={20} />
                    Back to Squad
                </Link>
                <div className="flex gap-2">
                    <button className="p-2 hover:bg-hawks-hover rounded-xl text-gray-500 hover:text-amber-400 transition-colors"><Share2 size={18} /></button>
                    <button className="p-2 hover:bg-hawks-hover rounded-xl text-gray-500 hover:text-amber-400 transition-colors"><Printer size={18} /></button>
                </div>
            </div>

            {/* Header */}
            <ProfileHeader player={player} stats2025={stats2025} isCoach={isCoach} />


            {/* Tab Navigation */}
            <div className="flex gap-1 p-1 bg-hawks-base rounded-2xl w-fit">
                {TABS.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={clsx(
                            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all duration-300",
                            activeTab === key
                                ? "bg-hfc-brown text-white shadow-lg"
                                : "text-gray-500 hover:text-gray-300 hover:bg-hawks-hover"
                        )}
                    >
                        <Icon size={15} />
                        {label}
                    </button>
                ))}
            </div>

            {/* ── Tab: Personal Information ─────────────────────────────────────────── */}
            {activeTab === 'personal' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

                    {/* Player Attribute Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <AttributeCard title="Weapon" text={player.description?.weapon} />
                        <AttributeCard title="Craft" text={player.description?.craft} />
                        <AttributeCard title="Pyramid" text={player.description?.pyramid} />
                        <AttributeCard title="Mental Skills" text={player.description?.mental} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

                        {/* Personal Details */}
                        <Card title="Personal Details" icon={User}>
                            <InfoRow icon={MapPin} label="State Origin" value={engagement?.state} />
                            <InfoRow icon={Calendar} label="Date of Birth" value={engagement?.dob ? new Date(engagement.dob).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : null} />
                            <InfoRow icon={Award} label="Listing Type" value={engagement?.listing} />
                            <InfoRow icon={Users} label="Has Children" value={engagement?.has_children} />
                            <InfoRow icon={MapPin} label="Area of Schooling" value={engagement?.area_of_schooling} />
                            <InfoRow icon={Activity} label="Program" value={engagement?.program} />
                        </Card>

                        {/* Education */}
                        <Card title="Education & Study" icon={GraduationCap}>
                            <InfoRow icon={BookOpen} label="Course / Degree" value={engagement?.education_study} />
                            <InfoRow icon={GraduationCap} label="University / Institution" value={engagement?.university} />
                            <InfoRow icon={Calendar} label="Study Days" value={studyDays} />
                            <InfoRow icon={Award} label="Certificate 1" value={engagement?.certificate_1} />
                            <InfoRow icon={Award} label="Certificate 2" value={engagement?.certificate_2} />
                        </Card>

                        {/* Body & Physical */}
                        <Card title="Physical Profile" icon={Dumbbell}>
                            <div className="mb-4">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2" style={{ fontFamily: 'Work Sans, sans-serif' }}>Body Load Tier</p>
                                <TierBadge tier={engagement?.body_load_tier} />
                            </div>
                            <InfoRow icon={Target} label="Body Goal" value={engagement?.body_goal} />
                            <div className="pt-3 border-t border-white/5 mt-2">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1" style={{ fontFamily: 'Work Sans, sans-serif' }}>Physical Stats</p>
                                <div className="grid grid-cols-3 gap-3 mt-2">
                                    <div className="text-center bg-hawks-base rounded-xl p-3">
                                        <div className="text-lg font-bold text-hawks-gold">{player.age}</div>
                                        <div className="text-[10px] text-gray-500 uppercase tracking-widest">Age</div>
                                    </div>
                                    <div className="text-center bg-hawks-base rounded-xl p-3">
                                        <div className="text-lg font-bold text-hawks-gold">{player.height_cm}</div>
                                        <div className="text-[10px] text-gray-500 uppercase tracking-widest">Height</div>
                                    </div>
                                    <div className="text-center bg-hawks-base rounded-xl p-3">
                                        <div className="text-lg font-bold text-hawks-gold">{player.weight_kg}</div>
                                        <div className="text-[10px] text-gray-500 uppercase tracking-widest">Weight</div>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Community & Engagement */}
                        <Card title="Community & Engagement" icon={Heart}>
                            <div className="mb-4 flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${engagement?.community_engaged ? 'bg-green-400' : 'bg-gray-600'}`} />
                                <span className={`text-sm font-bold ${engagement?.community_engaged ? 'text-green-400' : 'text-gray-500'}`}>
                                    {engagement?.community_engaged ? 'Community Active' : 'Not Currently Active'}
                                </span>
                            </div>
                            {engagement?.engagement_notes && (
                                <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                                    <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1" style={{ fontFamily: 'Work Sans, sans-serif' }}>Engagement Notes</p>
                                    <p className="text-sm text-gray-300 leading-relaxed">{engagement.engagement_notes}</p>
                                </div>
                            )}
                        </Card>

                        {/* Latest Wellbeing */}
                        {latestWellbeing && (
                            <Card title="Latest Wellbeing Check-In" icon={Activity}>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    {[
                                        { label: 'Sleep', value: latestWellbeing.sleep_score },
                                        { label: 'Soreness', value: latestWellbeing.soreness_score },
                                        { label: 'Mood', value: 10 - Number(latestWellbeing.stress_score || 0) },
                                        { label: 'Readiness', value: ((Number(latestWellbeing.sleep_score || 0) + Number(latestWellbeing.soreness_score || 0) + (10 - Number(latestWellbeing.stress_score || 0))) / 3).toFixed(1), gold: true },
                                    ].map(({ label, value, gold }: any) => (
                                        <div key={label} className="text-center bg-hawks-base rounded-xl p-3">
                                            <div className={`text-xl font-bold ${gold ? 'text-hawks-gold' : 'text-gray-100'}`}>{value}/10</div>
                                            <div className="text-[10px] text-gray-500 uppercase tracking-widest">{label}</div>
                                        </div>
                                    ))}
                                </div>
                                {latestWellbeing.notes && (
                                    <p className="text-sm italic text-gray-400 mt-2">"{latestWellbeing.notes}"</p>
                                )}
                                <p className="text-[10px] text-gray-500 mt-3">
                                    {new Date(latestWellbeing.submitted_at).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
                                </p>
                            </Card>
                        )}
                    </div>
                </div>
            )}

            {/* ── Tab: Footy Overview ───────────────────────────────────────────────── */}
            {activeTab === 'footy' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">



                        {/* Match Ratings */}
                        <div className="bg-hawks-card p-8 rounded-3xl border border-white/5">
                            <div className="flex items-center justify-between border-b-2 border-hawks-gold pb-2 mb-8">
                                <h3 className="font-bold text-xl text-gray-100" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>2026 Match Ratings</h3>
                                <div className="text-right">
                                    <span className="text-hawks-gold font-bold text-lg">Avg: {matchAvg} / 5</span>
                                    <span className="text-gray-500 text-xs ml-2">({matchRatings.length} matches)</span>
                                </div>
                            </div>
                            <div ref={chartRef} className="h-80 w-full">
                                <NativeMatchRatingsChart data={chartMatchData} size={chartSize} />
                            </div>
                        </div>

                        {/* Season Stats */}
                        {stats2025 && (
                            <div className="bg-hawks-card p-8 rounded-3xl border border-white/5">
                                <h3 className="font-bold text-xl text-gray-100 border-b-2 border-hawks-gold pb-2 mb-6 flex items-center gap-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                    <Trophy size={20} className="text-hawks-gold" />
                                    2025 Season Averages
                                </h3>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Games', value: stats2025.games_played },
                                        { label: 'AF Score', value: stats2025.af_avg },
                                        { label: 'Disposals', value: stats2025.disposals_avg },
                                        { label: 'Kicks', value: stats2025.kicks_avg },
                                        { label: 'Handballs', value: stats2025.handballs_avg },
                                        { label: 'Marks', value: stats2025.marks_avg },
                                        { label: 'Tackles', value: stats2025.tackles_avg },
                                        { label: 'Clearances', value: stats2025.clearances_avg },
                                        { label: 'Goals', value: stats2025.goals_avg },
                                        { label: 'Hitouts', value: stats2025.hitouts_avg },
                                        { label: 'Rating Pts', value: stats2025.rating_points },
                                    ].map(({ label, value }) => (
                                        <div key={label} className="text-center bg-hawks-base rounded-xl p-3">
                                            <div className="text-xl font-bold text-hawks-gold">
                                                {typeof value !== 'undefined' && value !== null ? Number(value).toFixed(Number(value) % 1 === 0 ? 0 : 1) : '—'}
                                            </div>
                                            <div className="text-[10px] text-gray-500 uppercase tracking-widest">{label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Injury History */}
                        <div className="bg-hawks-card p-8 rounded-3xl border border-white/5">
                            <h3 className="font-bold text-xl text-gray-100 mb-6 flex items-center gap-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                <Activity className="text-red-400" size={24} />
                                Injury History
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-gray-500 font-medium border-b border-white/10">
                                        <tr>
                                            <th className="pb-3 px-4">Date</th>
                                            <th className="pb-3 px-4">Injury</th>
                                            <th className="pb-3 px-4">Severity</th>
                                            <th className="pb-3 px-4 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {playerInjuries.map((inj, idx) => (
                                            <tr key={idx} className="hover:bg-hawks-hover transition-colors">
                                                <td className="py-4 px-4 text-gray-400">{inj.date}</td>
                                                <td className="py-4 px-4 font-bold text-gray-100">{inj.injury_type}</td>
                                                <td className="py-4 px-4">
                                                    <span className={clsx(
                                                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                                        inj.severity === 'Major' ? 'bg-red-500/10 text-red-400' :
                                                            inj.severity === 'Moderate' ? 'bg-amber-500/10 text-amber-400' : 'bg-green-500/10 text-green-400'
                                                    )}>
                                                        {inj.severity}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <div className={clsx("w-2 h-2 rounded-full",
                                                            inj.status === 'Active' ? 'bg-red-500' : inj.status === 'Recovering' ? 'bg-amber-500' : 'bg-green-500'
                                                        )} />
                                                        <span className="text-gray-300">{inj.status}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {playerInjuries.length === 0 && (
                                            <tr><td colSpan={4} className="py-10 text-center text-gray-500 italic">No injury history recorded.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* WOOP Goals */}
                    <div className="bg-hawks-card p-8 rounded-3xl border border-white/5">
                        <h3 className="font-bold text-xl text-gray-100 mb-6 flex items-center gap-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            <Target className="text-hawks-gold" size={24} />
                            WOOP Goals — Wish, Outcome, Obstacle, Plan
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {woopGoals.length > 0 ? woopGoals.map((goal, idx) => (
                                <div key={idx} className="p-6 rounded-2xl bg-hawks-base border border-white/5 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-hawks-gold text-lg">{goal.wish}</h4>
                                        <span className={clsx(
                                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                            goal.status === 'active' ? "bg-hfc-brown text-white" : "bg-green-500 text-white"
                                        )}>
                                            {goal.status}
                                        </span>
                                    </div>
                                    <div className="grid gap-3 text-sm">
                                        <div><span className="font-black text-hawks-gold uppercase text-[10px] block mb-1" style={{ fontFamily: 'Work Sans, sans-serif' }}>Outcome</span><p className="text-gray-300 font-medium">{goal.outcome}</p></div>
                                        <div><span className="font-black text-hawks-gold uppercase text-[10px] block mb-1" style={{ fontFamily: 'Work Sans, sans-serif' }}>Obstacle</span><p className="text-gray-300 font-medium">{goal.obstacle}</p></div>
                                        <div><span className="font-black text-hawks-gold uppercase text-[10px] block mb-1" style={{ fontFamily: 'Work Sans, sans-serif' }}>Plan</span><p className="text-gray-300 font-medium">{goal.plan}</p></div>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-gray-500 italic">No active WOOP goals for this period.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Tab: Fitness Performance ──────────────────────────────────────────── */}
            {activeTab === 'fitness' && (
                <div className="bg-hawks-card p-8 rounded-3xl border border-white/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <h3 className="font-bold text-xl text-gray-100 flex items-center gap-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            <Activity className="text-hawks-gold" size={24} />
                            Fitness & GPS Performance
                        </h3>
                        {fitnessSession && (
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest px-3 py-1 bg-hawks-base rounded-lg">
                                    Last Session: {new Date(fitnessSession.session_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                                </span>
                            </div>
                        )}

                    </div>
                    <FitnessTab
                        session={fitnessSession}
                        pbs={fitnessPBs}
                        playerName={player.name}
                        isInjured={player.status !== 'Green'}
                    />
                </div>
            )}
        </div>
    );
};
