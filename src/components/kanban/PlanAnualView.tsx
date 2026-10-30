import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { api } from '../../services/api';
import { AccionKanban, toISODate } from './types';
import DayPill, { pillColor } from './Pill';

const MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
const WEEK_DAYS = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];

export default function PlanAnualView({ highlightActionId, refreshKey, onConfirm, onBack }: {
  highlightActionId: string | null;
  refreshKey: number;
  onConfirm: (iso: string) => void;
  onBack: () => void;
}) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [detailMonth, setDetailMonth] = useState(new Date().getMonth() + 1);
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

  const countForMonth = (m: number) =>
    items.filter(a => {
      const [y, mm] = (a.fecha_seleccionada || '').split('-').map(Number);
      return y === year && mm === m;
    }).length;

  const detailCells = useMemo(() => {
    const firstDow = (new Date(year, detailMonth - 1, 1).getDay() + 6) % 7;
    const total = new Date(year, detailMonth, 0).getDate();
    const prevTotal = new Date(year, detailMonth - 1, 0).getDate();
    const list: { day: number; iso: string; outside: boolean }[] = [];
    for (let i = firstDow - 1; i >= 0; i--) {
      const d = new Date(year, detailMonth - 2, prevTotal - i);
      list.push({ day: d.getDate(), iso: toISODate(d), outside: true });
    }
    for (let d = 1; d <= total; d++) {
      list.push({ day: d, iso: toISODate(new Date(year, detailMonth - 1, d)), outside: false });
    }
    while (list.length % 7 !== 0) {
      const last = list[list.length - 1];
      const [y, m, dd] = last.iso.split('-').map(Number);
      const dt = new Date(y, m - 1, dd + 1);
      list.push({ day: dt.getDate(), iso: toISODate(dt), outside: true });
    }
    return list;
  }, [year, detailMonth]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {/* Año */}
      <div className="bg-white rounded-xl border border-[#e3e8f5] overflow-hidden">
        <div className="flex items-center gap-2 sm:gap-3 px-4 py-3 border-b border-[#eef1f8] flex-wrap">
          <span className="w-10 h-10 rounded-md border border-[#dbe3f5] flex items-center justify-center">
            <Calendar className="w-5 h-5 text-[#1f6feb]" />
          </span>
          <button type="button" onClick={() => setYear(y => y - 1)} className="w-9 h-9 rounded-lg border border-[#e3e8f5] flex items-center justify-center text-[#101433] hover:bg-gray-50">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-[#101433] text-sm sm:text-base">{year}</span>
          <button type="button" onClick={() => setYear(y => y + 1)} className="w-9 h-9 rounded-lg border border-[#e3e8f5] flex items-center justify-center text-[#101433] hover:bg-gray-50">
            <ChevronRight className="w-5 h-5" />
          </button>
          <span className="w-full sm:w-auto sm:ml-auto text-xs text-[#5b6b8c]">Selecciona otro mes o fecha para cambiar la planificación.</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4">
          {MESES.map((m, i) => {
            const n = countForMonth(i + 1);
            const selected = detailMonth === i + 1;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setDetailMonth(i + 1)}
                className={`rounded-md border p-3 text-center transition-all hover:shadow-md ${
                  selected ? 'border-[#a21caf] bg-[#faf0fd]' : 'border-[#e3e8f5] bg-white hover:border-[#1f6feb]'
                }`}
              >
                <p className={`text-xs font-bold ${selected ? 'text-[#a21caf]' : 'text-[#101433]'}`}>{m}</p>
                <p className="text-xs text-[#5b6b8c] mt-2">
                  {n === 0 ? 'Sin acciones' : n === 1 ? '1 acción' : `${n} acciones`}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detalle mes */}
      <div className="bg-white rounded-md border border-[#e3e8f5] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#eef1f8]">
          <span className="font-bold text-[#101433] text-base sm:text-lg uppercase">
            {MESES[detailMonth - 1]} {year}
          </span>
          <button
            type="button"
            onClick={onBack}
            className="ml-auto flex items-center gap-2 text-sm font-bold text-[#101433] border border-[#e3e8f5] rounded-lg px-3 py-2 hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a Kanban
          </button>
        </div>
        <div className="p-3">
          <div className="grid grid-cols-7 gap-1">
            {WEEK_DAYS.map(d => (
              <div key={d} className="text-center text-[9px] sm:text-[10px] font-bold text-[#101433] py-1.5">{d}</div>
            ))}
            {detailCells.map(c => {
              const dayItems = items.filter(a => a.fecha_seleccionada === c.iso);
              const isHighlight = highlightActionId && dayItems.some(a => a.id === highlightActionId);
              return (
                <button
                  key={c.iso}
                  type="button"
                  onClick={() => onConfirm(c.iso)}
                  className={`min-h-[52px] sm:min-h-[64px] rounded-lg border p-1 text-left transition-all hover:shadow-md ${
                    isHighlight ? 'border-[#a21caf] bg-[#faf0fd]' : 'border-[#e3e8f5] bg-white hover:border-[#1f6feb]'
                  }`}
                >
                  <span className={`text-xs font-bold ${isHighlight ? 'text-[#a21caf]' : c.outside ? 'text-gray-400' : 'text-[#101433]'}`}>
                    {c.day}
                  </span>
                  <div className="mt-0.5 space-y-0.5">
                    {dayItems.slice(0, 2).map(a => (
                      <DayPill key={a.id} title={a.texto_accion} colorIdx={pillColor(a.id)} pending={a.id === highlightActionId} />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
