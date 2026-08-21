import { useState } from 'react';
import { LogIn, Tv, ShieldAlert, Settings, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Login({ onLogin, fixedRole = '' }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(fixedRole ? 'login' : 'select'); // 'select' | 'login'
  const [role, setRole] = useState(fixedRole);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');



  const handleSelectRole = (r) => {
    setRole(r);
    setMode('login');
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const adminUser = import.meta.env.VITE_ADMIN_USER || 'admin';
    const adminPass = import.meta.env.VITE_ADMIN_PASS || 'admin';
    const refUser = import.meta.env.VITE_REFEREE_USER || 'referee';
    const refPass = import.meta.env.VITE_REFEREE_PASS || 'referee';
    const broadUser = import.meta.env.VITE_BROADCASTER_USER || 'broadcaster';
    const broadPass = import.meta.env.VITE_BROADCASTER_PASS || 'broadcaster';
    const ownerUser = import.meta.env.VITE_OWNER_USER || 'owner';
    const ownerPass = import.meta.env.VITE_OWNER_PASS || 'owner';

    if (role === 'admin' && username === adminUser && password === adminPass) {
      onLogin('admin', 'admin');
    } else if (role === 'referee' && username === refUser && password === refPass) {
      onLogin('referee', 'referee');
    } else if (role === 'broadcaster' && username === broadUser && password === broadPass) {
      onLogin('broadcaster', 'broadcaster');
    } else if (role === 'owner' && username === ownerUser && password === ownerPass) {
      onLogin('owner', 'owner');
    } else {
      setError('Invalid credentials. Please try again.');
    }
  };

  if (mode === 'select') {
    return (
      <div style={{ maxWidth: '600px', margin: '3rem auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1>Welcome to Palladio Play</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Select your role to continue</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {/* Broadcaster */}
          <button className="glass-card" onClick={() => handleSelectRole('broadcaster')}
            style={{ cursor: 'pointer', textAlign: 'center', padding: '2rem 1rem', border: '1px solid var(--glass-border)', transition: 'all 0.2s' }}>
            <Tv size={36} color="var(--accent-secondary)" style={{ marginBottom: '0.75rem' }} />
            <h3 style={{ marginBottom: '0.5rem' }}>Broadcaster</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>YouTube live stream tools</p>
          </button>

          {/* Referee */}
          <button className="glass-card" onClick={() => handleSelectRole('referee')}
            style={{ cursor: 'pointer', textAlign: 'center', padding: '2rem 1rem', border: '1px solid var(--glass-border)', transition: 'all 0.2s' }}>
            <ShieldAlert size={36} color="var(--accent-danger)" style={{ marginBottom: '0.75rem' }} />
            <h3 style={{ marginBottom: '0.5rem' }}>Referee</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>Manage live match scoring</p>
          </button>

          {/* Admin */}
          <button className="glass-card" onClick={() => handleSelectRole('admin')}
            style={{ cursor: 'pointer', textAlign: 'center', padding: '2rem 1rem', border: '1px solid var(--glass-border)', transition: 'all 0.2s' }}>
            <Settings size={36} color="var(--accent-primary)" style={{ marginBottom: '0.75rem' }} />
            <h3 style={{ marginBottom: '0.5rem' }}>Admin</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>Manage tournaments and teams</p>
          </button>

          {/* Owner */}
          <button className="glass-card" onClick={() => handleSelectRole('owner')}
            style={{ cursor: 'pointer', textAlign: 'center', padding: '2rem 1rem', border: '1px solid var(--glass-border)', transition: 'all 0.2s' }}>
            <Eye size={36} color="var(--accent-secondary)" style={{ marginBottom: '0.75rem' }} />
            <h3 style={{ marginBottom: '0.5rem' }}>Owner</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>View auction points</p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '400px', margin: '4rem auto' }}>
      <div className="glass-card animate-fade-in">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', background: role === 'admin' ? 'rgba(59, 130, 246, 0.1)' : role === 'broadcaster' || role === 'owner' ? 'rgba(167, 139, 250, 0.1)' : 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', marginBottom: '1rem' }}>
            {role === 'admin' ? <Settings size={32} color="var(--accent-primary)" /> : role === 'broadcaster' ? <Tv size={32} color="var(--accent-secondary)" /> : role === 'owner' ? <Eye size={32} color="var(--accent-secondary)" /> : <ShieldAlert size={32} color="var(--accent-danger)" />}
          </div>
          <h2>{role === 'admin' ? 'Admin' : role === 'broadcaster' ? 'Broadcaster' : role === 'owner' ? 'Owner' : 'Referee'} Login</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Enter your credentials to continue</p>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input type="text" className="form-input" placeholder="Enter your username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-input" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
            <LogIn size={18} /> Login
          </button>
          <button type="button" className="btn btn-outline" style={{ width: '100%', marginTop: '0.75rem' }} onClick={() => { fixedRole ? navigate('/') : setMode('select'); setError(''); }}>
            {fixedRole ? 'Back to Home' : 'Back to Role Selection'}
          </button>
        </form>
      </div>
    </div>
  );
}
