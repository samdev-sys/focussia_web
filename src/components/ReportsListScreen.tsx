import React, { useEffect, useState } from 'react';
import {
  ChevronRight, History, AlertTriangle, Clock, Lock, Info, Hourglass,
} from 'lucide-react';
import { reportService, FocusiaReportData, ReporteResumenItem } from '../services/api';
import { ReportNotificationsScreen } from './ReportNotificationBanner';
import {
  DEMO_HISTORIAL_WEEKLY,
  DEMO_REPORT_ANNUAL,
  DEMO_REPORT_MONTHLY,
  DEMO_REPORT_WEEKLY_CLOSED,
  DEMO_REPORT_WEEKLY_EMPTY,
  DEMO_REPORT_WEEKLY_FAILED,
  DEMO_REPORT_WEEKLY_LIVE,
  DEMO_REPORT_WEEKLY_PENDING_ANALYSIS,
  DEMO_RESUMEN_DISPONIBLES,
  DEMO_RESUMEN_FOCUS,
  DEMO_RESUMEN_VACIO,
  IconoAnual,
  IconoMensual,
  IconoSemanal,
  REPORT_BLUE as BLUE,
  REPORT_PURPLE as PURPLE,
  ReportHeroHeader,
} from './reportMockups';

type Level = 'weekly' | 'monthly' | 'annual';

const LEVEL_META: Record<
  Level,
  { label: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  weekly: { label: 'Semanal', Icon: IconoSemanal },
  monthly: { label: 'Mensual', Icon: IconoMensual },
  annual: { label: 'Anual', Icon: IconoAnual },
};

const ACTION_LABELS: Record<string, string> = {
  reorganize_week: 'Reorganizar semana',
  adjust_goal: 'Ajustar objetivo',
  keep_plan: 'Mantener plan',
  review_later: 'Revisar más tarde',
};

function fmtDia(iso: string): string {
  try {
    const d = new Date(iso + 'T00:00:00');
    const mes = d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '');
    return `${d.getDate()} ${mes}`;
  } catch {
    return iso;
  }
}

function capFirst(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function fmtFechaPrevista(iso: string, level: Level): string {
  try {
    const d = new Date(iso + 'T00:00:00');
    if (level === 'weekly') {
      const diaSemana = capFirst(d.toLocaleDateString('es-AR', { weekday: 'long' }));
      const mes = d.toLocaleDateString('es-AR', { month: 'long' });
      return `${diaSemana} ${d.getDate()} de ${mes} · 21:00`;
    }
    const fecha = d.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return `${fecha} · 21:00`;
  } catch {
    return `${iso} · 21:00`;
  }
}

/** Referencia del período informado por cada tipo (Doc 27 §3.2). */
function periodoDe(report: FocusiaReportData): string {
  if (report.cycle_label) return report.cycle_label;
  if (report.level === 'weekly') {
    try {
      const a = new Date(report.period_start + 'T00:00:00');
      const b = new Date(report.period_end + 'T00:00:00');
      if (a.getMonth() === b.getMonth()) {
        const mes = b.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '');
        return `${a.getDate()} — ${b.getDate()} ${mes}`;
      }
    } catch {
      /* fallback below */
    }
    return `${fmtDia(report.period_start)} — ${fmtDia(report.period_end)}`;
  }
  if (report.level === 'monthly') {
    const str = new Date(report.period_end + 'T00:00:00').toLocaleDateString('es-AR', {
      month: 'long',
      year: 'numeric',
    });
    return capFirst(str.replace(' de ', ' '));
  }
  return String(new Date(report.period_end + 'T00:00:00').getFullYear());
}

/** Nota de estado bajo el período, como en el mockup de la lista. */
function notaEstado(
  report: FocusiaReportData,
  enHistorial = false,
): { texto: string; tipo: 'live' | 'cerrado' | 'failed' | 'pendiente' } {
  if (!enHistorial && report.generation_state === 'failed') {
    return { texto: 'No se pudo generar · veremos un reintento', tipo: 'failed' };
  }
  if (!enHistorial && report.generation_state === 'analysis_pending') {
    return { texto: 'Aún hay un análisis pendiente', tipo: 'pendiente' };
  }
  if (report.closed_at) {
    if (enHistorial && report.is_partial) {
      return {
        texto: 'Período cerrado · parcial (inició a mitad de semana)',
        tipo: 'cerrado',
      };
    }
    return { texto: 'Período cerrado · datos fijados al cierre', tipo: 'cerrado' };
  }
  return { texto: 'En actualización hasta las 00:00', tipo: 'live' };
}

function EstadoChico({
  report,
  enHistorial = false,
}: {
  report: FocusiaReportData;
  enHistorial?: boolean;
}) {
  const { texto, tipo } = notaEstado(report, enHistorial);
  const contenido = () => {
    switch (tipo) {
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-red-500 font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" /> {texto}
          </span>
        );
      case 'pendiente':
        return (
          <span className="inline-flex items-center gap-1 text-amber-500 font-semibold">
            <Clock className="w-3.5 h-3.5" /> {texto}
          </span>
        );
      case 'cerrado':
        return enHistorial ? (
          <span className="inline-flex items-center gap-1.5 text-slate-500">
            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {texto}
          </span>
        ) : (
          <span className="text-slate-600">{texto}</span>
        );
      default:
        return <span className="text-slate-600">{texto}</span>;
    }
  };
  return <div className="text-sm mt-0.5">{contenido()}</div>;
}

type ModoLista = 'disponibles' | 'vacio' | 'focus' | 'notificaciones';

export function ReportsListScreen({
  onSelect,
  onBack,
  avatarIndex,
  focusActivo = false,
}: {
  onSelect: (report: FocusiaReportData) => void;
  onBack: () => void;
  avatarIndex?: number;
  focusActivo?: boolean;
}) {
  const [resumenReal, setResumenReal] = useState<ReporteResumenItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [modoLista, setModoLista] = useState<ModoLista>(focusActivo ? 'focus' : 'disponibles');
  const [historial, setHistorial] = useState<Level | null>(null);
  const [historialItems, setHistorialItems] = useState<FocusiaReportData[]>([]);
  const [historialLoading, setHistorialLoading] = useState(false);

  useEffect(() => {
    reportService
      .getResumen()
      .then((data) => {
        if (Array.isArray(data) && data.some((i) => i.report !== null)) {
          setResumenReal(data);
        } else {
          setResumenReal(null);
        }
      })
      .catch(() => setResumenReal(null))
      .finally(() => setLoading(false));
  }, []);

  const abrirHistorial = async (level: Level) => {
    setHistorial(level);
    setHistorialLoading(true);
    try {
      const items = await reportService.getAll(level);
      if (Array.isArray(items) && items.length > 0) {
        setHistorialItems(items);
      } else {
        setHistorialItems(DEMO_HISTORIAL_WEEKLY);
      }
    } catch {
      setHistorialItems(DEMO_HISTORIAL_WEEKLY);
    } finally {
      setHistorialLoading(false);
    }
  };

  // Barra de acceso rápido a las 12 pantallas digitalizadas
  const SelectorPantallas = () => (
    <div className="pt-3 pb-1 flex flex-wrap items-center gap-1.5 border-b border-slate-100 text-xs">
      <span className="font-bold text-slate-400 mr-1">Vistas:</span>
      {[
        {
          label: '1. Reportes',
          active: !historial && modoLista === 'disponibles',
          onClick: () => { setHistorial(null); setModoLista('disponibles'); },
        },
        {
          label: '2. Semanal',
          active: false,
          onClick: () => onSelect(DEMO_REPORT_WEEKLY_CLOSED),
        },
        {
          label: '3. Mensual',
          active: false,
          onClick: () => onSelect(DEMO_REPORT_MONTHLY),
        },
        {
          label: '4. Anual',
          active: false,
          onClick: () => onSelect(DEMO_REPORT_ANNUAL),
        },
        {
          label: '5. Historial',
          active: historial === 'weekly',
          onClick: () => { setModoLista('disponibles'); abrirHistorial('weekly'); },
        },
        {
          label: '6. Sin acciones (0/0)',
          active: false,
          onClick: () => onSelect(DEMO_REPORT_WEEKLY_EMPTY),
        },
        {
          label: '7. En actualización',
          active: false,
          onClick: () => onSelect(DEMO_REPORT_WEEKLY_LIVE),
        },
        {
          label: '8. Sin reportes',
          active: !historial && modoLista === 'vacio',
          onClick: () => { setHistorial(null); setModoLista('vacio'); },
        },
        {
          label: '9. Análisis pendiente',
          active: false,
          onClick: () => onSelect(DEMO_REPORT_WEEKLY_PENDING_ANALYSIS),
        },
        {
          label: '10. Error',
          active: false,
          onClick: () => onSelect(DEMO_REPORT_WEEKLY_FAILED),
        },
        {
          label: '11. Notificaciones',
          active: !historial && modoLista === 'notificaciones',
          onClick: () => { setHistorial(null); setModoLista('notificaciones'); },
        },
        {
          label: '12. Focus activo',
          active: !historial && modoLista === 'focus',
          onClick: () => { setHistorial(null); setModoLista('focus'); },
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
  );

  // ──────────────────────────────────────────────────────────────────────
  // Foto 11 · Pantalla de Notificaciones de Reportes
  // ──────────────────────────────────────────────────────────────────────
  if (!historial && modoLista === 'notificaciones') {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <SelectorPantallas />
        </div>
        <ReportNotificationsScreen
          avatarIndex={avatarIndex}
          onOpenReport={(r) => onSelect(r)}
          onBack={() => setModoLista('disponibles')}
        />
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────
  // Foto 5 · Historial de reportes anteriores
  // ──────────────────────────────────────────────────────────────────────
  if (historial) {
    const meta = LEVEL_META[historial];
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 pb-10">
          <SelectorPantallas />
          <ReportHeroHeader
            pose="tab"
            avatarIndex={avatarIndex}
            backLabel="Volver a Reportes"
            onBack={() => setHistorial(null)}
            title="Reportes anteriores"
            subtitle={`Tipo ${meta.label.toLowerCase()}`}
            caption="Del más reciente al más antiguo · Cada período cierra con sus datos fijados"
          />

          <div className="mt-7 space-y-3.5">
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
              historialItems.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onSelect(r)}
                  className="w-full border border-[#e2e8f0] rounded-xl p-4 sm:p-5 hover:shadow-md transition-all text-left flex items-center gap-4 bg-white"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#E8F1FF] flex items-center justify-center shrink-0">
                    <meta.Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold text-slate-900 truncate">
                      {periodoDe(r)}
                    </p>
                    <EstadoChico report={r} enHistorial />
                    {r.action_taken && ACTION_LABELS[r.action_taken] ? (
                      <span
                        className="inline-block mt-1.5 text-xs font-semibold rounded-md px-2.5 py-0.5"
                        style={{ background: '#E8F1FF', color: BLUE }}
                      >
                        Acción: {ACTION_LABELS[r.action_taken]}
                      </span>
                    ) : r.never_opened ? (
                      <span className="inline-block mt-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-md px-2.5 py-0.5">
                        Sin consultar en su intervalo
                      </span>
                    ) : null}
                  </div>
                  <div className="text-right shrink-0">
                    {r.generation_state === 'analysis_pending' ? (
                      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-500">
                        <Clock className="w-4 h-4" /> Análisis pendiente
                      </span>
                    ) : r.generation_state === 'failed' ? (
                      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-red-500">
                        <AlertTriangle className="w-4 h-4" /> Reporte pendiente
                      </span>
                    ) : (
                      <>
                        <div className="text-2xl font-black text-slate-900 leading-none">
                          {Math.round(r.completion_percentage)}%
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">cumplimiento</div>
                      </>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────
  // Fotos 1, 8 y 12 · Primera pantalla de Reportes (Doc 27 §3.2)
  // ──────────────────────────────────────────────────────────────────────
  const resumen: ReporteResumenItem[] = (() => {
    if (modoLista === 'vacio') return DEMO_RESUMEN_VACIO;
    if (modoLista === 'focus') return DEMO_RESUMEN_FOCUS;
    return resumenReal || DEMO_RESUMEN_DISPONIBLES;
  })();

  const enModoFocus = focusActivo || modoLista === 'focus';
  const ningunReporte = resumen.every((i) => !i.report);
  const haySinConsultar = resumen.some((i) => i.report?.never_opened && i.report.closed_at);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 pb-10">
        <SelectorPantallas />

        <ReportHeroHeader
          pose={enModoFocus ? 'book' : 'bottom'}
          avatarIndex={avatarIndex}
          backLabel="Volver al inicio"
          onBack={onBack}
          title="Reportes"
          subtitle="Elige el periodo que quieres revisar"
        />

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-3 gap-6 mt-8">
              {resumen.map((item) => {
                const meta = LEVEL_META[item.level];
                const report = item.report;
                return (
                  <div
                    key={item.level}
                    className="border border-[#e2e8f0] rounded-2xl p-6 flex flex-col bg-white shadow-2xs"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-[#E8F1FF] flex items-center justify-center shrink-0">
                      <meta.Icon className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mt-4">{meta.label}</h2>

                    {report ? (
                      <>
                        <div className="text-base font-bold mt-3" style={{ color: BLUE }}>
                          Último reporte disponible
                        </div>
                        <div className="text-base font-medium text-slate-800 mt-1">
                          {periodoDe(report)}
                        </div>
                        <EstadoChico report={report} />

                        {enModoFocus && !report.closed_at && (
                          <div className="flex items-start gap-1.5 text-xs font-semibold text-amber-600 mt-2">
                            <Hourglass className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>Aviso en espera · se enviará al finalizar Focus</span>
                          </div>
                        )}

                        {report.never_opened && report.closed_at && (
                          <div
                            className="flex items-start gap-1.5 text-xs font-semibold mt-2"
                            style={{ color: BLUE }}
                          >
                            <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>No consultado en su intervalo · aviso único ya entregado</span>
                          </div>
                        )}

                        {report.is_partial && report.closed_at && (
                          <span className="text-xs text-slate-500 mt-1">
                            Inició tu planificación a mitad de período
                          </span>
                        )}

                        <div className="mt-auto pt-5 flex flex-col items-center">
                          <button
                            onClick={() => onSelect(report)}
                            className="w-full text-white rounded-lg py-3 text-base font-semibold hover:brightness-110 active:scale-95 transition-all shadow-xs"
                            style={{ background: `linear-gradient(135deg, #8B5CF6, ${PURPLE})` }}
                          >
                            Ver reporte
                          </button>
                          <button
                            onClick={() => abrirHistorial(item.level)}
                            className="text-sm underline hover:opacity-80 mt-3 text-center"
                            style={{ color: BLUE }}
                          >
                            Ver reportes anteriores
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-base text-slate-700 mt-3">
                          Aún no tienes reportes de este tipo.
                        </div>
                        {item.fecha_prevista ? (
                          <div className="rounded-xl bg-[#F8FAFC] border border-slate-200/80 px-3.5 py-3 mt-3">
                            <div className="text-sm font-bold" style={{ color: BLUE }}>
                              Primer reporte previsto
                            </div>
                            <div className="text-sm font-bold text-slate-800 mt-0.5">
                              {fmtFechaPrevista(item.fecha_prevista, item.level)}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-slate-500 mt-3">
                            Falta completar tu configuración o tu planificación para calcular la
                            fecha del primer reporte.
                          </div>
                        )}
                        <div className="mt-auto pt-5 flex flex-col items-center">
                          <button
                            disabled
                            className="w-full rounded-lg py-3 text-base font-semibold bg-slate-200 text-slate-400 cursor-not-allowed"
                          >
                            Ver reporte
                          </button>
                          <span className="text-sm text-slate-300 underline mt-3 text-center cursor-not-allowed">
                            Sin reportes anteriores
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-7 flex items-center gap-2 text-sm text-slate-600">
              <Info className="w-4 h-4 shrink-0" style={{ color: BLUE }} />
              {ningunReporte
                ? 'Los reportes se generan automáticamente al cierre de cada período y quedan disponibles aquí.'
                : enModoFocus || haySinConsultar
                  ? 'El reporte está disponible aquí aunque su aviso espere a que termine Focus o a tu horario permitido.'
                  : 'El reporte está disponible. Su aviso se entregará después de Focus, dentro del horario permitido.'}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
