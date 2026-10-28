import { useState, useEffect } from 'react';
import { Calendar, ChevronRight } from 'lucide-react';
import { reportService, FocusiaReportData } from '../services/api';

function periodoCorto(r: FocusiaReportData): string {
  if (r.cycle_label) return r.cycle_label;
  try {
    return `${r.period_start} – ${r.period_end}`;
  } catch {
    return '';
  }
}

/** Aviso de reporte disponible (Doc 27 §7): un solo item, el más reciente sin abrir. */
export function ReportNotificationBanner({ onOpen }: { onOpen: (report: FocusiaReportData) => void }) {
  const [reports, setReports] = useState<FocusiaReportData[]>([]);

  useEffect(() => {
    reportService.getLatest().then(setReports).catch(() => {});
  }, []);

  const unopened = reports.filter(r => r.status === 'generated' || r.status === 'notified');
  if (unopened.length === 0) return null;

  const latest = unopened[0];
  const levelLabel = latest.level === 'weekly' ? 'semanal' : latest.level === 'monthly' ? 'mensual' : 'anual';

  return (
    <button
      onClick={() => onOpen(latest)}
      className="flex gap-3 w-full border border-[#e2e8f0] rounded-xl p-3 hover:shadow-md transition-all text-left"
    >
      <span className="bg-[#dbeAFE] text-[#2563EB] p-3 rounded-xl shrink-0 self-center">
        <Calendar className="w-6 h-6" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold text-gray-900">
          Reporte {levelLabel} disponible
        </span>
        <span className="block text-xs font-semibold text-[#2563EB] mt-0.5">
          {periodoCorto(latest)}
        </span>
        {latest.headline_message && (
          <span className="block text-[11px] text-slate-600 truncate mt-0.5">
            {latest.headline_message}
          </span>
        )}
        <span className="inline-flex items-center gap-0.5 text-xs font-bold text-white rounded-lg px-3 py-1.5 mt-2 bg-gradient-to-br from-[#8B5CF6] to-[#A855F7]">
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
