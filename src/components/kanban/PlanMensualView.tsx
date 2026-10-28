import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { api } from '../../services/api';
import { AccionKanban, toISODate } from './types';
import DayPill, { pillColor } from './Pill';

const WEEK_DAYS = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];
const MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

export default function PlanMensualView({ highlightActionId, refreshKey, onConfirm, onBack }: {
  highlightActionId: string | null;
  refreshKey: number;
  onConfirm: (iso: string) => void;
  onBack: () => void;
}) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [items, setItems] = useState<AccionKanban[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.get('/api/acciones-kanban/clasificadas/');
        if (alive) setItems((res.data || []).filter((a: AccionKanban) => a.fecha_seleccionada));
      } catch (err) {
        console.error('Error loading planned actions:', err);
      }
    })();
    return () => { alive = false; };
  }, [refreshKey]);

  const stepMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    while (m < 1) { m += 12; y -= 1; }
    while (m > 12) { m -= 12; y += 1; }
    setMonth(m);
    setYear(y);
  };

  const cells = useMemo(() => {
    const firstDow = (new Date(year, month - 1, 1).getDay() + 6) % 7;
    const total = new Date(year, month, 0).getDate();
    const prevTotal = new Date(year, month - 1, 0).getDate();
    const list: { day: number; iso: string; outside: boolean }[] = [];
    for (let i = firstDow - 1; i >= 0; i--) {
      const d = new Date(year, month - 2, prevTotal - i);
      list.push({ day: d.getDate(), iso: toISODate(d), outside: true });
    }
    for (let d = 1; d <= total; d++) {
      const dt = new Date(year, month - 1, d);
      list.push({ day: d, iso: toISODate(dt), outside: false });
    }
    while (list.length % 7 !== 0) {
      const last = list[list.length - 1];
      const [y, m, dd] = last.iso.split('-').map(Number);
      const dt = new Date(y, m - 1, dd + 1);
      list.push({ day: dt.getDate(), iso: toISODate(dt), outside: true });
    }
    return list;
  }, [month, year]);

  return (
    <div className="bg-white rounded-2xl border border-[#e3e8f5] overflow-hidden">
      <div className="flex items-center gap-2 sm:gap-3 px-4 py-3 border-b border-[#eef1f8] flex-wrap">
        <span className="w-10 h-10 rounded-xl border border-[#dbe3f5] flex items-center justify-center">
          <Calendar className="w-5 h-5 text-[#1f6feb]" />
        </span>
        <button type="button" onClick={() => stepMonth(-1)} className="w-9 h-9 rounded-lg border border-[#e3e8f5] flex items-center justify-center text-[#101433] hover:bg-gray-50">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-black text-[#101433] text-sm sm:text-base uppercase">{MESES[month - 1]} {year}</span>
        <button type="button" onClick={() => stepMonth(1)} className="w-9 h-9 rounded-lg border border-[#e3e8f5] flex items-center justify-center text-[#101433] hover:bg-gray-50">
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
      <p className="px-4 pt-2 text-sm text-[#5b6b8c]">Selecciona otra fecha para cambiar la planificación.</p>
      <div className="p-4">
        <div className="grid grid-cols-7 gap-1.5">
          {WEEK_DAYS.map(d => (
            <div key={d} className="text-center text-[10px] sm:text-xs font-black text-[#101433] border border-[#e3e8f5] rounded-lg py-2 bg-white">
              {d}
            </div>
          ))}
          {cells.map(c => {
            const dayItems = items.filter(a => a.fecha_seleccionada === c.iso);
            const isHighlight = highlightActionId && dayItems.some(a => a.id === highlightActionId);
            return (
              <button
                key={c.iso}
                type="button"
                onClick={() => onConfirm(c.iso)}
                className={`min-h-[72px] sm:min-h-[88px] rounded-lg border p-1.5 text-left transition-all hover:shadow-md ${
                  isHighlight
                    ? 'border-2 border-[#a21caf] bg-[#faf0fd] shadow-md'
                    : 'border-[#e3e8f5] bg-white hover:border-[#1f6feb]'
                } ${c.outside ? 'opacity-60' : ''}`}
              >
                <span className={`font-black ${isHighlight ? 'text-[#a21caf] text-base' : c.outside ? 'text-gray-400 text-sm' : 'text-[#101433] text-sm'}`}>
                  {c.day}
                </span>
                <div className="mt-1 space-y-1">
                  {dayItems.map(a => (
                    <DayPill key={a.id} title={a.texto_accion} colorIdx={pillColor(a.id)} pending={a.id === highlightActionId} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
