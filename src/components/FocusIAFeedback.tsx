import React, { useEffect, useState } from 'react';
import { X, Sparkles, CheckCircle, AlertTriangle, Lightbulb, TrendingUp, MessageCircle } from 'lucide-react';
import { agentService } from '../services/api';

interface Props {
  userName: string;
  onOpenChat: () => void;
  onDismiss: () => void;
}

const FocusIAFeedback: React.FC<Props> = ({ userName, onOpenChat, onDismiss }) => {
  const [evaluation, setEvaluation] = useState<{
    progreso: { completadas: number; total: number; porcentaje: number };
    alertas: { tipo: string; mensaje: string; severidad: string }[];
    sugerencias: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    agentService.evaluate().then(res => {
      if (mounted) setEvaluation(res);
    }).catch(() => {
      if (mounted) setEvaluation(null);
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  if (loading) return null;
  if (!evaluation) return null;

  const { progreso, alertas, sugerencias } = evaluation;
  const buenProgreso = progreso.porcentaje >= 50;
  const alertaAlta = alertas.find(a => a.severidad === 'alta');
  const alertaMedia = alertas.find(a => a.severidad === 'media');
  const msgAlerta = alertaAlta?.mensaje || alertaMedia?.mensaje || null;
  const sugerencia = sugerencias[0] || null;

  return (
    <div className="fixed bottom-20 right-6 z-[150] animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white/95 backdrop-blur-xl rounded-md shadow-2xl border border-white/50 w-80 overflow-hidden">
        <div className="bg-gradient-to-r from-[#3533cd] to-[#040817] p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-white font-bold text-xs">FocusIA</span>
          </div>
          <button onClick={onDismiss} className="p-1 rounded-full hover:bg-white/20 transition-colors">
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        </div>

        <div className="p-3 space-y-2.5">
          <p className="text-sm font-semibold text-gray-800">
            {buenProgreso ? `¡Buen trabajo, ${userName}!` : `Vamos, ${userName}!`}
          </p>

          {progreso.total > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <TrendingUp className={`w-3.5 h-3.5 ${buenProgreso ? 'text-green-500' : 'text-amber-500'}`} />
              <span className="text-gray-600">
                <strong>{progreso.porcentaje}%</strong> de progreso ({progreso.completadas}/{progreso.total} tareas)
              </span>
            </div>
          )}

          {msgAlerta && (
            <div className={`flex items-start gap-1.5 text-xs p-2 rounded ${
              alertaAlta ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
            }`}>
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{msgAlerta}</span>
            </div>
          )}

          {sugerencia && (
            <div className="flex items-start gap-1.5 text-xs p-2 rounded bg-indigo-50 text-indigo-700">
              <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{sugerencia}</span>
            </div>
          )}

          {!msgAlerta && !sugerencia && (
            <div className="flex items-start gap-1.5 text-xs p-2 rounded bg-green-50 text-green-700">
              <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>Todo en orden por ahora. Sigue así y avísame si necesitas algo.</span>
            </div>
          )}

          <div className="flex gap-1.5 pt-1">
            <button
              onClick={() => { onOpenChat(); onDismiss(); }}
              className="flex items-center justify-center gap-1.5 flex-1 py-2 text-xs font-semibold bg-gradient-to-r from-[#3533cd] to-[#040817] text-white rounded hover:brightness-110 transition-all"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Hablar con FocusIA
            </button>
            <button
              onClick={onDismiss}
              className="flex-1 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FocusIAFeedback;
