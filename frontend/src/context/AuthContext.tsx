import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import axios from 'axios';

export interface AuthUser {
    role: 'coach' | 'player';
    name: string;
    jumper_no: number | null;
    initials: string;
}

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    error: string | null;
    login: (pin: string) => Promise<boolean>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_KEY = 'shinboner_hub_user';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Restore session on mount
    useEffect(() => {
        const stored = sessionStorage.getItem(SESSION_KEY);
        if (stored) {
            try {
                setUser(JSON.parse(stored));
            } catch {
                sessionStorage.removeItem(SESSION_KEY);
            }
        }
        setLoading(false);
    }, []);

    const login = async (pin: string): Promise<boolean> => {
        setError(null);
        setLoading(true);
        try {
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const resp = await axios.post(`${API_BASE_URL}/auth/login`, { pin });
            const userData: AuthUser = resp.data;
            setUser(userData);
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(userData));
            setLoading(false);
            return true;
        } catch (err: any) {
            const msg = err.response?.data?.error || 'Invalid PIN. Try again.';
            setError(msg);
            setLoading(false);
            return false;
        }
    };

    const logout = () => {
        setUser(null);
        sessionStorage.removeItem(SESSION_KEY);
    };

    return (
        <AuthContext.Provider value={{ user, loading, error, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
