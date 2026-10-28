import React, { useState, useEffect } from 'react';
import {
  X, ArrowRight, ArrowLeft, Pencil, Check, Calendar,
  Quote,
} from 'lucide-react';
import { monthlyService, MonthlyPlanData, MonthlyGoalData } from '../services/api';
import MonthlyShell, { MonthlyNavKey } from './MonthlyShell';

interface MonthlyWizardProps {
  onClose: () => void;
  onApproved: () => void;
  username?: string;
  avatarUrl?: string;
  onNeedAnnualGoal?: () => void;
  onNavigate?: (key: MonthlyNavKey) => void;
}

type Stage = 'intro' | 'blocks' | 'summary' | 'approved' | 'edit';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const BLOCK_SIZE = 2;

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function AvatarImg({ src, name, className }: { src?: string; name?: string; className?: string }) {
  if (src) {
    return <img src={src} alt={name || 'Avatar'} className={className} />;
  }
  return (
    <div className={`flex items-center justify-center bg-gradient-to-br from-[#2b44ff] to-[#a21caf] text-white font-black ${className || ''}`}>
      {(name || 'F').charAt(0).toUpperCase()}
    </div>
  );
}

export default function MonthlyWizard({ onClose, onApproved, username, avatarUrl, onNeedAnnualGoal, onNavigate }: MonthlyWizardProps) {
  const [plan, setPlan] = useState<MonthlyPlanData | null>(null);
  const [stage, setStage] = useState<Stage>('intro');
  const [currentBlock, setCurrentBlock] = useState(0);
  const [editingGoal, setEditingGoal] = useState<MonthlyGoalData | null>(null);
  const [returnTo, setReturnTo] = useState<'blocks' | 'summary'>('blocks');
  const [editInstruction, setEditInstruction] = useState('');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [blockedNoAnnual, setBlockedNoAnnual] = useState(false);
  const [editConfirm, setEditConfirm] = useState('');

  useEffect(() => {
    loadPlan();
  }, []);

  useEffect(() => {
    if (!editConfirm) return;
    const t = setTimeout(() => setEditConfirm(''), 8000);
    return () => clearTimeout(t);
  }, [editConfirm]);

  const loadPlan = async () => {
    try {
      const status = await monthlyService.checkStatus();
      if ((status as any).has_annual_goal === false) {
        setBlockedNoAnnual(true);
        return;
      }
      if (status.has_monthly_plan && status.plan_id) {
        const existingPlan = await monthlyService.getPlan(status.plan_id);
        setPlan(existingPlan);
        setStage('blocks');
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
      setCurrentBlock(0);
      setStage('blocks');
    } catch (err: any) {
      const code = err.response?.data?.code;
      const msg = err.response?.data?.error || 'Error al generar propuestas';
      if (code === 'sin_gran_meta') {
        setBlockedNoAnnual(true);
      } else {
        setError(msg);
      }
    } finally {
      setGenerating(false);
    }
  };

  const openEdit = (goal: MonthlyGoalData, from: 'blocks' | 'summary') => {
    setEditingGoal(goal);
    setReturnTo(from);
    setEditInstruction('');
    setStage('edit');
  };

  const handleEditGoal = async () => {
    if (!plan || !editingGoal || !editInstruction.trim()) return;
    setSaving(true);
    try {
      const updatedGoal = await monthlyService.editGoal(
        editingGoal.id,
        { monthly_goal_text: editInstruction.trim() } as Partial<MonthlyGoalData>
      );
      setPlan({
        ...plan,
        goals: plan.goals.map(g =>
          g.month_order === updatedGoal.month_order ? updatedGoal : g
        ),
      });
      setEditingGoal(null);
      setEditInstruction('');
      setStage(returnTo);
      // §13 mensaje posterior a la reconstrucción.
      setEditConfirm(`Listo, ${displayName}. Reconstruí esta meta mensual manteniendo la coherencia con tu Gran Meta Anual y el avance progresivo de tu año.`);
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
      setStage('approved');
    } catch (err) {
      console.error('Error approving plan:', err);
    } finally {
      setSaving(false);
    }
  };

  const displayName = username?.trim() || 'campeón';
  const blocks = plan ? chunkGoals(plan.goals, BLOCK_SIZE) : [];
  const currentGoals = blocks[currentBlock] || [];
  const blockTitle = currentGoals.length > 0
    ? `${cap(MONTH_NAMES[currentGoals[0].calendar_month - 1])} — ${cap(MONTH_NAMES[currentGoals[currentGoals.length - 1].calendar_month - 1])}`
    : '';
  const nextGoals = blocks[currentBlock + 1] || [];
  const nextTitle = nextGoals.length > 0
    ? `${MONTH_NAMES[nextGoals[0].calendar_month - 1].toLowerCase()} — ${MONTH_NAMES[nextGoals[nextGoals.length - 1].calendar_month - 1].toLowerCase()}`
    : '';
  const rangeLabel = plan && plan.goals.length > 0
    ? `${MONTH_NAMES[plan.goals[0].calendar_month - 1].toUpperCase()} — ${MONTH_NAMES[plan.goals[plan.goals.length - 1].calendar_month - 1].toUpperCase()} ${plan.goals[plan.goals.length - 1].calendar_year}`
    : '';

  return (
    <MonthlyShell username={username} avatarUrl={avatarUrl} onNavigate={onNavigate} onClose={onClose}>
      {blockedNoAnnual && (
            <Panel>
              <div className="text-center py-8 max-w-md mx-auto">
                <Calendar className="w-12 h-12 text-[#5b5bd6] mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Metas Mensuales</h3>
                <p className="text-sm text-white/70 mb-6">
                  Para crear tus Metas Mensuales, primero debes aprobar tu Gran Meta Anual.
                </p>
                <PrimaryButton
                  label="Crear mi Gran Meta Anual"
                  onClick={() => { onNeedAnnualGoal?.(); onClose(); }}
                />
              </div>
            </Panel>
          )}

          {!blockedNoAnnual && !plan && (
            <Panel>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch p-5 sm:p-8">
                <div className="flex flex-col">
                  <div className="relative bg-white rounded-3xl p-6 sm:p-8 shadow-lg flex-1">
                    <div className="flex items-start gap-4">
                      <span className="shrink-0 w-12 h-12 rounded-full bg-[#efeafe] flex items-center justify-center">
                        <Quote className="w-5 h-5 text-[#5b5bd6] fill-[#5b5bd6]" />
                      </span>
                      <div className="text-[#1b2350] text-base sm:text-lg leading-relaxed">
                        <p>
                          Ya tenemos tu Gran Meta Anual, {displayName}. Ahora Focusia te propondrá
                          una Meta Mensual para cada mes que queda de este año.
                        </p>
                        <p className="mt-4">
                          Podrás revisarlas por bloques, editar las que necesites y aprobarlas
                          juntas al final.
                        </p>
                      </div>
                    </div>
                    <span className="hidden md:block absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 bg-white rotate-45" />
                  </div>
                  <div className="mt-6">
                    {error && <p className="text-sm text-red-300 mb-3">{error}</p>}
                    <PrimaryButton
                      label={generating ? 'Generando...' : 'Crear mis Metas Mensuales'}
                      onClick={handleGenerate}
                      disabled={generating}
                      withArrowCircle
                    />
                  </div>
                </div>
                <div className="bg-white rounded-3xl p-2 shadow-lg">
                  <AvatarImg src={avatarUrl} name={displayName} className="w-full h-full min-h-[280px] max-h-[420px] object-cover rounded-2xl" />
                </div>
              </div>
            </Panel>
          )}

          {!blockedNoAnnual && plan && stage === 'blocks' && (
            <Panel>
              {plan.status === 'PENDIENTE_REVISION' && (
                <div className="mx-5 sm:mx-8 mt-5 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex flex-wrap items-center gap-3">
                  <p className="flex-1 min-w-[220px] text-sm text-amber-800">
                    <strong>Tu Gran Meta Anual cambió.</strong> Estas metas quedaron pendientes de revisión.
                    Puedes regenerarlas con la nueva dirección.
                  </p>
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#1f6feb] to-[#a21caf] text-white text-sm font-bold hover:brightness-110 disabled:opacity-50 transition-all"
                  >
                    {generating ? 'Regenerando...' : 'Regenerar mis metas'}
                  </button>
                </div>
              )}
              {editConfirm && (
                <div className="mx-5 sm:mx-8 mt-5 bg-green-50 border border-green-200 rounded-2xl px-5 py-3 flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800">{editConfirm}</p>
                </div>
              )}
              <div className="px-5 sm:px-8 pt-5 flex flex-wrap items-center gap-3">
                <span className="text-[11px] font-bold tracking-widest text-white/80 border border-white/25 rounded-full px-3 py-1">
                  BLOQUE {currentBlock + 1} DE {blocks.length}
                </span>
                <h3 className="text-white text-xl sm:text-2xl font-bold">{blockTitle}</h3>
                <span className="ml-auto text-[11px] font-bold tracking-widest text-white/70">
                  {currentGoals.length} METAS PROPUESTAS
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 sm:p-8">
                {currentGoals.map((goal, idx) => (
                  <GoalCard key={goal.id} goal={goal} onEdit={() => openEdit(goal, 'blocks')} detailed accent={idx % 2 === 0 ? 'blue' : 'purple'} />
                ))}
              </div>
              <div className="px-5 sm:px-8 pb-6 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-4">
                  {currentBlock > 0 ? (
                    <button
                      onClick={() => setCurrentBlock(currentBlock - 1)}
                      className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-white/40 text-white text-sm font-bold hover:bg-white/10 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" /> Bloque anterior
                    </button>
                  ) : <span className="w-8" />}
                  <div className="flex items-center gap-0">
                    {blocks.map((_, i) => (
                      <span key={i} className="flex items-center">
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border ${
                            i === currentBlock
                              ? 'bg-[#2b9df4] border-[#2b9df4] text-white'
                              : i < currentBlock
                              ? 'bg-[#2b9df4]/40 border-[#2b9df4]/40 text-white'
                              : 'border-white/40 text-white/60'
                          }`}
                        >
                          {i + 1}
                        </span>
                        {i < blocks.length - 1 && (
                          <span className={`w-8 sm:w-12 h-0.5 ${i < currentBlock ? 'bg-[#2b9df4]' : 'bg-white/25'}`} />
                        )}
                      </span>
                    ))}
                  </div>
                  {nextTitle && (
                    <span className="text-white/80 text-sm font-semibold">Después: {nextTitle}</span>
                  )}
                </div>
                <div className="ml-auto">
                  {currentBlock === blocks.length - 1 ? (
                    <PrimaryButton label="Ver resumen final" onClick={() => setStage('summary')} />
                  ) : (
                    <PrimaryButton label="Siguiente bloque" onClick={() => setCurrentBlock(currentBlock + 1)} />
                  )}
                </div>
              </div>
            </Panel>
          )}

          {!blockedNoAnnual && plan && stage === 'summary' && (
            <Panel>
              {editConfirm && (
                <div className="mx-5 sm:mx-8 mt-5 bg-green-50 border border-green-200 rounded-2xl px-5 py-3 flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800">{editConfirm}</p>
                </div>
              )}
              <div className="px-5 sm:px-8 pt-5 flex flex-wrap items-center gap-3">
                <span className="text-[11px] font-bold tracking-widest text-white/80 border border-white/25 rounded-full px-3 py-1">
                  REVISIÓN FINAL
                </span>
                <h3 className="text-white text-xl sm:text-2xl font-bold">Resumen de Metas Mensuales</h3>
                <span className="ml-auto text-[11px] font-bold tracking-widest text-white/70">{rangeLabel}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 sm:p-8">
                {plan.goals.map(goal => (
                  <GoalCard key={goal.id} goal={goal} numbered onEdit={() => openEdit(goal, 'summary')} compact />
                ))}
              </div>
              <div className="px-5 sm:px-8 pb-6 flex flex-wrap items-center gap-4">
                <button
                  onClick={() => { setStage('blocks'); setCurrentBlock(blocks.length - 1); }}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-white/40 text-white text-sm font-bold hover:bg-white/10 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Volver al bloque {blocks.length}
                </button>
                <div className="ml-auto">
                  <PrimaryButton label="Aprobar Metas Mensuales" onClick={handleApprove} disabled={saving} />
                </div>
              </div>
            </Panel>
          )}

          {!blockedNoAnnual && plan && stage === 'edit' && editingGoal && (
            <Panel>
              <div className="px-5 sm:px-8 pt-5 flex flex-wrap items-center gap-3">
                <span className="text-[11px] font-bold tracking-widest text-white/80 border border-white/25 rounded-full px-3 py-1">
                  EDICIÓN
                </span>
                <h3 className="text-white text-xl sm:text-2xl font-bold">Editar Meta Mensual</h3>
                <span className="ml-auto text-[11px] font-bold tracking-widest text-white/70">
                  {MONTH_NAMES[editingGoal.calendar_month - 1].toUpperCase()} {editingGoal.calendar_year}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 sm:p-8">
                <GoalCard goal={editingGoal} detailed hideEdit metaLabel="META MENSUAL ACTUAL" />
                <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-24 shrink-0 rounded-2xl overflow-hidden">
                      <AvatarImg src={avatarUrl} name={displayName} className="w-full aspect-[3/4] object-cover" />
                    </div>
                    <div className="relative flex-1 border border-[#b9b3f5] rounded-2xl rounded-bl-none p-4">
                      <span className="inline-flex w-8 h-8 rounded-full bg-[#efeafe] items-center justify-center mb-1">
                        <Quote className="w-4 h-4 text-[#5b5bd6] fill-[#5b5bd6]" />
                      </span>
                      <p className="text-[#1b2350] font-bold">¿Qué quieres cambiar de esta meta?</p>
                    </div>
                  </div>
                  <p className="mt-5 mb-2 text-[11px] font-bold tracking-widest text-[#5b5bd6]">
                    INDICA EL CAMBIO QUE NECESITAS
                  </p>
                  <div className="relative">
                    <textarea
                      value={editInstruction}
                      onChange={e => setEditInstruction(e.target.value)}
                      placeholder="Escribe aquí qué quieres cambiar"
                      rows={4}
                      autoFocus
                      className="w-full text-sm border border-[#b9b3f5] rounded-2xl px-4 py-3 outline-none focus:border-[#5b5bd6] resize-none text-[#1b2350]"
                    />
                    {editInstruction && (
                      <button
                        onClick={() => setEditInstruction('')}
                        className="absolute bottom-3 right-3 text-gray-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <div className="flex-1 min-w-[180px]">
                      <PrimaryButton
                        label={saving ? 'Reconstruyendo...' : 'Reconstruir esta meta'}
                        onClick={handleEditGoal}
                        disabled={saving || !editInstruction.trim()}
                      />
                    </div>
                    <button
                      onClick={() => { setEditingGoal(null); setEditInstruction(''); setStage(returnTo); }}
                      className="px-6 py-3 rounded-2xl border border-[#b9b3f5] text-[#5b5bd6] text-sm font-bold hover:bg-[#efeafe] transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </Panel>
          )}

          {!blockedNoAnnual && plan && stage === 'approved' && (
            <Panel>
              <div className="px-5 sm:px-8 pt-5 flex flex-wrap items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2b9df4] to-[#a21caf] flex items-center justify-center">
                  <Check className="w-5 h-5 text-white" strokeWidth={3} />
                </span>
                <h3 className="text-white text-xl sm:text-2xl font-bold">Metas Mensuales aprobadas</h3>
                <span className="ml-auto text-[11px] font-bold tracking-widest text-white/70">
                  CONFIGURACIÓN COMPLETADA
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 sm:p-8 items-stretch">
                <div className="flex flex-col">
                  <div className="relative bg-white rounded-3xl p-6 sm:p-8 shadow-lg flex-1">
                    <div className="flex items-start gap-4">
                      <span className="shrink-0 w-12 h-12 rounded-full bg-[#efeafe] flex items-center justify-center">
                        <Quote className="w-5 h-5 text-[#5b5bd6] fill-[#5b5bd6]" />
                      </span>
                      <p className="text-[#1b2350] text-lg font-bold">
                        Felicitaciones, {displayName}.
                      </p>
                    </div>
                    <p className="mt-2 text-[#1b2350] text-base leading-relaxed">
                      Tus Metas Mensuales ya fueron creadas y aprobadas.
                    </p>
                    <hr className="my-5 border-gray-200" />
                    <p className="text-[#1b2350] text-base leading-relaxed">
                      Desde hoy, cada meta mensual quedará disponible en el botón MENSUAL. Al ingresar,
                      verás el calendario del mes en curso y, en la parte superior, aparecerá la meta
                      correspondiente a ese período.
                    </p>
                    <hr className="my-5 border-gray-200" />
                    <p className="text-[#1b2350] text-base leading-relaxed">
                      Focusia usará esta meta para ayudarte a organizar tus decisiones, prioridades y
                      acciones del mes.
                    </p>
                    <span className="hidden md:block absolute top-24 -right-3 w-6 h-6 bg-white rotate-45" />
                  </div>
                  <div className="mt-6">
                    <PrimaryButton label="Entender cómo priorizar mis tareas" onClick={onApproved} withArrowCircle />
                  </div>
                </div>
                <div className="bg-white rounded-3xl p-2 shadow-lg">
                  <AvatarImg src={avatarUrl} name={displayName} className="w-full h-full min-h-[280px] max-h-[480px] object-cover rounded-2xl" />
                </div>
              </div>
            </Panel>
          )}
    </MonthlyShell>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-gradient-to-br from-[#0a1233] via-[#141b4d] to-[#2b0f54] shadow-2xl overflow-hidden">
      {children}
    </div>
  );
}

function PrimaryButton({ label, onClick, disabled, withArrowCircle }: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  withArrowCircle?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl bg-gradient-to-r from-[#1f6feb] via-[#4f46e5] to-[#b01ac9] text-white font-bold text-base shadow-lg hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50"
    >
      {withArrowCircle && (
        <span className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center shrink-0">
          <ArrowRight className="w-5 h-5" />
        </span>
      )}
      <span className="flex-1 text-center">{label}</span>
      {!withArrowCircle && <ArrowRight className="w-5 h-5 shrink-0" />}
    </button>
  );
}

function GoalCard({ goal, onEdit, detailed, compact, numbered, hideEdit, metaLabel, accent }: {
  goal: MonthlyGoalData;
  onEdit?: () => void;
  detailed?: boolean;
  compact?: boolean;
  numbered?: boolean;
  hideEdit?: boolean;
  metaLabel?: string;
  accent?: 'blue' | 'purple';
}) {
  const monthUpper = MONTH_NAMES[goal.calendar_month - 1].toUpperCase();
  const accentBar = accent === 'purple'
    ? 'from-[#a21caf] to-[#e879f9]'
    : 'from-[#2b9df4] to-[#a21caf]';
  return (
    <div className="bg-white rounded-3xl shadow-lg overflow-hidden flex flex-col">
      <div className={`h-1 bg-gradient-to-r ${accentBar}`} />
      <div className="bg-[#121a45] px-5 py-3 flex items-center gap-3">
        {numbered ? (
          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#2b9df4] to-[#a21caf] text-white text-sm font-black flex items-center justify-center">
            {goal.month_order}
          </span>
        ) : (
          <Calendar className="w-6 h-6 text-[#7dd3fc]" />
        )}
        <span className="text-white font-black tracking-wider text-lg">{monthUpper}</span>
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <div>
          <p className="text-[11px] font-bold tracking-widest text-[#5b5bd6] mb-1">
            {metaLabel || 'META MENSUAL'}
          </p>
          <p className="text-[#1b2350] text-[15px] leading-relaxed">{goal.monthly_goal_text}</p>
        </div>
        {detailed && (
          <>
            <hr className="my-4 border-gray-200" />
            <div>
              <p className="text-[11px] font-bold tracking-widest text-[#5b5bd6] mb-1">POR QUÉ IMPORTA</p>
              <p className="text-[#1b2350] text-[15px] leading-relaxed">{goal.brief_explanation}</p>
            </div>
            <hr className="my-4 border-gray-200" />
            <div>
              <p className="text-[11px] font-bold tracking-widest text-[#5b5bd6] mb-1">RELACIÓN CON MI GRAN META ANUAL</p>
              <p className="text-[#1b2350] text-[15px] leading-relaxed">{goal.annual_goal_relation}</p>
            </div>
          </>
        )}
        {!hideEdit && onEdit && (
          <div className={detailed ? 'mt-5 flex justify-end' : 'mt-2 flex justify-end'}>
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#8b83e8] bg-[#efeafe] text-[#5b5bd6] text-sm font-bold hover:bg-[#e2dcfd] transition-colors"
            >
              <Pencil className="w-4 h-4" /> Editar{compact || numbered ? '' : ' esta meta'}
            </button>
          </div>
        )}
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
