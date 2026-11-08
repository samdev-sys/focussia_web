@echo off
setlocal
set ROOT=%~dp0
set SCRIPTS=%ROOT%scripts\dev\

echo.
echo  =========================================
echo   Focusia - entorno de desarrollo
echo  =========================================
echo   API Django  :  http://localhost:8000
echo   Web (Vite)  :  http://localhost:3000
echo   Crons       :  ventana "Worker (django-q2)"
echo  =========================================
echo.
echo  Abre 3 ventanas: API, Worker y Web.
echo  Cierra cada ventana para detener ese recurso.
echo.

if not exist "%SCRIPTS%api.bat" (
  echo [ERROR] Faltan los scripts en "%SCRIPTS%".
  pause
  exit /b 1
)

if not exist "%ROOT%.venv\Scripts\python.exe" (
  echo [ERROR] No existe el venv: "%ROOT%.venv\Scripts\python.exe"
  echo         Crealo con: python -m venv ".venv"  y luego
  echo         .venv\Scripts\pip install -r backend\requirements.txt
  pause
  exit /b 1
)

start "Focusia - API (Django :8000)" cmd /k call "%SCRIPTS%api.bat"
start "Focusia - Worker (django-q2)" cmd /k call "%SCRIPTS%worker.bat"

rem Margen para que la API bindee el puerto antes de que Vite proxyee /api.
timeout /t 2 /nobreak >nul

start "Focusia - Web (Vite :3000)" cmd /k call "%SCRIPTS%web.bat"

echo  Listo. Esta ventana se cierra sola en 5 s.
timeout /t 5 >nul
