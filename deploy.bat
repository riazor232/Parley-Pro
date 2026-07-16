@echo off
echo Preparando despliegue de ParleyPro...

echo Instalando dependencias de frontend...
cd frontend
call npm install
cd ..

echo Configurando entorno virtual de backend...
cd backend
python -m venv .venv
call .venv\Scripts\activate.bat
pip install -r requirements.txt
cd ..

echo Despliegue preparado exitosamente.
pause
