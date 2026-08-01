import os
import requests
import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from . import models, schemas
from .top_clubs import TOP_300_CLUBS

data_source = "API Real"

# ─── Helpers de uso y cuotas ────────────────────────────────────────────────

def log_usage(db: Session, username: str, ai_service: str, action: str,
              tokens_used: int, match_name: str = None):
    """Guarda un registro de consumo de tokens en la BD."""
    try:
        record = models.ApiUsage(
            username=username,
            ai_service=ai_service,
            action=action,
            tokens_used=tokens_used,
            match_name=match_name,
            created_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        )
        db.add(record)
        db.commit()
    except Exception as e:
        print(f"[log_usage] Error: {e}")
        db.rollback()


def seed_default_quotas(db: Session):
    """Inserta cuotas por defecto si la tabla está vacía."""
    if db.query(models.ApiQuota).count() > 0:
        return
    next_month_1 = (datetime.utcnow().replace(day=1) + timedelta(days=32)).replace(day=1)
    renewal = next_month_1.strftime("%Y-%m-%d")
    defaults = [
        models.ApiQuota(
            ai_service="groq",
            plan_name="Free Tier",
            total_tokens=500_000,
            monthly_cost_usd=0.0,
            renewal_date=renewal,
        ),
        models.ApiQuota(
            ai_service="gemini",
            plan_name="Free Tier",
            total_tokens=1_000_000,
            monthly_cost_usd=0.0,
            renewal_date=renewal,
        ),
    ]
    for q in defaults:
        db.add(q)
    db.commit()


def ensure_admin_user(db: Session):
    """Crea el usuario admin por defecto si no existe."""
    existing = db.query(models.User).filter_by(username="admin").first()
    if not existing:
        now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        db.add(models.User(username="admin", password="juarez", role="admin",
                           is_active=True, created_at=now))
        db.commit()

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
        all_fixtures = fetch_real_fixtures(db, odds_api_key)
        return gemini_filter_fixtures(all_fixtures)
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
        all_fixtures = fetch_real_fixtures(db, odds_api_key)
        return gemini_filter_fixtures(all_fixtures)
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
    from datetime import datetime, timedelta, timezone
    now_utc = datetime.now(timezone.utc)
    # Only show matches for today and tomorrow (2 days window)
    two_days_later = now_utc + timedelta(days=2)
    
    count = 0
    for item in data:
        if count >= 100:
            break
            
        raw_time = item.get('commence_time', '')
        if raw_time:
            try:
                time_str = raw_time.replace('Z', '+00:00')
                dt_utc = datetime.fromisoformat(time_str)
                # Filter: only today and tomorrow
                if dt_utc > two_days_later or dt_utc < now_utc - timedelta(hours=1):
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

def gemini_discover_matches(db: Session) -> dict:
    """
    Usa TheSportsDB para obtener partidos reales de hoy y mañana,
    luego usa Groq para analizar corners y tarjetas de cada partido.
    """
    from dotenv import load_dotenv
    import json, requests, re
    from datetime import datetime, timedelta
    load_dotenv()

    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        return {"status": "error", "message": "GROQ_API_KEY no configurada.", "count": 0}

    try:
        today = datetime.now()
        tomorrow = today + timedelta(days=1)
        today_str = today.strftime("%Y-%m-%d")
        tomorrow_str = tomorrow.strftime("%Y-%m-%d")

        # ── 1. Obtener partidos reales desde TheSportsDB ──────────────────────
        raw_events = []

        for date_str in [today_str, tomorrow_str]:
            try:
                url = f"https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d={date_str}&s=Soccer"
                r = requests.get(url, timeout=10)
                if r.status_code == 200:
                    data = r.json()
                    events = data.get("events") or []
                    raw_events.extend(events)
            except Exception:
                pass

        # Ampliar con ligas activas más importantes
        MAJOR_LEAGUES = {
            "MLS": 4346,
            "Liga MX": 4350,
            "Brazilian Serie A": 4351,
            "Copa Libertadores": 4480,
            "Eredivisie": 4337,
            "Liga Portugal": 4344,
            "Scottish Premiership": 4330,
            "USL Championship": 4397,
            "Copa Sudamericana": 4481,
            "Argentine Primera": 4406,
            "Colombian Primera": 4461,
        }
        seen_ids = {e.get("idEvent") for e in raw_events if e.get("idEvent")}
        for league_name, league_id in MAJOR_LEAGUES.items():
            try:
                url2 = f"https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id={league_id}"
                r2 = requests.get(url2, timeout=8)
                if r2.status_code == 200:
                    data2 = r2.json()
                    for ev in (data2.get("events") or []):
                        ev_date = ev.get("dateEvent", "")
                        ev_id = ev.get("idEvent")
                        if ev_date in [today_str, tomorrow_str] and ev_id not in seen_ids:
                            raw_events.append(ev)
                            seen_ids.add(ev_id)
            except Exception:
                pass

        if not raw_events:
            return {"status": "error", "message": "No se encontraron partidos en TheSportsDB para hoy o mañana.", "count": 0}

        # ── 2. Construir lista de partidos ────────────────────────────────────
        def safe_float(val, default):
            try:
                return float(val) if val is not None else default
            except (ValueError, TypeError):
                return default

        matches_list = []
        for ev in raw_events[:40]:
            home = ev.get("strHomeTeam", "")
            away = ev.get("strAwayTeam", "")
            league = ev.get("strLeague", "Soccer")
            ev_date = ev.get("dateEvent", today_str)
            ev_time = ev.get("strTime") or ev.get("strTimeLocal") or "20:00:00"
            ev_time_fmt = str(ev_time)[:5] if ev_time else "20:00"
            if home and away:
                matches_list.append({
                    "match_name": f"{home} vs {away}",
                    "league": league,
                    "date_time": f"{ev_date} {ev_time_fmt}",
                })

        if not matches_list:
            return {"status": "error", "message": "No se encontraron partidos válidos.", "count": 0}

        # ── 3. Analizar con Groq en batch ─────────────────────────────────────
        matches_json_str = json.dumps(matches_list, ensure_ascii=False)
        groq_prompt = (
            "Eres un analista estadístico de fútbol experto en tiros de esquina (corners) y tarjetas. "
            "Para cada partido de la lista, estima basándote en el historial de los equipos:\n"
            "- recommended_market: mercado sugerido (ej: 'Más de 9.5 Córners', 'Ambos equipos +3 Tarjetas')\n"
            "- recommended_odds: cuota estimada entre 1.50 y 3.50\n"
            "- estimated_prob: probabilidad entre 0.40 y 0.90\n"
            "- risk_level: 'Verde' (prob>0.65), 'Amarillo' (0.50-0.65), 'Rojo' (<0.50)\n\n"
            "Partidos:\n" + matches_json_str +
            '\n\nResponde SOLO con JSON:\n{"results": [{"match_name": "...", "recommended_market": "...", "recommended_odds": 1.85, "estimated_prob": 0.70, "risk_level": "Verde"}]}'
        )

        try:
            from groq import Groq as GroqClient
            groq_client = GroqClient(api_key=groq_key)
            groq_response = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": groq_prompt}],
                temperature=0.3,
                max_tokens=4000,
            )
            raw_groq = groq_response.choices[0].message.content.strip()
        except Exception as e:
            return {"status": "error", "message": f"Error en Groq: {e}", "count": 0}

        # Extraer JSON de Groq
        groq_json_str = raw_groq
        if "```" in groq_json_str:
            mc = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', groq_json_str, re.IGNORECASE)
            if mc:
                groq_json_str = mc.group(1).strip()
        if not (groq_json_str.startswith("{") and groq_json_str.endswith("}")):
            mo = re.search(r'\{[\s\S]*\}', groq_json_str)
            if mo:
                groq_json_str = mo.group(0).strip()

        try:
            groq_data = json.loads(groq_json_str)
            results_list = groq_data.get("results", [])
        except Exception:
            results_list = []

        results_map = {r.get("match_name", ""): r for r in results_list}

        # ── 4. Guardar en base de datos ───────────────────────────────────────
        db.query(models.Fixture).delete()
        db.commit()

        fixtures_created = []
        for m in matches_list:
            match_name = m["match_name"]
            analysis = results_map.get(match_name, {})
            prob = round(safe_float(analysis.get("estimated_prob"), 0.55), 4)
            raw_risk = str(analysis.get("risk_level", "")).strip().capitalize() if analysis.get("risk_level") else ""

            if prob > 0.65:
                risk_level = "Verde"
            elif prob >= 0.50:
                risk_level = "Amarillo"
            else:
                risk_level = "Rojo"
            if raw_risk in ["Verde", "Amarillo", "Rojo"]:
                risk_level = raw_risk

            db_fixture = models.Fixture(
                match_name=match_name,
                league=m["league"],
                date_time=m["date_time"],
                market=analysis.get("recommended_market") or "Córners / Tarjetas",
                odds=round(safe_float(analysis.get("recommended_odds"), 1.85), 2),
                probability=prob,
                risk_level=risk_level,
            )
            db.add(db_fixture)
            fixtures_created.append(db_fixture)

        db.commit()
        for fix in fixtures_created:
            db.refresh(fix)

        global data_source
        data_source = "TheSportsDB + Groq"
        log_usage(db, username="sistema", ai_service="groq", action="discover",
                  tokens_used=len(groq_prompt) // 4)

        return {"status": "success", "message": f"Se encontraron {len(fixtures_created)} partidos reales.", "count": len(fixtures_created)}

    except Exception as e:
        return {"status": "error", "message": f"Error al obtener partidos: {e}", "count": 0}

def gemini_filter_fixtures(fixtures: list) -> list:
    """
    Usa Gemini para seleccionar los mejores partidos del día actual y el siguiente.
    Recibe una lista de fixtures ya almacenados y devuelve los IDs de los más relevantes.
    Si Gemini no está disponible, devuelve todos los fixtures sin filtrar.
    """
    from google import genai
    from dotenv import load_dotenv
    load_dotenv()

    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key or not fixtures:
        return fixtures

    try:
        client_filter = genai.Client(api_key=gemini_key)

        fixtures_summary = "\n".join([
            f"ID:{f.id} | {f.match_name} | Liga: {f.league} | Fecha: {f.date_time} | Mercado: {f.market} | Cuota: {f.odds} | Prob: {round(f.probability * 100, 1)}% | Riesgo: {f.risk_level}"
            for f in fixtures
        ])

        prompt = f"""Eres un experto en análisis de apuestas deportivas de fútbol.
A continuación tienes una lista de partidos de fútbol de hoy y mañana con sus cuotas y probabilidades.
Tu tarea es seleccionar los mejores partidos para apostar, priorizando:
1. Partidos con riesgo "Verde" y probabilidad alta (>65%)
2. Partidos de ligas reconocidas 
3. Cuotas con valor (edge positivo implícito)
4. Diversidad de ligas (no repetir la misma liga más de 2 veces)

Lista de partidos disponibles:
{fixtures_summary}

Responde ÚNICAMENTE con los IDs de los partidos seleccionados separados por comas, sin texto adicional.
Selecciona entre 5 y 15 partidos máximo. Ejemplo de respuesta: 3,7,12,18,22
"""
        response = client_filter.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        raw = response.text.strip()

        # Parse comma-separated IDs
        selected_ids = set()
        for part in raw.split(','):
            part = part.strip().replace('ID:', '').strip()
            if part.isdigit():
                selected_ids.add(int(part))

        if selected_ids:
            filtered = [f for f in fixtures if f.id in selected_ids]
            print(f"Gemini seleccionó {len(filtered)} partidos de {len(fixtures)} disponibles")
            return filtered if filtered else fixtures
        return fixtures
    except Exception as e:
        print(f"Gemini filter error: {e}")
        return fixtures

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

# ─── Saved Bets (Apuestas Guardadas & Eficiencia) ───────────────────────────

def create_saved_bet(db: Session, bet: schemas.SavedBetCreate):
    db_bet = models.SavedBet(
        username=bet.username,
        match_name=bet.match_name,
        league=bet.league,
        date_time=bet.date_time,
        selected_market=bet.selected_market,
        odds=bet.odds,
        prompt_analysis=bet.prompt_analysis,
        status="Pendiente",
        prediction_result=bet.prediction_result or "Pendiente",
        created_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    )
    db.add(db_bet)
    db.commit()
    db.refresh(db_bet)
    return db_bet

def get_saved_bets(db: Session, username: str = "admin"):
    return db.query(models.SavedBet).filter(models.SavedBet.username == username).order_by(models.SavedBet.id.desc()).all()

def delete_saved_bet(db: Session, bet_id: int):
    db_bet = db.query(models.SavedBet).filter(models.SavedBet.id == bet_id).first()
    if db_bet:
        db.delete(db_bet)
        db.commit()
        return True
    return False

def analyze_bet_efficiency(db: Session, bet_id: int, final_result: str, username: str = "admin"):
    import groq
    from dotenv import load_dotenv
    load_dotenv()

    bet = db.query(models.SavedBet).filter(models.SavedBet.id == bet_id).first()
    if not bet:
        return {"status": "error", "message": "Apuesta guardada no encontrada."}

    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        return {"status": "error", "message": "API Key de Groq no configurada."}

    client = groq.Client(api_key=groq_key)

    prompt = f"""Actúa como un evaluador y auditor de inteligencia deportiva y pronósticos de apuestas.
Tu objetivo es evaluar la EFICIENCIA y PRECISIÓN de los pronósticos realizados previamente por nuestro modelo para el siguiente partido.

PARTIDO: {bet.match_name}
LIGA: {bet.league}
APUESTA REALIZADA: {bet.selected_market} @ {bet.odds}
RESULTADO FINAL DEL PARTIDO: {final_result}

ANÁLISIS Y PRONÓSTICOS PREVIOS DADOS POR EL PROMPT:
{bet.prompt_analysis or "No se guardó el análisis textual previo."}

Por favor elabora una AUDITORÍA DE EFICIENCIA detallada y profesional con la siguiente estructura:

1. 🎯 VEREDICTO DE LA APUESTA: (ACERTADA / FALLADA / NULA)
2. ⚽ ANÁLISIS DEL RESULTADO vs PRONÓSTICO: Explica cómo se desarrolló el resultado respecto a la predicción del modelo.
3. 📊 EVALUACIÓN DE EFICIENCIA DE LAS 6 RECOMENDACIONES:
   - Apuestas recomendadas: (Evalúa si acertaron)
   - Apuestas a evitar: (Evalúa si fue correcto evitarlas)
   - Pick más seguro: (¿Se cumplió?)
   - Pick con mejor valor: (¿Se cumplió?)
4. 🧠 APRENDIZAJES Y RETROALIMENTACIÓN: ¿Qué aspectos tácticos o contextuales fallaron o acertaron? ¿Qué debe ajustar el modelo para futuros partidos de estos equipos?
5. 📈 CALIFICACIÓN DE PRECISIÓN (1 al 10) Y CONCLUSIÓN FINAL.
"""

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=2000,
        )
        analysis_text = completion.choices[0].message.content
        total_tokens = getattr(completion.usage, "total_tokens", 0) or 0
        log_usage(db, username=username, ai_service="groq", action="analyze_efficiency",
                  tokens_used=total_tokens, match_name=bet.match_name)

        # Parsear si el veredicto fue Acertada, Fallada o Nula
        analysis_upper = analysis_text.upper()
        if "ACERTADA" in analysis_upper or "VEREDICTO: ACERTADA" in analysis_upper or "VEREDICTO DE LA APUESTA: ACERTADA" in analysis_upper:
            bet.prediction_result = "Acertada"
        elif "FALLADA" in analysis_upper or "VEREDICTO: FALLADA" in analysis_upper or "VEREDICTO DE LA APUESTA: FALLADA" in analysis_upper:
            bet.prediction_result = "Fallada"
        elif "NULA" in analysis_upper or "VEREDICTO: NULA" in analysis_upper:
            bet.prediction_result = "Nula"
        else:
            bet.prediction_result = "Acertada" if "ÉXITO" in analysis_upper or "GANADA" in analysis_upper else "Fallada"

        bet.status = "Finalizado"
        bet.final_result = final_result
        bet.efficiency_analysis = analysis_text
        bet.analyzed_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        db.commit()
        db.refresh(bet)

        return {"status": "success", "analysis": analysis_text, "bet": bet}
    except Exception as e:
        return {"status": "error", "message": f"Error al generar análisis de eficiencia: {e}"}

def analyze_fixture(db: Session, match_name: str, username: str = "admin"):
    import groq
    from dotenv import load_dotenv
    load_dotenv()

    # Buscar por match_name de forma flexible (insensible a mayúsculas/minúsculas y espacios)
    clean_name = match_name.strip()
    fixture = db.query(models.Fixture).filter(models.Fixture.match_name.ilike(clean_name)).first()
    
    if not fixture:
        # Fallback de seguridad: Buscar por subcadena si el nombre varía levemente
        fixture = db.query(models.Fixture).filter(models.Fixture.match_name.contains(clean_name)).first()

    # Si aún no existe en DB (ej: partido buscado dinámicamente o recién introducido), creamos un objeto genérico para permitir el análisis
    if not fixture:
        class DummyFixture:
            match_name = clean_name
            league = "Fútbol"
            date_time = "Por definir"
            market = "Ganador del partido / Doble oportunidad"
            odds = 1.85
            probability = 0.55
        fixture = DummyFixture()

    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        return "Error: API Key de Groq no configurada. Por favor reinicia el backend."

    client = groq.Client(api_key=groq_key)

    local = fixture.match_name.split(' vs ')[0].strip() if ' vs ' in fixture.match_name else fixture.match_name
    visitante = fixture.match_name.split(' vs ')[1].strip() if ' vs ' in fixture.match_name else ''

    prompt = f"""Actúa como un analista deportivo profesional especializado EXCLUSIVAMENTE en TIROS DE ESQUINA (Corners) y TARJETAS (Amarillas y Rojas) en fútbol profesional.

PARTIDO: {fixture.match_name}
LIGA: {fixture.league}
FECHA: {fixture.date_time}
MERCADO SUGERIDO: {fixture.market} @ {fixture.odds}

IMPORTANTE: Céntrate NÚNICA Y EXCLUSIVAMENTE en analizar TIROS DE ESQUINA Y TARJETAS. Ignora pronósticos de ganador del partido (1X2), ambos anotan o goles totales a menos que influyan en tarjetas/corners.

Tu análisis debe estructurarse obligatoriamente con los siguientes apartados:

1. 🚩 ANÁLISIS DE TIROS DE ESQUINA (CÓRNERS):
   - Promedio de córners a favor y en contra de {local} (como local) y {visitante} (como visitante).
   - Promedio total combinado de córners esperados en el partido.
   - Tendencia en primer tiempo vs segundo tiempo.
   - Historial H2H reciente en cantidad de saques de esquina.
   - Líneas de apuestas recomendadas (ej: Over/Under 8.5, 9.5, 10.5 córners).

2. 🟨 ANÁLISIS DE TARJETAS Y AGRESIVIDAD:
   - Promedio de tarjetas amarillas y rojas recibidas por {local} y {visitante}.
   - Índice de agresividad, faltas cometidas y rivalidad del encuentro (derbi, partido tenso, etc.).
   - Perfil del árbitro asignado o nivel de rigurosidad del arbitraje en esta liga.
   - Líneas de apuestas recomendadas (ej: Over/Under 4.5 tarjetas totales, equipo con más tarjetas).

3. 🛡️ EVALUACIÓN Y JUSTIFICACIÓN DEL NIVEL DE RIESGO:
   - Indica de forma clara si este partido representa RIESGO BAJO (Verde), RIESGO MEDIO (Amarillo) o RIESGO ALTO (Rojo).
   - Justifica detalladamente el por qué del nivel de riesgo basado en la constancia o volatilidad de los datos de córners y tarjetas.

4. 💡 PICKS RECOMENDADOS Y A EVITAR (EXCLUSIVO CÓRNERS Y TARJETAS):
   1. Pick de Córners más seguro (Riesgo Bajo)
   2. Pick de Tarjetas más seguro (Riesgo Bajo)
   3. Pick de Córners/Tarjetas con mejor valor (Riesgo Medio)
   4. Apuestas de Córners/Tarjetas que DEBEN EVITARSE por alto riesgo
   5. Conclusión final resumida de córners y tarjetas.
"""

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            max_tokens=2500,
        )
        # Capturar tokens reales reportados por Groq
        total_tokens = getattr(completion.usage, "total_tokens", 0) or 0
        log_usage(db, username=username, ai_service="groq", action="analyze",
                  tokens_used=total_tokens, match_name=match_name)
        return completion.choices[0].message.content
    except Exception as e:
        return f"Error al generar análisis con Groq: {e}"


# ─── Admin: Usuarios ────────────────────────────────────────────────────────

def admin_get_users(db: Session):
    return db.query(models.User).order_by(models.User.created_at.desc()).all()


def admin_create_user(db: Session, username: str, password: str, role: str = "user") -> models.User:
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    user = models.User(username=username, password=password, role=role,
                       is_active=True, created_at=now)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def admin_update_user(db: Session, user_id: int, data: dict) -> models.User:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return None
    for k, v in data.items():
        if v is not None:
            setattr(user, k, v)
    db.commit()
    db.refresh(user)
    return user


def admin_delete_user(db: Session, user_id: int) -> bool:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return False
    db.delete(user)
    db.commit()
    return True


# ─── Admin: Uso y Cuotas ────────────────────────────────────────────────────

def admin_get_usage(db: Session, limit: int = 500):
    return (db.query(models.ApiUsage)
              .order_by(models.ApiUsage.created_at.desc())
              .limit(limit).all())


def admin_get_quotas(db: Session):
    seed_default_quotas(db)
    return db.query(models.ApiQuota).all()


def admin_update_quota(db: Session, ai_service: str, data: dict) -> models.ApiQuota:
    quota = db.query(models.ApiQuota).filter(models.ApiQuota.ai_service == ai_service).first()
    if not quota:
        return None
    for k, v in data.items():
        if v is not None:
            setattr(quota, k, v)
    db.commit()
    db.refresh(quota)
    return quota


def admin_get_usage_summary(db: Session) -> dict:
    """Resumen de tokens consumidos por usuario y por servicio."""
    records = db.query(models.ApiUsage).all()
    summary = {}
    for r in records:
        key = r.username
        if key not in summary:
            summary[key] = {"groq": 0, "gemini": 0, "total": 0}
        summary[key][r.ai_service] = summary[key].get(r.ai_service, 0) + r.tokens_used
        summary[key]["total"] += r.tokens_used
    return summary


def admin_verify_login(db: Session, username: str, password: str):
    """Verifica credenciales de usuario en la BD."""
    return db.query(models.User).filter(
        models.User.username == username,
        models.User.password == password,
        models.User.is_active == True
    ).first()
