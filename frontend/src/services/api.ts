/*
  The Nest — API Service
  
  Centralized data fetching logic using Axios.
  Configured to connect to Flask backend.
*/

import axios from 'axios';
import { auth } from './firebase';

// Use relative /api so Vite proxy forwards requests to the Flask backend on port 8080
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://the-nest-api-114675580879.australia-southeast1.run.app/api';

// Create axios instance with default config
export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Add request interceptor to inject auth headers from both Google and PIN session
api.interceptors.request.use(async (config) => {
    // 1. Google Auth Layer (Bearer Token)
    const currentUser = auth.currentUser;
    if (currentUser) {
        try {
            const idToken = await currentUser.getIdToken();
            config.headers['Authorization'] = `Bearer ${idToken}`;
        } catch (e) {
            console.error('Failed to get Firebase ID token', e);
        }
    }

    // 2. Impersonation Layer (X-Impersonate- headers)
    const impersonateSession = sessionStorage.getItem('hawk_hub_impersonate');
    if (impersonateSession) {
        try {
            const imp = JSON.parse(impersonateSession);
            if (imp.role) {
                config.headers['X-Impersonate-Role'] = imp.role;
            }
            if (imp.player_id !== undefined && imp.player_id !== null) {
                config.headers['X-Impersonate-Player-Id'] = imp.player_id.toString();
            } else {
                config.headers['X-Impersonate-Player-Id'] = 'null';
            }
        } catch (e) {
            console.error('Failed to parse impersonation headers', e);
        }
    }

    return config;
});

// Types for our data models
export interface Player {
    jumper_no: number;
    name: string;
    position: string;
    age: number;
    games: number;
    height_cm?: number;
    weight_kg?: number;
    originally_from?: string;
    photo_url?: string;
    description?: {
        weapon: string;
        craft: string;
        pyramid: string;
        mental: string;
    };
    status: 'Green' | 'Amber' | 'Red';
    readiness?: {
        score: number;
        label: string;
    };
    form_trend?: 'rising' | 'falling' | 'stable';
    analytics?: {
        rolling_averages: {
            rolling_7: { sleep: number[], soreness: number[], stress: number[], dates: string[] };
            rolling_28: { sleep: number[], soreness: number[], stress: number[], dates: string[] };
        };
        anomalies: Array<{
            date: string;
            metric: string;
            value: number;
            deviation_sd: number;
            severity: string;
        }>;
    };
    idp?: {
        grit: number;
        tactical_iq: number;
        execution: number;
        resilience: number;
        leadership: number;
        composite_score: number;
    };
}

export interface TeamInsights {
    daily_averages: Record<string, { sleep: number; soreness: number; stress: number; count: number }>;
    insights: string[];
    fitness_stats: {
        avg_top_speed: number;
        avg_distance: number;
        avg_load: number;
        count: number;
    };
}

export interface Injury {
    id: string;
    player_id: number;
    player_name?: string;
    injury_type: string;
    body_area: string;
    severity: 'Minor' | 'Moderate' | 'Major';
    contact_load: number;
    status: 'Active' | 'Recovering' | 'Cleared';
    notes: string;
    date: string;
}

export interface CoachRating {
    skill: string;
    category: string;
    coach_rating: number;
    self_rating: number;
    squad_avg: number;
    gap: number;
}

export interface AggregatedRating {
    category: string;
    coach: number;
    self: number;
    squad: number;
}

export interface RatingResponse {
    ratings: CoachRating[];
    aggregated: AggregatedRating[];
}

export interface TeamMatrixResponse {
    players: { id: number; name: string }[];
    skills: string[];
    matrix: Record<number, Record<string, { coach: number; self: number }>>;
}

export interface YearlyMatrixResponse {
    rounds: string[];
    skills: string[];
    matrix: Record<string, Record<string, { coach: number; self: number }>>;
}

export interface FitnessSession {
    session_date: string;
    session_type: string;
    top_speed_kmh: number;
    distance_km: number;
    hsd_m: number;
    hr_avg_bpm: number;
    hr_max_bpm: number;
    total_load: number;
    sprints: number;
    accelerations: number;
    decelerations: number;
    is_live: boolean;
}

export interface FitnessPBs {
    run_2k_seconds: number;
    bench_press_kg: number;
    squat_kg: number;
    vertical_jump_cm: number;
    beep_test_level: number;
    top_speed_kmh: number;
    sprint_10m_s: number;
    sprint_40m_s: number;
    date_recorded: string;
}

export interface PlayerStats {
    jumper_no: number;
    name: string;
    position: string;
    games_played: number;
    af_avg: number;
    rating_points: number;
    goals_avg: number;
    disposals_avg: number;
    marks_avg: number;
    tackles_avg: number;
    clearances_avg: number;
    kicks_avg: number;
    handballs_avg: number;
    hitouts_avg: number;
}

export interface TeamPosition {
    position_id: string;
    player_id: number | null;
    notes: string;
    rotation_color?: string;
    rotation_minutes?: number;
    x?: number; // 0-100 percentage on field
    y?: number; // 0-100 percentage on field
    label?: string; // optional position label (e.g. "FB")
}

export interface SavedSquad {
    id: number;
    name: string;
    data: string;
    created_at: string;
    round_name?: string;
}

export interface TeamVersion {
    id: number;
    round_id: number;
    round_name: string;
    name: string;
    data: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Season {
    id: number;
    name: string;
    is_current: boolean;
}

export interface Round {
    id: number;
    season_id: number;
    name: string;
    short_name: string;
    match_date: string | null;
    end_date: string | null;
    sort_order: number;
    opponent: string | null;
    venue: string | null;
    is_home: boolean | null;
}

export interface SeasonData {
    season: Season;
    rounds: Round[];
    current_round: Round | null;
}


export interface SquadAggregates {
    average_age: number;
    total_games: number;
    projected_metres_gained: number;
    projected_clearances: number;
}

export interface PlayerComparisonStats {
    contested_possessions: number;
    metres_gained: number;
    clearances: number;
    score_involvements: number;
    tackles: number;
}

export interface PlayerComparisonResponse {
    players: Record<string, PlayerComparisonStats>;
    opponent_context: string;
}

export const formatPlayerImage = (id: number, url?: string, name?: string) => {
    // Use the photo_url from the database (set by update_player_photos_afl.py)
    if (url && url.startsWith('http')) return url;

    // Fallback: dark-themed initials avatar
    const displayName = name ? encodeURIComponent(name) : `Player+${id}`;
    return `https://ui-avatars.com/api/?name=${displayName}&background=221C16&color=C8A951&size=200&length=2&font-size=0.4`;
};

export const getMockProfile = (id: number) => ({
    height_cm: 180 + (id % 15),
    weight_kg: 80 + (id % 10),
    originally_from: ['VIC Metro', 'WA', 'SA', 'VIC Country', 'TAS'][id % 5],
    description: {
        weapon: ['Elite Kicking', 'Intercept Marking', 'Contested Beast', 'Goal Sense'][id % 4],
        craft: ['Clearance work', 'One-on-one defending', 'Score assist', 'Running patterns'][id % 4],
        pyramid: 'Team-first leader',
        mental: 'Composure under pressure'
    }
});

export const getMatchRatings = (id: number) => {
    // Generate 15 rounds of ratings
    return Array.from({ length: 15 }, (_, i) => ({
        round: `R${i + 1}`,
        rating: Math.floor(((id + i) * 7) % 5) + 1, // Deterministic pseudo-random based on ID
        avg: 3.2 // static avg
    }));
};

export const ApiService = {
    // Players
    getPlayers: async () => {
        const response = await api.get<Player[]>('/players');
        return response.data.map(p => ({ ...p, ...getMockProfile(p.jumper_no) }));
    },

    getPlayer: async (id: number | string) => {
        const response = await api.get<Player>(`/players/${id}`);
        return { ...response.data, ...getMockProfile(Number(id)) };
    },

    comparePlayers: async (ids: number[]) => {
        const response = await api.get<{ players: Player[] }>(`/players/compare?ids=${ids.join(',')}`);
        return response.data.players;
    },

    // Insights
    getTeamInsights: async () => {
        const response = await api.get<TeamInsights>('/insights/team');
        return response.data;
    },

    // Wellbeing
    submitSurvey: async (data: { player_id: number; sleep: number; soreness: number; stress: number; notes: string }) => {
        const payload = {
            player_id: data.player_id,
            sleep_score: data.sleep,
            soreness_score: data.soreness,
            stress_score: data.stress,
            notes: data.notes
        };
        const response = await api.post('/wellbeing', payload);
        return response.data;
    },

    // Injuries
    getInjuries: async () => {
        const response = await api.get<Injury[]>('/injuries');
        return response.data;
    },
    logInjury: async (data: Partial<Injury>) => {
        const response = await api.post('/injuries', data);
        return response.data;
    },
    updateInjury: async (id: string, data: Partial<Injury>) => {
        const response = await api.put(`/injuries/${id}`, data);
        return response.data;
    },

    // Ratings
    getRatings: async (playerId: number | string, roundId?: number) => {
        const params: any = {};
        if (roundId) params.round_id = roundId;
        const response = await api.get<RatingResponse>(`/ratings/${playerId}`, { params });
        return response.data;
    },
    submitRating: async (data: any) => {
        const response = await api.post('/ratings', data);
        return response.data;
    },

    getTeamMatrix: async (category?: string, roundId?: number) => {
        const params: any = {};
        if (category) params.category = category;
        if (roundId) params.round_id = roundId;
        const response = await api.get<TeamMatrixResponse>('/ratings/matrix/team', { params });
        return response.data;
    },

    getYearlyMatrix: async (playerId: number | string, category?: string) => {
        const params: any = {};
        if (category) params.category = category;
        const response = await api.get<YearlyMatrixResponse>(`/ratings/matrix/yearly/${playerId}`, { params });
        return response.data;
    },

    // Stats
    getStats2025: async (params?: { jumper_no?: number }) => {
        const response = await api.get<PlayerStats[]>('/stats/2025', { params });
        return response.data;
    },

    // Team Builder
    getTeamBuilder: async () => {
        const response = await api.get<TeamPosition[]>('/team/builder');
        return response.data;
    },
    updateTeamSelection: async (posId: string, playerId: number | null, notes: string, rotationColor?: string, rotationMinutes?: number) => {
        const response = await api.post('/team/builder', {
            position_id: posId,
            player_id: playerId,
            notes: notes,
            rotation_color: rotationColor,
            rotation_minutes: rotationMinutes
        });
        return response.data;
    },
    getSavedSquads: async (round?: string) => {
        const params = round ? { round } : {};
        const response = await api.get<SavedSquad[]>('/team/saved', { params });
        return response.data;
    },
    saveSquad: async (name: string, roundName?: string) => {
        const response = await api.post('/team/saved', { name, round_name: roundName });
        return response.data;
    },
    loadSquad: async (squadId: number) => {
        const response = await api.post(`/team/saved/${squadId}/load`);
        return response.data;
    },

    // Rounds & Season
    getSeasons: async () => {
        const response = await api.get<Season[]>('/rounds/seasons');
        return response.data;
    },
    getCurrentSeason: async () => {
        const response = await api.get<SeasonData>('/rounds/current-season');
        return response.data;
    },
    getSeasonRounds: async (seasonId: number) => {
        const response = await api.get<Round[]>(`/rounds/seasons/${seasonId}/rounds`);
        return response.data;
    },

    // Team Versions
    getVersions: async (roundId: number) => {
        const response = await api.get<TeamVersion[]>('/team/versions', { params: { round_id: roundId } });
        return response.data;
    },
    createVersion: async (roundId: number, name: string, data?: string) => {
        const response = await api.post<TeamVersion>('/team/versions', { round_id: roundId, name, data });
        return response.data;
    },
    activateVersion: async (versionId: number) => {
        const response = await api.post<TeamVersion>(`/team/versions/${versionId}/activate`);
        return response.data;
    },
    saveVersionData: async (versionId: number, data: string) => {
        const response = await api.put(`/team/versions/${versionId}/data`, { data });
        return response.data;
    },
    renameVersion: async (versionId: number, name: string) => {
        const response = await api.put<TeamVersion>(`/team/versions/${versionId}/rename`, { name });
        return response.data;
    },
    duplicateVersion: async (versionId: number, name?: string) => {
        const response = await api.post<TeamVersion>(`/team/versions/${versionId}/duplicate`, { name });
        return response.data;
    },
    copyVersionToRound: async (versionId: number, targetRoundId: number, name?: string) => {
        const response = await api.post<TeamVersion>(`/team/versions/${versionId}/copy-to-round`, { target_round_id: targetRoundId, name });
        return response.data;
    },
    deleteVersion: async (versionId: number) => {
        const response = await api.delete(`/team/versions/${versionId}`);
        return response.data;
    },
    getOpponentHistory: async (team: string, limit: number = 3) => {
        const response = await api.get('/team/opponent-history', { params: { team, limit } });
        return response.data;
    },
    getOpponentPlayers: async (team: string) => {
        const response = await api.get<{ name: string; jumper_no: number; position: string; photo_url: string }[]>('/team/opponent-players', { params: { team } });
        return response.data;
    },

    getSquadAggregates: async (playerIds: number[]) => {
        const response = await api.post<SquadAggregates>('/squad-builder/aggregates', { player_ids: playerIds });
        return response.data;
    },
    compareSquadPlayers: async (p1: number, p2: number, opponent?: string) => {
        const url = `/squad-builder/compare?p1=${p1}&p2=${p2}${opponent ? `&opponent=${opponent}` : ''}`;
        const response = await api.get<PlayerComparisonResponse>(url);
        return response.data;
    },

    async askAI(question: string) {
        // Fix: backend route is /api/ai/ask, and we have a prefix /api in the instance
        const response = await api.post('/ai/ask', { question });
        return response.data;
    },

    // WOOP Goals
    getWoopGoals: async (playerId: number) => {
        const response = await api.get(`/woop/${playerId}`);
        return response.data;
    },
    createWoopGoal: async (data: { player_id: number; wish: string; outcome: string; obstacle: string; plan: string }) => {
        const response = await api.post('/woop', data);
        return response.data;
    },
    updateWoopGoal: async (goalId: string, status: string) => {
        const response = await api.patch(`/woop/${goalId}`, { status });
        return response.data;
    },

    // Calendar
    getCalendarEvents: async (params?: { start_date?: string; end_date?: string; player_id?: number }) => {
        const response = await api.get('/calendar', { params });
        return response.data;
    },
    createCalendarEvent: async (data: {
        title: string;
        type: string;
        description?: string;
        start_time: string;
        end_time: string;
        player_ids?: number[]
    }) => {
        const response = await api.post('/calendar', data);
        return response.data;
    },
    deleteCalendarEvent: async (id: string) => {
        const response = await api.delete(`/calendar/${id}`);
        return response.data;
    },

    // Wellbeing
    getWellbeing: async (jumperNo: number | string, limit: number = 30) => {
        const response = await api.get<WellbeingSurvey[]>(`/wellbeing/${jumperNo}`, { params: { limit } });
        return response.data;
    },
    getWellbeingAlerts: async (limit: number = 10) => {
        const response = await api.get<WellbeingSurvey[]>(`/wellbeing/alerts`, { params: { limit } });
        return response.data;
    },

    // Fitness
    getFitnessSession: async (playerId: number | string, phases?: string[]) => {
        let url = `/v1/fitness/session/${playerId}`;
        if (phases && phases.length > 0) {
            url += `?phases=${phases.join(',')}`;
        }
        const response = await api.get<{ session: FitnessSession | null }>(url);
        return response.data;
    },
    getFitnessPbs: async (playerId: number | string) => {
        const response = await api.get<{ pbs: FitnessPBs | null }>(`/v1/fitness/pbs/${playerId}`);
        return response.data;
    },

    // Engagement
    getEngagement: async (playerId: number | string) => {
        const response = await api.get<{ engagement: PlayerEngagement | null }>(`/engagement/${playerId}`);
        return response.data;
    },

    // Box Hill Players (VFL-listed only)
    getBoxHillPlayers: async () => {
        const response = await api.get<BoxHillPlayer[]>('/players/box-hill');
        return response.data;
    },

    // ── Champion Data Analytics (GPS + match stats) ─────────────────────────
    getAnalyticsMatches: async () => {
        const response = await api.get<AnalyticsMatch[]>('/analytics/matches');
        return response.data;
    },
    getMatchSummary: async (matchId: string) => {
        const response = await api.get<AnalyticsPlayerSummary[]>(`/analytics/match/${matchId}/summary`);
        return response.data;
    },
    getPlayerRounds: async (playerName: string) => {
        const response = await api.get<AnalyticsPlayerRoundRow[]>(`/analytics/player/${encodeURIComponent(playerName)}/rounds`);
        return response.data;
    },
    getSeasonAverages: async () => {
        const response = await api.get<any[]>('/analytics/season-averages');
        return response.data;
    },
};

// ── Box Hill type ────────────────────────────────────────────────────────────
export interface BoxHillPlayer {
    jumper_no: number;
    name: string;
    dob: string | null;
    age: number | null;
    height_cm: number | null;
    position: string;
    community_club: string | null;
    sponsor: string | null;
    leadership_role: string | null;
    photo_url: string | null;
    listing_note: string | null;
    status: 'Green' | 'Amber' | 'Red';
    games: number;
}

// ── Analytics types ─────────────────────────────────────────────────────────
export interface AnalyticsMatch {
    match_id: string;
    match_name: string;
    match_date: string;
    round_name: string;
    round_number: string;
    venue_name: string;
    player_count: number;
}

export interface AnalyticsGpsAgg {
    total_distance_m: number | null;
    total_hs_dist_m: number | null;
    total_sprints: number | null;
    total_player_load: number | null;
    max_vel: number | null;
    avg_m_per_min: number | null;
    hr_avg: number | null;
    hr_max: number | null;
    total_accels: number | null;
    total_decels: number | null;
    total_hmld: number | null;
    total_field_min: number | null;
}

export interface AnalyticsMatchStats {
    disposals: number | null;
    kicks: number | null;
    handballs: number | null;
    marks: number | null;
    tackles: number | null;
    clearances: number | null;
    free_kicks: number | null;
    pressure_acts: number | null;
    inside_50s: number | null;
    rebound_50s: number | null;
    metres_gained: number | null;
    turnovers: number | null;
    goals: number | null;
    behinds: number | null;
    time_on_ground: number | null;
}

export interface AnalyticsPlayerSummary {
    player: string;
    jersey: number;
    position: string;
    gps: AnalyticsGpsAgg;
    match_stats: AnalyticsMatchStats;
    quarters: Array<{ period_name: string; [k: string]: any }>;
}

export interface AnalyticsPlayerRoundRow {
    match_id: string;
    match_name: string;
    match_date: string;
    round_name: string;
    round_number: string;
    venue_name: string;
    gps: AnalyticsGpsAgg;
    match_stats: AnalyticsMatchStats;
}

export interface WellbeingSurvey {
    player_id: number;
    player_name?: string;
    sleep_score: number;
    soreness_score: number;
    stress_score: number;
    notes: string;
    submitted_at: string;
    readiness?: number;
}

export interface PlayerEngagement {
    jumper_no: number;
    listing?: string;
    dob?: string;
    state?: string;
    has_children?: boolean;
    program?: string;
    area_of_schooling?: string;
    education_study?: string;
    university?: string;
    study_monday?: boolean;
    study_wednesday?: boolean;
    study_thursday?: boolean;
    certificate_1?: string;
    certificate_2?: string;
    body_load_tier?: number;
    body_goal?: string;
    community_engaged?: boolean;
    engagement_notes?: string;
}
