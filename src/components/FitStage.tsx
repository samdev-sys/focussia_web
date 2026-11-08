import { useEffect, useState, type ReactNode } from 'react';

/* FASE 1 · Lienzo escalable ────────────────────────────────────────────────
   Lienzo de diseño fijo de 1440x900 (16:10) escalado con transform: scale
   para verse completo y proporcional en cualquier pantalla horizontal.

   - Escala = min(anchoVentana/1440, altoVentana/900): el lienzo siempre
     entra completo en la ventana.
   - transformOrigin top left + caja contenedora del tamaño escalado:
     permite centrar el lienzo en la ventana con flex.
   - Recalcula en resize y orientationchange.

   IMPORTANTE: un ancestro con transform rompe position:fixed. Los modales,
   toasts y otros elementos fixed deben renderizarse FUERA de FitStage.
   ───────────────────────────────────────────────────────────────────────── */

const ANCHO_DISENO = 1440;
const ALTO_DISENO = 900;

export default function FitStage({ children }: { children: ReactNode }) {
  const [escala, setEscala] = useState(1);

  useEffect(() => {
    const calcular = () => {
      const ancho = window.innerWidth;
      const alto = window.innerHeight;
      setEscala(Math.min(ancho / ANCHO_DISENO, alto / ALTO_DISENO));
    };
    calcular();
    window.addEventListener('resize', calcular);
    window.addEventListener('orientationchange', calcular);
    return () => {
      window.removeEventListener('resize', calcular);
      window.removeEventListener('orientationchange', calcular);
    };
  }, []);

  return (
    <div className="w-[100vw] h-[100dvh] overflow-hidden flex items-center justify-center">
      {/* Caja del tamaño YA escalado: su esquina superior izquierda coincide
          con la del lienzo, por eso el centrado flex funciona con el scale. */}
      <div
        className="relative shrink-0"
        style={{ width: ANCHO_DISENO * escala, height: ALTO_DISENO * escala }}
      >
        <div
          className="absolute left-0 top-0"
          style={{
            width: ANCHO_DISENO,
            height: ALTO_DISENO,
            transform: `scale(${escala})`,
            transformOrigin: 'top left',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
