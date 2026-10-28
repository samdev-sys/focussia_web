import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Heart, CheckCircle2, Sparkles, ArrowRight, ChevronLeft, X, Brain,
  AlertCircle, Loader2, Send, Check, BookOpen, Sliders, MessageSquare, SkipForward, Play,
  Trophy, Coins, HeartPulse, Briefcase, TrendingUp, Users, PartyPopper, Flower2, Lock,
  RefreshCw, Home, HandHeart, Star, Shield,
} from 'lucide-react';
import { notify } from '../services/notify';
import { ruedaService, configService, RuedaCategoria, DiagnosticoRuedaData, AccionSugeridaData } from '../services/api';
import { AVATAR_FILES, AVATARS } from '../constants/avatars';
import RuedaSVG, { colorPorArea } from './RuedaSVG';
import { FotoIntro, FotoGuia } from './RuedaIntroFotos';
import { RuedaShell } from './RuedaShell';

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

// Icono + descripción por área para el diseño de las fotos (claves en minúsculas,
// sin tildes). El avatar y su nombre siempre son los elegidos por el usuario.
const AREA_INFO: Record<string, { icon: React.ComponentType<{ className?: string }>; desc: string }> = {
  dinero: { icon: Coins, desc: 'Dinero refleja tu nivel de tranquilidad y control sobre tus ingresos, gastos, ahorro y compromisos financieros.' },
  salud: { icon: HeartPulse, desc: 'Salud refleja tu energía, tu descanso, tu alimentación, tu movimiento y tu cuidado personal.' },
  amor: { icon: Heart, desc: 'Amor y Familia refleja la calidad de tus vínculos afectivos, tu comunicación y el tiempo compartido.' },
  familia: { icon: Home, desc: 'Tu vínculo familiar: tiempo compartido, apoyo y armonía con los tuyos.' },
  trabajo: { icon: Briefcase, desc: 'Trabajo refleja tu satisfacción con tu rol, tu crecimiento profesional y tu equilibrio laboral.' },
  crecimiento: { icon: TrendingUp, desc: 'Crecimiento personal refleja tu aprendizaje, tus hábitos y tu evolución constante.' },
  desarrollo: { icon: TrendingUp, desc: 'Tu crecimiento: aprendizaje, habilidades y nuevos retos.' },
  amistad: { icon: Users, desc: 'Amistad y diversión refleja tus vínculos sociales, tus risas y los momentos que compartes.' },
  ocio: { icon: PartyPopper, desc: 'Ocio y disfrute refleja tu capacidad de descansar, jugar y disfrutar tu tiempo libre.' },
  diversion: { icon: PartyPopper, desc: 'El juego en tu vida: hobbies, risas, descanso y tiempo libre.' },
  espiritualidad: { icon: Flower2, desc: 'Espiritualidad refleja tu conexión interior, tu propósito, tus valores y tu calma.' },
  pareja: { icon: Heart, desc: 'La calidad de tu relación de pareja: comunicación, conexión y proyectos comunes.' },
  entorno: { icon: Home, desc: 'Tus espacios: hogar, trabajo y lugares que habitas cada día.' },
  contribucion: { icon: HandHeart, desc: 'Lo que aportas a otros: ayuda, impacto y legado.' },
};

function areaKey(nombre: string): string {
  return (nombre || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(' ')[0];
}

function capNombre(nombre: string): string {
  const s = nombre || '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function AreaIcon({ nombre, className }: { nombre: string; className?: string }) {
  const info = AREA_INFO[areaKey(nombre)];
  const Icon = info?.icon || Star;
  return <Icon className={className} />;
}

function areaDesc(nombre: string): string {
  const info = AREA_INFO[areaKey(nombre)];
  if (info) return info.desc;
  return ORIENTACIONES[nombre] || 'Un área clave de tu equilibrio de vida.';
}

function NivelBadge({ puntaje }: { puntaje: number }) {
  const n = nivelStr(puntaje);
  const styles: Record<string, string> = {
    'Crítico': 'bg-red-100 text-red-600',
    'Bajo': 'bg-rose-100 text-red-500',
    'Medio': 'bg-amber-100 text-amber-600',
    'Bueno': 'bg-blue-100 text-blue-600',
    'Excelente': 'bg-green-100 text-green-600',
  };
  return (
    <span className={`px-6 py-2 rounded-full text-sm font-bold tracking-wide ${styles[n.label] || 'bg-gray-100 text-gray-500'}`}>
      {n.label.toUpperCase()}
    </span>
  );
}

// Pregunta guía por área para la pantalla de evaluación (mockup).
const PREGUNTAS: Record<string, string> = {
  trabajo: '¿Qué tan satisfecho te sientes con tu rol actual, tu crecimiento profesional y tu equilibrio laboral?',
  dinero: '¿Qué tan satisfecho te sientes actualmente con tu situación financiera y la manera en que administras tu dinero?',
  salud: '¿Qué tan satisfecho te sientes con tu energía, tu descanso, tu alimentación y tu movimiento diario?',
  pareja: '¿Qué tan satisfecho te sientes con la comunicación, la conexión y los proyectos comunes en tu relación de pareja?',
  familia: '¿Qué tan satisfecho te sientes con el tiempo compartido, el apoyo y la armonía con tu familia?',
  espiritualidad: '¿Qué tan satisfecho te sientes con tu propósito, tus valores y tu calma interior?',
  diversion: '¿Qué tan satisfecho te sientes con tus hobbies, tus risas y tu tiempo libre?',
  entorno: '¿Qué tan satisfecho te sientes con tu hogar y los espacios donde vives y trabajas cada día?',
  desarrollo: '¿Qué tan satisfecho te sientes con tu aprendizaje, tus habilidades y tus nuevos retos?',
  contribucion: '¿Qué tan satisfecho te sientes con lo que aportas a otros: tu ayuda, tu impacto y tu legado?',
};

function preguntaArea(nombre: string): string {
  return PREGUNTAS[areaKey(nombre)] || areaDesc(nombre);
}

// Breve orientación por área (spec: cada área tendrá nombre + breve orientación)
const ORIENTACIONES: Record<string, string> = {
  Trabajo: 'Qué tan satisfecho estás con tu trabajo, tu rol y tu crecimiento profesional.',
  Dinero: 'Tu relación con el dinero: ingresos, ahorro, deudas y tranquilidad financiera.',
  Salud: 'Tu cuerpo y tu energía: descanso, alimentación, ejercicio y chequeos.',
  Pareja: 'La calidad de tu relación de pareja: comunicación, conexión y proyectos comunes.',
  Familia: 'Tu vínculo familiar: tiempo compartido, apoyo y armonía con los tuyos.',
  Espiritualidad: 'Tu vida interior: propósito, valores, calma y conexión.',
  Diversión: 'El juego en tu vida: hobbies, risas, descanso y tiempo libre.',
  Entorno: 'Tus espacios: hogar, trabajo y lugares que habitas cada día.',
  Desarrollo: 'Tu crecimiento: aprendizaje, habilidades y nuevos retos.',
  Contribución: 'Lo que aportas a otros: ayuda, impacto y legado.',
};

const VIDEO_SEGUNDOS = 25;
const TEXTO_VIDEO = 'Antes de construir una meta anual, necesitamos mirar tu punto de partida. La Rueda de la Vida te ayudará a evaluar diez áreas importantes de tu vida, reconocer qué está fuerte, detectar qué necesita atención y descubrir dónde conviene poner el foco para recuperar equilibrio. Responde con sinceridad: este diagnóstico será la base para avanzar con dirección real.';

interface DiagnosticoRuedaProps {
  avatarIndex?: number;
  userName?: string;
  onClose: () => void;
  onGoMetaAnual?: () => void;
  /** Abrir directo en el detalle de un foco (diseño de fotos "ÁREA FOCO") */
  pantallaInicial?: 'acciones';
  focoInicial?: string;
  onNavigate?: (section: string) => void;
}

export default function DiagnosticoRueda({ avatarIndex = 0, userName = '', onClose, onGoMetaAnual, pantallaInicial, focoInicial, onNavigate }: DiagnosticoRuedaProps) {
  const [screen, setScreen] = useState<'intro' | 'video' | 'instruccion' | 'evaluacion' | 'procesando' | 'reporte' | 'acciones' | 'cierre'>('intro');
  const [categorias, setCategorias] = useState<RuedaCategoria[]>([]);
  const [puntajes, setPuntajes] = useState<Record<number, number>>({});
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [areaSel, setAreaSel] = useState<number | null>(null);
  const [guardadas, setGuardadas] = useState<Set<number>>(new Set());
  const [diagnostico, setDiagnostico] = useState<DiagnosticoRuedaData | null>(null);
  const [acciones, setAcciones] = useState<AccionSugeridaData[]>([]);
  const [focoActivo, setFocoActivo] = useState<string>('');
  const [seleccionadas, setSeleccionadas] = useState<Set<number>>(new Set());
  const [enviandoBulk, setEnviandoBulk] = useState(false);
  const [confirmacion, setConfirmacion] = useState('');
  const [limiteAcciones, setLimiteAcciones] = useState(false);
  const [totalArea, setTotalArea] = useState(0);
  const [videoAvance, setVideoAvance] = useState(0);
  const [videoListo, setVideoListo] = useState(false);
  const [reportePaso, setReportePaso] = useState<'rueda' | 'fuertes' | 'focos' | 'resumen' | 'focosFinal'>('rueda');
  const [avatarName, setAvatarName] = useState('');
  const videoTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const nombre = userName?.trim() || '';
  const avatarImg = avatarIndex > 0 ? AVATAR_FILES[avatarIndex] : null;
  // Nombre del avatar elegido por el usuario (para "ACCIONES SUGERIDAS POR ...")
  const nombreAvatar = (avatarName || AVATARS.find(a => a.index === avatarIndex)?.name || '').toUpperCase();

  useEffect(() => {
    configService.getAvatar().then(a => {
      const nm = (a.avatar as { name?: unknown } | null)?.name;
      if (typeof nm === 'string' && nm.trim()) setAvatarName(nm.trim());
    }).catch(() => {});
  }, []);

  useEffect(() => {
    ruedaService.getCompleta().then(data => {
      setCategorias(data);
      const p: Record<number, number> = {};
      const c: Record<string, string> = {};
      data.forEach(cat => { p[cat.id] = cat.puntaje; c[String(cat.id)] = cat.comentario || ''; });
      setPuntajes(p);
      setComentarios(c);
      if (data.length > 0) setAreaSel(data[0].id);
    }).catch(() => notify.error('Error al cargar'));
    // Entrada directa al detalle de un foco (desde el dashboard): carga el
    // diagnóstico guardado para focos/reporte y abre la pantalla ÁREA FOCO.
    if (pantallaInicial === 'acciones' && focoInicial) {
      ruedaService.verDiagnostico().then((res: any) => {
        // El backend devuelve el diag directo o {diagnostico: null} si no hay.
        const diag = res?.diagnostico ?? (res?.foco_1 ? res : null);
        if (diag) setDiagnostico(diag);
        setFocoActivo(focoInicial);
        setScreen('acciones');
      }).catch(() => {
        setFocoActivo(focoInicial);
        setScreen('acciones');
      });
    }
  }, []);

  useEffect(() => () => {
    if (videoTimer.current) clearInterval(videoTimer.current);
  }, []);

  const iniciarVideo = useCallback(() => {
    if (videoTimer.current) clearInterval(videoTimer.current);
    setVideoAvance(0);
    setVideoListo(false);
    videoTimer.current = setInterval(() => {
      setVideoAvance(prev => {
        if (prev + 1 >= VIDEO_SEGUNDOS) {
          if (videoTimer.current) clearInterval(videoTimer.current);
          setVideoListo(true);
          return VIDEO_SEGUNDOS;
        }
        return prev + 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    if (screen !== 'acciones' || !focoActivo) return;
    ruedaService.listarAcciones(focoActivo).then(existing => {
      if (existing.length > 0) {
        setAcciones(prev => {
          const otherFoci = prev.filter(a => a.area_foco !== focoActivo);
          return [...otherFoci, ...existing];
        });
        setTotalArea(existing.length);
      } else {
        ruedaService.generarAcciones(focoActivo).then(res => {
          setAcciones(prev => {
            const otherFoci = prev.filter(a => a.area_foco !== focoActivo);
            return [...otherFoci, ...res.acciones];
          });
          setTotalArea(res.total_area);
        }).catch(() => notify.error('Error al generar acciones'));
      }
      setSeleccionadas(new Set());
      setConfirmacion('');
      setLimiteAcciones(false);
    }).catch(() => notify.error('Error al cargar acciones'));
  }, [screen, focoActivo]);

  const guardarArea = useCallback((id: number) => {
    setGuardadas(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const handleGuardarYDiagnosticar = useCallback(async () => {
    setScreen('procesando');
    try {
      await ruedaService.guardar(puntajes, comentarios);
      const diag = await ruedaService.generarDiagnostico(puntajes, comentarios);
      setDiagnostico(diag);
      setReportePaso('rueda');
      await new Promise(r => setTimeout(r, 1200));
      // Al terminar la evaluación se entra directo al ÁREA FOCO (fotos);
      // el reporte completo queda disponible vía "VOLVER AL DIAGNÓSTICO".
      const focos = [diag.foco_1, diag.foco_2, diag.foco_3].filter(Boolean);
      setFocoActivo(focos[0] || '');
      setScreen('acciones');
    } catch {
      notify.error('Error al generar diagnóstico');
      setScreen('evaluacion');
    }
  }, [puntajes, comentarios]);

  const handleGenerarAcciones = useCallback(async (area: string) => {
    setConfirmacion('');
    try {
      const res = await ruedaService.generarAcciones(area);
      setAcciones(prev => {
        const other = prev.filter(a => a.area_foco !== area);
        return [...other, ...res.acciones];
      });
      setTotalArea(res.total_area);
      if (res.disponibles === 0) setLimiteAcciones(true);
    } catch (e: any) {
      if (e.response?.data?.code === 'limite_20') {
        setLimiteAcciones(true);
        notify.warning(e.response.data.error);
      } else notify.error('Error al generar acciones');
    }
  }, []);

  const marcarEnviada = useCallback((accionId: number) => {
    setAcciones(prev => prev.map(a => a.id === accionId ? { ...a, enviada_kanban: true } : a));
    setSeleccionadas(prev => {
      const next = new Set(prev);
      next.delete(accionId);
      return next;
    });
  }, []);

  const toggleSeleccion = useCallback((accionId: number) => {
    setSeleccionadas(prev => {
      const next = new Set(prev);
      if (next.has(accionId)) next.delete(accionId);
      else next.add(accionId);
      return next;
    });
  }, []);

  const handleEnviarSeleccionadas = useCallback(async () => {
    const ids = [...seleccionadas];
    if (ids.length === 0 || enviandoBulk) return;
    setEnviandoBulk(true);
    setConfirmacion('');
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
      setConfirmacion(`Listo${nombre ? ', ' + nombre : ''}. Estas acciones fueron enviadas a tu Kanban Backlog para que puedas ordenarlas y decidir cuándo ejecutarlas.`);
    }
  }, [seleccionadas, enviandoBulk, marcarEnviada, nombre]);

  const focosList = diagnostico
    ? [diagnostico.foco_1, diagnostico.foco_2, diagnostico.foco_3].filter(Boolean)
    : [];

  const datosRueda: { id: number; nombre: string; puntaje: number; icono: string }[] =
    categorias.map(c => ({ id: c.id, nombre: c.nombre, puntaje: puntajes[c.id] ?? 0, icono: c.icono }));

  const renderContent = () => {
    if (screen === 'intro') {
      return (
        <FotoIntro
          nombre={nombre}
          avatarImg={avatarImg}
          videoAvance={0}
          videoSegundos={VIDEO_SEGUNDOS}
          videoListo={false}
          textoVideo={TEXTO_VIDEO}
          onPlay={() => { setScreen('video'); iniciarVideo(); }}
          onComenzar={() => setScreen('instruccion')}
          onSaltar={() => setScreen('instruccion')}
        />
      );
    }

    if (screen === 'video') {
      return (
        <FotoIntro
          nombre={nombre}
          avatarImg={avatarImg}
          videoAvance={videoAvance}
          videoSegundos={VIDEO_SEGUNDOS}
          videoListo={videoListo}
          textoVideo={TEXTO_VIDEO}
          onPlay={() => { if (videoAvance === 0 && !videoListo) iniciarVideo(); }}
          onComenzar={() => setScreen('instruccion')}
          onSaltar={() => setScreen('instruccion')}
        />
      );
    }

    if (screen === 'instruccion') {
      return (
        <FotoGuia
          onBack={() => setScreen('video')}
          onContinue={() => setScreen('evaluacion')}
        />
      );
    }

    if (screen === 'evaluacion') {
      const catSel = categorias.find(c => c.id === areaSel) ?? null;
      const valSel = catSel ? (puntajes[catSel.id] ?? 5) : 5;
      const faltan = categorias.length - guardadas.size;
      return (
        <div>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setScreen('instruccion')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600">
              <ChevronLeft className="w-4 h-4" /> Intro
            </button>
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">Toca cada segmento de tu rueda</h2>
            <p className="text-xs text-gray-400 whitespace-nowrap">{guardadas.size} de {categorias.length} áreas evaluadas</p>
          </div>
          <div className="flex items-start gap-4 bg-[#f6f2ff] border border-[#e9e2fb] rounded-2xl px-5 py-4 mb-4">
            <span className="shrink-0 w-14 h-14 flex items-center justify-center">
              <Shield className="w-12 h-12 text-[#5b5bd6]" strokeWidth={1.5} />
            </span>
            <p className="text-sm sm:text-[15px] text-[#1b2350] leading-relaxed">
              Evalúa cada área de tu vida del 1 al 10, donde 1 significa muy bajo y 10 significa muy alto.
              Responde con total sinceridad: este diagnóstico no es para juzgarte, sino para ayudarte a identificar
              dónde necesitas poner foco para recuperar equilibrio y construir tu Gran Meta Anual con dirección real.
            </p>
          </div>
          <div className="grid lg:grid-cols-[1fr_380px] gap-4 items-start">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-8 flex justify-center">
              <RuedaSVG
                datos={datosRueda}
                size={480}
                interactiva
                seleccionId={areaSel}
                guardadasIds={guardadas}
                onSeleccionar={setAreaSel}
                centro="oscuro"
                etiquetasExternas
              />
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6 min-h-[280px]">
              {catSel ? (
                <>
                  <div className="flex items-center gap-2.5 mb-3">
                    <AreaIcon nombre={catSel.nombre} className="w-8 h-8 text-[#2563eb]" />
                    <span className="font-black text-xl text-[#101433]">{capNombre(catSel.nombre)}</span>
                    {guardadas.has(catSel.id) && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                  </div>
                  <p className="text-[15px] text-[#1b2350] mb-5 leading-relaxed">{preguntaArea(catSel.nombre)}</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => {
                      const active = valSel === n;
                      return (
                        <button
                          key={n}
                          onClick={() => setPuntajes(p => ({ ...p, [catSel.id]: n }))}
                          className={`w-10 h-10 rounded-full text-sm font-bold transition-all border ${
                            active
                              ? 'bg-[#7c3aed] border-[#7c3aed] text-white shadow-md scale-105'
                              : 'bg-white border-[#c4b5fd] text-[#1b2350] hover:border-[#7c3aed]'
                          }`}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4 px-0.5">
                    <span>Muy bajo</span>
                    <span>Muy alto</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Comentario opcional</p>
                  <textarea
                    placeholder=""
                    value={comentarios[String(catSel.id)] || ''}
                    onChange={e => setComentarios(c => ({ ...c, [String(catSel.id)]: e.target.value }))}
                    rows={4}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100 text-gray-700 resize-none mb-4"
                  />
                  <button onClick={() => guardarArea(catSel.id)}
                    className="w-full py-3.5 bg-gradient-to-r from-[#2563eb] to-[#c026d3] text-white rounded-xl font-bold text-base hover:brightness-110 active:scale-[0.99] transition-all">
                    Guardar evaluación
                  </button>
                </>
              ) : (
                <p className="text-sm text-gray-400 text-center py-10">Selecciona un segmento de la rueda para evaluarlo.</p>
              )}
            </div>
          </div>
          <button onClick={handleGuardarYDiagnosticar} disabled={faltan > 0}
            className={`w-full mt-4 py-3.5 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${faltan > 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-[#2547f4] to-[#6d28d9] text-white hover:shadow-lg'}`}>
            <Brain className="w-4 h-4" /> {faltan > 0 ? `Te faltan ${faltan} áreas por evaluar` : 'Generar diagnóstico'}
          </button>
        </div>
      );
    }

    if (screen === 'procesando') {
      return (
        <div className="py-16 flex items-center justify-center">
          <div className="text-center">
            {avatarImg ? (
              <img src={avatarImg} alt="avatar" className="w-24 h-24 rounded-2xl object-cover mx-auto mb-6 shadow-xl" />
            ) : (
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl flex items-center justify-center mb-6 animate-pulse shadow-xl">
                <Brain className="w-12 h-12 text-white" />
              </div>
            )}
            <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Buen trabajo{nombre ? `, ${nombre}` : ''}! Analizando tus respuestas</h2>
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
      const promNum = proms.length > 0 ? (proms.reduce((a, b) => a + b, 0) / proms.length) : 0;
      const prom = proms.length > 0 ? promNum.toFixed(1).replace('.', ',') : '0';
      const ordenados = [...datosRueda].sort((a, b) => b.puntaje - a.puntaje);
      const fuertes = ordenados.slice(0, 3).map(d => d.nombre);
      const debiles = ordenados.slice(-3).map(d => d.nombre);
      const nivelLower = diagnostico.nivel_equilibrio.toLowerCase();
      const sintesis = `Tu rueda muestra fortalezas en ${fuertes.join(', ').replace(/, ([^,]*)$/, ' y $1')}. `
        + `Las áreas que requieren mayor atención son ${debiles.join(', ').replace(/, ([^,]*)$/, ' y $1')}. `
        + `Tu promedio general es ${prom} y tu nivel de equilibrio es ${nivelLower}. `
        + `Focusia propone priorizar ${focosList.join(', ').replace(/, ([^,]*)$/, ' y $1')}: `
        + `fortalecer estas áreas puede reducir presión, recuperar energía y sostener mejores decisiones en el resto de tu vida.`;
      const NIVEL_PILL: Record<string, string> = {
        'Crítico': 'bg-red-100 text-red-600',
        'Bajo': 'bg-orange-100 text-orange-600',
        'Medio': 'bg-yellow-100 text-yellow-700',
        'Bueno': 'bg-green-100 text-green-700',
        'Excelente': 'bg-emerald-100 text-emerald-700',
      };
      return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight mb-4">
            DIAGNÓSTICO DE TU <span className="text-[#1d4ed8]">RUEDA DE LA VIDA</span>
          </h2>
          <div className="grid lg:grid-cols-[1fr_300px_300px] gap-4 items-start">
            <div className="flex justify-center">
              <RuedaSVG
                datos={datosRueda}
                size={340}
                etiquetasInternas
                centroDiagnostico={{ promedio: prom, nivel: `EQUILIBRIO ${diagnostico.nivel_equilibrio.toUpperCase()}` }}
              />
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h3 className="font-black text-gray-900 tracking-wide mb-3">RESULTADOS</h3>
              <div className="space-y-1.5">
                {datosRueda.map((d, i) => {
                  const niv = nivelStr(d.puntaje);
                  return (
                    <div key={d.id} className="flex items-center gap-2 py-1">
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: colorPorArea(d.nombre, i) }}>
                        <AreaIcon nombre={d.nombre} className="w-4 h-4 text-white" />
                      </span>
                      <span className="flex-1 text-sm text-gray-600">{d.nombre}</span>
                      <span className="font-extrabold text-gray-800 text-sm w-5 text-right">{d.puntaje}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${NIVEL_PILL[niv.label] || 'bg-gray-100 text-gray-500'}`}>
                        {niv.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h3 className="font-black tracking-wide mb-3">
                INTERPRETACIÓN DE <span className="text-[#6d28d9]">{nombreAvatar || 'LÍA'}</span>
              </h3>
              <div className="flex gap-3 mb-3">
                {avatarImg ? (
                  <img src={avatarImg} alt="avatar" className="w-20 h-24 rounded-xl object-cover object-top shrink-0 shadow" />
                ) : (
                  <div className="w-20 h-24 rounded-xl bg-gradient-to-b from-[#2b3fd4] to-[#7a5af8] shrink-0" />
                )}
                <p className="text-[13px] text-gray-700 leading-relaxed">
                  <strong>Excelente{nombre ? `, ${nombre}` : ''}.</strong> Completaste tu Rueda de la Vida.
                  Ahora revisemos qué áreas están fuertes y cuáles necesitan mayor atención.
                </p>
              </div>
              <p className="text-[13px] text-indigo-900/80 leading-relaxed bg-purple-50/60 rounded-xl p-3">{sintesis}</p>
            </div>
          </div>
          <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h3 className="font-black tracking-wide mb-3">
              ÁREAS FOCO <span className="text-[#1d4ed8]">PRIORITARIAS</span>
            </h3>
            <div className="grid sm:grid-cols-4 gap-3 items-stretch">
              {focosList.map((f, i) => {
                const catF = categorias.find(c => c.nombre === f);
                const pf = catF ? (puntajes[catF.id] ?? 0) : 0;
                const hex = colorPorArea(f, i);
                return (
                  <button
                    key={f}
                    onClick={() => { setFocoActivo(f); setScreen('acciones'); }}
                    className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 hover:border-indigo-300 hover:shadow-md transition-all p-3 text-left"
                  >
                    <span className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: hex }}>
                      <AreaIcon nombre={f} className="w-6 h-6 text-white" />
                    </span>
                    <span>
                      <span className="block text-xs font-bold text-gray-500 tracking-wide">{f.toUpperCase()}</span>
                      <span className="block text-2xl font-black leading-none" style={{ color: hex }}>{pf}</span>
                    </span>
                  </button>
                );
              })}
              <button
                onClick={onClose}
                className="py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#2b5cff] to-[#a855f7] text-white text-sm font-bold hover:shadow-lg transition-all"
              >
                IR AL DASHBOARD PRINCIPAL
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
      const seleccionables = pendientes.filter(a => seleccionadas.has(a.id));
      const catFoco = categorias.find(c => c.nombre === focoActivo) ?? null;
      const puntajeFoco = catFoco ? (puntajes[catFoco.id] ?? 0) : 0;
      const nivelFoco = nivelStr(puntajeFoco);
      const porqueFoco = `${focoActivo.charAt(0).toUpperCase() + focoActivo.slice(1)} fue seleccionada como área foco porque actualmente presenta un nivel ${nivelFoco.label.toLowerCase()} y puede estar generando presión sobre tus decisiones, tu tranquilidad y otras áreas de tu vida.`;

      return (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              ÁREA FOCO: <span className="text-[#1d4ed8]">{focoActivo.toUpperCase()}</span>
            </h2>
            <button onClick={() => diagnostico ? setScreen('reporte') : setScreen('cierre')}
              className="flex items-center gap-1 px-5 py-2.5 rounded-full border-2 border-[#2b5cff] text-[#2b5cff] text-sm font-bold hover:bg-blue-50 transition-colors">
              <ChevronLeft className="w-4 h-4" /> VOLVER AL DIAGNÓSTICO COMPLETO
            </button>
          </div>
          {focosList.length > 1 && (
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {focosList.map(f => (
                <button key={f} onClick={() => setFocoActivo(f)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                    focoActivo === f
                      ? 'bg-[#1e3a5f] text-white shadow-md'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}>
                  {f} {acciones.filter(a => a.area_foco === f && a.enviada_kanban).length > 0 && (
                    <CheckCircle2 className="inline w-3 h-3 ml-1 text-green-400" />
                  )}
                </button>
              ))}
            </div>
          )}
          <div className="grid lg:grid-cols-[340px_1fr] gap-4 items-start">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-[#1d4ed8] to-[#3b82f6] flex items-center justify-center shadow-lg mb-3">
                <AreaIcon nombre={focoActivo} className="w-14 h-14 text-white" />
              </div>
              <h3 className="text-center text-xl font-extrabold text-[#101331] tracking-wide mb-2">{focoActivo.toUpperCase()}</h3>
              <p className="text-[13px] text-indigo-900/80 text-center leading-relaxed mb-4">{catFoco ? areaDesc(catFoco.nombre) : ''}</p>
              <div className="flex items-center justify-center gap-4 border border-gray-200 rounded-2xl py-3 px-4 mb-5">
                <div className="text-center">
                  <p className="text-[11px] font-bold tracking-widest text-gray-700">PUNTAJE</p>
                  <p className="text-4xl font-black text-[#1d4ed8] leading-none mt-1">{puntajeFoco}</p>
                </div>
                <div className="w-px self-stretch bg-gray-200" />
                <NivelBadge puntaje={puntajeFoco} />
              </div>
              <h4 className="font-extrabold text-[#101331] text-sm mb-3">¿POR QUÉ FUE SELECCIONADA?</h4>
              <div className="flex gap-3">
                {avatarImg ? (
                  <img src={avatarImg} alt="coach" className="w-24 h-32 rounded-xl object-cover object-top shrink-0 shadow" />
                ) : (
                  <div className="w-24 h-32 rounded-xl bg-gradient-to-b from-[#2b3fd4] to-[#7a5af8] shrink-0" />
                )}
                <p className="text-[13px] text-indigo-900/80 leading-relaxed">{porqueFoco}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-xl sm:text-2xl font-black text-gray-900">
                ACCIONES SUGERIDAS <span className="text-[#6d28d9]">POR {nombreAvatar || 'LÍA'}</span>
              </h3>
              <p className="text-sm text-indigo-900/70 mt-1 mb-4">Selecciona una o varias acciones para enviarlas a tu Kanban Backlog.</p>
              {confirmacion && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3 flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <p className="text-[13px] text-green-800 leading-relaxed">{confirmacion}</p>
                </div>
              )}
              {limiteAcciones && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
                  <p className="text-xs text-amber-700">Focusia recomienda no generar más acciones por ahora, para evitar saturación y ayudarte a avanzar con foco.</p>
                </div>
              )}
              <div className="space-y-2.5 max-h-[46vh] overflow-y-auto pr-1 mb-4">
                {pendientes.length === 0 && accionesFoco.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                    <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-green-700 font-medium">Todas las acciones de {focoActivo} fueron enviadas al Kanban</p>
                  </div>
                )}
                {accionesFoco.map((a, idx) => {
                  const sent = a.enviada_kanban;
                  return (
                    <div key={a.id} className={`rounded-xl border p-3 flex items-center gap-3 transition-all ${
                      sent ? 'bg-green-50/70 border-green-100' : 'bg-white border-gray-200 hover:border-indigo-200 hover:shadow-sm'
                    }`}>
                      <button
                        onClick={() => { if (!sent) toggleSeleccion(a.id); }}
                        disabled={sent}
                        aria-label={sent ? 'Enviada' : 'Seleccionar acción'}
                        className={`w-7 h-7 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                          sent ? 'bg-green-600 border-green-600 text-white' : seleccionadas.has(a.id) ? 'bg-[#1e3a5f] border-[#1e3a5f] text-white' : 'border-indigo-300 text-transparent hover:border-indigo-500'
                        }`}
                      >
                        <Check className="w-4 h-4" strokeWidth={3} />
                      </button>
                      <span className="w-9 h-9 rounded-full bg-blue-50 text-[#1d4ed8] font-extrabold text-sm shrink-0 flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <p className="flex-1 text-[14px] text-indigo-950 leading-snug">{a.texto}</p>
                      {sent && (
                        <span className="flex items-center gap-2 shrink-0">
                          <Lock className="w-4 h-4 text-green-700" />
                          <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-extrabold tracking-wide">ENVIADO AL KANBAN</span>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {!limiteAcciones && (
                  <button onClick={() => handleGenerarAcciones(focoActivo)}
                    className="py-3.5 px-4 rounded-xl border-2 border-[#2b5cff] text-[#2b5cff] font-bold text-sm hover:bg-blue-50 transition-all flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4" /> GENERAR NUEVAS ACCIONES
                  </button>
                )}
                <button onClick={handleEnviarSeleccionadas} disabled={seleccionables.length === 0 || enviandoBulk}
                  className={`py-3.5 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    seleccionables.length === 0 || enviandoBulk
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#2b5cff] to-[#a855f7] text-white hover:shadow-lg'
                  }`}>
                  {enviandoBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  ENVIAR AL KANBAN BACKLOG{seleccionables.length > 0 ? ` (${seleccionables.length})` : ''}
                </button>
              </div>
              <button onClick={() => setScreen('cierre')}
                className="w-full mt-3 py-2.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                Finalizar diagnóstico →
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-8 grid lg:grid-cols-[280px_1fr_340px] gap-6 items-center">
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-[#2b3fd4] via-[#4b3fd6] to-[#7a5af8] min-h-[380px]">
          {avatarImg ? (
            <img src={avatarImg} alt="Coach" className="absolute inset-0 w-full h-full object-cover object-top" />
          ) : (
            <div className="absolute inset-0" />
          )}
          <div className="absolute inset-x-0 bottom-0 p-4 flex justify-center gap-1.5">
            {[0, 1, 2, 3, 4, 5, 6].map(i => (
              <span key={i} className={`h-1.5 rounded-full ${i === 0 ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`} />
            ))}
          </div>
        </div>
        <div className="flex justify-center">
          <RuedaSVG datos={datosRueda} size={380} />
        </div>
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6">
          <span className="text-5xl font-black text-indigo-200 leading-none">“</span>
          <p className="text-[17px] text-gray-800 leading-relaxed">
            Ahora que viste tus áreas fuertes y tus áreas foco, Focusia puede ayudarte a construir una
          </p>
          <p className="text-3xl font-black leading-tight mt-2 bg-gradient-to-r from-[#1d4ed8] to-[#a855f7] bg-clip-text text-transparent">
            GRAN META<br />ANUAL
          </p>
          <p className="text-[15px] text-[#4c1d95] font-medium leading-relaxed mt-3">
            que ordene tu energía,<br />tus decisiones y tus acciones.
          </p>
          <div className="flex flex-col gap-2.5 mt-6">
            {onGoMetaAnual && (
              <button onClick={onGoMetaAnual}
                className="w-full py-3.5 bg-gradient-to-r from-[#2b5cff] to-[#a855f7] text-white text-sm font-bold rounded-xl hover:shadow-lg transition-all">
                Crear mi Gran Meta Anual
              </button>
            )}
            <button onClick={() => setScreen('reporte')}
              className="w-full py-2.5 border border-gray-200 rounded-xl text-xs text-gray-500 hover:bg-gray-50 transition-colors">
              Ver diagnóstico completo
            </button>
            <button onClick={onClose}
              className="w-full py-2.5 border border-gray-200 rounded-xl text-xs text-gray-500 hover:bg-gray-50 transition-colors">
              Ir al dashboard principal
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <RuedaShell userName={nombre} avatarImg={avatarImg} onClose={onClose} onNavigate={onNavigate}>
      {renderContent()}
    </RuedaShell>
  );
}
