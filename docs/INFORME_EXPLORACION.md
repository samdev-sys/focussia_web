# Informe de exploración — Proyecto Focussia / Focusia

**Cliente:** HIGEA · **Ruta:** `...\clientes\HIGEA\Focussia web`
**Fecha del análisis:** 30 de octubre de 2026
**Alcance:** exploración completa de repositorio (frontend, backend, infraestructura, producto, calidad).
**Método:** lectura estática de código, conteo de métricas, ejecución de verificaciones no destructivas (`tsc --noEmit`, `manage.py check`, `makemigrations --check`, subconjunto de tests) y revisión del historial Git.

---

## 1. Resumen ejecutivo

Focussia (la UI dice **Focusia**) es una **plataforma SaaS de coaching y productividad personal en español**, no un dashboard simple. Implementa un método cerrado de 12 meses: diagnóstico de la **Rueda de la Vida** (10 áreas) → **Gran Meta Anual** (generada con IA) → **12 metas mensuales** → **Matriz de Eisenhower** → **Kanban (clasificación H/P/D/E)** → **plan semanal** → **time blocking diario**, con capa de formación (frases diarias, microcapacitaciones, tribu), bienestar (suplementos, gratitud, hora de oro familiar, cumpleaños), finanzas domésticas, panel de administración de contenido y un asistente de IA con voz.

**El producto está muy avanzado funcionalmente y muy endeudado técnicamente.** No es un MVP: son ~71.000 líneas de código propio (46,6k frontend + 24,5k backend), 82 modelos de datos, 92 migraciones, 53 ViewSets y ~156 endpoints consumidos por el frontend. Pero la arquitectura no acompaña ese volumen: hay tres o cuatro generaciones de modelos conviviendo para el mismo concepto, navegación duplicada en 10 sitios, un componente de 4.628 líneas y cero cobertura de tests de autorización.

**Estado de salud técnica, en una línea:** compila y arranca limpio (`tsc` sin errores, `manage.py check` sin issues, grafo de migraciones coherente), pero **no está listo para producción** por tres defectos concretos y verificados: un IDOR en `/api/users/<id>/`, un desbordamiento de columna que romperá el onboarding en PostgreSQL, y credenciales reales que se hornean dentro de la imagen Docker.

### Los 5 hallazgos que más importan

| # | Hallazgo | Severidad | Evidencia verificada |
|---|---|---|---|
| 1 | **IDOR en `UserViewSet`**: cualquier usuario autenticado puede leer, modificar y **borrar** la cuenta de cualquier otro (`GET/PATCH/DELETE /api/users/<id>/`) | 🔴 Crítico | `backend/dashboard/views.py:93-105` — `queryset = User.objects.all()`, sin `get_queryset` ni permiso por objeto |
| 2 | **El onboarding falla en producción**: se escribe `'EQUILIBRADA'` (11 caracteres) en `nivel_exigencia`, un `CharField(max_length=5)`. En SQLite (local) pasa; en PostgreSQL lanza `DataError` | 🔴 Crítico | `models.py:725` + `views.py:4646` |
| 3 | **Secretos reales dentro de la imagen Docker**: `.dockerignore` no excluye `.env`, y el Dockerfile hace `COPY backend/ .`. Viajan la clave de Groq, la clave privada VAPID y el `SECRET_KEY`. **No están commiteados en Git** (verificado), el riesgo es de imagen/disco | 🔴 Crítico | `.dockerignore`, `backend/Dockerfile:17`, `settings.py:25-26` |
| 4 | **Sin protección CSRF real** en una API autenticada por cookie con `SameSite=None`, y `logout` no revoca el refresh token (7 días) | 🟠 Alto | `authentication.py`, `settings.py:171-186` |
| 5 | **La puerta de calidad del despliegue es un no-op**: `pytest.ini` apunta a un `test_settings` inexistente y `deploy_trl6.sh` ejecuta pytest sobre un archivo que no está en la imagen, con `\|\| echo` | 🟠 Alto | `backend/pytest.ini`, `conftest.py:19`, `deploy_trl6.sh:60` |

---

## 2. Ficha técnica

| Dimensión | Valor |
|---|---|
| **Frontend** | React 19 + TypeScript 5.8 + Vite 6 + Tailwind 4 (sin router, sin gestor de estado) |
| **Backend** | Django 5.2.18 + DRF 3.18.3 + SimpleJWT 5.5.1 (una sola app: `dashboard`) |
| **Base de datos** | PostgreSQL 15 en Docker; **SQLite en local** (esta diferencia esconde el bug #2) |
| **Tareas programadas** | django-q2 (7 crons). Celery está en el código pero **no instalado**: es código vestigial |
| **IA** | Groq (`openai/gpt-oss-120b`), 10 puntos de llamada independientes |
| **Voz** | Groq Orpheus (voces en **inglés**) + servicio Coqui XTTS **huérfano** |
| **Despliegue** | Backend self-hosted en Docker (Caddy + TLS) + frontend estático en Netlify |
| **CI/CD** | **No existe** (sin `.github/`, sin `.gitlab-ci`) |
| **Repositorio** | `github.com/samdev-sys/focussia_web`, rama `main`, **52 commits** (mar–oct 2026) |
| **Estado del árbol** | 7 archivos modificados y 5 sin trackear (trabajo en curso, último commit "avance 70%") |

**Volumen de código propio**

| Área | Archivos | Líneas |
|---|---|---|
| `src/` (TS/TSX) | 118 | ~46.200 |
| `src/` (CSS) | 3 | ~440 |
| `backend/` (Python) | ~180 | ~24.500 |
| `tts_service/` | 1 | 97 |
| **Total** | ~300 | **~71.000** |

**Artefactos pesados (deuda de repositorio):** `public/` = 112 MB (232 archivos), `dist/` = 114 MB, `.git` = 116 MB. Hay videos de 7,8 MB, avatares JPEG de 2,4 MB y **16 carpetas distintas de avatares**, varias con capturas de pantalla renombradas como assets (`Captura_de_pantalla_2026-10-26_202443.png_06f0665a.jpg`).

---

## 3. Arquitectura

### 3.1 Vista general

```
┌──────────────────────────────┐        ┌───────────────────────────────────────┐
│  Netlify (estático)          │        │  Servidor (docker compose -p focusia) │
│  dist/index.html    → app    │        │                                       │
│  dist/index-admin.html → panel│  HTTPS │  ┌─────────┐   ┌──────────────────┐   │
└──────────────┬───────────────┘        │  │ Caddy   │──▶│ web (gunicorn×12)│   │
               │  cookies HttpOnly      │  │ 80/443  │   │ Django + DRF     │   │
               │  withCredentials       │  └─────────┘   └───┬──────┬───────┘   │
               ▼                        │                    │      │           │
      ┌──────────────────┐              │             ┌──────▼──┐ ┌─▼─────────┐ │
      │ API REST /api/*  │──────────────┼────────────▶│ db pg15 │ │ redis     │ │
      │ ~156 endpoints   │              │             └─────────┘ │ (sin uso) │ │
      └──────────────────┘              │                         └───────────┘ │
                                        │  ┌──────────┐  ┌──────────────────┐   │
                                        │  │ worker   │  │ schedule (1-shot)│   │
                                        │  │ django-q2│  │ 7 crons          │   │
                                        │  └──────────┘  └──────────────────┘   │
                                        │  ✗ sin TTS   ✗ sin volumen /media    │
                                        └───────────────────────────────────────┘
```

### 3.2 Backend

- **Una sola app de negocio** (`dashboard`) con tres archivos que concentran todo: `views.py` (5.783 líneas), `models.py` (2.185) y `serializers.py` (1.131).
- **Patrón**: híbrido entre ViewSets y function-views, **sin capa de dominio**. Existen `services/` (13 archivos, 2.448 líneas) y `engine/` (10 archivos, 927 líneas), pero el ~70 % de la lógica vive en `views.py`, que además define catálogos de contenido y prompts de IA.
- **Multi-tenancy por fila**: `BaseUserViewSet` filtra `filter(user=request.user)` y lo heredan 33 de 41 viewsets. Es un patrón simple y correcto… salvo por la excepción de `UserViewSet`.
- **Workspaces a medio implementar**: existen `Workspace`, `WorkspaceMember`, roles y FKs `workspace` en 4 modelos, pero **ningún queryset filtra por workspace**: la capa colaborativa es decorativa (y en el frontend no tiene UI).
- **Superficie de API**: 53 viewsets (41 app + 12 admin), 93 `@action`, ~110 function views, 92 migraciones (una sola hoja, `0082`; los números duplicados son ramas ya fusionadas con 2 migraciones de merge — **no hay conflicto de migraciones hoy**, lo verifiqué con `makemigrations --check`).
- **Autenticación**: JWT en cookies HttpOnly + `CookieJWTAuthentication` que acepta también `Authorization: Bearer`. Login por email. Refresh a 7 días, access a 1 día.
- **Tareas**: 7 crons en django-q2 (`check_reminders` 1 min, `flush_notificaciones` 5 min, `avisar_dosis_pendientes` 15 min, `recordar_hora_de_oro` horario, cumpleaños 09:00, reportes 21-23 h, acciones pendientes 20:00). **`run_agent` y `run_decision_engine` no están programados**: el "motor de IA adaptativo" solo corre bajo demanda.

### 3.3 Frontend

- **Dos entradas Vite** (`index.html` → app, `index-admin.html` → panel), dos bundles independientes. Decisión acertada.
- **Navegación sin router**: 52 flags booleanos `show*` renderizados como cadena de `if/else` dentro de un único `return` de **2.418 líneas de JSX**. Sin deep-linking, sin historial, sin URLs por módulo (solo se lee `?token=` para el reset de contraseña).
- **Estado**: 136 `useState` en `dashboard.tsx` y 473 llamadas a setters. **Cero** Context/Redux/Zustand/TanStack Query. La comunicación horizontal se resuelve con props drilling, un `CustomEvent` ad-hoc y polling de notificaciones cada 60 s.
- **Carga inicial**: ~18 peticiones HTTP al montar el dashboard.
- **Capa de API**: `api.ts` de 2.491 líneas con 51 servicios y 156 endpoints; tipado correcto por dominio, pero **sin validación de payload, sin timeouts, sin cancelación** y con 41 llamadas `axios` crudas desde componentes que se saltan la convención.

---

## 4. Modelo de datos: 82 modelos y cuatro generaciones del mismo concepto

El modelo está agrupado por dominios coherentes con el producto:

| Dominio | Modelos | Nº |
|---|---|---|
| Identidad, cuenta y seguridad | `User`, `LoginAttempt`, `AccountChangeLog`, `InicioPrivacyPreferences` | 4 |
| Onboarding, configuración e INICIO | `OnboardingProfile`, `Avatar`, `ConfiguracionUsuario`, `AccompanimentPreferences`, `InicioState`, `InicioEventLog` | 6 |
| Aprendizaje y guía | `LearningCategory`, `LearningModuleRef`, `GuidedTourBlock`, `Juego` | 4 |
| Rueda de la Vida | `RuedaVida`, `CategoriaRueda`, `RegistroRueda`, `DiagnosticoRueda`, `FocusArea`, `AccionSugerida` | 6 |
| Kanban y ejecución | `KanbanTask`, `KanbanAction`, `AccionKanban`, `SubaccionKanban`, `EventoAccion`, `HistorialMovimiento`, `Action`, `ActionDelegation` | 8 |
| Planificación anual→diaria | `MetaAnual`, `GranMetaAnual`, `AnnualGoalConversationTurn`, `MonthlyPlan`, `MonthlyGoal`, `ObjetivoMensual`, `WeeklyPlan`, `ObjetivoSemanal`, `ObjetivoSemana` | 9 |
| Agenda y time blocking | `Recordatorio`, `TimeBlock` | 2 |
| Colaboración | `Workspace`, `WorkspaceMember`, `Invitation`, `Delegation` | 4 |
| Programa y coaching | `ProgramMonth`, `MonthlyTraining`, `ProgramDay`, `UserProgramProgress`, `UserTrainingProgress`, `DailyPhraseViewLog`, `CoachingEntry` | 7 |
| Matriz | `MatrizEisenhower`, `MatrixItem` | 2 |
| Bienestar y afectos | `Suplemento`, `SuplementoToma`, `HoraOroExperiencia`, `HoraOroAjustes`, `FocusSession`, `FraseGratitud`, `EntradaGratitud`, `Cumpleanos` | 8 |
| Finanzas domésticas | `Factura`, `CuentaColumna`, `CuentaRegistro`, `CuentaValor` | 4 |
| Notificaciones y proactivo | `Notification`, `NotificationPreference`, `ScheduleException`, `PushSubscription`, `Activacion` | 5 |
| Agentes IA | `AgentConversation`, `AgentSchedule`, `AgentConfig`, `PropuestaIA` | 4 |
| Telemetría | `InteraccionUsuario` | 1 |
| Reportes | `FocusiaReport`, `ReportDataSource` | 2 |
| Admin / membresías | `Membresia`, `AsignacionContenido` | 2 |
| Comunidad | `TribuTemaSemana`, `TribuCompromiso` | 2 |
| Widgets del primer mockup | `KeepNota`, `MisionHoy` | 2 |

**El problema no es el diseño, es la sedimentación.** Cada rediseño dejó su tabla:

| Concepto | Versión vigente | Versiones que siguen vivas |
|---|---|---|
| Tarea | **`AccionKanban`** (9 estados, subacciones, eventos, historial) | `KanbanTask` (v1, aún crea espejo), `KanbanAction` (v2, sin puentes), `Action` (planificador semanal) |
| Meta anual | **`GranMetaAnual`** (SMART, versionada) | `MetaAnual` — se sigue escribiendo al aprobar |
| Meta mensual | **`MonthlyGoal`** | `ObjetivoMensual` (destino de la clasificación IA y del generador de fases) |
| Objetivo semanal | **`WeeklyPlan` + `Action`** | `ObjetivoSemanal`, `ObjetivoSemana` (tres representaciones) |
| Delegación | **`ActionDelegation`** | `Delegation` (token + email) |
| Avisos | `Notification` | `Activacion`, `Recordatorio` (cumpleaños genera **doble aviso**) |
| Motor IA | `DecisionEngine` (5 fases) | `services/adaptive_engine.py` (200 líneas, **0 imports**) |
| Cifrado | — | `focusia_api/crypto.py` y `crypto_utils.py`: **ambos muertos**, dos implementaciones distintas |

Esto tiene consecuencias reales: doble fuente de verdad para metas, reportes que identifican acciones por *título + fecha* (colisiones), y un export/delete de privacidad que **no borra 15 modelos** (suplementos, cumpleaños, gratitud, focus, coaching, tribu, push…), lo que hace falsa la promesa de "eliminar todos mis datos".

---

## 5. Superficie funcional (módulos reales)

La navegación define 21 módulos (`AppShell`): Inicio, Rueda, Matriz, Anual, Mensual, Kanban, Semanal, Diaria, Delegar, Misión, Fechas, Suplementos, Cumpleaños, Tribu, Cuentas, Cursos, Coaching, Focus, Gratitud, Redes Sociales, Más.

| Módulo | Implementación principal | ≈ Líneas | Qué hace |
|---|---|---|---|
| **Inicio** | JSX inline en `dashboard.tsx` | 2.418 | Home de 5 columnas: saludo, accesos, backlog, time blocking, clima, fechas, notas |
| **Rueda de la Vida** | `DiagnosticoRueda`, `FormularioRueda`, `RuedaShell`, `RuedaSVG` | ~1.500 | 10 áreas → diagnóstico IA → 3 focos → acciones a Kanban |
| **Anual** | `AnnualModuleView`, `GranMetaAnualModal`, `AnnualCalendar` | ~1.100 | Gran Meta Anual generada por IA + calendario |
| **Mensual** | `MonthlyWizard`, `MonthlyCalendar`, `MonthlyShell` | ~930 | 12 metas mensuales, aprobación por bloques |
| **Semanal** | `kanban/PlanSemanalView` | 734 | Plan semanal con DnD, subacciones, checklist IA |
| **Kanban** | `KanbanModule`, `KanbanBacklog`, `KanbanBoard` | ~1.880 | Clasificación H/P/D/E, papelera con undo, backlog |
| **Diaria** | `AgendaDiaria`, `TimeBlockingCard` | ~1.780 | Time blocking por horas con arrastre |
| **Matriz** | `MatrizEisenhower` | 520 | Ejercicio educativo de 5 pasos con autoevaluación |
| **Focus** | `FocusModeScreen`, `FocusWidget` | ~1.070 | Reloj, pomodoro, temporizador, alarma; sesión única |
| **Hora de Oro** | `HoraDeOroScreen` | 1.034 | Planificador familiar semanal de experiencias |
| **Suplementos** | `SuplementosScreen` | 784 | Medicación y suplementos con tomas y tablero |
| **Cuentas** | `CuentasScreen` | 958 | Facturas, columnas configurables, rollover mensual |
| **Cumpleaños** | `CumpleanosScreen` | 671 | Registro con recordatorios anticipados |
| **Gratitud** | `GratitudScreen` | 318 | Práctica diaria autoguardada |
| **Tribu** | `TribuScreen` | 351 | 8 tribus, tema y compromiso semanal |
| **Cursos** | `CursosScreen` | 395 | Microcapacitación del mes y progreso |
| **Coaching** | `CoachingScreen` | 540 | Reflexión diaria → acción para mañana |
| **Reportes** | `ReportsListScreen`, `ReportDetailScreen` | ~1.470 | Reportes semanal/mensual/anual con gráficas |
| **Configuración** | `ConfiguracionModule`, `ConfiguracionPanel` | ~1.720 | 8 subpantallas, incluido export/borrado de datos |
| **Delegación** | `DelegarModule` | 512 | Procesos de delegación con responsables |
| **Onboarding** | `OnboardingWizardV2` + `PostOnboardingHub` | ~4.100 | 11 pantallas + hub de 6 pantallas + tour de 25 pasos |

**Observaciones de producto**

- La cadena de valor está bien diseñada y es coherente con los 6 documentos funcionales de `parametros/`: **Rueda → Gran Meta Anual → 12 metas mensuales → Matriz → Kanban → Semanal → Diaria**. Es un producto con método, no una checklist.
- El alcance se ha desbordado hacia dominios ajenos al foco (finanzas domésticas, medicación, cumpleaños, redes sociales, juegos). Cada uno añade un módulo completo, tests y deuda.
- **No hay pasarela de pago.** `Membresia` se define a mano por el admin (fecha inicio/fin, sin planes fijos) y `AsignacionContenido` es una allowlist polimórfica sin FK. La monetización es 100 % manual: aceptable para un programa cerrado con plazas limitadas, incompatible con autoservicio.
- **"Juegos" no existe como módulo de usuario**: solo hay una pantalla de admin y una categoría dentro de Hora de Oro.
- Incoherencia de marca: carpeta `Focussia web`, logo y UI `Focusia`, correo `focusia.app`, repo `focussia_web`.

---

## 6. Integraciones externas

| Integración | Cómo está | Riesgo si falta la clave |
|---|---|---|
| **Groq (LLM)** | 10 llamadas HTTP independientes en 6 archivos (urllib y SDK mezclados); modelo `openai/gpt-oss-120b` **hardcodeado 11 veces** | Degradación desigual: unas devuelven 503, otras fallback local, y **TTS devuelve 500 sin capturar** |
| **Groq Orpheus (voz)** | `POST /api/tts/` y `/tts/avatar/`, voces `troy`/`hannah` **en inglés**, texto truncado a **200 caracteres** | 500 al usuario |
| **Coqui XTTS v2** | `tts_service/` (FastAPI, clonación de voz, CPU) + `COQUI_TTS_URL` en settings | **Huérfano**: `COQUI_TTS_URL` se lee y nunca se usa; el servicio no está en el compose de producción; su `load_model()` tiene el path mal resuelto para el valor por defecto |
| **WhatsApp** | `whatsapp_service.py` (Twilio/Meta/log) | El provider `log` devuelve `success: True` **sin enviar** → se marcan dosis como "avisadas" sin envío real |
| **Web Push (VAPID)** | `PushService` + `public/sw.js` | El aviso sigue llegando a la campana; suscripciones 404/410 se autolimpian |
| **Google / Microsoft OAuth** | Solo *verifican* el token que envía el front (`tokeninfo`, Graph `/me`); **sin client secret y sin validar `aud`** | Acepta tokens emitidos para otras apps; auto-provisiona usuario por email (que no es único) |
| **Email** | SMTP solo si `EMAIL_HOST` está definido; si no, consola | **`.env.production` no define `EMAIL_*`** → en producción el reset de contraseña no envía nada |

El detalle más relevante de producto: **la app habla español pero la voz la genera un modelo inglés**, y el servicio de clonación de voz en español que sí existe en el repo nunca se integró. Es trabajo ya pagado que no está en la ruta crítica.

---

## 7. Infraestructura y despliegue

- **Producción**: 5 servicios (`db`, `redis`, `web`, `worker`, `schedule`) + overlay opcional `proxy` (Caddy con TLS automático). Frontend en Netlify con `VITE_API_URL` **horneado en build** — y hoy el valor del repo es el placeholder `https://api.pendiente-de-definir.com`.
- **`docker-compose.yml` (dev) solo levanta el TTS**, no el backend: no es un stack de desarrollo completo.
- **`docker-compose.staging.yml` no tiene `worker` ni `schedule`** → en staging no corren recordatorios ni reportes; y publica Redis en `6379`.
- **Sin volcado de `media`**: no hay volumen para `/media` en producción. Cualquier archivo subido desde el panel (hasta 200 MB) da 404 y se pierde al recrear el contenedor.
- **Sin segmentación de red**: ningún compose declara `networks:`; el proxy comparte red con la base de datos.
- **Sin CI/CD ni migración automática**: el despliegue es manual por script (`deploy_trl6.sh`) y `DESPLEGUE.md`.
- **TTS no está en producción** aunque `.env.production` apunta `COQUI_TTS_URL` a `localhost:8760` (donde no escucha nada).

**Modelo TRL**: el repo escala TRL 3 → 4 → 5 → 6 con umbrales incoherentes entre niveles. `docs/TRL5_validation.md` es honesto: **throughput 6,41 rps frente a un objetivo de 20 → FAIL**, y 3 de 4 criterios cumplidos. El TRL 6 se mide contra `localhost:8000` sin TLS ni proxy, es decir, no en el entorno relevante que dice validar.

---

## 8. Seguridad — hallazgos por severidad

> Nota importante y tranquilizadora: **los `.env` no están commiteados**. Lo verifiqué con `git ls-files` y `git log` sobre los archivos de entorno; solo `.env.example` está versionado y no contiene valores reales.

| # | Severidad | Hallazgo | Evidencia |
|---|---|---|---|
| 1 | 🔴 Crítico | **IDOR en `UserViewSet`** (leer/modificar/borrar cualquier usuario) | `views.py:93-105` |
| 2 | 🔴 Crítico | **Onboarding roto en PostgreSQL** (`nivel_exigencia`, varchar(5) ← `'EQUILIBRADA'`) | `models.py:725`, `views.py:4646` |
| 3 | 🔴 Crítico | **`.env` dentro de la imagen Docker** (Groq key, VAPID privada, `SECRET_KEY`); `load_env` con `setdefault` los usa como fallback silencioso | `.dockerignore`, `Dockerfile:17`, `settings.py:25` |
| 4 | 🔴 Crítico | **Puerto 8000 publicado** en `0.0.0.0` y `deploy_trl6.sh` **no usa el overlay de TLS** → API en HTTP claro | `docker-compose.prod.yml:36`, `deploy_trl6.sh:15` |
| 5 | 🟠 Alto | **CSRF no aplicado**: auth por cookie + `SameSite=None` y DRF solo valida CSRF con `SessionAuthentication` | `authentication.py`, `settings.py:150-179` |
| 6 | 🟠 Alto | **Sin `SECURE_PROXY_SSL_HEADER`** detrás de Caddy → `is_secure()` falso, 403 de CSRF en `/admin/`, URLs absolutas en `http://`. Las variables `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE` y `CSRF_COOKIE_SECURE` del `.env.production` **son configuración muerta** (settings no las lee) | grep sin coincidencias |
| 7 | 🟠 Alto | **Rate limiting colapsado**: sin `NUM_PROXIES`, todos los clientes comparten la IP del proxy → 5 logins/min y 30 req/min **globales para todo el producto** | `settings.py:156-166` |
| 8 | 🟠 Alto | **Reset de contraseña entrega un access token completo** de 24 h (no es un token de un solo uso) y no invalida sesiones | `views.py:111-113,148-155` |
| 9 | 🟠 Alto | **Delegaciones por token sin dueño**: `Delegation.objects.filter(token=...)` sin filtrar usuario; `IsMineOrReadOnly` **no es una clase de permiso DRF** | `views.py:151,2117` |
| 10 | 🟠 Alto | **`/media` sin autenticación en dev y sin servir en prod**; admin de Django expuesto sin allowlist ni CSS/JS (no hay whitenoise) | `urls.py:22-27`, `Caddyfile` |
| 11 | 🟡 Medio | Logout no revoca refresh (sin blacklist ni rotación); access de 1 día | `settings.py:171-180` |
| 12 | 🟡 Medio | **`ALLOWED_HOSTS` fail-open a `['*']`** si falta la variable; `localhost:3000` permitido en el CORS de producción; `LOGIN` log sin rotación | `settings.py:37,189` |
| 13 | 🟡 Medio | OAuth sin validar `aud`; `User.email` no único pero se usa como identificador de login | `social_auth.py`, `models.py` |
| 14 | 🟡 Medio | TTS sin autenticación y **loguea el texto del usuario** (contenido íntimo de coaching) | `tts_service/app.py:65` |

**Lo que está bien hecho** y conviene no tocar: cabeceras de seguridad propias (HSTS, CSP, `X-Frame-Options: DENY`, COOP/CORP, `Permissions-Policy`), `SECRET_KEY` obligatoria, validadores de contraseña, throttling en login, aislamiento por usuario en 33 viewsets, `is_staff` en las 12 vistas del panel, y **cero SQL crudo** (solo `SELECT 1` en healthcheck).

### Contexto de privacidad (importa más que la disponibilidad)

El sistema almacena datos íntimos: rueda de la vida, diario de coaching, gratitud, salud y medicación, finanzas personales, cumpleaños de terceros y contactos. Con backups manuales, `/media` sin auth en dev, logs que registran texto del usuario y un borrado de datos incompleto, **el riesgo dominante es de privacidad y cumplimiento (Ley 1581/2012 en Colombia), no de caída del servicio**.

---

## 9. Calidad y pruebas

**Lo que funciona (verificado ejecutando):**

| Verificación | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errores (**pero `strict: false`**, así que pasa con 109 `any` y 24 `as any`) |
| `python manage.py check` | ✅ 0 issues |
| `python manage.py makemigrations --check --dry-run` | ✅ sin cambios pendientes, grafo coherente |
| Subconjunto de tests (`tests_rueda`, `tests_matriz`) | ✅ 5 tests OK en 11 s |
| Suite completa (267 tests) | ⚠️ **no terminó en ~15 min** (probablemente por llamadas de red a Groq con timeout de 30 s) |

**Cobertura real**: 21 archivos y 267 tests. Está muy desequilibrada:

- `tests_onboarding.py`: 89 tests (33 % del total)
- `tests_admin_contenido.py`: 42
- `tests_agenda_diaria.py`: 17, `tests_kanban_backlog.py`: 15, `tests_reportes_comunicacion.py`: 15
- **`tests_rueda.py`: 2 · `tests_matriz.py`: 3 · `tests_monthly.py`: 4 · `tests_weekly.py`: 6**

**Cero tests de**: autorización por objeto (no hay ni un test de aislamiento entre usuarios), `engine/` completo (las 5 fases del motor de IA), `social_auth`, TTS, agente, membresías, export/borrado de privacidad, migraciones y comandos.

**La configuración de pytest está rota**: `pytest.ini` apunta a `focusia_api.test_settings` (no existe) y a `testpaths = dashboard/tests` (no existe), y `python_files` no matchea `tests_*.py`. Además `pytest`, `pytest-django` y `locust` **no están en ningún requirements**. En la práctica los tests solo corren con `manage.py test`, y el `deploy_trl6.sh` intenta ejecutar pytest sobre un archivo que ni siquiera está dentro de la imagen.

---

## 10. Deuda técnica y código muerto

| Métrica | Valor |
|---|---|
| Componente más grande | `dashboard.tsx` — **4.628 líneas** (10 % del frontend) |
| Mayor `return` JSX | **2.418 líneas** en un solo bloque |
| Mayor componente de flujo | `OnboardingWizardV2` — 3.040 líneas, 11 pantallas, 0 subcomponentes extraídos |
| `useState` en un archivo | **136** |
| Arrays de navegación distintos | **10**, con divergencias reales (`'cumple'` vs `'cumpleanos'`, `'hora-oro'` solo en uno, Cuentas/Redes ausentes en 4, Coaching/Focus/Gratitud ausentes en 3) |
| Dispatchers de navegación duplicados | **8** (~370 líneas) |
| Implementaciones de Kanban | **4** |
| Shells con sidebar propia | **6** + 3 pantallas con la suya |
| Código muerto | **≈4.047 líneas (8,7 %)**: 11 componentes nunca importados, 7 de 9 hooks muertos, 1 CSS muerto |
| Pantallas inalcanzables | `WeeklyPlanner` (862 líneas), `AgendaDiaria` completa (754) y 3 modales legacy |
| `catch` vacíos | **84** (conviviendo con 79 `console.error`) |
| `.catch(() => [])` en el arranque | 9 de 9 fetchers → **backend caído se ve como "no hay datos"** |
| Fixtures demo en producción | 11 constantes `DEMO_*` usadas como fallback en Reportes |
| Datos hardcodeados | Metas anual/mensual/semanal/diaria son `useState` con texto demo **sin persistencia** |
| Dependencias muertas | `lottie-web`, `thinking-orbs`, `autoprefixer` |
| Lockfiles | 2 (`package-lock.json` + `pnpm-lock.yaml`) con `overrides` duplicados |
| Requirements | 2 con deriva: el raíz lista Celery, el del backend django-q2, groq y pywebpush |
| Archivos sueltos en la raíz | 5 HTML de prototipos (1.150 líneas), carpeta `focussia_web/` con una copia obsoleta de `DelegarModule.tsx`, `db.sqlite3` vacío |

---

## 11. Riesgos priorizados

| Prioridad | Riesgo | Impacto | Acción |
|---|---|---|---|
| **P0 · hoy** | IDOR en `UserViewSet` | Cualquier usuario puede borrar cuentas ajenas | `get_queryset()` que devuelva solo `request.user` para `retrieve/update/destroy`, o eliminar esas rutas |
| **P0 · hoy** | Rotar credenciales | Clave Groq y VAPID privada reales en disco y en la imagen | Rotar Groq (×2) y VAPID; inyectar por secret manager |
| **P0 · hoy** | `.dockerignore` + `load_env` | Secretos horneados en cada capa de la imagen | Excluir `**/.env*`, `*.sqlite3`, `celerybeat-schedule*`; quitar `load_env` en producción y fallar si falta una clave |
| **P1 · esta semana** | `nivel_exigencia` | El onboarding revienta en producción (Postgres) | `max_length=20` + migración, o mapear a `bajo/medio/alto` |
| **P1 · esta semana** | Sin CSRF + logout no revoca | Escrituras cross-site; sesión viva 7 días tras salir | Exigir `X-CSRFToken` en `CookieJWTAuthentication`; activar `token_blacklist` y rotación |
| **P1 · esta semana** | Puerto 8000 abierto + sin `SECURE_PROXY_SSL_HEADER` | API sin TLS, CSRF roto en admin | `expose` en vez de `ports`; `SECURE_PROXY_SSL_HEADER` y `USE_X_FORWARDED_HOST`; usar siempre el overlay de proxy |
| **P1 · esta semana** | `NUM_PROXIES` sin configurar | 5 logins/min globales (bloqueo de todo el producto) | `NUM_PROXIES=1` o throttle por `X-Forwarded-For` validado |
| **P2 · este mes** | `/media` sin volumen ni auth | Pérdida de archivos subidos y exposición de contenido | Volumen `media_data` + servido autenticado o Caddy con `X-Accel` |
| **P2 · este mes** | Tests/CI | No hay red de seguridad para refactorizar | `test_settings.py`, arreglar `pytest.ini`, añadir dev requirements, GitHub Actions bloqueante |
| **P2 · este mes** | Doble motor IA y N+1 | Coste LLM y latencia; `AdminUsuarioViewSet.list` puede lanzar >1.000 queries | Unificar en un `LLMClient`; `select_related`/`prefetch_related`; paginar |
| **P3 · trimestre** | Consolidación de modelos | Deuda estructural que crece con cada módulo | Deprecar `KanbanTask`/`KanbanAction`/`ObjetivoMensual`/`ObjetivoSemana`/`MetaAnual` con migraciones de datos |
| **P3 · trimestre** | Frontend sin router ni store | Cada módulo nuevo exige tocar 3-5 dispatchers | Introducir router + un store ligero; romper `dashboard.tsx` en pantallas |
| **P3 · trimestre** | 112 MB de assets sin optimizar | Build de 114 MB, primera carga lenta, repo de 116 MB | WebP/AVIF, comprimir videos, CDN, limpiar las 16 carpetas de avatares |

---

## 12. Plan de acción recomendado

**Semana 1 — cerrar sangrado (4 cambios quirúrgicos)**
1. Arreglar el IDOR de `UserViewSet` + un test de aislamiento entre dos usuarios.
2. Rotar Groq y VAPID; corregir `.dockerignore`; quitar `load_env` en producción; reconstruir y purgar la imagen del registro.
3. `nivel_exigencia` a `max_length=20` con migración (o mapear a los choices correctos).
4. Cerrar el puerto 8000, añadir `SECURE_PROXY_SSL_HEADER` y `NUM_PROXIES`, y hacer que `deploy_trl6.sh` use el overlay de TLS.

**Semanas 2-4 — seguridad y operación**
5. CSRF en `CookieJWTAuthentication`, blacklist de refresh y reset con token opaco de un solo uso.
6. Volumen de `media` + servido autenticado; configurar `EMAIL_*` en producción (hoy el reset no envía).
7. Reparar la suite: `test_settings.py`, `pytest.ini`, dev requirements y un pipeline mínimo (tsc + tests + pip-audit).
8. Ajustar workers de gunicorn (12 sync contra 1 GB es OOM probable) y añadir rotación de logs.

**Mes 2-3 — deuda que frena el producto**
9. Decidir TTS: borrar `tts_service/` o integrarlo de verdad (con modelo español y sin loguear texto). Hoy la voz es inglesa sobre texto español.
10. Consolidar las 4 generaciones de tareas y las 3 de metas con migraciones de datos; eliminar el código muerto (~4.000 líneas).
11. Introducir router y un store en el frontend; descomponer `dashboard.tsx` y `OnboardingWizardV2`.
12. Optimizar assets (112 MB → objetivo < 15 MB) y limpiar `dist/` del repo.

**Decisión de producto pendiente:** si el modelo de negocio va a ser autoservicio, falta una pasarela de pago; hoy las membresías se crean a mano por el administrador.

---

## 13. Conclusión

El proyecto demuestra un trabajo de producto serio y prolongado (marzo a octubre de 2026, 52 commits, 71k líneas) con un método de coaching bien especificado en 6 documentos funcionales y una implementación que cubre la cadena completa: diagnóstico → meta anual → metas mensuales → priorización → ejecución → reflexión. La UI es visualmente ambiciosa y el backend resuelve 82 modelos con un patrón de aislamiento por usuario razonablemente consistente.

Lo que impide llamarlo "listo" no es la falta de funcionalidad, es la **ausencia de abstracciones y de red de seguridad**: un componente de 4.628 líneas, 10 menús que no coinciden entre sí, cuatro tablas para la misma tarea, cero tests de autorización, y cuatro defectos de seguridad o despliegue que se arreglan en una semana pero que hoy bloquean un lanzamiento real.

Con las 8 acciones P0/P1 de la sección 11 el sistema pasa de "demo muy avanzada" a "producto desplegable". El resto de la lista mejora velocidad de desarrollo y coste operativo, no corrige riesgos.

---

### Anexo A — Por dónde empezar a leer

| Quiero entender… | Archivo |
|---|---|
| El producto y su método | `parametros/*.md` (6 documentos) |
| La navegación y los módulos | `src/components/AppShell.tsx` (21 ítems) |
| El núcleo de la app | `src/dashboard.tsx` |
| La API completa | `backend/dashboard/urls.py` (232 líneas) |
| El modelo de datos | `backend/dashboard/models.py` |
| El despliegue real | `DESPLEGUE.md` + `docker-compose.prod.yml` |
| La deuda declarada por el equipo | `evaluacion_trl3_plan_mejora.txt` |
| Lo que el README **no** cuenta | `README.md` (describe el MVP de abril; el producto actual es otro) |

### Anexo B — Verificaciones ejecutadas

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `python manage.py check` | 0 issues |
| `python manage.py makemigrations --check --dry-run` | No changes detected |
| `python manage.py test dashboard.tests_rueda dashboard.tests_matriz` | Ran 5 tests — OK |
| `python manage.py test` (suite completa) | No completó en ~15 min (interrumpido) |
| `git ls-files` sobre `.env*` | Solo `.env.example` versionado |

*Nota metodológica: las cifras de líneas son físicas; los conteos se hicieron con `Select-String`/`Measure-Object` sobre el árbol de trabajo actual. Los hallazgos marcados como "inferido" (p. ej. el 403 de CSRF tras el proxy) no se validaron levantando el stack.*
