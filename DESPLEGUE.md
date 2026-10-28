# Despliegue a producción

Modelo elegido: **backend=self-hosted en Docker, frontend=Netlify**.

```
  Navegador ──HTTPS──▶ API (tú servidor, Docker)      Navegador ──HTTPS──▶ Netlify (front)
                      web / worker / schedule
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
| `.env` (raíz del proyecto en el server) | `DB_PASSWORD` (lo exige el compose) y `API_DOMAIN` (lo exige el proxy overlay) |
| `backend/.env.production` | `SECRET_KEY`, `DEBUG=False`, `ALLOWED_HOSTS=<dominio-api>`, `CORS_ALLOWED_ORIGINS=https://<dominio-front-Netlify>`, `CSRF_TRUSTED_ORIGINS` igual, `GROQ_API_KEY`, `VITE_GOOGLE_CLIENT_ID`/OAuth, `THROTTLE_*` |

> `backend/.env.production` **no viaja por git**: crearlo a mano en el server.

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
docker compose -p focusia -f docker-compose.prod.yml run --rm schedule   # registra los 5 crons
```

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
docker compose ... build web worker schedule
docker compose ... up -d            # recrea solo lo cambiado
docker compose ... run --rm schedule  # re-registra crons (el service corre una vez)
docker compose ... run --rm web python manage.py migrate   # solo si hubo migraciones
```

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
- [ ] Crons: `docker compose -p focusia -f docker-compose.prod.yml run --rm schedule` sin errores.
- [ ] `crontab`/respaldos server.
- [ ] `SECRET_KEY` etc. NO versionadas: check `git status` limpio de archivos `.env*`.
