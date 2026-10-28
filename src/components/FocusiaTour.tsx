import { useCallback, useEffect, useRef, useState } from 'react';
import { driver, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '../tour/focusia-tour.css';
import { FOCUSIA_TOUR_STEPS, TOUR_AVATAR, type FocusiaTourStep } from '../tour/focusiaTourSteps';
import { inicioService } from '../services/api';

const STORAGE_KEY = 'focusia_tour_seen_v1';
// Flag que deja el hub ("Iniciar visita guiada") para auto-arrancar el tour
// sobre el dashboard real al navegar hacia él.
export const TOUR_AUTOSTART_KEY = 'focusia_autostart_tour';

export function requestTourAutostart() {
  try {
    sessionStorage.setItem(TOUR_AUTOSTART_KEY, '1');
  } catch {
    /* noop */
  }
}

// Mira sin consumir: en dev con StrictMode los efectos se montan dos veces y
// consumir aquí haría que el segundo montaje pierda el arranque.
function peekTourAutostart(): boolean {
  try {
    return sessionStorage.getItem(TOUR_AUTOSTART_KEY) === '1';
  } catch {
    return false;
  }
}

function consumeTourAutostart(): void {
  try {
    sessionStorage.removeItem(TOUR_AUTOSTART_KEY);
  } catch {
    /* noop */
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function elementExists(selector: string): boolean {
  try {
    return !!document.querySelector(selector);
  } catch {
    return false;
  }
}

export function FocusiaTourLauncher({ autoStart = false }: { autoStart?: boolean }) {
  const driverRef = useRef<Driver | null>(null);
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const loggedRef = useRef(false);
  const stepsRef = useRef<FocusiaTourStep[]>(FOCUSIA_TOUR_STEPS);

  const logTourEnd = useCallback((completed: boolean, paso: number) => {
    if (loggedRef.current) return;
    loggedRef.current = true;
    if (completed) {
      inicioService.guidedTourComplete().catch(() => {});
    } else {
      inicioService.guidedTourAbandon({ paso_actual: paso, total_pasos: stepsRef.current.length }).catch(() => {});
    }
  }, []);

  const destroy = useCallback(() => {
    driverRef.current?.destroy();
    driverRef.current = null;
    setActive(false);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* noop */
    }
  }, []);

  const start = useCallback(() => {
    driverRef.current?.destroy();
    loggedRef.current = false;
    // Solo pasos cuyo elemento existe: un ancla ausente no debe tumbar el tour.
    const steps = FOCUSIA_TOUR_STEPS.filter((s) => elementExists(s.element));
    if (steps.length === 0) return;
    stepsRef.current = steps;

    const d = driver({
      showProgress: false,
      showButtons: ['previous', 'next', 'close'],
      // Overlay semitransparente oscuro que oscurece todo excepto el highlight
      overlayColor: 'rgba(18, 24, 52, 0.62)',
      stagePadding: 6,
      stageRadius: 14,
      animate: true,
      smoothScroll: true,
      allowClose: true,
      // Controles < > / Finalizar
      prevBtnText: '‹',
      nextBtnText: '›',
      doneBtnText: 'Finalizar',
      onPrevClick: () => {
        d.movePrevious();
      },
      onNextClick: () => {
        d.moveNext();
      },
      onCloseClick: () => {
        const i = d.getActiveIndex() ?? 0;
        logTourEnd(i >= steps.length - 1, i);
        destroy();
      },
      onDestroyStarted: () => {
        destroy();
      },
      onHighlighted: () => {
        setStepIndex(d.getActiveIndex() ?? 0);
      },
      steps: steps.map((s, i) => ({
        element: s.element,
        popover: {
          // Tarjeta blanca con avatar + título + texto (réplica fotos).
          // El CSS (.focusia-tour-popover) la centra arriba como en las fotos.
          title: `<div class="focusia-tour-card"><img src="${TOUR_AVATAR}" alt="Guía Focusia" /><div><h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.description)}</p><div class="focusia-tour-count">${i + 1} / ${steps.length}</div></div></div>`,
          description: '',
          popoverClass: 'focusia-tour-popover',
        },
      })),
    });

    driverRef.current = d;
    setActive(true);
    setStepIndex(0);
    d.drive();
  }, [destroy, logTourEnd]);

  useEffect(() => {
    if (!autoStart) return;
    // Si el usuario viene del hub ("Iniciar visita guiada"), arrancar siempre.
    const forced = peekTourAutostart();
    if (!forced) {
      try {
        if (localStorage.getItem(STORAGE_KEY)) return;
      } catch {
        /* noop */
      }
    }
    const t = setTimeout(() => {
      consumeTourAutostart();
      start();
    }, 900);
    return () => clearTimeout(t);
  }, [autoStart, start]);

  useEffect(() => () => driverRef.current?.destroy(), []);

  // Avance automático zona por zona (§19.2/§19.4). Cualquier navegación
  // manual reinicia el temporizador al cambiar stepIndex.
  useEffect(() => {
    if (!active || !driverRef.current) return;
    const t = setTimeout(() => {
      const d = driverRef.current;
      if (!d) return;
      const i = d.getActiveIndex() ?? 0;
      if (i >= stepsRef.current.length - 1) {
        logTourEnd(true, i);
        destroy();
      } else {
        d.moveNext();
      }
    }, 9000);
    return () => clearTimeout(t);
  }, [active, stepIndex, destroy, logTourEnd]);

  const goPrev = useCallback(() => {
    if (!driverRef.current) return;
    if (stepIndex <= 0) return;
    driverRef.current.movePrevious();
  }, [stepIndex]);

  const goNext = useCallback(() => {
    if (!driverRef.current) return;
    if (stepIndex >= stepsRef.current.length - 1) {
      logTourEnd(true, stepIndex);
      destroy();
      return;
    }
    driverRef.current.moveNext();
  }, [stepIndex, destroy, logTourEnd]);

  return (
    <>
      <button type="button" className="focusia-tour-launch mt-25 -ml-38 w-40 h-6  rounded rounded-md" onClick={start} title="Iniciar visita guiada">
        <img src="./tour.png" alt="Visita guiada del dashboard" className="w-6 h-6" /><span>visita guiada </span>
      </button>
      {active && (
        <>
          <button type="button" aria-label="Anterior" className="focusia-tour-edge left" onClick={goPrev} disabled={stepIndex <= 0}>
            ‹
          </button>
          <button type="button" aria-label="Siguiente" className="focusia-tour-edge right" onClick={goNext}>
            ›
          </button>
        </>
      )}
    </>
  );
}

export default FocusiaTourLauncher;
