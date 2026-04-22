import { useEffect, useState } from 'react';
import { api, formatPlayerImage } from '../services/api';
import { Clock, Navigation } from 'lucide-react';

interface TimelineEvent {
    id: string;
    timestamp: string;
    player_id: number;
    player_name: string;
    action: string;
    quarter: string;
    time_remaining: string;
    coordinates?: string;
}

export const EventTimeline = () => {
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTimeline = async () => {
            try {
                const res = await api.get<{ events: TimelineEvent[] }>('/timeline/events');
                setEvents(res.data.events);
            } catch (error) {
                console.error('Error fetching timeline events:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTimeline();
    }, []);

    if (loading) {
        return <div className="p-20 text-center font-bold text-amber-500 uppercase tracking-widest">Loading Match Timeline...</div>;
    }

    return (
        <div className="p-8 max-w-[800px] mx-auto space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-4xl font-black text-hawks-gold uppercase tracking-tighter" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Event Timeline</h1>
                <p className="text-amber-500 font-bold uppercase tracking-widest text-xs mt-2">Ball-in-Play CTR Data Feed</p>
            </div>

            <div className="relative before:absolute before:inset-0 before:ml-12 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-1 before:bg-gradient-to-b before:from-amber-400 before:via-amber-200/20 before:to-transparent">
                {events.map((event, idx) => (
                    <div key={event.id || idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mt-6 first:mt-0">
                        {/* Avatar Marker */}
                        <div className="flex items-center justify-center w-24 h-24 rounded-full border-4 border-hawks-card bg-hfc-brown shadow-xl shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10 transition-transform duration-300 group-hover:scale-110 overflow-hidden">
                            <img
                                src={formatPlayerImage(event.player_id, undefined, event.player_name)}
                                alt={event.player_name}
                                className="w-full h-full object-cover"
                            />
                        </div>

                        {/* Event Card */}
                        <div className="w-[calc(100%-7rem)] md:w-[calc(50%-4rem)] bg-hawks-card p-5 rounded-2xl shadow-sm border border-white/5 group-hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg text-gray-100 leading-tight">{event.player_name}</h3>
                                <div className="flex items-center gap-1 text-[10px] font-black text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md uppercase tracking-wider">
                                    <Clock size={12} />
                                    {event.quarter} • {event.time_remaining}
                                </div>
                            </div>
                            <p className="text-gray-400 font-medium">{event.action}</p>

                            {event.coordinates && (
                                <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    <Navigation size={12} />
                                    COORD: {event.coordinates}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {events.length === 0 && !loading && (
                    <div className="bg-hawks-card p-8 rounded-2xl text-center text-gray-400 border border-white/5 font-medium">
                        No events found in the CTR data feed for this match.
                    </div>
                )}
            </div>
        </div>
    );
};

export default EventTimeline;
