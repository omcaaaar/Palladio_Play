"""
Global Player Profiles — API Router
====================================
Exposes CRUD endpoints for the global player directory, backed by the
``global_players.py`` data-layer module.

Public endpoints (under ``/api/public/global-players``):
  - GET /  – list all global players (lightweight)
  - GET /{key} – public-safe player profile (no sensitive data)

Admin endpoints (under ``/api/admin/global-players``):
  - GET /{key} – full player profile (including mobile, wing, flat_no)
  - POST /backfill – rebuild all global player records & stats from tournaments
  - PUT /{key} – update personal details & sport expertise (supports photo upload)
  - DELETE /{key} – remove a global player record
"""
import json
from fastapi import APIRouter, HTTPException, Form, File, UploadFile
from typing import Optional

import global_players

router = APIRouter(tags=["global_players"])


# ── Public endpoints ─────────────────────────────────────────

@router.get("/api/public/global-players")
def list_global_players():
    return global_players.get_all_global_players()


@router.get("/api/public/global-players/{key}")
def get_global_player_profile(key: str):
    player = global_players.get_global_player(key)
    if not player:
        raise HTTPException(404, "Global player not found")
    return player


# ── Admin endpoints ──────────────────────────────────────────

@router.post("/api/admin/global-players/backfill")
def backfill_global_players():
    count = global_players.backfill_all()
    return {"message": "Backfill complete", "count": count}


@router.get("/api/admin/global-players/{key}")
def get_admin_global_player_profile(key: str):
    player = global_players.get_global_player_admin(key)
    if not player:
        raise HTTPException(404, "Global player not found")
    return player


@router.put("/api/admin/global-players/{key}")
async def update_global_player_profile(
    key: str,
    first_name: str = Form(""),
    last_name: str = Form(""),
    gender: str = Form(""),
    age: str = Form(""),
    wing: str = Form(""),
    flat_no: str = Form(""),
    sports_expertise: str = Form(""),
    photo: Optional[UploadFile] = File(None),
):
    if not global_players.get_global_player_admin(key):
        raise HTTPException(404, "Global player not found")

    personal_data = {
        "first_name": first_name.strip(),
        "last_name": last_name.strip(),
        "gender": gender,
        "wing": wing,
        "flat_no": flat_no,
    }

    # Parse age – accept empty string (clear) or a valid integer
    if age and age.strip():
        try:
            personal_data["age"] = int(age)
        except ValueError:
            personal_data["age"] = age.strip()

    # Parse sports_expertise JSON string
    if sports_expertise:
        try:
            personal_data["sports_expertise"] = json.loads(sports_expertise)
        except (json.JSONDecodeError, TypeError):
            personal_data["sports_expertise"] = {}

    # Upload photo if provided (lazy import – Cloudinary may not be installed)
    photo_url = None
    if photo and photo.filename:
        try:
            from cloudinary_service import upload_photo
            file_bytes = await photo.read()
            safe_name = f"{first_name}_{last_name}".strip("_").lower() or "player"
            photo_url = upload_photo(file_bytes, "global_players", safe_name)
        except Exception as e:
            print(f"Global player photo upload failed: {e}")
            photo_url = None

    updated = global_players.update_global_player(key, personal_data, photo_url=photo_url)
    if not updated:
        raise HTTPException(404, "Global player not found")

    return {"message": "Global player updated", "player": updated}


@router.delete("/api/admin/global-players/{key}")
def delete_global_player_profile(key: str):
    if not global_players.delete_global_player(key):
        raise HTTPException(404, "Global player not found")
    return {"message": "Global player deleted"}
