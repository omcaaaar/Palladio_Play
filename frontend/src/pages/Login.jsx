import { useState } from 'react';
import { LogIn, Eye, ShieldAlert, Settings } from 'lucide-react';

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('select'); // 'select' | 'login'
  const [role, setRole] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSelectViewer = () => {
    onLogin('viewer', 'viewer');
  };

  const handleSelectRole = (r) => {
    setRole(r);
    setMode('login');
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (role === 'admin' && username === 'admin' && password === 'admin') {
      onLogin('admin', 'admin');
    } else if (role === 'referee' && username === 'referee' && password === 'referee') {
      onLogin('referee', 'referee');
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {/* Viewer */}
          <button className="glass-card" onClick={handleSelectViewer}
            style={{ cursor: 'pointer', textAlign: 'center', padding: '2rem 1rem', border: '1px solid var(--glass-border)', transition: 'all 0.2s' }}>
            <Eye size={36} color="var(--accent-secondary)" style={{ marginBottom: '0.75rem' }} />
            <h3 style={{ marginBottom: '0.5rem' }}>Viewer</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>Watch live scores and standings</p>
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
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '400px', margin: '4rem auto' }}>
      <div className="glass-card animate-fade-in">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', background: role === 'admin' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', marginBottom: '1rem' }}>
            {role === 'admin' ? <Settings size={32} color="var(--accent-primary)" /> : <ShieldAlert size={32} color="var(--accent-danger)" />}
          </div>
          <h2>{role === 'admin' ? 'Admin' : 'Referee'} Login</h2>
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
          <button type="button" className="btn btn-outline" style={{ width: '100%', marginTop: '0.75rem' }} onClick={() => { setMode('select'); setError(''); }}>
            Back to Role Selection
          </button>
        </form>
      </div>
    </div>
  );
}
