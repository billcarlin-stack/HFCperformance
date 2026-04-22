import { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { PositionFilter, matchesPositionFilter } from '../components/common/PositionFilter';
import type { PositionGroup } from '../components/common/PositionFilter';

type Tab = 'summary' | 'quarters' | 'scatter' | 'player' | 'efficiency' | 'position';

interface Match { match_id: string; match_name: string; match_date: string; round_name: string; round_number: string; venue_name: string; player_count: number; }
interface PlayerSummary { player: string; jersey: number; position: string; gps: Record<string, number | null>; match_stats: Record<string, number | null>; quarters: { period_name: string; [k: string]: any }[]; }
interface EfficiencyRow { player: string; match_id: string; match_name: string; match_date: string; round_name: string; jersey: number; position: string; total_distance_m: number; disposals: number; pressure_acts: number; total_sprints: number; metres_gained: number; disposals_per_km: number | null; pressure_acts_per_sprint: number | null; metres_gained_per_km_run: number | null; }

const TABS: { key: Tab; label: string }[] = [
    { key: 'summary', label: 'Team Physical Summary' },
    { key: 'quarters', label: 'Quarter Breakdown' },
    { key: 'scatter', label: 'Physical vs Impact' },
    { key: 'player', label: 'Player Rounds' },
    { key: 'efficiency', label: 'Efficiency' },
    { key: 'position', label: 'Position Groups' },
];

const fmt = (v: number | null | undefined, decimals = 1) => v != null ? v.toFixed(decimals) : '—';
const fmtKm = (m: number | null | undefined) => m != null ? (m / 1000).toFixed(1) : '—';
const fmtInt = (v: number | null | undefined) => v != null ? Math.round(v).toString() : '—';

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
            <option key={m.match_id} value={m.match_id}>{m.round_name} — {m.match_name} ({m.match_date?.slice(0, 10)})</option>
        ))}
    </select>
);

// ── Tab 1: Team Physical Summary ────────────────────────────
const TeamSummary = ({ matches, posFilter }: { matches: Match[]; posFilter: PositionGroup }) => {
    const [matchId, setMatchId] = useState('');
    const [data, setData] = useState<PlayerSummary[]>([]);
    const [sortField, setSortField] = useState('gps.total_distance_m');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    useEffect(() => { if (matches.length && !matchId) setMatchId(matches[0].match_id); }, [matches]);
    useEffect(() => {
        if (!matchId) return;
        api.get(`/analytics/match/${matchId}/summary`).then(r => setData(r.data)).catch(() => setData([]));
    }, [matchId]);

    const getVal = (row: PlayerSummary, field: string): number => {
        const parts = field.split('.');
        const val = parts.length === 2 ? (row as any)[parts[0]]?.[parts[1]] : (row as any)[field];
        return val ?? -Infinity;
    };

    const filtered = useMemo(() => data.filter(p => matchesPositionFilter(p.position, posFilter)), [data, posFilter]);
    const sorted = useMemo(() => [...filtered].sort((a, b) => {
        const av = getVal(a, sortField), bv = getVal(b, sortField);
        return sortDir === 'desc' ? bv - av : av - bv;
    }), [filtered, sortField, sortDir]);

    const onSort = (f: string) => { setSortField(f); setSortDir(prev => sortField === f ? (prev === 'desc' ? 'asc' : 'desc') : 'desc'); };

    return (
        <div>
            <div className="mb-4"><MatchSelector matches={matches} selected={matchId} onChange={setMatchId} /></div>
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
const QuarterBreakdown = ({ matches, posFilter }: { matches: Match[]; posFilter: PositionGroup }) => {
    const [matchId, setMatchId] = useState('');
    const [data, setData] = useState<PlayerSummary[]>([]);
    const [metric, setMetric] = useState<'gps_m_per_min' | 'gps_distance_m' | 'gps_player_load' | 'gps_sprints'>('gps_m_per_min');

    useEffect(() => { if (matches.length && !matchId) setMatchId(matches[0].match_id); }, [matches]);
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

    // Position filter + sort by total distance desc
    const filtered = useMemo(() => data.filter(p => matchesPositionFilter(p.position, posFilter)), [data, posFilter]);
    const sorted = useMemo(() => [...filtered].sort((a, b) => (b.gps.total_distance_m ?? 0) - (a.gps.total_distance_m ?? 0)), [filtered]);

    // Get max value for color scaling
    const allVals = sorted.flatMap(p => p.quarters.map(q => q[metric] ?? 0));
    const maxVal = Math.max(...allVals, 1);

    return (
        <div>
            <div className="mb-4 flex gap-3 items-center">
                <MatchSelector matches={matches} selected={matchId} onChange={setMatchId} />
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
const ScatterPlots = ({ matches, posFilter }: { matches: Match[]; posFilter: PositionGroup }) => {
    const [matchId, setMatchId] = useState('');
    const [data, setData] = useState<PlayerSummary[]>([]);
    const [hoveredPlayer, setHoveredPlayer] = useState<string | null>(null);

    useEffect(() => { if (matches.length && !matchId) setMatchId(matches[0].match_id); }, [matches]);
    useEffect(() => {
        if (!matchId) return;
        api.get(`/analytics/match/${matchId}/summary`).then(r => setData(r.data)).catch(() => setData([]));
    }, [matchId]);

    const filteredData = useMemo(() => data.filter(p => matchesPositionFilter(p.position, posFilter)), [data, posFilter]);

    const ScatterChart = ({ xKey, yKey, xLabel, yLabel, xTransform, title }: {
        xKey: string; yKey: string; xLabel: string; yLabel: string; xTransform?: (v: number) => number; title: string;
    }) => {
        const W = 400, H = 300, PAD = 50;
        const points = filteredData.map(p => {
            const xRaw = (p as any).gps?.[xKey] ?? (p as any).match_stats?.[xKey] ?? 0;
            const x = xTransform ? xTransform(xRaw) : xRaw;
            const y = (p as any).gps?.[yKey] ?? (p as any).match_stats?.[yKey] ?? 0;
            return { x, y, player: p.player, jersey: p.jersey };
        }).filter(p => p.x > 0 && p.y > 0);

        const xMax = Math.max(...points.map(p => p.x), 1);
        const yMax = Math.max(...points.map(p => p.y), 1);
        const scaleX = (v: number) => PAD + (v / xMax) * (W - PAD * 2);
        const scaleY = (v: number) => H - PAD - (v / yMax) * (H - PAD * 2);

        return (
            <div className="bg-hawks-card rounded-xl border border-white/5 p-4">
                <div className="text-xs font-bold text-hawks-gold mb-2">{title}</div>
                <svg width={W} height={H} className="w-full" viewBox={`0 0 ${W} ${H}`}>
                    {/* Axes */}
                    <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="rgba(255,255,255,0.1)" />
                    <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="rgba(255,255,255,0.1)" />
                    <text x={W / 2} y={H - 8} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={10}>{xLabel}</text>
                    <text x={12} y={H / 2} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={10} transform={`rotate(-90, 12, ${H / 2})`}>{yLabel}</text>
                    {/* Points */}
                    {points.map((p, i) => (
                        <g key={i} onMouseEnter={() => setHoveredPlayer(p.player)} onMouseLeave={() => setHoveredPlayer(null)}>
                            <circle cx={scaleX(p.x)} cy={scaleY(p.y)} r={hoveredPlayer === p.player ? 8 : 5}
                                fill={hoveredPlayer === p.player ? '#C8A951' : 'rgba(200, 169, 81, 0.6)'}
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
            <div className="mb-4"><MatchSelector matches={matches} selected={matchId} onChange={setMatchId} /></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ScatterChart xKey="total_distance_m" yKey="disposals" xLabel="Distance (km)" yLabel="Disposals"
                    xTransform={v => v / 1000} title="Distance vs Disposals" />
                <ScatterChart xKey="total_sprints" yKey="pressure_acts" xLabel="Sprints" yLabel="Pressure Acts"
                    title="Sprints vs Pressure Acts" />
                <ScatterChart xKey="total_distance_m" yKey="tackles" xLabel="Distance (km)" yLabel="Tackles"
                    xTransform={v => v / 1000} title="Distance vs Tackles" />
                <ScatterChart xKey="total_player_load" yKey="disposals" xLabel="Player Load" yLabel="Disposals"
                    title="Player Load vs Disposals" />
            </div>
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
                            {['Round', 'Opponent', 'Venue', 'Dist (km)', 'HS Dist', 'Sprints', 'Load', 'Max Vel', 'm/min', 'Disp', 'Kicks', 'Marks', 'Tackles', 'Press', 'Goals'].map(h => (
                                <th key={h} className="px-2 py-2 text-left text-[10px] font-bold text-amber-300/70 uppercase tracking-wider whitespace-nowrap">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((r, i) => (
                            <tr key={i} className="border-t border-white/5 hover:bg-white/5">
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
const EfficiencyTab = ({ matches, globalPosFilter }: { matches: Match[]; globalPosFilter: PositionGroup }) => {
    const [rawData, setRawData] = useState<EfficiencyRow[]>([]);
    const [roundFilter, setRoundFilter] = useState('all');
    const [posFilter, setPosFilter] = useState('all');
    const [sortField, setSortField] = useState('disposals_per_km');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    useEffect(() => { api.get('/analytics/efficiency').then(r => setRawData(r.data)).catch(() => setRawData([])); }, []);

    // Aggregate per player (or filter to single round)
    const aggregated = useMemo(() => {
        let filtered = rawData;
        // Apply the global position-group filter (Fwd/Mid/Back/Ruck) first
        if (globalPosFilter !== 'ALL') filtered = filtered.filter(r => matchesPositionFilter(r.position, globalPosFilter));
        // Then any granular per-tab position filter
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
    }, [rawData, roundFilter, posFilter, globalPosFilter]);

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
                    {matches.map(m => <option key={m.match_id} value={m.match_id}>{m.round_name} — {m.match_name}</option>)}
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
const PositionGroups = ({ matches }: { matches: Match[] }) => {
    const [matchId, setMatchId] = useState('');
    const [data, setData] = useState<PlayerSummary[]>([]);

    useEffect(() => { if (matches.length && !matchId) setMatchId(matches[0].match_id); }, [matches]);
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
            <div className="mb-4"><MatchSelector matches={matches} selected={matchId} onChange={setMatchId} /></div>

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
    const [posFilter, setPosFilter] = useState<PositionGroup>('ALL');

    useEffect(() => { api.get('/analytics/matches').then(r => setMatches(r.data)).catch(() => setMatches([])); }, []);

    return (
        <div className="p-6 max-w-[1400px] mx-auto">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <h1 className="text-2xl font-black text-white">Match Analytics</h1>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-amber-300/70 uppercase tracking-widest">Position</span>
                    <PositionFilter value={posFilter} onChange={setPosFilter} />
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

            {/* Tab content */}
            {tab === 'summary' && <TeamSummary matches={matches} posFilter={posFilter} />}
            {tab === 'quarters' && <QuarterBreakdown matches={matches} posFilter={posFilter} />}
            {tab === 'scatter' && <ScatterPlots matches={matches} posFilter={posFilter} />}
            {tab === 'player' && <PlayerRounds matches={matches} />}
            {tab === 'efficiency' && <EfficiencyTab matches={matches} globalPosFilter={posFilter} />}
            {tab === 'position' && <PositionGroups matches={matches} />}
        </div>
    );
};

export default Analytics;
