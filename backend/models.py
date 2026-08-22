from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid

def generate_id():
    return str(uuid.uuid4())[:8]

class Tournament(BaseModel):
    id: str = Field(default_factory=generate_id)
    name: str
    sport: str = "Badminton"
    youtube_link: str = ""
    is_live: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class Player(BaseModel):
    name: str
    gender: str  # "Male" or "Female"

class TournamentPlayer(BaseModel):
    id: str = Field(default_factory=generate_id)
    tournament_id: str = ""
    name: str
    gender: str  # "Male" or "Female"


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
