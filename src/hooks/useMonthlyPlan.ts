import { useState, useCallback, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { COMPLEXITY_LEVELS } from '../types/focusia';
import type { MonthlyPlan, MonthlyGoal, ComplexityLevel } from '../types/focusia';

interface UseMonthlyPlanReturn {
  plan: MonthlyPlan | null;
  loading: boolean;
  error: string | null;
  isSaving: boolean;
  saveError: string | null;
  saveSuccess: boolean;
  goals: MonthlyGoal[];
  updateGoal: (monthOrder: number, field: keyof MonthlyGoal, value: any) => void;
  addGoal: () => void;
  removeGoal: (monthOrder: number) => void;
  savePlan: () => Promise<boolean>;
  approvePlan: () => Promise<boolean>;
  resetPlan: () => void;
  getComplexityForMonth: (monthOrder: number) => ComplexityLevel;
  currentCycleInfo: { startMonth: number; startYear: number; currentMonthOrder: number } | null;
}

const INITIAL_GOAL: Omit<MonthlyGoal, 'month_order'> = {
  calendar_month: 1,
  calendar_year: new Date().getFullYear(),
  goal_text: '',
  explanation: '',
  relation_to_annual: '',
  complexity_level: 'BASE',
};

export function useMonthlyPlan(): UseMonthlyPlanReturn {
  const [plan, setPlan] = useState<MonthlyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchPlan = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/metas-anuales/');
      const data = response.data;
      
      if (data && data.length > 0) {
        const latestMeta = data[0];
        const monthlyResponse = await api.get(`/api/objetivos-mensuales/?meta_anual=${latestMeta.id}`);
        const monthlyGoals = monthlyResponse.data || [];
        
        setPlan({
          user_id: '',
          cycle_start_month: 1,
          cycle_start_year: new Date().getFullYear(),
          is_approved: latestMeta.aprobada,
          goals: monthlyGoals.map((g: any, index: number) => ({
            month_order: index + 1,
            calendar_month: g.mes,
            calendar_year: new Date().getFullYear(),
            goal_text: g.titulo,
            explanation: g.descripcion,
            relation_to_annual: '',
            complexity_level: COMPLEXITY_LEVELS.find(c => c.months.includes(index + 1))?.value || 'BASE',
          })),
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar plan mensual');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const goals = useMemo(() => plan?.goals || [], [plan]);

  const getComplexityForMonth = useCallback((monthOrder: number): ComplexityLevel => {
    const complexity = COMPLEXITY_LEVELS.find(c => c.months.includes(monthOrder));
    return complexity?.value || 'BASE';
  }, []);

  const updateGoal = useCallback((monthOrder: number, field: keyof MonthlyGoal, value: any) => {
    setPlan(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        goals: prev.goals.map(g => 
          g.month_order === monthOrder ? { ...g, [field]: value } : g
        ),
      };
    });
    setSaveError(null);
    setSaveSuccess(false);
  }, []);

  const addGoal = useCallback(() => {
    setPlan(prev => {
      if (!prev) return prev;
      const nextOrder = prev.goals.length + 1;
      if (nextOrder > 12) return prev;
      
      const newGoal: MonthlyGoal = {
        ...INITIAL_GOAL,
        month_order: nextOrder,
        calendar_month: nextOrder,
        complexity_level: getComplexityForMonth(nextOrder),
      };
      return {
        ...prev,
        goals: [...prev.goals, newGoal],
      };
    });
  }, [getComplexityForMonth]);

  const removeGoal = useCallback((monthOrder: number) => {
    setPlan(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        goals: prev.goals
          .filter(g => g.month_order !== monthOrder)
          .map((g, index) => ({ ...g, month_order: index + 1 })),
      };
    });
  }, []);

  const savePlan = useCallback(async (): Promise<boolean> => {
    if (!plan) return false;
    
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await api.post('/api/metas-anuales/', {
        titulo: 'Meta Anual',
        descripcion: 'Plan mensual generado',
        fecha_inicio: `${plan.cycle_start_year}-${String(plan.cycle_start_month).padStart(2, '0')}-01`,
        fecha_fin: `${plan.cycle_start_year}-${String(plan.cycle_start_month).padStart(2, '0')}-01`,
      });
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      return true;
    } catch (err: any) {
      setSaveError(err.response?.data?.detail || 'Error al guardar plan');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [plan]);

  const approvePlan = useCallback(async (): Promise<boolean> => {
    if (!plan) return false;
    
    setIsSaving(true);
    setSaveError(null);

    try {
      await api.post('/api/objetivo-mensual/aprobar/', { plan });
      setPlan(prev => prev ? { ...prev, is_approved: true } : null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      return true;
    } catch (err: any) {
      setSaveError(err.response?.data?.detail || 'Error al aprobar');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [plan]);

  const resetPlan = useCallback(() => {
    setPlan(null);
    setError(null);
    setSaveError(null);
    setSaveSuccess(false);
  }, []);

  const currentCycleInfo = useMemo(() => {
    if (!plan) return null;
    return {
      startMonth: plan.cycle_start_month,
      startYear: plan.cycle_start_year,
      currentMonthOrder: new Date().getMonth() + 1,
    };
  }, [plan]);

  return {
    plan,
    loading,
    error,
    isSaving,
    saveError,
    saveSuccess,
    goals,
    updateGoal,
    addGoal,
    removeGoal,
    savePlan,
    approvePlan,
    resetPlan,
    getComplexityForMonth,
    currentCycleInfo,
  };
}