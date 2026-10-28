import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { api } from '../../services/api';
import { AccionKanban, toISODate } from './types';
import DayPill, { pillColor } from './Pill';

const DIAS = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];
const MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
const MESES_CAP = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function mondayOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dow);
  return x;
}

export default function PlanSemanalView({ highlightActionId, refreshKey, onConfirm, onBack }: {
  highlightActionId: string | null;
  refreshKey: number;
  onConfirm: (iso: string) => void;
  onBack: () => void;
}) {
  const [weekOffset, setWeekOffset] = useState(0);
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

  const monday = useMemo(() => {
    const m = mondayOfWeek(new Date());
    m.setDate(m.getDate() + weekOffset * 7);
    return m;
  }, [weekOffset]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  }), [monday]);

  const first = days[0];
  const last = days[6];
  const rangeLabel = `${first.getDate()} – ${last.getDate()} DE ${MESES[last.getMonth()]}`;

  return (
    <div>
      <div className="bg-white rounded-2xl border border-[#e3e8f5] overflow-hidden">
        <div className="flex items-center gap-2 sm:gap-3 px-4 py-3 border-b border-[#eef1f8] flex-wrap">
          <span className="w-10 h-10 rounded-xl border border-[#dbe3f5] flex items-center justify-center">
            <Calendar className="w-5 h-5 text-[#1f6feb]" />
          </span>
          <button type="button" onClick={() => setWeekOffset(o => o - 1)} className="w-9 h-9 rounded-lg border border-[#e3e8f5] flex items-center justify-center text-[#101433] hover:bg-gray-50">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-black text-[#101433] text-sm sm:text-base uppercase">{rangeLabel}</span>
          <button type="button" onClick={() => setWeekOffset(o => o + 1)} className="w-9 h-9 rounded-lg border border-[#e3e8f5] flex items-center justify-center text-[#101433] hover:bg-gray-50">
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
        <p className="px-4 pt-2 text-sm text-[#5b6b8c]">Selecciona un día para planificar tus acciones.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 p-4">
          {days.map((d, i) => {
            const iso = toISODate(d);
            const dayItems = items.filter(a => a.fecha_seleccionada === iso);
            const isHighlightDay = highlightActionId && dayItems.some(a => a.id === highlightActionId);
            return (
              <button
                key={iso}
                type="button"
                onClick={() => onConfirm(iso)}
                className={`rounded-xl border p-2 min-h-[140px] text-left transition-all hover:shadow-md ${
                  isHighlightDay
                    ? 'border-2 border-[#a21caf] bg-[#faf0fd] shadow-md'
                    : 'border-[#e3e8f5] bg-white hover:border-[#1f6feb]'
                }`}
              >
                <p className={`text-center text-[11px] font-black ${isHighlightDay ? 'text-[#a21caf]' : 'text-[#101433]'}`}>{DIAS[i]}</p>
                <p className={`text-center text-2xl font-black ${isHighlightDay ? 'text-[#a21caf]' : 'text-[#101433]'}`}>{d.getDate()}</p>
                <div className="mt-2 space-y-1.5">
                  {dayItems.map(a => (
                    <DayPill
                      key={a.id}
                      title={a.texto_accion}
                      colorIdx={pillColor(a.id)}
                      pending={a.id === highlightActionId}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
        <p className="px-4 pb-3 text-[11px] text-[#8a93b2]">Semana del {first.getDate()} de {MESES_CAP[first.getMonth()]} al {last.getDate()} de {MESES_CAP[last.getMonth()]} de {last.getFullYear()}.</p>
      </div>
    </div>
  );
}
