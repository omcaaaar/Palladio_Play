import os
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY", "")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "")

_configured = False

def _ensure_configured():
    global _configured
    if _configured:
        return
    if not all([CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET]):
        raise RuntimeError(
            "Cloudinary credentials not configured. "
            "Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to backend/.env"
        )
    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME,
        api_key=CLOUDINARY_API_KEY,
        api_secret=CLOUDINARY_API_SECRET,
        secure=True,
    )
    _configured = True


def upload_photo(file_bytes: bytes, tournament_id: str, player_name: str) -> str:
    """Upload a player photo to Cloudinary and return the secure URL.

    Images are auto-resized to 400x400, cropped to fill, with auto quality.
    Stored in folder: palladio_play/registrations/{tournament_id}/
    """
    _ensure_configured()

    # Clean the player name for use as public_id
    safe_name = player_name.replace(" ", "_").lower()

    result = cloudinary.uploader.upload(
        file_bytes,
        folder=f"palladio_play/registrations/{tournament_id}",
        public_id=safe_name,
        overwrite=True,
        transformation=[
            {"width": 400, "height": 400, "crop": "fill", "gravity": "face"},
            {"quality": "auto", "fetch_format": "auto"},
        ],
        resource_type="image",
    )

    return result.get("secure_url", "")
