"""
Player self-registration router.
Handles tournament registration info, viewing registered players,
and self-registration of players via a public form.
"""
from fastapi import APIRouter, HTTPException, Form, File, UploadFile
from typing import Optional
from datetime import datetime
from models import TournamentPlayer
import database
import global_players

router = APIRouter(prefix="/api/registration", tags=["registration"])


# ── Registration Info ──────────────────────────────────────────

@router.get("/tournaments/{tid}/registration-info")
def get_registration_info(tid: str):
    """Return the tournament details needed by the public registration form."""
    data = database.get_tournament_data(tid)
    if not data:
        raise HTTPException(404, "Tournament not found")
    tournament = data.get("tournament", {})
    return tournament


# ── Registered Players ─────────────────────────────────────────

@router.get("/tournaments/{tid}/registered-players")
def get_registered_players(tid: str):
    """Return the list of self-registered players for a tournament."""
    data = database.get_tournament_data(tid)
    if not data:
        raise HTTPException(404, "Tournament not found")
    tournament = data.get("tournament", {})
    return {
        "players": data.get("players", []),
        "category": tournament.get("category", "Adults"),
    }


# ── Register a New Player ──────────────────────────────────────

def _str_to_bool(value: str) -> bool:
    return value.lower() in ("true", "1", "yes")


@router.post("/tournaments/{tid}/register")
async def register_player(
    tid: str,
    first_name: str = Form(...),
    last_name: str = Form(...),
    mobile: str = Form(...),
    wing: str = Form(...),
    flat_no: str = Form(...),
    age: int = Form(...),
    gender: str = Form(""),
    expertise: str = Form(...),
    played_state_national: str = Form(...),
    payment_confirmed: str = Form("false"),
    consent_accepted: str = Form("false"),
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

    # For Kids tournaments, derive category from age
    player_gender = gender
    if category == "Kids":
        kids_age_limit = tournament.get("kids_age_limit", 12)
        player_gender = "Junior" if age <= kids_age_limit else "Senior"

    # Consent is mandatory
    if not _str_to_bool(consent_accepted):
        raise HTTPException(400, "You must accept the data privacy consent to register")

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
        expertise=expertise,
        played_state_national=played_state_national,
        photo_url=photo_url,
        payment_confirmed=_str_to_bool(payment_confirmed),
        registered_at=datetime.now().isoformat(),
        consent_accepted=True,  # Validated above
    )

    data = player.model_dump()
    database.add_player(tid, data)

    # Upsert into global player directory
    try:
        global_players.upsert_global_player(
            name=full_name,
            mobile=mobile,
            personal_data={
                "first_name": first_name.strip(),
                "last_name": last_name.strip(),
                "gender": player_gender,
                "age": age,
                "wing": wing,
                "flat_no": flat_no,
                "expertise": expertise,
                "played_state_national": played_state_national,
                "photo_url": photo_url,
                "consent_accepted": True,
            },
            sport=tournament.get("sport", ""),
            tournament_id=tid,
            tournament_name=tournament.get("name", ""),
        )
    except Exception as e:
        print(f"Global player upsert failed: {e}")

    return {"message": "Registration successful", "player": data}
