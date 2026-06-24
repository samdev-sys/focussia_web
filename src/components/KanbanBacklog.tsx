import React, { useState, useEffect, useRef, useCallback } from 'react';
import { kanbanActionService, KanbanActionData } from '../services/api';
import { Plus, X, Calendar, Trash2, Send, Users } from 'lucide-react';

interface KanbanBacklogProps {
  className?: string;
}

const CLASSIFY_BUTTONS = [
  { key: 'H', label: 'Hacer', color: 'bg-emerald-500', hoverColor: 'hover:bg-emerald-600', textColor: 'text-white', icon: Send },
  { key: 'P', label: 'Planificar', color: 'bg-sky-500', hoverColor: 'hover:bg-sky-600', textColor: 'text-white', icon: Calendar },
  { key: 'D', label: 'Delegar', color: 'bg-amber-500', hoverColor: 'hover:bg-amber-600', textColor: 'text-white', icon: Users },
  { key: 'E', label: 'Eliminar', color: 'bg-rose-500', hoverColor: 'hover:bg-rose-600', textColor: 'text-white', icon: Trash2 },
];

export const KanbanBacklog: React.FC<KanbanBacklogProps> = ({ className = '' }) => {
  const [actions, setActions] = useState<KanbanActionData[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [classifyingId, setClassifyingId] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [fadingIds, setFadingIds] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const fetchActions = useCallback(async () => {
    try {
      const data = await kanbanActionService.getActive();
      setActions(data);
    } catch (error) {
      console.error('Error fetching kanban actions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  useEffect(() => {
    if (actions.length > 0 && focusedIndex < actions.length) {
      const focusedId = actions[focusedIndex]?.id;
      if (focusedId) {
        cardRefs.current.get(focusedId)?.focus();
      }
    }
  }, [focusedIndex, actions]);

  const handleAddAction = async () => {
    const title = inputValue.trim();
    if (!title) return;

    try {
      const newAction = await kanbanActionService.add(title);
      setActions((prev) => [newAction, ...prev]);
      setInputValue('');
      setFocusedIndex(0);
    } catch (error) {
      console.error('Error adding action:', error);
    }
  };

  const handleClassify = useCallback(async (id: string, decision: 'H' | 'P' | 'D' | 'E', date?: string) => {
    if (classifyingId) return;

    setClassifyingId(id);
    setFadingIds((prev) => new Set(prev).add(id));

    try {
      await kanbanActionService.classify(id, decision, date);

      setTimeout(() => {
        setActions((prev) => prev.filter((a) => a.id !== id));
        setFadingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setClassifyingId(null);
        setFocusedIndex((prev) => Math.min(prev, actions.length - 2));
      }, 200);
    } catch (error) {
      console.error('Error classifying action:', error);
      setFadingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setClassifyingId(null);
    }
  }, [classifyingId, actions.length]);

  const handleDateConfirm = (id: string) => {
    if (selectedDate) {
      handleClassify(id, 'P', selectedDate);
      setShowDatePicker(null);
      setSelectedDate('');
    }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (showDatePicker || classifyingId) return;

    const focusedId = actions[focusedIndex]?.id;
    if (!focusedId) return;

    const upper = e.key.toUpperCase();
    if (['H', 'P', 'D', 'E'].includes(upper)) {
      e.preventDefault();
      if (upper === 'P') {
        setShowDatePicker(focusedId);
      } else {
        handleClassify(focusedId, upper as 'H' | 'D' | 'E');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => Math.min(prev + 1, actions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => Math.max(prev - 1, 0));
    }
  }, [actions, focusedIndex, showDatePicker, classifyingId, handleClassify]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleCardClick = (index: number) => {
    setFocusedIndex(index);
  };

  const handleCardDoubleClick = async (action: KanbanActionData) => {
    if (action.classification_status === 'PENDIENTE') {
      try {
        const pinned = await kanbanActionService.pin(action.id);
        setActions((prev) => prev.map((a) => (a.id === action.id ? pinned : a)));
      } catch (error) {
        console.error('Error pinning action:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500" />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <h3 className="text-sm font-semibold text-gray-800">Bandeja de Entrada</h3>
          <span className="text-xs text-gray-400 ml-auto">{actions.length} pendientes</span>
        </div>
      </div>

      <div className="p-3 border-b border-gray-50 bg-gray-50/50">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddAction()}
            placeholder="Escribe y presiona Enter para vaciar..."
            className="flex-1 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-gray-400"
          />
          <button
            onClick={handleAddAction}
            disabled={!inputValue.trim()}
            className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {actions.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <div className="text-3xl mb-2">🎯</div>
            <p className="text-sm text-gray-500">Tu bandeja está vacía</p>
            <p className="text-xs text-gray-400 mt-1">Escribe una tarea arriba para empezar</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {actions.map((action, index) => (
              <div
                key={action.id}
                ref={(el) => { if (el) cardRefs.current.set(action.id, el); }}
                tabIndex={0}
                onClick={() => handleCardClick(index)}
                onDoubleClick={() => handleCardDoubleClick(action)}
                className={`
                  group flex items-center gap-3 px-4 py-3 transition-all duration-200 cursor-pointer
                  ${fadingIds.has(action.id) ? 'opacity-0 translate-x-4 scale-95' : 'opacity-100'}
                  ${focusedIndex === index ? 'bg-indigo-50/60' : 'hover:bg-gray-50'}
                `}
              >
                <span className="text-xs text-gray-400 font-mono w-4 shrink-0">
                  {index + 1}
                </span>

                <span className="flex-1 text-sm text-gray-700 leading-relaxed">
                  {action.title}
                </span>

                <div className="flex items-center gap-1 shrink-0">
                  {CLASSIFY_BUTTONS.map(({ key, label, color, hoverColor, textColor, icon: Icon }) => (
                    <button
                      key={key}
                      title={`${label} (${key})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (key === 'P') {
                          setShowDatePicker(action.id);
                        } else {
                          handleClassify(action.id, key as 'H' | 'D' | 'E');
                        }
                      }}
                      disabled={classifyingId === action.id}
                      className={`
                        w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold
                        ${color} ${hoverColor} ${textColor}
                        opacity-0 group-hover:opacity-100 focus:opacity-100
                        disabled:opacity-50 transition-all duration-150
                      `}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showDatePicker && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-4 w-72 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-800">Planificar fecha</h4>
              <button onClick={() => setShowDatePicker(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setShowDatePicker(null)}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDateConfirm(showDatePicker)}
                disabled={!selectedDate}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-sky-500 rounded-lg hover:bg-sky-600 disabled:opacity-40 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-2 border-t border-gray-50 bg-gray-50/30">
        <p className="text-[10px] text-gray-400 text-center">
          Atajos: <span className="font-mono bg-gray-200 px-1 rounded">H</span> Hacer
          <span className="font-mono bg-gray-200 px-1 rounded mx-1">P</span> Planificar
          <span className="font-mono bg-gray-200 px-1 rounded mx-1">D</span> Delegar
          <span className="font-mono bg-gray-200 px-1 rounded mx-1">E</span> Eliminar
          <span className="mx-2">|</span>
          <span className="font-mono bg-gray-200 px-1 rounded">↑↓</span> Navegar
          <span className="mx-2">|</span>
          Doble clic = Fijar
        </p>
      </div>
    </div>
  );
};

export default KanbanBacklog;
