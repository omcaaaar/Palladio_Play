import React, { useState, useEffect, useRef } from 'react';
import { Settings, Plus, Users, Calendar, Trash2, ChevronRight, Trophy, X, ListChecks, Edit, Gavel, Check, ZoomIn, ZoomOut, AlertTriangle, Lock, Camera } from 'lucide-react';
import { Link } from 'react-router-dom';
import * as api from '../api/client';
import CustomDatePicker from '../components/CustomDatePicker';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('tournaments');
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);

  // Data for the selected tournament
  const [teams, setTeams] = useState([]);
  const [events, setEvents] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [tournamentPlayers, setTournamentPlayers] = useState([]);

  // Player tab states
  const [newPlayerFirstName, setNewPlayerFirstName] = useState('');
  const [newPlayerLastName, setNewPlayerLastName] = useState('');
  const [newPlayerMobile, setNewPlayerMobile] = useState('');
  const [newPlayerWing, setNewPlayerWing] = useState('');
  const [newPlayerFlatNo, setNewPlayerFlatNo] = useState('');
  const [newPlayerAge, setNewPlayerAge] = useState('');
  const [newPlayerGender, setNewPlayerGender] = useState('');
  const [newPlayerExpertise, setNewPlayerExpertise] = useState('');
  const [newPlayerPlayedStateNational, setNewPlayerPlayedStateNational] = useState('');
  const [newPlayerPhoto, setNewPlayerPhoto] = useState(null);
  const [newPlayerPhotoPreview, setNewPlayerPhotoPreview] = useState(null);
  const fileInputRef = useRef(null);
  
  const [isRegisterFormOpen, setIsRegisterFormOpen] = useState(false);

  const [editingPlayerId, setEditingPlayerId] = useState(null);

  // Auction state
  const [auction, setAuction] = useState(null);
  const [auctionMaxPlayers, setAuctionMaxPlayers] = useState(8);
  const [auctionTotalPoints, setAuctionTotalPoints] = useState(100);
  const [auctionStartingBid, setAuctionStartingBid] = useState(10);
  // Inline add player state per team: { [teamId]: { name, gender, points } }
  const [auctionPlayerForms, setAuctionPlayerForms] = useState({});
  const [isEditingAuctionParams, setIsEditingAuctionParams] = useState(false);

  // Modal states
  const [showTournamentForm, setShowTournamentForm] = useState(false);
  const [showEditTournamentForm, setShowEditTournamentForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showFixtureForm, setShowFixtureForm] = useState(false);
  const [showEditFixtureForm, setShowEditFixtureForm] = useState(false);
  const [showEditEventForm, setShowEditEventForm] = useState(false);
  const [showPlayerForm, setShowPlayerForm] = useState(null); // team id or null
  const [showDeleteTournamentConfirm, setShowDeleteTournamentConfirm] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState(null);
  const [pendingConfirmation, setPendingConfirmation] = useState(null);

  // Edit Event Form states
  const [editingEvent, setEditingEvent] = useState(null);
  const [editEventName, setEditEventName] = useState('');

  // Form states
  const [tournamentName, setTournamentName] = useState('');
  const [tournamentSport, setTournamentSport] = useState('Badminton');
  const [tournamentCategory, setTournamentCategory] = useState('Adults');
  const [tournamentStartDate, setTournamentStartDate] = useState('');
  const [tournamentEndDate, setTournamentEndDate] = useState('');
  const [tournamentDeadline, setTournamentDeadline] = useState('');
  const [tournamentDeadlineTime, setTournamentDeadlineTime] = useState('23:59');
  const [tournamentEntryFees, setTournamentEntryFees] = useState('');
  const [tournamentUpiNumber, setTournamentUpiNumber] = useState('');
  const [tournamentKidsAgeLimit, setTournamentKidsAgeLimit] = useState(12);
  const [editTournamentName, setEditTournamentName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamOwners, setTeamOwners] = useState('');
  const [teamGroup, setTeamGroup] = useState('');
  const EVENT_TYPES_ADULTS = [
    "Men's Singles",
    "Men's Doubles",
    "Women's Singles",
    "Women's Doubles",
    "Mixed Doubles"
  ];
  const EVENT_TYPES_KIDS = [
    "Junior Singles",
    "Senior Singles",
    "Junior Doubles",
    "Senior Doubles",
    "Mixed Doubles"
  ];
  const currentEventTypes = selectedTournament?.category === 'Kids' ? EVENT_TYPES_KIDS : EVENT_TYPES_ADULTS;
  const [eventName, setEventName] = useState(EVENT_TYPES_ADULTS[0]);
  const [fixtureTeam1, setFixtureTeam1] = useState('');
  const [fixtureTeam2, setFixtureTeam2] = useState('');
  const [fixtureTeam1Type, setFixtureTeam1Type] = useState('team');
  const [fixtureTeam1Placeholder, setFixtureTeam1Placeholder] = useState('');
  const [fixtureTeam2Type, setFixtureTeam2Type] = useState('team');
  const [fixtureTeam2Placeholder, setFixtureTeam2Placeholder] = useState('');
  const [fixtureType, setFixtureType] = useState('league');
  const [fixtureDateTime, setFixtureDateTime] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [playerGender, setPlayerGender] = useState('Male');

  // Edit Fixture Form states
  const [editingFixture, setEditingFixture] = useState(null);
  const [editFixtureTeam1, setEditFixtureTeam1] = useState('');
  const [editFixtureTeam2, setEditFixtureTeam2] = useState('');
  const [editFixtureTeam1Type, setEditFixtureTeam1Type] = useState('team');
  const [editFixtureTeam1Placeholder, setEditFixtureTeam1Placeholder] = useState('');
  const [editFixtureTeam2Type, setEditFixtureTeam2Type] = useState('team');
  const [editFixtureTeam2Placeholder, setEditFixtureTeam2Placeholder] = useState('');
  const [editFixtureType, setEditFixtureType] = useState('league');
  const [editFixtureDateTime, setEditFixtureDateTime] = useState('');
  const [editFixtureStatus, setEditFixtureStatus] = useState('pending');

  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState(null);

  useEffect(() => {
    loadTournaments();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      loadTournamentData(selectedTournament.id);
      setNewPlayerGender(selectedTournament.category === 'Kids' ? 'Junior' : 'Male');
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
      const [t, e, f, a, p] = await Promise.all([
        api.getTeams(tid),
        api.getEvents(tid),
        api.getFixtures(tid),
        api.getAuction(tid),
        api.getPlayers(tid),
      ]);
      setTeams(t);
      setEvents(e);
      setFixtures(f);
      setAuction(a);
      setTournamentPlayers(p);
      // Pre-fill auction config from saved state
      if (a && a.status !== 'idle') {
        setAuctionMaxPlayers(a.max_players || 8);
        setAuctionTotalPoints(a.total_points || 100);
        setAuctionStartingBid(a.starting_bid || 10);
      }
    } catch (e) { setError(e.message); }
  }

  async function handleCreateTournament(e) {
    e.preventDefault();
    try {
      const data = {
        name: tournamentName,
        sport: tournamentSport,
        category: tournamentCategory,
      };
      // Only include optional fields if they have values
      if (tournamentStartDate) data.start_date = tournamentStartDate;
      if (tournamentEndDate) data.end_date = tournamentEndDate;
      if (tournamentDeadline) {
        data.registration_deadline = `${tournamentDeadline}T${tournamentDeadlineTime || '23:59'}`;
      }
      if (tournamentEntryFees) data.entry_fees = parseInt(tournamentEntryFees) || 0;
      if (tournamentUpiNumber) data.upi_payment_number = tournamentUpiNumber;
      if (tournamentCategory === 'Kids') data.kids_age_limit = parseInt(tournamentKidsAgeLimit) || 12;

      const res = await api.createTournament(data);
      setTournaments([...tournaments, res.tournament]);
      setSelectedTournament(res.tournament);
      setActiveTab('teams');
      setTournamentName('');
      setTournamentSport('Badminton');
      setTournamentCategory('Adults');
      setTournamentStartDate('');
      setTournamentEndDate('');
      setTournamentDeadline('');
      setTournamentDeadlineTime('23:59');
      setTournamentEntryFees('');
      setTournamentUpiNumber('');
      setTournamentKidsAgeLimit(12);
      setShowTournamentForm(false);
    } catch (err) { setError(err.message); }
  }

  async function handleEditTournament(e) {
    e.preventDefault();
    try {
      const res = await api.updateTournament(selectedTournament.id, { name: editTournamentName });
      setTournaments(tournaments.map(t => t.id === selectedTournament.id ? res.tournament : t));
      setSelectedTournament(res.tournament);
      setShowEditTournamentForm(false);
    } catch (err) { setError(err.message); }
  }

  async function handleDeleteTournament() {
    try {
      await api.deleteTournament(selectedTournament.id);
      const updatedList = tournaments.filter(t => t.id !== selectedTournament.id);
      setTournaments(updatedList);
      setSelectedTournament(null);
      setShowDeleteTournamentConfirm(false);
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
          name: `${eventName} 1`
        });
        finalName = `${eventName} 2`;
      } else if (existingEvents.length > 0) {
        finalName = `${eventName} ${existingEvents.length + 1}`;
      }

      await api.addEvent(selectedTournament.id, {
        name: finalName
      });

      // Refetch events to get all updated names
      const updatedEvents = await api.getEvents(selectedTournament.id);
      setEvents(updatedEvents);

      setEventName(currentEventTypes[0]);
      setShowEventForm(false);
    } catch (err) { setError(err.message); }
  }

  async function handleEditEvent(e) {
    e.preventDefault();
    try {
      const existingEvents = events.filter(ev => ev.id !== editingEvent.id && ev.name.startsWith(editEventName));
      let finalName = editEventName;

      if (existingEvents.length === 1 && existingEvents[0].name === editEventName) {
        await api.updateEvent(selectedTournament.id, existingEvents[0].id, {
          name: `${editEventName} 1`,
        });
        finalName = `${editEventName} 2`;
      } else if (existingEvents.length > 0) {
        finalName = `${editEventName} ${existingEvents.length + 1}`;
      }

      await api.updateEvent(selectedTournament.id, editingEvent.id, {
        name: finalName,
      });

      const oldBaseType = currentEventTypes.find(t => editingEvent.name.startsWith(t));
      if (oldBaseType && oldBaseType !== editEventName) {
        const remainingOld = events.filter(e => e.id !== editingEvent.id && e.name.startsWith(oldBaseType));
        if (remainingOld.length === 1) {
          await api.updateEvent(selectedTournament.id, remainingOld[0].id, { name: oldBaseType });
        } else if (remainingOld.length > 1) {
          for (let i = 0; i < remainingOld.length; i++) {
            const newOldName = `${oldBaseType} ${i + 1}`;
            if (remainingOld[i].name !== newOldName) {
              await api.updateEvent(selectedTournament.id, remainingOld[i].id, { name: newOldName });
            }
          }
        }
      }

      const updatedEvents = await api.getEvents(selectedTournament.id);
      setEvents(updatedEvents);
      setEditingEvent(null);
      setShowEditEventForm(false);
    } catch (err) { setError(err.message); }
  }

  async function handleAddFixture(e) {
    e.preventDefault();
    const t1Id = fixtureTeam1Type === 'team' ? fixtureTeam1 : '';
    const t2Id = fixtureTeam2Type === 'team' ? fixtureTeam2 : '';
    const t1Ph = fixtureTeam1Type === 'placeholder' ? fixtureTeam1Placeholder : null;
    const t2Ph = fixtureTeam2Type === 'placeholder' ? fixtureTeam2Placeholder : null;

    if (fixtureTeam1Type === 'team' && fixtureTeam2Type === 'team' && fixtureTeam1 === fixtureTeam2) {
      setError('Please select two different teams');
      return;
    }

    const validatePlaceholder = (ph) => {
      if (!ph) return null;
      const parts = ph.split(':');
      if (parts.length >= 2 && (parts[1].toLowerCase() === 'winner' || parts[1].toLowerCase() === 'loser')) {
        const targetId = parts[0];
        if (!fixtures.some(f => f.id === targetId)) {
          return `Match ID ${targetId} does not exist in the tournament.`;
        }
      }
      return null;
    };

    const t1Error = validatePlaceholder(t1Ph);
    if (t1Error) {
      setValidationError(t1Error);
      return;
    }
    const t2Error = validatePlaceholder(t2Ph);
    if (t2Error) {
      setValidationError(t2Error);
      return;
    }

    try {
      const res = await api.addFixture(selectedTournament.id, {
        team1_id: t1Id,
        team2_id: t2Id,
        team1_placeholder: t1Ph,
        team2_placeholder: t2Ph,
        match_type: fixtureType,
        date_time: fixtureDateTime || null,
      });
      setFixtures([...fixtures, res.fixture]);
      setFixtureTeam1(''); setFixtureTeam2(''); setFixtureType('league'); setFixtureDateTime('');
      setFixtureTeam1Type('team'); setFixtureTeam1Placeholder('');
      setFixtureTeam2Type('team'); setFixtureTeam2Placeholder('');
      setShowFixtureForm(false);
    } catch (err) { setError(err.message); }
  }

  async function handleEditFixture(e) {
    e.preventDefault();
    const t1Id = editFixtureTeam1Type === 'team' ? editFixtureTeam1 : '';
    const t2Id = editFixtureTeam2Type === 'team' ? editFixtureTeam2 : '';
    const t1Ph = editFixtureTeam1Type === 'placeholder' ? editFixtureTeam1Placeholder : null;
    const t2Ph = editFixtureTeam2Type === 'placeholder' ? editFixtureTeam2Placeholder : null;

    if (editFixtureTeam1Type === 'team' && editFixtureTeam2Type === 'team' && editFixtureTeam1 === editFixtureTeam2) {
      setError('Please select two different teams');
      return;
    }

    const validatePlaceholder = (ph) => {
      if (!ph) return null;
      const parts = ph.split(':');
      if (parts.length >= 2 && (parts[1].toLowerCase() === 'winner' || parts[1].toLowerCase() === 'loser')) {
        const targetId = parts[0];
        if (!fixtures.some(f => f.id === targetId)) {
          return `Match ID ${targetId} does not exist in the tournament.`;
        }
      }
      return null;
    };

    const t1Error = validatePlaceholder(t1Ph);
    if (t1Error) {
      setValidationError(t1Error);
      return;
    }
    const t2Error = validatePlaceholder(t2Ph);
    if (t2Error) {
      setValidationError(t2Error);
      return;
    }

    try {
      const res = await api.updateFixture(selectedTournament.id, editingFixture.id, {
        team1_id: t1Id,
        team2_id: t2Id,
        team1_placeholder: t1Ph,
        team2_placeholder: t2Ph,
        match_type: editFixtureType,
        date_time: editFixtureDateTime || null,
        status: editFixtureStatus,
      });
      setFixtures(fixtures.map(f => f.id === editingFixture.id ? res.fixture : f));
      setEditingFixture(null);
      setShowEditFixtureForm(false);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleUnlockFixture(fixtureId) {
    try {
      const res = await api.updateFixture(selectedTournament.id, fixtureId, { is_frozen: false });
      setFixtures(fixtures.map(f => f.id === fixtureId ? res.fixture : f));
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleAddPlayer(e) {
    e.preventDefault();
    const team = teams.find(t => t.id === showPlayerForm);
    if (!team) return;
    const existingPlayer = tournamentPlayers.find(p => p.name === playerName);
    if (!existingPlayer) {
      setError('Please select a valid player from the registered players list.');
      return;
    }
    try {
      const updatedPlayers = [...(team.players_list || []), { name: existingPlayer.name, gender: existingPlayer.gender }];
      const res = await api.updateTeam(selectedTournament.id, team.id, {
        players_list: updatedPlayers,
      });
      setTeams(teams.map(t => t.id === team.id ? res.team : t));
      setPlayerName('');
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
    try {
      await api.deleteTeam(selectedTournament.id, teamId);
      setTeams(teams.filter(t => t.id !== teamId));
      setTeamToDelete(null);
    } catch (err) { setError(err.message); }
  }

  function isPlayerAssigned(name) {
    for (const t of teams) {
      if (t.players_list && t.players_list.some(p => p.name.toLowerCase() === name.toLowerCase())) {
        return true;
      }
    }
    if (auction && auction.status === 'live' && auction.team_players) {
      for (const tId in auction.team_players) {
        if (auction.team_players[tId].some(p => p.name.toLowerCase() === name.toLowerCase())) return true;
      }
    }
    return false;
  }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      setNewPlayerPhoto(file);
      const reader = new FileReader();
      reader.onload = (ev) => setNewPlayerPhotoPreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  }

  function removePhoto() {
    setNewPlayerPhoto(null);
    setNewPlayerPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleGlobalAddPlayer(e) {
    e.preventDefault();
    if (!newPlayerFirstName.trim() || !newPlayerLastName.trim()) {
      setError('First name and last name are required');
      return;
    }
    if (!newPlayerWing) {
      setError('Please select your wing');
      return;
    }
    if (!newPlayerFlatNo || newPlayerFlatNo.length < 3 || newPlayerFlatNo.length > 4) {
      setError('Flat number must be 3 to 4 digits');
      return;
    }
    if (!newPlayerAge || parseInt(newPlayerAge) < 1) {
      setError('Please enter a valid age');
      return;
    }
    if (selectedTournament?.category === 'Adults' && !newPlayerGender) {
      setError('Please select your gender');
      return;
    }
    if (!newPlayerExpertise) {
      setError('Please select your expertise level');
      return;
    }
    if (!newPlayerPlayedStateNational) {
      setError('Please indicate if you have played State/National');
      return;
    }
    if (!newPlayerMobile || newPlayerMobile.length !== 10 || !/^\d{10}$/.test(newPlayerMobile)) {
      setError('Mobile number is required and must be exactly 10 digits');
      return;
    }

    const full_name = `${newPlayerFirstName.trim()} ${newPlayerLastName.trim()}`;
    if (tournamentPlayers.some(p => p.id !== editingPlayerId && p.name.toLowerCase() === full_name.toLowerCase() && p.mobile === newPlayerMobile)) {
      setError('A player with this name and mobile already exists.');
      return;
    }

    const formData = new FormData();
    formData.append('first_name', newPlayerFirstName.trim());
    formData.append('last_name', newPlayerLastName.trim());
    formData.append('mobile', newPlayerMobile);
    formData.append('wing', newPlayerWing);
    formData.append('flat_no', newPlayerFlatNo);
    formData.append('age', newPlayerAge);
    formData.append('gender', newPlayerGender);
    formData.append('expertise', newPlayerExpertise);
    formData.append('played_state_national', newPlayerPlayedStateNational);
    if (newPlayerPhoto) {
      formData.append('photo', newPlayerPhoto);
    }

    try {
      if (editingPlayerId) {
        const res = await api.updatePlayer(selectedTournament.id, editingPlayerId, formData);
        setTournamentPlayers(tournamentPlayers.map(p => p.id === editingPlayerId ? res.player : p));
        setEditingPlayerId(null);
      } else {
        const res = await api.addPlayer(selectedTournament.id, formData);
        setTournamentPlayers([...tournamentPlayers, res.player]);
      }
      
      // Reset form
      setNewPlayerFirstName('');
      setNewPlayerLastName('');
      setNewPlayerMobile('');
      setNewPlayerWing('');
      setNewPlayerFlatNo('');
      setNewPlayerAge('');
      setNewPlayerGender('');
      setNewPlayerExpertise('');
      setNewPlayerPlayedStateNational('');
      removePhoto();
      setIsRegisterFormOpen(false);
    } catch (err) { setError(err.message); }
  }

  function handleGlobalDeletePlayer(playerId) {
    const p = tournamentPlayers.find(x => x.id === playerId);
    if (p && isPlayerAssigned(p.name)) {
      setError('Cannot delete player as they are already assigned to a team or auction.');
      return;
    }
    setPendingConfirmation({ type: 'player', id: playerId, name: p?.name || 'this player' });
  }

  async function executeDeletePlayer(playerId) {
    try {
      await api.deletePlayer(selectedTournament.id, playerId);
      setTournamentPlayers(tournamentPlayers.filter(x => x.id !== playerId));
      setPendingConfirmation(null);
    } catch (err) { setError(err.message); }
  }

  function handleDeleteEvent(eventId) {
    const eventObj = events.find(e => e.id === eventId);
    const eventNameStr = eventObj ? eventObj.name : 'this event';
    setPendingConfirmation({ type: 'event', id: eventId, name: eventNameStr });
  }

  async function executeDeleteEvent(eventId, eventNameStr) {
    try {
      await api.deleteEvent(selectedTournament.id, eventId);

      const baseType = currentEventTypes.find(t => eventNameStr.startsWith(t));
      if (baseType) {
        const remainingEvents = events.filter(e => e.id !== eventId && e.name.startsWith(baseType));

        if (remainingEvents.length === 1) {
          await api.updateEvent(selectedTournament.id, remainingEvents[0].id, {
            name: baseType
          });
        } else if (remainingEvents.length > 1) {
          for (let i = 0; i < remainingEvents.length; i++) {
            const ev = remainingEvents[i];
            const newName = `${baseType} ${i + 1}`;
            if (ev.name !== newName) {
              await api.updateEvent(selectedTournament.id, ev.id, {
                name: newName
              });
            }
          }
        }
      }

      const updatedEvents = await api.getEvents(selectedTournament.id);
      setEvents(updatedEvents);
      setPendingConfirmation(null);
    } catch (err) { setError(err.message); }
  }

  function handleDeleteFixture(fixtureId) {
    const fixture = fixtures.find(f => f.id === fixtureId);
    const matchName = fixture ? `${getTeamName(fixture.team1_id, fixture.team1_placeholder)} vs ${getTeamName(fixture.team2_id, fixture.team2_placeholder)}` : 'this fixture';
    setPendingConfirmation({ type: 'fixture', id: fixtureId, name: matchName });
  }

  async function executeDeleteFixture(fixtureId) {
    try {
      await api.deleteFixture(selectedTournament.id, fixtureId);
      setFixtures(fixtures.filter(f => f.id !== fixtureId));
      setPendingConfirmation(null);
    } catch (err) { setError(err.message); }
  }

  function getTeamName(id, placeholder) {
    if (id) return teams.find(t => t.id === id)?.name || id;
    if (placeholder) {
      const parts = placeholder.split(':');
      if (parts.length >= 2) {
        if (!isNaN(parts[1])) {
          return parts[0] ? `${parts[0]} (${parts[1]} pos)` : `Position ${parts[1]}`;
        } else if (parts[1].toLowerCase() === 'winner') {
          return `Winner of Match ${parts[0]}`;
        } else if (parts[1].toLowerCase() === 'loser') {
          return `Loser of Match ${parts[0]}`;
        }
      }
      return placeholder;
    }
    return 'TBD';
  }

  // ── Auction handlers ──────────────────────────────────────

  async function handleStartAuction() {
    if (teams.length === 0) {
      setError('Add teams before starting the auction.');
      return;
    }
    try {
      const res = await api.startAuction(selectedTournament.id, {
        max_players: auctionMaxPlayers,
        total_points: auctionTotalPoints,
        starting_bid: auctionStartingBid,
      });
      setAuction(res.auction);
    } catch (err) { setError(err.message); }
  }

  function handleEndAuction() {
    setPendingConfirmation({ type: 'auction' });
  }

  async function executeEndAuction() {
    try {
      const res = await api.endAuction(selectedTournament.id);
      setAuction(res.auction);
      // Reload teams to reflect synced players
      const updatedTeams = await api.getTeams(selectedTournament.id);
      setTeams(updatedTeams);
      setPendingConfirmation(null);
    } catch (err) { setError(err.message); }
  }

  async function executeGenerateLeagueFixtures() {
    try {
      await api.generateLeagueFixtures(selectedTournament.id);
      const updatedFixtures = await api.getFixtures(selectedTournament.id);
      setFixtures(updatedFixtures);
      setPendingConfirmation(null);
    } catch (err) { setError(err.message); }
  }

  function handleConfirmAction() {
    if (pendingConfirmation?.type === 'event') {
      executeDeleteEvent(pendingConfirmation.id, pendingConfirmation.name);
    } else if (pendingConfirmation?.type === 'fixture') {
      executeDeleteFixture(pendingConfirmation.id);
    } else if (pendingConfirmation?.type === 'player') {
      executeDeletePlayer(pendingConfirmation.id);
    } else if (pendingConfirmation?.type === 'auction') {
      executeEndAuction();
    } else if (pendingConfirmation?.type === 'generateLeague') {
      executeGenerateLeagueFixtures();
    }
  }

  async function handleAuctionAddPlayer(teamId) {
    const form = auctionPlayerForms[teamId];
    if (!form || !form.name || !form.points) return;

    const existingPlayer = tournamentPlayers.find(p => p.name === form.name);
    if (!existingPlayer) {
      setError('Please select a valid player from the registered players list.');
      return;
    }

    const points = parseInt(form.points);
    if (isNaN(points)) {
      setError('Points must be a valid number.');
      return;
    }

    const players = auction.team_players[teamId] || [];
    const consumed = players.reduce((sum, p) => sum + (p.points || 0), 0);
    const pointsLeft = auction.total_points - consumed;
    const playersLeft = auction.max_players - players.length;
    const maxBid = playersLeft > 0 ? pointsLeft - ((playersLeft - 1) * auction.starting_bid) : 0;

    if (points < auction.starting_bid) {
      setError(`Bid must be at least the starting bid (${auction.starting_bid}).`);
      return;
    }
    if (points > maxBid) {
      setError(`Bid cannot exceed the maximum allowed bid (${maxBid}).`);
      return;
    }

    const currentAuction = { ...auction };
    const teamPlayers = [...players];
    teamPlayers.push({ name: existingPlayer.name, gender: existingPlayer.gender, points });
    currentAuction.team_players = { ...currentAuction.team_players, [teamId]: teamPlayers };
    try {
      const res = await api.updateAuction(selectedTournament.id, currentAuction);
      setAuction(res.auction);
      setAuctionPlayerForms(prev => ({ ...prev, [teamId]: { name: '', gender: 'Male', points: '' } }));
    } catch (err) { setError(err.message); }
  }

  async function handleAuctionRemovePlayer(teamId, playerIdx) {
    const currentAuction = { ...auction };
    const teamPlayers = [...(currentAuction.team_players[teamId] || [])];
    teamPlayers.splice(playerIdx, 1);
    currentAuction.team_players = { ...currentAuction.team_players, [teamId]: teamPlayers };
    try {
      const res = await api.updateAuction(selectedTournament.id, currentAuction);
      setAuction(res.auction);
    } catch (err) { setError(err.message); }
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
                    onClick={() => setShowDeleteTournamentConfirm(true)}
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
                <option value="Table Tennis">Table Tennis</option>
                <option value="Pickleball">Pickleball</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-input" value={tournamentCategory} onChange={e => setTournamentCategory(e.target.value)} required>
                <option value="Adults">Adults</option>
                <option value="Kids">Kids</option>
              </select>
            </div>

            {/* Divider */}
            <div style={{ borderTop: '1px solid var(--glass-border)', margin: '1.25rem 0', position: 'relative' }}>
              <span style={{ position: 'absolute', top: '-0.7rem', left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-card)', padding: '0 0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Registration (Optional)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <CustomDatePicker value={tournamentStartDate} onChange={setTournamentStartDate} />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <CustomDatePicker value={tournamentEndDate} onChange={setTournamentEndDate} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Registration Deadline</label>
                <CustomDatePicker value={tournamentDeadline} onChange={setTournamentDeadline} />
              </div>
              <div className="form-group">
                <label className="form-label">Deadline Time</label>
                <input type="time" className="form-input" value={tournamentDeadlineTime} onChange={e => setTournamentDeadlineTime(e.target.value)} disabled={!tournamentDeadline} style={{ opacity: !tournamentDeadline ? 0.5 : 1 }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Entry Fees (₹)</label>
                <input type="number" className="form-input" placeholder="e.g. 200" value={tournamentEntryFees} onChange={e => setTournamentEntryFees(e.target.value)} min="0" />
              </div>
              <div className="form-group">
                <label className="form-label">UPI Payment Number</label>
                <input type="tel" className="form-input" placeholder="e.g. 9876543210" value={tournamentUpiNumber} onChange={e => setTournamentUpiNumber(e.target.value)} maxLength={10} />
              </div>
            </div>

            {tournamentCategory === 'Kids' && (
              <div className="form-group">
                <label className="form-label">Kids Age Limit (Junior ≤ this age, Senior &gt; this age)</label>
                <input type="number" className="form-input" value={tournamentKidsAgeLimit} onChange={e => setTournamentKidsAgeLimit(e.target.value)} min="1" max="18" />
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>Create Tournament</button>
          </form>
        </Modal>
      )}

      {showDeleteTournamentConfirm && selectedTournament && (
        <Modal title="Delete Tournament?" onClose={() => setShowDeleteTournamentConfirm(false)}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <AlertTriangle size={24} color="var(--accent-danger)" style={{ flexShrink: 0 }} />
            <div>
              <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>
                Delete “{selectedTournament.name}”?
              </p>
              <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                This permanently removes the tournament, its teams, players, events, fixtures, and scorecards.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button className="btn btn-outline" onClick={() => setShowDeleteTournamentConfirm(false)}>
              Cancel
            </button>
            <button
              className="btn"
              onClick={handleDeleteTournament}
              style={{ background: 'var(--accent-danger)', color: '#fff' }}
            >
              <Trash2 size={16} /> Delete Tournament
            </button>
          </div>
        </Modal>
      )}

      {teamToDelete && (
        <Modal title="Delete Team?" onClose={() => setTeamToDelete(null)}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <AlertTriangle size={24} color="var(--accent-danger)" style={{ flexShrink: 0 }} />
            <div>
              <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>
                Delete “{teamToDelete.name}”?
              </p>
              <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                This will permanently remove the team and all players assigned to it.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button className="btn btn-outline" onClick={() => setTeamToDelete(null)}>
              Cancel
            </button>
            <button
              className="btn"
              onClick={() => handleDeleteTeam(teamToDelete.id)}
              style={{ background: 'var(--accent-danger)', color: '#fff' }}
            >
              <Trash2 size={16} /> Delete Team
            </button>
          </div>
        </Modal>
      )}

      {pendingConfirmation && (
        <Modal
          title={pendingConfirmation.type === 'auction'
            ? 'End Auction?'
            : pendingConfirmation.type === 'generateLeague'
              ? 'Generate League Fixtures?'
              : `Delete ${pendingConfirmation.type === 'event' ? 'Event Type' : pendingConfirmation.type === 'player' ? 'Player' : 'Fixture'}?`}
          onClose={() => setPendingConfirmation(null)}
        >
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <AlertTriangle size={24} color="var(--accent-danger)" style={{ flexShrink: 0 }} />
            <div>
              <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>
                {pendingConfirmation.type === 'auction'
                  ? 'End the live auction?'
                  : pendingConfirmation.type === 'generateLeague'
                    ? 'Generate round robin league fixtures for all groups?'
                    : `Delete “${pendingConfirmation.name}”?`}
              </p>
              <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {pendingConfirmation.type === 'auction'
                  ? 'Players will be synced to their teams and the auction will be marked as ended.'
                  : pendingConfirmation.type === 'generateLeague'
                    ? 'This will delete any existing league fixtures and generate new round robin fixtures for all groups.'
                    : pendingConfirmation.type === 'event'
                      ? 'This will permanently remove the event type and update the remaining event numbering.'
                      : pendingConfirmation.type === 'player'
                        ? 'This will permanently remove the registered player from this tournament.'
                        : 'This action cannot be undone.'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button className="btn btn-outline" onClick={() => setPendingConfirmation(null)}>
              Cancel
            </button>
            <button
              className="btn"
              onClick={handleConfirmAction}
              style={{ background: 'var(--accent-danger)', color: '#fff' }}
            >
              <Trash2 size={16} />
              {pendingConfirmation.type === 'auction'
                ? 'End Auction'
                : pendingConfirmation.type === 'generateLeague'
                  ? 'Generate Fixtures'
                  : pendingConfirmation.type === 'player' ? 'Delete Player' : 'Delete'}
            </button>
          </div>
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
              <label className="form-label">Group (Optional)</label>
              <select className="form-input" value={teamGroup} onChange={e => setTeamGroup(e.target.value)}>
                <option value="">No Group</option>
                <option value="A">Group A</option>
                <option value="B">Group B</option>
              </select>
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
                {currentEventTypes.map(t => <option key={t} value={t}>{t}</option>)}
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
              <select className="form-input" value={editEventName} onChange={e => setEditEventName(e.target.value)} required>
                {currentEventTypes.map(t => <option key={t} value={t}>{t}</option>)}
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
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className="form-label" style={{ margin: 0 }}>Team 1</label>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}><input type="radio" checked={fixtureTeam1Type === 'team'} onChange={() => setFixtureTeam1Type('team')} /> Select Team</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}><input type="radio" checked={fixtureTeam1Type === 'placeholder'} onChange={() => setFixtureTeam1Type('placeholder')} /> Placeholder</label>
                </div>
              </div>
              {fixtureTeam1Type === 'team' ? (
                <select className="form-input" value={fixtureTeam1} onChange={e => setFixtureTeam1(e.target.value)} required>
                  <option value="">-- Select Team 1 --</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              ) : (
                <>
                  <input type="text" className="form-input" placeholder="A:1 OR :1 OR 1afa4a69:winner" value={fixtureTeam1Placeholder} onChange={e => setFixtureTeam1Placeholder(e.target.value)} required />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Format: <code>Group:Position</code>, <code>:Position</code> or <code>MatchID:status</code></div>
                </>
              )}
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className="form-label" style={{ margin: 0 }}>Team 2</label>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}><input type="radio" checked={fixtureTeam2Type === 'team'} onChange={() => setFixtureTeam2Type('team')} /> Select Team</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}><input type="radio" checked={fixtureTeam2Type === 'placeholder'} onChange={() => setFixtureTeam2Type('placeholder')} /> Placeholder</label>
                </div>
              </div>
              {fixtureTeam2Type === 'team' ? (
                <select className="form-input" value={fixtureTeam2} onChange={e => setFixtureTeam2(e.target.value)} required>
                  <option value="">-- Select Team 2 --</option>
                  {teams.filter(t => fixtureTeam1Type !== 'team' || t.id !== fixtureTeam1).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              ) : (
                <>
                  <input type="text" className="form-input" placeholder="B:2 OR :2 OR 1afa4a69:loser" value={fixtureTeam2Placeholder} onChange={e => setFixtureTeam2Placeholder(e.target.value)} required />
                </>
              )}
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
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Date</div>
                  <CustomDatePicker
                    value={fixtureDateTime ? fixtureDateTime.split('T')[0] : ''}
                    onChange={newDate => {
                      if (!newDate) {
                        setFixtureDateTime('');
                      } else {
                        const currentTime = (fixtureDateTime && fixtureDateTime.includes('T')) ? fixtureDateTime.split('T')[1].substring(0, 5) : '09:00';
                        setFixtureDateTime(`${newDate}T${currentTime}`);
                      }
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Time</div>
                  <input 
                    type="time" 
                    className="form-input" 
                    value={(fixtureDateTime && fixtureDateTime.includes('T')) ? fixtureDateTime.split('T')[1].substring(0, 5) : ''} 
                    onChange={e => {
                      const newTime = e.target.value;
                      if (newTime && fixtureDateTime) {
                        const currentDate = fixtureDateTime.split('T')[0];
                        setFixtureDateTime(`${currentDate}T${newTime}`);
                      }
                    }}
                    disabled={!fixtureDateTime}
                    style={{ opacity: !fixtureDateTime ? 0.5 : 1, cursor: !fixtureDateTime ? 'not-allowed' : 'auto' }}
                  />
                </div>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Add Fixture</button>
          </form>
        </Modal>
      )}

      {/* Edit Fixture Form Modal */}
      {showEditFixtureForm && editingFixture && (
        <Modal title="Edit Match Fixture" onClose={() => { setShowEditFixtureForm(false); setEditingFixture(null); }}>
          <form onSubmit={handleEditFixture}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className="form-label" style={{ margin: 0 }}>Team 1</label>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}><input type="radio" checked={editFixtureTeam1Type === 'team'} onChange={() => setEditFixtureTeam1Type('team')} /> Select Team</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}><input type="radio" checked={editFixtureTeam1Type === 'placeholder'} onChange={() => setEditFixtureTeam1Type('placeholder')} /> Placeholder</label>
                </div>
              </div>
              {editFixtureTeam1Type === 'team' ? (
                <select className="form-input" value={editFixtureTeam1} onChange={e => setEditFixtureTeam1(e.target.value)} required>
                  <option value="">-- Select Team 1 --</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              ) : (
                <>
                  <input type="text" className="form-input" placeholder="A:1 OR :1 OR 1afa4a69:winner" value={editFixtureTeam1Placeholder} onChange={e => setEditFixtureTeam1Placeholder(e.target.value)} required />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Format: <code>Group:Position</code>, <code>:Position</code> or <code>MatchID:status</code></div>
                </>
              )}
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className="form-label" style={{ margin: 0 }}>Team 2</label>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}><input type="radio" checked={editFixtureTeam2Type === 'team'} onChange={() => setEditFixtureTeam2Type('team')} /> Select Team</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}><input type="radio" checked={editFixtureTeam2Type === 'placeholder'} onChange={() => setEditFixtureTeam2Type('placeholder')} /> Placeholder</label>
                </div>
              </div>
              {editFixtureTeam2Type === 'team' ? (
                <select className="form-input" value={editFixtureTeam2} onChange={e => setEditFixtureTeam2(e.target.value)} required>
                  <option value="">-- Select Team 2 --</option>
                  {teams.filter(t => editFixtureTeam1Type !== 'team' || t.id !== editFixtureTeam1).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              ) : (
                <>
                  <input type="text" className="form-input" placeholder="B:2 OR :2 OR 1afa4a69:loser" value={editFixtureTeam2Placeholder} onChange={e => setEditFixtureTeam2Placeholder(e.target.value)} required />
                </>
              )}
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
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Date</div>
                  <CustomDatePicker
                    value={editFixtureDateTime ? editFixtureDateTime.split('T')[0] : ''}
                    onChange={newDate => {
                      if (!newDate) {
                        setEditFixtureDateTime('');
                      } else {
                        const currentTime = (editFixtureDateTime && editFixtureDateTime.includes('T')) ? editFixtureDateTime.split('T')[1].substring(0, 5) : '09:00';
                        setEditFixtureDateTime(`${newDate}T${currentTime}`);
                      }
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Time</div>
                  <input 
                    type="time" 
                    className="form-input" 
                    value={(editFixtureDateTime && editFixtureDateTime.includes('T')) ? editFixtureDateTime.split('T')[1].substring(0, 5) : ''} 
                    onChange={e => {
                      const newTime = e.target.value;
                      if (newTime && editFixtureDateTime) {
                        const currentDate = editFixtureDateTime.split('T')[0];
                        setEditFixtureDateTime(`${currentDate}T${newTime}`);
                      }
                    }}
                    disabled={!editFixtureDateTime}
                    style={{ opacity: !editFixtureDateTime ? 0.5 : 1, cursor: !editFixtureDateTime ? 'not-allowed' : 'auto' }}
                  />
                </div>
              </div>
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
              { key: 'players', icon: <Users size={16} />, label: 'Players' },
              { key: 'events', icon: <ListChecks size={16} />, label: 'Event Types' },
              { key: 'fixtures', icon: <Calendar size={16} />, label: 'Match Fixtures' },
              { key: 'auction', icon: <Gavel size={16} />, label: 'Auction' },
            ].filter(tab => !(tab.key === 'auction' && selectedTournament?.category === 'Kids')).map(tab => (
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
                          </select>
                          <button onClick={() => setTeamToDelete(team)} style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', padding: '4px' }}>
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
                                {typeof p === 'object' ? `${p.name} (${p.gender === 'Male' ? 'M' : p.gender === 'Female' ? 'F' : p.gender})` : p}
                                <button onClick={() => handleRemovePlayer(team.id, idx)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0', lineHeight: 1 }}>
                                  <X size={12} />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        {showPlayerForm === team.id ? (
                          <form onSubmit={handleAddPlayer} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <input className="form-input" style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', flex: 2, minWidth: '120px' }} placeholder="Select player..." list={`players-list-${team.id}`} value={playerName} onChange={e => setPlayerName(e.target.value)} required />
                            <datalist id={`players-list-${team.id}`}>
                              {tournamentPlayers.filter(p => !isPlayerAssigned(p.name)).map(p => (
                                <option key={p.id} value={p.name} />
                              ))}
                            </datalist>
                            <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Add</button>
                            <button type="button" className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => { setShowPlayerForm(null); setPlayerName(''); }}>Cancel</button>
                          </form>
                        ) : (
                          <button onClick={() => { setShowPlayerForm(team.id); }} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}>
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

          {/* ──── Players Tab ──── */}
          {activeTab === 'players' && (
            <div className="glass-card animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>Registered Players</h3>
                {!isRegisterFormOpen && (
                  <button className="btn btn-primary" onClick={() => setIsRegisterFormOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={16} /> Register Player
                  </button>
                )}
              </div>
              
              {isRegisterFormOpen && (
                <form onSubmit={handleGlobalAddPlayer} style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0 }}>{editingPlayerId ? 'Edit Player' : 'Register New Player'}</h4>
                    <button type="button" onClick={() => { setIsRegisterFormOpen(false); setEditingPlayerId(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}>
                      <X size={20} />
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">First Name <span style={{ color: '#ef4444' }}>*</span></label>
                    <input className="form-input" placeholder="First name" value={newPlayerFirstName} onChange={e => setNewPlayerFirstName(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name <span style={{ color: '#ef4444' }}>*</span></label>
                    <input className="form-input" placeholder="Last name" value={newPlayerLastName} onChange={e => setNewPlayerLastName(e.target.value)} required />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Mobile Number <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="tel" className="form-input" placeholder="10-digit mobile number" value={newPlayerMobile} onChange={e => { const v = e.target.value.replace(/\D/g, ''); if (v.length <= 10) setNewPlayerMobile(v); }} maxLength={10} required />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Wing <span style={{ color: '#ef4444' }}>*</span></label>
                    <select className="form-input" value={newPlayerWing} onChange={e => setNewPlayerWing(e.target.value)} required>
                      <option value="">Select Wing</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                      <option value="E">E</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Flat No. <span style={{ color: '#ef4444' }}>*</span></label>
                    <input type="text" className="form-input" placeholder="e.g. 101" value={newPlayerFlatNo} onChange={e => { const v = e.target.value.replace(/\D/g, ''); if (v.length <= 4) setNewPlayerFlatNo(v); }} maxLength={4} required />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: selectedTournament?.category === 'Adults' ? '1fr 1fr' : '1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Age <span style={{ color: '#ef4444' }}>*</span></label>
                    <input type="number" className="form-input" placeholder="Age" value={newPlayerAge} onChange={e => setNewPlayerAge(e.target.value)} min="1" max="99" required />
                  </div>
                  {selectedTournament?.category === 'Adults' && (
                    <div className="form-group">
                      <label className="form-label">Gender <span style={{ color: '#ef4444' }}>*</span></label>
                      <select className="form-input" value={newPlayerGender} onChange={e => setNewPlayerGender(e.target.value)} required>
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                  )}
                </div>

                {selectedTournament?.category === 'Kids' && selectedTournament?.kids_age_limit && newPlayerAge && (
                  <div style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', background: parseInt(newPlayerAge) <= selectedTournament.kids_age_limit ? 'rgba(59, 130, 246, 0.1)' : 'rgba(168, 85, 247, 0.1)', border: parseInt(newPlayerAge) <= selectedTournament.kids_age_limit ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(168, 85, 247, 0.3)', fontSize: '0.85rem', color: parseInt(newPlayerAge) <= selectedTournament.kids_age_limit ? '#60a5fa' : '#a855f7' }}>
                    Category: <strong>{parseInt(newPlayerAge) <= selectedTournament.kids_age_limit ? 'Junior' : 'Senior'}</strong>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Expertise <span style={{ color: '#ef4444' }}>*</span></label>
                  <select className="form-input" value={newPlayerExpertise} onChange={e => setNewPlayerExpertise(e.target.value)} required>
                    <option value="">Select Expertise</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Played State / National? <span style={{ color: '#ef4444' }}>*</span></label>
                  <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.25rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.95rem' }}>
                      <input type="radio" name="state_national_admin" value="Yes" checked={newPlayerPlayedStateNational === 'Yes'} onChange={e => setNewPlayerPlayedStateNational(e.target.value)} />
                      Yes
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.95rem' }}>
                      <input type="radio" name="state_national_admin" value="No" checked={newPlayerPlayedStateNational === 'No'} onChange={e => setNewPlayerPlayedStateNational(e.target.value)} />
                      No
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Photo (Optional)</label>
                  <input type="file" ref={fileInputRef} onChange={handlePhotoChange} accept="image/*" style={{ display: 'none' }} />
                  {!newPlayerPhotoPreview ? (
                    <div onClick={() => fileInputRef.current?.click()} style={{ border: '2px dashed var(--glass-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}>
                      <Camera size={24} color="var(--text-secondary)" style={{ marginBottom: '0.5rem' }} />
                      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Click to upload photo</p>
                    </div>
                  ) : (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img src={newPlayerPhotoPreview} alt="Preview" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: 'var(--radius-lg)', border: '2px solid var(--glass-border)' }} />
                      <button type="button" onClick={removePhoto} style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: '1rem' }}>
                  {editingPlayerId ? <Check size={16} /> : <Plus size={16} />} 
                  {editingPlayerId ? 'Update Player' : 'Submit Registration'}
                </button>
              </form>
              )}

              {tournamentPlayers.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No players registered yet. Add players using the form above.</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>{selectedTournament.category === 'Kids' ? 'Category' : 'Gender'}</th>
                        <th>Expertise</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tournamentPlayers.map(p => (
                        <tr key={p.id}>
                          <td>{p.name}</td>
                          <td>{p.gender}</td>
                          <td><span style={{ color: p.expertise ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: '0.85rem' }}>{p.expertise || '—'}</span></td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              onClick={() => {
                                setEditingPlayerId(p.id);
                                setNewPlayerFirstName(p.first_name || p.name.split(' ')[0] || '');
                                setNewPlayerLastName(p.last_name || p.name.split(' ').slice(1).join(' ') || '');
                                setNewPlayerMobile(p.mobile || '');
                                setNewPlayerWing(p.wing || '');
                                setNewPlayerFlatNo(p.flat_no || '');
                                setNewPlayerAge(p.age || '');
                                setNewPlayerGender(p.gender || '');
                                setNewPlayerExpertise(p.expertise || '');
                                setNewPlayerPlayedStateNational(p.played_state_national || '');
                                setNewPlayerPhoto(null);
                                setNewPlayerPhotoPreview(p.photo_url || null);
                                setIsRegisterFormOpen(true);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', padding: '0.25rem', marginRight: '0.5rem' }}
                            >
                              <Edit size={16} />
                            </button>
                            <button onClick={() => handleGlobalDeletePlayer(p.id)} style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', padding: '0.25rem' }}>
                              <Trash2 size={16} />
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

          {/* ──── Events Tab ──── */}
          {activeTab === 'events' && (
            <div className="glass-card animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>Event Types</h3>
                <button className="btn btn-primary" style={{ fontSize: '0.875rem' }} onClick={() => { setEventName(currentEventTypes[0]); setShowEventForm(true); }}>
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
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map(ev => (
                        <tr key={ev.id}>
                          <td>{ev.name}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => {
                                  const baseType = currentEventTypes.find(t => ev.name.startsWith(t)) || currentEventTypes[0];
                                  setEditingEvent(ev);
                                  setEditEventName(baseType);
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
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn btn-outline" style={{ fontSize: '0.875rem' }} onClick={() => setPendingConfirmation({ type: 'generateLeague' })} disabled={teams.length < 2}>
                    <Calendar size={16} /> Generate Fixtures
                  </button>
                  <button className="btn btn-primary" style={{ fontSize: '0.875rem' }} onClick={() => setShowFixtureForm(true)} disabled={teams.length < 2}>
                    <Plus size={16} /> Add Fixture
                  </button>
                </div>
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
                          <td style={{ fontWeight: 600 }}>
                            <div>
                              {f.is_frozen && <Lock size={14} style={{ color: 'var(--accent-danger)', marginRight: '0.5rem', verticalAlign: 'middle' }} />}
                              {getTeamName(f.team1_id, f.team1_placeholder)} <span style={{ color: 'var(--text-secondary)' }}>vs</span> {getTeamName(f.team2_id, f.team2_placeholder)}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'normal', marginTop: '0.25rem' }}>
                              ID: {f.id}
                            </div>
                          </td>
                          <td><span style={{ textTransform: 'capitalize' }}>{f.match_type.replace('_', ' ')}</span></td>
                          <td>{f.date_time ? new Date(f.date_time).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : <span style={{ color: 'var(--text-secondary)' }}>Not Scheduled</span>}</td>
                          <td>
                            <span className={`badge badge-${f.status === 'completed' ? 'completed' : f.status === 'in_progress' ? 'in-progress' : (f.status === 'on_hold' ? 'on-hold' : 'pending')}`}>
                              {f.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              {f.is_frozen ? (
                                <button
                                  onClick={() => handleUnlockFixture(f.id)}
                                  style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', padding: '4px' }}
                                  title="Unlock Fixture"
                                >
                                  <Lock size={16} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingFixture(f);
                                    if (f.team1_placeholder) {
                                      setEditFixtureTeam1Type('placeholder');
                                      setEditFixtureTeam1Placeholder(f.team1_placeholder);
                                      setEditFixtureTeam1(f.team1_id || '');
                                    } else {
                                      setEditFixtureTeam1Type('team');
                                      setEditFixtureTeam1(f.team1_id || '');
                                      setEditFixtureTeam1Placeholder('');
                                    }
                                    if (f.team2_placeholder) {
                                      setEditFixtureTeam2Type('placeholder');
                                      setEditFixtureTeam2Placeholder(f.team2_placeholder);
                                      setEditFixtureTeam2(f.team2_id || '');
                                    } else {
                                      setEditFixtureTeam2Type('team');
                                      setEditFixtureTeam2(f.team2_id || '');
                                      setEditFixtureTeam2Placeholder('');
                                    }
                                    setEditFixtureType(f.match_type);
                                    setEditFixtureDateTime(f.date_time || '');
                                    setEditFixtureStatus(f.status);
                                    setShowEditFixtureForm(true);
                                  }}
                                  style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', padding: '4px' }}
                                >
                                  <Edit size={16} />
                                </button>
                              )}
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

          {/* ──── Auction Tab ──── */}
          {activeTab === 'auction' && selectedTournament?.category !== 'Kids' && (
            <div className="glass-card animate-fade-in">
              {(!auction || auction.status === 'idle') && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0 }}>Auction Setup</h3>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Configure the auction parameters and start the live auction. Make sure teams are added first.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="form-group">
                      <label className="form-label">Max Players per Team</label>
                      <input type="text" className="form-input" value={auctionMaxPlayers} onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ''); setAuctionMaxPlayers(v ? parseInt(v) : ''); }} onBlur={() => setAuctionMaxPlayers(auctionMaxPlayers || 1)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Total Points per Team</label>
                      <input type="text" className="form-input" value={auctionTotalPoints} onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ''); setAuctionTotalPoints(v ? parseInt(v) : ''); }} onBlur={() => setAuctionTotalPoints(auctionTotalPoints || 1)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Starting Bid</label>
                      <input type="text" className="form-input" value={auctionStartingBid} onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ''); setAuctionStartingBid(v ? parseInt(v) : ''); }} onBlur={() => setAuctionStartingBid(auctionStartingBid || 0)} />
                    </div>
                  </div>
                  <button className="btn btn-primary" onClick={handleStartAuction} disabled={teams.length === 0} style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}>
                    <Gavel size={18} /> Start Auction
                  </button>
                  {teams.length === 0 && <p style={{ color: 'var(--accent-danger)', marginTop: '0.75rem', fontSize: '0.85rem' }}>Add teams in the "Teams & Players" tab before starting the auction.</p>}
                </>
              )}

              {auction && auction.status === 'live' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <h3 style={{ margin: 0 }}>Live Auction</h3>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', fontWeight: 600 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 1.5s infinite' }} /> LIVE
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', alignItems: 'center' }}>
                      {isEditingAuctionParams ? (
                        <>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Max Players:
                            <input type="text" className="form-input" style={{ width: '60px', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                              value={auction.max_players}
                              onChange={e => setAuction({ ...auction, max_players: e.target.value.replace(/[^0-9]/g, '') })}
                              onBlur={() => api.updateAuction(selectedTournament.id, { ...auction, max_players: parseInt(auction.max_players) || 1 }).catch(err => setError(err.message))}
                            />
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Total Points:
                            <input type="text" className="form-input" style={{ width: '80px', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                              value={auction.total_points}
                              onChange={e => setAuction({ ...auction, total_points: e.target.value.replace(/[^0-9]/g, '') })}
                              onBlur={() => api.updateAuction(selectedTournament.id, { ...auction, total_points: parseInt(auction.total_points) || 1 }).catch(err => setError(err.message))}
                            />
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Starting Bid:
                            <input type="text" className="form-input" style={{ width: '70px', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                              value={auction.starting_bid}
                              onChange={e => setAuction({ ...auction, starting_bid: e.target.value.replace(/[^0-9]/g, '') })}
                              onBlur={() => api.updateAuction(selectedTournament.id, { ...auction, starting_bid: parseInt(auction.starting_bid) || 0 }).catch(err => setError(err.message))}
                            />
                          </label>
                          <button onClick={() => setIsEditingAuctionParams(false)} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', padding: '0.2rem', display: 'flex' }} title="Done editing">
                            <Check size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <span>Max Players: <b style={{ color: 'var(--text-primary)' }}>{auction.max_players}</b></span>
                          <span>Total Points: <b style={{ color: 'var(--text-primary)' }}>{auction.total_points}</b></span>
                          <span>Starting Bid: <b style={{ color: 'var(--text-primary)' }}>{auction.starting_bid}</b></span>
                          <button onClick={() => setIsEditingAuctionParams(true)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.2rem', display: 'flex' }} title="Edit parameters">
                            <Edit size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <AuctionTable
                    auction={auction}
                    teams={teams}
                    editable={true}
                    auctionPlayerForms={auctionPlayerForms}
                    setAuctionPlayerForms={setAuctionPlayerForms}
                    onAddPlayer={handleAuctionAddPlayer}
                    onRemovePlayer={handleAuctionRemovePlayer}
                    availablePlayers={tournamentPlayers.filter(p => !isPlayerAssigned(p.name))}
                  />

                  <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <button className="btn" onClick={handleEndAuction} style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '1rem', padding: '0.75rem 2rem' }}>
                      End Auction
                    </button>
                  </div>
                </>
              )}

              {auction && auction.status === 'ended' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <h3 style={{ margin: 0 }}>Auction Completed</h3>
                      <span className="badge badge-completed">Ended</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <span>Max Players: <b style={{ color: 'var(--text-primary)' }}>{auction.max_players}</b></span>
                      <span>Total Points: <b style={{ color: 'var(--text-primary)' }}>{auction.total_points}</b></span>
                      <span>Starting Bid: <b style={{ color: 'var(--text-primary)' }}>{auction.starting_bid}</b></span>
                    </div>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Players have been synced to their teams. View them in the "Teams & Players" tab.</p>

                  <AuctionTable auction={auction} teams={teams} editable={false} availablePlayers={tournamentPlayers.filter(p => !isPlayerAssigned(p.name))} />

                  <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <button className="btn btn-primary" onClick={async () => {
                      const resumed = { ...auction, status: 'live' };
                      try {
                        const res = await api.updateAuction(selectedTournament.id, resumed);
                        setAuction(res.auction);
                      } catch (err) { setError(err.message); }
                    }} style={{ fontSize: '0.9rem', padding: '0.6rem 1.5rem' }}>
                      Resume Auction
                    </button>
                  </div>
                </>
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

      {/* ── Manage Palladio Community Section ── */}
      <div style={{ marginTop: '2.5rem', marginBottom: '2rem' }}>
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
            Manage Palladio Community
          </h2>
        </div>
        <div className="dashboard-tiles">
          <Link to="/admin/global-players" className="dashboard-tile tile-violet" style={{
            borderColor: 'rgba(167, 139, 250, 0.3)',
          }}>
            <span className="tile-icon" aria-hidden="true">
              <Users size={25} strokeWidth={2.25} />
            </span>
            <span className="tile-copy">
              <strong>Global Player Profiles</strong>
              <span>Search, view, edit and delete global player profiles</span>
            </span>
            <span className="tile-arrow" aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      {validationError && (
        <Modal
          title="Invalid Match ID"
          onClose={() => setValidationError(null)}
        >
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <AlertTriangle size={24} color="var(--accent-danger)" style={{ flexShrink: 0 }} />
            <div>
              <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>
                {validationError}
              </p>
              <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Please create the match fixture first before referencing its Match ID as a placeholder.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button className="btn btn-primary" onClick={() => setValidationError(null)}>
              OK
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

function AuctionTable({ auction, teams, editable = false, auctionPlayerForms, setAuctionPlayerForms, onAddPlayer, onRemovePlayer, availablePlayers = [] }) {
  const [zoomLevel, setZoomLevel] = React.useState(1);
  if (!auction || !auction.team_players) return null;

  const { max_players, total_points, starting_bid, team_players } = auction;

  // Filter teams to only those in the auction
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
      <datalist id="available-players">
        {[...availablePlayers].sort((a, b) => a.name.localeCompare(b.name)).map(p => <option key={p.id} value={p.name} />)}
      </datalist>
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
                  <th key={team.id} colSpan={editable ? 5 : 4} style={{
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
                    {editable && <th style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--glass-border)', width: '30px' }}></th>}
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Player rows */}
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
                          {player ? (player.gender === 'Male' ? 'M' : player.gender === 'Female' ? 'F' : player.gender) : '—'}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center', fontWeight: player ? 600 : 400, color: player ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)' }}>
                          {player ? player.points : '—'}
                        </td>
                        {editable && (
                          <td style={{ padding: '0.25rem', textAlign: 'center' }}>
                            {player && (
                              <button onClick={() => onRemovePlayer(team.id, rowIdx)} style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', padding: '2px', lineHeight: 1 }}>
                                <X size={14} />
                              </button>
                            )}
                          </td>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}

              {/* Add player row (editable only) */}
              {editable && (
                <tr style={{ borderTop: '2px solid var(--glass-border)', background: 'rgba(59, 130, 246, 0.03)' }}>
                  {chunk.map((team, idx) => {
                    const players = team_players[team.id] || [];
                    const isFull = players.length >= max_players;
                    const form = auctionPlayerForms?.[team.id] || { name: '', gender: 'Male', points: '' };
                    return (
                      <React.Fragment key={`add-${team.id}`}>
                        <td style={{ padding: '0.4rem 0.25rem', borderLeft: idx > 0 ? '2px solid rgba(255, 255, 255, 0.15)' : 'none' }}></td>
                        <td colSpan={2} style={{ padding: '0.4rem 0.25rem' }}>
                          <input
                            list="available-players"
                            className="form-input"
                            style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', width: '100%', minWidth: '80px' }}
                            placeholder={isFull ? 'Team is full' : 'Search player...'}
                            disabled={isFull}
                            value={form.name}
                            onChange={e => {
                              const val = e.target.value;
                              const selected = availablePlayers.find(p => p.name === val);
                              setAuctionPlayerForms(prev => ({
                                ...prev,
                                [team.id]: { ...form, name: val, gender: selected?.gender || form.gender },
                              }));
                            }}
                          />
                        </td>
                        <td style={{ padding: '0.4rem 0.25rem' }}>
                          <input
                            type="text"
                            className="form-input"
                            style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', width: '100%', minWidth: '50px' }}
                            placeholder="Pts"
                            disabled={isFull}
                            value={form.points}
                            onChange={e => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              setAuctionPlayerForms(prev => ({ ...prev, [team.id]: { ...form, points: val } }))
                            }}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAddPlayer(team.id); } }}
                          />
                        </td>
                        <td style={{ padding: '0.4rem 0.25rem', textAlign: 'center' }}>
                          <button
                            className="btn btn-primary"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', minWidth: 'unset' }}
                            disabled={isFull || !form.name || !form.points}
                            onClick={() => onAddPlayer(team.id)}
                          >+</button>
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              )}

              {/* Separator */}
              <tr><td colSpan={chunk.length * (editable ? 5 : 4)} style={{ padding: 0, height: '4px', background: 'var(--glass-border)' }}></td></tr>

              {/* Points Consumed */}
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                {chunk.map((team, idx) => {
                  const players = team_players[team.id] || [];
                  const consumed = players.reduce((sum, p) => sum + (p.points || 0), 0);
                  return (
                    <React.Fragment key={`consumed-${team.id}`}>
                      <td colSpan={editable ? 4 : 3} style={{ ...summaryLabelStyle, borderLeft: idx > 0 ? '2px solid rgba(255, 255, 255, 0.15)' : 'none' }}>Points Consumed</td>
                      <td style={{ ...summaryValueStyle, color: 'var(--accent-primary)' }}>{consumed}</td>
                    </React.Fragment>
                  );
                })}
              </tr>

              {/* Points Left */}
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                {chunk.map((team, idx) => {
                  const players = team_players[team.id] || [];
                  const consumed = players.reduce((sum, p) => sum + (p.points || 0), 0);
                  const left = total_points - consumed;
                  return (
                    <React.Fragment key={`left-${team.id}`}>
                      <td colSpan={editable ? 4 : 3} style={{ ...summaryLabelStyle, borderLeft: idx > 0 ? '2px solid rgba(255, 255, 255, 0.15)' : 'none' }}>Points Left</td>
                      <td style={{ ...summaryValueStyle, color: left > 0 ? 'var(--accent-secondary)' : 'var(--accent-danger)' }}>{left}</td>
                    </React.Fragment>
                  );
                })}
              </tr>

              {/* Players Left */}
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                {chunk.map((team, idx) => {
                  const players = team_players[team.id] || [];
                  const playersLeft = max_players - players.length;
                  return (
                    <React.Fragment key={`pleft-${team.id}`}>
                      <td colSpan={editable ? 4 : 3} style={{ ...summaryLabelStyle, borderLeft: idx > 0 ? '2px solid rgba(255, 255, 255, 0.15)' : 'none' }}>Players Left</td>
                      <td style={{ ...summaryValueStyle, color: playersLeft > 0 ? 'var(--text-primary)' : 'var(--accent-secondary)' }}>{playersLeft}</td>
                    </React.Fragment>
                  );
                })}
              </tr>

              {/* Max Bid */}
              <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                {chunk.map((team, idx) => {
                  const players = team_players[team.id] || [];
                  const consumed = players.reduce((sum, p) => sum + (p.points || 0), 0);
                  const pointsLeft = total_points - consumed;
                  const playersLeft = max_players - players.length;
                  const maxBid = playersLeft > 0 ? pointsLeft - ((playersLeft - 1) * starting_bid) : 0;
                  return (
                    <React.Fragment key={`maxbid-${team.id}`}>
                      <td colSpan={editable ? 4 : 3} style={{ ...summaryLabelStyle, color: 'var(--accent-primary)', borderLeft: idx > 0 ? '2px solid rgba(255, 255, 255, 0.15)' : 'none' }}>Max Bid</td>
                      <td style={{ ...summaryValueStyle, color: maxBid > 0 ? '#f59e0b' : 'var(--accent-danger)', fontSize: '1rem' }}>{maxBid > 0 ? maxBid : 0}</td>
                    </React.Fragment>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
