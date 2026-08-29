from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import datetime
import uuid

def generate_id():
    return str(uuid.uuid4())[:8]

class Tournament(BaseModel):
    id: str = Field(default_factory=generate_id)
    name: str
    year: int = Field(default_factory=lambda: datetime.now().year)
    sport: str = "Badminton"
    category: str = "Adults"  # "Adults" or "Kids"
    youtube_link: str = ""
    is_live: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    # Registration fields (all optional — admin can create tournament without these)
    start_date: str = ""          # DD-MM-YYYY
    end_date: str = ""            # DD-MM-YYYY
    registration_deadline: str = ""  # ISO datetime string
    entry_fees: int = 0           # Amount in rupees
    upi_payment_number: str = ""  # Phone number for UPI payment
    kids_age_limit: int = 12      # Only relevant for Kids category


class Player(BaseModel):
    name: str
    gender: str  # "Male" or "Female"

class TournamentPlayer(BaseModel):
    id: str = Field(default_factory=generate_id)
    tournament_id: str = ""
    name: str
    gender: str  # "Male" or "Female" for Adults, "Junior" or "Senior" for Kids
    # Extended registration fields (optional — only present for self-registered players)
    first_name: str = ""
    last_name: str = ""
    mobile: str = ""
    wing: str = ""
    flat_no: str = ""
    age: Optional[int] = None
    birth_year: Optional[int] = None
    expertise: str = ""           # "Beginner", "Intermediate", "Expert"
    photo_url: str = ""
    payment_confirmed: bool = False
    registered_at: str = ""
    consent_accepted: bool = False


class Team(BaseModel):
    id: str = Field(default_factory=generate_id)
    tournament_id: str = ""
    name: str
    owners: str = ""
    group: str = ""
    players_list: List[Player] = []

class Event(BaseModel):
    id: str = Field(default_factory=generate_id)
    tournament_id: str = ""
    name: str

class Fixture(BaseModel):
    id: str = Field(default_factory=generate_id)
    tournament_id: str = ""
    team1_id: str = ""
    team2_id: str = ""
    team1_placeholder: Optional[str] = None
    team2_placeholder: Optional[str] = None
    match_type: str = "league"
    status: str = "pending"  # pending, in_progress, completed
    date_time: Optional[str] = None
    is_frozen: bool = False

    @field_validator('team1_placeholder', 'team2_placeholder')
    @classmethod
    def validate_placeholder(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return v
        parts = v.split(':')
        if len(parts) != 2:
            raise ValueError("Placeholder must contain exactly one ':' character (e.g., 'A:1', 'match_id:winner')")
        suffix = parts[1]
        if suffix not in ("winner", "loser") and not suffix.isdigit():
            raise ValueError("Placeholder suffix after ':' must be 'winner', 'loser', or a number")
        return v



class SetScore(BaseModel):
    team1_score: int = 0
    team2_score: int = 0

class Scorecard(BaseModel):
    id: str = Field(default_factory=generate_id)
    fixture_id: str
    event_id: str
    team1_player1: str = ""
    team1_player2: str = ""
    team2_player1: str = ""
    team2_player2: str = ""
    num_sets: int = 1
    points_per_set: int = 21
    event_points: int = 0
    sets: List[SetScore] = []
    current_set: int = 0
    status: str = "pending"  # pending, in_progress, completed
    winner: str = ""  # team1 or team2 or ""

class ScorecardCreate(BaseModel):
    fixture_id: str
    event_id: str
    team1_player1: str = ""
    team1_player2: str = ""
    team2_player1: str = ""
    team2_player2: str = ""
    num_sets: int = 1
    points_per_set: int = 21
    event_points: int = 0
    status: str = "pending"
