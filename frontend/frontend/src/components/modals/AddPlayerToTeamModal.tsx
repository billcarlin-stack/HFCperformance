import React, { useEffect, useState } from 'react';
import { X, Plus, Activity, Users } from 'lucide-react';
import { ApiService } from '../../services/api';
import type { TeamPosition, Player } from '../../services/api';
import clsx from 'clsx';

interface AddPlayerToTeamModalProps {
    player: Player;
    onClose: () => void;
    onSuccess: () => void;
}

const AddPlayerToTeamModal: React.FC<AddPlayerToTeamModalProps> = ({ player, onClose, onSuccess }) => {
    const [selections, setSelections] = useState<TeamPosition[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    useEffect(() => {
        ApiService.getTeamBuilder()
            .then(setSelections)
            .finally(() => setLoading(false));
    }, []);

    const handleSelect = async (posId: string) => {
        setSaving(posId);
        try {
            await ApiService.updateTeamSelection(posId, player.jumper_no, "");
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to update team:', error);
        } finally {
            setSaving(null);
        }
    };

    const isAssigned = Array.isArray(selections) ? selections.find(s => Number(s.player_id) === player.jumper_no) : undefined;

    const PositionButton = ({ id, label }: { id: string; label: string }) => {
        const currentId = Array.isArray(selections) ? selections.find(s => s.position_id === id)?.player_id : null;
        const isSelf = currentId !== null && Number(currentId) === player.jumper_no;
        const isOccupied = currentId !== null && !isSelf;

        return (
            <button
                disabled={saving !== null}
                onClick={() => handleSelect(id)}
                className={clsx(
                    "relative group flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-300",
                    isSelf
                        ? "bg-hawks-gold border-hawks-gold text-hfc-brown shadow-lg"
                        : isOccupied
                            ? "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:border-white/20"
                            : "bg-white/10 border-hawks-gold/30 text-hawks-gold hover:bg-hawks-gold/20 hover:border-hawks-gold active:scale-95"
                )}
            >
                <div className="text-[9px] font-black uppercase tracking-widest">{label}</div>
                {isSelf ? (
                    <div className="text-[10px] font-bold mt-1 uppercase">Currently Here</div>
                ) : isOccupied ? (
                    <div className="text-[9px] font-bold mt-1 text-white/20 truncate w-full px-1">Swap Participant</div>
                ) : (
                    <Plus size={12} className="mt-1" />
                )}
                {saving === id && (
                    <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                )}
            </button>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full max-w-2xl bg-gradient-to-b from-hfc-brown to-[#1a0b02] rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight font-outfit">
                            Assign to <span className="text-hawks-gold">Match Day Squad</span>
                        </h2>
                        <div className="flex items-center gap-2 mt-2">
                            <div className="h-2 w-2 rounded-full bg-hawks-gold" />
                            <p className="text-[10px] text-amber-300/60 font-black uppercase tracking-widest">
                                {player.name} · #{player.jumper_no} · {player.position}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                        <X size={20} className="text-white/40" />
                    </button>
                </div>

                {/* Field Contextual Layout */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {loading ? (
                        <div className="h-64 flex items-center justify-center text-amber-300/30 text-xs font-black uppercase tracking-widest animate-pulse">
                            Loading Tactical Grid...
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {isAssigned && (
                                <div className="p-4 bg-hawks-gold/10 border border-hawks-gold/20 rounded-2xl flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-hawks-gold flex items-center justify-center text-hfc-brown shadow-lg">
                                        <Activity size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs font-black text-hawks-gold uppercase tracking-widest">Currently Assigned</div>
                                        <div className="text-sm font-bold text-white mt-0.5">Player is already listed in the {isAssigned.position_id.replace(/_/g, ' ')} slot.</div>
                                    </div>
                                    <button 
                                        onClick={() => handleSelect(isAssigned.position_id)}
                                        className="px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500 hover:text-white transition-all"
                                    >
                                        Remove from Team
                                    </button>
                                </div>
                            )}

                            <div className="space-y-6">
                                <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.25em] flex items-center gap-3">
                                    <div className="h-px flex-1 bg-white/10" />
                                    Starting 18
                                    <div className="h-px flex-1 bg-white/10" />
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <PositionButton id="B_LEFT" label="BPL" />
                                    <PositionButton id="FB" label="FB" />
                                    <PositionButton id="B_RIGHT" label="BPR" />
                                    
                                    <PositionButton id="HB_LEFT" label="HB-L" />
                                    <PositionButton id="CHB" label="CHB" />
                                    <PositionButton id="HB_RIGHT" label="HB-R" />
                                    
                                    <PositionButton id="W_LEFT" label="WING" />
                                    <PositionButton id="C" label="C" />
                                    <PositionButton id="W_RIGHT" label="WING" />
                                    
                                    <PositionButton id="HF_LEFT" label="HF-L" />
                                    <PositionButton id="CHF" label="CHF" />
                                    <PositionButton id="HF_RIGHT" label="HF-R" />
                                    
                                    <PositionButton id="FP_LEFT" label="FP-L" />
                                    <PositionButton id="FF" label="FF" />
                                    <PositionButton id="FP_RIGHT" label="FP-R" />
                                    
                                    <PositionButton id="R" label="RUCK" />
                                    <PositionButton id="RR" label="RR" />
                                    <PositionButton id="ROV" label="ROV" />
                                </div>

                                <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.25em] flex items-center gap-3 pt-4">
                                    <div className="h-px flex-1 bg-white/10" />
                                    Interchange & Reserved
                                    <div className="h-px flex-1 bg-white/10" />
                                </div>
                                <div className="grid grid-cols-4 gap-3">
                                    {['BENCH_1', 'BENCH_2', 'BENCH_3', 'BENCH_4', 'BENCH_5'].map((id, i) => (
                                        <PositionButton key={id} id={id} label={`B-${i+1}`} />
                                    ))}
                                    {['CONSID_1', 'CONSID_2', 'CONSID_3', 'CONSID_4'].map((id, i) => (
                                        <PositionButton key={id} id={id} label={`EXT-${i+1}`} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-black/40 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-black text-amber-300/40 uppercase tracking-widest">
                        <Users size={12} />
                        Squad Management Active
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddPlayerToTeamModal;
