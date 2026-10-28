import React, { useEffect, useMemo, useState } from 'react';
import { Check, X, ChevronLeft, ChevronRight, CalendarDays, ArrowLeft, GripVertical } from 'lucide-react';
import { api, TimeBlockData } from '../services/api';
import AppShell, { MonthlyNavKey } from './AppShell';
import { AccionKanban } from './kanban/types';

interface AgendaDiariaProps {
  timeBlocks: TimeBlockData[];
  todayStr: string;
  username?: string;
  avatarUrl?: string;
  onNavigate?: (key: MonthlyNavKey) => void;
  hActionId?: string | null;
  bannerText?: string | null;
  onClose: () => void;
  onBackToKanban?: () => void;
  onSaveBlock: (hora: number, tarea: string) => void;
}

type SlotColor = 'blue' | 'green' | 'purple' | 'pink';

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

const colorStyles: Record<SlotColor, string> = {
  blue: 'bg-[#eef2ff] border-l-[#2563eb] text-[#1e2a5a]',
  green: 'bg-[#edfbf2] border-l-[#22c55e] text-[#1e2a5a]',
  purple: 'bg-[#efedff] border-l-[#7c3aed] text-[#1e2a5a]',
  pink: 'bg-[#fdf0f7] border-l-[#ec4899] text-[#1e2a5a]',
};

function formatDateLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
}

function shiftISO(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + delta);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function colorForTask(tarea: string): SlotColor {
  if (/almuerzo|comida|desayuno|cena/i.test(tarea)) return 'green';
  if (/familia|hijo|hogar/i.test(tarea)) return 'pink';
  if (/revisar|documento|informe/i.test(tarea)) return 'purple';
  return 'blue';
}

function hourOf(a: AccionKanban): number | null {
  if (!a.hora_seleccionada) return null;
  const h = Number(String(a.hora_seleccionada).slice(0, 2));
  return Number.isFinite(h) ? h : null;
}

export const AgendaDiaria: React.FC<AgendaDiariaProps> = ({
  timeBlocks,
  todayStr,
  username,
  avatarUrl,
  onNavigate,
  hActionId,
  bannerText,
  onClose,
  onBackToKanban,
  onSaveBlock,
}) => {
  const [dateISO, setDateISO] = useState(todayStr);
  const [editingHour, setEditingHour] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [dragHour, setDragHour] = useState<number | null>(null);
  const [dragActionId, setDragActionId] = useState<string | null>(null);
  const [dayActions, setDayActions] = useState<AccionKanban[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [banner, setBanner] = useState<string | null>(bannerText || null);
  const [bannerActionId, setBannerActionId] = useState<string | null>(hActionId || null);

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

  const blocksByHour = useMemo(() => {
    const map = new Map<number, TimeBlockData>();
    for (const b of timeBlocks) {
      if (b.fecha === dateISO && b.tarea && b.tarea.trim() && !map.has(b.hora)) map.set(b.hora, b);
    }
    return map;
  }, [timeBlocks, dateISO]);

  const placed = useMemo(() => {
    const map = new Map<number, AccionKanban>();
    for (const a of dayActions) {
      const h = hourOf(a);
      if (h !== null && HOURS.includes(h) && !map.has(h)) map.set(h, a);
    }
    return map;
  }, [dayActions]);

  const occupied = useMemo(() => {
    const set = new Set<number>();
    for (const h of blocksByHour.keys()) set.add(h);
    for (const h of placed.keys()) set.add(h);
    return set;
  }, [blocksByHour, placed]);

  const floatAction = useMemo(() => {
    const pool = bannerActionId ? [...dayActions].sort((x, y) => (x.id === bannerActionId ? -1 : y.id === bannerActionId ? 1 : 0)) : dayActions;
    return pool.find(a => !a.es_fijo && hourOf(a) === null) || null;
  }, [dayActions, bannerActionId]);

  const floatHour = useMemo(() => {
    if (!floatAction) return null;
    for (const h of HOURS) {
      if (!occupied.has(h)) return h;
    }
    return HOURS[HOURS.length - 1];
  }, [floatAction, occupied]);

  const startEdit = (hora: number, current: string) => {
    setEditingHour(hora);
    setDraft(current);
  };

  const commitEdit = (hora: number) => {
    onSaveBlock(hora, draft.trim());
    setEditingHour(null);
  };

  const handlePin = async (accion: AccionKanban, hour: number) => {
    try {
      await api.patch(`/api/acciones-kanban/${accion.id}/fijar/`);
      setRefreshKey(r => r + 1);
      const hh = String(hour).padStart(2, '0');
      setBanner(`Acción fijada correctamente a las ${hh}:00.`);
      setBannerActionId(accion.id);
    } catch (err) {
      console.error('Error fijando:', err);
    }
  };

  const handleMoveAction = async (accion: AccionKanban, hour: number) => {
    try {
      const hh = `${String(hour).padStart(2, '0')}:00`;
      await api.patch(`/api/acciones-kanban/${accion.id}/`, { hora_seleccionada: hh });
      setRefreshKey(r => r + 1);
    } catch (err) {
      console.error('Error moviendo:', err);
    }
  };

  const handleUndo = async () => {
    if (!bannerActionId) {
      setBanner(null);
      return;
    }
    try {
      await api.patch(`/api/acciones-kanban/${bannerActionId}/deshacer/`);
      setRefreshKey(r => r + 1);
    } catch (err) {
      console.error('Error deshaciendo:', err);
    } finally {
      setBanner(null);
      setBannerActionId(null);
    }
  };

  const handleDropAction = (targetHora: number) => {
    if (!dragActionId) return;
    const a = dayActions.find(x => x.id === dragActionId);
    if (a) handleMoveAction(a, targetHora);
    setDragActionId(null);
  };

  const handleDropBlock = (targetHora: number) => {
    if (dragHour === null || dragHour === targetHora) {
      setDragHour(null);
      return;
    }
    const moved = blocksByHour.get(dragHour)?.tarea || '';
    if (!moved) {
      setDragHour(null);
      return;
    }
    onSaveBlock(targetHora, moved);
    onSaveBlock(dragHour, '');
    setDragHour(null);
  };

  return (
    <AppShell
      activeNav="diaria"
      title="AGENDA DIARIA"
      subtitle="Organiza tus acciones en bloques de tiempo."
      username={username}
      avatarUrl={avatarUrl}
      onNavigate={onNavigate}
      onClose={onClose}
    >
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
          <button onClick={onBackToKanban} className="flex items-center gap-2 px-3 py-2 rounded-md border border-[#e3e9f4] text-[#1a2340] text-[13px] font-semibold hover:bg-slate-50">
            <ArrowLeft className="w-4 h-4" /> Volver a Kanban
          </button>
        </div>

        <div className="px-2 sm:px-6 py-2">
          {HOURS.map((h) => {
            const isFloatRow = !!floatAction && floatHour === h;
            const placedAction = !isFloatRow ? placed.get(h) : undefined;
            const block = !placedAction && !isFloatRow ? blocksByHour.get(h) : undefined;
            const label = h < 10 ? `0${h}:00` : `${h}:00`;
            return (
              <div key={h} className="flex items-stretch gap-2 sm:gap-4 min-h-[52px] border-b border-dashed border-[#eef1f6] last:border-0 py-1.5">
                <div className="w-[62px] sm:w-[88px] shrink-0 flex items-start justify-end pt-2">
                  <span className="font-bold text-[#1a2340] text-[13px] sm:text-[15px]">{label}</span>
                </div>
                <div
                  className="flex-1 min-w-0"
                  onDragOver={(e) => { if (dragActionId !== null || dragHour !== null) e.preventDefault(); }}
                  onDrop={() => { if (dragActionId) handleDropAction(h); else handleDropBlock(h); }}
                >
                  {placedAction && (
                    <button
                      type="button"
                      onDoubleClick={() => handlePin(placedAction, h)}
                      title="Doble clic para fijar"
                      className={`w-full text-left rounded-md px-4 py-2.5 border-l-4 cursor-pointer hover:brightness-[0.98] ${placedAction.es_fijo ? 'bg-[#e8f0ff] border-[#2563eb] text-[#1e2a5a]' : 'bg-white border-[#2563eb] text-[#1e2a5a] shadow'}`}
                    >
                      <span className="inline-flex items-center gap-2 w-full">
                        <span className="w-7 h-7 rounded-full bg-[#2563eb] text-white text-xs font-black inline-flex items-center justify-center">H</span>
                        <span className="flex-1 text-[14px] font-medium truncate">{placedAction.texto_accion}</span>
                        {placedAction.es_fijo && (
                          <span className="text-[11px] font-bold bg-[#2563eb] text-white px-3 py-1 rounded-full">FIJADA</span>
                        )}
                      </span>
                    </button>
                  )}
                  {isFloatRow && floatAction && (
                    <div
                      draggable
                      onDragStart={() => setDragActionId(floatAction.id)}
                      onDragEnd={() => setDragActionId(null)}
                      onDoubleClick={() => handlePin(floatAction, h)}
                      title="Doble clic para fijar · Arrastra para cambiar de horario"
                      className="rounded-md border border-[#2563eb] bg-white px-3 py-2.5 flex items-center gap-2 cursor-grab active:cursor-grabbing shadow-[0_4px_16px_rgba(37,99,235,0.18)]"
                    >
                      <GripVertical className="w-4 h-4 text-[#2563eb] shrink-0" />
                      <span className="w-8 h-8 rounded-full bg-[#2563eb] text-white font-black flex items-center justify-center text-sm shrink-0">H</span>
                      <span className="flex-1 font-bold text-[#111c44] text-[14px] truncate">{floatAction.texto_accion}</span>
                      <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#dbe7ff] text-[#2563eb]">SIN FIJAR</span>
                    </div>
                  )}
                  {!placedAction && !isFloatRow && block && (
                    editingHour === h ? (
                      <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => { onSaveBlock(h, draft.trim()); setEditingHour(null); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { onSaveBlock(h, draft.trim()); setEditingHour(null); } if (e.key === 'Escape') setEditingHour(null); }}
                        onClick={(e) => e.stopPropagation()} placeholder="Escribe la acción..."
                        className={`w-full rounded-md border-l-4 px-4 py-2.5 text-[14px] font-medium bg-white border-[#e3e9f4] outline-none ${colorStyles[colorForTask(block.tarea)]}`} />
                    ) : (
                      <div
                        draggable
                        onDragStart={() => setDragHour(h)}
                        onClick={() => { setEditingHour(h); setDraft(block.tarea); }}
                        className={`rounded-md border-l-4 px-4 py-2.5 cursor-pointer hover:brightness-[0.98] ${colorStyles[colorForTask(block.tarea)]} ${dragHour === h ? 'opacity-40' : ''}`}
                        title="Arrastra para cambiar de horario"
                      >
                        <span className="text-[14px] font-medium block truncate">{block.tarea}</span>
                      </div>
                    )
                  )}
                  {!placedAction && !isFloatRow && !block && (
                    editingHour === h ? (
                      <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => { onSaveBlock(h, draft.trim()); setEditingHour(null); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { onSaveBlock(h, draft.trim()); setEditingHour(null); } if (e.key === 'Escape') setEditingHour(null); }}
                        onClick={(e) => e.stopPropagation()} placeholder="Escribe la acción..."
                        className="w-full rounded-md border border-[#e3e9f4] px-4 py-2.5 text-[14px] outline-none" />
                    ) : (
                      <button onClick={() => { setEditingHour(h); setDraft(''); }} className="w-full h-[42px] rounded-md hover:bg-slate-50 text-transparent hover:text-slate-300 text-left px-4 text-[13px] transition-colors">+</button>
                    )
                  )}
                </div>
                {isFloatRow && floatAction && (
                  <div className="hidden md:flex items-start gap-2 pt-1 pr-2 w-[230px] shrink-0">
                    <span className="w-5 h-5 rounded-full bg-[#0b1023] text-white flex items-center justify-center text-[12px] font-bold mt-0.5">i</span>
                    <p className="text-[12px] leading-tight text-[#1a2340]">
                      <span className="text-[#2563eb] font-semibold">Doble clic para fijar</span>
                      <br />
                      <span className="text-[#5b6b8c]">Arrastra para cambiar de horario</span>
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
};

export default AgendaDiaria;
