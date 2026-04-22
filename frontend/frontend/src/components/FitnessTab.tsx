/*
  The Nest — FitnessTab Component

  Displays a player's fitness performance data in two sections:
    1. Today's / Latest Session (GPS data)
    2. Personal Bests (strength, speed, endurance)

  Injured players (no session data) see a rehab notice instead of live metrics.
*/

import { Activity, Zap, Heart, TrendingUp, Trophy, Timer, Weight, Target, Footprints } from 'lucide-react';

// -- Type Definitions --
export interface FitnessSession {
    session_date: string;
    session_type: string;
    top_speed_kmh: number;
    distance_km: number;
    hsd_m: number;
    hr_avg_bpm: number;
    hr_max_bpm: number;
    total_load: number;
    sprints: number;
    accelerations: number;
    decelerations: number;
    is_live: boolean;
}

export interface FitnessPBs {
    run_2k_seconds: number;
    bench_press_kg: number;
    squat_kg: number;
    vertical_jump_cm: number;
    beep_test_level: number;
    top_speed_kmh: number;
    sprint_10m_s: number;
    sprint_40m_s: number;
    date_recorded: string;
}

// -- Helper --
const formatTime = (seconds?: number | null): string => {
    if (seconds == null) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
};

// -- Metric Tile --
const MetricTile = ({
    label, value, unit, icon: Icon, accent = false, size = 'normal'
}: {
    label: string;
    value: string | number;
    unit?: string;
    icon: React.ElementType;
    accent?: boolean;
    size?: 'normal' | 'large';
}) => (
    <div className={`flex flex-col gap-1 bg-hawks-card rounded-2xl p-5 shadow-sm border
        ${accent ? 'border-amber-500/20 bg-amber-500/5' : 'border-white/5'}
        hover:shadow-md transition-shadow`}>
        <div className="flex items-center gap-2 mb-1">
            <Icon size={16} className={accent ? 'text-amber-500' : 'text-hawks-gold/70'} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${accent ? 'text-amber-400' : 'text-gray-400'}`}>
                {label}
            </span>
        </div>
        <div className={`font-black text-gray-100 ${size === 'large' ? 'text-3xl' : 'text-2xl'}`}>
            {value}
            {unit && <span className="text-sm font-semibold text-gray-400 ml-1">{unit}</span>}
        </div>
    </div>
);

// -- Load Bar --
const LoadBar = ({ value, max, label, color }: { value: number; max: number; label: string; color: string }) => (
    <div className="space-y-1">
        <div className="flex justify-between text-xs font-semibold text-gray-400">
            <span>{label}</span>
            <span className="text-gray-100">{value}</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
                className={`h-full rounded-full transition-all duration-700 ${color}`}
                style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
            />
        </div>
    </div>
);

// -- Main Component --
export const FitnessTab = ({ session, pbs, playerName, isInjured }: {
    session: FitnessSession | null;
    pbs: FitnessPBs | null;
    playerName: string;
    isInjured?: boolean;
}) => {

    return (
        <div className="space-y-8 animate-in fade-in duration-300">

            {/* -- TODAY'S SESSION -- */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                        <Activity className="text-hawks-gold" size={22} />
                        Latest Training Session
                    </h2>
                    {session && session.session_date && (
                        <span className="text-xs font-semibold text-gray-400 bg-hawks-base px-3 py-1 rounded-full">
                            {new Date(session.session_date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
                            {' · '}
                            <span className="text-hawks-gold font-bold">{session.session_type || 'Training'}</span>
                        </span>
                    )}
                </div>

                {!session ? (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-8 text-center">
                        <Activity className="mx-auto text-amber-400 mb-3" size={36} />
                        <p className="font-bold text-amber-300 text-lg mb-1">
                            {isInjured ? 'Rehabilitation Program' : 'No Session Data'}
                        </p>
                        <p className="text-amber-400 text-sm">
                            {isInjured
                                ? `${playerName} is currently completing a modified rehab program. Live GPS data is unavailable during recovery.`
                                : 'No session data available for this player.'}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Primary GPS metrics */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                            <MetricTile label="Top Speed" value={session.top_speed_kmh ? Number(session.top_speed_kmh).toFixed(1) : '—'} unit="km/h" icon={Zap} accent size="large" />
                            <MetricTile label="Distance" value={session.distance_km ? Number(session.distance_km).toFixed(2) : '—'} unit="km" icon={Footprints} />
                            <MetricTile label="Avg Heart Rate" value={session.hr_avg_bpm || '—'} unit="bpm" icon={Heart} />
                            <MetricTile label="Max Heart Rate" value={session.hr_max_bpm || '—'} unit="bpm" icon={Heart} accent />
                        </div>

                        {/* Secondary session metrics */}
                        <div className="bg-[#1A1A2E] rounded-3xl p-7 text-white shadow-xl">
                            <h3 className="text-sm font-black text-amber-300 uppercase tracking-widest mb-5">Session Breakdown</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-6">
                                <div className="text-center">
                                    <div className="text-3xl font-black text-white">{session.hsd_m ? Number(session.hsd_m).toFixed(0) : '0'}<span className="text-sm text-gray-400 ml-1">m</span></div>
                                    <div className="text-[10px] text-amber-300 uppercase tracking-widest mt-1">High Speed Distance</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-black text-white">{session.sprints || '0'}</div>
                                    <div className="text-[10px] text-amber-300 uppercase tracking-widest mt-1">Sprints</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-black text-white">{session.accelerations || '0'}</div>
                                    <div className="text-[10px] text-amber-300 uppercase tracking-widest mt-1">Accelerations</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-black text-white">{session.decelerations || '0'}</div>
                                    <div className="text-[10px] text-amber-300 uppercase tracking-widest mt-1">Decelerations</div>
                                </div>
                            </div>

                            {/* Load bars */}
                            <div className="space-y-3 border-t border-white/10 pt-5">
                                <LoadBar value={session.total_load || 0} max={700} label="Total Session Load" color="bg-amber-400" />
                                <LoadBar value={session.hsd_m || 0} max={2500} label="High Speed Distance (m)" color="bg-green-400" />
                                <LoadBar value={session.hr_avg_bpm || 0} max={200} label="Avg Heart Rate (bpm)" color="bg-red-400" />
                            </div>
                        </div>
                    </>
                )}
            </section>

            {/* -- PERSONAL BESTS -- */}
            <section>
                <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2 mb-4">
                    <Trophy className="text-amber-500" size={22} />
                    Personal Bests
                </h2>

                {!pbs ? (
                    <div className="bg-hawks-base border border-white/5 rounded-2xl p-8 text-center text-gray-400">
                        No personal best data  recorded yet.
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {/* Endurance */}
                        <MetricTile
                            label="2km Time Trial"
                            value={formatTime(pbs.run_2k_seconds)}
                            icon={Timer}
                        />
                        <MetricTile
                            label="Beep Test"
                            value={pbs.beep_test_level ? `Lvl ${Number(pbs.beep_test_level).toFixed(1)}` : '—'}
                            icon={TrendingUp}
                        />
                        {/* Speed */}
                        <MetricTile
                            label="Season Top Speed"
                            value={pbs.top_speed_kmh ? Number(pbs.top_speed_kmh).toFixed(1) : '—'}
                            unit="km/h"
                            icon={Zap}
                            accent
                        />
                        <MetricTile
                            label="10m Sprint"
                            value={pbs.sprint_10m_s ? Number(pbs.sprint_10m_s).toFixed(2) : '—'}
                            unit="sec"
                            icon={Footprints}
                        />
                        <MetricTile
                            label="40m Sprint"
                            value={pbs.sprint_40m_s ? Number(pbs.sprint_40m_s).toFixed(2) : '—'}
                            unit="sec"
                            icon={Footprints}
                        />
                        {/* Strength */}
                        <MetricTile
                            label="Vertical Jump"
                            value={pbs.vertical_jump_cm ? Number(pbs.vertical_jump_cm).toFixed(0) : '—'}
                            unit="cm"
                            icon={TrendingUp}
                            accent
                        />
                        <MetricTile
                            label="Bench Press"
                            value={pbs.bench_press_kg ? Number(pbs.bench_press_kg).toFixed(0) : '—'}
                            unit="kg"
                            icon={Weight}
                        />
                        <MetricTile
                            label="Max Squat"
                            value={pbs.squat_kg ? Number(pbs.squat_kg).toFixed(0) : '—'}
                            unit="kg"
                            icon={Target}
                        />
                    </div>
                )}

                {pbs && pbs.date_recorded && (
                    <p className="text-[11px] text-gray-400 mt-3 text-right">
                        Last testing: {new Date(pbs.date_recorded).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                )}
            </section>
        </div>
    );
};
