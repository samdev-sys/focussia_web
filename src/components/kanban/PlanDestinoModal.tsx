import React from 'react';
import { X, CalendarDays, CalendarRange, CalendarClock } from 'lucide-react';
import { AccionKanban } from './types';

export type Destino = 'SEMANAL' | 'MENSUAL' | 'ANUAL';

const OPTIONS: { key: Destino; title: string; desc: string; Icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }> }[] = [
  { key: 'SEMANAL', title: 'SEMANAL', desc: 'Organízala dentro de una semana específica.', Icon: CalendarDays },
  { key: 'MENSUAL', title: 'MENSUAL', desc: 'Incorpórala a uno de tus objetivos mensuales.', Icon: CalendarRange },
  { key: 'ANUAL', title: 'ANUAL', desc: 'Vínculala con una meta o período del año.', Icon: CalendarClock },
];

export default function PlanDestinoModal({ accion, onPick, onCancel }: {
  accion: AccionKanban;
  onPick: (destino: Destino) => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] bg-[#0b1030]/60 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 sm:p-8 text-center" onClick={e => e.stopPropagation()}>
        <button onClick={onCancel} className="absolute top-4 right-4 text-[#101433] hover:text-gray-500">
          <X className="w-6 h-6" strokeWidth={2.5} />
        </button>
        <span className="mx-auto w-14 h-14 rounded-full bg-[#c026d3] text-white text-2xl font-black flex items-center justify-center">
          P
        </span>
        <h2 className="mt-4 text-xl sm:text-2xl font-black text-[#101433]">
          ¿CUÁNDO QUIERES PLANIFICAR ESTA ACCIÓN?
        </h2>
        <p className="mt-1 text-lg text-[#101433] font-medium">{accion.texto_accion}</p>
        <p className="mt-1 text-sm text-[#5b6b8c]">Elige el nivel de planificación donde quieres organizarla.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
          {OPTIONS.map(({ key, title, desc, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => onPick(key)}
              className="border border-[#dbe3f5] rounded-2xl p-5 flex flex-col items-center gap-2 hover:border-[#1f6feb] hover:shadow-lg hover:-translate-y-0.5 transition-all bg-white"
            >
              <Icon className="w-12 h-12 text-[#101433]" strokeWidth={1.5} />
              <span className="font-black text-[#101433]">{title}</span>
              <span className="text-xs text-[#5b6b8c] leading-relaxed">{desc}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="mt-6 px-10 py-2.5 rounded-xl border-2 border-[#1f6feb] text-[#1f6feb] font-black hover:bg-[#eef4ff] transition-colors"
        >
          CANCELAR
        </button>
      </div>
    </div>
  );
}
