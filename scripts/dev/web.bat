@echo off
rem Focusia · Frontend Vite en :3000 (proxy /api y /media hacia :8000)
title Focusia - Web (Vite :3000)
cd /d "%~dp0..\.." || goto :error

where pnpm >nul 2>&1
if %errorlevel%==0 (
  echo [WEB] Levantando Vite con pnpm en http://localhost:3000 ...
  pnpm dev
) else (
  echo [WEB] pnpm no encontrado; usando npm en http://localhost:3000 ...
  npm run dev
)
goto :eof

:error
echo [ERROR] No se pudo entrar al directorio del proyecto.
pause
