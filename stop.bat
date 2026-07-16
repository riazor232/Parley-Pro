@echo off
echo Deteniendo servidor Node (Frontend)...
taskkill /F /IM node.exe /T

echo Deteniendo servidor Python/Uvicorn (Backend)...
taskkill /F /IM python.exe /T

echo Servicios detenidos.
pause
