/*
  The Nest — Squad Calendar
  Full page weekly view with event creation for coaches.
*/

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiService } from '../services/api';
import {
    Plus,
    ChevronLeft,
    ChevronRight,
    Clock,
    Users,
    Trash2,
    X,
} from 'lucide-react';
import { clsx } from 'clsx';

const EVENT_TYPES = [
    { label: 'Main Session', color: 'bg-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    { label: 'Weights', color: 'bg-indigo-500', bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
    { label: 'Media', color: 'bg-purple-500', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
    { label: 'Rehab', color: 'bg-red-500', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
    { label: 'Recovery', color: 'bg-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    { label: 'Other', color: 'bg-gray-500', bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20' },
];

const CalendarPage = () => {
    const { user } = useAuth();
    const isCoach = user?.role === 'coach';

    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<any[]>([]);
    const [players, setPlayers] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        type: 'Main Session',
        description: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '11:00',
        player_ids: [] as number[],
    });

    useEffect(() => {
        const load = async () => {
            try {
                // Get start and end of week
                const start = new Date(currentDate);
                start.setDate(start.getDate() - start.getDay() + 1); // Monday
                start.setHours(0, 0, 0, 0);

                const end = new Date(start);
                end.setDate(end.getDate() + 6); // Sunday
                end.setHours(23, 59, 59, 999);

                const [eventsData, playersData] = await Promise.all([
                    ApiService.getCalendarEvents({
                        start_date: start.toISOString(),
                        end_date: end.toISOString(),
                        player_id: isCoach ? undefined : user?.jumper_no || undefined
                    }),
                    isCoach ? ApiService.getPlayers() : Promise.resolve([])
                ]);

                setEvents(eventsData);
                setPlayers(playersData);
            } catch (err) {
                console.error("Failed to load calendar", err);
            }
        };
        load();
    }, [currentDate, user, isCoach]);

    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() - d.getDay() + 1 + i);
        return d;
    });

    const handleAddEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const startStr = `${formData.date}T${formData.startTime}:00Z`;
            const endStr = `${formData.date}T${formData.endTime}:00Z`;

            await ApiService.createCalendarEvent({
                title: formData.title,
                type: formData.type,
                description: formData.description,
                start_time: startStr,
                end_time: endStr,
                player_ids: formData.player_ids
            });

            // Refresh
            const start = new Date(currentDate);
            start.setDate(start.getDate() - start.getDay() + 1);
            const end = new Date(start);
            end.setDate(end.getDate() + 6);

            const refreshed = await ApiService.getCalendarEvents({
                start_date: start.toISOString(),
                end_date: end.toISOString(),
                player_id: isCoach ? undefined : user?.jumper_no || undefined
            });
            setEvents(refreshed);

            setShowModal(false);
            setFormData({
                title: '',
                type: 'Main Session',
                description: '',
                date: new Date().toISOString().split('T')[0],
                startTime: '09:00',
                endTime: '11:00',
                player_ids: []
            });
        } catch (err) {
            console.error("Failed to save event", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Delete this event?")) return;
        try {
            await ApiService.deleteCalendarEvent(id);
            setEvents(events.filter(e => e.id !== id));
        } catch (err) {
            console.error("Failed to delete", err);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex items-center justify-between pb-6 border-b border-white/5">
                <div>
                    <h1 className="text-3xl font-black text-hawks-gold tracking-tight uppercase font-outfit" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        Squad <span className="text-hawks-gold">Calendar</span>
                    </h1>
                    <p className="text-gray-400 font-medium text-sm mt-1">Weekly session schedule and tasks.</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-hawks-card border border-white/10 rounded-2xl shadow-card p-1">
                        <button
                            onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 7)))}
                            className="p-2 hover:bg-hawks-hover rounded-xl transition-colors text-gray-400"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <span className="px-4 font-black text-hawks-gold text-sm uppercase">
                            {weekDays[0].toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })} - {weekDays[6].toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}
                        </span>
                        <button
                            onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 7)))}
                            className="p-2 hover:bg-hawks-hover rounded-xl transition-colors text-gray-400"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {isCoach && (
                        <button
                            onClick={() => {
                                setFormData({ ...formData, date: new Date().toISOString().split('T')[0] });
                                setShowModal(true);
                            }}
                            className="flex items-center gap-2 bg-gradient-to-r from-hfc-brown to-hfc-brown text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-hfc-brown/20 hover:scale-105 transition-all"
                        >
                            <Plus size={16} />
                            Add Event
                        </button>
                    )}
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="bg-hawks-card rounded-3xl border border-white/5 shadow-card overflow-hidden min-h-[600px]">
                <div className="grid grid-cols-7 border-b border-white/5">
                    {weekDays.map((date, i) => (
                        <div key={i} className={clsx(
                            "p-4 text-center border-r border-white/5 last:border-0",
                            date.toDateString() === new Date().toDateString() ? "bg-hawks-gold/5" : ""
                        )}>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-2">
                                {date.toLocaleDateString('en-AU', { weekday: 'short' })}
                            </p>
                            <p className={clsx(
                                "text-2xl font-black font-outfit leading-none",
                                date.toDateString() === new Date().toDateString() ? "text-hawks-gold" : "text-hawks-gold"
                            )}>
                                {date.getDate()}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 divide-x divide-white/5 min-h-[500px]">
                    {weekDays.map((date, dayIdx) => {
                        const dateStr = date.toISOString().split('T')[0];
                        const dayEvents = events.filter(e => e.start_time.split('T')[0] === dateStr);

                        return (
                            <div key={dayIdx} className={clsx(
                                "p-3 space-y-3",
                                date.toDateString() === new Date().toDateString() ? "bg-hawks-gold/[0.02]" : ""
                            )}>
                                {dayEvents.map((event, eventIdx) => {
                                    const typeData = EVENT_TYPES.find(t => t.label === event.type) || EVENT_TYPES[5];
                                    const startTime = new Date(event.start_time).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true });

                                    return (
                                        <div key={eventIdx} className={clsx(
                                            "group p-3 rounded-2xl border transition-all duration-300 relative",
                                            typeData.bg, typeData.border, "hover:shadow-md"
                                        )}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-1.5 overflow-hidden">
                                                    <div className={clsx("w-2 h-2 rounded-full", typeData.color)} />
                                                    <span className={clsx("text-[9px] font-black uppercase truncate", typeData.text)}>
                                                        {event.type}
                                                    </span>
                                                </div>
                                                {isCoach && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(event.id); }}
                                                        className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                )}
                                            </div>

                                            <h4 className="text-xs font-black text-hawks-gold mb-1 line-clamp-2 leading-tight uppercase tracking-tight">
                                                {event.title}
                                            </h4>

                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                                                <Clock size={10} className="text-gray-500" />
                                                {startTime}
                                            </div>

                                            {event.player_ids.length > 0 ? (
                                                <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-1 text-[9px] font-bold text-gray-500">
                                                    <Users size={10} />
                                                    {event.player_ids.length} Player{event.player_ids.length > 1 ? 's' : ''}
                                                </div>
                                            ) : (
                                                <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-1 text-[9px] font-black text-hawks-gold uppercase italic">
                                                    <Users size={10} />
                                                    Full Squad
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {dayEvents.length === 0 && (
                                    <div className="h-20 border-2 border-dashed border-white/5 rounded-3xl flex items-center justify-center opacity-30">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Rest Day</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Modals & Helpers */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-hawks-card rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="bg-hfc-brown p-8 flex items-center justify-between text-white">
                            <div>
                                <h3 className="text-2xl font-black uppercase font-outfit">Add Session <span className="text-gold-400">Event</span></h3>
                                <p className="text-amber-300 text-xs font-bold uppercase tracking-widest mt-1">Assign tasks to squad members</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="bg-white/10 p-2 rounded-2xl hover:bg-white/20 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleAddEvent} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 block" style={{ fontFamily: 'Work Sans, sans-serif' }}>Event Title</label>
                                    <input
                                        type="text" required
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full bg-hawks-base border border-white/10 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-hawks-gold/30 ring-offset-2 ring-offset-hawks-card outline-none transition-all font-bold text-gray-100 placeholder-gray-500"
                                        placeholder="e.g., Tactical Walkthrough"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 block" style={{ fontFamily: 'Work Sans, sans-serif' }}>Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full bg-hawks-base border border-white/10 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-hawks-gold/30 ring-offset-2 ring-offset-hawks-card outline-none transition-all font-bold text-gray-100 appearance-none cursor-pointer"
                                    >
                                        {EVENT_TYPES.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 block" style={{ fontFamily: 'Work Sans, sans-serif' }}>Date</label>
                                    <input
                                        type="date" required
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full bg-hawks-base border border-white/10 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-hawks-gold/30 ring-offset-2 ring-offset-hawks-card outline-none transition-all font-bold text-gray-100"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 block" style={{ fontFamily: 'Work Sans, sans-serif' }}>Starts</label>
                                    <input
                                        type="time" required
                                        value={formData.startTime}
                                        onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                        className="w-full bg-hawks-base border border-white/10 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-hawks-gold/30 ring-offset-2 ring-offset-hawks-card outline-none transition-all font-bold text-gray-100"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 block" style={{ fontFamily: 'Work Sans, sans-serif' }}>Ends</label>
                                    <input
                                        type="time" required
                                        value={formData.endTime}
                                        onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                        className="w-full bg-hawks-base border border-white/10 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-hawks-gold/30 ring-offset-2 ring-offset-hawks-card outline-none transition-all font-bold text-gray-100"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 block" style={{ fontFamily: 'Work Sans, sans-serif' }}>Assign To (Empty = Whole Squad)</label>
                                    <div className="grid grid-cols-4 gap-2 h-32 overflow-y-auto p-4 bg-hawks-base rounded-2xl border border-white/10 custom-scrollbar">
                                        {players.map(p => (
                                            <button
                                                key={p.jumper_no}
                                                type="button"
                                                onClick={() => {
                                                    const current = formData.player_ids;
                                                    if (current.includes(p.jumper_no)) {
                                                        setFormData({ ...formData, player_ids: current.filter(id => id !== p.jumper_no) });
                                                    } else {
                                                        setFormData({ ...formData, player_ids: [...current, p.jumper_no] });
                                                    }
                                                }}
                                                className={clsx(
                                                    "p-2 rounded-xl text-[10px] font-black border transition-all",
                                                    formData.player_ids.includes(p.jumper_no)
                                                        ? "bg-hfc-brown text-white border-hfc-brown shadow-md"
                                                        : "bg-hawks-card text-gray-400 border-white/10 hover:border-hawks-gold/30"
                                                )}
                                            >
                                                #{p.jumper_no} {p.name.split(' ').pop()}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 block" style={{ fontFamily: 'Work Sans, sans-serif' }}>Description / Notes</label>
                                    <textarea
                                        rows={3}
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full bg-hawks-base border border-white/10 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-hawks-gold/30 ring-offset-2 ring-offset-hawks-card outline-none transition-all font-bold text-gray-100 resize-none placeholder-gray-500"
                                        placeholder="Add further details here..."
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSaving}
                                className="w-full py-5 rounded-[20px] bg-hfc-brown text-white font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-hfc-brown/20 hover:bg-hfc-brown hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-50"
                            >
                                {isSaving ? 'Scheduling...' : 'Confirm Session Event'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarPage;
