import React, { useState, useEffect, useRef } from 'react';
import { Activity, Trophy, Users, ChevronDown, ChevronRight, Gavel, ZoomIn, ZoomOut, AlertCircle, Clock } from 'lucide-react';
import * as api from '../api/client';

const YoutubeIcon = ({ size = 24, color = "currentColor", ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    {...props}
  >
    <path fill={color} d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
    <polygon fill="#ffffff" points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
  </svg>
);

export default function Dashboard() {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTid, setSelectedTid] = useState('');
  const [tournamentData, setTournamentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const wsRef = useRef(null);

  // Live score state
  const [liveScorecards, setLiveScorecards] = useState([]);
  const [selectedCountTeamId, setSelectedCountTeamId] = useState('');
  const [liveAuction, setLiveAuction] = useState(null);

  // Schedule/Results expansion state
  const [expandedFixtures, setExpandedFixtures] = useState({});
  const toggleFixture = (id) => setExpandedFixtures(prev => ({ ...prev, [id]: !prev[id] }));

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
      if (msg.type === 'score_update' || msg.type === 'scorecard_created' || msg.type === 'scorecard_completed' || msg.type === 'scorecard_updated' || msg.type === 'tournament_updated') {
        // Reload tournament data on any score or tournament update
        if (selectedTid) loadTournament(selectedTid);
      }
    });
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, [selectedTid]);

  async function loadTournament(tid) {
    setLoading(true);
    try {
      const data = await api.getTournamentFull(tid);
      console.log('Reloaded tournamentData:', data);
      setTournamentData(data);
      // Separate live (in_progress) scorecards
      setLiveScorecards((data.scorecards || []).filter(sc => sc.status === 'in_progress'));
      // Fetch live auction
      try {
        const auctionData = await api.getPublicAuction(tid);
        setLiveAuction(auctionData && auctionData.status === 'live' ? auctionData : null);
      } catch (e) { setLiveAuction(null); }
      // Default to first team for player counts
      if (data.teams && data.teams.length > 0) {
        setSelectedCountTeamId(data.teams[0].id);
      } else {
        setSelectedCountTeamId('');
      }
    } catch (e) { console.error('Failed to load tournament:', e); }
    setLoading(false);
  }

  // Poll for live auction updates every 5 seconds
  useEffect(() => {
    if (!selectedTid) return;
    const interval = setInterval(async () => {
      try {
        const auctionData = await api.getPublicAuction(selectedTid);
        setLiveAuction(auctionData && auctionData.status === 'live' ? auctionData : null);
      } catch (e) { /* ignore polling errors */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedTid]);

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
  const liveFixtures = fixtures.filter(f => f.status === 'in_progress');

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
        const pts = sc.event_points !== undefined ? sc.event_points : (ev?.points || 0);
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

  // ── Upcoming Match Flashcard Logic ──
  let showUpcomingFlashCard = false;
  let upcomingMatch = null;
  let remainingEvents = 0;
  let hasLiveMatch = false;

  const pureUpcomingFixtures = scheduleFixtures.filter(f => f.status !== 'in_progress');
  if (pureUpcomingFixtures.length > 0) {
    upcomingMatch = pureUpcomingFixtures[0];
    const combinationsSaved = scorecards.some(sc => sc.fixture_id === upcomingMatch.id);

    if (!combinationsSaved) {
      if (liveFixtures.length > 0) {
        hasLiveMatch = true;
        const liveMatch = liveFixtures[0];

        const startedLiveEvents = scorecards.filter(sc => sc.fixture_id === liveMatch.id && (sc.status === 'completed' || sc.status === 'in_progress')).length;
        remainingEvents = events.length - startedLiveEvents;

        const liveDateStr = liveMatch.date_time ? new Date(liveMatch.date_time).toDateString() : null;
        const upcomingDateStr = upcomingMatch.date_time ? new Date(upcomingMatch.date_time).toDateString() : null;
        const isSameDay = (!liveDateStr || !upcomingDateStr) || (liveDateStr === upcomingDateStr);

        if (remainingEvents <= 4 && isSameDay) {
          showUpcomingFlashCard = true;
        }
      } else {
        const lastMatch = resultsFixtures.length > 0 ? resultsFixtures[resultsFixtures.length - 1] : null;
        if (lastMatch) {
          const lastDateStr = lastMatch.date_time ? new Date(lastMatch.date_time).toDateString() : null;
          const upcomingDateStr = upcomingMatch.date_time ? new Date(upcomingMatch.date_time).toDateString() : null;
          const isSameDay = (!lastDateStr || !upcomingDateStr) || (lastDateStr === upcomingDateStr);
          if (isSameDay) {
            showUpcomingFlashCard = true;
          }
        } else {
          const upcomingDateStr = upcomingMatch.date_time ? new Date(upcomingMatch.date_time).toDateString() : null;
          if (!upcomingDateStr || upcomingDateStr === new Date().toDateString()) {
            showUpcomingFlashCard = true;
          }
        }
      }
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Tournament Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Live updates, standings, and schedule</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {(() => {
            const currentT = tournamentData?.tournament || tournaments.find(t => t.id === selectedTid) || {};
            const yLink = currentT.youtube_link || import.meta.env.VITE_YOUTUBE_HANDLE;
            const isLive = currentT.is_live;

            if (!yLink) return null;

            return (
              <a
                href={isLive ? `https://youtube.com/${yLink}/live` : undefined}
                target={isLive ? "_blank" : undefined}
                rel={isLive ? "noopener noreferrer" : undefined}
                className="btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'transparent',
                  color: isLive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: isLive ? '1px solid #ffffff' : '1px solid var(--glass-border)',
                  textDecoration: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 600,
                  cursor: isLive ? 'pointer' : 'not-allowed',
                  opacity: 1,
                  pointerEvents: isLive ? 'auto' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <YoutubeIcon size={30} color={isLive ? "#ff0000" : "currentColor"} className={isLive ? "pulse" : ""} />
                Watch Live
              </a>
            );
          })()}
          {liveFixtures.length > 0 && (
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
      {liveFixtures.length > 0 && (
        <div className="glass-card" style={{ marginBottom: '1.5rem', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Activity size={20} color="var(--accent-secondary)" className="pulse" />
            <h3 style={{ margin: 0, color: 'var(--accent-secondary)' }}>Live Match</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {liveFixtures.map(fixture => (
              <div key={fixture.id} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-lg)', padding: '1rem' }}>
                <h4 style={{ textAlign: 'center', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>
                  {getTeamName(fixture.team1_id)} <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0.5rem' }}>vs</span> {getTeamName(fixture.team2_id)}
                </h4>
                <FixtureEventsOverview fixture={fixture} events={events} scorecards={scorecards} getTeamName={getTeamName} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Upcoming Match Flashcard ── */}
      {showUpcomingFlashCard && upcomingMatch && (
        <div className="glass-card animate-fade-in alert-flash" style={{
          marginBottom: '1.5rem',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Decorative glowing orb */}
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '150px',
            height: '150px',
            background: 'radial-gradient(circle, rgba(245, 158, 11, 0.3) 0%, transparent 70%)',
            borderRadius: '50%',
            pointerEvents: 'none'
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', position: 'relative', zIndex: 1 }}>
            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '0.5rem',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertCircle size={24} color="#f59e0b" className="pulse" />
            </div>
            <h3 style={{ margin: 0, color: '#f59e0b', textShadow: '0 0 10px rgba(245, 158, 11, 0.3)' }}>
              Upcoming Match Alert
            </h3>
          </div>

          <div style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            position: 'relative',
            zIndex: 1
          }}>
            <h4 style={{ textAlign: 'center', margin: '0 0 0.5rem 0', fontSize: '1.4rem', color: 'var(--text-primary)' }}>
              {getTeamName(upcomingMatch.team1_id)} <span style={{ color: 'var(--text-secondary)', fontSize: '1rem', margin: '0 0.5rem' }}>vs</span> {getTeamName(upcomingMatch.team2_id)}
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Clock size={18} color="#fbbf24" />
              <p style={{ textAlign: 'center', color: '#fbbf24', fontSize: '1.05rem', margin: 0, fontWeight: 500 }}>
                {hasLiveMatch
                  ? (remainingEvents === 0
                    ? "The final event of the live match is currently playing!"
                    : `Only ${remainingEvents} event${remainingEvents !== 1 ? 's' : ''} remaining in the current live match!`)
                  : `Next match is starting soon!`}
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.15)',
              padding: '1rem 1.5rem',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
              borderLeft: '4px solid #f59e0b',
              boxShadow: 'inset 0 0 10px rgba(245, 158, 11, 0.05)'
            }}>
              <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: '1.6', fontSize: '1rem' }}>
                <strong style={{ color: '#f59e0b' }}>Team Owners & Players:</strong> It's time to submit your combinations and report to the court.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Live Auction ── */}
      {liveAuction && (
        <div className="glass-card" style={{ marginBottom: '1.5rem', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Gavel size={20} color="#ef4444" />
            <h3 style={{ margin: 0, color: '#ef4444' }}>Live Auction</h3>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', fontWeight: 600 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 1.5s infinite' }} /> LIVE
            </span>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            <span>Max Players: <b style={{ color: 'var(--text-primary)' }}>{liveAuction.max_players}</b></span>
            <span>Total Points: <b style={{ color: 'var(--text-primary)' }}>{liveAuction.total_points}</b></span>
            <span>Starting Bid: <b style={{ color: 'var(--text-primary)' }}>{liveAuction.starting_bid}</b></span>
          </div>
          <DashboardAuctionTable auction={liveAuction} teams={teams} />
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
                  <React.Fragment key={f.id}>
                    <tr onClick={() => toggleFixture(f.id)} style={{ cursor: 'pointer' }} className="hoverable-row">
                      <td style={{ fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {expandedFixtures[f.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          <span>{getTeamName(f.team1_id)} <span style={{ color: 'var(--text-secondary)' }}>vs</span> {getTeamName(f.team2_id)}</span>
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
                    const pts = sc.event_points !== undefined ? sc.event_points : (ev?.points || 0);
                    if (sc.winner === 'team1') t1pts += pts;
                    else if (sc.winner === 'team2') t2pts += pts;
                  });
                  const winnerName = t1pts > t2pts ? getTeamName(f.team1_id) : (t2pts > t1pts ? getTeamName(f.team2_id) : 'Draw');
                  return (
                    <React.Fragment key={f.id}>
                      <tr onClick={() => toggleFixture(f.id)} style={{ cursor: 'pointer' }} className="hoverable-row">
                        <td style={{ fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {expandedFixtures[f.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            <span>{getTeamName(f.team1_id)} <span style={{ color: 'var(--text-secondary)' }}>vs</span> {getTeamName(f.team2_id)}</span>
                          </div>
                        </td>
                        <td style={{ textTransform: 'capitalize' }}>{f.match_type.replace('_', ' ')}</td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{t1pts} - {t2pts}</span>
                        </td>
                        <td>
                          <span className="badge badge-completed">{winnerName}</span>
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

function DashboardAuctionTable({ auction, teams }) {
  const [zoomLevel, setZoomLevel] = useState(1);
  if (!auction || !auction.team_players) return null;

  const { max_players, total_points, starting_bid, team_players } = auction;
  const auctionTeams = teams.filter(t => team_players[t.id] !== undefined);

  const chunkedTeams = [];
  for (let i = 0; i < auctionTeams.length; i += 5) {
    chunkedTeams.push(auctionTeams.slice(i, i + 5));
  }

  const summaryRowStyle = { fontWeight: 700, fontSize: '0.85rem', padding: '0.6rem 0.75rem' };
  const summaryLabelStyle = { ...summaryRowStyle, color: 'var(--text-secondary)', textAlign: 'left' };
  const summaryValueStyle = { ...summaryRowStyle, textAlign: 'center' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '-1rem' }}>
        <button onClick={() => setZoomLevel(z => Math.max(0.1, Number((z - 0.1).toFixed(1))))} className="btn btn-outline" style={{ padding: '0.5rem' }} title="Zoom Out"><ZoomOut size={16} /></button>
        <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', minWidth: '40px', justifyContent: 'center' }}>{Math.round(zoomLevel * 100)}%</span>
        <button onClick={() => setZoomLevel(z => Math.min(2.0, Number((z + 0.1).toFixed(1))))} className="btn btn-outline" style={{ padding: '0.5rem' }} title="Zoom In"><ZoomIn size={16} /></button>
      </div>
      {chunkedTeams.map((chunk, chunkIdx) => (
        <div key={chunkIdx} style={{ overflowX: 'auto', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-lg)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', zoom: zoomLevel }}>
            <thead>
              <tr>
                {chunk.map((team, idx) => (
                  <th key={team.id} colSpan={4} style={{
                    textAlign: 'center', padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)',
                    borderBottom: '2px solid var(--glass-border)', fontSize: '0.95rem', fontWeight: 700,
                    borderLeft: idx > 0 ? '2px solid rgba(255, 255, 255, 0.15)' : 'none'
                  }}>
                    {team.name}
                    {team.owners && <span style={{ fontWeight: 400, fontSize: '0.6rem', fontStyle: 'italic', color: 'var(--text-secondary)', display: 'block' }}>Owner: {team.owners}</span>}
                  </th>
                ))}
              </tr>
              <tr>
                {chunk.map((team, idx) => (
                  <React.Fragment key={`sub-${team.id}`}>
                    <th style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--glass-border)', fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', width: '40px', borderLeft: idx > 0 ? '2px solid rgba(255, 255, 255, 0.15)' : 'none' }}>No.</th>
                    <th style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--glass-border)', fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'left' }}>Player</th>
                    <th style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--glass-border)', fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Gender</th>
                    <th style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--glass-border)', fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Pts</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: max_players }).map((_, rowIdx) => (
                <tr key={rowIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {chunk.map((team, idx) => {
                    const players = team_players[team.id] || [];
                    const player = players[rowIdx];
                    return (
                      <React.Fragment key={`${team.id}-${rowIdx}`}>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', borderLeft: idx > 0 ? '2px solid rgba(255, 255, 255, 0.15)' : 'none' }}>{rowIdx + 1}</td>
                        <td style={{ padding: '0.5rem 0.75rem', fontWeight: player ? 500 : 400, color: player ? 'var(--text-primary)' : 'rgba(255,255,255,0.15)' }}>
                          {player ? player.name : '—'}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center', color: player ? 'var(--text-secondary)' : 'rgba(255,255,255,0.1)', fontSize: '0.8rem' }}>
                          {player ? (player.gender === 'Male' ? 'M' : 'F') : '—'}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center', fontWeight: player ? 600 : 400, color: player ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)' }}>
                          {player ? player.points : '—'}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}

              <tr><td colSpan={chunk.length * 4} style={{ padding: 0, height: '4px', background: 'var(--glass-border)' }}></td></tr>

              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                {chunk.map((team, idx) => {
                  const consumed = (team_players[team.id] || []).reduce((s, p) => s + (p.points || 0), 0);
                  return (<React.Fragment key={`c-${team.id}`}><td colSpan={3} style={{ ...summaryLabelStyle, borderLeft: idx > 0 ? '2px solid rgba(255, 255, 255, 0.15)' : 'none' }}>Points Consumed</td><td style={{ ...summaryValueStyle, color: 'var(--accent-primary)' }}>{consumed}</td></React.Fragment>);
                })}
              </tr>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                {chunk.map((team, idx) => {
                  const left = total_points - (team_players[team.id] || []).reduce((s, p) => s + (p.points || 0), 0);
                  return (<React.Fragment key={`l-${team.id}`}><td colSpan={3} style={{ ...summaryLabelStyle, borderLeft: idx > 0 ? '2px solid rgba(255, 255, 255, 0.15)' : 'none' }}>Points Left</td><td style={{ ...summaryValueStyle, color: left > 0 ? 'var(--accent-secondary)' : 'var(--accent-danger)' }}>{left}</td></React.Fragment>);
                })}
              </tr>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                {chunk.map((team, idx) => {
                  const playersLeft = max_players - (team_players[team.id] || []).length;
                  return (<React.Fragment key={`pl-${team.id}`}><td colSpan={3} style={{ ...summaryLabelStyle, borderLeft: idx > 0 ? '2px solid rgba(255, 255, 255, 0.15)' : 'none' }}>Players Left</td><td style={{ ...summaryValueStyle, color: playersLeft > 0 ? 'var(--text-primary)' : 'var(--accent-secondary)' }}>{playersLeft}</td></React.Fragment>);
                })}
              </tr>
              <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                {chunk.map((team, idx) => {
                  const players = team_players[team.id] || [];
                  const pointsLeft = total_points - players.reduce((s, p) => s + (p.points || 0), 0);
                  const playersLeft = max_players - players.length;
                  const maxBid = playersLeft > 0 ? pointsLeft - ((playersLeft - 1) * starting_bid) : 0;
                  return (<React.Fragment key={`mb-${team.id}`}><td colSpan={3} style={{ ...summaryLabelStyle, color: 'var(--accent-primary)', borderLeft: idx > 0 ? '2px solid rgba(255, 255, 255, 0.15)' : 'none' }}>Max Bid</td><td style={{ ...summaryValueStyle, color: maxBid > 0 ? '#f59e0b' : 'var(--accent-danger)', fontSize: '1rem' }}>{maxBid > 0 ? maxBid : 0}</td></React.Fragment>);
                })}
              </tr>
            </tbody>
          </table>
        </div>
      ))}
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
