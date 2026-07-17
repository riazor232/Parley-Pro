import os
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from contextlib import asynccontextmanager

from . import models, schemas, services
from .database import engine, get_db

load_dotenv()

models.Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Al iniciar, buscar partidos del día con Gemini
    db = next(get_db())
    try:
        existing = services.get_fixtures(db)
        if not existing:
            services.gemini_discover_matches(db)
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

@app.get("/api/fixtures", response_model=list[schemas.Fixture])
def read_fixtures(skip: int = 0, limit: int = 200, db: Session = Depends(get_db)):
    fixtures = services.get_fixtures(db, skip=skip, limit=limit)
    return fixtures

@app.post("/api/fixtures/sync")
def sync_fixtures(db: Session = Depends(get_db)):
    services.sync_fixtures(db)
    return {"status": "success", "message": "Datos sincronizados correctamente"}

@app.get("/api/fixtures/search", response_model=list[schemas.Fixture])
def search_fixtures(query: str, db: Session = Depends(get_db)):
    return services.search_fixtures(db, query)

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

@app.get("/api/status")
def get_status():
    return {"data_source": services.data_source}

@app.post("/api/fixtures/gemini-discover")
def gemini_discover(db: Session = Depends(get_db)):
    result = services.gemini_discover_matches(db)
    return result

class AnalyzeRequest(schemas.BaseModel):
    match_name: str

class AnalyzeResponse(schemas.BaseModel):
    analysis: str

@app.post("/api/fixtures/analyze", response_model=AnalyzeResponse)
def analyze_fixture(request: AnalyzeRequest, db: Session = Depends(get_db)):
    analysis = services.analyze_fixture(db, request.match_name)
    return {"analysis": analysis}
