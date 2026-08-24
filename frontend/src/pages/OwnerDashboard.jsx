import { useEffect, useState } from 'react';
import { Eye, Gavel, Trophy, Users, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import * as api from '../api/client';

export default function OwnerDashboard() {
  const [tournaments, setTournaments] = useState([]);
  const [auctionByTournament, setAuctionByTournament] = useState({});
  const [selectedTid, setSelectedTid] = useState('');
  const [fullTournamentData, setFullTournamentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadAuctions(isBackground = false) {
    if (!isBackground) setLoading(true);
    if (!isBackground) setError('');
    try {
      const tournamentList = await api.getTournaments();
      const sorted = tournamentList.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      const auctionEntries = await Promise.all(
        sorted.map(async (tournament) => {
          const [auction, teams] = await Promise.all([
            api.getPublicAuction(tournament.id),
            api.getTeams(tournament.id),
          ]);
          return [tournament.id, { auction, teams }];
        }),
      );
      setTournaments(sorted);
      setAuctionByTournament(Object.fromEntries(auctionEntries));
      
      setSelectedTid(prev => {
        if (!prev && sorted.length > 0) return sorted[0].id;
        if (prev && !sorted.find(t => t.id === prev)) return sorted.length > 0 ? sorted[0].id : '';
        return prev;
      });
    } catch (err) {
      if (!isBackground) setError(err.message);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }

  useEffect(() => {
    loadAuctions();
    const intervalId = setInterval(() => {
      loadAuctions(true);
    }, 5000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (selectedTid) {
      api.getTournamentFull(selectedTid).then(data => {
        setFullTournamentData(data);
      }).catch(err => console.error("Failed to fetch full tournament:", err));
    } else {
      setFullTournamentData(null);
    }
  }, [selectedTid]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <div>
          <h1>Owner Auction View</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Read-only auction points for the tournament</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-secondary)' }}>
          <Eye size={18} />
          <span style={{ fontWeight: 600 }}>Read Only</span>
        </div>
      </div>

      <div className="glass-card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
        <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 500 }}>Select Tournament</label>
        <select 
          className="form-input" 
          value={selectedTid} 
          onChange={(e) => setSelectedTid(e.target.value)}
          disabled={loading || tournaments.length === 0}
        >
          {tournaments.length === 0 ? <option value="">No tournaments found</option> : null}
          {tournaments.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {loading && !selectedTid ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading auction points...</p>
      ) : tournaments.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Trophy size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem' }} />
          <h3>No tournaments available</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Auction points will appear here after an admin creates a tournament.</p>
        </div>
      ) : selectedTid ? (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Player Profiles Tile */}
          <Link to={`/owner/players?tid=${selectedTid}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="glass-card" style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
              padding: '1.25rem 1.5rem', cursor: 'pointer', transition: 'all 0.2s',
              borderLeft: '4px solid var(--accent-primary)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.75rem', borderRadius: 'var(--radius-md)', color: 'var(--accent-primary)' }}>
                  <Users size={24} />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem' }}>Player Profiles</h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>View complete player catalog and stats for the auction</p>
                </div>
              </div>
              <ChevronRight color="var(--text-secondary)" />
            </div>
          </Link>

          {(() => {
            const tournament = tournaments.find(t => t.id === selectedTid);
            if (!tournament) return null;
            const tournamentAuction = auctionByTournament[tournament.id];
            const auction = tournamentAuction?.auction;
            const teams = tournamentAuction?.teams || [];
            const teamPlayers = auction?.team_players || {};
            const hasAuction = auction && auction.status !== 'idle';

            return (
              <section key={tournament.id} className="glass-card" style={auction?.status === 'live' ? { borderColor: 'rgba(239, 68, 68, 0.3)' } : {}}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <Gavel size={20} color={auction?.status === 'live' ? "#ef4444" : (auction?.status === 'ended' ? "#10b981" : "var(--accent-primary)")} />
                    <h3 style={{ margin: 0, color: auction?.status === 'live' ? '#ef4444' : (auction?.status === 'ended' ? '#10b981' : 'var(--text-primary)') }}>
                      {tournament.name} {hasAuction ? 'Auction' : ''}
                    </h3>
                  </div>
                  {hasAuction && auction.status === 'live' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', fontWeight: 600 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 1.5s infinite' }} /> LIVE
                    </span>
                  )}
                  {hasAuction && auction.status === 'ended' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', fontWeight: 600 }}>
                      COMPLETED
                    </span>
                  )}
                </div>

                {!hasAuction ? (
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Auction has not started.</p>
                ) : (
                  <>
                    {Object.keys(teamPlayers).length === 0 ? (
                      <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.5rem' }}>No players assigned yet.</p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                        {teams.filter((team) => teamPlayers[team.id] !== undefined).map((team) => {
                          const players = teamPlayers[team.id] || [];
                          const pointsUsed = players.reduce((total, player) => total + Number(player.points || 0), 0);
                          const pointsRemaining = Number(auction.total_points || 0) - pointsUsed;
                          const playersRemaining = Number(auction.max_players || 0) - players.length;
                          const maxBid = playersRemaining > 0
                            ? pointsRemaining - ((playersRemaining - 1) * Number(auction.starting_bid || 0))
                            : 0;

                          return (
                            <div key={team.id} style={{ border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                              <div style={{ padding: '0.85rem 1rem', background: 'rgba(59, 130, 246, 0.08)' }}>
                                <h4 style={{ margin: 0 }}>{team.name}</h4>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', padding: '0.75rem 1rem', borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                                {[
                                  ['Points consumed', pointsUsed, 'var(--accent-primary)'],
                                  ['Points left', pointsRemaining, pointsRemaining >= 0 ? 'var(--accent-secondary)' : 'var(--accent-danger)'],
                                  ['Players left', playersRemaining, playersRemaining > 0 ? 'var(--text-primary)' : 'var(--accent-secondary)'],
                                  ['Max bid', Math.max(0, maxBid), maxBid > 0 ? '#f59e0b' : 'var(--accent-danger)'],
                                ].map(([label, value, color]) => (
                                  <div key={label} style={{ minWidth: 0 }}>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', marginBottom: '0.2rem' }}>{label}</div>
                                    <strong style={{ color, fontSize: '0.95rem' }}>{value}</strong>
                                  </div>
                                ))}
                              </div>
                              <div className="table-container" style={{ border: 0, borderRadius: 0 }}>
                                <table>
                                  <thead>
                                    <tr>
                                      <th>Player</th>
                                      <th>Gender</th>
                                      <th style={{ textAlign: 'right' }}>Points</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {players.length === 0 ? (
                                      <tr>
                                        <td colSpan="3" style={{ color: 'var(--text-secondary)' }}>No players assigned</td>
                                      </tr>
                                    ) : (
                                      players.map((player, index) => (
                                        <tr key={`${team.id}-${player.name}-${index}`}>
                                          <td>{player.name}</td>
                                          <td>{player.gender}</td>
                                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent-primary)' }}>{player.points}</td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {auction.status === 'live' && fullTournamentData && (() => {
                      const assignedNames = new Set();
                      Object.values(teamPlayers).forEach(tpArray => {
                        tpArray.forEach(p => assignedNames.add(p.name));
                      });
                      
                      const remainingPlayers = (fullTournamentData.players || []).filter(p => !assignedNames.has(p.name));
                      if (remainingPlayers.length === 0) return null;
                      
                      const isKids = fullTournamentData.tournament.category === 'Kids';
                      const kidsAgeLimit = fullTournamentData.tournament.kids_age_limit || 12;
                      
                      let remainingGroups = {};
                      if (isKids) {
                        remainingGroups = {
                          'Juniors': remainingPlayers.filter(p => p.age <= kidsAgeLimit),
                          'Seniors': remainingPlayers.filter(p => p.age > kidsAgeLimit),
                        };
                      } else {
                        remainingGroups = {
                          'Men': remainingPlayers.filter(p => p.gender === 'Male'),
                          'Women': remainingPlayers.filter(p => p.gender === 'Female'),
                        };
                      }
                      
                      Object.keys(remainingGroups).forEach(key => {
                        if (remainingGroups[key].length === 0) delete remainingGroups[key];
                      });
                      
                      if (Object.keys(remainingGroups).length === 0) return null;

                      return (
                        <div style={{ marginTop: '2rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                          <h4 style={{ margin: '0 0 1rem', fontSize: '1.2rem', color: 'var(--text-primary)' }}>Players Remaining in Pool</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {Object.entries(remainingGroups).map(([groupName, groupPlayers]) => (
                              <div key={groupName}>
                                <h5 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem', color: 'var(--accent-primary)' }}>
                                  {groupName} <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>({groupPlayers.length})</span>
                                </h5>
                                <div className="table-container">
                                  <table>
                                    <thead>
                                      <tr>
                                        <th>Name</th>
                                        <th>Gender</th>
                                        <th>Age</th>
                                        <th>Expertise</th>
                                        <th>State/National</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {groupPlayers.map(p => (
                                        <tr key={p.id}>
                                          <td style={{ fontWeight: 500 }}>{p.name}</td>
                                          <td>{p.gender || '-'}</td>
                                          <td>{p.age || '-'}</td>
                                          <td>
                                            {p.expertise && p.expertise !== 'None' ? (
                                              <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-secondary)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600 }}>
                                                {p.expertise}
                                              </span>
                                            ) : '-'}
                                          </td>
                                          <td>
                                            {p.played_state_national && p.played_state_national !== 'No' && p.played_state_national !== 'None' ? (
                                              <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600 }}>
                                                Yes
                                              </span>
                                            ) : '-'}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </section>
            );
          })()}
        </div>
      ) : null}
    </div>
  );
}
