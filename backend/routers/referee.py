from fastapi import APIRouter, HTTPException, Request
from models import Scorecard, ScorecardCreate, SetScore
import database

router = APIRouter(prefix="/api/referee", tags=["referee"])

@router.get("/tournaments/{tid}/fixtures")
def list_fixtures(tid: str):
    return database.get_fixtures(tid)

@router.get("/tournaments/{tid}/fixtures/{fixture_id}/scorecards")
def list_scorecards_for_fixture(tid: str, fixture_id: str):
    return database.get_scorecards_for_fixture(tid, fixture_id)

@router.post("/tournaments/{tid}/scorecards")
async def create_scorecard(tid: str, sc: ScorecardCreate, request: Request):
    scorecard = Scorecard(
        fixture_id=sc.fixture_id,
        event_id=sc.event_id,
        team1_player1=sc.team1_player1,
        team1_player2=sc.team1_player2,
        team2_player1=sc.team2_player1,
        team2_player2=sc.team2_player2,
        num_sets=sc.num_sets,
        points_per_set=sc.points_per_set,
        sets=[SetScore() for _ in range(sc.num_sets)],
        current_set=0,
        status=sc.status,
    )
    data = scorecard.model_dump()
    database.add_scorecard(tid, data)
    await request.app.state.ws_manager.broadcast({
        "type": "scorecard_created",
        "tournament_id": tid,
        "data": data,
    })
    return {"message": "Scorecard created", "scorecard": data}

def update_fixture_status_from_scorecards(tid: str, fixture_id: str):
    scorecards = database.get_scorecards_for_fixture(tid, fixture_id)
    if not scorecards:
        return
    
    any_in_progress = any(sc["status"] == "in_progress" for sc in scorecards)
    any_completed = any(sc["status"] == "completed" for sc in scorecards)
    all_completed = all(sc["status"] == "completed" for sc in scorecards)
    
    if all_completed:
        new_status = "completed"
    elif any_in_progress or any_completed:
        new_status = "in_progress"
    else:
        new_status = "pending"
        
    if new_status == "in_progress":
        # Put other in-progress fixtures on hold
        tournament_data = database.get_tournament_data(tid)
        if tournament_data and "fixtures" in tournament_data:
            for f in tournament_data["fixtures"]:
                if f["id"] != fixture_id and f["status"] == "in_progress":
                    database.update_fixture(tid, f["id"], {"status": "on_hold"})
                    
    database.update_fixture(tid, fixture_id, {"status": new_status})

@router.put("/tournaments/{tid}/scorecards/{scorecard_id}/start")
async def start_scorecard(tid: str, scorecard_id: str, request: Request):
    scorecard = database.get_scorecard(tid, scorecard_id)
    if not scorecard:
        raise HTTPException(404, "Scorecard not found")
    
    await request.app.state.ws_manager.broadcast({
        "type": "scorecard_updated",
        "tournament_id": tid,
        "data": scorecard,
    })
    return {"message": "Scorecard started", "scorecard": scorecard}

@router.put("/tournaments/{tid}/scorecards/{scorecard_id}")
async def update_scorecard_details(tid: str, scorecard_id: str, body: dict, request: Request):
    scorecard = database.get_scorecard(tid, scorecard_id)
    if not scorecard:
        raise HTTPException(404, "Scorecard not found")
    
    allowed_keys = {
        "team1_player1", "team1_player2", "team2_player1", "team2_player2",
        "num_sets", "points_per_set", "status", "winner", "sets", "current_set"
    }
    update_data = {k: v for k, v in body.items() if k in allowed_keys}
    
    if "num_sets" in update_data:
        new_num_sets = update_data["num_sets"]
        current_sets = update_data.get("sets", scorecard.get("sets", []))
        if len(current_sets) < new_num_sets:
            for _ in range(new_num_sets - len(current_sets)):
                current_sets.append({"team1_score": 0, "team2_score": 0})
        elif len(current_sets) > new_num_sets:
            current_sets = current_sets[:new_num_sets]
        update_data["sets"] = current_sets
        
        curr_set = update_data.get("current_set", scorecard.get("current_set", 0))
        if curr_set >= new_num_sets:
            update_data["current_set"] = max(0, new_num_sets - 1)
            
    scorecard = database.update_scorecard(tid, scorecard_id, update_data)
    
    if scorecard.get("status") == "in_progress":
        scorecards = database.get_scorecards(tid)
        for other_sc in scorecards:
            if other_sc["fixture_id"] == scorecard["fixture_id"] and other_sc["id"] != scorecard_id:
                if other_sc["status"] == "in_progress":
                    database.update_scorecard(tid, other_sc["id"], {"status": "on_hold"})
                    await request.app.state.ws_manager.broadcast({
                        "type": "scorecard_updated",
                        "tournament_id": tid,
                        "data": database.get_scorecard(tid, other_sc["id"]),
                    })

    update_fixture_status_from_scorecards(tid, scorecard["fixture_id"])
    
    await request.app.state.ws_manager.broadcast({
        "type": "scorecard_updated",
        "tournament_id": tid,
        "data": scorecard,
    })
    return {"message": "Scorecard updated", "scorecard": scorecard}

def _check_set_winner(set_data, target):
    s1 = set_data.get("team1_score", 0)
    s2 = set_data.get("team2_score", 0)
    if target == 21: cap = 30
    elif target == 15: cap = 21
    elif target == 11: cap = 15
    else: cap = target + 9

    if s1 >= target and (s1 - s2 >= 2 or s1 == cap):
        return "team1"
    if s2 >= target and (s2 - s1 >= 2 or s2 == cap):
        return "team2"
    return None

@router.put("/tournaments/{tid}/scorecards/{scorecard_id}/score")
async def update_score(tid: str, scorecard_id: str, body: dict, request: Request):
    """
    body: { "set_index": 0, "team": "team1"|"team2", "delta": 1|-1 }
    """
    set_index = body.get("set_index", 0)
    team = body.get("team")  # "team1" or "team2"
    delta = body.get("delta", 1)

    scorecards = database.get_scorecards(tid)
    sc = next((s for s in scorecards if s["id"] == scorecard_id), None)
    if not sc:
        raise HTTPException(404, "Scorecard not found")

    key = f"{team}_score"
    new_score = max(0, sc["sets"][set_index][key] + delta)
    sc["sets"][set_index][key] = new_score

    # Check for automatic match completion
    team1_wins = 0
    team2_wins = 0
    target_points = sc.get("points_per_set", 21)
    
    for s in sc["sets"]:
        set_winner = _check_set_winner(s, target_points)
        if set_winner == "team1":
            team1_wins += 1
        elif set_winner == "team2":
            team2_wins += 1
            
    sets_needed = (sc.get("num_sets", 1) // 2) + 1
    new_winner = sc.get("winner", "")
    
    if team1_wins >= sets_needed:
        new_status = "completed"
        new_winner = "team1"
    elif team2_wins >= sets_needed:
        new_status = "completed"
        new_winner = "team2"
    else:
        new_winner = ""
        is_non_zero = any(s.get("team1_score", 0) > 0 or s.get("team2_score", 0) > 0 for s in sc["sets"])
        if is_non_zero:
            if sc["status"] in ["pending", "on_hold", "completed"]:
                new_status = "in_progress"
            else:
                new_status = sc["status"]
        else:
            new_status = "pending"
            
    update_data = {
        "sets": sc["sets"],
        "status": new_status,
        "winner": new_winner
    }
    
    updated = database.update_scorecard(tid, scorecard_id, update_data)
    
    if new_status == "in_progress":
        for other_sc in scorecards:
            if other_sc["fixture_id"] == sc["fixture_id"] and other_sc["id"] != scorecard_id:
                if other_sc["status"] == "in_progress":
                    database.update_scorecard(tid, other_sc["id"], {"status": "on_hold"})
                    await request.app.state.ws_manager.broadcast({
                        "type": "scorecard_updated",
                        "tournament_id": tid,
                        "data": database.get_scorecard(tid, other_sc["id"]),
                    })

    update_fixture_status_from_scorecards(tid, sc["fixture_id"])

    await request.app.state.ws_manager.broadcast({
        "type": "score_update",
        "tournament_id": tid,
        "data": updated,
    })
    return {"message": "Score updated", "scorecard": updated}

@router.put("/tournaments/{tid}/scorecards/{scorecard_id}/change-set")
async def change_set(tid: str, scorecard_id: str, body: dict, request: Request):
    set_index = body.get("set_index", 0)
    scorecards = database.get_scorecards(tid)
    sc = next((s for s in scorecards if s["id"] == scorecard_id), None)
    if not sc:
        raise HTTPException(404, "Scorecard not found")

    if set_index < 0 or set_index >= sc.get("num_sets", 1):
        raise HTTPException(400, "Invalid set index")

    updated = database.update_scorecard(tid, scorecard_id, {"current_set": set_index})
    await request.app.state.ws_manager.broadcast({
        "type": "score_update",
        "tournament_id": tid,
        "data": updated,
    })
    return {"message": "Changed active set", "scorecard": updated}

@router.put("/tournaments/{tid}/scorecards/{scorecard_id}/complete")
async def complete_scorecard(tid: str, scorecard_id: str, body: dict, request: Request):
    """
    body: { "winner": "team1" | "team2" }
    """
    winner = body.get("winner", "")
    updated = database.update_scorecard(tid, scorecard_id, {
        "status": "completed",
        "winner": winner,
    })
    if not updated:
        raise HTTPException(404, "Scorecard not found")

    update_fixture_status_from_scorecards(tid, updated["fixture_id"])

    await request.app.state.ws_manager.broadcast({
        "type": "scorecard_completed",
        "tournament_id": tid,
        "data": updated,
    })
    return {"message": "Event completed", "scorecard": updated}
