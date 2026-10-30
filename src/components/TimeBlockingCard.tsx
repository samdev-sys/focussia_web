import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check, ChevronRight, ChevronDown, GripVertical,
  AlertTriangle, Plus, Trash2, Play,
} from 'lucide-react';
import { api } from '../services/api';
import { AccionKanban, Subaccion } from './kanban/types';

type Estado = 'Pendiente' | 'Haciendo' | 'Completada';
type AvisoTipo = 'wip_limit' | 'move_haciendo' | 'sub_pending' | 'general';
type Aviso = { id: string; tipo: AvisoTipo; titulo: string; detalle?: string };

const HOURS = Array.from({ length: 16 }, (_, i) => i + 8);

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDateLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const raw = new Date(y, m - 1, d)
    .toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    .replace(',', '');
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function hourOf(a: AccionKanban): number | null {
  if (!a.hora_seleccionada) return null;
  const h = Number(String(a.hora_seleccionada).slice(0, 2));
  return Number.isFinite(h) ? h : null;
}

function errorDe(err: any, fallback: string): string {
  return err?.response?.data?.detail || fallback;
}

function IconoEstado({ estado }: { estado: Estado }) {
  if (estado === 'Completada') {
    return (
      <span className="w-4 h-4 rounded-full bg-[#15803d] text-white flex items-center justify-center shrink-0">
        <Check className="w-2.5 h-2.5" strokeWidth={3} />
      </span>
    );
  }
  if (estado === 'Haciendo') {
    return (
      <span className="w-4 h-4 rounded-full bg-[#5b21b6] text-white flex items-center justify-center shrink-0">
        <Play className="w-2.5 h-2.5 fill-white text-white ml-0.5" />
      </span>
    );
  }
  return <span className="w-4 h-4 rounded-full border-2 border-[#1e2f7a] bg-white shrink-0" />;
}

interface TimeBlockingCardProps {
  todayStr: string;
  refreshTrigger?: unknown;
}

export const TimeBlockingCard: React.FC<TimeBlockingCardProps> = ({
  todayStr,
  refreshTrigger,
}) => {
  const [dayActions, setDayActions] = useState<AccionKanban[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingHour, setEditingHour] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [editingAccion, setEditingAccion] = useState<{ id: string; texto: string } | null>(null);
  const [editingSub, setEditingSub] = useState<{ id: string; texto: string } | null>(null);
  const [subInput, setSubInput] = useState<{ accionId: string; texto: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [dragAccionId, setDragAccionId] = useState<string | null>(null);
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);
  const skipBlur = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.get('/api/acciones-kanban/clasificadas/');
        if (!alive) return;
        const all: AccionKanban[] = res.data || [];
        setDayActions(
          all.filter(
            a =>
              a.estado_actual === 'AGENDA_DIARIA' &&
              (a.fecha_seleccionada || todayStr) === todayStr,
          ),
        );
        // Datos de ejemplo para visualización digitalizada (fotos Time Blocking)
        if ((all.filter(
          a =>
            a.estado_actual === 'AGENDA_DIARIA' &&
            (a.fecha_seleccionada || todayStr) === todayStr,
        )).length === 0) {
          const ejemploFecha = todayStr || '2026-06-05';
          const ejemplos: AccionKanban[] = [
            {
              id: 'demo-08', texto_accion: 'Revisar prioridades',
              estado_actual: 'AGENDA_DIARIA', fecha_seleccionada: ejemploFecha,
              hora_seleccionada: '08:00', estado: 'Completada', subacciones: [],
            } as unknown as AccionKanban,
            {
              id: 'demo-09', texto_accion: 'Organizar carpetas',
              estado_actual: 'AGENDA_DIARIA', fecha_seleccionada: ejemploFecha,
              hora_seleccionada: '09:00', estado: 'Haciendo', subacciones: [
                { id: 'demo-sub-09-1', texto: 'Clasificar documentos', estado: 'Completada' },
                { id: 'demo-sub-09-2', texto: 'Eliminar duplicados', estado: 'Pendiente' },
              ] as Subaccion[],
            } as unknown as AccionKanban,
            {
              id: 'demo-10', texto_accion: 'Pagar cuentas',
              estado_actual: 'AGENDA_DIARIA', fecha_seleccionada: ejemploFecha,
              hora_seleccionada: '10:00', estado: 'Pendiente', subacciones: [],
            } as unknown as AccionKanban,
            {
              id: 'demo-11', texto_accion: 'Enviar propuesta',
              estado_actual: 'AGENDA_DIARIA', fecha_seleccionada: ejemploFecha,
              hora_seleccionada: '11:00', estado: 'Pendiente', subacciones: [],
            } as unknown as AccionKanban,
            {
              id: 'demo-12', texto_accion: 'Lavar auto',
              estado_actual: 'AGENDA_DIARIA', fecha_seleccionada: ejemploFecha,
              hora_seleccionada: '12:00', estado: 'Pendiente', subacciones: [],
            } as unknown as AccionKanban,
            {
              id: 'demo-14', texto_accion: 'Almorzar',
              estado_actual: 'AGENDA_DIARIA', fecha_seleccionada: ejemploFecha,
              hora_seleccionada: '14:00', estado: 'Pendiente', subacciones: [],
            } as unknown as AccionKanban,
            {
              id: 'demo-16', texto_accion: 'Preparar una reunión',
              estado_actual: 'AGENDA_DIARIA', fecha_seleccionada: ejemploFecha,
              hora_seleccionada: '16:00', estado: 'Pendiente', subacciones: [
                { id: 'demo-sub-16-1', texto: 'Definir agenda', estado: 'Completada' },
                { id: 'demo-sub-16-2', texto: 'Revisar documentos', estado: 'Completada' },
                { id: 'demo-sub-16-3', texto: 'Confirmar participantes', estado: 'Completada' },
                { id: 'demo-sub-16-4', texto: 'Reservar sala', estado: 'Pendiente' },
              ] as Subaccion[],
            } as unknown as AccionKanban,
            {
              id: 'demo-18', texto_accion: 'Comprar supermercado',
              estado_actual: 'AGENDA_DIARIA', fecha_seleccionada: ejemploFecha,
              hora_seleccionada: '18:00', estado: 'Pendiente', subacciones: [],
            } as unknown as AccionKanban,
            {
              id: 'demo-19', texto_accion: 'Juego familiar de mesa',
              estado_actual: 'AGENDA_DIARIA', fecha_seleccionada: ejemploFecha,
              hora_seleccionada: '19:00', estado: 'Pendiente', subacciones: [],
            } as unknown as AccionKanban,
          ];
          setDayActions(ejemplos);
        }
      } catch (err) {
        console.error('Error loading time blocking actions:', err);
      }
    })();
    return () => {
      alive = false;
    };
  }, [todayStr, refreshKey, refreshTrigger]);

  const reload = () => setRefreshKey(r => r + 1);

  const placed = useMemo(() => {
    const map = new Map<number, AccionKanban>();
    for (const a of dayActions) {
      const h = hourOf(a);
      if (h !== null && HOURS.includes(h) && !map.has(h)) map.set(h, a);
    }
    return map;
  }, [dayActions]);

  const occupied = useMemo(() => new Set(placed.keys()), [placed]);

  const draggedAccion = useMemo(
    () => (dragAccionId ? dayActions.find(a => a.id === dragAccionId) || null : null),
    [dragAccionId, dayActions],
  );

  const cambiarEstado = async (accion: AccionKanban, nuevo: Estado) => {
    const subs = accion.subacciones || [];
    if (nuevo === 'Haciendo') {
      const otra = dayActions.find(a => a.id !== accion.id && a.estado === 'Haciendo');
      if (otra) {
        setAviso({
          id: accion.id,
          tipo: 'wip_limit',
          titulo: 'Ya hay una acción en «Haciendo».',
          detalle: `Finalice «${otra.texto_accion}» para iniciar «${accion.texto_accion}».`,
        });
        return;
      }
    }
    if (nuevo === 'Completada') {
      const pendiente = subs.find(s => s.estado === 'Pendiente');
      if (pendiente) {
        setExpanded(prev => ({ ...prev, [accion.id]: true }));
        setAviso({
          id: accion.id,
          tipo: 'sub_pending',
          titulo: 'No se puede completar la acción.',
          detalle: `La subacción «${pendiente.texto}» sigue pendiente.`,
        });
        return;
      }
    }
    if (accion.id.startsWith('demo-')) {
      setDayActions(prev =>
        prev.map(a => (a.id === accion.id ? { ...a, estado: nuevo } : a)),
      );
      setAviso(null);
      return;
    }
    try {
      await api.patch(`/api/acciones-kanban/${accion.id}/`, { estado: nuevo });
      setAviso(null);
      reload();
    } catch (err: any) {
      setAviso({
        id: accion.id,
        tipo: 'general',
        titulo: errorDe(err, 'No se pudo cambiar el estado.'),
      });
    }
  };

  const moverAccion = async (accion: AccionKanban, hora: number) => {
    if (accion.estado === 'Haciendo') {
      setAviso({
        id: accion.id,
        tipo: 'move_haciendo',
        titulo: 'La acción está en «Haciendo».',
        detalle: 'No puede cambiar de hora ni de día mientras esté en ejecución.',
      });
      return;
    }
    if (accion.id.startsWith('demo-')) {
      setDayActions(prev => {
        const sinActual = prev.filter(a => a.id !== accion.id);
        return [...sinActual, { ...accion, hora_seleccionada: `${pad(hora)}:00` }];
      });
      setAviso(null);
      return;
    }
    try {
      await api.patch(`/api/acciones-kanban/${accion.id}/`, {
        hora_seleccionada: `${pad(hora)}:00`,
      });
      setAviso(null);
      reload();
    } catch (err: any) {
      setAviso({
        id: accion.id,
        tipo: 'general',
        titulo: errorDe(err, 'No se pudo mover la acción.'),
      });
    }
  };

  const soltarEn = (hora: number) => {
    setDragOverHour(null);
    if (!dragAccionId) return;
    const accion = dayActions.find(a => a.id === dragAccionId);
    setDragAccionId(null);
    if (!accion || hourOf(accion) === hora) return;
    if (occupied.has(hora)) {
      setAviso({
        id: `hora:${hora}`,
        tipo: 'general',
        titulo: `Ya hay una acción en el bloque de las ${pad(hora)}:00.`,
      });
      return;
    }
    moverAccion(accion, hora);
  };

  const crearEnAgenda = async (hora: number, texto: string) => {
    try {
      await api.post('/api/acciones-kanban/agenda/', {
        texto_accion: texto,
        fecha_seleccionada: todayStr,
        hora_seleccionada: `${pad(hora)}:00`,
      });
      setAviso(null);
      reload();
    } catch (err: any) {
      setAviso({
        id: `hora:${hora}`,
        tipo: 'general',
        titulo: errorDe(err, 'No se pudo crear la acción.'),
      });
    }
  };

  const terminarEdicionHora = (hora: number, guardar: boolean) => {
    const texto = draft.trim();
    setEditingHour(null);
    if (guardar && texto) crearEnAgenda(hora, texto);
  };

  const iniciarEdicionHora = (hora: number) => {
    skipBlur.current = false;
    setAviso(null);
    setEditingHour(hora);
    setDraft('');
  };

  const guardarTextoAccion = async (accion: AccionKanban, texto: string) => {
    setEditingAccion(null);
    const limpio = texto.trim();
    if (!limpio || limpio === accion.texto_accion) return;
    if (accion.id.startsWith('demo-')) {
      setDayActions(prev =>
        prev.map(a => (a.id === accion.id ? { ...a, texto_accion: limpio } : a)),
      );
      return;
    }
    try {
      await api.patch(`/api/acciones-kanban/${accion.id}/`, { texto_accion: limpio });
      reload();
    } catch (err: any) {
      setAviso({
        id: accion.id,
        tipo: 'general',
        titulo: errorDe(err, 'No se pudo guardar el texto.'),
      });
    }
  };

  const crearSubaccion = async (accionId: string, texto: string) => {
    setSubInput(null);
    if (accionId.startsWith('demo-')) {
      setDayActions(prev =>
        prev.map(a =>
          a.id === accionId
            ? {
                ...a,
                subacciones: [
                  ...(a.subacciones || []),
                  { id: `demo-sub-${Date.now()}`, texto, estado: 'Pendiente' as Subaccion['estado'] },
                ],
              }
            : a,
        ),
      );
      setAviso(null);
      return;
    }
    try {
      await api.post(`/api/acciones-kanban/${accionId}/subacciones/`, { texto });
      setAviso(null);
      reload();
    } catch (err: any) {
      setAviso({
        id: accionId,
        tipo: 'general',
        titulo: errorDe(err, 'No se pudo crear la subacción.'),
      });
    }
  };

  const abrirSubInput = (accionId: string) => {
    skipBlur.current = false;
    setAviso(null);
    setExpanded(prev => ({ ...prev, [accionId]: true }));
    setSubInput({ accionId, texto: '' });
  };

  const guardarSubaccion = async (accion: AccionKanban, sub: Subaccion, texto: string) => {
    setEditingSub(null);
    const limpio = texto.trim();
    if (!limpio || limpio === sub.texto) return;
    if (accion.id.startsWith('demo-')) {
      setDayActions(prev =>
        prev.map(a =>
          a.id === accion.id
            ? {
                ...a,
                subacciones: (a.subacciones || []).map(s =>
                  s.id === sub.id ? { ...s, texto: limpio } : s,
                ),
              }
            : a,
        ),
      );
      return;
    }
    try {
      await api.patch(`/api/acciones-kanban/${accion.id}/subacciones/${sub.id}/`, {
        texto: limpio,
      });
      reload();
    } catch (err: any) {
      setAviso({
        id: accion.id,
        tipo: 'general',
        titulo: errorDe(err, 'No se pudo guardar la subacción.'),
      });
    }
  };

  const cambiarSubaccion = async (accion: AccionKanban, sub: Subaccion) => {
    const nuevoEstado = sub.estado === 'Completada' ? 'Pendiente' : 'Completada';
    if (accion.id.startsWith('demo-')) {
      setDayActions(prev =>
        prev.map(a => {
          if (a.id !== accion.id) return a;
          const newSubs = (a.subacciones || []).map(s =>
            s.id === sub.id
              ? { ...s, estado: nuevoEstado as Subaccion['estado'] }
              : s,
          ) as Subaccion[];
          const allComplete = newSubs.length > 0 && newSubs.every(s => s.estado === 'Completada');
          let parentEstado = a.estado;
          if (allComplete) parentEstado = 'Completada';
          else if (a.estado === 'Completada') parentEstado = 'Pendiente';
          return { ...a, subacciones: newSubs, estado: parentEstado };
        }),
      );
      setAviso(null);
      return;
    }
    try {
      await api.patch(`/api/acciones-kanban/${accion.id}/subacciones/${sub.id}/`, {
        estado: sub.estado === 'Completada' ? 'Pendiente' : 'Completada',
      });
      setAviso(null);
      reload();
    } catch (err: any) {
      setAviso({
        id: accion.id,
        tipo: 'general',
        titulo: errorDe(err, 'No se pudo actualizar la subacción.'),
      });
    }
  };

  const eliminarSubaccion = async (accionId: string, subId: string) => {
    if (accionId.startsWith('demo-')) {
      setDayActions(prev =>
        prev.map(a => {
          if (a.id !== accionId) return a;
          const newSubs = (a.subacciones || []).filter(s => s.id !== subId) as Subaccion[];
          const allComplete = newSubs.length > 0 && newSubs.every(s => s.estado === 'Completada');
          let parentEstado = a.estado;
          if (newSubs.length === 0) {
            // no subs left; keep current? backend keeps. leave as is
          } else if (allComplete) parentEstado = 'Completada';
          else if (a.estado === 'Completada') parentEstado = 'Pendiente';
          return { ...a, subacciones: newSubs, estado: parentEstado };
        }),
      );
      setAviso(null);
      return;
    }
    try {
      await api.delete(`/api/acciones-kanban/${accionId}/subacciones/${subId}/`);
      setAviso(null);
      reload();
    } catch (err: any) {
      setAviso({
        id: accionId,
        tipo: 'general',
        titulo: errorDe(err, 'No se pudo eliminar la subacción.'),
      });
    }
  };

  const eliminarAccion = async (accion: AccionKanban) => {
    setConfirmDelete(null);
    if (accion.id.startsWith('demo-')) {
      setDayActions(prev => prev.filter(a => a.id !== accion.id));
      setAviso(null);
      return;
    }
    try {
      await api.delete(`/api/acciones-kanban/${accion.id}/`);
      setAviso(null);
      reload();
    } catch (err: any) {
      setAviso({
        id: accion.id,
        tipo: 'general',
        titulo: errorDe(err, 'No se pudo eliminar la acción.'),
      });
    }
  };

  return (
    <div className="w-[410px] flex flex-col overflow-hidden rounded-md border border-slate-200/80 bg-white shadow-sm -ml-2 font-montserrat">
      {/* BARRA HEADER DEL TIME BLOCKING */}
      <div className="bg-[linear-gradient(90deg,#0044e8_0%,#19227c_55%,#26021e_100%)] rounded-md text-white text-center py-2 text-[15px] font-extrabold tracking-wider uppercase select-none">
        TIME BLOCKING
      </div>

      {/* FECHA */}
      <div className="text-center text-[13px] font-bold text-[#1a2340] py-1.5 bg-white select-none">
        {formatDateLong(todayStr)}
      </div>

      {/* ENCABEZADOS DE COLUMNA (PILLS) */}
      <div
        id="tour-wip-status"
        className="flex items-center gap-1.5 px-2 pb-1.5 bg-white select-none"
      >
        <div className="w-[98px] shrink-0 bg-[linear-gradient(90deg,#ffe39f_0%,#fda68c_55%,#f6789c_100%)] border border-[#d68594] rounded-md py-1 text-[10px] font-extrabold tracking-wider uppercase text-[#1e1b2e] text-center shadow-2xs">
          HORA
        </div>
        <div className="flex-1 min-w-0 bg-[linear-gradient(90deg,#ffe39f_0%,#fda68c_55%,#f6789c_100%)] border border-[#d68594] rounded-md py-1 text-[10px] font-extrabold tracking-wider uppercase text-[#1e1b2e] text-center shadow-2xs">
          ACCIÓN
        </div>
        <div className="w-[132px] shrink-0 bg-[linear-gradient(90deg,#ffe39f_0%,#fda68c_55%,#f6789c_100%)] border border-[#d68594] rounded-md py-1 text-[10px] font-extrabold tracking-wider uppercase text-[#1e1b2e] text-center shadow-2xs">
          ESTADO
        </div>
      </div>

      {/* FILAS DE HORARIOS */}
      <div className="overflow-y-auto max-h-[500px] px-2 py-0.5 space-y-1 bg-[#f9fafc]">
        {HOURS.map(h => {
          const label = `${pad(h)}:00 – ${pad((h + 1) % 24)}:00`;
          const accion = placed.get(h) || null;
          const estado = (accion?.estado || 'Pendiente') as Estado;
          const enEjecucion = accion?.estado === 'Haciendo';
          const subs = accion?.subacciones || [];
          const completadas = subs.filter(s => s.estado === 'Completada').length;
          const abierto =
            !!accion &&
            !!expanded[accion.id] &&
            (subs.length > 0 || subInput?.accionId === accion.id);
          const enEdicion = !!accion && editingAccion?.id === accion.id;
          const avisoAqui = accion && aviso?.id === accion.id ? aviso : null;
          const isBeingDragged = !!accion && dragAccionId === accion.id;
          const isDropTarget =
            dragOverHour === h && !!draggedAccion && !accion && hourOf(draggedAccion) !== h;
          const highlightLavender = enEjecucion && !abierto && avisoAqui?.tipo !== 'move_haciendo';
          const showRedLeftBar = avisoAqui?.tipo === 'move_haciendo';

          const siguienteEstado: Estado | null =
            estado === 'Pendiente'
              ? 'Haciendo'
              : estado === 'Haciendo'
              ? 'Completada'
              : null;

          return (
            <div
              key={h}
              onDragOver={e => {
                e.preventDefault();
                if (dragAccionId && !accion && dragOverHour !== h) {
                  setDragOverHour(h);
                }
              }}
              onDragLeave={() => {
                if (dragOverHour === h) setDragOverHour(null);
              }}
              onDrop={() => soltarEn(h)}
              className="flex items-stretch gap-1.5"
            >
              {/* CELDA HORA */}
              <div
                draggable={!!accion}
                onDragStart={e => {
                  if (!accion) return;
                  if (enEjecucion) {
                    e.preventDefault();
                    setAviso({
                      id: accion.id,
                      tipo: 'move_haciendo',
                      titulo: 'La acción está en «Haciendo».',
                      detalle: 'No puede cambiar de hora ni de día mientras esté en ejecución.',
                    });
                    return;
                  }
                  setAviso(null);
                  e.dataTransfer.setData('text/plain', accion.id);
                  setDragAccionId(accion.id);
                }}
                onDragEnd={() => {
                  setDragAccionId(null);
                  setDragOverHour(null);
                }}
                className={`w-[98px] shrink-0 rounded-md border border-slate-100 px-1.5 py-1.5 flex items-center gap-1 select-none ${
                  highlightLavender ? 'bg-[#efeaff]' : 'bg-white'
                } ${showRedLeftBar ? 'border-l-[3px] border-l-[#dc2626]' : ''}`}
              >
                <span className="w-3.5 shrink-0 flex items-center justify-center">
                  {accion && !enEjecucion && (
                    <GripVertical
                      className="w-3.5 h-3.5 text-slate-500 cursor-grab active:cursor-grabbing"
                    />
                  )}
                </span>
                <span className="text-[11px] font-bold text-[#1e293b] whitespace-nowrap tracking-tight">
                  {label}
                </span>
              </div>

              {/* ÁREA DERECHA (ACCIÓN + ESTADO + SUBACCIONES / AVISOS) */}
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                {isDropTarget && draggedAccion ? (
                  <div className="relative rounded-lg border-2 border-[#6d28d9] bg-white px-2 py-1 flex items-center justify-center min-h-[32px]">
                    <div className="rounded-md border-2 border-[#6d28d9] bg-white shadow-md px-3 py-0.5 flex items-center gap-4">
                      <span className="text-[11.5px] font-medium text-[#283566] truncate max-w-[140px]">
                        {draggedAccion.texto_accion}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-[#283566]">
                        <IconoEstado estado={(draggedAccion.estado || 'Pendiente') as Estado} />
                        <span>{draggedAccion.estado || 'Pendiente'}</span>
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-stretch gap-1.5">
                    {/* CELDA ACCIÓN */}
                    <div
                      draggable={!!accion}
                      onDragStart={e => {
                        if (!accion) return;
                        if (enEjecucion) {
                          e.preventDefault();
                          setAviso({
                            id: accion.id,
                            tipo: 'move_haciendo',
                            titulo: 'La acción está en «Haciendo».',
                            detalle: 'No puede cambiar de hora ni de día mientras esté en ejecución.',
                          });
                          return;
                        }
                        setAviso(null);
                        e.dataTransfer.setData('text/plain', accion.id);
                        setDragAccionId(accion.id);
                      }}
                      onDragEnd={() => {
                        setDragAccionId(null);
                        setDragOverHour(null);
                      }}
                      className={`flex-1 min-w-0 rounded-md border border-slate-100 px-2.5 py-1.5 flex flex-col justify-center ${
                        highlightLavender ? 'bg-[#efeaff]' : 'bg-white'
                      }`}
                    >
                      {accion ? (
                        <>
                          <div className="flex items-center gap-1.5 min-w-0">
                            {subs.length > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpanded(prev => ({
                                    ...prev,
                                    [accion.id]: !prev[accion.id],
                                  }))
                                }
                                className="text-[#3730a3] shrink-0"
                                title={abierto ? 'Ocultar subacciones' : 'Ver subacciones'}
                              >
                                {abierto ? (
                                  <ChevronDown className="w-3.5 h-3.5" strokeWidth={2.5} />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                                )}
                              </button>
                            )}
                            {enEdicion ? (
                              <input
                                autoFocus
                                value={editingAccion?.texto ?? ''}
                                onChange={e =>
                                  setEditingAccion({ id: accion.id, texto: e.target.value })
                                }
                                onBlur={() => {
                                  if (skipBlur.current) {
                                    skipBlur.current = false;
                                    return;
                                  }
                                  guardarTextoAccion(accion, editingAccion?.texto ?? '');
                                }}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') e.currentTarget.blur();
                                  if (e.key === 'Escape') {
                                    skipBlur.current = true;
                                    setEditingAccion(null);
                                  }
                                }}
                                className="flex-1 min-w-0 text-[11.5px] font-medium text-[#1e293b] bg-white rounded px-1.5 py-0.5 border-2 border-[#6366f1] outline-none"
                              />
                            ) : (
                              <span
                                onClick={() => {
                                  if (subs.length > 0) {
                                    setExpanded(prev => ({
                                      ...prev,
                                      [accion.id]: !prev[accion.id],
                                    }));
                                  }
                                }}
                                onDoubleClick={() => {
                                  skipBlur.current = false;
                                  setEditingAccion({
                                    id: accion.id,
                                    texto: accion.texto_accion,
                                  });
                                }}
                                title={
                                  subs.length > 0
                                    ? 'Clic para desplegar · Doble clic para editar'
                                    : 'Doble clic para editar'
                                }
                                className={`flex-1 min-w-0 text-[11.5px] font-medium truncate select-none ${
                                  isBeingDragged
                                    ? 'text-slate-300'
                                    : enEjecucion
                                    ? 'text-[#5b21b6]'
                                    : 'text-[#283566]'
                                } ${subs.length > 0 ? 'cursor-pointer' : 'cursor-text'}`}
                              >
                                {accion.texto_accion}
                              </span>
                            )}
                          </div>
                          {subs.length > 0 && (
                            <p className="pl-5 text-[10px] font-bold text-[#6d28d9] leading-tight">
                              {!abierto && completadas === 0
                                ? `${subs.length} subacciones`
                                : `${completadas} de ${subs.length} subacciones completadas`}
                            </p>
                          )}
                        </>
                      ) : editingHour === h ? (
                        <input
                          autoFocus
                          value={draft}
                          onChange={e => setDraft(e.target.value)}
                          onBlur={() => {
                            if (skipBlur.current) {
                              skipBlur.current = false;
                              return;
                            }
                            terminarEdicionHora(h, true);
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              skipBlur.current = true;
                              terminarEdicionHora(h, true);
                            }
                            if (e.key === 'Escape') {
                              skipBlur.current = true;
                              terminarEdicionHora(h, false);
                            }
                          }}
                          placeholder="Escriba una acción"
                          className="w-full rounded-md border-2 border-[#6366f1] bg-white px-2 py-0.5 text-[11.5px] text-[#1e293b] outline-none"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => iniciarEdicionHora(h)}
                          className="w-full text-left text-[11px] italic text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          + Escriba una acción
                        </button>
                      )}
                    </div>

                    {/* CELDA ESTADO */}
                    <div
                      className={`w-[132px] shrink-0 rounded-md border border-slate-100 px-1.5 py-1 flex items-center justify-between gap-1 ${
                        highlightLavender ? 'bg-[#efeaff]' : 'bg-white'
                      }`}
                    >
                      {accion && (
                        <>
                          {siguienteEstado ? (
                            <button
                              type="button"
                              onClick={() => cambiarEstado(accion, siguienteEstado)}
                              title={
                                siguienteEstado === 'Haciendo'
                                  ? 'Clic para iniciar'
                                  : 'Clic para completar'
                              }
                              className={`flex items-center gap-1 text-[10px] font-bold tracking-tight truncate ${
                                estado === 'Haciendo'
                                  ? 'text-[#5b21b6]'
                                  : 'text-[#283566]'
                              }`}
                            >
                              <IconoEstado estado={estado} />
                              <span className="truncate">{estado}</span>
                            </button>
                          ) : (
                            <span
                              className={`flex items-center gap-1 text-[10px] font-bold tracking-tight truncate ${
                                estado === 'Completada'
                                  ? 'text-[#15803d]'
                                  : 'text-[#283566]'
                              }`}
                            >
                              <IconoEstado estado={estado} />
                              <span className="truncate">{estado}</span>
                            </span>
                          )}

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => abrirSubInput(accion.id)}
                              className="w-5 h-5 rounded border border-[#c7d2fe] bg-white hover:bg-[#eef2ff] text-[#3730a3] flex items-center justify-center transition-colors"
                              title="Añadir subacción"
                            >
                              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                subs.length > 0
                                  ? setConfirmDelete(accion.id)
                                  : eliminarAccion(accion)
                              }
                              className="w-5 h-5 rounded flex items-center justify-center text-[#dc2626] hover:bg-red-50 transition-colors"
                              title="Eliminar acción"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* LISTA DE SUBACCIONES DESPLEGADA */}
                {accion && abierto && (
                  <ul className="pl-3 space-y-1">
                    {subs.map(sub => (
                      <li
                        key={sub.id}
                        className="flex items-center gap-2 rounded-md border border-slate-100 bg-white px-2.5 py-1 shadow-2xs"
                      >
                        <button
                          type="button"
                          onClick={() => cambiarSubaccion(accion, sub)}
                          className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                            sub.estado === 'Completada'
                              ? 'bg-[#065f46] text-white'
                              : 'border-2 border-[#1e2f7a] bg-white'
                          }`}
                          title={
                            sub.estado === 'Completada'
                              ? 'Marcar como pendiente'
                              : 'Marcar como completada'
                          }
                        >
                          {sub.estado === 'Completada' && (
                            <Check className="w-2.5 h-2.5" strokeWidth={3} />
                          )}
                        </button>
                        {editingSub?.id === sub.id ? (
                          <input
                            autoFocus
                            value={editingSub.texto}
                            onChange={e =>
                              setEditingSub({ id: sub.id, texto: e.target.value })
                            }
                            onBlur={() => {
                              if (skipBlur.current) {
                                skipBlur.current = false;
                                return;
                              }
                              guardarSubaccion(accion, sub, editingSub?.texto ?? '');
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                skipBlur.current = true;
                                guardarSubaccion(accion, sub, editingSub?.texto ?? '');
                              }
                              if (e.key === 'Escape') {
                                skipBlur.current = true;
                                setEditingSub(null);
                              }
                            }}
                            className="flex-1 min-w-0 rounded border-2 border-[#6366f1] px-1.5 py-0.5 text-[11px] text-[#1e293b] outline-none"
                          />
                        ) : (
                          <span
                            onDoubleClick={() => {
                              skipBlur.current = false;
                              setEditingSub({ id: sub.id, texto: sub.texto });
                            }}
                            title="Doble clic para editar"
                            className="flex-1 min-w-0 text-[11.5px] font-medium text-[#283566] truncate cursor-text"
                          >
                            {sub.texto}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => eliminarSubaccion(accion.id, sub.id)}
                          className="w-5 h-5 rounded flex items-center justify-center text-[#dc2626] hover:bg-red-50 shrink-0"
                          title="Eliminar subacción"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}

                    {subInput?.accionId === accion.id && (
                      <li>
                        <input
                          autoFocus
                          value={subInput.texto}
                          placeholder="Escriba una subacción"
                          onChange={e =>
                            setSubInput({ accionId: accion.id, texto: e.target.value })
                          }
                          onBlur={() => {
                            if (skipBlur.current) {
                              skipBlur.current = false;
                              return;
                            }
                            const texto = subInput?.texto.trim() ?? '';
                            if (texto) crearSubaccion(accion.id, texto);
                            else setSubInput(null);
                          }}
                          onKeyDown={e => {
                            const texto = subInput?.texto.trim() ?? '';
                            if (e.key === 'Enter' && texto) {
                              skipBlur.current = true;
                              crearSubaccion(accion.id, texto);
                            }
                            if (e.key === 'Escape') {
                              skipBlur.current = true;
                              setSubInput(null);
                            }
                          }}
                          className="w-full rounded-md border-2 border-[#6366f1] bg-white px-2.5 py-1 text-[11.5px] text-[#1e293b] outline-none"
                        />
                      </li>
                    )}
                  </ul>
                )}

                {/* AVISO DE LÍMITE WIP (FOTO 7: CAJA CON BORDE ROJO) */}
                {avisoAqui && avisoAqui.tipo === 'wip_limit' && (
                  <div className="rounded-md border border-[#ef4444] bg-white px-2.5 py-1.5 flex items-start gap-2 text-[10.5px] text-[#dc2626]">
                    <AlertTriangle className="w-3.5 h-3.5 fill-[#dc2626] text-white mt-0.5 shrink-0" />
                    <div className="leading-snug">
                      <p className="font-extrabold">{avisoAqui.titulo}</p>
                      {avisoAqui.detalle && <p className="italic">{avisoAqui.detalle}</p>}
                    </div>
                  </div>
                )}

                {/* AVISO DE MOVER EN HACIENDO (FOTO 10) O SUBACCIÓN PENDIENTE (FOTO 11) O GENERAL */}
                {avisoAqui && avisoAqui.tipo !== 'wip_limit' && (
                  <div className="px-2 py-1 flex items-start gap-2 text-[10.5px] text-[#dc2626]">
                    <AlertTriangle className="w-4 h-4 fill-[#dc2626] text-white mt-0.5 shrink-0" />
                    <div className="leading-snug">
                      <p className="font-extrabold">{avisoAqui.titulo}</p>
                      {avisoAqui.detalle && <p className="font-semibold">{avisoAqui.detalle}</p>}
                    </div>
                  </div>
                )}

                {!accion && aviso?.id === `hora:${h}` && (
                  <p className="px-2 text-[10.5px] text-[#dc2626] font-bold">{aviso.titulo}</p>
                )}

                {/* MODAL INLINE: CONFIRMAR ELIMINAR GRUPO (FOTO 8) */}
                {accion && confirmDelete === accion.id && (
                  <div className="rounded-lg border border-[#ef4444] bg-white p-3 shadow-sm">
                    <div className="flex items-start gap-2.5">
                      <Trash2 className="w-5 h-5 text-[#dc2626] mt-0.5 shrink-0" />
                      <div className="leading-snug">
                        <p className="font-extrabold text-[12px] text-[#dc2626]">
                          ¿Eliminar este grupo?
                        </p>
                        <p className="text-[11px] text-[#1e293b] mt-0.5">
                          Se eliminarán «{accion.texto_accion}» y sus {subs.length} subacciones.
                        </p>
                      </div>
                    </div>
                    <div className="mt-2.5 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(null)}
                        className="py-1.5 rounded-md border-2 border-[#3730a3] text-[#1e1b4b] text-[11.5px] font-extrabold hover:bg-indigo-50 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => eliminarAccion(accion)}
                        className="py-1.5 rounded-md bg-[#b91c1c] text-white text-[11.5px] font-extrabold hover:bg-[#991b1b] transition-colors"
                      >
                        Eliminar grupo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* PIE DE INSTRUCCIONES */}
      <p className="text-center text-[11px] italic text-[#475569] py-1.5 bg-white border-t border-slate-100 select-none">
        Doble clic: editar · Clic en el estado: avanzar
      </p>
    </div>
  );
};

export default TimeBlockingCard;
