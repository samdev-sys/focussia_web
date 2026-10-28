import React, { useState } from 'react';
import { X, Target, CalendarDays, Calendar, Clock, CheckCircle, Plus } from 'lucide-react';
import { notify } from '../services/notify';
import { metaAnualService, objetivoMensualService, weeklyActionService } from '../services/api';

interface PlanificarModalProps {
  onClose: () => void;
  onClassified: () => void;
}

type MetaType = 'anual' | 'mensual' | 'semanal' | 'diaria';

const META_CONFIG: Record<MetaType, { label: string; icon: React.ReactNode; color: string; desc: string }> = {
  anual: { label: 'Meta Anual', icon: <Target className="w-5 h-5" />, color: 'from-[#0d9488] to-[#14b8a6]', desc: 'Objetivo a largo plazo para todo el año' },
  mensual: { label: 'Meta Mensual', icon: <CalendarDays className="w-5 h-5" />, color: 'from-[#7c3aed] to-[#a855f7]', desc: 'Objetivo para este mes' },
  semanal: { label: 'Meta Semanal', icon: <Calendar className="w-5 h-5" />, color: 'from-[#d97706] to-[#f59e0b]', desc: 'Acción para esta semana' },
  diaria: { label: 'Meta Diaria', icon: <Clock className="w-5 h-5" />, color: 'from-[#059669] to-[#34d399]', desc: 'Acción para hoy' },
};

function clasificarPorPalabrasClave(titulo: string): MetaType {
  const t = titulo.toLowerCase();
  if (/\b(año|anual|largo plazo|gran meta|objetivo \d{4}|a largo|meta anual)\b/.test(t)) return 'anual';
  if (/\b(mes|mensual|este mes|próximo mes|trimestre|q[1-4])\b/.test(t)) return 'mensual';
  if (/\b(semana|semanal|esta semana|próxima semana|siguiente semana)\b/.test(t)) return 'semanal';
  return 'diaria';
}

export const PlanificarModal: React.FC<PlanificarModalProps> = ({ onClose, onClassified }) => {
  const [title, setTitle] = useState('');
  const sugerencia = clasificarPorPalabrasClave(title);
  const [selected, setSelected] = useState<MetaType>('semanal');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleConfirm = async () => {
    if (!title.trim()) { notify.error('Escribe una descripción de la tarea'); return; }
    setLoading(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      if (selected === 'anual') {
        await metaAnualService.create({
          titulo: title.trim(),
          descripcion: 'Meta creada desde Plan Rápido',
          fecha_inicio: `${year}-01-01`,
          fecha_fin: `${year}-12-31`,
          aprobada: false,
        });
      } else if (selected === 'mensual') {
        await objetivoMensualService.create({
          meta_anual: null,
          mes: month,
          titulo: title.trim(),
          descripcion: 'Meta creada desde Plan Rápido',
          completado: false,
        });
      } else if (selected === 'semanal') {
        const today = new Date();
        const dayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        await weeklyActionService.addAction({
          title: title.trim(),
          assigned_calendar_date: dayKey,
          origin_module: 'KANBAN_BACKLOG',
        });
      } else {
        const today = new Date();
        const dayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        await weeklyActionService.addAction({
          title: title.trim(),
          assigned_calendar_date: dayKey,
          origin_module: 'MANUAL',
        });
      }

      setDone(true);
      setTimeout(() => {
        onClassified();
        onClose();
      }, 1200);
    } catch (err) {
      notify.error('Error al crear');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white/95 backdrop-blur-xl rounded-md shadow-2xl border border-white/50 w-[650px] p-8 text-center" onClick={e => e.stopPropagation()}>
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">¡Creado!</h3>
          <p className="text-sm text-gray-500">Se agregó a <strong>{META_CONFIG[selected].label}</strong></p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white/95 backdrop-blur-xl rounded-md shadow-2xl border border-white/50 w-[650px] max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-white/50 bg-gradient-to-r from-indigo-700 to-purple-600 shrink-0">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-white" />
            <h2 className="text-lg font-bold text-white">Plan Rápido</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-5">
          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-1 block font-medium">¿Qué quieres planificar?</label>
            <input
              autoFocus
              value={title}
              onChange={e => { setTitle(e.target.value); setSelected(clasificarPorPalabrasClave(e.target.value)); }}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); }}
              placeholder="Ej: Terminar reporte, Comprar regalo..."
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400"
            />
          </div>

          {title.trim() && (
            <>
              <p className="text-xs text-gray-400 mb-3 uppercase tracking-wider font-medium">
                Sugerencia: <span className="text-purple-600">{META_CONFIG[sugerencia].label}</span>
              </p>

              <div className="space-y-2">
                {(Object.keys(META_CONFIG) as MetaType[]).map(type => {
                  const cfg = META_CONFIG[type];
                  const isSelected = selected === type;
                  const isSugerencia = type === sugerencia;
                  return (
                    <button key={type} onClick={() => setSelected(type)}
                      className={`w-full p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${isSelected ? 'border-purple-400 bg-purple-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
                      <div className={`p-2 rounded-xl ${isSelected ? 'bg-purple-200 text-purple-700' : 'bg-gray-100 text-gray-400'}`}>
                        {cfg.icon}
                      </div>
                      <div className="flex-1">
                        <span className="block font-semibold text-gray-800 text-sm">{cfg.label}</span>
                        <span className="text-xs text-gray-400">{cfg.desc}</span>
                      </div>
                      {isSugerencia && <span className="text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium">IA</span>}
                      {isSelected && <CheckCircle className="w-5 h-5 text-purple-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors rounded-xl border border-gray-200">
            Cancelar
          </button>
          <button onClick={handleConfirm} disabled={loading || !title.trim()}
            className="flex-1 py-2.5 bg-gradient-to-r from-[#D1C4E9] to-[#FFD1D1] text-[#4A3B8B] font-semibold rounded-xl transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2 text-sm">
            {loading ? <div className="w-4 h-4 border-2 border-[#4A3B8B]/30 border-t-[#4A3B8B] rounded-full animate-spin" /> : <>Crear</>}
          </button>
        </div>
      </div>
    </div>
  );
};
