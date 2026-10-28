export type IntensityLevel = 'SUAVE' | 'EQUILIBRADA' | 'EXIGENTE';
export type AvatarTone = 'MOTIVATOR' | 'STRATEGIC' | 'DEMANDING' | 'ADAPTIVE';
export type AllowedChannel = 'APP' | 'PUSH' | 'WHATSAPP_SIM' | 'CRITICAL_CALL';
export type OnboardingStatus = 'INICIADO' | 'CONFIG_CONFIRMADA' | 'COMPLETADO';
export type AvatarId = 1 | 2 | 3 | 4 | 5 | 6;

export interface UserProfile {
  user_id: string;
  full_name: string;
  avatar_id: AvatarId;
  intensity_level: IntensityLevel;
  allowed_channels: AllowedChannel[];
  avatar_tone: AvatarTone;
  onboarding_status: OnboardingStatus;
}

export interface NavigationState {
  user_id: string;
  is_first_entry: boolean;
  tutorial_progress: {
    watched_induction: boolean;
    dashboard_tour: 'PENDIENTE' | 'COMPLETADO';
  };
}

export interface WheelOfLifeScores {
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
}

export interface WheelOfLife {
  user_id: string;
  scores: WheelOfLifeScores;
  top_three_focus_areas: string[];
}

export type ComplexityLevel = 'BASE' | 'EJECUCION' | 'CONSOLIDACION' | 'CIERRE';

export interface MonthlyGoal {
  month_order: number;
  calendar_month: number;
  calendar_year: number;
  goal_text: string;
  explanation: string;
  relation_to_annual: string;
  complexity_level: ComplexityLevel;
}

export interface MonthlyPlan {
  user_id: string;
  cycle_start_month: number;
  cycle_start_year: number;
  is_approved: boolean;
  goals: MonthlyGoal[];
}

export type ClassificationStatus = 'PENDIENTE' | 'HACER' | 'PLANIFICAR' | 'DELEGAR' | 'ELIMINAR';
export type ActionSource = 'USER_INPUT' | 'RUEDA_VIDA_SUGGESTION';

export interface KanbanAction {
  id: string;
  user_id: string;
  title: string;
  source: ActionSource;
  classification_status: ClassificationStatus;
  scheduled_date?: string;
  is_double_clicked_fixed: boolean;
}

export interface Subaction {
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
  subactions: Subaction[];
  created_at: string;
  updated_at: string;
}

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
  created_at: string;
  data_sources: { id: number; source_type: string; reference_id: string; snapshot: Record<string, unknown> }[];
}

export type WheelCategoryKey = keyof WheelOfLifeScores;

export const WHEEL_CATEGORIES: { key: WheelCategoryKey; label: string; icon: string }[] = [
  { key: 'trabajo', label: 'Trabajo', icon: '💼' },
  { key: 'dinero', label: 'Dinero', icon: '💰' },
  { key: 'salud', label: 'Salud', icon: '🏥' },
  { key: 'pareja', label: 'Pareja', icon: '💑' },
  { key: 'familia', label: 'Familia', icon: '👨‍👩‍👧‍👦' },
  { key: 'espiritualidad', label: 'Espiritualidad', icon: '🧘' },
  { key: 'diversion', label: 'Diversión', icon: '🎮' },
  { key: 'entorno', label: 'Entorno', icon: '🏠' },
  { key: 'desarrollo', label: 'Desarrollo', icon: '📚' },
  { key: 'contribucion', label: 'Contribución', icon: '🤝' },
];

export const CATEGORY_COLORS: Record<WheelCategoryKey, string> = {
  trabajo: '#ef4444',
  dinero: '#f97316',
  salud: '#22c55e',
  pareja: '#ec4899',
  familia: '#8b5cf6',
  espiritualidad: '#06b6d4',
  diversion: '#eab308',
  entorno: '#3b82f6',
  desarrollo: '#84cc16',
  contribucion: '#f43f5e',
};

export const COMPLEXITY_LEVELS: { value: ComplexityLevel; label: string; months: number[] }[] = [
  { value: 'BASE', label: 'Base (Meses 1-3)', months: [1, 2, 3] },
  { value: 'EJECUCION', label: 'Ejecución (Meses 4-6)', months: [4, 5, 6] },
  { value: 'CONSOLIDACION', label: 'Consolidación (Meses 7-9)', months: [7, 8, 9] },
  { value: 'CIERRE', label: 'Cierre (Meses 10-12)', months: [10, 11, 12] },
];

export const INTENSITY_OPTIONS: { value: IntensityLevel; label: string; description: string }[] = [
  { value: 'SUAVE', label: 'Suave', description: 'Acompañamiento gentil, recordatorios ligeros' },
  { value: 'EQUILIBRADA', label: 'Equilibrada', description: 'Balance entre apoyo y exigencia' },
  { value: 'EXIGENTE', label: 'Exigente', description: 'Alta exigencia, seguimiento estricto' },
];

export const AVATAR_TONES: { value: AvatarTone; label: string; description: string }[] = [
  { value: 'MOTIVATOR', label: 'Motivador', description: 'Ánimo y refuerzo positivo' },
  { value: 'STRATEGIC', label: 'Estratégico', description: 'Enfoque en planificación y resultados' },
  { value: 'DEMANDING', label: 'Exigente', description: 'Alta demanda de cumplimiento' },
  { value: 'ADAPTIVE', label: 'Adaptativo', description: 'Se ajusta a tu momento actual' },
];

export const CHANNELS: { value: AllowedChannel; label: string; icon: string }[] = [
  { value: 'APP', label: 'En App', icon: '📱' },
  { value: 'PUSH', label: 'Push', icon: '🔔' },
  { value: 'WHATSAPP_SIM', label: 'WhatsApp Sim.', icon: '💬' },
  { value: 'CRITICAL_CALL', label: 'Llamada Crítica', icon: '📞' },
];

export const AVATARS: { id: AvatarId; name: string; gender: 'M' | 'F'; file: string }[] = [
  { id: 1, name: 'Alex', gender: 'M', file: '/avatars/avatar1.jpg' },
  { id: 2, name: 'Sam', gender: 'M', file: '/avatars/avatar2.jpg' },
  { id: 3, name: 'Jordan', gender: 'M', file: '/avatars/avatar3.jpg' },
  { id: 4, name: 'Taylor', gender: 'F', file: '/avatars/avatar4.jpg' },
  { id: 5, name: 'Casey', gender: 'F', file: '/avatars/avatar5.jpg' },
  { id: 6, name: 'Morgan', gender: 'F', file: '/avatars/avatar6.jpg' },
];