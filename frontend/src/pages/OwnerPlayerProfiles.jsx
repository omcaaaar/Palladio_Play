import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, User, Phone, Home, Trophy, Medal } from 'lucide-react';
import * as api from '../api/client';

export default function OwnerPlayerProfiles() {
  const [searchParams] = useSearchParams();
  const tid = searchParams.get('tid');
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tid) {
      setError('No tournament ID provided.');
      setLoading(false);
      return;
    }
    
    api.getTournamentFull(tid)
      .then(data => {
        setTournament(data);
      })
      .catch(err => {
        setError('Failed to load tournament data. ' + err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [tid]);

  if (loading) {
    return <div className="container" style={{ padding: '2rem 1rem' }}><p style={{ color: 'var(--text-secondary)' }}>Loading player profiles...</p></div>;
  }

  if (error || !tournament) {
    return (
      <div className="container" style={{ padding: '2rem 1rem' }}>
        <Link to="/owner" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          <ArrowLeft size={16} /> Back to Owner Dashboard
        </Link>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <p style={{ color: 'var(--accent-danger)' }}>{error || 'Tournament not found.'}</p>
        </div>
      </div>
    );
  }

  const { tournament: tInfo, players } = tournament;
  const isKids = tInfo.category === 'Kids';
  const kidsAgeLimit = tInfo.kids_age_limit || 12; // default if not set

  let groups = {};

  if (isKids) {
    groups = {
      'Juniors': players.filter(p => p.age <= kidsAgeLimit),
      'Seniors': players.filter(p => p.age > kidsAgeLimit),
    };
  } else {
    groups = {
      'Men': players.filter(p => p.gender === 'Male'),
      'Women': players.filter(p => p.gender === 'Female'),
    };
  }

  // Remove empty groups
  Object.keys(groups).forEach(key => {
    if (groups[key].length === 0) delete groups[key];
  });

  return (
    <div className="container animate-fade-in" style={{ padding: '2rem 1rem' }}>
      <Link to="/owner" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        <ArrowLeft size={16} /> Back to Owner Dashboard
      </Link>

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.5rem' }}>Player Profiles</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          {tInfo.name} • {players.length} Registered Players
        </p>
      </div>

      {Object.keys(groups).length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <User size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem' }} />
          <h3>No Players Registered</h3>
          <p style={{ color: 'var(--text-secondary)' }}>There are currently no registered players for this tournament.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          {Object.entries(groups).map(([groupName, groupPlayers]) => (
            <div key={groupName}>
              <h2 style={{ 
                fontSize: '1.5rem', 
                marginBottom: '1.5rem', 
                paddingBottom: '0.5rem',
                borderBottom: '1px solid var(--glass-border)',
                color: 'var(--accent-primary)',
                display: 'inline-block',
                paddingRight: '2rem'
              }}>
                {groupName} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginLeft: '0.5rem', fontWeight: 500 }}>({groupPlayers.length})</span>
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {groupPlayers.map(player => (
                  <PlayerCard key={player.id} player={player} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlayerCard({ player }) {
  // Extract initials if no photo
  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const hasExpertise = player.expertise && player.expertise !== 'None';

  return (
    <div className="glass-card" style={{ 
      padding: '0', 
      overflow: 'hidden', 
      display: 'flex', 
      flexDirection: 'column',
      position: 'relative'
    }}>
      {/* Photo header area */}
      <div style={{ 
        height: '80px', 
        background: 'linear-gradient(to right, rgba(59, 130, 246, 0.2), rgba(167, 139, 250, 0.2))',
        position: 'relative'
      }}>
        {/* Avatar */}
        <div style={{
          position: 'absolute',
          bottom: '-50px',
          left: '1.5rem',
          width: '110px',
          height: '110px',
          borderRadius: '50%',
          background: 'var(--bg-secondary)',
          border: '4px solid var(--bg-card)',
          boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          zIndex: 10
        }}>
          {player.photo_url ? (
            <img src={player.photo_url} alt={player.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: '2.2rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>{getInitials(player.name)}</span>
          )}
        </div>
        
        {/* Attributes floating top right */}
        <div style={{ position: 'absolute', top: '0.75rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
          {hasExpertise && (
            <span style={{ 
              background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-secondary)', 
              fontSize: '0.85rem', padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-full)',
              fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem'
            }}>
              <Trophy size={14} /> {player.expertise}
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: '3.5rem 1.5rem 1.5rem' }}>
        <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.2rem' }}>{player.name}</h3>
        <p style={{ margin: '0 0 1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Age: <strong style={{ color: 'var(--text-primary)' }}>{player.age || 'N/A'}</strong>
        </p>
        
        <div style={{ display: 'grid', gap: '0.65rem' }}>
          {(player.wing || player.flat_no) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <Home size={16} color="var(--accent-primary)" />
              <span>Wing <strong style={{ color: 'var(--text-primary)' }}>{player.wing || '-'}</strong>, Flat <strong style={{ color: 'var(--text-primary)' }}>{player.flat_no || '-'}</strong></span>
            </div>
          )}
          {player.mobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <Phone size={16} color="var(--accent-primary)" />
              <a href={`tel:${player.mobile}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                {player.mobile}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
