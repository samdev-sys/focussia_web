import type { ComponentType } from 'react';
import {
  Home, CircleDot, Calendar, CalendarDays, LayoutGrid, Kanban,
  CalendarRange, CalendarCheck, UserPlus, Target, Clock, Pill, Cake,
  HeartHandshake, Wallet, GraduationCap, MessageSquare, Crosshair,
  Smile, Share2, MoreHorizontal,
} from 'lucide-react';

export type NavIconComp = ComponentType<{ className?: string }>;

/** Icono personalizado de pastel de cumpleaños con velas */
const BirthdayCake: ComponentType<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Capa inferior del pastel */}
    <path d="M12 21c-3.3 0-6-2.2-6-5v-3c0-2.8 2.7-5 6-5s6 2.2 6 5v3c0 2.8-2.7 5-6 5z" fill="currentColor" fillOpacity="0.1" />
    {/* Capa media del pastel */}
    <path d="M12 16c-3.3 0-6-2.2-6-5V8c0-2.8 2.7-5 6-5s6 2.2 6 5v3c0 2.8-2.7 5-6 5z" fill="currentColor" fillOpacity="0.2" />
    {/* Capa superior del pastel */}
    <path d="M12 11c-3.3 0-6-2.2-6-5V3c0-2.8 2.7-5 6-5s6 2.2 6 5v3c0 2.8-2.7 5-6 5z" fill="currentColor" fillOpacity="0.3" />
    {/* Líneas decorativas del pastel */}
    <path d="M6 16c0 2.8 2.7 5 6 5s6-2.2 6-5" />
    <path d="M6 11c0 2.8 2.7 5 6 5s6-2.2 6-5" />
    {/* Velas */}
    <line x1="12" y1="3" x2="12" y2="0" />
    <line x1="8" y1="4" x2="8" y2="1" />
    <line x1="16" y1="4" x2="16" y2="1" />
    {/* Llamas de las velas */}
    <path d="M12 0c0.5 0 1 0.5 1 1s-0.5 1-1 1-1-0.5-1-1 0.5-1 1-1z" fill="currentColor" />
    <path d="M8 1c0.5 0 1 0.5 1 1s-0.5 1-1 1-1-0.5-1-1 0.5-1 1-1z" fill="currentColor" />
    <path d="M16 1c0.5 0 1 0.5 1 1s-0.5 1-1 1-1-0.5-1-1 0.5-1 1-1z" fill="currentColor" />
  </svg>
);

/** Iconos únicos del sidebar (iguales en todas las pantallas). */
export const NAV_ICONS: Record<string, NavIconComp> = {
  inicio: Home,
  rueda: CircleDot,
  anual: Calendar,
  mensual: CalendarDays,
  matriz: LayoutGrid,
  kanban: Kanban,
  semanal: CalendarRange,
  diaria: CalendarCheck,
  delegar: UserPlus,
  mision: Target,
  fechas: Clock,
  suplementos: Pill,
  cumpleanos: BirthdayCake,
  tribu: HeartHandshake,
  cuentas: Wallet,
  cursos: GraduationCap,
  coaching: MessageSquare,
  focus: Crosshair,
  gratitud: Smile,
  redes: Share2,
  mas: MoreHorizontal,
};
