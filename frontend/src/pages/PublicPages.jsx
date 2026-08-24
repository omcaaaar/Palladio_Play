import React, { useEffect, useRef, useState } from 'react';
import { Activity, ChevronDown, ChevronRight, Gavel, ZoomIn, ZoomOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import * as api from '../api/client';

export function useTournamentData() {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTid, setSelectedTid] = useState('');
  const [data, setData] = useState(null);
  const [auction, setAuction] = useState(null);
  const socket = useRef(null);

  const load = async tid => {
    try {
      const next = await api.getTournamentFull(tid);
      setData(next);
      const live = await api.getPublicAuction(tid).catch(() => null);
      setAuction(live?.status === 'live' ? live : null);
    } catch (error) { console.error('Failed to load tournament:', error); }
  };

  useEffect(() => {
    api.getTournaments().then(items => {
      setTournaments(items);
      const savedTid = localStorage.getItem('selectedTournamentId');
      const initialTid = items.some(item => item.id === savedTid) ? savedTid : items[0]?.id || '';
      if (initialTid) {
        setSelectedTid(initialTid);
        localStorage.setItem('selectedTournamentId', initialTid);
      }
    });
  }, []);

  useEffect(() => { if (selectedTid) load(selectedTid); }, [selectedTid]);

  useEffect(() => {
    socket.current = api.connectLiveScores(message => {
      if (selectedTid && ['score_update', 'scorecard_created', 'scorecard_completed', 'scorecard_updated', 'tournament_updated'].includes(message.type)) load(selectedTid);
    });
    return () => socket.current?.close();
  }, [selectedTid]);

  useEffect(() => {
    if (!selectedTid) return undefined;
    const timer = setInterval(() => api.getPublicAuction(selectedTid).then(next => setAuction(next?.status === 'live' ? next : null)).catch(() => setAuction(null)), 5000);
    return () => clearInterval(timer);
  }, [selectedTid]);

  const selectTournament = tid => { setSelectedTid(tid); localStorage.setItem('selectedTournamentId', tid); };
  return { tournaments, selectedTid, setSelectedTid: selectTournament, data, auction };
}

function PageFrame({ title, subtitle, children, context }) {
  return (
    <div className="public-page animate-fade-in" style={{ padding: '1rem 0' }}>
      <div className="page-topline" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <p className="eyebrow" style={{ color: 'var(--accent-secondary)', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>TOURNAMENT VIEW</p>
          <h1 style={{ margin: '0 0 0.25rem 0' }}>{title}</h1>
          <p className="dashboard-subtitle" style={{ color: 'var(--text-secondary)', margin: 0 }}>{subtitle}</p>
        </div>
        <Link to="/" className="btn btn-outline" style={{ textDecoration: 'none' }}>Back to hub</Link>
      </div>
      {context}
      {children}
    </div>
  );
}

function usePublicPage(title, subtitle) {
  const state = useTournamentData();
  if (!state.data) {
    return {
      state,
      context: null,
      page: <PageFrame title={title} subtitle={subtitle}><p className="empty-state">{state.tournaments.length ? 'Loading tournament...' : 'No tournaments available.'}</p></PageFrame>
    };
  }
  return { state, context: null, page: null };
}

function useAllTournamentData() {
  const [tournaments, setTournaments] = useState([]);
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTournaments()
      .then(async items => {
        setTournaments(items);
        const data = await Promise.all(items.map(item => api.getTournamentFull(item.id)));
        setAllData(data);
      })
      .catch(error => console.error('Failed to load all tournament data:', error))
      .finally(() => setLoading(false));
  }, []);

  return { tournaments, allData, loading };
}

function details(data) {
  const teams = data.teams || [];
  const events = data.events || [];
  const scorecards = data.scorecards || [];
  return {
    teams,
    events,
    scorecards,
    players: data.players || [],
    auction: data.auction,
    fixtures: [...(data.fixtures || [])].sort((a, b) => new Date(a.date_time || 0) - new Date(b.date_time || 0)),
    getTeamName: (id, placeholder) => {
      if (id) return teams.find(team => team.id === id)?.name || id;
      return placeholder || 'TBD';
    }
  };
}

// -----------------------------------------------------
// OLD DASHBOARD COMPONENTS
// -----------------------------------------------------

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
            <th style={{ textAlign: 'center' }}>P</th>
            <th style={{ textAlign: 'center' }}>W</th>
            <th style={{ textAlign: 'center' }}>L</th>
            <th style={{ textAlign: 'center' }}>Points</th>
            <th style={{ textAlign: 'center' }}>Event Diff</th>
            <th style={{ textAlign: 'center' }}>Set Pt Diff</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((t, i) => (
            <tr key={t.id}>
              <td>{i + 1}</td>
              <td style={{ fontWeight: 600 }}>{t.name}</td>
              <td style={{ textAlign: 'center' }}>{t.played}</td>
              <td style={{ textAlign: 'center' }}>{t.won}</td>
              <td style={{ textAlign: 'center' }}>{t.lost}</td>
              <td style={{ fontWeight: 700, color: 'var(--accent-primary)', textAlign: 'center' }}>{t.points}</td>
              <td style={{ textAlign: 'center', color: t.eventDiff > 0 ? 'var(--accent-secondary)' : t.eventDiff < 0 ? 'var(--accent-danger)' : 'var(--text-secondary)' }}>{fmtDiff(t.eventDiff)}</td>
              <td style={{ textAlign: 'center', color: t.setPointDiff > 0 ? 'var(--accent-secondary)' : t.setPointDiff < 0 ? 'var(--accent-danger)' : 'var(--text-secondary)' }}>{fmtDiff(t.setPointDiff)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FixtureEventsOverview({ fixture, events, scorecards, getTeamName }) {
  if (!fixture) return null;
  return (
    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-lg)', padding: '1rem', margin: '0.5rem 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {events.map(event => {
          const sc = scorecards.find(s => s.fixture_id === fixture.id && s.event_id === event.id);
          return (
            <div key={event.id} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem',
              background: sc?.status === 'in_progress' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)',
              borderRadius: 'var(--radius-md)',
              opacity: sc ? 1 : 0.6,
              borderLeft: sc?.status === 'in_progress' ? '3px solid var(--accent-secondary)' : '3px solid transparent'
            }}>
              <div style={{ flex: 1, fontWeight: 600, fontSize: '0.9rem' }}>
                {event.name}
                {sc?.event_points === 3 && <span style={{ color: 'var(--accent-primary)', marginLeft: '4px', fontWeight: 'bold' }} title="Bonus Event">(B)</span>}
              </div>

              <div style={{ flex: 1, textAlign: 'right', paddingRight: '1rem', fontSize: '0.85rem' }}>
                {[sc?.team1_player1, sc?.team1_player2].filter(Boolean).join(' & ') || 'TBD'}
              </div>

              <div style={{ width: '130px', textAlign: 'center', fontWeight: 'bold' }}>
                {sc?.status === 'in_progress' ? (
                  <div className="pulse" style={{ color: 'var(--accent-secondary)' }}>
                    <span style={{ fontSize: '1.2rem' }}>{sc.sets[sc.current_set]?.team1_score} - {sc.sets[sc.current_set]?.team2_score}</span>
                    <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>Set {sc.current_set + 1}</div>
                  </div>
                ) : sc?.status === 'completed' ? (
                  <span style={{ color: 'var(--text-primary)' }}>
                    {sc.sets.map(s => `${s.team1_score}-${s.team2_score}`).join(' | ')}
                  </span>
                ) : sc?.status === 'abandoned' ? (
                  <span className="badge badge-abandoned" style={{ padding: '0.2rem 0.5rem' }}>Abandoned</span>
                ) : (
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Upcoming</span>
                )}
              </div>

              <div style={{ flex: 1, textAlign: 'left', paddingLeft: '1rem', fontSize: '0.85rem' }}>
                {[sc?.team2_player1, sc?.team2_player2].filter(Boolean).join(' & ') || 'TBD'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -----------------------------------------------------
// PAGES
// -----------------------------------------------------

export function StandingsPage() {
  const { state, page, context } = usePublicPage('League Standings', 'Track teams, points, and group rankings.');
  if (page) return page;
  const { teams, fixtures, events, scorecards } = details(state.data);
  
  const teamMap = {};
  teams.forEach(t => {
    teamMap[t.id] = { id: t.id, name: t.name, group: t.group, played: 0, won: 0, lost: 0, points: 0, eventDiff: 0, setPointDiff: 0 };
  });

  const completedFixtures = fixtures.filter(f => f.status === 'completed' && f.match_type === 'league');

  completedFixtures.forEach(f => {
    const t1 = teamMap[f.team1_id];
    const t2 = teamMap[f.team2_id];
    if (!t1 || !t2) return;

    const fScorecards = scorecards.filter(sc => sc.fixture_id === f.id && sc.status === 'completed');
    if (fScorecards.length === 0) return;

    let t1EventPts = 0, t2EventPts = 0;
    fScorecards.forEach(sc => {
      const ev = events.find(e => e.id === sc.event_id);
      const pts = sc.event_points !== undefined ? sc.event_points : (ev?.points || 0);
      if (sc.winner === 'team1') t1EventPts += pts;
      else if (sc.winner === 'team2') t2EventPts += pts;
    });

    let t1SetPointDiff = 0, t2SetPointDiff = 0;
    fScorecards.forEach(sc => {
      (sc.sets || []).forEach(s => {
        const s1 = s.team1_score || 0;
        const s2 = s.team2_score || 0;
        t1SetPointDiff += (s1 - s2);
        t2SetPointDiff += (s2 - s1);
      });
    });

    t1.played++;
    t2.played++;

    if (t1EventPts > t2EventPts) {
      t1.won++; t1.points++;
      t2.lost++;
    } else if (t2EventPts > t1EventPts) {
      t2.won++; t2.points++;
      t1.lost++;
    }

    t1.eventDiff += (t1EventPts - t2EventPts);
    t2.eventDiff += (t2EventPts - t1EventPts);
    t1.setPointDiff += t1SetPointDiff;
    t2.setPointDiff += t2SetPointDiff;
  });

  const standings = Object.values(teamMap).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.eventDiff !== a.eventDiff) return b.eventDiff - a.eventDiff;
    return b.setPointDiff - a.setPointDiff;
  });

  const groups = [...new Set(teams.map(t => t.group).filter(Boolean))];

  return (
    <PageFrame title="League Standings" subtitle="Track teams, points, and group rankings." context={context}>
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
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
    </PageFrame>
  );
}

export function SchedulePage() {
  const { state, page, context } = usePublicPage('Schedule', 'Upcoming fixtures and match details.');
  const [expandedFixtures, setExpandedFixtures] = useState({});
  const toggleFixture = (id) => setExpandedFixtures(prev => ({ ...prev, [id]: !prev[id] }));

  if (page) return page;
  const { fixtures, events, scorecards, getTeamName } = details(state.data);
  const scheduleFixtures = fixtures.filter(f => f.status !== 'completed' && f.status !== 'abandoned');

  return (
    <PageFrame title="Schedule" subtitle="Upcoming fixtures and match details." context={context}>
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
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
                  <React.Fragment key={f.id}>
                    <tr onClick={() => toggleFixture(f.id)} style={{ cursor: 'pointer' }} className="hoverable-row">
                      <td style={{ fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {expandedFixtures[f.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          <span>{getTeamName(f.team1_id, f.team1_placeholder)} <span style={{ color: 'var(--text-secondary)' }}>vs</span> {getTeamName(f.team2_id, f.team2_placeholder)}</span>
                        </div>
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>{f.match_type.replace('_', ' ')}</td>
                      <td>{f.date_time ? new Date(f.date_time).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : <span style={{ color: 'var(--text-secondary)' }}>Not Scheduled</span>}</td>
                      <td>
                        <span className={`badge badge-${f.status.replace('_', '-')}`}>
                          {f.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                    {expandedFixtures[f.id] && (
                      <tr>
                        <td colSpan={4} style={{ padding: 0, borderBottom: 'none' }}>
                          <div style={{ padding: '0 1rem' }}>
                            <FixtureEventsOverview fixture={f} events={events} scorecards={scorecards} getTeamName={getTeamName} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageFrame>
  );
}

export function ResultsPage() {
  const { state, page, context } = usePublicPage('Results', 'Completed matches and event scores.');
  const [expandedFixtures, setExpandedFixtures] = useState({});
  const toggleFixture = (id) => setExpandedFixtures(prev => ({ ...prev, [id]: !prev[id] }));

  if (page) return page;
  const { fixtures, events, scorecards, getTeamName } = details(state.data);
  const resultsFixtures = fixtures.filter(f => f.status === 'completed' || f.status === 'abandoned');

  return (
    <PageFrame title="Results" subtitle="Completed matches and event scores." context={context}>
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
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
                  const fScorecards = scorecards.filter(sc => sc.fixture_id === f.id && (sc.status === 'completed' || sc.status === 'abandoned'));
                  let t1pts = 0, t2pts = 0;
                  fScorecards.forEach(sc => {
                    const ev = events.find(e => e.id === sc.event_id);
                    const pts = sc.event_points !== undefined ? sc.event_points : (ev?.points || 0);
                    if (sc.winner === 'team1') t1pts += pts;
                    else if (sc.winner === 'team2') t2pts += pts;
                  });
                  const winnerName = f.status === 'abandoned' ? 'Abandoned' : (t1pts > t2pts ? getTeamName(f.team1_id, f.team1_placeholder) : (t2pts > t1pts ? getTeamName(f.team2_id, f.team2_placeholder) : 'Draw'));
                  return (
                    <React.Fragment key={f.id}>
                      <tr onClick={() => toggleFixture(f.id)} style={{ cursor: 'pointer' }} className="hoverable-row">
                        <td style={{ fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {expandedFixtures[f.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            <span>{getTeamName(f.team1_id, f.team1_placeholder)} <span style={{ color: 'var(--text-secondary)' }}>vs</span> {getTeamName(f.team2_id, f.team2_placeholder)}</span>
                          </div>
                        </td>
                        <td style={{ textTransform: 'capitalize' }}>{f.match_type.replace('_', ' ')}</td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{t1pts} - {t2pts}</span>
                        </td>
                        <td>
                          <span className={`badge ${f.status === 'abandoned' ? 'badge-abandoned' : 'badge-completed'}`}>{winnerName}</span>
                        </td>
                      </tr>
                      {expandedFixtures[f.id] && (
                        <tr>
                          <td colSpan={4} style={{ padding: 0, borderBottom: 'none' }}>
                            <div style={{ padding: '0 1rem' }}>
                              <FixtureEventsOverview fixture={f} events={events} scorecards={scorecards} getTeamName={getTeamName} />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageFrame>
  );
}

export function SquadsPage() {
  const { state, page, context } = usePublicPage('Squads', 'Browse teams, owners, and players.');
  if (page) return page;
  const { teams } = details(state.data);

  return (
    <PageFrame title="Squads" subtitle="Browse teams, owners, and players." context={context}>
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
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
    </PageFrame>
  );
}

export function PlayerEventsPage() {
  const { state, page, context } = usePublicPage('Player Event Count', 'See events played by every player.');
  const [selectedCountTeamId, setSelectedCountTeamId] = useState('');
  
  if (page) return page;
  const { teams, scorecards } = details(state.data);

  const getPlayerEventCounts = () => {
    const counts = {};
    scorecards.forEach(sc => {
      [sc.team1_player1, sc.team1_player2, sc.team2_player1, sc.team2_player2]
        .filter(Boolean)
        .forEach(p => { counts[p] = (counts[p] || 0) + 1; });
    });

    if (!selectedCountTeamId && teams.length > 0) {
       // Optional: set default if you want
    }
    const selectedTeam = teams.find(t => t.id === selectedCountTeamId);
    if (!selectedTeam) return [];

    const teamPlayers = selectedTeam.players_list || [];
    const result = teamPlayers.map(p => {
      const name = typeof p === 'object' ? p.name : p;
      return [name, counts[name] || 0];
    });
    return result.sort((a, b) => b[1] - a[1]);
  };

  const playerCounts = getPlayerEventCounts();

  return (
    <PageFrame title="Player Event Count" subtitle="See events played by every player." context={context}>
      <div className="glass-card">
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
    </PageFrame>
  );
}

// -----------------------------------------------------
// NEW PAGES (From Redesigned Dashboard)
// -----------------------------------------------------

export function PlayerStatsPage() {
  const { state, page, context } = usePublicPage('Player Stats', 'Compare player performance across events.');
  const { allData, loading } = useAllTournamentData();
  if (page || loading) return page || <PageFrame title="Player Stats" subtitle="Compare player performance across events." context={context}><p className="empty-state">Loading tournament statistics...</p></PageFrame>;
  const stats = calculatePlayerStats(allData);
  return (
    <PageFrame title="Player Stats" subtitle="Compare player performance across events." context={context}>
      <div className="table-container">
        <table>
          <thead>
            <tr><th>#</th><th>Player</th><th>Team</th><th>Events</th><th>Wins</th><th>Sets Won</th><th>Sets Lost</th><th>Point Difference</th></tr>
          </thead>
          <tbody>
            {Object.values(stats).sort((a, b) => b.wins - a.wins || b.events - a.events).map((player, index) => 
              <tr key={`${player.team}-${player.name}`}>
                <td>{index + 1}</td>
                <td><strong>{player.name}</strong></td>
                <td>{player.team}</td>
                <td>{player.events}</td>
                <td className="accent-value">{player.wins}</td>
                <td>{player.setsWon}</td>
                <td>{player.setsLost}</td>
                <td>{player.pointDifference > 0 ? `+${player.pointDifference}` : player.pointDifference}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PageFrame>
  );
}

function calculatePlayerStats(tournamentData) {
  const stats = {};
  tournamentData.forEach(data => {
    const { teams, scorecards } = details(data);
    teams.forEach(team => (team.players_list || []).forEach(player => {
      const name = typeof player === 'object' ? player.name : player;
      if (!stats[name]) stats[name] = { name, teams: new Set(), events: 0, wins: 0, setsWon: 0, setsLost: 0, pointDifference: 0 };
      stats[name].teams.add(team.name);
    }));
    scorecards.forEach(score => {
      [['team1', score.winner === 'team1'], ['team2', score.winner === 'team2']].forEach(([side, won]) => {
        [score[`${side}_player1`], score[`${side}_player2`]].filter(Boolean).forEach(name => {
          if (!stats[name]) stats[name] = { name, teams: new Set(), events: 0, wins: 0, setsWon: 0, setsLost: 0, pointDifference: 0 };
          stats[name].events++;
          if (won) stats[name].wins++;
          (score.sets || []).forEach(set => {
            const own = set[`${side}_score`] || 0;
            const opponent = set[side === 'team1' ? 'team2_score' : 'team1_score'] || 0;
            if (own > opponent) stats[name].setsWon++;
            if (own < opponent) stats[name].setsLost++;
            stats[name].pointDifference += own - opponent;
          });
        });
      });
    });
  });
  return Object.values(stats).map(player => ({ ...player, team: [...player.teams].join(', ') || 'Unassigned' }));
}

function mvpWeight(eventName = '') { 
  const name = eventName.toLowerCase(); 
  if (name.includes('mixed') && name.includes('doubles')) return 1.3; 
  if (name.includes('doubles')) return 1.15; 
  return 1; 
}

function calculateMvp(tournamentData) {
  const players = {}; 
  tournamentData.forEach(data => {
    const { teams, events, scorecards } = details(data);
    teams.forEach(team => (team.players_list || []).forEach(player => {
      const name = typeof player === 'object' ? player.name : player;
      if (!players[name]) players[name] = { name, teams: new Set(), events: 0, wins: 0, losses: 0, pointDifference: 0, mvpPoints: 0 };
      players[name].teams.add(team.name);
    }));
    scorecards.filter(score => score.status === 'completed' && score.winner).forEach(score => {
      const event = events.find(item => item.id === score.event_id);
      const weight = mvpWeight(event?.name);
      [['team1', score.winner === 'team1'], ['team2', score.winner === 'team2']].forEach(([side, won]) => {
        [score[`${side}_player1`], score[`${side}_player2`]].filter(Boolean).forEach(name => {
          if (!players[name]) players[name] = { name, teams: new Set(), events: 0, wins: 0, losses: 0, pointDifference: 0, mvpPoints: 0 };
          let pointDifference = 0;
          (score.sets || []).forEach(set => {
            pointDifference += (set[`${side}_score`] || 0) - (set[side === 'team1' ? 'team2_score' : 'team1_score'] || 0);
          });
          players[name].events++;
          players[name].pointDifference += pointDifference;
          if (won) players[name].wins++;
          else players[name].losses++;
          players[name].mvpPoints += ((won ? 10 : 3) + pointDifference * 0.2) * weight;
        });
      }); 
    }); 
  }); 
  return Object.values(players).map(player => ({ ...player, team: [...player.teams].join(', ') || 'Unassigned' })).sort((a, b) => {
    const mvpDifference = b.mvpPoints - a.mvpPoints; 
    if (Math.abs(mvpDifference) <= 0.5) return b.wins / (b.events || 1) - a.wins / (a.events || 1) || b.pointDifference - a.pointDifference; 
    return mvpDifference; 
  }); 
}

export function MvpPage() { 
  const { state, page, context } = usePublicPage('Tournament MVP', 'Identify the most valuable player using weighted match performance.'); 
  const { allData, loading } = useAllTournamentData();
  if (page || loading) return page || <PageFrame title="Tournament MVP" subtitle="Identify the most valuable player using weighted match performance." context={context}><p className="empty-state">Loading tournament MVP data...</p></PageFrame>;
  const players = calculateMvp(allData); 
  const winner = players[0]; 
  return (
    <PageFrame title="Tournament MVP" subtitle="Identify the most valuable player using weighted match performance." context={context}>
      {winner?.events ? 
        <>
          <section className="glass-card" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <p className="eyebrow" style={{ color: 'var(--accent-secondary)', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>MOST VALUABLE PLAYER</p>
            <h2 style={{ margin: '0.25rem 0' }}>{winner.name}</h2>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{winner.team} · {winner.mvpPoints.toFixed(2)} MVP points</p>
          </section>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>#</th><th>Player</th><th>Team</th><th>MVP Points</th><th>Events</th><th>Wins</th><th>Lost</th><th>Win %</th><th>Net Diff</th></tr>
              </thead>
              <tbody>
                {players.filter(player => player.events).map((player, index) => 
                  <tr key={`${player.team}-${player.name}`}>
                    <td>{index + 1}</td>
                    <td><strong>{player.name}</strong></td>
                    <td>{player.team}</td>
                    <td className="accent-value">{player.mvpPoints.toFixed(2)}</td>
                    <td>{player.events}</td>
                    <td>{player.wins}</td>
                    <td>{player.losses}</td>
                    <td>{((player.wins / player.events) * 100).toFixed(1)}%</td>
                    <td>{player.pointDifference > 0 ? `+${player.pointDifference}` : player.pointDifference}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </> : <p className="empty-state">No completed events available for MVP scoring.</p>}
    </PageFrame>
  ); 
}
