/*
  The Nest — Injury & Load Log Dashboard

  Module 1: Tracks player injuries and updates their status.
*/

import { useEffect, useState, useMemo } from 'react';
import { ApiService } from '../services/api';
import type { Injury, Player } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
    Activity,
    AlertCircle,
    CheckCircle,
    Clock,
    Plus,
    Save,
    Pencil,
    Check,
    X
} from 'lucide-react';
import { clsx } from 'clsx';

const BODY_AREAS = [
    'Head/Neck', 'Shoulder', 'Upper Arm', 'Elbow', 'Forearm',
    'Hand/Wrist', 'Back/Spine', 'Chest/Abdo', 'Hip/Groin',
    'Thigh', 'Knee', 'Lower Leg', 'Ankle', 'Foot/Toes'
];

export const InjuryDashboard = () => {
    const { user } = useAuth();
    const [injuries, setInjuries] = useState<Injury[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [formData, setFormData] = useState<Partial<Injury>>({
        player_id: user?.role === 'player' ? (user.jumper_no || 0) : 0,
        injury_type: '',
        body_area: '',
        severity: 'Minor',
        status: 'Active',
        notes: ''
    });

    // Filter State
    const [filterStatuses, setFilterStatuses] = useState<string[]>(['Active', 'Recovering', 'Cleared']);
    const [filterPlayer, setFilterPlayer] = useState<number>(0);
    const [filterSeverity, setFilterSeverity] = useState<string>('');

    // Edit State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<Partial<Injury>>({});

    // Ensure player_id is set if user role is player
    useEffect(() => {
        if (user?.role === 'player' && user.jumper_no) {
            setFormData(prev => ({ ...prev, player_id: user.jumper_no || 0 }));
        }
    }, [user]);

    const fetchData = async () => {
        try {
            const [injData, playersData] = await Promise.all([
                ApiService.getInjuries(),
                ApiService.getPlayers()
            ]);
            setInjuries(injData);
            setPlayers(playersData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.player_id) return alert("Please select a player");

        try {
            await ApiService.logInjury(formData);
            alert("Injury logged and player status updated!");
            setFormData({ ...formData, injury_type: '', body_area: '', notes: '' });
            fetchData();
        } catch (err) {
            alert("Failed to save injury log");
        }
    };

    // Filtered injuries
    const filteredInjuries = useMemo(() => {
        return injuries.filter(i => {
            if (!filterStatuses.includes(i.status)) return false;
            if (filterPlayer && i.player_id !== filterPlayer) return false;
            if (filterSeverity && i.severity !== filterSeverity) return false;
            return true;
        });
    }, [injuries, filterStatuses, filterPlayer, filterSeverity]);

    // Toggle a status filter
    const toggleStatus = (status: string) => {
        setFilterStatuses(prev =>
            prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
        );
    };

    // Start editing a row
    const startEditing = (injury: Injury) => {
        setEditingId(injury.id);
        setEditData({
            injury_type: injury.injury_type,
            body_area: injury.body_area,
            severity: injury.severity,
            status: injury.status,
            notes: injury.notes
        });
    };

    // Save edit
    const saveEdit = async () => {
        if (!editingId) return;
        try {
            await ApiService.updateInjury(editingId, editData);
            setEditingId(null);
            setEditData({});
            fetchData();
        } catch (err) {
            alert("Failed to update injury");
        }
    };

    // Cancel edit
    const cancelEdit = () => {
        setEditingId(null);
        setEditData({});
    };

    // KPIs
    const activeCount = injuries.filter(i => i.status === 'Active').length;
    const recoveringCount = injuries.filter(i => i.status === 'Recovering').length;
    const clearedCount = injuries.filter(i => i.status === 'Cleared').length;
    const totalCount = injuries.length;

    if (loading) return <div className="p-10 text-center text-gray-400">Loading module...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-bold text-gray-100" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Injury & Load Log</h1>
                <p className="text-gray-400">Manage injury records and update player availability status.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-hawks-card p-5 rounded-xl shadow-card border border-white/5 flex items-center gap-4">
                    <div className="p-3 bg-red-500/10 text-red-400 rounded-lg"><AlertCircle size={24} /></div>
                    <div>
                        <div className="text-2xl font-bold text-gray-100">{activeCount}</div>
                        <div className="text-xs text-gray-400 uppercase font-medium">Active Injuries</div>
                    </div>
                </div>
                <div className="bg-hawks-card p-5 rounded-xl shadow-card border border-white/5 flex items-center gap-4">
                    <div className="p-3 bg-amber-500/10 text-amber-400 rounded-lg"><Clock size={24} /></div>
                    <div>
                        <div className="text-2xl font-bold text-gray-100">{recoveringCount}</div>
                        <div className="text-xs text-gray-400 uppercase font-medium">Recovering</div>
                    </div>
                </div>
                <div className="bg-hawks-card p-5 rounded-xl shadow-card border border-white/5 flex items-center gap-4">
                    <div className="p-3 bg-green-500/10 text-green-400 rounded-lg"><CheckCircle size={24} /></div>
                    <div>
                        <div className="text-2xl font-bold text-gray-100">{clearedCount}</div>
                        <div className="text-xs text-gray-400 uppercase font-medium">Cleared</div>
                    </div>
                </div>
                <div className="bg-hawks-card p-5 rounded-xl shadow-card border border-white/5 flex items-center gap-4">
                    <div className="p-3 bg-amber-500/10 text-amber-400 rounded-lg"><Activity size={24} /></div>
                    <div>
                        <div className="text-2xl font-bold text-gray-100">{totalCount}</div>
                        <div className="text-xs text-gray-400 uppercase font-medium">Total Records</div>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-hawks-card p-4 rounded-xl shadow-card border border-white/5 flex flex-wrap items-center gap-4">
                <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Filters</span>

                {/* Status Toggles */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => toggleStatus('Active')}
                        className={clsx(
                            "px-3 py-1.5 rounded-lg text-xs font-bold uppercase border transition-colors",
                            filterStatuses.includes('Active')
                                ? "bg-red-500/20 text-red-400 border-red-500/40"
                                : "bg-hawks-hover text-gray-500 border-white/10"
                        )}
                    >
                        Active
                    </button>
                    <button
                        onClick={() => toggleStatus('Recovering')}
                        className={clsx(
                            "px-3 py-1.5 rounded-lg text-xs font-bold uppercase border transition-colors",
                            filterStatuses.includes('Recovering')
                                ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                                : "bg-hawks-hover text-gray-500 border-white/10"
                        )}
                    >
                        Recovering
                    </button>
                    <button
                        onClick={() => toggleStatus('Cleared')}
                        className={clsx(
                            "px-3 py-1.5 rounded-lg text-xs font-bold uppercase border transition-colors",
                            filterStatuses.includes('Cleared')
                                ? "bg-green-500/20 text-green-400 border-green-500/40"
                                : "bg-hawks-hover text-gray-500 border-white/10"
                        )}
                    >
                        Cleared
                    </button>
                </div>

                {/* Player Filter */}
                <select
                    className="bg-hawks-base border-white/10 border rounded-lg px-3 py-2 text-sm text-gray-100"
                    value={filterPlayer}
                    onChange={e => setFilterPlayer(Number(e.target.value))}
                >
                    <option value={0}>All Players</option>
                    {players.map(p => (
                        <option key={p.jumper_no} value={p.jumper_no}>#{p.jumper_no} {p.name}</option>
                    ))}
                </select>

                {/* Severity Filter */}
                <select
                    className="bg-hawks-base border-white/10 border rounded-lg px-3 py-2 text-sm text-gray-100"
                    value={filterSeverity}
                    onChange={e => setFilterSeverity(e.target.value)}
                >
                    <option value="">All Severities</option>
                    <option value="Minor">Minor</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Major">Major</option>
                </select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Log Table */}
                <div className="lg:col-span-2 bg-hawks-card rounded-xl shadow-card border border-white/5 overflow-hidden">
                    <div className="p-6 border-b border-white/5">
                        <h3 className="font-bold text-lg text-gray-100">Recent Logs</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-hawks-hover text-gray-400 font-medium border-b border-white/5">
                                <tr>
                                    <th className="px-3 py-3">Date</th>
                                    <th className="px-3 py-3">Player</th>
                                    <th className="px-3 py-3">Injury</th>
                                    <th className="px-3 py-3">Severity</th>
                                    <th className="px-3 py-3">Status</th>
                                    <th className="px-3 py-3 sticky right-0 bg-hawks-hover"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredInjuries.map(log => (
                                    editingId === log.id ? (
                                        <tr key={log.id} className="bg-hawks-hover/50">
                                            <td className="px-3 py-3 text-gray-400 text-xs">{log.date}</td>
                                            <td className="px-3 py-3 font-medium text-gray-100 text-xs">{log.player_name}</td>
                                            <td className="px-3 py-3">
                                                <input
                                                    type="text"
                                                    className="bg-hawks-base border-white/10 border rounded px-2 py-1 text-xs text-gray-100 w-28 mb-1"
                                                    value={editData.injury_type || ''}
                                                    onChange={e => setEditData({ ...editData, injury_type: e.target.value })}
                                                />
                                                <select
                                                    className="bg-hawks-base border-white/10 border rounded px-2 py-1 text-xs text-gray-100 w-28"
                                                    value={editData.body_area || ''}
                                                    onChange={e => setEditData({ ...editData, body_area: e.target.value })}
                                                >
                                                    {BODY_AREAS.map(area => (
                                                        <option key={area} value={area}>{area}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-3 py-3">
                                                <select
                                                    className="bg-hawks-base border-white/10 border rounded px-2 py-1 text-xs text-gray-100"
                                                    value={editData.severity || 'Minor'}
                                                    onChange={e => setEditData({ ...editData, severity: e.target.value as Injury['severity'] })}
                                                >
                                                    <option value="Minor">Minor</option>
                                                    <option value="Moderate">Moderate</option>
                                                    <option value="Major">Major</option>
                                                </select>
                                            </td>
                                            <td className="px-3 py-3">
                                                <select
                                                    className="bg-hawks-base border-white/10 border rounded px-2 py-1 text-xs text-gray-100"
                                                    value={editData.status || 'Active'}
                                                    onChange={e => setEditData({ ...editData, status: e.target.value as Injury['status'] })}
                                                >
                                                    <option value="Active">Active</option>
                                                    <option value="Recovering">Recovering</option>
                                                    <option value="Cleared">Cleared</option>
                                                </select>
                                            </td>
                                            <td className="px-3 py-3 sticky right-0 bg-hawks-hover/50">
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={saveEdit}
                                                        className="p-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20"
                                                        title="Save"
                                                    >
                                                        <Check size={14} />
                                                    </button>
                                                    <button
                                                        onClick={cancelEdit}
                                                        className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                                        title="Cancel"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        <tr key={log.id} className="hover:bg-hawks-hover transition-colors">
                                            <td className="px-3 py-3 text-gray-400 text-xs">{log.date}</td>
                                            <td className="px-3 py-3 font-medium text-gray-100 text-xs">{log.player_name}</td>
                                            <td className="px-3 py-3 text-gray-100">
                                                <div className="text-xs font-bold">{log.injury_type}</div>
                                                <div className="text-[10px] text-gray-500">{log.body_area}</div>
                                                {log.notes && (
                                                    <div className="text-[10px] text-gray-600 truncate max-w-[140px]" title={log.notes}>{log.notes}</div>
                                                )}
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className={clsx(
                                                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                                    log.severity === 'Major' ? 'bg-red-500/10 text-red-400' :
                                                        log.severity === 'Moderate' ? 'bg-amber-500/10 text-amber-400' :
                                                            'bg-green-500/10 text-green-400'
                                                )}>
                                                    {log.severity}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-gray-100 text-xs">
                                                <div className="flex items-center gap-1.5">
                                                    <div className={clsx(
                                                        "w-1.5 h-1.5 rounded-full",
                                                        log.status === 'Active' ? 'bg-red-500' :
                                                            log.status === 'Recovering' ? 'bg-amber-500' :
                                                                'bg-green-500'
                                                    )}></div>
                                                    {log.status}
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 sticky right-0 bg-hawks-card">
                                                <button
                                                    onClick={() => startEditing(log)}
                                                    className="p-1.5 rounded-lg bg-hawks-hover text-gray-400 hover:text-hawks-gold hover:bg-hawks-base transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                ))}
                                {filteredInjuries.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No injury records match the current filters.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Notes editing area shown below table when editing */}
                    {editingId && (
                        <div className="p-4 border-t border-white/5">
                            <label className="block text-xs text-gray-400 uppercase font-bold mb-1">Notes</label>
                            <textarea
                                className="w-full bg-hawks-base border-white/10 border rounded px-2 py-1 text-sm text-gray-100 h-20 focus:ring-2 focus:ring-hawks-gold/30 focus:outline-none"
                                value={editData.notes || ''}
                                onChange={e => setEditData({ ...editData, notes: e.target.value })}
                                placeholder="Add notes about this injury..."
                            />
                        </div>
                    )}
                </div>

                {/* Right Column: Entry Form */}
                <div className="bg-hawks-card p-6 rounded-xl shadow-card border border-white/5 h-fit">
                    <h3 className="font-bold text-lg text-gray-100 mb-6 flex items-center gap-2">
                        <Plus size={20} className="text-hawks-gold" />
                        Log New Entry
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-100 mb-1">Player</label>
                            <select
                                className={clsx(
                                    "w-full p-2 border border-white/10 rounded-lg bg-hawks-base focus:ring-2 focus:ring-hawks-gold/30 focus:outline-none text-gray-100",
                                    user?.role === 'player' && "bg-hawks-base text-gray-500 cursor-not-allowed"
                                )}
                                value={formData.player_id}
                                onChange={e => setFormData({ ...formData, player_id: Number(e.target.value) })}
                                required
                                disabled={user?.role === 'player'}
                            >
                                <option value={0}>Select Player...</option>
                                {players.map(p => (
                                    <option key={p.jumper_no} value={p.jumper_no}>#{p.jumper_no} {p.name}</option>
                                ))}
                            </select>
                            {user?.role === 'player' && (
                                <p className="text-[10px] text-gray-500 mt-1 italic">Players can only log entries for their own records.</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-100 mb-1">Injury Type</label>
                            <input
                                type="text"
                                placeholder="e.g. Hamstring"
                                className="w-full p-2 border border-white/10 rounded-lg bg-hawks-base text-gray-100 focus:ring-2 focus:ring-hawks-gold/30 focus:outline-none placeholder-gray-500"
                                value={formData.injury_type}
                                onChange={e => setFormData({ ...formData, injury_type: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-100 mb-1">Body Area</label>
                            <select
                                className="w-full p-2 border border-white/10 rounded-lg bg-hawks-base text-gray-100 focus:ring-2 focus:ring-hawks-gold/30 focus:outline-none"
                                value={formData.body_area}
                                onChange={e => setFormData({ ...formData, body_area: e.target.value })}
                                required
                            >
                                <option value="">Select Area...</option>
                                {BODY_AREAS.map(area => (
                                    <option key={area} value={area}>{area}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-100 mb-1">Severity</label>
                            <select
                                className="w-full p-2 border border-white/10 rounded-lg bg-hawks-base text-gray-100 focus:ring-2 focus:ring-hawks-gold/30 focus:outline-none"
                                value={formData.severity}
                                onChange={e => setFormData({ ...formData, severity: e.target.value as any })}
                            >
                                <option value="Minor">Minor</option>
                                <option value="Moderate">Moderate</option>
                                <option value="Major">Major</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-100 mb-1">Current Status</label>
                            <select
                                className="w-full p-2 border border-white/10 rounded-lg bg-hawks-base text-gray-100 focus:ring-2 focus:ring-hawks-gold/30 focus:outline-none"
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                            >
                                <option value="Active">Active Injury (Unavailable)</option>
                                <option value="Recovering">Recovering (Modified)</option>
                                <option value="Cleared">Cleared (Full Training)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-100 mb-1">Notes</label>
                            <textarea
                                className="w-full p-2 border border-white/10 rounded-lg bg-hawks-base text-gray-100 focus:ring-2 focus:ring-hawks-gold/30 focus:outline-none h-24 placeholder-gray-500"
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            ></textarea>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-hfc-brown text-white py-3 rounded-xl font-bold hover:bg-amber-900 transition-colors flex items-center justify-center gap-2"
                        >
                            <Save size={18} />
                            Log Entry & Update Status
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
