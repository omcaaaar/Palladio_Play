from fastapi import APIRouter, HTTPException, Request
from models import Tournament, Team, Fixture, Event, TournamentPlayer
import database

router = APIRouter(prefix="/api/admin", tags=["admin"])

# ── Tournaments ───────────────────────────────────────────────

@router.get("/tournaments")
def list_tournaments():
    return database.get_all_tournaments()

@router.post("/tournaments")
def create_tournament(tournament: Tournament):
    data = tournament.model_dump()
    database.add_tournament(data)
    return {"message": "Tournament created", "tournament": data}

@router.put("/tournaments/{tid}")
async def update_tournament(tid: str, update: dict, request: Request):
    result = database.update_tournament(tid, update)
    if not result:
        raise HTTPException(404, "Tournament not found")
    
    if hasattr(request.app.state, "ws_manager"):
        await request.app.state.ws_manager.broadcast({
            "type": "tournament_updated",
            "tournament_id": tid
        })
        
    return {"message": "Tournament updated", "tournament": result}

@router.delete("/tournaments/{tid}")
def delete_tournament(tid: str):
    if not database.delete_tournament(tid):
        raise HTTPException(404, "Tournament not found")
    return {"message": "Tournament deleted"}

# ── Teams ─────────────────────────────────────────────────────

@router.get("/tournaments/{tid}/teams")
def list_teams(tid: str):
    return database.get_teams(tid)

@router.post("/tournaments/{tid}/teams")
def add_team(tid: str, team: Team):
    data = team.model_dump()
    data["tournament_id"] = tid
    database.add_team(tid, data)
    return {"message": "Team added", "team": data}

@router.put("/tournaments/{tid}/teams/{team_id}")
def update_team(tid: str, team_id: str, update: dict):
    result = database.update_team(tid, team_id, update)
    if not result:
        raise HTTPException(404, "Team not found")
    return {"message": "Team updated", "team": result}

@router.delete("/tournaments/{tid}/teams/{team_id}")
def delete_team(tid: str, team_id: str):
    if not database.delete_team(tid, team_id):
        raise HTTPException(404, "Team not found")
    return {"message": "Team deleted"}

# ── Players ───────────────────────────────────────────────────

@router.get("/tournaments/{tid}/players")
def list_players(tid: str):
    return database.get_players(tid)

@router.post("/tournaments/{tid}/players")
def add_player(tid: str, player: TournamentPlayer):
    data = player.model_dump()
    data["tournament_id"] = tid
    # Check for uniqueness
    existing_players = database.get_players(tid)
    for p in existing_players:
        if p["name"].lower() == data["name"].lower():
            raise HTTPException(400, "A player with this name already exists")
    database.add_player(tid, data)
    return {"message": "Player added", "player": data}

@router.delete("/tournaments/{tid}/players/{player_id}")
def delete_player(tid: str, player_id: str):
    if not database.delete_player(tid, player_id):
        raise HTTPException(404, "Player not found")
    return {"message": "Player deleted"}

@router.put("/tournaments/{tid}/players/{player_id}")
def update_player(tid: str, player_id: str, player: TournamentPlayer):
    data = player.model_dump()
    data["tournament_id"] = tid
    data["id"] = player_id
    # Check for uniqueness if name is provided
    if "name" in data:
        existing_players = database.get_players(tid)
        for p in existing_players:
            if p["id"] != player_id and p["name"].lower() == data["name"].lower():
                raise HTTPException(400, "A player with this name already exists")
    if not database.update_player(tid, player_id, data):
        raise HTTPException(404, "Player not found")
    return {"message": "Player updated", "player": data}

# ── Events ────────────────────────────────────────────────────

@router.get("/tournaments/{tid}/events")
def list_events(tid: str):
    return database.get_events(tid)

@router.post("/tournaments/{tid}/events")
def add_event(tid: str, event: Event):
    data = event.model_dump()
    data["tournament_id"] = tid
    database.add_event(tid, data)
    return {"message": "Event added", "event": data}

@router.delete("/tournaments/{tid}/events/{event_id}")
def delete_event(tid: str, event_id: str):
    if not database.delete_event(tid, event_id):
        raise HTTPException(404, "Event not found")
    return {"message": "Event deleted"}

@router.put("/tournaments/{tid}/events/{event_id}")
def update_event(tid: str, event_id: str, update: dict):
    result = database.update_event(tid, event_id, update)
    if not result:
        raise HTTPException(404, "Event not found")
    return {"message": "Event updated", "event": result}

# ── Fixtures ──────────────────────────────────────────────────

@router.get("/tournaments/{tid}/fixtures")
def list_fixtures(tid: str):
    return database.get_fixtures(tid)

@router.post("/tournaments/{tid}/fixtures")
def add_fixture(tid: str, fixture: Fixture):
    data = fixture.model_dump()
    data["tournament_id"] = tid
    database.add_fixture(tid, data)
    return {"message": "Fixture added", "fixture": data}

@router.put("/tournaments/{tid}/fixtures/{fixture_id}")
def update_fixture(tid: str, fixture_id: str, update: dict):
    result = database.update_fixture(tid, fixture_id, update)
    if not result:
        raise HTTPException(404, "Fixture not found")
    return {"message": "Fixture updated", "fixture": result}

@router.delete("/tournaments/{tid}/fixtures/{fixture_id}")
def delete_fixture(tid: str, fixture_id: str):
    if not database.delete_fixture(tid, fixture_id):
        raise HTTPException(404, "Fixture not found")
    return {"message": "Fixture deleted"}

@router.post("/tournaments/{tid}/generate-league-fixtures")
def generate_league_fixtures(tid: str):
    fixtures = database.generate_league_fixtures(tid)
    return {"message": "League fixtures generated successfully", "fixtures": fixtures}

# ── Auction ───────────────────────────────────────────────────

@router.get("/tournaments/{tid}/auction")
def get_auction(tid: str):
    auction = database.get_auction(tid)
    return auction or {"status": "idle", "max_players": 8, "total_points": 100, "starting_bid": 10, "team_players": {}}

@router.put("/tournaments/{tid}/auction")
def update_auction(tid: str, auction_data: dict):
    result = database.update_auction(tid, auction_data)
    if result is None:
        raise HTTPException(404, "Tournament not found")
    return {"message": "Auction updated", "auction": result}

@router.post("/tournaments/{tid}/auction/start")
def start_auction(tid: str, config: dict):
    teams = database.get_teams(tid)
    if not teams:
        raise HTTPException(400, "No teams found. Add teams before starting the auction.")
    
    # Initialize team_players for each team
    team_players = {}
    for team in teams:
        team_players[team["id"]] = []
    
    auction = {
        "status": "live",
        "max_players": config.get("max_players", 8),
        "total_points": config.get("total_points", 100),
        "starting_bid": config.get("starting_bid", 10),
        "team_players": team_players,
    }
    result = database.update_auction(tid, auction)
    return {"message": "Auction started", "auction": result}

@router.post("/tournaments/{tid}/auction/end")
def end_auction(tid: str):
    auction = database.get_auction(tid)
    if not auction or auction.get("status") != "live":
        raise HTTPException(400, "No live auction to end")
    
    # Sync auction players into each team's players_list
    team_players = auction.get("team_players", {})
    for team_id, players in team_players.items():
        # Build players_list from auction data (name + gender, without points)
        players_list = [{"name": p["name"], "gender": p["gender"]} for p in players]
        database.update_team(tid, team_id, {"players_list": players_list})
    
    auction["status"] = "ended"
    database.update_auction(tid, auction)
    return {"message": "Auction ended. Players synced to teams.", "auction": auction}
