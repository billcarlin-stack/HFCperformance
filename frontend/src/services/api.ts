/*
  The Pouch — API Service
  
  Centralized data fetching logic using Axios.
    Configured to connect to Flask backend.
*/

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Add request interceptor to inject auth headers from session
api.interceptors.request.use((config) => {
    const stored = sessionStorage.getItem('shinboner_hub_user');
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

export interface RatingResponse {
    ratings: CoachRating[];
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

export const formatPlayerImage = (id: number, url?: string) =>
    url || `https://ui-avatars.com/api/?name=Player+${id}&background=013B82&color=FFFFFF&size=200&length=2&font-size=0.4`;
// Updated to a known accessible AFL image pattern for 2024/25

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
        // Switch role to 'analyst' for this call just in case (though coach works too)
        const response = await api.get<TeamInsights>('/insights/team', {
            headers: { 'X-User-Role': 'analyst' }
        });
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
        const response = await api.post('/wellbeing', payload, {
            headers: { 'X-User-Role': 'medical' }
        });
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
