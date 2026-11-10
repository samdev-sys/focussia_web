import i18n from '../i18n';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { weeklyPlanService } from '../services/api';

/* ──────────────────────────────────────────────────────────────────────────
   Doc 11 · Widget MI MISIÓN DE ESTA SEMANA
   Vista permanente, sólo informativa y motivacional, de la Misión Semanal
   definida en el módulo SEMANAL. No edita, no crea, no modifica y no
   permite interactuar con el contenido.
   ────────────────────────────────────────────────────────────────────────── */

const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 15;

function smartFontSize(text: string, containerWidth: number): number {
  let size = MAX_FONT_SIZE;
  while (size >= MIN_FONT_SIZE) {
    const estWidth = text.length * size * 0.52;
    const lines = Math.ceil(estWidth / (containerWidth - 20));
    if (lines <= 2) return size;
    size--;
  }
  return MIN_FONT_SIZE;
}

export default function WeeklyMissionWidget({
  photoUrl,
}: {
  photoUrl?: string;
}): React.ReactElement {
  const [missionText, setMissionText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const hexCanvasRef = useRef<HTMLCanvasElement>(null);
  const hexHoverRef = useRef(false);
  const [fontSize, setFontSize] = useState(MAX_FONT_SIZE);

  /* ── Evento: LoadWeeklyMission ── */
  const loadMission = useCallback(async () => {
    setLoading(true);
    try {
      window.dispatchEvent(new CustomEvent('LoadWeeklyMission'));

      const { plan } = await weeklyPlanService.getCurrentWeek();
      const text = plan.weekly_mission || '';
      setMissionText(text);

      /* ── Evento: BuildMissionWidget ── */
      window.dispatchEvent(new CustomEvent('BuildMissionWidget'));
    } catch {
      setMissionText(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMission(); }, [loadMission]);

  /* ── Evento: RefreshMissionWidget ── */
  useEffect(() => {
    const handler = () => { loadMission(); };
    window.addEventListener('RefreshMissionWidget', handler);
    return () => window.removeEventListener('RefreshMissionWidget', handler);
  }, [loadMission]);

  /* ── Evento: LoadUserProfilePhoto ── */
  useEffect(() => {
    if (photoUrl) {
      window.dispatchEvent(new CustomEvent('LoadUserProfilePhoto', {
        detail: { photoUrl },
      }));
    }
  }, [photoUrl]);

  /* ── Evento: RemovePhotoBackground ──
     En producción aquí se integraría un servicio de eliminación de fondo
     para conservar únicamente la silueta del usuario. Por ahora se
     dispara el evento para que la capa de proceso de imagen lo capture. ── */
  useEffect(() => {
    if (photoUrl) {
      window.dispatchEvent(new CustomEvent('RemovePhotoBackground', {
        detail: { photoUrl },
      }));
    }
  }, [photoUrl]);

  /* ── Ajuste de tamaño de fuente según ancho del contenedor ── */
  useEffect(() => {
    if (!containerRef.current) return;
    const w = containerRef.current.offsetWidth;
    setFontSize(smartFontSize(missionText || '', w));
  }, [missionText]);

  /* ── Fondo gráfico del Dashboard (canvas de hexágonos) ── */
  

  return (
      <div className="relative rounded-md overflow-hidden w-40 h-50 ml-3">
        <canvas
          ref={hexCanvasRef}
          className="absolute -inset-6 rounded-md pointer-events-none z-0"
        />
        <div className="relative pointer-events-none select-none bg-white dark:bg-transparent rounded-md overflow-hidden">
          {/* Título del widget (Doc 11: "MI MISIÓN DE ESTA SEMANA") */}
          <div className="bg-[#1e2540] dark:bg-[#070309] dark:border dark:border-white/10 text-white dark:text-[#fdba74] text-center py-1 font-bold text-[10px] uppercase tracking-wider rounded-md flex items-center justify-center gap-1.5">
            MI MISIÓN DE ESTA SEMANA
          </div>

          <div className="bg-gradient-to-br from-[#ff7c90] to-[#ffe1a4] dark:from-[#f472b6] dark:via-[#fb923c] dark:to-[#fde68a] dark:border dark:border-pink-400/50 h-[120px] relative flex flex-col items-center px-2 py-3 overflow-hidden mt-2 rounded-md">
            {/* Fotografía de perfil del usuario (Doc 11: imagen de perfil del onboarding) */}
            {loading ? (
              <div className="flex items-center justify-center h-40 w-40 py-2">
                <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <div
                  className="text-center font-bold text-slate-800 italic leading-tight mt-1"
                  style={{ fontSize: `${fontSize}px` }}
                >
                  &ldquo;{missionText || 'Sin misión semanal definida'}&rdquo;
                </div>

                {/* Silueta del usuario: foto de perfil en contenedor circular (Doc 11: conservar silueta) */}
                <div className="relative w-[40px] h-[40px] flex-shrink-0 mt-2">
                  <div className="w-full h-full rounded-full overflow-hidden border-2 border-white shadow-md">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={i18n.t('perfil_usuario')}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400 text-xs font-bold rounded-full">
                        U
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    
  );
}
