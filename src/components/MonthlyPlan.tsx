import React, { useState, useMemo } from 'react';
import { useMonthlyPlan } from '../hooks/useMonthlyPlan';
import { Save, CheckCircle, AlertCircle, Loader2, Calendar, Target, Trash2, Plus } from 'lucide-react';
import type { MonthlyGoal, ComplexityLevel, COMPLEXITY_LEVELS } from '../types/focusia';

interface MonthlyPlanProps {
  className?: string;
  onGoalPlanificar?: (goal: MonthlyGoal) => void;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const COMPLEXITY_COLORS: Record<ComplexityLevel, { bg: string; text: string; border: string }> = {
  BASE: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
  EJECUCION: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  CONSOLIDACION: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  CIERRE: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
};

export const MonthlyPlan: React.FC<MonthlyPlanProps> = ({
  className = '',
  onGoalPlanificar,
}) => {
  const {
    plan,
    loading,
    error,
    isSaving,
    saveError,
    saveSuccess,
    goals,
    updateGoal,
    addGoal,
    removeGoal,
    savePlan,
    approvePlan,
    getComplexityForMonth,
    currentCycleInfo,
  } = useMonthlyPlan();

  const [editingGoal, setEditingGoal] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGoalText, setNewGoalText] = useState('');
  const [newGoalExplanation, setNewGoalExplanation] = useState('');
  const [newGoalRelation, setNewGoalRelation] = useState('');

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-8 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
        </div>
      </div>
    );
  }

  if (!plan || goals.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-8 ${className}`}>
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Sin Plan Mensual</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Crea tu plan anual dividiéndolo en 12 metas mensuales progresivas.
          </p>
          <button
            onClick={addGoal}
            className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" />
            Crear Primera Meta
          </button>
        </div>
      </div>
    );
  }

  const getCycleMonth = (monthOrder: number) => {
    const start = currentCycleInfo?.startMonth || 1;
    const month = ((start + monthOrder - 2) % 12) + 1;
    const year = currentCycleInfo?.startYear || new Date().getFullYear();
    const yearOffset = Math.floor((start + monthOrder - 2) / 12);
    return { month, year: year + yearOffset };
  };

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden ${className}`}>
      <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              Plan Mensual
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {goals.length}/12 meses planificados • Ciclo: {MONTH_NAMES[(currentCycleInfo?.startMonth || 1) - 1]} {currentCycleInfo?.startYear}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!plan.is_approved ? (
              <button
                onClick={approvePlan}
                disabled={isSaving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                Aprobar Plan
              </button>
            ) : (
              <span className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Plan Aprobado
              </span>
            )}
            <button
              onClick={savePlan}
              disabled={isSaving}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {saveSuccess && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ¡Plan guardado correctamente!
          </div>
        )}
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {goals.map(goal => {
          const cycleMonth = getCycleMonth(goal.month_order);
          const complexity = goal.complexity_level || getComplexityForMonth(goal.month_order);
          const colors = COMPLEXITY_COLORS[complexity];
          const isEditing = editingGoal === goal.month_order;

          return (
            <div key={goal.month_order} className="p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                      {goal.month_order}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {MONTH_NAMES[cycleMonth.month - 1]} {cycleMonth.year}
                      </span>
                      <span className={`${colors.bg} ${colors.text} ${colors.border} px-2 py-0.5 text-xs font-medium rounded-full`}>
                        {complexity}
                      </span>
                    </div>
                    {!isEditing && goal.goal_text && (
                      <p className="text-gray-700 dark:text-gray-300">{goal.goal_text}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!isEditing && (
                    <>
                      <button
                        onClick={() => setEditingGoal(goal.month_order)}
                        className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                        aria-label="Editar meta"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {goal.month_order === goals.length && goals.length < 12 && (
                        <button
                          onClick={addGoal}
                          className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                          aria-label="Agregar siguiente mes"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => removeGoal(goal.month_order)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        aria-label="Eliminar meta"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-4 bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Meta del Mes
                    </label>
                    <input
                      type="text"
                      value={goal.goal_text}
                      onChange={e => updateGoal(goal.month_order, 'goal_text', e.target.value)}
                      placeholder="¿Qué quieres lograr este mes?"
                      className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Explicación / Por qué
                    </label>
                    <textarea
                      value={goal.explanation}
                      onChange={e => updateGoal(goal.month_order, 'explanation', e.target.value)}
                      placeholder="¿Por qué es importante esta meta?"
                      rows={2}
                      className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Relación con Meta Anual
                    </label>
                    <input
                      type="text"
                      value={goal.relation_to_annual}
                      onChange={e => updateGoal(goal.month_order, 'relation_to_annual', e.target.value)}
                      placeholder="¿Cómo conecta con tu objetivo del año?"
                      className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingGoal(null)}
                      className="flex-1 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditingGoal(null)}
                      className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                goal.goal_text && (
                  <div className="space-y-3 text-sm">
                    {goal.explanation && (
                      <p className="text-gray-600 dark:text-gray-400 italic">"{goal.explanation}"</p>
                    )}
                    {goal.relation_to_annual && (
                      <p className="text-gray-500 dark:text-gray-500">
                        <span className="font-medium text-purple-600 dark:text-purple-400">→ Anual: </span>
                        {goal.relation_to_annual}
                      </p>
                    )}
                    {!goal.explanation && !goal.relation_to_annual && (
                      <button
                        onClick={() => setEditingGoal(goal.month_order)}
                        className="text-purple-600 dark:text-purple-400 hover:underline text-sm font-medium"
                      >
                        Agregar detalles (explicación, relación con anual)...
                      </button>
                    )}
                  </div>
                )
              )}
            </div>
          );
        })}

        {goals.length < 12 && (
          <div className="p-6 text-center">
            <button
              onClick={addGoal}
              className="px-6 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 rounded-xl font-semibold hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors flex items-center gap-2 mx-auto"
            >
              <Plus className="w-5 h-5" />
              Agregar Mes {goals.length + 1}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlyPlan;