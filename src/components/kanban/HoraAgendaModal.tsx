import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../../services/api';
import { AccionKanban } from './types';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 8);
const pad = (n: number) => String(n).padStart(2, '0');

export default function HoraAgendaModal({ accion, fecha, onPick, onCancel }: {
  accion: AccionKanban;
  fecha: string;
  onPick: (hora: number) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [ocupadas, setOcupadas] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.get('/api/acciones-kanban/clasificadas/');
        if (!alive) return;
        const horas = (res.data as AccionKanban[])
          .filter(a => a.estado_actual === 'AGENDA_DIARIA' && a.fecha_seleccionada === fecha && a.hora_seleccionada)
          .map(a => Number(String(a.hora_seleccionada).slice(0, 2)));
        setOcupadas(new Set(horas));
      } catch (err) {
        console.error('Error loading agenda hours:', err);
      }
    })();
    return () => { alive = false; };
  }, [fecha]);

  const elegir = async (hora: number) => {
    setEnviando(true);
    setError(null);
    const msg = await onPick(hora);
    if (msg) {
      setError(msg);
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-[#0b1030]/60 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6 sm:p-8 text-center" onClick={e => e.stopPropagation()}>
        <button onClick={onCancel} className="absolute top-4 right-4 text-[#101433] hover:text-gray-500">
          <X className="w-6 h-6" strokeWidth={2.5} />
        </button>
        <span className="mx-auto w-14 h-14 rounded-full bg-[#1f6feb] text-white text-2xl font-black flex items-center justify-center">
          H
        </span>
        <h2 className="mt-4 text-xl sm:text-2xl font-black text-[#101433]">¿EN QUÉ BLOQUE HACES ESTA ACCIÓN HOY?</h2>
        <p className="mt-1 text-lg text-[#101433] font-medium">{accion.texto_accion}</p>
        <p className="mt-1 text-sm text-[#5b6b8c]">Cada bloque horario admite una sola acción.</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-6">
          {HOURS.map(h => {
            const ocupada = ocupadas.has(h);
            return (
              <button
                key={h}
                type="button"
                disabled={ocupada || enviando}
                onClick={() => elegir(h)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors ${
                  ocupada
                    ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'border-[#dbe3f5] text-[#101433] hover:border-[#1f6feb] hover:bg-[#eef4ff]'
                }`}
              >
                {pad(h)}:00 – {pad((h + 1) % 24)}:00
                {ocupada && <span className="block text-[11px] font-semibold">Ocupada</span>}
              </button>
            );
          })}
        </div>

        {error && <p className="mt-4 text-sm font-bold text-[#dc2626]">{error}</p>}

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
