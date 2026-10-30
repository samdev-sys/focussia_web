import { useEffect, useRef, useState } from 'react';
import {
  Check, Info, FileWarning, Clock, ClipboardCheck,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  FocusiaReportData, FocusiaReportRawMetadata, reportService,
} from '../services/api';
import { ReportAvatarPose } from '../constants/avatars';
import {
  DEMO_REPORT_ANNUAL,
  DEMO_REPORT_MONTHLY,
  DEMO_REPORT_WEEKLY_CLOSED,
  DEMO_REPORT_WEEKLY_EMPTY,
  DEMO_REPORT_WEEKLY_FAILED,
  DEMO_REPORT_WEEKLY_LIVE,
  DEMO_REPORT_WEEKLY_PENDING_ANALYSIS,
  REPORT_BLUE as BLUE,
  REPORT_CYAN as CYAN,
  REPORT_GRAY_LINE as GRAY_LINE,
  REPORT_PURPLE as PURPLE,
  ReportHeroHeader,
  getReportAvatarName,
  getReportAvatarThumb,
  useResolvedAvatarIndex,
} from './reportMockups';

const LEVEL_TITULO: Record<string, string> = {
  weekly: 'Reporte semanal',
  monthly: 'Reporte mensual',
  annual: 'Reporte anual',
};

const BALANCE_LABEL: Record<string, string> = {
  weekly: 'Tu balance semanal',
  monthly: 'Tu balance mensual',
  annual: 'Tu balance anual',
};

const DONUT_TITULO: Record<string, string> = {
  weekly: 'Cumplimiento semanal',
  monthly: 'Cumplimiento de acciones',
  annual: 'Ejecución del plan',
};

const CHART_TITULO: Record<string, string> = {
  weekly: 'Tu semana, día a día',
  monthly: 'Tu mes, semana a semana',
  annual: 'Tu año, mes a mes',
};

// ──────────────────────────────────────────────────────────────────────────
// Utilidades de formato
// ──────────────────────────────────────────────────────────────────────────
function fmtDiaMes(iso: string): string {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  } catch {
    return iso;
  }
}

function mesCorto(iso: string): string {
  try {
    const nombre = new Date(iso + 'T00:00:00').toLocaleDateString('es-AR', { month: 'short' });
    return nombre.replace('.', '');
  } catch {
    return iso;
  }
}

function capFirst(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** Encabezado del período, como en los mockups: «5–11 de octubre de 2026». */
export function rangoPeriodo(report: FocusiaReportData): string {
  const start = report.period_start;
  const end = report.period_end;
  try {
    if (report.level === 'annual') return String(new Date(end + 'T00:00:00').getFullYear());
    if (report.level === 'monthly') {
      const m = new Date(end + 'T00:00:00').toLocaleDateString('es-AR', { month: 'long' });
      const y = new Date(end + 'T00:00:00').getFullYear();
      return `${capFirst(m)} ${y}`;
    }
    const a = new Date(start + 'T00:00:00');
    const b = new Date(end + 'T00:00:00');
    if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
      const mes = b.toLocaleDateString('es-AR', { month: 'long' });
      return `${a.getDate()}–${b.getDate()} de ${mes} de ${b.getFullYear()}`;
    }
    return `${a.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} – ${
      b.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  } catch {
    return `${fmtDiaMes(start)} – ${fmtDiaMes(end)}`;
  }
}

/** Subtítulo bajo el rango cuando el período está cerrado: «5–11 de octubre · Período cerrado». */
function subtituloCerrado(report: FocusiaReportData): string {
  try {
    const a = new Date(report.period_start + 'T00:00:00');
    const b = new Date(report.period_end + 'T00:00:00');
    let base = '';
    if (report.level === 'annual') {
      const mA = a.toLocaleDateString('es-AR', { month: 'long' });
      const mB = b.toLocaleDateString('es-AR', { month: 'long' });
      base = `${a.getDate()} de ${mA} – ${b.getDate()} de ${mB}`;
    } else if (a.getMonth() === b.getMonth()) {
      const mes = b.toLocaleDateString('es-AR', { month: 'long' });
      base = `${a.getDate()}–${b.getDate()} de ${mes}`;
    } else {
      base = `${fmtDiaMes(report.period_start)} – ${fmtDiaMes(report.period_end)}`;
    }
    const parcial = report.is_partial ? 'Período parcial · ' : '';
    return `${base} · ${parcial}Período cerrado`;
  } catch {
    return 'Período cerrado';
  }
}

const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function rangoCortoDias(report: FocusiaReportData): string {
  try {
    const a = new Date(report.period_start + 'T00:00:00');
    const b = new Date(report.period_end + 'T00:00:00');
    return `${DIAS_CORTOS[a.getDay()]} ${a.getDate()} ${mesCorto(report.period_start)} – ${DIAS_CORTOS[b.getDay()]} ${b.getDate()} ${mesCorto(report.period_end)}`;
  } catch {
    return `${report.period_start} – ${report.period_end}`;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Datos del reporte
// ──────────────────────────────────────────────────────────────────────────
interface SerieDatum {
  fecha: string;
  planificadas: number;
  completadas: number;
}

function desglosePendientes(report: FocusiaReportData) {
  const raw: FocusiaReportRawMetadata = (report.ai_raw_metadata || {}) as FocusiaReportRawMetadata;
  const pending = report.pending_count;
  const reprogramadas = raw.reprogramadas_sin_completar ?? Math.min(raw.reprogramadas ?? 0, pending);
  const eliminadas = raw.eliminadas_sin_completar ?? Math.min(raw.eliminadas ?? 0, pending);
  const pendientesAlCierre = raw.pendientes_al_cierre
    ?? Math.max(0, pending - reprogramadas - eliminadas);
  return { reprogramadas, eliminadas, pendientesAlCierre };
}

function serieGrafico(report: FocusiaReportData): Array<{
  etiqueta: string;
  detalle: string;
  planificadas: number;
  completadas: number;
}> {
  const raw: FocusiaReportRawMetadata = (report.ai_raw_metadata || {}) as FocusiaReportRawMetadata;
  const serie: SerieDatum[] = raw.serie_diaria || [];
  const porFecha = new Map(serie.map(s => [s.fecha, s]));
  const out: Array<{ etiqueta: string; detalle: string; planificadas: number; completadas: number }> = [];

  const sumar = (fecha: string) => {
    const e = porFecha.get(fecha);
    return { planificadas: e?.planificadas ?? 0, completadas: e?.completadas ?? 0 };
  };

  if (report.level === 'weekly') {
    const inicio = new Date(report.period_start + 'T00:00:00');
    for (let i = 0; i < 7; i++) {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      const fecha = d.toISOString().slice(0, 10);
      const { planificadas, completadas } = sumar(fecha);
      out.push({
        etiqueta: DIAS_CORTOS[d.getDay()],
        detalle: `${d.getDate()} ${mesCorto(fecha)}`,
        planificadas,
        completadas,
      });
    }
    return out;
  }

  if (report.level === 'monthly') {
    const inicio = new Date(report.period_start + 'T00:00:00');
    const fin = new Date(report.period_end + 'T00:00:00');
    let corte = new Date(inicio);
    while (corte <= fin) {
      const borde = new Date(corte);
      // Primera semana corta o bloques de 7 días (1–6, 7–13, 14–20, 21–27, 28–30)
      const diasBloque = corte.getDate() === 1 ? 5 : 6;
      borde.setDate(corte.getDate() + diasBloque);
      if (borde > fin) borde.setTime(fin.getTime());
      const acumulado = { planificadas: 0, completadas: 0 };
      for (let d = new Date(corte); d <= borde; d.setDate(d.getDate() + 1)) {
        const { planificadas, completadas } = sumar(d.toISOString().slice(0, 10));
        acumulado.planificadas += planificadas;
        acumulado.completadas += completadas;
      }
      const diaFin = (borde.getTime() === fin.getTime()) ? fin.getDate() : borde.getDate();
      const rango = corte.getDate() === diaFin
        ? `${corte.getDate()}`
        : `${corte.getDate()}–${diaFin} ${mesCorto(corte.toISOString().slice(0, 10))}`;
      out.push({ etiqueta: rango, detalle: '', ...acumulado });
      corte = new Date(borde);
      corte.setDate(borde.getDate() + 1);
    }
    return out;
  }

  // Anual: agrupado por calendario de meses del período.
  const inicio = report.period_start.slice(0, 7);
  const fin = report.period_end.slice(0, 7);
  let mes = inicio;
  while (mes <= fin) {
    const [anio, m] = mes.split('-').map(Number);
    const acumulado = { planificadas: 0, completadas: 0 };
    for (const s of serie) {
      if (s.fecha.slice(0, 7) === mes) {
        acumulado.planificadas += s.planificadas;
        acumulado.completadas += s.completadas;
      }
    }
    const nombre = new Date(anio, m - 1, 10).toLocaleDateString('es-AR', { month: 'short' });
    out.push({ etiqueta: nombre.replace('.', ''), detalle: '', ...acumulado });
    m === 12 ? (mes = `${anio + 1}-01`) : (mes = `${anio}-${String(m + 1).padStart(2, '0')}`);
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────────────
// Piezas de UI
// ──────────────────────────────────────────────────────────────────────────
const ESTADISTICAS: Array<{
  key: 'planificadas' | 'completadas' | 'sinCompletar' | 'cumplimiento';
  label: string;
  color: string;
}> = [
  { key: 'planificadas', label: 'Planificadas', color: CYAN },
  { key: 'completadas', label: 'Completadas', color: PURPLE },
  { key: 'sinCompletar', label: 'Sin completar', color: '#111827' },
  { key: 'cumplimiento', label: 'Cumplimiento', color: BLUE },
];

function Estadisticas({ report, placeholder }: { report: FocusiaReportData; placeholder?: boolean }) {
  const total = report.completed_count + report.pending_count;
  const sinDatos = total === 0;
  const valores: Record<string, string> = {
    planificadas: String(total),
    completadas: String(report.completed_count),
    sinCompletar: String(report.pending_count),
    cumplimiento: sinDatos ? '— %' : `${Math.round(report.completion_percentage)} %`,
  };
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-slate-100 pb-2">
      {ESTADISTICAS.map((s, i) => (
        <div
          key={s.key}
          className={`flex flex-col gap-1 py-4 ${i > 0 ? 'sm:border-l sm:border-[#e2e8f0] sm:pl-6' : ''}`}
        >
          {placeholder ? (
            <span className="block w-9 h-1.5 rounded-full my-3" style={{ background: s.color }} />
          ) : (
            <span className="text-4xl font-black tracking-tight" style={{ color: s.color }}>
              {valores[s.key]}
            </span>
          )}
          <span className="text-sm text-slate-600">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

function Donut({ porcentaje, completadas, sinCompletar, pendiente }: {
  porcentaje: number;
  completadas: number;
  sinCompletar: number;
  pendiente?: boolean;
}) {
  const deg = Math.max(0, Math.min(100, porcentaje)) * 3.6;
  return (
    <div className="flex flex-wrap items-center gap-6 mb-4">
      <div
        className="relative w-36 h-36 rounded-full shrink-0"
        style={{
          background: pendiente
            ? GRAY_LINE
            : `conic-gradient(${PURPLE} 0deg ${deg}deg, ${GRAY_LINE} ${deg}deg 360deg)`,
        }}
      >
        <div className="absolute inset-[20px] rounded-full bg-white flex items-center justify-center">
          <span className="text-2xl font-black text-slate-900">
            {pendiente ? '— %' : `${Math.round(porcentaje)} %`}
          </span>
        </div>
      </div>
      <div className="space-y-2.5 text-[15px] text-slate-700">
        <div className="flex items-center gap-2.5">
          <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: PURPLE }} />
          <span><strong className="font-bold text-slate-900">{completadas}</strong> completadas</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="w-3.5 h-3.5 rounded-full bg-slate-300 shrink-0" />
          <span><strong className="font-bold text-slate-900">{sinCompletar}</strong> sin completar</span>
        </div>
      </div>
    </div>
  );
}

function DesgloseSinCompletar({ report }: { report: FocusiaReportData }) {
  const { reprogramadas, eliminadas, pendientesAlCierre } = desglosePendientes(report);
  const total = report.pending_count;
  if (total <= 0) return null;
  const filas = [
    { n: pendientesAlCierre, texto: 'pendientes al cierre' },
    { n: reprogramadas, texto: 'reprogramadas a otro momento' },
    { n: eliminadas, texto: 'eliminadas tras planificar' },
  ].filter(f => f.n > 0);
  if (filas.length === 0) return null;
  return (
    <div className="border-t border-[#e2e8f0] pt-4 mt-4">
      <h4 className="text-[15px] font-bold mb-2.5" style={{ color: BLUE }}>
        Desglose de acciones sin completar ({total})
      </h4>
      <ul className="space-y-1.5">
        {filas.map((f, i) => (
          <li key={i} className="flex gap-3 text-sm text-slate-700">
            <span className="font-bold min-w-[20px]" style={{ color: BLUE }}>{f.n}</span>
            <span>{f.texto}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-400 mt-3">
        Acciones principales: cada una cuenta una sola vez.
      </p>
    </div>
  );
}

function TickEtiqueta({ x, y, payload }: any) {
  const { etiqueta, detalle } = payload.payload || {};
  return (
    <g transform={`translate(${x},${y})`} textAnchor="middle">
      <text y={14} x={0} className="fill-slate-700" fontSize={12} fontWeight={600}>
        {etiqueta}
      </text>
      {detalle && (
        <text y={30} x={0} className="fill-slate-400" fontSize={11}>
          {detalle}
        </text>
      )}
    </g>
  );
}

function EtiquetaBarra(props: any) {
  const { x, y, width, value, color, mostrarCero } = props;
  if (!value) {
    if (!mostrarCero) return null;
    return (
      <text
        x={Number(x) + Number(width)}
        y={Number(y) - 6}
        textAnchor="middle"
        fontSize={12}
        fontWeight={600}
        fill="#94A3B8"
      >
        0
      </text>
    );
  }
  return (
    <text
      x={Number(x) + Number(width) / 2}
      y={Number(y) - 6}
      textAnchor="middle"
      fontSize={12}
      fontWeight={700}
      fill={color}
    >
      {value}
    </text>
  );
}

function BarraSerie({
  report,
  data,
  height,
}: {
  report: FocusiaReportData;
  data: Array<{ etiqueta: string; detalle: string; planificadas: number; completadas: number }>;
  height: number;
}) {
  const hayDatos = data.some(d => d.planificadas > 0);
  return (
    <div>
      <div className="flex items-center gap-5 text-sm text-slate-700 mb-3">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ background: CYAN }} /> Planificadas
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ background: PURPLE }} /> Completadas
        </span>
      </div>

      {!hayDatos ? (
        <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#E8F1FF] flex items-center justify-center mb-4">
            <ClipboardCheck className="w-8 h-8" style={{ color: BLUE }} />
          </div>
          <h4 className="text-lg font-bold text-slate-800">
            Sin actividad registrada en los 7 días
          </h4>
          <p className="text-sm text-slate-400 mt-1">
            {rangoCortoDias(report)} · 0 acciones planificadas
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 24, right: 8, left: -18, bottom: 14 }} barGap={4}>
            <defs>
              <linearGradient id="gplan" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#67E8F9" />
                <stop offset="100%" stopColor={CYAN} />
              </linearGradient>
              <linearGradient id="gcomp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C084FC" />
                <stop offset="100%" stopColor={PURPLE} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="0" vertical={false} stroke={GRAY_LINE} />
            <XAxis
              dataKey="etiqueta"
              interval={0}
              axisLine={false}
              tickLine={false}
              tick={<TickEtiqueta />}
              height={36}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: 'rgba(148,163,184,0.08)' }}
              contentStyle={{ borderRadius: 10, border: `1px solid ${GRAY_LINE}`, fontSize: 13 }}
            />
            <Bar dataKey="planificadas" fill="url(#gplan)" radius={[4, 4, 0, 0]} maxBarSize={38}>
              <LabelList
                dataKey="planificadas"
                content={<EtiquetaBarra color="#06B6D4" mostrarCero={report.level === 'weekly'} />}
              />
            </Bar>
            <Bar dataKey="completadas" fill="url(#gcomp)" radius={[4, 4, 0, 0]} maxBarSize={38}>
              <LabelList dataKey="completadas" content={<EtiquetaBarra color={PURPLE} />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function BarraProgreso({ porcentaje }: { porcentaje: number }) {
  return (
    <div className="h-3.5 rounded-full bg-slate-200 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${Math.max(0, Math.min(100, porcentaje))}%`,
          background: `linear-gradient(90deg, #38BDF8, ${CYAN})`,
        }}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Pantalla de Detalle del Reporte (Doc 27)
// ──────────────────────────────────────────────────────────────────────────
export function ReportDetailScreen({
  report: initialReport,
  avatarIndex,
  onBack,
  onNavigate,
}: {
  report: FocusiaReportData;
  avatarIndex?: number;
  onBack: () => void;
  onNavigate?: (section: string) => void;
}) {
  const [report, setReport] = useState(initialReport);
  const [actionTaken, setActionTaken] = useState(initialReport.action_taken);
  const [loading, setLoading] = useState(false);
  const openedRef = useRef<number | null>(null);
  const resolvedAvatarIdx = useResolvedAvatarIndex(avatarIndex);

  useEffect(() => {
    setReport(initialReport);
    setActionTaken(initialReport.action_taken);
  }, [initialReport]);

  // Doc 27 §7: se registra la consulta una sola vez por ingreso (si es un reporte real en BD).
  useEffect(() => {
    if (openedRef.current === initialReport.id) return;
    openedRef.current = initialReport.id;
    if (initialReport.id < 9000) {
      reportService.open(initialReport.id).then(setReport).catch(() => {});
    }
  }, [initialReport.id]);

  const handleAction = async (action: string, section: string | null, volver = false) => {
    setLoading(true);
    try {
      if (report.id < 9000) {
        const updated = await reportService.takeAction(report.id, action);
        setReport(updated);
      }
      setActionTaken(action as typeof actionTaken);
      if (section && onNavigate) onNavigate(section);
      else if (volver) onBack();
    } catch {
      setActionTaken(action as typeof actionTaken);
      if (section && onNavigate) onNavigate(section);
      else if (volver) onBack();
    }
    setLoading(false);
  };

  const estado = report.generation_state;
  const failed = estado === 'failed';
  const pendienteAnalisis = estado === 'analysis_pending';
  const sinDatos = report.completed_count === 0 && report.pending_count === 0;
  const vencido = !!report.closed_at;
  const serie = failed ? [] : serieGrafico(report);
  const meta = !failed ? report.goal_context?.meta_mensual : undefined;
  const granMeta = !failed ? (report.goal_context?.gran_meta_anual as { texto?: string; progreso?: number } | undefined) : undefined;

  // Pose del avatar en el Hero según la pantalla del mockup:
  const heroPose: ReportAvatarPose = (() => {
    if (failed || pendienteAnalisis) return 'book';
    if (!vencido) return 'pc';
    if (report.level === 'monthly') return 'tab2';
    if (report.level === 'annual') return 'person';
    return 'bottom';
  })();

  const avatarThumb = getReportAvatarThumb(resolvedAvatarIdx);
  const avatarNombre = getReportAvatarName(resolvedAvatarIdx);

  const CTA_NIVEL: Record<string, { action: string; label: string; section: string | null }> = {
    weekly: { action: 'reorganize_week', label: 'Reorganizar semana', section: 'semanal' },
    monthly: { action: 'adjust_goal', label: 'Ajustar objetivo', section: 'mensual' },
    annual: { action: 'adjust_goal', label: 'Revisar meta', section: 'anual' },
  };

  const captionHero = !vencido ? (
    <span className="inline-flex items-center gap-1.5 text-slate-600">
      <Clock className="w-4 h-4 shrink-0" style={{ color: BLUE }} />
      En actualización · Los datos pueden cambiar hasta las 00:00
    </span>
  ) : (
    <span>{subtituloCerrado(report)}</span>
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 pb-10">
        {/* Selector rápido entre las vistas de detalle digitalizadas */}
        <div className="pt-3 pb-1 flex flex-wrap items-center gap-1.5 border-b border-slate-100 text-xs">
          <span className="font-bold text-slate-400 mr-1">Vistas de reporte:</span>
          {[
            { label: '‹ Lista / Historial / Notificaciones', active: false, onClick: onBack },
            {
              label: '2. Semanal',
              active: report.id === DEMO_REPORT_WEEKLY_CLOSED.id,
              onClick: () => { setReport(DEMO_REPORT_WEEKLY_CLOSED); setActionTaken(null); },
            },
            {
              label: '3. Mensual',
              active: report.id === DEMO_REPORT_MONTHLY.id,
              onClick: () => { setReport(DEMO_REPORT_MONTHLY); setActionTaken(null); },
            },
            {
              label: '4. Anual',
              active: report.id === DEMO_REPORT_ANNUAL.id,
              onClick: () => { setReport(DEMO_REPORT_ANNUAL); setActionTaken(null); },
            },
            {
              label: '6. Sin acciones (0/0)',
              active: report.id === DEMO_REPORT_WEEKLY_EMPTY.id,
              onClick: () => { setReport(DEMO_REPORT_WEEKLY_EMPTY); setActionTaken(null); },
            },
            {
              label: '7. En actualización',
              active: report.id === DEMO_REPORT_WEEKLY_LIVE.id,
              onClick: () => { setReport(DEMO_REPORT_WEEKLY_LIVE); setActionTaken(null); },
            },
            {
              label: '9. Análisis pendiente',
              active: report.id === DEMO_REPORT_WEEKLY_PENDING_ANALYSIS.id,
              onClick: () => { setReport(DEMO_REPORT_WEEKLY_PENDING_ANALYSIS); setActionTaken(null); },
            },
            {
              label: '10. Estado de error',
              active: report.id === DEMO_REPORT_WEEKLY_FAILED.id,
              onClick: () => { setReport(DEMO_REPORT_WEEKLY_FAILED); setActionTaken(null); },
            },
          ].map((btn) => (
            <button
              key={btn.label}
              type="button"
              onClick={btn.onClick}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                btn.active
                  ? 'bg-[#E8F1FF] text-[#2563EB]'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <ReportHeroHeader
          pose={heroPose}
          avatarIndex={resolvedAvatarIdx}
          backLabel="Volver a Reportes"
          onBack={onBack}
          title={LEVEL_TITULO[report.level] || 'Reporte'}
          subtitle={rangoPeriodo(report)}
          caption={captionHero}
        />

        {failed ? (
          <>
            {/* Foto 10 · Estado de error (período cerrado sin datos verificables) */}
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-7 mb-2">
              Los datos del período aún no están disponibles.
            </h2>
            <Estadisticas report={report} placeholder />

            <div className="grid md:grid-cols-5 gap-6 mt-5">
              <div className="border border-[#e2e8f0] rounded-xl p-6 md:col-span-2 flex flex-col">
                <h3 className="text-xl font-bold text-slate-900 mb-6">Resumen no disponible</h3>
                <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                  <div className="w-16 h-16 rounded-2xl bg-[#EEF2FF] flex items-center justify-center mb-4">
                    <FileWarning className="w-8 h-8 text-indigo-400" />
                  </div>
                  <p className="text-base font-bold text-slate-800 max-w-xs">
                    No pudimos generar tu reporte. Volveremos a intentarlo.
                  </p>
                  <p className="text-sm text-slate-400 mt-1.5 max-w-xs">
                    Todavía no hay una base verificable para mostrar resultados.
                  </p>
                </div>
              </div>

              <div className="border border-[#e2e8f0] rounded-xl p-6 md:col-span-3 flex flex-col">
                <h3 className="text-xl font-bold text-slate-900 mb-5">Gráficos pendientes</h3>
                <div className="flex-1 space-y-3.5 py-2">
                  {[88, 72, 82, 64].map((w, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-6 h-1.5 rounded-full bg-indigo-200" />
                      <span className="h-1.5 rounded-full bg-slate-200" style={{ width: `${w}%` }} />
                    </div>
                  ))}
                  <div className="border-t border-dashed border-slate-200 mt-6 pt-3" />
                </div>
                <div className="text-center mt-4">
                  <p className="text-base font-bold text-slate-800">
                    Los gráficos aparecerán cuando los datos estén disponibles.
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    El reintento conserva este mismo reporte y los datos correspondientes al cierre.
                  </p>
                </div>
              </div>
            </div>

            {/* Avatar · Reporte pendiente */}
            <div className="border border-[#e2e8f0] rounded-xl p-5 sm:p-6 mt-6 flex flex-col lg:flex-row lg:items-center gap-6">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <img
                  src={avatarThumb}
                  alt={avatarNombre}
                  className="w-16 h-16 rounded-full object-cover border-2 border-purple-100 shrink-0"
                />
                <div className="min-w-0">
                  <h3 className="text-xl font-bold text-slate-900">
                    {avatarNombre} · <span style={{ color: BLUE }}>Reporte pendiente</span>
                  </h3>
                  <p className="text-sm text-slate-700 mt-1">
                    Estamos recuperando los datos del período.
                  </p>
                  <p className="text-sm text-slate-700">No necesitas iniciar otro reporte.</p>
                </div>
              </div>
              <div className="lg:border-l lg:border-[#e2e8f0] lg:pl-6 flex flex-col sm:flex-row sm:items-center gap-4">
                <div>
                  <h4 className="text-lg font-bold text-slate-900 mb-3">¿Cómo quieres continuar?</h4>
                  <div className="flex flex-wrap items-center gap-4">
                    <button
                      onClick={onBack}
                      className="border-2 rounded-lg px-5 py-2.5 text-[15px] font-semibold hover:shadow transition-all active:scale-95 whitespace-nowrap"
                      style={{ borderColor: PURPLE, color: '#7C3AED' }}
                    >
                      Volver a Reportes
                    </button>
                    <button
                      onClick={() => handleAction('review_later', null, true)}
                      disabled={loading}
                      className="text-[15px] underline hover:opacity-80 disabled:opacity-50 whitespace-nowrap"
                      style={{ color: BLUE }}
                    >
                      Revisar más tarde
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Mensaje principal */}
            <h2 className="text-2xl sm:text-[28px] font-bold text-slate-900 mt-7">
              {report.level === 'annual' && !sinDatos ? (
                <>
                  Cerraste el período con el{' '}
                  <span style={{ color: BLUE }}>{Math.round(report.completion_percentage)}%</span>{' '}
                  de acciones completadas.
                </>
              ) : (
                <>
                  Completaste{' '}
                  <span style={{ color: PURPLE }}>{report.completed_count}</span>{' '}
                  de tus{' '}
                  <span style={{ color: BLUE }}>{report.completed_count + report.pending_count}</span>{' '}
                  acciones planificadas.
                </>
              )}
            </h2>
            {report.level === 'monthly' && meta?.texto && (
              <p className="text-base text-slate-700 mt-1.5">Tu meta: {meta.texto}.</p>
            )}

            <Estadisticas report={report} />

            {/* Tarjetas de gráfico (Donut + Serie) */}
            <div className="grid md:grid-cols-5 gap-6 mt-5">
              <div className="border border-[#e2e8f0] rounded-xl p-6 md:col-span-2 flex flex-col">
                <h3 className="text-xl font-bold text-slate-900 mb-5">
                  {DONUT_TITULO[report.level]}
                </h3>
                <Donut
                  porcentaje={report.completion_percentage}
                  completadas={report.completed_count}
                  sinCompletar={report.pending_count}
                  pendiente={sinDatos}
                />
                {sinDatos ? (
                  <div className="border-t border-[#e2e8f0] pt-4 mt-4">
                    <h4 className="text-[15px] font-bold mb-1.5" style={{ color: BLUE }}>
                      Sin acciones computables
                    </h4>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      No registraste acciones principales en este período. Las subtareas se reflejan
                      a través de su acción principal.
                    </p>
                    <p className="text-xs text-slate-400 mt-3">
                      Acciones principales: cada una cuenta una sola vez.
                    </p>
                  </div>
                ) : (
                  <DesgloseSinCompletar report={report} />
                )}
              </div>

              <div className="border border-[#e2e8f0] rounded-xl p-6 md:col-span-3 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-4">
                    {CHART_TITULO[report.level]}
                  </h3>
                  <BarraSerie
                    report={report}
                    data={serie}
                    height={report.level === 'annual' && granMeta?.texto ? 220 : 255}
                  />
                </div>

                {/* Foto 4 · Gran Meta Anual integrada bajo el gráfico anual */}
                {report.level === 'annual' && granMeta?.texto && (
                  <div className="border-t border-[#e2e8f0] pt-4 mt-3">
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <p className="text-sm text-slate-800">
                        <strong className="font-bold text-slate-900">Tu Gran Meta Anual:</strong>{' '}
                        {granMeta.texto}
                      </p>
                      <span className="text-base font-bold shrink-0" style={{ color: BLUE }}>
                        {Math.round(granMeta.progreso ?? report.completion_percentage)}%
                      </span>
                    </div>
                    <BarraProgreso porcentaje={granMeta.progreso ?? report.completion_percentage} />
                  </div>
                )}
              </div>
            </div>

            {/* Tarjeta inferior: Avatar · Balance + ¿Cómo quieres continuar? */}
            <div className="border border-[#e2e8f0] rounded-xl p-5 sm:p-6 mt-6 flex flex-col lg:flex-row lg:items-center gap-6">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <img
                  src={avatarThumb}
                  alt={avatarNombre}
                  className="w-16 h-16 rounded-full object-cover border-2 border-purple-100 shrink-0"
                />
                <div className="min-w-0">
                  <h3 className="text-xl font-bold text-slate-900">
                    {avatarNombre} ·{' '}
                    {pendienteAnalisis ? (
                      <span style={{ color: BLUE }}>Análisis pendiente</span>
                    ) : (
                      <span style={{ color: BLUE }}>{BALANCE_LABEL[report.level]}</span>
                    )}
                  </h3>
                  {pendienteAnalisis ? (
                    <>
                      <p className="text-sm text-slate-700 mt-1">
                        Los datos del período están disponibles.
                      </p>
                      <p className="text-sm text-slate-700">
                        La interpretación se completará aquí automáticamente.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-slate-700 mt-1 whitespace-pre-line leading-relaxed">
                      {report.ai_interpretation || 'Sin interpretación disponible para este período.'}
                    </p>
                  )}
                </div>
              </div>

              <div className="lg:border-l lg:border-[#e2e8f0] lg:pl-6 shrink-0">
                <h4 className="text-lg font-bold text-slate-900 mb-3">¿Cómo quieres continuar?</h4>
                {actionTaken ? (
                  <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
                    <span className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4 text-emerald-600" />
                    </span>
                    <p className="text-sm font-semibold text-slate-700">
                      Acción registrada:{' '}
                      {({
                        reorganize_week: 'Reorganizar semana',
                        adjust_goal: report.level === 'annual' ? 'Revisar meta' : 'Ajustar objetivo',
                        keep_plan: 'Mantener plan',
                        review_later: 'Revisar más tarde',
                      } as Record<string, string>)[actionTaken]}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => {
                        const cta = CTA_NIVEL[report.level];
                        handleAction(cta.action, cta.section);
                      }}
                      disabled={loading}
                      className="text-white rounded-lg px-5 py-2.5 text-[15px] font-semibold hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap"
                      style={{ background: `linear-gradient(135deg, #8B5CF6, ${PURPLE})` }}
                    >
                      {CTA_NIVEL[report.level]?.label}
                    </button>
                    <button
                      onClick={() => handleAction('keep_plan', null)}
                      disabled={loading}
                      className="border-2 rounded-lg px-5 py-2.5 text-[15px] font-semibold hover:shadow transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
                      style={{ borderColor: PURPLE, color: '#7C3AED' }}
                    >
                      Mantener plan
                    </button>
                    <button
                      onClick={() => handleAction('review_later', null, true)}
                      disabled={loading}
                      className="text-[15px] underline hover:opacity-80 disabled:opacity-50 whitespace-nowrap ml-1"
                      style={{ color: BLUE }}
                    >
                      Revisar más tarde
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Nota inferior de ventana de actualización */}
            {!vencido ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                <Info className="w-4 h-4 shrink-0" style={{ color: BLUE }} />
                Si completas o modificas acciones antes de las 00:00, este reporte se actualizará.
                Después de esa hora el período queda cerrado.
              </div>
            ) : (
              report.level === 'weekly' && !sinDatos && !pendienteAnalisis && (
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                  <Info className="w-4 h-4 shrink-0" style={{ color: BLUE }} />
                  El reporte puede actualizarse hasta las 00:00.
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}
