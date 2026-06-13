🚀 Misiones de Desarrollo: Focusia (MVP 2026)
🎨 Misión #1: Maquetación Base (Frontend UI)
Objetivo: Crear la "piel" de la aplicación basándose en el diseño Glassmorphism.

Prompt:
"Actúa como un Desarrollador Frontend Senior experto en React y Tailwind CSS. Tu misión es maquetar la estructura visual del dashboard de Focusia basándote exactamente en la imagen de diseño adjunta.

Tecnología: Usa React (Vite) y Tailwind CSS. Instala lucide-react para iconos.

Layout: Implementa un diseño de cuadrícula (CSS Grid) para organizar las tarjetas de manera idéntica a la imagen.

Estilo Glassmorphism: Aplica backdrop-filter: blur(10px);, fondo bg-white/20 y bordes rounded-[2rem].

Paleta de Colores: Usa tonos pastel suaves (rosados, lavanda, melocotón) para botones y etiquetas.

Componentes: Maqueta la Barra de Búsqueda, tarjetas de navegación (INICIO, RUEDA, MATRIZ), el contenedor del gráfico de Radar, la tabla de Time Blocking (24h) y los paneles laterales de Notificaciones.

Responsividad: Asegúrate de que el diseño sea adaptable (Mobile First)."

🧠 Misión #2: Arquitectura del Backend (Django + API)
Objetivo: Configurar el cerebro de la app y la base de datos persistente.

Prompt:
"Actúa como un Arquitecto de Software Senior. Tu misión es construir la API REST que dará vida al dashboard de Focusia.

Base de Datos: Configura PostgreSQL como motor principal.

Modelos (Django): 
User: Custom User Model con Email.

RuedaVida: Campos Salud, Amistad, Dinero (1-10).

TimeBlock: Campos hora, tarea, estado (bool).

KanbanTask: Título, descripción y columna (Backlog, Delegar, etc.).

Recordatorio: Para Medicamentos, Cumpleaños y Hora de Oro.

ObjetivoSemana: Textos de los 3 objetivos semanales.

KeepNota: Contenido de texto para el block de notas.

MisionHoy: URL del avartar de usuario 

API: Crea endpoints REST para CRUD en cada sección.

Seguridad: Implementa JWT (SimpleJWT) para autenticación privada. Solo el dueño de la cuenta accede a sus datos."

🔗 Misión #3: Integración y Dinamismo (Connect)
Objetivo: Hacer que el frontend consuma datos reales del backend.

Prompt:
"Actúa como un Desarrollador Full-Stack. Tu misión es conectar el Dashboard de React con la API de Django.

Conexión: Configura Axios con interceptores para incluir el token JWT en las cabeceras.

Fetch: Al cargar el dashboard, haz un GET a `/api/rueda-vida/`, `/api/objetivo-semana/`, `/api/keep-nota/`, y `/api/mision-hoy/` y vincula los valores.

Gráficos: Vincula los datos de la Rueda de Vida usando CSS conic-gradients dinámicos o componentes adecuados.

Auto-guardado: En el Time Blocking, haz que al editar una celda y perder el foco (onBlur), se envíe un PATCH al backend para guardar el cambio al instante. Modifica también las notas para auto-guardado similar.

UX: Añade indicadores de 'Guardando...' para dar feedback al usuario."

🖐️ Misión #4: Interactividad (Drag and Drop)
Objetivo: Implementar la experiencia de usuario profesional en los tableros.

Prompt:
"Actúa como un Desarrollador UI Senior. Tu misión es implementar arrastrar y soltar en 'Kanban Backlog' y 'Acciones por Delegar'.

Librería: Instala y configura @dnd-kit/core y @dnd-kit/sortable.

Funcionalidad: Permitir mover tareas entre las columnas de 'Backlog' y 'Delegar'.

Backend: Crea un endpoint PATCH que reciba el nuevo estado de la tarea tras el evento onDragEnd.

Estilo: Aplica efectos de opacidad y sombras flotantes mientras se arrastra la tarjeta, manteniendo el efecto Glassmorphism."

🔔 Misión #5: Notificaciones y Eventos (Real-Time)
Objetivo: Activar los recordatorios de salud y bienestar.

Prompt:
"Actúa como Desarrollador de Sistemas en Tiempo Real. Activa los bloques de Medicamentos, Cumpleaños y Hora de Oro.

Tareas Programadas: Configura Django Q2 o Celery para revisar recordatorios cada minuto.

Alertas: Implementa notificaciones visuales (Toasts) en React que aparezcan cuando llegue la hora del recordatorio.

Zonas Horarias: Asegura que la lógica use la hora local del usuario en Colombia.

Estado: Permite marcar medicamentos como 'Tomados' para que la tarjeta cambie de estado visualmente."



Misión #6: Integración de la Rueda de la Vida (Prompt para el Agente)
Este prompt le dice a tu agente de IA (Antigravity) cómo programar esta lógica exacta. Pégalo en tu entorno de desarrollo.

Instrucción para el Agente:
"Actúa como Desarrollador Full-Stack Senior. Tu misión es implementar el proceso para que el usuario pueda realizar su propia Rueda de la Vida.

Backend (Django Models):

Crea un modelo CategoriaRueda (Admin configurable) con campos nombre (ej. Salud), icono (string de emoji/svg).

Crea un modelo RegistroRueda con campos usuario (FK), categoria (FK), puntaje (Integer 1-10), fecha_creacion.

Backend (API Views):

Endpoint GET para obtener todas las categorías activas.

Endpoint POST para recibir una lista de puntajes (ej: {salud: 8, dinero: 5}) y guardarlos en RegistroRueda asociados al usuario autenticado.

Frontend (React UI - Formulario):

Crea un componente FormularioRueda. Para cada categoría, muestra un input type='range' (Slider) del 1 al 10.

Asegúrate de que el estilo Glassmorphism se mantenga en el formulario.

Frontend (Visualización Dinámica):

Al presionar 'Guardar', usa Axios para enviar los puntajes a la API.

Una vez guardados con éxito, redirecciona al dashboard principal.

El componente del gráfico de radar que maquetamos en la Misión #1 debe cambiar para recibir datos reales (chartData) de la API, usando la librería Recharts."

mision #7 : 
Eres un experto en seguridad fullstack. Voy a darte tareas específicas de hardening para una aplicación llamada Focusia.

Stack:
- Backend: Django 4.2 + Django REST Framework + SimpleJWT
- Frontend: React + Vite + Tailwind CSS + axios
- Base de datos: PostgreSQL
- Auth: JWT con access token (1 día) + refresh token (7 días)
- Almacenamiento actual de tokens: localStorage

Reglas para cada corrección:
1. Muestra el código ANTES y DESPUÉS con la corrección.
2. Explica en máximo 3 líneas por qué resuelve la vulnerabilidad.
3. Si hay pasos de migración, listarlos numerados.
4. No cambies funcionalidad, solo hardening.

---

TAREA 1 — Credenciales en settings.py
El archivo tiene credenciales reales como defaults:
  SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-focusia-dev-key-2026')
  'PASSWORD': os.environ.get('DB_PASSWORD', 'Enero4432#')
  DEBUG = os.environ.get('DEBUG', 'True') == 'True'
Genera: a) settings.py sin ningún default con valor real, lanzar ImproperlyConfigured si falta la variable. b) .env.example completo. c) Instrucción para rotar SECRET_KEY.

---

TAREA 2 — JWT en localStorage → cookies HttpOnly
Actualmente Auth.tsx guarda tokens en localStorage y api.ts los lee.
Genera: a) Vista Django para /api/token/ que setee cookies HttpOnly + SameSite=Strict + Secure. b) Vista /api/token/logout/ que elimine las cookies. c) Auth.tsx y api.ts actualizados con withCredentials:true, sin localStorage. d) App.tsx verificando sesión con GET /api/users/me/.

---

TAREA 3 — CORS wildcard + sin rate limiting
CORS_ALLOW_ALL_ORIGINS = True y sin throttling.
Genera: a) CORS_ALLOWED_ORIGINS desde variable de entorno + CORS_ALLOW_CREDENTIALS=True. b) Throttling en REST_FRAMEWORK: 5/min anon, 100/min user. c) LoginRateThrottle personalizado aplicado a la vista de token.

---

TAREA 4 — API key de Gemini en el frontend
AiMissionAssistant.tsx llama a Gemini directamente con una API key.
Genera: a) Vista Django POST /api/ai/mission/ que proxee la llamada a Gemini desde el servidor. b) Serializer con validación de input. c) AiMissionAssistant.tsx refactorizado para llamar al endpoint propio.

---

TAREA 5 — IDOR por IDs secuenciales
BaseUserViewSet no valida ownership en operaciones destructivas.
Genera: a) Mixin IsMineOrReadOnly que retorne 404 si obj.user != request.user. b) Campo uuid en KanbanTask (sin cambiar PK). c) Serializer y api.ts actualizados para usar uuid como identificador público.

---

TAREA 6 — Sin cabeceras de seguridad
No hay CSP, HSTS, X-Frame-Options configurados.
Genera: a) Configuración completa en settings.py. b) Middleware SecurityHeadersMiddleware con CSP adaptada a los dominios externos que usa Focusia (open-meteo, nominatim, ui-avatars, unsplash). c) Instrucción para ajustar en desarrollo.

---

TAREA 7 — Sin validadores de contraseña ni logging
AUTH_PASSWORD_VALIDATORS = [] y sin logs de seguridad.
Genera: a) AUTH_PASSWORD_VALIDATORS completo con los 4 validadores Django. b) Configuración LOGGING a archivo security.log. c) Decorador @log_security_event aplicado a acciones críticas (delete account, change role, accept invitation).

---

TAREA 8 — Tokens de delegación sin expiración
El modelo Delegation no tiene expires_at. Invitaciones expiran en 7 días.
Genera: a) Migración para agregar expires_at a Delegation (default: +72h). b) Validación de expiración en las vistas. c) Reducir invitaciones a 48h. d) Management command cleanup_expired_tokens programado en django-q2.


mision#8: Actúa como un Ingeniero de Software Full-Stack Experto en React, Tailwind CSS, Django y PostgreSQL. Necesito implementar un flujo de Onboarding completo de 11 pantallas para la aplicación basándome en el siguiente diagnóstico y plan de refactorización.

---

### 1. OBJETIVO GENERAL
Mover la selección de avatar del modal de perfil post-login al flujo de entrada, crear una experiencia de onboarding de 11 pantallas persistente, y asegurar que el usuario no pueda acceder al Dashboard sin haber completado este flujo.

---

### 2. BACKEND (Django & PostgreSQL)
Modifica el modelo de usuario y crea el endpoint necesario para dar persistencia al flujo:

1. **Campos en el Modelo User:** Añade los 8 campos necesarios para almacenar el progreso del onboarding (ej. `onboarding_completed` (Boolean), `avatar_url` (String), y los campos específicos para las respuestas de las pantallas del onboarding).
2. **Endpoint:** Crea un endpoint `PATCH /api/users/me/onboarding/` que permita actualizar el progreso pantalla a pantalla o al finalizar el flujo.
3. **Serializers:** Asegura que el endpoint de autenticación actual y el de `/api/users/me/` devuelvan el estado de `onboarding_completed`.

---

### 3. FRONTEND: REESTRUCTURACIÓN DE APP.TSX (Control de Rutas)
Actualmente, `App.tsx` evalúa el acceso de la siguiente manera:
- `token en localStorage` ➔ Redirige a `<Dashboard />`

Debes refactorizar la lógica de enrutamiento para que funcione así:
- `token en localStorage` ➔ Verificar `onboarding_completed` (desde el estado global o fetch inicial).
  - Si `onboarding_completed === true` ➔ Redirige a `<Dashboard />`
  - Si `onboarding_completed === false` ➔ Redirige y renderiza `<OnboardingFlow />`

---

### 4. FRONTEND: COMPONENTE ONBOARDINGFLOW (11 Pantallas)
Crea un componente contenedor `<OnboardingFlow />` en React que maneje el estado del paso actual (`step`).

**Lineamientos de diseño y UI (Tailwind CSS):**
- **Reutilización de Avatares:** Mueve la lógica de selección de los 6 avatares (actualmente en el modal de perfil post-login) a la pantalla correspondiente de este flujo. Corrige el path de las imágenes de `/avartars/` a `/avatars/`.
- **Formularios y Validación:** Integra o sigue el estándar de validación ya usado en `Auth.tsx`.
- **MVP de Videos:** Para las pantallas que solicitan videos de 10-20 segundos, sustitúyelos temporalmente por animaciones fluidas con CSS o Lottie (con un contenedor preparado para cambiar fácilmente a una etiqueta `<video>` en el futuro).
- **Persistencia:** Al avanzar entre bloques clave o al dar click en "Finalizar" en la pantalla 11, realiza la petición al endpoint `PATCH` para guardar las respuestas y marcar `onboarding_completed: true`, redirigiendo automáticamente al Dashboard.
- **Sistema de Notificaciones:** Usa el sistema de notificaciones global ya existente en la app para mostrar errores de validación o éxito al guardar.

---

### REQUERIMIENTO DE SALIDA
Por favor, genera:
1. El código de la migración de Django y la actualización del modelo/vista.
2. El código refactorizado de `App.tsx` con el nuevo control de flujo.
3. La estructura base del componente `<OnboardingFlow />` y el manejo de sus 11 estados o pantallas en React.

Proporciona un código limpio, modular, bien tipado con TypeScript (para el frontend) y listo para producción.

🌍 Misión #9: Despliegue a Producción (Go-Live)
Objetivo: Lanzar la aplicación a una URL pública.

Prompt:
"Actúa como Ingeniero DevOps. Tu misión es poner Focusia en línea para clientes reales.

Frontend: Despliega en Vercel, optimizando activos para carga rápida.

Backend: Despliega en Railway configurando variables de entorno (SECRET_KEY, DB_URL, STRIPE_KEY).

Base de Datos: Migra los datos a PostgreSQL en la nube.

Seguridad: Activa SSL (HTTPS), desactiva DEBUG = True y configura la Whitelist de CORS para que solo el dominio de Focusia acceda a la API."

#mision de auditoria 

Eres un auditor de producto especializado en apps de productividad y planificación estratégica. Tu tarea es evaluar si la aplicación FOCUSIA cumple con los requisitos de su definición original, basándote en la siguiente especificación:

DEFINICIÓN DEL PRODUCTO
Visión: Focusia es un sistema de dirección estratégica personal que transforma intención en ejecución medible. No es una agenda ni una lista de tareas. Guía al usuario en 5 niveles: (1) diagnóstico personal con Rueda de la Vida, (2) definición de Gran Meta Anual, (3) construcción de 12 Objetivos Mensuales, (4) planificación estratégica semanal, (5) ejecución diaria con seguimiento visual.
Público objetivo: Adultos mayores de 40 años con múltiples responsabilidades (laborales, familiares, financieras), en procesos de reinvención o crecimiento personal, que necesitan estructura — no motivación.
Promesa de valor: El usuario toma decisiones estratégicas, no acumula pendientes. Cada acción se traduce en progreso visible hacia su gran meta anual.
Funcionalidades MVP obligatorias a verificar:

Motor de Dirección Anual (diagnóstico + Rueda de la Vida + Gran Meta + 12 objetivos mensuales automáticos)
Sistema de Objetivos Mensuales con Matriz de Eisenhower inteligente
Microcapacitaciones previas a la acción (gestión del tiempo, hábitos, toma de decisiones)
Planificación Semanal Estratégica con conexión visible a objetivo mensual
Agenda inteligente con recordatorios estratégicos (incluye simulación de llamada y mensajes tipo WhatsApp)
Panel de Desarrollo de Habilidades (métricas de autodisciplina, constancia, gestión del tiempo)
Sistema de Recompensa Estratégica (logros, reportes de progreso acumulado)
Interfaz por niveles: Básico / Intermedio / Avanzado
Panel "Enfoque Hoy" (meta anual + objetivo mensual + 3 acciones del día + estado semanal)
Compañero Estratégico Permanente (retroalimentación, detección de desviaciones, ajustes)
Simplicidad de uso: máx. 3 decisiones por pantalla, configuración en 7 minutos, modo "Solo Hoy"

Valor diferencial a validar:

Conexión coherente entre agenda diaria ↔ objetivos mensuales ↔ meta anual
Integración de formación práctica dentro del flujo de planificación
Espacios de enfoque mental y gratitud (respaldo neurocientífico)
El sistema reduce carga cognitiva, no la aumenta


TU TAREA:
Con base en lo que te presento del estado actual de la app (descripción, capturas, flujos o código), evalúa:

✅ ¿Qué requisitos se cumplen correctamente?
⚠️ ¿Cuáles están parcialmente implementados?
❌ ¿Cuáles están ausentes o desalineados con la visión?
🔍 ¿Hay elementos implementados que contradicen la propuesta de valor o el público objetivo?
📋 Genera una tabla de cumplimiento con puntaje del 1 al 5 por cada funcionalidad MVP.

Sé directo, específico y constructivo. El objetivo es identificar brechas reales entre la visión del producto y lo que existe hoy.