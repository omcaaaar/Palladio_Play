import React, { useState, useEffect, useRef } from 'react';
import { Activity, Trophy, Users, ChevronDown, ChevronRight, Gavel, AlertCircle, Clock, CalendarDays, ListChecks, UserRound, BarChart3, Play, Edit, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';
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


const tiles = [
  { title: 'Schedule', description: 'Upcoming fixtures and match details', path: '/schedule', icon: CalendarDays, tone: 'blue' },
  { title: 'Results', description: 'Completed matches and event scores', path: '/results', icon: ListChecks, tone: 'green' },
  { title: 'Standings', description: 'Track teams, points, and group rankings', path: '/standings', icon: Trophy, tone: 'gold' },
  { title: 'Squads', description: 'Browse teams, owners, and players', path: '/squads', icon: Users, tone: 'violet' },
  { title: 'Player Event Count', description: 'See events played by every player', path: '/player-events', icon: UserRound, tone: 'cyan' },
  { title: 'Player Stats', description: 'Compare player performance across events', path: '/player-stats', icon: BarChart3, tone: 'orange' },
  { title: 'Tournament MVP', description: 'Find the most valuable player', path: '/mvp', icon: Trophy, tone: 'gold' },
];

export default function Dashboard() {

  const [tournaments, setTournaments] = useState([]);
  const [selectedTid, setSelectedTid] = useState('');
  const [tournamentData, setTournamentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const wsRef = useRef(null);

  // Live score state
  const [liveScorecards, setLiveScorecards] = useState([]);
  const [liveAuction, setLiveAuction] = useState(null);

  // Schedule/Results expansion state
  const [expandedFixtures, setExpandedFixtures] = useState({});
  const toggleFixture = (id) => setExpandedFixtures(prev => ({ ...prev, [id]: !prev[id] }));

  useEffect(() => {
    api.getTournaments().then(data => {
      setTournaments(data);
      const savedTid = localStorage.getItem('selectedTournamentId');
      const initialTid = data.some(t => t.id === savedTid) ? savedTid : (data.length > 0 ? data[0].id : '');
      if (initialTid) {
        setSelectedTid(initialTid);
        localStorage.setItem('selectedTournamentId', initialTid);
      }
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
        <h1>Tournament Hub</h1>
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

  function getTeamName(id, placeholder) {
    if (id) return teams.find(t => t.id === id)?.name || id;
    return 'TBD';
  }
  function getEventName(id) {
    return events.find(e => e.id === id)?.name || id;
  }

  const scheduleFixtures = fixtures.filter(f => f.status !== 'completed' && f.status !== 'abandoned');
  const resultsFixtures = fixtures.filter(f => f.status === 'completed' || f.status === 'abandoned');

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
          <h1>Tournament Hub</h1>
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
        <select className="form-input" style={{ maxWidth: '400px' }} value={selectedTid} onChange={e => {
          setSelectedTid(e.target.value);
          localStorage.setItem('selectedTournamentId', e.target.value);
        }}>
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
                  {getTeamName(fixture.team1_id, fixture.team1_placeholder)} <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0.5rem' }}>vs</span> {getTeamName(fixture.team2_id, fixture.team2_placeholder)}
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
              {getTeamName(upcomingMatch.team1_id, upcomingMatch.team1_placeholder)} <span style={{ color: 'var(--text-secondary)', fontSize: '1rem', margin: '0 0.5rem' }}>vs</span> {getTeamName(upcomingMatch.team2_id, upcomingMatch.team2_placeholder)}
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
          </div>
          <DashboardAuctionTable auction={liveAuction} teams={teams} />
        </div>
      )}

      {/* ── Registration Tiles ── */}
      {(() => {
        const tournament = tournamentData?.tournament || {};
        const deadline = tournament.registration_deadline;
        const players = tournamentData?.players || [];
        const hasSquads = (tournamentData?.teams || []).some(t => t.players_list && t.players_list.length > 0);

        const showRegister = deadline && new Date(deadline) > new Date();
        const showRegisteredPlayers = players.length > 0 && !hasSquads;

        const formatDeadlineShort = (d) => {
          try {
            return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
          } catch { return ''; }
        };

        if (!showRegister && !showRegisteredPlayers) return null;

        return (
          <div className="dashboard-tiles" style={{ marginBottom: '0.5rem' }}>
            {showRegister && (
              <Link to={`/register?tid=${selectedTid}`} className="dashboard-tile tile-green" style={{ borderColor: 'rgba(16, 185, 129, 0.4)' }}>
                <span className="tile-icon" aria-hidden="true">
                  <Edit size={25} strokeWidth={2.25} />
                </span>
                <span className="tile-copy">
                  <strong>Register Now</strong>
                  <span>Register before {formatDeadlineShort(deadline)}</span>
                </span>
                <span className="tile-arrow" aria-hidden="true">→</span>
              </Link>
            )}
            {showRegisteredPlayers && (
              <Link to={`/registered-players?tid=${selectedTid}`} className="dashboard-tile tile-cyan">
                <span className="tile-icon" aria-hidden="true">
                  <ClipboardList size={25} strokeWidth={2.25} />
                </span>
                <span className="tile-copy">
                  <strong>Registered Players ({players.length})</strong>
                  <span>View who has registered so far</span>
                </span>
                <span className="tile-arrow" aria-hidden="true">→</span>
              </Link>
            )}
          </div>
        );
      })()}

      {/* ── Navigation Tiles ── */}
      <div className="dashboard-tiles">
        {tiles.map(({ title, description, path, icon: Icon, tone }) => (
          <Link key={title} to={path} className={`dashboard-tile tile-${tone}`}>
            <span className="tile-icon" aria-hidden="true">
              <Icon size={25} strokeWidth={2.25} />
            </span>
            <span className="tile-copy">
              <strong>{title}</strong>
              <span>{description}</span>
            </span>
            <span className="tile-arrow" aria-hidden="true">→</span>
          </Link>
        ))}
      </div>

      {/* ── Palladio Community Section ── */}
      <div style={{ marginTop: '2.5rem' }}>
        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '3px',
            height: '24px',
            background: 'linear-gradient(to bottom, #a78bfa, #f472b6)',
            borderRadius: '2px',
          }} />
          <h2 style={{
            margin: 0,
            fontSize: '1.3rem',
            background: 'linear-gradient(to right, #a78bfa, #f472b6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Palladio Community
          </h2>
        </div>
        <div className="dashboard-tiles">
          <Link to="/global-players" className="dashboard-tile tile-violet" style={{
            borderColor: 'rgba(167, 139, 250, 0.3)',
          }}>
            <span className="tile-icon" aria-hidden="true">
              <Users size={25} strokeWidth={2.25} />
            </span>
            <span className="tile-copy">
              <strong>Global Player Profiles</strong>
              <span>Search and explore player stats across all tournaments</span>
            </span>
            <span className="tile-arrow" aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function DashboardAuctionTable({ auction, teams }) {
  if (!auction || !auction.team_players) return null;

  const { max_players, team_players } = auction;
  const auctionTeams = teams.filter(t => team_players[t.id] !== undefined);

  if (auctionTeams.length === 0) {
    return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No players assigned yet.</p>;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
      {auctionTeams.map((team) => {
        const players = team_players[team.id] || [];
        const playersRemaining = Number(max_players || 0) - players.length;

        return (
          <div key={team.id} style={{ border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <div style={{ padding: '0.85rem 1rem', background: 'rgba(59, 130, 246, 0.08)' }}>
              <h4 style={{ margin: 0 }}>
                {team.name}
                {team.owners && <span style={{ fontWeight: 400, fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--text-secondary)', display: 'block', marginTop: '0.2rem' }}>Owner: {team.owners}</span>}
              </h4>
            </div>
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', marginBottom: '0.2rem' }}>Players left</div>
                <strong style={{ color: playersRemaining > 0 ? 'var(--text-primary)' : 'var(--accent-secondary)', fontSize: '0.95rem' }}>{playersRemaining}</strong>
              </div>
            </div>
            <div className="table-container" style={{ border: 0, borderRadius: 0 }}>
              <table style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Player</th>
                    <th style={{ textAlign: 'center' }}>Gender</th>
                  </tr>
                </thead>
                <tbody>
                  {players.length === 0 ? (
                    <tr>
                      <td colSpan="2" style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>No players assigned</td>
                    </tr>
                  ) : (
                    players.map((player, index) => (
                      <tr key={`${team.id}-${player.name}-${index}`}>
                        <td>{player.name}</td>
                        <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{player.gender}</td>
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
