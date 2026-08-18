from fastapi import APIRouter, HTTPException
from models import Tournament, Team, Fixture, Event
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
def update_tournament(tid: str, update: dict):
    result = database.update_tournament(tid, update)
    if not result:
        raise HTTPException(404, "Tournament not found")
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
