import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Edit3, Check, Calendar, Sparkles } from 'lucide-react';
import { monthlyService, MonthlyPlanData, MonthlyGoalData } from '../services/api';

interface MonthlyWizardProps {
  onClose: () => void;
  onApproved: () => void;
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

const COMPLEXITY_COLORS: Record<string, string> = {
  BASE: 'bg-green-100 text-green-800',
  EJECUCION: 'bg-blue-100 text-blue-800',
  CONSOLIDACION: 'bg-amber-100 text-amber-800',
  CIERRE: 'bg-red-100 text-red-800',
};

export default function MonthlyWizard({ onClose, onApproved }: MonthlyWizardProps) {
  const [plan, setPlan] = useState<MonthlyPlanData | null>(null);
  const [currentBlock, setCurrentBlock] = useState(0);
  const [editingGoal, setEditingGoal] = useState<MonthlyGoalData | null>(null);
  const [editInstruction, setEditInstruction] = useState('');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPlan();
  }, []);

  const loadPlan = async () => {
    try {
      const status = await monthlyService.checkStatus();
      if (status.has_monthly_plan && status.plan_id) {
        const existingPlan = await monthlyService.getPlan(status.plan_id);
        setPlan(existingPlan);
      }
    } catch (err) {
      console.error('Error loading plan:', err);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const now = new Date();
      const newPlan = await monthlyService.generateProposals({
        cycle_start_month: now.getMonth() + 1,
        cycle_start_year: now.getFullYear(),
      });
      setPlan(newPlan);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al generar propuestas');
    } finally {
      setGenerating(false);
    }
  };

  const handleEditGoal = async () => {
    if (!plan || !editingGoal || !editInstruction.trim()) return;
    setSaving(true);
    try {
      const updatedGoal = await monthlyService.editGoal(
        editingGoal.id,
        { descripcion: editInstruction.trim() }
      );
      setPlan({
        ...plan,
        goals: plan.goals.map(g =>
          g.month_order === updatedGoal.month_order ? updatedGoal : g
        ),
      });
      setEditingGoal(null);
      setEditInstruction('');
    } catch (err) {
      console.error('Error editing goal:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      await monthlyService.approvePlan(plan.id);
      onApproved();
    } catch (err) {
      console.error('Error approving plan:', err);
    } finally {
      setSaving(false);
    }
  };

  const blocks = plan ? chunkGoals(plan.goals, 3) : [];
  const currentGoals = blocks[currentBlock] || [];

  if (!plan) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
          <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Metas Mensuales</h2>
            <p className="text-sm text-gray-500 mb-6">
              Genera un plan personalizado de 12 metas mensuales basado en tu Meta Anual y tu Rueda de la Vida.
            </p>
            {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
            >
              {generating ? 'Generando...' : 'Crear mis Metas Mensuales'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 z-10 p-2 rounded-full hover:bg-white/30 transition-colors">
          <X className="w-5 h-5 text-white" />
        </button>

        <div className="bg-gradient-to-r from-[#7c3aed] to-[#a855f7] p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5" />
            <h2 className="text-lg font-bold uppercase">Metas Mensuales</h2>
          </div>
          <p className="text-xs opacity-80">
            Bloque {currentBlock + 1} de {blocks.length} — Meses {currentBlock * 3 + 1}-{Math.min((currentBlock + 1) * 3, 12)}
          </p>
          <div className="flex gap-1 mt-2">
            {blocks.map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= currentBlock ? 'bg-white' : 'bg-white/30'}`} />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {currentGoals.map(goal => (
            <div key={goal.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                    Mes {goal.month_order}
                  </span>
                  <span className="text-xs text-gray-500">
                    {MONTH_NAMES[goal.calendar_month - 1]} {goal.calendar_year}
                  </span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${COMPLEXITY_COLORS[goal.complexity_level]}`}>
                  {COMPLEXITY_LABELS[goal.complexity_level]}
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-800 mb-1">{goal.monthly_goal_text}</p>
              {goal.brief_explanation && (
                <p className="text-xs text-gray-500 mb-1">{goal.brief_explanation}</p>
              )}
              {goal.annual_goal_relation && (
                <p className="text-xs text-purple-600 italic">↗ {goal.annual_goal_relation}</p>
              )}
              <button
                onClick={() => { setEditingGoal(goal); setEditInstruction(''); }}
                className="mt-2 flex items-center gap-1 text-xs text-gray-400 hover:text-purple-600 transition-colors"
              >
                <Edit3 className="w-3 h-3" /> Editar esta meta
              </button>
            </div>
          ))}
        </div>

        {editingGoal && (
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <p className="text-xs font-bold text-gray-700 mb-2">
              Editar Meta Mes {editingGoal.month_order}:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={editInstruction}
                onChange={e => setEditInstruction(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleEditGoal()}
                placeholder="Describe el cambio que deseas..."
                className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-purple-400"
                autoFocus
              />
              <button
                onClick={handleEditGoal}
                disabled={saving || !editInstruction.trim()}
                className="px-4 py-2 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {saving ? '...' : 'Aplicar'}
              </button>
              <button
                onClick={() => { setEditingGoal(null); setEditInstruction(''); }}
                className="px-3 py-2 text-gray-500 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 p-4 flex items-center justify-between">
          <button
            onClick={() => setCurrentBlock(Math.max(0, currentBlock - 1))}
            disabled={currentBlock === 0}
            className="flex items-center gap-1 px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-800 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>

          {currentBlock === blocks.length - 1 ? (
            <button
              onClick={handleApprove}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" /> Aprobar Metas Mensuales
            </button>
          ) : (
            <button
              onClick={() => setCurrentBlock(Math.min(blocks.length - 1, currentBlock + 1))}
              className="flex items-center gap-1 px-4 py-2 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700 transition-colors"
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function chunkGoals(goals: MonthlyGoalData[], size: number): MonthlyGoalData[][] {
  const chunks: MonthlyGoalData[][] = [];
  for (let i = 0; i < goals.length; i += size) {
    chunks.push(goals.slice(i, i + size));
  }
  return chunks;
}
