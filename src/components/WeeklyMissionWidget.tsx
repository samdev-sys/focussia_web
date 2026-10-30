import React, { useEffect, useState, useCallback, useRef } from 'react';
import { weeklyPlanService } from '../services/api';

/* ──────────────────────────────────────────────────────────────────────────
   Doc 11 · Widget MI MISIÓN DE ESTA SEMANA
   Vista permanente, sólo informativa y motivacional, de la Misión Semanal
   definida en el módulo SEMANAL. No edita, no crea, no modifica y no
   permite interactuar con el contenido.
   ────────────────────────────────────────────────────────────────────────── */

const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 18;

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
  useEffect(() => {
    const canvas = hexCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let w = 0, h = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      w = parent.offsetWidth;
      h = parent.offsetHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const hexR = 10;
    const hexH = hexR * Math.sqrt(3);
    const rowH = hexH;
    const colW = hexR * 1.5;
    const cols = Math.ceil(w / colW) + 2;
    const rows = Math.ceil(h / rowH) + 2;

    type Edge = { x1: number; y1: number; x2: number; y2: number };
    const edges: Edge[] = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cx = col * colW + (row % 2 === 0 ? 0 : colW * 0.5);
        const cy = row * rowH;
        if (cx < -hexR || cx > w + hexR || cy < -hexR || cy > h + hexR) continue;
        for (let i = 0; i < 6; i++) {
          const a1 = (Math.PI / 3) * i - Math.PI / 6;
          const a2 = (Math.PI / 3) * (i + 1) - Math.PI / 6;
          edges.push({
            x1: cx + hexR * Math.cos(a1),
            y1: cy + hexR * Math.sin(a1),
            x2: cx + hexR * Math.cos(a2),
            y2: cy + hexR * Math.sin(a2),
          });
        }
      }
    }

    const EDGE_COLORS = ['#ff00ff', '#9900ff', '#ff6600', '#00ffff', '#39ff14'];
    type Snake = {
      edgeIdx: number;
      t: number;
      speed: number;
      color: string;
      dir: number;
    };
    const snakes: Snake[] = [];
    for (let i = 0; i < 5; i++) {
      snakes.push({
        edgeIdx: Math.floor(Math.random() * edges.length),
        t: Math.random(),
        speed: 0.004 + Math.random() * 0.006,
        color: EDGE_COLORS[i % EDGE_COLORS.length],
        dir: Math.random() > 0.5 ? 1 : -1,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 0.5;
      for (const edge of edges) {
        ctx.beginPath();
        ctx.moveTo(edge.x1, edge.y1);
        ctx.lineTo(edge.x2, edge.y2);
        ctx.stroke();
      }

      const speedMul = hexHoverRef.current ? 2.5 : 1;

      for (const snake of snakes) {
        if (edges.length === 0) continue;
        const edge = edges[snake.edgeIdx];
        const t = snake.t;
        const headX = edge.x1 + (edge.x2 - edge.x1) * t;
        const headY = edge.y1 + (edge.y2 - edge.y1) * t;

        const trailLen = 0.25;
        const tailT = Math.max(0, t - trailLen);
        const tailX = edge.x1 + (edge.x2 - edge.x1) * tailT;
        const tailY = edge.y1 + (edge.y2 - edge.y1) * tailT;

        const grad = ctx.createLinearGradient(tailX, tailY, headX, headY);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(0.3, snake.color + '33');
        grad.addColorStop(0.7, snake.color + '99');
        grad.addColorStop(1, snake.color);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(headX, headY);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(headX, headY, 3, 0, Math.PI * 2);
        ctx.fillStyle = snake.color;
        ctx.fill();
        ctx.restore();

        snake.t += snake.speed * speedMul * snake.dir;
        if (snake.t > 1 + trailLen) {
          snake.edgeIdx = (snake.edgeIdx + 1 + Math.floor(Math.random() * 5)) % edges.length;
          snake.t = 0;
          snake.dir = Math.random() > 0.5 ? 1 : -1;
        } else if (snake.t < -trailLen) {
          snake.edgeIdx = (snake.edgeIdx + 1 + Math.floor(Math.random() * 5)) % edges.length;
          snake.t = 1;
          snake.dir = Math.random() > 0.5 ? 1 : -1;
        }
      }
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-[170px]"
      onMouseEnter={() => { hexHoverRef.current = true; }}
      onMouseLeave={() => { hexHoverRef.current = false; }}
    >
      <div className="relative rounded-md overflow-hidden -mt-78 ml-10 w-[170px]">
        <canvas
          ref={hexCanvasRef}
          className="absolute -inset-6 rounded-md pointer-events-none z-0"
        />
        <div className="relative pointer-events-none select-none bg-white rounded-md overflow-hidden">
          {/* Título del widget (Doc 11: "MI MISIÓN DE ESTA SEMANA") */}
          <div className="bg-[#1e2540] text-white text-center py-2 font-bold text-[10px] uppercase tracking-wider rounded-md flex items-center justify-center gap-1.5">
            MI MISIÓN DE ESTA SEMANA
          </div>

          <div className="bg-gradient-to-br from-[#ff7c90] to-[#ffe1a4] h-[180px] relative flex flex-col items-center px-2 py-3 overflow-hidden mt-2 rounded-md">
            {/* Fotografía de perfil del usuario (Doc 11: imagen de perfil del onboarding) */}
            {loading ? (
              <div className="flex items-center justify-center h-full w-full py-8">
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
                <div className="relative w-[50px] h-[50px] flex-shrink-0 mt-2">
                  <div className="w-full h-full rounded-full overflow-hidden border-2 border-white shadow-md">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt="Perfil usuario"
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
    </div>
  );
}
