import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Loader2, Undo2, Target, CalendarDays, Calendar, Clock, X, Check, Sparkles, HelpCircle, Trash2, Users, Maximize2 } from 'lucide-react';
import { api } from '../services/api';


export type ActionOrigin = 'MANUAL' | 'RUEDA_VIDA' | 'OTRO_MODULO';

export type ActionStatus =
  | 'KANBAN_ACTIVO'
  | 'ENVIADA_DIARIA'
  | 'PLANIFICADA_SEMANAL'
  | 'PLANIFICADA_MENSUAL'
  | 'PLANIFICADA_ANUAL'
  | 'POR_DELEGAR'
  | 'ELIMINADA_BASURERO'
  | 'COMPLETADA'
  | 'HISTORICA';

export type ClassificationType = 'HACER' | 'PLANIFICAR' | 'DELEGAR' | 'ELIMINAR';

export interface ActionMovementHistory {
  id: string;
  previous_status: ActionStatus;
  new_status: ActionStatus;
  timestamp: Date;
  note?: string;
}

interface AccionKanban {
  id: string;
  texto_accion: string;
  origen: 'MANUAL' | 'RUEDA_VIDA' | 'OTRO';
  clasificacion: 'H' | 'P' | 'D' | 'E' | null;
  estado_actual: string;
  destino_asignado: string;
  fecha_seleccionada: string | null;
  hora_seleccionada: string | null;
  es_fijo: boolean;
  creado_en: string;
  actualizado_en: string;
  movement_history?: ActionMovementHistory[];
}

interface KanbanBacklogProps {
  className?: string;
  containerHeight?: number;
  onClassified?: (clasificacion: string, texto: string) => void;
  onExpand?: () => void;
}

interface PendingClassification {
  accion: AccionKanban;
  clasificacion: 'H' | 'P' | 'D' | 'E';
  destinoPlanificacion?: string;
  note?: string;
  fechaSeleccionada?: string;
  timerId: ReturnType<typeof setTimeout>;
}

interface PlanificacionModal {
  accion: AccionKanban;
  clasificacion: 'H' | 'P' | 'D' | 'E';
}



const UNDO_TIMEOUT = 4000;
const FADE_DURATION = 250;

// §7 textos de confirmación por decisión + §12 ayuda breve H/P/D/E.
const CONFIRM_TEXT: Record<'H' | 'P' | 'D' | 'E', string> = {
  H: 'Acción enviada a tu agenda diaria. Puedes fijarla con doble clic o moverla al horario que prefieras.',
  P: 'Acción planificada correctamente. Ya fue enviada a la agenda seleccionada y quedó registrada en tu historial.',
  D: 'Acción enviada a Acciones por Delegar.',
  E: 'Acción enviada a ideas desechadas.',
};

const HELP_TEXT = 'H = Hacer ahora. P = Planificar para otro momento. D = Delegar a otra persona. E = Eliminar o desechar.';

const TIPO_CONFIG: Record<string, { color: string; hover: string }> = {
  H: { color: '#143ccc', hover: '#143ccc' },
  P: { color: '#7f2c87', hover: '#7f2c87' },
D: { 
    color: 'linear-gradient(to right, #200013, #814B8D, #143CCC)', 
    hover: 'linear-gradient(to right, #171e3b, #814B8D, #143CCC)' // Corregido el error de tipeo
  },  E: { color: '#000000', hover: '#000000' },
};
const PLAN_OPTIONS = [
  { key: 'ANUAL', label: 'Meta Anual', sub: 'Objetivo a largo plazo para todo el año', Icon: Target },
  { key: 'MENSUAL', label: 'Meta Mensual', sub: 'Objetivo para este mes', Icon: CalendarDays },
  { key: 'SEMANAL', label: 'Meta Semanal', sub: 'Objetivo para esta semana', Icon: Calendar },
  { key: 'DIARIA', label: 'Meta Diaria', sub: 'Acción para hoy', Icon: Clock },
] as const;

type PlanKey = typeof PLAN_OPTIONS[number]['key'];

interface PlanificacionModalInnerProps {
  accion: AccionKanban;
  onConfirm: (destino: string, fecha?: string) => void;
  onCancel: () => void;
}

const PlanificacionModalComponent: React.FC<PlanificacionModalInnerProps> = ({ accion, onConfirm, onCancel }) => {
  const [selected, setSelected] = useState<PlanKey>('DIARIA');
  const [texto, setTexto] = useState(accion.texto_accion);
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));

  const handleConfirm = () => {
    if (selected === 'DIARIA') {
      onConfirm('DIARIA', fecha || undefined);
    } else {
      onConfirm(selected, fecha || undefined);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onCancel}>
      <div
        className="bg-white rounded-xl w-[650px] shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Planificar tarea</h2>
            <p className="text-xs text-gray-400 mt-0.5">Clasifica en qué meta encaja</p>
          </div>
          <button type="button" onClick={onCancel} className="text-gray-300 hover:text-gray-500 transition-colors mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task name input */}
        <div className="px-5 pb-3">
          <input
            type="text"
            value={texto}
            onChange={e => setTexto(e.target.value)}
            className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-300 transition-all"
          />
        </div>

        {/* Sugerencia */}
        <div className="px-5 pb-2">
          <span className="text-[10px] font-bold tracking-wide text-purple-500 uppercase">
            Sugerencia: <span className="text-purple-600">Meta Diaria</span>
          </span>
        </div>

        {/* Options */}
        <div className="px-5 pb-4 space-y-2">
          {PLAN_OPTIONS.map(opt => {
            const isSelected = selected === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSelected(opt.key)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-purple-400 bg-purple-50/60'
                    : 'border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  isSelected ? 'bg-purple-100' : 'bg-gray-100'
                }`}>
                  <opt.Icon className={`w-4 h-4 ${isSelected ? 'text-purple-500' : 'text-gray-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold ${isSelected ? 'text-purple-700' : 'text-gray-700'}`}>
                    {opt.label}
                  </div>
                  <div className="text-[11px] text-gray-400 truncate">{opt.sub}</div>
                </div>
                {opt.key === 'DIARIA' && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-purple-500 bg-purple-100 rounded-full px-1.5 py-0.5">
                      <Sparkles className="w-2.5 h-2.5" />IA
                    </span>
                  </div>
                )}
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Fecha destino */}
        <div className="px-5 pb-4">
          <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">
            Elige el día o fecha donde ubicarla
          </label>
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-300 transition-all"
          />
        </div>

        {/* Footer buttons */}
        <div className="px-5 pb-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #a78bfa, #c084fc, #f0abfc)' }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

const EmptyRow: React.FC<{ onClassified?: (clasificacion: string, texto: string) => void }> = ({ onClassified }) => {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [similarWarning, setSimilarWarning] = useState(false);

  const handleCreate = async (tipo: 'H' | 'P' | 'D' | 'E') => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const response = await api.post('/api/acciones-kanban/', { texto_accion: trimmed });
      // §17.5: advertir duplicada sin bloquear (igual se guarda).
      setSimilarWarning(!!response.data?.similar_warning);
      onClassified?.(tipo, trimmed);
      setText('');
    } catch {}
    setSaving(false);
  };

  return (
    <div>
      <div className="flex items-center gap-1">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Escriba aquí"
        disabled={saving}
        className="flex-1 border border-gray-200 rounded text-[10px] px-1.5 py-1 h-6  w-10 flex items-center text-gray-700 bg-white truncate"
      />
      <div className="flex gap-[3px] shrink-0 rounded-md px-1 py-0.5 bg-gray-100 border border-black-100">
        {(['H', 'P', 'D', 'E'] as const).map(tipo => {
          const cfg = TIPO_CONFIG[tipo];
          return (
            <button
              key={tipo}
              type="button"
              title={tipo === 'H' ? 'Hacer' : tipo === 'P' ? 'Planificar' : tipo === 'D' ? 'Delegar' : 'Eliminar'}
              onClick={() => handleCreate(tipo)}
              style={{ background: cfg.color }}
              className="w-[18px] h-[18px] rounded-full text-[8px] font-bold flex items-center justify-center transition-all text-white"
            >
              {tipo}
            </button>
          );
        })}
      </div>
      </div>
      {similarWarning && (
        <p className="text-[9px] text-amber-600 leading-tight mt-0.5">
          Parece que ya tienes una acción similar. Se guardó de todas formas.
        </p>
      )}
    </div>
  );
};

export const KanbanBacklog: React.FC<KanbanBacklogProps> = ({ className = '', containerHeight, onClassified, onExpand }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [acciones, setAcciones] = useState<AccionKanban[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingClassification, setPendingClassification] = useState<PendingClassification | null>(null);
  const [planificacionModal, setPlanificacionModal] = useState<PlanificacionModal | null>(null);
  const [nuevaAccion, setNuevaAccion] = useState('');
  const [similarWarning, setSimilarWarning] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [porDelegar, setPorDelegar] = useState<AccionKanban[]>([]);
  const [papelera, setPapelera] = useState<AccionKanban[]>([]);
  const [showPorDelegar, setShowPorDelegar] = useState(false);
  const [showPapelera, setShowPapelera] = useState(false);
  const [leavingIds, setLeavingIds] = useState<Set<string>>(new Set());
  const [animatingEId, setAnimatingEId] = useState<string | null>(null);
  const [lottieDeleteAction, setLottieDeleteAction] = useState<AccionKanban | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [listHeight, setListHeight] = useState(0);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    loadAcciones();
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setListHeight(el.clientHeight));
    ro.observe(el);
    setListHeight(el.clientHeight);
    return () => ro.disconnect();
  }, [loading]);

  const ROW_HEIGHT = 26;
  const emptyRows = Math.max(0, Math.floor(listHeight / ROW_HEIGHT) - acciones.length);

  // Reset activeIndex when acciones change
  useEffect(() => {
    setActiveIndex(prev => Math.min(prev, Math.max(0, acciones.length - 1)));
  }, [acciones.length]);

  const refreshSections = useCallback(async () => {
    try {
      const [boardRes, papeleraRes] = await Promise.all([
        api.get('/api/acciones-kanban/board/'),
        api.get('/api/acciones-kanban/papelera/'),
      ]);
      const board: AccionKanban[] = boardRes.data || [];
      setPorDelegar(board.filter(a => a.estado_actual === 'POR_DELEGAR'));
      setPapelera(papeleraRes.data || []);
    } catch (err) {
      console.error('Error refreshing kanban sections:', err);
    }
  }, []);

  const loadAcciones = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/acciones-kanban/');
      setAcciones(response.data);
      await refreshSections();
    } catch (err) {
      console.error('Error loading acciones:', err);
      setError('Error al cargar las acciones');
    } finally {
      setLoading(false);
    }
  };

  const handleCrearAccion = async () => {
    if (!nuevaAccion.trim()) return;
    try {
      const response = await api.post('/api/acciones-kanban/', {
        texto_accion: nuevaAccion.trim(),
      });
      setAcciones(prev => [response.data, ...prev]);
      setNuevaAccion('');
      setActiveIndex(0);
      // §17.5: advertir duplicada sin bloquear (igual se guarda).
      setSimilarWarning(!!response.data?.similar_warning);
    } catch (err) {
      console.error('Error creating accion:', err);
      setError('Error al crear la acción');
    }
  };

  const executeClassification = async (accion: AccionKanban, clasificacion: 'H' | 'P' | 'D' | 'E', destinoPlanificacion?: string, note?: string, fechaSeleccionada?: string) => {
    const previousStatus = accion.estado_actual;
    const newStatus: ActionStatus =
      clasificacion === 'H' ? 'ENVIADA_DIARIA' :
      clasificacion === 'D' ? 'POR_DELEGAR' :
      clasificacion === 'E' ? 'ELIMINADA_BASURERO' :
      destinoPlanificacion ? mapeoDestino(destinoPlanificacion) : 'ENVIADA_DIARIA';

    recordMovement(accion, previousStatus, newStatus, note);

    try {
      const response = await api.patch(`/api/acciones-kanban/${accion.id}/clasificar/`, {
        clasificacion,
        destino_planificacion: destinoPlanificacion || null,
        ...(fechaSeleccionada ? { fecha_seleccionada: fechaSeleccionada } : {}),
      });
      if (response.data) {
        setAcciones(prev => prev.map(a => a.id === accion.id ? { ...response.data, movement_history: a.movement_history } : a));
      }
    } catch (err) {
      console.error('Error classifying:', err);
      setAcciones(prev => [accion, ...prev]);
      setError('Error al clasificar la acción');
    }
    refreshSections();
  };

  const recordMovement = (accion: AccionKanban, previousStatus: string, newStatus: ActionStatus, note?: string) => {
    const movement: ActionMovementHistory = {
      id: crypto.randomUUID(),
      previous_status: (previousStatus || 'KANBAN_ACTIVO') as ActionStatus,
      new_status: newStatus,
      timestamp: new Date(),
      note,
    };
    setAcciones(prev => prev.map(a => a.id === accion.id ? { ...a, movement_history: [...(a.movement_history || []), movement] } : a));
  };

  const mapeoDestino = (destino: string): ActionStatus => {
    switch (destino) {
      case 'DIARIA': return 'ENVIADA_DIARIA';
      case 'SEMANAL': return 'PLANIFICADA_SEMANAL';
      case 'MENSUAL': return 'PLANIFICADA_MENSUAL';
      case 'ANUAL': return 'PLANIFICADA_ANUAL';
      default: return 'ENVIADA_DIARIA';
    }
  };

  const startUndo = useCallback((accion: AccionKanban, clasificacion: 'H' | 'P' | 'D' | 'E', extras?: {
    destinoPlanificacion?: string;
    note?: string;
    fechaSeleccionada?: string;
  }) => {
    setAcciones(prev => prev.filter(a => a.id !== accion.id));
    onClassified?.(clasificacion, accion.texto_accion);
    const timerId = setTimeout(() => {
      executeClassification(
        accion,
        clasificacion,
        extras?.destinoPlanificacion,
        extras?.note,
        extras?.fechaSeleccionada,
      );
      setPendingClassification(null);
    }, UNDO_TIMEOUT);
    setPendingClassification({ accion, clasificacion, ...extras, timerId });
  }, [onClassified]);

  useEffect(() => {
    if (!lottieDeleteAction) return;
    const accion = lottieDeleteAction;
    const timer = setTimeout(() => {
      setLottieDeleteAction(null);
      setAnimatingEId(accion.id);
      setLeavingIds(prev => new Set(prev).add(accion.id));
      setTimeout(() => {
        setAnimatingEId(null);
        setLeavingIds(prev => {
          const next = new Set(prev);
          next.delete(accion.id);
          return next;
        });
        startUndo(accion, 'E');
      }, 600);
    }, 1500);
    return () => clearTimeout(timer);
  }, [lottieDeleteAction, startUndo]);

  const handleClasificar = useCallback((accion: AccionKanban, clasificacion: 'H' | 'P' | 'D' | 'E') => {
    if (pendingClassification) return;
    if (leavingIds.has(accion.id)) return;

    if (clasificacion === 'P') {
      setPlanificacionModal({ accion, clasificacion });
      return;
    }

    if (clasificacion === 'E') {
      setLottieDeleteAction(accion);
      return;
    }

    setLeavingIds(prev => new Set(prev).add(accion.id));
    setTimeout(() => {
      setLeavingIds(prev => {
        const next = new Set(prev);
        next.delete(accion.id);
        return next;
      });
      startUndo(accion, clasificacion);
    }, FADE_DURATION);
  }, [pendingClassification, leavingIds, startUndo]);

  const handleUndo = useCallback(() => {
    if (!pendingClassification) return;
    clearTimeout(pendingClassification.timerId);
    setAcciones(prev => [pendingClassification.accion, ...prev]);
    setPendingClassification(null);
  }, [pendingClassification]);

  const handleRestore = useCallback(async (id: string) => {
    try {
      const response = await api.patch(`/api/acciones-kanban/${id}/restaurar/`);
      setPapelera(prev => prev.filter(a => a.id !== id));
      if (response.data) {
        setAcciones(prev => [response.data, ...prev]);
        setActiveIndex(0);
      }
      refreshSections();
    } catch (err) {
      console.error('Error restoring accion:', err);
      setError('Error al recuperar la acción');
    }
  }, [refreshSections]);

  const handlePlanificacionConfirm = async (destino: string, fecha?: string) => {
    if (!planificacionModal) return;

    const { accion } = planificacionModal;
    // §17.3: si cancela, la acción sigue en el Kanban (el modal solo se cierra).
    const clasificacionFinal = destino === 'DIARIA' ? 'H' : 'P';
    const destinoPlanificacion = destino === 'DIARIA' ? undefined : destino;

    setLeavingIds(prev => new Set(prev).add(accion.id));
    setPlanificacionModal(null);

    setTimeout(() => {
      setLeavingIds(prev => {
        const next = new Set(prev);
        next.delete(accion.id);
        return next;
      });
      startUndo(accion, clasificacionFinal, {
        destinoPlanificacion,
        note: `Planificado: ${destino}`,
        fechaSeleccionada: fecha,
      });
    }, FADE_DURATION);
  };

  const handlePlanificacionCancel = () => {
    setPlanificacionModal(null);
  };

  const handleDoubleClick = useCallback(async (accion: AccionKanban) => {
    if (accion.estado_actual !== 'AGENDA_DIARIA') return;

    try {
      const response = await api.patch(`/api/acciones-kanban/${accion.id}/fijar/`);
      recordMovement(accion, accion.estado_actual, 'COMPLETADA', 'Fijado en Agenda Diaria');
      setAcciones(prev => prev.map(a => a.id === accion.id ? { ...response.data, movement_history: a.movement_history } : a));
    } catch (err) {
      console.error('Error fijando accion:', err);
      setError('Error al fijar la acción');
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      if (isInput) return;
      if (planificacionModal) return;
      if (pendingClassification) return;

      const key = e.key.toUpperCase();

      if (key === 'ARROWUP') {
        e.preventDefault();
        setActiveIndex(prev => (prev <= 0 ? acciones.length - 1 : prev - 1));
        return;
      }
      if (key === 'ARROWDOWN') {
        e.preventDefault();
        setActiveIndex(prev => (prev >= acciones.length - 1 ? 0 : prev + 1));
        return;
      }

      if (['H', 'P', 'D', 'E'].includes(key) && acciones.length > 0) {
        e.preventDefault();
        const idx = activeIndex >= acciones.length ? 0 : activeIndex;
        handleClasificar(acciones[idx], key as 'H' | 'P' | 'D' | 'E');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [acciones, activeIndex, planificacionModal, pendingClassification, handleClasificar]);

  return (
    <div
      ref={containerRef}
      className={`bg-white rounded-md border border-gray-200 overflow-hidden w-full shadow-[0_4px_20px_rgba(0,0,0,0.06)] -mt-15 h-[450px] flex flex-col ${className}`}
      tabIndex={-1}
    >
      <style>{`
        @keyframes kanban-fade-out {
          from { opacity: 1; transform: translateX(0); }
          to   { opacity: 0; transform: translateX(-16px); }
        }
        .kanban-leaving {
          animation: kanban-fade-out ${FADE_DURATION}ms ease forwards;
          pointer-events: none;
        }
        .kanban-active {
          background-color: #fef3c7;
          border-radius: 4px;
        }
        @keyframes kanban-paper-crumple {
          0% { transform: scaleX(1) scaleY(1) rotate(0deg) translateY(0); opacity: 1; }
          20% { transform: scaleX(0.7) scaleY(0.5) rotate(-4deg) translateY(5px); opacity: 0.85; }
          45% { transform: scaleX(0.35) scaleY(0.25) rotate(-8deg) translateY(15px); opacity: 0.55; border-radius: 50%; }
          70% { transform: scaleX(0.15) scaleY(0.1) rotate(-12deg) translateY(30px); opacity: 0.25; border-radius: 50%; }
          100% { transform: scaleX(0.05) scaleY(0.05) rotate(-15deg) translateY(45px); opacity: 0; border-radius: 50%; }
        }
        .kanban-deleting {
          animation: kanban-paper-crumple 600ms ease-in forwards;
          pointer-events: none;
        }
        @keyframes trash-catch {
          0% { transform: scale(1) rotate(0deg); }
          35% { transform: scale(1.6) rotate(-12deg); }
          55% { transform: scale(1.3) rotate(8deg); }
          75% { transform: scale(1.1) rotate(-3deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        .trash-catch {
          animation: trash-catch 0.6s ease-in-out forwards;
        }
      `}</style>

      <div className="relative bg-[#171e3b] text-white text-center py-2 font-bold text-[11px] uppercase tracking-widest shrink-0 mb-2 mt-2 rounded-md w-full flex items-center justify-center" style={{ background: 'linear-gradient(90deg, #171e3b, #143ccc)' }}>
        KANBAN BACKLOG
        {onExpand && (
          <button
            type="button"
            onClick={onExpand}
            title="Abrir página completa del Kanban"
            className="absolute right-8 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowHelp(v => !v)}
          title="Ayuda: H = Hacer ahora. P = Planificar para otro momento. D = Delegar a otra persona. E = Eliminar o desechar."
          className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
      {showHelp && (
        <p className="text-[10px] text-gray-500 leading-relaxed px-2 pb-1 shrink-0">
          {HELP_TEXT}
        </p>
      )}

      <div className="grid grid-cols-[1fr_90px] text-[10px] font-bold border-b border-gray-200 shrink-0 gap-1">
        <div className="bg-[linear-gradient(90deg,#ffe29f,#ffc997)] text-slate-800 text-center py-1 uppercase tracking-wide rounded-md border border-black-300/50 w-[130px] ml-1">
          Acción
        </div>
        <div className="bg-[linear-gradient(90deg,#ffe29f,#ffc997)] text-slate-800 text-center py-1 px-2 uppercase border border-black-300/50 rounded-md w-[85px]">
          Matriz
        </div>
      </div>

      

      <div ref={listRef} className="p-1 space-y-[2px] flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {acciones.map((accion, idx) => {
              const isActive = idx === activeIndex && !leavingIds.has(accion.id);
              return (
                <div
                  key={accion.id}
                  className={`flex items-center gap-1 group ${leavingIds.has(accion.id) ? (animatingEId === accion.id ? 'kanban-deleting' : 'kanban-leaving') : ''} ${isActive ? 'kanban-active' : ''}`}
                  onDoubleClick={() => handleDoubleClick(accion)}
                  onMouseEnter={() => setActiveIndex(idx)}
                >
                  <div className="flex-1 border border-gray-200 rounded text-[10px] px-1.5 py-1 h-6 flex items-center text-gray-700 bg-white truncate" title={accion.texto_accion}>
                    {accion.es_fijo && <span className="text-amber-500 mr-1">★</span>}
                    {accion.texto_accion}
                  </div>
                  <div className="flex gap-[3px] shrink-0 rounded-md px-1 py-0.5 bg-gray-100 border border-black-100">
                    {(['H', 'P', 'D', 'E'] as const).map(tipo => {
                      const cfg = TIPO_CONFIG[tipo];
                      return (
                        <button
                          key={tipo}
                          type="button"
                          title={tipo === 'H' ? 'Hacer' : tipo === 'P' ? 'Planificar' : tipo === 'D' ? 'Delegar' : 'Eliminar'}
                          onClick={() => handleClasificar(accion, tipo)}
                          style={{ background: cfg.color }}
                          className="w-[18px] h-[18px] rounded-full text-[8px] font-bold flex items-center justify-center transition-all text-white"
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = cfg.hover; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = cfg.color; }}
                        >
                          {tipo}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {Array.from({ length: emptyRows }).map((_, i) => (
              <EmptyRow key={`empty-${i}`} onClassified={onClassified} />
            ))}
          </>
        )}
      </div>

      {pendingClassification && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 max-w-md bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-3 text-sm z-50">
          <span className="flex-1">{CONFIRM_TEXT[pendingClassification.clasificacion]} ¿Deshacer?</span>
          <button
            type="button"
            onClick={handleUndo}
            className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-medium shrink-0"
          >
            <Undo2 className="w-4 h-4" />
            Deshacer
          </button>
        </div>
      )}

      <div className="border-t border-gray-100 shrink-0">
        <div className="flex items-center justify-center gap-4 py-1.5 text-[10px] font-bold">
          <button
            type="button"
            onClick={() => setShowPorDelegar(v => !v)}
            className="flex items-center gap-1 text-gray-500 hover:text-amber-600 transition-colors"
          >
            <Users className="w-3 h-3" /> Por delegar ({porDelegar.length}) {showPorDelegar ? '▾' : '▸'}
          </button>
          <button
            type="button"
            onClick={() => setShowPapelera(v => !v)}
            className="flex items-center gap-1 text-gray-500 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-3 h-3" /> Ideas desechadas ({papelera.length}) {showPapelera ? '▾' : '▸'}
          </button>
        </div>
        {showPorDelegar && (
          <div className="max-h-28 overflow-y-auto px-2 pb-1.5 space-y-0.5">
            {porDelegar.length === 0 ? (
              <p className="text-[10px] text-gray-400 text-center py-1">Sin acciones por delegar</p>
            ) : (
              porDelegar.map(a => (
                <p key={a.id} className="text-[10px] text-gray-600 truncate" title={a.texto_accion}>
                  • {a.texto_accion}
                </p>
              ))
            )}
          </div>
        )}
        {showPapelera && (
          <div className="max-h-28 overflow-y-auto px-2 pb-1.5 space-y-0.5">
            {papelera.length === 0 ? (
              <p className="text-[10px] text-gray-400 text-center py-1">Sin ideas desechadas</p>
            ) : (
              papelera.map(a => (
                <div key={a.id} className="flex items-center gap-2">
                  <p className="flex-1 text-[10px] text-gray-500 truncate" title={a.texto_accion}>
                    • {a.texto_accion}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleRestore(a.id)}
                    className="text-[10px] font-bold text-sky-600 hover:text-sky-700 shrink-0"
                  >
                    Recuperar
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {lottieDeleteAction && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[100]">
          <style>{`
            @keyframes trash-bounce-in {
              0% { transform: scale(0) rotate(-20deg); opacity: 0; }
              60% { transform: scale(1.2) rotate(5deg); opacity: 1; }
              100% { transform: scale(1) rotate(0deg); opacity: 1; }
            }
            @keyframes trash-shake {
              0%, 100% { transform: rotate(0deg); }
              15% { transform: rotate(-8deg); }
              30% { transform: rotate(6deg); }
              45% { transform: rotate(-4deg); }
              60% { transform: rotate(2deg); }
              75% { transform: rotate(-1deg); }
            }
            @keyframes trash-paper-fall {
              0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
              80% { transform: translateY(10px) rotate(15deg); opacity: 0.6; }
              100% { transform: translateY(15px) rotate(20deg); opacity: 0; }
            }
            @keyframes trash-lid-open {
              0% { transform: rotateX(0deg); transform-origin: top; }
              50% { transform: rotateX(-40deg); transform-origin: top; }
              100% { transform: rotateX(0deg); transform-origin: top; }
            }
            .trash-anim { animation: trash-bounce-in 0.4s ease-out forwards; }
            .trash-shake-anim { animation: trash-shake 0.5s ease-in-out 0.4s forwards; transform-origin: bottom center; }
            .trash-paper-anim { animation: trash-paper-fall 0.8s ease-in 0.2s forwards; opacity: 0; }
            .trash-lid-anim { animation: trash-lid-open 0.8s ease-in-out 0.1s forwards; transform-origin: top; }
          `}</style>
          <div className="bg-white rounded-xl shadow-2xl p-6 flex flex-col items-center gap-3">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute trash-paper-anim" style={{ top: '0px' }}>
                <svg width="14" height="16" viewBox="0 0 14 16" fill="none">
                  <rect x="1" y="1" width="12" height="14" rx="1" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1"/>
                  <line x1="4" y1="5" x2="10" y2="5" stroke="#9ca3af" strokeWidth="0.8"/>
                  <line x1="4" y1="8" x2="10" y2="8" stroke="#9ca3af" strokeWidth="0.8"/>
                  <line x1="4" y1="11" x2="8" y2="11" stroke="#9ca3af" strokeWidth="0.8"/>
                </svg>
              </div>
              <div className="trash-anim">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="trash-shake-anim">
                  <g stroke="#dc2626">
                    <path d="M3 6h18" />
                    <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" className="trash-lid-anim" style={{ transformOrigin: '12px 4px' }} />
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </g>
                </svg>
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Eliminando acción...</p>
          </div>
        </div>
      )}

      {planificacionModal && (
        <PlanificacionModalComponent
          accion={planificacionModal.accion}
          onConfirm={handlePlanificacionConfirm}
          onCancel={handlePlanificacionCancel}
        />
      )}

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-2 underline"
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
};

export default KanbanBacklog;
