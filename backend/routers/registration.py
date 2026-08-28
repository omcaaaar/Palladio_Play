from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional
from datetime import datetime

import database
from models import TournamentPlayer

router = APIRouter(prefix="/api/registration", tags=["registration"])


@router.get("/tournaments/{tid}/registration-info")
def get_registration_info(tid: str):
    """Return tournament registration details for the registration page."""
    data = database.get_tournament_data(tid)
    if not data:
        raise HTTPException(404, "Tournament not found")

    tournament = data.get("tournament", {})
    return {
        "name": tournament.get("name", ""),
        "sport": tournament.get("sport", ""),
        "category": tournament.get("category", "Adults"),
        "start_date": tournament.get("start_date", ""),
        "end_date": tournament.get("end_date", ""),
        "registration_deadline": tournament.get("registration_deadline", ""),
        "entry_fees": tournament.get("entry_fees", 0),
        "upi_payment_number": tournament.get("upi_payment_number", ""),
        "kids_age_limit": tournament.get("kids_age_limit", 12),
    }


@router.get("/tournaments/{tid}/registered-players")
def get_registered_players(tid: str):
    """Return list of registered player names + categories (public endpoint)."""
    data = database.get_tournament_data(tid)
    if not data:
        raise HTTPException(404, "Tournament not found")

    tournament = data.get("tournament", {})
    players = data.get("players", [])
    category = tournament.get("category", "Adults")

    return {
        "category": category,
        "players": [
            {
                "name": p.get("name", ""),
                "gender": p.get("gender", ""),
            }
            for p in players
        ],
    }


@router.post("/tournaments/{tid}/register")
async def register_player(
    tid: str,
    first_name: str = Form(...),
    last_name: str = Form(...),
    mobile: str = Form(...),
    wing: str = Form(...),
    flat_no: str = Form(...),
    birth_year: int = Form(...),
    gender: str = Form(""),
    expertise: str = Form(...),
    payment_confirmed: bool = Form(...),
    consent_accepted: bool = Form(False),
    photo: Optional[UploadFile] = File(None),
):
    """Register a new player for a tournament."""
    data = database.get_tournament_data(tid)
    if not data:
        raise HTTPException(404, "Tournament not found")

    tournament = data.get("tournament", {})
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

    # Upload photo to Cloudinary if provided
    photo_url = ""
    if photo and photo.filename:
        try:
            from cloudinary_service import upload_photo
            file_bytes = await photo.read()
            player_full_name = f"{first_name} {last_name}"
            photo_url = upload_photo(file_bytes, tid, player_full_name)
        except Exception as e:
            # Don't block registration if photo upload fails
            print(f"Photo upload failed: {e}")
            photo_url = ""

    # Build player name (already built above)

    # Create player data
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
        payment_confirmed=payment_confirmed,
        registered_at=datetime.now().isoformat(),
        consent_accepted=consent_accepted,
    )

    player_data = player.model_dump()
    database.add_player(tid, player_data)

    # ── Upsert into global player directory ──
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
                "consent_accepted": consent_accepted,
            },
            sport=tournament.get("sport", ""),
            tournament_id=tid,
            tournament_name=tournament.get("name", ""),
        )
    except Exception as e:
        print(f"Global player upsert failed (non-blocking): {e}")

    return {
        "message": "Registration successful",
        "player": {
            "name": full_name,
            "gender": player_gender,
        }
    }

