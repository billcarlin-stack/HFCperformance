/*
  The Hawk Hub — Sidebar Navigation

  Persistent left-hand navigation with Hawthorn FC branding.
  Role-aware: coaches see all nav items, players only see permitted ones.
*/

import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Activity, Target, BarChart2, ClipboardList, LogOut, ClipboardCheck, Sparkles, UserCircle, MessageSquareCode, Shield, Sword, ChevronDown, TrendingUp, Star } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';

import hfcLogo from '../../assets/hfc-logo.png';

const NavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            clsx(
                "group flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 font-bold text-sm relative",
                isActive
                    ? "bg-white/10 text-white shadow-inner"
                    : "text-amber-100/60 hover:bg-white/5 hover:text-white"
            )
        }
    >
        {({ isActive }) => (
            <>
                <Icon size={18} className={clsx("transition-transform duration-500 group-hover:scale-110", isActive ? "text-hawks-gold" : "text-amber-300/60 group-hover:text-white")} />
                <span className="tracking-tight">{label}</span>
                {isActive && (
                    <div className="absolute left-0 w-1 h-6 bg-hawks-gold rounded-r-full shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                )}
            </>
        )}
    </NavLink>
);

export const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const isCoach = user?.role === 'coach' || user?.role === 'admin';
    const [analyticsOpen, setAnalyticsOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <div className="w-64 h-screen bg-hawks-card border-r border-white/5 flex flex-col text-white fixed left-0 top-0 shadow-2xl z-50">
            {/* Brand Header */}
            <div className="p-8 flex items-center gap-4">
                <div className="bg-white rounded-2xl p-1.5 h-12 w-12 flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-500">
                    <img src={hfcLogo} alt="HFC Logo" className="h-10 w-auto" />
                </div>
                <div>
                    <h1 className="font-black text-xl leading-none tracking-tight uppercase font-outfit">The Nest</h1>
                </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto custom-scrollbar">
                {isCoach && <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />}

                {/* Player-specific items */}
                {!isCoach && user?.jumper_no && (
                    <NavItem to={`/players/${user.jumper_no}`} icon={UserCircle} label="My Profile" />
                )}

                {isCoach && (
                    <NavItem to="/players" icon={Users} label="Players & Squad" />
                )}
                <NavItem to="/hawk-ai" icon={MessageSquareCode} label="Hawk AI Agent" />

                {isCoach && (
                    <NavItem to="/stats" icon={BarChart2} label="Stats Hub" />
                )}

                <NavItem to="/injuries" icon={Activity} label="Injury Log" />
                {/* <NavItem to="/calendar" icon={Calendar} label="Squad Calendar" /> */}

                {/* Player-only items */}
                {user?.role === 'player' && (
                    <>
                        <NavItem to="/checkin" icon={ClipboardCheck} label="Daily Check-In" />
                        <NavItem to="/woop" icon={Sparkles} label="WOOP Goals" />
                        <NavItem to="/ratings/my-game" icon={Star} label="Rate My Game" />
                    </>
                )}

                {/* Ratings — visible to both coaches and players */}
                <NavItem to="/ratings/player-review" icon={Target} label="Player Review" />

                {/* Coach-only items */}
                {isCoach && (
                    <>
                        <NavItem to="/match-center/previews" icon={Target} label="Opposition Previews" />
                        {/* <NavItem to="/match-center/timeline" icon={Activity} label="Event Timeline" /> */}
                        <NavItem to="/match-center/comparison" icon={Sword} label="Player Comparison" />
                        <NavItem to="/team-builder" icon={ClipboardList} label="Team Builder" />
                        <NavItem to="/ratings/input" icon={ClipboardCheck} label="IDP Assessment (6-8 wks)" />
                        <NavItem to="/ratings/game-entry" icon={Star} label="Game Ratings (1-5)" />
                        <NavItem to="/ratings/compare" icon={BarChart2} label="Post Match Review" />
                    </>
                )}

                {/* Analytics — collapsible */}
                {isCoach && (
                    <div>
                        <button onClick={() => setAnalyticsOpen(!analyticsOpen)}
                            className="group flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 font-bold text-sm w-full text-amber-100/60 hover:bg-white/5 hover:text-white">
                            <TrendingUp size={18} className="text-amber-300/60 group-hover:text-white transition-transform duration-500" />
                            <span className="tracking-tight flex-1 text-left">Analytics</span>
                            <ChevronDown size={14} className={`transition-transform duration-300 ${analyticsOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {analyticsOpen && (
                            <div className="ml-4 space-y-1 mt-1">
                                <NavItem to="/analytics/debrief" icon={Sparkles} label="AI Match Debrief" />
                                <NavItem to="/analytics" icon={BarChart2} label="Match Analytics" />
                            </div>
                        )}
                    </div>
                )}

                {/* Admin-only items */}
                {user?.is_admin && (
                    <NavItem to="/admin/settings" icon={Shield} label="Access Control" />
                )}
            </nav>

            {/* Footer / User Profile */}
            <div className="p-6">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm group hover:bg-white/10 transition-colors duration-300">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-hawks-gold to-amber-600 text-hfc-brown flex items-center justify-center font-black text-xs shadow-lg">
                        {user?.initials || '??'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white group-hover:text-hawks-gold transition-colors truncate">{user?.name || 'Guest'}</p>
                        <p className="text-[10px] text-amber-300 font-medium capitalize">{user?.role || 'Unknown'}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        title="Logout"
                        className="text-amber-400 cursor-pointer hover:text-red-400 hover:rotate-12 transition-all duration-300"
                    >
                        <LogOut size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};
