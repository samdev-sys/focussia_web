// Pasos de la visita guiada Focusia — orden y mensajes aprobados (§20.1–20.25).
export interface FocusiaTourStep {
  id: string;
  element: string;
  title: string;
  description: string;
}

export const TOUR_AVATAR = '/avartars/Lia.jpeg';

export const FOCUSIA_TOUR_STEPS: FocusiaTourStep[] = [
  {
    id: 'inicio',
    element: '#tour-inicio-btn',
    title: 'INICIO',
    description:
      'Este es tu botón de inicio. Desde aquí puedes volver al punto central de Focusia, entrar al dashboard completo, revisar el tutorial o ajustar tu configuración cuando lo necesites.',
  },
  {
    id: 'rueda',
    element: '#tour-rueda-btn',
    title: 'RUEDA',
    description:
      'Aquí comienza tu diagnóstico personal. La Rueda de la Vida te ayuda a observar cómo están las áreas principales de tu vida, para tomar decisiones con más claridad y no planificar desde la improvisación.',
  },
  {
    id: 'anual',
    element: '#tour-anual-btn',
    title: 'ANUAL',
    description:
      'Este es tu espacio anual. Aquí definirás tu gran meta del año: una dirección clara que servirá como guía para tus objetivos mensuales, tu planificación semanal y tus acciones diarias.',
  },
  {
    id: 'mensual',
    element: '#tour-mensual-btn',
    title: 'MENSUAL',
    description:
      'Aquí organizarás tu meta anual en objetivos mensuales. Cada mes será un bloque estratégico de avance, para que tu gran meta no quede como una idea lejana, sino como un camino concreto.',
  },
  {
    id: 'semanal',
    element: '#tour-semanal-btn',
    title: 'SEMANAL',
    description:
      'Aquí organizarás tu semana. Focusia te ayuda a convertir tu objetivo mensual en acciones concretas, para que cada semana tenga dirección, prioridad y avance real.',
  },
  {
    id: 'kanban_backlog',
    element: '#tour-kanban',
    title: 'KANBAN BACKLOG',
    description:
      'Este es tu Kanban Backlog. Aquí puedes ordenar tareas, ideas o acciones pendientes antes de decidir cuándo ejecutarlas. Te ayuda a no perder nada importante y a mantener tu planificación más limpia.',
  },
  {
    id: 'objetivo_semana',
    element: '#tour-mision-semanal',
    title: 'OBJETIVO DE LA SEMANA',
    description:
      'Este es tu Objetivo de la Semana. Aquí defines el foco principal que guiará tus próximos días, para que tus acciones no se dispersen y sigan conectadas con tu objetivo mensual.',
  },
  {
    id: 'mision_hoy',
    element: '#tour-mision-semanal',
    title: 'MI MISIÓN DE HOY',
    description:
      'Esta es tu Misión de Hoy. Aquí eliges la acción más importante del día: esa tarea que realmente mueve tu avance y que conecta con lo que tú mismo definiste como prioridad.',
  },
  {
    id: 'agenda_diaria',
    element: '#tour-diaria-btn',
    title: 'DIARIA / AGENDA DIARIA',
    description:
      'Esta es tu agenda diaria. Aquí organizas lo que harás hoy, conectando tus tareas con tu misión, tu objetivo semanal y tu avance real.',
  },
  {
    id: 'time_blocking',
    element: '#tour-timeblocking',
    title: 'TIME BLOCKING',
    description:
      'Este es tu Time Blocking. Aquí puedes organizar tu día por bloques de tiempo, para que tus acciones no queden solo como pendientes, sino como espacios concretos e INNEGOCIABLES dentro de tu jornada.',
  },
  {
    id: 'wip_status',
    element: '#tour-wip-status',
    title: 'WORK IN PROGRESS / STATUS',
    description:
      'Aquí verás el estado de tus acciones. Focusia te mostrará qué está pendiente, qué está en proceso y qué ya completaste, para que tengas claridad sobre tu avance real.',
  },
  {
    id: 'fechas_importantes',
    element: '#tour-fechas',
    title: 'FECHAS IMPORTANTES',
    description:
      'Aquí puedes registrar tus fechas importantes. Focusia te ayudará a recordarlas con anticipación, para que no solo las tengas anotadas, sino que puedas prepararte antes de que lleguen.',
  },
  {
    id: 'acciones_delegar',
    element: '#tour-delegar',
    title: 'ACCIONES POR DELEGAR',
    description:
      'Aquí puedes registrar acciones que no necesariamente debes hacer tú. Focusia te ayuda a identificar qué puedes delegar, para liberar carga, cuidar tu foco y avanzar con mayor claridad.',
  },
  {
    id: 'gratitud',
    element: '#tour-gratitud-btn',
    title: 'GRATITUD',
    description:
      'Este es tu espacio de gratitud. Aquí puedes detenerte un momento y registrar algo valioso de tu día. Focusia no solo busca que avances, también que tomes conciencia de lo que ya estás construyendo.',
  },
  {
    id: 'coaching',
    element: '#tour-coaching-btn',
    title: 'COACHING',
    description:
      'Este es tu espacio de coaching. Aquí encontrarás orientación y herramientas prácticas para fortalecer tus decisiones, tu disciplina y tu capacidad de avanzar con más claridad.',
  },
  {
    id: 'tribu',
    element: '#tour-tribu-btn',
    title: 'TRIBU',
    description:
      'Este es tu espacio de Tribu. Aquí podrás conectar con apoyo, comunidad e inspiración, para que tu proceso no dependa solo de ti, sino también de un entorno que refuerce tu avance.',
  },
  {
    id: 'cursos',
    element: '#tour-cursos-btn',
    title: 'CURSOS',
    description:
      'Este es tu espacio de Cursos. Aquí podrás acceder a contenidos más estructurados para fortalecer tus habilidades, mejorar tu forma de organizarte y avanzar con mayor preparación.',
  },
  {
    id: 'rrss',
    element: '#tour-rrss-btn',
    title: 'RRSS',
    description:
      'Este es tu espacio de RRSS. Aquí puedes organizar tus redes sociales, ideas de contenido o presencia digital, para que tu actividad online tenga más orden, intención y dirección.',
  },
  {
    id: 'cuentas',
    element: '#tour-cuentas-btn',
    title: 'CUENTAS',
    description:
      'Este es tu espacio de Cuentas. Aquí puedes organizar información administrativa o financiera importante, para mantener mayor claridad sobre compromisos, pagos y datos que no quieres perder de vista.',
  },
  {
    id: 'medicamentos',
    element: '#tour-suplementos-btn',
    title: 'MEDICAMENTOS',
    description:
      'Este es tu espacio de Medicamentos. Aquí puedes registrar recordatorios relacionados con tu cuidado personal, para que Focusia te ayude a no olvidar acciones importantes de salud que tú mismo hayas definido.',
  },
  {
    id: 'cumpleanos',
    element: '#tour-cumpleanos-btn',
    title: 'CUMPLEAÑOS',
    description:
      'Este es tu espacio de Cumpleaños. Aquí puedes registrar fechas importantes de personas relevantes para ti, para que Focusia te ayude a recordarlas con anticipación y puedas prepararte a tiempo.',
  },
  {
    id: 'focus',
    element: '#tour-focus-btn',
    title: 'FOCUS',
    description:
      'Este es tu espacio Focus. Aquí puedes volver a centrarte en lo importante, recuperar claridad y dirigir tu atención hacia aquello que realmente necesita tu enfoque en este momento.',
  },
  {
    id: 'clima_comuna',
    element: '#tour-clima',
    title: 'CLIMA EN MI COMUNA',
    description:
      'Aquí puedes ver el clima de tu comuna. Focusia te ayuda a considerar esta información para planificar mejor tu día, anticipar traslados, ajustar actividades y tomar decisiones con más contexto.',
  },
  {
    id: 'notas',
    element: '#tour-notas',
    title: 'KEEP / BLOCK DE NOTAS',
    description:
      'Este es tu block de notas. Aquí puedes guardar ideas, apuntes o información rápida para no perder nada importante y mantener tu mente más despejada.',
  },
  {
    id: 'bienestar_complementario',
    element: '#tour-humor',
    title: 'HUMOR / EJERCICIOS / HOBBIES / VIAJES / DIVERSIÓN / REFLEXIÓN',
    description:
      'Estos espacios te ayudan a cuidar tu bienestar y tu vida personal. Aquí puedes organizar momentos de humor, ejercicio, hobbies, viajes, diversión y reflexión, para que tu planificación no solo sea productiva, sino también significativa.',
  },
];
