import { useState, useEffect, useCallback } from 'react';
import { RuedaVidaData, ruedaVidaService, timeBlockService } from '../services/api';

interface UseRuedaVidaReturn {
  data: RuedaVidaData | null;
  loading: boolean;
  error: string | null;
  update: (data: Partial<RuedaVidaData>) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useRuedaVida = (): UseRuedaVidaReturn => {
  const [data, setData] = useState<RuedaVidaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await ruedaVidaService.get();
      setData(result);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar datos de la Rueda de la Vida');
      setData({
        id: 1,
        salud: 5,
        amistad: 5,
        dinero: 5,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (newData: Partial<RuedaVidaData>) => {
    if (!data) return;
    const optimisticData = { ...data, ...newData };
    setData(optimisticData);
    
    try {
      const result = await ruedaVidaService.update(newData);
      setData(result);
    } catch (err: any) {
      setData(data);
      throw err;
    }
  }, [data]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, update, refresh };
};

interface TimeBlock {
  id: number;
  hora: number;
  tarea: string;
  estado: boolean;
}

interface UseTimeBlocksReturn {
  timeBlocks: TimeBlock[];
  loading: boolean;
  error: string | null;
  updateBlock: (id: number, data: Partial<TimeBlock>) => Promise<void>;
  isSaving: boolean;
  savingBlockId: number | null;
  refresh: () => Promise<void>;
}

export const useTimeBlocks = (): UseTimeBlocksReturn => {
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savingBlockId, setSavingBlockId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const defaultBlocks: TimeBlock[] = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20, 21, 22, 23].map((hora, index) => ({
        id: index + 1,
        hora,
        tarea: '',
        estado: false,
      }));
      
      try {
        const result = await import('../services/api').then(m => m.timeBlockService.getAll());
        setTimeBlocks(result.length > 0 ? result : defaultBlocks);
      } catch {
        setTimeBlocks(defaultBlocks);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar bloques de tiempo');
      setTimeBlocks([7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20, 21, 22, 23].map((hora, index) => ({
        id: index + 1,
        hora,
        tarea: '',
        estado: false,
      })));
    } finally {
      setLoading(false);
    }
  }, []);

  const updateBlock = useCallback(async (id: number, newData: Partial<TimeBlock>) => {
    setIsSaving(true);
    setSavingBlockId(id);
    
    const originalBlocks = [...timeBlocks];
    const blockIndex = timeBlocks.findIndex(b => b.id === id);
    
    if (blockIndex === -1) {
      setIsSaving(false);
      setSavingBlockId(null);
      return;
    }
    
    const optimisticBlock = { ...timeBlocks[blockIndex], ...newData };
    const optimisticBlocks = [...timeBlocks];
    optimisticBlocks[blockIndex] = optimisticBlock;
    setTimeBlocks(optimisticBlocks);
    
    try {
      const result = await import('../services/api').then(m => m.timeBlockService.update(id, newData));
      const updatedBlocks = [...timeBlocks];
      updatedBlocks[blockIndex] = result;
      setTimeBlocks(updatedBlocks);
    } catch (err: any) {
      setTimeBlocks(originalBlocks);
      throw err;
    } finally {
      setIsSaving(false);
      setSavingBlockId(null);
    }
  }, [timeBlocks]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { timeBlocks, loading, error, updateBlock, isSaving, savingBlockId, refresh };
};
