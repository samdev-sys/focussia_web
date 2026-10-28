import axios, { AxiosError } from 'axios';

/**
 * Cliente HTTP del panel de administración.
 *
 * Reutiliza la misma autenticación por cookie que la app de usuario
 * (`focusia_api.authentication.CookieJWTAuthentication`), así que no hay tokens
 * en localStorage. Lo que cambia es el prefijo: todo el panel vive bajo
 * `/api/admin/`, donde el backend exige `user.is_staff`.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const adminApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  // Sin `Content-Type` fijo: los formularios de subida necesitan que el navegador
  // ponga el boundary del multipart. Axios lo resuelve solo si no lo forzamos.
});

adminApi.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await axios.post(`${API_BASE_URL}/api/token/refresh/`, {}, { withCredentials: true });
        return adminApi(originalRequest);
      } catch {
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  },
);

/** Error normalizado para pintar mensajes en el panel. */
export function leerError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Record<string, unknown> | undefined;

    if (typeof data?.detail === 'string') return data.detail;

    // Errores de validación de DRF: {campo: [mensajes]} o {non_field_errors: [...]}
    if (data && typeof data === 'object') {
      const partes: string[] = [];
      for (const [campo, valor] of Object.entries(data)) {
        const texto = Array.isArray(valor) ? valor.join(' ') : String(valor);
        partes.push(campo === 'non_field_errors' ? texto : `${campo}: ${texto}`);
      }
      if (partes.length) return partes.join(' · ');
    }

    if (error.code === 'ERR_NETWORK') {
      return 'No se pudo conectar con el servidor. Revisa que el backend esté arriba.';
    }
    if (error.response?.status === 403) {
      return 'Tu usuario no tiene permisos de administrador.';
    }
  }
  return 'Ocurrió un error inesperado.';
}

// ── Tipos ──

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
}

export interface Objetivo {
  titulo: string;
  descripcion?: string;
}

export interface ProgramMonth {
  id: number;
  month_number: number;
  theme_name: string;
  training_theme: string;
  formative_objective: string;
  training: MonthlyTraining | null;
}

export interface MonthlyTraining {
  id: number;
  month: number;
  month_number: number;
  month_theme: string;
  title: string;
  content: string;
  media_url: string | null;
  media_file: string | null;
  media_resuelto: string;
  duracion_minutos: number;
  video_url: string;
  video_file: string | null;
  video_resuelto: string;
  objetivos: Objetivo[];
}

export interface ProgramDay {
  id: number;
  month: number;
  month_number: number;
  month_theme: string;
  day_number: number;
  phrase: string;
  intention: string;
  technical_note: string;
  coaching_question: string;
  es_integracion: boolean;
  origen_integracion: string;
}

export interface TribuTema {
  id: number;
  titulo: string;
  descripcion: string;
  reflexion: string;
  pregunta: string;
  imagen_url: string;
  imagen_file: string | null;
  imagen_file_url: string;
  imagen_resuelta: string;
  activo: boolean;
  creado: string;
  actualizado: string;
}

export interface LearningModule {
  id: number;
  category: number;
  name: string;
  order: number;
}

export interface LearningCategory {
  id: number;
  slug: string;
  name: string;
  order: number;
  modules: LearningModule[];
}

export interface GuidedTourBlock {
  id: number;
  slug: string;
  title: string;
  avatar_message: string;
  order: number;
}

export interface Avatar {
  id: number;
  name: string;
  gender: 'male' | 'female';
  image: string;
  image_file: string | null;
  image_file_url: string;
  image_resuelta: string;
  voice_id: string;
  intro_message_text: string;
  intro_message_audio: string;
  intro_message_audio_file: string | null;
  audio_file_url: string;
  audio_resuelto: string;
  is_active: boolean;
  created_at: string;
}

export interface Juego {
  id: number;
  titulo: string;
  descripcion: string;
  tipo: 'juego' | 'reto' | 'video' | 'interactivo';
  url: string;
  imagen_url: string;
  imagen_file: string | null;
  imagen_file_url: string;
  imagen_resuelta: string;
  categoria: number | null;
  categoria_nombre: string | null;
  activo: boolean;
  orden: number;
  creado: string;
  actualizado: string;
}

export interface Overview {
  programa: {
    meses: number;
    dias: number;
    meses_completos: number;
    meses_sin_capacitacion: number[];
    capacitaciones_sin_video: number[];
  };
  tribu: { temas: number; tema_activo: TribuTema | null };
  aprendizaje: { categorias: number; modulos: number; bloques_guia: number };
  avatares: { total: number; activos: number };
  juegos: { total: number; activos: number };
  usuarios: { total: number; completaron_mes_actual: number };
}

// ── Endpoints ──

const R = '/api/admin';

export const adminService = {
  session: () => adminApi.get<AdminUser>(`${R}/session/`).then((r) => r.data),
  overview: () => adminApi.get<Overview>(`${R}/overview/`).then((r) => r.data),

  // Tabla maestra del programa
  listarMeses: () => adminApi.get<ProgramMonth[]>(`${R}/program-months/`).then((r) => r.data),
  crearMes: (datos: Partial<ProgramMonth>) =>
    adminApi.post<ProgramMonth>(`${R}/program-months/`, datos).then((r) => r.data),
  editarMes: (id: number, datos: Partial<ProgramMonth>) =>
    adminApi.patch<ProgramMonth>(`${R}/program-months/${id}/`, datos).then((r) => r.data),
  borrarMes: (id: number) => adminApi.delete(`${R}/program-months/${id}/`),

  crearCapacitacion: (datos: Partial<MonthlyTraining>) =>
    adminApi.post<MonthlyTraining>(`${R}/trainings/`, datos).then((r) => r.data),
  editarCapacitacion: (id: number, datos: Partial<MonthlyTraining>) =>
    adminApi.patch<MonthlyTraining>(`${R}/trainings/${id}/`, datos).then((r) => r.data),
  borrarCapacitacion: (id: number) => adminApi.delete(`${R}/trainings/${id}/`),

  listarDias: (mes?: number) =>
    adminApi
      .get<ProgramDay[]>(`${R}/program-days/`, { params: mes ? { month: mes } : {} })
      .then((r) => r.data),
  crearDia: (datos: Partial<ProgramDay>) =>
    adminApi.post<ProgramDay>(`${R}/program-days/`, datos).then((r) => r.data),
  editarDia: (id: number, datos: Partial<ProgramDay>) =>
    adminApi.patch<ProgramDay>(`${R}/program-days/${id}/`, datos).then((r) => r.data),
  borrarDia: (id: number) => adminApi.delete(`${R}/program-days/${id}/`),

  // Tribu
  listarTemasTribu: () => adminApi.get<TribuTema[]>(`${R}/tribu-themes/`).then((r) => r.data),
  crearTemaTribu: (datos: Partial<TribuTema>) =>
    adminApi.post<TribuTema>(`${R}/tribu-themes/`, datos).then((r) => r.data),
  editarTemaTribu: (id: number, datos: Partial<TribuTema>) =>
    adminApi.patch<TribuTema>(`${R}/tribu-themes/${id}/`, datos).then((r) => r.data),
  borrarTemaTribu: (id: number) => adminApi.delete(`${R}/tribu-themes/${id}/`),
  activarTemaTribu: (id: number) =>
    adminApi.post<TribuTema>(`${R}/tribu-themes/${id}/activar/`).then((r) => r.data),

  // Aprendizaje
  listarCategorias: () =>
    adminApi.get<LearningCategory[]>(`${R}/learning-categories/`).then((r) => r.data),
  crearCategoria: (datos: Partial<LearningCategory>) =>
    adminApi.post<LearningCategory>(`${R}/learning-categories/`, datos).then((r) => r.data),
  editarCategoria: (id: number, datos: Partial<LearningCategory>) =>
    adminApi.patch<LearningCategory>(`${R}/learning-categories/${id}/`, datos).then((r) => r.data),
  borrarCategoria: (id: number) => adminApi.delete(`${R}/learning-categories/${id}/`),

  listarModulos: (categoria?: number) =>
    adminApi
      .get<LearningModule[]>(`${R}/learning-modules/`, {
        params: categoria ? { category: categoria } : {},
      })
      .then((r) => r.data),
  crearModulo: (datos: Partial<LearningModule>) =>
    adminApi.post<LearningModule>(`${R}/learning-modules/`, datos).then((r) => r.data),
  editarModulo: (id: number, datos: Partial<LearningModule>) =>
    adminApi.patch<LearningModule>(`${R}/learning-modules/${id}/`, datos).then((r) => r.data),
  borrarModulo: (id: number) => adminApi.delete(`${R}/learning-modules/${id}/`),

  // Visita guiada
  listarBloques: () => adminApi.get<GuidedTourBlock[]>(`${R}/guided-tour-blocks/`).then((r) => r.data),
  crearBloque: (datos: Partial<GuidedTourBlock>) =>
    adminApi.post<GuidedTourBlock>(`${R}/guided-tour-blocks/`, datos).then((r) => r.data),
  editarBloque: (id: number, datos: Partial<GuidedTourBlock>) =>
    adminApi.patch<GuidedTourBlock>(`${R}/guided-tour-blocks/${id}/`, datos).then((r) => r.data),
  borrarBloque: (id: number) => adminApi.delete(`${R}/guided-tour-blocks/${id}/`),

  // Avatares
  listarAvatares: () => adminApi.get<Avatar[]>(`${R}/avatars/`).then((r) => r.data),
  crearAvatar: (datos: Partial<Avatar>) =>
    adminApi.post<Avatar>(`${R}/avatars/`, datos).then((r) => r.data),
  editarAvatar: (id: number, datos: Partial<Avatar>) =>
    adminApi.patch<Avatar>(`${R}/avatars/${id}/`, datos).then((r) => r.data),
  borrarAvatar: (id: number) => adminApi.delete(`${R}/avatars/${id}/`),

  // Juegos
  listarJuegos: () => adminApi.get<Juego[]>(`${R}/juegos/`).then((r) => r.data),
  crearJuego: (datos: Partial<Juego>) =>
    adminApi.post<Juego>(`${R}/juegos/`, datos).then((r) => r.data),
  editarJuego: (id: number, datos: Partial<Juego>) =>
    adminApi.patch<Juego>(`${R}/juegos/${id}/`, datos).then((r) => r.data),
  borrarJuego: (id: number) => adminApi.delete(`${R}/juegos/${id}/`),
};

/** Login del panel. Usa el mismo endpoint que la app; el permiso se valida después. */
export const adminAuth = {
  login: (username: string, password: string) =>
    axios
      .post(`${API_BASE_URL}/api/token/`, { username, password }, { withCredentials: true })
      .then(() => adminService.session()),
  logout: () =>
    axios
      .post(`${API_BASE_URL}/api/token/logout/`, {}, { withCredentials: true })
      .catch(() => undefined),
};
