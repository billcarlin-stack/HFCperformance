import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiService } from '../services/api';
import { Target, Plus, CheckCircle2, Star } from 'lucide-react';

interface WoopGoal {
    id: string;
    player_id: number;
    wish: string;
    outcome: string;
    obstacle: string;
    plan: string;
    status: string;
    week_of: string;
    created_at: string;
}

const WoopGoals = () => {
    const { user } = useAuth();
    const [goals, setGoals] = useState<WoopGoal[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ wish: '', outcome: '', obstacle: '', plan: '' });

    const playerId = user?.jumper_no;

    useEffect(() => {
        if (playerId) {
            ApiService.getWoopGoals(playerId).then(setGoals).catch(console.error).finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [playerId]);

    const handleCreate = async () => {
        if (!playerId || !form.wish.trim()) return;
        setSaving(true);
        try {
            await ApiService.createWoopGoal({ ...form, player_id: playerId });
            const updated = await ApiService.getWoopGoals(playerId);
            setGoals(updated);
            setForm({ wish: '', outcome: '', obstacle: '', plan: '' });
            setShowForm(false);
        } catch (err) {
            console.error('Failed to create goal:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = async (goalId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'completed' ? 'active' : 'completed';
        try {
            await ApiService.updateWoopGoal(goalId, newStatus);
            setGoals(prev => prev.map(g => g.id === goalId ? { ...g, status: newStatus } : g));
        } catch (err) {
            console.error('Failed to update goal:', err);
        }
    };

    const activeGoals = goals.filter(g => g.status === 'active');
    const completedGoals = goals.filter(g => g.status === 'completed');

    if (loading) return (
        <div className="p-8 space-y-4">
            <div className="h-20 bg-white/5 animate-pulse rounded-3xl" />
            <div className="h-40 bg-white/5 animate-pulse rounded-3xl" />
        </div>
    );

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex items-end justify-between border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-3xl font-black text-hawks-gold tracking-tight font-outfit uppercase" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        WOOP <span className="text-hawks-gold">Goals</span>
                    </h1>
                    <p className="text-gray-400 text-sm font-medium mt-1" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                        Wish · Outcome · Obstacle · Plan — Weekly goal setting framework
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 bg-hfc-brown text-white px-5 py-3 rounded-2xl text-sm font-bold hover:bg-hfc-brown transition-colors shadow-lg shadow-hfc-brown/20"
                >
                    <Plus size={16} />
                    New Goal
                </button>
            </div>

            {/* Create Form */}
            {showForm && (
                <div className="bg-hawks-card rounded-3xl border border-white/5 shadow-sm p-8 space-y-5 animate-in fade-in duration-300">
                    <h3 className="font-bold text-lg text-hawks-gold flex items-center gap-2">
                        <Target size={20} className="text-gold-500" />
                        Set a New WOOP Goal
                    </h3>
                    {(['wish', 'outcome', 'obstacle', 'plan'] as const).map((field) => (
                        <div key={field}>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                                {field === 'wish' && '⭐ Wish — What do you want to achieve?'}
                                {field === 'outcome' && '🎯 Outcome — What\'s the best possible result?'}
                                {field === 'obstacle' && '🚧 Obstacle — What stands in your way?'}
                                {field === 'plan' && '📋 Plan — If [obstacle], then I will...'}
                            </label>
                            <textarea
                                value={form[field]}
                                onChange={(e) => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                                rows={2}
                                className="w-full bg-hawks-base border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-hawks-gold/30 focus:border-hawks-gold/30 resize-none transition-all"
                                placeholder={`Enter your ${field}...`}
                            />
                        </div>
                    ))}
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={handleCreate}
                            disabled={saving || !form.wish.trim()}
                            className="bg-hfc-brown text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-hfc-brown transition-colors disabled:opacity-40"
                        >
                            {saving ? 'Saving...' : 'Save Goal'}
                        </button>
                        <button
                            onClick={() => setShowForm(false)}
                            className="px-6 py-3 rounded-xl text-sm font-bold text-gray-400 hover:bg-hawks-hover transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Active Goals */}
            <div className="space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">
                    Active Goals ({activeGoals.length})
                </h3>
                {activeGoals.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                        <Star size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No active goals yet. Create your first WOOP goal!</p>
                    </div>
                )}
                {activeGoals.map(goal => (
                    <div key={goal.id} className="bg-hawks-card rounded-3xl border border-white/5 shadow-sm p-6 space-y-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-hawks-gold/10 border border-hawks-gold/20 flex items-center justify-center">
                                    <Target size={18} className="text-hawks-gold" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-hawks-gold">{goal.wish}</h4>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{goal.week_of}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleToggle(goal.id, goal.status)}
                                className="flex items-center gap-1.5 text-xs font-bold text-green-400 hover:bg-green-500/10 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                <CheckCircle2 size={14} />
                                Complete
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="bg-amber-500/10 rounded-xl p-3 border border-amber-500/20">
                                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">Outcome</p>
                                <p className="text-sm text-amber-200">{goal.outcome || '—'}</p>
                            </div>
                            <div className="bg-amber-500/10 rounded-xl p-3 border border-amber-500/20">
                                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">Obstacle</p>
                                <p className="text-sm text-amber-200">{goal.obstacle || '—'}</p>
                            </div>
                            <div className="bg-green-500/10 rounded-xl p-3 border border-green-500/20">
                                <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-1">Plan</p>
                                <p className="text-sm text-green-200">{goal.plan || '—'}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Completed Goals */}
            {completedGoals.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">
                        Completed ({completedGoals.length})
                    </h3>
                    {completedGoals.map(goal => (
                        <div key={goal.id} className="bg-hawks-base rounded-2xl border border-white/5 p-5 opacity-70">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 size={18} className="text-green-400" />
                                    <span className="font-bold text-gray-400 line-through">{goal.wish}</span>
                                    <span className="text-[10px] text-gray-400 font-bold">{goal.week_of}</span>
                                </div>
                                <button
                                    onClick={() => handleToggle(goal.id, goal.status)}
                                    className="text-[10px] text-gray-400 font-bold hover:text-gray-300 uppercase tracking-widest"
                                >
                                    Reopen
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default WoopGoals;
