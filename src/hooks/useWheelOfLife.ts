import { useState, useCallback, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import type { WheelOfLife, WheelCategoryKey, WHEEL_CATEGORIES, CATEGORY_COLORS } from '../types/focusia';

export interface WheelScores {
  trabajo: number;
  dinero: number;
  salud: number;
  pareja: number;
  familia: number;
  espiritualidad: number;
  diversion: number;
  entorno: number;
  desarrollo: number;
  contribucion: number;
}

export interface WheelDiagnostic {
  promedio_general: number;
  nivel_equilibrio: 'CRITICO' | 'BAJO' | 'MEDIO' | 'BUENO' | 'EXCELENTE';
  pico_alto: string;
  pico_bajo: string;
  foco_1: string;
  foco_2: string;
  foco_3: string;
  justificacion_focos: string;
}

export interface SuggestedAction {
  id: number;
  area_foco: string;
  texto: string;
  enviada_kanban: boolean;
}

interface UseWheelOfLifeReturn {
  scores: WheelScores;
  loading: boolean;
  error: string | null;
  diagnostic: WheelDiagnostic | null;
  suggestedActions: SuggestedAction[];
  isSaving: boolean;
  saveError: string | null;
  saveSuccess: boolean;
  updateScore: (category: WheelCategoryKey, value: number) => void;
  saveScores: () => Promise<boolean>;
  fetchDiagnostic: () => Promise<void>;
  fetchSuggestedActions: () => Promise<void>;
  sendActionToKanban: (actionId: number) => Promise<boolean>;
  resetScores: () => void;
  averageScore: number;
  focusAreas: string[];
  setFocusAreas: React.Dispatch<React.SetStateAction<string[]>>;
}

const INITIAL_SCORES: WheelScores = {
  trabajo: 0,
  dinero: 0,
  salud: 0,
  pareja: 0,
  familia: 0,
  espiritualidad: 0,
  diversion: 0,
  entorno: 0,
  desarrollo: 0,
  contribucion: 0,
};

const WHEEL_CATEGORY_KEYS: WheelCategoryKey[] = [
  'trabajo', 'dinero', 'salud', 'pareja', 'familia',
  'espiritualidad', 'diversion', 'entorno', 'desarrollo', 'contribucion'
];

export function useWheelOfLife(): UseWheelOfLifeReturn {
  const [scores, setScores] = useState<WheelScores>(INITIAL_SCORES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<WheelDiagnostic | null>(null);
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [focusAreas, setFocusAreas] = useState<string[]>([]);

  const fetchScores = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/rueda-vida-completa/');
      const data = response.data;
      
      if (data?.registros) {
        const newScores = { ...INITIAL_SCORES };
        data.registros.forEach((r: any) => {
          if (WHEEL_CATEGORY_KEYS.includes(r.categoria)) {
            newScores[r.categoria] = r.puntaje;
          }
        });
        setScores(newScores);
      }
      if (data?.focos) {
        setFocusAreas(data.focos);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar la rueda');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDiagnostic = useCallback(async () => {
    try {
      const response = await api.get('/api/rueda/diagnostico/');
      setDiagnostic(response.data);
    } catch (err: any) {
      console.error('Error fetching diagnostic:', err);
    }
  }, []);

  const fetchSuggestedActions = useCallback(async () => {
    try {
      const response = await api.get('/api/rueda/acciones-sugeridas/');
      setSuggestedActions(response.data || []);
    } catch (err: any) {
      console.error('Error fetching suggested actions:', err);
    }
  }, []);

  useEffect(() => {
    fetchScores();
    fetchDiagnostic();
    fetchSuggestedActions();
  }, [fetchScores, fetchDiagnostic, fetchSuggestedActions]);

  const updateScore = useCallback((category: WheelCategoryKey, value: number) => {
    setScores(prev => ({ ...prev, [category]: Math.max(0, Math.min(10, value)) }));
    setSaveError(null);
    setSaveSuccess(false);
  }, []);

  const saveScores = useCallback(async (): Promise<boolean> => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const registros = WHEEL_CATEGORY_KEYS.map(cat => ({
        categoria: cat,
        puntaje: scores[cat],
      }));

      await api.post('/api/rueda-vida-completa/', { 
        registros,
        focos: focusAreas,
      });
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      return true;
    } catch (err: any) {
      setSaveError(err.response?.data?.detail || 'Error al guardar');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [scores, focusAreas]);

  const sendActionToKanban = useCallback(async (actionId: number): Promise<boolean> => {
    try {
      await api.post(`/api/rueda/enviar-accion-kanban/`, { accion_id: actionId });
      setSuggestedActions(prev => 
        prev.map(a => a.id === actionId ? { ...a, enviada_kanban: true } : a)
      );
      return true;
    } catch (err: any) {
      console.error('Error sending to Kanban:', err);
      return false;
    }
  }, []);

  const resetScores = useCallback(() => {
    setScores(INITIAL_SCORES);
    setFocusAreas([]);
    setSaveError(null);
    setSaveSuccess(false);
  }, []);

  const averageScore = useMemo(() => {
    const values = Object.values(scores).filter(v => v > 0);
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }, [scores]);

  return {
    scores,
    loading,
    error,
    diagnostic,
    suggestedActions,
    isSaving,
    saveError,
    saveSuccess,
    updateScore,
    saveScores,
    fetchDiagnostic,
    fetchSuggestedActions,
    sendActionToKanban,
    resetScores,
    averageScore,
    focusAreas,
    setFocusAreas,
  };
}