import { useState, useEffect, useRef } from 'react';
import { Activity, Trophy, Users, ChevronDown } from 'lucide-react';
import * as api from '../api/client';

export default function Dashboard() {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTid, setSelectedTid] = useState('');
  const [tournamentData, setTournamentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const wsRef = useRef(null);

  // Live score state
  const [liveScorecards, setLiveScorecards] = useState([]);
  const [selectedCountTeamId, setSelectedCountTeamId] = useState('');

  useEffect(() => {
    api.getTournaments().then(data => {
      setTournaments(data);
      if (data.length > 0) setSelectedTid(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (selectedTid) loadTournament(selectedTid);
  }, [selectedTid]);

  // WebSocket for live updates
  useEffect(() => {
    wsRef.current = api.connectLiveScores((msg) => {
      if (msg.type === 'score_update' || msg.type === 'scorecard_created' || msg.type === 'scorecard_completed') {
        // Reload tournament data on any score update
        if (selectedTid) loadTournament(selectedTid);
      }
    });
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, [selectedTid]);

  async function loadTournament(tid) {
    setLoading(true);
    try {
      const data = await api.getTournamentFull(tid);
      setTournamentData(data);
      // Separate live (in_progress) scorecards
      setLiveScorecards((data.scorecards || []).filter(sc => sc.status === 'in_progress'));
      // Default to first team for player counts
      if (data.teams && data.teams.length > 0) {
        setSelectedCountTeamId(data.teams[0].id);
      } else {
        setSelectedCountTeamId('');
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  if (!tournamentData) {
    return (
      <div>
        <h1>Tournament Dashboard</h1>
        {tournaments.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
            <Trophy size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem' }} />
            <h3>No Tournaments Available</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Ask an admin to create a tournament to get started.</p>
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        )}
      </div>
    );
  }

  const teams = tournamentData.teams || [];
  const fixtures = [...(tournamentData.fixtures || [])].sort((a, b) => {
    if (!a.date_time) return 1;
    if (!b.date_time) return -1;
    return new Date(a.date_time) - new Date(b.date_time);
  });
  const events = tournamentData.events || [];
  const scorecards = tournamentData.scorecards || [];

  function getTeamName(id) {
    return teams.find(t => t.id === id)?.name || id;
  }
  function getEventName(id) {
    return events.find(e => e.id === id)?.name || id;
  }

  // ── Standings calculation ──
  function calculateStandings() {
    const teamMap = {};
    teams.forEach(t => {
      teamMap[t.id] = { id: t.id, name: t.name, group: t.group, played: 0, won: 0, lost: 0, points: 0, eventDiff: 0, setPointDiff: 0 };
    });

    // Only consider completed fixtures
    const completedFixtures = fixtures.filter(f => f.status === 'completed');

    completedFixtures.forEach(f => {
      const t1 = teamMap[f.team1_id];
      const t2 = teamMap[f.team2_id];
      if (!t1 || !t2) return;

      const fScorecards = scorecards.filter(sc => sc.fixture_id === f.id && sc.status === 'completed');
      if (fScorecards.length === 0) return;

      // Calculate event points for each team in this fixture
      let t1EventPts = 0, t2EventPts = 0;
      fScorecards.forEach(sc => {
        const ev = events.find(e => e.id === sc.event_id);
        const pts = ev?.points || 0;
        if (sc.winner === 'team1') t1EventPts += pts;
        else if (sc.winner === 'team2') t2EventPts += pts;
      });

      // Calculate set point difference for each team in this fixture
      let t1SetPointDiff = 0, t2SetPointDiff = 0;
      fScorecards.forEach(sc => {
        (sc.sets || []).forEach(s => {
          const s1 = s.team1_score || 0;
          const s2 = s.team2_score || 0;
          t1SetPointDiff += (s1 - s2);
          t2SetPointDiff += (s2 - s1);
        });
      });

      // P
      t1.played++;
      t2.played++;

      // W, L, Points
      if (t1EventPts > t2EventPts) {
        t1.won++; t1.points++;
        t2.lost++;
      } else if (t2EventPts > t1EventPts) {
        t2.won++; t2.points++;
        t1.lost++;
      }

      // Event Difference
      t1.eventDiff += (t1EventPts - t2EventPts);
      t2.eventDiff += (t2EventPts - t1EventPts);

      // Set Point Difference
      t1.setPointDiff += t1SetPointDiff;
      t2.setPointDiff += t2SetPointDiff;
    });

    return Object.values(teamMap).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.eventDiff !== a.eventDiff) return b.eventDiff - a.eventDiff;
      return b.setPointDiff - a.setPointDiff;
    });
  }

  const standings = calculateStandings();
  const groups = [...new Set(teams.map(t => t.group).filter(Boolean))];
  const scheduleFixtures = fixtures.filter(f => f.status !== 'completed');
  const resultsFixtures = fixtures.filter(f => f.status === 'completed');

  // ── Player event count ──
  function getPlayerEventCounts() {
    const counts = {};
    scorecards.forEach(sc => {
      [sc.team1_player1, sc.team1_player2, sc.team2_player1, sc.team2_player2]
        .filter(Boolean)
        .forEach(p => { counts[p] = (counts[p] || 0) + 1; });
    });

    if (!selectedCountTeamId) return [];
    const selectedTeam = teams.find(t => t.id === selectedCountTeamId);
    if (!selectedTeam) return [];

    const teamPlayers = selectedTeam.players_list || [];
    const result = teamPlayers.map(p => {
      const name = typeof p === 'object' ? p.name : p;
      return [name, counts[name] || 0];
    });
    return result.sort((a, b) => b[1] - a[1]);
  }

  const playerCounts = getPlayerEventCounts();

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Tournament Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Live updates, standings, and schedule</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {(tournaments.find(t => t.id === selectedTid)?.youtube_link || import.meta.env.VITE_YOUTUBE_HANDLE) && (
            <a 
              href={`https://youtube.com/${tournaments.find(t => t.id === selectedTid)?.youtube_link || import.meta.env.VITE_YOUTUBE_HANDLE}/live`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#ff0000', color: 'white', textDecoration: 'none', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', fontWeight: 600 }}
            >
              <Activity size={18} />
              Watch Live
            </a>
          )}
          {liveScorecards.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-secondary)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)' }}>
              <Activity size={18} className="pulse" />
              <span style={{ fontWeight: 500 }}>Live Match in Progress</span>
            </div>
          )}
        </div>
      </div>

      {/* Tournament selector */}
      <div style={{ marginBottom: '1.5rem' }}>
        <select className="form-input" style={{ maxWidth: '400px' }} value={selectedTid} onChange={e => setSelectedTid(e.target.value)}>
          {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {/* ── Live Scores ── */}
      {liveScorecards.length > 0 && (
        <div className="glass-card" style={{ marginBottom: '1.5rem', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Activity size={20} color="var(--accent-secondary)" />
            <h3 style={{ margin: 0, color: 'var(--accent-secondary)' }}>Live Scores</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {liveScorecards.map(sc => {
              const fixture = fixtures.find(f => f.id === sc.fixture_id);
              return (
                <div key={sc.id} className="glass-card" style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.05)' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0 0 0.5rem' }}>
                    {getEventName(sc.event_id)} • Set {sc.current_set + 1}/{sc.num_sets}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <p style={{ fontWeight: 600, margin: '0 0 0.25rem' }}>{fixture ? getTeamName(fixture.team1_id) : '?'}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                        {[sc.team1_player1, sc.team1_player2].filter(Boolean).join(' & ')}
                      </p>
                    </div>
                    <div style={{ textAlign: 'center', padding: '0 1rem' }}>
                      <p style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>
                        {sc.sets[sc.current_set]?.team1_score} - {sc.sets[sc.current_set]?.team2_score}
                      </p>
                      {sc.num_sets > 1 && (
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0' }}>
                          Sets: {sc.sets.map((s, i) => `${s.team1_score}-${s.team2_score}`).join(' | ')}
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <p style={{ fontWeight: 600, margin: '0 0 0.25rem' }}>{fixture ? getTeamName(fixture.team2_id) : '?'}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                        {[sc.team2_player1, sc.team2_player2].filter(Boolean).join(' & ')}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Standings ── */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <h3>Standings</h3>
        {groups.length > 0 ? (
          groups.map(g => (
            <div key={g} style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ color: 'var(--accent-primary)', marginBottom: '0.75rem' }}>Group {g}</h4>
              <StandingsTable standings={standings.filter(s => s.group === g)} />
            </div>
          ))
        ) : (
          <StandingsTable standings={standings} />
        )}
      </div>

      {/* ── Schedule ── */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <h3>Schedule</h3>
        {scheduleFixtures.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No upcoming matches scheduled.</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Match</th>
                  <th>Type</th>
                  <th>Date & Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {scheduleFixtures.map(f => (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 600 }}>{getTeamName(f.team1_id)} <span style={{ color: 'var(--text-secondary)' }}>vs</span> {getTeamName(f.team2_id)}</td>
                    <td style={{ textTransform: 'capitalize' }}>{f.match_type.replace('_', ' ')}</td>
                    <td>{f.date_time ? new Date(f.date_time).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : <span style={{ color: 'var(--text-secondary)' }}>Not Scheduled</span>}</td>
                    <td>
                      <span className={`badge badge-${f.status.replace('_', '-')}`}>
                        {f.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Results ── */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <h3>Results</h3>
        {resultsFixtures.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No completed matches yet.</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Match</th>
                  <th>Type</th>
                  <th>Result</th>
                  <th>Winner</th>
                </tr>
              </thead>
              <tbody>
                {resultsFixtures.map(f => {
                  const fScorecards = scorecards.filter(sc => sc.fixture_id === f.id && sc.status === 'completed');
                  let t1pts = 0, t2pts = 0;
                  fScorecards.forEach(sc => {
                    const ev = events.find(e => e.id === sc.event_id);
                    if (sc.winner === 'team1') t1pts += (ev?.points || 0);
                    else if (sc.winner === 'team2') t2pts += (ev?.points || 0);
                  });
                  const winnerName = t1pts > t2pts ? getTeamName(f.team1_id) : (t2pts > t1pts ? getTeamName(f.team2_id) : 'Draw');
                  return (
                    <tr key={f.id}>
                      <td style={{ fontWeight: 600 }}>{getTeamName(f.team1_id)} <span style={{ color: 'var(--text-secondary)' }}>vs</span> {getTeamName(f.team2_id)}</td>
                      <td style={{ textTransform: 'capitalize' }}>{f.match_type.replace('_', ' ')}</td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{t1pts} - {t2pts}</span>
                      </td>
                      <td>
                        <span className="badge badge-completed">{winnerName}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Squads ── */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <h3>Squads</h3>
        {teams.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No teams added yet.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
            {teams.map(team => (
              <div key={team.id} className="glass-card" style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.03)' }}>
                <h4 style={{ color: 'var(--accent-primary)', marginBottom: team.owners ? '0.25rem' : '0.75rem' }}>
                  {team.name}
                </h4>
                {team.owners && (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', marginBottom: '0.75rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                    Owner: {team.owners}
                  </div>
                )}
                {!team.owners && (
                  <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }} />
                )}
                {(!team.players_list || team.players_list.length === 0) ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No players.</p>
                ) : (
                  <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                    {team.players_list.map((p, i) => (
                      <li key={i} style={{ padding: '0.35rem 0', fontSize: '0.9rem', color: 'var(--text-primary)', borderBottom: i < team.players_list.length - 1 ? '1px dashed rgba(255, 255, 255, 0.1)' : 'none' }}>
                        {typeof p === 'object' ? p.name : p}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Player Event Count ── */}
      <div className="glass-card">
        <h3>Player Event Count</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.85rem' }}>Select a team to see how many events each player has played.</p>

        <div style={{ marginBottom: '1.5rem', maxWidth: '300px' }}>
          <select
            className="form-input"
            value={selectedCountTeamId}
            onChange={e => setSelectedCountTeamId(e.target.value)}
          >
            <option value="">-- Select Team --</option>
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {!selectedCountTeamId ? (
          <p style={{ color: 'var(--text-secondary)' }}>Please select a team from the dropdown above.</p>
        ) : playerCounts.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No players found in this team.</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th>Events Played</th>
                </tr>
              </thead>
              <tbody>
                {playerCounts.map(([name, count], i) => (
                  <tr key={name}>
                    <td>{i + 1}</td>
                    <td style={{ fontWeight: 500 }}>{name}</td>
                    <td><span className="badge badge-in-progress">{count}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StandingsTable({ standings }) {
  if (standings.length === 0) {
    return <p style={{ color: 'var(--text-secondary)' }}>No teams in this group.</p>;
  }
  const fmtDiff = (v) => v > 0 ? `+${v}` : `${v}`;
  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Team</th>
            <th>P</th>
            <th>W</th>
            <th>L</th>
            <th>Points</th>
            <th>Event Diff</th>
            <th>Set Pt Diff</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((t, i) => (
            <tr key={t.id}>
              <td>{i + 1}</td>
              <td style={{ fontWeight: 600 }}>{t.name}</td>
              <td>{t.played}</td>
              <td>{t.won}</td>
              <td>{t.lost}</td>
              <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{t.points}</td>
              <td style={{ color: t.eventDiff > 0 ? 'var(--accent-secondary)' : t.eventDiff < 0 ? 'var(--accent-danger)' : 'var(--text-secondary)' }}>{fmtDiff(t.eventDiff)}</td>
              <td style={{ color: t.setPointDiff > 0 ? 'var(--accent-secondary)' : t.setPointDiff < 0 ? 'var(--accent-danger)' : 'var(--text-secondary)' }}>{fmtDiff(t.setPointDiff)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
