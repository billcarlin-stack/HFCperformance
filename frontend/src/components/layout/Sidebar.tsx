/*
  The Hawk Hub — Sidebar Navigation

  Persistent left-hand navigation with Hawthorn FC branding.
  Role-aware: coaches see all nav items, players only see permitted ones.
*/

import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Activity, Target, BarChart2, ClipboardList, LogOut, ClipboardCheck, Sparkles, UserCircle, Calendar, MessageSquareCode } from 'lucide-react';
import { clsx } from 'clsx';
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
                <Icon size={18} className={clsx("transition-transform duration-500 group-hover:scale-110", isActive ? "text-gold-400" : "text-amber-300/60 group-hover:text-white")} />
                <span className="tracking-tight">{label}</span>
                {isActive && (
                    <div className="absolute left-0 w-1 h-6 bg-gold-400 rounded-r-full shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                )}
            </>
        )}
    </NavLink>
);

export const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const isCoach = user?.role === 'coach';

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="w-64 h-screen bg-hfc-brown border-r border-white/5 flex flex-col text-white fixed left-0 top-0 shadow-2xl z-50">
            {/* Brand Header */}
            <div className="p-8 flex items-center gap-4">
                <div className="bg-white rounded-2xl p-1.5 h-12 w-12 flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-500">
                    <img src={hfcLogo} alt="HFC Logo" className="h-10 w-auto" />
                </div>
                <div>
                    <h1 className="font-black text-xl leading-none tracking-tight uppercase font-outfit">The Nest</h1>
                    <p className="text-[10px] text-amber-300 font-bold uppercase tracking-widest mt-1">Analytics Engine</p>
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

                {/* Shared items */}
                <div className="pt-8 pb-3 px-4 text-[10px] font-black text-amber-300/40 uppercase tracking-[0.2em]">
                    High Performance
                </div>

                {isCoach && (
                    <NavItem to="/stats" icon={BarChart2} label="Stats Hub" />
                )}

                <NavItem to="/injuries" icon={Activity} label="Injury Log" />
                <NavItem to="/calendar" icon={Calendar} label="Squad Calendar" />

                {/* Player-only items */}
                {!isCoach && (
                    <>
                        <NavItem to="/checkin" icon={ClipboardCheck} label="Daily Check-In" />
                        <NavItem to="/woop" icon={Sparkles} label="WOOP Goals" />
                    </>
                )}

                {/* Coach-only items */}
                {isCoach && (
                    <>
                        <div className="pt-8 pb-3 px-4 text-[10px] font-black text-amber-300/40 uppercase tracking-[0.2em]">
                            Coaching
                        </div>
                        <NavItem to="/team-builder" icon={ClipboardList} label="Team Builder" />
                        <NavItem to="/ratings/input" icon={Target} label="Coach Ratings" />
                        <NavItem to="/ratings/compare" icon={Users} label="Rating Comparison" />
                    </>
                )}
            </nav>

            {/* Footer / User Profile */}
            <div className="p-6">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm group hover:bg-white/10 transition-colors duration-300">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gold-400 to-amber-600 text-hfc-brown flex items-center justify-center font-black text-xs shadow-lg">
                        {user?.initials || '??'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white group-hover:text-gold-400 transition-colors truncate">{user?.name || 'Guest'}</p>
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
