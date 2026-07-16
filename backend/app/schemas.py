from pydantic import BaseModel

class FixtureBase(BaseModel):
    match_name: str
    league: str
    date_time: str
    market: str
    odds: float
    probability: float
    risk_level: str

class FixtureCreate(FixtureBase):
    pass

class Fixture(FixtureBase):
    id: int

    class Config:
        from_attributes = True

class SavedParleyBase(BaseModel):
    stake: float
    total_odds: float
    potential_payout: float
    created_at: str
    items: str  # JSON list of items

class SavedParleyCreate(SavedParleyBase):
    pass

class SavedParley(SavedParleyBase):
    id: int

    class Config:
        from_attributes = True
