# Pendientes — Focussia

**Última revisión:** 01/11/2026 · Estado del árbol: cambios sin commitear.

Cada punto está verificado contra el código en esa fecha (las líneas pueden moverse).

**Cómo usar este documento**

- **P0** bloquea salir a producción o es un riesgo de seguridad real.
- **P1** correctitud, datos o seguridad de severidad media.
- **P2** deuda que frena el desarrollo (no rompe nada hoy).
- **P3** decisiones de producto, no técnicas.

Los **IDs son estables** (no se renumeran): los resueltos aparecen tachados al
final de cada sección y con detalle en §8.

---

## 1. P0 — Seguridad y despliegue

| # | Pendiente | Evidencia | Impacto | Acción | Esf. |
|---|---|---|---|---|---|
| 10 | **OAuth sin validar `aud`/`azp`** y `User.email` **no es único** | `dashboard/social_auth.py`, `models.User` | Acepta tokens emitidos para otra app de Google/Microsoft; auto-provisión por email ambiguo | Validar `aud` con el `tokeninfo` que ya se llama (sin paquetes nuevos); unicidad de email o clave `(provider, sub)` | M |

*Resueltos el 31/10–01/11:* **1** (CSRF), **2** (puerto 8000), **3** (proxy TLS), **4** (`NUM_PROXIES`), **5** (reset de contraseña), **6** (logout sin revocar), **7** (`ALLOWED_HOSTS`), **8** (`/media`), **9** (estáticos del admin y acceso a `/admin/`), **11** (500 en `logout-all`). Ver §8.

## 2. P1 — Correctitud y datos

| # | Pendiente | Evidencia | Acción | Esf. |
|---|---|---|---|---|
| 12 | **Borrado de datos incompleto** (promete eliminar todo y no lo hace): `config_privacy_delete_data` borra ~30 modelos pero **omite 15** | `views.py:5349` (verificado: no aparecen `Suplemento`, `Cumpleanos`, `EntradaGratitud`, `FocusSession`, `CoachingEntry`, `PushSubscription`) | Borrar por `user` en: `Suplemento` (+`SuplementoToma` por cascada), `Cumpleanos`, `EntradaGratitud`, `FocusSession`, `HoraOroExperiencia`, `HoraOroAjustes`, `TribuCompromiso`, `CoachingEntry`, `ActionDelegation`, `AgentSchedule`, `AgentConfig`, `PushSubscription`, `DailyPhraseViewLog`, `UserProgramProgress`, `UserTrainingProgress` | M |
| 13 | **Delegaciones**: `retrieve` y `handle_action` re-consultan `filter(token=...)` sin filtrar usuario, saltándose el `get_queryset` que sí está acotado | `views.py` → `DelegationViewSet` | Decidir el modelo: si el token es la capacidad (link público), documentarlo y **no** devolver `delegate_email`/`token` en el listado propio; si no, filtrar por usuario | S |
| 14 | **`marcar_tomado` marca la dosis pendiente más antigua**, no la que se ve en la tarjeta | `views.py:508` | Aceptar `toma_id` en el body (el front lo tiene) y marcar esa; dejar el "más antigua" como fallback | S |
| 15 | **Test preexistente que falla**: `ProgramServiceTests.test_fallback_after_completing_all_months` | `tests_onboarding.py:765` (lleva un TODO del propio equipo) | Definir con el cliente qué debe devolver al terminar los 12 meses y ajustar test+código | S |
| 16 | **Estado conversacional del agente en `LocMemCache`** con 12 workers de gunicorn | `services/agent_service.py`, sin `CACHES` | `django_redis` no está instalado; alternativa sin red: `DatabaseCache` nativo + `createcachetable` | M |
| 17 | **N+1**: `AdminUsuarioViewSet.list` (>1.000 queries), `rueda_vida_completa`, `Suplemento._tarjeta` (6 por ítem), `program_service.get_current_program_day` | `admin_api.py:300`, `views.py:1175`, `:477` | `select_related`/`prefetch_related` y paginación en el listado de usuarios | M |
| 19 | **Email sin configurar en producción**: `EMAIL_*` ausente en `.env.production` → backend de consola | `settings.py` (bloque EMAIL) | Configurar SMTP; sin esto el reset de contraseña no envía nada | S |
| 20 | **`run_agent` y `run_decision_engine` no están programados**: el motor de 5 fases solo corre a mano o por endpoint | `setup_reminder_schedule.py` (7 tareas, sin estas) | Decidir si el motor debe ejecutarse solo (y con qué cadencia) o queda bajo demanda | M |
| 21 | **Doble aviso de cumpleaños**: `check_reminders` (cada min) y `recordar_cumpleanos` (09:00) avisan del mismo evento | `tasks.py` | Unificar en una sola vía | S |

*Resueltos el 31/10:* **18** (contrato de `intensity_level`). Ver §8.

## 3. P2 — Deuda estructural

| # | Pendiente | Evidencia | Esf. |
|---|---|---|---|
| 22 | **Consolidar modelos duplicados**: 4 generaciones de "tarea" (`AccionKanban`, `KanbanTask`, `KanbanAction`, `Action`) y 4 de "meta" (`GranMetaAnual`, `MetaAnual`, `MonthlyGoal`, `ObjetivoMensual`) | `models.py` | L |
| 23 | **Frontend sin router ni store**: `dashboard.tsx` 4.628 líneas, 136 `useState`, 10 arrays de navegación divergentes, ~4.000 líneas muertas | `src/` | L |
| 24 | **Dos APIs de Kanban en paralelo** (`/kanban-actions/` y `/acciones-kanban/`) y 41 llamadas `axios` crudas desde componentes | `api.ts:237`, `KanbanModule` | M |
| 25 | **Datos demo en producción**: 11 constantes `DEMO_*` como fallback en Reportes; metas anual/mensual hardcodeadas sin persistencia | `reportMockups.tsx`, `dashboard.tsx:876` | M |
| 26 | **`pytest` inutilizable**: `pytest.ini` apunta a `focusia_api.test_settings` y `dashboard/tests/`, ninguno existe; `pytest`, `pytest-django` y `locust` no están en requirements | `backend/pytest.ini`, `conftest.py:19` | S |
| 27 | **Versiones divergentes**: Python 3.14 local vs 3.11 en la imagen; Node 24 vs 22 en Netlify | `Dockerfile:1`, `netlify.toml` | S |
| 28 | **`croniter` ausente en el venv local** → 3 de 7 crons no se registran | ver `docs/ENTORNO_LOCAL.md` §6 | XS |
| 29 | **Assets sin optimizar**: `public/` 112 MB, `dist/` 114 MB, 16 carpetas de avatares, capturas de pantalla usadas como imágenes | `public/` | M |
| 31 | **Sin CI/CD**: no hay `.github/`; el deploy es manual | `deploy_trl6.sh` | M |
| 32 | **Rendimiento medido**: TRL5 documenta 6,41 rps frente a un objetivo de 20 | `docs/TRL5_validation.md` | L |
| 33 | **Accesibilidad e idioma**: `index.html` con `lang="en"`, 35 `aria-*` en todo el front, sin i18n | `index.html:2` | M |
| 34 | **Media servida por gunicorn**: `/media/` exige sesión (bien) pero los bytes los envía Django, ocupando un worker por descarga — relevante para los videos de capacitación | `focusia_api/views.py` → `media_protegida` | M |

*Resueltos el 31/10:* **30** (limpieza de restos). Ver §8.

Sobre **34**: la cabecera `X-Accel-Redirect` ya se envía, así que **si algún día
ponen nginx delante, este punto se resuelve solo**. Con Caddy la alternativa
nativa sería `forward_auth` (Caddy autoriza contra Django y sirve él el archivo),
o mover el media a S3/R2 con URLs firmadas.

## 4. P3 — Decisiones de producto

1. **Cobro**: hoy no hay pasarela; las membresías se crean a mano (`Membresia` con fecha inicio/fin). ¿Cohorte cerrada acompañada o autoservicio? De esto depende si hace falta un módulo de pagos.
2. **Alcance**: finanzas domésticas, medicación, cumpleaños y redes sociales están fuera del método de coaching. ¿Se mantienen?
3. **PWA**: no hay `manifest` y el service worker solo hace push → la app no es instalable. ¿Promesa real o se retira?
4. **Motor de IA**: el producto vende "IA adaptativa", pero el motor de 5 fases no corre solo. Definir si eso es parte de la propuesta o se deja como asistente.

## 5. Checklist "listo para vender"

- [x] ~~CSRF, reset de contraseña, proxy TLS, puerto 8000, media privada, admin restringido, `ALLOWED_HOSTS`, logout real~~ (§8)
- [ ] **10** OAuth con `aud` validado (faltan los Client ID)
- [ ] **12** borrado de datos completo (obligación legal con datos de salud y diario)
- [ ] **19** email configurado (sin reset de contraseña no hay producto)
- [ ] **15** definido el fin de ciclo anual
- [ ] **26 / 31** CI mínima: `tsc`, tests, `check --deploy`
- [ ] Backups automáticos de Postgres fuera del servidor
- [ ] Probar `ADMIN_ALLOWED_IPS` y el flujo de media en el servidor real

## 6. Verificación rápida

```powershell
cd backend
..\.venv\Scripts\python.exe manage.py check
..\.venv\Scripts\python.exe manage.py check --deploy        # con env de producción cargado
..\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
..\.venv\Scripts\python.exe manage.py test focusia_api.tests_auth dashboard.tests_seguridad dashboard.tests_notificaciones
npx tsc --noEmit
```

## 7. Riesgo en una frase

La capa de seguridad web ya está cerrada (CSRF, cookies, proxy TLS, media
privada, sesiones revocables); lo que impide venderlo es **OAuth sin validar
audiencia**, **una obligación legal** (borrado de datos incompleto sobre salud,
finanzas y diario) y **el email sin configurar**, que hoy hace inútil el
restablecimiento de contraseña en producción.

---

## 8. Hecho y verificado (no reabrir)

| Fecha | Cambio | Verificación |
|---|---|---|
| 31/10 | **Coqui XTTS eliminado** (servicio, compose de dev, `COQUI_TTS_URL`) | grep sin referencias; `check` OK |
| 31/10 | **IDOR de `UserViewSet`** cerrado (queryset acotado al propio usuario) | 404 en cuentas ajenas, 200 en la propia |
| 31/10 | **Onboarding roto en PostgreSQL** (`nivel_exigencia`): helper `normalizar_nivel_exigencia`, 2 rutas corregidas, migración `0083` | migración aplicada (`SUAVE`→`bajo`); tests |
| 31/10 | **Secretos fuera de la imagen**: `.dockerignore` con `**/`, `DJANGO_SKIP_DOTENV=1`, guard de `SECRET_KEY` de ejemplo, `SECRET_KEY` rotada, VAPID/WhatsApp en `.env.production` | build real de Docker: `/app` sin `.env`, sin logs, sin sqlite, sin media |
| 31/10 | **Cabecera de `ModuleShell` centrada** (grid 1fr/auto/1fr) | `tsc` 0, build OK |
| 31/10 | **Tarjeta "Acciones por Delegar"** muestra acción + responsable reales | `tsc` 0 |
| 31/10 | **Crons se registran al arrancar el worker**; servicio `schedule` eliminado; staging con worker | 4 filas estables en `django_q_schedule` |
| 31/10 | **Avisos de dosis**: todas las pendientes de 48 h (tope 10); se cancelan al marcar la toma y al borrar el suplemento | 11/11 tests de notificaciones |
| 31/10 | **`requirements.txt` único**; `docs/ENTORNO_LOCAL.md`, `INFORME_EXPLORACION.md` | `compose config` OK; enlaces verificados |
| 31/10 | **#2 Puerto 8000 cerrado**: `expose` + deploy siempre con overlay del proxy, salud por HTTPS | `compose config`: sin puertos publicados |
| 31/10 | **#3 Proxy TLS**: `SECURE_PROXY_SSL_HEADER`, `USE_X_FORWARDED_HOST`, variables SSL efectivas, `SECURE_REDIRECT_EXEMPT` para el healthcheck | `check --deploy`: 0 issues; health 200, resto 301, con `X-Forwarded-Proto: https` → 401 sin bucle |
| 31/10 | **#4 `NUM_PROXIES`** (1 en prod, 0 en dev) | `check` OK |
| 31/10 | **#7 `ALLOWED_HOSTS` fail-closed** | arranque sin ella falla con mensaje claro |
| 31/10 | **#6 + #11 logout real y sesiones revocables**: `token_blacklist`, rotación de refresh, `logout` quema el refresh, `logout-all` quema todo, y `User.sessions_invalidated_at` (migración `0084`) rechaza los **access** emitidos antes | 17/17 `tests_auth` |
| 31/10 | **#18 contrato `intensity_level`** alineado | `tsc` 0 |
| 31/10 | **#30 limpieza**: `focussia_web/`, 5 HTML de mockups, `db.sqlite3` de 0 bytes | entradas Vite intactas |
| 01/11 | **#1 CSRF (doble cookie)**: `GET /api/csrf/`, validación en `CookieJWTAuthentication` solo cuando el token viene de cookie (Bearer exento), `withXSRFToken` en los dos clientes HttpOnly (app y panel admin) y bootstrap al arrancar | 4 tests nuevos: 403 sin token, 200 con token, GET exento, Bearer exento |
| 01/11 | **#5 Reset de contraseña de un solo uso**: `PasswordResetTokenGenerator` con formato `<uidb64>.<token>`, `PASSWORD_RESET_TIMEOUT=3600`, y al confirmar se cierran todas las sesiones | 7 tests: single-use, caducidad, rechazo de JWT, aviso "60 minutos", cierre de sesiones |
| 01/11 | **#8 Media privada**: `/media/<path>` pasa a vista autenticada (antes solo DEBUG y sin auth), volumen `media_data` en web y proxy, `mediaUrl()` en el front para absolutizar rutas (app, cursos y panel admin) | 4 tests: anónimo 401, autenticado 200, inexistente 404, traversal 404 |
| 01/11 | **#9 Estáticos y admin restringido**: `STATIC_URL='/static/'`, `collectstatic` al arrancar en volumen `static_data`, Caddy los sirve; `/admin/*` limitado a `ADMIN_ALLOWED_IPS` (por defecto localhost) | `caddy validate`: *Valid configuration*; `compose config` OK |
