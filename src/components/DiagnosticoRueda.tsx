import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Heart, Target, CheckCircle2, Sparkles, ArrowRight, ChevronLeft, X, Brain,
  AlertCircle, Loader2, Send, Check, BookOpen, Sliders, MessageSquare, SkipForward,
} from 'lucide-react';
import { ruedaService, RuedaCategoria, DiagnosticoRuedaData, AccionSugeridaData } from '../services/api';

const AVATAR_FILES: Record<number, string> = {
  1: '/avartars/John.jpeg', 2: '/avartars/conrad.jpeg', 3: '/avartars/Ashley.jpeg',
  4: '/avartars/Lia.jpeg', 5: '/avartars/Monroe.jpeg', 6: '/avartars/Sophya.jpeg',
};

const NIVELES: { lo: number; hi: number; label: string; color: string }[] = [
  { lo: 1, hi: 2, label: 'Crítico', color: 'text-red-500' },
  { lo: 3, hi: 4, label: 'Bajo', color: 'text-orange-500' },
  { lo: 5, hi: 6, label: 'Medio', color: 'text-yellow-500' },
  { lo: 7, hi: 8, label: 'Bueno', color: 'text-blue-500' },
  { lo: 9, hi: 10, label: 'Excelente', color: 'text-green-500' },
];

function nivelStr(puntaje: number): { label: string; color: string } {
  for (const n of NIVELES) {
    if (n.lo <= puntaje && puntaje <= n.hi) return n;
  }
  return { label: 'Medio', color: 'text-yellow-500' };
}

interface DiagnosticoRuedaProps {
  avatarIndex?: number;
  onClose: () => void;
  onGoMetaAnual?: () => void;
}

export default function DiagnosticoRueda({ avatarIndex = 0, onClose, onGoMetaAnual }: DiagnosticoRuedaProps) {
  const [screen, setScreen] = useState<'intro' | 'evaluacion' | 'procesando' | 'reporte' | 'acciones' | 'cierre'>('intro');
  const [categorias, setCategorias] = useState<RuedaCategoria[]>([]);
  const [puntajes, setPuntajes] = useState<Record<number, number>>({});
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [diagnostico, setDiagnostico] = useState<DiagnosticoRuedaData | null>(null);
  const [acciones, setAcciones] = useState<AccionSugeridaData[]>([]);
  const [focoActivo, setFocoActivo] = useState<string>('');
  const [enviando, setEnviando] = useState<Record<number, boolean>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    ruedaService.getCompleta().then(data => {
      setCategorias(data);
      const p: Record<number, number> = {};
      const c: Record<string, string> = {};
      data.forEach(cat => { p[cat.id] = cat.puntaje; c[String(cat.id)] = cat.comentario || ''; });
      setPuntajes(p);
      setComentarios(c);
    }).catch(() => setError('Error al cargar'));
  }, []);

  useEffect(() => {
    if (screen === 'acciones' && diagnostico) {
      const focos = [diagnostico.foco_1, diagnostico.foco_2, diagnostico.foco_3].filter(Boolean);
      if (focos.length > 0 && !focoActivo) setFocoActivo(focos[0]);
      Promise.all(focos.map(f => ruedaService.listarAcciones(f).catch(() => [])))
        .then(results => {
          const all = results.flat();
          setAcciones(all);
        });
    }
  }, [screen, diagnostico]);

  const handleGuardarYDiagnosticar = useCallback(async () => {
    setError('');
    setScreen('procesando');
    try {
      await ruedaService.guardar(puntajes, comentarios);
      const diag = await ruedaService.generarDiagnostico(puntajes, comentarios);
      setDiagnostico(diag);
      await new Promise(r => setTimeout(r, 1200));
      setScreen('reporte');
    } catch {
      setError('Error al generar diagnóstico');
      setScreen('evaluacion');
    }
  }, [puntajes, comentarios]);

  const handleGenerarAcciones = useCallback(async (area: string) => {
    setFocoActivo(area);
    try {
      const res = await ruedaService.generarAcciones(area);
      setAcciones(prev => {
        const other = prev.filter(a => a.area_foco !== area);
        return [...other, ...res.acciones];
      });
    } catch (e: any) {
      if (e.response?.data?.code === 'limite_20') setError(e.response.data.error);
      else setError('Error al generar acciones');
    }
  }, []);

  const handleEnviarKanban = useCallback(async (accionId: number) => {
    setEnviando(prev => ({ ...prev, [accionId]: true }));
    try {
      await ruedaService.enviarAccionKanban(accionId);
      setAcciones(prev => prev.map(a => a.id === accionId ? { ...a, enviada_kanban: true } : a));
    } catch (e: any) {
      if (e.response?.data?.code !== 'duplicado') setError('Error al enviar');
    } finally {
      setEnviando(prev => ({ ...prev, [accionId]: false }));
    }
  }, []);

  const focosList = diagnostico
    ? [diagnostico.foco_1, diagnostico.foco_2, diagnostico.foco_3].filter(Boolean)
    : [];

  if (screen === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a0a2e] via-[#16213e] to-[#0f3460] flex items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-56 h-56 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <div className="relative text-center max-w-md">
          {avatarIndex > 0 && (
            <img src={AVATAR_FILES[avatarIndex]} alt="avatar" className="w-20 h-20 rounded-md object-cover border-2 border-purple-300 mx-auto mb-5 shadow-xl" />
          )}
          <h1 className="text-3xl font-bold text-white mb-3">Tu diagnóstico comienza aquí</h1>
          <p className="text-purple-200/70 text-sm mb-6 leading-relaxed">
            La Rueda de la Vida mide tu equilibrio en 10 áreas clave. Sé honesto contigo mismo — 
            no se trata de tener puntuaciones perfectas, sino de saber desde dónde empezar.
          </p>
          <button onClick={() => setScreen('evaluacion')}
            className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-md hover:shadow-xl transition-all">
            Comenzar diagnóstico
          </button>
          <button onClick={onClose} className="block mx-auto mt-4 text-sm text-purple-300/50 hover:text-purple-200 transition-colors">
            Saltar <SkipForward className="inline w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'evaluacion') {
    return (
      <div className="min-h-screen bg-[#F4F4F7] overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setScreen('intro')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600">
              <ChevronLeft className="w-4 h-4" /> Intro
            </button>
            <h2 className="text-lg font-bold text-gray-800">Evalúa cada área</h2>
            <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>

          <div className="space-y-3">
            {categorias.map(cat => {
              const val = puntajes[cat.id] || 5;
              const nl = nivelStr(val);
              return (
                <div key={cat.id} className="bg-white/80 rounded-md border border-gray-100 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{cat.icono}</span>
                      <span className="font-bold text-gray-800 text-sm">{cat.nombre}</span>
                    </div>
                    <span className={`font-black text-lg ${nl.color}`}>{val} <span className="text-xs font-normal">{nl.label}</span></span>
                  </div>
                  <input type="range" min="1" max="10" value={val}
                    onChange={e => setPuntajes(p => ({ ...p, [cat.id]: parseInt(e.target.value) }))}
                    className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-purple-500 mb-2" />
                  <div className="flex justify-between text-[10px] text-gray-400 px-1">
                    <span>1 Crítico</span><span>5 Medio</span><span>10 Excelente</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <MessageSquare className="w-3 h-3 text-gray-300" />
                    <input type="text" placeholder="Comentario opcional..."
                      value={comentarios[String(cat.id)] || ''}
                      onChange={e => setComentarios(c => ({ ...c, [String(cat.id)]: e.target.value }))}
                      className="flex-1 text-xs border-0 border-b border-gray-200 bg-transparent py-1 focus:outline-none focus:border-purple-300 text-gray-600 placeholder-gray-300" />
                  </div>
                </div>
              );
            })}
          </div>

          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
          <button onClick={handleGuardarYDiagnosticar}
            className="w-full mt-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-md hover:shadow-lg transition-all flex items-center justify-center gap-2">
            <Brain className="w-4 h-4" /> Generar diagnóstico
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'procesando') {
    return (
      <div className="min-h-screen bg-[#F4F4F7] flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-400 to-pink-400 rounded-md flex items-center justify-center mb-6 animate-pulse shadow-xl">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Analizando tus respuestas</h2>
          <p className="text-sm text-gray-500">La inteligencia artificial está procesando tus puntajes y comentarios para seleccionar los focos estratégicos...</p>
          <div className="flex justify-center gap-1.5 mt-6">
            {[0, 1, 2].map(i => <div key={i} className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'reporte' && diagnostico) {
    const proms = categorias.map(c => puntajes[c.id] || 5);
    const prom = proms.length > 0 ? (proms.reduce((a, b) => a + b, 0) / proms.length).toFixed(1) : '0';
    return (
      <div className="min-h-screen bg-[#F4F4F7] overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <button onClick={onClose} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4">
            <ChevronLeft className="w-4 h-4" /> Cerrar
          </button>

          <h2 className="text-2xl font-bold text-gray-800 mb-6">Reporte de Diagnóstico</h2>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white/80 rounded-md p-4 border border-gray-100 text-center shadow-sm">
              <p className="text-xs text-gray-400 mb-1">Promedio General</p>
              <p className="text-3xl font-black text-gray-800">{prom}</p>
            </div>
            <div className="bg-white/80 rounded-md p-4 border border-gray-100 text-center shadow-sm">
              <p className="text-xs text-gray-400 mb-1">Nivel de Equilibrio</p>
              <p className="text-sm font-bold text-purple-600">{diagnostico.nivel_equilibrio}</p>
            </div>
            <div className="bg-white/80 rounded-md p-4 border border-gray-100 text-center shadow-sm">
              <p className="text-xs text-gray-400 mb-1">Pico Alto</p>
              <p className="text-sm font-bold text-green-600">{diagnostico.pico_alto}</p>
            </div>
          </div>

          <div className="bg-white/80 rounded-md p-4 border border-gray-100 shadow-sm mb-6">
            <p className="text-xs text-gray-400 mb-1">Pico Bajo</p>
            <p className="text-sm font-bold text-red-500">{diagnostico.pico_bajo}</p>
          </div>

          <h3 className="font-bold text-gray-800 text-sm mb-3 uppercase tracking-wider">Focos Estratégicos</h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {focosList.map((f, i) => (
              <div key={i} className={`bg-gradient-to-br ${i === 0 ? 'from-red-50 to-red-100' : i === 1 ? 'from-amber-50 to-amber-100' : 'from-blue-50 to-blue-100'} rounded-md p-4 border ${i === 0 ? 'border-red-200' : i === 1 ? 'border-amber-200' : 'border-blue-200'} shadow-sm text-center`}>
                <p className="text-xs text-gray-400 mb-1">Foco {i + 1}</p>
                <p className="font-bold text-gray-800 text-sm">{f}</p>
              </div>
            ))}
          </div>

          <div className="bg-white/80 rounded-md p-5 border border-gray-100 shadow-sm mb-6">
            <h4 className="font-bold text-gray-800 text-xs mb-2 uppercase tracking-wider">Justificación Estratégica</h4>
            <p className="text-sm text-gray-600 leading-relaxed">{diagnostico.justificacion_focos}</p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => { setScreen('acciones'); setFocoActivo(focosList[0] || ''); }}
              className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold rounded-md hover:shadow-lg transition-all flex items-center justify-center gap-2">
              <Target className="w-4 h-4" /> Ir al plan de acción
            </button>
            <button onClick={() => setScreen('evaluacion')}
              className="py-3 px-6 border border-gray-200 rounded-md text-sm text-gray-500 hover:bg-white transition-colors">
              Revisar puntajes
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'acciones') {
    const accionesFoco = acciones.filter(a => a.area_foco === focoActivo);
    const enviadas = accionesFoco.filter(a => a.enviada_kanban).length;
    const pendientes = accionesFoco.filter(a => !a.enviada_kanban);

    return (
      <div className="min-h-screen bg-[#F4F4F7] overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <button onClick={() => diagnostico ? setScreen('reporte') : setScreen('cierre')}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4">
            <ChevronLeft className="w-4 h-4" /> Volver
          </button>

          <h2 className="text-2xl font-bold text-gray-800 mb-2">Plan de Acción</h2>
          <p className="text-sm text-gray-500 mb-6">Área foco activa: <span className="font-bold text-purple-600">{focoActivo}</span></p>

          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {focosList.map(f => (
              <button key={f} onClick={() => setFocoActivo(f)}
                className={`px-4 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
                  focoActivo === f
                    ? 'bg-purple-500 text-white shadow-md'
                    : 'bg-white/70 border border-gray-200 text-gray-600 hover:bg-white'
                }`}>
                {f} {acciones.filter(a => a.area_foco === f && a.enviada_kanban).length > 0 && (
                  <CheckCircle2 className="inline w-3 h-3 ml-1 text-green-400" />
                )}
              </button>
            ))}
          </div>

          {pendientes.length === 0 && accionesFoco.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 text-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-green-700 font-medium">Todas las acciones de {focoActivo} fueron enviadas al Kanban</p>
            </div>
          )}

          <div className="space-y-2 mb-4">
            {accionesFoco.map(a => (
              <div key={a.id} className={`bg-white/80 rounded-md p-4 border shadow-sm flex items-center justify-between gap-3 ${
                a.enviada_kanban ? 'border-green-200 opacity-70' : 'border-gray-100'
              }`}>
                <div className="flex-1">
                  <p className={`text-sm ${a.enviada_kanban ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{a.texto}</p>
                  {a.enviada_kanban && <span className="text-[10px] text-green-500 font-medium flex items-center gap-1 mt-1"><Check className="w-3 h-3" /> Enviado al Kanban</span>}
                </div>
                {!a.enviada_kanban && (
                  <button onClick={() => handleEnviarKanban(a.id)} disabled={enviando[a.id]}
                    className="px-3 py-1.5 bg-gradient-to-r from-emerald-400 to-teal-500 text-white text-xs font-semibold rounded-md hover:shadow-md transition-all whitespace-nowrap flex items-center gap-1 disabled:opacity-50">
                    {enviando[a.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    Enviar
                  </button>
                )}
              </div>
            ))}
          </div>

          {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

          <div className="flex gap-3">
            <button onClick={() => handleGenerarAcciones(focoActivo)}
              className="flex-1 py-2.5 border-2 border-dashed border-purple-200 text-purple-500 text-sm font-semibold rounded-md hover:bg-purple-50 transition-colors">
              + Generar nuevas acciones (5)
            </button>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={() => setScreen('cierre')}
              className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold rounded-md hover:shadow-lg transition-all">
              Finalizar diagnóstico
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F4F7] flex items-center justify-center">
      <div className="max-w-md text-center px-6">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-emerald-400 to-teal-500 rounded-md flex items-center justify-center mb-6 shadow-xl">
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Diagnóstico completado</h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          Has completado tu evaluación de la Rueda de la Vida. 
          Tus focos estratégicos y acciones están listos en el dashboard.
        </p>
        <div className="flex flex-col gap-3">
          <button onClick={() => { setScreen('reporte'); }}
            className="w-full py-3 border border-gray-200 rounded-md text-sm text-gray-600 hover:bg-white transition-colors">
            Ver diagnóstico completo
          </button>
          <button onClick={onClose}
            className="w-full py-3 border border-gray-200 rounded-md text-sm text-gray-600 hover:bg-white transition-colors">
            Volver al dashboard
          </button>
          {onGoMetaAnual && (
            <button onClick={onGoMetaAnual}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold rounded-md hover:shadow-lg transition-all">
              Crear mi Gran Meta Anual
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
