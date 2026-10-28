import { useEffect, useRef, useState } from 'react';
import {
  Check, ChevronLeft, Info, FileWarning,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  FocusiaReportData, FocusiaReportRawMetadata, reportService,
} from '../services/api';
import { AVATAR_VARIACION_POR_NOMBRE } from '../constants/avatars';

// ──────────────────────────────────────────────────────────────────────────
// Tokens visuales (mockups del módulo de Reportes)
// ──────────────────────────────────────────────────────────────────────────
const CYAN = '#22D3EE';
const PURPLE = '#A855F7';
const BLUE = '#2563EB';
const GRAY_LINE = '#E2E8F0';

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
    return new Date(iso + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
  } catch {
    return iso;
  }
}

function nombreMes(iso: string): string {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('es-AR', { month: 'long' });
  } catch {
    return '';
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

/** Encabezado del período, como en los mockups: «5–11 de octubre de 2026». */
function rangoPeriodo(report: FocusiaReportData): string {
  const start = report.period_start;
  const end = report.period_end;
  try {
    if (report.level === 'annual') return String(new Date(end + 'T00:00:00').getFullYear());
    if (report.level === 'monthly') {
      return new Date(end + 'T00:00:00')
        .toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    }
    const a = new Date(start + 'T00:00:00');
    const b = new Date(end + 'T00:00:00');
    if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
      const mes = b.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
      return `${a.getDate()}–${b.getDate()} de ${mes}`;
    }
    return `${a.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} – ${
      b.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  } catch {
    return `${fmtDiaMes(start)} – ${fmtDiaMes(end)}`;
  }
}

/** Subtítulo bajo el rango: «1–30 de septiembre · Período cerrado». */
function subtituloPeriodo(report: FocusiaReportData): string {
  const cerrado = !!report.closed_at;
  const base = report.level === 'weekly'
    ? rangoPeriodo(report)
    : `${fmtDiaMes(report.period_start)} – ${fmtDiaMes(report.period_end)}`;
  const estado = cerrado ? 'Período cerrado' : 'Se actualiza hasta las 00:00';
  const parcial = report.is_partial ? 'Período parcial · ' : '';
  return `${base} · ${parcial}${estado}`;
}

const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// ──────────────────────────────────────────────────────────────────────────
// Datos del reporte
// ──────────────────────────────────────────────────────────────────────────
interface SerieDatum {
  fecha: string;
  planificadas: number;
  completadas: number;
}

/** Desglose de las acciones sin completar (Doc 27 §5), con respaldo para reportes previos. */
function desglosePendientes(report: FocusiaReportData) {
  const raw: FocusiaReportRawMetadata = (report.ai_raw_metadata || {}) as FocusiaReportRawMetadata;
  const pending = report.pending_count;
  const reprogramadas = raw.reprogramadas_sin_completar ?? Math.min(raw.reprogramadas ?? 0, pending);
  const eliminadas = raw.eliminadas_sin_completar ?? Math.min(raw.eliminadas ?? 0, pending);
  const pendientesAlCierre = raw.pendientes_al_cierre
    ?? Math.max(0, pending - reprogramadas - eliminadas);
  return { reprogramadas, eliminadas, pendientesAlCierre };
}

/** Serie del período, agrupada según el nivel (día / semana / mes). */
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
    // Los 7 días del período, incluyendo los sin acciones (como en el mockup).
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
    // Agrupado por semana natural dentro del mes.
    const inicio = new Date(report.period_start + 'T00:00:00');
    const fin = new Date(report.period_end + 'T00:00:00');
    let corte = new Date(inicio);
    while (corte <= fin) {
      const borde = new Date(corte);
      borde.setDate(corte.getDate() + 6);
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
  const valores: Record<string, string> = {
    planificadas: String(total),
    completadas: String(report.completed_count),
    sinCompletar: String(report.pending_count),
    cumplimiento: `${Math.round(report.completion_percentage)} %`,
  };
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4">
      {ESTADISTICAS.map((s, i) => (
        <div
          key={s.key}
          className={`flex flex-col gap-1 py-4 ${i > 0 ? 'sm:border-l sm:border-[#f1f5f9]' : ''}`}
        >
          {placeholder ? (
            <span className="block w-10 h-1 rounded-full" style={{ background: s.color }} />
          ) : (
            <span className="text-4xl font-bold tracking-tight" style={{ color: s.color }}>
              {valores[s.key]}
            </span>
          )}
          <span className="text-sm text-slate-500">{s.label}</span>
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
        style={{ background: pendiente ? '#f1f5f9' : `conic-gradient(${PURPLE} 0deg ${deg}deg, ${GRAY_LINE} ${deg}deg 360deg)` }}
      >
        <div className="absolute inset-[20px] rounded-full bg-white flex items-center justify-center">
          <span className="text-2xl font-bold text-slate-900">
            {pendiente ? '— %' : `${Math.round(porcentaje)} %`}
          </span>
        </div>
      </div>
      <div className="space-y-2 text-[15px] text-slate-700">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full" style={{ background: PURPLE }} />
          <span className="font-bold">{completadas}</span> completadas
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-slate-300" />
          <span className="font-bold">{sinCompletar}</span> sin completar
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
      <h4 className="text-base font-bold mb-2" style={{ color: BLUE }}>
        Desglose de acciones sin completar ({total})
      </h4>
      <ul className="space-y-1.5">
        {filas.map((f, i) => (
          <li key={i} className="flex gap-4 text-sm text-slate-700">
            <span className="font-bold min-w-[22px]" style={{ color: BLUE }}>{f.n}</span>
            {f.texto}
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-400 mt-2 italic">
        Acciones principales: cada una cuenta una sola vez.
      </p>
    </div>
  );
}

/** Tick del eje X con etiqueta principal y detalle (día + fecha). */
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
  const { x, y, width, value, color } = props;
  if (!value) return null;
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
  data,
  height,
}: {
  data: Array<{ etiqueta: string; detalle: string; planificadas: number; completadas: number }>;
  height: number;
}) {
  const hayDatos = data.some(d => d.planificadas > 0);
  if (!hayDatos) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center text-sm text-slate-400">
        Todavía no hay acciones computables para graficar en este período.
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center gap-5 text-sm text-slate-600 mb-2">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ background: CYAN }} /> Planificadas
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ background: PURPLE }} /> Completadas
        </span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 24, right: 8, left: -16, bottom: 12 }} barGap={4}>
          <defs>
            <linearGradient id="gplan" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7DD3FC" />
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
            height={34}
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
          <Bar dataKey="planificadas" fill="url(#gplan)" radius={[4, 4, 0, 0]} maxBarSize={44}>
            <LabelList dataKey="planificadas" content={<EtiquetaBarra color={CYAN} />} />
          </Bar>
          <Bar dataKey="completadas" fill="url(#gcomp)" radius={[4, 4, 0, 0]} maxBarSize={44}>
            <LabelList dataKey="completadas" content={<EtiquetaBarra color={PURPLE} />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function BarraProgreso({ porcentaje }: { porcentaje: number }) {
  return (
    <div className="h-4 rounded-full bg-slate-200 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${Math.max(0, Math.min(100, porcentaje))}%`,
          background: `linear-gradient(90deg, #7DD3FC, ${CYAN})`,
        }}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Pantalla
// ──────────────────────────────────────────────────────────────────────────
export function ReportDetailScreen({ report: initialReport, onBack, onNavigate }: {
  report: FocusiaReportData;
  onBack: () => void;
  onNavigate?: (section: string) => void;
}) {
  const [report, setReport] = useState(initialReport);
  const [actionTaken, setActionTaken] = useState(report.action_taken);
  const [loading, setLoading] = useState(false);
  const openedRef = useRef(false);

  // Doc 27 §7: se registra la consulta una sola vez por ingreso.
  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    reportService.open(initialReport.id).then(setReport).catch(() => {});
  }, [initialReport.id]);

  const handleAction = async (action: string, section: string | null, volver = false) => {
    setLoading(true);
    try {
      const updated = await reportService.takeAction(report.id, action);
      setReport(updated);
      setActionTaken(action as typeof actionTaken);
      if (section && onNavigate) onNavigate(section);
      else if (volver) onBack();
    } catch {}
    setLoading(false);
  };

  const estado = report.generation_state;
  const failed = estado === 'failed';
  const pendienteAnalisis = estado === 'analysis_pending';
  const sinDatos = report.completed_count === 0 && report.pending_count === 0;
  const vencido = !!report.closed_at;
  const serie = failed ? [] : serieGrafico(report);
  const meta = !failed ? report.goal_context?.meta_mensual : undefined;
  const granMeta = !failed ? report.goal_context?.gran_meta_anual : undefined;

  const CTA_NIVEL: Record<string, { action: string; label: string; section: string | null }> = {
    weekly: { action: 'reorganize_week', label: 'Reorganizar semana', section: 'semanal' },
    monthly: { action: 'adjust_goal', label: 'Ajustar objetivo', section: 'mensual' },
    annual: { action: 'adjust_goal', label: 'Revisar meta', section: null },
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-6">

        {/* Volver */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-[15px] font-medium hover:underline"
          style={{ color: BLUE }}
        >
          <ChevronLeft className="w-5 h-5" /> Volver a Reportes
        </button>

        {/* Encabezado */}
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 mt-5 mb-2">
          {LEVEL_TITULO[report.level] || 'Reporte'}
        </h1>
        <p className="text-xl sm:text-2xl font-bold" style={{ color: BLUE }}>
          {rangoPeriodo(report)}
        </p>
        <p className="text-sm text-slate-600 mt-1">{subtituloPeriodo(report)}</p>

        {failed ? (
          <>
            {/* Estado de error (período cerrado sin datos verificables) */}
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-8 mb-4">
              Los datos del período aún no están disponibles.
            </h2>
            <Estadisticas report={report} placeholder />

            <div className="grid md:grid-cols-2 gap-6 mt-2">
              <div className="border border-[#e2e8f0] rounded-xl p-6 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                  <FileWarning className="w-8 h-8 text-indigo-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Resumen no disponible</h3>
                <p className="text-base font-semibold text-slate-800 mt-3">
                  No pudimos generar tu reporte. Volveremos a intentarlo.
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Todavía no hay una base verificable para mostrar resultados.
                </p>
              </div>
              <div className="border border-[#e2e8f0] rounded-xl p-6 flex flex-col">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Gráficos pendientes</h3>
                <div className="flex-1 space-y-3 opacity-40">
                  {[92, 76, 84, 68].map((w, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-4 h-1.5 rounded-full bg-indigo-200" />
                      <span className="h-1.5 rounded-full bg-slate-200" style={{ width: `${w}%` }} />
                    </div>
                  ))}
                  <div className="border-t border-dashed border-slate-200 mt-6 pt-3" />
                </div>
                <p className="text-base font-semibold text-slate-800 mt-6">
                  Los gráficos aparecerán cuando los datos estén disponibles.
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  El reintento conserva este mismo reporte y los datos correspondientes al cierre.
                </p>
              </div>
            </div>

            {/* LÍA · Reporte pendiente */}
            <div className="border border-[#e2e8f0] rounded-xl p-6 mt-6 flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <img
                  src={AVATAR_VARIACION_POR_NOMBRE['lia'] || '/avatars/Lia.jpeg'}
                  alt="LÍA"
                  className="w-16 h-16 rounded-full object-cover border-2 border-purple-100 shrink-0"
                />
                <div className="min-w-0">
                  <h3 className="text-xl font-bold text-slate-900">
                    LÍA · <span style={{ color: BLUE }}>Reporte pendiente</span>
                  </h3>
                  <p className="text-sm text-slate-700 mt-1">
                    Estamos recuperando los datos del período.
                  </p>
                  <p className="text-sm text-slate-700">No necesitas iniciar otro reporte.</p>
                </div>
              </div>
              <div className="md:border-l md:border-[#e2e8f0] md:pl-6 flex items-center gap-4">
                <h4 className="text-lg font-bold text-slate-900 whitespace-nowrap">¿Cómo quieres continuar?</h4>
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
          </>
        ) : (
          <>
            {/* Mensaje principal */}
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-8">
              {report.level === 'annual' ? (
                sinDatos
                  ? 'Tu año todavía no tiene acciones computables.'
                  : <>Cerraste el período con el <span style={{ color: BLUE }}>{Math.round(report.completion_percentage)}%</span> de acciones completadas.</>
              ) : (
                sinDatos
                  ? 'Este período todavía no tiene acciones computables.'
                  : <>Completaste <span style={{ color: PURPLE }}>{report.completed_count}</span> de tus <span style={{ color: BLUE }}>{report.completed_count + report.pending_count}</span> acciones planificadas.</>
              )}
            </h2>
            {report.level === 'monthly' && meta?.texto && !sinDatos && (
              <p className="text-base text-slate-600 mt-2">Tu meta: {meta.texto}.</p>
            )}

            {!sinDatos && <Estadisticas report={report} />}

            {/* Tarjetas */}
            <div className="grid md:grid-cols-5 gap-6 mt-2">
              <div className="border border-[#e2e8f0] rounded-xl p-6 md:col-span-2">
                <h3 className="text-xl font-bold text-slate-900 mb-5">
                  {DONUT_TITULO[report.level]}
                </h3>
                <Donut
                  porcentaje={report.completion_percentage}
                  completadas={report.completed_count}
                  sinCompletar={report.pending_count}
                />
                <DesgloseSinCompletar report={report} />
                {sinDatos && (
                  <p className="text-sm text-slate-400 mt-3">
                    No hay acciones computables en este período, así que no se calcula un porcentaje.
                  </p>
                )}
              </div>

              <div className="border border-[#e2e8f0] rounded-xl p-6 md:col-span-3">
                <h3 className="text-xl font-bold text-slate-900 mb-5">
                  {CHART_TITULO[report.level]}
                </h3>
                <BarraSerie data={serie} height={260} />
              </div>
            </div>

            {/* Meta mensual vigente (solo si hay registrada) */}
            {meta?.texto && (
              <div className="border border-[#e2e8f0] rounded-xl p-6 mt-6">
                <h3 className="text-lg font-bold text-slate-900 mb-1">Tu meta mensual</h3>
                <p className="text-sm text-slate-700">{meta.texto}</p>
                {meta.relacion_anual && (
                  <p className="text-xs text-slate-400 mt-1">{meta.relacion_anual}</p>
                )}
              </div>
            )}

            {/* Gran Meta Anual (anual) */}
            {report.level === 'annual' && granMeta?.texto && (
              <div className="border border-[#e2e8f0] rounded-xl p-6 mt-6">
                <h3 className="text-lg font-bold text-slate-900 mb-1">Tu Gran Meta Anual</h3>
                <p className="text-sm text-slate-700">{granMeta.texto}</p>
              </div>
            )}

            {/* LÍA · balance */}
            <div className="border border-[#e2e8f0] rounded-xl p-6 mt-6 flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <img
                  src={AVATAR_VARIACION_POR_NOMBRE['lia'] || '/avatars/Lia.jpeg'}
                  alt="LÍA"
                  className="w-16 h-16 rounded-full object-cover border-2 border-purple-100 shrink-0"
                />
                <div className="min-w-0">
                  <h3 className="text-xl font-bold text-slate-900">
                    LÍA ·{' '}
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
                    <p className="text-sm text-slate-700 mt-1 whitespace-pre-line">
                      {report.ai_interpretation || 'Sin interpretación disponible para este período.'}
                    </p>
                  )}
                </div>
              </div>

              <div className="md:border-l md:border-[#e2e8f0] md:pl-6 md:w-[420px] shrink-0">
                <h4 className="text-lg font-bold text-slate-900 mb-4">¿Cómo quieres continuar?</h4>
                {actionTaken ? (
                  <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                    <span className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <Check className="w-5 h-5 text-emerald-600" />
                    </span>
                    <p className="text-sm font-semibold text-slate-700">
                      Acción registrada: {({
                        reorganize_week: 'Reorganizar semana',
                        adjust_goal: 'Ajustar objetivo',
                        keep_plan: 'Mantener plan',
                        review_later: 'Revisar más tarde',
                      } as Record<string, string>)[actionTaken]}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap md:flex-nowrap items-center gap-3">
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
                      className="text-[15px] underline hover:opacity-80 disabled:opacity-50 whitespace-nowrap"
                      style={{ color: BLUE }}
                    >
                      Revisar más tarde
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Nota de ventana de actualización */}
            {!vencido && (
              <div className="mt-4 flex items-center gap-2 text-sm" style={{ color: BLUE }}>
                <Info className="w-4 h-4" />
                El reporte puede actualizarse hasta las 00:00.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
