import i18n from '../../i18n';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Plus, ChevronLeft, ChevronRight, Check, X, GripVertical, AlertCircle,
  MoreVertical, Clock, Repeat2, Users, Trash2, Sparkles, ShoppingCart, Dumbbell, CalendarDays,
} from 'lucide-react';
import {
  weeklyPlanService, weeklyActionService, timeBlockService, kanbanActionService, monthlyService,
} from '../../services/api';
import type { WeeklyPlanData, ActionData, SubactionData, TimeBlockData, KanbanActionData } from '../../services/api';

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DAY_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MONTHS_ABBR_BY_INDEX = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

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
const originPill = (origin: ActionData['origin_module']): { label: string; cls: string } | null => {
  switch (origin) {
    case 'KANBAN_BACKLOG': return { label: 'KANBAN', cls: 'bg-violet-100 text-violet-700' };
    case 'INTEGRATIONS_WHATSAPP': return { label: 'WHATSAPP', cls: 'bg-emerald-100 text-emerald-700' };
    case 'MANUAL': return { label: 'MANUAL', cls: 'bg-slate-100 text-slate-500' };
    default: return null;
  }
};

// Estado → letra de badge
const statusBadge = (status: ActionData['status']): { letter: string; cls: string; title: string } => {
  switch (status) {
    case 'COMPLETADA': return { letter: 'C', cls: 'bg-emerald-500', title: 'Completada' };
    case 'DELEGADA': return { letter: 'D', cls: 'bg-amber-500', title: 'Delegada' };
    default: return { letter: 'P', cls: 'bg-indigo-500', title: 'Planificada' };
  }
};

export default function PlanSemanalView({ highlightActionId, refreshKey, onConfirm, onBack }: {
  highlightActionId?: string | null;
  refreshKey?: number;
  onConfirm?: (iso: string) => void;
  onBack?: () => void;
}) {
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
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [showAISuggest, setShowAISuggest] = useState<{ title: string; subactions: string[] } | null>(null);
  const [newActionTitle, setNewActionTitle] = useState('');
  const [showNewInput, setShowNewInput] = useState(false);
  const [loading, setLoading] = useState(true);
  const editRef = useRef<HTMLInputElement>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [timeBlockHour, setTimeBlockHour] = useState(9);
  const [timeBlockActionId, setTimeBlockActionId] = useState<string | null>(null);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlockData[]>([]);
  const [aiChecklistAction, setAiChecklistAction] = useState<{ actionId: string; title: string; subactions: string[] } | null>(null);
  const [editableSubs, setEditableSubs] = useState<string[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [subInputFor, setSubInputFor] = useState<string | null>(null);
  const [subDraft, setSubDraft] = useState('');
  const [editingSub, setEditingSub] = useState<{ actionId: string; subId: string } | null>(null);
  const [subEditValue, setSubEditValue] = useState('');
  const [repeatActionId, setRepeatActionId] = useState<string | null>(null);
  const [repeatDate, setRepeatDate] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [missionEditing, setMissionEditing] = useState(false);
  const [missionDraft, setMissionDraft] = useState('');
  const [moveAction, setMoveAction] = useState<ActionData | null>(null);
  const [moveOffset, setMoveOffset] = useState(0);
  const [moveDayIdx, setMoveDayIdx] = useState(0);
  // Sugerencias Focusia
  const [sugGrupoHidden, setSugGrupoHidden] = useState(false);
  const [sugDerivadasHidden, setSugDerivadasHidden] = useState(false);
  const [sugComprasHidden, setSugComprasHidden] = useState(false);
  const [sugFisicaHidden, setSugFisicaHidden] = useState(false);
  const [kanbanPlanificar, setKanbanPlanificar] = useState<KanbanActionData[]>([]);
  const [derivadaAdded, setDerivadaAdded] = useState<Set<string>>(new Set());
  const [derivadaMode, setDerivadaMode] = useState<'idle' | 'choose'>('idle');
  const [derivadaDays, setDerivadaDays] = useState<Record<string, number>>({});
  const [derivadaSel, setDerivadaSel] = useState<Set<string>>(new Set());
  // Metas mensuales por mes (para semanas que cruzan dos meses)
  const [monthGoals, setMonthGoals] = useState<Record<string, string>>({});

  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset]);
  const weekKeys = useMemo(() => weekDays.map(formatDateKey), [weekDays]);
  const reviewMode = weekOffset < 0; // Semanas pasadas: solo lectura
  const currentDay = weekDays[selectedDayIdx];
  const currentDayKey = formatDateKey(currentDay);
  const dayActions = actions.filter(a => a.assigned_calendar_date === currentDayKey && a.status !== 'DELEGADA');
  const weekHasActions = actions.some(a => weekKeys.includes(a.assigned_calendar_date));
  const crossMonth = weekDays[0].getMonth() !== weekDays[6].getMonth();

  const weekLabel = useMemo(() => {
    const a = weekDays[0], b = weekDays[6];
    const y = b.getFullYear();
    if (a.getMonth() === b.getMonth()) {
      return `${a.getDate()} – ${b.getDate()} de ${MONTHS[b.getMonth()]} de ${y}`.toUpperCase();
    }
    return `${a.getDate()} ${MONTHS_ABBR_BY_INDEX[a.getMonth()]} – ${b.getDate()} ${MONTHS_ABBR_BY_INDEX[b.getMonth()]} de ${y}`.toUpperCase();
  }, [weekDays]);

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

  useEffect(() => {
    timeBlockService.getAll().then(setTimeBlocks).catch(() => {});
  }, [refreshKey]);

  useEffect(() => {
    kanbanActionService.getActive()
      .then(list => setKanbanPlanificar(list.filter(k => k.classification_status === 'PLANIFICAR')))
      .catch(() => {});
  }, [refreshKey]);

  // Metas mensuales por calendario (mes × año), para el cambio de meta en semanas intermensuales.
  useEffect(() => {
    monthlyService.checkStatus()
      .then(st => {
        if (!st.has_monthly_plan || !st.plan_id) return;
        return monthlyService.getPlan(st.plan_id).then(p => {
          const map: Record<string, string> = {};
          for (const g of p.goals) {
            map[`${g.calendar_year}-${g.calendar_month}`] = g.monthly_goal_text;
          }
          setMonthGoals(map);
        });
      })
      .catch(() => {});
  }, []);

  // Navegación entre semanas: carga el plan de la semana visible. Nunca modifica la planificación.
  useEffect(() => {
    if (weekOffset === 0) {
      weeklyPlanService.getCurrentWeek()
        .then(({ plan: planData }) => {
          setPlan(planData);
          setWeeklyMission(planData.weekly_mission || '');
        })
        .catch(() => {});
      return;
    }
    weeklyPlanService.weekOf(formatDateKey(weekDays[0]))
      .then(({ plan: planData }) => {
        setPlan(planData);
        setWeeklyMission(planData.weekly_mission || '');
      })
      .catch(() => {});
  }, [weekOffset]);

  useEffect(() => {
    if (!draggedAction) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDraggedAction(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [draggedAction]);

  useEffect(() => {
    if (editingActionId && editRef.current) editRef.current.focus();
  }, [editingActionId]);

  // Meta mensual mostrada: la del mes del día elegido (semana intermensual) o la del plan.
  const goalKey = `${currentDay.getFullYear()}-${currentDay.getMonth() + 1}`;
  const metaText = (crossMonth && monthGoals[goalKey]) || plan?.associated_monthly_goal_text || '';

  const saveWeeklyMission = async (value?: string) => {
    if (!plan) return;
    const text = value !== undefined ? value : weeklyMission;
    try {
      await weeklyPlanService.update(plan.id, { weekly_mission: text });
    } catch { /* ignore */ }
  };

  const startMissionEdit = () => {
    setMissionDraft(weeklyMission);
    setMissionEditing(true);
  };

  // Guardar misión desde el asistente de estado vacío.
  const saveMissionNow = async (value: string) => {
    setWeeklyMission(value);
    await saveWeeklyMission(value);
  };

  const commitMissionEdit = async () => {
    await saveWeeklyMission(missionDraft);
    setWeeklyMission(missionDraft);
    setMissionEditing(false);
  };

  const handleDoubleClick = (action: ActionData) => {
    if (reviewMode) return;
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
    if (reviewMode) return;
    try {
      let updated = await weeklyActionService.editSubaction(actionId, subId, { is_completed: !current });
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
    if (reviewMode) return;
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
    if (reviewMode) return;
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
    if (reviewMode) return;
    try {
      const updated = await weeklyActionService.deleteSubaction(actionId, subId);
      setActions(prev => prev.map(a => a.id === actionId ? updated : a));
    } catch { /* ignore */ }
  };

  const toggleCompleteAction = async (actionId: string) => {
    if (reviewMode) return;
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
    if (reviewMode) return;
    setDraggedAction(action);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (targetDayKey: string) => {
    if (!draggedAction || draggedAction.assigned_calendar_date === targetDayKey) {
      setDraggedAction(null);
      setDragOverDay(null);
      return;
    }
    try {
      const updated = await weeklyActionService.dropAction(draggedAction.id, targetDayKey);
      setActions(prev => prev.map(a => a.id === draggedAction.id ? updated : a));
    } catch { /* ignore */ }
    setDragOverDay(null);
    setDraggedAction(null);
  };

  // Eliminar con confirmación en línea para grupos (mockup: estado de confirmación).
  const requestDeleteAction = (action: ActionData) => {
    if (reviewMode) return;
    if ((action.subactions?.length || 0) > 0) {
      setConfirmDeleteId(action.id);
      return;
    }
    deleteAction(action.id);
  };

  const deleteAction = async (actionId: string) => {
    setConfirmDeleteId(null);
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
    setRepeatActionId(null);
    setRepeatDate('');
  };

  const delegateActionTo = async (actionId: string) => {
    if (reviewMode) return;
    try {
      await weeklyActionService.delegate(actionId);
      setActions(prev => prev.filter(a => a.id !== actionId));
    } catch { /* ignore */ }
    setActiveDropdownId(null);
  };

  const openMovePanel = (action: ActionData) => {
    if (reviewMode) return;
    // Destino por omisión: la semana/día actualmente visible.
    const originOffset = weekOffset;
    setMoveOffset(originOffset);
    setMoveDayIdx(selectedDayIdx);
    setMoveAction(action);
  };

  const confirmMove = async () => {
    if (!moveAction) return;
    const targetDate = formatDateKey(getWeekDays(moveOffset)[moveDayIdx]);
    try {
      const updated = await weeklyActionService.move(moveAction.id, targetDate);
      setActions(prev => prev.map(a => a.id === moveAction.id ? updated : a));
    } catch { /* ignore */ }
    setMoveAction(null);
  };

  const handleAIChecklist = (action: ActionData) => {
    if (reviewMode) return;
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

  const importFromKanban = async () => {
    if (reviewMode) return;
    try {
      const kanbanActions = await kanbanActionService.getActive();
      for (const kb of kanbanActions) {
        await weeklyActionService.addAction({
          title: kb.title,
          assigned_calendar_date: currentDayKey,
          origin_module: 'KANBAN_BACKLOG',
        });
      }
      const updated = await weeklyActionService.list();
      setActions(updated);
    } catch { /* ignore */ }
    setActiveDropdownId(null);
  };

  const confirmTimeBlock = async (action: ActionData) => {
    if (reviewMode) return;
    try {
      await timeBlockService.create({
        fecha: action.assigned_calendar_date,
        hora: timeBlockHour,
        tarea: action.title,
        estado: 'pending',
      });
      const blocks = await timeBlockService.getAll();
      setTimeBlocks(blocks);
    } catch { /* ignore */ }
    setTimeBlockActionId(null);
    setActiveDropdownId(null);
  };

  // ── Sugerencias: plantilla lista de compras ──
  const addShoppingTemplate = async () => {
    try {
      const subs = (detectSmartGroup('supermercado') || []).map((s, i) => ({
        id: crypto.randomUUID?.() || `${Date.now()}-${i}`,
        title: s,
        is_completed: false,
      }));
      const created = await weeklyActionService.addAction({
        title: 'Lista de compras del mes',
        assigned_calendar_date: currentDayKey,
        subactions: subs,
      });
      setActions(prev => [...prev, created]);
      setSugComprasHidden(true);
    } catch { /* ignore */ }
  };

  // ── Sugerencias: recomendación de actividad física ──
  const addFitnessRecommendation = async () => {
    try {
      for (const idx of [0, 2, 4]) {
        const created = await weeklyActionService.addAction({
          title: 'Sesión de actividad física',
          assigned_calendar_date: formatDateKey(weekDays[idx]),
        });
        setActions(prev => [...prev, created]);
      }
      setSugFisicaHidden(true);
    } catch { /* ignore */ }
  };

  // ── Sugerencias: acciones derivadas del Kanban ──
  const toggleDerivada = (kbId: string) => {
    setDerivadaSel(prev => {
      const next = new Set(prev);
      if (next.has(kbId)) next.delete(kbId);
      else next.add(kbId);
      return next;
    });
    setDerivadaDays(d => (d[kbId] !== undefined ? d : { ...d, [kbId]: selectedDayIdx }));
  };

  const addDerivadaActions = async (kbIds: string[]) => {
    try {
      for (const id of kbIds) {
        const kb = kanbanPlanificar.find(k => k.id === id);
        if (!kb) continue;
        const dayIdx = derivadaDays[id] ?? selectedDayIdx;
        await weeklyActionService.addAction({
          title: kb.title,
          assigned_calendar_date: formatDateKey(weekDays[dayIdx]),
          origin_module: 'KANBAN_BACKLOG',
        });
      }
      setDerivadaAdded(prev => new Set([...prev, ...kbIds]));
      const updated = await weeklyActionService.list();
      setActions(updated);
      setDerivadaMode('idle');
      setDerivadaSel(new Set());
      setSugDerivadasHidden(true);
    } catch { /* ignore */ }
  };

  const pendingDerivadas = kanbanPlanificar.filter(k => !derivadaAdded.has(k.id));

  // Bloques de una hora del día seleccionado.
  const dayBlocks = timeBlocks.filter(b => b.fecha === currentDayKey);
  const hoursWithBlocks = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
  // Vista parcial del día: solo se listan las franjas con bloque (más la primera hora vacía de contexto).
  const visibleHours = useMemo(() => {
    const used = new Set(dayBlocks.map(b => b.hora));
    if (used.size === 0) return [];
    const min = Math.min(...dayBlocks.map(b => b.hora));
    return hoursWithBlocks.filter(h => used.has(h) || h === min);
  }, [dayBlocks]);

  const selectedMoveDay = getWeekDays(moveOffset)[moveDayIdx];
  const moveCross = getWeekDays(moveOffset)[0].getMonth() !== getWeekDays(moveOffset)[6].getMonth();

  const mockWeekLabel = (days: Date[]): string => {
    const a = days[0], b = days[6];
    const y = b.getFullYear();
    if (a.getMonth() === b.getMonth()) return `${a.getDate()} – ${b.getDate()} de ${MONTHS[b.getMonth()]} de ${y}`.toUpperCase();
    return `${a.getDate()} ${MONTHS_ABBR_BY_INDEX[a.getMonth()]} – ${b.getDate()} ${MONTHS_ABBR_BY_INDEX[b.getMonth()]} de ${y}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] flex items-center justify-center p-2">
        <div className="bg-white rounded-md shadow-2xl border border-white/50 w-[650px] p-6 text-sm text-slate-500">{i18n.t('cargando_plan_semanal')}</div>
      </div>
    );
  }

  const totalWeekActions = actions.filter(a => weekKeys.includes(a.assigned_calendar_date)).length;
  const completedWeekActions = actions.filter(a => weekKeys.includes(a.assigned_calendar_date) && a.status === 'COMPLETADA').length;

  return (
    <div className="w-full">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
        <header className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-black text-[#101433] tracking-tight flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 text-white flex items-center justify-center shadow-sm shadow-violet-200">
                <CalendarDays size={14} />
              </span>
              Planificación Semanal
            </h2>
            <p className="text-xs text-[#5b6b8c] mt-0.5">{i18n.t('organiza_tus_acciones_dentro_de_la_seman')}</p>
          </div>
          {onBack && (
            <button onClick={onBack} className="shrink-0 px-2.5 py-1 rounded-lg border border-[#e3e8f5] text-slate-600 text-[11px] font-bold hover:bg-gray-50">
              ← Volver
            </button>
          )}
        </header>

        {/* META MENSUAL — borde azul izquierdo; en semanas intermensuales la meta sigue al día elegido */}
        <section className="bg-white rounded-2xl border border-[#e3e8f5] border-l-4 border-l-[#1d4ed8] p-5 shadow-sm mb-4">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="w-6 h-6 rounded bg-blue-50 text-blue-700 flex items-center justify-center"><CalendarDays size={13} /></span>
            <h2 className="text-[11px] font-black uppercase tracking-widest text-blue-800">{i18n.t('meta_mensual')}</h2>
            {crossMonth && (
              <span className="text-[9px] font-black tracking-widest text-white bg-[#1d4ed8] px-2 py-0.5 rounded-full">
                {`DÍA SELECCIONADO · ${MONTHS[currentDay.getMonth()].toUpperCase()}`}
              </span>
            )}
          </div>
          <p className="text-sm text-[#334155] leading-relaxed">
            {metaText || 'Sin meta mensual definida.'}
          </p>
          {crossMonth && (
            <p className="text-[10px] text-[#5b6b8c] mt-1.5">
              Semana de {MONTHS[weekDays[0].getMonth()]} a {MONTHS[weekDays[6].getMonth()]} · Al elegir {MONTHS[currentDay.getMonth()]}, se muestra su meta mensual{monthGoals[goalKey] ? '' : ' (el plan mantiene la meta de la semana).'}
            </p>
          )}
        </section>

        {/* MI MISIÓN SEMANAL — asistente cuando está vacía; texto + Editar misión cuando ya existe */}
        <section className="bg-white rounded-2xl border border-[#e3e8f5] p-5 shadow-sm mb-6">
          {!weeklyMission.trim() ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs font-black">1</span>
                <h2 className="text-[11px] font-black uppercase tracking-widest text-violet-700">Misión Semanal</h2>
              </div>
              {reviewMode ? (
                <p className="text-sm text-[#8a93b2]">Esta semana se planificó sin misión semanal.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  <input
                    value={weeklyMission}
                    onChange={e => setWeeklyMission(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveMissionNow(weeklyMission); }}
                    placeholder={i18n.t('defini_el_resultado_mas_importante_que_d')}
                    className="w-full text-lg font-extrabold text-[#101433] bg-white border border-[#e3e8f5] rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-violet-400 placeholder:text-slate-300"
                  />
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-start gap-1.5 text-[10px] text-[#5b6b8c]">
                      <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                      Tu misión es el resultado que define la semana: todo lo demás se planifica alrededor de ella.
                    </div>
                    <button onClick={() => saveMissionNow(weeklyMission)} disabled={!weeklyMission.trim()}
                      className="shrink-0 px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold hover:opacity-90 disabled:opacity-40 shadow-md shadow-violet-200">
                      Guardar misión
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-white flex items-center justify-center text-xs font-black shadow-sm shadow-violet-200">✓</span>
                  <h2 className="text-[11px] font-black uppercase tracking-widest text-violet-700">{i18n.t('mi_mision_semanal')}</h2>
                </div>
                {missionEditing ? (
                  <div className="flex flex-col gap-2">
                    <input
                      value={missionDraft}
                      onChange={e => setMissionDraft(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') commitMissionEdit(); if (e.key === 'Escape') setMissionEditing(false); }}
                      className="w-full text-xl font-extrabold text-[#101433] bg-white border border-[#e3e8f5] rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-violet-400"
                    />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setMissionEditing(false)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 border border-[#e3e8f5]">Cancelar</button>
                      <button onClick={commitMissionEdit} disabled={!missionDraft.trim()} className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold hover:opacity-90 disabled:opacity-40">Guardar misión</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xl font-extrabold text-[#101433] leading-snug">{weeklyMission}</p>
                )}
              </div>
              <button onClick={startMissionEdit} disabled={reviewMode}
                className="shrink-0 px-3.5 py-2 rounded-lg border border-violet-200 text-violet-700 text-xs font-bold hover:bg-violet-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                Editar misión
              </button>
            </div>
          )}
        </section>

        {/* SELECTOR DE SEMANA */}
        <section className="bg-white rounded-2xl border border-[#e3e8f5] shadow-sm overflow-hidden mb-6">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef1f8]">
            <div className="flex items-center gap-3">
              <button onClick={() => setWeekOffset(o => o - 1)} className="w-8 h-8 rounded-lg border border-[#e3e8f5] flex items-center justify-center text-[#101433] hover:bg-gray-50"><ChevronLeft size={16} /></button>
              <div>
                <span className="font-black text-sm uppercase tracking-wide text-[#101433]">{weekLabel}</span>
                <div className="mt-1">
                  <span className="text-[9px] font-black tracking-widest uppercase text-white bg-violet-600 px-2 py-0.5 rounded-full">Semana seleccionada</span>
                </div>
              </div>
              <button onClick={() => setWeekOffset(o => o + 1)} className="w-8 h-8 rounded-lg border border-[#e3e8f5] flex items-center justify-center text-[#101433] hover:bg-gray-50"><ChevronRight size={16} /></button>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-[#8a93b2] block">{i18n.t('selecciona_un_dia_para_organizar_sus_acc')}</span>
              {totalWeekActions > 0 && (
                <span className="text-[10px] font-bold text-violet-700">{completedWeekActions}/{totalWeekActions} completadas</span>
              )}
            </div>
          </div>

          <div className={`grid grid-cols-7 gap-[1px] ${crossMonth ? 'bg-[#eef1f8]' : 'bg-[#eef1f8]'}`}>
            {weekDays.map((day, idx) => {
              const key = formatDateKey(day);
              const count = actions.filter(a => a.assigned_calendar_date === key).length;
              const isSelected = idx === selectedDayIdx;
              const isDragTarget = draggedAction && dragOverDay === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDayIdx(idx)}
                  onDragOver={e => { if (draggedAction) { e.preventDefault(); setDragOverDay(key); } }}
                  onDragLeave={() => { if (dragOverDay === key) setDragOverDay(null); }}
                  onDrop={() => handleDrop(key)}
                  className={`bg-white p-3 min-h-[150px] text-left flex flex-col relative transition-colors border-2 ${isSelected ? 'border-violet-500 bg-violet-50/30' : 'border-transparent hover:bg-violet-50/40'} ${isDragTarget ? 'border-dashed border-violet-400 bg-violet-50' : ''}`}
                >
                  <div className={`text-[10px] font-black uppercase ${isSelected ? 'text-violet-700' : 'text-[#8a93b2]'}`}>
                    {DAY_FULL[idx]}{crossMonth ? ` · ${MONTHS_ABBR_BY_INDEX[day.getMonth()]}` : ''}
                  </div>
                  <div className={`text-2xl font-black leading-none mt-1 ${isSelected ? 'text-violet-600' : 'text-[#101433]'}`}>{day.getDate()}</div>
                  {isDragTarget && draggedAction ? (
                    <div className="mt-auto text-[9px] font-bold text-violet-700 bg-violet-100 rounded-full px-2 py-0.5 self-start max-w-full truncate">
                      → {draggedAction.subactions?.length ? `Grupo (${draggedAction.subactions.length})` : draggedAction.title}
                    </div>
                  ) : count > 0 ? (
                    <div className={`mt-auto inline-flex self-start text-[9px] font-bold rounded-full px-2 py-0.5 ${isSelected ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'}`}>
                      {count} {count === 1 ? 'acción' : 'acciones'}
                    </div>
                  ) : (
                    <div className="mt-auto inline-flex self-start text-[9px] font-bold rounded-full px-2 py-0.5 bg-slate-100 text-slate-400">
                      Sin acciones
                    </div>
                  )}
                  {isToday(day) && (
                    <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-violet-500" />
                  )}
                  {draggedAction && !isDragTarget && draggedAction.assigned_calendar_date !== key && (
                    <div className="absolute inset-0 border-2 border-dashed border-violet-200 rounded-sm pointer-events-none" />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Banner modo consulta (semanas pasadas) */}
        {reviewMode && (
          <div className="bg-white rounded-2xl border border-[#e3e8f5] p-4 mb-4 flex items-start gap-3">
            <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"><AlertCircle size={14} /></span>
            <div>
              <p className="text-xs font-bold text-[#101433]">Consulte la planificación de la semana seleccionada.</p>
              <p className="text-[11px] text-[#5b6b8c] mt-0.5">Semana anterior: su Misión Semanal y sus acciones permanecen conservadas.</p>
            </div>
          </div>
        )}

        {/* DETALLE DEL DÍA */}
        <section className="bg-white rounded-2xl border border-[#e3e8f5] shadow-sm overflow-hidden mb-6 relative">

          <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef1f8] bg-gradient-to-r from-[#f9fafb] to-white">
            <div>
              <h3 className="text-base font-black text-[#101433]">
                {DAY_FULL[(currentDay.getDay() === 0 ? 6 : currentDay.getDay() - 1)]} {currentDay.getDate()} de {MONTHS[currentDay.getMonth()]}
              </h3>
              <p className="text-[11px] text-[#8a93b2]">
                {dayActions.length} {dayActions.length === 1 ? 'acción asignada' : 'acciones asignadas'} · {reviewMode ? 'Solo lectura.' : 'La hora se definirá en Diario.'}
              </p>
            </div>
            <div className="flex gap-2">
              <button disabled={reviewMode} onClick={() => setShowNewInput(true)} className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold hover:opacity-90 disabled:opacity-40 shadow-md shadow-violet-200">
                + Crear acción
              </button>
              <button disabled={reviewMode} onClick={importFromKanban} className="px-3.5 py-2 rounded-lg border border-violet-200 text-violet-700 text-xs font-bold hover:bg-violet-50 disabled:opacity-40">
                Añadir desde Kanban
              </button>
            </div>
          </div>

          <div className="flex gap-0">
            {/* Columna izquierda: acciones del día */}
            <div className="flex-1 min-w-0 p-5">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#8a93b2] mb-3">Acciones del día</h4>
              <div className="space-y-2">
                {dayActions.map(action => {
                  const badge = statusBadge(action.status);
                  const pill = originPill(action.origin_module);
                  return (
                    <div
                      key={action.id}
                      draggable={!reviewMode}
                      onDragStart={e => handleDragStart(e, action)}
                      onDragEnd={() => { setDraggedAction(null); setDragOverDay(null); }}
                      className={`rounded-xl border p-3 transition-all ${
                        reviewMode ? 'border-slate-200 bg-slate-50/60 cursor-default'
                          : action.status === 'COMPLETADA' ? 'border-violet-300 bg-violet-50/40 cursor-grab active:cursor-grabbing' : 'border-slate-200 bg-white hover:shadow-sm cursor-grab active:cursor-grabbing'
                      } ${draggedAction?.id === action.id ? 'opacity-40' : ''} ${highlightActionId === action.id ? 'ring-2 ring-emerald-400' : ''}`}
                    >
                      {confirmDeleteId === action.id ? (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 flex items-center justify-between gap-2">
                          <p className="text-[11px] text-red-700">
                            <span className="font-bold">"{action.title}"</span> tiene {action.subactions!.length} subacciones. ¿Eliminar el grupo completo?
                          </p>
                          <div className="flex gap-1.5 shrink-0">
                            <button onClick={() => setConfirmDeleteId(null)} className="text-[10px] px-2.5 py-1 rounded-md border border-red-200 text-red-600 font-bold hover:bg-red-100">Cancelar</button>
                            <button onClick={() => deleteAction(action.id)} className="text-[10px] px-2.5 py-1 rounded-md bg-red-600 text-white font-bold hover:bg-red-700">Eliminar grupo</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start gap-2">
                            {/* Badge de estado */}
                            <span className={`mt-0.5 shrink-0 w-4 h-4 rounded text-[9px] font-black text-white flex items-center justify-center ${badge.cls}`} title={badge.title}>{badge.letter}</span>
                            <button
                              onClick={() => toggleCompleteAction(action.id)}
                              disabled={reviewMode}
                              className={`mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${action.status === 'COMPLETADA' ? 'bg-violet-500 border-violet-500 text-white' : 'border-slate-300 hover:border-violet-500'}`}
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
                                  className="w-full text-sm px-1.5 py-0.5 border border-violet-400 rounded outline-none bg-violet-50"
                                />
                              ) : (
                                <div className="flex items-start gap-1 flex-wrap">
                                  <span
                                    onDoubleClick={() => handleDoubleClick(action)}
                                    className={`text-sm font-semibold leading-snug ${reviewMode ? 'cursor-default' : 'cursor-pointer'} ${action.status === 'COMPLETADA' ? 'line-through text-slate-400' : 'text-[#101433]'}`}
                                  >
                                    {action.title}
                                  </span>
                                  {pill && (
                                    <span className={`text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded-full ${pill.cls}`}>{pill.label}</span>
                                  )}
                                  <button className="shrink-0 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"><GripVertical size={12} /></button>
                                  {action.subactions?.length > 0 && (
                                    <button onClick={() => toggleSubactions(action.id)} className="shrink-0 p-0.5 hover:bg-slate-100 rounded">
                                      {expandedActions.has(action.id) ? <ChevronRight size={12} className="rotate-90" /> : <ChevronRight size={12} />}
                                    </button>
                                  )}
                                </div>
                              )}
                              {action.subactions?.length > 0 && (
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="w-24 h-1 rounded-full bg-slate-100 overflow-hidden">
                                    <div className="h-full bg-violet-500 transition-all" style={{ width: `${groupProgress(action)}%` }} />
                                  </div>
                                  <span className="text-[9px] font-bold text-slate-400">{groupProgress(action)}%</span>
                                  <span className="text-[9px] text-slate-400">{action.subactions.filter(s => s.is_completed).length}/{action.subactions.length} subacciones</span>
                                </div>
                              )}
                            </div>

                            {/* Menú extra */}
                            <div className="relative shrink-0">
                              <button
                                disabled={reviewMode}
                                onClick={() => setActiveDropdownId(activeDropdownId === action.id ? null : action.id)}
                                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 disabled:opacity-30"
                              >
                                <MoreVertical size={14} />
                              </button>
                              {activeDropdownId === action.id && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={() => { setActiveDropdownId(null); setTimeBlockActionId(null); }} />
                                  <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-md shadow-xl border border-gray-200 overflow-hidden z-20">
                                    {timeBlockActionId === action.id ? (
                                      <div className="p-3 space-y-2">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-[#101433]">Seleccionar hora</div>
                                        <select
                                          value={timeBlockHour}
                                          onChange={e => setTimeBlockHour(Number(e.target.value))}
                                          className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-violet-400"
                                        >
                                          {Array.from({ length: 24 }, (_, i) => (
                                            <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                                          ))}
                                        </select>
                                        <div className="flex gap-1.5">
                                          <button onClick={() => setTimeBlockActionId(null)} className="flex-1 text-xs px-2 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                                          <button onClick={() => confirmTimeBlock(action)} className="flex-1 text-xs px-2 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-opacity font-bold">Confirmar</button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <button onClick={() => { setActiveDropdownId(null); handleAIChecklist(action); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-left hover:bg-violet-50 transition-colors border-b border-gray-100">
                                          <span className="text-base shrink-0">📋</span>
                                          <div><div className="font-medium text-slate-700">Checklist IA</div><div className="text-[10px] text-slate-400">{i18n.t('subacciones_sugeridas')}</div></div>
                                        </button>
                                        <button onClick={() => setTimeBlockActionId(action.id)} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-left hover:bg-violet-50 transition-colors">
                                          <span className="text-base shrink-0">🕐</span>
                                          <div><div className="font-medium text-slate-700">Trasladar a Time Blocking</div><div className="text-[10px] text-slate-400">{i18n.t('asignar_un_horario_fijo')}</div></div>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Fila de botones de acción (mockup: Mover / Repetir / Delegar / Eliminar) */}
                          {!reviewMode && (
                            <div className="flex items-center gap-1.5 mt-2 justify-end flex-wrap">
                              <button onClick={() => openMovePanel(action)} className="text-[10px] font-bold px-2 py-1 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-violet-700 inline-flex items-center gap-1">
                                <GripVertical size={10} /> Mover
                              </button>
                              <button onClick={() => { setRepeatActionId(repeatActionId === action.id ? null : action.id); setRepeatDate(formatDateKey(currentDay)); }} className={`text-[10px] font-bold px-2 py-1 rounded-md border inline-flex items-center gap-1 ${repeatActionId === action.id ? 'border-violet-300 text-violet-700 bg-violet-50' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                <Repeat2 size={10} /> Repetir
                              </button>
                              <button onClick={() => delegateActionTo(action.id)} className="text-[10px] font-bold px-2 py-1 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-violet-700 inline-flex items-center gap-1">
                                <Users size={10} /> Delegar
                              </button>
                              <button onClick={() => requestDeleteAction(action)} className="text-[10px] font-bold px-2 py-1 rounded-md border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 inline-flex items-center gap-1">
                                <Trash2 size={10} /> Eliminar
                              </button>
                            </div>
                          )}

                          {/* Repetir: popover en línea */}
                          {repeatActionId === action.id && (
                            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                              <div className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-1.5">Repetir en otro día</div>
                              <input
                                type="date"
                                value={repeatDate}
                                onChange={e => setRepeatDate(e.target.value)}
                                className="w-full text-xs px-2 py-1.5 border border-amber-300 rounded-lg outline-none bg-white"
                              />
                              <div className="flex gap-1.5 mt-1.5 justify-end">
                                <button onClick={() => { setRepeatActionId(null); setRepeatDate(''); }} className="text-[10px] px-2.5 py-1 rounded-md border border-amber-200 text-amber-700 font-bold hover:bg-amber-100">Cancelar</button>
                                <button onClick={() => repeatActionOn(action.id, repeatDate)} disabled={!repeatDate} className="text-[10px] px-2.5 py-1 rounded-md bg-amber-500 text-white font-bold hover:bg-amber-600 disabled:opacity-40">Confirmar</button>
                              </div>
                              <p className="text-[9px] text-amber-600 mt-1">Copia independiente con subacciones.</p>
                            </div>
                          )}

                          {/* Subacciones */}
                          {expandedActions.has(action.id) && (action.subactions?.length > 0 || subInputFor === action.id) && (
                            <div className="ml-6 mt-2 space-y-1 border-t border-slate-100 pt-2">
                              {action.subactions.map(sub => (
                                <div key={sub.id} className="flex items-center gap-1.5 group/sub">
                                  <button
                                    onClick={() => toggleSubactionStatus(action.id, sub.id, sub.is_completed)}
                                    disabled={reviewMode}
                                    className={`shrink-0 w-3 h-3 rounded-sm border flex items-center justify-center ${sub.is_completed ? 'bg-violet-500 border-violet-500 text-white' : 'border-slate-300'} disabled:opacity-60`}
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
                                      className="flex-1 text-xs px-1.5 py-0.5 border border-violet-400 rounded outline-none bg-violet-50"
                                    />
                                  ) : (
                                    <span
                                      onDoubleClick={() => startSubEdit(action.id, sub.id, sub.title)}
                                      className={`text-xs flex-1 ${reviewMode ? '' : 'cursor-pointer'} ${sub.is_completed ? 'line-through text-slate-400' : 'text-slate-600'}`}
                                    >
                                      {sub.title}
                                    </span>
                                  )}
                                  <button onClick={() => deleteSubactionInline(action.id, sub.id)} disabled={reviewMode} className="opacity-0 group-hover/sub:opacity-100 p-0.5 hover:bg-red-100 rounded text-slate-400 hover:text-red-500 text-[9px] font-bold">Eliminar</button>
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
                                  placeholder={i18n.t('nueva_subaccion')}
                                  className="w-full text-xs px-1.5 py-1 border border-violet-400 rounded outline-none bg-violet-50"
                                />
                              ) : (
                                <button onClick={() => addSubactionInline(action.id)} className="text-[10px] text-violet-600 hover:text-violet-700 font-bold flex items-center gap-1">
                                  <Plus size={10} /> Añadir subacción
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}

                {dayActions.length === 0 && !showNewInput && (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl py-8 text-center text-slate-400">
                    <p className="text-xs font-semibold">Sin acciones para este día{reviewMode ? '' : ' · Crea la primera o importa desde Kanban'}</p>
                  </div>
                )}

                {/* Creación en línea (mockup: NUEVA ACCIÓN · ENTER guarda · ESC cancela) */}
                {showNewInput && !reviewMode ? (
                  <div className="rounded-xl overflow-hidden border border-violet-300 shadow-sm">
                    <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-3 py-2 flex items-center justify-between">
                      <span className="text-[10px] font-black tracking-widest uppercase">
                        Nueva acción · {DAY_FULL[(currentDay.getDay() === 0 ? 6 : currentDay.getDay() - 1)]} {currentDay.getDate()}
                      </span>
                      <span className="text-[9px] opacity-80">ENTER guarda · ESC cancela</span>
                    </div>
                    <div className="bg-white p-3">
                      <input
                        autoFocus
                        value={newActionTitle}
                        onChange={e => setNewActionTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { e.preventDefault(); confirmAddAction(); }
                          if (e.key === 'Escape') { setShowNewInput(false); setShowAISuggest(null); setNewActionTitle(''); }
                        }}
                        placeholder={i18n.t('que_accion_quieres_agregar')}
                        className="w-full text-sm px-2.5 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-violet-400"
                      />
                      <div className="flex gap-1.5 mt-2 justify-end">
                        <button onClick={() => { setShowNewInput(false); setShowAISuggest(null); setNewActionTitle(''); }} className="text-xs px-3 py-1.5 border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 font-bold">Cancelar</button>
                        <button onClick={confirmAddAction} className="text-xs px-3.5 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:opacity-90 font-bold">Guardar acción</button>
                      </div>
                    </div>
                  </div>
                ) : null}
                {!reviewMode && !showNewInput && dayActions.length > 0 && (
                  <button
                    onClick={() => setShowNewInput(true)}
                    className="w-full py-3 text-xs text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-colors flex items-center justify-center gap-1 border border-dashed border-slate-200 font-semibold"
                  >
                    <Plus size={14} /> Añadir acción
                  </button>
                )}
              </div>
            </div>

            {/* Columna derecha: bloques de una hora */}
            <div className="w-64 shrink-0 border-l border-[#eef1f8] bg-[#fafbff] p-4 hidden xl:flex flex-col">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#101433] mb-0.5">Bloques de una hora</h4>
              <p className="text-[9px] text-[#8a93b2] mb-3">Vista parcial del día.</p>
              {dayBlocks.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                  <Clock size={18} className="text-slate-300 mb-1" />
                  <p className="text-[10px] text-slate-400 leading-relaxed">Sin bloques fijos para este día. Usa el menú ⋮ → Trasladar a Time Blocking para fijar una hora.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {visibleHours.map(h => {
                    const block = dayBlocks.find(b => b.hora === h);
                    return (
                      <div key={h} className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-[#8a93b2] w-12 shrink-0">{String(h).padStart(2, '0')}:00 – {String(h + 1).padStart(2, '0')}:00</span>
                        {block ? (
                          <span className={`flex-1 min-w-0 text-[9px] font-bold px-2 py-1 rounded-md truncate ${block.estado === 'done' ? 'bg-emerald-100 text-emerald-700' : block.estado === 'doing' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'}`} title={block.tarea}>
                            {block.tarea}
                          </span>
                        ) : (
                          <span className="flex-1 h-5 border border-dashed border-slate-200 rounded-md" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* SUGERENCIAS DE FOCUSIA — solo si la semana está vacía */}
        {!reviewMode && !weekHasActions && (
          <section className="mb-6">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#8a93b2] mb-3 flex items-center gap-1.5">
              <Sparkles size={12} className="text-violet-600" /> Sugerencias de Focusia
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

              {/* Grupo inteligente */}
              {!sugGrupoHidden && (
                <div className="bg-white rounded-2xl border border-[#e3e8f5] p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles size={13} className="text-amber-500" />
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-[#101433]">Grupo inteligente</h5>
                    </div>
                    <button onClick={() => setSugGrupoHidden(true)} className="text-slate-300 hover:text-slate-500"><X size={12} /></button>
                  </div>
                  <p className="text-[11px] text-[#5b6b8c] leading-relaxed mb-2">
                    Crea una acción y Focusia la convierte en un grupo de subacciones listas para marcar.
                  </p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {['Hacer lista de compras', 'Ir al supermercado', 'Guardar y organizar compras'].map(s => (
                      <span key={s} className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                  <button onClick={() => setShowNewInput(true)} className="text-[10px] font-bold text-violet-700 hover:bg-violet-50 border border-violet-200 px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
                    <Plus size={10} /> Probar con una acción
                  </button>
                </div>
              )}

              {/* Acciones derivadas */}
              {!sugDerivadasHidden && pendingDerivadas.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#e3e8f5] p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-[#101433]">Acciones derivadas</h5>
                    <button onClick={() => setSugDerivadasHidden(true)} className="text-slate-300 hover:text-slate-500"><X size={12} /></button>
                  </div>
                  <p className="text-[11px] text-[#5b6b8c] leading-relaxed mb-2">
                    Tienes acciones del Kanban pendientes por planificar. Elige su día y agrégalas a esta semana.
                  </p>
                  <div className="space-y-1.5 mb-2 max-h-40 overflow-y-auto">
                    {pendingDerivadas.map(kb => (
                      <div key={kb.id} className="border border-slate-100 rounded-lg px-2 py-1.5">
                        <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 cursor-pointer">
                          <input type="checkbox" checked={derivadaSel.has(kb.id)} onChange={() => toggleDerivada(kb.id)} className="accent-violet-600" />
                          <span className="flex-1 min-w-0 truncate">{kb.title}</span>
                        </label>
                        {derivadaMode === 'choose' && derivadaSel.has(kb.id) && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {weekDays.map((d, di) => (
                              <button
                                key={d.getDate()}
                                onClick={() => setDerivadaDays(prev => ({ ...prev, [kb.id]: di }))}
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${(derivadaDays[kb.id] ?? selectedDayIdx) === di ? 'bg-violet-600 text-white border-violet-600' : 'text-slate-400 border-slate-200 hover:bg-slate-50'}`}
                              >
                                {DAY_NAMES[di]}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {derivadaMode === 'choose' ? (
                      <>
                        <button onClick={() => addDerivadaActions([...derivadaSel])} disabled={derivadaSel.size === 0} className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90 disabled:opacity-40">
                          Añadir seleccionadas ({derivadaSel.size})
                        </button>
                        <button onClick={() => { setDerivadaMode('idle'); setDerivadaSel(new Set()); }} className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">Cancelar</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => addDerivadaActions(pendingDerivadas.map(k => k.id))} className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90">Agregar todas</button>
                        <button onClick={() => setDerivadaMode('choose')} className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-violet-200 text-violet-700 hover:bg-violet-50">Elegir cuáles</button>
                        <button onClick={() => setSugDerivadasHidden(true)} className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">No agregar</button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Plantilla: lista de compras */}
              {!sugComprasHidden && (
                <div className="bg-white rounded-2xl border border-[#e3e8f5] p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ShoppingCart size={13} className="text-violet-600" />
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-[#101433]">Plantilla personal · Lista de compras</h5>
                    </div>
                    <button onClick={() => setSugComprasHidden(true)} className="text-slate-300 hover:text-slate-500"><X size={12} /></button>
                  </div>
                  <p className="text-[11px] text-[#5b6b8c] leading-relaxed mb-2">Añade tu lista de compras del mes como grupo de subacciones el {DAY_FULL[(currentDay.getDay() === 0 ? 6 : currentDay.getDay() - 1)].toLowerCase()} {currentDay.getDate()} de {MONTHS[currentDay.getMonth()]}.</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {['Hacer lista de compras', 'Ir al supermercado', 'Guardar y organizar compras'].map(s => (
                      <span key={s} className="text-[9px] font-bold bg-violet-50 text-violet-700 border border-violet-100 px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                  <button onClick={addShoppingTemplate} className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90 inline-flex items-center gap-1">
                    <Plus size={10} /> Usar plantilla
                  </button>
                </div>
              )}

              {/* Recomendación: actividad física */}
              {!sugFisicaHidden && (
                <div className="bg-white rounded-2xl border border-[#e3e8f5] p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Dumbbell size={13} className="text-emerald-600" />
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-[#101433]">Recomendación semanal · Actividad física</h5>
                    </div>
                    <button onClick={() => setSugFisicaHidden(true)} className="text-slate-300 hover:text-slate-500"><X size={12} /></button>
                  </div>
                  <p className="text-[11px] text-[#5b6b8c] leading-relaxed mb-2">
                    Focusia sugiere 3 sesiones esta semana: lunes, miércoles y viernes.
                  </p>
                  <div className="flex gap-1 mb-3">
                    {[0, 2, 4].map(i => (
                      <span key={i} className="text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full">{DAY_FULL[i]} {weekDays[i].getDate()}</span>
                    ))}
                  </div>
                  <button onClick={addFitnessRecommendation} className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:opacity-90 inline-flex items-center gap-1">
                    <Plus size={10} /> Añadir sesiones
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* MOVER A OTRA SEMANA (grupo o acción) */}
        {moveAction && (
          <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4" onClick={() => setMoveAction(null)}>
            <div className="bg-white rounded-2xl shadow-xl p-5 w-[460px]" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-7 h-7 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center font-black text-xs">↔</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-violet-700">
                  {(moveAction.subactions?.length || 0) > 0 ? 'Mover grupo a otra semana' : 'Mover a otra semana'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                <span className="font-bold text-[#101433]">"{moveAction.title}"</span>
                {(moveAction.subactions?.length || 0) > 0 && <> · conserva sus {moveAction.subactions!.length} subacciones.</>}
              </p>

              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setMoveOffset(o => o - 1)} className="w-7 h-7 rounded-lg border border-[#e3e8f5] flex items-center justify-center hover:bg-gray-50"><ChevronLeft size={14} /></button>
                <span className="text-[10px] font-black uppercase tracking-wide text-[#101433] flex-1">{mockWeekLabel(getWeekDays(moveOffset))}</span>
                <button onClick={() => setMoveOffset(o => o + 1)} className="w-7 h-7 rounded-lg border border-[#e3e8f5] flex items-center justify-center hover:bg-gray-50"><ChevronRight size={14} /></button>
              </div>
              <div className="flex gap-1 flex-wrap mb-3">
                {DAY_NAMES.map((dn, idx) => (
                  <button
                    key={dn}
                    onClick={() => setMoveDayIdx(idx)}
                    className={`text-[9px] font-bold px-2 py-1 rounded-full border transition-colors ${moveDayIdx === idx ? 'bg-violet-600 text-white border-violet-600' : 'text-slate-400 border-slate-200 hover:bg-violet-50'}`}
                  >
                    {dn}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-slate-400 mb-3">
                Destino: {DAY_FULL[(selectedMoveDay.getDay() === 0 ? 6 : selectedMoveDay.getDay() - 1)]} {selectedMoveDay.getDate()} de {MONTHS[selectedMoveDay.getMonth()]}{moveCross ? ' (semana intermensual)' : ''}.
              </p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setMoveAction(null)} className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold">Cancelar</button>
                <button onClick={confirmMove} className="text-xs px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90 font-bold">Confirmar movimiento</button>
              </div>
            </div>
          </div>
        )}

        {/* Grupo Inteligente (al crear acción) */}
        {showAISuggest && (
          <div className="fixed inset-0 bg-black/30 z-[100] flex items-center justify-center p-4" onClick={() => setShowAISuggest(null)}>
            <div className="bg-white rounded-2xl shadow-xl p-4 w-[650px]" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2 text-amber-600 mb-2">
                <AlertCircle size={16} />
                <span className="font-bold text-sm">{i18n.t('grupo_inteligente')}</span>
              </div>
              <p className="text-xs text-slate-600 mb-3">
                Detecté que <strong>"{showAISuggest.title}"</strong> normalmente incluye varias tareas.
                ¿Deseas convertirla en un Grupo Inteligente de Acciones?
              </p>
              <div className="space-y-1 mb-3 bg-slate-50 rounded-lg p-2">
                {showAISuggest.subactions.map((s, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-slate-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />{s}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={rejectAIGroup} className="text-xs px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">{i18n.t('no_solo_la_accion')}</button>
                <button onClick={confirmAIGroup} className="text-xs px-3 py-1.5 bg-gradient-to-r from-[#d97706] to-[#f59e0b] text-white rounded-lg hover:opacity-90 transition-opacity font-medium">{i18n.t('si_crear_grupo')}</button>
              </div>
            </div>
          </div>
        )}

        {/* Checklist IA */}
        {aiChecklistAction && (
          <div className="fixed inset-0 bg-black/30 z-[100] flex items-center justify-center p-4" onClick={() => setAiChecklistAction(null)}>
            <div className="bg-white rounded-2xl shadow-xl p-4 max-w-md w-full" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2 text-amber-600 mb-2">
                <AlertCircle size={16} />
                <span className="font-bold text-sm">Checklist IA</span>
              </div>
              <p className="text-xs text-slate-600 mb-3">Checklist sugerido para: <strong>"{aiChecklistAction.title}"</strong></p>
              <div className="space-y-1.5 mb-3">
                {editableSubs.map((s, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <input value={s} onChange={e => { const next = [...editableSubs]; next[i] = e.target.value; setEditableSubs(next); }} className="flex-1 text-xs px-2 py-1 border border-slate-200 rounded outline-none focus:ring-1 focus:ring-violet-400 bg-white" />
                    <button onClick={() => { const next = editableSubs.filter((_, idx) => idx !== i); setEditableSubs(next.length ? next : ['']); }} className="p-0.5 hover:bg-red-100 rounded text-slate-400 hover:text-red-500 shrink-0"><X size={12} /></button>
                  </div>
                ))}
                <button onClick={() => setEditableSubs([...editableSubs, ''])} className="text-[10px] text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1 mt-1"><Plus size={11} /> Añadir ítem</button>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setAiChecklistAction(null)} className="text-xs px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                <button onClick={confirmAIChecklist} className="text-xs px-3 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-opacity font-medium">Añadir checklist</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
