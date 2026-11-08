import { useEffect, useRef, type ReactNode } from 'react';

/* FASE · Encuadre global RESPONSIVE — generalización del comportamiento del
   dashboard para todas las pantallas de módulo:

   - El screen se renderiza en ancho real de la ventana (contenidos fluidos,
     sin zoom artificial en PCs/MacBooks grandes).
   - Si el contenido es más alto que la ventana, se comprime uniformemente
     (transform scale) hasta que TODO quede visible: el lienzo se ensancha en
     proporción (flujo real al ancho renderizado) de modo que, tras la escala,
     cubre justo el 100% del ancho — nunca quedan bandas laterales.
   - Si entra en el alto, escala 1 y el alto del lienzo estira los hijos
     (min-h-full) para cubrir la ventana completa: sin scroll jamás.
   - Re-mide en resize/orientationchange y cuando el contenido crece
     (datos que cargan), vía ResizeObserver.

   Debe envolver la pantalla DEBAJO de MobileOrientationPrompt.
   Nota: un ancestro con transform ancla los `position:fixed` internos al
   lienzo (misma regla que FASE 1).
   ───────────────────────────────────────────────────────────────────────── */

const ESCALA_MIN = 0.3;

export default function FitGeneral({
  children,
  fondo = '#f2f4f7',
  permitirScroll = false,
}: { children: ReactNode; fondo?: string; permitirScroll?: boolean }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  const medir = () => {
    // Modo scroll (p. ej. Reportes): tamaño natural, sin escala ni compresión;
    // si el contenido es más alto que la ventana, la pantalla scrollea.
    if (permitirScroll) return;
    const outer = outerRef.current;
    const canvas = canvasRef.current;
    const inner = innerRef.current;
    if (!outer || !canvas || !inner) return;
    const vw = outer.clientWidth;
    const vh = outer.clientHeight;
    if (vw < 50 || vh < 50) return;

    // Punto de partida: ancho real, sin escala.
    canvas.style.width = vw + 'px';
    canvas.style.height = vh + 'px';
    canvas.style.transform = 'none';
    // Reflow forzado: leer la altura natural del contenido a este ancho.
    let H = Math.max(inner.scrollHeight, inner.offsetHeight, 1);
    let s = 1;

    if (H > vh) {
      // No entra en el alto: comprimir uniformemente. Al ensanchar el lienzo
      // (vw/s) los contenidos fluidos re-fluyen y cambian de altura → iterar
      // hasta estabilizar (reflow forzado por lectura inmediata).
      for (let i = 0; i < 6; i++) {
        s = Math.max(ESCALA_MIN, Math.min(1, vh / H));
        canvas.style.width = Math.round(vw / s) + 'px';
        const H2 = Math.max(inner.scrollHeight, inner.offsetHeight, 1);
        if (Math.abs(H2 - H) < 1) { H = H2; break; }
        H = H2;
      }
      s = Math.max(ESCALA_MIN, Math.min(1, vh / H));
    }

    // Lienzo final: llenar exactly 100% × 100% de la ventana tras la escala.
    canvas.style.width = Math.round(vw / s) + 'px';
    canvas.style.height = Math.round(vh / s) + 'px';
    canvas.style.transform = `scale(${s})`;
    canvas.style.transformOrigin = 'top left';
  };

  useEffect(() => {
    medir();
    window.addEventListener('resize', medir);
    window.addEventListener('orientationchange', medir);
    const ro = new ResizeObserver(medir);
    if (innerRef.current) ro.observe(innerRef.current);
    // La raíz de la pantalla crece cuando llegan datos o imágenes: su propia
    // caja cambia de tamaño y hay que re-medar.
    const roHijo = new ResizeObserver(medir);
    if (innerRef.current?.firstElementChild) roHijo.observe(innerRef.current.firstElementChild);
    // Crecimiento profundo (gráficos/imágenes anidados): re-chequeo periódico
    // liviano como red de seguridad.
    const t = setInterval(medir, 800);
    return () => {
      window.removeEventListener('resize', medir);
      window.removeEventListener('orientationchange', medir);
      ro.disconnect();
      roHijo.disconnect();
      clearInterval(t);
    };
  }, []);

  if (permitirScroll) {
    // Modo scroll: sin lienzo escalado. El contenido va a su tamaño real, fluye
    // de forma natural (sin forzar alturas con flex) y el contenedor scrollea
    // verticalmente cuando el alto supera la ventana.
    return (
      <div
        className="relative w-full h-[100dvh] overflow-y-auto overflow-x-hidden"
        style={{ background: fondo }}
      >
        <div className="min-h-[100dvh]" style={{ background: fondo }}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div ref={outerRef} className="relative w-full h-[100dvh] overflow-hidden" style={{ background: fondo }}>
      <div
        ref={canvasRef}
        className="absolute left-0 top-0 overflow-hidden flex flex-col"
        style={{ background: fondo, transformOrigin: 'top left' }}
      >
        {/* Envoltorio de altura natural: su crecimiento (datos que cargan)
            dispara el re-ajuste vía ResizeObserver. El flex con base definida
            permite que los hijos se estiren al alto del lienzo (el "100%"
            se resuelve de verdad, sin depender de min-height). */}
        <div ref={innerRef} className="flex flex-col flex-1 min-h-0 [&>*]:flex-1 [&>*]:min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}
