from pydantic import BaseModel
from typing import Optional

# ─── Fixture ────────────────────────────────────────────────────────────────
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

# ─── SavedParley ─────────────────────────────────────────────────────────────
class SavedParleyBase(BaseModel):
    stake: float
    total_odds: float
    potential_payout: float
    created_at: str
    items: str

class SavedParleyCreate(SavedParleyBase):
    pass

class SavedParley(SavedParleyBase):
    id: int
    class Config:
        from_attributes = True

# ─── User ────────────────────────────────────────────────────────────────────
class UserBase(BaseModel):
    username: str
    role: str = "user"
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class User(UserBase):
    id: int
    created_at: str
    class Config:
        from_attributes = True

# ─── ApiUsage ────────────────────────────────────────────────────────────────
class ApiUsageRecord(BaseModel):
    id: int
    username: str
    ai_service: str
    action: str
    tokens_used: int
    match_name: Optional[str] = None
    created_at: str
    class Config:
        from_attributes = True

# ─── ApiQuota ────────────────────────────────────────────────────────────────
class ApiQuotaSchema(BaseModel):
    id: int
    ai_service: str
    plan_name: str
    total_tokens: int
    monthly_cost_usd: float
    renewal_date: str
    class Config:
        from_attributes = True

class ApiQuotaUpdate(BaseModel):
    plan_name: Optional[str] = None
    total_tokens: Optional[int] = None
    monthly_cost_usd: Optional[float] = None
    renewal_date: Optional[str] = None
