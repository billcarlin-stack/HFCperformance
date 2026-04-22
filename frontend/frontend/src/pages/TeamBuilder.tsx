import { useState, useEffect, useMemo, useRef } from 'react';
import type { Player, TeamPosition, SquadAggregates, TeamVersion } from '../services/api';
import { ApiService, formatPlayerImage } from '../services/api';
import { useRounds } from '../hooks/useRounds';
import { RoundSelector } from '../components/common/RoundSelector';
import {
    Search,
    MessageSquare,
    X,
    Layers,
    Timer,
    Trash2,
    RefreshCcw,
    Edit2,
    Plus,
    Copy,
    ArrowRightCircle,
    Pencil,
} from 'lucide-react';
import clsx from 'clsx';

const BENCH = ['BENCH_1', 'BENCH_2', 'BENCH_3', 'BENCH_4', 'BENCH_5'];
const EXT_BENCH = ['EXT_1', 'EXT_2', 'EXT_3', 'EXT_4', 'EXT_5'];

const ALL_POSITIONS = [
    'B_LEFT', 'FB', 'FB_RIGHT',
    'HB_LEFT', 'CHB', 'HB_RIGHT',
    'W_LEFT', 'R', 'C', 'W_RIGHT',
    'RR', 'ROV',
    'HF_LEFT', 'CHF', 'HF_RIGHT',
    'FP_LEFT', 'FF', 'FP_RIGHT',
    ...BENCH,
    ...EXT_BENCH,
    'COACH_NOTES'
];

const ROTATION_COLORS = [
    { name: 'Red', hex: '#ef4444' },
    { name: 'Blue', hex: '#3b82f6' },
    { name: 'Green', hex: '#10b981' },
    { name: 'Yellow', hex: '#f59e0b' },
    { name: 'Purple', hex: '#8b5cf6' },
    { name: 'Orange', hex: '#f97316' },
];

// Round options now come from useRounds() hook

const readinessColor = (score?: number) => {
    if (score == null) return 'text-white/40';
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-amber-400';
    return 'text-red-400';
};

const readinessBg = (score?: number) => {
    if (score == null) return 'bg-white/10';
    if (score >= 80) return 'bg-emerald-500/20';
    if (score >= 60) return 'bg-amber-500/20';
    return 'bg-red-500/20';
};

const TeamBuilder = () => {
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Version state
    const [versions, setVersions] = useState<TeamVersion[]>([]);
    const [activeVersion, setActiveVersion] = useState<TeamVersion | null>(null);
    const [fieldState, setFieldState] = useState<TeamPosition[]>([]);

    // Rotation Builder State
    const [rotationMode, setRotationMode] = useState(false);
    const [selectedForRotation, setSelectedForRotation] = useState<string[]>([]);
    const [rotationColor, setRotationColor] = useState('#ef4444');
    const [rotationMinutes, setRotationMinutes] = useState(5);
    const [showRotationModal, setShowRotationModal] = useState(false);

    // Round Selector (from centralized hook)
    const { seasons, selectedSeason, setSelectedSeason, rounds, selectedRound, setSelectedRound } = useRounds();

    // Version action modals
    const [showCopyModal, setShowCopyModal] = useState(false);
    const [copySourceRoundId, setCopySourceRoundId] = useState<number | null>(null);
    const [copySourceVersions, setCopySourceVersions] = useState<TeamVersion[]>([]);
    const [copySourceVersionId, setCopySourceVersionId] = useState<number | null>(null);
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [renameValue, setRenameValue] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const [aggregates, setAggregates] = useState<SquadAggregates | null>(null);

    // Drag state
    const [dragOverPos, setDragOverPos] = useState<string | null>(null);

    // Auto-save timer
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const autoSave = (newState: TeamPosition[]) => {
        setFieldState(newState);
        if (activeVersion) {
            if (saveTimer.current) clearTimeout(saveTimer.current);
            saveTimer.current = setTimeout(() => {
                ApiService.saveVersionData(activeVersion.id, JSON.stringify(newState));
            }, 500);
        }
    };

    // Load players once on mount
    useEffect(() => {
        const loadPlayers = async () => {
            try {
                const pList = await ApiService.getPlayers();
                setPlayers(pList);
            } catch (error) {
                console.error('Failed to load players:', error);
            }
        };
        loadPlayers();
    }, []);

    // Load versions when round changes
    useEffect(() => {
        if (!selectedRound) return;
        const loadVersions = async () => {
            setLoading(true);
            try {
                const vList = await ApiService.getVersions(selectedRound.id);
                setVersions(vList);
                const active = vList.find(v => v.is_active);
                if (active) {
                    setActiveVersion(active);
                    try { setFieldState(JSON.parse(active.data || '[]')); } catch { setFieldState([]); }
                } else if (vList.length > 0) {
                    // No active version — activate the first one
                    const activated = await ApiService.activateVersion(vList[0].id);
                    setActiveVersion(activated);
                    try { setFieldState(JSON.parse(activated.data || '[]')); } catch { setFieldState([]); }
                    setVersions(prev => prev.map(v => ({ ...v, is_active: v.id === activated.id })));
                } else {
                    setActiveVersion(null);
                    setFieldState([]);
                }
            } catch (error) {
                console.error('Failed to load versions:', error);
            } finally {
                setLoading(false);
            }
        };
        loadVersions();
    }, [selectedRound]);

    // Fetch aggregates when field state changes
    useEffect(() => {
        const fetchAggs = async () => {
            const assignedIds = fieldState.filter(s => s.player_id).map(s => Number(s.player_id));
            if (assignedIds.length > 0) {
                try {
                    const data = await ApiService.getSquadAggregates(assignedIds);
                    setAggregates(data);
                } catch (e) {
                    console.error("Failed to fetch agg", e);
                }
            } else {
                setAggregates(null);
            }
        };
        fetchAggs();
    }, [fieldState]);

    const handleSelectPlayer = (positionId: string, playerId: number | null, notes: string = "", rotColor?: string, rotMins?: number) => {
        const newState = [...fieldState];
        const idx = newState.findIndex(s => s.position_id === positionId);
        const entry: TeamPosition = {
            position_id: positionId,
            player_id: playerId,
            notes,
            rotation_color: rotColor,
            rotation_minutes: rotMins,
        };
        if (idx >= 0) {
            newState[idx] = entry;
        } else {
            newState.push(entry);
        }
        autoSave(newState);
    };

    const handleClearTeam = () => {
        const fieldPos = ALL_POSITIONS.filter(id => id !== 'COACH_NOTES');
        const newState = fieldState.map(s =>
            fieldPos.includes(s.position_id) ? { ...s, player_id: null, notes: '', rotation_color: undefined, rotation_minutes: undefined } : s
        );
        autoSave(newState);
    };

    const handleClearRotations = () => {
        const newState = fieldState.map(s =>
            s.rotation_color ? { ...s, rotation_color: undefined, rotation_minutes: undefined } : s
        );
        autoSave(newState);
    };

    const handleCreateRotation = () => {
        const newState = fieldState.map(s => {
            if (selectedForRotation.includes(s.position_id)) {
                return { ...s, rotation_color: rotationColor, rotation_minutes: rotationMinutes };
            }
            return s;
        });
        autoSave(newState);
        setRotationMode(false);
        setSelectedForRotation([]);
        setShowRotationModal(false);
    };

    const handleEditRotation = (rot: { color: string; mins: number; players: string[] }) => {
        const matchingPosIds = fieldState
            .filter(s => s.rotation_color === rot.color && s.rotation_minutes === rot.mins)
            .map(s => s.position_id);
        setRotationColor(rot.color);
        setRotationMinutes(rot.mins);
        setSelectedForRotation(matchingPosIds);
        setRotationMode(true);
        setShowRotationModal(true);
    };

    // Version actions
    const handleCreateVersion = async () => {
        setSaving(true);
        try {
            const newV = await ApiService.createVersion(selectedRound!.id, `Version ${versions.length + 1}`);
            const activated = await ApiService.activateVersion(newV.id);
            const vList = await ApiService.getVersions(selectedRound!.id);
            setVersions(vList);
            setActiveVersion(activated);
            try { setFieldState(JSON.parse(activated.data || '[]')); } catch { setFieldState([]); }
        } catch (err) {
            console.error('Failed to create version', err);
        } finally {
            setSaving(false);
        }
    };

    const handleActivateVersion = async (v: TeamVersion) => {
        if (v.id === activeVersion?.id) return;
        setSaving(true);
        try {
            const activated = await ApiService.activateVersion(v.id);
            setActiveVersion(activated);
            try { setFieldState(JSON.parse(activated.data || '[]')); } catch { setFieldState([]); }
            setVersions(prev => prev.map(ver => ({ ...ver, is_active: ver.id === activated.id })));
        } catch (err) {
            console.error('Failed to activate version', err);
        } finally {
            setSaving(false);
        }
    };

    const handleDuplicateVersion = async () => {
        if (!activeVersion) return;
        setSaving(true);
        try {
            const dup = await ApiService.duplicateVersion(activeVersion.id);
            const activated = await ApiService.activateVersion(dup.id);
            const vList = await ApiService.getVersions(selectedRound!.id);
            setVersions(vList);
            setActiveVersion(activated);
            try { setFieldState(JSON.parse(activated.data || '[]')); } catch { setFieldState([]); }
        } catch (err) {
            console.error('Failed to duplicate version', err);
        } finally {
            setSaving(false);
        }
    };

    const handleCopyFromRound = async () => {
        if (!copySourceVersionId) return;
        setSaving(true);
        try {
            await ApiService.copyVersionToRound(copySourceVersionId, selectedRound!.id);
            setShowCopyModal(false);
            setCopySourceRoundId(null);
            setCopySourceVersions([]);
            setCopySourceVersionId(null);
            // Reload versions for current round
            const updatedVersions = await ApiService.getVersions(selectedRound!.id);
            setVersions(updatedVersions);
        } catch (err) {
            console.error('Failed to copy to round', err);
        } finally {
            setSaving(false);
        }
    };

    const handleRenameVersion = async () => {
        if (!activeVersion || !renameValue.trim()) return;
        setSaving(true);
        try {
            const renamed = await ApiService.renameVersion(activeVersion.id, renameValue.trim());
            setActiveVersion(renamed);
            setVersions(prev => prev.map(v => v.id === renamed.id ? renamed : v));
            setShowRenameModal(false);
            setRenameValue('');
        } catch (err) {
            console.error('Failed to rename version', err);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteVersion = async () => {
        if (!activeVersion) return;
        setSaving(true);
        try {
            await ApiService.deleteVersion(activeVersion.id);
            const vList = await ApiService.getVersions(selectedRound!.id);
            setVersions(vList);
            if (vList.length > 0) {
                const activated = await ApiService.activateVersion(vList[0].id);
                setActiveVersion(activated);
                try { setFieldState(JSON.parse(activated.data || '[]')); } catch { setFieldState([]); }
                setVersions(prev => prev.map(v => ({ ...v, is_active: v.id === activated.id })));
            } else {
                setActiveVersion(null);
                setFieldState([]);
            }
            setShowDeleteConfirm(false);
        } catch (err) {
            console.error('Failed to delete version', err);
        } finally {
            setSaving(false);
        }
    };

    // Drag handlers
    const handleDrop = (positionId: string, e: React.DragEvent) => {
        e.preventDefault();
        const playerId = parseInt(e.dataTransfer.getData('text/plain'), 10);
        if (isNaN(playerId)) return;
        const sel = currentSelection(positionId);
        handleSelectPlayer(positionId, playerId, sel?.notes || '');
        setDragOverPos(null);
    };

    const currentSelection = (posId: string) => fieldState.find(s => s.position_id === posId);
    const playerAtPos = (posId: string) => {
        const sel = currentSelection(posId);
        if (sel?.player_id == null) return undefined;
        return players.find(p => p.jumper_no == sel.player_id);
    };

    const isPlayerAssigned = (jumperNo: number) =>
        fieldState.some(s => s.player_id != null && Number(s.player_id) === Number(jumperNo));

    const filteredPlayers = useMemo(() => {
        if (!players) return [];
        return players.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.jumper_no.toString().includes(searchTerm) ||
            (p.position || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [players, searchTerm]);

    const notesList = fieldState.filter(s => s.notes && s.player_id && s.position_id !== 'COACH_NOTES');
    const coachNotes = fieldState.find(s => s.position_id === 'COACH_NOTES')?.notes || '';

    const rotationsGroups = useMemo(() => {
        const groups: Record<string, { color: string; mins: number; players: string[] }> = {};
        fieldState.forEach(s => {
            if (s.rotation_color && s.player_id) {
                const key = `${s.rotation_color}_${s.rotation_minutes}`;
                if (!groups[key]) groups[key] = { color: s.rotation_color, mins: s.rotation_minutes || 0, players: [] };
                const p = players.find(pl => pl.jumper_no == s.player_id);
                if (p) groups[key].players.push(p.name);
            }
        });
        return Object.values(groups);
    }, [fieldState, players]);

    /* --- Position Card (on-field) --- */
    const PositionCard = ({ id, label, isExtended = false }: { id: string; label: string; isExtended?: boolean }) => {
        const player = playerAtPos(id);
        const sel = currentSelection(id);
        const isEmpty = !player;
        const isSelected = selectedForRotation.includes(id);
        const isDragTarget = dragOverPos === id;

        const handleClick = () => {
            if (rotationMode && !isEmpty) {
                setSelectedForRotation(prev =>
                    prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
                );
            }
        };

        return (
            <div
                onClick={handleClick}
                onDragOver={(e) => { e.preventDefault(); setDragOverPos(id); }}
                onDragLeave={() => setDragOverPos(null)}
                onDrop={(e) => handleDrop(id, e)}
                className={clsx(
                    "relative group cursor-pointer transition-all duration-200 h-[90px] w-[115px]",
                    "rounded-2xl border flex flex-col items-center justify-center gap-1 overflow-hidden",
                    isEmpty && !isDragTarget
                        ? isExtended
                            ? "bg-[#2a4e7a]/40 border-white/20 border-dashed hover:bg-[#2a4e7a]/60 hover:border-amber-300/50"
                            : "bg-[#0a2a4a]/60 border-white/20 border-dashed hover:bg-white/10 hover:border-amber-300/50"
                        : isEmpty && isDragTarget
                        ? "bg-amber-400/20 border-amber-400 border-2 scale-105"
                        : "bg-gradient-to-b from-[#3d1c04] to-[#2a1203] border-[#6b3012]/60 shadow-lg",
                    isSelected && "ring-4 ring-amber-400 ring-offset-2 ring-offset-[#071828] scale-105 z-20",
                    isDragTarget && !isEmpty && "ring-2 ring-amber-400"
                )}
            >
                {/* Rotation colour bar */}
                {!isEmpty && sel?.rotation_color && (
                    <div className="absolute top-0 inset-x-0 h-1.5" style={{ backgroundColor: sel.rotation_color }} />
                )}

                {/* Position label */}
                <div className={clsx(
                    "text-[9px] font-black uppercase tracking-[0.2em] px-2",
                    isEmpty ? "text-amber-300/60" : "text-amber-400"
                )}>
                    {label}
                </div>

                {player ? (
                    <>
                        <img
                            src={formatPlayerImage(player.jumper_no, player.photo_url, player.name)}
                            alt={player.name}
                            className="h-8 w-8 rounded-full object-cover border border-amber-400/30"
                            onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=4D2004&color=F6B000&size=80&length=2`; }}
                        />
                        <div className="text-[10px] font-black text-white uppercase tracking-tight text-center px-2 leading-tight line-clamp-1">
                            {player.name.split(' ').slice(-1)[0]}
                        </div>
                        <div className="flex items-center gap-1 text-[8px] font-bold">
                            <span className="text-amber-200/50">#{player.jumper_no}</span>
                            {player.readiness?.score != null && (
                                <span className={clsx("font-black", readinessColor(player.readiness.score))}>
                                    {player.readiness.score}%
                                </span>
                            )}
                            {sel?.rotation_minutes && (
                                <span className="flex items-center gap-0.5 text-amber-400/80">
                                    <Timer size={7} />{sel.rotation_minutes}m
                                </span>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="text-amber-300/25 text-[10px] font-bold uppercase tracking-widest">Drop</div>
                )}

                {/* Remove button */}
                {player && !rotationMode && (
                    <button
                        onClick={(e) => { e.stopPropagation(); handleSelectPlayer(id, null); }}
                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                        <X size={10} />
                    </button>
                )}
            </div>
        );
    };

    /* --- Player Pool Card --- */
    const PlayerPoolCard = ({ player }: { player: Player }) => {
        const assigned = isPlayerAssigned(player.jumper_no);
        return (
            <div
                draggable={!assigned}
                onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', player.jumper_no.toString());
                    e.dataTransfer.effectAllowed = 'move';
                }}
                className={clsx(
                    "flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition-colors duration-200 cursor-grab active:cursor-grabbing",
                    assigned
                        ? "bg-emerald-500/10 border-emerald-500/30 opacity-60"
                        : "bg-[#0f2240] border-white/10 hover:border-amber-400/60 hover:bg-[#1a3560]"
                )}
            >
                <div className="relative pointer-events-none">
                    <img
                        src={formatPlayerImage(player.jumper_no, player.photo_url, player.name)}
                        alt={player.name}
                        draggable={false}
                        className="h-12 w-12 rounded-xl object-cover border-2 border-white/10"
                    />
                    {assigned && (
                        <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center">
                            <span className="text-[8px] text-white font-black">&#10003;</span>
                        </div>
                    )}
                    {player.readiness?.score != null && (
                        <div className={clsx(
                            "absolute -bottom-1 -right-1 text-[8px] font-black px-1 py-0.5 rounded-md border border-white/10",
                            readinessBg(player.readiness.score),
                            readinessColor(player.readiness.score)
                        )}>
                            {player.readiness.score}
                        </div>
                    )}
                </div>
                <div className="text-center w-full pointer-events-none">
                    <div className="text-[9px] font-black text-white uppercase tracking-tight truncate w-full text-center leading-tight">
                        {player.name.split(' ').slice(-1)[0]}
                    </div>
                    <div className="text-[8px] font-bold text-amber-300/60 uppercase truncate w-full text-center">
                        {player.position || '\u2014'}
                    </div>
                    <div className="text-[8px] font-bold text-white/40 text-center">
                        #{player.jumper_no}
                    </div>
                </div>
            </div>
        );
    };

    if (loading) return (
        <div className="p-8 flex items-center justify-center h-64">
            <div className="text-amber-300/40 text-sm font-black uppercase tracking-[0.3em] animate-pulse">
                Constructing Tactical Field...
            </div>
        </div>
    );

    const assignedCount = fieldState.filter(s => s.player_id != null && s.position_id !== 'COACH_NOTES').length;

    return (
        <div className="p-6 max-w-[1700px] mx-auto space-y-6">
            {/* Header / Toolbar */}
            <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/10 pb-6 gap-6">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-hawks-gold tracking-tight font-outfit uppercase" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            TEAM SELECTION
                        </h1>
                        <p className="text-amber-300/60 font-medium mt-1 text-sm uppercase tracking-widest">
                            Drag players from the pool onto the field
                        </p>
                    </div>
                    <RoundSelector seasons={seasons} selectedSeason={selectedSeason} onSeasonChange={setSelectedSeason} rounds={rounds} selectedRound={selectedRound} onRoundChange={setSelectedRound} />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={handleCreateVersion}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#1a3560] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest border border-white/10 hover:border-amber-400/40"
                    >
                        <Plus size={15} className="text-amber-300" />
                        New Version
                    </button>

                    {activeVersion && (
                        <>
                            <button
                                onClick={handleDuplicateVersion}
                                className="flex items-center gap-2 px-4 py-2.5 bg-[#1a3560] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest border border-white/10 hover:border-amber-400/40"
                                title="Duplicate active version"
                            >
                                <Copy size={14} className="text-amber-300" />
                                Duplicate
                            </button>

                            <button
                                onClick={() => { setCopySourceRoundId(null); setCopySourceVersions([]); setCopySourceVersionId(null); setShowCopyModal(true); }}
                                className="flex items-center gap-2 px-4 py-2.5 bg-[#1a3560] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest border border-white/10 hover:border-amber-400/40"
                                title="Copy to another round"
                            >
                                <ArrowRightCircle size={14} className="text-amber-300" />
                                Copy from Round
                            </button>

                            <button
                                onClick={() => { setRenameValue(activeVersion.name); setShowRenameModal(true); }}
                                className="flex items-center gap-2 px-4 py-2.5 bg-[#1a3560] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest border border-white/10 hover:border-amber-400/40"
                                title="Rename active version"
                            >
                                <Pencil size={14} className="text-amber-300" />
                                Rename
                            </button>

                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-400 rounded-2xl font-black text-[11px] uppercase tracking-widest border border-red-500/20 hover:border-red-400/60 hover:bg-red-500/20"
                                title="Delete active version"
                            >
                                <Trash2 size={14} />
                                Delete
                            </button>
                        </>
                    )}

                    <button
                        onClick={handleClearTeam}
                        className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 text-red-400 rounded-2xl font-black text-[11px] uppercase tracking-widest border border-red-500/20 hover:border-red-400/60 hover:bg-red-500/20"
                        title="Clear all players from field"
                    >
                        <Trash2 size={15} />
                        Clear Team
                    </button>
                </div>
            </div>

            {/* Version Tabs */}
            {versions.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <span className="text-[10px] font-black text-amber-300/60 uppercase tracking-widest mr-2 shrink-0">Versions</span>
                    {versions.map(v => (
                        <button
                            key={v.id}
                            onClick={() => handleActivateVersion(v)}
                            className={clsx(
                                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 border",
                                v.is_active
                                    ? "bg-hfc-brown text-white border-amber-400/50 shadow-lg"
                                    : "bg-hawks-hover text-gray-400 hover:text-gray-100 border-white/10 hover:border-white/20"
                            )}
                        >
                            <div>{v.name}</div>
                            <div className="text-[8px] font-bold opacity-50 mt-0.5">
                                {new Date(v.updated_at).toLocaleDateString()}
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Empty state — no versions for this round */}
            {versions.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                    <p className="text-white/30 text-sm font-bold uppercase tracking-widest">No versions for {selectedRound?.name}</p>
                    <button
                        onClick={handleCreateVersion}
                        className="flex items-center gap-2 px-6 py-3 bg-amber-400 text-[#0a1628] rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white transition-colors"
                    >
                        <Plus size={16} />
                        Create First Version
                    </button>
                </div>
            )}

            {/* Squad Metrics Summary Pane */}
            {aggregates && activeVersion && (
                <div className="bg-amber-300 flex items-center justify-center gap-20 py-4 px-8 rounded-2xl border border-amber-400/50">
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black text-black uppercase tracking-widest">Projected Squad Age</span>
                        <span className="text-2xl font-black text-black">{aggregates.average_age}y</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black text-black uppercase tracking-widest">Total Match Experience</span>
                        <span className="text-2xl font-black text-black">{aggregates.total_games} <span className="text-xs font-bold">GAMES</span></span>
                    </div>
                    <div className="flex items-center gap-4">
                         <span className="text-[10px] font-black text-black/40 uppercase tracking-widest">Field Progress</span>
                         <div className="w-32 h-2 bg-black/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-black rounded-full transition-all duration-500"
                                style={{ width: `${(assignedCount / (ALL_POSITIONS.length - 1)) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Main Layout: Field + Player Pool */}
            {activeVersion && (
            <div className="flex flex-col xl:flex-row gap-6">

                {/* -- Field Column -- */}
                <div className="flex-1 space-y-4 min-w-0">
                    <div className="relative w-full bg-gradient-to-b from-[#071e36] to-[#050e1a] rounded-[2.5rem] border border-white/10 shadow-2xl p-8 flex flex-col items-center gap-5 overflow-hidden">
                        {/* Pitch lines */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.07]">
                            <svg width="100%" height="100%" viewBox="0 0 400 580" preserveAspectRatio="none">
                                <ellipse cx="200" cy="290" rx="185" ry="275" fill="none" stroke="white" strokeWidth="2" />
                                <circle cx="200" cy="290" r="55" fill="none" stroke="white" strokeWidth="1.5" />
                                <line x1="15" y1="290" x2="385" y2="290" stroke="white" strokeWidth="1" strokeDasharray="6 4" />
                            </svg>
                        </div>

                        <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">Defensive End</div>

                        <div className="flex gap-3 z-10"><PositionCard id="B_LEFT" label="BPL" /><PositionCard id="FB" label="FB" /><PositionCard id="FB_RIGHT" label="BPR" /></div>
                        <div className="flex gap-3 z-10"><PositionCard id="HB_LEFT" label="HB-L" /><PositionCard id="CHB" label="CHB" /><PositionCard id="HB_RIGHT" label="HB-R" /></div>
                        <div className="flex flex-col items-center gap-3 z-10 w-full">
                            <div className="flex gap-3 items-center justify-center">
                                <PositionCard id="W_LEFT" label="WING" />
                                <PositionCard id="R" label="RUCK" />
                                <PositionCard id="C" label="C" />
                                <PositionCard id="W_RIGHT" label="WING" />
                            </div>
                            <div className="flex gap-3 justify-center">
                                <PositionCard id="RR" label="RR" /><PositionCard id="ROV" label="ROV" />
                            </div>
                        </div>
                        <div className="flex gap-3 z-10"><PositionCard id="HF_LEFT" label="HF-L" /><PositionCard id="CHF" label="CHF" /><PositionCard id="HF_RIGHT" label="HF-R" /></div>
                        <div className="flex gap-3 z-10"><PositionCard id="FP_LEFT" label="FP-L" /><PositionCard id="FF" label="FF" /><PositionCard id="FP_RIGHT" label="FP-R" /></div>

                        <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mt-1">Attacking End</div>
                    </div>

                    {/* Extended Bench Components */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#0d2040]/60 rounded-[2rem] border border-white/10 p-5">
                            <h3 className="text-[10px] font-black text-amber-300 uppercase tracking-[0.2em] mb-4">Interchange & Bench</h3>
                            <div className="flex flex-wrap gap-3">
                                {BENCH.map((id, i) => <PositionCard key={id} id={id} label={`B-${i + 1}`} />)}
                            </div>
                        </div>
                        <div className="bg-[#2a4e7a]/40 rounded-[2rem] border border-white/20 p-5">
                            <h3 className="text-[10px] font-black text-amber-100 uppercase tracking-[0.2em] mb-4">Extended Consideration</h3>
                            <div className="flex flex-wrap gap-3">
                                {EXT_BENCH.map((id, i) => <PositionCard key={id} id={id} label={`E-${i + 1}`} isExtended />)}
                            </div>
                        </div>
                    </div>

                    {/* General Coach Notes Box */}
                    <div className="bg-[#0d2040]/80 rounded-3xl border border-white/10 p-6 space-y-4">
                        <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                            <MessageSquare size={16} className="text-emerald-400" />
                            <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Match-Day Strategic Notes</h3>
                        </div>
                        <textarea
                            placeholder="Write comprehensive notes on tactics, matchups, and late changes..."
                            value={coachNotes}
                            onChange={(e) => handleSelectPlayer('COACH_NOTES', null, e.target.value)}
                            className="w-full h-40 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition-all custom-scrollbar"
                        />
                    </div>
                </div>

                {/* -- Right Panel -- */}
                <div className="xl:w-[420px] flex flex-col gap-4">

                    {/* Rotation Controls & Pane */}
                    <div className="bg-[#1a2e4a]/80 border-2 border-amber-400/30 rounded-3xl overflow-hidden shadow-xl">
                        <div className="p-4 border-b border-white/10 bg-amber-400/5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-black text-xs text-white uppercase tracking-widest flex items-center gap-2">
                                    <Layers size={13} className="text-amber-400" />
                                    Rotation Strategy
                                </h3>
                                <span className="text-[9px] font-bold text-white/30 uppercase">{rotationsGroups.length} Active</span>
                            </div>
                            <div className="flex gap-2">
                                {rotationMode ? (
                                    <div className="flex-1 flex items-center gap-2 bg-amber-400/20 p-2 rounded-xl border border-amber-400/30">
                                        <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest pl-2 flex-1">
                                            {selectedForRotation.length} Selected
                                        </span>
                                        <button
                                            onClick={() => setShowRotationModal(true)}
                                            className="px-3 py-1.5 bg-amber-400 text-[#0a1628] rounded-lg text-[9px] font-black uppercase tracking-widest"
                                        >
                                            Config
                                        </button>
                                        <button onClick={() => { setRotationMode(false); setSelectedForRotation([]); }} className="p-1 text-white/40 hover:text-white"><X size={14} /></button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setRotationMode(true)}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-400 text-[#0a1628] rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white transition-colors"
                                    >
                                        <Layers size={14} />
                                        Create Rotation
                                    </button>
                                )}
                                <button
                                    onClick={handleClearRotations}
                                    className="p-3 bg-white/5 text-orange-400 rounded-xl border border-white/10 hover:bg-orange-500/10"
                                    title="Reset Rotations"
                                >
                                    <RefreshCcw size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {rotationsGroups.length === 0 ? (
                                <div className="py-8 text-center">
                                    <p className="text-xs text-white/20 italic">No rotations defined. Use 'Create' to group players.</p>
                                </div>
                            ) : (
                                rotationsGroups.map((rot, i) => (
                                    <div key={i} className="bg-white/[0.03] border border-white/10 rounded-2xl p-3 space-y-3 group hover:border-amber-400/30 transition-all">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: rot.color }} />
                                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Rotation Group</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1 text-[9px] font-black text-amber-400 uppercase">
                                                    <Timer size={9} />{rot.mins}m
                                                </div>
                                                <button
                                                    onClick={() => handleEditRotation(rot)}
                                                    className="p-1 bg-white/5 text-white/40 rounded-lg hover:text-white"
                                                >
                                                    <Edit2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-1 pt-2 border-t border-white/5">
                                            {rot.players.map(p => (
                                                <span key={p} className="text-[9px] font-bold text-white/70 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10">{p}</span>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Player Pool */}
                    <div className="bg-[#0d2040]/80 rounded-3xl border border-white/10 overflow-hidden flex flex-col flex-1" style={{ maxHeight: '600px' }}>
                        <div className="p-4 border-b border-white/10">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-xs font-black text-white uppercase tracking-widest">Player Pool</h3>
                                <span className="text-[9px] font-bold text-white/30 uppercase">
                                    {players.filter(p => !isPlayerAssigned(p.jumper_no)).length} available
                                </span>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
                                <input
                                    type="text"
                                    placeholder="Search players..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                            <div className="grid grid-cols-2 gap-2">
                                {filteredPlayers.map(p => (
                                    <PlayerPoolCard key={p.jumper_no} player={p} />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Position Notes */}
                    {notesList.length > 0 && (
                        <div className="bg-[#0d2040]/80 border border-white/10 rounded-3xl overflow-hidden max-h-[300px]">
                            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                                <h3 className="font-black text-xs text-white uppercase tracking-widest flex items-center gap-2">
                                    <MessageSquare size={13} className="text-emerald-400" />
                                    Position Notes
                                </h3>
                                <span className="text-[9px] font-bold text-white/30 uppercase">{notesList.length} Notes</span>
                            </div>
                            <div className="p-4 overflow-y-auto space-y-3 custom-scrollbar">
                                {notesList.map((sel, i) => {
                                    const p = players.find(pl => pl.jumper_no == sel.player_id);
                                    return (
                                        <div key={i} className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{sel.position_id.replace(/_/g, ' ')}</span>
                                                <span className="text-[9px] font-bold text-white/40">{p?.name}</span>
                                            </div>
                                            <p className="text-xs text-white/70 leading-relaxed bg-white/5 p-3 rounded-xl border-l-2 border-emerald-500/50">
                                                {sel.notes}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            )}

            {/* -- Rotation Config Modal -- */}
            {showRotationModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowRotationModal(false)} />
                    <div className="relative w-full max-w-md bg-[#0d2444] rounded-3xl border border-white/10 shadow-2xl p-8 space-y-8">
                        <div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Rotation Setup</h2>
                            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">Configure group parameters</p>
                        </div>
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-amber-300 uppercase tracking-widest">Select Rotation Color</label>
                            <div className="flex flex-wrap gap-3">
                                {ROTATION_COLORS.map(c => (
                                    <button
                                        key={c.hex}
                                        onClick={() => setRotationColor(c.hex)}
                                        className={clsx("h-10 w-10 rounded-xl border-2 transition-all", rotationColor === c.hex ? "border-amber-400 scale-110" : "border-transparent opacity-60")}
                                        style={{ backgroundColor: c.hex }}
                                        title={c.name}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-black text-amber-300 uppercase tracking-widest">Duration (Minutes)</label>
                                <span className="text-lg font-black text-amber-400">{rotationMinutes}m</span>
                            </div>
                            <input
                                type="range" min="1" max="60" step="1"
                                value={rotationMinutes}
                                onChange={e => setRotationMinutes(Number(e.target.value))}
                                className="w-full h-1.5 bg-white/10 rounded-full appearance-none accent-amber-400"
                            />
                        </div>
                        <button
                            onClick={handleCreateRotation}
                            className="w-full py-4 bg-amber-400 text-[#0a1628] rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white"
                        >
                            Apply Rotation to {selectedForRotation.length} Players
                        </button>
                    </div>
                </div>
            )}

            {/* -- Copy from Round Modal -- */}
            {showCopyModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowCopyModal(false)} />
                    <div className="relative w-full max-w-sm bg-hawks-card rounded-3xl border border-white/10 shadow-2xl p-8 space-y-5">
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Copy from Another Round</h2>
                        <p className="text-gray-400 text-xs">Pick a round and version to copy into <strong className="text-hawks-gold">{selectedRound?.name}</strong></p>

                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Source Round</label>
                            <select
                                value={copySourceRoundId ?? ''}
                                onChange={async (e) => {
                                    const roundId = Number(e.target.value);
                                    setCopySourceRoundId(roundId || null);
                                    setCopySourceVersionId(null);
                                    if (roundId) {
                                        const v = await ApiService.getVersions(roundId);
                                        setCopySourceVersions(v);
                                    } else {
                                        setCopySourceVersions([]);
                                    }
                                }}
                                className="w-full bg-hawks-base border border-white/10 rounded-xl py-3 px-4 text-sm text-gray-100 focus:outline-none focus:border-amber-400"
                            >
                                <option value="">-- Select Round --</option>
                                {rounds.filter(r => r.id !== selectedRound?.id).map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                        </div>

                        {copySourceRoundId && (
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Version</label>
                                {copySourceVersions.length === 0 ? (
                                    <p className="text-gray-500 text-xs italic">No versions found for this round</p>
                                ) : (
                                    <select
                                        value={copySourceVersionId ?? ''}
                                        onChange={e => setCopySourceVersionId(Number(e.target.value))}
                                        className="w-full bg-hawks-base border border-white/10 rounded-xl py-3 px-4 text-sm text-gray-100 focus:outline-none focus:border-amber-400"
                                    >
                                        <option value="">-- Select Version --</option>
                                        {copySourceVersions.map(v => (
                                            <option key={v.id} value={v.id}>{v.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        )}

                        <button
                            onClick={handleCopyFromRound}
                            disabled={!copySourceVersionId}
                            className={clsx(
                                "w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest",
                                copySourceVersionId
                                    ? "bg-amber-400 text-[#0a1628] hover:bg-white"
                                    : "bg-white/10 text-white/30 cursor-not-allowed"
                            )}
                        >
                            Copy to {selectedRound?.name}
                        </button>
                    </div>
                </div>
            )}

            {/* -- Rename Modal -- */}
            {showRenameModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowRenameModal(false)} />
                    <div className="relative w-full max-w-sm bg-[#0d2444] rounded-3xl border border-white/10 shadow-2xl p-8 space-y-6">
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Rename Version</h2>
                        <input
                            type="text"
                            placeholder="Version name"
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleRenameVersion()}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-400"
                        />
                        <button
                            onClick={handleRenameVersion}
                            className="w-full py-4 bg-amber-400 text-[#0a1628] rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white"
                        >
                            Confirm Rename
                        </button>
                    </div>
                </div>
            )}

            {/* -- Delete Confirmation Modal -- */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowDeleteConfirm(false)} />
                    <div className="relative w-full max-w-sm bg-[#0d2444] rounded-3xl border border-white/10 shadow-2xl p-8 space-y-6">
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Delete Version</h2>
                        <p className="text-white/60 text-sm">Are you sure you want to delete <span className="text-amber-400 font-bold">"{activeVersion?.name}"</span>? This cannot be undone.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-3 bg-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/20"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteVersion}
                                className="flex-1 py-3 bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-400"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* -- Saving Indicator -- */}
            {saving && (
                <div className="fixed bottom-6 right-6 bg-[#0d2444] border border-amber-400/40 px-6 py-3 rounded-2xl shadow-2xl z-[100] flex items-center gap-3">
                    <div className="h-2 w-2 bg-amber-400 rounded-full animate-ping" />
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em]">Syncing Team State...</span>
                </div>
            )}
        </div>
    );
};

export default TeamBuilder;
