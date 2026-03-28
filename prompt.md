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

MisionHoy: URL de la imagen de la misión del día.

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

🌍 Misión #7: Despliegue a Producción (Go-Live)
Objetivo: Lanzar la aplicación a una URL pública.

Prompt:
"Actúa como Ingeniero DevOps. Tu misión es poner Focusia en línea para clientes reales.

Frontend: Despliega en Vercel, optimizando activos para carga rápida.

Backend: Despliega en Railway configurando variables de entorno (SECRET_KEY, DB_URL, STRIPE_KEY).

Base de Datos: Migra los datos a PostgreSQL en la nube.

Seguridad: Activa SSL (HTTPS), desactiva DEBUG = True y configura la Whitelist de CORS para que solo el dominio de Focusia acceda a la API."