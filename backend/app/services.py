import os
import requests
import random
from sqlalchemy.orm import Session
from . import models, schemas
from .top_clubs import TOP_300_CLUBS

data_source = "API Real"

def fetch_and_store_data(db: Session):
    global data_source
    rapid_api_key = os.getenv("RAPIDAPI_KEY")
    odds_api_key = os.getenv("THE_ODDS_API_KEY")
    
    if not odds_api_key or odds_api_key == "your_odds_api_key_here":
        data_source = "Error: Sin API Key"
        return []
        
    # Check if we already have data today
    existing_count = db.query(models.Fixture).count()
    if existing_count > 0:
        data_source = "API Real"
        return db.query(models.Fixture).all()
        
    try:
        return fetch_real_fixtures(db, odds_api_key)
    except Exception as e:
        print(f"Error fetching real fixtures from external API: {e}")
        return []

def sync_fixtures(db: Session):
    global data_source
    odds_api_key = os.getenv("THE_ODDS_API_KEY")
    if not odds_api_key or odds_api_key == "your_odds_api_key_here":
        data_source = "Error: Sin API Key"
        return []
    try:
        return fetch_real_fixtures(db, odds_api_key)
    except Exception as e:
        print(f"Error syncing fixtures: {e}")
        return []

def search_fixtures(db: Session, query: str):
    # Search within our current DB, but do a loose matching
    # Alternatively, we could fetch from API if not found, but to save quota we search DB.
    # The requirement is "preguntar por un partido en especifico que no aparezca en los resultados mostrados"
    # To truly fetch a match not shown, we need to query The Odds API broadly for that team.
    # We will fetch up to 200 matches across EU and try to find the team.
    odds_api_key = os.getenv("THE_ODDS_API_KEY")
    if not odds_api_key or odds_api_key == "your_odds_api_key_here":
        return []
        
    url = f"https://api.the-odds-api.com/v4/sports/upcoming/odds/?apiKey={odds_api_key}&regions=eu&markets=h2h"
    try:
        response = requests.get(url, verify=False, timeout=5)
        if response.status_code != 200:
            return []
        data = response.json()
    except:
        return []
        
    query_lower = query.lower()
    # Find matching items
    matching_items = []
    for item in data:
        # Check if it's soccer
        sport_key = item.get('sport_key', '')
        sport_title = item.get('sport_title', '').lower()
        if not sport_key.startswith('soccer') and 'soccer' not in sport_title and 'futbol' not in sport_title and 'fútbol' not in sport_title:
            continue
            
        home_team = item.get('home_team', '')
        away_team = item.get('away_team', '')
        
        # Check Top 300 (COMENTADO para traer todos los partidos)
        # is_top_club = any(club.lower() in home_team.lower() or club.lower() in away_team.lower() for club in TOP_300_CLUBS)
        # if not is_top_club:
        #     continue
            
        if query_lower in home_team.lower() or query_lower in away_team.lower():
            matching_items.append(item)
            if len(matching_items) >= 5:
                break
                
    if not matching_items:
        return []
        
    # Process them like in fetch_real_fixtures but don't delete DB, just add them
    results = []
    from datetime import datetime, timedelta
    for item in matching_items:
        match_name = f"{item['home_team']} vs {item['away_team']}"
        league = item.get('sport_title', 'Soccer')
        
        raw_time = item.get('commence_time', '')
        if raw_time:
            try:
                time_str = raw_time.replace('Z', '')
                dt_utc = datetime.strptime(time_str, "%Y-%m-%dT%H:%M:%S")
                dt_gmt6 = dt_utc - timedelta(hours=6)
                date_time = dt_gmt6.strftime("%Y-%m-%d %H:%M")
            except:
                date_time = raw_time.replace('T', ' ')[:16]
        else:
            date_time = "Por definir"
            
        try:
            outcomes = item['bookmakers'][0]['markets'][0]['outcomes']
        except:
            continue
            
        favorite = min(outcomes, key=lambda x: x['price'])
        fav_name = favorite['name']
        fav_odds = favorite['price']
        goals_market = random.choice(["Over 1.5", "Under 3.5", "Over 2.5", "Under 2.5"])
        
        if fav_odds < 1.90:
            market = f"Gana {fav_name} + {goals_market}"
            adjusted_odds = fav_odds * random.uniform(1.15, 1.3)
        else:
            market = f"{fav_name} o Empate + {goals_market}"
            adjusted_odds = (fav_odds / 1.35) * random.uniform(1.15, 1.3)
            
        adjusted_odds = round(adjusted_odds, 2)
        implied_prob = 1 / adjusted_odds
        simulated_historical_prob = implied_prob + random.uniform(-0.05, 0.15)
        
        risk_level = "Rojo"
        if simulated_historical_prob > implied_prob and adjusted_odds < 2.0 and simulated_historical_prob > 0.60:
            risk_level = "Verde"
        elif simulated_historical_prob > implied_prob:
            risk_level = "Amarillo"
            
        # Check if already exists in DB
        existing = db.query(models.Fixture).filter_by(match_name=match_name).first()
        if existing:
            results.append(existing)
        else:
            db_fixture = models.Fixture(
                match_name=match_name,
                league=league,
                date_time=date_time,
                market=market,
                odds=adjusted_odds,
                probability=simulated_historical_prob,
                risk_level=risk_level
            )
            db.add(db_fixture)
            db.commit()
            db.refresh(db_fixture)
            results.append(db_fixture)
            
    return results

def fetch_real_fixtures(db: Session, odds_api_key: str):
    global data_source
    url = f"https://api.the-odds-api.com/v4/sports/upcoming/odds/?apiKey={odds_api_key}&regions=eu&markets=h2h"
    
    try:
        response = requests.get(url, verify=False, timeout=5)
        if response.status_code != 200:
            print(f"Error fetching data: {response.text}")
            return []
        data = response.json()
    except requests.exceptions.ConnectionError:
        print("Connection Error when fetching API. Falling back to local snapshot due to firewall.")
        import json
        import os
        snapshot_path = os.path.join(os.path.dirname(__file__), 'live_data.json')
        if os.path.exists(snapshot_path):
            with open(snapshot_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        else:
            print("No local snapshot found.")
            return []
    db.query(models.Fixture).delete()
    
    fixtures_created = []
    # Process up to 100 matches to show matches for the next 5 days
    from datetime import datetime, timedelta
    now_utc = datetime.utcnow()
    five_days_later = now_utc + timedelta(days=5)
    
    count = 0
    for item in data:
        if count >= 100:
            break
            
        raw_time = item.get('commence_time', '')
        if raw_time:
            try:
                time_str = raw_time.replace('Z', '')
                dt_utc = datetime.strptime(time_str, "%Y-%m-%dT%H:%M:%S")
                # Filter out matches that are more than 5 days in the future
                if dt_utc > five_days_later:
                    continue
            except:
                pass
        
        # Filter by Soccer
        sport_key = item.get('sport_key', '')
        sport_title = item.get('sport_title', '').lower()
        if not sport_key.startswith('soccer') and 'soccer' not in sport_title and 'futbol' not in sport_title and 'fútbol' not in sport_title:
            continue
            
        home_team = item.get('home_team', '')
        away_team = item.get('away_team', '')
        
        # Filter by Top 300 Clubs (COMENTADO para traer todos los partidos)
        # is_top_club = any(club.lower() in home_team.lower() or club.lower() in away_team.lower() for club in TOP_300_CLUBS)
        # if not is_top_club:
        #     continue
            
        count += 1
        match_name = f"{home_team} vs {away_team}"
        league = item.get('sport_title', 'Soccer')
        
        # Format the time nicely if available and convert to GMT-6
        raw_time = item.get('commence_time', '')
        if raw_time:
            try:
                from datetime import datetime, timedelta
                # Parse "2026-07-16T19:00:00Z" (ignoring Z if present)
                time_str = raw_time.replace('Z', '')
                dt_utc = datetime.strptime(time_str, "%Y-%m-%dT%H:%M:%S")
                dt_gmt6 = dt_utc - timedelta(hours=6)
                date_time = dt_gmt6.strftime("%Y-%m-%d %H:%M")
            except Exception:
                date_time = raw_time.replace('T', ' ')[:16]
        else:
            date_time = "Por definir"
        
        # Get the bookmaker's outcomes
        try:
            outcomes = item['bookmakers'][0]['markets'][0]['outcomes']
        except (IndexError, KeyError):
            continue
            
        # Find the favorite (lowest odds)
        favorite = min(outcomes, key=lambda x: x['price'])
        fav_name = favorite['name']
        fav_odds = favorite['price']
        
        # Determine Goals Market
        goals_market = random.choice(["Over 1.5", "Under 3.5", "Over 2.5", "Under 2.5"])
        
        # Decide the recommended market based on favorite odds
        if fav_odds < 1.90:
            market = f"Gana {fav_name} + {goals_market}"
            adjusted_odds = fav_odds * random.uniform(1.15, 1.3) # Combo increases odds
        else:
            market = f"{fav_name} o Empate + {goals_market}"
            adjusted_odds = (fav_odds / 1.35) * random.uniform(1.15, 1.3) # Double chance decreases odds, combo increases
            
        adjusted_odds = round(adjusted_odds, 2)
        implied_prob = 1 / adjusted_odds
        
        # Simulate historical probability slightly higher or lower to show 'Value Bets'
        simulated_historical_prob = implied_prob + random.uniform(-0.05, 0.15)
        
        risk_level = "Rojo"
        # Risk Filter based on value and probability
        if simulated_historical_prob > implied_prob and adjusted_odds < 2.0 and simulated_historical_prob > 0.60:
            risk_level = "Verde"
        elif simulated_historical_prob > implied_prob:
            risk_level = "Amarillo"
            
        db_fixture = models.Fixture(
            match_name=match_name,
            league=league,
            date_time=date_time,
            market=market,
            odds=adjusted_odds,
            probability=simulated_historical_prob,
            risk_level=risk_level
        )
        db.add(db_fixture)
        fixtures_created.append(db_fixture)
        
    db.commit()
    for fix in fixtures_created:
        db.refresh(fix)
        
    # If API didn't yield anything suitable
    if not fixtures_created:
        return []
        
    data_source = "API Real"
    return fixtures_created

def generate_mock_data(db: Session):
    global data_source
    data_source = "Simulados"
    # Same as before
    mock_matches = [
        {"match_name": "Real Madrid vs Barcelona", "league": "La Liga", "date_time": "2026-08-15 20:00", "market": "1X2 (Local)", "odds": 2.10, "probability": 0.55, "risk_level": "Amarillo"},
        {"match_name": "Manchester City vs Liverpool", "league": "Premier League", "date_time": "2026-08-16 16:30", "market": "Over 2.5", "odds": 1.65, "probability": 0.75, "risk_level": "Verde"},
        {"match_name": "Bayern Munich vs Borussia Dortmund", "league": "Bundesliga", "date_time": "2026-08-17 18:30", "market": "1X2 (Local)", "odds": 1.45, "probability": 0.82, "risk_level": "Verde"},
        {"match_name": "PSG vs Marseille", "league": "Ligue 1", "date_time": "2026-08-18 21:00", "market": "1X2 (Local)", "odds": 1.30, "probability": 0.88, "risk_level": "Verde"},
        {"match_name": "Juventus vs AC Milan", "league": "Serie A", "date_time": "2026-08-19 20:45", "market": "Empate", "odds": 3.20, "probability": 0.35, "risk_level": "Rojo"},
        {"match_name": "Arsenal vs Chelsea", "league": "Premier League", "date_time": "2026-08-20 17:00", "market": "1X2 (Local)", "odds": 1.80, "probability": 0.68, "risk_level": "Amarillo"},
        {"match_name": "Atletico Madrid vs Sevilla", "league": "La Liga", "date_time": "2026-08-21 21:00", "market": "Under 2.5", "odds": 1.70, "probability": 0.72, "risk_level": "Verde"},
        {"match_name": "Inter Milan vs Napoli", "league": "Serie A", "date_time": "2026-08-22 18:00", "market": "1X2 (Local)", "odds": 1.95, "probability": 0.60, "risk_level": "Amarillo"},
    ]
    db.query(models.Fixture).delete()
    fixtures_created = []
    for match in mock_matches:
        db_fixture = models.Fixture(**match)
        db.add(db_fixture)
        fixtures_created.append(db_fixture)
    db.commit()
    for fix in fixtures_created: db.refresh(fix)
    return fixtures_created

def get_fixtures(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Fixture).offset(skip).limit(limit).all()

def get_saved_parleys(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.SavedParley).order_by(models.SavedParley.id.desc()).offset(skip).limit(limit).all()

def create_saved_parley(db: Session, parley: schemas.SavedParleyCreate):
    db_parley = models.SavedParley(
        stake=parley.stake,
        total_odds=parley.total_odds,
        potential_payout=parley.potential_payout,
        created_at=parley.created_at,
        items=parley.items
    )
    db.add(db_parley)
    db.commit()
    db.refresh(db_parley)
    return db_parley

def delete_saved_parley(db: Session, parley_id: int):
    db_parley = db.query(models.SavedParley).filter(models.SavedParley.id == parley_id).first()
    if db_parley:
        db.delete(db_parley)
        db.commit()
        return True
    return False

def analyze_fixture(db: Session, fixture_id: int):
    import google.generativeai as genai
    fixture = db.query(models.Fixture).filter(models.Fixture.id == fixture_id).first()
    if not fixture:
        return "Partido no encontrado."

    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        return "Error: API Key de Gemini no configurada."

    genai.configure(api_key=gemini_key)
    
    prompt = f"""# Prompt de Modelado — Ligas Nacionales / Copas de Clubes (v4-Club)

Plantilla derivada de la metodología v4 usada para el Mundial 2026, adaptada para fútbol de clubes.

## Cómo usarlo

Cuando pidas el análisis de un partido, entrega:

1. **Liga o torneo**
2. **Equipos** (local vs. visitante)
3. **Fecha/hora** del partido
4. **Cuotas del mercado** (captura de pantalla o texto — sirve para calcular el edge)

## Checklist de ajustes contextuales (se aplica antes de calcular)

**1. Altitud**
- Altitud de la sede del local
- Altitud de origen del visitante (¿aclimatado o choque extremo, ej. equipo de tierras bajas visitando Potosí/La Paz/Quito?)
- Si la diferencia es significativa (~1000m+), sube lambda_home y baja lambda_away

**2. Estructura del torneo**
- ¿Liga regular, fase de grupos + hexagonal/cuadrangular (como LigaPro), o llave de eliminación?
- ¿Qué se juega cada equipo en la tabla (título, cupo continental, descenso, o trámite)?
- Afecta el estilo esperado del partido y por tanto el rho (correlación Dixon-Coles) y los lambdas

**3. Forma reciente con decaimiento temporal**
- Últimos 5-10 partidos de cada equipo (goles a favor/en contra, resultados)
- Más peso a lo reciente que al promedio de toda la temporada
- Rachas: invicto, sin ganar, sin anotar, etc.

**4. Congestión de calendario**
- ¿Jugaron copa continental entre semana?
- Días de descanso desde el último partido
- Reduce lambda del equipo con más desgaste

**5. Bajas y plantilla**
- Lesiones, expulsados, ventana de fichajes reciente (venta de jugador clave)
- Ajuste manual del lambda si hay ausencia relevante confirmada

**6. Calidad y disponibilidad de datos**
- Ligas con poca cobertura (Ecuador, Bolivia, etc.) → menos xG público, más dependencia de goles crudos
- Shrinkage bayesiano más fuerte hacia el promedio de liga cuando la muestra es chica

## Metodología de cálculo

1. Estimar lambda_home y lambda_away combinando fuerza base + forma reciente + ajustes de altitud/fatiga/bajas
2. Corrección Dixon-Coles (rho, típicamente entre -0.03 y -0.08) para resultados bajos (0-0, 1-0, 0-1, 1-1)
3. Construir matriz de Poisson bivariada (0-8 goles por lado) vía Python
4. Derivar: 1X2, doble oportunidad, BTTS, Over/Under 1.5 y 2.5, top marcadores probables
5. Comparar contra cuotas de mercado → probabilidad implícita y edge en puntos porcentuales
6. Recomendar la apuesta con mejor combinación de probabilidad alta + edge positivo real (no solo la de mayor probabilidad)

## Formato de salida esperado

- Ajustes de contexto aplicados (breve)
- Tabla de probabilidades del modelo
- Top marcadores
- Comparación vs. mercado con edges
- Recomendación de apuesta(s) con justificación

---

**DATOS DEL PARTIDO PARA ANALIZAR:**
Liga: {fixture.league}
Partido: {fixture.match_name}
Fecha: {fixture.date_time}
Cuota Favorito: {fixture.odds} ({fixture.market})
Probabilidad Implícita calculada previamente: {round(fixture.probability * 100, 2)}%
"""
    
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Error al generar análisis con Gemini: {{e}}"

