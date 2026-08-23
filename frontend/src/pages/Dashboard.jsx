import { Activity, BarChart3, CalendarDays, Gavel, ListChecks, Trophy, Users, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';

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
  return <div className="dashboard-home animate-fade-in"><div className="dashboard-heading"><div><p className="eyebrow">PALLADIO PLAY</p><h1>Tournament Hub</h1><p className="dashboard-subtitle">Everything happening across the tournament, one tap away.</p></div><Activity size={42} color="var(--accent-secondary)" className="dashboard-mark" /></div><div className="dashboard-tiles">{tiles.map(({ title, description, path, icon: Icon, tone }) => <Link key={path} to={path} className={`dashboard-tile tile-${tone}`}><span className="tile-icon" aria-hidden="true"><Icon size={25} strokeWidth={2.25} /></span><span className="tile-copy"><strong>{title}</strong><span>{description}</span></span><span className="tile-arrow" aria-hidden="true">→</span></Link>)}</div></div>;
}
