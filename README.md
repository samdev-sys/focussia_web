## Focusia (Frontend) — Informe y guía del proyecto

Dashboard personal orientado a productividad y bienestar: rueda de la vida, matriz de prioridades, time blocking, agenda/kanban, recordatorios, metas, notas y una capa colaborativa (workspaces, miembros, invitaciones y delegación). Incluye gamificación (XP, niveles, rachas y badges).

---

## Stack y arquitectura

- **Frontend**: React + TypeScript (Vite)
- **UI**: TailwindCSS (estilo glassmorphism), `lucide-react`, `motion`
- **Gráficas**: `recharts`
- **HTTP**: `axios` con interceptores JWT (Bearer + refresh)
- **Backend esperado**: API REST (Django REST + PostgreSQL + JWT SimpleJWT)

---

## Ejecutar en local

### Requisitos
- Node.js (recomendado: LTS)

### Instalación

```bash
npm install
```

### Variables de entorno

Crea un archivo `.env.local` (o `.env`) en `focussia_web/` con:

```bash
# URL del backend (si no se define, usa http://localhost:8000)
VITE_API_URL=http://localhost:8000
```

> Nota: el proyecto también trae dependencia `@google/genai` y Vite define `process.env.GEMINI_API_KEY`, pero el flujo principal del dashboard depende de `VITE_API_URL` para consumir la API.

### Iniciar servidor

```bash
npm run dev
```

Abre `http://localhost:3000`.

---

## Scripts disponibles

- **`npm run dev`**: corre Vite en puerto 3000
- **`npm run build`**: build de producción
- **`npm run preview`**: previsualización del build
- **`npm run lint`**: TypeScript check (`tsc --noEmit`)

---

## Estructura principal (frontend)

- **`src/App.tsx`**: controla sesión (token en `localStorage`) y muestra `Auth` o `Dashboard`
- **`src/Auth.tsx`**: login/registro, valida formulario, guarda `access_token`/`refresh_token`
- **`src/dashboard.tsx`**: núcleo del producto (UI, modales, fetch inicial, workspaces, gamificación, recordatorios, etc.)
- **`src/services/api.ts`**: cliente axios + interceptores + servicios por módulo
- **`src/components/KanbanBoard.tsx`**: agenda/pendientes (crear, planificar, delegar, eliminar)
- **`src/components/FormularioRueda.tsx`**: formulario de “Rueda de la vida” (sliders)
- **`src/components/NotificationToast.tsx`**: toasts para recordatorios (medicamentos/cumpleaños/hora oro)
- **`src/hooks/useApi.ts`**: hooks para rueda de vida y time blocks (con fallback/optimistic UI)

---

## Módulos funcionales implementados (resumen)

### Autenticación (JWT)
- Login y registro desde `Auth`
- Persistencia de tokens en `localStorage`
- Refresh automático al recibir `401` en `axios` (interceptor)

### Dashboard (módulos)
- **Gamificación**: XP, niveles, racha, badges (guardado en `localStorage`)
- **Modo oscuro**: toggle persistido en `localStorage`
- **Clima/ubicación**: geolocalización + Nominatim + Open‑Meteo
- **Rueda de vida**: simple (`/api/rueda-vida/`) y “completa” (`/api/rueda-vida-completa/`)
- **Time blocking**: carga y auto-guardado (onBlur / estado)
- **Kanban / Agenda**: lista de tareas con acciones rápidas
- **Matriz Eisenhower**: CRUD por cuadrantes (do/schedule/delegate/eliminate)
- **Recordatorios**: CRUD + chequeo por intervalo + toast accionable (“marcar como tomado”)
- **Facturas**: CRUD (estado pagado / vencimientos)
- **Workspaces**: crear, seleccionar, ver miembros, ajustar roles, invitar por link
- **Delegación**: delegar tareas por email/token, aceptar/rechazar/completar

---

## “Informe del proyecto” — evolución desde el inicio (roadmap)

El archivo `prompt.md` documenta el recorrido del MVP (2026) en “misiones”:

- **Misión #1 (UI)**: maquetación base del dashboard en React/Tailwind (grid + glassmorphism + responsivo).
- **Misión #2 (Backend)**: API REST con PostgreSQL y modelos (RuedaVida, TimeBlock, KanbanTask, Recordatorio, ObjetivoSemana, KeepNota, MisionHoy, etc.) + JWT.
- **Misión #3 (Integración)**: axios + consumo de endpoints + auto‑guardado (onBlur) + feedback “Guardando…”.
- **Misión #4 (DnD)**: drag and drop para kanban con `@dnd-kit/*` + PATCH al backend.
- **Misión #5 (Notificaciones)**: recordatorios con lógica de tiempo real/intervalos + UI de toasts + estado “Tomado”.
- **Misión #6 (Rueda completa)**: categorías + registros + formulario + visualización en gráfica.
- **Misión #7 (Deploy)**: Vercel (frontend) + Railway (backend) + variables + CORS + HTTPS.

---

## Últimos cambios (evidencia por fechas de edición)

Este workspace no tiene historial git, así que los “últimos cambios” se infieren por **fecha de modificación de archivos** en `src/`:

- **Más reciente**: `src/dashboard.tsx` — **10/04/2026 12:37 a. m.**
- **Previos (06/04/2026)**: `src/services/api.ts`, `src/hooks/useApi.ts`, `src/components/*`, `src/Auth.tsx`, `src/App.tsx`, `src/index.css`, etc.

Cambios recientes destacados que están concentrados en `dashboard.tsx`:
- Consolidación de **workspaces** (miembros, roles, invitaciones) y UI asociada.
- Flujos de **delegación** y manejo de invitaciones pendientes.
- **Recordatorios** con toast y acción “marcar como tomado”.
- CRUD de **matriz Eisenhower** y modales adicionales (medicamentos, ajustes, etc.).
- Ajustes/refuerzo de **gamificación** (XP por acciones).

---

## Backend / endpoints (referencia rápida)

La base URL se toma de `VITE_API_URL` (por defecto `http://localhost:8000`). Los servicios del frontend consumen endpoints como:

- Auth: `/api/token/`, `/api/token/refresh/`, `/api/users/`, `/api/users/me/`
- Rueda: `/api/rueda-vida/`, `/api/rueda-vida-completa/`
- Time blocks: `/api/time-blocks/`
- Kanban: `/api/kanban-tasks/`
- Matriz: `/api/matrix-items/`
- Recordatorios: `/api/recordatorios/`, `/api/notifications/`
- Facturas: `/api/facturas/`
- Workspaces: `/api/my-workspaces/`, `/api/workspaces/:id/`, `/api/workspaces/:id/invite/`, etc.

