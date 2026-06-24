import React, { useState, useEffect } from 'react';
import { X, Bell, RefreshCw, Sparkles } from 'lucide-react';
import { propuestaIAService, PropuestaIData } from '../services/api';
import { PropuestaCard } from './PropuestaCard';

interface BuzonPropuestasProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BuzonPropuestas: React.FC<BuzonPropuestasProps> = ({ isOpen, onClose }) => {
  const [propuestas, setPropuestas] = useState<PropuestaIData[]>([]);
  const [loading, setLoading] = useState(false);
  const [ejecutando, setEjecutando] = useState(false);

  useEffect(() => {
    if (isOpen) cargarPropuestas();
  }, [isOpen]);

  const cargarPropuestas = async () => {
    setLoading(true);
    try {
      const data = await propuestaIAService.getAll();
      setPropuestas(data);
    } catch (err) {
      console.error('Error loading proposals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEjecutarMotor = async () => {
    setEjecutando(true);
    try {
      await propuestaIAService.ejecutarMotor();
      await cargarPropuestas();
    } catch (err) {
      console.error('Error running engine:', err);
    } finally {
      setEjecutando(false);
    }
  };

  const handleDecidir = async (id: number, decision: string) => {
    try {
      await propuestaIAService.decidir(id, decision);
      await cargarPropuestas();
    } catch (err) {
      console.error('Error recording decision:', err);
    }
  };

  const handleMarcarLeida = async (id: number) => {
    try {
      await propuestaIAService.marcarLeida(id);
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const pendientes = propuestas.filter((p) => !p.respondida);
  const historial = propuestas.filter((p) => p.respondida);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-xl rounded-md shadow-2xl border border-white/50 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/50 bg-gradient-to-r from-purple-600 to-pink-500 shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-white" />
            <h2 className="text-lg font-bold uppercase text-white">Buzón de Propuestas IA</h2>
            {pendientes.length > 0 && (
              <span className="bg-white/30 text-white text-xs px-2 py-0.5 rounded-full">
                {pendientes.length} pendiente(s)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleEjecutarMotor}
              disabled={ejecutando}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/20 text-white text-xs font-bold hover:bg-white/30 transition-colors disabled:opacity-50"
            >
              {ejecutando ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {ejecutando ? 'Analizando...' : 'Ejecutar Motor'}
            </button>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/30 transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-5 h-5 animate-spin text-purple-500" />
            </div>
          ) : (
            <>
              {pendientes.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Pendientes</h3>
                  <div className="space-y-3">
                    {pendientes.map((p) => (
                      <PropuestaCard
                        key={p.id}
                        propuesta={p}
                        onDecidir={handleDecidir}
                        onMarcarLeida={handleMarcarLeida}
                      />
                    ))}
                  </div>
                </div>
              )}

              {historial.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Historial</h3>
                  <div className="space-y-2">
                    {historial.map((p) => (
                      <PropuestaCard
                        key={p.id}
                        propuesta={p}
                        onDecidir={handleDecidir}
                        onMarcarLeida={handleMarcarLeida}
                      />
                    ))}
                  </div>
                </div>
              )}

              {propuestas.length === 0 && (
                <div className="text-center py-12">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">No hay propuestas del motor de IA aún.</p>
                  <p className="text-xs text-gray-300 mt-1">
                    Haz clic en "Ejecutar Motor" para analizar tu planificación.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
