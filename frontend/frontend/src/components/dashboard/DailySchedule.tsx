/*
  The Nest — Daily Schedule Widget
  Replaces HawkAI on the dashboard sidebar.
*/

import { useEffect, useState } from 'react';
import { Calendar, Clock, ChevronRight, Info } from 'lucide-react';
import { ApiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';

export const DailySchedule = () => {
    const { user } = useAuth();
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchToday = async () => {
            if (!user) return;
            const today = new Date().toISOString().split('T')[0];
            try {
                const data = await ApiService.getCalendarEvents({
                    start_date: today + 'T00:00:00Z',
                    end_date: today + 'T23:59:59Z',
                    player_id: user.jumper_no || undefined
                });
                setEvents(data);
            } catch (err) {
                console.error("Failed to load daily schedule", err);
            } finally {
                setLoading(false);
            }
        };

        fetchToday();
    }, [user]);

    const getTypeStyles = (type: string | null | undefined) => {
        const t = (type || '').toLowerCase();
        switch (t) {
            case 'main session': return 'bg-amber-500/10 text-hawks-gold border-amber-500/20';
            case 'weights': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
            case 'rehab': return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'media': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            default: return 'bg-white/5 text-gray-400 border-white/10';
        }
    };

    return (
        <div className="bg-hawks-card rounded-3xl border border-white/5 shadow-sm p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-hawks-gold/10 p-2 rounded-xl text-hawks-gold">
                        <Calendar size={20} />
                    </div>
                    <div>
                        <h3 className="font-black text-hawks-gold uppercase tracking-tight text-sm">Today's Schedule</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-0.5">
                            {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' })}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                {loading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-hawks-base rounded-2xl animate-pulse" />
                    ))
                ) : events.length > 0 ? (
                    events.map((event, i) => (
                        <div key={i} className="group cursor-pointer">
                            <div className="bg-hawks-card border border-white/5 p-4 rounded-2xl hover:border-hawks-gold/30 hover:shadow-md transition-all duration-300 relative overflow-hidden">
                                <div className={clsx(
                                    "absolute left-0 top-0 bottom-0 w-1",
                                    event.type?.toLowerCase() === 'main session' ? 'bg-hawks-gold' :
                                        event.type?.toLowerCase() === 'weights' ? 'bg-indigo-500' :
                                            event.type?.toLowerCase() === 'rehab' ? 'bg-red-500' : 'bg-gray-400'
                                )} />

                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={clsx(
                                                "text-[9px] font-black uppercase px-2 py-0.5 rounded-full border",
                                                getTypeStyles(event.type)
                                            )}>
                                                {event.type}
                                            </span>
                                            <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                                                <Clock size={10} />
                                                {new Date(event.start_time).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                            </span>
                                        </div>
                                        <h4 className="font-black text-hawks-gold text-sm truncate group-hover:text-hawks-gold transition-colors font-outfit">
                                            {event.title}
                                        </h4>
                                    </div>
                                    <ChevronRight size={16} className="text-gray-500 group-hover:text-hawks-gold transform group-hover:translate-x-1 transition-all" />
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center h-full py-10 opacity-40">
                        <Info size={32} className="mb-2" />
                        <p className="text-xs font-bold uppercase tracking-widest">No tasks assigned</p>
                    </div>
                )}
            </div>

            <button className="mt-6 w-full py-3 bg-hawks-base hover:bg-hawks-hover text-gray-400 hover:text-hawks-gold rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 hover:border-hawks-gold/20">
                View Weekly Calendar
            </button>
        </div>
    );
};
