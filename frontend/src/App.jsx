import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Trophy, LogIn, LogOut } from 'lucide-react';

import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import RefereeDashboard from './pages/RefereeDashboard';
import BroadcasterDashboard from './pages/BroadcasterDashboard';
import OwnerDashboard from './pages/OwnerDashboard';
import { AuctionPage, PlayerEventsPage, PlayerStatsPage, ResultsPage, SchedulePage, SquadsPage, StandingsPage } from './pages/PublicPages';

function Navbar({ user, logout }) {
  const location = useLocation();

  return (
    <nav className="navbar">
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Trophy color="var(--accent-primary)" size={28} />
        <h2 style={{ margin: 0, fontSize: '1.25rem', background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Palladio Play
        </h2>
      </Link>
      <div className="nav-links" style={{ alignItems: 'center' }}>
        <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Dashboard</Link>
        {user?.role === 'admin' && (
          <Link to="/admin" className={`nav-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`}>Admin</Link>
        )}
        {user?.role === 'referee' && (
          <Link to="/referee" className={`nav-link ${location.pathname.startsWith('/referee') ? 'active' : ''}`}>Referee</Link>
        )}
        {user?.role === 'broadcaster' && (
          <Link to="/broadcaster" className={`nav-link ${location.pathname.startsWith('/broadcaster') ? 'active' : ''}`}>Broadcaster</Link>
        )}
        {user?.role === 'owner' && (
          <Link to="/owner" className={`nav-link ${location.pathname.startsWith('/owner') ? 'active' : ''}`}>Owner</Link>
        )}
        
        {!user ? (
          <Link to="/login" className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>
            <LogIn size={16} /> Login
          </Link>
        ) : (
          <button onClick={logout} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>
            <LogOut size={16} /> {user.role}
          </button>
        )}
      </div>
    </nav>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const handleLogin = (username, role) => {
    setUser({ username, role });
    if (role === 'admin') navigate('/admin');
    else if (role === 'referee') navigate('/referee');
    else if (role === 'broadcaster') navigate('/broadcaster');
    else if (role === 'owner') navigate('/owner');
  };

  const handleLogout = () => {
    setUser(null);
    navigate('/login');
  };

  return (
    <div>
      <Navbar user={user} logout={handleLogout} />
      <main className="container">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/auction" element={<AuctionPage />} />
          <Route path="/standings" element={<StandingsPage />} />
          <Route path="/squads" element={<SquadsPage />} />
          <Route path="/player-events" element={<PlayerEventsPage />} />
          <Route path="/player-stats" element={<PlayerStatsPage />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/owner-login" element={<Login onLogin={handleLogin} fixedRole="owner" />} />
          <Route path="/admin/*" element={user?.role === 'admin' ? <AdminDashboard /> : <Login onLogin={handleLogin} />} />
          <Route path="/referee/*" element={user?.role === 'referee' ? <RefereeDashboard /> : <Login onLogin={handleLogin} />} />
          <Route path="/broadcaster/*" element={user?.role === 'broadcaster' ? <BroadcasterDashboard /> : <Login onLogin={handleLogin} />} />
          <Route path="/owner/*" element={user?.role === 'owner' ? <OwnerDashboard /> : <Login onLogin={handleLogin} fixedRole="owner" />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
