/*
  The Nest — Dashboard Page

  Primary landing page for coaches/staff.
  Displays high-level team insights and wellbeing stas.
*/

import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiService } from '../services/api';
import type { TeamInsights } from '../services/api';
import {
    Activity,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    CheckCircle,
    Users,
    Zap
} from 'lucide-react';
import { clsx } from 'clsx';
import hfcLogo from '../assets/hfc-logo.png';
import { DailySchedule } from '../components/dashboard/DailySchedule';

const Skeleton = ({ className }: { className?: string }) => (
    <div className={`bg-gray-200 animate-pulse rounded ${className}`}></div>
);

const StatCard = ({ title, value, subtext, icon: Icon, trend, color, loading }: any) => {
    if (loading) return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-32 flex flex-col justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-4 w-32" />
        </div>
    );

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
            <div>
                <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">{title}</p>
                <h3 className="text-3xl font-bold mt-2 text-gray-900">{value}</h3>
                <p className={`text-sm mt-2 flex items-center gap-1 ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {subtext}
                </p>
            </div>
            <div className={`p-3 rounded-lg ${color}`}>
                <Icon size={24} className="text-white" />
            </div>
        </div>
    );
};

export const Dashboard = () => {
    const { user } = useAuth();
    const [insights, setInsights] = useState<TeamInsights | null>(null);
    const [injuries, setInjuries] = useState<any[]>([]);
    const [wbAlerts, setWbAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.role === 'player') return;
        const fetchData = async () => {
            try {
                const [ins, inj, wba] = await Promise.all([
                    ApiService.getTeamInsights(),
                    ApiService.getInjuries(),
                    ApiService.getWellbeingAlerts()
                ]);
                setInsights(ins);
                setInjuries(inj);
                setWbAlerts(wba);
            } catch (err) {
                console.error("Failed to load dashboard data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Prepare chart data from daily_averages
    const chartData = insights?.daily_averages
        ? Object.entries(insights.daily_averages).map(([date, vals]: any) => ({
            date: date.split('-').slice(1).join('/'), // MM/DD
            ...vals
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        : [];

    const latestStats = chartData.length > 0 ? chartData[chartData.length - 1] : { sleep: 0, soreness: 0, stress: 0 };

    if (user?.role === 'player') {
        return <Navigate to={`/players/${user.jumper_no}`} replace />;
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header section with Premium Branding */}
            <div className="flex items-center justify-between bg-white p-8 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-hfc-brown/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                <div className="relative z-10">
                    <h1 className="text-3xl font-black text-hfc-brown tracking-tight uppercase">Team Performance Hub</h1>
                    <p className="text-gray-500 font-medium mt-1">Real-time squad analytics for coaching insight.</p>
                </div>
                <div className="bg-hfc-brown/5 p-4 rounded-2xl relative z-10 group">
                    <img
                        src={hfcLogo}
                        alt="HFC Logo"
                        className="h-16 w-auto group-hover:scale-110 transition-transform duration-500"
                    />
                </div>
            </div>

            {/* KPI Cards section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    loading={loading}
                    title="Avg Sleep Quality"
                    value={latestStats.sleep}
                    subtext="Squad Average"
                    icon={Activity}
                    trend={latestStats.sleep > 7.5 ? "up" : "down"}
                    color="bg-indigo-600 shadow-lg shadow-indigo-200"
                />
                <StatCard
                    loading={loading}
                    title="Soreness Status"
                    value={latestStats.soreness}
                    subtext="Daily Trend"
                    icon={AlertTriangle}
                    trend={latestStats.soreness < 7 ? "down" : "up"}
                    color="bg-amber-500 shadow-lg shadow-amber-200"
                />
                <StatCard
                    loading={loading}
                    title="Squad Stress"
                    value={latestStats.stress}
                    subtext="Mental Load"
                    icon={Users}
                    trend="up"
                    color="bg-emerald-600 shadow-lg shadow-emerald-200"
                />
            </div>

            {/* Squad Fitness Performance Row */}
            <div className="bg-hfc-brown rounded-[2.5rem] p-8 text-white border border-white/10 shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gold-400/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                <div className="relative z-10">
                    <h3 className="text-xl font-black uppercase tracking-tight mb-6 flex items-center gap-3">
                        <Zap className="text-gold-400" size={24} />
                        Squad Fitness Performance
                        <span className="text-[10px] text-amber-300 font-bold bg-white/5 px-3 py-1 rounded-full border border-white/10 uppercase tracking-widest ml-auto">
                            Latest Sessions (n={insights?.fitness_stats?.count || 0})
                        </span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        <div className="space-y-2">
                            <div className="text-[10px] font-black text-amber-300 uppercase tracking-widest">Avg Peak Speed</div>
                            <div className="text-4xl font-black text-white">
                                {insights?.fitness_stats?.avg_top_speed || '—'}
                                <span className="text-sm text-gray-400 ml-1 font-bold">km/h</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-[10px] font-black text-amber-300 uppercase tracking-widest">Avg Distance</div>
                            <div className="text-4xl font-black text-white">
                                {insights?.fitness_stats?.avg_distance || '—'}
                                <span className="text-sm text-gray-400 ml-1 font-bold">km</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-[10px] font-black text-gold-400 uppercase tracking-widest">Avg Session Load</div>
                            <div className="text-4xl font-black text-gold-400">
                                {insights?.fitness_stats?.avg_load || '—'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Daily Schedule Dashboard Widget */}
                <div className="lg:col-span-1 h-[420px]">
                    <DailySchedule />
                </div>

                {/* Medical & Coaching Column */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Health & Wellbeing Alerts Panel */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-hfc-brown">
                            <AlertTriangle size={20} className="text-red-600" />
                            Health & Wellbeing Alerts
                        </h3>
                        <div className="space-y-3">
                            {loading ? (
                                <Skeleton className="h-20 w-full" />
                            ) : (
                                <>
                                    {/* Combine injuries and wellbeing notes */}
                                    {[
                                        ...injuries.filter(i => i.status === 'Active').map(i => ({ ...i, type: 'injury' })),
                                        ...wbAlerts.map(w => ({ ...w, type: 'wellbeing' }))
                                    ].sort((_, b) => b.type === 'injury' ? 1 : -1).slice(0, 5).map((alert, i) => (
                                        <div key={i} className={clsx(
                                            "flex items-center justify-between p-3 rounded-lg border",
                                            alert.type === 'injury' && alert.severity === 'Major' ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"
                                        )}>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <div className={clsx(
                                                        "font-bold text-sm",
                                                        alert.type === 'injury' && alert.severity === 'Major' ? "text-red-900" : "text-amber-900"
                                                    )}>{alert.player_name}</div>
                                                    <span className={clsx(
                                                        "text-[9px] font-black uppercase px-2 py-0.5 rounded",
                                                        alert.type === 'injury' ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                                                    )}>
                                                        {alert.type}
                                                    </span>
                                                </div>
                                                <div className={clsx(
                                                    "text-xs mt-0.5 font-medium",
                                                    alert.type === 'injury' && alert.severity === 'Major' ? "text-red-700" : "text-amber-700"
                                                )}>
                                                    {alert.type === 'injury' ? alert.injury_type : alert.notes}
                                                </div>
                                            </div>
                                            {alert.type === 'injury' && (
                                                <span className={clsx(
                                                    "text-[10px] font-bold uppercase px-2 py-0.5 rounded",
                                                    alert.severity === 'Major' ? "bg-red-200 text-red-800" : "bg-amber-200 text-amber-800"
                                                )}>
                                                    {alert.severity}
                                                </span>
                                            )}
                                            {alert.type === 'wellbeing' && (
                                                <div className="text-right">
                                                    <div className="text-xs font-black text-amber-600">{alert.readiness?.toFixed(1) || '—'}</div>
                                                    <div className="text-[8px] text-amber-400 font-bold uppercase tracking-widest">RDY</div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {injuries.filter(i => i.status === 'Active').length === 0 && wbAlerts.length === 0 && (
                                        <p className="text-gray-400 text-sm">No critical health or wellbeing alerts reported.</p>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Automated Insights Panel */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <CheckCircle size={20} className="text-amber-600" />
                            Coaching Insights
                        </h3>
                        <div className="space-y-4">
                            {loading ? (
                                <>
                                    <Skeleton className="h-16 w-full" />
                                    <Skeleton className="h-16 w-full" />
                                </>
                            ) : (
                                <>
                                    {(insights?.insights || []).map((text: string, i: number) => (
                                        <div key={i} className="p-3 bg-amber-50 text-amber-800 rounded-lg text-sm border border-amber-100">
                                            {text}
                                        </div>
                                    ))}
                                    {!(insights?.insights?.length) && (
                                        <p className="text-gray-400 text-sm">No critical alerts today.</p>
                                    )}
                                </>
                            )}

                            {/* Correct Availability based on real data */}
                            <div className="mt-8 pt-6 border-t border-gray-100">
                                <h4 className="font-medium text-gray-900 mb-3">Availability Status</h4>
                                {loading ? (
                                    <Skeleton className="h-20 w-full" />
                                ) : (
                                    <>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-gray-600">Available (Full)</span>
                                            <span className="font-bold text-green-600">{44 - injuries.filter(i => i.status !== 'Cleared').length}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div className="bg-green-500 h-2 rounded-full" style={{ width: `${((44 - injuries.filter(i => i.status !== 'Cleared').length) / 44) * 100}%` }}></div>
                                        </div>
                                        <div className="flex items-center justify-between mt-4 mb-2">
                                            <span className="text-sm text-gray-600">In Rehab / Modified</span>
                                            <span className="font-bold text-amber-600">{injuries.filter(i => i.status !== 'Cleared').length}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${(injuries.filter(i => i.status !== 'Cleared').length / 44) * 100}%` }}></div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
