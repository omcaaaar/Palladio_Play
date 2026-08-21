import { useEffect, useState } from 'react';
import { Eye, Gavel, RefreshCw, Trophy } from 'lucide-react';
import * as api from '../api/client';

export default function OwnerDashboard() {
  const [tournaments, setTournaments] = useState([]);
  const [auctionByTournament, setAuctionByTournament] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadAuctions() {
    setLoading(true);
    setError('');
    try {
      const tournamentList = await api.getTournaments();
      const auctionEntries = await Promise.all(
        tournamentList.map(async (tournament) => {
          const [auction, teams] = await Promise.all([
            api.getPublicAuction(tournament.id),
            api.getTeams(tournament.id),
          ]);
          return [tournament.id, { auction, teams }];
        }),
      );
      setTournaments(tournamentList);
      setAuctionByTournament(Object.fromEntries(auctionEntries));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAuctions();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <div>
          <h1>Owner Auction View</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Read-only auction points for every tournament</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-secondary)' }}>
          <Eye size={18} />
          <span style={{ fontWeight: 600 }}>Read Only</span>
          <button className="btn btn-outline" onClick={loadAuctions} disabled={loading} title="Refresh auction data" style={{ padding: '0.5rem' }}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading auction points...</p>
      ) : tournaments.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Trophy size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem' }} />
          <h3>No tournaments available</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Auction points will appear here after an admin creates a tournament.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {tournaments.map((tournament) => {
            const tournamentAuction = auctionByTournament[tournament.id];
            const auction = tournamentAuction?.auction;
            const teams = tournamentAuction?.teams || [];
            const teamPlayers = auction?.team_players || {};
            const hasAuction = auction && auction.status !== 'idle';

            return (
              <section key={tournament.id} className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <Gavel size={20} color="var(--accent-primary)" />
                    <h3 style={{ margin: 0 }}>{tournament.name}</h3>
                  </div>
                  {hasAuction && <span className={`badge badge-${auction.status === 'live' ? 'in-progress' : 'completed'}`}>{auction.status}</span>}
                </div>

                {!hasAuction ? (
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Auction has not started.</p>
                ) : Object.keys(teamPlayers).length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No players assigned yet.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
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
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', background: 'rgba(59, 130, 246, 0.08)' }}>
                            <h4 style={{ margin: 0 }}>{team.name}</h4>
                            <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{pointsUsed} pts</span>
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
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
