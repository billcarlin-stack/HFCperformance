/*
  The Nest — Rating Comparison Dashboard
  
  Module 3: Visualizes the gap between Coach, Self, and Squad ratings.
*/

import { useEffect, useState } from 'react';
import { ApiService, formatPlayerImage } from '../services/api';
import type { Player, CoachRating, AggregatedRating } from '../services/api';
import { User } from 'lucide-react';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { clsx } from 'clsx';

export const RatingComparison = () => {
    const [players, setPlayers] = useState<Player[]>([]);
    const [selectedPlayerId, setSelectedPlayerId] = useState<number>(0);
    const [selectedCategory, setSelectedCategory] = useState<string>("Technical");
    const [ratings, setRatings] = useState<CoachRating[]>([]);
    const [aggregatedRatings, setAggregatedRatings] = useState<AggregatedRating[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        ApiService.getPlayers().then(setPlayers).finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (selectedPlayerId) {
            ApiService.getRatings(selectedPlayerId).then(res => {
                setRatings(res.ratings);
                setAggregatedRatings(res.aggregated);
            });
        } else {
            setRatings([]);
            setAggregatedRatings([]);
        }
    }, [selectedPlayerId]);

    // Filter ratings for chart (maybe separate technical/tactical or show all?)
    // Showing all might be messy on one radar. Let's show top level or create sub-charts?
    // User requested "Left Column (Radar Chart)... Right Column (Data Table)".
    // A single radar with many variables is hard to read.
    // I'll filter to show the top 6-8 skills or category averages?
    // Actually, `api.ts` mock returns ~9 skills. That fits on a Radar.

    const filteredRatings = ratings.filter(r => r.category === selectedCategory);

    // Use aggregated ratings for the Radar Chart
    const chartData = aggregatedRatings.map(r => ({
        skill: r.category,
        Coach: r.coach,
        Self: r.self,
        Squad: r.squad,
        fullMark: 10
    }));

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 h-full">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Rating Comparison</h1>
                    <p className="text-gray-500">Analyze alignment between coach and player views.</p>
                </div>
                <div className="w-72 relative">
                    <select
                        className="w-full p-3 pl-10 bg-white border border-gray-200 rounded-xl appearance-none focus:ring-2 focus:ring-hfc-brown focus:outline-none font-medium shadow-sm"
                        value={selectedPlayerId}
                        onChange={e => setSelectedPlayerId(Number(e.target.value))}
                    >
                        <option value={0}>Select Player...</option>
                        {players.map(p => (
                            <option key={p.jumper_no} value={p.jumper_no}>#{p.jumper_no} {p.name}</option>
                        ))}
                    </select>
                    <User className="absolute left-3 top-3.5 text-gray-400" size={18} />
                </div>
                <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
                    {["Technical", "Tactical", "Physical", "Mental"].map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={clsx(
                                "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                                selectedCategory === cat
                                    ? "bg-hfc-brown text-white shadow-sm"
                                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"
                            )}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {selectedPlayerId === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                    <User size={48} className="text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium">Select a player to view comparison analysis</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[600px]">

                    {/* Left Column: Radar Chart */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full border border-gray-200 p-0.5">
                                <img
                                    src={formatPlayerImage(
                                        selectedPlayerId,
                                        players.find(p => p.jumper_no === selectedPlayerId)?.photo_url
                                    )}
                                    className="w-full h-full object-cover rounded-full"
                                />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-gray-900">Skill Profile</h3>
                                <p className="text-xs text-gray-500">Coach vs Self vs Squad</p>
                            </div>
                        </div>

                        <div className="flex-1 w-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                                    <PolarGrid stroke="#e5e7eb" />
                                    <PolarAngleAxis dataKey="skill" tick={{ fill: '#4b5563', fontSize: 11, fontWeight: 500 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />

                                    {/* Coach: Solid Filled Shape (Blue) */}
                                    <Radar name="Coach" dataKey="Coach" stroke="#003b7e" strokeWidth={2} fill="#003b7e" fillOpacity={0.5} />

                                    {/* Self: Gold Outline */}
                                    <Radar name="Self" dataKey="Self" stroke="#fbbf24" strokeWidth={3} fill="transparent" />

                                    {/* Squad: Dashed line */}
                                    <Radar name="Squad Avg" dataKey="Squad" stroke="#9ca3af" strokeWidth={2} strokeDasharray="4 4" fill="transparent" />

                                    <Legend />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Right Column: Data Table */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                        <h3 className="font-bold text-lg text-gray-900 mb-4">Gap Analysis</h3>
                        <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-500 font-medium sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Skill</th>
                                        <th className="px-4 py-3 text-center">Coach</th>
                                        <th className="px-4 py-3 text-center">Self</th>
                                        <th className="px-4 py-3 text-center">Gap</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredRatings.map((r, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-gray-900">
                                                {r.skill}
                                                <span className="block text-xs text-gray-400 font-normal">{r.category}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center text-hfc-brown font-bold">{r.coach_rating || '-'}</td>
                                            <td className="px-4 py-3 text-center text-amber-500 font-bold">{r.self_rating}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={clsx(
                                                    "px-2 py-1 rounded font-bold text-xs",
                                                    r.gap > 0 ? "bg-green-100 text-green-700" :
                                                        r.gap < 0 ? "bg-red-100 text-red-700" :
                                                            "bg-gray-100 text-gray-500"
                                                )}>
                                                    {r.gap > 0 ? `+${r.gap}` : r.gap}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {ratings.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                                                No ratings available. Submit ratings in the Input module first.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
