import React, { useState, useEffect } from 'react';
import { X, Calendar, ChevronLeft, ChevronRight, Check, Target, ArrowRight } from 'lucide-react';
import { monthlyService, MonthlyPlanData, MonthlyGoalData } from '../services/api';

interface MonthlyCalendarProps {
  onClose: () => void;
  onOpenMatriz?: () => void;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const COMPLEXITY_LABELS: Record<string, string> = {
  BASE: 'Base',
  EJECUCION: 'Ejecución',
  CONSOLIDACION: 'Consolidación',
  CIERRE: 'Cierre',
};

export default function MonthlyCalendar({ onClose, onOpenMatriz }: MonthlyCalendarProps) {
  const [plan, setPlan] = useState<MonthlyPlanData | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<MonthlyGoalData | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlan();
  }, []);

  const loadPlan = async () => {
    try {
      const status = await monthlyService.checkStatus();
      if (status.plan_id) {
        const loadedPlan = await monthlyService.getPlan(status.plan_id);
        setPlan(loadedPlan);
        const now = new Date();
        setCurrentMonth(now.getMonth() + 1);
      }
    } catch (err) {
      console.error('Error loading plan:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentGoal = plan?.goals.find(g => g.month_order === currentMonth);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center" onClick={e => e.stopPropagation()}>
          <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Cargando plan mensual...</p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center" onClick={e => e.stopPropagation()}>
          <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No hay un plan mensual aprobado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 z-10 p-2 rounded-full hover:bg-white/30 transition-colors">
          <X className="w-5 h-5 text-white" />
        </button>

        <div className="bg-gradient-to-r from-[#7c3aed] to-[#a855f7] p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5" />
            <h2 className="text-lg font-bold uppercase">Metas Mensuales</h2>
          </div>
          <div className="marquee-container overflow-hidden">
            <div className="marquee whitespace-nowrap">
              <span className="inline-block px-4">
                🎯 <strong>{currentGoal?.monthly_goal_text || 'Sin meta este mes'}</strong>
              </span>
              <span className="inline-block px-4">
                🎯 <strong>{currentGoal?.monthly_goal_text || 'Sin meta este mes'}</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 p-4">
          {months.map(m => {
            const goal = plan.goals.find(g => g.month_order === m);
            const isActive = m === currentMonth;
            const isPast = m < currentMonth;
            return (
              <button
                key={m}
                onClick={() => { setCurrentMonth(m); setSelectedGoal(null); }}
                className={`relative p-3 rounded-xl text-center transition-all ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-lg scale-105'
                    : isPast
                    ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                }`}
              >
                <div className="text-[10px] font-bold uppercase mb-1">
                  {MONTH_NAMES[m - 1].slice(0, 3)}
                </div>
                {goal && (
                  <div className={`w-2 h-2 rounded-full mx-auto ${
                    isActive ? 'bg-white' : goal.status === 'APROBADA' ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                )}
                {isActive && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
                    <Target className="w-2.5 h-2.5 text-amber-800" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {currentGoal && (
          <div className="flex-1 overflow-y-auto p-4 border-t border-gray-100">
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                  Meta Mes {currentMonth}
                </span>
                <span className="text-xs text-gray-500">
                  Complejidad: {COMPLEXITY_LABELS[currentGoal.complexity_level]}
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-800 mb-2">{currentGoal.monthly_goal_text}</p>
              {currentGoal.brief_explanation && (
                <p className="text-xs text-gray-600 mb-2">{currentGoal.brief_explanation}</p>
              )}
              {currentGoal.annual_goal_relation && (
                <p className="text-xs text-purple-600 italic">↗ {currentGoal.annual_goal_relation}</p>
              )}
              <div className="mt-3 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-xs text-green-600 font-medium">Meta aprobada</span>
              </div>
            </div>
            {onOpenMatriz && (
              <button
                onClick={onOpenMatriz}
                className="w-full mt-3 py-3 bg-gradient-to-r from-[#2b44ff] via-[#0b153a] to-[#040817] text-white font-semibold rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
              >
                Entender cómo priorizar mis tareas <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        <div className="border-t border-gray-200 p-4 flex items-center justify-between">
          <button
            onClick={() => setCurrentMonth(Math.max(1, currentMonth - 1))}
            disabled={currentMonth === 1}
            className="flex items-center gap-1 px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-800 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
          <span className="text-xs text-gray-400">
            {MONTH_NAMES[currentMonth - 1]} {plan.cycle_start_year}
          </span>
          <button
            onClick={() => setCurrentMonth(Math.min(12, currentMonth + 1))}
            disabled={currentMonth === 12}
            className="flex items-center gap-1 px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-800 disabled:opacity-30 transition-colors"
          >
            Siguiente <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
