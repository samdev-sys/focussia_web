import React, { useState, useEffect } from 'react';
import { 
  Loader2, 
  MoreVertical, 
  ArrowRight, 
  Calendar, 
  Zap, 
  Plus, 
  X, 
  Check, 
  Clock 
} from 'lucide-react';
import { kanbanService, KanbanTaskData } from '../services/api';

interface KanbanBoardProps {
  refreshTrigger?: number;
  onTaskChange?: () => void;
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

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await kanbanService.getAll();
      // Filter for Agenda/Backlog tasks for the main list
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
        columna: 'Agenda'
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

  const agendaTasks = tasks.filter(t => t.columna === 'Agenda' || t.columna === 'Backlog');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header & Add Button */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-[#1e3a5f] uppercase tracking-wider">Mi Agenda de Pendientes</h3>
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

      {/* Agenda List */}
      <div className="space-y-3">
        {agendaTasks.length === 0 ? (
          <div className="bg-white/30 rounded-2xl p-8 border border-dashed border-[#1e3a5f]/30 flex flex-col items-center justify-center gap-2 text-gray-500">
             <Check className="w-8 h-8 opacity-20" />
             <p className="text-xs italic uppercase tracking-widest font-medium">No tienes tareas pendientes</p>
          </div>
        ) : (
          agendaTasks.map(task => (
            <div 
              key={task.id}
              className="group relative bg-white/70 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/60 hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-gray-800 break-words">{task.titulo}</h4>
                  {task.descripcion && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.descripcion}</p>
                  )}
                  {task.fecha_hora && (
                    <div className="flex items-center gap-1.5 mt-2 bg-indigo-50 text-indigo-700 w-fit px-2 py-0.5 rounded-full border border-indigo-100">
                      <Clock className="w-3 h-3" />
                      <span className="text-[10px] font-bold">
                        {new Date(task.fecha_hora).toLocaleString('es-ES', { 
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
                        })}
                      </span>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button 
                    onClick={() => setActiveDropdownId(activeDropdownId === task.id ? null : task.id)}
                    className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-[#1e3a5f] transition-all"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  {/* Dropdown Menu */}
                  {activeDropdownId === task.id && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setActiveDropdownId(null)}
                      />
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-150">
                        <button 
                          onClick={() => handleMoveToDelegar(task.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all border-b border-gray-50"
                        >
                          <ArrowRight className="w-4 h-4" />
                          Delegar
                        </button>
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
                          onClick={() => handleDelete(task.id)}
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

              {/* Planning Input Overlay */}
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
          ))
        )}
      </div>

      {saving && (
        <div className="fixed bottom-8 right-8 bg-[#1e3a5f] text-white px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce z-50">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Sincronizando...</span>
        </div>
      )}
    </div>
  );
};

export default KanbanBoard;
