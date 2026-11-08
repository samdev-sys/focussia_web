# Entorno local (Windows)

Guía práctica para levantar Focussia en tu máquina **sin repetir los problemas que
ya hemos diagnosticado**. Todo lo de aquí está probado en este repo.

> **TL;DR** — dos terminales:
>
> ```powershell
> # terminal 1 · backend
> cd backend
> ..\.venv\Scripts\python.exe manage.py migrate
> ..\.venv\Scripts\python.exe manage.py start_reminder_worker
>
> # terminal 2 · frontend
> npm run dev
> ```
>
> Y abrir <http://localhost:3000>. No hace falta "activar" el venv (ver §3).

---

## 1. Requisitos

| Herramienta | Versión en esta máquina | Nota |
|---|---|---|
| Python | **3.14.0** (`.venv`) | La imagen de Docker usa **3.11-slim**: es una divergencia real (§9) |
| Node.js | **24.11.1** | Netlify compila con **22** |
| Docker Desktop | opcional | Solo para Postgres local / probar la imagen |

El venv ya existe en `.venv/`. Si hay que recrearlo:

```powershell
cd backend
python -m venv ..\.venv
..\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

> ⚠️ `requirements.txt` está **solo en `backend/`**. El de la raíz se eliminó
> porque tenía un stack distinto (Celery, sin `croniter` ni `groq`) y era la
> causa de que el venv quedara incompleto.

## 2. Variables de entorno

| Archivo | Para qué | ¿Va a git? |
|---|---|---|
| `.env` (raíz) | `VITE_API_URL`, claves de OAuth del front | no |
| `backend/.env` | Desarrollo: `SECRET_KEY`, `DEBUG=True`, `DATABASE_URL` (SQLite), `GROQ_API_KEY`, VAPID | no |
| `backend/.env.production` | Producción: Postgres, `DEBUG=False`, CORS, VAPID, WhatsApp | no |

Reglas que impone el código (`backend/focusia_api/settings.py`):

- `SECRET_KEY` es **obligatoria**: sin ella el arranque falla.
- Con `DEBUG=False`, un `SECRET_KEY` de ejemplo (`CHANGE_THIS…`, `django-insecure…`)
  **aborta el arranque** a propósito.
- `DJANGO_SKIP_DOTENV=1` desactiva la lectura de `.env`. Lo fijan los compose de
  staging/producción para que un contenedor **nunca** caiga al `.env` de
  desarrollo (los secretos llegan por `env_file`).

## 3. Activar el venv (y por qué puede fallar)

En esta máquina `Set-ExecutionPolicy` **no** sirve: aunque la política efectiva es
`RemoteSigned`, `Activate.ps1` se rechaza con *"no está firmado digitalmente"*.
No es WDAC ni AppLocker (ambos desactivados) ni la marca de Internet
(`Unblock-File` no lo arregla).

Cuatro formas de trabajar, todas verificadas:

**A. No activar nada** (recomendada). Usa el intérprete directamente:

```powershell
..\.venv\Scripts\python.exe manage.py check
```

**B. Bypass solo para esa sesión** (no toca la máquina):

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
& ".\.venv\Scripts\Activate.ps1"
```

**C. Variables de entorno a mano** (equivale a activar, sin ejecutar scripts):

```powershell
$env:VIRTUAL_ENV = "$PWD\.venv"
$env:PATH = "$env:VIRTUAL_ENV\Scripts;$env:PATH"
```

**D. `cmd`** (los `.bat` no pasan por la política de PowerShell):

```powershell
cmd /c "call .venv\Scripts\activate.bat && python --version"
```

## 4. Base de datos

**Local = SQLite** (`backend/db.sqlite3`), **producción = PostgreSQL 15**.

> ⚠️ El `DATABASE_URL` local es `sqlite:///db.sqlite3`, una ruta **relativa**:
> ejecuta siempre `manage.py` **desde `backend/`**. Desde la raíz crearías otra
> base vacía y la app parecería rota.

Migraciones:

```powershell
cd backend
..\.venv\Scripts\python.exe manage.py migrate
..\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run  # no debe haber cambios
```

SQLite no valida `max_length` ni los `choices`: por eso un `DataError` de
PostgreSQL (el caso de `nivel_exigencia`) pasa inadvertido en local. Si vas a
tocar modelos, prueba contra Postgres (§9).

## 5. Arrancar

| Qué | Comando | URL |
|---|---|---|
| Backend | `cd backend` → `..\.venv\Scripts\python.exe manage.py runserver` | <http://localhost:8000> |
| Frontend | `npm run dev` (desde la raíz) | <http://localhost:3000> |
| Panel admin | `npm run dev:admin` | <http://localhost:3001/index-admin.html> |
| Worker proactivo | `cd backend` → `..\.venv\Scripts\python.exe manage.py start_reminder_worker` | — |

Vite hace *proxy* de `/api` y `/media` hacia `VITE_API_URL` (por defecto
`http://localhost:8000`). Si cambias el backend de puerto, actualiza `.env`.

## 6. Sistema proactivo (recordatorios, dosis, reportes)

Sin el worker **no se envía nada**: ni recordatorios, ni avisos de dosis, ni
reportes. Los avisos no "aparecen solos"; los genera un cron.

```powershell
cd backend
..\.venv\Scripts\python.exe manage.py start_reminder_worker
```

Ese comando hace dos cosas:

1. **Registra/re-afirma los crons** (idempotente). Por eso ya no existe el
   servicio `schedule` en el compose: era *one-shot* y, al terminar bien, no se
   reiniciaba; tras un reinicio del servidor los crons desaparecían en silencio.
2. Arranca la cola de django-q2 y ejecuta las tareas.

### Las 7 tareas

| Tarea | Cadencia | ¿Necesita `croniter`? |
|---|---|---|
| `check_reminders` | 1 min | no |
| `avisar_dosis_pendientes` | 15 min | no |
| `recordar_hora_de_oro` | cada hora | no |
| `flush_notificaciones` | 5 min | no |
| `recordar_cumpleanos` | 09:00 | **sí** |
| `generate_reports` | 21-23 h | **sí** |
| `remind_pending_actions` | 20:00 | **sí** |

Verificación:

```powershell
..\.venv\Scripts\python.exe manage.py shell -c "from django_q.models import Schedule; print(Schedule.objects.count())"
```

Sin `croniter` verás **4** y tres líneas `FALLÓ … Please install croniter`. El
worker arranca igual y **las dosis se avisan sin problema**.

### Instalar `croniter` sin PyPI

`croniter` es un wheel puro de ~40 KB y su única dependencia
(`python-dateutil`) ya está instalada. Si `pip` se queda colgado (TLS cortado por
firewall/inspección), usa una de estas vías:

```powershell
# A. wheel descargado en otro equipo con red
pip download croniter==6.2.4 --no-deps -d wheels
# aquí:
cd backend
..\.venv\Scripts\python.exe -m pip install ..\wheels\croniter-6.2.4-py3-none-any.whl

# B. extraerlo de la imagen de producción
docker create --name tmpcron <imagen>
docker cp tmpcron:/usr/local/lib/python3.11/site-packages/croniter .\croniter
docker rm tmpcron
# copiar la carpeta en .venv\Lib\site-packages\

# C. si solo era lentitud, forzar fallo rápido en vez de colgarse
..\.venv\Scripts\python.exe -m pip install croniter==6.2.4 --timeout 15 --retries 1
```

## 7. Tests y comprobaciones

```powershell
# backend (los tests se llaman tests_*.py y se descubren igual)
cd backend
..\.venv\Scripts\python.exe manage.py test dashboard
..\.venv\Scripts\python.exe manage.py test dashboard.tests_notificaciones
..\.venv\Scripts\python.exe manage.py check

# configuración de producción (debe salir sin errores nuevos)
..\.venv\Scripts\python.exe manage.py check --deploy

# frontend
npx tsc --noEmit
npm run build
```

> La suite completa tarda varios minutos (≈250 tests, cada clase crea su base de
> datos). Para iterar, ejecuta solo el módulo que toque.
>
> ⚠️ **No uses `pytest`** en este repo todavía: `backend/pytest.ini` apunta a
> `focusia_api.test_settings` y a `dashboard/tests/`, y **ninguno existe**.
> `pytest`/`pytest-django` tampoco están en `requirements.txt`. La suite corre
> con `manage.py test`.

## 8. Problemas conocidos

| Síntoma | Causa | Solución |
|---|---|---|
| *"Activate.ps1 no está firmado digitalmente"* | Política de scripts | §3 (no activar, o `Bypass`) |
| `pip install` se cuelga sin avanzar | TLS a PyPI cortado | §6 (wheel offline) |
| No aparecen notificaciones | El worker no está corriendo | §6 |
| Notificaciones viejas de hace días | Avisos de dosis ya no vigentes | Se cancelan al marcar la toma; el worker mantiene la campana al día |
| Página en blanco / 401 en todo | Backend arrancado fuera de `backend/` (otra SQLite) | Arrancar desde `backend/` |
| `/admin/` sin estilos | Producción no sirve `static/` (falta whitenoise/CDN) | Pendiente, no afecta a local |
| `npm run build` falla con `spawn EPERM` | Restricción del sandbox del agente | Ejecutar en tu terminal normal |
| El onboarding "no guarda" en local pero sí en prod | `nivel_exigencia` (varchar(5)) desbordado | Corregido; validar contra Postgres |

## 9. Paridad local ↔ producción

Diferencias que pueden hacer que algo funcione en local y falle desplegado:

| Dimensión | Local | Producción |
|---|---|---|
| Python | 3.14 | 3.11-slim |
| Base de datos | SQLite | PostgreSQL 15 |
| Servidor | `runserver` (1 proceso) | `gunicorn` 12 workers sync |
| Tareas programadas | worker manual | contenedor `worker` (`restart: always`) |
| `/media` | Django lo sirve con `DEBUG=True` | sin volumen ni ruta → 404 |
| Cookies | `SameSite=Lax` | `SameSite=None; Secure` |
| Email | consola | consola (falta `EMAIL_*`) |

Recomendación: antes de cada release, `manage.py check --deploy` con el
`.env.production` cargado, y probar el flujo de cookies con `DEBUG=False`.

Para acercar local a producción sin montar todo el stack:

```powershell
# Postgres local en un contenedor
docker run -d --name focusia-pg -p 5432:5432 `
  -e POSTGRES_DB=focusia_dev -e POSTGRES_USER=focusia -e POSTGRES_PASSWORD=devpass `
  postgres:15
# luego en backend/.env
# DATABASE_URL=postgres://focusia:devpass@localhost:5432/focusia_dev
```

## 10. Referencia rápida

```powershell
# arrancar
cd backend; ..\.venv\Scripts\python.exe manage.py runserver
cd backend; ..\.venv\Scripts\python.exe manage.py start_reminder_worker
npm run dev

# utilidades backend
..\.venv\Scripts\python.exe manage.py check
..\.venv\Scripts\python.exe manage.py migrate
..\.venv\Scripts\python.exe manage.py setup_reminder_schedule
..\.venv\Scripts\python.exe manage.py avisar_dosis_pendientes   # forzar avisos de dosis
..\.venv\Scripts\python.exe manage.py createsuperuser

# frontend
npx tsc --noEmit
npm run build
```

---

**Historial de este documento:** creado tras diagnosticar (en orden) el bloqueo
de la política de scripts, los secretos horneados en la imagen, el
desbordamiento de `nivel_exigencia`, el planificador que nunca corría y la
instalación imposible de `croniter` por red.
