"""
Global Player Profiles — Data Layer
====================================
Manages a persistent global_players.json file that aggregates player personal
details and per-sport tournament statistics across all tournaments.

Identity key: (name_lower, mobile)  — a composite key so that family members
sharing the same phone number are still treated as distinct players.
"""

import json
import os
import re
from typing import List, Optional

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
GLOBAL_PLAYERS_FILE = os.path.join(DATA_DIR, "global_players.json")
os.makedirs(DATA_DIR, exist_ok=True)

SUPPORTED_SPORTS = {"Badminton", "Table Tennis", "Pickleball"}

# ── Event name → category mapping ────────────────────────────

# Adults
#   "Men's Singles", "Men's Singles 1", "Men's Doubles 2", "Women's Singles",
#   "Women's Doubles", "Mixed Doubles", "Mixed Doubles 1" …
# Kids
#   "Junior Singles", "Senior Singles", "Junior Doubles", "Senior Doubles",
#   "Mixed Doubles"

_EVENT_CATEGORY_PATTERNS = [
    (re.compile(r"^Men'?s\s+Singles", re.IGNORECASE), "mens_singles"),
    (re.compile(r"^Men'?s\s+Doubles", re.IGNORECASE), "mens_doubles"),
    (re.compile(r"^Women'?s\s+Singles", re.IGNORECASE), "womens_singles"),
    (re.compile(r"^Women'?s\s+Doubles", re.IGNORECASE), "womens_doubles"),
    (re.compile(r"^Mixed\s+Doubles", re.IGNORECASE), "mixed_doubles"),
    (re.compile(r"^Junior\s+Singles", re.IGNORECASE), "junior_singles"),
    (re.compile(r"^Senior\s+Singles", re.IGNORECASE), "senior_singles"),
    (re.compile(r"^Junior\s+Doubles", re.IGNORECASE), "junior_doubles"),
    (re.compile(r"^Senior\s+Doubles", re.IGNORECASE), "senior_doubles"),
]


def classify_event(event_name: str) -> str:
    """Return a canonical category key from a potentially-numbered event name."""
    for pattern, category in _EVENT_CATEGORY_PATTERNS:
        if pattern.match(event_name):
            return category
    return "other"


# ── File I/O ──────────────────────────────────────────────────

def _read_all() -> dict:
    """Return the full global players dict keyed by composite id."""
    if not os.path.exists(GLOBAL_PLAYERS_FILE):
        return {}
    with open(GLOBAL_PLAYERS_FILE, encoding="utf-8") as f:
        return json.load(f)


def _write_all(data: dict):
    with open(GLOBAL_PLAYERS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def _make_key(name: str, mobile: str) -> str:
    """Composite identity: lowercased full-name + mobile."""
    return f"{name.strip().lower()}|{mobile.strip()}"


# ── Empty sport block helper ─────────────────────────────────

def _empty_stat():
    return {"played": 0, "won": 0, "lost": 0, "points_won": 0, "points_lost": 0}


def _empty_sport_block():
    return {
        "expertise": "",
        "tournaments": [],   # list of {tournament_id, tournament_name}
        "stats": {
            "total": _empty_stat(),
            "mens_singles": _empty_stat(),
            "mens_doubles": _empty_stat(),
            "womens_singles": _empty_stat(),
            "womens_doubles": _empty_stat(),
            "mixed_doubles": _empty_stat(),
            "junior_singles": _empty_stat(),
            "senior_singles": _empty_stat(),
            "junior_doubles": _empty_stat(),
            "senior_doubles": _empty_stat(),
        },
    }


# ── Public CRUD ───────────────────────────────────────────────

def get_all_global_players() -> List[dict]:
    """Return lightweight list of all global players (for dropdown/listing)."""
    data = _read_all()
    result = []
    for key, player in data.items():
        sports_played = list(player.get("sports", {}).keys())
        result.append({
            "key": key,
            "name": player.get("name", ""),
            "photo_url": player.get("photo_url", ""),
            "gender": player.get("gender", ""),
            "sports": sports_played,
        })
    result.sort(key=lambda p: p["name"].lower())
    return result


def get_global_player(key: str) -> Optional[dict]:
    """Return full player profile (personal + per-sport stats). Strips sensitive data."""
    data = _read_all()
    player = data.get(key)
    if not player:
        return None
    # Return public-safe copy (exclude mobile, wing, flat_no)
    return {
        "key": key,
        "name": player.get("name", ""),
        "photo_url": player.get("photo_url", ""),
        "gender": player.get("gender", ""),
        "age": player.get("age"),
        "sports": player.get("sports", {}),
    }


def upsert_global_player(
    name: str,
    mobile: str,
    personal_data: dict,
    sport: str = "",
    tournament_id: str = "",
    tournament_name: str = "",
):
    """Create or update a global player record.

    - personal_data: dict with keys like first_name, last_name, gender, age, …
    - sport: if provided, ensure the sport block exists and update expertise etc.
    - tournament_id/name: if provided, add to the sport's tournament list.
    """
    if not mobile:
        return  # Cannot track players without a mobile number

    data = _read_all()
    key = _make_key(name, mobile)

    if key not in data:
        data[key] = {
            "name": name,
            "first_name": personal_data.get("first_name", ""),
            "last_name": personal_data.get("last_name", ""),
            "mobile": mobile,
            "gender": personal_data.get("gender", ""),
            "age": personal_data.get("age"),
            "wing": personal_data.get("wing", ""),
            "flat_no": personal_data.get("flat_no", ""),
            "photo_url": personal_data.get("photo_url", ""),
            "consent_accepted": personal_data.get("consent_accepted", False),
            "sports": {},
        }
    else:
        # Update personal details (latest registration wins)
        player = data[key]
        player["name"] = name
        for field in ("first_name", "last_name", "gender", "age", "wing", "flat_no"):
            if personal_data.get(field):
                player[field] = personal_data[field]
        # Preserve consent if it was already True in the database
        player["consent_accepted"] = player.get("consent_accepted", False) or personal_data.get("consent_accepted", False)
        if personal_data.get("photo_url"):
            player["photo_url"] = personal_data["photo_url"]

    # Ensure sport block
    if sport and sport in SUPPORTED_SPORTS:
        player = data[key]
        if sport not in player["sports"]:
            player["sports"][sport] = _empty_sport_block()

        sport_block = player["sports"][sport]

        # Update sport-level details
        if personal_data.get("expertise"):
            sport_block["expertise"] = personal_data["expertise"]

        # Add tournament reference if not already present
        if tournament_id:
            existing_ids = {t["tournament_id"] for t in sport_block["tournaments"]}
            if tournament_id not in existing_ids:
                sport_block["tournaments"].append({
                    "tournament_id": tournament_id,
                    "tournament_name": tournament_name,
                })

    _write_all(data)


def update_global_player(key: str, personal_data: dict, photo_url: str = None) -> Optional[dict]:
    """Update a global player's personal details and sport expertise (name/mobile are restricted)."""
    data = _read_all()
    if key not in data:
        return None
    
    player = data[key]
    
    # Update personal fields
    for field in ("first_name", "last_name", "gender", "age", "wing", "flat_no"):
        if field in personal_data:
            player[field] = personal_data[field]
            
    if photo_url is not None:
        player["photo_url"] = photo_url
        
    # Update expertise per sport if provided
    sports_expertise = personal_data.get("sports_expertise", {})
    for sport, expertise in sports_expertise.items():
        if sport in player["sports"] and expertise:
            player["sports"][sport]["expertise"] = expertise
            
    _write_all(data)
    return player


def delete_global_player(key: str) -> bool:
    """Delete a global player record."""
    data = _read_all()
    if key in data:
        del data[key]
        _write_all(data)
        return True
    return False


# ── Stats Rebuild ─────────────────────────────────────────────

def _get_all_tournament_data() -> List[dict]:
    """Read every tournament JSON from the data/tournaments directory."""
    import database
    tournaments_dir = os.path.join(DATA_DIR, "tournaments")
    results = []
    if not os.path.exists(tournaments_dir):
        return results
    for filename in os.listdir(tournaments_dir):
        if filename.endswith(".json"):
            filepath = os.path.join(tournaments_dir, filename)
            with open(filepath, encoding="utf-8") as f:
                results.append(json.load(f))
    return results


def rebuild_stats_for_players(player_names: List[str], tournament_id: str):
    """Rebuild stats for specific players after a match is locked.

    We look up the global player by matching name (from scorecard) to the
    tournament's registered players list (to get their mobile for the key).
    """
    import database
    tournament_data = database.get_tournament_data(tournament_id)
    if not tournament_data:
        return

    tournament = tournament_data.get("tournament", {})
    sport = tournament.get("sport", "")
    if sport not in SUPPORTED_SPORTS:
        return

    registered = tournament_data.get("players", [])
    # Build name→mobile map from this tournament's registered players
    name_to_mobile = {}
    for p in registered:
        if p.get("mobile"):
            name_to_mobile[p["name"].strip().lower()] = p["mobile"]

    data = _read_all()
    all_tournaments = _get_all_tournament_data()

    for player_name in player_names:
        mobile = name_to_mobile.get(player_name.strip().lower(), "")
        if not mobile:
            continue  # Can't link without mobile

        key = _make_key(player_name, mobile)
        if key not in data:
            continue  # Player not in global list yet

        player = data[key]
        if sport not in player.get("sports", {}):
            player.setdefault("sports", {})[sport] = _empty_sport_block()

        # Reset stats for this sport
        sport_block = player["sports"][sport]
        for stat_key in sport_block["stats"]:
            sport_block["stats"][stat_key] = _empty_stat()

        # Recalculate from ALL tournaments of this sport
        for t_data in all_tournaments:
            t_info = t_data.get("tournament", {})
            if t_info.get("sport") != sport:
                continue

            events = t_data.get("events", [])
            event_map = {e["id"]: e for e in events}
            scorecards = t_data.get("scorecards", [])

            for sc in scorecards:
                if sc.get("status") not in ("completed",):
                    continue

                # Check if player is involved
                side = None
                if player_name in (sc.get("team1_player1", ""), sc.get("team1_player2", "")):
                    side = "team1"
                elif player_name in (sc.get("team2_player1", ""), sc.get("team2_player2", "")):
                    side = "team2"

                if side is None:
                    continue

                other_side = "team2" if side == "team1" else "team1"
                won = sc.get("winner") == side
                lost = sc.get("winner") == other_side

                # Classify event
                event = event_map.get(sc.get("event_id"), {})
                category = classify_event(event.get("name", ""))

                # Calculate points from sets
                pts_won = 0
                pts_lost = 0
                for s in sc.get("sets", []):
                    pts_won += s.get(f"{side}_score", 0)
                    pts_lost += s.get(f"{other_side}_score", 0)

                # Update total
                total = sport_block["stats"]["total"]
                total["played"] += 1
                if won:
                    total["won"] += 1
                if lost:
                    total["lost"] += 1
                total["points_won"] += pts_won
                total["points_lost"] += pts_lost

                # Update category
                if category in sport_block["stats"]:
                    cat = sport_block["stats"][category]
                    cat["played"] += 1
                    if won:
                        cat["won"] += 1
                    if lost:
                        cat["lost"] += 1
                    cat["points_won"] += pts_won
                    cat["points_lost"] += pts_lost

    _write_all(data)


def backfill_all():
    """One-time backfill: scan every tournament, create global player records,
    and calculate all stats from scratch."""
    all_tournaments = _get_all_tournament_data()
    data = _read_all()

    for t_data in all_tournaments:
        tournament = t_data.get("tournament", {})
        sport = tournament.get("sport", "")
        tid = tournament.get("id", "")
        t_name = tournament.get("name", "")

        if sport not in SUPPORTED_SPORTS:
            continue

        registered = t_data.get("players", [])
        for p in registered:
            mobile = p.get("mobile", "")
            if not mobile:
                continue

            name = p.get("name", "").strip()
            if not name:
                continue

            key = _make_key(name, mobile)

            if key not in data:
                data[key] = {
                    "name": name,
                    "first_name": p.get("first_name", ""),
                    "last_name": p.get("last_name", ""),
                    "mobile": mobile,
                    "gender": p.get("gender", ""),
                    "age": p.get("age"),
                    "wing": p.get("wing", ""),
                    "flat_no": p.get("flat_no", ""),
                    "photo_url": p.get("photo_url", ""),
                    "sports": {},
                }
            else:
                # Update personal details
                player = data[key]
                for field in ("first_name", "last_name", "gender", "age", "wing", "flat_no"):
                    if p.get(field):
                        player[field] = p[field]
                if p.get("photo_url"):
                    player["photo_url"] = p["photo_url"]

            player = data[key]
            if sport not in player["sports"]:
                player["sports"][sport] = _empty_sport_block()

            sport_block = player["sports"][sport]
            if p.get("expertise"):
                sport_block["expertise"] = p["expertise"]

            # Add tournament ref
            existing_ids = {t["tournament_id"] for t in sport_block["tournaments"]}
            if tid not in existing_ids:
                sport_block["tournaments"].append({
                    "tournament_id": tid,
                    "tournament_name": t_name,
                })

    # Save first (personal data), then rebuild all stats
    _write_all(data)

    # Now recalculate stats for every player
    for key, player in data.items():
        for sport in list(player.get("sports", {}).keys()):
            sport_block = player["sports"][sport]
            # Reset all stats
            for stat_key in sport_block["stats"]:
                sport_block["stats"][stat_key] = _empty_stat()

    # Walk through all scorecards
    for t_data in all_tournaments:
        tournament = t_data.get("tournament", {})
        sport = tournament.get("sport", "")
        if sport not in SUPPORTED_SPORTS:
            continue

        events = t_data.get("events", [])
        event_map = {e["id"]: e for e in events}
        scorecards = t_data.get("scorecards", [])
        registered = t_data.get("players", [])
        name_to_mobile = {}
        for p in registered:
            if p.get("mobile"):
                name_to_mobile[p["name"].strip().lower()] = p["mobile"]

        for sc in scorecards:
            if sc.get("status") != "completed":
                continue

            event = event_map.get(sc.get("event_id"), {})
            category = classify_event(event.get("name", ""))

            for side in ("team1", "team2"):
                other = "team2" if side == "team1" else "team1"
                players_in_side = [
                    sc.get(f"{side}_player1", ""),
                    sc.get(f"{side}_player2", ""),
                ]
                won = sc.get("winner") == side
                lost = sc.get("winner") == other

                pts_won = sum(s.get(f"{side}_score", 0) for s in sc.get("sets", []))
                pts_lost = sum(s.get(f"{other}_score", 0) for s in sc.get("sets", []))

                for pname in players_in_side:
                    if not pname:
                        continue
                    mobile = name_to_mobile.get(pname.strip().lower(), "")
                    if not mobile:
                        continue
                    key = _make_key(pname, mobile)
                    if key not in data:
                        continue
                    player = data[key]
                    if sport not in player.get("sports", {}):
                        continue
                    sb = player["sports"][sport]

                    total = sb["stats"]["total"]
                    total["played"] += 1
                    if won:
                        total["won"] += 1
                    if lost:
                        total["lost"] += 1
                    total["points_won"] += pts_won
                    total["points_lost"] += pts_lost

                    if category in sb["stats"]:
                        cat = sb["stats"][category]
                        cat["played"] += 1
                        if won:
                            cat["won"] += 1
                        if lost:
                            cat["lost"] += 1
                        cat["points_won"] += pts_won
                        cat["points_lost"] += pts_lost

    _write_all(data)
    return len(data)
