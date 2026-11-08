import { useEffect, useState } from 'react';

/* FASE 3 · Pantallas pequeñas ──────────────────────────────────────────────
   Decisión SOLO por tamaño y orientación de la ventana — sin user-agent ni
   detección táctil — reaccionando a resize y orientationchange.
   Chica = ventana (<1024px) O en orientación vertical (tablet/móvil).
   ───────────────────────────────────────────────────────────────────────── */

const UMBRAL_ANCHO = 1024;

export function esPantallaChica(): boolean {
  if (typeof window === 'undefined') return false;
  const vertical = window.innerHeight > window.innerWidth;
  return window.innerWidth < UMBRAL_ANCHO || vertical;
}

export function usePantallaChica(): boolean {
  const [chica, setChica] = useState<boolean>(() => esPantallaChica());

  useEffect(() => {
    const recalcular = () => setChica(esPantallaChica());
    recalcular();
    window.addEventListener('resize', recalcular);
    window.addEventListener('orientationchange', recalcular);
    return () => {
      window.removeEventListener('resize', recalcular);
      window.removeEventListener('orientationchange', recalcular);
    };
  }, []);

  return chica;
}
