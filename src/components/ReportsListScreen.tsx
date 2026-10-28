import { useEffect, useState } from 'react';
import {
  CalendarRange, CalendarDays, Calendar, ChevronRight, History, AlertTriangle, Clock, Lock, Info,
} from 'lucide-react';
import { reportService, FocusiaReportData, ReporteResumenItem } from '../services/api';

type Level = 'weekly' | 'monthly' | 'annual';

const BLUE = '#2563EB';
const PURPLE = '#A855F7';

const LEVEL_META: Record<Level, { label: string; icon: typeof Calendar }> = {
  weekly: { label: 'Semanal', icon: CalendarRange },
  monthly: { label: 'Mensual', icon: CalendarDays },
  annual: { label: 'Anual', icon: Calendar },
};

function fmtDia(iso: string): string {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
  } catch {
    return iso;
  }
}

function fmtFechaLarga(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return iso || '';
  }
}

/** Referencia del período informado por cada tipo (Doc 27 §3.2). */
function periodoDe(report: FocusiaReportData): string {
  if (report.cycle_label) return report.cycle_label;
  if (report.level === 'weekly') {
    return `${fmtDia(report.period_start)} — ${fmtDia(report.period_end)}`;
  }
  if (report.level === 'monthly') {
    return new Date(report.period_end + 'T00:00:00').toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  }
  return String(new Date(report.period_end + 'T00:00:00').getFullYear());
}

/** Nota de estado bajo el período, como en el mockup de la lista. */
function notaEstado(report: FocusiaReportData): { texto: string; tipo: 'live' | 'cerrado' | 'failed' | 'pendiente' } {
  if (report.generation_state === 'failed') {
    return { texto: 'No se pudo generar · veremos un reintento', tipo: 'failed' };
  }
  if (report.generation_state === 'analysis_pending') {
    return { texto: 'Aún hay un análisis pendiente', tipo: 'pendiente' };
  }
  if (report.closed_at) {
    return { texto: 'Período cerrado · datos fijados al cierre', tipo: 'cerrado' };
  }
  return { texto: 'En actualización hasta las 00:00', tipo: 'live' };
}

function EstadoChico({ report }: { report: FocusiaReportData }) {
  const { texto, tipo } = notaEstado(report);
  const color = () => {
    switch (tipo) {
      case 'failed': return <span className="inline-flex items-center gap-1 text-red-500 font-semibold"><AlertTriangle className="w-3.5 h-3.5" /> {texto}</span>;
      case 'pendiente': return <span className="inline-flex items-center gap-1 text-amber-500 font-semibold"><Clock className="w-3.5 h-3.5" /> {texto}</span>;
      case 'cerrado': return <span className="inline-flex items-center gap-1 text-slate-400 font-medium"><Lock className="w-3 h-3" /> {texto}</span>;
      default: return texto;
    }
  };
  return <div className="text-xs mt-1">{color()}</div>;
}

export function ReportsListScreen({ onSelect, onBack }: {
  onSelect: (report: FocusiaReportData) => void;
  onBack: () => void;
}) {
  const [resumen, setResumen] = useState<ReporteResumenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [historial, setHistorial] = useState<Level | null>(null);
  const [historialItems, setHistorialItems] = useState<FocusiaReportData[]>([]);
  const [historialLoading, setHistorialLoading] = useState(false);

  useEffect(() => {
    reportService.getResumen()
      .then(setResumen)
      .catch(() => setResumen([]))
      .finally(() => setLoading(false));
  }, []);

  const abrirHistorial = async (level: Level) => {
    setHistorial(level);
    setHistorialLoading(true);
    try {
      setHistorialItems(await reportService.getAll(level));
    } catch {
      setHistorialItems([]);
    } finally {
      setHistorialLoading(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────
  // Historial de reportes anteriores
  // ──────────────────────────────────────────────────────────────────────
  if (historial) {
    const meta = LEVEL_META[historial];
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-6">
          <button
            onClick={() => setHistorial(null)}
            className="inline-flex items-center gap-1 text-[15px] font-medium hover:underline"
            style={{ color: BLUE }}
          >
            ‹ Volver a Reportes
          </button>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 mt-5 mb-1">
            Reportes anteriores
          </h1>
          <p className="text-lg font-bold" style={{ color: BLUE }}>Tipo {meta.label.toLowerCase()}</p>
          <p className="text-sm text-slate-600 mt-1">
            Del más reciente al más antiguo · Cada período cierra con sus datos fijados
          </p>

          <div className="mt-8 space-y-3">
            {historialLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : historialItems.length === 0 ? (
              <div className="text-center py-16">
                <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-400">Todavía no hay reportes anteriores de este tipo.</p>
              </div>
            ) : (
              historialItems.map(r => (
                <button
                  key={r.id}
                  onClick={() => onSelect(r)}
                  className="w-full border border-[#e2e8f0] rounded-xl p-4 hover:shadow-md transition-all text-left flex items-center gap-4"
                >
                  <div className="bg-blue-50 p-3 rounded-xl shrink-0">
                    <meta.icon className="w-5 h-5" style={{ color: BLUE }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-slate-900 truncate">
                      {periodoDe(r)}
                    </p>
                    <EstadoChico report={r} />
                    {r.never_opened && (
                      <span className="inline-block mt-1 text-[10px] font-bold text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">
                        Sin consultar en su intervalo
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {r.generation_state === 'ready' ? (
                      <>
                        <div className="text-2xl font-bold text-slate-900">
                          {Math.round(r.completion_percentage)}%
                        </div>
                        <div className="text-[10px] text-slate-400">cumplimiento</div>
                      </>
                    ) : (
                      <EstadoChico report={r} />
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────
  // Primera pantalla de Reportes (Doc 27 §3.2)
  // ──────────────────────────────────────────────────────────────────────
  const haySinConsultar = resumen.some(i => i.report?.never_opened && i.report.closed_at);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-[15px] font-medium hover:underline"
          style={{ color: BLUE }}
        >
          ‹ Volver al inicio
        </button>

        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 mt-5 mb-2">
          Reportes
        </h1>
        <p className="text-xl font-bold" style={{ color: BLUE }}>
         Elige el periodo que quieres revisar
        </p>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-3 gap-6 mt-10">
              {resumen.map(item => {
                const meta = LEVEL_META[item.level];
                const report = item.report;
                return (
                  <div
                    key={item.level}
                    className="border border-[#e2e8f0] rounded-xl p-6 flex flex-col gap-3"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                      <meta.icon className="w-8 h-8" style={{ color: BLUE }} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">{meta.label}</h2>

                    {report ? (
                      <>
                        <div className="text-base font-semibold" style={{ color: BLUE }}>
                          Último reporte disponible
                        </div>
                        <div className="text-base text-slate-700">{periodoDe(report)}</div>
                        <EstadoChico report={report} />
                        {report.is_partial && report.closed_at && (
                          <span className="text-xs text-slate-500">
                            Inició tu planificación a mitad de período
                          </span>
                        )}
                        <div className="mt-2 flex flex-col">
                          <button
                            onClick={() => onSelect(report)}
                            className="w-full text-white rounded-lg py-3 text-base font-semibold hover:brightness-110 active:scale-95 transition-all"
                            style={{ background: `linear-gradient(135deg, #8B5CF6, ${PURPLE})` }}
                          >
                            Ver reporte
                          </button>
                          <button
                            onClick={() => abrirHistorial(item.level)}
                            className="text-sm underline hover:opacity-80 mt-2 self-start"
                            style={{ color: BLUE }}
                          >
                            Ver reportes anteriores
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-base text-slate-600">
                          Aún no tienes reportes de este tipo.
                        </div>
                        {item.fecha_prevista ? (
                          <div className="text-sm text-slate-600">
                            Primer reporte previsto
                            <br />
                            {fmtFechaLarga(item.fecha_prevista)} · 21:00
                          </div>
                        ) : (
                          <div className="text-sm text-slate-500">
                            Falta completar tu configuración o tu planificación para calcular
                            la fecha del primer reporte.
                          </div>
                        )}
                        <button
                          disabled
                          className="text-sm text-slate-300 underline mt-2 text-left cursor-not-allowed"
                        >
                          Sin reportes anteriores
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex items-center gap-2 text-sm text-slate-500">
              <Info className="w-4 h-4" style={{ color: BLUE }} />
              {haySinConsultar
                ? 'Hay reportes que no consultaste en su intervalo. Aviso entregado: revisar cuando quieras.'
                : 'El reporte está disponible. Su aviso se entregará después de Focus, dentro del horario permitido.'}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
