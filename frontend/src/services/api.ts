/*
  The Nest — API Service
  
  Centralized data fetching logic using Axios.
    Configured to connect to Flask backend.
*/

import axios from 'axios';

// Use relative /api so Vite proxy forwards requests to the Flask backend on port 8080
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://the-nest-api-114675580879.australia-southeast1.run.app/api';

// Create axios instance with default config
export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Add request interceptor to inject auth headers from session
api.interceptors.request.use((config) => {
    const stored = sessionStorage.getItem('hawk_hub_user');
    if (stored) {
        try {
            const user = JSON.parse(stored);
            if (user.role) {
                config.headers['X-User-Role'] = user.role;
            }
            if (user.jumper_no) {
                config.headers['X-Player-Id'] = user.jumper_no.toString();
            }
        } catch (e) {
            console.error('Failed to parse auth user for headers', e);
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
}

// AFL Fantasy player IDs mapped by Hawthorn jumper number
// Used to fetch official headshots from the AFL CDN
const HFC_PLAYER_PHOTO_IDS: Record<number, number> = {
    1: 1000,  // Harry Morrison — placeholder
    2: 1333,  // Mitchell Lewis
    3: 4712,  // Jai Newcombe
    4: 1082,  // Jarman Impey
    5: 1713,  // James Worpel
    6: 514,   // James Sicily
    7: 1822,  // Ned Reeves
    8: 1113,  // Sam Frost
    9: 2084,  // Changkuoth Jiath
    10: 801,   // Karl Amon
    12: 3726,  // Will Day
    13: 1595,  // Dylan Moore
    19: 2238,  // Jack Ginnivan
    21: 5592,  // Nick Watson
    22: 312,   // Luke Breust
    25: 4034,  // Josh Ward
    43: 500,   // Jack Gunston
};

export const formatPlayerImage = (id: number, url?: string, name?: string) => {
    // Use a provided URL first
    if (url && url.startsWith('http')) return url;

    // Try AFL CDN with known player ID
    const aflId = HFC_PLAYER_PHOTO_IDS[id];
    if (aflId) {
        return `https://s.afl.com.au/staticfile/AFL%20Tenant/AFL/Players/ChampIDImages/AFL/${aflId}.png`;
    }

    // Fallback: HFC-branded initials avatar (Brown background, Gold text)
    const displayName = name ? encodeURIComponent(name) : `Player+${id}`;
    return `https://ui-avatars.com/api/?name=${displayName}&background=4D2004&color=F6B000&size=200&length=2&font-size=0.4`;
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

    // Ratings
    getRatings: async (playerId: number | string) => {
        const response = await api.get<RatingResponse>(`/ratings/${playerId}`);
        return response.data;
    },
    submitRating: async (data: any) => {
        const response = await api.post('/ratings', data);
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
    updateTeamSelection: async (posId: string, playerId: number | null, notes: string) => {
        const response = await api.post('/team/builder', {
            position_id: posId,
            player_id: playerId,
            notes: notes
        });
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
    getFitnessSession: async (playerId: number | string) => {
        const response = await api.get<{ session: FitnessSession | null }>(`/v1/fitness/session/${playerId}`);
        return response.data;
    },
    getFitnessPbs: async (playerId: number | string) => {
        const response = await api.get<{ pbs: FitnessPBs | null }>(`/v1/fitness/pbs/${playerId}`);
        return response.data;
    }
};

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
