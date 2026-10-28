import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { monthlyService, MonthlyPlanData, MonthlyGoalData } from '../services/api';
import MonthlyShell, { MonthlyNavKey } from './MonthlyShell';

interface MonthlyCalendarProps {
  onClose: () => void;
  onOpenMatriz?: () => void;
  headerContent?: React.ReactNode;
  onNeedAnnualGoal?: () => void;
  onReview?: () => void;
  username?: string;
  avatarUrl?: string;
  onNavigate?: (key: MonthlyNavKey) => void;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const WEEK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function firstWeekdayMonday(year: number, month: number): number {
  return (new Date(year, month - 1, 1).getDay() + 6) % 7;
}

export default function MonthlyCalendar({ onClose, onNeedAnnualGoal, onReview, username, avatarUrl, onNavigate }: MonthlyCalendarProps) {
  const [plan, setPlan] = useState<MonthlyPlanData | null>(null);
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [blockedNoAnnual, setBlockedNoAnnual] = useState(false);

  useEffect(() => {
    loadPlan();
  }, []);

  const loadPlan = async () => {
    try {
      const status = await monthlyService.checkStatus();
      if ((status as any).has_annual_goal === false && !status.plan_id) {
        setBlockedNoAnnual(true);
        return;
      }
      if (status.plan_id) {
        const loadedPlan = await monthlyService.getPlan(status.plan_id);
        setPlan(loadedPlan);
        const now = new Date();
        setViewMonth(now.getMonth() + 1);
        setViewYear(now.getFullYear());
      }
    } catch (err) {
      console.error('Error loading plan:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentGoal: MonthlyGoalData | undefined = useMemo(
    () => plan?.goals.find(g => g.calendar_month === viewMonth && g.calendar_year === viewYear),
    [plan, viewMonth, viewYear]
  );

  const stepMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    while (m < 1) { m += 12; y -= 1; }
    while (m > 12) { m -= 12; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  };

  return (
    <MonthlyShell username={username} avatarUrl={avatarUrl} onNavigate={onNavigate} onClose={onClose}>
      <div className="rounded-3xl bg-gradient-to-br from-[#0a1233] via-[#141b4d] to-[#2b0f54] shadow-2xl overflow-hidden">
            {loading && (
              <div className="py-16 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-white/60 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-white/70 text-sm">Cargando plan mensual...</p>
              </div>
            )}

            {!loading && (blockedNoAnnual || !plan) && (
              <div className="text-center py-12 max-w-md mx-auto px-6">
                <Calendar className="w-12 h-12 text-white/40 mx-auto mb-4" />
                <p className="text-white/80 text-sm mb-6">
                  {blockedNoAnnual
                    ? 'Para crear tus Metas Mensuales, primero debes aprobar tu Gran Meta Anual.'
                    : 'No hay un plan mensual aprobado.'}
                </p>
                {blockedNoAnnual && (
                  <button
                    onClick={() => { onNeedAnnualGoal?.(); onClose(); }}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#1f6feb] via-[#4f46e5] to-[#b01ac9] text-white font-bold hover:brightness-110 transition-all"
                  >
                    Crear mi Gran Meta Anual
                  </button>
                )}
              </div>
            )}

            {!loading && plan && (
              <>
                <div className="px-5 sm:px-8 pt-5 flex items-center gap-3">
                  <span className="text-[11px] font-bold tracking-widest text-white/80 border border-white/25 rounded-full px-3 py-1">
                    VISTA MENSUAL
                  </span>
                  <h3 className="text-white text-xl sm:text-2xl font-bold">
                    {cap(MONTH_NAMES[viewMonth - 1])} {viewYear}
                  </h3>
                  <span className="ml-auto flex items-center gap-2">
                    {onReview && (
                      <button
                        onClick={onReview}
                        title="Revisar metas por bloques"
                        className="h-9 px-3 rounded-xl border border-white/40 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-white/10 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Revisar metas</span>
                      </button>
                    )}
                    <button
                      onClick={() => stepMonth(-1)}
                      className="w-9 h-9 rounded-xl border border-white/40 text-white flex items-center justify-center hover:bg-white/10 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => stepMonth(1)}
                      className="w-9 h-9 rounded-xl border border-white/40 text-white flex items-center justify-center hover:bg-white/10 transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </span>
                </div>

                <div className="p-5 sm:p-8">
                  <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-[#2b9df4] to-[#a21caf]" />
                    {currentGoal ? (
                      <div className="grid grid-cols-1 md:grid-cols-3">
                        <div className="p-5 sm:p-6">
                          <div className="flex items-center gap-2 mb-3">
                            <Calendar className="w-5 h-5 text-[#5b5bd6]" />
                            <p className="text-[11px] font-bold tracking-widest text-[#5b5bd6]">
                              META MENSUAL VIGENTE
                            </p>
                          </div>
                          <p className="text-[#1b2350] text-[15px] font-bold leading-relaxed">
                            {currentGoal.monthly_goal_text}
                          </p>
                        </div>
                        <div className="p-5 sm:p-6 md:border-l border-gray-200">
                          <p className="text-[11px] font-bold tracking-widest text-[#5b5bd6] mb-2">
                            POR QUÉ IMPORTA
                          </p>
                          <p className="text-[#1b2350] text-[15px] leading-relaxed">
                            {currentGoal.brief_explanation}
                          </p>
                        </div>
                        <div className="p-5 sm:p-6 md:border-l border-gray-200">
                          <p className="text-[11px] font-bold tracking-widest text-[#5b5bd6] mb-2">
                            RELACIÓN CON MI META ANUAL
                          </p>
                          <p className="text-[#1b2350] text-[15px] leading-relaxed">
                            {currentGoal.annual_goal_relation}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="p-6 text-[#1b2350] text-sm">
                        Este mes aún no tiene meta aprobada. Revisa tus Metas Mensuales.
                      </p>
                    )}
                  </div>
                </div>

                <div className="px-5 sm:px-8 pb-8">
                  <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-[#2b9df4] to-[#a21caf]" />
                    <div className="bg-[#121a45] px-5 py-3 flex items-center gap-3">
                      <span className="text-white font-black tracking-wider text-lg">
                        {MONTH_NAMES[viewMonth - 1].toUpperCase()} {viewYear}
                      </span>
                      <span className="ml-auto text-[11px] font-bold tracking-widest text-white/70">
                        CALENDARIO DEL MES
                      </span>
                    </div>
                    <div className="grid grid-cols-7 bg-[#eef1f7]">
                      {WEEK_DAYS.map(d => (
                        <div key={d} className="text-center text-[10px] sm:text-[11px] font-black text-[#1b2350] uppercase py-2.5">
                          {d}
                        </div>
                      ))}
                    </div>
                    <MonthGrid year={viewYear} month={viewMonth} />
                  </div>
                </div>
              </>
            )}
      </div>
    </MonthlyShell>
  );
}

function MonthGrid({ year, month }: { year: number; month: number }) {
  const totalDays = daysInMonth(year, month);
  const offset = firstWeekdayMonday(year, month);
  const today = new Date();
  const isCurrentMonth = today.getMonth() + 1 === month && today.getFullYear() === year;
  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="grid grid-cols-7">
      {cells.map((day, i) => {
        const col = i % 7;
        const isWeekend = col >= 5;
        return (
          <div
            key={i}
            className={`min-h-[52px] sm:min-h-[64px] p-1.5 sm:p-2 border-t border-gray-200 text-sm font-bold text-[#1b2350] ${
              day === null ? 'bg-white' : isWeekend ? 'bg-[#f4f2ff]' : 'bg-white'
            } ${isCurrentMonth && day === today.getDate() ? '!bg-[#1f6feb] !text-white' : ''}`}
            style={{ borderLeftWidth: col === 0 ? 0 : 1, borderLeftColor: col === 0 ? 'transparent' : undefined }}
          >
            {day ?? ''}
          </div>
        );
      })}
    </div>
  );
}
