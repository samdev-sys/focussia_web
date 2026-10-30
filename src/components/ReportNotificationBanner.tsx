import { useState, useEffect } from 'react';
import { ChevronRight, Info } from 'lucide-react';
import { reportService, FocusiaReportData } from '../services/api';
import { rangoPeriodo } from './ReportDetailScreen';
import {
  DEMO_REPORT_WEEKLY_CLOSED,
  IconoCampana,
  REPORT_BLUE as BLUE,
  REPORT_PURPLE as PURPLE,
  ReportHeroHeader,
} from './reportMockups';

function resumenTextoReporte(r: FocusiaReportData): string {
  if (r.headline_message) return r.headline_message;
  const total = r.completed_count + r.pending_count;
  const pct = Math.round(r.completion_percentage);
  if (r.level === 'annual') {
    return `Cerraste el período con el ${pct}% de acciones completadas.`;
  }
  return `Completaste ${r.completed_count} de tus ${total} acciones planificadas (${pct}%).`;
}

/** Pantalla completa de Notificaciones de Reportes (Foto 11 · Doc 27 §3.5). */
export function ReportNotificationsScreen({
  reports,
  avatarIndex,
  onOpenReport,
  onBack,
}: {
  reports?: FocusiaReportData[];
  avatarIndex?: number;
  onOpenReport: (report: FocusiaReportData) => void;
  onBack: () => void;
}) {
  const lista = reports && reports.length > 0 ? reports : [DEMO_REPORT_WEEKLY_CLOSED];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 pb-10">
        <ReportHeroHeader
          pose="book"
          avatarIndex={avatarIndex}
          backLabel="Volver al inicio"
          onBack={onBack}
          title="Notificaciones"
          subtitle="Un aviso por cada reporte disponible"
        />

        <div className="mt-8 space-y-4">
          {lista.map((r) => {
            const levelLabel =
              r.level === 'weekly' ? 'semanal' : r.level === 'monthly' ? 'mensual' : 'anual';
            return (
              <div
                key={r.id}
                onClick={() => onOpenReport(r)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onOpenReport(r);
                }}
                className="w-full border border-[#e2e8f0] rounded-2xl p-5 sm:p-6 bg-white hover:shadow-md transition-all text-left cursor-pointer"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#E8F1FF] flex items-center justify-center shrink-0">
                    <IconoCampana className="w-8 h-8" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-slate-900">
                      Reporte {levelLabel} disponible
                    </h2>
                    <p className="text-base font-bold mt-0.5" style={{ color: BLUE }}>
                      {rangoPeriodo(r)}
                    </p>
                    <p className="text-sm text-slate-700 mt-1">
                      {resumenTextoReporte(r)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenReport(r);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 text-[15px] font-semibold text-white rounded-lg px-5 py-2.5 shrink-0 hover:brightness-110 active:scale-95 transition-all"
                    style={{ background: `linear-gradient(135deg, #8B5CF6, ${PURPLE})` }}
                  >
                    Abrir reporte <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="border-t border-slate-200 mt-4 pt-3.5 flex items-center gap-2 text-xs text-slate-500">
                  <Info className="w-4 h-4 shrink-0" style={{ color: BLUE }} />
                  <span>
                    Toca el aviso para ir directamente a este reporte. No se enviarán recordatorios
                    repetidos sobre él.
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex items-center gap-2 text-sm text-slate-600">
          <Info className="w-4 h-4 shrink-0" style={{ color: BLUE }} />
          <span>
            Los avisos de reportes respetan tu horario permitido y se posponen si estás en Focus.
          </span>
        </div>
      </div>
    </div>
  );
}

/** Aviso compacto de reporte disponible en el menú de campana (Doc 27 §7). */
export function ReportNotificationBanner({
  onOpen,
}: {
  onOpen: (report: FocusiaReportData) => void;
}) {
  const [reports, setReports] = useState<FocusiaReportData[]>([]);

  useEffect(() => {
    reportService.getLatest().then(setReports).catch(() => {});
  }, []);

  const unopened = reports.filter((r) => r.status === 'generated' || r.status === 'notified');
  if (unopened.length === 0) return null;

  const latest = unopened[0];
  const levelLabel =
    latest.level === 'weekly' ? 'semanal' : latest.level === 'monthly' ? 'mensual' : 'anual';

  return (
    <button
      onClick={() => onOpen(latest)}
      className="flex gap-3 w-full border border-[#e2e8f0] rounded-xl p-3 hover:shadow-md transition-all text-left bg-white"
    >
      <span className="bg-[#E8F1FF] p-3 rounded-xl shrink-0 self-center">
        <IconoCampana className="w-6 h-6" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold text-gray-900">
          Reporte {levelLabel} disponible
        </span>
        <span className="block text-xs font-bold text-[#2563EB] mt-0.5">
          {rangoPeriodo(latest)}
        </span>
        <span className="block text-[11px] text-slate-600 truncate mt-0.5">
          {resumenTextoReporte(latest)}
        </span>
        <span
          className="inline-flex items-center gap-0.5 text-xs font-bold text-white rounded-lg px-3 py-1.5 mt-2"
          style={{ background: `linear-gradient(135deg, #8B5CF6, ${PURPLE})` }}
        >
          Abrir reporte <ChevronRight className="w-3.5 h-3.5" />
        </span>
        {unopened.length > 1 && (
          <span className="ml-2 text-[11px] font-bold text-purple-600">
            +{unopened.length - 1} más sin abrir
          </span>
        )}
      </span>
    </button>
  );
}
