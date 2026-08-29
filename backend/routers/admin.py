from fastapi import APIRouter, HTTPException, Request, Form, File, UploadFile
from typing import Optional
from pydantic import BaseModel
from datetime import datetime
from models import Tournament, Team, Fixture, Event, TournamentPlayer
import database

router = APIRouter(prefix="/api/admin", tags=["admin"])

# ── Tournaments ───────────────────────────────────────────────

@router.get("/tournaments")
def list_tournaments():
    return database.get_all_tournaments()

@router.post("/tournaments")
def create_tournament(tournament: Tournament):
    existing = database.get_all_tournaments()
    if any(t.get("name") == tournament.name for t in existing):
        raise HTTPException(status_code=400, detail="A tournament with this name already exists")
    
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
    team_name = team.name.strip()
    if not team_name:
        raise HTTPException(400, "Team name cannot be empty")
    
    existing_teams = database.get_teams(tid)
    if any(t.get("name", "").strip().lower() == team_name.lower() for t in existing_teams):
        raise HTTPException(400, "Team name already exists in this tournament")

    data = team.model_dump()
    data["name"] = team_name
    data["tournament_id"] = tid
    database.add_team(tid, data)
    return {"message": "Team added", "team": data}

@router.put("/tournaments/{tid}/teams/{team_id}")
def update_team(tid: str, team_id: str, update: dict):
    if "name" in update:
        team_name = update["name"].strip()
        if not team_name:
            raise HTTPException(400, "Team name cannot be empty")
        
        existing_teams = database.get_teams(tid)
        if any(t.get("id") != team_id and t.get("name", "").strip().lower() == team_name.lower() for t in existing_teams):
            raise HTTPException(400, "Team name already exists in this tournament")
        update["name"] = team_name

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
async def add_player(
    tid: str,
    first_name: str = Form(...),
    last_name: str = Form(...),
    mobile: str = Form(...),
    wing: str = Form(...),
    flat_no: str = Form(...),
    age: int = Form(...),
    gender: str = Form(""),
    expertise: str = Form(...),
    photo: Optional[UploadFile] = File(None),
):
    data_tournament = database.get_tournament_data(tid)
    if not data_tournament:
        raise HTTPException(404, "Tournament not found")
        
    tournament = data_tournament.get("tournament", {})
    category = tournament.get("category", "Adults")

    # Validate flat_no: must be 3-4 digits
    if not flat_no.isdigit() or len(flat_no) < 3 or len(flat_no) > 4:
        raise HTTPException(400, "Flat number must be 3 to 4 digits")

    # Validate mobile
    if not mobile or not mobile.isdigit() or len(mobile) != 10:
        raise HTTPException(400, "Mobile number is required and must be exactly 10 digits")

    full_name = f"{first_name.strip()} {last_name.strip()}"

    # Check for duplicate registration by name + mobile
    if database.check_duplicate_registration(tid, mobile, full_name):
        raise HTTPException(
            409,
            "A player is already registered with this name and mobile number"
        )

    # For Adults tournaments, gender is required
    if category == "Adults" and not gender:
        raise HTTPException(400, "Gender is required for Adults tournaments")

    # Compute age from birth_year
    from datetime import datetime
    age = datetime.now().year - birth_year

    # For Kids tournaments, derive category from age
    player_gender = gender
    if category == "Kids":
        kids_age_limit = tournament.get("kids_age_limit", 12)
        player_gender = "Junior" if age <= kids_age_limit else "Senior"

    photo_url = ""
    if photo and photo.filename:
        try:
            from cloudinary_service import upload_photo
            file_bytes = await photo.read()
            photo_url = upload_photo(file_bytes, tid, full_name)
        except Exception as e:
            print(f"Photo upload failed: {e}")
            photo_url = ""

    player = TournamentPlayer(
        tournament_id=tid,
        name=full_name,
        gender=player_gender,
        first_name=first_name.strip(),
        last_name=last_name.strip(),
        mobile=mobile,
        wing=wing,
        flat_no=flat_no,
        age=age,
        birth_year=birth_year,
        expertise=expertise,
        photo_url=photo_url,
        payment_confirmed=True, # Admin registering directly assumes payment is clear or irrelevant
        registered_at=datetime.now().isoformat(),
        consent_accepted=False,
    )

    data = player.model_dump()
    database.add_player(tid, data)

    # Upsert into global player directory
    try:
        import global_players
        global_players.upsert_global_player(
            name=full_name,
            mobile=mobile,
            personal_data={
                "first_name": first_name.strip(),
                "last_name": last_name.strip(),
                "gender": player_gender,
                "birth_year": birth_year,
                "wing": wing,
                "flat_no": flat_no,
                "expertise": expertise,
                "photo_url": photo_url,
                "consent_accepted": False,
            },
            sport=tournament.get("sport", ""),
            tournament_id=tid,
            tournament_name=tournament.get("name", ""),
        )
    except Exception as e:
        print(f"Global player upsert failed: {e}")

    return {"message": "Player added", "player": data}

class ImportGlobalPlayerRequest(BaseModel):
    global_player_key: str

@router.post("/tournaments/{tid}/players/import-global")
def import_global_player(tid: str, payload: ImportGlobalPlayerRequest):
    data_tournament = database.get_tournament_data(tid)
    if not data_tournament:
        raise HTTPException(404, "Tournament not found")
        
    tournament = data_tournament.get("tournament", {})
    category = tournament.get("category", "Adults")
    sport = tournament.get("sport", "")

    import global_players
    all_players = global_players._read_all()
    global_player = all_players.get(payload.global_player_key)
    
    if not global_player:
        raise HTTPException(404, "Global player not found")

    mobile = global_player.get("mobile", "")
    full_name = global_player.get("name", "")
    birth_year = global_player.get("birth_year")
    if birth_year:
        age = datetime.now().year - birth_year
    else:
        age = global_player.get("age", 0)
    gender = global_player.get("gender", "")

    # Check for duplicate registration by name + mobile
    if database.check_duplicate_registration(tid, mobile, full_name):
        raise HTTPException(
            409,
            "A player is already registered with this name and mobile number"
        )

    # For Adults tournaments, gender is required
    if category == "Adults" and not gender:
        raise HTTPException(400, "Gender is missing in the global player profile. Please update it first.")

    # For Kids tournaments, derive category from age
    player_gender = gender
    if category == "Kids":
        kids_age_limit = tournament.get("kids_age_limit", 12)
        player_gender = "Junior" if int(age) <= kids_age_limit else "Senior"

    # Extract sport expertise if available
    expertise = ""
    if sport in global_player.get("sports", {}):
        sport_data = global_player["sports"][sport]
        expertise = sport_data.get("expertise", "")

    player = TournamentPlayer(
        tournament_id=tid,
        name=full_name,
        gender=player_gender,
        first_name=global_player.get("first_name", ""),
        last_name=global_player.get("last_name", ""),
        mobile=mobile,
        wing=global_player.get("wing", ""),
        flat_no=global_player.get("flat_no", ""),
        age=age,
        birth_year=global_player.get("birth_year", None),
        expertise=expertise,
        photo_url=global_player.get("photo_url", ""),
        payment_confirmed=True, # Admin importing directly assumes payment is clear
        registered_at=datetime.now().isoformat(),
        consent_accepted=global_player.get("consent_accepted", False),
    )

    data = player.model_dump()
    database.add_player(tid, data)

    # Update global player to link this tournament
    try:
        global_players.upsert_global_player(
            name=full_name,
            mobile=mobile,
            personal_data={}, # we don't need to overwrite personal data
            sport=sport,
            tournament_id=tid,
            tournament_name=tournament.get("name", ""),
        )
    except Exception as e:
        print(f"Global player upsert failed: {e}")

    return {"message": "Player imported successfully", "player": data}

@router.delete("/tournaments/{tid}/players/{player_id}")
def delete_player(tid: str, player_id: str):
    if not database.delete_player(tid, player_id):
        raise HTTPException(404, "Player not found")
    return {"message": "Player deleted"}

@router.put("/tournaments/{tid}/players/{player_id}")
async def update_player(
    tid: str,
    player_id: str,
    first_name: str = Form(...),
    last_name: str = Form(...),
    mobile: str = Form(...),
    wing: str = Form(...),
    flat_no: str = Form(...),
    birth_year: int = Form(...),
    gender: str = Form(""),
    expertise: str = Form(...),
    photo: Optional[UploadFile] = File(None),
    remove_photo: bool = Form(False),
):
    data_tournament = database.get_tournament_data(tid)
    if not data_tournament:
        raise HTTPException(404, "Tournament not found")
        
    tournament = data_tournament.get("tournament", {})
    category = tournament.get("category", "Adults")

    existing_players = database.get_players(tid)
    existing_player = next((p for p in existing_players if p["id"] == player_id), None)
    if not existing_player:
        raise HTTPException(404, "Player not found")

    if not flat_no.isdigit() or len(flat_no) < 3 or len(flat_no) > 4:
        raise HTTPException(400, "Flat number must be 3 to 4 digits")

    if not mobile or not mobile.isdigit() or len(mobile) != 10:
        raise HTTPException(400, "Mobile number is required and must be exactly 10 digits")

    full_name = f"{first_name.strip()} {last_name.strip()}"

    for p in existing_players:
        if p["id"] != player_id and p["name"].lower() == full_name.lower() and p.get("mobile") == mobile:
            raise HTTPException(409, "A player is already registered with this name and mobile number")

    if category == "Adults" and not gender:
        raise HTTPException(400, "Gender is required for Adults tournaments")

    # Compute age from birth_year
    from datetime import datetime
    age = datetime.now().year - birth_year

    player_gender = gender
    if category == "Kids":
        kids_age_limit = tournament.get("kids_age_limit", 12)
        player_gender = "Junior" if age <= kids_age_limit else "Senior"

    photo_url = existing_player.get("photo_url", "")
    if remove_photo:
        photo_url = ""
    elif photo and photo.filename:
        try:
            from cloudinary_service import upload_photo
            file_bytes = await photo.read()
            photo_url = upload_photo(file_bytes, tid, full_name)
        except Exception as e:
            print(f"Photo upload failed: {e}")

    updated_data = existing_player.copy()
    updated_data.update({
        "name": full_name,
        "gender": player_gender,
        "first_name": first_name.strip(),
        "last_name": last_name.strip(),
        "mobile": mobile,
        "wing": wing,
        "flat_no": flat_no,
        "age": age,
        "birth_year": birth_year,
        "expertise": expertise,
        "photo_url": photo_url,
    })

    if not database.update_player(tid, player_id, updated_data):
        raise HTTPException(404, "Failed to update player in database")

    try:
        import global_players
        global_players.upsert_global_player(
            name=full_name,
            mobile=mobile,
            personal_data={
                "first_name": first_name.strip(),
                "last_name": last_name.strip(),
                "gender": player_gender,
                "age": age,
                "birth_year": birth_year,
                "wing": wing,
                "flat_no": flat_no,
                "expertise": expertise,
                "photo_url": photo_url,
            },
            sport=tournament.get("sport", ""),
            tournament_id=tid,
            tournament_name=tournament.get("name", ""),
        )
    except Exception as e:
        print(f"Global player upsert failed: {e}")

    return {"message": "Player updated", "player": updated_data}

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

    # ── Trigger global player stats rebuild when match is locked ──
    if update.get("is_frozen") is True:
        pass # Global stats are calculated dynamically on read, so no action needed on freeze.

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
        "max_players": config.get("max_players", 7),
        "total_points": config.get("total_points", 1000),
        "starting_bid": config.get("starting_bid", 20),
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

@router.delete("/tournaments/{tid}/auction")
def delete_auction(tid: str):
    database.update_auction(tid, None)
    return {"message": "Auction deleted", "auction": None}
