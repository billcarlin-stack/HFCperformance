import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { PlayersList } from './pages/PlayersList';
import { PlayerDetail } from './pages/PlayerDetail';
import { InjuryDashboard } from './pages/InjuryDashboard';
import { CoachRatings } from './pages/CoachRatings';
import { RatingComparison } from './pages/RatingComparison';
import StatsPage from './pages/StatsPage';
import TeamBuilder from './pages/TeamBuilder';
import WoopGoals from './pages/WoopGoals';
import DailyCheckIn from './pages/DailyCheckIn';
import CalendarPage from './pages/CalendarPage';
import HawkAiPage from './pages/HawkAiPage';
import OppositionPreviews from './pages/OppositionPreviews';
import EventTimeline from './pages/EventTimeline';
import PlayerComparison from './pages/MatchCenter/PlayerComparison';
import AdminSettings from './pages/AdminSettings';
import { PlayerReview } from './pages/PlayerReview';
import Analytics from './pages/Analytics';
import MatchDebrief from './pages/MatchDebrief';




/**
 * Route guard: only renders children if user has the required role.
 * Players trying to access coach-only routes get redirected to /.
 */
const CoachOnly = ({ children }: { children: React.ReactElement }) => {
  const { user } = useAuth();
  if (user?.role !== 'coach' && user?.role !== 'admin') return <Navigate to="/" replace />;
  return children;
};

/**
 * Route guard: only renders children if user is a player.
 */
const PlayerOnly = ({ children }: { children: React.ReactElement }) => {
  const { user } = useAuth();
  if (user?.role !== 'player') return <Navigate to="/" replace />;
  return children;
};

/**
 * Route guard: only renders children if user is an admin.
 */
const AdminOnly = ({ children }: { children: React.ReactElement }) => {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/" replace />;
  return children;
};

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-hfc-brown flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-3 border-gold-400/30 border-t-gold-400 rounded-full animate-spin" />
          <p className="text-amber-300/50 text-xs font-bold uppercase tracking-widest">Verifying your access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={(user?.role === 'coach' || user?.role === 'admin') ? <Dashboard /> : <Navigate to={`/players/${user?.jumper_no ?? user?.player_id}`} replace />} />

        {/* Player profile — accessible to both (coaches view any, players view their own) */}
        <Route path="players/:id" element={<PlayerDetail />} />

        {/* Coach-only routes (Admins also allowed) */}
        <Route path="players" element={<CoachOnly><PlayersList /></CoachOnly>} />
        <Route path="stats" element={<CoachOnly><StatsPage /></CoachOnly>} />
        <Route path="ratings/input" element={<CoachOnly><CoachRatings /></CoachOnly>} />
        <Route path="ratings/compare" element={<CoachOnly><RatingComparison /></CoachOnly>} />
        <Route path="team-builder" element={<CoachOnly><TeamBuilder /></CoachOnly>} />
        
        <Route path="analytics" element={<CoachOnly><Analytics /></CoachOnly>} />
        <Route path="analytics/debrief" element={<CoachOnly><MatchDebrief /></CoachOnly>} />
        <Route path="match-center/previews" element={<CoachOnly><OppositionPreviews /></CoachOnly>} />
        <Route path="match-center/timeline" element={<CoachOnly><EventTimeline /></CoachOnly>} />
        <Route path="match-center/comparison" element={<CoachOnly><PlayerComparison /></CoachOnly>} />

        {/* Admin-only routes */}
        <Route path="admin/settings" element={<AdminOnly><AdminSettings /></AdminOnly>} />

        {/* Shared routes */}
        <Route path="injuries" element={<InjuryDashboard />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="hawk-ai" element={<HawkAiPage />} />

        {/* Player-only routes */}
        <Route path="checkin" element={<PlayerOnly><DailyCheckIn /></PlayerOnly>} />
        <Route path="woop" element={<PlayerOnly><WoopGoals /></PlayerOnly>} />
        <Route path="ratings/player-review" element={<PlayerReview />} />


        <Route path="idp" element={<div className="p-10">IDP Module Coming Soon</div>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
