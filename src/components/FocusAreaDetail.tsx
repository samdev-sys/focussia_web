import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, Loader2, Send, Check, Brain, CheckCircle2 } from 'lucide-react';
import { ruedaService, FocusAreaDetail as FocusAreaDetailType, AccionSugeridaData } from '../services/api';

interface FocusAreaDetailProps {
  area: string;
  onClose: () => void;
  onVolverDiagnostico?: () => void;
  userName?: string;
  avatarIndex?: number;
  AVATAR_FILES?: Record<number, string>;
}

// Explicación breve de cada área (spec: pantalla combinada, punto 1)
const EXPLICACIONES: Record<string, string> = {
  Trabajo: 'Tu vida laboral: rol, carga, crecimiento y reconocimiento profesional.',
  Dinero: 'Tus finanzas personales: ingresos, ahorro, deudas y tranquilidad económica.',
  Salud: 'Tu bienestar físico: descanso, alimentación, ejercicio y energía diaria.',
  Pareja: 'Tu relación de pareja: comunicación, conexión y proyectos en común.',
  Familia: 'Tus lazos familiares: tiempo compartido, apoyo y armonía con los tuyos.',
  Espiritualidad: 'Tu mundo interior: propósito, valores, calma y conexión.',
  Diversión: 'Tu capacidad de jugar, reír, descansar y disfrutar tu tiempo libre.',
  Entorno: 'Los espacios físicos donde vives y trabajas cada día.',
  Desarrollo: 'Tu aprendizaje continuo, tus habilidades y tu evolución personal.',
  Contribución: 'El impacto positivo que generas en otras personas.',
};

export default function FocusAreaDetail({ area, onClose, onVolverDiagnostico, userName = '', avatarIndex = 0, AVATAR_FILES }: FocusAreaDetailProps) {
  const [detail, setDetail] = useState<FocusAreaDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acciones, setAcciones] = useState<AccionSugeridaData[]>([]);
  const [generando, setGenerando] = useState(false);
  const [enviando, setEnviando] = useState<Record<number, boolean>>({});
  const [seleccionadas, setSeleccionadas] = useState<Set<number>>(new Set());
  const [enviandoBulk, setEnviandoBulk] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [limiteAlcanzado, setLimiteAlcanzado] = useState(false);

  useEffect(() => {
    setLoading(true);
    setConfirmation('');
    setLimiteAlcanzado(false);
    ruedaService.verDetalleFoco(area)
      .then(data => {
        setDetail(data);
        setAcciones(data.acciones);
        setLoading(false);
      })
      .catch(() => {
        setError('No se pudo cargar el detalle del área');
        setLoading(false);
      });
  }, [area]);

  const handleGenerarAcciones = async () => {
    setGenerando(true);
    setConfirmation('');
    try {
      const res = await ruedaService.recomendarAccionesFoco(area);
      setAcciones(res.acciones);
      setLimiteAlcanzado(res.disponibles === 0);
    } catch (e: any) {
      if (e.response?.data?.code === 'limite_20') {
        setLimiteAlcanzado(true);
      } else {
        setError('Error al generar acciones');
      }
    } finally {
      setGenerando(false);
    }
  };

  const marcarEnviada = (accionId: number) => {
    setAcciones(prev => prev.map(a => a.id === accionId ? { ...a, enviada_kanban: true } : a));
    setSeleccionadas(prev => {
      const next = new Set(prev);
      next.delete(accionId);
      return next;
    });
  };

  const handleEnviarKanban = async (accionId: number) => {
    setEnviando(prev => ({ ...prev, [accionId]: true }));
    setConfirmation('');
    try {
      await ruedaService.enviarAccionKanban(accionId);
      marcarEnviada(accionId);
      setConfirmation(`Listo${userName ? ', ' + userName : ''}. Esta acción fue enviada a tu Kanban Backlog para que puedas ordenarla y decidir cuándo ejecutarla.`);
      setTimeout(() => setConfirmation(''), 4000);
    } catch (e: any) {
      if (e.response?.data?.code !== 'duplicado') {
        setError('Error al enviar al Kanban');
      } else {
        marcarEnviada(accionId);
      }
    } finally {
      setEnviando(prev => ({ ...prev, [accionId]: false }));
    }
  };

  const toggleSeleccion = (accionId: number) => {
    setSeleccionadas(prev => {
      const next = new Set(prev);
      if (next.has(accionId)) next.delete(accionId);
      else next.add(accionId);
      return next;
    });
  };

  const handleEnviarSeleccionadas = async () => {
    const ids = [...seleccionadas];
    if (ids.length === 0 || enviandoBulk) return;
    setEnviandoBulk(true);
    setConfirmation('');
    let ok = 0;
    for (const id of ids) {
      try {
        await ruedaService.enviarAccionKanban(id);
        marcarEnviada(id);
        ok += 1;
      } catch (e: any) {
        if (e.response?.data?.code === 'duplicado') marcarEnviada(id);
      }
    }
    setEnviandoBulk(false);
    if (ok > 0) {
      setConfirmation(`Listo${userName ? ', ' + userName : ''}. Estas acciones fueron enviadas a tu Kanban Backlog para que puedas ordenarlas y decidir cuándo ejecutarlas.`);
      setTimeout(() => setConfirmation(''), 5000);
    }
  };

  const getScoreColor = (score: number) => {
    if (score <= 3) return 'text-red-500';
    if (score <= 5) return 'text-orange-500';
    if (score <= 7) return 'text-yellow-500';
    return 'text-green-500';
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto" />
          <p className="text-gray-500 mt-4">Cargando área foco...</p>
        </div>
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={onClose} className="px-6 py-2 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200">
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  const focusArea = detail?.focus_area;
  const score = focusArea?.score || 0;
  const enviadasCount = acciones.filter(a => a.enviada_kanban).length;
  const totalAcciones = acciones.length;
  const disponibles = detail?.disponibles ?? 20;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-purple-500 to-indigo-600 shrink-0">
          <div className="flex items-center gap-2">
            {avatarIndex > 0 && AVATAR_FILES && (
              <img src={AVATAR_FILES[avatarIndex]} alt="avatar" className="w-8 h-8 rounded-md object-cover border border-white/30" />
            )}
            <h2 className="text-lg font-bold text-white">{area}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Score */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Puntaje obtenido</p>
              <p className={`text-3xl font-black ${getScoreColor(score)}`}>{score}<span className="text-sm font-normal text-gray-400">/10</span></p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Prioridad</p>
              <p className="text-lg font-bold text-purple-600">#{focusArea?.priority_order || '?'}</p>
            </div>
          </div>

          {/* Reason */}
          {focusArea?.reason && (
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
              <p className="text-xs text-purple-400 uppercase tracking-wider mb-1">¿Por qué fue seleccionada?</p>
              <p className="text-sm text-purple-800 leading-relaxed">{focusArea.reason}</p>
            </div>
          )}

          {/* Explicación breve del área */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">El área</p>
            <p className="text-sm text-gray-700 leading-relaxed">{EXPLICACIONES[area] || 'Un área clave de tu equilibrio de vida.'}</p>
          </div>

          {/* Confirmation message */}
          {confirmation && (
            <div className="bg-green-50 rounded-lg p-4 border border-green-200 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">{confirmation}</p>
            </div>
          )}

          {/* Limit message */}
          {limiteAlcanzado && (
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <p className="text-sm text-amber-700">Focusia recomienda no generar más acciones por ahora, para evitar saturación y ayudarte a avanzar con foco.</p>
            </div>
          )}

          {/* Actions */}
          <div>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">Acciones sugeridas</h3>
            <p className="text-xs text-gray-400 mb-3">{enviadasCount} de {totalAcciones} enviadas al Kanban</p>
            
            {acciones.length === 0 ? (
              <div className="text-center py-6">
                <Brain className="w-10 h-10 text-purple-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500 mb-4">Aún no hay acciones para esta área</p>
                <button
                  onClick={handleGenerarAcciones}
                  disabled={generando}
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {generando ? (
                    <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Generando...</span>
                  ) : (
                    'Generar 5 acciones'
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {acciones.map(a => (
                  <div key={a.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    a.enviada_kanban ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100 hover:border-purple-200'
                  }`}>
                    {!a.enviada_kanban && (
                      <input type="checkbox" checked={seleccionadas.has(a.id)} onChange={() => toggleSeleccion(a.id)}
                        className="w-4 h-4 accent-purple-600 shrink-0" aria-label="Seleccionar acción" />
                    )}
                    <p className={`text-sm flex-1 ${a.enviada_kanban ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                      {a.texto}
                    </p>
                    {!a.enviada_kanban ? (
                      <button
                        onClick={() => handleEnviarKanban(a.id)}
                        disabled={enviando[a.id]}
                        className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center gap-1 shrink-0"
                      >
                        {enviando[a.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        Kanban
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 text-green-600 text-xs shrink-0 font-medium">
                        <Check className="w-3 h-3" /> Enviado al Kanban
                      </span>
                    )}
                  </div>
                ))}

                {/* Generate more button */}
                {!limiteAlcanzado && disponibles > 0 && (
                  <button
                    onClick={handleGenerarAcciones}
                    disabled={generando}
                    className="w-full py-2.5 border-2 border-dashed border-purple-200 text-purple-500 text-sm font-semibold rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-50 mt-2"
                  >
                    {generando ? (
                      <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Generando...</span>
                    ) : (
                      `+ Generar nuevas acciones (${totalAcciones}/20)`
                    )}
                  </button>
                )}

                {[...seleccionadas].filter(id => acciones.some(a => a.id === id && !a.enviada_kanban)).length > 0 && (
                  <button
                    onClick={handleEnviarSeleccionadas}
                    disabled={enviandoBulk}
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
                  >
                    {enviandoBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Enviar al Kanban Backlog ({[...seleccionadas].filter(id => acciones.some(a => a.id === id && !a.enviada_kanban)).length})
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-4 shrink-0">
          {onVolverDiagnostico && (
            <button
              onClick={onVolverDiagnostico}
              className="w-full py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" /> Volver al diagnóstico completo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
