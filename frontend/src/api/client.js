const isDev = import.meta.env.DEV;
const API = isDev ? `http://${window.location.hostname}:8000` : '';

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    cache: 'no-store',
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

// ── Tournaments ──────────────────────────────────────────────
export const getTournaments = async () => {
  const data = await request('/api/public/tournaments');
  return data.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
};
export const getTournamentFull = (tid) => request(`/api/public/tournaments/${tid}`);
export const createTournament = (name, sport, category) =>
  request('/api/admin/tournaments', {
    method: 'POST',
    body: JSON.stringify({ name, sport, category }),
  });
export const updateTournament = (tid, updateData) =>
  request(`/api/admin/tournaments/${tid}`, {
    method: 'PUT',
    body: JSON.stringify(updateData),
  });
export const deleteTournament = (tid) =>
  request(`/api/admin/tournaments/${tid}`, {
    method: 'DELETE',
  });

// ── Teams ────────────────────────────────────────────────────
export const getTeams = (tid) => request(`/api/admin/tournaments/${tid}/teams`);
export const addTeam = (tid, data) =>
  request(`/api/admin/tournaments/${tid}/teams`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
export const updateTeam = (tid, teamId, data) =>
  request(`/api/admin/tournaments/${tid}/teams/${teamId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
export const deleteTeam = (tid, teamId) =>
  request(`/api/admin/tournaments/${tid}/teams/${teamId}`, {
    method: 'DELETE',
  });

// ── Players ──────────────────────────────────────────────────
export const getPlayers = (tid) => request(`/api/admin/tournaments/${tid}/players`);
export const addPlayer = (tid, data) =>
  request(`/api/admin/tournaments/${tid}/players`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
export const updatePlayer = (tid, playerId, data) =>
  request(`/api/admin/tournaments/${tid}/players/${playerId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
export const deletePlayer = (tid, playerId) =>
  request(`/api/admin/tournaments/${tid}/players/${playerId}`, {
    method: 'DELETE',
  });
export const updatePlayer = (tid, playerId, data) =>
  request(`/api/admin/tournaments/${tid}/players/${playerId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });


// ── Events ───────────────────────────────────────────────────
export const getEvents = (tid) => request(`/api/admin/tournaments/${tid}/events`);
export const addEvent = (tid, data) =>
  request(`/api/admin/tournaments/${tid}/events`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
export const deleteEvent = (tid, eventId) =>
  request(`/api/admin/tournaments/${tid}/events/${eventId}`, {
    method: 'DELETE',
  });
export const updateEvent = (tid, eventId, data) =>
  request(`/api/admin/tournaments/${tid}/events/${eventId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

// ── Fixtures ─────────────────────────────────────────────────
export const getFixtures = (tid) => request(`/api/admin/tournaments/${tid}/fixtures`);
export const addFixture = (tid, data) =>
  request(`/api/admin/tournaments/${tid}/fixtures`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
export const deleteFixture = (tid, fixtureId) =>
  request(`/api/admin/tournaments/${tid}/fixtures/${fixtureId}`, {
    method: 'DELETE',
  });
export const updateFixture = (tid, fixtureId, data) =>
  request(`/api/admin/tournaments/${tid}/fixtures/${fixtureId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const generateLeagueFixtures = (tid) =>
  request(`/api/admin/tournaments/${tid}/generate-league-fixtures`, {
    method: 'POST',
  });


// ── Referee / Scorecards ─────────────────────────────────────
export const getScorecardsForFixture = (tid, fixtureId) =>
  request(`/api/public/tournaments/${tid}/fixtures/${fixtureId}/scorecards`);

export const getAllScorecards = (tid) =>
  request(`/api/public/tournaments/${tid}/scorecards`);

export const createScorecard = (tid, data) =>
  request(`/api/referee/tournaments/${tid}/scorecards`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateScorecard = (tid, scorecardId, data) =>
  request(`/api/referee/tournaments/${tid}/scorecards/${scorecardId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const startScorecard = (tid, scorecardId) =>
  request(`/api/referee/tournaments/${tid}/scorecards/${scorecardId}/start`, {
    method: 'PUT',
  });

export const updateScore = (tid, scorecardId, data) =>
  request(`/api/referee/tournaments/${tid}/scorecards/${scorecardId}/score`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const changeSet = (tid, scorecardId, setIndex) =>
  request(`/api/referee/tournaments/${tid}/scorecards/${scorecardId}/change-set`, {
    method: 'PUT',
    body: JSON.stringify({ set_index: setIndex }),
  });

export const completeScorecard = (tid, scorecardId, winner) =>
  request(`/api/referee/tournaments/${tid}/scorecards/${scorecardId}/complete`, {
    method: 'PUT',
    body: JSON.stringify({ winner }),
  });

export const abandonScorecard = (tid, scorecardId) =>
  request(`/api/referee/tournaments/${tid}/scorecards/${scorecardId}/abandon`, {
    method: 'PUT',
  });

export const abandonFixture = (tid, fixtureId) =>
  request(`/api/referee/tournaments/${tid}/fixtures/${fixtureId}/abandon`, {
    method: 'PUT',
  });

// ── Auction ──────────────────────────────────────────────────
export const getAuction = (tid) => request(`/api/admin/tournaments/${tid}/auction`);
export const updateAuction = (tid, data) =>
  request(`/api/admin/tournaments/${tid}/auction`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
export const startAuction = (tid, config) =>
  request(`/api/admin/tournaments/${tid}/auction/start`, {
    method: 'POST',
    body: JSON.stringify(config),
  });
export const endAuction = (tid) =>
  request(`/api/admin/tournaments/${tid}/auction/end`, {
    method: 'POST',
  });
export const getPublicAuction = (tid) => request(`/api/public/tournaments/${tid}/auction`);

// ── WebSocket ────────────────────────────────────────────────
export function connectLiveScores(onMessage) {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsHost = isDev ? `${window.location.hostname}:8000` : window.location.host;
  const ws = new WebSocket(`${wsProtocol}//${wsHost}/ws/live-scores`);
  ws.onmessage = (e) => onMessage(JSON.parse(e.data));
  ws.onclose = () => {
    // Reconnect after 3 seconds
    setTimeout(() => connectLiveScores(onMessage), 3000);
  };
  return ws;
}
