import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/api/token/refresh/`, {
            refresh: refreshToken,
          });
          
          const { access } = response.data;
          localStorage.setItem('access_token', access);
          
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/';
          return Promise.reject(refreshError);
        }
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
  hora: number;
  tarea: string;
  estado: boolean;
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
}

export const recordatorioService = {
  getAll: async (): Promise<RecordatorioData[]> => {
    const response = await api.get('/api/recordatorios/');
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
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/recordatorios/${id}/`);
  }
};

export interface RuedaCategoria {
  id: number;
  nombre: string;
  icono: string;
  puntaje: number;
}

export const ruedaService = {
  getCompleta: async (): Promise<RuedaCategoria[]> => {
    const response = await api.get('/api/rueda-vida-completa/');
    return response.data;
  },
  guardar: async (puntajes: Record<number, number>): Promise<void> => {
    await api.post('/api/rueda-vida-completa/', { puntajes });
  }
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

