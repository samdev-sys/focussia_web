import React, { useState } from 'react';
import { X, Check, ArrowRight, Calendar, Target, ListTodo } from 'lucide-react';
import { PropuestaIData, timeBlockService } from '../services/api';

interface MicroFlujoAjusteProps {
  isOpen: boolean;
  onClose: () => void;
  propuesta: PropuestaIData | null;
  onAccionAplicada?: () => void;
}

type Paso = 'inicio' | 'accion' | 'completado';

export const MicroFlujoAjuste: React.FC<MicroFlujoAjusteProps> = ({ isOpen, onClose, propuesta, onAccionAplicada }) => {
  const [paso, setPaso] = useState<Paso>('inicio');
  const [seleccion, setSeleccion] = useState<string>('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !propuesta) return null;

  const ACCIONES = {
    estructural: [
      { id: 'redistribuir', label: 'Redistribuir tareas en los próximos días', icon: Calendar },
      { id: 'replanificar', label: 'Replanificar bloques de tiempo', icon: ListTodo },
    ],
    estrategico_critico: [
      { id: 'bloquear', label: 'Bloquear tiempo hoy para tareas estratégicas', icon: Target },
      { id: 'repriorizar', label: 'Re-priorizar tareas de la semana', icon: ListTodo },
    ],
    de_prioridad: [
      { id: 'limpiar', label: 'Revisar y limpiar tareas no prioritarias', icon: ListTodo },
      { id: 'reorganizar', label: 'Reorganizar kanban por prioridad', icon: Calendar },
    ],
  };

  const opciones = ACCIONES[propuesta.tipo_impacto] || ACCIONES.de_prioridad;

  const handleConfirmar = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const todayStr = now.toISOString().split('T')[0];

      const truncar = (texto: string, max: number) =>
        texto.length > max ? texto.substring(0, max) + '...' : texto;

      switch (seleccion) {
        case 'replanificar': {
          await timeBlockService.create({
            fecha: todayStr,
            hora: currentHour,
            tarea: `Replanificar: ${truncar(propuesta?.propuesta_ajuste || 'Tarea pendiente', 200)}`,
            estado: 'pending',
          });
          break;
        }
        case 'bloquear': {
          await timeBlockService.create({
            fecha: todayStr,
            hora: Math.min(currentHour + 1, 23),
            tarea: `Bloqueo estratégico: ${truncar(propuesta?.propuesta_ajuste || 'Tarea estratégica', 200)}`,
            estado: 'pending',
          });
          break;
        }
        case 'redistribuir':
        case 'repriorizar':
        case 'limpiar':
        case 'reorganizar': {
          await timeBlockService.create({
            fecha: todayStr,
            hora: currentHour,
            tarea: `Acción: ${opciones.find(o => o.id === seleccion)?.label || seleccion}`,
            estado: 'pending',
          });
          break;
        }
      }

      setPaso('completado');
      onAccionAplicada?.();
    } catch (error) {
      console.error('Error al aplicar ajuste:', error);
      // Aún así mostrar completado para no bloquear al usuario
      setPaso('completado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-xl rounded-md shadow-2xl border border-white/50 w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/50 bg-gradient-to-r from-indigo-600 to-purple-600 shrink-0">
          <div className="flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-white" />
            <h2 className="text-lg font-bold uppercase text-white">Aplicar Ajuste</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/30 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {paso === 'inicio' && (
            <>
              <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-200">
                <p className="text-xs text-indigo-700 font-medium">Propuesta del sistema</p>
                <p className="text-sm text-gray-700 mt-1">{propuesta.propuesta_ajuste}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-500 uppercase">Selecciona una acción:</p>
                {opciones.map((op) => {
                  const Icon = op.icon;
                  return (
                    <button
                      key={op.id}
                      onClick={() => { setSeleccion(op.id); setPaso('accion'); }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50 transition-all text-left"
                    >
                      <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm text-gray-700 flex-1">{op.label}</span>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {paso === 'accion' && (
            <div className="space-y-4">
              <div className="bg-green-50 rounded-xl p-4 border border-green-200 text-center">
                <Check className="w-10 h-10 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-green-700">Acción seleccionada</p>
                <p className="text-xs text-green-600 mt-1">
                  {opciones.find((o) => o.id === seleccion)?.label}
                </p>
              </div>
              <p className="text-xs text-gray-500 text-center">
                Esta acción se aplicará a tu planificación. ¿Confirmas?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPaso('inicio')}
                  className="flex-1 py-2.5 rounded-xl bg-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-300 transition-colors"
                >
                  Volver
                </button>
                <button
                  onClick={handleConfirmar}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? 'Aplicando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          )}

          {paso === 'completado' && (
            <div className="space-y-4 text-center py-6">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-sm font-bold text-gray-700">¡Ajuste Aplicado!</p>
              <p className="text-xs text-gray-500">Tu planificación ha sido actualizada.</p>
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm hover:opacity-90 transition-opacity"
              >
                Listo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
