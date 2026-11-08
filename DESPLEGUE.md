# Despliegue a producción

Modelo elegido: **backend=self-hosted en Docker, frontend=Netlify**.

```
  Navegador ──HTTPS──▶ API (tú servidor, Docker)      Navegador ──HTTPS──▶ Netlify (front)
                      web / worker
                      postgres + redis
                      ↑ tls proxy overlay (Caddy)
```

El front **nunca** habla con netlify por datos: todo va al dominio del API.

---

## 1. Backend (servidor propio, Docker)

### Requisitos
- Servidor con Docker + Docker Compose, puerto 80/443 libres.
- Dominio del API apuntando (A/AAAA) al servidor.

### Variables
| Dónde | Qué |
|---|---|
| `.env` (raíz del proyecto en el server) | `DB_PASSWORD` (lo exige el compose), `API_DOMAIN` (lo exige el proxy overlay) y opcionalmente `ADMIN_ALLOWED_IPS` (IPs con acceso a `/admin/`; por defecto solo `127.0.0.1 ::1`) |
| `backend/.env.production` | `SECRET_KEY` (≥50 caracteres, **no** un valor de ejemplo), `DEBUG=False`, `ALLOWED_HOSTS=<dominio-api>` (obligatoria), `CORS_ALLOWED_ORIGINS=https://<dominio-front-Netlify>`, `CSRF_TRUSTED_ORIGINS` igual, `GROQ_API_KEY`, VAPID (`VAPID_*`), `EMAIL_*`, OAuth, `THROTTLE_*`, `SECURE_SSL_REDIRECT=True` |

> `backend/.env.production` **no viaja por git**: crearlo a mano en el server.
> El contenedor arranca con `DJANGO_SKIP_DOTENV=1`: si falta una variable, **no**
> cae al `.env` de desarrollo (antes lo hacía y metía claves del portátil en la
> imagen). El arranque falla con un mensaje claro.

### Volúmenes con estado

| Volumen | Contenido | Se llena en |
|---|---|---|
| `postgres_data` | base de datos | primer arranque |
| `media_data` | archivos subidos desde el panel (**sensibles**) | al subir contenido |
| `static_data` | estáticos del admin | cada arranque de `web` (`collectstatic`) |

`media_data` es lo que hace que las subidas **sobrevivan a los despliegues**.
Conviene incluirlo en el backup, no solo el dump de Postgres.

### Primer despliegue
```bash
git clone <repo> && cd focussia_web
echo "DB_PASSWORD=$(openssl rand -base64 24)" > .env
echo "API_DOMAIN=api.tudominio.com" >> .env
# crear backend/.env.production con las vars de arriba

docker compose -p focusia -f docker-compose.prod.yml -f docker-compose.proxy.yml build
docker compose -p focusia -f docker-compose.prod.yml -f docker-compose.proxy.yml up -d
docker compose -p focusia -f docker-compose.prod.yml run --rm web python manage.py migrate
docker compose -p focusia -f docker-compose.prod.yml run --rm web python manage.py createsuperuser
```

> Los crons **los registra el propio `worker` al arrancar** (idempotente). Ya no
> existe el servicio `schedule`: era one-shot con `restart: on-failure` y, al
> terminar bien, no se reiniciaba, de modo que tras un reinicio del servidor sin
> `up -d` las tareas quedaban sin registrar y el sistema proactivo se detenía en
> silencio. Verifica en los logs del worker que aparezcan las 7 tareas:
>
> ```bash
> docker compose -p focusia -f docker-compose.prod.yml logs worker | grep -E 'min|hora|cron'
> ```

Bloque de datos del Postgres local (opcional: demo/con datos reales):
```bash
# desde el equipo local
docker compose -p focusia -f docker-compose.prod.yml exec db \
  pg_dump -U focusia focusia_production --no-owner -Fc -f /backups/db-prod.dump
scp backups/db-prod.dump servidor:/home/deploy/focussia_web/backups/
# en el server
docker compose -p focusia -f docker-compose.prod.yml exec -T db \
  pg_restore -U focusia -d focusia_production --clean --if-exists --no-owner /backups/db-prod.dump
```

### Rutina de actualización (futuro)
```bash
git pull
docker compose ... build web worker
docker compose ... up -d            # recrea solo lo cambiado
docker compose ... run --rm web python manage.py migrate   # solo si hubo migraciones
```

El `worker` se recrea en cada despliegue y vuelve a registrar los crons, así que
no hay un paso manual que se pueda olvidar.

### Créditos de esquina para recordar
- TLS los entrega el servicio `proxy` (Caddy,Certificates automatizados) — verificar el DNS antes de levantar, si no falla la emisión.
- Healthcheck: `GET /api/health/` (el compose vigila a `web`).
- `update/overwritten`: esto NO rompe migraciones de datos — no ejecutar `manage.py runserver` nunca aquí.

---

## 2. Frontend (Netlify)

- Sitio conectado al repo (rama `main`), build por Netlify con lo que ya hay en `netlify.toml`: `npm run build`, `publish: dist`, Node 22, redirect SPA en `/*`.
- En **Site settings → Environment variables**, dejar `VITE_API_URL=https://api.tudominio.com`
  (debe coincidir con lo que se haya puesto en `netlify.toml` `[build.environment]`). Actualizarlo y **redepolar** si cambia el dominio del API: el valor queda horneado en el bundle; no se puede cambiar en runtime.
- Dominio personalizado (ej. `app.tudominio.com`): Netlify DNS → SSL automatic (Let's Encrypt).

### CORS (en el .env.production del API)
```
ALLOWED_HOSTS=api.tudominio.com
CORS_ALLOWED_ORIGINS=https://app.tudominio.com
CSRF_TRUSTED_ORIGINS=https://app.tudominio.com
```
Con credenciales (cookies JWT HttpOnly), CORS no puede ser `*`: el origen exacto.

---

## 3. Checklist de estar en vivo

- [ ] `https://api.tudominio.com/api/health/` responde 200.
- [ ] Login desde `https://app.tudominio.com` (cookies Secure/SameSite=None: sin HTTPS no entra).
- [ ] Campana: notificaciones en tiempo ≤1min.
- [ ] Crons: en los logs del `worker` aparecen las 7 tareas al arrancar
      (`docker compose ... logs worker | grep -E 'min|hora|cron'`). Si falta
      `croniter` en la imagen, las 3 tareas de tipo cron salen como "FALLÓ".
- [ ] Servicio `backup` activo (`docker compose ... up -d backup`) y primer backup verificado. Ver `docs/BACKUPS.md`.
- [ ] `SECRET_KEY` etc. NO versionadas: check `git status` limpio de archivos `.env*`.
