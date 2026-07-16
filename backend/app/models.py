from sqlalchemy import Column, Integer, String, Float
from .database import Base

class Fixture(Base):
    __tablename__ = "fixtures"

    id = Column(Integer, primary_key=True, index=True)
    match_name = Column(String, index=True)
    league = Column(String, index=True)
    date_time = Column(String)
    market = Column(String)
    odds = Column(Float)
    probability = Column(Float)
    risk_level = Column(String)

class SavedParley(Base):
    __tablename__ = "saved_parleys"

    id = Column(Integer, primary_key=True, index=True)
    stake = Column(Float)
    total_odds = Column(Float)
    potential_payout = Column(Float)
    created_at = Column(String)
    items = Column(String) # Serialized JSON string of items in the parley
