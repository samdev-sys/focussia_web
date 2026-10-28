import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ArrowLeft, GripVertical, Info } from 'lucide-react';
import { api, TimeBlockData } from '../../services/api';
import { AccionKanban, formatLongDate, parseISODate, toISODate } from './types';
import { ConfirmBanner } from './Notice';

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

function fmtHour(h: number): string {
  return `${String(h).padStart(2, '0')}:00`;
}

export default function AgendaDiariaView({ date, focusId, banner, onDateChange, onBack, onUndoBanner, onDismissBanner, onPin, onMoveHour }: {
  date: string;
  focusId: string | null;
  banner: string | null;
  onDateChange: (iso: string) => void;
  onBack: () => void;
  onUndoBanner: () => void;
  onDismissBanner: () => void;
  onPin: (accion: AccionKanban, hour: number) => void;
  onMoveHour: (accion: AccionKanban, hour: number) => void;
}) {
  const [blocks, setBlocks] = useState<TimeBlockData[]>([]);
  const [dayActions, setDayActions] = useState<AccionKanban[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [tbRes, clsRes] = await Promise.all([
          api.get('/api/time-blocks/'),
          api.get('/api/acciones-kanban/clasificadas/'),
        ]);
        if (!alive) return;
        const allBlocks: TimeBlockData[] = tbRes.data || [];
        setBlocks(allBlocks.filter(b => b.fecha === date));
        const allCls: AccionKanban[] = clsRes.data || [];
        setDayActions(allCls.filter(a => a.estado_actual === 'AGENDA_DIARIA' && (a.fecha_seleccionada || date) === date));
      } catch (err) {
        console.error('Error loading agenda diaria:', err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [date, focusId]);

  const hourOf = (a: AccionKanban): number | null => {
    if (!a.hora_seleccionada) return null;
    const h = Number(String(a.hora_seleccionada).slice(0, 2));
    return Number.isFinite(h) ? h : null;
  };

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
    for (const b of blocks) {
      if (b.tarea && b.tarea.trim()) set.add(b.hora);
    }
    for (const h of placed.keys()) set.add(h);
    return set;
  }, [blocks, placed]);

  const focus = focusId ? dayActions.find(a => a.id === focusId) || null : null;
  const floatAction = useMemo(() => {
    const pool = focus ? [focus, ...dayActions.filter(a => a.id !== focus.id)] : dayActions;
    return pool.find(a => !a.es_fijo && hourOf(a) === null) || null;
  }, [focus, dayActions]);

  const floatHour = useMemo(() => {
    if (!floatAction) return null;
    for (const h of HOURS) {
      if (!occupied.has(h)) return h;
    }
    return HOURS[HOURS.length - 1];
  }, [floatAction, occupied]);

  const stepDay = (delta: number) => {
    const d = parseISODate(date);
    d.setDate(d.getDate() + delta);
    onDateChange(toISODate(d));
  };

  const blockAt = (h: number) => blocks.find(b => b.hora === h && b.tarea && b.tarea.trim());

  return (
    <div>
      {banner && (
        <ConfirmBanner text={banner} onUndo={onUndoBanner} onClose={onDismissBanner} />
      )}

      <div className="bg-white rounded-2xl border border-[#e3e8f5] overflow-hidden">
        <div className="flex items-center gap-2 sm:gap-3 px-4 py-3 border-b border-[#eef1f8] flex-wrap">
          <span className="w-10 h-10 rounded-xl border border-[#dbe3f5] flex items-center justify-center">
            <Calendar className="w-5 h-5 text-[#1f6feb]" />
          </span>
          <button type="button" onClick={() => stepDay(-1)} className="w-9 h-9 rounded-lg border border-[#e3e8f5] flex items-center justify-center text-[#101433] hover:bg-gray-50">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-black text-[#101433] text-sm sm:text-base uppercase">
            {formatLongDate(date)}
          </span>
          <button type="button" onClick={() => stepDay(1)} className="w-9 h-9 rounded-lg border border-[#e3e8f5] flex items-center justify-center text-[#101433] hover:bg-gray-50">
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onBack}
            className="ml-auto flex items-center gap-2 text-sm font-bold text-[#101433] border border-[#e3e8f5] rounded-lg px-3 py-2 hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a Kanban
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 text-center py-10">Cargando agenda...</p>
        ) : (
          <div className="divide-y divide-dashed divide-[#e8edf7]">
            {HOURS.map(h => {
              const isFloatRow = !!floatAction && floatHour === h;
              const placedAction = !isFloatRow ? placed.get(h) : undefined;
              const block = !placedAction && !isFloatRow ? blockAt(h) : undefined;
              return (
                <div
                  key={h}
                  onDragOver={e => { if (dragId) e.preventDefault(); }}
                  onDrop={() => {
                    if (!dragId) return;
                    const a = dayActions.find(x => x.id === dragId);
                    if (a) onMoveHour(a, h);
                    setDragId(null);
                  }}
                  className="grid grid-cols-[64px_1fr] sm:grid-cols-[88px_1fr] items-stretch"
                >
                  <div className="py-3 pr-2 text-right font-black text-[#101433] text-sm sm:text-base border-r border-[#eef1f8]">
                    {fmtHour(h)}
                  </div>
                  <div className="py-1.5 pl-3 pr-3">
                    {placedAction && (
                      <button
                        type="button"
                        onDoubleClick={() => onPin(placedAction, h)}
                        title="Doble clic para fijar"
                        className={`w-full text-left rounded-lg px-3 py-2 text-sm sm:text-base font-medium border-l-4 ${
                          placedAction.es_fijo
                            ? 'bg-[#e8f0ff] text-[#101433] border-[#1f6feb]'
                            : 'bg-white border-[#1f6feb] text-[#101433] shadow'
                        }`}
                      >
                        <span className="inline-flex items-center gap-2 w-full">
                          <span className="w-7 h-7 rounded-full bg-[#1f6feb] text-white text-xs font-black inline-flex items-center justify-center">H</span>
                          {placedAction.texto_accion}
                          {placedAction.es_fijo && (
                            <span className="ml-auto text-[10px] font-black bg-[#1f6feb] text-white px-2.5 py-1 rounded-full">FIJADA</span>
                          )}
                        </span>
                      </button>
                    )}
                    {isFloatRow && floatAction && (
                      <div
                        draggable
                        onDragStart={() => setDragId(floatAction.id)}
                        onDragEnd={() => setDragId(null)}
                        onDoubleClick={() => onPin(floatAction, h)}
                        title="Doble clic para fijar · Arrastra para cambiar de horario"
                        className="rounded-xl border-2 border-[#1f6feb] bg-white px-3 py-2 shadow-md cursor-grab active:cursor-grabbing"
                      >
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-[#8a93b2]" />
                          <span className="w-8 h-8 rounded-full bg-[#1f6feb] text-white text-sm font-black flex items-center justify-center">H</span>
                          <span className="flex-1 font-bold text-[#101433] text-sm sm:text-base">{floatAction.texto_accion}</span>
                          <span className="text-[10px] font-black text-[#1f6feb] bg-[#e3edff] px-2.5 py-1 rounded-full">SIN FIJAR</span>
                        </div>
                      </div>
                    )}
                    {!placedAction && !isFloatRow && block && (
                      <div className="rounded-lg bg-[#f2f5fc] px-3 py-2 text-sm sm:text-base text-[#101433] border-l-4 border-[#c7d3ee]">
                        {block.tarea}
                      </div>
                    )}
                    {!placedAction && !isFloatRow && !block && <div className="h-9" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {floatAction && (
        <p className="mt-3 flex items-center gap-2 text-xs text-[#5b6b8c]">
          <Info className="w-4 h-4 text-[#101433]" fill="currentColor" color="#fff" />
          <span><b>Doble clic para fijar.</b><br />Arrastra para cambiar de horario.</span>
        </p>
      )}
      {placed.size > 0 && !floatAction && (
        <p className="mt-3 flex items-center gap-2 text-xs text-[#5b6b8c]">
          <Info className="w-4 h-4 text-[#101433]" fill="currentColor" color="#fff" />
          <span>Arrastra para cambiar el horario.</span>
        </p>
      )}
    </div>
  );
}
