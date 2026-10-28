import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, ChevronDown, ChevronRight, Check, X, GripVertical, AlertCircle, ChevronLeft, MoreVertical } from 'lucide-react';
import { weeklyPlanService, weeklyActionService, timeBlockService } from '../services/api';
import type { WeeklyPlanData, ActionData, SubactionData } from '../services/api';

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const SMART_GROUP_PATTERNS: { pattern: RegExp; subactions: string[] }[] = [
  { pattern: /supermercado|compras|mercado/i, subactions: ['Hacer lista de compras', 'Ir al supermercado', 'Guardar y organizar compras'] },
  { pattern: /mecánico|taller|auto.*revis/i, subactions: ['Agendar cita en el taller', 'Llevar el auto', 'Esperar diagnóstico', 'Recoger el auto'] },
  { pattern: /reunión|reunion|meeting/i, subactions: ['Preparar agenda de reunión', 'Revisar documentos previos', 'Realizar reunión', 'Escribir minuta y acuerdos'] },
  { pattern: /viaje|viajar|vacaciones/i, subactions: ['Investigar destino y fechas', 'Reservar vuelo/transporte', 'Reservar alojamiento', 'Hacer maleta'] },
  { pattern: /cumpleaños|cumple/i, subactions: ['Comprar regalo', 'Elegir tarjeta', 'Confirmar asistencia', 'Asistir al evento'] },
  { pattern: /proyecto.*nuevo|nuevo.*proyecto/i, subactions: ['Definir alcance del proyecto', 'Crear cronograma', 'Asignar recursos', 'Ejecutar primera fase'] },
  { pattern: /mudanza|cambio.*casa/i, subactions: ['Empacar pertenencias', 'Contratar servicio de mudanza', 'Cambiar dirección registros', 'Instalar servicios básicos'] },
  { pattern: /cena.*amigos|fiesta|evento.*social/i, subactions: ['Definir invitados', 'Comprar alimentos/bebidas', 'Preparar el espacio', 'Disfrutar del evento'] },
  { pattern: /doctor|médico|medico|chequeo/i, subactions: ['Pedir cita médica', 'Preparar documentos/estudios', 'Asistir a consulta', 'Seguir recomendaciones'] },
  { pattern: /curso|estudiar|examen|clase/i, subactions: ['Revisar material del curso', 'Preparar apuntes', 'Realizar ejercicios/tareas', 'Repasar lo aprendido'] },
];

const getWeekDays = (offset = 0): Date[] => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) + offset * 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), diff);
  return Array.from({ length: 7 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
};

const formatDateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const isToday = (d: Date): boolean => {
  const today = new Date();
  return d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
};

const detectSmartGroup = (title: string): string[] | null => {
  for (const { pattern, subactions } of SMART_GROUP_PATTERNS) {
    if (pattern.test(title)) return subactions;
  }
  return null;
};

export default function WeeklyPlanner({ onClose }: { onClose: () => void }): React.ReactElement {
  const [plan, setPlan] = useState<WeeklyPlanData | null>(null);
  const [actions, setActions] = useState<ActionData[]>([]);
  const [weeklyMission, setWeeklyMission] = useState('');
  const [selectedDayIdx, setSelectedDayIdx] = useState(() => {
    const today = new Date().getDay();
    return today === 0 ? 6 : today - 1;
  });
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());
  const [draggedAction, setDraggedAction] = useState<ActionData | null>(null);
  const [showAISuggest, setShowAISuggest] = useState<{ title: string; subactions: string[] } | null>(null);
  const [newActionTitle, setNewActionTitle] = useState('');
  const [showNewInput, setShowNewInput] = useState(false);
  const [loading, setLoading] = useState(true);
  const editRef = useRef<HTMLInputElement>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [timeBlockHour, setTimeBlockHour] = useState(9);
  const [timeBlockActionId, setTimeBlockActionId] = useState<string | null>(null);
  const [aiChecklistAction, setAiChecklistAction] = useState<{ actionId: string; title: string; subactions: string[] } | null>(null);
  const [editableSubs, setEditableSubs] = useState<string[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [subInputFor, setSubInputFor] = useState<string | null>(null);
  const [subDraft, setSubDraft] = useState('');
  const [editingSub, setEditingSub] = useState<{ actionId: string; subId: string } | null>(null);
  const [subEditValue, setSubEditValue] = useState('');
  const [repeatForId, setRepeatForId] = useState<string | null>(null);
  const [repeatDate, setRepeatDate] = useState('');
  const weekDays = getWeekDays(weekOffset);
  const weekKeys = weekDays.map(formatDateKey);

  const loadData = useCallback(async () => {
    try {
      const { plan: planData } = await weeklyPlanService.getCurrentWeek();
      setPlan(planData);
      setWeeklyMission(planData.weekly_mission || '');
      const allActions = await weeklyActionService.list();
      setActions(allActions);
    } catch {
      console.error('Error loading weekly plan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Navegación entre semanas: carga el plan (y misión) de la semana visible.
  // La navegación nunca modifica la planificación.
  useEffect(() => {
    weeklyPlanService.weekOf(formatDateKey(getWeekDays(weekOffset)[0]))
      .then(({ plan: planData }) => {
        setPlan(planData);
        setWeeklyMission(planData.weekly_mission || '');
      })
      .catch(() => {});
  }, [weekOffset]);

  // ESC cancela un arrastre en curso (sin registrar cambios).
  useEffect(() => {
    if (!draggedAction) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDraggedAction(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [draggedAction]);

  useEffect(() => {
    if (editingActionId && editRef.current) editRef.current.focus();
  }, [editingActionId]);

  const saveWeeklyMission = async () => {
    if (!plan) return;
    try {
      await weeklyPlanService.update(plan.id, { weekly_mission: weeklyMission });
    } catch { /* ignore */ }
  };

  const currentDay = weekDays[selectedDayIdx];
  const currentDayKey = formatDateKey(currentDay);
  const dayActions = actions.filter(a => a.assigned_calendar_date === currentDayKey && a.status !== 'DELEGADA');

  const handleDoubleClick = (action: ActionData) => {
    setEditingActionId(action.id);
    setEditValue(action.title);
  };

  const saveEdit = async (actionId: string) => {
    if (!editValue.trim()) { setEditingActionId(null); return; }
    try {
      const updated = await weeklyActionService.update(actionId, { title: editValue.trim(), subactions: undefined as unknown as SubactionData[] } as Partial<ActionData>);
      setActions(prev => prev.map(a => a.id === actionId ? updated : a));
    } catch { /* ignore */ }
    setEditingActionId(null);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, actionId: string) => {
    if (e.key === 'Enter') { e.preventDefault(); saveEdit(actionId); }
    if (e.key === 'Escape') { setEditingActionId(null); }
  };

  const confirmAddAction = async () => {
    if (!newActionTitle.trim()) return;
    const aiSubs = detectSmartGroup(newActionTitle);
    if (aiSubs) {
      setShowAISuggest({ title: newActionTitle, subactions: aiSubs });
      return;
    }
    try {
      const created = await weeklyActionService.addAction({ title: newActionTitle.trim(), assigned_calendar_date: currentDayKey });
      setActions(prev => [...prev, created]);
    } catch { /* ignore */ }
    setShowNewInput(false);
    setNewActionTitle('');
  };

  const confirmAIGroup = async () => {
    if (!showAISuggest) return;
    const subs: SubactionData[] = showAISuggest.subactions.map((s, i) => ({
      id: crypto.randomUUID?.() || `${Date.now()}-${i}`,
      title: s,
      is_completed: false,
    }));
    try {
      const created = await weeklyActionService.addAction({
        title: showAISuggest.title,
        assigned_calendar_date: currentDayKey,
        subactions: subs,
      });
      setActions(prev => [...prev, created]);
    } catch { /* ignore */ }
    setShowNewInput(false);
    setNewActionTitle('');
    setShowAISuggest(null);
  };

  const rejectAIGroup = async () => {
    try {
      const created = await weeklyActionService.addAction({ title: newActionTitle.trim(), assigned_calendar_date: currentDayKey });
      setActions(prev => [...prev, created]);
    } catch { /* ignore */ }
    setShowNewInput(false);
    setNewActionTitle('');
    setShowAISuggest(null);
  };

  const toggleSubactions = (actionId: string) => {
    setExpandedActions(prev => {
      const next = new Set(prev);
      if (next.has(actionId)) next.delete(actionId);
      else next.add(actionId);
      return next;
    });
  };

  const toggleSubactionStatus = async (actionId: string, subId: string, current: boolean) => {
    try {
      let updated = await weeklyActionService.editSubaction(actionId, subId, { is_completed: !current });
      // Checklist: % del grupo y auto-completado de la principal.
      const subs = updated.subactions || [];
      const allDone = subs.length > 0 && subs.every(s => s.is_completed);
      if (allDone && updated.status !== 'COMPLETADA') {
        updated = await weeklyActionService.complete(actionId);
      } else if (!allDone && updated.status === 'COMPLETADA') {
        updated = await weeklyActionService.update(actionId, { status: 'PENDIENTE' });
      }
      setActions(prev => prev.map(a => a.id === actionId ? updated : a));
    } catch { /* ignore */ }
  };

  const addSubactionInline = (actionId: string) => {
    setExpandedActions(prev => new Set(prev).add(actionId));
    setSubInputFor(actionId);
    setSubDraft('');
  };

  const commitSubDraft = async (actionId: string) => {
    const title = subDraft.trim();
    setSubInputFor(null);
    setSubDraft('');
    if (!title) return;
    try {
      const updated = await weeklyActionService.addSubaction(actionId, title);
      setActions(prev => prev.map(a => a.id === actionId ? updated : a));
      setExpandedActions(prev => new Set(prev).add(actionId));
    } catch { /* ignore */ }
  };

  const startSubEdit = (actionId: string, subId: string, current: string) => {
    setEditingSub({ actionId, subId });
    setSubEditValue(current);
  };

  const commitSubEdit = async () => {
    if (!editingSub) return;
    const { actionId, subId } = editingSub;
    const title = subEditValue.trim();
    setEditingSub(null);
    if (!title) return;
    try {
      const updated = await weeklyActionService.editSubaction(actionId, subId, { title });
      setActions(prev => prev.map(a => a.id === actionId ? updated : a));
    } catch { /* ignore */ }
  };

  const groupProgress = (action: ActionData): number => {
    const subs = action.subactions || [];
    if (subs.length === 0) return 0;
    return Math.round(subs.filter(s => s.is_completed).length / subs.length * 100);
  };

  const deleteSubactionInline = async (actionId: string, subId: string) => {
    try {
      const updated = await weeklyActionService.deleteSubaction(actionId, subId);
      setActions(prev => prev.map(a => a.id === actionId ? updated : a));
    } catch { /* ignore */ }
  };

  const toggleCompleteAction = async (actionId: string) => {
    const action = actions.find(a => a.id === actionId);
    if (!action) return;
    try {
      if (action.status === 'COMPLETADA') {
        const updated = await weeklyActionService.update(actionId, { status: 'PENDIENTE', subactions: undefined as unknown as SubactionData[] } as Partial<ActionData>);
        setActions(prev => prev.map(a => a.id === actionId ? updated : a));
      } else {
        const updated = await weeklyActionService.complete(actionId);
        setActions(prev => prev.map(a => a.id === actionId ? updated : a));
      }
    } catch { /* ignore */ }
  };

  const handleDragStart = (e: React.DragEvent, action: ActionData) => {
    setDraggedAction(action);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (targetDayKey: string) => {
    if (!draggedAction || draggedAction.assigned_calendar_date === targetDayKey) {
      setDraggedAction(null);
      return;
    }
    try {
      const updated = await weeklyActionService.dropAction(draggedAction.id, targetDayKey);
      setActions(prev => prev.map(a => a.id === draggedAction.id ? updated : a));
    } catch { /* ignore */ }
    setDraggedAction(null);
  };

  const deleteAction = async (actionId: string) => {
    const action = actions.find(a => a.id === actionId);
    if (action && (action.subactions?.length || 0) > 0) {
      if (!window.confirm(`"${action.title}" tiene ${action.subactions!.length} subacciones. ¿Eliminar el grupo completo?`)) return;
    }
    try {
      await weeklyActionService.delete(actionId);
      setActions(prev => prev.filter(a => a.id !== actionId));
    } catch { /* ignore */ }
  };

  const repeatActionOn = async (actionId: string, targetDate: string) => {
    if (!targetDate) return;
    try {
      const created = await weeklyActionService.repeat(actionId, targetDate);
      setActions(prev => [...prev, created]);
    } catch { /* ignore */ }
    setRepeatForId(null);
    setRepeatDate('');
    setActiveDropdownId(null);
  };

  const delegateActionTo = async (actionId: string) => {
    try {
      await weeklyActionService.delegate(actionId);
      setActions(prev => prev.filter(a => a.id !== actionId));
    } catch { /* ignore */ }
    setActiveDropdownId(null);
  };

  const handleAIChecklist = (action: ActionData) => {
    const subs = detectSmartGroup(action.title) ?? [
      'Investigar y recopilar información',
      'Planificar los pasos necesarios',
      'Ejecutar la tarea principal',
      'Revisar y finalizar',
    ];
    setAiChecklistAction({ actionId: action.id, title: action.title, subactions: subs });
    setEditableSubs([...subs]);
  };

  const confirmAIChecklist = async () => {
    if (!aiChecklistAction) return;
    const subs = editableSubs.map(s => s.trim()).filter(Boolean);
    if (!subs.length) { setAiChecklistAction(null); return; }
    try {
      for (const sub of subs) {
        await weeklyActionService.addSubaction(aiChecklistAction.actionId, sub);
      }
      const updated = await weeklyActionService.list();
      setActions(updated);
      setExpandedActions(prev => new Set(prev).add(aiChecklistAction.actionId));
    } catch { /* ignore */ }
    setAiChecklistAction(null);
  };

  const confirmTimeBlock = async (action: ActionData) => {
    try {
      await timeBlockService.create({
        fecha: action.assigned_calendar_date,
        hora: timeBlockHour,
        tarea: action.title,
        estado: 'pending',
      });
    } catch { /* ignore */ }
    setTimeBlockActionId(null);
    setActiveDropdownId(null);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] flex items-center justify-center p-2">
        <div className="bg-white rounded-md shadow-2xl border border-white/50 w-[650px] p-6 text-sm text-slate-500">Cargando plan semanal...</div>
      </div>
    );
  }

  const totalWeekActions = actions.filter(a => weekKeys.includes(a.assigned_calendar_date)).length;
  const completedWeekActions = actions.filter(a => weekKeys.includes(a.assigned_calendar_date) && a.status === 'COMPLETADA').length;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] flex items-center justify-center p-2">
      <div className="bg-white rounded-md shadow-2xl border border-white/50 w-[650px] max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-[#d97706] to-[#f59e0b] shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase text-white">Plan Semanal</h2>
            {totalWeekActions > 0 && (
              <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full">{completedWeekActions}/{totalWeekActions}</span>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20 transition-colors">
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* Weekly Mission */}
        <div className="px-4 py-2 border-b border-gray-100 bg-slate-50 shrink-0">
          {plan?.associated_monthly_goal_text && (
            <div className="text-[10px] text-slate-400 mb-1">
              <span className="font-semibold">Meta Mensual:</span> {plan.associated_monthly_goal_text}
            </div>
          )}
          <input
            value={weeklyMission}
            onChange={e => setWeeklyMission(e.target.value)}
            onBlur={saveWeeklyMission}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            placeholder="Misión de la semana..."
            className="w-full text-xs px-2 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
          />
        </div>

        {/* Day Tabs */}
        <div className="flex items-center gap-1 px-3 pt-2 shrink-0">
          <button onClick={() => setWeekOffset(o => o - 1)} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600" title="Semana anterior">
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => { setWeekOffset(0); setSelectedDayIdx(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1); }}
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${weekOffset === 0 ? 'bg-amber-100 text-amber-700' : 'text-slate-400 hover:bg-slate-100'}`}
            title="Volver a esta semana"
          >
            {weekOffset === 0 ? 'Esta semana' : 'Hoy'}
          </button>
          <button onClick={() => setWeekOffset(o => o + 1)} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600" title="Semana siguiente">
            <ChevronRight size={14} />
          </button>
          <span className="text-[10px] text-slate-400 ml-1">
            {weekDays[0].getDate()}/{weekDays[0].getMonth() + 1} – {weekDays[6].getDate()}/{weekDays[6].getMonth() + 1}
          </span>
        </div>
        <div className="flex border-b border-gray-200 shrink-0 overflow-x-auto">
          {weekDays.map((day, idx) => {
            const key = formatDateKey(day);
            const count = actions.filter(a => a.assigned_calendar_date === key).length;
            const isSelected = idx === selectedDayIdx;
            return (
              <button
                key={key}
                onClick={() => setSelectedDayIdx(idx)}
                className={`flex-1 min-w-0 py-2 px-1 text-center border-b-2 transition-colors relative ${isSelected ? 'border-amber-500 bg-amber-50' : 'border-transparent hover:bg-slate-50'}`}
              >
                <div className={`text-[10px] font-semibold uppercase ${isSelected ? 'text-amber-700' : 'text-slate-400'}`}>
                  {DAY_NAMES[idx]}
                </div>
                <div className={`text-base font-bold leading-tight ${isSelected ? 'text-amber-600' : 'text-slate-700'}`}>
                  {day.getDate()}
                </div>
                {count > 0 && (
                  <div className={`text-[9px] mt-0.5 ${isSelected ? 'text-amber-500' : 'text-slate-400'}`}>
                    {count} {count === 1 ? 'tarea' : 'tareas'}
                  </div>
                )}
                {isToday(day) && (
                  <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
                )}
              </button>
            );
          })}
        </div>

        {/* Day Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {/* Drag over indicator when dragging */}
          <div className="flex gap-1 mb-2 overflow-x-auto shrink-0">
            {weekDays.map((day, idx) => {
              const key = formatDateKey(day);
              const isDragTarget = draggedAction && draggedAction.assigned_calendar_date !== key;
              return (
                <button
                  key={key}
                  onClick={() => { if (draggedAction) handleDrop(key); }}
                  onDragOver={e => { if (draggedAction) e.preventDefault(); }}
                  className={`text-[9px] px-2 py-1 rounded-full whitespace-nowrap transition-colors ${
                    idx === selectedDayIdx
                      ? 'bg-amber-100 text-amber-700 font-medium'
                      : isDragTarget
                        ? 'border border-dashed border-amber-300 text-amber-500 hover:bg-amber-50'
                        : 'text-slate-400'
                  }`}
                >
                  {draggedAction ? `→ ${DAY_NAMES[idx]}` : DAY_NAMES[idx]}
                </button>
              );
            })}
          </div>

          {/* Actions List */}
          <div className="space-y-1.5">
            {dayActions.map(action => (
              <div
                key={action.id}
                draggable
                onDragStart={e => handleDragStart(e, action)}
                onDragEnd={() => setDraggedAction(null)}
                className={`group border rounded-xl p-2.5 transition-all cursor-grab active:cursor-grabbing ${
                  action.status === 'COMPLETADA' ? 'border-green-200 bg-green-50/30' : 'border-slate-200 bg-white hover:shadow-sm'
                } ${draggedAction?.id === action.id ? 'opacity-40' : ''}`}
              >
                <div className="flex items-start gap-2">
                  <button
                    onClick={() => toggleCompleteAction(action.id)}
                    className={`mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      action.status === 'COMPLETADA' ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-green-400'
                    }`}
                  >
                    {action.status === 'COMPLETADA' && <Check size={10} />}
                  </button>

                  <div className="flex-1 min-w-0">
                    {editingActionId === action.id ? (
                      <input
                        ref={editRef}
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => handleEditKeyDown(e, action.id)}
                        onBlur={() => saveEdit(action.id)}
                        className="w-full text-sm px-1.5 py-0.5 border border-amber-400 rounded outline-none bg-amber-50"
                      />
                    ) : (
                      <div className="flex items-center gap-1">
                        <span
                          onDoubleClick={() => handleDoubleClick(action)}
                          className={`text-sm leading-snug cursor-pointer ${
                            action.status === 'COMPLETADA' ? 'line-through text-slate-400' : 'text-slate-700'
                          } ${action.subactions?.length ? 'font-medium' : ''}`}
                        >
                          {action.title}
                        </span>
                        <button className="shrink-0 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                          <GripVertical size={12} />
                        </button>
                        {action.subactions?.length > 0 && (
                          <button onClick={() => toggleSubactions(action.id)} className="shrink-0 p-0.5 hover:bg-slate-100 rounded">
                            {expandedActions.has(action.id) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    <div className="relative">
                      <button
                        onClick={() => setActiveDropdownId(activeDropdownId === action.id ? null : action.id)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                        title="Opciones"
                      >
                        <MoreVertical size={14} />
                      </button>
                      {activeDropdownId === action.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => { setActiveDropdownId(null); setTimeBlockActionId(null); setRepeatForId(null); }} />
                          <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-md shadow-xl border border-gray-200 overflow-hidden z-20">
                            {timeBlockActionId === action.id ? (
                              <div className="p-3 space-y-2">
                                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Seleccionar hora</div>
                                <select
                                  value={timeBlockHour}
                                  onChange={e => setTimeBlockHour(Number(e.target.value))}
                                  className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-amber-400"
                                >
                                  {Array.from({ length: 24 }, (_, i) => (
                                    <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                                  ))}
                                </select>
                                <div className="flex gap-1.5">
                                  <button onClick={() => setTimeBlockActionId(null)} className="flex-1 text-xs px-2 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                                  <button onClick={() => confirmTimeBlock(action)} className="flex-1 text-xs px-2 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium">Confirmar</button>
                                </div>
                              </div>
                            ) : repeatForId === action.id ? (
                              <div className="p-3 space-y-2">
                                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Repetir en el día</div>
                                <input
                                  type="date"
                                  value={repeatDate}
                                  onChange={e => setRepeatDate(e.target.value)}
                                  className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-amber-400"
                                />
                                <div className="flex gap-1.5">
                                  <button onClick={() => { setRepeatForId(null); setRepeatDate(''); }} className="flex-1 text-xs px-2 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                                  <button onClick={() => repeatActionOn(action.id, repeatDate)} disabled={!repeatDate} className="flex-1 text-xs px-2 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium disabled:opacity-40">Confirmar</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => { setActiveDropdownId(null); handleAIChecklist(action); }}
                                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-left hover:bg-indigo-50 transition-colors border-b border-gray-100"
                                >
                                  <span className="text-base shrink-0">📋</span>
                                  <div>
                                    <div className="font-medium text-slate-700">Checklist IA</div>
                                    <div className="text-[10px] text-slate-400">Subacciones sugeridas</div>
                                  </div>
                                </button>
                                <button
                                  onClick={() => setTimeBlockActionId(action.id)}
                                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-left hover:bg-amber-50 transition-colors border-b border-gray-100"
                                >
                                  <span className="text-base shrink-0">🕐</span>
                                  <div>
                                    <div className="font-medium text-slate-700">Trasladar a Time Blocking</div>
                                    <div className="text-[10px] text-slate-400">Asignar un horario fijo</div>
                                  </div>
                                </button>
                                <button
                                  onClick={() => { setRepeatDate(formatDateKey(weekDays[selectedDayIdx])); setRepeatForId(action.id); }}
                                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-left hover:bg-amber-50 transition-colors border-b border-gray-100"
                                >
                                  <span className="text-base shrink-0">🔁</span>
                                  <div>
                                    <div className="font-medium text-slate-700">Repetir en otro día</div>
                                    <div className="text-[10px] text-slate-400">Copia independiente con subacciones</div>
                                  </div>
                                </button>
                                <button
                                  onClick={() => delegateActionTo(action.id)}
                                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-left hover:bg-amber-50 transition-colors"
                                >
                                  <span className="text-base shrink-0">👥</span>
                                  <div>
                                    <div className="font-medium text-slate-700">Delegar</div>
                                    <div className="text-[10px] text-slate-400">Enviar a Acciones por Delegar</div>
                                  </div>
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    <button onClick={() => addSubactionInline(action.id)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" title="Añadir subacción">
                      <Plus size={12} />
                    </button>
                    <button onClick={() => deleteAction(action.id)} className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Eliminar">
                      <X size={12} />
                    </button>
                  </div>
                </div>

                {/* Subactions */}
                {expandedActions.has(action.id) && (action.subactions?.length > 0 || subInputFor === action.id) && (
                  <div className="ml-6 mt-1.5 space-y-1 border-t border-slate-100 pt-1.5">
                    {(action.subactions?.length || 0) > 0 && (
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 h-1 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full bg-green-500 transition-all" style={{ width: `${groupProgress(action)}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">{groupProgress(action)}%</span>
                      </div>
                    )}
                    {action.subactions.map(sub => (
                      <div key={sub.id} className="flex items-center gap-1.5 group/sub">
                        <button
                          onClick={() => toggleSubactionStatus(action.id, sub.id, sub.is_completed)}
                          className={`shrink-0 w-3 h-3 rounded-sm border flex items-center justify-center ${sub.is_completed ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'}`}
                        >
                          {sub.is_completed && <Check size={8} />}
                        </button>
                        {editingSub?.actionId === action.id && editingSub?.subId === sub.id ? (
                          <input
                            autoFocus
                            value={subEditValue}
                            onChange={e => setSubEditValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') { e.preventDefault(); commitSubEdit(); }
                              if (e.key === 'Escape') setEditingSub(null);
                            }}
                            onBlur={() => commitSubEdit()}
                            className="flex-1 text-xs px-1.5 py-0.5 border border-amber-400 rounded outline-none bg-amber-50"
                          />
                        ) : (
                          <span
                            onDoubleClick={() => startSubEdit(action.id, sub.id, sub.title)}
                            className={`text-xs flex-1 cursor-pointer ${sub.is_completed ? 'line-through text-slate-400' : 'text-slate-600'}`}
                          >
                            {sub.title}
                          </span>
                        )}
                        <button onClick={() => deleteSubactionInline(action.id, sub.id)} className="opacity-0 group-hover/sub:opacity-100 p-0.5 hover:bg-red-100 rounded text-slate-400 hover:text-red-500">
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                    {subInputFor === action.id ? (
                      <input
                        autoFocus
                        value={subDraft}
                        onChange={e => setSubDraft(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { e.preventDefault(); commitSubDraft(action.id); }
                          if (e.key === 'Escape') { setSubInputFor(null); setSubDraft(''); }
                        }}
                        onBlur={() => commitSubDraft(action.id)}
                        placeholder="Nueva subacción..."
                        className="w-full text-xs px-1.5 py-1 border border-amber-400 rounded outline-none bg-amber-50"
                      />
                    ) : (
                      <button onClick={() => addSubactionInline(action.id)} className="text-[10px] text-slate-400 hover:text-amber-600 font-medium flex items-center gap-1">
                        <Plus size={10} /> Añadir subacción
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}

            {dayActions.length === 0 && !showNewInput && (
              <div className="text-center py-8 text-slate-400">
                <p className="text-xs">Sin tareas para este día</p>
              </div>
            )}

            {/* New Action Input */}
            {showNewInput ? (
              <div className="border border-dashed border-amber-300 rounded-xl p-2.5 bg-amber-50">
                <input
                  autoFocus
                  value={newActionTitle}
                  onChange={e => setNewActionTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); confirmAddAction(); }
                    if (e.key === 'Escape') { setShowNewInput(false); setShowAISuggest(null); setNewActionTitle(''); }
                  }}
                  placeholder="¿Qué acción quieres agregar?"
                  className="w-full text-sm px-2 py-1.5 border border-amber-300 rounded-lg outline-none focus:ring-1 focus:ring-amber-400"
                />
                <div className="flex gap-1.5 mt-1.5">
                  <button onClick={confirmAddAction} className="text-xs px-3 py-1 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium">Añadir</button>
                  <button onClick={() => { setShowNewInput(false); setShowAISuggest(null); setNewActionTitle(''); }} className="text-xs px-3 py-1 text-slate-500 hover:bg-slate-100 rounded-lg">Cancelar</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewInput(true)}
                className="w-full py-3 text-xs text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors flex items-center justify-center gap-1 border border-dashed border-slate-200"
              >
                <Plus size={14} /> Añadir acción
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-100 text-[10px] text-slate-400 flex items-center justify-between shrink-0 bg-slate-50">
          <span>Doble clic para editar • ENTER guarda • ESC cancela</span>
          <span>Arrastra a otro día para mover</span>
        </div>

        {/* AI Smart Group Suggestion */}
        {showAISuggest && (
          <div className="absolute inset-0 bg-black/30 z-[100] flex items-center justify-center p-4" onClick={() => setShowAISuggest(null)}>
            <div className="bg-white rounded-2xl shadow-xl p-4 w-[650px]" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2 text-amber-600 mb-2">
                <AlertCircle size={16} />
                <span className="font-bold text-sm">Grupo Inteligente</span>
              </div>
              <p className="text-xs text-slate-600 mb-3">
                Detecté que <strong>"{showAISuggest.title}"</strong> normalmente incluye varias tareas.
                ¿Deseas convertirla en un Grupo Inteligente de Acciones?
              </p>
              <div className="space-y-1 mb-3 bg-slate-50 rounded-lg p-2">
                {showAISuggest.subactions.map((s, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-slate-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    {s}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={rejectAIGroup} className="text-xs px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  No, solo la acción
                </button>
                <button onClick={confirmAIGroup} className="text-xs px-3 py-1.5 bg-gradient-to-r from-[#d97706] to-[#f59e0b] text-white rounded-lg hover:opacity-90 transition-opacity font-medium">
                  Sí, crear grupo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI Checklist */}
        {aiChecklistAction && (
          <div className="absolute inset-0 bg-black/30 z-[100] flex items-center justify-center p-4" onClick={() => setAiChecklistAction(null)}>
            <div className="bg-white rounded-2xl shadow-xl p-4 max-w-md w-full" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2 text-amber-600 mb-2">
                <AlertCircle size={16} />
                <span className="font-bold text-sm">Checklist IA</span>
              </div>
              <p className="text-xs text-slate-600 mb-3">
                Checklist sugerido para: <strong>"{aiChecklistAction.title}"</strong>
              </p>
              <div className="space-y-1.5 mb-3">
                {editableSubs.map((s, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <input
                      value={s}
                      onChange={e => {
                        const next = [...editableSubs];
                        next[i] = e.target.value;
                        setEditableSubs(next);
                      }}
                      className="flex-1 text-xs px-2 py-1 border border-slate-200 rounded outline-none focus:ring-1 focus:ring-amber-400 bg-white"
                    />
                    <button
                      onClick={() => {
                        const next = editableSubs.filter((_, idx) => idx !== i);
                        setEditableSubs(next.length ? next : ['']);
                      }}
                      className="p-0.5 hover:bg-red-100 rounded text-slate-400 hover:text-red-500 shrink-0"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setEditableSubs([...editableSubs, ''])}
                  className="text-[10px] text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1 mt-1"
                >
                  <Plus size={11} /> Añadir ítem
                </button>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setAiChecklistAction(null)} className="text-xs px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                <button onClick={confirmAIChecklist} className="text-xs px-3 py-1.5 bg-gradient-to-r from-[#d97706] to-[#f59e0b] text-white rounded-lg hover:opacity-90 transition-opacity font-medium">Añadir checklist</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
