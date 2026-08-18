from fastapi import APIRouter, HTTPException
import database

router = APIRouter(prefix="/api/public", tags=["public"])

@router.get("/tournaments")
def get_tournaments():
    return database.get_all_tournaments()

@router.get("/tournaments/{tid}")
def get_tournament_full(tid: str):
    data = database.get_tournament_data(tid)
    if not data:
        raise HTTPException(404, "Tournament not found")
    return data

@router.get("/tournaments/{tid}/teams")
def get_teams(tid: str):
    return database.get_teams(tid)

@router.get("/tournaments/{tid}/fixtures")
def get_fixtures(tid: str):
    return database.get_fixtures(tid)

@router.get("/tournaments/{tid}/events")
def get_events(tid: str):
    return database.get_events(tid)

@router.get("/tournaments/{tid}/scorecards")
def get_scorecards(tid: str):
    return database.get_scorecards(tid)

@router.get("/tournaments/{tid}/fixtures/{fixture_id}/scorecards")
def get_scorecards_for_fixture(tid: str, fixture_id: str):
    return database.get_scorecards_for_fixture(tid, fixture_id)
