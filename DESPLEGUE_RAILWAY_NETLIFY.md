# Despliegue · Railway (backend) + Netlify (frontend)

Guía concreta para llevar esto a producción. Reemplaza al flujo anterior de
Caddy/VPS (ver `DESPLEGUE.md`, que sigue siendo válido para ese esquema).

## Arquitectura

```
Netlify (SPA estática) ──HTTPS + cookies cross-site──▶ Railway
  index.html / index-admin.html                        web    : Gunicorn + API Django
  VITE_API_URL apunta al dominio Railway               worker : django-q2 (crons/reportes)
                                                       pg     : Postgres (plugin)
                                                       redis  : cache compartida (plugin)
```

Puntos clave ya dejados listos en el repo:
- `backend/requirements.txt` incluye **whitenoise** (sirve `/static/` del admin sin nginx).
- `backend/focusia_api/settings.py` ya monta whitenoise, `SECURE_PROXY_SSL_HEADER`,
  `USE_X_FORWARDED_HOST`, cookies `SameSite=None; Secure` cross-site (con `DEBUG=False`)
  y exige `ALLOWED_HOSTS`.
- `backend/Procfile` con `web` (migra + collectstatic + gunicorn en `0.0.0.0:$PORT`)
  y `worker` (`start_reminder_worker`).
- `backend/nixpacks.toml` fija Python 3.11 para el builder NIXPACKS de Railway.
- `netlify.toml` con redirect SPA, `/admin` → `index-admin.html` y headers.
- `backend/.env.railway.example` con todas las variables a fijar.

## 1. Backend en Railway

1. **Nuevo proyecto** → *Deploy from GitHub repo* → este repo.
   Railway construirá `backend/` con NIXPACKS (requirements.txt + Procfile).
2. **Servicios** (mismo repo, dos instancias):
   - `web`: Start Command = el del Procfile `web`
     (`python manage.py migrate --noinput && python manage.py collectstatic --noinput && gunicorn focusia_api.wsgi:application --bind 0.0.0.0:$PORT`).
   - `worker`: Start Command = `python manage.py start_reminder_worker`
     (correr como servicio permanente; no tiene healthcheck HTTP).
3. **Plugins**: agrega **Postgres** — Railway define `DATABASE_URL`
   automáticamente y la app ya lo lee con `dj_database_url`. Agrega **Redis**
   y en las variables del backend pone `REDIS_URL=${{Redis.REDIS_URL}}`.
4. **Variables**: lista completa en `backend/.env.railway.example`; obligatorias
   las de la tabla基金会 de abajo. No copies `backend/.env` (dev): trae `DEBUG=True`
   y claves de ejemplo.
5. **Dominio público**: *Settings → Networking → Generate Domain* →
   `https://<app>.up.railway.app`. Ese valor es el `VITE_API_URL` del paso 2 y va
   en `ALLOWED_HOSTS`.
6. Verifica `https://<app>.up.railway.app/api/health/` → `{"status": "ok"}`.
7. **Superusuario**: desde una terminal local con la `DATABASE_URL` de Railway
   exportada, `python manage.py createsuperuser`.

### Variables del backend (obligatorias)

| Variable | Valor |
| --- | --- |
| `SECRET_KEY` | clave aleatoria nueva (no la de desarrollo) |
| `DEBUG` | `False` |
| `ALLOWED_HOSTS` | `backend-xxx.up.railway.app` (coma y dominio custom si hay) |
| `CORS_ALLOWED_ORIGINS` | `https://<tu-app>.netlify.app` (y dominio custom si habrá) |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` (variable del plugin Redis) |
| `GROQ_API_KEY` | clave de Groq de producción |
| VAPID / EMAIL / WHATSAPP / GOOGLE | valores según `backend/.env.railway.example` |

## 2. Frontend en Netlify

1. **Nuevo site desde Git** → este repo. `netlify.toml` ya define
   `npm run build` + publish `dist` (Node 22).
2. **Variable obligatoria** (Site configuration → Environment variables):
   - `VITE_API_URL = https://<app>.up.railway.app`
   (Vite la hornea en el bundle; si cambia el dominio del backend hay que re-desplegar).
3. Deploy → `https://<site>.netlify.app`.
4. **Routing**: `netlify.toml` mapea `/admin` → `index-admin.html` (panel admin)
   y el resto de rutas al SPA (`/app/*`, `/hub`, `/onboarding`, ...).
5. **Dominio custom**: *Domain management* → y luego **agrega ese dominio a
   `CORS_ALLOWED_ORIGINS` en Railway**: los cookies con `SameSite=None` no pasan
   si el origen del front no está listado como CORS permitido.

### Credenciales entre Netlify y Railway (por qué el backend ya está listo)

- El origen del front ∈ `CORS_ALLOWED_ORIGINS` → `corsheaders` responde
  `Access-Control-Allow-Credentials: true` con origen exacto (nunca `*`).
- `CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS` → los POST con header `Origin`
  del front no hacen 403.
- Las cookies (`access_token`, CSRF, sesión) salen `Secure; SameSite=None`
  automáticamente cuando `DEBUG=False`.

## 3. Checklist post-despliegue

- [ ] `/api/health/` responde `{"status": "ok"}` (confirma DB conectada).
- [ ] Login desde el front funciona (cookies entre dominios Netlify → Railway).
- [ ] `/admin` (Netlify) carga el panel; `/admin/` del backend sale con CSS (whitenoise).
- [ ] Campana de notificaciones recibe avisos → confirma que el servicio `worker`
      está activo y que las tareas están registradas en django-q2 (visible en el admin).
- [ ] Push del navegador: Probar el permiso desde la app; los VAPID va a las variables.
- [ ] Reportes automáticos: con el `worker` vivo, el cron `generate_reports` corre
      las 21:00–23:00 y publica el primer reporte semanal el domingo de cierre.
- [ ] Password reset por correo: configura SMTP (`EMAIL_HOST`, etc.) antes de producción;
      si queda vacío, el correo se imprime en la consola del contenedor.

## 4. Diferencias respecto al esquema anterior (Caddy/VPS)

| Antes (Caddy/VPS) | Ahora (Railway/Netlify) |
| --- | --- |
| Postgres en contenedor propio | Plugin Postgres de Railway |
| Caddy servía estáticos + TLS | Whitenoise sirve `/static/`; TLS automático de Railway/Netlify |
| `/media/` con X-Accel-Redirect de Caddy | Django entrega directo con `FileResponse` (la aplicación sigue funcionando; solo se pierde la descarga acelerada por nginx) |
| Docker compose replicaba todo el repo | Railway solo `backend/`; Netlify solo los estáticos |
| Migraciones en el deploy (release) | `migrate --noinput` al arrancar el `web` |

`docker-compose.prod.yml`, el `Dockerfile` y los scripts de Caddy siguen en el repo
por si se vuelve al despliegue en servidor propio; con Railway/Netlify no se usan.
