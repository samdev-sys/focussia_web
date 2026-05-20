import React, { useState, useEffect, useMemo } from 'react';
import { 
  Loader2, MoreVertical, Calendar, Zap, Plus, X, Check, Clock, GripVertical
} from 'lucide-react';
import { kanbanService, KanbanTaskData } from '../services/api';
import {
  DndContext, DragOverlay, useSensor, useSensors, PointerSensor,
  useDroppable, closestCorners, DragEndEvent, DragStartEvent
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface KanbanBoardProps {
  refreshTrigger?: number;
  onTaskChange?: () => void;
}

const COLUMN_BACKLOG = 'backlog';
const COLUMN_DELEGAR = 'delegar';

const columnConfig: Record<string, { title: string; color: string }> = {
  [COLUMN_BACKLOG]: { title: 'Backlog', color: 'from-[#1e3a5f]/10 to-[#2d4a6f]/5' },
  [COLUMN_DELEGAR]: { title: 'Delegar', color: 'from-emerald-500/10 to-teal-500/5' },
};

function SortableTaskCard({
  task,
  onDelete,
  onDelegate,
  onPlan,
  activeDropdownId,
  setActiveDropdownId,
  planningId,
  setPlanningId,
  planDate,
  setPlanDate,
  handlePlanificar,
}: {
  task: KanbanTaskData;
  onDelete: (id: number) => void;
  onDelegate: (id: number) => void;
  onPlan: (id: number) => void;
  activeDropdownId: number | null;
  setActiveDropdownId: (id: number | null) => void;
  planningId: number | null;
  setPlanningId: (id: number | null) => void;
  planDate: string;
  setPlanDate: (d: string) => void;
  handlePlanificar: (id: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { column: task.columna } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative bg-white/70 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/60 hover:shadow-md transition-all duration-300 ${isDragging ? 'shadow-lg ring-2 ring-[#1e3a5f]/30' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-[#1e3a5f] transition-colors touch-none p-0.5 -ml-1"
            >
              <GripVertical className="w-4 h-4" />
            </button>
            <h4 className="text-sm font-bold text-gray-800 break-words">{task.titulo}</h4>
          </div>
          {task.descripcion && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2 ml-7">{task.descripcion}</p>
          )}
          {task.fecha_hora && (
            <div className="flex items-center gap-1.5 mt-2 bg-indigo-50 text-indigo-700 w-fit px-2 py-0.5 rounded-full border border-indigo-100 ml-7">
              <Clock className="w-3 h-3" />
              <span className="text-[10px] font-bold">
                {new Date(task.fecha_hora).toLocaleString('es-ES', { 
                  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
                })}
              </span>
            </div>
          )}
        </div>

        <div className="relative shrink-0">
          <button 
            onClick={() => setActiveDropdownId(activeDropdownId === task.id ? null : task.id)}
            className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-[#1e3a5f] transition-all"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {activeDropdownId === task.id && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setActiveDropdownId(null)}
              />
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-150">
                {task.columna !== 'Delegar' && (
                  <button 
                    onClick={() => onDelegate(task.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all border-b border-gray-50"
                  >
                    Delegar
                  </button>
                )}
                <button 
                  onClick={() => {
                    setPlanningId(task.id);
                    setActiveDropdownId(null);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-all border-b border-gray-50"
                >
                  <Calendar className="w-4 h-4" />
                  Planificar
                </button>
                <button 
                  onClick={() => onDelete(task.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-50 transition-all"
                >
                  <Zap className="w-4 h-4" />
                  ¡Hazlo ya!
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {planningId === task.id && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-3 animate-in slide-in-from-top-2 duration-300">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Programar fecha y hora</label>
          <div className="flex gap-2">
            <input 
              type="datetime-local"
              className="flex-1 bg-indigo-50/50 border border-indigo-100 rounded-xl px-4 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
              value={planDate}
              onChange={(e) => setPlanDate(e.target.value)}
            />
            <div className="flex gap-1">
              <button 
                onClick={() => handlePlanificar(task.id)}
                className="bg-indigo-600 text-white p-2 rounded-xl"
                title="Guardar"
              >
                <Check className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setPlanningId(null)}
                className="bg-gray-100 text-gray-500 p-2 rounded-xl"
                title="Cancelar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ColumnDroppable({
  id,
  title,
  gradient,
  tasks,
  children,
}: {
  id: string;
  title: string;
  gradient: string;
  tasks: KanbanTaskData[];
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { column: id } });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-0 rounded-2xl bg-gradient-to-b ${gradient} p-4 border border-white/40 backdrop-blur-sm transition-all duration-200 ${isOver ? 'ring-2 ring-[#1e3a5f]/40 shadow-lg scale-[1.01]' : ''}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-black uppercase text-gray-600 tracking-[0.15em]">{title}</h4>
        <span className="text-[10px] font-bold text-gray-400 bg-white/50 px-2 py-0.5 rounded-full">{tasks.length}</span>
      </div>
      <div className="space-y-3 min-h-[120px]">
        {children}
      </div>
    </div>
  );
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ refreshTrigger, onTaskChange }) => {

  const [tasks, setTasks] = useState<KanbanTaskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);
  const [planningId, setPlanningId] = useState<number | null>(null);
  const [planDate, setPlanDate] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);
  const [activeTask, setActiveTask] = useState<KanbanTaskData | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const backlogTasks = useMemo(
    () => tasks.filter(t => t.columna === 'Agenda' || t.columna === 'Backlog'),
    [tasks]
  );

  const delegarTasks = useMemo(
    () => tasks.filter(t => t.columna === 'Delegar'),
    [tasks]
  );

  const backlogIds = useMemo(() => backlogTasks.map(t => t.id), [backlogTasks]);
  const delegarIds = useMemo(() => delegarTasks.map(t => t.id), [delegarTasks]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await kanbanService.getAll();
      setTasks(data);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [refreshTrigger]);

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    setSaving(true);
    try {
      const newTask = await kanbanService.create({
        titulo: newTaskTitle,
        descripcion: '',
        columna: 'Backlog'
      });
      setTasks(prev => [...prev, newTask]);
      setNewTaskTitle('');
      setShowAddInput(false);
      onTaskChange?.();
    } catch (err) {
      console.error('Error adding task:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleMoveToDelegar = async (id: number) => {
    setSaving(true);
    setActiveDropdownId(null);
    try {
      await kanbanService.update(id, { columna: 'Delegar' });
      setTasks(prev => prev.map(t => t.id === id ? { ...t, columna: 'Delegar' } : t));
      onTaskChange?.();
    } catch (err) {
      console.error('Error delegating task:', err);
    } finally {
      setSaving(false);
    }
  };

  const handlePlanificar = async (id: number) => {
    if (!planDate) return;
    setSaving(true);
    try {
      await kanbanService.update(id, { fecha_hora: planDate });
      setTasks(prev => prev.map(t => t.id === id ? { ...t, fecha_hora: planDate } : t));
      setPlanningId(null);
      setPlanDate('');
      onTaskChange?.();
    } catch (err) {
      console.error('Error planning task:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setSaving(true);
    setActiveDropdownId(null);
    try {
      await kanbanService.delete(id);
      setTasks(prev => prev.filter(t => t.id !== id));
      onTaskChange?.();
    } catch (err) {
      console.error('Error deleting task:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = Number(event.active.id);
    const task = tasks.find(t => t.id === taskId);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = Number(active.id);
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    let targetColumn: string;
    if (over.id === COLUMN_BACKLOG) {
      targetColumn = 'Backlog';
    } else if (over.id === COLUMN_DELEGAR) {
      targetColumn = 'Delegar';
    } else {
      const overTask = tasks.find(t => t.id === Number(over.id));
      if (!overTask) return;
      targetColumn = overTask.columna === 'Delegar' ? 'Delegar' : 'Backlog';
    }

    const sourceCol = task.columna === 'Delegar' ? 'Delegar' : 'Backlog';
    const destCol = targetColumn === 'Delegar' ? 'Delegar' : 'Backlog';

    if (sourceCol === destCol) return;

    setSaving(true);
    try {
      await kanbanService.update(taskId, { columna: destCol });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, columna: destCol } : t));
      onTaskChange?.();
    } catch (err) {
      console.error('Error moving task:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-[#1e3a5f] uppercase tracking-wider">Kanban</h3>
        <button 
          onClick={() => setShowAddInput(!showAddInput)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e3a5f] text-white rounded-xl text-xs font-bold hover:bg-[#2d4a6f] transition-all shadow-md"
        >
          {showAddInput ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showAddInput ? 'Cancelar' : 'Nueva Tarea'}
        </button>
      </div>

      {showAddInput && (
        <div className="flex gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <input 
            type="text"
            className="flex-1 bg-white/50 border border-[#1e3a5f]/20 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/40"
            placeholder="¿Qué tienes pendiente?"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
            autoFocus
          />
          <button 
            onClick={handleAddTask}
            disabled={saving}
            className="bg-[#0d9488] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#0f766e] transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Añadir'}
          </button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4">
          <ColumnDroppable
            id={COLUMN_BACKLOG}
            title="Backlog"
            gradient={columnConfig[COLUMN_BACKLOG].color}
            tasks={backlogTasks}
          >
            <SortableContext items={backlogIds} strategy={verticalListSortingStrategy}>
              {backlogTasks.length === 0 ? (
                <div className="bg-white/20 rounded-xl p-6 border border-dashed border-[#1e3a5f]/20 flex flex-col items-center justify-center gap-2 text-gray-400">
                  <Check className="w-6 h-6 opacity-30" />
                  <p className="text-[10px] italic uppercase tracking-widest font-medium">Sin pendientes</p>
                </div>
              ) : (
                backlogTasks.map(task => (
                  <SortableTaskCard
                    key={task.id}
                    task={task}
                    onDelete={handleDelete}
                    onDelegate={handleMoveToDelegar}
                    onPlan={handlePlanificar}
                    activeDropdownId={activeDropdownId}
                    setActiveDropdownId={setActiveDropdownId}
                    planningId={planningId}
                    setPlanningId={setPlanningId}
                    planDate={planDate}
                    setPlanDate={setPlanDate}
                    handlePlanificar={handlePlanificar}
                  />
                ))
              )}
            </SortableContext>
          </ColumnDroppable>

          <ColumnDroppable
            id={COLUMN_DELEGAR}
            title="Delegar"
            gradient={columnConfig[COLUMN_DELEGAR].color}
            tasks={delegarTasks}
          >
            <SortableContext items={delegarIds} strategy={verticalListSortingStrategy}>
              {delegarTasks.length === 0 ? (
                <div className="bg-white/20 rounded-xl p-6 border border-dashed border-[#1e3a5f]/20 flex flex-col items-center justify-center gap-2 text-gray-400">
                  <ArrowRightIcon className="w-6 h-6 opacity-30" />
                  <p className="text-[10px] italic uppercase tracking-widest font-medium">Sin delegaciones</p>
                </div>
              ) : (
                delegarTasks.map(task => (
                  <SortableTaskCard
                    key={task.id}
                    task={task}
                    onDelete={handleDelete}
                    onDelegate={handleMoveToDelegar}
                    onPlan={handlePlanificar}
                    activeDropdownId={activeDropdownId}
                    setActiveDropdownId={setActiveDropdownId}
                    planningId={planningId}
                    setPlanningId={setPlanningId}
                    planDate={planDate}
                    setPlanDate={setPlanDate}
                    handlePlanificar={handlePlanificar}
                  />
                ))
              )}
            </SortableContext>
          </ColumnDroppable>
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-[#1e3a5f]/30 rotate-2 scale-105">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-[#1e3a5f]/40" />
                <h4 className="text-sm font-bold text-gray-800">{activeTask.titulo}</h4>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {saving && (
        <div className="fixed bottom-8 right-8 bg-[#1e3a5f] text-white px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce z-50">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Sincronizando...</span>
        </div>
      )}
    </div>
  );
};

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export default KanbanBoard;
