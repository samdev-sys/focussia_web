import { useState, useCallback, useMemo } from 'react';

export interface WheelCategory {
  id: string;
  label: string;
  color: string;
  value: number;
}

export interface WheelPayload {
  userId: string;
  timestamp: string;
  scores: Record<string, number>;
}

export interface CompareData {
  label: string;
  scores: Record<string, number>;
}

const DEFAULT_CATEGORIES: Omit<WheelCategory, 'value'>[] = [
  { id: 'salud', label: 'Salud', color: '#ef4444' },
  { id: 'finanzas', label: 'Finanzas', color: '#f97316' },
  { id: 'carrera', label: 'Carrera', color: '#eab308' },
  { id: 'crecimiento', label: 'Crecimiento Personal', color: '#22c55e' },
  { id: 'relaciones', label: 'Relaciones', color: '#06b6d4' },
  { id: 'entorno', label: 'Entorno', color: '#3b82f6' },
  { id: 'ocio', label: 'Ocio', color: '#8b5cf6' },
  { id: 'familia', label: 'Familia', color: '#ec4899' },
];

const INITIAL_VALUES: Record<string, number> = {
  salud: 5,
  finanzas: 5,
  carrera: 5,
  crecimiento: 5,
  relaciones: 5,
  entorno: 5,
  ocio: 5,
  familia: 5,
};

const COMPARE_DATA: CompareData = {
  label: 'Hace un mes',
  scores: {
    salud: 4,
    finanzas: 6,
    carrera: 5,
    crecimiento: 3,
    relaciones: 7,
    entorno: 5,
    ocio: 4,
    familia: 6,
  },
};

export function useWheelData() {
  const [scores, setScores] = useState<Record<string, number>>(INITIAL_VALUES);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  const categories = useMemo<WheelCategory[]>(() => 
    DEFAULT_CATEGORIES.map(cat => ({
      ...cat,
      value: scores[cat.id] ?? 5,
    }))
  , [scores]);

  const compareCategories = useMemo<WheelCategory[]>(() =>
    DEFAULT_CATEGORIES.map(cat => ({
      ...cat,
      value: COMPARE_DATA.scores[cat.id] ?? 5,
    }))
  , []);

  const updateScore = useCallback((id: string, value: number) => {
    setScores(prev => ({ ...prev, [id]: Math.max(1, Math.min(10, value)) }));
    setSaveError(null);
    setSaveSuccess(false);
  }, []);

  const saveProgress = useCallback(async (userId: string) => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const payload: WheelPayload = {
        userId,
        timestamp: new Date().toISOString(),
        scores: { ...scores },
      };

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('API Payload:', payload);
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setSaveError('Error al guardar. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  }, [scores]);

  const resetScores = useCallback(() => {
    setScores(INITIAL_VALUES);
    setSaveError(null);
    setSaveSuccess(false);
  }, []);

  const toggleCompare = useCallback(() => {
    setShowCompare(prev => !prev);
  }, []);

  const averageScore = useMemo(() => 
    Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length
  , [scores]);

  const compareAverage = useMemo(() =>
    Object.values(COMPARE_DATA.scores).reduce((a, b) => a + b, 0) / Object.keys(COMPARE_DATA.scores).length
  , []);

  return {
    categories,
    compareCategories,
    scores,
    updateScore,
    saveProgress,
    resetScores,
    isSaving,
    saveError,
    saveSuccess,
    showCompare,
    toggleCompare,
    averageScore,
    compareAverage,
    compareLabel: COMPARE_DATA.label,
  };
}

export type UseWheelDataReturn = ReturnType<typeof useWheelData>;