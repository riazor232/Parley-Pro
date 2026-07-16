@echo off
echo Iniciando backend...
start cmd /k "cd backend && if not exist .venv (echo Creando entorno virtual... && python -m venv .venv && call .venv\Scripts\activate.bat && pip install -r requirements.txt) else (call .venv\Scripts\activate.bat) && uvicorn app.main:app --host 127.0.0.1 --port 8000"

echo Iniciando frontend...
start cmd /k "cd frontend && npm run dev"

echo Servicios iniciados. ParleyPro estara disponible en http://localhost:3000
