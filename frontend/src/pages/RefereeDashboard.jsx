import { useState, useEffect } from 'react';
import { ShieldAlert, Plus, Minus, Check, ChevronRight, ChevronLeft, ArrowLeft, X, Pencil, AlertTriangle, Lock } from 'lucide-react';
import * as api from '../api/client';

/*
  Referee flow per idea.txt:
  1. Select tournament
  2. Select a match fixture (team vs team)
  3. Set event fixture — who plays which event, configure sets/points
  4. Start scoring with +/- controls
*/

const STEPS = {
  SELECT_TOURNAMENT: 'select_tournament',
  SELECT_FIXTURE: 'select_fixture',
  SETUP_LINEUPS: 'setup_lineups',
  OVERVIEW_FIXTURE: 'overview_fixture',
  SCORING: 'scoring',
};

function getFilteredPlayers(players, eventName, playerSlot, otherPlayerName = '') {
  const lowerName = eventName.toLowerCase();

  let filtered = players;
  if (otherPlayerName) {
    filtered = filtered.filter(p => (typeof p === 'object' ? p.name : p) !== otherPlayerName);
  }

  if (lowerName.includes("women's")) {
    return filtered.filter(p => typeof p === 'object' ? p.gender === 'Female' : true);
  }
  if (lowerName.includes("men's")) {
    return filtered.filter(p => typeof p === 'object' ? p.gender === 'Male' : true);
  }
  if (lowerName.includes("junior")) {
    return filtered.filter(p => typeof p === 'object' ? p.gender === 'Junior' : true);
  }
  if (lowerName.includes("senior")) {
    return filtered.filter(p => typeof p === 'object' ? p.gender === 'Senior' : true);
  }
  if (lowerName.includes("mixed")) {
    if (otherPlayerName) {
      const otherPlayer = players.find(p => (typeof p === 'object' ? p.name : p) === otherPlayerName);
      if (otherPlayer && typeof otherPlayer === 'object') {
        if (otherPlayer.gender === 'Male' || otherPlayer.gender === 'Female') {
          const oppGender = otherPlayer.gender === 'Male' ? 'Female' : 'Male';
          return filtered.filter(p => typeof p === 'object' ? p.gender === oppGender : true);
        } else if (otherPlayer.gender === 'Junior' || otherPlayer.gender === 'Senior') {
          const oppCat = otherPlayer.gender === 'Junior' ? 'Senior' : 'Junior';
          return filtered.filter(p => typeof p === 'object' ? p.gender === oppCat : true);
        }
      }
    }
  }
  return filtered;
}

export default function RefereeDashboard() {
  const [step, setStep] = useState(STEPS.SELECT_TOURNAMENT);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);

  // Tournament data
  const [teams, setTeams] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [events, setEvents] = useState([]);

  // Selected fixture
  const [selectedFixture, setSelectedFixture] = useState(null);
  const [existingScorecards, setExistingScorecards] = useState([]);
  const [allScorecards, setAllScorecards] = useState([]);

  // Lineups setup
  const [lineups, setLineups] = useState({});
  const [bonusEventId, setBonusEventId] = useState('');

  // Editing individual scorecard
  const [editingScorecard, setEditingScorecard] = useState(null);
  const [editLineupData, setEditLineupData] = useState({});

  // Active scorecard for scoring
  const [activeScorecard, setActiveScorecard] = useState(null);

  const [error, setError] = useState('');
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [showAbandonFixtureConfirm, setShowAbandonFixtureConfirm] = useState(false);
  const [abandoningScorecard, setAbandoningScorecard] = useState(null);

  useEffect(() => {
    api.getTournaments().then(setTournaments).catch(e => setError(e.message));
  }, []);

  async function selectTournament(tid) {
    const t = tournaments.find(t => t.id === tid);
    setSelectedTournament(t);
    try {
      const full = await api.getTournamentFull(tid);
      setTeams(full.teams || []);
      setFixtures(full.fixtures || []);
      setEvents(full.events || []);
      setAllScorecards(full.scorecards || []);
      setStep(STEPS.SELECT_FIXTURE);
    } catch (e) { setError(e.message); }
  }

  async function selectFixture(fixture) {
    setSelectedFixture(fixture);
    try {
      const scs = await api.getScorecardsForFixture(selectedTournament.id, fixture.id);
      setExistingScorecards(scs);
      if (scs.length > 0) {
        setStep(STEPS.OVERVIEW_FIXTURE);
      } else {
        const initialLineups = {};
        events.forEach(e => {
          initialLineups[e.id] = { team1Player1: '', team1Player2: '', team2Player1: '', team2Player2: '', numSets: 1, pointsPerSet: 21 };
        });
        setLineups(initialLineups);
        setStep(STEPS.SETUP_LINEUPS);
      }
    } catch (e) { setError(e.message); }
  }

  function getTeamName(id) {
    if (!id) return 'TBD';
    return teams.find(t => t.id === id)?.name || id;
  }

  function getTeamPlayers(teamId) {
    return teams.find(t => t.id === teamId)?.players_list || [];
  }

  function getEventName(id) {
    return events.find(e => e.id === id)?.name || id;
  }

  function handleLineupChange(eventId, field, value) {
    setLineups(prev => ({
      ...prev,
      [eventId]: {
        ...prev[eventId],
        [field]: value
      }
    }));
  }

  function openEditLineup(sc) {
    setEditingScorecard(sc);
    setEditLineupData({
      team1Player1: sc.team1_player1,
      team1Player2: sc.team1_player2,
      team2Player1: sc.team2_player1,
      team2Player2: sc.team2_player2,
      numSets: sc.num_sets,
      pointsPerSet: sc.points_per_set
    });
  }

  async function handleUpdateBonusEvent(newEventId) {
    try {
      const updatedScorecards = [];
      for (const sc of existingScorecards) {
        const targetPoints = sc.event_id === newEventId ? 3 : 2;
        if (sc.event_points !== targetPoints) {
          const res = await api.updateScorecard(selectedTournament.id, sc.id, {
            ...sc,
            event_points: targetPoints
          });
          updatedScorecards.push(res.scorecard);
        } else {
          updatedScorecards.push(sc);
        }
      }
      setExistingScorecards(updatedScorecards);
      api.getTournamentFull(selectedTournament.id).then(f => setAllScorecards(f.scorecards || []));
    } catch (err) { setError(err.message); }
  }

  async function handleSaveEditLineup(e) {
    e.preventDefault();
    const eventName = getEventName(editingScorecard.event_id);
    const isSingles = eventName.toLowerCase().includes('singles');

    if (!editLineupData.team1Player1 || !editLineupData.team2Player1) {
      setError('Please select player 1 for both teams.');
      return;
    }
    if (!isSingles && (!editLineupData.team1Player2 || !editLineupData.team2Player2)) {
      setError('Please select both players for both teams.');
      return;
    }
    try {
      const data = {
        ...editingScorecard,
        team1_player1: editLineupData.team1Player1,
        team1_player2: editLineupData.team1Player2,
        team2_player1: editLineupData.team2Player1,
        team2_player2: editLineupData.team2Player2,
        num_sets: editLineupData.numSets,
        points_per_set: editLineupData.pointsPerSet,
      };
      await api.updateScorecard(selectedTournament.id, editingScorecard.id, data);

      const scs = await api.getScorecardsForFixture(selectedTournament.id, selectedFixture.id);
      setExistingScorecards(scs);

      setEditingScorecard(null);
    } catch (err) { setError(err.message); }
  }

  async function handleSaveLineups(e) {
    e.preventDefault();
    setError('');

    // Validation
    for (const event of events) {
      const lineup = lineups[event.id];
      const isSingles = event.name.toLowerCase().includes('singles');
      if (!lineup || !lineup.team1Player1 || !lineup.team2Player1) {
        setError(`Please complete the lineup for ${event.name}.`);
        return;
      }
      if (!isSingles && (!lineup.team1Player2 || !lineup.team2Player2)) {
        setError(`Please select both players for ${event.name}.`);
        return;
      }
    }
    try {
      const scs = [];
      for (const event of events) {
        const lineup = lineups[event.id];
        const existing = existingScorecards.find(s => s.event_id === event.id);
        const data = {
          fixture_id: selectedFixture.id,
          event_id: event.id,
          team1_player1: lineup.team1Player1,
          team1_player2: lineup.team1Player2,
          team2_player1: lineup.team2Player1,
          team2_player2: lineup.team2Player2,
          num_sets: lineup.numSets || 1,
          points_per_set: lineup.pointsPerSet || 21,
          event_points: event.id === bonusEventId ? 3 : 2,
          status: existing ? existing.status : 'pending',
        };

        if (existing) {
          const res = await api.updateScorecard(selectedTournament.id, existing.id, data);
          scs.push(res.scorecard);
        } else {
          const res = await api.createScorecard(selectedTournament.id, data);
          scs.push(res.scorecard);
        }
      }

      // Update all scorecards context
      api.getTournamentFull(selectedTournament.id).then(f => setAllScorecards(f.scorecards || []));

      setExistingScorecards(scs);
      setStep(STEPS.OVERVIEW_FIXTURE);
    } catch (err) { setError(err.message); }
  }

  async function handleStartScorecard(sc) {
    if (sc.status === 'pending') {
      try {
        const res = await api.startScorecard(selectedTournament.id, sc.id);
        setActiveScorecard(res.scorecard);
        setStep(STEPS.SCORING);
      } catch (err) { setError(err.message); }
    } else if (sc.status === 'completed') {
      // Just open the scorecard. If the referee modifies the score later,
      // the backend updateScore logic will automatically handle changing
      // the status back to in_progress if it's no longer completed.
      setActiveScorecard(sc);
      setStep(STEPS.SCORING);
    } else {
      setActiveScorecard(sc);
      setStep(STEPS.SCORING);
    }
  }
  const isCurrentSetFinished = () => {
    if (!activeScorecard) return false;
    const currentSet = activeScorecard.sets[activeScorecard.current_set];
    const s1 = currentSet.team1_score;
    const s2 = currentSet.team2_score;
    const target = activeScorecard.points_per_set;
    const cap = target === 21 ? 30 : (target === 15 ? 21 : (target === 11 ? 15 : target + 9));

    return (s1 >= target && (s1 - s2 >= 2 || s1 === cap)) ||
      (s2 >= target && (s2 - s1 >= 2 || s2 === cap));
  };

  const isSetInactive = (setIndex) => {
    if (!activeScorecard || setIndex === 0) return false;

    const target = activeScorecard.points_per_set;
    const cap = target === 21 ? 30 : (target === 15 ? 21 : (target === 11 ? 15 : target + 9));
    const setsNeeded = Math.floor(activeScorecard.num_sets / 2) + 1;

    let team1Wins = 0;
    let team2Wins = 0;

    for (let i = 0; i < setIndex; i++) {
      const s = activeScorecard.sets[i];
      const s1 = s.team1_score;
      const s2 = s.team2_score;
      if (s1 >= target && (s1 - s2 >= 2 || s1 === cap)) team1Wins++;
      else if (s2 >= target && (s2 - s1 >= 2 || s2 === cap)) team2Wins++;
    }

    return team1Wins >= setsNeeded || team2Wins >= setsNeeded;
  };

  async function handleScore(team, delta) {
    if (!activeScorecard) return;
    if (delta > 0 && isCurrentSetFinished()) return;
    if (delta < 0 && activeScorecard.sets[activeScorecard.current_set][`${team}_score`] <= 0) return;

    try {
      const res = await api.updateScore(selectedTournament.id, activeScorecard.id, {
        set_index: activeScorecard.current_set,
        team,
        delta,
      });
      setActiveScorecard(res.scorecard);
      setExistingScorecards(prev => prev.map(sc => sc.id === res.scorecard.id ? res.scorecard : sc));
    } catch (err) { setError(err.message); }
  }

  async function handleChangeSet(setIndex) {
    if (!activeScorecard || setIndex === activeScorecard.current_set) return;
    try {
      const res = await api.changeSet(selectedTournament.id, activeScorecard.id, setIndex);
      setActiveScorecard(res.scorecard);
      setExistingScorecards(prev => prev.map(sc => sc.id === res.scorecard.id ? res.scorecard : sc));
    } catch (err) { setError(err.message); }
  }

  async function handleCompleteEvent(winner) {
    try {
      await api.completeScorecard(selectedTournament.id, activeScorecard.id, winner);
      // Refresh scorecards and go back to overview
      const scs = await api.getScorecardsForFixture(selectedTournament.id, selectedFixture.id);
      setExistingScorecards(scs);
      setActiveScorecard(null);
      setStep(STEPS.OVERVIEW_FIXTURE);
    } catch (err) { setError(err.message); }
  }

  async function goBack() {
    if (step === STEPS.SCORING) {
      try {
        const scs = await api.getScorecardsForFixture(selectedTournament.id, selectedFixture.id);
        setExistingScorecards(scs);
      } catch (err) { setError(err.message); }
      setStep(STEPS.OVERVIEW_FIXTURE);
      setActiveScorecard(null);
    }
    else if (step === STEPS.OVERVIEW_FIXTURE) {
      try {
        const full = await api.getTournamentFull(selectedTournament.id);
        setFixtures(full.fixtures || []);
      } catch (err) { setError(err.message); }
      setStep(STEPS.SELECT_FIXTURE);
      setSelectedFixture(null);
    }
    else if (step === STEPS.SETUP_LINEUPS) {
      try {
        const full = await api.getTournamentFull(selectedTournament.id);
        setFixtures(full.fixtures || []);
      } catch (err) { setError(err.message); }
      setStep(STEPS.SELECT_FIXTURE);
      setSelectedFixture(null);
    }
    else if (step === STEPS.SELECT_FIXTURE) { setStep(STEPS.SELECT_TOURNAMENT); setSelectedTournament(null); }
  }

  async function handleLockMatch() {
    try {
      await api.updateFixture(selectedTournament.id, selectedFixture.id, { is_frozen: true });
      // Refresh fixtures list
      const full = await api.getTournamentFull(selectedTournament.id);
      setFixtures(full.fixtures || []);

      setStep(STEPS.SELECT_FIXTURE);
      setSelectedFixture(null);
      setShowLockConfirm(false);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAbandonFixture() {
    try {
      await api.abandonFixture(selectedTournament.id, selectedFixture.id);
      const full = await api.getTournamentFull(selectedTournament.id);
      setFixtures(full.fixtures || []);
      setStep(STEPS.SELECT_FIXTURE);
      setSelectedFixture(null);
      setShowAbandonFixtureConfirm(false);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAbandonScorecard() {
    if (!abandoningScorecard) return;
    try {
      await api.abandonScorecard(selectedTournament.id, abandoningScorecard.id);
      const scs = await api.getScorecardsForFixture(selectedTournament.id, selectedFixture.id);
      setExistingScorecards(scs);
      setAbandoningScorecard(null);
    } catch (err) {
      setError(err.message);
    }
  }

  const team1Name = selectedFixture ? getTeamName(selectedFixture.team1_id) : '';
  const team2Name = selectedFixture ? getTeamName(selectedFixture.team2_id) : '';
  const team1Players = selectedFixture ? getTeamPlayers(selectedFixture.team1_id) : [];
  const team2Players = selectedFixture ? getTeamPlayers(selectedFixture.team2_id) : [];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Referee Console</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Live courtside scoring and event management</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)' }}>
          <ShieldAlert size={18} />
          <span style={{ fontWeight: 500 }}>Referee Mode</span>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer' }}><X size={16} /></button>
        </div>
      )}

      {/* Back button */}
      {step !== STEPS.SELECT_TOURNAMENT && (
        <button onClick={goBack} className="btn btn-outline" style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          <ArrowLeft size={16} /> Back
        </button>
      )}

      {/* ──── Step 1: Select Tournament ──── */}
      {step === STEPS.SELECT_TOURNAMENT && (
        <div className="glass-card animate-fade-in">
          <h3>Select Tournament</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Choose the tournament you are refereeing.</p>
          {tournaments.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No tournaments available. Ask an admin to create one first.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {tournaments.map(t => (
                <button
                  key={t.id}
                  className="glass-card"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left', border: '1px solid var(--glass-border)' }}
                  onClick={() => selectTournament(t.id)}
                >
                  <div>
                    <h4 style={{ margin: 0 }}>{t.name}</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
                      Created: {new Date(t.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <ChevronRight size={20} color="var(--text-secondary)" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ──── Step 2: Select Fixture ──── */}
      {step === STEPS.SELECT_FIXTURE && (
        <div className="glass-card animate-fade-in">
          <h3>Select Match Fixture</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Choose a scheduled match to officiate.</p>
          {fixtures.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No fixtures have been scheduled.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Match</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {fixtures.slice().sort((a, b) => {
                    const aIsDone = a.status === 'completed' || a.status === 'abandoned';
                    const bIsDone = b.status === 'completed' || b.status === 'abandoned';
                    if (aIsDone && !bIsDone) return 1;
                    if (!aIsDone && bIsDone) return -1;
                    return 0;
                  }).map(f => (
                    <tr key={f.id}>
                      <td style={{ fontWeight: 600 }}>{getTeamName(f.team1_id)} <span style={{ color: 'var(--text-secondary)' }}>vs</span> {getTeamName(f.team2_id)}</td>
                      <td style={{ textTransform: 'capitalize' }}>{f.match_type.replace('_', ' ')}</td>
                      <td>
                        <span className={`badge badge-${f.status === 'completed' ? 'completed' : (f.status === 'in_progress' ? 'in-progress' : (f.status === 'on_hold' ? 'on-hold' : (f.status === 'abandoned' ? 'abandoned' : 'pending')))}`}>
                          {f.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <button
                          className={`btn ${f.is_frozen ? '' : 'btn-primary'}`}
                          style={{
                            padding: '0.4rem 0.8rem',
                            fontSize: '0.8rem',
                            ...(f.is_frozen ? { background: 'rgba(255, 255, 255, 0.1)', color: 'var(--text-secondary)', cursor: 'not-allowed', borderColor: 'transparent' } : {})
                          }}
                          onClick={() => selectFixture(f)}
                          disabled={f.is_frozen}
                        >
                          <ChevronRight size={14} /> Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ──── Step 3: Setup Lineups ──── */}
      {step === STEPS.SETUP_LINEUPS && selectedFixture && (
        <div className="animate-fade-in">
          <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0 }}>{team1Name} vs {team2Name} - Set Lineups</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
              Assign players for each event
            </p>
          </div>

          <form onSubmit={handleSaveLineups}>
            {events.map(ev => {
              const lineup = lineups[ev.id] || { team1Player1: '', team1Player2: '', team2Player1: '', team2Player2: '', numSets: 1, pointsPerSet: 21 };
              const isSingles = ev.name.toLowerCase().includes('singles');
              return (
                <div key={ev.id} className="glass-card" style={{ marginBottom: '1rem' }}>
                  <h4 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>{ev.name} ({ev.id === bonusEventId ? 3 : 2} pts)</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    {/* Team 1 Players */}
                    <div>
                      <h5 style={{ color: 'var(--accent-primary)', marginBottom: '0.75rem' }}>{team1Name} Players</h5>
                      <div className="form-group">
                        <label className="form-label">Player 1</label>
                        <select className="form-input" value={lineup.team1Player1} onChange={e => {
                          handleLineupChange(ev.id, 'team1Player1', e.target.value);
                          handleLineupChange(ev.id, 'team1Player2', '');
                        }} required>
                          <option value="">-- Select --</option>
                          {getFilteredPlayers(team1Players, ev.name, 1, lineup.team1Player2).map(p => {
                            const name = typeof p === 'object' ? p.name : p;
                            const label = typeof p === 'object' ? `${p.name} (${p.gender === 'Male' ? 'M' : p.gender === 'Female' ? 'F' : p.gender})` : p;
                            return <option key={name} value={name}>{label}</option>;
                          })}
                        </select>
                      </div>
                      {!isSingles && (
                        <div className="form-group">
                          <label className="form-label">Player 2</label>
                          <select className="form-input" value={lineup.team1Player2} onChange={e => handleLineupChange(ev.id, 'team1Player2', e.target.value)} required={!isSingles}>
                            <option value="">-- Select --</option>
                            {getFilteredPlayers(team1Players, ev.name, 2, lineup.team1Player1)
                              .map(p => {
                                const name = typeof p === 'object' ? p.name : p;
                                const label = typeof p === 'object' ? `${p.name} (${p.gender === 'Male' ? 'M' : p.gender === 'Female' ? 'F' : p.gender})` : p;
                                return <option key={name} value={name}>{label}</option>;
                              })
                            }
                          </select>
                        </div>
                      )}
                    </div>
                    {/* Team 2 Players */}
                    <div>
                      <h5 style={{ color: 'var(--accent-danger)', marginBottom: '0.75rem' }}>{team2Name} Players</h5>
                      <div className="form-group">
                        <label className="form-label">Player 1</label>
                        <select className="form-input" value={lineup.team2Player1} onChange={e => {
                          handleLineupChange(ev.id, 'team2Player1', e.target.value);
                          handleLineupChange(ev.id, 'team2Player2', '');
                        }} required>
                          <option value="">-- Select --</option>
                          {getFilteredPlayers(team2Players, ev.name, 1, lineup.team2Player2).map(p => {
                            const name = typeof p === 'object' ? p.name : p;
                            const label = typeof p === 'object' ? `${p.name} (${p.gender === 'Male' ? 'M' : p.gender === 'Female' ? 'F' : p.gender})` : p;
                            return <option key={name} value={name}>{label}</option>;
                          })}
                        </select>
                      </div>
                      {!isSingles && (
                        <div className="form-group">
                          <label className="form-label">Player 2</label>
                          <select className="form-input" value={lineup.team2Player2} onChange={e => handleLineupChange(ev.id, 'team2Player2', e.target.value)} required={!isSingles}>
                            <option value="">-- Select --</option>
                            {getFilteredPlayers(team2Players, ev.name, 2, lineup.team2Player1)
                              .map(p => {
                                const name = typeof p === 'object' ? p.name : p;
                                const label = typeof p === 'object' ? `${p.name} (${p.gender === 'Male' ? 'M' : p.gender === 'Female' ? 'F' : p.gender})` : p;
                                return <option key={name} value={name}>{label}</option>;
                              })
                            }
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Number of Sets</label>
                      <select className="form-input" value={lineup.numSets} onChange={e => handleLineupChange(ev.id, 'numSets', parseInt(e.target.value))}>
                        <option value={1}>1 Set</option>
                        <option value={3}>3 Set</option>
                        <option value={5}>5 Set</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Points per Set</label>
                      <select className="form-input" value={lineup.pointsPerSet} onChange={e => handleLineupChange(ev.id, 'pointsPerSet', parseInt(e.target.value))}>
                        <option value={21}>21</option>
                        <option value={15}>15</option>
                        <option value={11}>11</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0' }}>Select Bonus Event</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                The selected event will be awarded 3 points, while remaining events get 2 points.
              </p>
              <select
                className="form-input"
                value={bonusEventId}
                onChange={e => setBonusEventId(e.target.value)}
              >
                <option value="">-- No Bonus Event --</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1rem', marginBottom: '2rem' }}>
              Save All Combinations
            </button>
          </form>
        </div>
      )}

      {/* ──── Step 4: Overview Fixture ──── */}
      {step === STEPS.OVERVIEW_FIXTURE && selectedFixture && (
        <div className="animate-fade-in">
          <div className="glass-card" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ margin: 0 }}>{team1Name} vs {team2Name} - Events</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Bonus:</span>
              <select
                className="form-input"
                style={{ padding: '0.4rem', fontSize: '0.85rem', minWidth: '150px' }}
                value={existingScorecards.find(sc => sc.event_points === 3)?.event_id || ""}
                onChange={(e) => handleUpdateBonusEvent(e.target.value)}
              >
                <option value="">-- None --</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="glass-card">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Players</th>
                    <th>Score</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {existingScorecards.map(sc => (
                    <tr key={sc.id}>
                      <td>
                        {getEventName(sc.event_id)}
                        {sc.event_points === 3 && <span style={{ color: 'var(--accent-primary)', marginLeft: '4px', fontWeight: 'bold' }} title="Bonus Event">(B)</span>}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {[sc.team1_player1, sc.team1_player2].filter(Boolean).join(', ')} vs {[sc.team2_player1, sc.team2_player2].filter(Boolean).join(', ')}
                      </td>
                      <td>
                        {sc.sets.map((s, i) => (
                          <span key={i} style={{ marginRight: '0.5rem' }}>{s.team1_score}-{s.team2_score}</span>
                        ))}
                      </td>
                      <td>
                        <span className={`badge badge-${sc.status === 'completed' ? 'completed' : (sc.status === 'in_progress' ? 'in-progress' : (sc.status === 'abandoned' ? 'abandoned' : 'pending'))}`}>
                          {sc.status === 'completed' ? (sc.winner === 'team1' ? `${team1Name} Won` : (sc.winner === 'team2' ? `${team2Name} Won` : 'Completed')) : sc.status.replace('_', ' ')}
                        </span>
                        <div style={{ display: 'inline-flex', gap: '0.5rem', marginLeft: '0.5rem' }}>
                          {sc.status !== 'completed' && sc.status !== 'abandoned' ? (
                            <button className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => handleStartScorecard(sc)}>
                              {sc.status === 'pending' ? 'Start' : 'Resume'}
                            </button>
                          ) : (
                            <button className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: 'var(--accent-primary)', borderColor: 'rgba(59, 130, 246, 0.2)' }} onClick={() => handleStartScorecard(sc)}>
                              Resume
                            </button>
                          )}
                          <button className="btn btn-outline" style={{ padding: '0.3rem 0.5rem' }} onClick={() => openEditLineup(sc)}>
                            <Pencil size={14} />
                          </button>
                          {sc.status !== 'completed' && sc.status !== 'abandoned' && (
                            <button className="btn btn-outline" style={{ padding: '0.3rem 0.5rem', color: 'var(--accent-danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => setAbandoningScorecard(sc)} title="Abandon Event">
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem', gap: '1rem' }}>
            <button
              className="btn btn-outline"
              style={{ color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)', padding: '0.75rem 1.5rem' }}
              onClick={() => setShowLockConfirm(true)}
            >
              Lock Match
            </button>
            {selectedFixture.match_type === 'league' && (
              <button
                className="btn btn-outline"
                style={{ color: 'var(--accent-danger)', borderColor: 'var(--accent-danger)', padding: '0.75rem 1.5rem' }}
                onClick={() => setShowAbandonFixtureConfirm(true)}
              >
                Abandon Match
              </button>
            )}
          </div>
        </div>
      )}

      {/* ──── Step 4: Live Scoring ──── */}
      {step === STEPS.SCORING && activeScorecard && selectedFixture && (
        <div className="animate-fade-in">
          {/* Match header */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: '0 0 0.25rem' }}>{team1Name} vs {team2Name}</h2>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{getEventName(activeScorecard.event_id)}</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              <span className="badge badge-in-progress">Set {activeScorecard.current_set + 1} of {activeScorecard.num_sets}</span>
              <span className="badge badge-pending">Target: {activeScorecard.points_per_set} pts</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              {[activeScorecard.team1_player1, activeScorecard.team1_player2].filter(Boolean).join(' & ')}
              {' vs '}
              {[activeScorecard.team2_player1, activeScorecard.team2_player2].filter(Boolean).join(' & ')}
            </p>
          </div>

          {/* Set scores overview */}
          {activeScorecard.num_sets > 1 && (
            <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                {activeScorecard.sets.map((s, i) => {
                  const inactive = isSetInactive(i);
                  return (
                    <div key={i}
                      onClick={() => !inactive && handleChangeSet(i)}
                      style={{
                        textAlign: 'center', padding: '0.5rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        cursor: inactive ? 'not-allowed' : 'pointer',
                        opacity: inactive ? 0.4 : 1,
                        background: i === activeScorecard.current_set ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                        border: i === activeScorecard.current_set ? '1px solid var(--accent-primary)' : '1px solid transparent',
                      }}>
                      <p style={{ fontSize: '0.7rem', color: inactive ? 'var(--text-muted)' : 'var(--text-secondary)', margin: '0 0 0.25rem' }}>Set {i + 1}</p>
                      <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: inactive ? 'var(--text-muted)' : 'inherit' }}>{s.team1_score} - {s.team2_score}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Current set scoring */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* Team 1 */}
            <div className="glass-card" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <h3 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>{team1Name}</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                {[activeScorecard.team1_player1, activeScorecard.team1_player2].filter(Boolean).join(' & ')}
              </p>
              <div className="score-control" style={{ justifyContent: 'center', gap: '1.5rem' }}>
                <button className="score-btn decrement" onClick={() => handleScore('team1', -1)} disabled={activeScorecard.sets[activeScorecard.current_set].team1_score <= 0}>
                  <Minus size={24} />
                </button>
                <div className="score-display">{activeScorecard.sets[activeScorecard.current_set].team1_score}</div>
                <button className="score-btn increment" onClick={() => handleScore('team1', 1)} disabled={isCurrentSetFinished()}>
                  <Plus size={24} />
                </button>
              </div>
            </div>

            {/* Team 2 */}
            <div className="glass-card" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <h3 style={{ color: 'var(--accent-danger)', marginBottom: '0.5rem' }}>{team2Name}</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                {[activeScorecard.team2_player1, activeScorecard.team2_player2].filter(Boolean).join(' & ')}
              </p>
              <div className="score-control" style={{ justifyContent: 'center', gap: '1.5rem' }}>
                <button className="score-btn decrement" onClick={() => handleScore('team2', -1)} disabled={activeScorecard.sets[activeScorecard.current_set].team2_score <= 0}>
                  <Minus size={24} />
                </button>
                <div className="score-display">{activeScorecard.sets[activeScorecard.current_set].team2_score}</div>
                <button className="score-btn increment" onClick={() => handleScore('team2', 1)} disabled={isCurrentSetFinished()}>
                  <Plus size={24} />
                </button>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            {activeScorecard.status === 'completed' && (
              <div className="badge badge-completed" style={{ fontSize: '1.2rem', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'center', marginBottom: '0.5rem' }}>
                <Check size={20} style={{ marginRight: '0.5rem' }} />
                Event Completed - {activeScorecard.winner === 'team1' ? team1Name : team2Name} Wins!
              </div>
            )}

            {activeScorecard.current_set > 0 && (
              <button className="btn btn-outline" onClick={() => handleChangeSet(activeScorecard.current_set - 1)}>
                <ChevronLeft size={16} /> Previous Set
              </button>
            )}

            {activeScorecard.current_set < activeScorecard.num_sets - 1 && !isSetInactive(activeScorecard.current_set + 1) && (
              <button className="btn btn-outline" onClick={() => handleChangeSet(activeScorecard.current_set + 1)}>
                Next Set <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Edit Lineup Modal */}
      {editingScorecard && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Edit Event Lineup</h3>
              <button onClick={() => setEditingScorecard(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEditLineup}>
              {(() => {
                const isSingles = getEventName(editingScorecard.event_id).toLowerCase().includes('singles');
                return (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                      <div>
                        <h5 style={{ color: 'var(--accent-primary)', marginBottom: '0.75rem' }}>{team1Name} Players</h5>
                        <div className="form-group">
                          <label className="form-label">Player 1</label>
                          <select className="form-input" value={editLineupData.team1Player1} onChange={e => setEditLineupData(p => ({ ...p, team1Player1: e.target.value, team1Player2: '' }))} required>
                            <option value="">-- Select --</option>
                            {getFilteredPlayers(team1Players, getEventName(editingScorecard.event_id), 1, editLineupData.team1Player2).map(p => {
                              const name = typeof p === 'object' ? p.name : p;
                              const label = typeof p === 'object' ? `${p.name} (${p.gender === 'Male' ? 'M' : p.gender === 'Female' ? 'F' : p.gender})` : p;
                              return <option key={name} value={name}>{label}</option>;
                            })}
                          </select>
                        </div>
                        {!isSingles && (
                          <div className="form-group">
                            <label className="form-label">Player 2</label>
                            <select className="form-input" value={editLineupData.team1Player2} onChange={e => setEditLineupData(p => ({ ...p, team1Player2: e.target.value }))} required={!isSingles}>
                              <option value="">-- Select --</option>
                              {getFilteredPlayers(team1Players, getEventName(editingScorecard.event_id), 2, editLineupData.team1Player1)
                                .map(p => {
                                  const name = typeof p === 'object' ? p.name : p;
                                  const label = typeof p === 'object' ? `${p.name} (${p.gender === 'Male' ? 'M' : p.gender === 'Female' ? 'F' : p.gender})` : p;
                                  return <option key={name} value={name}>{label}</option>;
                                })
                              }
                            </select>
                          </div>
                        )}
                      </div>
                      <div>
                        <h5 style={{ color: 'var(--accent-danger)', marginBottom: '0.75rem' }}>{team2Name} Players</h5>
                        <div className="form-group">
                          <label className="form-label">Player 1</label>
                          <select className="form-input" value={editLineupData.team2Player1} onChange={e => setEditLineupData(p => ({ ...p, team2Player1: e.target.value, team2Player2: '' }))} required>
                            <option value="">-- Select --</option>
                            {getFilteredPlayers(team2Players, getEventName(editingScorecard.event_id), 1, editLineupData.team2Player2).map(p => {
                              const name = typeof p === 'object' ? p.name : p;
                              const label = typeof p === 'object' ? `${p.name} (${p.gender === 'Male' ? 'M' : p.gender === 'Female' ? 'F' : p.gender})` : p;
                              return <option key={name} value={name}>{label}</option>;
                            })}
                          </select>
                        </div>
                        {!isSingles && (
                          <div className="form-group">
                            <label className="form-label">Player 2</label>
                            <select className="form-input" value={editLineupData.team2Player2} onChange={e => setEditLineupData(p => ({ ...p, team2Player2: e.target.value }))} required={!isSingles}>
                              <option value="">-- Select --</option>
                              {getFilteredPlayers(team2Players, getEventName(editingScorecard.event_id), 2, editLineupData.team2Player1)
                                .map(p => {
                                  const name = typeof p === 'object' ? p.name : p;
                                  const label = typeof p === 'object' ? `${p.name} (${p.gender === 'Male' ? 'M' : p.gender === 'Female' ? 'F' : p.gender})` : p;
                                  return <option key={name} value={name}>{label}</option>;
                                })
                              }
                            </select>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                      <div className="form-group">
                        <label className="form-label">Number of Sets</label>
                        <select className="form-input" value={editLineupData.numSets} onChange={e => setEditLineupData(p => ({ ...p, numSets: parseInt(e.target.value) }))}>
                          <option value={1}>1 Set</option>
                          <option value={3}>3 Set</option>
                          <option value={5}>5 Set</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Points per Set</label>
                        <select className="form-input" value={editLineupData.pointsPerSet} onChange={e => setEditLineupData(p => ({ ...p, pointsPerSet: parseInt(e.target.value) }))}>
                          <option value={21}>21</option>
                          <option value={15}>15</option>
                          <option value={11}>11</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                      <button type="button" className="btn btn-outline" onClick={() => setEditingScorecard(null)}>Cancel</button>
                      <button type="submit" className="btn btn-primary">Save Changes</button>
                    </div>
                  </>
                );
              })()}
            </form>
          </div>
        </div>
      )}

      {/* Lock Confirmation Modal */}
      {showLockConfirm && (
        <Modal
          title="Lock Match?"
          onClose={() => setShowLockConfirm(false)}
        >
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <AlertTriangle size={24} color="var(--accent-danger)" style={{ flexShrink: 0 }} />
            <div>
              <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>
                Lock this match scorecard?
              </p>
              <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                You will not be able to modify the scorecard once it's locked.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button className="btn btn-outline" onClick={() => setShowLockConfirm(false)}>
              Cancel
            </button>
            <button
              className="btn"
              onClick={handleLockMatch}
              style={{ background: 'var(--accent-danger)', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Lock size={16} />
              Lock Match
            </button>
          </div>
        </Modal>
      )}

      {/* Abandon Match Confirmation Modal */}
      {showAbandonFixtureConfirm && (
        <Modal
          title="Abandon Match?"
          onClose={() => setShowAbandonFixtureConfirm(false)}
        >
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <AlertTriangle size={24} color="var(--accent-danger)" style={{ flexShrink: 0 }} />
            <div>
              <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>
                Abandon this match?
              </p>
              <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                All pending and in-progress events will be marked as abandoned. No scores will be calculated for this match. This action cannot be undone.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button className="btn btn-outline" onClick={() => setShowAbandonFixtureConfirm(false)}>
              Cancel
            </button>
            <button
              className="btn"
              onClick={handleAbandonFixture}
              style={{ background: 'var(--accent-danger)', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <X size={16} />
              Abandon Match
            </button>
          </div>
        </Modal>
      )}

      {/* Abandon Event Confirmation Modal */}
      {abandoningScorecard && (
        <Modal
          title="Abandon Event?"
          onClose={() => setAbandoningScorecard(null)}
        >
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <AlertTriangle size={24} color="var(--accent-danger)" style={{ flexShrink: 0 }} />
            <div>
              <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>
                Abandon {getEventName(abandoningScorecard.event_id)}?
              </p>
              <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                This event will not count towards the match score.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button className="btn btn-outline" onClick={() => setAbandoningScorecard(null)}>
              Cancel
            </button>
            <button
              className="btn"
              onClick={handleAbandonScorecard}
              style={{ background: 'var(--accent-danger)', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <X size={16} />
              Abandon Event
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem',
    }} onClick={onClose}>
      <div className="glass-card animate-fade-in" style={{ maxWidth: '480px', width: '100%', background: 'var(--bg-secondary)', backdropFilter: 'none' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
