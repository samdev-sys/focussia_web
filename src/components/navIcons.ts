import type { ComponentType } from 'react';
import {
  Home, CircleDot, Calendar, CalendarDays, LayoutGrid, Kanban,
  CalendarRange, CalendarCheck, UserPlus, Target, Clock, Pill, Cake,
  HeartHandshake, Wallet, GraduationCap, MessageSquare, Crosshair,
  Smile, Share2, MoreHorizontal,
} from 'lucide-react';

export type NavIconComp = ComponentType<{ className?: string }>;

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
  cumpleanos: Cake,
  tribu: HeartHandshake,
  cuentas: Wallet,
  cursos: GraduationCap,
  coaching: MessageSquare,
  focus: Crosshair,
  gratitud: Smile,
  redes: Share2,
  mas: MoreHorizontal,
};
