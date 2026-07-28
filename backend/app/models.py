from sqlalchemy import Column, Integer, String, Float, Boolean
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
    items = Column(String)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)
    role = Column(String, default="user")   # "admin" | "user"
    is_active = Column(Boolean, default=True)
    created_at = Column(String)

class ApiUsage(Base):
    __tablename__ = "api_usage"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, index=True)
    ai_service = Column(String)          # "groq" | "gemini"
    action = Column(String)              # "analyze" | "discover"
    tokens_used = Column(Integer, default=0)
    match_name = Column(String, nullable=True)
    created_at = Column(String)

class ApiQuota(Base):
    __tablename__ = "api_quota"

    id = Column(Integer, primary_key=True, index=True)
    ai_service = Column(String, unique=True)   # "groq" | "gemini"
    plan_name = Column(String)
    total_tokens = Column(Integer)
    monthly_cost_usd = Column(Float, default=0.0)
    renewal_date = Column(String)              # "YYYY-MM-DD"
