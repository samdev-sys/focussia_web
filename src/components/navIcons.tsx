import type { ComponentType } from 'react';
import {
  CalendarRange, CalendarCheck, UserPlus, Target, Clock, Pill,
  GraduationCap, MessageSquare, Crosshair,
  Share2, MoreHorizontal, Sparkles,
} from 'lucide-react';

export type NavIconComp = ComponentType<{ className?: string }>;

/* ──────────────────────────────────────────────────────────────────────────
   Iconos base del sidebar (Inicio, Rueda, Matriz, Anual, Mensual, Cumpleaños, Tribu, Cuentas, Gratitud, Hora de Oro).
   Se dibujan a mano para que el trazo (línea fina, esquinas redondeadas)
   sea idéntico en TODAS las pantallas, como en el diseño de referencia.
   ────────────────────────────────────────────────────────────────────────── */

const strokeProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** Casa con techo a dos aguas (Inicio). */
const IconInicio: NavIconComp = ({ className }) => (
  <svg viewBox="0 0 24 24" {...strokeProps} className={className}>
    <path d="M4 10.3 12 3.8l8 6.5V19a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 19z" />
  </svg>
);

/** Rueda de la vida: círculo con radios (Rueda). */
const IconRueda: NavIconComp = ({ className }) => (
  <svg viewBox="0 0 24 24" {...strokeProps} className={className}>
    <circle cx="12" cy="12" r="8.4" />
    <circle cx="12" cy="12" r="2.7" />
    <path d="M12 3.6v5.7M12 14.7v5.7M3.6 12h5.7M14.7 12h5.7" />
    <path d="M6.1 6.1l4 4M13.9 13.9l4 4M17.9 6.1l-4 4M10.1 13.9l-4 4" />
  </svg>
);

/** Cuatro bloques (Matriz). */
const IconMatriz: NavIconComp = ({ className }) => (
  <svg viewBox="0 0 24 24" {...strokeProps} className={className}>
    <rect x="3.6" y="3.6" width="7.2" height="7.2" rx="1.8" />
    <rect x="13.2" y="3.6" width="7.2" height="7.2" rx="1.8" />
    <rect x="3.6" y="13.2" width="7.2" height="7.2" rx="1.8" />
    <rect x="13.2" y="13.2" width="7.2" height="7.2" rx="1.8" />
  </svg>
);

/** Hoja/calendario con líneas (Anual). */
const IconAnual: NavIconComp = ({ className }) => (
  <svg viewBox="0 0 24 24" {...strokeProps} className={className}>
    <rect x="3.6" y="3.6" width="16.8" height="16.8" rx="2.2" />
    <path d="M3.6 9.2h16.8" />
    <path d="M7.6 12.9h9M7.6 16.4h6" />
  </svg>
);

/** Calendario con cuadrícula de días (Mensual). */
const IconMensual: NavIconComp = ({ className }) => (
  <svg viewBox="0 0 24 24" {...strokeProps} className={className}>
    <rect x="3.6" y="3.6" width="16.8" height="16.8" rx="2.2" />
    <path d="M3.6 9.2h16.8" />
    <rect x="7.2" y="12" width="3.4" height="3.4" rx="0.9" />
    <rect x="13.4" y="12" width="3.4" height="3.4" rx="0.9" />
    <rect x="7.2" y="16.4" width="3.4" height="3.4" rx="0.9" />
    <rect x="13.4" y="16.4" width="3.4" height="3.4" rx="0.9" />
  </svg>
);

/** Regalo con lazo (Cumpleaños). */
const IconCumpleanos: NavIconComp = ({ className }) => (
  <svg viewBox="0 0 24 24" {...strokeProps} className={className}>
    <rect x="3.4" y="9.4" width="17.2" height="4" rx="1" />
    <path d="M5 13.4v5.4a1.8 1.8 0 0 0 1.8 1.8h10.4a1.8 1.8 0 0 0 1.8-1.8v-5.4" />
    <path d="M12 9.4v11.2" />
    <path d="M12 9.4S10.8 4.8 8.6 4.8a2.1 2.1 0 0 0 0 4.6H12z" />
    <path d="M12 9.4s1.2-4.6 3.4-4.6a2.1 2.1 0 0 1 0 4.6H12z" />
  </svg>
);

/** Dos personas (Tribu). */
const IconTribu: NavIconComp = ({ className }) => (
  <svg viewBox="0 0 24 24" {...strokeProps} className={className}>
    <circle cx="9" cy="8" r="3.4" />
    <path d="M2.8 20v-1.6a4.2 4.2 0 0 1 4.2-4.2h4a4.2 4.2 0 0 1 4.2 4.2V20z" />
    <path d="M16 5.2a3.4 3.4 0 0 1 0 6.6" />
    <path d="M17.4 14.6a4.2 4.2 0 0 1 3.8 4.2V20h-3" />
  </svg>
);

/** Billetera con solapa y cierre circular (Cuentas). */
const IconCuentas: NavIconComp = ({ className }) => (
  <svg viewBox="0 0 24 24" {...strokeProps} className={className}>
    <rect x="2.8" y="5.4" width="18.4" height="13.6" rx="2.4" />
    <path d="M4.6 9.2h14.8" />
    <circle cx="16" cy="14.4" r="2.3" />
    <circle cx="16" cy="14.4" r="0.65" fill="currentColor" stroke="none" />
  </svg>
);

/** Manos abiertas con destellos (Gratitud). */
const IconGratitud: NavIconComp = ({ className }) => (
  <svg viewBox="0 0 24 24" {...strokeProps} className={className}>
    {/* Mano izquierda (la derecha se obtiene por simetría) */}
    <g>
      <path d="M9.6 20.8c-.6-2.7-.9-4.8-.9-6.5 0-1.4.4-2.5 1.1-3.4" />
      <path d="M9.8 10.9c-.5-1.3-.4-2.5.2-3.2.5-.6 1.2-.5 1.5.2.4.7.3 1.8-.1 2.8" />
      <path d="M11.4 10.7c-.1-1.5.3-2.7 1-3.4.6-.6 1.3-.4 1.5.4.2.8 0 2-.5 2.9" />
      <path d="M12.9 10.6c.3-1 1-1.7 1.6-1.7.6 0 .9.6.6 1.2-.3.7-.9 1.3-1.5 1.8" />
      <path d="M14 12.4c.3 2.5 0 5.2-.6 8.4" />
    </g>
    <g transform="translate(24 0) scale(-1 1)">
      <path d="M9.6 20.8c-.6-2.7-.9-4.8-.9-6.5 0-1.4.4-2.5 1.1-3.4" />
      <path d="M9.8 10.9c-.5-1.3-.4-2.5.2-3.2.5-.6 1.2-.5 1.5.2.4.7.3 1.8-.1 2.8" />
      <path d="M11.4 10.7c-.1-1.5.3-2.7 1-3.4.6-.6 1.3-.4 1.5.4.2.8 0 2-.5 2.9" />
      <path d="M12.9 10.6c.3-1 1-1.7 1.6-1.7.6 0 .9.6.6 1.2-.3.7-.9 1.3-1.5 1.8" />
      <path d="M14 12.4c.3 2.5 0 5.2-.6 8.4" />
    </g>
    {/* Destellos */}
    <path d="M12 2.2l.8 1.8 1.8.8-1.8.8-.8 1.8-.8-1.8-1.8-.8 1.8-.8z" />
    <path d="M4.4 7.2l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z" />
    <path d="M19.6 7.2l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z" />
    <path d="M5.4 16.6l.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5z" />
    <path d="M18.6 16.6l.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5z" />
  </svg>
);

/** Corazón con pulso y una pequeña flor (Hora de Oro). */
const IconHoraOro: NavIconComp = ({ className }) => (
  <svg viewBox="0 0 24 24" {...strokeProps} className={className}>
    {/* Corazón */}
    <path d="M12 20.8s-7.9-5-7.9-10.3a4.6 4.6 0 0 1 7.9-3.1 4.6 4.6 0 0 1 7.9 3.1c0 5.3-7.9 10.3-7.9 10.3z" />
    {/* Línea de pulso */}
    <path d="M3.4 11.4h3.4l1.5-3.1 2.6 6.2 1.7-3.1h3.3" />
    {/* Flor pequeña */}
    <circle cx="6.7" cy="17.4" r="1.1" />
    <circle cx="6.7" cy="15.1" r="1.3" />
    <circle cx="8.9" cy="16.5" r="1.3" />
    <circle cx="8.1" cy="18.9" r="1.3" />
    <circle cx="5.3" cy="18.9" r="1.3" />
    <circle cx="4.5" cy="16.5" r="1.3" />
  </svg>
);

/** Tres columnas dentro de un marco redondeado (Kanban). */
const IconKanban: NavIconComp = ({ className }) => (
  <svg viewBox="0 0 24 24" {...strokeProps} className={className}>
    <rect x="3.2" y="3.6" width="17.6" height="16.8" rx="2.6" />
    <path d="M9.1 3.6v16.8M14.9 3.6v16.8" />
  </svg>
);

/** Iconos únicos del sidebar (iguales en todas las pantallas). */
export const NAV_ICONS: Record<string, NavIconComp> = {
  inicio: IconInicio,
  rueda: IconRueda,
  anual: IconAnual,
  mensual: IconMensual,
  matriz: IconMatriz,
  kanban: IconKanban,
  semanal: CalendarRange,
  diaria: CalendarCheck,
  delegar: UserPlus,
  mision: Target,
  fechas: Clock,
  suplementos: Pill,
  cumpleanos: IconCumpleanos,
  tribu: IconTribu,
  cuentas: IconCuentas,
  cursos: GraduationCap,
  coaching: MessageSquare,
  focus: Crosshair,
  gratitud: IconGratitud,
  'hora-oro': IconHoraOro,
  inspiracion: Sparkles,
  redes: Share2,
  mas: MoreHorizontal,
};
