import { useState, useRef, useEffect } from 'react';
import { ApiService } from '../services/api';
import { Send, Bot, Sparkles, ArrowUp } from 'lucide-react';
import embed from 'vega-embed';

interface Message {
    text: string;
    sender: 'ai' | 'user';
    chart?: any; // Vega-Lite spec
    suggestions?: string[]; // clickable follow-up questions
}

/** Lightweight markdown renderer for AI responses */
const MarkdownText = ({ text }: { text: string }) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: string[] = [];

    const flushList = () => {
        if (listItems.length > 0) {
            elements.push(
                <ul key={`ul-${elements.length}`} className="list-disc pl-5 space-y-1 my-2">
                    {listItems.map((item, i) => (
                        <li key={i}><InlineMarkdown text={item} /></li>
                    ))}
                </ul>
            );
            listItems = [];
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const bulletMatch = line.match(/^\s*[-*]\s+(.+)/);

        if (bulletMatch) {
            listItems.push(bulletMatch[1]);
        } else {
            flushList();
            if (line.trim() === '') {
                elements.push(<div key={`br-${i}`} className="h-2" />);
            } else {
                elements.push(<p key={`p-${i}`} className="my-1"><InlineMarkdown text={line} /></p>);
            }
        }
    }
    flushList();

    return <div className="space-y-0.5">{elements}</div>;
};

const InlineMarkdown = ({ text }: { text: string }) => {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return (
        <>
            {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i} className="font-semibold text-hawks-gold">{part.slice(2, -2)}</strong>;
                }
                if (part.startsWith('*') && part.endsWith('*')) {
                    return <em key={i} className="text-gray-300">{part.slice(1, -1)}</em>;
                }
                return <span key={i}>{part}</span>;
            })}
        </>
    );
};

/** Renders a Vega-Lite chart spec */
const VegaChart = ({ spec }: { spec: any }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current || !spec) return;
        // Force responsive width
        const responsiveSpec = {
            ...spec,
            width: 'container',
            autosize: { type: 'fit', contains: 'padding' },
        };
        embed(containerRef.current, responsiveSpec, {
            actions: false,
            renderer: 'svg',
            theme: undefined,
        }).catch(err => console.error('Vega render error:', err));
    }, [spec]);

    return <div ref={containerRef} className="mt-3 w-full rounded-lg overflow-hidden" />;
};

/** Renders clickable suggestion chips from an AI message */
const SuggestionChips = ({ suggestions, onSend }: { suggestions: string[]; onSend: (text: string) => void }) => (
    <div className="mt-3 pt-2 border-t border-white/5">
        <p className="text-[10px] text-gray-500 font-medium mb-1.5">You might also want to ask:</p>
        <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s, i) => (
                <button
                    key={i}
                    onClick={() => onSend(s)}
                    className="text-[10px] font-medium bg-hawks-base hover:bg-hawks-hover text-gray-400 hover:text-hawks-gold px-2.5 py-1 rounded-md transition-colors text-left"
                >
                    {s}
                </button>
            ))}
        </div>
    </div>
);

// === Existing HawkChat (sidebar/dedicated page version) ===
export const HawkChat = () => {
    const [messages, setMessages] = useState<Message[]>([
        { text: "G'day! I'm KANGA.AI, your high-performance assistant. Ask me anything about squad wellbeing or ratings.", sender: 'ai' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState([
        "Who had the lowest sleep?",
        "Injury status?",
        "Top training rating?"
    ]);

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (text: string) => {
        if (!text.trim()) return;

        setMessages(prev => [...prev, { text, sender: 'user' }]);
        setInput('');
        setLoading(true);

        try {
            const response = await ApiService.askAI(text);
            setMessages(prev => [...prev, { text: response.answer, sender: 'ai' }]);
            if (response.suggestions) setSuggestions(response.suggestions);
        } catch (err) {
            setMessages(prev => [...prev, { text: "Sorry, I'm having trouble connecting to the data lake.", sender: 'ai' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-hawks-card rounded-xl shadow-sm flex flex-col h-[500px] overflow-hidden">
            {/* Header */}
            <div className="bg-hawks-brown p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-hawks-base p-2 rounded-lg">
                        <Bot size={20} className="text-hawks-gold" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>KANGA.AI</h3>
                        <p className="text-[10px] text-hawks-gold/60 uppercase tracking-widest" style={{ fontFamily: 'Work Sans, sans-serif' }}>Performance Agent</p>
                    </div>
                </div>
                <Sparkles size={16} className="text-hawks-gold animate-pulse" />
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-hawks-base">
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-xl text-sm ${m.sender === 'user'
                            ? 'bg-hawks-brown text-white rounded-tr-none'
                            : 'bg-hawks-card text-gray-200 rounded-tl-none'
                            }`}>
                            {m.sender === 'ai' ? <MarkdownText text={m.text} /> : m.text}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start italic text-gray-500 text-xs animate-pulse">
                        Thinking...
                    </div>
                )}
            </div>

            {/* Footer / Input */}
            <div className="p-4 bg-hawks-card border-t border-white/5">
                <div className="flex flex-wrap gap-2 mb-4">
                    {suggestions.map((s, i) => (
                        <button
                            key={i}
                            onClick={() => handleSend(s)}
                            className="text-[10px] font-medium bg-hawks-hover hover:bg-hawks-surface text-gray-400 hover:text-hawks-gold py-1 px-3 rounded-full transition-colors"
                        >
                            {s}
                        </button>
                    ))}
                </div>
                <form
                    onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
                    className="flex gap-2"
                >
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask KANGA.AI..."
                        className="flex-1 bg-hawks-base border border-white/5 rounded-lg px-4 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-hawks-gold/30"
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-hawks-gold text-hawks-base p-2 rounded-lg hover:bg-hawks-gold/90 transition-colors disabled:opacity-40"
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
};


// === DashboardHawkAI — Dark themed AI interface ===
const SUGGESTIONS = [
    "Who had the lowest sleep this week?",
    "Show me all active injuries",
    "Compare top 5 players by disposals",
    "Chart the squad readiness scores",
    "Show injury breakdown by severity",
];

export const DashboardHawkAI = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (scrollRef.current && hasStarted) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, hasStarted]);

    const handleSend = async (text: string) => {
        if (!text.trim() || loading) return;
        setHasStarted(true);
        setMessages(prev => [...prev, { text, sender: 'user' }]);
        setInput('');
        setLoading(true);

        try {
            const response = await ApiService.askAI(text);
            setMessages(prev => [...prev, {
                text: response.answer,
                sender: 'ai',
                chart: response.chart || undefined,
                suggestions: response.suggestions || undefined,
            }]);
        } catch {
            setMessages(prev => [...prev, { text: "Sorry, I'm having trouble connecting to the data lake.", sender: 'ai' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-hawks-base rounded-xl overflow-hidden relative">

            {/* === START SCREEN === */}
            {!hasStarted && (
                <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 gap-8">
                    {/* Branding */}
                    <div className="flex flex-col items-center gap-4 text-center">
                        <div className="relative">
                            <div className="h-16 w-16 rounded-2xl bg-hawks-card flex items-center justify-center shadow-xl">
                                <Sparkles size={28} className="text-hawks-gold" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-green-500 border-2 border-hawks-base animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                HAWKS<span className="text-hawks-gold">.</span>AI
                            </h2>
                            <p className="text-gray-500 text-xs font-medium mt-2 tracking-widest uppercase" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                                Your intelligent squad performance assistant
                            </p>
                        </div>
                    </div>

                    {/* Suggestion chips */}
                    <div className="flex flex-wrap justify-center gap-2.5 max-w-lg">
                        {SUGGESTIONS.map((s, i) => (
                            <button
                                key={i}
                                onClick={() => handleSend(s)}
                                className="text-xs font-medium bg-hawks-card hover:bg-hawks-hover text-gray-400 hover:text-hawks-gold px-4 py-2 rounded-lg transition-all duration-200"
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    {/* Search bar */}
                    <form
                        onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
                        className="w-full max-w-lg"
                    >
                        <div className="relative group">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask Hawks.AI anything about the squad..."
                                className="w-full bg-hawks-card border border-white/5 group-hover:border-white/10 focus:border-hawks-gold/30 rounded-xl py-4 pl-5 pr-14 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:shadow-lg focus:shadow-hawks-gold/5 transition-all duration-300"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim()}
                                className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-lg bg-hawks-gold text-hawks-base flex items-center justify-center hover:bg-hawks-gold/90 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                            >
                                <ArrowUp size={16} />
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* === CHAT MODE === */}
            {hasStarted && (
                <>
                    {/* Compact header */}
                    <div className="flex items-center gap-3 px-5 py-3 border-b border-white/5 shrink-0 bg-hawks-card">
                        <div className="h-7 w-7 rounded-lg bg-hawks-base flex items-center justify-center">
                            <Sparkles size={13} className="text-hawks-gold" />
                        </div>
                        <span className="font-black text-white text-sm tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>HAWKS.AI</span>
                        <div className="ml-auto flex items-center gap-1.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest" style={{ fontFamily: 'Work Sans, sans-serif' }}>Online</span>
                        </div>
                    </div>

                    {/* Messages */}
                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto p-4 space-y-3"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A231B transparent' }}
                    >
                        {messages.map((m, i) => (
                            <div key={i} className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {m.sender === 'ai' && (
                                    <div className="h-6 w-6 rounded-lg bg-hawks-card flex items-center justify-center shrink-0 mt-0.5">
                                        <Sparkles size={10} className="text-hawks-gold" />
                                    </div>
                                )}
                                <div className={`max-w-[78%] px-4 py-3 rounded-xl text-sm leading-relaxed ${m.sender === 'user'
                                    ? 'bg-hawks-brown text-white rounded-tr-sm'
                                    : 'bg-hawks-card text-gray-300 rounded-tl-sm'
                                    }`}>
                                    {m.sender === 'ai' ? <MarkdownText text={m.text} /> : m.text}
                                    {m.chart && <VegaChart spec={m.chart} />}
                                    {m.sender === 'ai' && m.suggestions && m.suggestions.length > 0 && (
                                        <SuggestionChips suggestions={m.suggestions} onSend={handleSend} />
                                    )}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex gap-2.5 justify-start items-center">
                                <div className="h-6 w-6 rounded-lg bg-hawks-card flex items-center justify-center">
                                    <Sparkles size={10} className="text-hawks-gold animate-pulse" />
                                </div>
                                <div className="bg-hawks-card rounded-xl rounded-tl-sm px-4 py-3">
                                    <div className="flex gap-1.5 items-center">
                                        <div className="h-1.5 w-1.5 rounded-full bg-hawks-gold animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="h-1.5 w-1.5 rounded-full bg-hawks-gold animate-bounce" style={{ animationDelay: '120ms' }} />
                                        <div className="h-1.5 w-1.5 rounded-full bg-hawks-gold animate-bounce" style={{ animationDelay: '240ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Chat input */}
                    <div className="p-3 bg-hawks-card border-t border-white/5 shrink-0">
                        <form
                            onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
                            className="relative"
                        >
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask a follow-up..."
                                className="w-full bg-hawks-base border border-white/5 rounded-lg py-3 pl-4 pr-12 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-hawks-gold/30 transition-all"
                                autoFocus
                            />
                            <button
                                type="submit"
                                disabled={loading || !input.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg bg-hawks-gold flex items-center justify-center text-hawks-base hover:bg-hawks-gold/90 transition-colors disabled:opacity-20"
                            >
                                <ArrowUp size={15} />
                            </button>
                        </form>
                    </div>
                </>
            )}
        </div>
    );
};
