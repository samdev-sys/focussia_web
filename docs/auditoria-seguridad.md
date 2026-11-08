# Auditoría de Seguridad - Focussia Web (Actualizada)
Fecha: 2026-11-05  
Alcance: Focussia Web (React 19 + Vite, Django 5.2 + DRF + PostgreSQL, JWT, IA con Groq/Gemini)  
Método: Análisis estático de código fuente (solo lectura). No se ejecutaron cambios en código/configuración.  
Restricciones: Solo lectura. Se entrega únicamente este informe.

---

## Resumen Ejecutivo

Se actualiza el informe con las solicitudes: análisis de eliminación de Invitaciones/Workspaces, eliminación de `GEMINI_API_KEY`, resolución del problema de claves reales, resultados de auditoría de dependencias, mejora de FASE 2, resolución de FASE 4, resolución de FASE 5 y prioridades de acción actualizadas.

Hallazgos críticos persisten: secretos reales en repo, posible inyección de `GEMINI_API_KEY` al bundle, IDOR en delegaciones, validación insuficiente en invitaciones/workspaces, borrado de cuenta sin reautenticación.

---

## 1) Eliminación de Invitaciones / Workspaces

**Estado actual (verificado):**
- Modelos: `Workspace`, `WorkspaceMember`, `Invitation` en `backend/dashboard/models.py`
- Vistas/URLs: `WorkspaceViewSet`, `InvitationViewSet`, endpoints `my-workspaces/`, `workspaces/accept_invitation/`, `workspaces/decline_invitation/`, `pending-invitations/` en `backend/dashboard/views.py` y `backend/dashboard/urls.py`
- Frontend: referencias a workspaces/invitaciones presentes

**Recomendación (solo análisis - NO MODIFICADO):**
- **Plan de eliminación seguro:** crear migración para eliminar dependencias (FKs), eliminar modelos, vistas, serializers, URLs, rutas frontend, permisos relacionados. Verificar que no queden referencias cruzadas (KanbanTask/Recordatorio tienen `workspace` FK opcional).
- **Riesgo:** Alto si hay datos existentes. Requiere migración de datos o eliminación controlada.
- **Acción:** Si se procede, hacerlo en rama separada con backup de BD previo.

**Hallazgo relacionado:** `AUTHZ-004`/`AUTHZ-005` - si se eliminan, estos hallazgos desaparecen. Si se mantienen, deben corregirse (validación de roles, verificación de email en decline).

---

## 2) Eliminación de GEMINI_API_KEY

**Estado actual (verificado):**
- `vite.config.ts:10-12`: `define: { 'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY) }` - inyecta la clave al bundle si existe en entorno.
- `.env` raíz: no contiene `GEMINI_API_KEY` actualmente, pero la configuración es peligrosa.
- Backend usa Groq (`GROQ_API_KEY`) server-side.

**Recomendación (solo análisis):**
- **Eliminar** la línea `define` que expone `GEMINI_API_KEY` de `vite.config.ts` inmediatamente.
- Asegurar que ninguna llamada a Gemini exista desde frontend. Todas las llamadas deben ir por backend.
- Rotar cualquier `GEMINI_API_KEY` que haya estado expuesta.
- Usar solo variables `VITE_*` no secretas.

**Severidad:** Crítica si alguna clave estuvo expuesta.

---

## 3) Resolución del problema con claves reales

**Hallazgos:**
- `.env` (raíz): contiene `GROQ_API_KEY=gsk_...` (real-looking)
- `backend/.env`: contiene `SECRET_KEY`, `GROQ_API_KEY`, `VAPID_PRIVATE_KEY_B64` (reales)

**Plan de remediación (inmediato):**
1. **Rotación:** Rotar `SECRET_KEY`, `GROQ_API_KEY`, `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY_B64`, cualquier otra clave expuesta.
2. **Eliminación del repo:** Eliminar `.env` y `backend/.env` del tracking git (`git rm --cached`), añadir a `.gitignore`, purgar del historial con `git filter-repo` o `BFG Repo-Cleaner`.
3. **Gestión de secretos:** Usar variables de entorno del proveedor (Railway/Netlify), nunca commitear `.env`.
4. **Validación:** `settings.py` ya valida `SECRET_KEY` de ejemplo en prod (correcto). Mantener.

**Severidad:** Crítica.

---

## 4) Auditoría de dependencias (pip-audit / npm audit)

**Resultados:**
- `npm audit` (raíz): **0 vulnerabilities found**
- `pip-audit` (backend): **No disponible** en el entorno. No se pudo ejecutar.

**Análisis basado en requirements:**
- Django 5.2.18, DRF 3.18.3, djangorestframework-simplejwt 5.5.1, PyJWT 2.15.0, sqlparse 0.6.0 (actualizados con notas de seguridad)
- Algunas deps sin pin estricto (`psycopg[binary]`, `whitenoise>=6.8.0,<7.0`)
- Frontend con React 19, Vite 6.4.5, overrides aplicados

**Recomendaciones:**
- Ejecutar `pip-audit` en CI/CD (instalarlo). Revisar CVEs.
- Fijar versiones en `requirements.txt` para builds reproducibles.
- Mantener `npm audit` en CI.

---

## 5) Mejora de FASE 2 - Defensas contra ataques

| Ataque | Mitigado | Cómo / Mejoras necesarias |
|---|---|---|
| Fuerza bruta/Credential stuffing | Parcial | Añadir account lockout efectivo (usar `LoginAttempt`), CAPTCHA tras umbral, bloqueo por IP+usuario, alertas. Mantener throttling 5/min en login. |
| Enumeración | Sí | Reset genérico, login genérico. Añadir throttling por IP/email más estricto. |
| IDOR | Parcial (Crítico) | **Corregir `DelegationViewSet`**: en `retrieve` y `handle_action` validar `request.user == delegator or delegate`. Añadir tests. Mantener scoping en UserViewSet/BaseUserViewSet. |
| XSS | Parcial | Sanitizar `avatar_url` (URLValidator + whitelist http/https), considerar CSP más restrictiva (eliminar `'unsafe-inline'` con nonces/hashes), sanitizar contenido usuario. |
| CSRF | Sí | Mantener validación CSRF para auth por cookie. Verificar SameSite/Secure por entorno. |
| SQLi | Sí (mayoría) | Auditar uso de `raw()`/`cursor.execute`. |
| SSRF | No verificable | Auditar llamadas HTTP con URLs de usuario. Añadir allowlist. |
| Abuso IA | Parcial | Rate limiting/coste por usuario, timeouts, filtrado prompt injection, logging sin PII excesivo, mover a async. |
| DoS | Parcial | Paginación global, rate limiting por endpoint costoso, caching, WAF/Cloudflare, WebSocket/SSE para evitar polling excesivo. |
| 2FA/Logging/Alertas | Parcial/No verificable | Evaluar 2FA, integrar Sentry/alertas, asegurar rotación de logs. |

---

## 6) Resolución de FASE 4 - Respaldos y recuperación

**Estado actual:** NO VERIFICABLE

**Plan concreto:**
| Elemento | Acción | Frecuencia/Detalles |
|---|---|---|
| Backups PostgreSQL | `pg_dump --format=custom` automatizado | Diario, retención 30 días, cifrado GPG, off-site (S3/Object Storage) |
| Prueba de restauración | Probar restore en entorno aislado | Mensual, documentar RTO/RPO |
| Backups media/avatares | Sincronizar `MEDIA_ROOT` a storage externo | Diario/incremental |
| Migraciones | Ya versionadas | Mantener |
| DR Plan | Documento con contactos, pasos, rollback | Actualizar trimestralmente |
| Soft-delete | Considerar para cuentas/datos críticos | Evitar hard delete irreversible |

**Comandos ejemplo (referencia):**
```bash
pg_dump --format=custom $DATABASE_URL | gpg --symmetric --cipher-algo AES256 > backup-$(date +%F).dump.gpg
aws s3 cp backup-*.dump.gpg s3://bucket/backups/ --sse AES256
# Restore
gpg -d backup.dump.gpg | pg_restore --clean --if-exists --no-owner --no-privileges -d $DATABASE_URL
```

---

## 7) Resolución de FASE 5 - Rendimiento con 1000+ usuarios

### Optimizaciones inmediatas
| Problema | Solución | Impacto |
|---|---|---|
| Polling (30s/60s) | Migrar a WebSocket/SSE o aumentar intervalos + diff | Reduce req/s drásticamente |
| Sin paginación | Añadir paginación global DRF (`PageNumberPagination`) | Menor payload/memoria |
| N+1 | Usar `select_related`/`prefetch_related` | Menor latencia BD |
| Índices | Añadir índices en `user`, `workspace`, `fecha_hora`, `email`, FKs | Queries más rápidas |
| Conexiones BD | Configurar `CONN_MAX_AGE` (ej. 60s) | Menor overhead conexión |
| IA síncrona | Mover a Django-Q2/Celery con jobs async + polling resultado | No bloquea workers |
| Caché | Cachear dashboard inicial (Redis) con TTL corto | Menor carga BD |

### Plan de pruebas de carga
**Herramientas:** k6 o Locust (solo staging/local)  
**Escenarios:** login, dashboard inicial (paralelo), CRUD kanban/time-blocks, polling  
**Rampa:** 100→500→1000→2000 usuarios  
**Métricas:** p50/p95/p99, error rate, RPS, CPU/RAM, conexiones BD, queue depth  
**Umbrales:** p95 < 500ms, errores < 1%

### Estimación capacidad
**Cuello de botella primero:** BD/conexiones o workers síncronos. Sin optimizaciones, capacidad limitada. Requiere medición con pruebas reales.

---

## 8) Prioridades de acción actualizadas

| Prioridad | Acción | Esfuerzo | Responsable |
|---|---|---|---|
| P0 | Rotar claves expuestas, eliminar `.env` del repo/historial, purgar con BFG/filter-repo | L | DevOps/Sec |
| P0 | Eliminar inyección `GEMINI_API_KEY` de `vite.config.ts` | S | Frontend |
| P0 | Corregir `DelegationViewSet.retrieve/handle_action` (validar pertenencia delegador/delegado) | M | Backend |
| P0 | Corregir invitaciones/workspaces: validar roles, impedir `owner` no autorizado, verificar email en decline | M | Backend |
| P1 | Añadir reautenticación a `DELETE /api/users/me/`, sanitizar `avatar_url`, paginación global | M | Backend/Frontend |
| P1 | Configurar backups automáticos + probar restore | M | DevOps |
| P1 | Mover IA síncrona a async, optimizar polling | M | Backend/Frontend |
| P2 | Endurecer CSP, evaluar 2FA, índices BD, `CONN_MAX_AGE`, pruebas de carga | M/L | Todos |
| P2 | Ejecutar `pip-audit` en CI, mantener `npm audit` | S | DevOps |

**Nota:** Las acciones de "eliminar invitaciones/workspaces" requieren análisis de migración de datos y pueden tener impacto amplio - planificar con backup antes de ejecutar.

---

**Este informe actualiza el anterior con las solicitudes. Todas las modificaciones de código/configuración quedan fuera del alcance (solo lectura).**
