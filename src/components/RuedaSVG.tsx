import React from 'react';
import {
  HeartPulse, Users, Coins, Flower2, Heart, Lightbulb,
  BarChart3, Briefcase, Home, TrendingUp, PartyPopper, HandHeart,
} from 'lucide-react';

export interface RuedaDato {
  id?: number;
  nombre: string;
  puntaje: number;
  icono?: string;
}

const COLOR_NIVEL: { lo: number; hi: number; hex: string }[] = [
  { lo: 1, hi: 2, hex: '#ef4444' },
  { lo: 3, hi: 4, hex: '#f97316' },
  { lo: 5, hi: 6, hex: '#eab308' },
  { lo: 7, hi: 8, hex: '#3b82f6' },
  { lo: 9, hi: 10, hex: '#22c55e' },
];

export function colorNivel(puntaje: number): string {
  for (const n of COLOR_NIVEL) {
    if (n.lo <= puntaje && puntaje <= n.hi) return n.hex;
  }
  return '#eab308';
}

// Paleta exacta de Rueda3.png (referencia visual), por nombre de área
// para que el color no dependa del orden de llegada de los datos.
const PALETA_POR_AREA: Record<string, string> = {
  contribucion: '#d12d7a',
  trabajo: '#7c3aed',
  dinero: '#2563eb',
  salud: '#0ea5e9',
  pareja: '#14b8a6',
  familia: '#10b981',
  espiritualidad: '#84cc16',
  diversion: '#facc15',
  entorno: '#fb923c',
  desarrollo: '#f43f5e',
};

function areaKeyCorta(nombre: string): string {
  return (nombre || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(' ')[0];
}

// Paleta fija como la imagen de referencia (orden horario desde arriba)
const PALETA_REFERENCIA = [
  '#7a1e3a', // Salud — corazón con pulso
  '#0e5a7a', // Familia — personas
  '#1d9bd7', // Dinero — monedas
  '#3abed1', // Pareja — personas
  '#4ed0a3', // Espiritualidad — loto
  '#f7c948', // Contribución — corazón
  '#ef7d1a', // Desarrollo — foco
  '#e6394e', // Trabajo — barras
  '#8b5cf6', // Entorno (extra si hay más de 8)
  '#14b8a6', // Diversión (extra si hay más de 8)
];

function colorPorArea(nombre: string, indice: number): string {
  return PALETA_POR_AREA[areaKeyCorta(nombre)] || PALETA_REFERENCIA[indice % PALETA_REFERENCIA.length];
}

export { colorPorArea };

// Fotos por área (public/). Para agregar la foto de otra área,
// basta añadir su entrada aquí: la rueda la renderiza como <img>.
const ICONOS_FOTO: Record<string, string> = {
  trabajo: '/trabajo.png',
  desarrollo: '/up2.png',
  dinero: '/dinero.png',
  contribucion: '/contribucion.png',
  salud: '/heartPulse.png',
  pareja: '/love.png',
  entorno: '/home.png',
  espiritualidad: '/zen2.png',
  diversion: 'party.png',
};

type IconComp = React.ComponentType<{ className?: string; strokeWidth?: number | string; fill?: string }> | string;

function iconoPorArea(nombre: string, indice: number): IconComp {
  const key = areaKeyCorta(nombre);
  if (ICONOS_FOTO[key]) return ICONOS_FOTO[key];
  const n = (nombre || '').toLowerCase();
  if (n.includes('salud')) return HeartPulse;
  if (n.includes('familia')) return Users;
  if (n.includes('dinero')) return Coins;
  if (n.includes('pareja')) return Users;
  if (n.includes('espiritual')) return Flower2;
  if (n.includes('contribu')) return HandHeart;
  if (n.includes('desarrollo') || n.includes('creci')) return TrendingUp;
  if (n.includes('trabajo') || n.includes('profes')) return Briefcase;
  if (n.includes('entorno') || n.includes('hogar') || n.includes('casa')) return Home;
  if (n.includes('diver') || n.includes('ocio') || n.includes('juego')) return PartyPopper;
  if (n.includes('finan') || n.includes('econ')) return Briefcase;
  const fallback: IconComp[] = [HeartPulse, Users, Coins, TrendingUp, Flower2, Heart, Lightbulb, BarChart3];
  return fallback[indice % fallback.length];
}

function polar(cx: number, cy: number, r: number, anguloDeg: number): [number, number] {
  const a = ((anguloDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

interface RuedaSVGProps {
  datos: RuedaDato[];
  size?: number;
  interactiva?: boolean;
  seleccionId?: number | null;
  guardadasIds?: Set<number>;
  onSeleccionar?: (id: number) => void;
  conEtiquetas?: boolean;
  /** Muestra el puntaje (número) en cada segmento en vez del icono (foto evaluación) */
  mostrarPuntajes?: boolean;
  /** 'oscuro': centro navy con texto; 'claro': centro blanco con mini rueda */
  centro?: 'oscuro' | 'claro';
  /** Nombres de área fuera de la rueda + segmento seleccionado en relieve (mockup evaluación) */
  etiquetasExternas?: boolean;
  /** Nombre + puntaje dentro de cada segmento (mockup diagnóstico) */
  etiquetasInternas?: boolean;
  /** Centro con promedio y nivel (mockup diagnóstico): [PROMEDIO, valor, EQUILIBRIO X] */
  centroDiagnostico?: { promedio: string; nivel: string } | null;
}

const RuedaSVG: React.FC<RuedaSVGProps> = ({
  datos,
  size = 260,
  interactiva = false,
  seleccionId = null,
  guardadasIds,
  onSeleccionar,
  conEtiquetas = true,
  mostrarPuntajes = false,
  centro = 'oscuro',
  etiquetasExternas = false,
  etiquetasInternas = false,
  centroDiagnostico = null,
}) => {
  const cx = 100;
  const cy = 100;
  const rExt = 96;
  const n = datos.length || 8;
  const paso = 360 / n;

  return (
    <svg width="100%" height="auto" viewBox={etiquetasExternas ? '-100 -60 400 320' : '0 0 200 200'} style={{ maxWidth: size, display: 'block', margin: '0 auto' }} className={interactiva ? 'select-none' : ''}>
      {interactiva && (
        <style>{`.rueda-seg { transition: filter 0.15s ease; } .rueda-seg:hover path { filter: brightness(1.12); }`}</style>
      )}
      {datos.map((d, i) => {
        const a0 = i * paso;
        const a1 = (i + 1) * paso;
        const mid = (a0 + a1) / 2;
        const rad = ((mid - 90) * Math.PI) / 180;
        const [x0, y0] = polar(cx, cy, rExt, a0);
        const [x1, y1] = polar(cx, cy, rExt, a1);
        const grande = a1 - a0 > 180 ? 1 : 0;
        const [lx, ly] = polar(cx, cy, rExt * 0.6, mid);
        const sel = seleccionId === d.id;
        const guardada = guardadasIds?.has(d.id ?? -1);
        const fill = colorPorArea(d.nombre, i);
        const Icon = iconoPorArea(d.nombre, i);
        // Relieve por escala desde el centro (no deja huecos blancos como la traslación).
        const labelR = Math.abs(Math.cos(rad)) < 0.45 ? rExt + 27 : rExt + 16;
        const [tx, ty] = polar(cx, cy, labelR, mid);
        const anchor = Math.cos(rad) > 0.35 ? 'start' : Math.cos(rad) < -0.35 ? 'end' : 'middle';
        return (
          <g
            key={d.id ?? d.nombre}
            id={`rueda-seg-idx-${i}`}
            className={interactiva && !sel ? 'rueda-seg' : undefined}
            onClick={interactiva && d.id != null ? () => onSeleccionar?.(d.id as number) : undefined}
            style={interactiva ? { cursor: 'pointer' } : undefined}
            transform={sel && interactiva ? `translate(${cx} ${cy}) scale(1.045) translate(${-cx} ${-cy})` : undefined}
          >
            <path
              d={`M ${cx} ${cy} L ${x0} ${y0} A ${rExt} ${rExt} 0 ${grande} 1 ${x1} ${y1} Z`}
              fill={fill}
              stroke={sel ? '#8b5cf6' : '#ffffff'}
              strokeWidth={sel ? 5 : 4}
              strokeLinejoin="round"
              style={sel && interactiva ? { filter: 'brightness(1.1) drop-shadow(0 8px 16px rgba(139,92,246,0.65))' } : undefined}
            />
            {etiquetasExternas && (
              <text x={tx} y={ty} textAnchor={anchor} dominantBaseline="middle" fontSize="9.5" fontWeight="700" fill="#101433">
                {d.nombre}
              </text>
            )}
            {etiquetasInternas && (
              <text x={lx} y={ly - 3} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="700" fill="#ffffff">
                {d.nombre}
              </text>
            )}
            {etiquetasInternas && (
              <text x={lx} y={ly + 11} textAnchor="middle" dominantBaseline="middle" fontSize="15" fontWeight="800" fill="#ffffff">
                {d.puntaje > 0 ? d.puntaje : ''}
              </text>
            )}
            <foreignObject x={lx - 17} y={ly - 17} width={34} height={34} style={{ pointerEvents: 'none' }}>
              {mostrarPuntajes ? (
                <div style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 800, fontSize: 17 }}>
                  {d.puntaje > 0 ? d.puntaje : ''}
                </div>
              ) : !etiquetasInternas ? (
                <div style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', position: 'relative' }}>
                  {typeof Icon === 'string' ? (
                    <img src={Icon} alt={d.nombre} style={{ width: 30, height: 30, objectFit: 'contain' }} />
                  ) : (
                    <Icon className="w-[30px] h-[30px] text-white" strokeWidth={1.5} fill="currentColor" />
                  )}
                  {guardada && interactiva && (
                    <span style={{ position: 'absolute', right: -2, top: -2, width: 12, height: 12, borderRadius: 999, background: '#22c55e', color: '#fff', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>✓</span>
                  )}
                </div>
              ) : null}
            </foreignObject>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={rExt} fill="none" stroke="#ffffff" strokeWidth="3" />
      {centroDiagnostico ? (
        <>
          <circle cx={cx} cy={cy} r={44} fill="#141a33" stroke="#ffffff" strokeWidth="4" />
          <text x={cx} y={cy - 14} textAnchor="middle" fill="#cbd5e1" fontSize="10" fontWeight="700">
            PROMEDIO
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" fill="#fff" fontSize="26" fontWeight="800">
            {centroDiagnostico.promedio}
          </text>
          <text x={cx} y={cy + 28} textAnchor="middle" fill="#fbbf24" fontSize="9" fontWeight="700">
            {centroDiagnostico.nivel}
          </text>
        </>
      ) : centro === 'claro' ? (
        <>
          <circle cx={cx} cy={cy} r={40} fill="#ffffff" stroke="#e5e7eb" strokeWidth="3" />
          <foreignObject x={cx - 26} y={cy - 26} width={52} height={52} style={{ pointerEvents: 'none' }}>
            <div style={{ width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/Rueda3.png" alt="Rueda" style={{ width: 44, height: 44, objectFit: 'contain' }} />
            </div>
          </foreignObject>
        </>
      ) : (
        <>
          <circle cx={cx} cy={cy} r={40} fill="#141a33" stroke="#ffffff" strokeWidth="4" />
          <text x={cx} y={cy - 1} textAnchor="middle" fill="#fff" fontSize="13" fontWeight="600">
            Rueda
          </text>
          <text x={cx} y={cy + 17} textAnchor="middle" fill="#fff" fontSize="13" fontWeight="600">
            de la Vida
          </text>
        </>
      )}
    </svg>
  );
};

export default RuedaSVG;
