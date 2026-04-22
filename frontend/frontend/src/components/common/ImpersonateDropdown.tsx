import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ApiService } from '../../services/api';
import { Eye, ChevronDown, Check, Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface Player {
    jumper_no: number;
    name: string;
}

export const ImpersonateDropdown = () => {
    const { user } = useAuth();
    const [players, setPlayers] = useState<Player[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [currentImp, setCurrentImp] = useState<{role: string, player_id: number | null} | null>(null);

    useEffect(() => {
        // Only run for admins
        if (!user?.is_admin) return;

        const stored = sessionStorage.getItem('hawk_hub_impersonate');
        if (stored) {
            try {
                setCurrentImp(JSON.parse(stored));
            } catch (err) {
                console.error("Invalid impersonation session", err);
                sessionStorage.removeItem('hawk_hub_impersonate');
            }
        }

        const fetchPlayers = async () => {
            setLoading(true);
            try {
                const data = await ApiService.getPlayers();
                if (Array.isArray(data)) {
                    setPlayers([...data].sort((a, b) => (a.jumper_no || 0) - (b.jumper_no || 0)));
                } else {
                    setPlayers([]);
                }
            } catch (e) {
                console.error("Failed to load players for impersonate dropdown", e);
            } finally {
                setLoading(false);
            }
        };

        fetchPlayers();
    }, [user?.is_admin]);

    // Determine display name
    let displayName = "Admin (Real)";
    if (currentImp) {
        if (currentImp.role === 'coach') displayName = "Coach View";
        else if (currentImp.role === 'player') {
            const p = players.find(p => p.jumper_no === currentImp.player_id);
            displayName = p ? `Player #${p.jumper_no} - ${p.name}` : `Player #${currentImp.player_id}`;
        }
    }

    if (!user?.is_admin) return null;

    const handleSelect = (role: string, player_id: number | null) => {
        const imp = { role, player_id };
        sessionStorage.setItem('hawk_hub_impersonate', JSON.stringify(imp));
        setCurrentImp(imp);
        setIsOpen(false);
        // Force reload to naturally re-evaluate route guards and data calls
        window.location.href = '/';
    };

    const handleClear = () => {
        sessionStorage.removeItem('hawk_hub_impersonate');
        setCurrentImp(null);
        setIsOpen(false);
        window.location.href = '/';
    };

    return (
        <div className="relative z-[100] ml-auto">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all shadow-sm",
                    currentImp
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                        : "bg-hawks-card border-white/10 text-gray-100 hover:bg-hawks-hover"
                )}
            >
                <Eye size={16} className={currentImp ? "text-amber-400" : "text-gray-400"} />
                {loading ? <Loader2 size={16} className="animate-spin text-gray-400" /> : displayName}
                <ChevronDown size={14} className={clsx("text-gray-400 transition-transform", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-hawks-card rounded-2xl shadow-xl border border-white/10 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-2 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-white/5 mb-2">
                        Developer View Tools
                    </div>

                    <button
                        onClick={handleClear}
                        className={clsx(
                            "w-full text-left px-4 py-2.5 text-sm font-bold flex items-center justify-between hover:bg-hawks-hover",
                            currentImp === null ? "text-hawks-gold bg-hawks-gold/10" : "text-gray-100"
                        )}
                    >
                        Real Admin View
                        {currentImp === null && <Check size={16} />}
                    </button>

                    <button
                        onClick={() => handleSelect('coach', null)}
                        className={clsx(
                            "w-full text-left px-4 py-2.5 text-sm font-bold flex items-center justify-between hover:bg-hawks-hover",
                            currentImp?.role === 'coach' ? "text-hawks-gold bg-hawks-gold/10" : "text-gray-100"
                        )}
                    >
                        Simulate Coach
                        {currentImp?.role === 'coach' && <Check size={16} />}
                    </button>

                    <div className="px-4 py-2 text-xs font-black text-gray-400 uppercase tracking-widest border-t border-b border-white/5 my-2">
                        Simulate Player View
                    </div>

                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {players.map(p => (
                            <button
                                key={p.jumper_no}
                                onClick={() => handleSelect('player', p.jumper_no)}
                                className={clsx(
                                    "w-full text-left px-4 py-2 text-sm font-medium flex items-center justify-between hover:bg-hawks-hover",
                                    currentImp?.role === 'player' && currentImp.player_id === p.jumper_no
                                        ? "text-hawks-gold bg-hawks-gold/10"
                                        : "text-gray-400"
                                )}
                            >
                                <span><span className="text-gray-400 font-mono w-6 inline-block">#{p.jumper_no}</span> {p.name}</span>
                                {currentImp?.role === 'player' && currentImp.player_id === p.jumper_no && <Check size={14} />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
