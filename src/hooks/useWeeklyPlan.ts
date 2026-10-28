import { useState, useCallback, useEffect, useMemo } from 'react';
import { api } from '../services/api';

export interface WeeklyGoal {
  id: string;
  user: number;
  año: number;
  semana: number;
  titulo: string;
  descripcion: string;
  completado: boolean;
  creado: string;
  accion_origen: string | null;
}

export interface WeeklyPlan {
  goals: WeeklyGoal[];
  currentAño: number;
  currentSemana: number;
}

interface UseWeeklyPlanReturn {
  plan: WeeklyPlan | null;
  loading: boolean;
  error: string | null;
  isSaving: boolean;
  saveError: string | null;
  saveSuccess: boolean;
  goals: WeeklyGoal[];
  currentAño: number;
  currentSemana: number;
  setCurrentWeek: (año: number, semana: number) => void;
  addGoal: (goal: Omit<WeeklyGoal, 'id' | 'creado' | 'user'>) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
  updateGoal: (id: string, data: Partial<WeeklyGoal>) => Promise<void>;
  toggleComplete: (goal: WeeklyGoal) => Promise<void>;
  savePlan: () => Promise<boolean>;
  refetch: () => void;
}

export function useWeeklyPlan(): UseWeeklyPlanReturn {
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchGoals = useCallback(async (año: number, semana: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/api/objetivos-semanales/?año=${año}&semana=${semana}`);
      const data = response.data || [];
      setPlan({ goals: data, currentAño: año, currentSemana: semana });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar metas semanales');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const hoy = new Date();
    const isoYear = hoy.getFullYear();
    const isoWeek = getISOWeek(hoy);
    fetchGoals(isoYear, isoWeek);
  }, [fetchGoals]);

  const goals = useMemo(() => plan?.goals || [], [plan]);

  const currentAño = plan?.currentAño || new Date().getFullYear();
  const currentSemana = plan?.currentSemana || getISOWeek(new Date());

  const setCurrentWeek = useCallback((año: number, semana: number) => {
    fetchGoals(año, semana);
  }, [fetchGoals]);

  const addGoal = useCallback(async (goal: Omit<WeeklyGoal, 'id' | 'creado' | 'user' | 'accion_origen'>) => {
    if (!plan) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const response = await api.post('/api/objetivos-semanales/', goal);
      setPlan(prev => prev ? { ...prev, goals: [...prev.goals, response.data] } : null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.response?.data?.detail || 'Error al crear meta');
    } finally {
      setIsSaving(false);
    }
  }, [plan]);

  const removeGoal = useCallback(async (id: string) => {
    setIsSaving(true);
    try {
      await api.delete(`/api/objetivos-semanales/${id}/`);
      setPlan(prev => prev ? { ...prev, goals: prev.goals.filter(g => g.id !== id) } : null);
    } catch (err: any) {
      setSaveError(err.response?.data?.detail || 'Error al eliminar meta');
    } finally {
      setIsSaving(false);
    }
  }, []);

  const updateGoal = useCallback(async (id: string, data: Partial<WeeklyGoal>) => {
    try {
      await api.patch(`/api/objetivos-semanales/${id}/`, data);
      setPlan(prev => prev ? {
        ...prev,
        goals: prev.goals.map(g => g.id === id ? { ...g, ...data } : g)
      } : null);
    } catch (err: any) {
      setSaveError(err.response?.data?.detail || 'Error al actualizar meta');
    }
  }, []);

  const toggleComplete = useCallback((goal: WeeklyGoal) => {
    return updateGoal(goal.id, { completado: !goal.completado });
  }, [updateGoal]);

  const savePlan = useCallback(async (): Promise<boolean> => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    return true;
  }, []);

  const refetch = useCallback(() => {
    if (plan) fetchGoals(plan.currentAño, plan.currentSemana);
  }, [plan, fetchGoals]);

  return {
    plan,
    loading,
    error,
    isSaving,
    saveError,
    saveSuccess,
    goals,
    currentAño,
    currentSemana,
    setCurrentWeek,
    addGoal,
    removeGoal,
    updateGoal,
    toggleComplete,
    savePlan,
    refetch,
  };
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}