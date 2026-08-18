import { useState, useEffect } from 'react';
import { Settings, Plus, Users, Calendar, Trash2, ChevronRight, Trophy, X, ListChecks, Edit } from 'lucide-react';
import * as api from '../api/client';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('tournaments');
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);

  // Data for the selected tournament
  const [teams, setTeams] = useState([]);
  const [events, setEvents] = useState([]);
  const [fixtures, setFixtures] = useState([]);

  // Modal states
  const [showTournamentForm, setShowTournamentForm] = useState(false);
  const [showEditTournamentForm, setShowEditTournamentForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showFixtureForm, setShowFixtureForm] = useState(false);
  const [showEditFixtureForm, setShowEditFixtureForm] = useState(false);
  const [showEditEventForm, setShowEditEventForm] = useState(false);
  const [showPlayerForm, setShowPlayerForm] = useState(null); // team id or null

  // Edit Event Form states
  const [editingEvent, setEditingEvent] = useState(null);
  const [editEventName, setEditEventName] = useState('');
  const [editEventPoints, setEditEventPoints] = useState(2);

  // Form states
  const [tournamentName, setTournamentName] = useState('');
  const [tournamentSport, setTournamentSport] = useState('Badminton');
  const [editTournamentName, setEditTournamentName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamOwners, setTeamOwners] = useState('');
  const [teamGroup, setTeamGroup] = useState('');
  const EVENT_TYPES = [
    "Men's Singles",
    "Men's Doubles",
    "Women's Singles",
    "Women's Doubles",
    "Mixed Doubles"
  ];
  const [eventName, setEventName] = useState(EVENT_TYPES[0]);
  const [eventPoints, setEventPoints] = useState(2);
  const [fixtureTeam1, setFixtureTeam1] = useState('');
  const [fixtureTeam2, setFixtureTeam2] = useState('');
  const [fixtureType, setFixtureType] = useState('league');
  const [fixtureDateTime, setFixtureDateTime] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [playerGender, setPlayerGender] = useState('Male');

  // Edit Fixture Form states
  const [editingFixture, setEditingFixture] = useState(null);
  const [editFixtureTeam1, setEditFixtureTeam1] = useState('');
  const [editFixtureTeam2, setEditFixtureTeam2] = useState('');
  const [editFixtureType, setEditFixtureType] = useState('league');
  const [editFixtureDateTime, setEditFixtureDateTime] = useState('');
  const [editFixtureStatus, setEditFixtureStatus] = useState('pending');

  const [error, setError] = useState('');

  useEffect(() => {
    loadTournaments();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      loadTournamentData(selectedTournament.id);
    }
  }, [selectedTournament]);

  async function loadTournaments() {
    try {
      const data = await api.getTournaments();
      setTournaments(data);
    } catch (e) { setError(e.message); }
  }

  async function loadTournamentData(tid) {
    try {
      const [t, e, f] = await Promise.all([
        api.getTeams(tid),
        api.getEvents(tid),
        api.getFixtures(tid),
      ]);
      setTeams(t);
      setEvents(e);
      setFixtures(f);
    } catch (e) { setError(e.message); }
  }

  async function handleCreateTournament(e) {
    e.preventDefault();
    try {
      const res = await api.createTournament(tournamentName, tournamentSport);
      setTournaments([...tournaments, res.tournament]);
      setSelectedTournament(res.tournament);
      setActiveTab('teams');
      setTournamentName('');
      setTournamentSport('Badminton');
      setShowTournamentForm(false);
    } catch (err) { setError(err.message); }
  }

  async function handleEditTournament(e) {
    e.preventDefault();
    try {
      const res = await api.updateTournament(selectedTournament.id, editTournamentName);
      const updatedList = tournaments.map(t => t.id === selectedTournament.id ? res.tournament : t);
      setTournaments(updatedList);
      setSelectedTournament(res.tournament);
      setShowEditTournamentForm(false);
    } catch (err) { setError(err.message); }
  }

  async function handleDeleteTournament() {
    if (!window.confirm(`Are you sure you want to delete the tournament "${selectedTournament.name}"? This will delete all its teams, fixtures, events, and scorecards.`)) {
      return;
    }
    try {
      await api.deleteTournament(selectedTournament.id);
      const updatedList = tournaments.filter(t => t.id !== selectedTournament.id);
      setTournaments(updatedList);
      setSelectedTournament(null);
    } catch (err) { setError(err.message); }
  }

  async function handleAddTeam(e) {
    e.preventDefault();
    try {
      const res = await api.addTeam(selectedTournament.id, {
        name: teamName,
        owners: teamOwners,
        group: teamGroup,
      });
      setTeams([...teams, res.team]);
      setTeamName(''); setTeamOwners(''); setTeamGroup('');
      setShowTeamForm(false);
    } catch (err) { setError(err.message); }
  }

  async function handleAddEvent(e) {
    e.preventDefault();
    try {
      const existingEvents = events.filter(ev => ev.name.startsWith(eventName));
      let finalName = eventName;
      
      if (existingEvents.length === 1 && existingEvents[0].name === eventName) {
        // Rename the first one
        await api.updateEvent(selectedTournament.id, existingEvents[0].id, {
          name: `${eventName} 1`,
          points: existingEvents[0].points
        });
        finalName = `${eventName} 2`;
      } else if (existingEvents.length > 0) {
        finalName = `${eventName} ${existingEvents.length + 1}`;
      }

      await api.addEvent(selectedTournament.id, {
        name: finalName,
        points: eventPoints,
      });

      // Refetch events to get all updated names
      const updatedEvents = await api.getEvents(selectedTournament.id);
      setEvents(updatedEvents);
      
      setEventName(EVENT_TYPES[0]); 
      setEventPoints(2);
      setShowEventForm(false);
    } catch (err) { setError(err.message); }
  }

  async function handleEditEvent(e) {
    e.preventDefault();
    try {
      const res = await api.updateEvent(selectedTournament.id, editingEvent.id, {
        name: editEventName,
        points: editEventPoints,
      });
      setEvents(events.map(ev => ev.id === editingEvent.id ? res.event : ev));
      setEditingEvent(null);
      setShowEditEventForm(false);
    } catch (err) { setError(err.message); }
  }

  async function handleAddFixture(e) {
    e.preventDefault();
    if (fixtureTeam1 === fixtureTeam2) {
      setError('Please select two different teams');
      return;
    }
    try {
      const res = await api.addFixture(selectedTournament.id, {
        team1_id: fixtureTeam1,
        team2_id: fixtureTeam2,
        match_type: fixtureType,
        date_time: fixtureDateTime || null,
      });
      setFixtures([...fixtures, res.fixture]);
      setFixtureTeam1(''); setFixtureTeam2(''); setFixtureType('league'); setFixtureDateTime('');
      setShowFixtureForm(false);
    } catch (err) { setError(err.message); }
  }

  async function handleEditFixture(e) {
    e.preventDefault();
    if (editFixtureTeam1 === editFixtureTeam2) {
      setError('Please select two different teams');
      return;
    }
    try {
      const res = await api.updateFixture(selectedTournament.id, editingFixture.id, {
        team1_id: editFixtureTeam1,
        team2_id: editFixtureTeam2,
        match_type: editFixtureType,
        date_time: editFixtureDateTime || null,
        status: editFixtureStatus,
      });
      setFixtures(fixtures.map(f => f.id === editingFixture.id ? res.fixture : f));
      setEditingFixture(null);
      setShowEditFixtureForm(false);
    } catch (err) { setError(err.message); }
  }

  async function handleAddPlayer(e) {
    e.preventDefault();
    const team = teams.find(t => t.id === showPlayerForm);
    if (!team) return;
    try {
      const updatedPlayers = [...(team.players_list || []), { name: playerName, gender: playerGender }];
      const res = await api.updateTeam(selectedTournament.id, team.id, {
        players_list: updatedPlayers,
      });
      setTeams(teams.map(t => t.id === team.id ? res.team : t));
      setPlayerName('');
      setPlayerGender('Male');
    } catch (err) { setError(err.message); }
  }

  async function handleRemovePlayer(teamId, playerIdx) {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    try {
      const updatedPlayers = team.players_list.filter((_, i) => i !== playerIdx);
      const res = await api.updateTeam(selectedTournament.id, team.id, {
        players_list: updatedPlayers,
      });
      setTeams(teams.map(t => t.id === teamId ? res.team : t));
    } catch (err) { setError(err.message); }
  }

  async function handleUpdateGroup(teamId, group) {
    try {
      const res = await api.updateTeam(selectedTournament.id, teamId, { group });
      setTeams(teams.map(t => t.id === teamId ? res.team : t));
    } catch (err) { setError(err.message); }
  }

  async function handleDeleteTeam(teamId) {
    const team = teams.find(t => t.id === teamId);
    const teamName = team ? team.name : 'this team';
    if (!window.confirm(`Are you sure you want to delete the team "${teamName}"? This will also remove all its players.`)) {
      return;
    }
    try {
      await api.deleteTeam(selectedTournament.id, teamId);
      setTeams(teams.filter(t => t.id !== teamId));
    } catch (err) { setError(err.message); }
  }

  async function handleDeleteEvent(eventId) {
    const eventObj = events.find(e => e.id === eventId);
    const eventNameStr = eventObj ? eventObj.name : 'this event';
    if (!window.confirm(`Are you sure you want to delete the event type "${eventNameStr}"?`)) {
      return;
    }
    try {
      await api.deleteEvent(selectedTournament.id, eventId);
      
      const baseType = EVENT_TYPES.find(t => eventNameStr.startsWith(t));
      if (baseType) {
        const remainingEvents = events.filter(e => e.id !== eventId && e.name.startsWith(baseType));
        
        if (remainingEvents.length === 1) {
          await api.updateEvent(selectedTournament.id, remainingEvents[0].id, {
            name: baseType,
            points: remainingEvents[0].points
          });
        } else if (remainingEvents.length > 1) {
          for (let i = 0; i < remainingEvents.length; i++) {
            const ev = remainingEvents[i];
            const newName = `${baseType} ${i + 1}`;
            if (ev.name !== newName) {
              await api.updateEvent(selectedTournament.id, ev.id, {
                name: newName,
                points: ev.points
              });
            }
          }
        }
      }
      
      const updatedEvents = await api.getEvents(selectedTournament.id);
      setEvents(updatedEvents);
    } catch (err) { setError(err.message); }
  }

  async function handleDeleteFixture(fixtureId) {
    const fixture = fixtures.find(f => f.id === fixtureId);
    const matchName = fixture ? `${getTeamName(fixture.team1_id)} vs ${getTeamName(fixture.team2_id)}` : 'this fixture';
    if (!window.confirm(`Are you sure you want to delete ${matchName}? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.deleteFixture(selectedTournament.id, fixtureId);
      setFixtures(fixtures.filter(f => f.id !== fixtureId));
    } catch (err) { setError(err.message); }
  }

  function getTeamName(id) {
    return teams.find(t => t.id === id)?.name || id;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Admin Control Panel</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage tournaments, teams, events and schedules</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)' }}>
          <Settings size={18} />
          <span style={{ fontWeight: 500 }}>Admin Mode</span>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer' }}><X size={16} /></button>
        </div>
      )}

      {/* Tournament selector */}
      {tournaments.length > 0 && (
        <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Trophy size={20} color="var(--accent-primary)" />
                <select
                  className="form-input"
                  style={{ width: '250px' }}
                  value={selectedTournament?.id || ''}
                  onChange={(e) => {
                    const t = tournaments.find(t => t.id === e.target.value);
                    setSelectedTournament(t || null);
                    if (t) {
                      setActiveTab('teams');
                    }
                  }}
                >
                  <option value="">-- Select Tournament --</option>
                  {tournaments.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              {selectedTournament && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-outline"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                    onClick={() => {
                      setEditTournamentName(selectedTournament.name);
                      setShowEditTournamentForm(true);
                    }}
                  >
                    Edit Name
                  </button>
                  <button
                    className="btn btn-outline"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', color: 'var(--accent-danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                    onClick={handleDeleteTournament}
                  >
                    Delete Tournament
                  </button>
                </div>
              )}
            </div>
            <button className="btn btn-primary" onClick={() => setShowTournamentForm(true)}>
              <Plus size={18} /> New Tournament
            </button>
          </div>
        </div>
      )}

      {/* New tournament modal */}
      {showTournamentForm && (
        <Modal title="Create New Tournament" onClose={() => setShowTournamentForm(false)}>
          <form onSubmit={handleCreateTournament}>
            <div className="form-group">
              <label className="form-label">Tournament Name</label>
              <input className="form-input" placeholder="e.g. Badminton Championship 2026" value={tournamentName} onChange={e => setTournamentName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Sport</label>
              <select className="form-input" value={tournamentSport} onChange={e => setTournamentSport(e.target.value)} required>
                <option value="Badminton">Badminton</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Create Tournament</button>
          </form>
        </Modal>
      )}

      {/* Edit tournament modal */}
      {showEditTournamentForm && (
        <Modal title="Edit Tournament Name" onClose={() => setShowEditTournamentForm(false)}>
          <form onSubmit={handleEditTournament}>
            <div className="form-group">
              <label className="form-label">Tournament Name</label>
              <input className="form-input" placeholder="e.g. Badminton Championship 2026" value={editTournamentName} onChange={e => setEditTournamentName(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Save Changes</button>
          </form>
        </Modal>
      )}

      {/* Team Form Modal */}
      {showTeamForm && (
        <Modal title="Add New Team" onClose={() => setShowTeamForm(false)}>
          <form onSubmit={handleAddTeam}>
            <div className="form-group">
              <label className="form-label">Team Name</label>
              <input className="form-input" placeholder="e.g. Thunderbolts" value={teamName} onChange={e => setTeamName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Owner(s)</label>
              <input className="form-input" placeholder="e.g. John, Jane" value={teamOwners} onChange={e => setTeamOwners(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Group</label>
              <input className="form-input" placeholder="e.g. A or B (leave blank if no groups)" value={teamGroup} onChange={e => setTeamGroup(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Add Team</button>
          </form>
        </Modal>
      )}

      {/* Event Form Modal */}
      {showEventForm && (
        <Modal title="Add Event Type" onClose={() => setShowEventForm(false)}>
          <form onSubmit={handleAddEvent}>
            <div className="form-group">
              <label className="form-label">Event Type</label>
              <select className="form-input" value={eventName} onChange={e => setEventName(e.target.value)} required>
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Points</label>
              <select className="form-input" value={eventPoints} onChange={e => setEventPoints(parseInt(e.target.value))} required>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Add Event</button>
          </form>
        </Modal>
      )}

      {/* Edit Event Form Modal */}
      {showEditEventForm && editingEvent && (
        <Modal title="Edit Event Type" onClose={() => { setShowEditEventForm(false); setEditingEvent(null); }}>
          <form onSubmit={handleEditEvent}>
            <div className="form-group">
              <label className="form-label">Event Name</label>
              <input className="form-input" value={editEventName} disabled style={{ backgroundColor: 'var(--bg-secondary)', cursor: 'not-allowed', color: 'var(--text-secondary)' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Points</label>
              <select className="form-input" value={editEventPoints} onChange={e => setEditEventPoints(parseInt(e.target.value))} required>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Save Changes</button>
          </form>
        </Modal>
      )}

      {/* Fixture Form Modal */}
      {showFixtureForm && (
        <Modal title="Add Match Fixture" onClose={() => setShowFixtureForm(false)}>
          <form onSubmit={handleAddFixture}>
            <div className="form-group">
              <label className="form-label">Team 1</label>
              <select className="form-input" value={fixtureTeam1} onChange={e => setFixtureTeam1(e.target.value)} required>
                <option value="">-- Select Team 1 --</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Team 2</label>
              <select className="form-input" value={fixtureTeam2} onChange={e => setFixtureTeam2(e.target.value)} required>
                <option value="">-- Select Team 2 --</option>
                {teams.filter(t => t.id !== fixtureTeam1).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Match Type</label>
              <select className="form-input" value={fixtureType} onChange={e => setFixtureType(e.target.value)}>
                <option value="league">League</option>
                <option value="qualifier_1">Qualifier 1</option>
                <option value="eliminator">Eliminator</option>
                <option value="qualifier_2">Qualifier 2</option>
                <option value="semi_final">Semi Final</option>
                <option value="final">Final</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date & Time (Optional)</label>
              <input type="datetime-local" className="form-input" value={fixtureDateTime} onChange={e => setFixtureDateTime(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Add Fixture</button>
          </form>
        </Modal>
      )}

      {/* Edit Fixture Form Modal */}
      {showEditFixtureForm && editingFixture && (
        <Modal title="Edit Match Fixture" onClose={() => { setShowEditFixtureForm(false); setEditingFixture(null); }}>
          <form onSubmit={handleEditFixture}>
            <div className="form-group">
              <label className="form-label">Team 1</label>
              <select className="form-input" value={editFixtureTeam1} onChange={e => setEditFixtureTeam1(e.target.value)} required>
                <option value="">-- Select Team 1 --</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Team 2</label>
              <select className="form-input" value={editFixtureTeam2} onChange={e => setEditFixtureTeam2(e.target.value)} required>
                <option value="">-- Select Team 2 --</option>
                {teams.filter(t => t.id !== editFixtureTeam1).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Match Type</label>
              <select className="form-input" value={editFixtureType} onChange={e => setEditFixtureType(e.target.value)}>
                <option value="league">League</option>
                <option value="qualifier_1">Qualifier 1</option>
                <option value="eliminator">Eliminator</option>
                <option value="qualifier_2">Qualifier 2</option>
                <option value="semi_final">Semi Final</option>
                <option value="final">Final</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date & Time (Optional)</label>
              <input type="datetime-local" className="form-input" value={editFixtureDateTime} onChange={e => setEditFixtureDateTime(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input" value={editFixtureStatus} onChange={e => setEditFixtureStatus(e.target.value)}>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Save Changes</button>
          </form>
        </Modal>
      )}

      {/* Tabs – only show if tournament is selected */}
      {selectedTournament && (
        <>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {[
              { key: 'teams', icon: <Users size={16} />, label: 'Teams & Players' },
              { key: 'events', icon: <ListChecks size={16} />, label: 'Event Types' },
              { key: 'fixtures', icon: <Calendar size={16} />, label: 'Match Fixtures' },
            ].map(tab => (
              <button
                key={tab.key}
                className={`btn ${activeTab === tab.key ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setActiveTab(tab.key)}
                style={{ fontSize: '0.875rem' }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* ──── Teams Tab ──── */}
          {activeTab === 'teams' && (
            <div className="glass-card animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>Teams & Players</h3>
                <button className="btn btn-primary" style={{ fontSize: '0.875rem' }} onClick={() => setShowTeamForm(true)}>
                  <Plus size={16} /> Add Team
                </button>
              </div>



              {teams.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No teams added yet. Click "Add Team" to start.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                  {teams.map(team => (
                    <div key={team.id} className="glass-card" style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div>
                          <h4 style={{ margin: 0 }}>{team.name}</h4>
                          {team.owners && <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>Owner: {team.owners}</p>}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <select
                            className="form-input"
                            style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', width: 'auto', minWidth: '80px' }}
                            value={team.group || ''}
                            onChange={e => handleUpdateGroup(team.id, e.target.value)}
                          >
                            <option value="">No Group</option>
                            <option value="A">Group A</option>
                            <option value="B">Group B</option>
                            <option value="C">Group C</option>
                            <option value="D">Group D</option>
                          </select>
                          <button onClick={() => handleDeleteTeam(team.id)} style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', padding: '4px' }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Players */}
                      <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '0.75rem' }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                          Players ({team.players_list?.length || 0})
                        </p>
                        {team.players_list?.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.5rem' }}>
                            {team.players_list.map((p, idx) => (
                              <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.6rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-full)', fontSize: '0.8rem' }}>
                                {typeof p === 'object' ? `${p.name} (${p.gender === 'Male' ? 'M' : 'F'})` : p}
                                <button onClick={() => handleRemovePlayer(team.id, idx)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0', lineHeight: 1 }}>
                                  <X size={12} />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        {showPlayerForm === team.id ? (
                          <form onSubmit={handleAddPlayer} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <input className="form-input" style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', flex: 2, minWidth: '120px' }} placeholder="Player name" value={playerName} onChange={e => setPlayerName(e.target.value)} required />
                            <select className="form-input" style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', flex: 1, minWidth: '80px' }} value={playerGender} onChange={e => setPlayerGender(e.target.value)} required>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                            </select>
                            <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Add</button>
                            <button type="button" className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => { setShowPlayerForm(null); setPlayerName(''); setPlayerGender('Male'); }}>Cancel</button>
                          </form>
                        ) : (
                          <button onClick={() => { setShowPlayerForm(team.id); setPlayerGender('Male'); }} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}>
                            + Add Player
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ──── Events Tab ──── */}
          {activeTab === 'events' && (
            <div className="glass-card animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>Event Types</h3>
                <button className="btn btn-primary" style={{ fontSize: '0.875rem' }} onClick={() => setShowEventForm(true)}>
                  <Plus size={16} /> Add Event
                </button>
              </div>



              {events.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No event types defined yet. Add event types like "Men's Singles 1", "Women's Doubles 1", etc.</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Event Name</th>
                        <th>Points</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map(ev => (
                        <tr key={ev.id}>
                          <td>{ev.name}</td>
                          <td><span className="badge badge-in-progress">{ev.points} pts</span></td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => {
                                  setEditingEvent(ev);
                                  setEditEventName(ev.name);
                                  setEditEventPoints(ev.points);
                                  setShowEditEventForm(true);
                                }}
                                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', padding: '4px' }}
                              >
                                <Edit size={16} />
                              </button>
                              <button onClick={() => handleDeleteEvent(ev.id)} style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', padding: '4px' }}>
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ──── Fixtures Tab ──── */}
          {activeTab === 'fixtures' && (
            <div className="glass-card animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>Match Fixtures</h3>
                <button className="btn btn-primary" style={{ fontSize: '0.875rem' }} onClick={() => setShowFixtureForm(true)} disabled={teams.length < 2}>
                  <Plus size={16} /> Add Fixture
                </button>
              </div>



              {teams.length < 2 ? (
                <p style={{ color: 'var(--text-secondary)' }}>Add at least 2 teams before creating fixtures.</p>
              ) : fixtures.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No fixtures created yet. Click "Add Fixture" to schedule team vs team matches.</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Match</th>
                        <th>Type</th>
                        <th>Date & Time</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fixtures.map(f => (
                        <tr key={f.id}>
                          <td style={{ fontWeight: 600 }}>{getTeamName(f.team1_id)} <span style={{ color: 'var(--text-secondary)' }}>vs</span> {getTeamName(f.team2_id)}</td>
                          <td><span style={{ textTransform: 'capitalize' }}>{f.match_type.replace('_', ' ')}</span></td>
                          <td>{f.date_time ? new Date(f.date_time).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : <span style={{ color: 'var(--text-secondary)' }}>Not Scheduled</span>}</td>
                          <td>
                            <span className={`badge badge-${f.status === 'completed' ? 'completed' : f.status === 'in_progress' ? 'in-progress' : (f.status === 'on_hold' ? 'on-hold' : 'pending')}`}>
                              {f.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => {
                                  setEditingFixture(f);
                                  setEditFixtureTeam1(f.team1_id);
                                  setEditFixtureTeam2(f.team2_id);
                                  setEditFixtureType(f.match_type);
                                  setEditFixtureDateTime(f.date_time || '');
                                  setEditFixtureStatus(f.status);
                                  setShowEditFixtureForm(true);
                                }}
                                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', padding: '4px' }}
                              >
                                <Edit size={16} />
                              </button>
                              <button onClick={() => handleDeleteFixture(f.id)} style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', padding: '4px' }}>
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!selectedTournament && tournaments.length > 0 && (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Trophy size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem' }} />
          <h3>Select a Tournament</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Choose a tournament from the dropdown above to manage teams, events, and fixtures.</p>
        </div>
      )}

      {!selectedTournament && tournaments.length === 0 && (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Trophy size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem' }} />
          <h3>Get Started</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Create your first tournament to begin setting up teams and fixtures.</p>
          <button className="btn btn-primary" onClick={() => setShowTournamentForm(true)}>
            <Plus size={18} /> Create Tournament
          </button>
        </div>
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
