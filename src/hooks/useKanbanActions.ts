import { useState, useCallback, useEffect } from 'react';
import { api } from '../services/api';
import type { KanbanAction, ClassificationStatus, ActionSource } from '../types/focusia';

interface UseKanbanActionsReturn {
  actions: KanbanAction[];
  loading: boolean;
  error: string | null;
  isClassifying: string | null;
  addAction: (title: string, source?: ActionSource) => Promise<KanbanAction | null>;
  classifyAction: (id: string, status: ClassificationStatus, scheduledDate?: string) => Promise<boolean>;
  deleteAction: (id: string) => Promise<boolean>;
  pinAction: (id: string) => Promise<boolean>;
  fetchActions: () => Promise<void>;
  pendingCount: number;
  actionsByStatus: Record<ClassificationStatus, KanbanAction[]>;
}

export function useKanbanActions(): UseKanbanActionsReturn {
  const [actions, setActions] = useState<KanbanAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClassifying, setIsClassifying] = useState<string | null>(null);

  const fetchActions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/kanban-actions/');
      setActions(response.data || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar acciones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  // Recargar cuando la voz crea acciones (recordatorios con fecha).
  useEffect(() => {
    window.addEventListener('focusia:datos-actualizados', fetchActions);
    return () => window.removeEventListener('focusia:datos-actualizados', fetchActions);
  }, [fetchActions]);

  const addAction = useCallback(async (title: string, source: ActionSource = 'USER_INPUT'): Promise<KanbanAction | null> => {
    try {
      const response = await api.post('/api/kanban-actions/', {
        title: title.trim(),
        source,
      });
      const newAction = response.data;
      setActions(prev => [newAction, ...prev]);
      return newAction;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al crear acción');
      return null;
    }
  }, []);

  const classifyAction = useCallback(async (
    id: string, 
    status: ClassificationStatus, 
    scheduledDate?: string
  ): Promise<boolean> => {
    setIsClassifying(id);
    try {
      const payload: any = { classification_status: status };
      if (status === 'PLANIFICAR' && scheduledDate) {
        payload.scheduled_date = scheduledDate;
      }
      
      await api.patch(`/api/kanban-actions/${id}/classify/`, payload);
      
      setActions(prev => prev.filter(a => a.id !== id));
      return true;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al clasificar');
      return false;
    } finally {
      setIsClassifying(null);
    }
  }, []);

  const deleteAction = useCallback(async (id: string): Promise<boolean> => {
    try {
      await api.delete(`/api/kanban-actions/${id}/`);
      setActions(prev => prev.filter(a => a.id !== id));
      return true;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al eliminar');
      return false;
    }
  }, []);

  const pinAction = useCallback(async (id: string): Promise<boolean> => {
    try {
      await api.post(`/api/kanban-actions/${id}/pin/`);
      setActions(prev => prev.map(a => a.id === id ? { ...a, is_double_clicked_fixed: true } : a));
      return true;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al fijar');
      return false;
    }
  }, []);

  const pendingCount = actions.filter(a => a.classification_status === 'PENDIENTE').length;

  const actionsByStatus = actions.reduce((acc, action) => {
    if (!acc[action.classification_status]) {
      acc[action.classification_status] = [];
    }
    acc[action.classification_status].push(action);
    return acc;
  }, {} as Record<ClassificationStatus, KanbanAction[]>);

  return {
    actions,
    loading,
    error,
    isClassifying,
    addAction,
    classifyAction,
    deleteAction,
    pinAction,
    fetchActions,
    pendingCount,
    actionsByStatus,
  };
}