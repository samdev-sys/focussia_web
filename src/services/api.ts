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

    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/token/')) {
      originalRequest._retry = true;

      try {
        await axios.post(`${API_BASE_URL}/api/token/refresh/`, {}, { withCredentials: true });
        return api(originalRequest);
      } catch {
        return Promise.reject(error);
      }
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
  estado: string;
}

export interface KanbanTaskData {
  id: number;
  titulo: string;
  descripcion: string;
  columna: string;
  fecha_hora?: string;
}


export interface MatrixItemData {
  id: number;
  task: string;
  quadrant: 'do' | 'schedule' | 'delegate' | 'eliminate';
  is_done: boolean;
}

export interface FacturaData {
  id: number;
  nombre: string;
  monto: number;
  fecha_vencimiento: string;
  pagado: boolean;
}

export const authService = {
  login: async (username: string, password: string) => {
    const response = await api.post('/api/token/', { username, password });
    return response.data;
  },
  
  getCurrentUser: async () => {
    const response = await api.get('/api/users/me/');
    return response.data;
  },
  
  register: async (username: string, email: string, password: string) => {
    const response = await api.post('/api/users/', { username, email, password });
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
    await api.post('/api/token/logout/');
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

export interface RuedaCategoria {
  id: number;
  nombre: string;
  icono: string;
  puntaje: number;
  comentario: string;
}

export interface DiagnosticoRuedaData {
  promedio_general: number;
  nivel_equilibrio: string;
  pico_alto: string;
  pico_bajo: string;
  foco_1: string;
  foco_2: string;
  foco_3: string;
  justificacion_focos: string;
}

export interface AccionSugeridaData {
  id: number;
  area_foco: string;
  texto: string;
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
  type: 'invitation' | 'delegation' | 'reminder';
  id: string;
  title: string;
  message: string;
  data: any;
  created_at: string;
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

export const granMetaAnualService = {
  generarSmart: async (data: any): Promise<any> => {
    const response = await api.post('/api/gran-meta-anual/generar-smart/', data);
    return response.data;
  },
  editarSmart: async (id: number, comentario: string): Promise<any> => {
    const response = await api.post(`/api/gran-meta-anual/${id}/editar-smart/`, { comentario });
    return response.data;
  },
  guardarBorrador: async (data: any): Promise<any> => {
    const response = await api.post('/api/gran-meta-anual/guardar-borrador/', data);
    return response.data;
  },
  aprobar: async (id: number): Promise<any> => {
    const response = await api.post(`/api/gran-meta-anual/${id}/aprobar/`);
    return response.data;
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
}

export interface ActivacionData {
  id: number;
  tipo: 'tradicional' | 'simulada' | 'con_intencion' | 'adaptativa';
  estado: 'pendiente' | 'enviada' | 'vista' | 'respondida' | 'ignorada' | 'fallida';
  titulo: string;
  mensaje: string;
  mensaje_intencion: string;
  metadata: any;
  ventana_programada: string | null;
  enviada_en: string | null;
  leida_en: string | null;
  respondida_en: string | null;
  creada: string;
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
    bloque_4_acciones_disponibles: Array<{
      accion_key: string;
      texto_boton: string;
      sugiere_flujo_adaptativo: boolean;
    }>;
  } | null;
  propuesta_id?: number;
}

export const analizarContextoService = {
  ejecutar: async (input: ContextoAnalisisInput): Promise<AnalisisContextoOutput> => {
    const response = await api.post('/api/ai/analizar-contexto/', input);
    return response.data;
  },
};

export interface MonthlyGoalData {
  id: number;
  plan: number;
  month_order: number;
  calendar_month: number;
  calendar_year: number;
  monthly_goal_text: string;
  brief_explanation: string;
  annual_goal_relation: string;
  complexity_level: 'BASE' | 'EJECUCION' | 'CONSOLIDACION' | 'CIERRE';
  status: 'PROPUESTA' | 'EDITADA' | 'APROBADA' | 'PENDIENTE';
  edited_by_user: boolean;
  version: number;
  creado: string;
  actualizado: string;
}

export interface MonthlyPlanData {
  id: number;
  user: number;
  annual_goal: number;
  cycle_start_month: number;
  cycle_start_year: number;
  status: 'PROPUESTA' | 'APROBADA' | 'PENDIENTE_REVISION';
  approved_at: string | null;
  creado: string;
  actualizado: string;
  goals: MonthlyGoalData[];
}

export interface MonthlyCheckStatus {
  has_approved_annual: boolean;
  has_monthly_plan: boolean;
  plan_status: string | null;
  plan_id?: number;
  annual_goal_id?: number;
  annual_goal_title?: string;
}

export const monthlyService = {
  checkStatus: async (): Promise<MonthlyCheckStatus> => {
    const response = await api.get('/api/monthly-plans/check_status/');
    return response.data;
  },
  generateProposals: async (data: { cycle_start_month: number; cycle_start_year: number }): Promise<MonthlyPlanData> => {
    const response = await api.post('/api/monthly-plans/generate_proposals/', data);
    return response.data;
  },
  getPlan: async (id: number): Promise<MonthlyPlanData> => {
    const response = await api.get(`/api/monthly-plans/${id}/`);
    return response.data;
  },
  editGoal: async (planId: number, monthOrder: number, instruction: string): Promise<MonthlyGoalData> => {
    const response = await api.patch(`/api/monthly-plans/${planId}/edit-goal/${monthOrder}/`, {
      user_instruction: instruction,
    });
    return response.data;
  },
  approvePlan: async (planId: number): Promise<MonthlyPlanData> => {
    const response = await api.post(`/api/monthly-plans/${planId}/approve_plan/`);
    return response.data;
  },
  getCurrentMonth: async (): Promise<{ plan_id: number | null; goal: MonthlyGoalData | null; cycle_start_month?: number; cycle_start_year?: number }> => {
    const response = await api.get('/api/monthly-plans/current_month/');
    return response.data;
  },
  createGoal: async (data: { plan_id: number; monthly_goal_text: string; brief_explanation?: string; annual_goal_relation?: string; calendar_month?: number; calendar_year?: number }): Promise<MonthlyGoalData> => {
    const response = await api.post('/api/monthly-plans/create_goal/', data);
    return response.data;
  },
};

export interface MatrizLearningProgressData {
  id: number;
  status: 'INCOMPLETO' | 'COMPLETADO';
  video_watched: boolean;
  practice_score: number;
  completed_at: string | null;
  creado: string;
  actualizado: string;
}

export const matrizProgressService = {
  getProgress: async (): Promise<MatrizLearningProgressData> => {
    const response = await api.get('/api/matriz-progress/progress/');
    return response.data;
  },
  updateProgress: async (data: Partial<MatrizLearningProgressData>): Promise<MatrizLearningProgressData> => {
    const response = await api.patch('/api/matriz-progress/progress/', data);
    return response.data;
  },
};

