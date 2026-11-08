import React from 'react';
import { Smartphone, RotateCcw } from 'lucide-react';
import { usePantallaChica } from '../hooks/usePantallaChica';

/* FASE 3 · Pantallas pequeñas ──────────────────────────────────────────────
   MOBILE_MODE:
   - 'rotate' (por defecto): con la ventana chica (ancho < 1024) u orientación
     vertical se muestra a pantalla completa el logo y el mensaje
     "Gira tu dispositivo para ver tu dashboard" (con icono); al volver a
     horizontal se muestra la vista normal.
   - 'mobile': OPCIÓN PREPARADA, SIN IMPLEMENTAR. Cuando exista una vista
     móvil específica se activa cambiando la constante, y esa vista se
     renderizará en la rama marcada más abajo (hoy cae a la vista normal).

   La decisión se toma SOLO por tamaño y orientación de la ventana — nunca
   por user-agent — y reacciona a resize y orientationchange
   (ver src/hooks/usePantallaChica.ts).
   ───────────────────────────────────────────────────────────────────────── */

const MOBILE_MODE: 'rotate' | 'mobile' = 'rotate';

export default function MobileOrientationPrompt({ children }: { children: React.ReactNode }) {
  const pantallaChica = usePantallaChica();

  if (!pantallaChica) {
    return <>{children}</>;
  }

  if (MOBILE_MODE === 'rotate') {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-[#1a0a2e] via-[#16213e] to-[#0f3460] flex items-center justify-center">
        <div className="text-center px-8 animate-fade-in">
          <img
            src="/focussia.png"
            alt="Focusia"
            className="h-24 w-24 mx-auto mb-6 object-contain"
          />
          <div className="mb-4 flex items-center justify-center gap-3">
            <Smartphone className="w-10 h-10 text-purple-300" />
            <div className="animate-rotate-phone">
              <RotateCcw className="w-8 h-8 text-purple-300" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">
            Gira tu dispositivo para ver tu dashboard
          </h2>
        </div>
        <style>{`
          @keyframes rotate-phone {
            0%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(90deg); }
            50% { transform: rotate(0deg); }
            75% { transform: rotate(-90deg); }
          }
          .animate-rotate-phone {
            animation: rotate-phone 2s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  // MOBILE_MODE === 'mobile': rama preparada, sin implementar. Aquí se
  // renderizará la vista móvil específica cuando se construya.
  // (Por ahora, con pantalla chica y modo 'mobile', se cae a la vista normal).
  return <>{children}</>;
}
