import { useState, useEffect, useCallback, useRef } from 'react';
import { recordatorioService, RecordatorioData } from '../services/api';

const POLL_INTERVAL = 30000;

export function useReminderToasts() {
  const [activeReminder, setActiveReminder] = useState<RecordatorioData | null>(null);
  const shownRef = useRef<Set<number>>(new Set());

  const dismissReminder = useCallback(() => {
    setActiveReminder(null);
  }, []);

  const markAsTaken = useCallback(async (id: number) => {
    try {
      await recordatorioService.marcarTomado(id);
      shownRef.current.add(id);
      setActiveReminder(null);
    } catch (err) {
      console.error('Error marking reminder as taken:', err);
    }
  }, []);

  useEffect(() => {
    const check = async () => {
      try {
        const due = await recordatorioService.getDue();
        const unseen = due.filter(r => !shownRef.current.has(r.id));
        if (unseen.length > 0) {
          const next = unseen[0];
          setActiveReminder(next);
          shownRef.current.add(next.id);
        }
      } catch {
        // Silently ignore polling errors
      }
    };

    check();
    const interval = setInterval(check, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return {
    activeReminder,
    dismissReminder,
    markAsTaken,
  };
}
