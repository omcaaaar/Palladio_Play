import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Trophy, LogIn, LogOut } from 'lucide-react';

import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import RefereeDashboard from './pages/RefereeDashboard';

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
    if (role === 'viewer') {
      // Viewer doesn't need to be "logged in", just go to dashboard
      navigate('/');
      return;
    }
    setUser({ username, role });
    if (role === 'admin') navigate('/admin');
    else navigate('/referee');
  };

  const handleLogout = () => {
    setUser(null);
    navigate('/');
  };

  return (
    <div>
      <Navbar user={user} logout={handleLogout} />
      <main className="container">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/admin/*" element={user?.role === 'admin' ? <AdminDashboard /> : <Login onLogin={handleLogin} />} />
          <Route path="/referee/*" element={user?.role === 'referee' ? <RefereeDashboard /> : <Login onLogin={handleLogin} />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
