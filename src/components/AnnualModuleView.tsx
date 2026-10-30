import React, { useEffect, useState } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { granMetaAnualService } from '../services/api';
import { AnualShell } from './AnualShell';
import AnnualCalendar from './AnnualCalendar';

interface AnnualModuleViewProps {
  userName?: string;
  avatarImg?: string | null;
  onClose: () => void;
  onEdit: () => void;
  onNavigate?: (section: string) => void;
  onOpenHelp?: () => void;
  onOpenNotifications?: () => void;
  onOpenSettings?: () => void;
}

/** Spec §15: meta vigente arriba + calendario anual debajo. */
export default function AnnualModuleView({ userName = '', avatarImg, onClose, onEdit, onNavigate, onOpenHelp, onOpenNotifications, onOpenSettings }: AnnualModuleViewProps) {
  const [goal, setGoal] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    granMetaAnualService.current()
      .then((res) => { if (!cancelled) setGoal(res); })
      .catch(() => { if (!cancelled) setGoal(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <AnualShell userName={userName} avatarImg={avatarImg} onClose={onClose} onNavigate={onNavigate} dark hideTopbar onOpenHelp={onOpenHelp} onOpenNotifications={onOpenNotifications} onOpenSettings={onOpenSettings}>
      <div className="max-w-[1200px] mx-auto relative">
        <button onClick={onClose} className="absolute -top-1 right-1 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors" title="Cerrar">
          <X className="w-5 h-5 text-white" />
        </button>
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3 sm:w-64 shrink-0">
            <span className="w-12 h-12 rounded-2xl bg-[#eceafe] flex items-center justify-center shrink-0">
              <CalendarDays className="w-7 h-7 text-[#4f46e5]" />
            </span>
            <h2 className="text-2xl font-black text-[#101331] leading-tight">Gran Meta<br />Anual</h2>
          </div>
          <div className="hidden sm:block w-px self-stretch bg-gray-200" />
          <p className="flex-1 text-[14px] sm:text-[15px] text-[#23264d] leading-relaxed min-h-[48px]">
            {loading ? (
              <span className="text-gray-400">Cargando tu Gran Meta Anual…</span>
            ) : goal ? (
              String(goal.generated_goal_text || '')
            ) : (
              <span className="text-gray-400">Aún no tienes una Gran Meta Anual aprobada.</span>
            )}
          </p>
          <button
            onClick={onEdit}
            className="shrink-0 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#1d4ed8] to-[#7c3aed] text-white text-sm font-bold hover:brightness-110 transition-all shadow-lg text-center"
          >
            Ajustar mi Gran<br />Meta Anual
          </button>
        </div>
        <AnnualCalendar />
      </div>
    </AnualShell>
  );
}
