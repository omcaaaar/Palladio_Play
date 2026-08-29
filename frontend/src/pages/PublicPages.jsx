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

export function details(data) {
  const teams = data.teams || [];
  const events = data.events || [];
  const scorecards = data.scorecards || [];
  const allFixtures = [...(data.fixtures || [])].sort((a, b) => new Date(a.date_time || 0) - new Date(b.date_time || 0));
  return {
    teams,
    events,
    scorecards,
    players: data.players || [],
    auction: data.auction,
    fixtures: allFixtures,
    getTeamName: (id, placeholder) => {
      if (id) return teams.find(team => team.id === id)?.name || id;
      if (placeholder) {
        const parts = placeholder.split(':');
        if (parts.length >= 2) {
          if (!isNaN(parts[1])) {
            return parts[0] ? `Group ${parts[0]} #${parts[1]}` : `Position ${parts[1]}`;
          } else if (parts[1].toLowerCase() === 'winner') {
            const srcFixture = allFixtures.find(f => f.id === parts[0]);
            const srcLabel = srcFixture ? (MATCH_TYPE_LABELS[srcFixture.match_type] || srcFixture.match_type) : parts[0];
            return `Winner of ${srcLabel}`;
          } else if (parts[1].toLowerCase() === 'loser') {
            const srcFixture = allFixtures.find(f => f.id === parts[0]);
            const srcLabel = srcFixture ? (MATCH_TYPE_LABELS[srcFixture.match_type] || srcFixture.match_type) : parts[0];
            return `Loser of ${srcLabel}`;
          }
        }
        return placeholder;
      }
      return 'TBD';
    }
  };
}

export const MATCH_TYPE_LABELS = {
  quarter_final: 'Quarter Final',
  qualifier_1: 'Qualifier 1',
  eliminator: 'Eliminator',
  qualifier_2: 'Qualifier 2',
  semi_final: 'Semi Final',
  final: 'Final',
  league: 'League'
};

// -----------------------------------------------------
// OLD DASHBOARD COMPONENTS
// -----------------------------------------------------

export function StandingsTable({ standings }) {
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
// PLAYOFF BRACKET COMPONENT
// -----------------------------------------------------

export function PlayoffMatchCard({ fixture, getTeamName, events, scorecards, isFinal }) {
  const label = MATCH_TYPE_LABELS[fixture.match_type] || fixture.match_type;
  const isLive = fixture.status === 'in_progress';
  const isCompleted = fixture.status === 'completed' || fixture.status === 'abandoned';

  const team1Name = getTeamName(fixture.team1_id, fixture.team1_placeholder);
  const team2Name = getTeamName(fixture.team2_id, fixture.team2_placeholder);
  const team1Resolved = !!fixture.team1_id;
  const team2Resolved = !!fixture.team2_id;

  // Determine winner for completed matches
  let winnerSide = null;
  if (isCompleted && fixture.status !== 'abandoned') {
    const fScorecards = scorecards.filter(sc => sc.fixture_id === fixture.id && (sc.status === 'completed' || sc.status === 'abandoned'));
    let t1pts = 0, t2pts = 0;
    fScorecards.forEach(sc => {
      const ev = events.find(e => e.id === sc.event_id);
      const pts = sc.event_points !== undefined ? sc.event_points : (ev?.points || 0);
      if (sc.winner === 'team1') t1pts += pts;
      else if (sc.winner === 'team2') t2pts += pts;
    });
    if (t1pts > t2pts) winnerSide = 'team1';
    else if (t2pts > t1pts) winnerSide = 'team2';
  }

  const statusDot = isLive ? 'dot-live' : isCompleted ? 'dot-completed' : 'dot-pending';
  const statusLabel = isLive ? 'LIVE' : isCompleted ? (fixture.status === 'abandoned' ? 'ABD' : '✓') : '';

  return (
    <div className={`playoff-match-card${isFinal ? ' playoff-final' : ''}${isLive ? ' playoff-live' : ''}`}>
      <div className="playoff-match-header">
        {isFinal && <span style={{ fontSize: '0.8rem' }}>🏆</span>}
        <span className={`playoff-status-dot ${statusDot}`} />
        <span>{label}</span>
        {statusLabel && <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>{statusLabel}</span>}
      </div>
      <div className={`playoff-team-row${winnerSide === 'team1' ? ' playoff-winner-row' : ''}`}>
        <span className={`playoff-team-name${!team1Resolved ? ' playoff-tbd' : ''}`}>
          {team1Name}
        </span>
        {winnerSide === 'team1' && <span className="playoff-winner-icon">✦</span>}
      </div>
      <div className={`playoff-team-row${winnerSide === 'team2' ? ' playoff-winner-row' : ''}`}>
        <span className={`playoff-team-name${!team2Resolved ? ' playoff-tbd' : ''}`}>
          {team2Name}
        </span>
        {winnerSide === 'team2' && <span className="playoff-winner-icon">✦</span>}
      </div>
    </div>
  );
}

export function ConnectorColumn({ topCount, bottomCount }) {
  // Renders connector lines between rounds
  if (topCount === 0 && bottomCount === 0) return null;

  if (topCount === 2 && bottomCount === 1) {
    return (
      <div className="playoff-connector-col">
        {/* Top-to-bottom merge line */}
        <div style={{ position: 'absolute', width: '50%', height: '140px', borderTop: '2px dashed rgba(59,130,246,0.3)', borderBottom: '2px dashed rgba(59,130,246,0.3)', borderRight: '2px dashed rgba(59,130,246,0.3)', right: '50%', top: '50%', transform: 'translateY(-50%)', borderRadius: '0 4px 4px 0' }}></div>
        {/* Output line */}
        <div style={{ position: 'absolute', width: '50%', height: '2px', borderTop: '2px dashed rgba(59,130,246,0.3)', left: '50%', top: '50%', transform: 'translateY(-50%)' }}></div>
      </div>
    );
  }

  // 1-to-1 pass-through
  return (
    <div className="playoff-connector-col">
      <div style={{ position: 'absolute', width: '100%', height: '2px', borderTop: '2px dashed rgba(59,130,246,0.3)', left: 0, top: '50%', transform: 'translateY(-50%)' }}></div>
    </div>
  );
}

export function PlayoffBracket({ fixtures, getTeamName, events, scorecards }) {
  const playoffTypes = ['quarter_final', 'qualifier_1', 'eliminator', 'qualifier_2', 'semi_final', 'final'];
  const playoffFixtures = fixtures.filter(f => playoffTypes.includes(f.match_type));

  if (playoffFixtures.length === 0) return null;

  // Detect bracket style
  const hasQ1 = playoffFixtures.some(f => f.match_type === 'qualifier_1');
  const hasElim = playoffFixtures.some(f => f.match_type === 'eliminator');
  const hasQ2 = playoffFixtures.some(f => f.match_type === 'qualifier_2');
  const hasSF = playoffFixtures.some(f => f.match_type === 'semi_final');
  const hasQF = playoffFixtures.some(f => f.match_type === 'quarter_final');
  const hasFinal = playoffFixtures.some(f => f.match_type === 'final');

  const isIPL = hasQ1 || hasElim || hasQ2;
  const isQuarterFinal = hasQF && !isIPL;
  const isSemiFinal = hasSF && !isIPL && !isQuarterFinal;

  // Get fixture by type (first match of each type)
  const getFixture = (type) => playoffFixtures.find(f => f.match_type === type);
  const getFixtures = (type) => playoffFixtures.filter(f => f.match_type === type);

  // Determine champion from final
  let champion = null;
  const finalFixture = getFixture('final');
  if (finalFixture && (finalFixture.status === 'completed')) {
    const fScorecards = scorecards.filter(sc => sc.fixture_id === finalFixture.id && (sc.status === 'completed' || sc.status === 'abandoned'));
    let t1pts = 0, t2pts = 0;
    fScorecards.forEach(sc => {
      const ev = events.find(e => e.id === sc.event_id);
      const pts = sc.event_points !== undefined ? sc.event_points : (ev?.points || 0);
      if (sc.winner === 'team1') t1pts += pts;
      else if (sc.winner === 'team2') t2pts += pts;
    });
    if (t1pts > t2pts) champion = getTeamName(finalFixture.team1_id, finalFixture.team1_placeholder);
    else if (t2pts > t1pts) champion = getTeamName(finalFixture.team2_id, finalFixture.team2_placeholder);
  }

  const renderMatchCard = (fixture) => {
    if (!fixture) return null;
    return (
      <PlayoffMatchCard
        key={fixture.id}
        fixture={fixture}
        getTeamName={getTeamName}
        events={events}
        scorecards={scorecards}
        isFinal={fixture.match_type === 'final'}
      />
    );
  };

  // Build the bracket layout
  let bracketContent;

  if (isIPL) {
    // IPL Style: [Q1 + Eliminator] → [Q2] → [Final]
    const q1 = getFixture('qualifier_1');
    const elim = getFixture('eliminator');
    const q2 = getFixture('qualifier_2');
    const final_ = getFixture('final');

    bracketContent = (
      <div className="playoff-bracket">
        {/* Round 1: Q1 + Eliminator */}
        <div className="playoff-round">
          <div className="playoff-round-label">Round 1</div>
          {q1 && renderMatchCard(q1)}
          {elim && renderMatchCard(elim)}
        </div>

        <ConnectorColumn topCount={2} bottomCount={1} />

        {/* Round 2: Qualifier 2 */}
        {q2 && (
          <>
            <div className="playoff-round">
              <div className="playoff-round-label">Round 2</div>
              {renderMatchCard(q2)}
            </div>
            <ConnectorColumn topCount={1} bottomCount={1} />
          </>
        )}

        {/* Final */}
        {final_ && (
          <div className="playoff-round">
            <div className="playoff-round-label">Final</div>
            {renderMatchCard(final_)}
          </div>
        )}
      </div>
    );
  } else if (isQuarterFinal) {
    // Quarter-Final Style: [QF1 + QF2 + QF3 + QF4] → [SF1 + SF2] → [Final]
    const quarters = getFixtures('quarter_final');
    const semis = getFixtures('semi_final');
    const final_ = getFixture('final');

    bracketContent = (
      <div className="playoff-bracket">
        {/* Quarter Finals */}
        <div className="playoff-round">
          <div className="playoff-round-label">Quarter Finals</div>
          {quarters.map(qf => renderMatchCard(qf))}
        </div>

        {semis.length > 0 && (
          (quarters.length === 2 && semis.length === 2) ? (
            <div className="playoff-connector-col" style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', width: '50%', height: '140px', borderTop: '2px dashed rgba(59,130,246,0.3)', borderRight: '2px dashed rgba(59,130,246,0.3)', left: 0, top: 'calc(50% - 70px)', borderRadius: '0 4px 0 0' }}></div>
              <div style={{ position: 'absolute', width: '100%', height: '2px', borderTop: '2px dashed rgba(59,130,246,0.3)', left: 0, top: 'calc(50% + 70px)' }}></div>
            </div>
          ) : (
            <ConnectorColumn topCount={quarters.length} bottomCount={semis.length} />
          )
        )}

        {/* Semi Finals */}
        {semis.length > 0 && (
          <div className="playoff-round">
            <div className="playoff-round-label">Semi Finals</div>
            {semis.map(sf => renderMatchCard(sf))}
          </div>
        )}

        {(semis.length > 0 && final_) ? <ConnectorColumn topCount={semis.length} bottomCount={1} /> : (final_ && <ConnectorColumn topCount={quarters.length} bottomCount={1} />)}

        {/* Final */}
        {final_ && (
          <div className="playoff-round">
            <div className="playoff-round-label">Final</div>
            {renderMatchCard(final_)}
          </div>
        )}
      </div>
    );
  } else if (isSemiFinal) {
    // Semi-Final Style: [SF1 + SF2] → [Final]
    const semis = getFixtures('semi_final');
    const final_ = getFixture('final');

    bracketContent = (
      <div className="playoff-bracket">
        {/* Semi Finals */}
        <div className="playoff-round">
          <div className="playoff-round-label">Semi Finals</div>
          {semis.map(sf => renderMatchCard(sf))}
        </div>

        <ConnectorColumn topCount={semis.length} bottomCount={1} />

        {/* Final */}
        {final_ && (
          <div className="playoff-round">
            <div className="playoff-round-label">Final</div>
            {renderMatchCard(final_)}
          </div>
        )}
      </div>
    );
  } else {
    // Only final exists, or unknown combination
    bracketContent = (
      <div className="playoff-bracket" style={{ justifyContent: 'center' }}>
        <div className="playoff-round">
          {playoffFixtures.map(f => renderMatchCard(f))}
        </div>
      </div>
    );
  }

  // Path description for the info banner
  let pathDescription = null;
  if (isIPL) {
    pathDescription = (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center', alignItems: 'center', padding: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', marginBottom: '0.75rem' }}>
        <span>Q1 Winner → <strong style={{ color: 'var(--accent-secondary)' }}>Final</strong></span>
        <span style={{ opacity: 0.4 }}>│</span>
        <span>Q1 Loser + Eliminator Winner → <strong style={{ color: 'var(--accent-primary)' }}>Q2</strong></span>
        <span style={{ opacity: 0.4 }}>│</span>
        <span>Q2 Winner → <strong style={{ color: 'var(--accent-secondary)' }}>Final</strong></span>
      </div>
    );
  }

  return (
    <div>
      {pathDescription}
      {bracketContent}
      {champion && (
        <div className="playoff-champion-banner">
          <span className="champion-trophy">🏆</span>
          <div className="champion-text">
            <span className="champion-label">Tournament Champion</span>
            <span className="champion-name">{champion}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------
// PAGES
// -----------------------------------------------------

export function getStandings(data) {
  const { teams, fixtures, events, scorecards } = details(data);
  
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

  return Object.values(teamMap).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.eventDiff !== a.eventDiff) return b.eventDiff - a.eventDiff;
    return b.setPointDiff - a.setPointDiff;
  });
}

export function StandingsPage() {
  const { state, page, context } = usePublicPage('League Standings', 'Track teams, points, and group rankings.');
  if (page) return page;
  const { teams, fixtures, events, scorecards, getTeamName } = details(state.data);
  const standings = getStandings(state.data);

  const groups = [...new Set(teams.map(t => t.group).filter(Boolean))];

  // Check for playoff fixtures
  const playoffTypes = ['quarter_final', 'qualifier_1', 'eliminator', 'qualifier_2', 'semi_final', 'final'];
  const hasPlayoffs = fixtures.some(f => playoffTypes.includes(f.match_type));

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

      {hasPlayoffs && (
        <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
          <p className="eyebrow" style={{ color: 'var(--accent-secondary)', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>PLAYOFFS</p>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.3rem' }}>Knockout Stage</h3>
          <PlayoffBracket
            fixtures={fixtures}
            getTeamName={getTeamName}
            events={events}
            scorecards={scorecards}
          />
        </div>
      )}
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
  if (page) return page; 
  const { teams, scorecards } = details(state.data); 
  const stats = {}; 
  teams.forEach(team => (team.players_list || []).forEach(player => { 
    const name = typeof player === 'object' ? player.name : player; 
    stats[name] = { name, team: team.name, events: 0, wins: 0, setsWon: 0, setsLost: 0, pointDifference: 0 }; 
  })); 
  scorecards.forEach(score => { 
    const sides = [['team1', score.winner === 'team1'], ['team2', score.winner === 'team2']]; 
    sides.forEach(([side, won]) => { 
      const players = [score[`${side}_player1`], score[`${side}_player2`]].filter(Boolean); 
      players.forEach(name => { 
        if (!stats[name]) stats[name] = { name, team: 'Unassigned', events: 0, wins: 0, setsWon: 0, setsLost: 0, pointDifference: 0 }; 
        stats[name].events++; 
        if (won) stats[name].wins++; 
        (score.sets || []).forEach(set => { 
          const own = set[`${side}_score`] || 0, opponent = set[side === 'team1' ? 'team2_score' : 'team1_score'] || 0; 
          if (own > opponent) stats[name].setsWon++; 
          if (own < opponent) stats[name].setsLost++; 
          stats[name].pointDifference += own - opponent; 
        }); 
      }); 
    }); 
  }); 
  
  const sortedStats = Object.values(stats).sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    const bSetDiff = b.setsWon - b.setsLost;
    const aSetDiff = a.setsWon - a.setsLost;
    if (bSetDiff !== aSetDiff) return bSetDiff - aSetDiff;
    if (b.pointDifference !== a.pointDifference) return b.pointDifference - a.pointDifference;
    return (a.name || '').localeCompare(b.name || '');
  });

  let currentRank = 1;
  sortedStats.forEach((player, index) => {
    if (index > 0) {
      const prev = sortedStats[index - 1];
      const prevSetDiff = prev.setsWon - prev.setsLost;
      const currSetDiff = player.setsWon - player.setsLost;
      if (prev.wins === player.wins && prevSetDiff === currSetDiff && prev.pointDifference === player.pointDifference) {
        player.rank = prev.rank;
      } else {
        player.rank = currentRank;
      }
    } else {
      player.rank = currentRank;
    }
    currentRank++;
  });

  return (
    <PageFrame title="Player Stats" subtitle="Compare player performance across events." context={context}>
      <div className="table-container">
        <table>
          <thead>
            <tr><th>#</th><th>Player</th><th>Team</th><th>Events</th><th>Wins</th><th>Sets Won</th><th>Sets Lost</th><th>Point Difference</th></tr>
          </thead>
          <tbody>
            {sortedStats.map((player) => 
              <tr key={`${player.team}-${player.name}`}>
                <td>{player.rank}</td>
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

function mvpWeight(eventName = '') { 
  const name = eventName.toLowerCase(); 
  if (name.includes('mixed') && name.includes('doubles')) return 1.3; 
  if (name.includes('doubles')) return 1.15; 
  return 1; 
}

function calculateMvp(teams, events, scorecards) { 
  const players = {}; 
  teams.forEach(team => (team.players_list || []).forEach(player => { 
    const name = typeof player === 'object' ? player.name : player; 
    players[name] = { name, team: team.name, events: 0, wins: 0, losses: 0, pointDifference: 0, mvpPoints: 0 }; 
  })); 
  scorecards.filter(score => score.status === 'completed' && score.winner).forEach(score => { 
    const event = events.find(item => item.id === score.event_id); 
    const weight = mvpWeight(event?.name); 
    [['team1', score.winner === 'team1'], ['team2', score.winner === 'team2']].forEach(([side, won]) => { 
      [score[`${side}_player1`], score[`${side}_player2`]].filter(Boolean).forEach(name => { 
        if (!players[name]) players[name] = { name, team: 'Unassigned', events: 0, wins: 0, losses: 0, pointDifference: 0, mvpPoints: 0 }; 
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
  return Object.values(players).sort((a, b) => b.mvpPoints - a.mvpPoints);
}

export function MvpPage() { 
  const { state, page, context } = usePublicPage('Tournament MVP', 'Identify the most valuable player using weighted match performance.'); 
  if (page) return page; 
  const { teams, events, scorecards } = details(state.data); 
  const players = calculateMvp(teams, events, scorecards); 
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
