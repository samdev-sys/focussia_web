@echo off
rem Focusia · API Django en :8000
rem Variables de entorno ya cargadas por settings.py (backend/.env)
title Focusia - API (Django :8000)
cd /d "%~dp0..\..\backend" || goto :error

where "%~dp0..\..\.venv\Scripts\python.exe" >nul 2>&1
if errorlevel 1 (
  echo [ERROR] No existe el venv en la raiz del proyecto.
  echo   Crealo con: python -m venv "%~dp0..\..\.venv"
  pause
  exit /b 1
)

echo [API] Aplicando migraciones pendientes...
"%~dp0..\..\.venv\Scripts\python.exe" manage.py migrate

echo [API] Levantando Django en http://localhost:8000 ...
"%~dp0..\..\.venv\Scripts\python.exe" manage.py runserver
goto :eof

:error
echo [ERROR] No se pudo entrar al directorio backend.
pause
