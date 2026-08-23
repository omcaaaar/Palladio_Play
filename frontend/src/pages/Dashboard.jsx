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
];

export default function Dashboard() {
  const [tournament, setTournament] = useState(null);

  useEffect(() => {
    api.getTournaments().then(tournaments => {
      if (tournaments[0]) api.getTournamentFull(tournaments[0].id).then(setTournament).catch(() => {});
    }).catch(() => {});
  }, []);

  const youtubeLink = tournament?.tournament?.youtube_link || import.meta.env.VITE_YOUTUBE_HANDLE;
  const isLive = tournament?.tournament?.is_live;

  return <div className="dashboard-home animate-fade-in"><div className="dashboard-heading"><div><p className="eyebrow">PALLADIO PLAY</p><h1>Tournament Hub</h1><p className="dashboard-subtitle">Everything happening across the tournament, one tap away.</p></div><div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><a href={isLive && youtubeLink ? `https://youtube.com/${youtubeLink}/live` : undefined} target={isLive ? '_blank' : undefined} rel={isLive ? 'noopener noreferrer' : undefined} className="btn btn-outline" aria-disabled={!isLive} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isLive ? '#ff0000' : 'var(--text-secondary)', cursor: isLive ? 'pointer' : 'not-allowed', opacity: youtubeLink ? 1 : 0.5, pointerEvents: isLive && youtubeLink ? 'auto' : 'none' }}><Play size={20} /> Watch YouTube Live</a><Activity size={42} color="var(--accent-secondary)" className="dashboard-mark" /></div></div><div className="dashboard-tiles">{tiles.map(({ title, description, path, icon: Icon, tone }) => <Link key={path} to={path} className={`dashboard-tile tile-${tone}`}><span className="tile-icon" aria-hidden="true"><Icon size={25} strokeWidth={2.25} /></span><span className="tile-copy"><strong>{title}</strong><span>{description}</span></span><span className="tile-arrow" aria-hidden="true">→</span></Link>)}</div></div>;
}
