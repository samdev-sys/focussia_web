import React from 'react';
import { AlertTriangle, TrendingUp, AlertCircle, Check, Eye, ChevronRight } from 'lucide-react';
import { PropuestaIData } from '../services/api';

interface PropuestaCardProps {
  propuesta: PropuestaIData;
  onDecidir: (id: number, decision: string) => void;
  onMarcarLeida: (id: number) => void;
}

const IMPACTO_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string; label: string }> = {
  estructural: {
    icon: AlertTriangle,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    label: 'ESTRUCTURAL_SATURACIÓN',
  },
  estrategico_critico: {
    icon: TrendingUp,
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-200',
    label: 'ESTRATÉGICO_CRÍTICO',
  },
  de_prioridad: {
    icon: AlertCircle,
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
    label: 'PRIORIDAD_REORGANIZACIÓN',
  },
};

export const PropuestaCard: React.FC<PropuestaCardProps> = ({ propuesta, onDecidir, onMarcarLeida }) => {
  const config = IMPACTO_CONFIG[propuesta.tipo_impacto];
  const Icon = config.icon;

  return (
    <div className={`rounded-xl border p-4 transition-all ${config.bg} ${!propuesta.leida ? 'ring-2 ring-purple-400' : ''}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg bg-white/80 ${config.color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold uppercase ${config.color}`}>
              {config.label}
            </span>
            {!propuesta.leida && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Nueva</span>
            )}
          </div>
          <p className="text-sm text-gray-700 mt-2 font-medium">{propuesta.situacion_clara}</p>
          <p className="text-xs text-gray-500 mt-1">{propuesta.explicacion_impacto}</p>
          <div className="mt-3 p-3 bg-white/80 rounded-lg border border-gray-200">
            <p className="text-xs font-bold text-gray-600 uppercase mb-1">Propuesta de Ajuste</p>
            <p className="text-sm text-gray-700">{propuesta.propuesta_ajuste}</p>
          </div>
          {!propuesta.respondida && (
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={() => { onMarcarLeida(propuesta.id); onDecidir(propuesta.id, 'aplicar'); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-500 text-white text-xs font-bold hover:opacity-90 transition-opacity"
              >
                <Check className="w-3.5 h-3.5" /> Aplicar Ajuste Ahora
              </button>
              <button
                onClick={() => { onMarcarLeida(propuesta.id); onDecidir(propuesta.id, 'revisar'); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-600 text-xs font-bold hover:bg-gray-50 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" /> Ver / Revisar Después
              </button>
              <button
                onClick={() => { onMarcarLeida(propuesta.id); onDecidir(propuesta.id, 'mantener'); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-500 text-xs hover:bg-gray-50 transition-colors"
              >
                Mantener Planificación
              </button>
            </div>
          )}
          {propuesta.respondida && (
            <div className="mt-2 text-xs text-gray-400">
              Decisión: <span className="font-medium text-gray-600">{propuesta.decision_usuario}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
