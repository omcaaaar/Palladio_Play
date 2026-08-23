import json
import os
from functools import lru_cache
from typing import List

import certifi
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "palladio_play")
MONGODB_COLLECTION = os.getenv("MONGODB_COLLECTION", "tournaments")
MONGODB_TIMEOUT = int(os.getenv("MONGODB_SERVER_SELECTION_TIMEOUT_MS", "5000"))
DATABASE_BACKEND = os.getenv("DATABASE_BACKEND", "mongo").lower()
DATA_DIR = os.path.join(os.path.dirname(__file__), "data", "tournaments")
os.makedirs(DATA_DIR, exist_ok=True)

if DATABASE_BACKEND not in {"mongo", "local"}:
    raise RuntimeError("DATABASE_BACKEND must be either 'mongo' or 'local'.")

def _get_filepath(tournament_id: str) -> str:
    return os.path.join(DATA_DIR, f"{tournament_id}.json")

@lru_cache(maxsize=1)
def _get_collection():
    if not MONGODB_URI:
        raise RuntimeError("MONGODB_URI is not configured. Add it to backend/.env.")
    client = MongoClient(
        MONGODB_URI,
        serverSelectionTimeoutMS=MONGODB_TIMEOUT,
        tlsCAFile=certifi.where(),
    )
    client.admin.command("ping")
    return client[MONGODB_DATABASE][MONGODB_COLLECTION]

def _read(tournament_id: str) -> dict | None:
    if DATABASE_BACKEND == "local":
        filepath = _get_filepath(tournament_id)
        if not os.path.exists(filepath):
            return None
        with open(filepath, encoding="utf-8") as file:
            document = json.load(file)
    else:
        document = _get_collection().find_one({"_id": tournament_id})
    if not document:
        return None

    if DATABASE_BACKEND == "mongo":
        document.pop("_id", None)
    updated = False
    for scorecard in document.get("scorecards", []):
        is_non_zero = any(
            set_score.get("team1_score", 0) > 0 or set_score.get("team2_score", 0) > 0
            for set_score in scorecard.get("sets", [])
        )
        if scorecard["status"] == "in_progress" and not is_non_zero:
            scorecard["status"] = "pending"
            updated = True
        elif scorecard["status"] == "pending" and is_non_zero:
            scorecard["status"] = "in_progress"
            updated = True

    if updated:
        _write(tournament_id, document)
    return document

def _write(tournament_id: str, data: dict):
    if DATABASE_BACKEND == "local":
        with open(_get_filepath(tournament_id), "w", encoding="utf-8") as file:
            json.dump(data, file, indent=2)
    else:
        _get_collection().replace_one(
            {"_id": tournament_id},
            {"_id": tournament_id, **data},
            upsert=True,
        )

# ── Tournament ────────────────────────────────────────────────

def get_all_tournaments() -> List[dict]:
    if DATABASE_BACKEND == "local":
        tournaments = []
        for filename in os.listdir(DATA_DIR):
            if filename.endswith(".json"):
                with open(os.path.join(DATA_DIR, filename), encoding="utf-8") as file:
                    document = json.load(file)
                if "tournament" in document:
                    tournaments.append(document["tournament"])
        return tournaments
    return [document["tournament"] for document in _get_collection().find({}, {"_id": 0, "tournament": 1}) if "tournament" in document]

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
    if DATABASE_BACKEND == "local":
        filepath = _get_filepath(tournament_id)
        if os.path.exists(filepath):
            os.remove(filepath)
            return True
        return False
    return _get_collection().delete_one({"_id": tournament_id}).deleted_count > 0

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

def update_player(tournament_id: str, player_id: str, player_data: dict) -> bool:
    data = _read(tournament_id)
    if data and "players" in data:
        for idx, p in enumerate(data["players"]):
            if p["id"] == player_id:
                for k, v in player_data.items():
                    if k != "id":
                        data["players"][idx][k] = v
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

def generate_league_fixtures(tournament_id: str) -> List[dict]:
    import itertools
    from models import Fixture
    data = _read(tournament_id)
    if not data:
        return []

    # Filter out existing league fixtures
    data["fixtures"] = [f for f in data.get("fixtures", []) if f.get("match_type") != "league"]

    teams = data.get("teams", [])
    
    from collections import defaultdict
    groups = defaultdict(list)
    for t in teams:
        grp = t.get("group", "").strip()
        groups[grp].append(t)
    
    new_fixtures = []
    for grp, grp_teams in groups.items():
        for t1, t2 in itertools.combinations(grp_teams, 2):
            fixture = Fixture(
                tournament_id=tournament_id,
                team1_id=t1["id"],
                team2_id=t2["id"],
                match_type="league",
                status="pending"
            ).model_dump()
            new_fixtures.append(fixture)
            
    data["fixtures"].extend(new_fixtures)
    _write(tournament_id, data)
    return data["fixtures"]

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

# ── Standings & Placeholders ─────────────────────────────────

def calculate_standings(tournament_id: str, group: str = None) -> List[dict]:
    data = _read(tournament_id)
    if not data: return []
    
    team_map = {}
    for t in data.get("teams", []):
        if group is not None and t.get("group", "") != group:
            continue
        team_map[t["id"]] = {
            "id": t["id"], "name": t["name"], "group": t.get("group", ""),
            "played": 0, "won": 0, "lost": 0, "points": 0, "eventDiff": 0, "setPointDiff": 0
        }
    
    completed_fixtures = [f for f in data.get("fixtures", []) if f.get("status") == "completed" and f.get("match_type") == "league"]
    
    for f in completed_fixtures:
        t1 = team_map.get(f.get("team1_id"))
        t2 = team_map.get(f.get("team2_id"))
        if not t1 or not t2: continue
        
        f_scorecards = [sc for sc in data.get("scorecards", []) if sc.get("fixture_id") == f["id"] and sc.get("status") == "completed"]
        if not f_scorecards: continue
        
        t1_event_pts, t2_event_pts = 0, 0
        t1_set_pt_diff, t2_set_pt_diff = 0, 0
        
        for sc in f_scorecards:
            ev = next((e for e in data.get("events", []) if e["id"] == sc.get("event_id")), None)
            pts = sc.get("event_points") if sc.get("event_points") is not None else (ev.get("points", 0) if ev else 0)
            
            if sc.get("winner") == "team1": t1_event_pts += pts
            elif sc.get("winner") == "team2": t2_event_pts += pts
            
            for s in sc.get("sets", []):
                s1 = s.get("team1_score", 0)
                s2 = s.get("team2_score", 0)
                t1_set_pt_diff += (s1 - s2)
                t2_set_pt_diff += (s2 - s1)
        
        t1["played"] += 1
        t2["played"] += 1
        
        if t1_event_pts > t2_event_pts:
            t1["won"] += 1; t1["points"] += 1
            t2["lost"] += 1
        elif t2_event_pts > t1_event_pts:
            t2["won"] += 1; t2["points"] += 1
            t1["lost"] += 1
            
        t1["eventDiff"] += (t1_event_pts - t2_event_pts)
        t2["eventDiff"] += (t2_event_pts - t1_event_pts)
        t1["setPointDiff"] += t1_set_pt_diff
        t2["setPointDiff"] += t2_set_pt_diff
        
    standings = list(team_map.values())
    standings.sort(key=lambda x: (x["points"], x["eventDiff"], x["setPointDiff"]), reverse=True)
    return standings

def resolve_placeholders(tournament_id: str):
    data = _read(tournament_id)
    if not data: return
    
    fixtures = data.get("fixtures", [])
    updated = False
    
    # Pre-calculate standings for groups if needed
    group_standings = {}
    def get_standings(grp):
        if grp not in group_standings:
            # Check if all league matches in this group are completed
            grp_teams = [t["id"] for t in data.get("teams", []) if t.get("group", "") == grp]
            if not grp_teams: 
                group_standings[grp] = []
                return []
                
            league_fixtures = [f for f in fixtures if f.get("match_type") == "league" and f.get("team1_id") in grp_teams and f.get("team2_id") in grp_teams]
            all_completed = all(f.get("status") in ["completed", "abandoned"] for f in league_fixtures)
            
            if all_completed and league_fixtures:
                group_standings[grp] = calculate_standings(tournament_id, grp)
            else:
                group_standings[grp] = []
        return group_standings[grp]
    
    for f in fixtures:
        for team_key, ph_key in [("team1_id", "team1_placeholder"), ("team2_id", "team2_placeholder")]:
            ph = f.get(ph_key)
            if not f.get(team_key) and ph:
                parts = ph.split(":")
                if len(parts) >= 2:
                    if parts[1].isdigit():
                        grp = parts[0].strip()
                        try: pos = int(parts[1]) - 1
                        except: continue
                        
                        st = get_standings(grp)
                        if st and 0 <= pos < len(st):
                            f[team_key] = st[pos]["id"]
                            updated = True
                    elif parts[1].lower() in ["winner", "loser"]:
                        target_fid = parts[0].strip()
                        is_winner = parts[1].lower() == "winner"
                        
                        target_f = next((tf for tf in fixtures if tf["id"] == target_fid), None)
                        if target_f and target_f.get("status") == "completed":
                            target_scs = [sc for sc in data.get("scorecards", []) if sc.get("fixture_id") == target_f["id"] and sc.get("status") == "completed"]
                            t1_wins = sum(1 for sc in target_scs if sc.get("winner") == "team1")
                            t2_wins = sum(1 for sc in target_scs if sc.get("winner") == "team2")
                            
                            winning_team_id = target_f.get("team1_id") if t1_wins > t2_wins else target_f.get("team2_id")
                            losing_team_id = target_f.get("team2_id") if t1_wins > t2_wins else target_f.get("team1_id")
                            
                            if is_winner and winning_team_id:
                                f[team_key] = winning_team_id
                                updated = True
                            elif not is_winner and losing_team_id:
                                f[team_key] = losing_team_id
                                updated = True

    if updated:
        _write(tournament_id, data)
