@echo off
setlocal
rem Inicia el stack backend en modo "produccion local" (Docker):
rem   db + redis + web (gunicorn) + worker (django-q2)
rem Usa docker-compose.prod.yml + docker-compose.local.yml (publica :8000 en web).
rem
rem Requisitos:
rem   - Docker Desktop corriendo
rem   - backend\.env.production con la configuracion de produccion/local-prod
rem   - DB_PASSWORD definido para la interpolacion del compose (Postgres)
rem
rem Uso:
rem   set DB_PASSWORD=tu_password_seguro && start-prod-local.bat
rem   start-prod-local.bat --build        (reconstruye imagenes)
rem   start-prod-local.bat --env-file .env.prod-local   (si usas archivo para DB_PASSWORD, etc.)

cd /d "%~dp0"

where docker >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Docker no esta en PATH. Instala/inicia Docker Desktop.
  exit /b 1
)

if not exist "backend\.env.production" (
  echo [ERROR] Falta backend\.env.production (requerido por docker-compose.prod.yml).
  echo         Crea el archivo con las variables de produccion/local-prod.
  exit /b 1
)

if "%DB_PASSWORD%"=="" (
  echo [AVISO] DB_PASSWORD no esta definido en el entorno.
  echo         El compose lo necesita para Postgres/DATABASE_URL.
  echo         Ejemplo: set DB_PASSWORD=tu_password_seguro ^&^& start-prod-local.bat
  echo.
)

echo.
echo  Iniciando stack prod-local: db, redis, web, worker
echo  API (web): http://localhost:8000  (overlay local)
echo  Worker: django-q2 / start_reminder_worker
echo.

docker compose -p focusia -f docker-compose.prod.yml -f docker-compose.local.yml %* up -d db redis web worker
if errorlevel 1 (
  echo [ERROR] docker compose fallo.
  exit /b 1
)

echo.
echo  Listo. Estado:
docker compose -p focusia -f docker-compose.prod.yml -f docker-compose.local.yml ps
echo.
echo  Logs web:    docker compose -p focusia -f docker-compose.prod.yml -f docker-compose.local.yml logs -f web
echo  Logs worker: docker compose -p focusia -f docker-compose.prod.yml -f docker-compose.local.yml logs -f worker
echo  Detener:     docker compose -p focusia -f docker-compose.prod.yml -f docker-compose.local.yml down
echo.
echo  Nota: el frontend NO lo levanta este script. En produccion real va en Netlify/Vercel.
echo        Para probar el front localmente contra esta API: configura VITE_API_URL=http://localhost:8000
echo        y ejecuta "npm run build && npm run preview" (o usa el modo dev con proxy).
