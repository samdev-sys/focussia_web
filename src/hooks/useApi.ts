import { useState, useEffect, useCallback } from 'react';
import { RuedaVidaData, ruedaVidaService } from '../services/api';

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
