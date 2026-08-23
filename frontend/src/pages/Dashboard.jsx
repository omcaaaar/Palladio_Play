import { Activity, BarChart3, CalendarDays, Gavel, ListChecks, Play, Trophy, Users, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import * as api from '../api/client';

const tiles = [
  { title: 'Schedule', description: 'Upcoming fixtures and match details', path: '/schedule', icon: CalendarDays, tone: 'blue' },
  { title: 'Results', description: 'Completed matches and event scores', path: '/results', icon: ListChecks, tone: 'green' },
  { title: 'Live Auction', description: 'Follow the player auction in real time', path: '/auction', icon: Gavel, tone: 'red' },
  { title: 'Standings', description: 'Track teams, points, and group rankings', path: '/standings', icon: Trophy, tone: 'gold' },
  { title: 'Squads', description: 'Browse teams, owners, and players', path: '/squads', icon: Users, tone: 'violet' },
  { title: 'Player Event', description: 'See events played by every player', path: '/player-events', icon: UserRound, tone: 'cyan' },
  { title: 'Player Stats', description: 'Compare player performance across events', path: '/player-stats', icon: BarChart3, tone: 'orange' },
  { title: 'Tournament MVP', description: 'Find the most valuable player', path: '/mvp', icon: Trophy, tone: 'gold' },
];

function UpcomingMatchAlert({ tournament }) {
  const fixtures = (tournament?.fixtures || [])
    .filter(fixture => fixture.status === 'pending')
    .sort((a, b) => {
      if (!a.date_time) return 1;
      if (!b.date_time) return -1;
      return new Date(a.date_time) - new Date(b.date_time);
    });
  const fixture = fixtures[0];
  if (!fixture) return null;

  const teams = tournament.teams || [];
  const getTeamName = id => teams.find(team => team.id === id)?.name || id || 'TBD';
  const matchName = `${getTeamName(fixture.team1_id)} vs ${getTeamName(fixture.team2_id)}`;
  const scheduledTime = fixture.date_time
    ? new Date(fixture.date_time).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : 'Time not scheduled';

  return <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem', borderColor: 'rgba(245, 158, 11, 0.35)', background: 'rgba(245, 158, 11, 0.08)', flexWrap: 'wrap' }}><div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><CalendarDays size={22} color="#f59e0b" /><div><strong style={{ display: 'block' }}>Upcoming Match</strong><span style={{ color: 'var(--text-secondary)' }}>{matchName} · {scheduledTime}</span></div></div><Link to="/schedule" className="btn btn-outline" style={{ whiteSpace: 'nowrap' }}>View Schedule</Link></div>;
}

function LiveMatchAlert({ tournament }) {
  const fixture = (tournament?.fixtures || []).find(item => item.status === 'in_progress');
  if (!fixture) return null;

  const teams = tournament.teams || [];
  const events = tournament.events || [];
  const scorecards = (tournament.scorecards || []).filter(score => score.fixture_id === fixture.id && score.status !== 'completed' && score.status !== 'abandoned');
  const getTeamName = id => teams.find(team => team.id === id)?.name || id || 'TBD';
  const scoreText = score => {
    if (score.status === 'pending') return 'Upcoming';
    if (score.status === 'on_hold') return 'On hold';
    const sets = score.sets || [];
    if (!sets.length) return 'LIVE';
    return sets.map((set, index) => `${index === score.current_set ? '[' : ''}${set.team1_score || 0}-${set.team2_score || 0}${index === score.current_set ? ']' : ''}`).join('  ');
  };

  return <div className="glass-card" style={{ marginBottom: '1.5rem', borderColor: 'rgba(16, 185, 129, 0.35)', background: 'rgba(16, 185, 129, 0.08)' }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}><div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Activity size={22} color="var(--accent-secondary)" className="pulse" /><div><strong style={{ display: 'block', color: 'var(--accent-secondary)' }}>Live Match</strong><span style={{ color: 'var(--text-secondary)' }}>{getTeamName(fixture.team1_id)} vs {getTeamName(fixture.team2_id)}</span></div></div><Link to="/schedule" className="btn btn-outline" style={{ whiteSpace: 'nowrap' }}>View Match</Link></div>{scorecards.length ? <div style={{ display: 'grid', gap: '0.5rem' }}>{scorecards.map(score => { const event = events.find(item => item.id === score.event_id); const players = [[score.team1_player1, score.team1_player2].filter(Boolean).join(' & ') || 'TBD', [score.team2_player1, score.team2_player2].filter(Boolean).join(' & ') || 'TBD']; const statusColor = score.status === 'pending' ? '#f59e0b' : score.status === 'on_hold' ? 'var(--text-secondary)' : 'var(--accent-secondary)'; return <div key={score.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(130px, 0.9fr) minmax(120px, 1fr) minmax(120px, auto) minmax(120px, 1fr)', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)' }}><strong>{event?.name || 'Event'}</strong><span>{players[0]}</span><strong style={{ whiteSpace: 'nowrap', textAlign: 'center', color: statusColor }}>{scoreText(score)}</strong><span style={{ textAlign: 'right' }}>{players[1]}</span></div>; })}</div> : <span style={{ color: 'var(--text-secondary)' }}>Live match is being prepared.</span>}</div>;
}

export default function Dashboard() {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTid, setSelectedTid] = useState('');
  const [tournament, setTournament] = useState(null);
  const [isAuctionLive, setIsAuctionLive] = useState(false);

  useEffect(() => {
    api.getTournaments().then(tournaments => {
      setTournaments(tournaments);
      const savedTid = localStorage.getItem('selectedTournamentId');
      const initialTid = tournaments.some(item => item.id === savedTid) ? savedTid : tournaments[0]?.id || '';
      setSelectedTid(initialTid);
      if (initialTid) localStorage.setItem('selectedTournamentId', initialTid);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedTid) {
      api.getTournamentFull(selectedTid).then(setTournament).catch(() => {});
      api.getPublicAuction(selectedTid).then(auction => setIsAuctionLive(auction?.status === 'live')).catch(() => setIsAuctionLive(false));
    }
  }, [selectedTid]);

  const handleTournamentChange = event => {
    const tid = event.target.value;
    setSelectedTid(tid);
    localStorage.setItem('selectedTournamentId', tid);
  };

  const youtubeLink = tournament?.tournament?.youtube_link || import.meta.env.VITE_YOUTUBE_HANDLE;
  const isLive = tournament?.tournament?.is_live;

  return <div className="dashboard-home animate-fade-in"><div className="dashboard-heading"><div><p className="eyebrow">PALLADIO PLAY</p><h1>Tournament Hub</h1><p className="dashboard-subtitle">Everything happening across the tournament, one tap away.</p></div><div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><a href={isLive && youtubeLink ? `https://youtube.com/${youtubeLink}/live` : undefined} target={isLive ? '_blank' : undefined} rel={isLive ? 'noopener noreferrer' : undefined} className="btn btn-outline" aria-disabled={!isLive} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isLive ? '#ff0000' : 'var(--text-secondary)', cursor: isLive ? 'pointer' : 'not-allowed', opacity: youtubeLink ? 1 : 0.5, pointerEvents: isLive && youtubeLink ? 'auto' : 'none' }}><Play size={20} /> Watch YouTube Live</a><Activity size={42} color="var(--accent-secondary)" className="dashboard-mark" /></div></div>{tournaments.length > 0 && <div className="dashboard-tournament-select" style={{ marginBottom: '1.5rem' }}><label className="form-label" htmlFor="dashboard-tournament">Tournament</label><select id="dashboard-tournament" className="form-input tournament-select" value={selectedTid} onChange={handleTournamentChange}>{tournaments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>}<LiveMatchAlert tournament={tournament} /><UpcomingMatchAlert tournament={tournament} /><div className="dashboard-tiles">{tiles.filter(tile => tile.path !== '/auction' || isAuctionLive).map(({ title, description, path, icon: Icon, tone }) => <Link key={title} to={path} className={`dashboard-tile tile-${tone}`}><span className="tile-icon" aria-hidden="true"><Icon size={25} strokeWidth={2.25} /></span><span className="tile-copy"><strong>{title}</strong><span>{description}</span></span><span className="tile-arrow" aria-hidden="true">→</span></Link>)}</div></div>;
}
