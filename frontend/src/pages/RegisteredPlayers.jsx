import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Users, ArrowLeft, UserRound } from 'lucide-react';
import * as api from '../api/client';

export default function RegisteredPlayers() {
  const [searchParams] = useSearchParams();
  const tid = searchParams.get('tid');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tournamentName, setTournamentName] = useState('');

  useEffect(() => {
    if (!tid) return;
    Promise.all([
      api.getRegisteredPlayers(tid),
      api.getRegistrationInfo(tid),
    ]).then(([playersData, info]) => {
      setData(playersData);
      setTournamentName(info?.name || 'Tournament');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [tid]);

  if (!tid) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <h2>Invalid Link</h2>
        <Link to="/" className="btn btn-primary" style={{ textDecoration: 'none', marginTop: '1rem', display: 'inline-flex' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div className="pulse" style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Loading players...</div>
      </div>
    );
  }

  const players = data?.players || [];
  const category = data?.category || 'Adults';

  // Group players
  let groups = {};
  if (category === 'Kids') {
    groups = { Junior: [], Senior: [] };
    players.forEach(p => {
      if (p.gender === 'Junior') groups.Junior.push(p);
      else groups.Senior.push(p);
    });
  } else {
    groups = { Male: [], Female: [] };
    players.forEach(p => {
      if (p.gender === 'Male') groups.Male.push(p);
      else if (p.gender === 'Female') groups.Female.push(p);
    });
  }

  const groupColors = {
    Male: { bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.2)', accent: '#60a5fa', icon: '♂' },
    Female: { bg: 'rgba(244, 114, 182, 0.08)', border: 'rgba(244, 114, 182, 0.2)', accent: '#f472b6', icon: '♀' },
    Junior: { bg: 'rgba(96, 165, 250, 0.08)', border: 'rgba(96, 165, 250, 0.2)', accent: '#60a5fa', icon: '🌟' },
    Senior: { bg: 'rgba(168, 85, 247, 0.08)', border: 'rgba(168, 85, 247, 0.2)', accent: '#a855f7', icon: '⭐' },
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '640px', margin: '1rem auto', padding: '0 1rem' }}>
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
          <Users size={24} color="#60a5fa" />
          <h2 style={{ margin: 0 }}>Registered Players</h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0' }}>{tournamentName}</p>
      </div>

      {players.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <UserRound size={40} color="var(--text-secondary)" style={{ marginBottom: '0.75rem' }} />
          <p style={{ color: 'var(--text-secondary)' }}>No players have registered yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {Object.entries(groups).map(([groupName, groupPlayers]) => {
            const colors = groupColors[groupName] || groupColors.Male;
            return (
              <div key={groupName} className="glass-card" style={{ borderLeft: `3px solid ${colors.accent}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>{colors.icon}</span> {groupName}
                  </h3>
                  <span style={{
                    background: colors.bg, color: colors.accent,
                    padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)',
                    fontSize: '0.8rem', fontWeight: 600,
                  }}>
                    {groupPlayers.length} player{groupPlayers.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {groupPlayers.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>No players in this category yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {groupPlayers.sort((a, b) => a.name.localeCompare(b.name)).map((p, i) => (
                      <span
                        key={i}
                        style={{
                          background: colors.bg, border: `1px solid ${colors.border}`,
                          padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-full)',
                          fontSize: '0.85rem', color: 'var(--text-primary)',
                        }}
                      >
                        {p.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div style={{ textAlign: 'center', padding: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Total: <strong style={{ color: 'var(--text-primary)' }}>{players.length}</strong> registered player{players.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
