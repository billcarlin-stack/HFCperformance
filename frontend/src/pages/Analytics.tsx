import { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';

type Tab = 'summary' | 'quarters' | 'scatter' | 'playermatch' | 'oppreview' | 'player' | 'efficiency' | 'position';

interface Match { match_id: string; match_name: string; match_date: string; round_name: string; round_number: string; venue_name: string; player_count: number; season?: number; league_id?: number | null; match_type?: string | null; }
type Competition = 'premiership' | 'preseason' | 'all';
interface PlayerSummary { player: string; jersey: number; position: string; gps: Record<string, number | null>; match_stats: Record<string, number | null>; quarters: { period_name: string; [k: string]: any }[]; squad_id?: number; squad_name?: string; is_hawks?: boolean; }
interface EfficiencyRow { player: string; match_id: string; match_name: string; match_date: string; round_name: string; jersey: number; position: string; total_distance_m: number; disposals: number; pressure_acts: number; total_sprints: number; metres_gained: number; disposals_per_km: number | null; pressure_acts_per_sprint: number | null; metres_gained_per_km_run: number | null; }

const TABS: { key: Tab; label: string }[] = [
    { key: 'summary', label: 'Team Physical Summary' },
    { key: 'quarters', label: 'Quarter Breakdown' },
    { key: 'scatter', label: 'Physical vs Impact' },
    { key: 'playermatch', label: 'Player Match Review' },
    { key: 'oppreview', label: 'Opposition Player Review' },
    { key: 'player', label: 'Player Rounds' },
    { key: 'efficiency', label: 'Efficiency' },
    { key: 'position', label: 'Position Groups' },
];

const fmt = (v: number | null | undefined, decimals = 1) => v != null ? v.toFixed(decimals) : '—';
const fmtKm = (m: number | null | undefined) => m != null ? (m / 1000).toFixed(1) : '—';
const fmtInt = (v: number | null | undefined) => v != null ? Math.round(v).toString() : '—';

// Read a per-quarter metric with correct NULL semantics.
// In the new analysis table, stat_* (disposals, tackles, etc.) are NULL when the
// player was on the field but had zero of that stat — treat as 0 for plotting.
// GPS metrics (gps_*) NULL means the player wasn't recorded — keep as null.
const readMetric = (q: any, key: string): number | null => {
    if (!q) return null;
    const v = q[key];
    if (typeof v === 'number') return v;
    if (key.startsWith('stat_')) return 0;
    return null;
};

// Sortable table header
const SortHeader = ({ label, field, sortField, sortDir, onSort }: { label: string; field: string; sortField: string; sortDir: 'asc' | 'desc'; onSort: (f: string) => void }) => (
    <th className="px-2 py-2 text-left text-[10px] font-bold text-amber-300/70 uppercase tracking-wider cursor-pointer hover:text-hawks-gold select-none whitespace-nowrap"
        onClick={() => onSort(field)}>
        {label} {sortField === field ? (sortDir === 'desc' ? '▼' : '▲') : ''}
    </th>
);

// Match selector dropdown
const MatchSelector = ({ matches, selected, onChange }: { matches: Match[]; selected: string; onChange: (id: string) => void }) => (
    <select value={selected} onChange={e => onChange(e.target.value)}
        className="bg-hawks-card border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-hawks-gold">
        {matches.map(m => (
            <option key={m.match_id} value={m.match_id}>{m.season ?? ''} {m.round_name} — {m.match_name} ({m.match_date?.slice(0, 10)})</option>
        ))}
    </select>
);

// ── Tab 1: Team Physical Summary ────────────────────────────
const TeamSummary = ({ matches, matchId, onMatchChange }: { matches: Match[]; matchId: string; onMatchChange: (id: string) => void }) => {
    const [data, setData] = useState<PlayerSummary[]>([]);
    const [sortField, setSortField] = useState('gps.total_distance_m');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    useEffect(() => {
        if (!matchId) return;
        api.get(`/analytics/match/${matchId}/summary`).then(r => setData(r.data)).catch(() => setData([]));
    }, [matchId]);

    const getVal = (row: PlayerSummary, field: string): number => {
        const parts = field.split('.');
        const val = parts.length === 2 ? (row as any)[parts[0]]?.[parts[1]] : (row as any)[field];
        return val ?? -Infinity;
    };

    const sorted = useMemo(() => [...data].sort((a, b) => {
        const av = getVal(a, sortField), bv = getVal(b, sortField);
        return sortDir === 'desc' ? bv - av : av - bv;
    }), [data, sortField, sortDir]);

    const onSort = (f: string) => { setSortField(f); setSortDir(prev => sortField === f ? (prev === 'desc' ? 'asc' : 'desc') : 'desc'); };

    return (
        <div>
            <div className="mb-4"><MatchSelector matches={matches} selected={matchId} onChange={onMatchChange} /></div>
            <div className="overflow-x-auto rounded-xl border border-white/5">
                <table className="w-full text-xs">
                    <thead className="bg-hawks-card">
                        <tr>
                            <SortHeader label="Player" field="player" sortField={sortField} sortDir={sortDir} onSort={onSort} />
                            <SortHeader label="#" field="jersey" sortField={sortField} sortDir={sortDir} onSort={onSort} />
                            <SortHeader label="Pos" field="position" sortField={sortField} sortDir={sortDir} onSort={onSort} />
                            <SortHeader label="Dist (km)" field="gps.total_distance_m" sortField={sortField} sortDir={sortDir} onSort={onSort} />
                            <SortHeader label="HS Dist" field="gps.total_hs_dist_m" sortField={sortField} sortDir={sortDir} onSort={onSort} />
                            <SortHeader label="Sprints" field="gps.total_sprints" sortField={sortField} sortDir={sortDir} onSort={onSort} />
                            <SortHeader label="Load" field="gps.total_player_load" sortField={sortField} sortDir={sortDir} onSort={onSort} />
                            <SortHeader label="Max Vel" field="gps.max_vel" sortField={sortField} sortDir={sortDir} onSort={onSort} />
                            <SortHeader label="m/min" field="gps.avg_m_per_min" sortField={sortField} sortDir={sortDir} onSort={onSort} />
                            <SortHeader label="HMLD" field="gps.total_hmld" sortField={sortField} sortDir={sortDir} onSort={onSort} />
                            <SortHeader label="Disp" field="match_stats.disposals" sortField={sortField} sortDir={sortDir} onSort={onSort} />
                            <SortHeader label="Tackles" field="match_stats.tackles" sortField={sortField} sortDir={sortDir} onSort={onSort} />
                            <SortHeader label="Press" field="match_stats.pressure_acts" sortField={sortField} sortDir={sortDir} onSort={onSort} />
                            <SortHeader label="Goals" field="match_stats.goals" sortField={sortField} sortDir={sortDir} onSort={onSort} />
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((p, i) => (
                            <tr key={i} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                                <td className="px-2 py-1.5 font-bold text-white">{p.player}</td>
                                <td className="px-2 py-1.5 text-gray-400">{p.jersey}</td>
                                <td className="px-2 py-1.5 text-gray-400">{p.position}</td>
                                <td className="px-2 py-1.5 text-hawks-gold font-bold">{fmtKm(p.gps.total_distance_m)}</td>
                                <td className="px-2 py-1.5">{fmtInt(p.gps.total_hs_dist_m)}</td>
                                <td className="px-2 py-1.5">{fmtInt(p.gps.total_sprints)}</td>
                                <td className="px-2 py-1.5">{fmtInt(p.gps.total_player_load)}</td>
                                <td className="px-2 py-1.5">{fmt(p.gps.max_vel)}</td>
                                <td className="px-2 py-1.5">{fmtInt(p.gps.avg_m_per_min)}</td>
                                <td className="px-2 py-1.5">{fmtInt(p.gps.total_hmld)}</td>
                                <td className="px-2 py-1.5 text-white font-bold">{fmtInt(p.match_stats.disposals)}</td>
                                <td className="px-2 py-1.5">{fmtInt(p.match_stats.tackles)}</td>
                                <td className="px-2 py-1.5">{fmtInt(p.match_stats.pressure_acts)}</td>
                                <td className="px-2 py-1.5 text-hawks-gold">{fmtInt(p.match_stats.goals)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ── Tab 2: Quarter Breakdown ────────────────────────────────
const QuarterBreakdown = ({ matches, matchId, onMatchChange }: { matches: Match[]; matchId: string; onMatchChange: (id: string) => void }) => {
    const [data, setData] = useState<PlayerSummary[]>([]);
    const [metric, setMetric] = useState<'gps_m_per_min' | 'gps_distance_m' | 'gps_player_load' | 'gps_sprints'>('gps_m_per_min');

    useEffect(() => {
        if (!matchId) return;
        api.get(`/analytics/match/${matchId}/summary`).then(r => setData(r.data)).catch(() => setData([]));
    }, [matchId]);

    const metricLabel: Record<string, string> = { gps_m_per_min: 'm/min (rate)', gps_distance_m: 'Distance (m)', gps_player_load: 'Player Load', gps_sprints: 'Sprints' };
    const formatCell = (v: number | null) => {
        if (v == null) return '—';
        if (metric === 'gps_distance_m') return (v / 1000).toFixed(1);
        if (metric === 'gps_m_per_min') return Math.round(v).toString();
        return v.toFixed(0);
    };

    // Sort by total distance desc
    const sorted = useMemo(() => [...data].sort((a, b) => (b.gps.total_distance_m ?? 0) - (a.gps.total_distance_m ?? 0)), [data]);

    // Get max value for color scaling
    const allVals = sorted.flatMap(p => p.quarters.map(q => q[metric] ?? 0));
    const maxVal = Math.max(...allVals, 1);

    return (
        <div>
            <div className="mb-4 flex gap-3 items-center">
                <MatchSelector matches={matches} selected={matchId} onChange={onMatchChange} />
                <select value={metric} onChange={e => setMetric(e.target.value as any)}
                    className="bg-hawks-card border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-hawks-gold">
                    {Object.entries(metricLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
            </div>
            <div className="overflow-x-auto rounded-xl border border-white/5">
                <table className="w-full text-xs">
                    <thead className="bg-hawks-card">
                        <tr>
                            <th className="px-2 py-2 text-left text-[10px] font-bold text-amber-300/70 uppercase w-40">Player</th>
                            {['Quarter 1', 'Quarter 2', 'Quarter 3', 'Quarter 4'].map(q => (
                                <th key={q} className="px-2 py-2 text-center text-[10px] font-bold text-amber-300/70 uppercase" colSpan={1}>
                                    <div>{q.replace('Quarter ', 'Q')}</div>
                                </th>
                            ))}
                            <th className="px-2 py-2 text-center text-[10px] font-bold text-amber-300/70 uppercase w-24">Q4 Drop</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((p, i) => {
                            const qVals = ['Quarter 1', 'Quarter 2', 'Quarter 3', 'Quarter 4'].map(
                                qName => p.quarters.find(q => q.period_name === qName)?.[metric] ?? null
                            );
                            const qMins = ['Quarter 1', 'Quarter 2', 'Quarter 3', 'Quarter 4'].map(
                                qName => p.quarters.find(q => q.period_name === qName)?.gps_field_min ?? null
                            );
                            const q1 = qVals[0], q4 = qVals[3];
                            const dropPct = q1 && q4 ? Math.round(((q1 - q4) / q1) * 100) : null;

                            return (
                                <tr key={i} className="border-t border-white/5 hover:bg-white/5">
                                    <td className="px-2 py-1.5 font-bold text-white">{p.player}</td>
                                    {qVals.map((v, qi) => {
                                        const intensity = v != null ? Math.min(v / maxVal, 1) : 0;
                                        const mins = qMins[qi];
                                        return (
                                            <td key={qi} className="px-2 py-1.5 text-center font-mono"
                                                style={{ backgroundColor: `rgba(16, 185, 129, ${intensity * 0.4})` }}>
                                                <span className="text-white font-bold">{formatCell(v)}</span>
                                                {mins != null && <div className="text-[7px] text-gray-400">{Math.round(mins / 60)}min</div>}
                                            </td>
                                        );
                                    })}
                                    <td className={`px-2 py-1.5 text-center font-bold ${dropPct != null && dropPct > 20 ? 'text-red-400' : dropPct != null && dropPct > 10 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                        {dropPct != null ? `${dropPct > 0 ? '-' : '+'}${Math.abs(dropPct)}%` : '—'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ── Tab 3: Scatter Plots ────────────────────────────────────
const ScatterPlots = ({ matches, matchId, onMatchChange }: { matches: Match[]; matchId: string; onMatchChange: (id: string) => void }) => {
    const [data, setData] = useState<PlayerSummary[]>([]);
    const [hoveredPlayer, setHoveredPlayer] = useState<string | null>(null);
    const [showOpposition, setShowOpposition] = useState(true);

    useEffect(() => {
        if (!matchId) return;
        api.get(`/analytics/match/${matchId}/summary?include_opposition=1`).then(r => setData(r.data)).catch(() => setData([]));
    }, [matchId]);

    const hawksPlayers = data.filter(p => p.is_hawks !== false);
    const oppositionPlayers = data.filter(p => p.is_hawks === false);
    const oppositionName = oppositionPlayers[0]?.squad_name ?? 'Opposition';

    const ScatterChart = ({ xKey, yKey, xLabel, yLabel, xTransform, title, oppositionSupported }: {
        xKey: string; yKey: string; xLabel: string; yLabel: string; xTransform?: (v: number) => number; title: string; oppositionSupported: boolean;
    }) => {
        const W = 400, H = 300, PAD = 50;
        const toPoint = (p: PlayerSummary) => {
            const xRaw = (p as any).gps?.[xKey] ?? (p as any).match_stats?.[xKey] ?? 0;
            const x = xTransform ? xTransform(xRaw) : xRaw;
            const y = (p as any).gps?.[yKey] ?? (p as any).match_stats?.[yKey] ?? 0;
            return { x, y, player: p.player, jersey: p.jersey };
        };
        const hawksPts = hawksPlayers.map(toPoint).filter(p => p.x > 0 && p.y > 0);
        const oppPts = (showOpposition && oppositionSupported)
            ? oppositionPlayers.map(toPoint).filter(p => p.x > 0 && p.y > 0)
            : [];

        const allPts = [...hawksPts, ...oppPts];
        const xMax = Math.max(...allPts.map(p => p.x), 1);
        const yMax = Math.max(...allPts.map(p => p.y), 1);
        const scaleX = (v: number) => PAD + (v / xMax) * (W - PAD * 2);
        const scaleY = (v: number) => H - PAD - (v / yMax) * (H - PAD * 2);

        return (
            <div className="bg-hawks-card rounded-xl border border-white/5 p-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-bold text-hawks-gold">{title}</div>
                    {!oppositionSupported && <div className="text-[9px] text-gray-500 italic">Hawks only (no opposition GPS)</div>}
                </div>
                <svg width={W} height={H} className="w-full" viewBox={`0 0 ${W} ${H}`}>
                    <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="rgba(255,255,255,0.1)" />
                    <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="rgba(255,255,255,0.1)" />
                    <text x={W / 2} y={H - 8} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={10}>{xLabel}</text>
                    <text x={12} y={H / 2} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={10} transform={`rotate(-90, 12, ${H / 2})`}>{yLabel}</text>
                    {/* Opposition points (under Hawks) */}
                    {oppPts.map((p, i) => (
                        <g key={`opp-${i}`} onMouseEnter={() => setHoveredPlayer(p.player)} onMouseLeave={() => setHoveredPlayer(null)}>
                            <circle cx={scaleX(p.x)} cy={scaleY(p.y)} r={hoveredPlayer === p.player ? 7 : 4}
                                fill={hoveredPlayer === p.player ? '#EF4444' : 'rgba(239, 68, 68, 0.5)'}
                                stroke={hoveredPlayer === p.player ? '#fff' : 'none'} strokeWidth={1.5} />
                            {hoveredPlayer === p.player && (
                                <text x={scaleX(p.x)} y={scaleY(p.y) - 10} textAnchor="middle" fill="white" fontSize={9} fontWeight="bold">{p.player}</text>
                            )}
                        </g>
                    ))}
                    {/* Hawks points */}
                    {hawksPts.map((p, i) => (
                        <g key={`haw-${i}`} onMouseEnter={() => setHoveredPlayer(p.player)} onMouseLeave={() => setHoveredPlayer(null)}>
                            <circle cx={scaleX(p.x)} cy={scaleY(p.y)} r={hoveredPlayer === p.player ? 8 : 5}
                                fill={hoveredPlayer === p.player ? '#C8A951' : 'rgba(200, 169, 81, 0.8)'}
                                stroke={hoveredPlayer === p.player ? '#fff' : 'none'} strokeWidth={1.5}
                                className="transition-all duration-150 cursor-pointer" />
                            {hoveredPlayer === p.player && (
                                <text x={scaleX(p.x)} y={scaleY(p.y) - 12} textAnchor="middle" fill="white" fontSize={9} fontWeight="bold">{p.player}</text>
                            )}
                            {hoveredPlayer !== p.player && (
                                <text x={scaleX(p.x)} y={scaleY(p.y) - 8} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={7}>#{p.jersey}</text>
                            )}
                        </g>
                    ))}
                </svg>
            </div>
        );
    };

    return (
        <div>
            <div className="mb-4 flex gap-3 items-center flex-wrap">
                <MatchSelector matches={matches} selected={matchId} onChange={onMatchChange} />
                {oppositionPlayers.length > 0 && (
                    <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                        <input type="checkbox" checked={showOpposition} onChange={e => setShowOpposition(e.target.checked)} className="accent-red-400" />
                        Show {oppositionName}
                    </label>
                )}
                <div className="flex gap-3 ml-auto text-[10px] text-gray-300">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-hawks-gold" />Hawthorn</span>
                    {showOpposition && oppositionPlayers.length > 0 && (
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#EF4444' }} />{oppositionName}</span>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Distance/Player Load charts are GPS-based → opposition has no data for X axis */}
                <ScatterChart xKey="total_distance_m" yKey="disposals" xLabel="Distance (km)" yLabel="Disposals"
                    xTransform={v => v / 1000} title="Distance vs Disposals" oppositionSupported={false} />
                <ScatterChart xKey="total_sprints" yKey="pressure_acts" xLabel="Sprints" yLabel="Pressure Acts"
                    title="Sprints vs Pressure Acts" oppositionSupported={false} />
                <ScatterChart xKey="total_distance_m" yKey="tackles" xLabel="Distance (km)" yLabel="Tackles"
                    xTransform={v => v / 1000} title="Distance vs Tackles" oppositionSupported={false} />
                <ScatterChart xKey="total_player_load" yKey="disposals" xLabel="Player Load" yLabel="Disposals"
                    title="Player Load vs Disposals" oppositionSupported={false} />
            </div>
        </div>
    );
};

// ── Tab: Player Match Review (per-quarter deep dive) ────────
const PlayerMatchReview = ({ matches, matchId, onMatchChange }: { matches: Match[]; matchId: string; onMatchChange: (id: string) => void }) => {
    const [playerName, setPlayerName] = useState('');
    const [data, setData] = useState<PlayerSummary[]>([]);
    const [xKey, setXKey] = useState<'gps_m_per_min' | 'gps_distance_m' | 'gps_player_load'>('gps_m_per_min');
    const [yKey, setYKey] = useState<'stat_disposals' | 'stat_pressure_acts' | 'stat_tackles' | 'stat_marks' | 'stat_metres_gained' | 'gps_hmld' | 'gps_sprints' | 'gps_hs_dist_m' | 'gps_accels'>('stat_disposals');

    useEffect(() => {
        if (!matchId) return;
        // include_opposition=1 so we can show opposition avg line on the small multiples
        api.get(`/analytics/match/${matchId}/summary?include_opposition=1`).then(r => {
            setData(r.data);
            // Default-select a Hawks player if the current pick is missing
            const hawks = r.data.filter((p: PlayerSummary) => p.is_hawks !== false);
            if (hawks.length && !hawks.find((p: PlayerSummary) => p.player === playerName)) {
                setPlayerName(hawks[0].player);
            }
        }).catch(() => setData([]));
    }, [matchId]);

    // Partition data once — Hawks vs opposition
    const hawksPlayers = useMemo(() => data.filter(p => p.is_hawks !== false), [data]);
    const oppositionPlayers = useMemo(() => data.filter(p => p.is_hawks === false), [data]);
    const oppositionName = oppositionPlayers[0]?.squad_name ?? 'Opposition';

    const player = hawksPlayers.find(p => p.player === playerName);
    const QUARTERS = ['Quarter 1', 'Quarter 2', 'Quarter 3', 'Quarter 4'];

    // Per-quarter average across a player pool — used for both Hawks position avg and opposition avg
    const quarterAvg = (pool: PlayerSummary[]) => {
        const GPS_KEYS = ['gps_distance_m','gps_m_per_min','gps_player_load','gps_sprints','gps_hmld','gps_hs_dist_m','gps_accels','gps_decels','gps_field_min'];
        const STAT_KEYS = ['stat_disposals','stat_kicks','stat_handballs','stat_marks','stat_tackles','stat_pressure_acts','stat_goals','stat_behinds','stat_inside_50s','stat_rebound_50s','stat_metres_gained','stat_turnovers'];
        return QUARTERS.map(qName => {
            const vals = pool.map(p => p.quarters.find(q => q.period_name === qName)).filter(Boolean);
            const mean = (k: string) => {
                // readMetric treats NULL stat_* as 0 for players who were on field → correct avg
                const nums = vals.map(q => readMetric(q, k)).filter((v): v is number => v != null);
                return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
            };
            const entry: any = { period_name: qName };
            [...GPS_KEYS, ...STAT_KEYS].forEach(k => { entry[k] = mean(k); });
            return entry;
        });
    };

    // Team avg = same-position Hawks peers (fall back to all Hawks)
    const teamAvgPerQuarter = useMemo(() => {
        const peers = player ? hawksPlayers.filter(p => p.position === player.position && p.player !== player.player) : [];
        const pool = peers.length >= 2 ? peers : hawksPlayers.filter(p => p.player !== player?.player);
        return quarterAvg(pool);
    }, [hawksPlayers, player]);

    // Opposition avg per quarter — any opposition player who took the field
    const oppositionAvgPerQuarter = useMemo(() => quarterAvg(oppositionPlayers), [oppositionPlayers]);

    // Season averages per quarter (fetched from backend)
    const [seasonBreakdown, setSeasonBreakdown] = useState<{ [year: string]: { matches_played: number; quarters: any[] } }>({});
    useEffect(() => {
        if (!playerName) { setSeasonBreakdown({}); return; }
        // No seasons param → backend auto-detects all seasons with data for this player
        api.get(`/analytics/player/${encodeURIComponent(playerName)}/season-quarters`)
            .then(r => setSeasonBreakdown(r.data?.seasons ?? {}))
            .catch(() => setSeasonBreakdown({}));
    }, [playerName]);

    const axisLabel: Record<string, string> = {
        gps_m_per_min: 'Running intensity (m/min)', gps_distance_m: 'Distance (m)', gps_player_load: 'Player Load',
        gps_hmld: 'High Metabolic Load Distance (m)', gps_sprints: 'Sprints', gps_hs_dist_m: 'High Speed Distance (m)',
        gps_accels: 'Accelerations',
        stat_disposals: 'Disposals', stat_pressure_acts: 'Pressure Acts', stat_tackles: 'Tackles',
        stat_marks: 'Marks', stat_metres_gained: 'Metres Gained',
    };

    // Trajectory scatter
    const Trajectory = () => {
        if (!player) return null;
        const W = 560, H = 380, PAD = 60;
        const pts = QUARTERS.map((qName, i) => {
            const q = player.quarters.find(x => x.period_name === qName);
            const avg = teamAvgPerQuarter[i];
            return { i, qName, x: readMetric(q, xKey), y: readMetric(q, yKey), avgX: avg[xKey as keyof typeof avg] as number, avgY: avg[yKey as keyof typeof avg] as number };
        });
        // Zero is a valid impact-stat value (player had 0 disposals that Q). Only filter NULLs.
        const allX = [...pts.map(p => p.x), ...pts.map(p => p.avgX)].filter((v): v is number => v != null);
        const allY = [...pts.map(p => p.y), ...pts.map(p => p.avgY)].filter((v): v is number => v != null);
        if (!allX.length || !allY.length) return <div className="text-gray-500 text-sm">No quarter data for this player.</div>;
        // Tight scaling around the data so Q-points actually spread across the chart.
        // Padded ±10% (top) / -15% (bottom). Keeps zero-valued stat series visible (min goes negative),
        // and gives GPS data a proper visual range instead of squashing it against a forced 0 axis.
        const rawXMin = Math.min(...allX), rawXMax = Math.max(...allX);
        const rawYMin = Math.min(...allY), rawYMax = Math.max(...allY);
        const xSpread = rawXMax - rawXMin || Math.max(Math.abs(rawXMax), 1);
        const ySpread = rawYMax - rawYMin || Math.max(Math.abs(rawYMax), 1);
        const xMin = rawXMin - xSpread * 0.15, xMax = rawXMax + xSpread * 0.1;
        const yMin = rawYMin - ySpread * 0.15, yMax = rawYMax + ySpread * 0.1;
        const sx = (v: number) => PAD + ((v - xMin) / (xMax - xMin)) * (W - PAD * 2);
        const sy = (v: number) => H - PAD - ((v - yMin) / (yMax - yMin)) * (H - PAD * 2);

        const qColors = ['#10B981', '#38BDF8', '#F59E0B', '#EF4444']; // Q1 green → Q4 red
        const validPts = pts.filter(p => p.x != null && p.y != null);
        const pathD = validPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x!)},${sy(p.y!)}`).join(' ');

        return (
            <div className="bg-hawks-card rounded-xl border border-white/5 p-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-bold text-hawks-gold">Quarter Trajectory — {player.player}</div>
                    <div className="flex gap-2">
                        <select value={xKey} onChange={e => setXKey(e.target.value as any)}
                            className="bg-hawks-base border border-white/10 text-white text-[10px] rounded px-2 py-1">
                            <option value="gps_m_per_min">X: m/min</option>
                            <option value="gps_distance_m">X: Distance</option>
                            <option value="gps_player_load">X: Player Load</option>
                        </select>
                        <select value={yKey} onChange={e => setYKey(e.target.value as any)}
                            className="bg-hawks-base border border-white/10 text-white text-[10px] rounded px-2 py-1">
                            <optgroup label="Impact">
                                <option value="stat_disposals">Y: Disposals</option>
                                <option value="stat_pressure_acts">Y: Pressure Acts</option>
                                <option value="stat_tackles">Y: Tackles</option>
                                <option value="stat_marks">Y: Marks</option>
                                <option value="stat_metres_gained">Y: Metres Gained</option>
                            </optgroup>
                            <optgroup label="Physical">
                                <option value="gps_hmld">Y: HMLD</option>
                                <option value="gps_sprints">Y: Sprints</option>
                                <option value="gps_hs_dist_m">Y: HS Distance</option>
                                <option value="gps_accels">Y: Accels</option>
                            </optgroup>
                        </select>
                    </div>
                </div>
                <svg width={W} height={H} className="w-full" viewBox={`0 0 ${W} ${H}`}>
                    {/* grid */}
                    {[0.25, 0.5, 0.75].map(f => (
                        <g key={f}>
                            <line x1={PAD + f * (W - PAD * 2)} y1={PAD} x2={PAD + f * (W - PAD * 2)} y2={H - PAD} stroke="rgba(255,255,255,0.04)" />
                            <line x1={PAD} y1={PAD + f * (H - PAD * 2)} x2={W - PAD} y2={PAD + f * (H - PAD * 2)} stroke="rgba(255,255,255,0.04)" />
                        </g>
                    ))}
                    {/* axes */}
                    <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="rgba(255,255,255,0.15)" />
                    <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="rgba(255,255,255,0.15)" />
                    <text x={W / 2} y={H - 18} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={11}>{axisLabel[xKey]}</text>
                    <text x={18} y={H / 2} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={11} transform={`rotate(-90, 18, ${H / 2})`}>{axisLabel[yKey]}</text>

                    {/* position-avg trajectory path (faint dashed) */}
                    {(() => {
                        const avgValid = pts.filter(p => p.avgX != null && p.avgY != null && p.avgX > 0 && p.avgY > 0);
                        if (avgValid.length < 2) return null;
                        const d = avgValid.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.avgX)},${sy(p.avgY)}`).join(' ');
                        return <path d={d} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={1.5} strokeDasharray="5 4" />;
                    })()}
                    {/* position-avg quarter points */}
                    {pts.filter(p => p.avgX && p.avgY).map((p, i) => (
                        <circle key={`avg-${i}`} cx={sx(p.avgX)} cy={sy(p.avgY)} r={4} fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.5)" strokeWidth={1} />
                    ))}

                    {/* trajectory path */}
                    <path d={pathD} fill="none" stroke="rgba(200,169,81,0.4)" strokeWidth={2} />
                    {/* arrowheads on segments */}
                    {validPts.slice(0, -1).map((p, i) => {
                        const next = validPts[i + 1];
                        const mx = (sx(p.x!) + sx(next.x!)) / 2;
                        const my = (sy(p.y!) + sy(next.y!)) / 2;
                        const angle = Math.atan2(sy(next.y!) - sy(p.y!), sx(next.x!) - sx(p.x!)) * 180 / Math.PI;
                        return <polygon key={i} points="-6,-4 0,0 -6,4" fill="rgba(200,169,81,0.7)" transform={`translate(${mx},${my}) rotate(${angle})`} />;
                    })}

                    {/* quarter points */}
                    {validPts.map((p) => (
                        <g key={p.i}>
                            <circle cx={sx(p.x!)} cy={sy(p.y!)} r={10} fill={qColors[p.i]} stroke="#fff" strokeWidth={2} />
                            <text x={sx(p.x!)} y={sy(p.y!) + 4} textAnchor="middle" fill="#fff" fontSize={10} fontWeight="bold">Q{p.i + 1}</text>
                        </g>
                    ))}

                    {/* legend */}
                    <g transform={`translate(${W - PAD - 120}, ${PAD + 6})`}>
                        <rect x={-8} y={-6} width={128} height={38} fill="rgba(0,0,0,0.4)" rx={4} />
                        <circle cx={2} cy={4} r={4} fill={qColors[0]} /><text x={12} y={7} fill="rgba(255,255,255,0.8)" fontSize={9}>Player (Q1→Q4)</text>
                        <circle cx={2} cy={22} r={3} fill="rgba(255,255,255,0.3)" /><text x={12} y={25} fill="rgba(255,255,255,0.8)" fontSize={9}>Position avg</text>
                    </g>
                </svg>
                <div className="text-[10px] text-gray-500 mt-1">Path direction shows how the player moved through physical output across the match. Down-and-left in Q4 = fatigue.</div>
            </div>
        );
    };

    // Radar chart — 6 GPS metrics × 4 quarters
    const Radar = () => {
        if (!player) return null;
        const W = 360, H = 360, CX = W / 2, CY = H / 2, R = 120;
        const metrics = [
            { key: 'gps_m_per_min', label: 'm/min' },
            { key: 'gps_distance_m', label: 'Distance' },
            { key: 'gps_hmld', label: 'HMLD' },
            { key: 'gps_sprints', label: 'Sprints' },
            { key: 'gps_hs_dist_m', label: 'HS Dist' },
            { key: 'gps_player_load', label: 'Load' },
        ];
        const N = metrics.length;
        // normalize each metric across this player's 4 quarters + team avg so max = 1
        const maxPerMetric: Record<string, number> = {};
        metrics.forEach(m => {
            const playerVals = player.quarters.map(q => (q as any)[m.key] ?? 0);
            const avgVals = teamAvgPerQuarter.map(q => (q as any)[m.key] ?? 0);
            maxPerMetric[m.key] = Math.max(...playerVals, ...avgVals, 1);
        });
        const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / N;
        const point = (i: number, frac: number) => [CX + Math.cos(angle(i)) * R * frac, CY + Math.sin(angle(i)) * R * frac];

        const qColors = ['#10B981', '#38BDF8', '#F59E0B', '#EF4444'];
        const polygon = (src: any[], qName: string) => {
            const q = src.find(x => x.period_name === qName);
            if (!q) return '';
            return metrics.map((m, i) => {
                const frac = (q[m.key] ?? 0) / maxPerMetric[m.key];
                const [x, y] = point(i, frac);
                return `${x},${y}`;
            }).join(' ');
        };

        return (
            <div className="bg-hawks-card rounded-xl border border-white/5 p-4">
                <div className="text-xs font-bold text-hawks-gold mb-2">Per-Quarter Output Shape</div>
                <svg width={W} height={H} className="w-full" viewBox={`0 0 ${W} ${H}`}>
                    {/* grid rings */}
                    {[0.25, 0.5, 0.75, 1].map(f => (
                        <polygon key={f} points={metrics.map((_, i) => point(i, f).join(',')).join(' ')}
                            fill="none" stroke="rgba(255,255,255,0.08)" />
                    ))}
                    {/* axes */}
                    {metrics.map((m, i) => {
                        const [x, y] = point(i, 1);
                        const [lx, ly] = point(i, 1.18);
                        return (
                            <g key={m.key}>
                                <line x1={CX} y1={CY} x2={x} y2={y} stroke="rgba(255,255,255,0.08)" />
                                <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.5)" fontSize={10}>{m.label}</text>
                            </g>
                        );
                    })}
                    {/* team avg polygon (overall average across quarters) */}
                    {(() => {
                        const avgPts = metrics.map((m, i) => {
                            const v = teamAvgPerQuarter.reduce((s, q) => s + ((q as any)[m.key] ?? 0), 0) / teamAvgPerQuarter.length;
                            const [x, y] = point(i, v / maxPerMetric[m.key]);
                            return `${x},${y}`;
                        }).join(' ');
                        return <polygon points={avgPts} fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.35)" strokeDasharray="4 3" strokeWidth={1.5} />;
                    })()}
                    {/* quarter polygons */}
                    {QUARTERS.map((qName, i) => (
                        <polygon key={qName} points={polygon(player.quarters, qName)}
                            fill={qColors[i]} fillOpacity={0.12} stroke={qColors[i]} strokeWidth={1.8} />
                    ))}
                </svg>
                <div className="flex gap-3 justify-center text-[10px] flex-wrap">
                    {QUARTERS.map((q, i) => (
                        <div key={q} className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: qColors[i] }} /><span className="text-gray-300">Q{i + 1}</span></div>
                    ))}
                    <div className="flex items-center gap-1"><span className="w-3 h-[2px] border-t border-dashed border-white/40" /><span className="text-gray-400">Position avg</span></div>
                </div>
            </div>
        );
    };

    // Per-quarter table with Q4 drop
    const QuarterTable = () => {
        if (!player) return null;
        const intFmt = (v: number | null) => v != null ? Math.round(v).toString() : '—';
        const rows = [
            { key: 'gps_field_min', label: 'Field min', xform: (v: number | null) => v != null ? Math.round(v / 60).toString() : '—', group: 'Physical' },
            { key: 'gps_distance_m', label: 'Distance (m)', xform: intFmt, group: 'Physical' },
            { key: 'gps_m_per_min', label: 'm/min', xform: intFmt, group: 'Physical' },
            { key: 'gps_hmld', label: 'HMLD (m)', xform: intFmt, group: 'Physical' },
            { key: 'gps_sprints', label: 'Sprints', xform: intFmt, group: 'Physical' },
            { key: 'gps_hs_dist_m', label: 'HS Dist (m)', xform: intFmt, group: 'Physical' },
            { key: 'gps_player_load', label: 'Player Load', xform: intFmt, group: 'Physical' },
            { key: 'gps_accels', label: 'Accels', xform: intFmt, group: 'Physical' },
            { key: 'gps_decels', label: 'Decels', xform: intFmt, group: 'Physical' },
            { key: 'stat_disposals', label: 'Disposals', xform: intFmt, group: 'Impact' },
            { key: 'stat_kicks', label: 'Kicks', xform: intFmt, group: 'Impact' },
            { key: 'stat_handballs', label: 'Handballs', xform: intFmt, group: 'Impact' },
            { key: 'stat_marks', label: 'Marks', xform: intFmt, group: 'Impact' },
            { key: 'stat_tackles', label: 'Tackles', xform: intFmt, group: 'Impact' },
            { key: 'stat_pressure_acts', label: 'Pressure Acts', xform: intFmt, group: 'Impact' },
            { key: 'stat_metres_gained', label: 'Metres Gained', xform: intFmt, group: 'Impact' },
            { key: 'stat_inside_50s', label: 'Inside 50s', xform: intFmt, group: 'Impact' },
            { key: 'stat_goals', label: 'Goals', xform: intFmt, group: 'Impact' },
        ];
        return (
            <div className="bg-hawks-card rounded-xl border border-white/5 overflow-hidden">
                <div className="text-xs font-bold text-hawks-gold p-3 pb-2">Quarter-by-Quarter</div>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-t border-white/5">
                                <th className="px-3 py-2 text-left text-[10px] font-bold text-amber-300/70 uppercase">Metric</th>
                                {QUARTERS.map(q => <th key={q} className="px-3 py-2 text-center text-[10px] font-bold text-amber-300/70 uppercase">{q.replace('Quarter ', 'Q')}</th>)}
                                <th className="px-3 py-2 text-center text-[10px] font-bold text-amber-300/70 uppercase">Q1→Q4</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(r => {
                                const qVals = QUARTERS.map(qName => (player.quarters.find(q => q.period_name === qName) as any)?.[r.key] ?? null);
                                const q1 = qVals[0], q4 = qVals[3];
                                const drop = (q1 != null && q4 != null && q1 > 0) ? Math.round(((q1 - q4) / q1) * 100) : null;
                                return (
                                    <tr key={r.key} className="border-t border-white/5 hover:bg-white/5">
                                        <td className="px-3 py-1.5 text-gray-300">{r.label}</td>
                                        {qVals.map((v, i) => (
                                            <td key={i} className="px-3 py-1.5 text-center text-white font-mono">{r.xform(v)}</td>
                                        ))}
                                        <td className={`px-3 py-1.5 text-center font-bold ${drop != null && drop > 20 ? 'text-red-400' : drop != null && drop > 10 ? 'text-amber-400' : drop != null ? 'text-emerald-400' : 'text-gray-500'}`}>
                                            {drop != null ? `${drop > 0 ? '-' : '+'}${Math.abs(drop)}%` : '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // Small-multiple line charts: 1 per metric, 4 series (player, position avg, player-2026, player-2025)
    const SmallMultiples = () => {
        if (!player) return null;
        const metrics: { key: string; label: string; unit?: string; decimals?: number }[] = [
            { key: 'gps_m_per_min', label: 'm/min', decimals: 0 },
            { key: 'gps_hmld', label: 'HMLD', unit: 'm', decimals: 0 },
            { key: 'stat_disposals', label: 'Disposals', decimals: 1 },
            { key: 'stat_pressure_acts', label: 'Pressure Acts', decimals: 1 },
            { key: 'stat_tackles', label: 'Tackles', decimals: 1 },
            { key: 'stat_metres_gained', label: 'Metres Gained', decimals: 0 },
        ];
        // Season series: sort desc, assign color palette. Latest season = most-saturated line.
        const SEASON_COLORS = ['#38BDF8', '#A78BFA', '#F472B6', '#FB923C', '#4ADE80'];
        const seasonEntries = Object.entries(seasonBreakdown)
            .filter(([, v]) => v && v.matches_played > 0)
            .sort(([a], [b]) => Number(b) - Number(a));

        const series = (source: any[] | undefined, key: string): (number | null)[] =>
            QUARTERS.map(qName => readMetric(source?.find((x: any) => x.period_name === qName), key));

        const Chart = ({ m }: { m: typeof metrics[0] }) => {
            const W = 260, H = 160, PAD_L = 36, PAD_R = 10, PAD_T = 18, PAD_B = 26;
            const seasonSeries = seasonEntries.map(([year, data], idx) => ({
                label: `${year} avg`,
                color: SEASON_COLORS[idx % SEASON_COLORS.length],
                width: 1.6,
                dash: idx === 0 ? '' : '3 3',
                data: series(data.quarters, m.key),
            }));
            const oppositionSeries = oppositionPlayers.length > 0 ? [{
                label: `${oppositionName} avg`,
                color: '#EF4444',
                width: 1.4,
                dash: '2 4',
                data: series(oppositionAvgPerQuarter, m.key),
            }] : [];
            const seriesDefs = [
                { label: 'This match', color: '#C8A951', width: 2.2, dash: '', data: series(player.quarters, m.key) },
                { label: 'Position avg', color: 'rgba(255,255,255,0.6)', width: 1.4, dash: '5 4', data: series(teamAvgPerQuarter, m.key) },
                ...oppositionSeries,
                ...seasonSeries,
            ];
            const allVals = seriesDefs.flatMap(s => s.data).filter((v): v is number => v != null);
            if (!allVals.length) {
                return (
                    <div className="bg-hawks-card rounded-xl border border-white/5 p-3">
                        <div className="text-[11px] font-bold text-hawks-gold mb-1">{m.label}</div>
                        <div className="text-[10px] text-gray-500 h-[140px] flex items-center justify-center">No data</div>
                    </div>
                );
            }
            const yMin = 0, yMax = Math.max(...allVals) * 1.1 || 1;
            const sx = (i: number) => PAD_L + (i / 3) * (W - PAD_L - PAD_R);
            const sy = (v: number) => H - PAD_B - ((v - yMin) / (yMax - yMin)) * (H - PAD_T - PAD_B);

            const fmt = (v: number) => v.toFixed(m.decimals ?? 1);

            return (
                <div className="bg-hawks-card rounded-xl border border-white/5 p-3">
                    <div className="flex items-baseline justify-between mb-1">
                        <div className="text-[11px] font-bold text-hawks-gold">{m.label}</div>
                        <div className="text-[9px] text-gray-500">{m.unit}</div>
                    </div>
                    <svg width={W} height={H} className="w-full" viewBox={`0 0 ${W} ${H}`}>
                        {/* y-axis gridlines */}
                        {[0, 0.5, 1].map(f => {
                            const y = sy(yMin + f * (yMax - yMin));
                            const v = yMin + f * (yMax - yMin);
                            return (
                                <g key={f}>
                                    <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="rgba(255,255,255,0.06)" />
                                    <text x={PAD_L - 4} y={y + 3} textAnchor="end" fill="rgba(255,255,255,0.35)" fontSize={8}>{fmt(v)}</text>
                                </g>
                            );
                        })}
                        {/* x labels */}
                        {QUARTERS.map((_, i) => (
                            <text key={i} x={sx(i)} y={H - 8} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize={9}>Q{i + 1}</text>
                        ))}
                        {/* series paths */}
                        {seriesDefs.map((s, si) => {
                            const pts = s.data.map((v, i) => v != null ? `${sx(i)},${sy(v)}` : null).filter((p): p is string => p != null);
                            if (pts.length < 2) return null;
                            return <polyline key={si} points={pts.join(' ')} fill="none" stroke={s.color} strokeWidth={s.width} strokeDasharray={s.dash} strokeLinejoin="round" strokeLinecap="round" />;
                        })}
                        {/* this-match value dots */}
                        {seriesDefs[0].data.map((v, i) => v != null ? (
                            <circle key={i} cx={sx(i)} cy={sy(v)} r={3.5} fill={seriesDefs[0].color} stroke="#0B0807" strokeWidth={1.5} />
                        ) : null)}
                    </svg>
                </div>
            );
        };

        return (
            <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-bold text-hawks-gold">Per-Quarter vs Baselines</div>
                    <div className="flex gap-3 text-[10px] text-gray-300 flex-wrap">
                        <span className="flex items-center gap-1"><span className="w-3 h-[2px] bg-hawks-gold" />This match</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-[2px] border-t border-dashed border-white/60" />Position avg</span>
                        {oppositionPlayers.length > 0 && (
                            <span className="flex items-center gap-1"><span className="w-3 h-[2px] border-t border-dashed" style={{ borderColor: '#EF4444' }} />{oppositionName} avg</span>
                        )}
                        {seasonEntries.map(([year, data], idx) => {
                            const color = SEASON_COLORS[idx % SEASON_COLORS.length];
                            const isDashed = idx !== 0;
                            return (
                                <span key={year} className="flex items-center gap-1">
                                    <span className={`w-3 h-[2px] ${isDashed ? 'border-t border-dashed' : ''}`}
                                        style={isDashed ? { borderColor: color } : { background: color }} />
                                    {year} ({data.matches_played}g)
                                </span>
                            );
                        })}
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {metrics.map(m => <Chart key={m.key} m={m} />)}
                </div>
            </div>
        );
    };

    const KPI = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
        <div className="bg-hawks-card rounded-xl border border-white/5 p-3">
            <div className="text-[9px] uppercase tracking-wider text-amber-300/60">{label}</div>
            <div className="text-xl font-black text-white mt-0.5">{value}</div>
            {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
        </div>
    );

    return (
        <div>
            <div className="mb-4 flex gap-3 flex-wrap items-center">
                <MatchSelector matches={matches} selected={matchId} onChange={onMatchChange} />
                <select value={playerName} onChange={e => setPlayerName(e.target.value)}
                    className="bg-hawks-card border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-hawks-gold">
                    {hawksPlayers.map(p => <option key={p.player} value={p.player}>#{p.jersey} {p.player} ({p.position})</option>)}
                </select>
            </div>

            {!player ? (
                <div className="text-gray-500 text-sm">Select a match and player.</div>
            ) : (
                <>
                    {/* KPI strip — match totals (impact stats only available at match level) */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
                        <KPI label="Field Min" value={fmtInt(player.gps.total_field_min != null ? player.gps.total_field_min / 60 : null)} sub="minutes on ground" />
                        <KPI label="Distance" value={fmtKm(player.gps.total_distance_m)} sub="km" />
                        <KPI label="m/min" value={fmtInt(player.gps.avg_m_per_min)} />
                        <KPI label="Sprints" value={fmtInt(player.gps.total_sprints)} />
                        <KPI label="Disposals" value={fmtInt(player.match_stats.disposals)} sub={`${fmtInt(player.match_stats.kicks)}K / ${fmtInt(player.match_stats.handballs)}H`} />
                        <KPI label="Press Acts" value={fmtInt(player.match_stats.pressure_acts)} sub={`${fmtInt(player.match_stats.tackles)} tackles`} />
                        <KPI label="Goals" value={fmtInt(player.match_stats.goals)} sub={`${fmtInt(player.match_stats.behinds)} behinds`} />
                    </div>

                    {/* Trajectory + Radar side by side */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                        <Trajectory />
                        <Radar />
                    </div>

                    {/* Small multiples — per-metric Q1→Q4 vs baselines */}
                    <SmallMultiples />

                    {/* Quarter table */}
                    <div className="mt-4"><QuarterTable /></div>
                </>
            )}
        </div>
    );
};

// ── Tab: Opposition Player Review (impact-only, no GPS) ─────
const OppositionPlayerReview = ({ matches, matchId, onMatchChange }: { matches: Match[]; matchId: string; onMatchChange: (id: string) => void }) => {
    const [playerName, setPlayerName] = useState('');
    const [data, setData] = useState<PlayerSummary[]>([]);

    useEffect(() => {
        if (!matchId) return;
        api.get(`/analytics/match/${matchId}/summary?include_opposition=1`).then(r => {
            setData(r.data);
            const opp = r.data.filter((p: PlayerSummary) => p.is_hawks === false);
            if (opp.length && !opp.find((p: PlayerSummary) => p.player === playerName)) setPlayerName(opp[0].player);
        }).catch(() => setData([]));
    }, [matchId]);

    const oppositionPlayers = useMemo(() => data.filter(p => p.is_hawks === false), [data]);
    const oppositionName = oppositionPlayers[0]?.squad_name ?? 'Opposition';
    const player = oppositionPlayers.find(p => p.player === playerName);
    const QUARTERS = ['Quarter 1', 'Quarter 2', 'Quarter 3', 'Quarter 4'];

    // Opposition team average per quarter (same position preferred, fall back to all)
    const teamAvgPerQuarter = useMemo(() => {
        const peers = player ? oppositionPlayers.filter(p => p.position === player.position && p.player !== player.player) : [];
        const pool = peers.length >= 2 ? peers : oppositionPlayers.filter(p => p.player !== player?.player);
        const STAT_KEYS = ['stat_disposals','stat_kicks','stat_handballs','stat_marks','stat_tackles','stat_pressure_acts','stat_goals','stat_behinds','stat_inside_50s','stat_rebound_50s','stat_metres_gained','stat_turnovers'];
        return QUARTERS.map(qName => {
            const vals = pool.map(p => p.quarters.find(q => q.period_name === qName)).filter(Boolean);
            const mean = (k: string) => {
                // readMetric treats NULL stat_* as 0 for players who were on field
                const nums = vals.map(q => readMetric(q, k)).filter((v): v is number => v != null);
                return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
            };
            const entry: any = { period_name: qName };
            STAT_KEYS.forEach(k => { entry[k] = mean(k); });
            return entry;
        });
    }, [oppositionPlayers, player]);

    const KPI = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
        <div className="bg-hawks-card rounded-xl border border-white/5 p-3">
            <div className="text-[9px] uppercase tracking-wider text-red-300/60">{label}</div>
            <div className="text-xl font-black text-white mt-0.5">{value}</div>
            {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
        </div>
    );

    // Small-multiple line charts — impact only (no GPS available for opposition)
    const SmallMultiples = () => {
        if (!player) return null;
        const metrics: { key: string; label: string; decimals?: number }[] = [
            { key: 'stat_disposals', label: 'Disposals', decimals: 1 },
            { key: 'stat_pressure_acts', label: 'Pressure Acts', decimals: 1 },
            { key: 'stat_tackles', label: 'Tackles', decimals: 1 },
            { key: 'stat_marks', label: 'Marks', decimals: 1 },
            { key: 'stat_metres_gained', label: 'Metres Gained', decimals: 0 },
            { key: 'stat_goals', label: 'Goals', decimals: 1 },
        ];
        const series = (source: any[] | undefined, key: string): (number | null)[] =>
            QUARTERS.map(qName => readMetric(source?.find((x: any) => x.period_name === qName), key));

        const Chart = ({ m }: { m: typeof metrics[0] }) => {
            const W = 260, H = 160, PAD_L = 36, PAD_R = 10, PAD_T = 18, PAD_B = 26;
            const seriesDefs = [
                { label: 'This match', color: '#EF4444', width: 2.2, dash: '', data: series(player.quarters, m.key) },
                { label: 'Team avg', color: 'rgba(255,255,255,0.6)', width: 1.4, dash: '5 4', data: series(teamAvgPerQuarter, m.key) },
            ];
            const allVals = seriesDefs.flatMap(s => s.data).filter((v): v is number => v != null);
            if (!allVals.length) {
                return (
                    <div className="bg-hawks-card rounded-xl border border-white/5 p-3">
                        <div className="text-[11px] font-bold text-red-300 mb-1">{m.label}</div>
                        <div className="text-[10px] text-gray-500 h-[140px] flex items-center justify-center">No data</div>
                    </div>
                );
            }
            const yMin = 0, yMax = Math.max(...allVals) * 1.1 || 1;
            const sx = (i: number) => PAD_L + (i / 3) * (W - PAD_L - PAD_R);
            const sy = (v: number) => H - PAD_B - ((v - yMin) / (yMax - yMin)) * (H - PAD_T - PAD_B);
            const fmtV = (v: number) => v.toFixed(m.decimals ?? 1);
            return (
                <div className="bg-hawks-card rounded-xl border border-white/5 p-3">
                    <div className="text-[11px] font-bold text-red-300 mb-1">{m.label}</div>
                    <svg width={W} height={H} className="w-full" viewBox={`0 0 ${W} ${H}`}>
                        {[0, 0.5, 1].map(f => {
                            const y = sy(yMin + f * (yMax - yMin));
                            const v = yMin + f * (yMax - yMin);
                            return (
                                <g key={f}>
                                    <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="rgba(255,255,255,0.06)" />
                                    <text x={PAD_L - 4} y={y + 3} textAnchor="end" fill="rgba(255,255,255,0.35)" fontSize={8}>{fmtV(v)}</text>
                                </g>
                            );
                        })}
                        {QUARTERS.map((_, i) => (
                            <text key={i} x={sx(i)} y={H - 8} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize={9}>Q{i + 1}</text>
                        ))}
                        {seriesDefs.map((s, si) => {
                            const pts = s.data.map((v, i) => v != null ? `${sx(i)},${sy(v)}` : null).filter((p): p is string => p != null);
                            if (pts.length < 2) return null;
                            return <polyline key={si} points={pts.join(' ')} fill="none" stroke={s.color} strokeWidth={s.width} strokeDasharray={s.dash} strokeLinejoin="round" strokeLinecap="round" />;
                        })}
                        {seriesDefs[0].data.map((v, i) => v != null ? (
                            <circle key={i} cx={sx(i)} cy={sy(v)} r={3.5} fill={seriesDefs[0].color} stroke="#0B0807" strokeWidth={1.5} />
                        ) : null)}
                    </svg>
                </div>
            );
        };

        return (
            <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-bold text-red-300">Per-Quarter Impact vs {oppositionName} Team Avg</div>
                    <div className="flex gap-3 text-[10px] text-gray-300 flex-wrap">
                        <span className="flex items-center gap-1"><span className="w-3 h-[2px]" style={{ background: '#EF4444' }} />This match</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-[2px] border-t border-dashed border-white/60" />Team avg</span>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {metrics.map(m => <Chart key={m.key} m={m} />)}
                </div>
            </div>
        );
    };

    const QuarterTable = () => {
        if (!player) return null;
        const intFmt = (v: number | null) => v != null ? Math.round(v).toString() : '—';
        const rows = [
            { key: 'stat_disposals', label: 'Disposals' },
            { key: 'stat_kicks', label: 'Kicks' },
            { key: 'stat_handballs', label: 'Handballs' },
            { key: 'stat_marks', label: 'Marks' },
            { key: 'stat_tackles', label: 'Tackles' },
            { key: 'stat_pressure_acts', label: 'Pressure Acts' },
            { key: 'stat_metres_gained', label: 'Metres Gained' },
            { key: 'stat_inside_50s', label: 'Inside 50s' },
            { key: 'stat_goals', label: 'Goals' },
            { key: 'stat_behinds', label: 'Behinds' },
        ];
        return (
            <div className="bg-hawks-card rounded-xl border border-white/5 overflow-hidden">
                <div className="text-xs font-bold text-red-300 p-3 pb-2">Quarter-by-Quarter</div>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-t border-white/5">
                                <th className="px-3 py-2 text-left text-[10px] font-bold text-red-300/70 uppercase">Metric</th>
                                {QUARTERS.map(q => <th key={q} className="px-3 py-2 text-center text-[10px] font-bold text-red-300/70 uppercase">{q.replace('Quarter ', 'Q')}</th>)}
                                <th className="px-3 py-2 text-center text-[10px] font-bold text-red-300/70 uppercase">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(r => {
                                const qVals = QUARTERS.map(qName => (player.quarters.find(q => q.period_name === qName) as any)?.[r.key] ?? null);
                                const total = qVals.reduce((s, v) => s + (v ?? 0), 0);
                                return (
                                    <tr key={r.key} className="border-t border-white/5 hover:bg-white/5">
                                        <td className="px-3 py-1.5 text-gray-300">{r.label}</td>
                                        {qVals.map((v, i) => (
                                            <td key={i} className="px-3 py-1.5 text-center text-white font-mono">{intFmt(v)}</td>
                                        ))}
                                        <td className="px-3 py-1.5 text-center text-red-300 font-bold">{intFmt(total)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div>
            <div className="mb-4 flex gap-3 flex-wrap items-center">
                <MatchSelector matches={matches} selected={matchId} onChange={onMatchChange} />
                <select value={playerName} onChange={e => setPlayerName(e.target.value)}
                    className="bg-hawks-card border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-hawks-gold">
                    {oppositionPlayers.map(p => <option key={p.player} value={p.player}>#{p.jersey} {p.player} ({p.position})</option>)}
                </select>
                <div className="text-[10px] text-gray-400 italic ml-auto">Champion Data match stats only — no GPS for opposition</div>
            </div>

            {!player ? (
                <div className="text-gray-500 text-sm">
                    {oppositionPlayers.length === 0
                        ? 'No opposition data available for this match.'
                        : 'Select a player.'}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
                        <KPI label="Disposals" value={fmtInt(player.match_stats.disposals)} sub={`${fmtInt(player.match_stats.kicks)}K / ${fmtInt(player.match_stats.handballs)}H`} />
                        <KPI label="Marks" value={fmtInt(player.match_stats.marks)} />
                        <KPI label="Tackles" value={fmtInt(player.match_stats.tackles)} />
                        <KPI label="Press Acts" value={fmtInt(player.match_stats.pressure_acts)} />
                        <KPI label="Metres Gained" value={fmtInt(player.match_stats.metres_gained)} sub="m" />
                        <KPI label="Goals" value={fmtInt(player.match_stats.goals)} sub={`${fmtInt(player.match_stats.behinds)} behinds`} />
                    </div>

                    <SmallMultiples />

                    <div className="mt-4"><QuarterTable /></div>
                </>
            )}
        </div>
    );
};

// ── Tab 4: Player Rounds ────────────────────────────────────
const PlayerRounds = ({ matches: _matches }: { matches: Match[] }) => {
    const [players, setPlayers] = useState<string[]>([]);
    const [selectedPlayer, setSelectedPlayer] = useState('');
    const [data, setData] = useState<any[]>([]);

    useEffect(() => {
        api.get('/analytics/efficiency').then(r => {
            const unique = [...new Set(r.data.map((d: any) => d.player))].sort();
            setPlayers(unique as string[]);
            if (unique.length) setSelectedPlayer(unique[0] as string);
        });
    }, []);

    useEffect(() => {
        if (!selectedPlayer) return;
        api.get(`/analytics/player/${encodeURIComponent(selectedPlayer)}/rounds`).then(r => setData(r.data)).catch(() => setData([]));
    }, [selectedPlayer]);

    return (
        <div>
            <div className="mb-4">
                <select value={selectedPlayer} onChange={e => setSelectedPlayer(e.target.value)}
                    className="bg-hawks-card border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-hawks-gold">
                    {players.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>
            <div className="overflow-x-auto rounded-xl border border-white/5">
                <table className="w-full text-xs">
                    <thead className="bg-hawks-card">
                        <tr>
                            {['Season', 'Round', 'Opponent', 'Venue', 'Dist (km)', 'HS Dist', 'Sprints', 'Load', 'Max Vel', 'm/min', 'Disp', 'Kicks', 'Marks', 'Tackles', 'Press', 'Goals'].map(h => (
                                <th key={h} className="px-2 py-2 text-left text-[10px] font-bold text-amber-300/70 uppercase tracking-wider whitespace-nowrap">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((r, i) => (
                            <tr key={i} className="border-t border-white/5 hover:bg-white/5">
                                <td className="px-2 py-1.5 text-gray-400">{r.match_date?.slice(0, 4)}</td>
                                <td className="px-2 py-1.5 font-bold text-white">{r.round_name}</td>
                                <td className="px-2 py-1.5 text-gray-400">{r.match_name}</td>
                                <td className="px-2 py-1.5 text-gray-400">{r.venue_name}</td>
                                <td className="px-2 py-1.5 text-hawks-gold font-bold">{fmtKm(r.gps?.total_distance_m)}</td>
                                <td className="px-2 py-1.5">{fmtInt(r.gps?.total_hs_dist_m)}</td>
                                <td className="px-2 py-1.5">{fmtInt(r.gps?.total_sprints)}</td>
                                <td className="px-2 py-1.5">{fmtInt(r.gps?.total_player_load)}</td>
                                <td className="px-2 py-1.5">{fmt(r.gps?.max_vel)}</td>
                                <td className="px-2 py-1.5">{fmtInt(r.gps?.avg_m_per_min)}</td>
                                <td className="px-2 py-1.5 text-white font-bold">{fmtInt(r.match_stats?.disposals)}</td>
                                <td className="px-2 py-1.5">{fmtInt(r.match_stats?.kicks)}</td>
                                <td className="px-2 py-1.5">{fmtInt(r.match_stats?.marks)}</td>
                                <td className="px-2 py-1.5">{fmtInt(r.match_stats?.tackles)}</td>
                                <td className="px-2 py-1.5">{fmtInt(r.match_stats?.pressure_acts)}</td>
                                <td className="px-2 py-1.5 text-hawks-gold">{fmtInt(r.match_stats?.goals)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ── Tab 5: Efficiency ───────────────────────────────────────
const EfficiencyTab = ({ matches }: { matches: Match[] }) => {
    const [rawData, setRawData] = useState<EfficiencyRow[]>([]);
    const [roundFilter, setRoundFilter] = useState('all');
    const [posFilter, setPosFilter] = useState('all');
    const [sortField, setSortField] = useState('disposals_per_km');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    useEffect(() => { api.get('/analytics/efficiency').then(r => setRawData(r.data)).catch(() => setRawData([])); }, []);

    // Aggregate per player (or filter to single round)
    const aggregated = useMemo(() => {
        let filtered = rawData;
        if (posFilter !== 'all') filtered = filtered.filter(r => r.position === posFilter);

        if (roundFilter !== 'all') {
            // Single round — show per-player for that round
            return filtered.filter(r => r.match_id === roundFilter).map(r => {
                const km = r.total_distance_m / 1000;
                const kicks = r.disposals > 0 ? Math.round((r.disposals - (r.disposals - (r as any).kicks || 0)) / r.disposals * 100) : 0;
                return { ...r, km, kick_pct: kicks };
            });
        }

        // Aggregate across all rounds per player
        const byPlayer: Record<string, EfficiencyRow[]> = {};
        filtered.forEach(r => { if (!byPlayer[r.player]) byPlayer[r.player] = []; byPlayer[r.player].push(r); });

        return Object.entries(byPlayer).map(([player, rows]) => {
            const totalDist = rows.reduce((s, r) => s + (r.total_distance_m || 0), 0);
            const totalDisp = rows.reduce((s, r) => s + (r.disposals || 0), 0);
            const totalPress = rows.reduce((s, r) => s + (r.pressure_acts || 0), 0);
            const totalSprints = rows.reduce((s, r) => s + (r.total_sprints || 0), 0);
            const totalMG = rows.reduce((s, r) => s + (r.metres_gained || 0), 0);
            const km = totalDist / 1000;
            return {
                player,
                jersey: rows[0].jersey,
                position: rows[0].position,
                round_name: `${rows.length} games`,
                match_id: 'agg',
                total_distance_m: totalDist,
                km,
                disposals: totalDisp,
                pressure_acts: totalPress,
                total_sprints: totalSprints,
                metres_gained: totalMG,
                disposals_per_km: km > 0 ? Math.round((totalDisp / km) * 10) / 10 : null,
                pressure_acts_per_sprint: totalSprints > 0 ? Math.round((totalPress / totalSprints) * 100) / 100 : null,
                metres_gained_per_km_run: km > 0 ? Math.round(totalMG / km) : null,
                kick_pct: totalDisp > 0 ? Math.round(((rows.reduce((s, r) => s + ((r as any).kicks || r.disposals * 0.5), 0)) / totalDisp) * 100) : null,
            };
        });
    }, [rawData, roundFilter, posFilter]);

    const sorted = useMemo(() => [...aggregated].sort((a, b) => {
        const av = (a as any)[sortField] ?? -Infinity, bv = (b as any)[sortField] ?? -Infinity;
        return sortDir === 'desc' ? bv - av : av - bv;
    }), [aggregated, sortField, sortDir]);

    const onSort = (f: string) => { setSortField(f); setSortDir(prev => sortField === f ? (prev === 'desc' ? 'asc' : 'desc') : 'desc'); };

    const positions = useMemo(() => [...new Set(rawData.map(r => r.position))].sort(), [rawData]);

    // Quartile coloring based on current view
    const getQuartileColor = (val: number | null, field: string) => {
        if (val == null) return '';
        const vals = sorted.map(d => (d as any)[field]).filter((v: any) => v != null).sort((a: number, b: number) => b - a);
        const idx = vals.indexOf(val);
        const pct = vals.length > 1 ? idx / (vals.length - 1) : 0;
        if (pct < 0.25) return 'text-emerald-400';
        if (pct < 0.75) return 'text-amber-300';
        return 'text-red-400';
    };

    return (
        <div>
            <div className="flex gap-3 mb-4 flex-wrap">
                <select value={roundFilter} onChange={e => setRoundFilter(e.target.value)}
                    className="bg-hawks-card border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-hawks-gold">
                    <option value="all">All Rounds (Averaged)</option>
                    {matches.map(m => <option key={m.match_id} value={m.match_id}>{m.season ?? ''} {m.round_name} — {m.match_name}</option>)}
                </select>
                <select value={posFilter} onChange={e => setPosFilter(e.target.value)}
                    className="bg-hawks-card border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-hawks-gold">
                    <option value="all">All Positions</option>
                    {positions.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>
            <div className="overflow-x-auto rounded-xl border border-white/5">
                <table className="w-full text-xs">
                    <thead className="bg-hawks-card">
                        <tr>
                            <SortHeader label="Player" field="player" sortField={sortField} sortDir={sortDir} onSort={onSort} />
                            <SortHeader label="#" field="jersey" sortField={sortField} sortDir={sortDir} onSort={onSort} />
                            <SortHeader label="Pos" field="position" sortField={sortField} sortDir={sortDir} onSort={onSort} />
                            <SortHeader label={roundFilter === 'all' ? 'Games' : 'Round'} field="round_name" sortField={sortField} sortDir={sortDir} onSort={onSort} />
                            <SortHeader label="Dist (km)" field="km" sortField={sortField} sortDir={sortDir} onSort={onSort} />
                            <SortHeader label="Disp/km" field="disposals_per_km" sortField={sortField} sortDir={sortDir} onSort={onSort} />
                            <SortHeader label="Press/Sprint" field="pressure_acts_per_sprint" sortField={sortField} sortDir={sortDir} onSort={onSort} />
                            <SortHeader label="mGained/km" field="metres_gained_per_km_run" sortField={sortField} sortDir={sortDir} onSort={onSort} />
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((r: any, i) => (
                            <tr key={i} className="border-t border-white/5 hover:bg-white/5">
                                <td className="px-2 py-1.5 font-bold text-white">{r.player}</td>
                                <td className="px-2 py-1.5 text-gray-400">{r.jersey}</td>
                                <td className="px-2 py-1.5 text-gray-400">{r.position}</td>
                                <td className="px-2 py-1.5 text-gray-400">{r.round_name}</td>
                                <td className="px-2 py-1.5">{r.km?.toFixed(1) ?? '—'}</td>
                                <td className={`px-2 py-1.5 font-bold ${getQuartileColor(r.disposals_per_km, 'disposals_per_km')}`}>
                                    {r.disposals_per_km != null ? r.disposals_per_km.toFixed(1) : '—'}
                                </td>
                                <td className={`px-2 py-1.5 font-bold ${getQuartileColor(r.pressure_acts_per_sprint, 'pressure_acts_per_sprint')}`}>
                                    {r.pressure_acts_per_sprint != null ? r.pressure_acts_per_sprint.toFixed(2) : '—'}
                                </td>
                                <td className={`px-2 py-1.5 font-bold ${getQuartileColor(r.metres_gained_per_km_run, 'metres_gained_per_km_run')}`}>
                                    {r.metres_gained_per_km_run != null ? r.metres_gained_per_km_run.toFixed(0) : '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ── Tab 6: Position Group Comparison ────────────────────────
const PositionGroups = ({ matches, matchId, onMatchChange }: { matches: Match[]; matchId: string; onMatchChange: (id: string) => void }) => {
    const [data, setData] = useState<PlayerSummary[]>([]);

    useEffect(() => {
        if (!matchId) return;
        api.get(`/analytics/match/${matchId}/summary`).then(r => setData(r.data)).catch(() => setData([]));
    }, [matchId]);

    const metrics = [
        { key: 'gps.total_distance_m', label: 'Distance (km)', transform: (v: number) => v / 1000, decimals: 1 },
        { key: 'gps.total_hs_dist_m', label: 'HS Dist (m)', decimals: 0 },
        { key: 'gps.total_sprints', label: 'Sprints', decimals: 0 },
        { key: 'gps.total_player_load', label: 'Player Load', decimals: 0 },
        { key: 'gps.avg_m_per_min', label: 'm/min', decimals: 0 },
        { key: 'gps.total_hmld', label: 'HMLD', decimals: 0 },
        { key: 'match_stats.disposals', label: 'Disposals', decimals: 0 },
        { key: 'match_stats.tackles', label: 'Tackles', decimals: 0 },
        { key: 'match_stats.pressure_acts', label: 'Press Acts', decimals: 0 },
    ];

    const getVal = (row: PlayerSummary, key: string): number | null => {
        const parts = key.split('.');
        return parts.length === 2 ? (row as any)[parts[0]]?.[parts[1]] ?? null : null;
    };

    // Group by position
    const positions = useMemo(() => {
        const groups: Record<string, PlayerSummary[]> = {};
        data.forEach(p => {
            const pos = p.position || 'Unknown';
            if (!groups[pos]) groups[pos] = [];
            groups[pos].push(p);
        });
        return groups;
    }, [data]);

    // Calculate averages per position per metric
    const posAvgs = useMemo(() => {
        const avgs: Record<string, Record<string, number>> = {};
        Object.entries(positions).forEach(([pos, players]) => {
            avgs[pos] = {};
            metrics.forEach(m => {
                const vals = players.map(p => getVal(p, m.key)).filter((v): v is number => v != null);
                avgs[pos][m.key] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
            });
        });
        return avgs;
    }, [positions]);

    const posOrder = ['Midfielder', 'Back', 'Forward', 'Hybrid', 'Ruck'];
    const sortedPositions = Object.keys(positions).sort((a, b) => {
        const ai = posOrder.indexOf(a), bi = posOrder.indexOf(b);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    return (
        <div>
            <div className="mb-4"><MatchSelector matches={matches} selected={matchId} onChange={onMatchChange} /></div>

            {/* Position averages summary */}
            <div className="mb-6 overflow-x-auto rounded-xl border border-white/5">
                <table className="w-full text-xs">
                    <thead className="bg-hawks-card">
                        <tr>
                            <th className="px-2 py-2 text-left text-[10px] font-bold text-amber-300/70 uppercase">Position</th>
                            <th className="px-2 py-2 text-center text-[10px] font-bold text-amber-300/70 uppercase">Players</th>
                            {metrics.map(m => (
                                <th key={m.key} className="px-2 py-2 text-center text-[10px] font-bold text-amber-300/70 uppercase whitespace-nowrap">{m.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedPositions.map(pos => (
                            <tr key={pos} className="border-t border-white/5 hover:bg-white/5">
                                <td className="px-2 py-1.5 font-bold text-hawks-gold">{pos}</td>
                                <td className="px-2 py-1.5 text-center text-gray-400">{positions[pos].length}</td>
                                {metrics.map(m => {
                                    const avg = posAvgs[pos]?.[m.key] ?? 0;
                                    const display = m.transform ? m.transform(avg) : avg;
                                    return <td key={m.key} className="px-2 py-1.5 text-center text-white font-bold">{display.toFixed(m.decimals)}</td>;
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Individual players with comparison to position average */}
            {sortedPositions.map(pos => (
                <div key={pos} className="mb-6">
                    <h3 className="text-sm font-bold text-hawks-gold mb-2">{pos} ({positions[pos].length} players)</h3>
                    <div className="overflow-x-auto rounded-xl border border-white/5">
                        <table className="w-full text-xs">
                            <thead className="bg-hawks-card">
                                <tr>
                                    <th className="px-2 py-2 text-left text-[10px] font-bold text-amber-300/70 uppercase">Player</th>
                                    <th className="px-2 py-2 text-center text-[10px] font-bold text-amber-300/70 uppercase">#</th>
                                    {metrics.map(m => (
                                        <th key={m.key} className="px-2 py-2 text-center text-[10px] font-bold text-amber-300/70 uppercase whitespace-nowrap">{m.label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {positions[pos].sort((a, b) => (getVal(b, 'gps.total_distance_m') ?? 0) - (getVal(a, 'gps.total_distance_m') ?? 0)).map((p, i) => (
                                    <tr key={i} className="border-t border-white/5 hover:bg-white/5">
                                        <td className="px-2 py-1.5 font-bold text-white">{p.player}</td>
                                        <td className="px-2 py-1.5 text-center text-gray-400">{p.jersey}</td>
                                        {metrics.map(m => {
                                            const raw = getVal(p, m.key);
                                            const avg = posAvgs[pos]?.[m.key] ?? 0;
                                            const display = raw != null ? (m.transform ? m.transform(raw) : raw) : null;
                                            const pctDiff = raw != null && avg > 0 ? ((raw - avg) / avg) * 100 : null;
                                            const color = pctDiff != null ? (pctDiff > 10 ? 'text-emerald-400' : pctDiff < -10 ? 'text-red-400' : 'text-white') : 'text-gray-500';
                                            return (
                                                <td key={m.key} className="px-2 py-1.5 text-center">
                                                    <span className={`font-bold ${color}`}>{display != null ? display.toFixed(m.decimals) : '—'}</span>
                                                    {pctDiff != null && (
                                                        <div className={`text-[7px] ${pctDiff > 0 ? 'text-emerald-400/60' : 'text-red-400/60'}`}>
                                                            {pctDiff > 0 ? '+' : ''}{pctDiff.toFixed(0)}%
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>
    );
};

// ── Main Analytics Page ─────────────────────────────────────
const Analytics = () => {
    const [tab, setTab] = useState<Tab>('summary');
    const [matches, setMatches] = useState<Match[]>([]);
    const [season, setSeason] = useState<number | 'all'>('all');
    const [competition, setCompetition] = useState<Competition>('premiership');
    const [matchId, setMatchId] = useState('');

    useEffect(() => { api.get('/analytics/matches').then(r => setMatches(r.data)).catch(() => setMatches([])); }, []);

    // Only consider matches with GPS data (player_count > 0).
    const matchesWithData = useMemo(() => matches.filter(m => (m.player_count ?? 0) > 0), [matches]);

    // Competition classification (from cd_league_id in Champion Data):
    //   premiership: league_id=1 OR null (regular + finals). match_type distinguishes
    //                team-sheet variants ('initial' announced / 'exact' match-day) — both real.
    //   preseason:   league_id=2 (Community Series)
    const inCompetition = (m: Match, comp: Competition) => {
        if (comp === 'all') return true;
        if (comp === 'preseason') return m.league_id === 2;
        if (comp === 'premiership') return m.league_id !== 2;
        return false;
    };
    const matchesInCompetition = useMemo(
        () => matchesWithData.filter(m => inCompetition(m, competition)),
        [matchesWithData, competition]
    );

    // Seasons derived after competition filter so dropdown reflects available years
    const seasons = useMemo(() => {
        const s = [...new Set(matchesInCompetition.map(m => m.season).filter((v): v is number => v != null))].sort((a, b) => b - a);
        return s;
    }, [matchesInCompetition]);

    // Default to the most recent season once matches load; re-default when competition changes and current season drops out
    useEffect(() => {
        if (season !== 'all' && !seasons.includes(season as number) && seasons.length) setSeason(seasons[0]);
        else if (season === 'all' && seasons.length) setSeason(seasons[0]);
    }, [seasons]);

    const filteredMatches = useMemo(() => {
        if (season === 'all') return matchesInCompetition;
        return matchesInCompetition.filter(m => m.season === season);
    }, [matchesInCompetition, season]);

    // Keep matchId shared across tabs. Reset to the latest match when the filter
    // changes and the current match drops out of the list.
    useEffect(() => {
        if (!filteredMatches.length) return;
        if (!filteredMatches.find(m => m.match_id === matchId)) setMatchId(filteredMatches[0].match_id);
    }, [filteredMatches]);

    return (
        <div className="p-6 max-w-[1400px] mx-auto">
            <div className="flex items-baseline justify-between mb-6 flex-wrap gap-3">
                <h1 className="text-2xl font-black text-white">Match Analytics</h1>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-widest text-amber-300/60 font-bold">Competition</span>
                        <select value={competition} onChange={e => setCompetition(e.target.value as Competition)}
                            className="bg-hawks-card border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-hawks-gold">
                            <option value="premiership">Premiership</option>
                            <option value="preseason">Pre-season (Community Series)</option>
                            <option value="all">All</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-widest text-amber-300/60 font-bold">Season</span>
                        <select value={season} onChange={e => setSeason(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                            className="bg-hawks-card border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-hawks-gold">
                            <option value="all">All</option>
                            {seasons.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Tab bar */}
            <div className="flex gap-2 mb-6 flex-wrap">
                {TABS.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${tab === t.key
                            ? 'bg-hawks-gold text-hawks-base shadow-lg'
                            : 'bg-hawks-card text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
                        }`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Tab content — filteredMatches already scoped to current season & has GPS data.
                matchId is lifted up so switching tabs keeps the selected match. */}
            {tab === 'summary' && <TeamSummary matches={filteredMatches} matchId={matchId} onMatchChange={setMatchId} />}
            {tab === 'quarters' && <QuarterBreakdown matches={filteredMatches} matchId={matchId} onMatchChange={setMatchId} />}
            {tab === 'scatter' && <ScatterPlots matches={filteredMatches} matchId={matchId} onMatchChange={setMatchId} />}
            {tab === 'playermatch' && <PlayerMatchReview matches={filteredMatches} matchId={matchId} onMatchChange={setMatchId} />}
            {tab === 'oppreview' && <OppositionPlayerReview matches={filteredMatches} matchId={matchId} onMatchChange={setMatchId} />}
            {tab === 'player' && <PlayerRounds matches={filteredMatches} />}
            {tab === 'efficiency' && <EfficiencyTab matches={filteredMatches} />}
            {tab === 'position' && <PositionGroups matches={filteredMatches} matchId={matchId} onMatchChange={setMatchId} />}
        </div>
    );
};

export default Analytics;
