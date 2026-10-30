import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, X, ChevronLeft, ChevronRight, ChevronDown, CalendarDays, ArrowLeft, GripVertical, AlertCircle, Plus, Trash2, Play, RotateCcw, Lock } from 'lucide-react';
import { api } from '../services/api';
import AppShell, { MonthlyNavKey } from './AppShell';
import { AccionKanban, Subaccion } from './kanban/types';

type Estado = 'Pendiente' | 'Haciendo' | 'Completada';
type Aviso = { id: string; titulo: string; detalle?: string };

const HOURS = Array.from({ length: 16 }, (_, i) => i + 8);

const FONDO_ACCION: Record<Estado, string> = {
  Pendiente: 'bg-[#fdf6f4] border-[#2563eb]',
  Haciendo: 'bg-[#f3efff] border-[#7c3aed]',
  Completada: 'bg-[#edfbf2] border-[#22c55e]',
};

const TEXTO_ESTADO: Record<Estado, string> = {
  Pendiente: 'text-[#2563eb]',
  Haciendo: 'text-[#7c3aed]',
  Completada: 'text-green-600',
};

const COL_GRIP = 'w-5 shrink-0';
const COL_HORA = 'w-[112px] sm:w-[128px] shrink-0';
const COL_ESTADO = 'w-[150px] sm:w-[250px] shrink-0';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDateLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const raw = new Date(y, m - 1, d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(',', '');
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function shiftISO(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + delta);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

function hourOf(a: AccionKanban): number | null {
  if (!a.hora_seleccionada) return null;
  const h = Number(String(a.hora_seleccionada).slice(0, 2));
  return Number.isFinite(h) ? h : null;
}

function errorDe(err: any, fallback: string): string {
  return err?.response?.data?.detail || fallback;
}

function iconoEstado(e: Estado) {
  if (e === 'Completada') {
    return (
      <span className="w-4 h-4 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0">
        <Check className="w-3 h-3" strokeWidth={3} />
      </span>
    );
  }
  if (e === 'Haciendo') return <Play className="w-4 h-4 text-[#7c3aed] fill-[#7c3aed] shrink-0" />;
  return <span className="w-4 h-4 rounded-full border-2 border-[#2563eb] shrink-0" />;
}

interface BoardProps {
  todayStr: string;
  bannerText?: string | null;
  hActionId?: string | null;
  onBackToKanban?: () => void;
  onAfterUndo?: () => void;
}

export const AgendaDiariaBoard: React.FC<BoardProps> = ({
  todayStr,
  bannerText,
  hActionId,
  onBackToKanban,
  onAfterUndo,
}) => {
  const [dateISO, setDateISO] = useState(todayStr);
  const [dayActions, setDayActions] = useState<AccionKanban[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [banner, setBanner] = useState<string | null>(bannerText || null);
  const [bannerActionId, setBannerActionId] = useState<string | null>(hActionId || null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingHour, setEditingHour] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [editingAccion, setEditingAccion] = useState<{ id: string; texto: string } | null>(null);
  const [editingSub, setEditingSub] = useState<{ id: string; texto: string } | null>(null);
  const [subInput, setSubInput] = useState<{ accionId: string; texto: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [dragAccionId, setDragAccionId] = useState<string | null>(null);
  const skipBlur = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.get('/api/acciones-kanban/clasificadas/');
        if (!alive) return;
        const all: AccionKanban[] = res.data || [];
        setDayActions(all.filter(a => a.estado_actual === 'AGENDA_DIARIA' && (a.fecha_seleccionada || dateISO) === dateISO));
      } catch (err) {
        console.error('Error loading day actions:', err);
      }
    })();
    return () => { alive = false; };
  }, [dateISO, refreshKey]);

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

  const sinBloque = useMemo(
    () => dayActions.filter(a => {
      const h = hourOf(a);
      return h === null || !HOURS.includes(h) || placed.get(h) !== a;
    }),
    [dayActions, placed],
  );

  const handleUndo = async () => {
    if (!bannerActionId) {
      setBanner(null);
      return;
    }
    try {
      await api.patch(`/api/acciones-kanban/${bannerActionId}/deshacer/`);
    } catch (err) {
      console.error('Error deshaciendo:', err);
    } finally {
      setBanner(null);
      setBannerActionId(null);
      reload();
      onAfterUndo?.();
    }
  };

  const cambiarEstado = async (accion: AccionKanban, nuevo: Estado) => {
    const subs = accion.subacciones || [];
    if (nuevo === 'Haciendo') {
      const otra = dayActions.find(a => a.id !== accion.id && a.estado === 'Haciendo');
      if (otra) {
        setAviso({
          id: accion.id,
          titulo: 'Ya hay una acción en «Haciendo».',
          detalle: `Finalice «${otra.texto_accion}» para iniciar «${accion.texto_accion}».`,
        });
        return;
      }
    }
    if (nuevo === 'Completada') {
      const pendiente = subs.find(s => s.estado === 'Pendiente');
      if (pendiente) {
        setAviso({
          id: accion.id,
          titulo: 'No se puede completar la acción.',
          detalle: `La subacción «${pendiente.texto}» sigue pendiente.`,
        });
        return;
      }
    }
    try {
      await api.patch(`/api/acciones-kanban/${accion.id}/`, { estado: nuevo });
      setAviso(null);
      reload();
    } catch (err: any) {
      setAviso({ id: accion.id, titulo: errorDe(err, 'No se pudo cambiar el estado.') });
    }
  };

  const moverAccion = async (accion: AccionKanban, hora: number) => {
    if (accion.estado === 'Haciendo') {
      setAviso({
        id: accion.id,
        titulo: 'La acción está en «Haciendo».',
        detalle: 'No puede cambiar de hora ni de día mientras esté en ejecución.',
      });
      return;
    }
    try {
      await api.patch(`/api/acciones-kanban/${accion.id}/`, { hora_seleccionada: `${pad(hora)}:00` });
      setAviso(null);
      reload();
    } catch (err: any) {
      setAviso({ id: accion.id, titulo: errorDe(err, 'No se pudo mover la acción.') });
    }
  };

  const soltarEn = (hora: number) => {
    if (!dragAccionId) return;
    const accion = dayActions.find(a => a.id === dragAccionId);
    setDragAccionId(null);
    if (!accion || hourOf(accion) === hora) return;
    if (occupied.has(hora)) {
      setAviso({ id: `hora:${hora}`, titulo: `Ya hay una acción en el bloque de las ${pad(hora)}:00.` });
      return;
    }
    moverAccion(accion, hora);
  };

  const crearEnAgenda = async (hora: number, texto: string) => {
    try {
      await api.post('/api/acciones-kanban/agenda/', {
        texto_accion: texto,
        fecha_seleccionada: dateISO,
        hora_seleccionada: `${pad(hora)}:00`,
      });
      setAviso(null);
      reload();
    } catch (err: any) {
      setAviso({ id: `hora:${hora}`, titulo: errorDe(err, 'No se pudo crear la acción.') });
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
    try {
      await api.patch(`/api/acciones-kanban/${accion.id}/`, { texto_accion: limpio });
      reload();
    } catch (err: any) {
      setAviso({ id: accion.id, titulo: errorDe(err, 'No se pudo guardar el texto.') });
    }
  };

  const crearSubaccion = async (accionId: string, texto: string) => {
    setSubInput(null);
    try {
      await api.post(`/api/acciones-kanban/${accionId}/subacciones/`, { texto });
      reload();
    } catch (err: any) {
      setAviso({ id: accionId, titulo: errorDe(err, 'No se pudo crear la subacción.') });
    }
  };

  const abrirSubInput = (accionId: string) => {
    skipBlur.current = false;
    setExpanded(prev => ({ ...prev, [accionId]: true }));
    setSubInput({ accionId, texto: '' });
  };

  const guardarSubaccion = async (accion: AccionKanban, sub: Subaccion, texto: string) => {
    setEditingSub(null);
    const limpio = texto.trim();
    if (!limpio || limpio === sub.texto) return;
    try {
      await api.patch(`/api/acciones-kanban/${accion.id}/subacciones/${sub.id}/`, { texto: limpio });
      reload();
    } catch (err: any) {
      setAviso({ id: accion.id, titulo: errorDe(err, 'No se pudo guardar la subacción.') });
    }
  };

  const cambiarSubaccion = async (accion: AccionKanban, sub: Subaccion) => {
    try {
      await api.patch(`/api/acciones-kanban/${accion.id}/subacciones/${sub.id}/`, {
        estado: sub.estado === 'Completada' ? 'Pendiente' : 'Completada',
      });
      reload();
    } catch (err: any) {
      setAviso({ id: accion.id, titulo: errorDe(err, 'No se pudo actualizar la subacción.') });
    }
  };

  const eliminarSubaccion = async (accionId: string, subId: string) => {
    try {
      await api.delete(`/api/acciones-kanban/${accionId}/subacciones/${subId}/`);
      reload();
    } catch (err: any) {
      setAviso({ id: accionId, titulo: errorDe(err, 'No se pudo eliminar la subacción.') });
    }
  };

  const eliminarAccion = async (accion: AccionKanban) => {
    setConfirmDelete(null);
    try {
      await api.delete(`/api/acciones-kanban/${accion.id}/`);
      reload();
    } catch (err: any) {
      setAviso({ id: accion.id, titulo: errorDe(err, 'No se pudo eliminar la acción.') });
    }
  };

  const renderSubacciones = (accion: AccionKanban) => {
    const subs = accion.subacciones || [];
    return (
      <ul className="mt-2 pl-6 space-y-1.5">
        {subs.map(sub => (
          <li key={sub.id} className="flex items-center gap-2 rounded-md bg-white px-2 py-1.5">
            <button
              type="button"
              onClick={() => cambiarSubaccion(accion, sub)}
              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${sub.estado === 'Completada' ? 'bg-green-600 border-green-600 text-white' : 'border-[#2563eb]'}`}
              title={sub.estado === 'Completada' ? 'Marcar como pendiente' : 'Marcar como completada'}
            >
              {sub.estado === 'Completada' && <Check className="w-3 h-3" strokeWidth={3} />}
            </button>
            {editingSub?.id === sub.id ? (
              <input
                autoFocus
                value={editingSub.texto}
                onChange={e => setEditingSub({ id: sub.id, texto: e.target.value })}
                onBlur={() => {
                  if (skipBlur.current) { skipBlur.current = false; return; }
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
                className="flex-1 min-w-0 rounded border border-[#2563eb] px-2 py-0.5 text-[13px] text-[#1d3fbf] outline-none"
              />
            ) : (
              <span
                onDoubleClick={() => { skipBlur.current = false; setEditingSub({ id: sub.id, texto: sub.texto }); }}
                title="Doble clic para editar"
                className={`flex-1 min-w-0 text-[13px] cursor-text ${sub.estado === 'Completada' ? 'text-green-700 line-through' : 'text-[#1d3fbf]'}`}
              >
                {sub.texto}
              </span>
            )}
            <button
              type="button"
              onClick={() => eliminarSubaccion(accion.id, sub.id)}
              className="w-6 h-6 rounded flex items-center justify-center text-red-500 hover:bg-red-50"
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
              onChange={e => setSubInput({ accionId: accion.id, texto: e.target.value })}
              onBlur={() => {
                if (skipBlur.current) { skipBlur.current = false; return; }
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
              className="w-full rounded-md border border-[#7c3aed] bg-white px-3 py-1.5 text-[13px] text-[#1d3fbf] outline-none"
            />
          </li>
        )}
      </ul>
    );
  };

  const renderAccion = (accion: AccionKanban) => {
    const estado = accion.estado as Estado;
    const subs = accion.subacciones || [];
    const completadas = subs.filter(s => s.estado === 'Completada').length;
    const abierto = !!expanded[accion.id] && (subs.length > 0 || subInput?.accionId === accion.id);
    const enEdicion = editingAccion?.id === accion.id;
    const avisoAqui = aviso?.id === accion.id ? aviso : null;

    return (
      <div className={`rounded-md border-l-4 px-3 py-2 ${FONDO_ACCION[estado] || FONDO_ACCION.Pendiente}`}>
        <div className="flex items-center gap-2 min-w-0">
          {subs.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(prev => ({ ...prev, [accion.id]: !prev[accion.id] }))}
              className="text-[#1a2340] shrink-0"
              title={abierto ? 'Ocultar subacciones' : 'Ver subacciones'}
            >
              {abierto ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
          {enEdicion ? (
            <input
              autoFocus
              value={editingAccion?.texto ?? ''}
              onChange={e => setEditingAccion({ id: accion.id, texto: e.target.value })}
              onBlur={() => {
                if (skipBlur.current) { skipBlur.current = false; return; }
                guardarTextoAccion(accion, editingAccion?.texto ?? '');
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') e.currentTarget.blur();
                if (e.key === 'Escape') { skipBlur.current = true; setEditingAccion(null); }
              }}
              className="flex-1 min-w-0 text-[14px] font-semibold text-[#1d3fbf] bg-white rounded px-2 py-1 border border-[#2563eb] outline-none"
            />
          ) : (
            <span
              onClick={() => { if (subs.length > 0) setExpanded(prev => ({ ...prev, [accion.id]: !prev[accion.id] })); }}
              onDoubleClick={() => { skipBlur.current = false; setEditingAccion({ id: accion.id, texto: accion.texto_accion }); }}
              title={subs.length > 0 ? 'Clic para desplegar · Doble clic para editar' : 'Doble clic para editar'}
              className={`flex-1 min-w-0 text-[14px] font-semibold text-[#1d3fbf] truncate select-none ${subs.length > 0 ? 'cursor-pointer' : 'cursor-text'}`}
            >
              {accion.texto_accion}
            </span>
          )}
        </div>

        {subs.length > 0 && (
          <p className="pl-6 mt-0.5 text-[11px] font-semibold text-[#6d28d9]">
            {completadas} de {subs.length} subacciones completadas
          </p>
        )}

        {abierto && renderSubacciones(accion)}

        {avisoAqui && (
          <div className="mt-2 flex items-start gap-2 text-[13px] text-[#dc2626]">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold">{avisoAqui.titulo}</p>
              {avisoAqui.detalle && <p>{avisoAqui.detalle}</p>}
            </div>
          </div>
        )}

        {estado === 'Haciendo' && (
          <div className="mt-2 flex items-start gap-2 text-[13px] text-[#dc2626]">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold">La acción está en «Haciendo».</p>
              <p>No puede cambiar de hora ni de día mientras esté en ejecución.</p>
            </div>
          </div>
        )}

        {confirmDelete === accion.id && (
          <div className="mt-2 rounded-lg border border-[#dc2626] bg-white p-3">
            <div className="flex items-start gap-3">
              <Trash2 className="w-5 h-5 text-[#dc2626] mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-[#dc2626]">¿Eliminar este grupo?</p>
                <p className="text-[13px] text-[#1e2a5a]">
                  Se eliminarán «{accion.texto_accion}» y sus {subs.length} subacciones.
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="py-2 rounded-md border-2 border-[#2563eb] text-[#2563eb] text-[13px] font-bold hover:bg-blue-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => eliminarAccion(accion)}
                className="py-2 rounded-md bg-[#b91c1c] text-white text-[13px] font-bold hover:bg-[#991b1b]"
              >
                Eliminar grupo
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderEstado = (accion: AccionKanban) => {
    const estado = accion.estado as Estado;
    const siguiente: Estado | null = estado === 'Pendiente' ? 'Haciendo' : estado === 'Haciendo' ? 'Completada' : null;
    return (
      <>
        {siguiente ? (
          <button
            type="button"
            onClick={() => cambiarEstado(accion, siguiente)}
            title={siguiente === 'Haciendo' ? 'Clic para iniciar' : 'Clic para completar'}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/70 text-[12px] font-bold tracking-wide ${TEXTO_ESTADO[estado]}`}
          >
            {iconoEstado(estado)}
            <span>{estado}</span>
          </button>
        ) : (
          <span className={`flex items-center gap-1.5 px-2 py-1 text-[12px] font-bold tracking-wide ${TEXTO_ESTADO[estado]}`}>
            {iconoEstado(estado)}
            <span>{estado}</span>
          </span>
        )}
        {estado === 'Haciendo' && (
          <button
            type="button"
            onClick={() => cambiarEstado(accion, 'Pendiente')}
            className="w-7 h-7 rounded-md flex items-center justify-center text-[#7c3aed] hover:bg-purple-50 transition-colors"
            title="Volver a Pendiente"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => abrirSubInput(accion.id)}
          className="w-7 h-7 rounded-md flex items-center justify-center text-[#2563eb] hover:bg-blue-50 transition-colors"
          title="Añadir subacción"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => (accion.subacciones?.length ? setConfirmDelete(accion.id) : eliminarAccion(accion))}
          className="w-7 h-7 rounded-md flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
          title="Eliminar acción"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </>
    );
  };

  return (
    <div>
      {banner && (
        <div className="bg-[#eef4ff] border border-[#d3e1ff] rounded-lg px-4 py-3 mb-4 flex items-center gap-3 flex-wrap">
          <span className="w-8 h-8 rounded-full bg-[#2563eb] flex items-center justify-center shrink-0">
            <Check className="w-5 h-5 text-white" strokeWidth={3} />
          </span>
          <p className="flex-1 min-w-[220px] text-[13px] sm:text-[14px] text-[#1d4ed8]">{banner}</p>
          <button onClick={handleUndo} className="px-5 py-2 rounded-md border border-[#2563eb] text-[#2563eb] text-[12px] font-bold tracking-wide hover:bg-[#2563eb] hover:text-white transition-colors">
            DESHACER
          </button>
          <button onClick={() => { setBanner(null); setBannerActionId(null); }} className="text-[#1e3a8a] hover:text-black">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="bg-white border border-[#e3e9f4] rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-3 sm:px-4 py-3 border-b border-[#eef1f6] flex-wrap">
          <span className="w-9 h-9 rounded-md border border-[#d3e1ff] bg-[#eef4ff] flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-[#2563eb]" />
          </span>
          <button onClick={() => setDateISO(shiftISO(dateISO, -1))} className="w-9 h-9 rounded-md border border-[#e3e9f4] flex items-center justify-center hover:bg-slate-50 text-[#1e2a5a]">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-[#1a2340] text-[13px] sm:text-[15px] tracking-wide px-1">{formatDateLong(dateISO)}</span>
          <button onClick={() => setDateISO(shiftISO(dateISO, 1))} className="w-9 h-9 rounded-md border border-[#e3e9f4] flex items-center justify-center hover:bg-slate-50 text-[#1a2340]">
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          {onBackToKanban && (
            <button onClick={onBackToKanban} className="flex items-center gap-2 px-3 py-2 rounded-md border border-[#e3e9f4] text-[#1a2340] text-[13px] font-semibold hover:bg-slate-50">
              <ArrowLeft className="w-4 h-4" /> Volver a Kanban
            </button>
          )}
        </div>

        {sinBloque.length > 0 && (
          <div className="px-3 sm:px-4 py-3 bg-[#fff8ec] border-b border-[#f3e3bf]">
            <p className="text-[12px] font-bold text-[#92400e] mb-2">
              Acciones sin bloque horario. Asigna una hora para que entren en la agenda.
            </p>
            <ul className="space-y-2">
              {sinBloque.map(a => (
                <li key={a.id} className="flex items-center gap-3 flex-wrap">
                  <span className="flex-1 min-w-[180px] text-[14px] font-semibold text-[#1d3fbf]">{a.texto_accion}</span>
                  <select
                    value=""
                    onChange={e => { if (e.target.value) moverAccion(a, Number(e.target.value)); }}
                    className="rounded-md border border-[#e3e9f4] bg-white px-2 py-1.5 text-[13px] outline-none"
                  >
                    <option value="">Asignar hora…</option>
                    {HOURS.filter(h => !occupied.has(h)).map(h => (
                      <option key={h} value={h}>{pad(h)}:00 – {pad((h + 1) % 24)}:00</option>
                    ))}
                  </select>
                  {aviso?.id === a.id && <span className="text-[12px] text-[#dc2626]">{aviso.titulo}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 bg-[#fdf6f4] border-b border-[#e3e9f4] text-[11px] font-bold tracking-wider text-[#b8a090] uppercase">
          <div className={COL_GRIP} />
          <div className={COL_HORA}>Hora</div>
          <div className="flex-1">Acción</div>
          <div className={`${COL_ESTADO} text-center`}>Estado</div>
        </div>

        <div className="px-2 sm:px-4 py-1">
          {HOURS.map(h => {
            const label = `${pad(h)}:00 – ${pad((h + 1) % 24)}:00`;
            const accion = placed.get(h) || null;
            const enEjecucion = accion?.estado === 'Haciendo';

            return (
              <div
                key={h}
                onDragOver={e => e.preventDefault()}
                onDrop={() => soltarEn(h)}
                className="flex items-start gap-2 sm:gap-3 py-2 border-b border-dashed border-[#eef1f6] last:border-0"
              >
                <div className={`${COL_GRIP} pt-3 flex justify-center`}>
                  {accion && !enEjecucion && (
                    <span
                      draggable
                      onDragStart={e => { e.dataTransfer.setData('text/plain', accion.id); setDragAccionId(accion.id); }}
                      onDragEnd={() => setDragAccionId(null)}
                      className="cursor-grab text-slate-400 hover:text-slate-600"
                      title="Arrastra para cambiar de bloque"
                    >
                      <GripVertical className="w-4 h-4" />
                    </span>
                  )}
                  {accion && enEjecucion && (
                    <span className="text-[#7c3aed]" title="En ejecución: no se puede mover">
                      <Lock className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>

                <div className={`${COL_HORA} pt-2.5 font-bold text-[#1a2340] text-[12px] sm:text-[14px] whitespace-nowrap`}>{label}</div>

                <div className="flex-1 min-w-0">
                  {accion ? (
                    renderAccion(accion)
                  ) : editingHour === h ? (
                    <input
                      autoFocus
                      value={draft}
                      onChange={e => setDraft(e.target.value)}
                      onBlur={() => { if (skipBlur.current) { skipBlur.current = false; return; } terminarEdicionHora(h, true); }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { skipBlur.current = true; terminarEdicionHora(h, true); }
                        if (e.key === 'Escape') { skipBlur.current = true; terminarEdicionHora(h, false); }
                      }}
                      placeholder="Escriba una acción"
                      className="w-full rounded-md border border-[#2563eb] px-3 py-2 text-[14px] outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => iniciarEdicionHora(h)}
                      className="w-full h-9 rounded-md px-2 text-left text-[13px] italic text-slate-400 hover:bg-slate-50 transition-colors"
                    >
                      + Escriba una acción
                    </button>
                  )}
                  {!accion && aviso?.id === `hora:${h}` && (
                    <p className="mt-1 text-[13px] text-[#dc2626] font-bold">{aviso.titulo}</p>
                  )}
                </div>

                <div className={`${COL_ESTADO} flex items-center justify-end gap-1 pt-1.5`}>
                  {accion && renderEstado(accion)}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-[12px] italic text-[#5b6b8c] pb-3">
          Doble clic: editar · Clic en el estado: avanzar
        </p>
      </div>
    </div>
  );
};

interface AgendaDiariaProps {
  todayStr: string;
  username?: string;
  avatarUrl?: string;
  onNavigate?: (key: MonthlyNavKey) => void;
  hActionId?: string | null;
  bannerText?: string | null;
  onClose: () => void;
  onBackToKanban?: () => void;
  onOpenHelp?: () => void;
  onOpenNotifications?: () => void;
  onOpenSettings?: () => void;
}

export const AgendaDiaria: React.FC<AgendaDiariaProps> = ({
  todayStr,
  username,
  avatarUrl,
  onNavigate,
  hActionId,
  bannerText,
  onClose,
  onBackToKanban,
  onOpenHelp,
  onOpenNotifications,
  onOpenSettings,
}) => (
  <AppShell
    activeNav="diaria"
    title="DIARIA - TIME BLOCKING"
    subtitle="Organiza tu jornada en bloques de una hora."
    username={username}
    avatarUrl={avatarUrl}
    onNavigate={onNavigate}
    onClose={onClose}
    onOpenHelp={onOpenHelp}
    onOpenNotifications={onOpenNotifications}
    onOpenSettings={onOpenSettings}
  >
    <AgendaDiariaBoard
      todayStr={todayStr}
      hActionId={hActionId}
      bannerText={bannerText}
      onBackToKanban={onBackToKanban}
    />
  </AppShell>
);

export default AgendaDiaria;
