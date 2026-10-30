export interface Subaccion {
  id: string;
  texto: string;
  estado: 'Pendiente' | 'Haciendo' | 'Completada';
}

export interface AccionKanban {
  id: string;
  texto_accion: string;
  subacciones: Subaccion[];
  origen: 'MANUAL' | 'RUEDA_VIDA' | 'OTRO';
  clasificacion: 'H' | 'P' | 'D' | 'E' | null;
  estado: 'Pendiente' | 'Haciendo' | 'Completada';
  destino_asignado: string;
  fecha_seleccionada: string | null;
  hora_seleccionada: string | null;
  es_fijo: boolean;
  estado_actual?: string;
  creado_en: string;
  actualizado_en: string;
}

export type Decision = 'H' | 'P' | 'D' | 'E';

export const LETTER_COLORS: Record<Decision, string> = {
  H: '#1f6feb',
  P: '#a21caf',
  D: '#1e1b4b',
  E: '#0a0a0a',
};

export function isoToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, day] = iso.split('-').map(Number);
  return new Date(y, m - 1, day);
}

export function formatLongDate(iso: string): string {
  const d = parseISODate(iso);
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]}`;
}
