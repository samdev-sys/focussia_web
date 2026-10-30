import React, { useEffect, useState } from 'react';
import {
  FocusiaReportData, ReporteResumenItem, configService, configuracionService,
} from '../services/api';
import {
  ReportAvatarPose, getReportAvatarHero, getReportAvatarName, getReportAvatarThumb,
} from '../constants/avatars';

export const REPORT_CYAN = '#22D3EE';
export const REPORT_PURPLE = '#A855F7';
export const REPORT_BLUE = '#2563EB';
export const REPORT_GRAY_LINE = '#E2E8F0';

/** Hook que resuelve el índice de avatar activo del usuario (1..6, por defecto 4 = Lía). */
export function useResolvedAvatarIndex(propAvatarIndex?: number): number {
  const [resolved, setResolved] = useState<number>(
    propAvatarIndex && propAvatarIndex >= 1 && propAvatarIndex <= 6 ? propAvatarIndex : 0,
  );

  useEffect(() => {
    if (propAvatarIndex && propAvatarIndex >= 1 && propAvatarIndex <= 6) {
      setResolved(propAvatarIndex);
      return;
    }
    let alive = true;
    configService.getAvatar()
      .then((a) => {
        if (!alive) return;
        const id = Number(a?.current_avatar_id) || 0;
        if (id >= 1 && id <= 6) setResolved(id);
      })
      .catch(() => {});
    configuracionService.getMiConfig()
      .then((c) => {
        if (!alive) return;
        const id = Number(c?.avatar_index) || 0;
        if (id >= 1 && id <= 6) setResolved(id);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [propAvatarIndex]);

  return resolved >= 1 && resolved <= 6 ? resolved : 4;
}

/** Encabezado Hero compartido por las 12 pantallas de Reportes y Notificaciones. */
export function ReportHeroHeader({
  pose,
  avatarIndex,
  backLabel,
  onBack,
  title,
  subtitle,
  caption,
}: {
  pose: ReportAvatarPose;
  avatarIndex?: number;
  backLabel: string;
  onBack: () => void;
  title: string;
  subtitle: string;
  caption?: React.ReactNode;
}) {
  const idx = useResolvedAvatarIndex(avatarIndex);
  const heroSrc = getReportAvatarHero(pose, idx);

  return (
    <div className="relative overflow-hidden border-b border-slate-200 min-h-[210px] sm:min-h-[235px] flex items-end pb-7 pt-5">
      {/* Imagen del avatar a la derecha con fundido suave hacia la izquierda */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-full sm:w-[64%] md:w-[60%]"
      >
        <img
          src={heroSrc}
          alt=""
          className="h-full w-full object-cover object-[center_18%]"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, #FFFFFF 0%, rgba(255,255,255,0.96) 18%, rgba(255,255,255,0.55) 42%, rgba(255,255,255,0) 72%)',
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white/70 to-transparent" />
      </div>

      {/* Contenido izquierdo: logo + volver + título + subtítulo */}
      <div className="relative z-10 w-full max-w-2xl">
        <div className="flex items-center gap-2.5 mb-3">
          <img src="/focussia.png" alt="Focusia" className="w-9 h-9 object-contain" />
          <span className="text-[26px] font-extrabold tracking-tight text-[#14173A] leading-none">
            Focusia
          </span>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-[15px] font-medium hover:underline"
          style={{ color: REPORT_BLUE }}
        >
          ‹ {backLabel}
        </button>

        <h1 className="text-4xl sm:text-[44px] font-black tracking-tight text-slate-900 mt-3 leading-[1.08]">
          {title}
        </h1>
        <p className="text-xl sm:text-[22px] font-bold mt-1.5" style={{ color: REPORT_BLUE }}>
          {subtitle}
        </p>
        {caption && (
          <div className="text-sm text-slate-600 mt-1.5">{caption}</div>
        )}
      </div>
    </div>
  );
}

/** Iconos SVG de las tarjetas de Reportes (fieles a los mockups). */
export function IconoSemanal({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 36" fill="none" className={className}>
      <rect x="5" y="7" width="26" height="24" rx="5" stroke={REPORT_BLUE} strokeWidth="2.4" />
      <path d="M5 14H31" stroke={REPORT_BLUE} strokeWidth="2.4" />
      <path d="M12 4V9M24 4V9" stroke={REPORT_BLUE} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="12" cy="20" r="1.6" fill={REPORT_BLUE} />
      <circle cx="18" cy="20" r="1.6" fill={REPORT_BLUE} />
      <circle cx="24" cy="20" r="1.6" fill={REPORT_BLUE} />
      <circle cx="12" cy="25.5" r="1.6" fill={REPORT_BLUE} />
      <circle cx="18" cy="25.5" r="1.6" fill={REPORT_BLUE} />
      <circle cx="24" cy="25.5" r="1.6" fill={REPORT_BLUE} />
    </svg>
  );
}

export function IconoMensual({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 36" fill="none" className={className}>
      <path
        d="M29 19V12C29 9.23858 26.7614 7 24 7H10C7.23858 7 5 9.23858 5 12V25C5 27.7614 7.23858 30 10 30H18"
        stroke={REPORT_BLUE}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path d="M5 14H29" stroke={REPORT_BLUE} strokeWidth="2.4" />
      <path d="M11 4V9M23 4V9" stroke={REPORT_BLUE} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="25.5" cy="25.5" r="6.5" stroke={REPORT_BLUE} strokeWidth="2.2" fill="#E8F1FF" />
      <path
        d="M22.8 25.5L24.7 27.4L28.5 23.6"
        stroke={REPORT_BLUE}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconoAnual({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 36" fill="none" className={className}>
      <rect x="6" y="19" width="6" height="11" rx="2" stroke={REPORT_BLUE} strokeWidth="2.4" />
      <rect x="15" y="13" width="6" height="17" rx="2" stroke={REPORT_BLUE} strokeWidth="2.4" />
      <rect x="24" y="6" width="6" height="24" rx="2" stroke={REPORT_BLUE} strokeWidth="2.4" />
    </svg>
  );
}

export function IconoCampana({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 36" fill="none" className={className}>
      <path
        d="M18 6C13.03 6 9 10.03 9 15V21L6.5 24.5C6.05 25.13 6.5 26 7.28 26H28.72C29.5 26 29.95 25.13 29.5 24.5L27 21V15C27 10.03 22.97 6 18 6Z"
        stroke="#7C3AED"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M14.5 26.5C14.9 28.5 16.3 30 18 30C19.7 30 21.1 28.5 21.5 26.5"
        stroke={REPORT_BLUE}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Datos de respaldo / demostración fieles a las 12 capturas del módulo
// ──────────────────────────────────────────────────────────────────────────
export const DEMO_REPORT_WEEKLY_CLOSED: FocusiaReportData = {
  id: 9001,
  user: 1,
  level: 'weekly',
  period_start: '2026-10-05',
  period_end: '2026-10-11',
  completion_percentage: 78,
  completed_count: 14,
  pending_count: 4,
  strong_days: ['Martes', 'Miércoles', 'Viernes'],
  weak_days: ['Jueves'],
  consistency_score: 78,
  headline_message: 'Completaste 14 de tus 18 acciones planificadas (78%).',
  ai_interpretation:
    'Avanzaste con constancia de lunes a viernes y completaste la mayoría de tus acciones.\nDos quedaron pendientes al cierre y una se reprogramó.',
  ai_raw_metadata: {
    pendientes_al_cierre: 2,
    reprogramadas_sin_completar: 1,
    eliminadas_sin_completar: 1,
    serie_diaria: [
      { fecha: '2026-10-05', planificadas: 3, completadas: 3 },
      { fecha: '2026-10-06', planificadas: 4, completadas: 3 },
      { fecha: '2026-10-07', planificadas: 4, completadas: 3 },
      { fecha: '2026-10-08', planificadas: 3, completadas: 2 },
      { fecha: '2026-10-09', planificadas: 4, completadas: 3 },
      { fecha: '2026-10-10', planificadas: 0, completadas: 0 },
      { fecha: '2026-10-11', planificadas: 0, completadas: 0 },
    ],
  },
  status: 'notified',
  notified_at: '2026-10-11T21:00:00Z',
  opened_at: null,
  action_taken: null,
  action_taken_at: null,
  generation_state: 'ready',
  is_partial: false,
  cycle_label: '5 — 11 oct',
  updated_until: '2026-10-12T00:00:00Z',
  closed_at: '2026-10-12T00:00:00Z',
  never_opened: false,
  created_at: '2026-10-11T21:00:00Z',
  data_sources: [],
};

export const DEMO_REPORT_WEEKLY_LIVE: FocusiaReportData = {
  ...DEMO_REPORT_WEEKLY_CLOSED,
  id: 9002,
  closed_at: null,
};

export const DEMO_REPORT_WEEKLY_EMPTY: FocusiaReportData = {
  ...DEMO_REPORT_WEEKLY_CLOSED,
  id: 9003,
  period_start: '2026-10-12',
  period_end: '2026-10-18',
  cycle_label: '12 — 18 oct',
  completion_percentage: 0,
  completed_count: 0,
  pending_count: 0,
  headline_message: 'Completaste 0 de tus 0 acciones planificadas.',
  ai_interpretation:
    'Este período cerró sin acciones planificadas.\nDefine las de la próxima semana para empezar el seguimiento.',
  ai_raw_metadata: {
    pendientes_al_cierre: 0,
    reprogramadas_sin_completar: 0,
    eliminadas_sin_completar: 0,
    serie_diaria: [],
  },
};

export const DEMO_REPORT_WEEKLY_PENDING_ANALYSIS: FocusiaReportData = {
  ...DEMO_REPORT_WEEKLY_CLOSED,
  id: 9004,
  generation_state: 'analysis_pending',
};

export const DEMO_REPORT_WEEKLY_FAILED: FocusiaReportData = {
  ...DEMO_REPORT_WEEKLY_CLOSED,
  id: 9005,
  generation_state: 'failed',
};

export const DEMO_REPORT_MONTHLY: FocusiaReportData = {
  id: 9006,
  user: 1,
  level: 'monthly',
  period_start: '2026-09-01',
  period_end: '2026-09-30',
  completion_percentage: 79,
  completed_count: 49,
  pending_count: 13,
  strong_days: [],
  weak_days: [],
  consistency_score: 79,
  headline_message: 'Completaste 49 de tus 62 acciones planificadas (79%).',
  ai_interpretation:
    'Mantuviste un ritmo sostenido en las cuatro semanas completas del mes.\nEl tramo final concentró la mayoría de las acciones reprogramadas.',
  ai_raw_metadata: {
    pendientes_al_cierre: 6,
    reprogramadas_sin_completar: 4,
    eliminadas_sin_completar: 3,
    serie_diaria: [
      { fecha: '2026-09-03', planificadas: 12, completadas: 10 },
      { fecha: '2026-09-10', planificadas: 14, completadas: 11 },
      { fecha: '2026-09-17', planificadas: 13, completadas: 11 },
      { fecha: '2026-09-24', planificadas: 15, completadas: 11 },
      { fecha: '2026-09-29', planificadas: 8, completadas: 6 },
    ],
  },
  status: 'opened',
  notified_at: '2026-09-30T21:00:00Z',
  opened_at: '2026-10-01T10:00:00Z',
  action_taken: null,
  action_taken_at: null,
  generation_state: 'ready',
  is_partial: false,
  cycle_label: 'Septiembre 2026',
  updated_until: '2026-10-01T00:00:00Z',
  closed_at: '2026-10-01T00:00:00Z',
  never_opened: false,
  created_at: '2026-09-30T21:00:00Z',
  data_sources: [],
  goal_context: {
    meta_mensual: {
      texto: 'Consolidar el hábito de enfoque diario',
    },
  },
};

export const DEMO_REPORT_ANNUAL: FocusiaReportData = {
  id: 9007,
  user: 1,
  level: 'annual',
  period_start: '2026-01-01',
  period_end: '2026-12-31',
  completion_percentage: 75,
  completed_count: 482,
  pending_count: 158,
  strong_days: [],
  weak_days: [],
  consistency_score: 75,
  headline_message: 'Cerraste el período con el 75% de acciones completadas.',
  ai_interpretation:
    'Sostuviste el plan durante los doce meses, con tus puntos más altos en marzo, mayo y septiembre.\nTres cuartas partes de las acciones planificadas quedaron completadas.',
  ai_raw_metadata: {
    pendientes_al_cierre: 74,
    reprogramadas_sin_completar: 52,
    eliminadas_sin_completar: 32,
    serie_diaria: [
      { fecha: '2026-01-15', planificadas: 48, completadas: 36 },
      { fecha: '2026-02-15', planificadas: 52, completadas: 40 },
      { fecha: '2026-03-15', planificadas: 56, completadas: 44 },
      { fecha: '2026-04-15', planificadas: 50, completadas: 35 },
      { fecha: '2026-05-15', planificadas: 58, completadas: 45 },
      { fecha: '2026-06-15', planificadas: 54, completadas: 42 },
      { fecha: '2026-07-15', planificadas: 52, completadas: 38 },
      { fecha: '2026-08-15', planificadas: 48, completadas: 34 },
      { fecha: '2026-09-15', planificadas: 62, completadas: 49 },
      { fecha: '2026-10-15', planificadas: 55, completadas: 42 },
      { fecha: '2026-11-15', planificadas: 53, completadas: 40 },
      { fecha: '2026-12-15', planificadas: 52, completadas: 37 },
    ],
  },
  status: 'opened',
  notified_at: '2026-12-31T21:00:00Z',
  opened_at: '2027-01-01T10:00:00Z',
  action_taken: null,
  action_taken_at: null,
  generation_state: 'ready',
  is_partial: false,
  cycle_label: '2026',
  updated_until: '2027-01-01T00:00:00Z',
  closed_at: '2027-01-01T00:00:00Z',
  never_opened: false,
  created_at: '2026-12-31T21:00:00Z',
  data_sources: [],
  goal_context: {
    gran_meta_anual: {
      texto: 'Publicar mi primer libro',
      progreso: 75,
    } as any,
  },
};

export const DEMO_HISTORIAL_WEEKLY: FocusiaReportData[] = [
  {
    ...DEMO_REPORT_WEEKLY_CLOSED,
    id: 9101,
    cycle_label: '5 – 11 oct 2026',
    action_taken: 'reorganize_week',
    completion_percentage: 78,
  },
  {
    ...DEMO_REPORT_WEEKLY_CLOSED,
    id: 9102,
    period_start: '2026-09-28',
    period_end: '2026-10-04',
    cycle_label: '28 sep – 4 oct 2026',
    never_opened: true,
    action_taken: null,
    completion_percentage: 64,
    completed_count: 11,
    pending_count: 6,
  },
  {
    ...DEMO_REPORT_WEEKLY_CLOSED,
    id: 9103,
    period_start: '2026-09-21',
    period_end: '2026-09-27',
    cycle_label: '21 – 27 sep 2026',
    action_taken: 'keep_plan',
    completion_percentage: 85,
    completed_count: 17,
    pending_count: 3,
  },
  {
    ...DEMO_REPORT_WEEKLY_CLOSED,
    id: 9104,
    period_start: '2026-09-14',
    period_end: '2026-09-20',
    cycle_label: '14 – 20 sep 2026',
    generation_state: 'analysis_pending',
    action_taken: null,
    completion_percentage: 75,
  },
  {
    ...DEMO_REPORT_WEEKLY_CLOSED,
    id: 9105,
    period_start: '2026-09-07',
    period_end: '2026-09-13',
    cycle_label: '7 – 13 sep 2026',
    is_partial: true,
    action_taken: null,
    completion_percentage: 71,
    completed_count: 10,
    pending_count: 4,
  },
];

export const DEMO_RESUMEN_DISPONIBLES: ReporteResumenItem[] = [
  { level: 'weekly', has_report: true, report: DEMO_REPORT_WEEKLY_LIVE, fecha_prevista: null },
  { level: 'monthly', has_report: true, report: DEMO_REPORT_MONTHLY, fecha_prevista: null },
  { level: 'annual', has_report: true, report: DEMO_REPORT_ANNUAL, fecha_prevista: null },
];

export const DEMO_RESUMEN_VACIO: ReporteResumenItem[] = [
  { level: 'weekly', has_report: false, report: null, fecha_prevista: '2026-10-11' },
  { level: 'monthly', has_report: false, report: null, fecha_prevista: '2026-10-31' },
  { level: 'annual', has_report: false, report: null, fecha_prevista: '2026-12-31' },
];

export const DEMO_RESUMEN_FOCUS: ReporteResumenItem[] = [
  { level: 'weekly', has_report: true, report: DEMO_REPORT_WEEKLY_LIVE, fecha_prevista: null },
  {
    level: 'monthly',
    has_report: true,
    report: { ...DEMO_REPORT_MONTHLY, never_opened: true },
    fecha_prevista: null,
  },
  { level: 'annual', has_report: false, report: null, fecha_prevista: '2026-12-31' },
];

export { getReportAvatarName, getReportAvatarThumb };
