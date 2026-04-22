import { type FormEvent, useState } from 'react';
import { api } from '../services/api';
import { Bot, Search } from 'lucide-react';
import { clsx } from 'clsx';

const TEAMS = [
    { id: 'ADE', name: 'Adelaide Crows' },
    { id: 'BL', name: 'Brisbane Lions' },
    { id: 'CAR', name: 'Carlton' },
    { id: 'COL', name: 'Collingwood' },
    { id: 'ESS', name: 'Essendon' },
    { id: 'FRE', name: 'Fremantle' },
    { id: 'GEL', name: 'Geelong Cats' },
    { id: 'GC', name: 'Gold Coast Suns' },
    { id: 'GWS', name: 'GWS Giants' },
    { id: 'MEL', name: 'Melbourne' },
    { id: 'NM', name: 'North Melbourne' },
    { id: 'PA', name: 'Port Adelaide' },
    { id: 'RIC', name: 'Richmond' },
    { id: 'STK', name: 'St Kilda' },
    { id: 'SYD', name: 'Sydney Swans' },
    { id: 'WCE', name: 'West Coast Eagles' },
    { id: 'WB', name: 'Western Bulldogs' },
];

export const OppositionPreviews = () => {
    const [selectedTeam, setSelectedTeam] = useState(TEAMS[0].id);
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState<{ role: 'ai' | 'user', text: string }[]>([
        { role: 'ai', text: `Select an opposition team and ask me anything from the scout reports.` }
    ]);
    const [loading, setLoading] = useState(false);

    const handleAsk = async (e: FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        const userMsg = query;
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setQuery('');
        setLoading(true);

        try {
            // Using a new dedicated route for Opposition AI
            const res = await api.post('/opposition/ask', { 
                team: selectedTeam, 
                question: userMsg 
            });
            setMessages(prev => [...prev, { role: 'ai', text: res.data.answer }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'ai', text: "Error accessing the scout database or AI agent. Please try again later." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-[1200px] mx-auto space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-4xl font-black text-hawks-gold uppercase tracking-tighter" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Opposition Previews</h1>
                <p className="text-amber-500 font-bold uppercase tracking-widest text-xs mt-2">Hawk AI Scout Integration</p>
            </div>

            <div className="bg-hawks-card rounded-[2rem] shadow-sm border border-white/5 flex flex-col md:flex-row min-h-[600px] overflow-hidden">
                {/* Sidebar for Team Selection */}
                <div className="w-full md:w-80 border-r border-white/5 bg-hawks-base/50 p-6 flex flex-col">
                    <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Select Opponent</h2>
                    <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1 pr-2">
                        {TEAMS.map(team => (
                            <button
                                key={team.id}
                                onClick={() => setSelectedTeam(team.id)}
                                className={clsx(
                                    "w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all",
                                    selectedTeam === team.id
                                        ? "bg-hfc-brown text-white shadow-md"
                                        : "bg-hawks-card border border-white/10 text-gray-400 hover:border-amber-300/40 hover:shadow-sm"
                                )}
                            >
                                {team.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* AI Chat Area */}
                <div className="flex-1 flex flex-col bg-hawks-card">
                    <div className="p-6 border-b border-white/5 flex items-center gap-4 bg-hawks-card z-10">
                        <div className="bg-amber-500/10 p-3 rounded-2xl text-amber-400">
                            <Bot size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-gray-100">Hawk AI Scout</h2>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                                Currently querying: {TEAMS.find(t => t.id === selectedTeam)?.name}
                            </p>
                        </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-hawks-base/30">
                        {messages.map((m, i) => (
                            <div key={i} className={clsx("flex", m.role === 'user' ? "justify-end" : "justify-start")}>
                                <div className={clsx(
                                    "max-w-[80%] rounded-2xl p-5 text-sm font-medium leading-relaxed",
                                    m.role === 'user'
                                        ? "bg-hfc-brown text-white rounded-tr-none shadow-md"
                                        : "bg-hawks-card border border-white/10 text-gray-100 rounded-tl-none shadow-sm"
                                )}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-hawks-card border border-white/10 rounded-2xl p-5 rounded-tl-none shadow-sm">
                                    <div className="flex gap-1.5 items-center h-5">
                                        <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"></span>
                                        <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                                        <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-6 bg-hawks-card border-t border-white/5">
                        <form onSubmit={handleAsk} className="relative flex items-center">
                            <Search className="absolute left-4 text-gray-400" size={20} />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={`Ask about ${TEAMS.find(t => t.id === selectedTeam)?.name}'s structure, tendencies...`}
                                className="w-full pl-12 pr-32 py-4 bg-hawks-base border border-white/10 rounded-2xl text-sm font-medium text-gray-100 focus:outline-none focus:ring-2 focus:ring-hawks-gold/30 focus:border-amber-400 transition-all placeholder:text-gray-400"
                            />
                            <button
                                type="submit"
                                disabled={loading || !query.trim()}
                                className="absolute right-2 px-6 py-2.5 bg-hfc-brown text-white font-bold text-sm uppercase tracking-widest rounded-xl hover:bg-hfc-brown/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                Ask Hawk
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OppositionPreviews;
