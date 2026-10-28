import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // URLs where 401 is expected for unauthenticated users - do NOT attempt refresh and suppress retry
    // Covers /api/users/me/, /api/onboarding/profile/status/, /api/onboarding/profile/summary/ and generic /onboarding/status
    const isExpectedUnauthorized =
      originalRequest?.url?.includes('/users/me') ||
      originalRequest?.url?.includes('/onboarding/profile/status') ||
      originalRequest?.url?.includes('/onboarding/profile/summary') ||
      originalRequest?.url?.includes('/onboarding/status');

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/token/') &&
      !isExpectedUnauthorized
    ) {
      originalRequest._retry = true;

      try {
        await axios.post(`${API_BASE_URL}/api/token/refresh/`, {}, { withCredentials: true });
        return api(originalRequest);
      } catch {
        return Promise.reject(error);
      }
    }

    // For expected 401s (unauthenticated initial checks), silently reject without triggering retry
    // This prevents "Failed to load resource: 401" spam in console for unauthenticated users
    if (error.response?.status === 401 && isExpectedUnauthorized) {
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export interface RuedaVidaData {
  id: number;
  salud: number;
  amistad: number;
  dinero: number;
}

export interface TimeBlockData {
  id: number;
  fecha: string;
  hora: number;
  tarea: string;
  estado: 'pending' | 'doing' | 'done';
}

export interface KanbanTaskData {
  id: number;
  titulo: string;
  descripcion: string;
  columna: string;
  fecha_hora?: string;
}

export interface KanbanActionData {
  id: string;
  title: string;
  source: 'USER_INPUT' | 'RUEDA_VIDA_SUGGESTION';
  classification_status: 'PENDIENTE' | 'HACER' | 'PLANIFICAR' | 'DELEGAR' | 'ELIMINAR';
  scheduled_date: string | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}


export interface MatrixItemData {
  id: number;
  task: string;
  quadrant: 'do' | 'schedule' | 'delegate' | 'eliminate';
  is_done: boolean;
}

export interface MatrizEisenhowerData {
  id: number;
  status: 'INCOMPLETO' | 'EN_PROGRESO' | 'COMPLETADO';
  video_watched: boolean;
  started_at?: string | null;
  completed_at: string | null;
  correct_count?: number;
  incorrect_count?: number;
  error_quadrants?: string[];
  last_step?: number;
}

export interface FacturaData {
  id: number;
  nombre: string;
  monto: number;
  fecha_vencimiento: string;
  pagado: boolean;
}

const SESSION_KEY = 'focusia_session';

export const authService = {
  hasSession: (): boolean => {
    try {
      return localStorage.getItem(SESSION_KEY) === '1';
    } catch {
      return true;
    }
  },
  markSession: (active: boolean) => {
    try {
      if (active) localStorage.setItem(SESSION_KEY, '1');
      else localStorage.removeItem(SESSION_KEY);
    } catch {}
  },
  login: async (username: string, password: string) => {
    const response = await api.post('/api/token/', { username, password });
    authService.markSession(true);
    return response.data;
  },
  
  getCurrentUser: async () => {
    const response = await api.get('/api/users/me/');
    return response.data;
  },
  
  register: async (username: string, email: string, password: string) => {
    const response = await api.post('/api/users/', { username, email, password });
    authService.markSession(true);
    return response.data;
  },
  updateProfile: async (data: { username?: string; avatar_url?: string }): Promise<any> => {
    const response = await api.patch('/api/users/me/', data);
    return response.data;
  },
  deleteAccount: async (): Promise<void> => {
    await api.delete('/api/users/me/');
  },
  logout: async (): Promise<void> => {
    try {
      await api.post('/api/token/logout/');
    } finally {
      authService.markSession(false);
    }
  },

  googleLogin: async (idToken: string) => {
    const response = await api.post('/api/auth/google/', { id_token: idToken });
    authService.markSession(true);
    return response.data;
  },

  microsoftLogin: async (accessToken: string) => {
    const response = await api.post('/api/auth/microsoft/', { access_token: accessToken });
    authService.markSession(true);
    return response.data;
  },

  passwordResetRequest: async (email: string) => {
    const response = await api.post('/api/password-reset/request/', { email });
    return response.data;
  },

  passwordResetConfirm: async (token: string, newPassword: string) => {
    const response = await api.post('/api/password-reset/confirm/', { token, new_password: newPassword });
    return response.data;
  },
};


export const ruedaVidaService = {
  get: async (): Promise<RuedaVidaData> => {
    const response = await api.get('/api/rueda-vida/');
    return response.data;
  },
  
  update: async (data: Partial<RuedaVidaData>): Promise<RuedaVidaData> => {
    const response = await api.patch('/api/rueda-vida/', data);
    return response.data;
  },
};

export const timeBlockService = {
  getAll: async (): Promise<TimeBlockData[]> => {
    const response = await api.get('/api/time-blocks/');
    return response.data;
  },
  
  update: async (id: number, data: Partial<TimeBlockData>): Promise<TimeBlockData> => {
    const response = await api.patch(`/api/time-blocks/${id}/`, data);
    return response.data;
  },
  
  create: async (data: Omit<TimeBlockData, 'id'>): Promise<TimeBlockData> => {
    const response = await api.post('/api/time-blocks/', data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/time-blocks/${id}/`);
  },
};

export const kanbanService = {
  getAll: async (): Promise<KanbanTaskData[]> => {
    const response = await api.get('/api/kanban-tasks/');
    return response.data;
  },
  
  update: async (id: number, data: Partial<KanbanTaskData>): Promise<KanbanTaskData> => {
    const response = await api.patch(`/api/kanban-tasks/${id}/`, data);
    return response.data;
  },
  
  create: async (data: Omit<KanbanTaskData, 'id'>): Promise<KanbanTaskData> => {
    const response = await api.post('/api/kanban-tasks/', data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/kanban-tasks/${id}/`);
  },
};

export const kanbanActionService = {
  getActive: async (): Promise<KanbanActionData[]> => {
    const response = await api.get('/api/kanban-actions/active/');
    return response.data;
  },

  add: async (title: string): Promise<KanbanActionData> => {
    const response = await api.post('/api/kanban-actions/add/', { title });
    return response.data;
  },

  classify: async (id: string, decision: 'H' | 'P' | 'D' | 'E', scheduledDate?: string): Promise<KanbanActionData> => {
    const payload: Record<string, string> = { decision };
    if (scheduledDate) payload.scheduled_date = scheduledDate;
    const response = await api.patch(`/api/kanban-actions/classify/${id}/`, payload);
    return response.data;
  },

  pin: async (id: string): Promise<KanbanActionData> => {
    const response = await api.patch(`/api/kanban-actions/pin/${id}/`);
    return response.data;
  },
};


export interface ObjetivoSemanaData {
  id: number;
  texto1: string;
  texto2: string;
  texto3: string;
}

export interface KeepNotaData {
  id: number;
  contenido: string;
}

export interface MisionHoyData {
  id: number;
  imagen_url: string;
}

export const objetivoSemanaService = {
  get: async (): Promise<ObjetivoSemanaData[]> => {
    const response = await api.get('/api/objetivo-semana/');
    return response.data;
  },
  update: async (id: number, data: Partial<ObjetivoSemanaData>): Promise<ObjetivoSemanaData> => {
    const response = await api.patch(`/api/objetivo-semana/${id}/`, data);
    return response.data;
  },
  create: async (data: Omit<ObjetivoSemanaData, 'id'>): Promise<ObjetivoSemanaData> => {
    const response = await api.post('/api/objetivo-semana/', data);
    return response.data;
  }
};

export const keepNotaService = {
  get: async (): Promise<KeepNotaData[]> => {
    const response = await api.get('/api/keep-nota/');
    return response.data;
  },
  update: async (id: number, data: Partial<KeepNotaData>): Promise<KeepNotaData> => {
    const response = await api.patch(`/api/keep-nota/${id}/`, data);
    return response.data;
  },
  create: async (data: Omit<KeepNotaData, 'id'>): Promise<KeepNotaData> => {
    const response = await api.post('/api/keep-nota/', data);
    return response.data;
  }
};

export const misionHoyService = {
  get: async (): Promise<MisionHoyData[]> => {
    const response = await api.get('/api/mision-hoy/');
    return response.data;
  },
  update: async (id: number, data: Partial<MisionHoyData>): Promise<MisionHoyData> => {
    const response = await api.patch(`/api/mision-hoy/${id}/`, data);
    return response.data;
  },
  create: async (data: Omit<MisionHoyData, 'id'>): Promise<MisionHoyData> => {
    const response = await api.post('/api/mision-hoy/', data);
    return response.data;
  }
};

export interface RecordatorioData {
  id: number;
  titulo: string;
  categoria: string;
  fecha_hora: string;
  activo: boolean;
  tomado: boolean;
}

export const recordatorioService = {
  getAll: async (): Promise<RecordatorioData[]> => {
    const response = await api.get('/api/recordatorios/');
    return response.data;
  },
  getDue: async (): Promise<RecordatorioData[]> => {
    const response = await api.get('/api/recordatorios/due/');
    return response.data;
  },
  getPendientes: async (): Promise<RecordatorioData[]> => {
    const response = await api.get('/api/recordatorios/pendientes/');
    return response.data;
  },
  create: async (data: Omit<RecordatorioData, 'id'>): Promise<RecordatorioData> => {
    const response = await api.post('/api/recordatorios/', data);
    return response.data;
  },
  update: async (id: number, data: Partial<RecordatorioData>): Promise<RecordatorioData> => {
    const response = await api.patch(`/api/recordatorios/${id}/`, data);
    return response.data;
  },
  marcarTomado: async (id: number): Promise<RecordatorioData> => {
    const response = await api.post(`/api/recordatorios/${id}/marcar_tomado/`);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/recordatorios/${id}/`);
  }
};

export type SuplementoTipo = 'Suplemento' | 'Medicamento';
export type SuplementoEstado = 'al_dia' | 'proxima' | 'pendiente' | 'finalizado';

export interface SuplementoTomaData {
  id: number;
  hora: string;
  tomado: boolean;
}

export interface SuplementoData {
  id: number;
  nombre: string;
  tipo: SuplementoTipo;
  presentacion: string;
  frecuencia_horas: number;
  frecuencia_label: string;
  detalle: string;
  hora_primera: string;
  duracion_dias: number | null;
  dia_actual: number | null;
  dias_totales: number | null;
  finalizado: boolean;
  activo: boolean;
  estado: SuplementoEstado;
  retraso_min: number;
  proxima_toma: string | null;
  proxima_toma_hora: string | null;
  proxima_dia: 'hoy' | 'mañana' | 'otro' | null;
  tomas_hoy: SuplementoTomaData[];
  total_tomado: number;
}

export interface SuplementoTablero {
  activos: SuplementoData[];
  historial: SuplementoData[];
}

export const suplementoService = {
  tablero: async (): Promise<SuplementoTablero> => {
    const response = await api.get('/api/suplementos/tablero/');
    return response.data;
  },
  create: async (data: {
    nombre: string;
    tipo: SuplementoTipo;
    presentacion?: string;
    frecuencia_horas: number;
    hora_primera: string;
    duracion_dias?: number | null;
  }): Promise<SuplementoData> => {
    const response = await api.post('/api/suplementos/', data);
    return response.data;
  },
  marcarTomado: async (id: number): Promise<SuplementoData> => {
    const response = await api.post(`/api/suplementos/${id}/marcar_tomado/`);
    return response.data;
  },
  eliminar: async (id: number): Promise<void> => {
    await api.delete(`/api/suplementos/${id}/`);
  },
};

/* ──────────────────────────────────────────────────────────────────────────
   Doc 24 · Hora de Oro Familiar
   ────────────────────────────────────────────────────────────────────────── */

export interface HoraOroExperienciaData {
  id: number;
  dia_semana: string;
  posicion: number;
  categoria: string;
  actividad: string;
  realizada: boolean;
  realizada_en: string | null;
  created_at: string;
}

export interface HoraOroDia {
  dia: string;
  experiencias: HoraOroExperienciaData[];
  puede_agregar: boolean;
  siguiente_posicion: number;
  espacios_iniciales: number;
}

export interface HoraOroPlanificador {
  dias: HoraOroDia[];
  total: number;
}

export interface HoraOroCategoria {
  nombre: string;
  emoji: string;
  color: string;
  actividades: string[];
}

export interface HoraOroEstadisticas {
  mes: number;
  anio: number;
  horas: { minutos: number; delta: number | null };
  experiencias: { total: number; delta: number | null };
  dias: { porcentaje: number; delta: number | null };
}

export interface HoraOroRealizadas {
  total: number;
  items: {
    id: number;
    actividad: string;
    categoria: string;
    dia_semana: string;
    realizada_en: string;
  }[];
}

export interface HoraOroAjustes {
  recordatorio_activo: boolean;
  hora_recordatorio: string;
}

export const horaOroService = {
  planificador: async (): Promise<HoraOroPlanificador> => {
    const response = await api.get('/api/hora-oro/planificador/');
    return response.data;
  },
  catalogo: async (): Promise<HoraOroCategoria[]> => {
    const response = await api.get('/api/hora-oro/catalogo/');
    return response.data.categorias;
  },
  guardar: async (data: {
    dia_semana: string;
    posicion: number;
    categoria: string;
    actividad: string;
  }): Promise<{ experiencia: HoraOroExperienciaData; dia: HoraOroDia }> => {
    const response = await api.post('/api/hora-oro/', data);
    return response.data;
  },
  eliminar: async (id: number): Promise<{ dia: HoraOroDia }> => {
    const response = await api.post(`/api/hora-oro/${id}/eliminar/`);
    return response.data;
  },
  otraIdea: async (
    categoria: string,
    excluir: string[],
  ): Promise<{ actividad: string; categoria: string; fuente: string }> => {
    const response = await api.post('/api/hora-oro/otra_idea/', { categoria, excluir });
    return response.data;
  },
  realizar: async (
    id: number,
    realizada = true,
  ): Promise<{ experiencia: HoraOroExperienciaData }> => {
    const response = await api.post(`/api/hora-oro/${id}/realizar/`, { realizada });
    return response.data;
  },
  realizadas: async (): Promise<HoraOroRealizadas> => {
    const response = await api.get('/api/hora-oro/realizadas/');
    return response.data;
  },
  estadisticas: async (): Promise<HoraOroEstadisticas> => {
    const response = await api.get('/api/hora-oro/estadisticas/');
    return response.data;
  },
  ajustes: async (): Promise<HoraOroAjustes> => {
    const response = await api.get('/api/hora-oro/ajustes/');
    return response.data;
  },
  guardarAjustes: async (data: Partial<HoraOroAjustes>): Promise<HoraOroAjustes> => {
    const response = await api.post('/api/hora-oro/ajustes/', data);
    return response.data;
  },
};

/* ── Módulo Gratitud (Doc 19) ── */

export interface GratitudFrase {
  id: number;
  texto: string;
  autor: string;
  obra: string;
  anio: string;
}

export interface GratitudHoy {
  fecha: string;
  pregunta: string;
  frase: GratitudFrase | null;
  respuesta: string;
  guardado_en: string;
}

export const gratitudService = {
  hoy: async (): Promise<GratitudHoy> => {
    const response = await api.get('/api/gratitud/hoy/');
    return response.data;
  },
  /** Guardado automático del campo libre: no existe botón de guardar. */
  guardar: async (texto: string): Promise<GratitudHoy> => {
    const response = await api.patch('/api/gratitud/hoy/', { texto });
    return response.data;
  },
};

export interface RuedaCategoria {
  id: number;
  nombre: string;
  icono: string;
  puntaje: number;
  comentario: string;
}

export interface DiagnosticoRuedaData {
  id?: number;
  status?: string;
  promedio_general: number;
  nivel_equilibrio: string;
  pico_alto: string;
  pico_bajo: string;
  foco_1: string;
  foco_2: string;
  foco_3: string;
  justificacion_focos: string;
  ai_summary?: string;
  creado?: string;
  actualizado?: string;
  focus_areas?: FocusAreaData[];
}

export interface FocusAreaData {
  id: number;
  diagnostico: number;
  area: string;
  score: number;
  reason: string;
  priority_order: number;
}

export interface AccionSugeridaData {
  id: number;
  area_foco: string;
  texto: string;
  batch_number?: number;
  enviada_kanban: boolean;
  creado: string;
}

export interface ResumenRuedaDashboard {
  tiene_diagnostico: boolean;
  foco_1?: string;
  foco_2?: string;
  foco_3?: string;
  nivel_equilibrio?: string;
  promedio_general?: number;
  promedio_actual?: number;
  puntajes?: { nombre: string; puntaje: number }[];
  status?: string;
  ai_summary?: string;
}

export interface FocusAreaDetail {
  focus_area: FocusAreaData;
  acciones: AccionSugeridaData[];
  total_acciones: number;
  disponibles: number;
}

export interface RecomendarAccionesResponse {
  acciones: AccionSugeridaData[];
  total_area: number;
  disponibles: number;
  batch_generado: number;
}

export const ruedaService = {
  getCompleta: async (): Promise<RuedaCategoria[]> => {
    const response = await api.get('/api/rueda-vida-completa/');
    return response.data;
  },
  guardar: async (puntajes: Record<number, number>, comentarios?: Record<string, string>): Promise<void> => {
    const payload: any = { puntajes };
    if (comentarios) payload.comentarios = comentarios;
    await api.post('/api/rueda-vida-completa/', payload);
  },
  generarDiagnostico: async (puntajes: Record<number, number>, comentarios?: Record<string, string>): Promise<DiagnosticoRuedaData> => {
    const response = await api.post('/api/rueda/generar-diagnostico/', { puntajes, comentarios });
    return response.data;
  },
  verDiagnostico: async (): Promise<{ diagnostico: DiagnosticoRuedaData | null }> => {
    const response = await api.get('/api/rueda/diagnostico/');
    return response.data;
  },
  generarAcciones: async (areaFoco: string): Promise<{ acciones: AccionSugeridaData[]; total_area: number; disponibles: number }> => {
    const response = await api.post('/api/rueda/generar-acciones/', { area_foco: areaFoco });
    return response.data;
  },
  listarAcciones: async (areaFoco?: string): Promise<AccionSugeridaData[]> => {
    const params = areaFoco ? `?area_foco=${encodeURIComponent(areaFoco)}` : '';
    const response = await api.get(`/api/rueda/acciones/${params}`);
    return response.data;
  },
  enviarAccionKanban: async (accionId: number): Promise<void> => {
    await api.post('/api/rueda/enviar-accion-kanban/', { accion_id: accionId });
  },
  resumenDashboard: async (): Promise<ResumenRuedaDashboard> => {
    const response = await api.get('/api/rueda/resumen-dashboard/');
    return response.data;
  },
  verDetalleFoco: async (area: string): Promise<FocusAreaDetail> => {
    const response = await api.get(`/api/rueda/foco/${encodeURIComponent(area)}/`);
    return response.data;
  },
  recomendarAccionesFoco: async (area: string): Promise<RecomendarAccionesResponse> => {
    const response = await api.post(`/api/rueda/foco/${encodeURIComponent(area)}/acciones/`);
    return response.data;
  },
  eliminarAccion: async (accionId: number): Promise<void> => {
    await api.delete(`/api/rueda/accion/${accionId}/eliminar/`);
  },
};

export const matrixService = {
  getAll: async (): Promise<MatrixItemData[]> => {
    const response = await api.get('/api/matrix-items/');
    return response.data;
  },
  create: async (data: Omit<MatrixItemData, 'id'>): Promise<MatrixItemData> => {
    const response = await api.post('/api/matrix-items/', data);
    return response.data;
  },
  update: async (id: number, data: Partial<MatrixItemData>): Promise<MatrixItemData> => {
    const response = await api.patch(`/api/matrix-items/${id}/`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/matrix-items/${id}/`);
  }
};

export const billService = {
  getAll: async (): Promise<FacturaData[]> => {
    const response = await api.get('/api/facturas/');
    return response.data;
  },
  create: async (data: Omit<FacturaData, 'id'>): Promise<FacturaData> => {
    const response = await api.post('/api/facturas/', data);
    return response.data;
  },
  update: async (id: number, data: Partial<FacturaData>): Promise<FacturaData> => {
    const response = await api.patch(`/api/facturas/${id}/`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/facturas/${id}/`);
  }
};

export interface CuentaColumnaData {
  id: number;
  nombre: string;
  orden: number;
}

export interface CuentaFilaData {
  id: number;
  periodo_anio: number;
  periodo_mes: number;
  cuenta: string;
  dia_vencimiento: number | null;
  monto: string;
  pagado: boolean;
  orden: number;
  extras: Record<string, string>;
}

export interface CuentasTableroData {
  anio: number;
  mes: number;
  columnas: CuentaColumnaData[];
  filas: CuentaFilaData[];
}

export const cuentasService = {
  tablero: async (anio: number, mes: number): Promise<CuentasTableroData> => {
    const response = await api.get('/api/cuentas-registros/tablero/', { params: { anio, mes } });
    return response.data;
  },
  crearFila: async (data: { periodo_anio: number; periodo_mes: number; cuenta?: string; dia_vencimiento?: number | null; monto?: string }): Promise<CuentaFilaData> => {
    const response = await api.post('/api/cuentas-registros/', data);
    return response.data;
  },
  actualizarFila: async (id: number, data: Partial<CuentaFilaData> & { extras?: Record<string, string> }): Promise<CuentaFilaData> => {
    const response = await api.patch(`/api/cuentas-registros/${id}/`, data);
    return response.data;
  },
  eliminarFila: async (id: number): Promise<void> => {
    await api.delete(`/api/cuentas-registros/${id}/`);
  },
  crearColumna: async (nombre: string): Promise<CuentaColumnaData> => {
    const response = await api.post('/api/cuentas-columnas/', { nombre });
    return response.data;
  },
  eliminarColumna: async (id: number): Promise<void> => {
    await api.delete(`/api/cuentas-columnas/${id}/`);
  },
  historial: async (): Promise<{ anio: number; mes: number; total: number; pagadas: number }[]> => {
    const response = await api.get('/api/cuentas-registros/historial/');
    return response.data;
  },
};

export interface WorkspaceData {
  id: number;
  name: string;
  description: string;
  owner: number;
  owner_username: string;
  created_at: string;
  updated_at: string;
  members_count: number;
  my_role: 'owner' | 'admin' | 'member' | 'viewer';
}

export interface WorkspaceMemberData {
  id: number;
  user_id: number;
  username: string;
  email: string;
  avatar_url: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joined_at: string;
}

export interface InvitationData {
  id: number;
  workspace: number;
  workspace_name: string;
  email: string;
  role: string;
  token: string;
  status: string;
  invited_by: number;
  invited_by_username: string;
  created_at: string;
}

export const workspaceService = {
  getAll: async (): Promise<WorkspaceData[]> => {
    const response = await api.get('/api/my-workspaces/');
    return response.data;
  },
  get: async (id: number): Promise<WorkspaceData & { members: WorkspaceMemberData[] }> => {
    const response = await api.get(`/api/workspaces/${id}/`);
    return response.data;
  },
  create: async (data: { name: string; description?: string }): Promise<WorkspaceData> => {
    const response = await api.post('/api/workspaces/', data);
    return response.data;
  },
  update: async (id: number, data: Partial<WorkspaceData>): Promise<WorkspaceData> => {
    const response = await api.patch(`/api/workspaces/${id}/`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/workspaces/${id}/`);
  },
  invite: async (id: number, email: string, role: string = 'member'): Promise<{ token: string; email: string }> => {
    const response = await api.post(`/api/workspaces/${id}/invite/`, { email, role });
    return response.data;
  },
  acceptInvitation: async (token: string): Promise<{ workspace_id: number }> => {
    const response = await api.post('/api/workspaces/accept_invitation/', { token });
    return response.data;
  },
  declineInvitation: async (token: string): Promise<void> => {
    await api.post('/api/workspaces/decline_invitation/', { token });
  },
  removeMember: async (workspaceId: number, userId: number): Promise<void> => {
    await api.post(`/api/workspaces/${workspaceId}/remove_member/`, { user_id: userId });
  },
  updateMemberRole: async (workspaceId: number, userId: number, role: string): Promise<void> => {
    await api.post(`/api/workspaces/${workspaceId}/update_member_role/`, { user_id: userId, role });
  },
};

export const invitationService = {
  getPending: async (): Promise<InvitationData[]> => {
    const response = await api.get('/api/pending-invitations/');
    return response.data;
  },
};

export interface DelegationData {
  id: number;
  task: number;
  task_title: string;
  delegator: number;
  delegator_username: string;
  delegate: number | null;
  delegate_username: string | null;
  delegate_email: string;
  message: string;
  status: string;
  token: string;
  created_at: string;
}

export interface NotificationData {
  type: 'invitation' | 'delegation' | 'reminder' | 'report';
  id: string;
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  created_at: string;
  priority?: 'critica' | 'importante' | 'informativa';
  channel?: string;
  scheduled_for?: string | null;
  delivered_at?: string | null;
  pending_delivery?: boolean;
  in_bell?: boolean;
  cancelled_at?: string | null;
  dedupe_key?: string;
}

export const delegationService = {
  getAll: async (): Promise<{ sent: DelegationData[]; received: DelegationData[] }> => {
    const response = await api.get('/api/delegations/');
    return response.data;
  },
  create: async (data: { task_id: number; email: string; message?: string }): Promise<{ token: string; delegate_email: string; delegate_registered: boolean; delegation_link: string }> => {
    const response = await api.post('/api/delegations/', data);
    return response.data;
  },
  getByToken: async (token: string): Promise<DelegationData> => {
    const response = await api.get(`/api/delegations/${token}/`);
    return response.data;
  },
  accept: async (token: string): Promise<DelegationData> => {
    const response = await api.post(`/api/delegations/${token}/`, { action: 'accept' });
    return response.data;
  },
  reject: async (token: string): Promise<void> => {
    await api.post(`/api/delegations/${token}/`, { action: 'reject' });
  },
  complete: async (token: string): Promise<void> => {
    await api.post(`/api/delegations/${token}/`, { action: 'complete' });
  },
  getWorkspaceMembers: async (workspaceId: number): Promise<{ user_id: number; username: string; email: string; avatar_url: string; role: string }[]> => {
    const response = await api.get(`/api/workspaces/${workspaceId}/members-for-delegation/`);
    return response.data;
  }
};

export const notificationService = {
  getAll: async (): Promise<NotificationData[]> => {
    const response = await api.get('/api/notifications/');
    return response.data;
  },
  marcarLeida: async (id: string): Promise<void> => {
    await api.post(`/api/notifications/${id}/leer/`);
  },
  marcarTodasLeidas: async (): Promise<void> => {
    await api.post('/api/notifications/leer-todas/');
  }
};

export interface MetaAnualData {
  id: number;
  titulo: string;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string;
  aprobada: boolean;
  creado: string;
}

export interface ObjetivoMensualData {
  id: number;
  meta_anual: number | null;
  mes: number;
  titulo: string;
  descripcion: string;
  completado: boolean;
  creado: string;
}

export interface PropuestaIData {
  id: number;
  tipo_impacto: 'estructural' | 'estrategico_critico' | 'de_prioridad';
  situacion_clara: string;
  explicacion_impacto: string;
  propuesta_ajuste: string;
  fase_detectada: string;
  respondida: boolean;
  decision_usuario: string;
  leida: boolean;
  creada: string;
}

export const metaAnualService = {
  getAll: async (): Promise<MetaAnualData[]> => {
    const response = await api.get('/api/metas-anuales/');
    return response.data;
  },
  get: async (id: number): Promise<MetaAnualData> => {
    const response = await api.get(`/api/metas-anuales/${id}/`);
    return response.data;
  },
  create: async (data: Omit<MetaAnualData, 'id' | 'creado'>): Promise<MetaAnualData> => {
    const response = await api.post('/api/metas-anuales/', data);
    return response.data;
  },
  update: async (id: number, data: Partial<MetaAnualData>): Promise<MetaAnualData> => {
    const response = await api.patch(`/api/metas-anuales/${id}/`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/metas-anuales/${id}/`);
  },
};

export const objetivoMensualService = {
  getAll: async (): Promise<ObjetivoMensualData[]> => {
    const response = await api.get('/api/objetivos-mensuales/');
    return response.data;
  },
  create: async (data: Omit<ObjetivoMensualData, 'id' | 'creado'>): Promise<ObjetivoMensualData> => {
    const response = await api.post('/api/objetivos-mensuales/', data);
    return response.data;
  },
  update: async (id: number, data: Partial<ObjetivoMensualData>): Promise<ObjetivoMensualData> => {
    const response = await api.patch(`/api/objetivos-mensuales/${id}/`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/objetivos-mensuales/${id}/`);
  },
};

export const propuestaIAService = {
  getAll: async (): Promise<PropuestaIData[]> => {
    const response = await api.get('/api/propuestas-ia/');
    return response.data;
  },
  get: async (id: number): Promise<PropuestaIData> => {
    const response = await api.get(`/api/propuestas-ia/${id}/`);
    return response.data;
  },
  decidir: async (id: number, decision: string): Promise<PropuestaIData> => {
    const response = await api.post(`/api/propuestas-ia/${id}/decidir/`, { decision });
    return response.data;
  },
  marcarLeida: async (id: number): Promise<PropuestaIData> => {
    const response = await api.post(`/api/propuestas-ia/${id}/marcar_leida/`);
    return response.data;
  },
  ejecutarMotor: async (): Promise<any> => {
    const response = await api.post('/api/ai/ejecutar-motor/');
    return response.data;
  },
};

export interface ConfiguracionData {
  voz_genero: 'masculino' | 'femenino';
  estilo_comunicacion: 'suave' | 'directo';
  nivel_exigencia: 'bajo' | 'medio' | 'alto';
  frecuencia_intervenciones: number;
  canales_interaccion: string[];
  ventana_inicio: string;
  ventana_fin: string;
  avatar_index: number;
  onboarding_completado: boolean;
  video_inicial_visto: boolean;
  ultimo_ingreso: string | null;
  annual_report_month: number;
  annual_report_day: number;
  mission_photo_url: string;
  redes_sociales?: Record<string, string>;
}

export interface ActivacionData {
  id: number;
  tipo: 'tradicional' | 'simulada' | 'con_intencion' | 'adaptativa';
  estado: 'pendiente' | 'enviada' | 'vista' | 'respondida' | 'ignorada' | 'fallida';
  titulo: string;
  mensaje: string;
  mensaje_intencion: string;
  channel_used: string;
  metadata: any;
  ventana_programada: string | null;
  enviada_en: string | null;
  leida_en: string | null;
  respondida_en: string | null;
  creada: string;
}

export interface ReportDataSourceData {
  id: number;
  source_type: string;
  reference_id: string;
  snapshot: Record<string, unknown>;
}

export interface ReportGoalContext {
  gran_meta_anual?: {
    texto: string;
    version: number;
    estado: string;
    aprobada_en: string | null;
  } | null;
  meta_mensual?: {
    texto: string;
    explicacion?: string;
    relacion_anual?: string;
    complejidad?: string;
    version?: number;
    estado?: string;
    mes?: number;
    anio?: number;
    completado?: boolean;
  } | null;
  meta_mensual_fuente?: string | null;
  metas_mensuales_ciclo?: {
    mes: number;
    anio: number;
    texto: string;
    estado: string;
    version: number;
  }[];
}

/** Serie por fecha que alimenta los gráficos del reporte (generada por el backend). */
export interface ReportSprSerieDiaData {
  fecha: string;
  planificadas: number;
  completadas: number;
}

/** Metadatos crudos del cálculo (`ai_raw_metadata.raw`). Puede faltar en reportes previos. */
export interface FocusiaReportRawMetadata {
  acciones_principales?: { total: number; done: number };
  reprogramadas?: number;
  eliminadas?: number;
  reprogramadas_sin_completar?: number;
  eliminadas_sin_completar?: number;
  pendientes_al_cierre?: number;
  serie_diaria?: ReportSprSerieDiaData[];
  subacciones_pendientes?: number;
  delegaciones_confirmadas?: number;
}

export interface FocusiaReportData {
  id: number;
  user: number;
  level: 'weekly' | 'monthly' | 'annual';
  period_start: string;
  period_end: string;
  completion_percentage: number;
  completed_count: number;
  pending_count: number;
  strong_days: string[];
  weak_days: string[];
  consistency_score: number | null;
  headline_message: string;
  ai_interpretation: string;
  ai_raw_metadata: Record<string, unknown>;
  status: 'generated' | 'notified' | 'opened' | 'action_taken' | 'dismissed';
  notified_at: string | null;
  opened_at: string | null;
  action_taken: 'reorganize_week' | 'adjust_goal' | 'keep_plan' | 'review_later' | null;
  action_taken_at: string | null;
  generation_state: 'ready' | 'analysis_pending' | 'failed';
  is_partial: boolean;
  cycle_label: string;
  updated_until: string | null;
  closed_at: string | null;
  never_opened: boolean;
  created_at: string;
  data_sources: ReportDataSourceData[];
  goal_context?: ReportGoalContext;
}

export interface ReporteResumenItem {
  level: 'weekly' | 'monthly' | 'annual';
  has_report: boolean;
  report: FocusiaReportData | null;
  fecha_prevista: string | null;
}

export const configuracionService = {
  getMiConfig: async (): Promise<ConfiguracionData> => {
    const response = await api.get('/api/configuracion/mi_config/');
    return response.data;
  },
  updateMiConfig: async (data: Partial<ConfiguracionData>): Promise<ConfiguracionData> => {
    const response = await api.patch('/api/configuracion/mi_config/', data);
    return response.data;
  },
};

export const activacionService = {
  getPendientes: async (): Promise<ActivacionData[]> => {
    const response = await api.get('/api/activaciones/pendientes/');
    return response.data;
  },
  marcarVista: async (id: number): Promise<ActivacionData> => {
    const response = await api.post(`/api/activaciones/${id}/marcar_vista/`);
    return response.data;
  },
  marcarRespondida: async (id: number): Promise<ActivacionData> => {
    const response = await api.post(`/api/activaciones/${id}/marcar_respondida/`);
    return response.data;
  },
};

export interface ContextoAnalisisInput {
  meta_anual: {
    id: number;
    texto_meta: string;
    desglose_smart?: string;
  } | null;
  metricas_ejecucion: {
    horas_planificadas: number;
    horas_disponibles_reales: number;
    tasa_cumplimiento_48h: number;
    tareas_completadas: number;
    tareas_backlog: number;
  };
  historial_alertas: {
    ultima_alerta_respondida: boolean;
    dias_desde_ultima_intervencion: number;
  };
  tareas_detalladas_backlog: Array<{
    id: number;
    titulo: string;
    proyecto: string;
    conectada_a_meta_anual: boolean;
  }>;
}

export interface AnalisisContextoOutput {
  intervencion_necesaria: boolean;
  tipo_alerta_detectada: 'ESTRATÉGICO_CRÍTICO' | 'ESTRUCTURAL_SATURACIÓN' | 'PRIORIDAD_REORGANIZACIÓN' | null;
  payload: {
    bloque_1_impacto_inmediato: {
      mensaje_gancho: string;
    };
    bloque_3_interpretacion_ia: {
      texto_interpretacion: string;
      analisis_vector: {
        que_hizo_bien: string;
        que_hizo_mal: string;
        significado_avance: string;
      };
    };
  };
}
export interface InicioStateData {
  status: string;
  has_seen_intro_video: boolean;
  intro_video_completed: boolean;
  guided_tour_status: string;
  first_entry_at: string | null;
  updated_at: string;
}

export interface GuidedTourBlockData {
  slug: string;
  title: string;
  avatar_message: string;
  order: number;
}

export interface LearningModuleData {
  name: string;
  order: number;
}

export interface LearningCategoryData {
  slug: string;
  name: string;
  order: number;
  modules: LearningModuleData[];
}

export interface InicioEventLogData {
  id: number;
  event_type: string;
  origin: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface NotificationPrefData {
  id: number;
  channel: string;
  state: string;
  channel_display: string;
}

export interface ScheduleExceptionData {
  id: number;
  exception_type: string;
  value: string;
}

export interface ConfigProfileData {
  email: string;
  username: string;
  date_joined: string;
  avatar: Record<string, unknown> | null;
  current_avatar_id: number | null;
  avatars: Record<string, unknown>[];
  intensity: string;
  activations_app: boolean;
  activations_push: boolean;
  activations_whatsapp: boolean;
  activations_calls: boolean;
  schedule_type: string;
  tone: string;
  support_types?: string[];
}

export interface ConfigScheduleData {
  schedule_type: string;
  custom_schedule_start: string | null;
  custom_schedule_end: string | null;
  exceptions: ScheduleExceptionData[];
}

export interface PrivacyData {
  data_collection: boolean;
  analytics: boolean;
  personalized_recommendations: boolean;
  third_party_sharing: boolean;
  notificaciones?: boolean;
  recordatorios?: boolean;
  datos_sensibles?: boolean;
  funciones_especiales?: boolean;
}

export const inicioService = {
  getState: async (): Promise<InicioStateData> => {
    const response = await api.get('/api/inicio/state/');
    return response.data;
  },
  introVideoShown: async (): Promise<InicioStateData> => {
    const response = await api.post('/api/inicio/intro-video/shown/');
    return response.data;
  },
  introVideoCompleted: async (meta?: { origin?: string; completed?: boolean; duration_seconds?: number }): Promise<InicioStateData> => {
    const response = await api.post('/api/inicio/intro-video/completed/', meta || {});
    return response.data;
  },
  introVideoAbandoned: async (meta?: { origin?: string; completed?: boolean; duration_seconds?: number }): Promise<{ status: string }> => {
    const response = await api.post('/api/inicio/intro-video/abandoned/', meta || {});
    return response.data;
  },
  introVideoReplayed: async (meta?: { completed?: boolean; duration_seconds?: number }): Promise<InicioStateData> => {
    const response = await api.post('/api/inicio/intro-video/replayed/', meta || {});
    return response.data;
  },
  dashboardOpen: async (meta?: { origin?: string }): Promise<InicioStateData> => {
    const response = await api.post('/api/inicio/dashboard/open/', meta || {});
    return response.data;
  },
  tutorialOpen: async (): Promise<{ status: string }> => {
    const response = await api.post('/api/inicio/tutorial/open/');
    return response.data;
  },
  configOpen: async (): Promise<{ status: string }> => {
    const response = await api.post('/api/inicio/config/open/');
    return response.data;
  },
  configVideoShown: async (): Promise<{ status: string }> => {
    const response = await api.post('/api/inicio/config/video-shown/');
    return response.data;
  },
  configOpenNow: async (): Promise<{ status: string }> => {
    const response = await api.post('/api/inicio/config/open-now/');
    return response.data;
  },
  configVolverInicio: async (): Promise<{ status: string }> => {
    const response = await api.post('/api/inicio/config/volver/');
    return response.data;
  },
  guidedTourBlocks: async (): Promise<GuidedTourBlockData[]> => {
    const response = await api.get('/api/inicio/guided-tour/blocks/');
    return response.data;
  },
  guidedTourStart: async (): Promise<{ guided_tour_status: string }> => {
    const response = await api.post('/api/inicio/guided-tour/start/');
    return response.data;
  },
  guidedTourComplete: async (): Promise<{ guided_tour_status: string }> => {
    const response = await api.post('/api/inicio/guided-tour/complete/');
    return response.data;
  },
  guidedTourAbandon: async (meta?: { paso_actual?: number; total_pasos?: number }): Promise<{ guided_tour_status: string }> => {
    const response = await api.post('/api/inicio/guided-tour/abandon/', meta || {});
    return response.data;
  },
  learnCategories: async (): Promise<LearningCategoryData[]> => {
    const response = await api.get('/api/inicio/learn/categories/');
    return response.data;
  },
  learnSectionsOpened: async (): Promise<InicioStateData> => {
    const response = await api.post('/api/inicio/learn/sections/opened/');
    return response.data;
  },
  learnCategorySelect: async (slug: string): Promise<InicioStateData> => {
    const response = await api.post('/api/inicio/learn/category/select/', { slug });
    return response.data;
  },
  events: async (limit = 50): Promise<InicioEventLogData[]> => {
    const response = await api.get(`/api/inicio/events/?limit=${limit}`);
    return response.data;
  },
};

export const configService = {
  getProfile: async (): Promise<ConfigProfileData> => {
    const response = await api.get('/api/config/profile/');
    return response.data;
  },
  getAvatar: async (): Promise<{ current_avatar_id: number | null; avatar: Record<string, unknown> | null; avatars: Record<string, unknown>[] }> => {
    const response = await api.get('/api/config/avatar/');
    return response.data;
  },
  updateAvatar: async (avatar_id: number): Promise<{ current_avatar_id: number; avatar: Record<string, unknown> }> => {
    const response = await api.patch('/api/config/avatar/', { avatar_id });
    return response.data;
  },
  getNotifications: async (): Promise<NotificationPrefData[]> => {
    const response = await api.get('/api/config/notifications/');
    return response.data;
  },
  updateNotifications: async (prefs: { channel: string; state: string }[]): Promise<NotificationPrefData[]> => {
    const response = await api.patch('/api/config/notifications/', prefs);
    return response.data;
  },
  getSchedule: async (): Promise<ConfigScheduleData> => {
    const response = await api.get('/api/config/schedule/');
    return response.data;
  },
  updateSchedule: async (data: Partial<ConfigScheduleData>): Promise<ConfigScheduleData> => {
    const response = await api.patch('/api/config/schedule/', data);
    return response.data;
  },
  deleteScheduleException: async (pk: number): Promise<void> => {
    await api.delete(`/api/config/schedule/exception/${pk}/`);
  },
  createScheduleException: async (data: { exception_type: string; value: unknown }): Promise<ScheduleExceptionData> => {
    const response = await api.post('/api/config/schedule/exception/', data);
    return response.data;
  },
  getTone: async (): Promise<{ tone: string }> => {
    const response = await api.get('/api/config/tone/');
    return response.data;
  },
  updateTone: async (tone: string): Promise<{ tone: string }> => {
    const response = await api.patch('/api/config/tone/', { tone });
    return response.data;
  },
  getPrivacy: async (): Promise<PrivacyData> => {
    const response = await api.get('/api/config/privacy/');
    return response.data;
  },
  updatePrivacyPermissions: async (data: PrivacyData): Promise<PrivacyData> => {
    const response = await api.patch('/api/config/privacy/permissions/', data);
    return response.data;
  },
  exportData: async (): Promise<{ status: string }> => {
    const response = await api.post('/api/config/privacy/export/');
    return response.data;
  },
  deleteData: async (confirm: boolean): Promise<{ status: string }> => {
    const response = await api.post('/api/config/privacy/delete-data/', { confirm });
    return response.data;
  },
  getAccount: async (): Promise<{ email: string; username: string; date_joined: string; last_login: string | null }> => {
    const response = await api.get('/api/config/account/');
    return response.data;
  },
  updateAccount: async (data: { email?: string; username?: string }): Promise<{ email: string; username: string }> => {
    const response = await api.patch('/api/config/account/update/', data);
    return response.data;
  },
  changePassword: async (old_password: string, new_password: string, new_password_confirm: string): Promise<{ status: string }> => {
    const response = await api.post('/api/config/account/change-password/', { old_password, new_password, new_password_confirm });
    return response.data;
  },
  getDevices: async (): Promise<{ session_key: string; last_activity: unknown; user_agent: string; ip_address: string }[]> => {
    const response = await api.get('/api/config/devices/');
    return response.data;
  },
  logoutAllDevices: async (): Promise<{ status: string }> => {
    const response = await api.post('/api/config/devices/logout-all/');
    return response.data;
  },
  getPlan: async (): Promise<{ plan: string; features: Record<string, unknown>; since: string }> => {
    const response = await api.get('/api/config/plan/');
    return response.data;
  },
  updateAccompaniment: async (data: { intensity?: string; support_types?: string[] }): Promise<ConfigProfileData> => {
    const response = await api.patch('/api/config/accompaniment/', data);
    return response.data;
  },
  avatarVoiceSampleUrl: (avatarId: number): string => {
    return `/api/tts/avatar-sample/${avatarId}/`;
  },
};


export const usuarioService = {
  registrarIngreso: async (): Promise<{ conteo_ingresos: number; ultimo_ingreso: string }> => {
    const response = await api.post('/api/usuario/registrar-ingreso/');
    return response.data;
  },
};


export const matrizEisenhowerService = {
  getProgress: async (): Promise<MatrizEisenhowerData> => {
    const response = await api.get('/api/matriz-eisenhower/progress/');
    return response.data;
  },
  updateProgress: async (data: Partial<MatrizEisenhowerData>): Promise<MatrizEisenhowerData> => {
    const response = await api.patch('/api/matriz-eisenhower/progress/', data);
    return response.data;
  },
};

export const analizarContextoService = {
  ejecutar: async (input: ContextoAnalisisInput): Promise<AnalisisContextoOutput> => {
    const response = await api.post('/api/ai/analizar-contexto/', input);
    return response.data;
  },
};

export interface MonthlyPlanData {
  id: number;
  user: number;
  annual_goal: number | null;
  cycle_start_month: number;
  cycle_start_year: number;
  status: string;
  approved_at: string | null;
  goals: MonthlyGoalData[];
  creado: string;
  actualizado: string;
}

export interface MonthlyGoalData {
  id: number;
  plan: number;
  month_order: number;
  calendar_month: number;
  calendar_year: number;
  monthly_goal_text: string;
  brief_explanation: string;
  annual_goal_relation: string;
  complexity_level: string;
  status: string;
  edited_by_user: boolean;
  version: number;
  creado: string;
  actualizado: string;
}

export const monthlyService = {
  checkStatus: async (): Promise<{ has_plan: boolean; has_monthly_plan: boolean; plan_id: number | null; status?: string | null }> => {
    const response = await api.get('/api/monthly-plan/check/');
    return response.data;
  },
  getPlan: async (planId: number): Promise<MonthlyPlanData> => {
    const response = await api.get(`/api/monthly-plan/${planId}/`);
    return response.data;
  },
  generateProposals: async (data: Record<string, unknown>): Promise<MonthlyPlanData> => {
    const response = await api.post('/api/monthly-plan/generate/', data);
    return response.data;
  },
  editGoal: async (goalId: number, data: Partial<MonthlyGoalData>): Promise<MonthlyGoalData> => {
    const response = await api.patch(`/api/monthly-goal/${goalId}/`, data);
    return response.data;
  },
  approvePlan: async (planId: number): Promise<void> => {
    await api.post(`/api/monthly-plan/${planId}/approve/`);
  },
};

export interface SmartGoalResult {
  [key: string]: string;
  texto_meta: string;
  frase_resumen: string;
  S: string;
  M: string;
  A: string;
  R: string;
  T: string;
}

export interface GranMetaBorrador {
  id: number;
  texto_meta: string;
  frase_resumen: string;
  desglose_smart: Record<string, string>;
  respuestas: Record<string, string>;
}

export interface EligibilityData {
  eligible: boolean;
  has_diagnostico: boolean;
  diagnostico_status: string;
  message: string;
}

export interface ConversationTurnData {
  id: number;
  goal: number;
  role: 'avatar' | 'user';
  step: string;
  content: string;
  created_at: string;
}

export interface ModifyPlanAvailabilityData {
  available: boolean;
}

export const granMetaAnualService = {
  generarSmart: async (data: Record<string, unknown>): Promise<SmartGoalResult> => {
    const response = await api.post('/api/gran-meta-anual/generar-smart/', data);
    return response.data;
  },
  editarSmart: async (id: number, comment: string): Promise<SmartGoalResult> => {
    const response = await api.patch(`/api/gran-meta-anual/${id}/editar-smart/`, { comment });
    return response.data;
  },
  guardarBorrador: async (data: Record<string, unknown>): Promise<GranMetaBorrador> => {
    const response = await api.post('/api/gran-meta-anual/borrador/', data);
    return response.data;
  },
  aprobar: async (id: number): Promise<void> => {
    await api.post(`/api/gran-meta-anual/${id}/aprobar/`);
  },
  eligibility: async (): Promise<EligibilityData> => {
    const response = await api.get('/api/gran-meta-anual/eligibility/');
    return response.data;
  },
  answer: async (id: number, questionNumber: number, answerText: string): Promise<{ validation: string; step: string }> => {
    const response = await api.post(`/api/gran-meta-anual/${id}/answer/`, {
      question_number: questionNumber,
      answer_text: answerText,
    });
    return response.data;
  },
  current: async (): Promise<Record<string, unknown>> => {
    const response = await api.get('/api/gran-meta-anual/current/');
    return response.data;
  },
  history: async (): Promise<Record<string, unknown>[]> => {
    const response = await api.get('/api/gran-meta-anual/history/');
    return response.data;
  },
  modifyPlanAvailability: async (): Promise<ModifyPlanAvailabilityData> => {
    const response = await api.get('/api/config/modify-plan/availability/');
    return response.data;
  },
};

// ===== NUEVOS SERVICIOS PARA MÓDULOS FOCUSIA V1.0 =====

export interface OnboardingData {
  user_id: string;
  full_name: string;
  avatar_id: number;
  intensity_level: 'SUAVE' | 'EQUILIBRADA' | 'EXIGENTE';
  allowed_channels: string[];
  avatar_tone: 'MOTIVATOR' | 'STRATEGIC' | 'DEMANDING' | 'ADAPTIVE';
  onboarding_status: 'INICIADO' | 'CONFIG_CONFIRMADA' | 'COMPLETADO';
}

export const onboardingService = {
  submit: async (data: Partial<OnboardingData>): Promise<OnboardingData> => {
    const response = await api.post('/api/users/onboarding/', data);
    return response.data;
  },
  getStatus: async (): Promise<OnboardingData> => {
    const response = await api.get('/api/users/onboarding/');
    return response.data;
  },
};

export interface WheelOfLifeCompleteData {
  user_id: string;
  scores: {
    trabajo: number;
    dinero: number;
    salud: number;
    pareja: number;
    familia: number;
    espiritualidad: number;
    diversion: number;
    entorno: number;
    desarrollo: number;
    contribucion: number;
  };
  top_three_focus_areas: string[];
}

export interface WheelDiagnosticData {
  promedio_general: number;
  nivel_equilibrio: 'CRITICO' | 'BAJO' | 'MEDIO' | 'BUENO' | 'EXCELENTE';
  pico_alto: string;
  pico_bajo: string;
  foco_1: string;
  foco_2: string;
  foco_3: string;
  justificacion_focos: string;
}

export interface SuggestedActionData {
  id: number;
  area_foco: string;
  texto: string;
  enviada_kanban: boolean;
}

export const wheelOfLifeCompleteService = {
  get: async (): Promise<WheelOfLifeCompleteData> => {
    const response = await api.get('/api/rueda-vida-completa/');
    return response.data;
  },
  save: async (data: { registros: Array<{ categoria: string; puntaje: number }>; focos: string[] }): Promise<WheelOfLifeCompleteData> => {
    const response = await api.post('/api/rueda-vida-completa/', data);
    return response.data;
  },
  getDiagnostic: async (): Promise<WheelDiagnosticData> => {
    const response = await api.get('/api/rueda/diagnostico/');
    return response.data;
  },
  getSuggestedActions: async (): Promise<SuggestedActionData[]> => {
    const response = await api.get('/api/rueda/acciones-sugeridas/');
    return response.data;
  },
  generateDiagnostic: async (): Promise<WheelDiagnosticData> => {
    const response = await api.post('/api/rueda/generar-diagnostico/');
    return response.data;
  },
  generateActions: async (): Promise<SuggestedActionData[]> => {
    const response = await api.post('/api/rueda/generar-acciones/');
    return response.data;
  },
  sendActionToKanban: async (accionId: number): Promise<void> => {
    await api.post('/api/rueda/enviar-accion-kanban/', { accion_id: accionId });
  },
};

export interface MonthlyPlanDataV2 {
  user_id: string;
  cycle_start_month: number;
  cycle_start_year: number;
  is_approved: boolean;
  goals: Array<{
    month_order: number;
    calendar_month: number;
    calendar_year: number;
    goal_text: string;
    explanation: string;
    relation_to_annual: string;
    complexity_level: 'BASE' | 'EJECUCION' | 'CONSOLIDACION' | 'CIERRE';
  }>;
}

export const monthlyPlanService = {
  get: async (): Promise<MonthlyPlanDataV2> => {
    const response = await api.get('/api/monthly-plan/');
    return response.data;
  },
  save: async (data: Partial<MonthlyPlanDataV2>): Promise<MonthlyPlanDataV2> => {
    const response = await api.post('/api/monthly-plan/', data);
    return response.data;
  },
  approve: async (): Promise<void> => {
    await api.post('/api/monthly-plan/approve/');
  },
};

export interface KanbanActionDataV2 {
  id: string;
  user_id: string;
  title: string;
  source: 'USER_INPUT' | 'RUEDA_VIDA_SUGGESTION';
  classification_status: 'PENDIENTE' | 'HACER' | 'PLANIFICAR' | 'DELEGAR' | 'ELIMINAR';
  scheduled_date?: string;
  is_double_clicked_fixed: boolean;
  created_at: string;
  updated_at: string;
}

export const kanbanActionServiceV2 = {
  getAll: async (): Promise<KanbanActionDataV2[]> => {
    const response = await api.get('/api/kanban-actions/');
    return response.data;
  },
  create: async (data: { title: string; source: 'USER_INPUT' | 'RUEDA_VIDA_SUGGESTION' }): Promise<KanbanActionDataV2> => {
    const response = await api.post('/api/kanban-actions/', data);
    return response.data;
  },
  classify: async (id: string, data: { classification_status: string; scheduled_date?: string }): Promise<KanbanActionDataV2> => {
    const response = await api.patch(`/api/kanban-actions/${id}/classify/`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/kanban-actions/${id}/`);
  },
  pin: async (id: string): Promise<KanbanActionDataV2> => {
    const response = await api.post(`/api/kanban-actions/${id}/pin/`);
    return response.data;
  },
};

export interface WeeklyPlanData {
  id: string;
  user: string;
  associated_monthly_goal_text: string;
  weekly_mission: string;
  week_number: number;
  year: number;
  metadata: Record<string, unknown>;
  action_count: number;
  created_at: string;
  updated_at: string;
}

export interface SubactionData {
  id: string;
  title: string;
  is_completed: boolean;
}

export interface ActionData {
  id: string;
  weekly_plan: string;
  assigned_calendar_date: string;
  title: string;
  origin_module: 'KANBAN_BACKLOG' | 'MANUAL' | 'INTEGRATIONS_WHATSAPP';
  status: 'PENDIENTE' | 'COMPLETADA' | 'DELEGADA';
  subactions: SubactionData[];
  created_at: string;
  updated_at: string;
}

const getWeekRange = (year: number, week: number): Date[] => {
  const firstJan = new Date(year, 0, 1);
  const days = (week - 1) * 7 + firstJan.getDay();
  const start = new Date(firstJan.getTime() + days * 86400000);
  const daysOfWeek: Date[] = [];
  for (let i = 0; i < 7; i++) {
    daysOfWeek.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }
  return daysOfWeek;
};

const getISOWeek = (date: Date): { year: number; week: number } => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
};

export const weeklyPlanService = {
  getCurrentWeek: async (): Promise<{ plan: WeeklyPlanData; created: boolean }> => {
    const response = await api.get('/api/weekly-plans/current_week/');
    return response.data;
  },
  weekOf: async (date: string): Promise<{ plan: WeeklyPlanData; created: boolean }> => {
    const response = await api.get('/api/weekly-plans/week_of/', { params: { date } });
    return response.data;
  },
  list: async (): Promise<WeeklyPlanData[]> => {
    const response = await api.get('/api/weekly-plans/');
    return response.data;
  },
  update: async (id: string, data: Partial<WeeklyPlanData>): Promise<WeeklyPlanData> => {
    const response = await api.patch(`/api/weekly-plans/${id}/`, data);
    return response.data;
  },
};

export const weeklyActionService = {
  list: async (params?: { assigned_calendar_date?: string }): Promise<ActionData[]> => {
    const response = await api.get('/api/actions/', { params });
    return response.data;
  },
  get: async (id: string): Promise<ActionData> => {
    const response = await api.get(`/api/actions/${id}/`);
    return response.data;
  },
  create: async (data: { title: string; assigned_calendar_date: string; origin_module?: string; subactions?: SubactionData[] }): Promise<ActionData> => {
    const response = await api.post('/api/actions/', data);
    return response.data;
  },
  update: async (id: string, data: Partial<ActionData>): Promise<ActionData> => {
    const response = await api.patch(`/api/actions/${id}/`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/actions/${id}/`);
  },
  addAction: async (data: { title: string; assigned_calendar_date: string; origin_module?: string; subactions?: SubactionData[] }): Promise<ActionData> => {
    const response = await api.post('/api/actions/add_action/', data);
    return response.data;
  },
  repeat: async (id: string, target_date: string): Promise<ActionData> => {
    const response = await api.post(`/api/actions/${id}/repeat/`, { target_date });
    return response.data;
  },
  move: async (id: string, new_date: string): Promise<ActionData> => {
    const response = await api.post(`/api/actions/${id}/move/`, { new_date });
    return response.data;
  },
  delegate: async (id: string): Promise<ActionData> => {
    const response = await api.post(`/api/actions/${id}/delegate/`);
    return response.data;
  },
  complete: async (id: string): Promise<ActionData> => {
    const response = await api.post(`/api/actions/${id}/complete/`);
    return response.data;
  },
  addSubaction: async (id: string, title: string): Promise<ActionData> => {
    const response = await api.post(`/api/actions/${id}/add_subaction/`, { title });
    return response.data;
  },
  editSubaction: async (id: string, subaction_id: string, data: { title?: string; is_completed?: boolean }): Promise<ActionData> => {
    const response = await api.patch(`/api/actions/${id}/edit_subaction/`, { subaction_id, ...data });
    return response.data;
  },
  deleteSubaction: async (id: string, subaction_id: string): Promise<ActionData> => {
    const response = await api.post(`/api/actions/${id}/delete_subaction/`, { subaction_id });
    return response.data;
  },
  dropAction: async (id: string, new_date: string): Promise<ActionData> => {
    const response = await api.post(`/api/actions/${id}/drop_action/`, { new_date });
    return response.data;
  },
};

export interface DelegacionProcesoData {
  id: string;
  titulo: string;
  origen: string;
  source_ref: { kind?: string; id?: string };
  responsable: string;
  estado: string;
  historial: { evento: string; at: string; detalle?: any }[];
  derivadas: { evento: string; at: string; detalle?: any }[];
  creado: string;
  actualizado: string;
}

export const delegacionProcesoService = {
  listActive: async (): Promise<DelegacionProcesoData[]> => {
    const response = await api.get('/api/delegation-processes/', { params: { activas: '1' } });
    return response.data;
  },
  assignResponsible: async (id: string, responsable: string): Promise<DelegacionProcesoData> => {
    const response = await api.patch(`/api/delegation-processes/${id}/responsable/`, { responsable });
    return response.data;
  },
  followup: async (id: string, data: { tipo: string; fecha?: string; hora?: string }): Promise<DelegacionProcesoData> => {
    const response = await api.post(`/api/delegation-processes/${id}/derivada/`, data);
    return response.data;
  },
  recover: async (id: string): Promise<DelegacionProcesoData> => {
    const response = await api.post(`/api/delegation-processes/${id}/recuperar/`);
    return response.data;
  },
  complete: async (id: string): Promise<DelegacionProcesoData> => {
    const response = await api.post(`/api/delegation-processes/${id}/completar/`);
    return response.data;
  },
  responsables: async (): Promise<string[]> => {
    const response = await api.get('/api/delegation-processes/responsables/');
    return response.data;
  },
};

export interface ProgresoData {
  completadas: number;
  total: number;
  porcentaje: number;
  detalle: {
    kanban: { total: number; completadas: number };
    timeblock: { total: number; completadas: number };
    action: { total: number; completadas: number };
  };
}

export const progresoService = {
  get: async (): Promise<ProgresoData> => {
    const response = await api.get('/api/progreso-actividades/');
    return response.data;
  },
};

export const pushService = {  publicKey: async (): Promise<{ publicKey: string }> => {
    const response = await api.get('/api/push/public-key/');
    return response.data;
  },
  subscribe: async (sub: { endpoint: string; keys: { p256dh: string; auth: string } }): Promise<void> => {
    await api.post('/api/push/subscribe/', sub);
  },
  unsubscribe: async (endpoint: string): Promise<void> => {
    await api.post('/api/push/unsubscribe/', { endpoint });
  },
};

export const ttsService = {
  speakAvatar: async (avatarIndex: number, text: string): Promise<string> => {
    const response = await api.post('/api/tts/avatar/', {
      avatar_index: avatarIndex,
      text: text.slice(0, 200),
    }, { responseType: 'blob' });
    const blob = new Blob([response.data], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  },
};

export interface AgentMessageData {  id: string;
  user: number;
  session_id: string;
  rol: 'USER' | 'ASSISTANT' | 'SYSTEM';
  mensaje: string;
  metadata: any;
  created_at: string;
}

export interface AgentConfigData {
  id: number;
  user: number;
  activo: boolean;
  tono: 'FORMAL' | 'CASUAL' | 'MOTIVACIONAL' | 'DIRECTO';
  frecuencia_checkin: 'CADA_HORA' | 'CADA_2H' | 'MEDIO_DIA' | 'FIN_DIA';
  notificar_whatsapp: boolean;
  whatsapp_phone: string;
  notificar_in_app: boolean;
  horario_inicio: string;
  horario_fin: string;
  temas_permitidos: string[];
  ultimo_checkin: string | null;
}

export interface AgentChatResponse {
  respuesta: string;
  session_id: string;
  progreso: { completadas: number; total: number; porcentaje: number };
  creados?: {
    recordatorio?: { id: number; titulo: string; fecha_hora: string };
    timeblock?: { fecha: string; hora: number };
    kanban_action?: { id: string };
  };
}

export interface AgentScheduleData {
  id: number;
  user: number;
  tipo: string;
  titulo: string;
  mensaje_plantilla: string;
  regla_programacion: any;
  activo: boolean;
  ultima_ejecucion: string | null;
  proxima_ejecucion: string | null;
  created_at: string;
}

export const agentService = {
  chat: async (mensaje: string, session_id?: string, contexto_ayuda?: string): Promise<AgentChatResponse> => {
    const response = await api.post('/api/agent/chat/', { mensaje, session_id, contexto_ayuda });
    return response.data;
  },
  evaluate: async () => {
    const response = await api.post('/api/agent/evaluate/');
    return response.data;
  },
  getConfig: async (): Promise<AgentConfigData> => {
    const response = await api.get('/api/agent-config/mi_config/');
    return response.data;
  },
  updateConfig: async (data: Partial<AgentConfigData>): Promise<AgentConfigData> => {
    const response = await api.patch('/api/agent-config/mi_config/', data);
    return response.data;
  },
  getConversations: async (session_id?: string): Promise<AgentMessageData[]> => {
    const params = session_id ? { session_id } : {};
    const response = await api.get('/api/agent-conversations/', { params });
    return response.data;
  },
  getSchedules: async (): Promise<AgentScheduleData[]> => {
    const response = await api.get('/api/agent-schedules/');
    return response.data;
  },
  createSchedule: async (data: Partial<AgentScheduleData>): Promise<AgentScheduleData> => {
    const response = await api.post('/api/agent-schedules/', data);
    return response.data;
  },
  updateSchedule: async (id: number, data: Partial<AgentScheduleData>): Promise<AgentScheduleData> => {
    const response = await api.patch(`/api/agent-schedules/${id}/`, data);
    return response.data;
  },
  deleteSchedule: async (id: number): Promise<void> => {
    await api.delete(`/api/agent-schedules/${id}/`);
  },
};

/* ──────────────────────────────────────────────────────────────────────────
   Doc 23 · Modo Focus (módulo BOTÓN FOCUS)
   ────────────────────────────────────────────────────────────────────────── */

export interface FocusSesionData {
  id: number;
  herramienta: 'reloj' | 'pomodoro' | 'temporizador' | 'alarma' | 'descanso';
  estado: 'activa' | 'completada' | 'cancelada';
  started_at: string;
  ended_at: string | null;
  planned_minutes: number | null;
  focused_minutes: number | null;
  config: {
    duracion_min?: number;
    concentracion?: number;
    descanso?: number;
    ciclos?: number;
    hora?: string;
    etiqueta?: string;
  };
  origin: string;
}

export const focusService = {
  activa: async (): Promise<{ activa: boolean; sesion?: FocusSesionData }> => {
    const response = await api.get('/api/focus-sessions/activa/');
    return response.data;
  },
  iniciar: async (data: {
    herramienta: FocusSesionData['herramienta'];
    config?: FocusSesionData['config'];
    origin?: string;
    forzar?: boolean;
  }): Promise<FocusSesionData> => {
    const response = await api.post('/api/focus-sessions/iniciar/', data);
    return response.data;
  },
  finalizar: async (
    id: number,
    data: { completada: boolean; minutos_enfocado?: number },
  ): Promise<FocusSesionData> => {
    const response = await api.post(`/api/focus-sessions/${id}/finalizar/`, data);
    return response.data;
  },
};

export const reportService = {
  getAll: async (level?: string): Promise<FocusiaReportData[]> => {
    const params = level ? `?level=${level}` : '';
    const response = await api.get(`/api/focusia-reports/${params}`);
    return response.data;
  },
  getLatest: async (): Promise<FocusiaReportData[]> => {
    const response = await api.get('/api/focusia-reports/latest/');
    return response.data;
  },
  getResumen: async (): Promise<ReporteResumenItem[]> => {
    const response = await api.get('/api/focusia-reports/resumen/');
    return response.data;
  },
  getDetail: async (id: number): Promise<FocusiaReportData> => {
    const response = await api.get(`/api/focusia-reports/${id}/`);
    return response.data;
  },
  open: async (id: number): Promise<FocusiaReportData> => {
    const response = await api.post(`/api/focusia-reports/${id}/open/`);
    return response.data;
  },
  takeAction: async (id: number, action: string): Promise<FocusiaReportData> => {
    const response = await api.post(`/api/focusia-reports/${id}/action/`, { action });
    return response.data;
  },
};

// ===== ONBOARDING V2 =====

export interface AvatarDataV2 {
  id: number;
  name: string;
  gender: 'male' | 'female';
  image: string;
  voice_id: string;
  intro_message_text: string;
  intro_message_audio: string;
}

export interface OnboardingProfileData {
  avatar: number | null;
  avatar_name: string | null;
  avatar_image: string | null;
  user_full_name: string;
  user_first_name: string;
  intensity: 'suave' | 'equilibrada' | 'exigente';
  activations_app: boolean;
  activations_push: boolean;
  activations_whatsapp: boolean;
  activations_calls: boolean;
  schedule_type: 'todo_el_dia' | 'horario_laboral' | 'manana_tarde' | 'personalizado';
  custom_schedule_start: string | null;
  custom_schedule_end: string | null;
  tone: 'cercano_motivador' | 'claro_estrategico' | 'firme_exigente' | 'adaptativo';
  used_recommended_config: boolean;
  status: string;
  confirmed_at: string | null;
  onboarding_completed_at: string | null;
  guided_tour_status: 'pending' | 'started' | 'completed';
}

export interface OnboardingStatusData {
  status: string;
  guided_tour_status: string;
  onboarding_completed_at: string | null;
  onboarding_completado: boolean;
}

export const onboardingV2Service = {
  getAvatars: async (): Promise<AvatarDataV2[]> => {
    const response = await api.get('/api/onboarding/avatars/');
    return response.data;
  },
  selectAvatar: async (avatar_id: number): Promise<OnboardingProfileData> => {
    const response = await api.patch('/api/onboarding/profile/select-avatar/', { avatar_id });
    return response.data;
  },
  acceptRecommended: async (): Promise<OnboardingProfileData> => {
    const response = await api.patch('/api/onboarding/profile/accept-recommended/');
    return response.data;
  },
  customizeIntensity: async (intensity: string): Promise<OnboardingProfileData> => {
    const response = await api.patch('/api/onboarding/profile/customize/intensity/', { intensity });
    return response.data;
  },
  customizeActivations: async (data: {
    activations_app: boolean;
    activations_push: boolean;
    activations_whatsapp: boolean;
    activations_calls: boolean;
  }): Promise<OnboardingProfileData> => {
    const response = await api.patch('/api/onboarding/profile/customize/activations/', data);
    return response.data;
  },
  customizeSchedule: async (data: {
    schedule_type: string;
    custom_schedule_start?: string | null;
    custom_schedule_end?: string | null;
  }): Promise<OnboardingProfileData> => {
    const response = await api.patch('/api/onboarding/profile/customize/schedule/', data);
    return response.data;
  },
  customizeTone: async (tone: string): Promise<OnboardingProfileData> => {
    const response = await api.patch('/api/onboarding/profile/customize/tone/', { tone });
    return response.data;
  },
  getSummary: async (): Promise<OnboardingProfileData> => {
    const response = await api.get('/api/onboarding/profile/summary/');
    return response.data;
  },
  confirm: async (): Promise<{ status: string; confirmed_at: string }> => {
    const response = await api.post('/api/onboarding/profile/confirm/');
    return response.data;
  },
  complete: async (): Promise<{ status: string }> => {
    const response = await api.post('/api/onboarding/profile/complete/');
    return response.data;
  },
  startGuidedTour: async (): Promise<{ guided_tour_status: string }> => {
    const response = await api.post('/api/onboarding/profile/guided-tour/start/');
    return response.data;
  },
  deferGuidedTour: async (): Promise<{ guided_tour_status: string }> => {
    const response = await api.post('/api/onboarding/profile/guided-tour/defer/');
    return response.data;
  },
  getStatus: async (): Promise<OnboardingStatusData> => {
    const response = await api.get('/api/onboarding/profile/status/');
    return response.data;
  },
  resetOnboarding: async (): Promise<{ status: string; onboarding_completado: boolean; message: string }> => {
    const response = await api.patch('/api/onboarding/profile/reset/');
    return response.data;
  },
};

export interface DailyPhraseData {
  phrase: string;
  intention: string;
  month_theme: string;
  month_number: number;
  day_number: number;
  day_total: number;
}

export interface MonthlyTrainingData {
  id: number;
  month: number;
  month_number: number;
  month_theme: string;
  title: string;
  content: string;
  media_url: string | null;
  media_resuelto: string;
  video_resuelto: string;
}

export interface MotivationalProgressData {
  current_month: number;
  current_day_in_month: number;
  total_day_in_cycle: number;
  month_theme: string;
  cycle_start_date: string;
}

export const motivationalService = {
  getToday: async (): Promise<DailyPhraseData> => {
    const response = await api.get('/api/motivational/today/');
    return response.data;
  },
  getCurrentTraining: async (): Promise<MonthlyTrainingData> => {
    const response = await api.get('/api/motivational/current-training/');
    return response.data;
  },
  getProgress: async (): Promise<MotivationalProgressData> => {
    const response = await api.get('/api/motivational/progress/');
    return response.data;
  },
};

export interface TribuTemaData {
  id: number;
  titulo: string;
  descripcion: string;
  reflexion: string;
  pregunta: string;
  imagen_url: string;
  imagen_resuelta: string;
  activo: boolean;
  creado: string;
}

export interface TribuCompromisoData {
  id: number;
  year: number;
  week_number: number;
  texto: string;
  tribu: string;
  tribu_detalle: string;
  enviado_kanban: boolean;
  creado: string;
  actualizado: string;
}

export const tribuService = {
  temaActual: async (): Promise<TribuTemaData> => {
    const response = await api.get('/api/tribu/tema-actual/');
    return response.data;
  },
  compromiso: async (): Promise<TribuCompromisoData> => {
    const response = await api.get('/api/tribu/compromiso/');
    return response.data;
  },
  guardar: async (data: Partial<Pick<TribuCompromisoData, 'texto' | 'tribu' | 'tribu_detalle'>>): Promise<TribuCompromisoData> => {
    const response = await api.patch('/api/tribu/compromiso/', data);
    return response.data;
  },
  enviarKanban: async (data: { texto: string; tribu: string; tribu_detalle?: string }): Promise<{ status: string; accion_id: string; repetido: boolean }> => {
    const response = await api.post('/api/tribu/enviar-kanban/', data);
    return response.data;
  },
};

export interface CursoMesData {
  month_number: number;
  theme: string;
  estado: 'completada' | 'actual' | 'disponible' | 'bloqueada';
}

export interface CapacitacionMesData {
  id: number;
  month_number: number;
  month_theme: string;
  title: string;
  content: string;
  media_url: string | null;
  media_resuelto: string;
  duracion_minutos: number;
  video_url: string;
  video_resuelto: string;
  objetivos: { titulo: string; descripcion: string }[];
}

export interface CursosMesActualData {
  mes_actual: number;
  progreso_pct: number;
  capacitacion: CapacitacionMesData;
  completado: boolean;
  meses: CursoMesData[];
}

export const cursosService = {
  mesActual: async (): Promise<CursosMesActualData> => {
    const response = await api.get('/api/cursos/mes-actual/');
    return response.data;
  },
  mes: async (month: number): Promise<{ mes: number; mes_actual: number; capacitacion: CapacitacionMesData; completado: boolean }> => {
    const response = await api.get('/api/cursos/mes/', { params: { month } });
    return response.data;
  },
  completar: async (training_id: number): Promise<{ completado: boolean }> => {
    const response = await api.post('/api/cursos/completar/', { training_id });
    return response.data;
  },
};

export interface CoachingEntryData {
  id: number;
  reflection: string;
  decision: string;
  decision_added_to_agenda: boolean;
  created_at: string;
  updated_at: string;
}

export const coachingService = {
  getToday: async (): Promise<CoachingEntryData | null> => {
    const response = await api.get('/api/coaching-entries/today/');
    return response.data;
  },
  getQuestion: async (): Promise<CoachingQuestionData> => {
    const response = await api.get('/api/coaching-entries/today-question/');
    return response.data;
  },
  submitReflection: async (reflection: string): Promise<CoachingEntryData> => {
    const response = await api.post('/api/coaching-entries/submit_reflection/', { reflection });
    return response.data;
  },
  submitDecision: async (decision: string): Promise<CoachingEntryData> => {
    const response = await api.post('/api/coaching-entries/submit_decision/', { decision });
    return response.data;
  },
};

export interface CoachingQuestionData {
  pregunta: string;
  es_integracion: boolean;
  origen_integracion: string;
  frase: string;
  intention: string;
  month_number?: number;
  day_number?: number;
}

