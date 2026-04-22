/*
  The Nest — Coach Ratings Module

  Module 2: Survey interface for coaches to rate players on specific skills.
*/

import { useEffect, useState } from 'react';
import { ApiService, formatPlayerImage } from '../services/api';
import type { Player } from '../services/api';
import { Save, User } from 'lucide-react';
import { useRounds } from '../hooks/useRounds';
import { RoundSelector } from '../components/common/RoundSelector';

const SKILL_CATEGORIES = {
    "Technical": [
        "Kicking (Short 15-30m)", "Kicking (Long 50m+)", "Goal Kicking Accuracy",
        "Non-Preferred Foot Effectiveness", "Handball Execution (Traffic)",
        "Handball Vision & Creativity", "Clean Hands (Ground Level)",
        "Contested Marking", "Uncontested/Spread Marking", "Intercept Marking",
        "Lead-up Marking", "Ground Balls (Clean)", "Ground Balls (Pressure/Traffic)",
        "Tackling Technique", "Tackling Effectiveness", "Spoiling & Body Spoils",
        "Smothering Capability", "Ruck Setup / Tap Work"
    ],
    "Tactical": [
        "Offensive Positioning / Spread", "Defensive Positioning / Zone",
        "Stoppage Positioning / Setup", "Decision Making (With Ball / Under Pressure)",
        "Decision Making (Without Ball / Leading)", "Reading the Play / Anticipation",
        "Team Structure Adherence", "Game Sense / Overall Awareness",
        "Transition Running (Offense to Defense)", "Transition Running (Defense to Offense)"
    ],
    "Physical": [
        "Acceleration (First 10m)", "Top Speed Capabilities", "Agility & Lateral Movement",
        "Aerobic Endurance / Running Capacity", "Anaerobic Repeated Sprint Ability",
        "Core Strength & Stability", "Contested 1-on-1 Strength", "Vertical Jump / Leap",
        "Explosiveness out of contests", "Recovery Rate Between Efforts"
    ],
    "Mental": [
        "Resilience / Bouncing Back from Mistakes", "On-Field Leadership & Direction",
        "Off-Field Leadership & Professionalism", "Communication / Voice on Field",
        "Work Rate / Effort", "Focus & Concentration across 4 quarters",
        "Coachability & Tactical Implementation", "Aggression & Physicality",
        "Composure Under Extreme Pressure", "Self-Motivation & Drive"
    ]
};

export const CoachRatings = () => {
    const [players, setPlayers] = useState<Player[]>([]);
    const [selectedPlayerId, setSelectedPlayerId] = useState<number>(0);
    const [ratings, setRatings] = useState<Record<string, number>>({});
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const { seasons, selectedSeason, setSelectedSeason, rounds, selectedRound, setSelectedRound } = useRounds();

    useEffect(() => {
        ApiService.getPlayers().then(setPlayers).finally(() => setLoading(false));
    }, []);

    const handleRatingChange = (category: string, skill: string, value: number) => {
        setRatings(prev => ({ ...prev, [`${category}_${skill}`]: value }));
    };

    const handleNoteChange = (category: string, skill: string, value: string) => {
        setNotes(prev => ({ ...prev, [`${category}_${skill}`]: value }));
    };

    const handleSubmit = async () => {
        if (!selectedPlayerId) return alert("Select a player first.");

        // Prepare bulk submission (or sequential)
        // For MVP, we'll just log to console or send one by one.
        // Ideally backend accepts bulk, but `submitRating` is single.
        // We'll just loop and submit for now (inefficient but works for MVP).

        const promises = [];
        for (const [key, value] of Object.entries(ratings)) {
            const [category, skill] = key.split('_');
            const note = notes[key] || '';

            promises.push(ApiService.submitRating({
                player_id: selectedPlayerId,
                skill_category: category,
                skill_name: skill,
                rating_value: value,
                notes: note,
                round_id: selectedRound?.id,
            }));
        }

        try {
            await Promise.all(promises);
            alert("Ratings saved successfully!");
            setRatings({});
            setNotes({});
        } catch (err) {
            console.error(err);
            alert("Error saving ratings.");
        }
    };

    const selectedPlayer = players.find(p => p.jumper_no === selectedPlayerId);

    if (loading) return <div className="text-gray-400">Loading...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-100" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Coach Development Ratings</h1>
                    <p className="text-gray-400">Assess player skills on a 1-10 scale.</p>
                </div>

                <div className="flex items-end gap-4">
                {/* Round Selector */}
                <RoundSelector seasons={seasons} selectedSeason={selectedSeason} onSeasonChange={setSelectedSeason} rounds={rounds} selectedRound={selectedRound} onRoundChange={setSelectedRound} />

                {/* Player Selector */}
                <div className="w-full md:w-72">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1" style={{ fontFamily: 'Work Sans, sans-serif' }}>Select Player</label>
                    <div className="relative">
                        <select
                            className="w-full p-3 pl-10 bg-hawks-card border border-white/10 rounded-xl appearance-none focus:ring-2 focus:ring-hawks-gold/30 focus:outline-none font-medium shadow-card text-gray-100"
                            value={selectedPlayerId}
                            onChange={e => setSelectedPlayerId(Number(e.target.value))}
                        >
                            <option value={0}>Choose a player...</option>
                            {players.map(p => (
                                <option key={p.jumper_no} value={p.jumper_no}>#{p.jumper_no} {p.name}</option>
                            ))}
                        </select>
                        <User className="absolute left-3 top-3.5 text-gray-500" size={18} />
                    </div>
                </div>
                </div>
            </div>

            {selectedPlayer && (
                <div className="bg-hawks-card p-6 rounded-2xl shadow-card border border-white/5 flex items-center gap-6">
                    <div className="w-20 h-20 rounded-full border-2 border-hawks-gold p-1">
                        <img
                            src={formatPlayerImage(selectedPlayer.jumper_no, selectedPlayer.photo_url)}
                            alt={selectedPlayer.name}
                            className="w-full h-full object-cover rounded-full bg-hawks-base"
                        />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-100">{selectedPlayer.name} #{selectedPlayer.jumper_no}</h2>
                        <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                            <span className="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-medium">{selectedPlayer.position}</span>
                            <span>{selectedPlayer.age} years old</span>
                            <span>{selectedPlayer.games} games</span>
                        </div>
                    </div>
                </div>
            )}

            {selectedPlayerId !== 0 && (
                <div className="space-y-8 pb-20">
                    {Object.entries(SKILL_CATEGORIES).map(([category, skills]) => (
                        <div key={category} className="bg-hawks-card rounded-2xl shadow-card border border-white/5 overflow-hidden">
                            <div className="bg-hawks-hover px-6 py-4 border-b border-white/5">
                                <h3 className="font-bold text-lg text-gray-100" style={{ fontFamily: 'Work Sans, sans-serif' }}>{category}</h3>
                            </div>
                            <div className="p-6 space-y-8">
                                {skills.map(skill => {
                                    const key = `${category}_${skill}`;
                                    const val = ratings[key] || 5; // Default middle

                                    return (
                                        <div key={skill} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                                            <div className="md:col-span-3">
                                                <label className="font-medium text-gray-100 block">{skill}</label>
                                            </div>

                                            <div className="md:col-span-5 flex items-center gap-4">
                                                <span className="text-xs font-bold text-gray-500">1</span>
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="10"
                                                    step="1"
                                                    value={val}
                                                    onChange={e => handleRatingChange(category, skill, Number(e.target.value))}
                                                    className="w-full h-2 bg-hawks-hover rounded-lg appearance-none cursor-pointer accent-hfc-brown"
                                                />
                                                <span className="text-xs font-bold text-gray-500">10</span>
                                                <div className="w-12 h-10 flex items-center justify-center bg-hfc-brown text-white font-bold rounded-lg shadow-card border border-amber-800">
                                                    {val}
                                                </div>
                                            </div>

                                            <div className="md:col-span-4">
                                                <input
                                                    type="text"
                                                    placeholder="Optional notes..."
                                                    className="w-full p-2 text-sm border border-white/10 rounded-lg bg-hawks-base text-gray-100 focus:ring-1 focus:ring-hawks-gold/30 focus:outline-none placeholder-gray-500"
                                                    value={notes[key] || ''}
                                                    onChange={e => handleNoteChange(category, skill, e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    <div className="fixed bottom-0 left-64 right-0 p-4 bg-hawks-card border-t border-white/10 flex justify-end gap-4 z-40">
                        <button
                            onClick={handleSubmit}
                            className="bg-hfc-brown text-white px-8 py-3 rounded-xl font-bold hover:bg-amber-900 transition-colors flex items-center gap-2 shadow-lg"
                        >
                            <Save size={20} />
                            Save All Ratings
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
