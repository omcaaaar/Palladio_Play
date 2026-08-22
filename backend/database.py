import json
import os
from typing import List

DATA_DIR = os.path.join(os.path.dirname(__file__), "data", "tournaments")
os.makedirs(DATA_DIR, exist_ok=True)

def _get_filepath(tournament_id: str) -> str:
    return os.path.join(DATA_DIR, f"{tournament_id}.json")

def _read(tournament_id: str) -> dict | None:
    filepath = _get_filepath(tournament_id)
    if os.path.exists(filepath):
        with open(filepath, 'r') as f:
            data = json.load(f)
            
        # Clean scorecards statuses to match their score state
        updated = False
        if data and "scorecards" in data:
            for s in data["scorecards"]:
                # Check if score of any set is non-zero
                is_non_zero = any(
                    set_score.get("team1_score", 0) > 0 or set_score.get("team2_score", 0) > 0
                    for set_score in s.get("sets", [])
                )
                if s["status"] == "in_progress" and not is_non_zero:
                    s["status"] = "pending"
                    updated = True
                elif s["status"] == "pending" and is_non_zero:
                    s["status"] = "in_progress"
                    updated = True
                    
        if updated:
            # Write back the cleaned data to persist self-healing fixes
            with open(filepath, 'w') as f:
                json.dump(data, f, indent=2)
            
        return data
    return None

def _write(tournament_id: str, data: dict):
    filepath = _get_filepath(tournament_id)
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)

# ── Tournament ────────────────────────────────────────────────

def get_all_tournaments() -> List[dict]:
    tournaments = []
    for filename in os.listdir(DATA_DIR):
        if filename.endswith(".json"):
            with open(os.path.join(DATA_DIR, filename), 'r') as f:
                data = json.load(f)
                if "tournament" in data:
                    tournaments.append(data["tournament"])
    return tournaments

def add_tournament(tournament_data: dict):
    tid = tournament_data["id"]
    data = {
        "tournament": tournament_data,
        "teams": [],
        "fixtures": [],
        "events": [],
        "scorecards": [],
        "auction": None,
        "players": []
    }
    _write(tid, data)

def get_tournament_data(tournament_id: str) -> dict | None:
    return _read(tournament_id)

def update_tournament(tournament_id: str, update_data: dict) -> dict | None:
    data = _read(tournament_id)
    if data:
        data["tournament"].update(update_data)
        _write(tournament_id, data)
        return data["tournament"]
    return None

def delete_tournament(tournament_id: str) -> bool:
    filepath = _get_filepath(tournament_id)
    if os.path.exists(filepath):
        os.remove(filepath)
        return True
    return False

# ── Teams ─────────────────────────────────────────────────────

def get_teams(tournament_id: str) -> List[dict]:
    data = _read(tournament_id)
    return data.get("teams", []) if data else []

def add_team(tournament_id: str, team_data: dict):
    data = _read(tournament_id)
    if data:
        data["teams"].append(team_data)
        _write(tournament_id, data)

def update_team(tournament_id: str, team_id: str, update_data: dict) -> dict | None:
    data = _read(tournament_id)
    if data:
        for i, t in enumerate(data["teams"]):
            if t["id"] == team_id:
                data["teams"][i].update(update_data)
                _write(tournament_id, data)
                return data["teams"][i]
    return None

def delete_team(tournament_id: str, team_id: str) -> bool:
    data = _read(tournament_id)
    if data:
        original_len = len(data["teams"])
        data["teams"] = [t for t in data["teams"] if t["id"] != team_id]
        if len(data["teams"]) < original_len:
            _write(tournament_id, data)
            return True
    return False

# ── Players ───────────────────────────────────────────────────

def get_players(tournament_id: str) -> List[dict]:
    data = _read(tournament_id)
    return data.get("players", []) if data else []

def add_player(tournament_id: str, player_data: dict):
    data = _read(tournament_id)
    if data:
        if "players" not in data:
            data["players"] = []
        data["players"].append(player_data)
        _write(tournament_id, data)

def update_player(tournament_id: str, player_id: str, update_data: dict) -> dict | None:
    data = _read(tournament_id)
    if data and "players" in data:
        for i, player in enumerate(data["players"]):
            if player["id"] == player_id:
                data["players"][i].update(update_data)
                _write(tournament_id, data)
                return data["players"][i]
    return None

def delete_player(tournament_id: str, player_id: str) -> bool:
    data = _read(tournament_id)
    if data and "players" in data:
        original_len = len(data["players"])
        data["players"] = [p for p in data["players"] if p["id"] != player_id]
        if len(data["players"]) < original_len:
            _write(tournament_id, data)
            return True
    return False

# ── Events ────────────────────────────────────────────────────

def get_events(tournament_id: str) -> List[dict]:
    data = _read(tournament_id)
    return data.get("events", []) if data else []

def add_event(tournament_id: str, event_data: dict):
    data = _read(tournament_id)
    if data:
        data["events"].append(event_data)
        _write(tournament_id, data)

def delete_event(tournament_id: str, event_id: str) -> bool:
    data = _read(tournament_id)
    if data:
        original_len = len(data["events"])
        data["events"] = [e for e in data["events"] if e["id"] != event_id]
        if len(data["events"]) < original_len:
            _write(tournament_id, data)
            return True
    return False

def update_event(tournament_id: str, event_id: str, update_data: dict) -> dict | None:
    data = _read(tournament_id)
    if data:
        for i, e in enumerate(data["events"]):
            if e["id"] == event_id:
                data["events"][i].update(update_data)
                _write(tournament_id, data)
                return data["events"][i]
    return None

# ── Fixtures ──────────────────────────────────────────────────

def get_fixtures(tournament_id: str) -> List[dict]:
    data = _read(tournament_id)
    return data.get("fixtures", []) if data else []

def add_fixture(tournament_id: str, fixture_data: dict):
    data = _read(tournament_id)
    if data:
        data["fixtures"].append(fixture_data)
        _write(tournament_id, data)

def update_fixture(tournament_id: str, fixture_id: str, update_data: dict) -> dict | None:
    data = _read(tournament_id)
    if data:
        for i, f in enumerate(data["fixtures"]):
            if f["id"] == fixture_id:
                data["fixtures"][i].update(update_data)
                _write(tournament_id, data)
                return data["fixtures"][i]
    return None

def delete_fixture(tournament_id: str, fixture_id: str) -> bool:
    data = _read(tournament_id)
    if data:
        original_len = len(data["fixtures"])
        data["fixtures"] = [f for f in data["fixtures"] if f["id"] != fixture_id]
        if len(data["fixtures"]) < original_len:
            _write(tournament_id, data)
            return True
    return False

# ── Scorecards ────────────────────────────────────────────────

def get_scorecards(tournament_id: str) -> List[dict]:
    data = _read(tournament_id)
    return data.get("scorecards", []) if data else []

def get_scorecard(tournament_id: str, scorecard_id: str) -> dict | None:
    data = _read(tournament_id)
    if data:
        for s in data.get("scorecards", []):
            if s["id"] == scorecard_id:
                return s
    return None

def get_scorecards_for_fixture(tournament_id: str, fixture_id: str) -> List[dict]:
    data = _read(tournament_id)
    if data:
        return [s for s in data.get("scorecards", []) if s["fixture_id"] == fixture_id]
    return []

def add_scorecard(tournament_id: str, scorecard_data: dict):
    data = _read(tournament_id)
    if data:
        data["scorecards"].append(scorecard_data)
        _write(tournament_id, data)

def update_scorecard(tournament_id: str, scorecard_id: str, update_data: dict) -> dict | None:
    data = _read(tournament_id)
    if data:
        for i, s in enumerate(data["scorecards"]):
            if s["id"] == scorecard_id:
                data["scorecards"][i].update(update_data)
                _write(tournament_id, data)
                return data["scorecards"][i]
    return None

# ── Auction ────────────────────────────────────────────────────

def get_auction(tournament_id: str) -> dict | None:
    data = _read(tournament_id)
    if data:
        return data.get("auction", None)
    return None

def update_auction(tournament_id: str, auction_data: dict | None) -> dict | None:
    data = _read(tournament_id)
    if data:
        data["auction"] = auction_data
        _write(tournament_id, data)
        return auction_data
    return None
