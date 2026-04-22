import { useState, useEffect, useMemo, useRef } from 'react';
import type { Player, TeamPosition, SquadAggregates, TeamVersion, BoxHillPlayer } from '../services/api';
import { ApiService, formatPlayerImage } from '../services/api';
import { useRounds } from '../hooks/useRounds';
import { RoundSelector } from '../components/common/RoundSelector';
import { PositionFilter, matchesPositionFilter } from '../components/common/PositionFilter';
import type { PositionGroup } from '../components/common/PositionFilter';
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

// readinessBg removed — was used by old PlayerPoolCard

// Coordinates kept inside the ellipse — x-range narrows near top/bottom
const POSITION_COORDS: Record<string, {x: number, y: number}[]> = {
    'KD': [{x: 38, y: 12}, {x: 50, y: 10}, {x: 62, y: 12}],
    'GD': [{x: 28, y: 21}, {x: 40, y: 19}, {x: 50, y: 23}, {x: 60, y: 19}, {x: 72, y: 21}],
    'W':  [{x: 18, y: 42}, {x: 82, y: 42}, {x: 18, y: 56}, {x: 82, y: 56}],
    'M':  [{x: 35, y: 40}, {x: 50, y: 44}, {x: 65, y: 40}, {x: 40, y: 52}, {x: 60, y: 52}],
    'RK': [{x: 50, y: 48}, {x: 44, y: 54}],
    'MF': [{x: 30, y: 64}, {x: 44, y: 62}, {x: 56, y: 64}, {x: 70, y: 62}],
    'GF': [{x: 28, y: 75}, {x: 40, y: 77}, {x: 50, y: 73}, {x: 60, y: 77}, {x: 72, y: 75}],
    'KF': [{x: 38, y: 86}, {x: 50, y: 88}, {x: 62, y: 86}],
};

const OvalMarkings = () => (
    <div className="absolute inset-0 pointer-events-none opacity-[0.08]">
        <svg width="100%" height="100%" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid meet">
            <ellipse cx="200" cy="300" rx="190" ry="285" fill="none" stroke="white" strokeWidth="2" />
            <circle cx="200" cy="300" r="50" fill="none" stroke="white" strokeWidth="1.5" />
            <rect x="170" y="270" width="60" height="60" fill="none" stroke="white" strokeWidth="1.5" />
            <circle cx="200" cy="300" r="3" fill="white" />
            <path d="M 80 140 A 160 160 0 0 1 320 140" fill="none" stroke="white" strokeWidth="1" strokeDasharray="6 4" />
            <path d="M 80 460 A 160 160 0 0 0 320 460" fill="none" stroke="white" strokeWidth="1" strokeDasharray="6 4" />
            <rect x="175" y="15" width="50" height="30" fill="none" stroke="white" strokeWidth="1.5" />
            <rect x="175" y="555" width="50" height="30" fill="none" stroke="white" strokeWidth="1.5" />
        </svg>
    </div>
);

const renderHistoryTokens = (
    lineup: {player_id: string; jumper_no: number; position: string; played: boolean; name?: string; full_name?: string; time_on_secs?: number; time_on_pct?: number; rotations?: number; injured?: boolean; intervals?: Record<string, {on: number; off: number}[]>; started_on_field?: boolean; gps?: {distance_m?: number; hs_dist_m?: number; sprints?: number; player_load?: number; max_vel?: number; m_per_min?: number; hr_avg?: number; hr_max?: number; accels?: number; hmld?: number; field_min?: number}}[],
    season: string,
    theme: 'hawks' | 'opponent',
    filter: 'starting' | 'full' | 'all' = 'full'
) => {
    const played = lineup.filter(p => {
        if (filter === 'starting') return p.played && p.started_on_field !== false;
        if (filter === 'full') return p.played;
        return true; // 'all' — include emergencies
    });
    const positionCounts: Record<string, number> = {};
    const compSeason = `${season}014`;
    const borderColor = theme === 'hawks' ? 'border-amber-400/40' : 'border-red-400/40';
    const textColor = theme === 'hawks' ? 'text-amber-300/70' : 'text-red-400/70';
    const timeColor = theme === 'hawks' ? 'text-hawks-gold' : 'text-red-400';
    const fallbackBg = theme === 'hawks' ? '1a1410' : '4a0e0e';
    const fallbackColor = theme === 'hawks' ? 'C8A951' : 'ef4444';

    return played.map((p, i) => {
        const count = positionCounts[p.position] || 0;
        positionCounts[p.position] = count + 1;
        const coords = POSITION_COORDS[p.position];
        const coord = coords?.[count % coords.length] || {x: 50, y: 50};

        return (
            <div key={`${p.player_id}_${i}`} className="absolute flex flex-col items-center group hover:!z-[999]"
                 style={{left: `${coord.x}%`, top: `${coord.y}%`, transform: 'translate(-50%, -50%)', zIndex: 10}}>
                <div className={`w-9 h-9 rounded-full border-2 ${borderColor} overflow-hidden opacity-80`}>
                    <img src={`https://s.afl.com.au/staticfile/AFL%20Tenant/AFL/Players/ChampIDImages/AFL/${compSeason}/${p.player_id}.png`}
                         className="w-full h-full object-cover" draggable={false}
                         onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${p.jumper_no}&background=${fallbackBg}&color=${fallbackColor}&size=80`; }}
                    />
                </div>
                {p.name && <div className="text-[8px] font-black text-white text-center leading-tight drop-shadow-lg">{p.name}</div>}
                <div className={`text-[7px] font-bold ${textColor}`}>#{p.jumper_no}</div>
                {/* Hover tooltip — flip below if near top */}
                <div className={`absolute left-1/2 -translate-x-1/2 hidden group-hover:block z-50 pointer-events-none ${coord.y < 25 ? 'top-full mt-2' : 'bottom-full mb-2'}`}>
                    <div className="bg-[#1A1410] border border-white/20 rounded-lg p-2.5 shadow-2xl min-w-[160px] text-center">
                        <div className="text-[10px] font-black text-white">{p.full_name || `#${p.jumper_no}`} — {p.position}</div>
                        {p.time_on_secs != null && (
                            <div className={`text-[9px] ${timeColor} font-bold mt-1`}>
                                {Math.round(p.time_on_secs / 60)} min ({p.time_on_pct}%)
                            </div>
                        )}
                        {p.rotations != null && (
                            <div className="text-[8px] text-gray-400 mt-0.5">{p.rotations} rotations</div>
                        )}
                        {p.intervals && (
                            <div className="flex gap-1 justify-center mt-1">
                                {[1,2,3,4].map(q => {
                                    const qIntervals = p.intervals?.[String(q)] || [];
                                    const qSecs = qIntervals.reduce((sum: number, iv: any) => sum + (iv.off - iv.on), 0);
                                    return (
                                    <div key={q} className="text-[7px] text-gray-500">
                                        Q{q}: {Math.round(qSecs / 60)}m
                                    </div>
                                    );
                                })}
                            </div>
                        )}
                        {p.injured && <div className="text-[8px] font-black text-red-400 mt-1">INJURED</div>}
                        {p.gps && (
                            <div className="mt-1.5 pt-1.5 border-t border-white/10">
                                <div className="text-[8px] font-bold text-emerald-400 mb-0.5">GPS</div>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[8px]">
                                    {p.gps.distance_m != null && <div className="text-gray-400">Dist <span className="text-white font-bold">{(p.gps.distance_m / 1000).toFixed(1)}km</span></div>}
                                    {p.gps.hs_dist_m != null && <div className="text-gray-400">HS <span className="text-amber-300 font-bold">{Math.round(p.gps.hs_dist_m)}m</span></div>}
                                    {p.gps.sprints != null && <div className="text-gray-400">Sprints <span className="text-white font-bold">{p.gps.sprints}</span></div>}
                                    {p.gps.player_load != null && <div className="text-gray-400">Load <span className="text-white font-bold">{Math.round(p.gps.player_load)}</span></div>}
                                    {p.gps.max_vel != null && <div className="text-gray-400">Max <span className="text-white font-bold">{p.gps.max_vel.toFixed(1)}m/s</span></div>}
                                    {p.gps.m_per_min != null && <div className="text-gray-400">m/min <span className="text-white font-bold">{Math.round(p.gps.m_per_min)}</span></div>}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    });
};

const TeamBuilder = () => {
    const [players, setPlayers] = useState<Player[]>([]);
    const [boxHillPlayers, setBoxHillPlayers] = useState<BoxHillPlayer[]>([]);
    const [sidebarPool, setSidebarPool] = useState<'hawks' | 'boxhill'>('hawks');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [posFilter, setPosFilter] = useState<PositionGroup>('ALL');

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

    // Free-form field drag state
    const [draggingFieldPlayer, setDraggingFieldPlayer] = useState<string | null>(null);
    const [draggingOppPlayer, setDraggingOppPlayer] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const fieldRef = useRef<HTMLDivElement>(null);
    const oppFieldRef = useRef<HTMLDivElement>(null);
    const [fieldDragOver, setFieldDragOver] = useState(false);
    const [oppRosterPlayers, setOppRosterPlayers] = useState<{name: string; jumper_no: number; position: string; photo_url: string}[]>([]);
    const [oppDragOver, setOppDragOver] = useState(false);

    // Opponent history state
    const [oppHistoryGames, setOppHistoryGames] = useState<any[]>([]);
    const [oppViewTab, setOppViewTab] = useState<'current' | number>('current');
    const [historyFilter, setHistoryFilter] = useState<'starting' | 'full' | 'all'>('full');

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

    // Free-form field handlers
    const handleFieldMouseDown = (e: React.MouseEvent, positionId: string) => {
        e.preventDefault();
        setDraggingFieldPlayer(positionId);
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setDragOffset({ x: e.clientX - rect.left - rect.width / 2, y: e.clientY - rect.top - rect.height / 2 });
    };

    const handleFieldMouseMove = (e: React.MouseEvent) => {
        if (!draggingFieldPlayer || !fieldRef.current) return;
        const rect = fieldRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100;
        const y = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100;
        const cx = Math.max(2, Math.min(98, x));
        const cy = Math.max(2, Math.min(98, y));
        setFieldState(prev => prev.map(s =>
            s.position_id === draggingFieldPlayer ? { ...s, x: cx, y: cy } : s
        ));
    };

    const handleFieldMouseUp = () => {
        if (draggingFieldPlayer) {
            // Use functional update to read latest state (avoids stale closure)
            setFieldState(prev => {
                if (activeVersion) {
                    if (saveTimer.current) clearTimeout(saveTimer.current);
                    saveTimer.current = setTimeout(() => {
                        ApiService.saveVersionData(activeVersion.id, JSON.stringify(prev));
                    }, 500);
                }
                return prev;
            });
            setDraggingFieldPlayer(null);
        }
    };

    const handleFieldDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setFieldDragOver(false);
        const raw = e.dataTransfer.getData('text/plain');
        if (!raw || !fieldRef.current) return;

        // Box Hill players are prefixed with 'bh_'; store as negative IDs to distinguish from Hawks
        let playerId: number;
        if (raw.startsWith('bh_')) {
            playerId = -parseInt(raw.slice(3), 10);
        } else {
            playerId = parseInt(raw, 10);
        }
        if (isNaN(playerId)) return;

        // Prevent duplicates
        if (fieldState.some(s => s.player_id === playerId)) return;

        const rect = fieldRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        const newEntry: TeamPosition = {
            position_id: `field_${Date.now()}`,
            player_id: playerId,
            x: Math.max(2, Math.min(98, x)),
            y: Math.max(2, Math.min(98, y)),
            notes: '',
            label: '',
        };
        const newState = [...fieldState, newEntry];
        autoSave(newState);
    };

    // Load Box Hill players when pool is switched to 'boxhill'
    useEffect(() => {
        if (sidebarPool === 'boxhill' && boxHillPlayers.length === 0) {
            ApiService.getBoxHillPlayers()
                .then(setBoxHillPlayers)
                .catch(err => console.error('Failed to load Box Hill players:', err));
        }
    }, [sidebarPool]);

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

    // Load opponent roster when round changes
    useEffect(() => {
        if (selectedRound?.opponent) {
            ApiService.getOpponentPlayers(selectedRound.opponent).then(setOppRosterPlayers).catch(() => setOppRosterPlayers([]));
        } else {
            setOppRosterPlayers([]);
        }
    }, [selectedRound]);

    // Load opponent history when opponent changes
    useEffect(() => {
        if (selectedRound?.opponent) {
            setOppViewTab('current');
            ApiService.getOpponentHistory(selectedRound.opponent).then(setOppHistoryGames).catch(() => setOppHistoryGames([]));
        } else {
            setOppHistoryGames([]);
            setOppViewTab('current');
        }
    }, [selectedRound?.opponent]);

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
        // Remove all field players (those with x/y coordinates) and clear bench slots
        const newState = fieldState
            .filter(s => !(s.x != null && s.y != null)) // remove free-form field players
            .map(s =>
                s.position_id !== 'COACH_NOTES'
                    ? { ...s, player_id: null, notes: '', rotation_color: undefined, rotation_minutes: undefined }
                    : s
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

    // Hawks players: positive player_id. Box Hill players: negative player_id (e.g. -50 for #50).
    const isPlayerAssigned = (jumperNo: number, isBoxHill = false) => {
        const stored = isBoxHill ? -jumperNo : jumperNo;
        return fieldState.some(s => s.player_id != null && Number(s.player_id) === stored);
    };

    const filteredPlayers = useMemo(() => {
        if (sidebarPool === 'boxhill') {
            return boxHillPlayers.filter(p => {
                const q = searchTerm.toLowerCase();
                return (
                    p.name.toLowerCase().includes(q) ||
                    p.jumper_no.toString().includes(searchTerm) ||
                    (p.community_club || '').toLowerCase().includes(q)
                );
            });
        }
        if (!players) return [];
        return players.filter(p => {
            const matchesSearch =
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.jumper_no.toString().includes(searchTerm) ||
                (p.position || '').toLowerCase().includes(searchTerm.toLowerCase());
            return matchesSearch && matchesPositionFilter(p.position, posFilter);
        });
    }, [players, boxHillPlayers, sidebarPool, searchTerm, posFilter]);

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
    if (loading) return (
        <div className="p-8 flex items-center justify-center h-64">
            <div className="text-amber-300/40 text-sm font-black uppercase tracking-[0.3em] animate-pulse">
                Constructing Tactical Field...
            </div>
        </div>
    );

    const fieldPlayers = fieldState.filter(s => s.x != null && s.y != null && s.player_id != null && !s.position_id.startsWith('opp_'));
    const oppPlayers = fieldState.filter(s => s.x != null && s.y != null && s.position_id.startsWith('opp_'));
    const assignedCount = fieldState.filter(s => s.player_id != null && s.position_id !== 'COACH_NOTES' && !s.position_id.startsWith('opp_')).length;

    // Opponent field handlers
    const handleOppMouseDown = (e: React.MouseEvent, positionId: string) => {
        e.preventDefault();
        setDraggingOppPlayer(positionId);
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setDragOffset({ x: e.clientX - rect.left - rect.width / 2, y: e.clientY - rect.top - rect.height / 2 });
    };

    const handleOppMouseMove = (e: React.MouseEvent) => {
        if (!draggingOppPlayer || !oppFieldRef.current) return;
        const rect = oppFieldRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100;
        const y = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100;
        setFieldState(prev => prev.map(s =>
            s.position_id === draggingOppPlayer ? { ...s, x: Math.max(2, Math.min(98, x)), y: Math.max(2, Math.min(98, y)) } : s
        ));
    };

    const handleOppMouseUp = () => {
        if (draggingOppPlayer) {
            setFieldState(prev => { autoSave(prev); return prev; });
            setDraggingOppPlayer(null);
        }
    };

    const handleOppFieldDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setOppDragOver(false);
        const data = e.dataTransfer.getData('text/plain');
        if (!data.startsWith('opp_') || !oppFieldRef.current) return;
        const jumperNo = parseInt(data.replace('opp_', ''), 10);
        if (isNaN(jumperNo)) return;

        // Check if already on field
        const oppPlayer = oppRosterPlayers.find(p => p.jumper_no === jumperNo);
        if (!oppPlayer) return;
        if (fieldState.some(s => s.position_id === `opp_${jumperNo}`)) return;

        const rect = oppFieldRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        const newEntry: TeamPosition = {
            position_id: `opp_${jumperNo}`,
            player_id: jumperNo,
            x: Math.max(2, Math.min(98, x)),
            y: Math.max(2, Math.min(98, y)),
            notes: '',
            label: oppPlayer.name,
        };
        autoSave([...fieldState, newEntry]);
    };

    const isOppOnField = (jumperNo: number) => fieldState.some(s => s.position_id === `opp_${jumperNo}`);

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

            {/* Opponent History Tabs — TOP LEVEL */}
            {selectedRound?.opponent && oppHistoryGames.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        <button
                            onClick={() => setOppViewTab('current')}
                            className={clsx(
                                "text-[9px] font-black uppercase px-3 py-1.5 rounded-lg border whitespace-nowrap transition-colors",
                                oppViewTab === 'current'
                                    ? "bg-red-500/20 text-red-300 border-red-500/40"
                                    : "bg-hawks-hover text-gray-500 border-white/10 hover:text-gray-300"
                            )}
                        >
                            Current
                        </button>
                        {oppHistoryGames.map((game: any, idx: number) => {
                            const oppTeam = game.hawk_is_home ? game.away_team : game.home_team;
                            const seasonShort = `S${String(game.season).slice(-2)}`;
                            return (
                                <button
                                    key={game.match_id}
                                    onClick={() => setOppViewTab(idx)}
                                    className={clsx(
                                        "text-[9px] font-black uppercase px-3 py-1.5 rounded-lg border whitespace-nowrap transition-colors",
                                        oppViewTab === idx
                                            ? "bg-red-500/20 text-red-300 border-red-500/40"
                                            : "bg-hawks-hover text-gray-500 border-white/10 hover:text-gray-300"
                                    )}
                                >
                                    {seasonShort} {game.round} HAW {game.hawk_score} - {oppTeam} {game.opp_score}
                                </button>
                            );
                        })}
                    </div>
                    {oppViewTab !== 'current' && (
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Show:</span>
                            {([
                                { id: 'starting' as const, label: 'Starting 18' },
                                { id: 'full' as const, label: 'Full Squad' },
                                { id: 'all' as const, label: 'All Named' },
                            ]).map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setHistoryFilter(f.id)}
                                    className={clsx(
                                        "text-[9px] font-black uppercase px-3 py-1 rounded-lg border transition-colors",
                                        historyFilter === f.id
                                            ? "bg-hawks-gold/20 text-hawks-gold border-hawks-gold/40"
                                            : "bg-hawks-hover text-gray-500 border-white/10 hover:text-gray-300"
                                    )}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Current version UI — hidden when viewing history */}
            {oppViewTab === 'current' && (
            <>
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

            {/* Empty state — no versions */}
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

            {/* Squad Metrics */}
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
                            <div className="h-full bg-black rounded-full transition-all duration-500"
                                 style={{ width: `${Math.min(100, (assignedCount / 28) * 100)}%` }} />
                        </div>
                    </div>
                </div>
            )}
            </>
            )}

            {/* Main Layout */}
            {activeVersion && (
            <div className="space-y-4">
                {/* Field Row */}
                <div className="flex gap-3" style={{ height: 650 }}>

                {oppViewTab !== 'current' && oppHistoryGames[oppViewTab as number] ? (
                    <>
                        {/* Hawks historical oval */}
                        <div className="flex-1 min-w-[280px] relative bg-gradient-to-b from-[#071e36] to-[#050e1a] rounded-[2.5rem] border border-amber-400/20 shadow-2xl overflow-hidden" style={{height: '100%'}}>
                            <OvalMarkings />
                            <div className="absolute top-3 left-0 right-0 text-center text-[10px] font-black text-amber-300/30 uppercase tracking-widest pointer-events-none">
                                Hawthorn — {oppHistoryGames[oppViewTab as number].hawk_is_home ? 'Home' : 'Away'}
                            </div>
                            {renderHistoryTokens(oppHistoryGames[oppViewTab as number].hawk_lineup, oppHistoryGames[oppViewTab as number].season, 'hawks', historyFilter)}
                            {/* Match info overlay */}
                            <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
                                <div className="text-[11px] font-black text-amber-300/50">{oppHistoryGames[oppViewTab as number].hawk_score}</div>
                                <div className="text-[8px] text-amber-300/25 mt-0.5">
                                    {oppHistoryGames[oppViewTab as number].venue} — {oppHistoryGames[oppViewTab as number].date}
                                </div>
                            </div>
                        </div>

                        {/* Opponent historical oval */}
                        <div className="flex-1 min-w-[280px] relative bg-gradient-to-b from-[#2a0a0a] to-[#1a0505] rounded-[2.5rem] border border-red-500/20 shadow-2xl overflow-hidden" style={{height: '100%'}}>
                            <OvalMarkings />
                            <div className="absolute top-3 left-0 right-0 text-center text-[10px] font-black text-red-400/30 uppercase tracking-widest pointer-events-none">
                                {oppHistoryGames[oppViewTab as number].hawk_is_home ? oppHistoryGames[oppViewTab as number].away_team : oppHistoryGames[oppViewTab as number].home_team} — {oppHistoryGames[oppViewTab as number].hawk_is_home ? 'Away' : 'Home'}
                            </div>
                            {renderHistoryTokens(oppHistoryGames[oppViewTab as number].opp_lineup, oppHistoryGames[oppViewTab as number].season, 'opponent', historyFilter)}
                            {/* Match info overlay */}
                            <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
                                <div className="text-[11px] font-black text-red-400/50">{oppHistoryGames[oppViewTab as number].opp_score}</div>
                                <div className="text-[8px] text-red-400/25 mt-0.5">
                                    {oppHistoryGames[oppViewTab as number].venue} — {oppHistoryGames[oppViewTab as number].date}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                    {/* Player Pool sidebar (left column) — Hawks or Box Hill */}
                    <div className={clsx(
                        "w-[200px] shrink-0 rounded-2xl border overflow-hidden flex flex-col",
                        sidebarPool === 'boxhill'
                            ? "bg-[#062020]/80 border-teal-500/20"
                            : "bg-[#0d2040]/80 border-white/10"
                    )}>
                        {/* Pool toggle */}
                        <div className={clsx("p-1.5 flex gap-1", sidebarPool === 'boxhill' ? "border-b border-teal-500/20" : "border-b border-white/10")}>
                            {[
                                { key: 'hawks', label: 'Hawks', color: 'bg-hfc-brown text-white' },
                                { key: 'boxhill', label: 'Box Hill', color: 'bg-teal-700 text-teal-100' },
                            ].map(opt => (
                                <button
                                    key={opt.key}
                                    onClick={() => { setSidebarPool(opt.key as 'hawks' | 'boxhill'); setSearchTerm(''); }}
                                    className={clsx(
                                        "flex-1 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all",
                                        sidebarPool === opt.key ? opt.color : "text-white/30 hover:text-white/60"
                                    )}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        <div className={clsx("p-2", sidebarPool === 'boxhill' ? "border-b border-teal-500/10" : "border-b border-white/10")}>
                            <div className="flex items-center justify-between mb-1.5">
                                {sidebarPool === 'boxhill' ? (
                                    <>
                                        <span className="text-[9px] font-black text-teal-300 uppercase tracking-widest">VFL Listed</span>
                                        <span className="text-[7px] text-teal-400/40 uppercase">Cannot play AFL</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-[9px] font-black text-amber-300 uppercase tracking-widest">AFL Listed</span>
                                        <span className="text-[8px] font-bold text-white/30">
                                            {players.filter(p => !isPlayerAssigned(p.jumper_no, false)).length}
                                        </span>
                                    </>
                                )}
                            </div>
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-white/30" size={12} />
                                <input
                                    type="text"
                                    placeholder={sidebarPool === 'boxhill' ? 'Search BH...' : 'Search...'}
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className={clsx(
                                        "w-full bg-white/5 border rounded-lg py-1.5 pl-7 pr-2 text-[10px] text-white placeholder-white/30 focus:outline-none",
                                        sidebarPool === 'boxhill'
                                            ? "border-teal-500/20 focus:border-teal-400/50"
                                            : "border-white/10 focus:border-amber-400/50"
                                    )}
                                />
                            </div>
                            {sidebarPool === 'hawks' && (
                                <div className="mt-1.5">
                                    <PositionFilter value={posFilter} onChange={setPosFilter} compact />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                            <div className="space-y-1.5">
                                {sidebarPool === 'boxhill' ? (
                                    // ── Box Hill player cards ──
                                    (filteredPlayers as BoxHillPlayer[]).map(p => {
                                        const assigned = isPlayerAssigned(p.jumper_no, true);
                                        return (
                                            <div
                                                key={p.jumper_no}
                                                draggable={!assigned}
                                                onDragStart={(e) => {
                                                    e.dataTransfer.setData('text/plain', `bh_${p.jumper_no}`);
                                                    e.dataTransfer.effectAllowed = 'move';
                                                }}
                                                className={clsx(
                                                    "flex items-center gap-2 p-1.5 rounded-lg border transition-colors",
                                                    assigned
                                                        ? "bg-teal-400/10 border-teal-400/20 opacity-50"
                                                        : "bg-teal-900/20 border-teal-500/10 hover:border-teal-400/40 cursor-grab"
                                                )}
                                            >
                                                {/* Initials avatar for Box Hill (no photos yet) */}
                                                <div className="h-8 w-8 rounded-full shrink-0 pointer-events-none bg-teal-800 border border-teal-400/30 flex items-center justify-center text-[9px] font-black text-teal-200">
                                                    {p.name.split(' ').map(w => w[0]).join('').substring(0, 2)}
                                                </div>
                                                <div className="min-w-0 pointer-events-none flex-1">
                                                    <div className="text-[9px] font-black text-teal-100 truncate">{p.name.split(' ').slice(-1)[0]}</div>
                                                    <div className="text-[7px] text-teal-400/60">#{p.jumper_no}{p.leadership_role ? ` · ${p.leadership_role.replace('Leadership Group', 'LG').replace('Vice-Captain', 'VC').replace('Captain', 'C')}` : ''}</div>
                                                </div>
                                                {assigned && (
                                                    <div className="ml-auto shrink-0 h-2.5 w-2.5 rounded-full bg-teal-400/60 pointer-events-none" />
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    // ── Hawks player cards ──
                                    (filteredPlayers as Player[]).map(p => {
                                        const assigned = isPlayerAssigned(p.jumper_no, false);
                                        return (
                                            <div
                                                key={p.jumper_no}
                                                draggable={!assigned}
                                                onDragStart={(e) => {
                                                    e.dataTransfer.setData('text/plain', String(p.jumper_no));
                                                    e.dataTransfer.effectAllowed = 'move';
                                                }}
                                                className={clsx(
                                                    "flex items-center gap-2 p-1.5 rounded-lg border transition-colors",
                                                    assigned
                                                        ? "bg-amber-400/10 border-amber-400/20 opacity-50"
                                                        : "bg-white/[0.03] border-white/5 hover:border-amber-400/40 cursor-grab"
                                                )}
                                            >
                                                <img
                                                    src={formatPlayerImage(p.jumper_no, p.photo_url, p.name)}
                                                    className="h-8 w-8 rounded-full object-cover shrink-0 pointer-events-none border border-amber-400/20"
                                                    draggable={false}
                                                    alt={p.name}
                                                    onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=4D2004&color=F6B000&size=80&length=2`; }}
                                                />
                                                <div className="min-w-0 pointer-events-none">
                                                    <div className="text-[9px] font-black text-white truncate">{p.name.split(' ').slice(-1)[0]}</div>
                                                    <div className="text-[7px] text-amber-300/60">#{p.jumper_no} · {p.position}</div>
                                                </div>
                                                {assigned && (
                                                    <div className="ml-auto shrink-0 h-2.5 w-2.5 rounded-full bg-amber-400/60 pointer-events-none" />
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Hawks Oval */}
                    <div
                        ref={fieldRef}
                        className={clsx(
                            "flex-1 min-w-[280px] relative bg-gradient-to-b from-[#071e36] to-[#050e1a] rounded-[2.5rem] border shadow-2xl overflow-hidden select-none",
                            fieldDragOver ? "border-amber-400/60" : "border-white/10"
                        )}
                        onMouseMove={handleFieldMouseMove}
                        onMouseUp={handleFieldMouseUp}
                        onMouseLeave={handleFieldMouseUp}
                        onDragOver={(e) => { e.preventDefault(); setFieldDragOver(true); }}
                        onDragLeave={() => setFieldDragOver(false)}
                        onDrop={handleFieldDrop}
                    >
                        {/* AFL oval markings */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.10]">
                            <svg width="100%" height="100%" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid meet">
                                {/* Boundary */}
                                <ellipse cx="200" cy="300" rx="190" ry="285" fill="none" stroke="white" strokeWidth="2" />

                                {/* Centre circle */}
                                <circle cx="200" cy="300" r="50" fill="none" stroke="white" strokeWidth="1.5" />
                                {/* Centre square */}
                                <rect x="170" y="270" width="60" height="60" fill="none" stroke="white" strokeWidth="1.5" />
                                {/* Centre dot */}
                                <circle cx="200" cy="300" r="3" fill="white" />

                                {/* 50m arcs */}
                                <path d="M 80 140 A 160 160 0 0 1 320 140" fill="none" stroke="white" strokeWidth="1" strokeDasharray="6 4" />
                                <path d="M 80 460 A 160 160 0 0 0 320 460" fill="none" stroke="white" strokeWidth="1" strokeDasharray="6 4" />

                                {/* Goal square - defensive end */}
                                <rect x="175" y="15" width="50" height="30" fill="none" stroke="white" strokeWidth="1.5" />
                                <line x1="175" y1="15" x2="175" y2="5" stroke="white" strokeWidth="2" />
                                <line x1="225" y1="15" x2="225" y2="5" stroke="white" strokeWidth="2" />
                                <line x1="160" y1="17" x2="160" y2="8" stroke="white" strokeWidth="1" />
                                <line x1="240" y1="17" x2="240" y2="8" stroke="white" strokeWidth="1" />

                                {/* Goal square - attacking end */}
                                <rect x="175" y="555" width="50" height="30" fill="none" stroke="white" strokeWidth="1.5" />
                                <line x1="175" y1="585" x2="175" y2="595" stroke="white" strokeWidth="2" />
                                <line x1="225" y1="585" x2="225" y2="595" stroke="white" strokeWidth="2" />
                                <line x1="160" y1="583" x2="160" y2="592" stroke="white" strokeWidth="1" />
                                <line x1="240" y1="583" x2="240" y2="592" stroke="white" strokeWidth="1" />
                            </svg>
                        </div>

                        {/* End labels */}
                        <div className="absolute top-4 left-0 right-0 text-center text-[9px] font-black text-white/20 uppercase tracking-[0.3em] pointer-events-none z-0">Defensive End</div>
                        <div className="absolute bottom-4 left-0 right-0 text-center text-[9px] font-black text-white/20 uppercase tracking-[0.3em] pointer-events-none z-0">Attacking End</div>

                        {/* Drop hint when empty */}
                        {fieldPlayers.length === 0 && !fieldDragOver && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-amber-300/20 text-sm font-black uppercase tracking-[0.3em]">Drop players here</div>
                            </div>
                        )}

                        {/* Drop highlight */}
                        {fieldDragOver && (
                            <div className="absolute inset-0 bg-amber-400/5 pointer-events-none z-0" />
                        )}

                        {/* On-field player tokens */}
                        {fieldPlayers.map(pos => {
                            // Negative player_id = Box Hill player
                            const isBoxHill = (pos.player_id ?? 0) < 0;
                            const player = isBoxHill
                                ? (() => {
                                    const bh = boxHillPlayers.find(p => p.jumper_no === Math.abs(pos.player_id!));
                                    return bh ? { ...bh, position: bh.position || '—', readiness: undefined } as any : null;
                                  })()
                                : players.find(p => p.jumper_no === pos.player_id);
                            if (!player) return null;
                            const isBeingDragged = draggingFieldPlayer === pos.position_id;
                            const isRotSelected = selectedForRotation.includes(pos.position_id);
                            return (
                                <div
                                    key={pos.position_id}
                                    className={clsx(
                                        "absolute flex flex-col items-center select-none group",
                                        isBeingDragged ? "cursor-grabbing" : "cursor-grab",
                                        isRotSelected && "ring-4 ring-amber-400 ring-offset-2 ring-offset-[#071828] rounded-full"
                                    )}
                                    style={{
                                        left: `${pos.x}%`,
                                        top: `${pos.y}%`,
                                        transform: 'translate(-50%, -50%)',
                                        zIndex: isBeingDragged ? 50 : 10,
                                    }}
                                    onMouseDown={(e) => {
                                        if (rotationMode) {
                                            setSelectedForRotation(prev =>
                                                prev.includes(pos.position_id)
                                                    ? prev.filter(i => i !== pos.position_id)
                                                    : [...prev, pos.position_id]
                                            );
                                            return;
                                        }
                                        handleFieldMouseDown(e, pos.position_id);
                                    }}
                                >
                                    {/* Rotation color ring — teal for Box Hill players */}
                                    <div
                                        className={clsx(
                                            "relative w-10 h-10 rounded-full border-2 overflow-hidden",
                                            pos.rotation_color ? "" : isBoxHill ? "border-teal-400/60" : "border-amber-400/40"
                                        )}
                                        style={pos.rotation_color ? { borderColor: pos.rotation_color } : {}}
                                    >
                                        <img
                                            src={formatPlayerImage(player.jumper_no, player.photo_url, player.name)}
                                            className="w-full h-full object-cover rounded-full"
                                            draggable={false}
                                            alt={player.name}
                                            onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=4D2004&color=F6B000&size=80&length=2`; }}
                                        />
                                    </div>
                                    {/* Readiness dot */}
                                    {player.readiness?.score != null && (
                                        <div className={clsx(
                                            "absolute -top-0.5 -left-0.5 w-3 h-3 rounded-full border border-[#071e36]",
                                            player.readiness.score >= 80 ? "bg-emerald-400" : player.readiness.score >= 60 ? "bg-amber-400" : "bg-red-400"
                                        )} />
                                    )}
                                    {/* Rotation minutes badge */}
                                    {pos.rotation_minutes && pos.rotation_color && (
                                        <div className="absolute -top-0.5 -right-1 text-[6px] font-black px-1 rounded-full text-white" style={{ backgroundColor: pos.rotation_color }}>
                                            {pos.rotation_minutes}m
                                        </div>
                                    )}
                                    <div className={clsx(
                                        "text-[9px] font-black text-center mt-0.5 leading-tight drop-shadow-lg",
                                        isBoxHill ? "text-teal-200" : "text-white"
                                    )}>
                                        {player.name.split(' ').slice(-1)[0]}
                                    </div>
                                    <div className={clsx("text-[7px] font-bold", isBoxHill ? "text-teal-400/70" : "text-amber-300/60")}>
                                        #{Math.abs(pos.player_id!)}
                                        {isBoxHill && <span className="ml-0.5 text-teal-400/50">VFL</span>}
                                    </div>
                                    {/* Label if set */}
                                    {pos.label && (
                                        <div className={clsx("text-[7px] font-black uppercase tracking-wider", isBoxHill ? "text-teal-400/80" : "text-amber-400/80")}>{pos.label}</div>
                                    )}
                                    {/* Remove button */}
                                    {!rotationMode && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const newState = fieldState.filter(s => s.position_id !== pos.position_id);
                                                autoSave(newState);
                                            }}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-black"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Opposition Oval — current (editable) view only */}
                    {selectedRound?.opponent && oppRosterPlayers.length > 0 && (
                        <div
                            ref={oppFieldRef}
                            className={clsx(
                                "flex-1 min-w-[280px] relative bg-gradient-to-b from-[#2a0a0a] to-[#1a0505] rounded-[2.5rem] border shadow-2xl overflow-hidden select-none",
                                oppDragOver ? "border-red-400/60" : "border-red-500/20"
                            )}
                            onMouseMove={handleOppMouseMove}
                            onMouseUp={handleOppMouseUp}
                            onMouseLeave={handleOppMouseUp}
                            onDragOver={(e) => { e.preventDefault(); setOppDragOver(true); }}
                            onDragLeave={() => setOppDragOver(false)}
                            onDrop={handleOppFieldDrop}
                        >
                            <OvalMarkings />

                            <div className="absolute top-4 left-0 right-0 text-center text-[9px] font-black text-red-400/20 uppercase tracking-[0.3em] pointer-events-none">Defensive End</div>
                            <div className="absolute bottom-4 left-0 right-0 text-center text-[9px] font-black text-red-400/20 uppercase tracking-[0.3em] pointer-events-none">Attacking End</div>

                            {oppPlayers.length === 0 && !oppDragOver && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="text-red-400/15 text-sm font-black uppercase tracking-[0.3em]">Drag opponent players here</div>
                                </div>
                            )}
                            {oppDragOver && (
                                <div className="absolute inset-0 bg-red-400/5 pointer-events-none z-0" />
                            )}

                            {/* On-field opponent tokens with photos */}
                            {oppPlayers.map(pos => {
                                const oppPlayer = oppRosterPlayers.find(p => p.jumper_no === pos.player_id);
                                return (
                                    <div
                                        key={pos.position_id}
                                        className={clsx(
                                            "absolute flex flex-col items-center select-none group",
                                            draggingOppPlayer === pos.position_id ? "cursor-grabbing" : "cursor-grab"
                                        )}
                                        style={{
                                            left: `${pos.x}%`,
                                            top: `${pos.y}%`,
                                            transform: 'translate(-50%, -50%)',
                                            zIndex: draggingOppPlayer === pos.position_id ? 50 : 10,
                                        }}
                                        onMouseDown={(e) => handleOppMouseDown(e, pos.position_id)}
                                    >
                                        <div className="w-10 h-10 rounded-full border-2 border-red-400/60 overflow-hidden">
                                            {oppPlayer ? (
                                                <img src={oppPlayer.photo_url} className="w-full h-full object-cover" draggable={false} alt={pos.label || ''} />
                                            ) : (
                                                <div className="w-full h-full bg-red-600 flex items-center justify-center">
                                                    <span className="text-[10px] font-black text-white">
                                                        {(pos.label || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-[8px] font-black text-red-300 text-center mt-0.5 leading-tight drop-shadow-lg max-w-[65px] truncate">
                                            {pos.label}
                                        </div>
                                        <div className="text-[7px] text-red-400/50">#{pos.player_id}</div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                autoSave(fieldState.filter(s => s.position_id !== pos.position_id));
                                            }}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-black"
                                        >
                                            ×
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Opposition Player Pool (conditional, right column) — only in Current view */}
                    {selectedRound?.opponent && oppRosterPlayers.length > 0 && oppViewTab === 'current' && (
                        <div className="w-[200px] shrink-0 bg-[#1a0808]/60 rounded-2xl border border-red-500/10 overflow-hidden flex flex-col">
                            <div className="p-2 border-b border-red-500/10">
                                <h3 className="text-[9px] font-black text-red-400 uppercase tracking-widest">{selectedRound.opponent}</h3>
                                <span className="text-[7px] text-gray-500">
                                    {selectedRound.venue} ({selectedRound.is_home ? 'Home' : 'Away'})
                                </span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                                <div className="space-y-1.5">
                                    {oppRosterPlayers.map(p => {
                                        const onField = isOppOnField(p.jumper_no);
                                        return (
                                            <div
                                                key={p.jumper_no}
                                                draggable={!onField}
                                                onDragStart={(e) => {
                                                    e.dataTransfer.setData('text/plain', `opp_${p.jumper_no}`);
                                                    e.dataTransfer.effectAllowed = 'move';
                                                }}
                                                className={clsx(
                                                    "flex items-center gap-2 p-1.5 rounded-lg border transition-colors",
                                                    onField
                                                        ? "bg-red-500/10 border-red-500/20 opacity-50"
                                                        : "bg-[#1a0808] border-white/5 hover:border-red-400/40 cursor-grab"
                                                )}
                                            >
                                                <div className="relative shrink-0 pointer-events-none">
                                                    <img
                                                        src={p.photo_url}
                                                        alt={p.name}
                                                        draggable={false}
                                                        className="h-8 w-8 rounded-full object-cover border border-red-500/30"
                                                        onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=4a0e0e&color=ef4444&size=80&length=2`; }}
                                                    />
                                                    {onField && (
                                                        <div className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-500 flex items-center justify-center">
                                                            <span className="text-[6px] text-white font-black">✓</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0 pointer-events-none">
                                                    <div className="text-[9px] font-black text-red-300 truncate">{p.name.split(' ').slice(-1)[0]}</div>
                                                    <div className="text-[7px] text-red-400/50">#{p.jumper_no}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                    </>
                )}

                </div>

                {/* Rotation Timeline — shown below historical ovals */}
                {oppViewTab !== 'current' && oppHistoryGames[oppViewTab as number] && (() => {
                    const game = oppHistoryGames[oppViewTab as number];
                    const opponent = game.hawk_is_home ? game.away_team : game.home_team;
                    const renderTimeline = (
                        lineup: any[],
                        teamName: string,
                        bgColor: string,
                        borderColor: string,
                        titleColor: string,
                        barColor: string,
                        injuredBarColor: string,
                        pctColor: string
                    ) => (
                        <div className={`${bgColor} rounded-2xl border ${borderColor} p-4`}>
                            <h4 className={`text-[10px] font-black ${titleColor} uppercase tracking-widest mb-3`}>{teamName} — Time on Ground</h4>
                            <div className="space-y-1.5">
                                {lineup
                                    .filter((p: any) => p.played)
                                    .sort((a: any, b: any) => (b.time_on_pct || 0) - (a.time_on_pct || 0))
                                    .map((p: any) => (
                                        <div key={p.player_id} className="flex items-center gap-2">
                                            <div className="w-20 text-[8px] font-bold text-gray-400 text-right truncate">{p.name || `#${p.jumper_no}`}</div>
                                            <div className="flex-1 h-3 bg-hawks-base rounded-full overflow-hidden flex">
                                                {[1,2,3,4].map((q: number) => {
                                                    const qIntervals = p.intervals?.[String(q)] || [];
                                                    const fillColor = p.injured ? injuredBarColor : barColor;
                                                    return (
                                                        <div key={q} className="relative" style={{width: '25%'}}>
                                                            {qIntervals.map((iv: any, idx: number) => {
                                                                const left = (iv.on / 1200) * 100;
                                                                const width = ((iv.off - iv.on) / 1200) * 100;
                                                                return (
                                                                    <div key={idx} className={`absolute inset-y-0 ${fillColor} rounded-sm`}
                                                                         style={{left: `${left}%`, width: `${Math.max(1, width)}%`}} />
                                                                );
                                                            })}
                                                            {q < 4 && <div className="absolute right-0 top-0 bottom-0 w-px bg-white/15 z-10" />}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className={`w-10 text-[8px] font-bold ${pctColor} text-right`}>{p.time_on_pct ?? '—'}%</div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    );
                    return (
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            {renderTimeline(game.hawk_lineup, 'Hawthorn', 'bg-[#071e36]', 'border-white/10', 'text-amber-300', 'bg-amber-400/60', 'bg-red-400/60', 'text-amber-300')}
                            {renderTimeline(game.opp_lineup, opponent, 'bg-[#1a0808]', 'border-red-500/10', 'text-red-400', 'bg-red-500/60', 'bg-red-400/60', 'text-red-400')}
                        </div>
                    );
                })()}

                {/* Below fields: Bench, Rotation, Notes — only for Current view */}
                {oppViewTab === 'current' && (<>
                {/* Bench */}
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

                {/* Rotation Strategy */}
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
                    <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {rotationsGroups.length === 0 ? (
                            <div className="py-6 text-center">
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

                {/* Coach Notes */}
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
                </>)}
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
