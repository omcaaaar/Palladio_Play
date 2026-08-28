from fastapi import APIRouter, HTTPException, Form, UploadFile, File
import global_players

router = APIRouter(tags=["global-players"])


# ── Public endpoints ──────────────────────────────────────────

@router.get("/api/public/global-players")
def list_global_players():
    """Return lightweight list of all global players (name, photo, sports)."""
    return global_players.get_all_global_players()


@router.get("/api/public/global-players/{key:path}")
def get_global_player_profile(key: str):
    """Return full profile + stats for a player (public-safe, no sensitive data)."""
    player = global_players.get_global_player(key)
    if not player:
        raise HTTPException(404, "Player not found")
    return player


# ── Admin endpoints ───────────────────────────────────────────

@router.post("/api/admin/global-players/backfill")
def backfill_global_players():
    """One-time backfill: scan all tournaments and rebuild the global players list."""
    count = global_players.backfill_all()
    return {"message": f"Backfill complete. {count} global players created/updated."}


@router.get("/api/admin/global-players/{key:path}")
def get_admin_global_player_profile(key: str):
    """Return full profile + stats for a player including sensitive data for admin editing."""
    data = global_players._read_all()
    player = data.get(key)
    if not player:
        raise HTTPException(404, "Player not found")
    player["key"] = key
    return player


@router.post("/api/admin/global-players")
async def add_global_player(
    first_name: str = Form(...),
    last_name: str = Form(...),
    mobile: str = Form(...),
    wing: str = Form(...),
    flat_no: str = Form(...),
    birth_year: int = Form(...),
    gender: str = Form(...),
    photo: UploadFile = File(None)
):
    """Add a new global player."""
    name = f"{first_name.strip()} {last_name.strip()}"
    
    photo_url = ""
    if photo and photo.filename:
        try:
            from cloudinary_service import upload_photo
            file_bytes = await photo.read()
            photo_url = upload_photo(file_bytes, "global", name)
        except Exception as e:
            print(f"Photo upload failed: {e}")

    from datetime import datetime
    age = datetime.now().year - birth_year

    personal_data = {
        "first_name": first_name.strip(),
        "last_name": last_name.strip(),
        "gender": gender,
        "age": age,
        "birth_year": birth_year,
        "wing": wing,
        "flat_no": flat_no,
        "photo_url": photo_url
    }

    global_players.upsert_global_player(
        name=name,
        mobile=mobile,
        personal_data=personal_data,
    )
    
    key = global_players._make_key(name, mobile)
    
    # We return the lightweight dict to match what get_all_global_players provides
    # so the frontend can append it to the allPlayers list seamlessly
    data = global_players._read_all()
    created_player = data.get(key, {})
    sports_played = list(created_player.get("sports", {}).keys())
    
    lightweight_player = {
        "key": key,
        "name": created_player.get("name", name),
        "photo_url": created_player.get("photo_url", photo_url),
        "gender": created_player.get("gender", gender),
        "sports": sports_played,
    }
    
    return {"message": "Player added successfully", "player": lightweight_player}


@router.put("/api/admin/global-players/{key:path}")
async def update_global_player(
    key: str,
    first_name: str = Form(None),
    last_name: str = Form(None),
    gender: str = Form(None),
    birth_year: int = Form(None),
    wing: str = Form(None),
    flat_no: str = Form(None),
    sports_expertise: str = Form(None), # JSON string of dict {sport: expertise}
    photo: UploadFile = File(None),
    remove_photo: bool = Form(False)
):
    """Update global player personal details and photo."""
    player = global_players.get_global_player(key)
    if not player:
        raise HTTPException(404, "Player not found")

    photo_url = None
    if remove_photo:
        photo_url = ""
    elif photo and photo.filename:
        try:
            from cloudinary_service import upload_photo
            file_bytes = await photo.read()
            photo_url = upload_photo(file_bytes, "global", player.get("name", "Unknown"))
        except Exception as e:
            print(f"Photo upload failed: {e}")

    import json
    sports_expertise_dict = {}
    if sports_expertise:
        try:
            sports_expertise_dict = json.loads(sports_expertise)
        except:
            pass

    personal_data = {}
    if first_name is not None:
        personal_data["first_name"] = first_name
    if last_name is not None:
        personal_data["last_name"] = last_name
    if gender is not None:
        personal_data["gender"] = gender
    if birth_year is not None:
        from datetime import datetime
        personal_data["birth_year"] = birth_year
        personal_data["age"] = datetime.now().year - birth_year
    if wing is not None:
        personal_data["wing"] = wing
    if flat_no is not None:
        personal_data["flat_no"] = flat_no
    if sports_expertise_dict:
        personal_data["sports_expertise"] = sports_expertise_dict

    updated_player = global_players.update_global_player(key, personal_data, photo_url)
    if not updated_player:
        raise HTTPException(404, "Failed to update player")
    return {"message": "Player updated successfully", "player": updated_player}


@router.delete("/api/admin/global-players/{key:path}")
def delete_global_player(key: str):
    """Delete a global player record."""
    if not global_players.delete_global_player(key):
        raise HTTPException(404, "Player not found")
    return {"message": "Player deleted successfully"}
