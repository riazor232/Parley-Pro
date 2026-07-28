import os
from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from contextlib import asynccontextmanager
from typing import Optional

from . import models, schemas, services
from .database import engine, get_db

load_dotenv()

models.Base.metadata.create_all(bind=engine)

ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "juarez")

def verify_admin(x_admin_token: Optional[str] = Header(None)):
    if x_admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="Acceso de administrador denegado")

@asynccontextmanager
async def lifespan(app: FastAPI):
    db = next(get_db())
    try:
        services.ensure_admin_user(db)
        services.seed_default_quotas(db)
    except Exception as e:
        print(f"Error en lifespan startup: {e}")
    yield

app = FastAPI(title="Apuestas API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Fixtures ────────────────────────────────────────────────────────────────

@app.get("/api/fixtures", response_model=list[schemas.Fixture])
def read_fixtures(skip: int = 0, limit: int = 200, db: Session = Depends(get_db)):
    return services.get_fixtures(db, skip=skip, limit=limit)

@app.post("/api/fixtures/sync")
def sync_fixtures(db: Session = Depends(get_db)):
    services.sync_fixtures(db)
    return {"status": "success", "message": "Datos sincronizados correctamente"}

@app.get("/api/fixtures/search", response_model=list[schemas.Fixture])
def search_fixtures(query: str, db: Session = Depends(get_db)):
    return services.search_fixtures(db, query)

@app.post("/api/fixtures/gemini-discover")
def gemini_discover(db: Session = Depends(get_db)):
    return services.gemini_discover_matches(db)

# ─── Análisis Groq ───────────────────────────────────────────────────────────

class AnalyzeRequest(schemas.BaseModel):
    match_name: str
    username: str = "admin"

class AnalyzeResponse(schemas.BaseModel):
    analysis: str

@app.post("/api/fixtures/analyze", response_model=AnalyzeResponse)
def analyze_fixture(request: AnalyzeRequest, db: Session = Depends(get_db)):
    analysis = services.analyze_fixture(db, request.match_name, request.username)
    return {"analysis": analysis}

# ─── Parleys ─────────────────────────────────────────────────────────────────

@app.get("/api/parleys", response_model=list[schemas.SavedParley])
def read_parleys(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return services.get_saved_parleys(db, skip=skip, limit=limit)

@app.post("/api/parleys", response_model=schemas.SavedParley)
def create_parley(parley: schemas.SavedParleyCreate, db: Session = Depends(get_db)):
    return services.create_saved_parley(db, parley)

@app.delete("/api/parleys/{parley_id}")
def delete_parley(parley_id: int, db: Session = Depends(get_db)):
    success = services.delete_saved_parley(db, parley_id)
    if not success:
        raise HTTPException(status_code=404, detail="Parley not found")
    return {"status": "success", "message": "Parley deleted successfully"}

# ─── Saved Bets (Apuestas Guardadas y Eficiencia) ───────────────────────────

@app.get("/api/saved-bets", response_model=list[schemas.SavedBet])
def read_saved_bets(username: str = "admin", db: Session = Depends(get_db)):
    return services.get_saved_bets(db, username=username)

@app.post("/api/saved-bets", response_model=schemas.SavedBet)
def create_saved_bet(bet: schemas.SavedBetCreate, db: Session = Depends(get_db)):
    return services.create_saved_bet(db, bet)

@app.delete("/api/saved-bets/{bet_id}")
def delete_saved_bet(bet_id: int, db: Session = Depends(get_db)):
    success = services.delete_saved_bet(db, bet_id)
    if not success:
        raise HTTPException(status_code=404, detail="Bet not found")
    return {"status": "success", "message": "Apuesta eliminada"}

class EfficiencyRequest(schemas.BaseModel):
    final_result: str
    username: str = "admin"

@app.post("/api/saved-bets/{bet_id}/efficiency")
def analyze_efficiency(bet_id: int, req: EfficiencyRequest, db: Session = Depends(get_db)):
    result = services.analyze_bet_efficiency(db, bet_id, req.final_result, req.username)
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result

# ─── Status ───────────────────────────────────────────────────────────────────

@app.get("/api/status")
def get_status():
    return {"data_source": services.data_source}

# ─── Login (verificación backend) ────────────────────────────────────────────

class LoginRequest(schemas.BaseModel):
    username: str
    password: str

@app.post("/api/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = services.admin_verify_login(db, req.username, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    return {"username": user.username, "role": user.role}

# ─── Admin: Usuarios ─────────────────────────────────────────────────────────

@app.get("/api/admin/users", response_model=list[schemas.User])
def admin_list_users(db: Session = Depends(get_db), _=Depends(verify_admin)):
    return services.admin_get_users(db)

@app.post("/api/admin/users", response_model=schemas.User)
def admin_create_user(body: schemas.UserCreate, db: Session = Depends(get_db), _=Depends(verify_admin)):
    existing = db.query(models.User).filter_by(username=body.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="El usuario ya existe")
    return services.admin_create_user(db, body.username, body.password, body.role)

@app.put("/api/admin/users/{user_id}", response_model=schemas.User)
def admin_update_user(user_id: int, body: schemas.UserUpdate, db: Session = Depends(get_db), _=Depends(verify_admin)):
    updated = services.admin_update_user(db, user_id, body.model_dump(exclude_none=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return updated

@app.delete("/api/admin/users/{user_id}")
def admin_delete_user(user_id: int, db: Session = Depends(get_db), _=Depends(verify_admin)):
    ok = services.admin_delete_user(db, user_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"status": "success"}

# ─── Admin: Uso ───────────────────────────────────────────────────────────────

@app.get("/api/admin/usage", response_model=list[schemas.ApiUsageRecord])
def admin_get_usage(limit: int = 500, db: Session = Depends(get_db), _=Depends(verify_admin)):
    return services.admin_get_usage(db, limit)

@app.get("/api/admin/usage/summary")
def admin_usage_summary(db: Session = Depends(get_db), _=Depends(verify_admin)):
    return services.admin_get_usage_summary(db)

# ─── Admin: Cuotas ────────────────────────────────────────────────────────────

@app.get("/api/admin/quotas", response_model=list[schemas.ApiQuotaSchema])
def admin_get_quotas(db: Session = Depends(get_db), _=Depends(verify_admin)):
    return services.admin_get_quotas(db)

@app.put("/api/admin/quotas/{ai_service}", response_model=schemas.ApiQuotaSchema)
def admin_update_quota(ai_service: str, body: schemas.ApiQuotaUpdate,
                       db: Session = Depends(get_db), _=Depends(verify_admin)):
    updated = services.admin_update_quota(db, ai_service, body.model_dump(exclude_none=True))
    if not updated:
        raise HTTPException(status_code=404, detail=f"Cuota para '{ai_service}' no encontrada")
    return updated
