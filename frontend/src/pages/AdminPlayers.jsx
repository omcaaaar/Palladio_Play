import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Edit, Plus, ShieldCheck, Trash2, Users, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as api from '../api/client';

export default function AdminPlayers() {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [globalPlayers, setGlobalPlayers] = useState([]);
  const [seasonPlayers, setSeasonPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [auction, setAuction] = useState(null);
  const [name, setName] = useState('');
  const [gender, setGender] = useState('Male');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', gender: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [selectedSeasonIds, setSelectedSeasonIds] = useState([]);

  useEffect(() => {
    loadPage();
  }, []);

  useEffect(() => {
    if (selectedTournament) loadSeason(selectedTournament.id);
  }, [selectedTournament]);

  async function loadPage() {
    try {
      const [tournamentData, playerData] = await Promise.all([api.getTournaments(), api.getGlobalPlayers()]);
      setTournaments(tournamentData);
      setGlobalPlayers(playerData);
      if (tournamentData.length > 0) setSelectedTournament(tournamentData[0]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadSeason(tournamentId) {
    try {
      const [players, tournamentTeams, tournamentAuction] = await Promise.all([
        api.getPlayers(tournamentId),
        api.getTeams(tournamentId),
        api.getAuction(tournamentId),
      ]);
      setSeasonPlayers(players);
      setSelectedSeasonIds(players.map(player => player.global_player_id || player.id).filter(Boolean));
      setTeams(tournamentTeams);
      setAuction(tournamentAuction);
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    }
  }

  const availableSeasonIds = new Set(selectedSeasonIds.filter(Boolean));
  const selectedPlayerCount = globalPlayers.filter(player => availableSeasonIds.has(player.id)).length;
  const genderOptions = selectedTournament?.category === 'Kids'
    ? [{ value: 'Junior', label: 'Junior' }, { value: 'Senior', label: 'Senior' }]
    : [{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }];

  function isAssigned(playerName) {
    if (teams.some(team => team.players_list?.some(player =>
      (typeof player === 'object' ? player.name : player).toLowerCase() === playerName.toLowerCase()
    ))) return true;
    return auction?.status === 'live' && Object.values(auction.team_players || {}).some(teamPlayers =>
      teamPlayers.some(player => player.name.toLowerCase() === playerName.toLowerCase())
    );
  }

  async function handleAddGlobalPlayer(e) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    try {
      const result = await api.addGlobalPlayer({ name: trimmedName, gender });
      setGlobalPlayers([...globalPlayers, result.player]);
      setName('');
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSaveGlobalPlayer(playerId) {
    const trimmedName = editForm.name.trim();
    if (!trimmedName) return;
    try {
      const result = await api.updateGlobalPlayer(playerId, { name: trimmedName, gender: editForm.gender });
      setGlobalPlayers(globalPlayers.map(player => player.id === playerId ? result.player : player));
      setEditingId(null);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteGlobalPlayer(player) {
    if (isAssigned(player.name)) {
      setError('Cannot delete a player already assigned to a team or live auction.');
      return;
    }
    if (!window.confirm(`Delete ${player.name} from the global player list?`)) return;
    try {
      await api.deleteGlobalPlayer(player.id);
      setGlobalPlayers(globalPlayers.filter(existingPlayer => existingPlayer.id !== player.id));
      if (availableSeasonIds.has(player.id)) {
        const nextIds = [...availableSeasonIds].filter(id => id !== player.id);
        setSelectedSeasonIds(nextIds);
        await saveAvailability(nextIds);
      }
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveAvailability(playerIds) {
    setSavingAvailability(true);
    try {
      const validPlayerIds = new Set(playerIds.filter(Boolean));
      const selectedGlobalPlayerIds = globalPlayers
        .filter(player => validPlayerIds.has(player.id))
        .map(player => player.id);
      await api.updatePlayerAvailability(selectedTournament.id, selectedGlobalPlayerIds);
      const savedSeasonPlayers = await api.getPlayers(selectedTournament.id);
      setSeasonPlayers(savedSeasonPlayers);
      setSelectedSeasonIds(savedSeasonPlayers.map(player => player.global_player_id || player.id).filter(Boolean));
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingAvailability(false);
    }
  }

  function toggleAvailability(playerId) {
    setSelectedSeasonIds(currentIds => {
      const nextIds = new Set(currentIds.filter(Boolean));
      if (nextIds.has(playerId)) nextIds.delete(playerId);
      else nextIds.add(playerId);
      return [...nextIds];
    });
  }

  async function handleSaveAvailability(e) {
    e.preventDefault();
    await saveAvailability(selectedSeasonIds);
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <div>
          <button className="btn btn-outline" onClick={() => navigate('/admin')} style={{ marginBottom: '1.25rem', padding: '0.5rem 0.8rem', fontSize: '0.85rem' }}><ArrowLeft size={16} /> Admin Dashboard</button>
          <h1 style={{ marginBottom: '0.5rem' }}>Season Player Availability</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Manage the global player list and choose who is available for each season.</p>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)' }}><ShieldCheck size={18} /> Admin only</div>
      </div>

      {error && <div style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error" style={iconButtonStyle('var(--accent-danger)')}><X size={16} /></button></div>}

      {loading ? <div className="glass-card"><p style={{ color: 'var(--text-secondary)', margin: 0 }}>Loading players...</p></div> : (
        <>
          <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}><Users size={20} color="var(--accent-primary)" /><div><h3 style={{ margin: 0 }}>Global Player List</h3><p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0', fontSize: '0.85rem' }}>Players created here can be made available in any season.</p></div></div>
            <form onSubmit={handleAddGlobalPlayer} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}><input className="form-input" placeholder="Player name" value={name} onChange={e => setName(e.target.value)} required style={{ flex: 1, minWidth: '200px' }} /><select className="form-input" value={gender} onChange={e => setGender(e.target.value)} style={{ width: '130px' }}>{genderOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select><button type="submit" className="btn btn-primary"><Plus size={16} /> Add Global Player</button></form>
            {globalPlayers.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No global players yet.</p> : <div className="table-container"><table><thead><tr><th>Name</th><th>Gender</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead><tbody>{globalPlayers.map(player => editingId === player.id ? <tr key={player.id}><td><input className="form-input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></td><td><select className="form-input" value={editForm.gender} onChange={e => setEditForm({ ...editForm, gender: e.target.value })}>{genderOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></td><td style={{ textAlign: 'right' }}><button onClick={() => handleSaveGlobalPlayer(player.id)} aria-label="Save player" style={iconButtonStyle('var(--accent-secondary)')}><Check size={16} /></button><button onClick={() => setEditingId(null)} aria-label="Cancel edit" style={iconButtonStyle('var(--text-secondary)')}><X size={16} /></button></td></tr> : <tr key={player.id}><td>{player.name}</td><td>{player.gender}</td><td style={{ textAlign: 'right' }}><button onClick={() => { setEditingId(player.id); setEditForm({ name: player.name, gender: player.gender }); }} aria-label={`Edit ${player.name}`} style={iconButtonStyle('var(--accent-primary)')}><Edit size={16} /></button><button onClick={() => handleDeleteGlobalPlayer(player)} aria-label={`Delete ${player.name}`} style={iconButtonStyle('var(--accent-danger)')}><Trash2 size={16} /></button></td></tr>)}</tbody></table></div>}
          </div>

          {tournaments.length === 0 ? <div className="glass-card"><p style={{ color: 'var(--text-secondary)', margin: 0 }}>Create a tournament before selecting season player availability.</p></div> : <form className="glass-card" onSubmit={handleSaveAvailability}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}><div><h3 style={{ margin: 0 }}>Season Availability</h3><p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0', fontSize: '0.85rem' }}>Select global players eligible for this tournament.</p></div><select className="form-input" style={{ maxWidth: '320px' }} value={selectedTournament?.id || ''} onChange={e => setSelectedTournament(tournaments.find(tournament => tournament.id === e.target.value))}>{tournaments.map(tournament => <option key={tournament.id} value={tournament.id}>{tournament.name}</option>)}</select></div>{globalPlayers.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>Add players to the global list first.</p> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '0.75rem' }}>{globalPlayers.map(player => { const isSelected = availableSeasonIds.has(player.id); return <button key={player.id} type="button" role="checkbox" aria-checked={isSelected} disabled={savingAvailability} onClick={() => toggleAvailability(player.id, !isSelected)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', border: `1px solid ${isSelected ? 'rgba(59, 130, 246, 0.55)' : 'var(--glass-border)'}`, borderRadius: 'var(--radius-md)', cursor: savingAvailability ? 'wait' : 'pointer', color: 'var(--text-primary)', textAlign: 'left', background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }}><span aria-hidden="true" style={{ display: 'grid', placeItems: 'center', width: '20px', height: '20px', border: '2px solid currentColor', borderRadius: '4px', color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)', flexShrink: 0 }}>{isSelected && <Check size={14} strokeWidth={3} />}</span><span><strong>{player.name}</strong><small style={{ display: 'block', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{player.gender}</small></span></button>; })}</div>}<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}><p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>{selectedPlayerCount} player{selectedPlayerCount === 1 ? '' : 's'} selected for {selectedTournament?.name}</p><button type="submit" className="btn btn-primary" disabled={savingAvailability}>{savingAvailability ? 'Saving...' : 'Save Availability'}</button></div></form>}
        </>
      )}
    </div>
  );
}

function iconButtonStyle(color) {
  return { background: 'none', border: 'none', color, cursor: 'pointer', padding: '0.25rem', marginLeft: '0.5rem' };
}
