import React, { useState, useRef, useEffect } from 'react';
import {
  X, Check, Calendar, Users, Trash2, ClipboardCheck,
  ArrowRight, RotateCcw, Play, GripVertical,
} from 'lucide-react';
import { matrizEisenhowerService, authService, configuracionService } from '../services/api';
import { AVATAR_FILES, AVATARS } from '../constants/avatars';

interface MatrizEisenhowerProps {
  className?: string;
  onClose?: () => void;
  onGoKanban?: () => void;
  userName?: string;
  avatarIndex?: number;
  avatarUrl?: string;
  avatarName?: string;
}

type Paso = 1 | 2 | 3 | 4 | 5;

interface Cuadrante {
  id: 'hacer' | 'planificar' | 'delegar' | 'eliminar';
  label: string;
  criterio: string;
  explicacion: string;
  gradiente: string;
  pastilla: string;
}

const CUADRANTES: Cuadrante[] = [
  {
    id: 'planificar', label: 'PLANIFICAR', criterio: 'Importante, pero no urgente',
    explicacion: 'Tareas importantes que deben organizarse con tiempo.',
    gradiente: 'from-[#b45bff] to-[#7a2bff]', pastilla: 'bg-[#a855f7]',
  },
  {
    id: 'hacer', label: 'HACER', criterio: 'Urgente e importante',
    explicacion: 'Tareas urgentes e importantes que requieren atención inmediata.',
    gradiente: 'from-[#2ea6ff] to-[#166bff]', pastilla: 'bg-[#1a7bff]',
  },
  {
    id: 'eliminar', label: 'ELIMINAR', criterio: 'No urgente y no importante',
    explicacion: 'Tareas que no aportan valor y deben salir del camino.',
    gradiente: 'from-[#ff7e6e] to-[#ff5147]', pastilla: 'bg-[#ff6b5e]',
  },
  {
    id: 'delegar', label: 'DELEGAR', criterio: 'Urgente, pero no importante',
    explicacion: 'Tareas urgentes que otra persona podría realizar.',
    gradiente: 'from-[#2dd4bf] to-[#00a99c]', pastilla: 'bg-[#14b8a6]',
  },
];

const ORDEN_EJERCICIO: Cuadrante[] = [
  CUADRANTES[1], CUADRANTES[0], CUADRANTES[3], CUADRANTES[2],
];

const EJERCICIOS = [
  {
    tarea: 'Resolver una situación importante que vence hoy y afecta una meta del mes.',
    correcto: 'hacer' as const,
    feedback: 'Es urgente e importante; requiere acción inmediata.',
  },
  {
    tarea: 'Diseñar una estrategia para avanzar en una meta importante durante las próximas semanas.',
    correcto: 'planificar' as const,
    feedback: 'Es importante, pero no necesita resolverse de inmediato.',
  },
  {
    tarea: 'Coordinar una gestión simple que otra persona puede realizar sin afectar el resultado.',
    correcto: 'delegar' as const,
    feedback: 'Puede ser urgente, pero no necesariamente debe hacerla usted.',
  },
  {
    tarea: 'Revisar redes sociales sin objetivo mientras posterga una tarea relevante.',
    correcto: 'eliminar' as const,
    feedback: 'No aporta valor directo y distrae del foco principal.',
  },
];

const STEP_STORAGE_KEY = 'matriz_paso_v1';
const FALLBACK_AVATAR_IMG = AVATAR_FILES[4] || '/avatars/Lia.jpeg';

function IconoCuadrante({ id, className = 'w-12 h-12' }: { id: string; className?: string }) {
  if (id === 'hacer') return (
    <span className={`inline-flex items-center justify-center rounded-full border-[3px] border-white/95 ${className}`}>
      <Check className="w-1/2 h-1/2 text-white" strokeWidth={3} />
    </span>
  );
  if (id === 'planificar') return <Calendar className={`${className} text-white`} strokeWidth={1.6} />;
  if (id === 'delegar') return <Users className={`${className} text-white`} strokeWidth={1.6} />;
  return <Trash2 className={`${className} text-white`} strokeWidth={1.6} />;
}

export const MatrizEisenhower: React.FC<MatrizEisenhowerProps> = ({ className = '', onClose, onGoKanban, userName = '', avatarIndex = 0, avatarUrl = '', avatarName = '' }) => {
  const [paso, setPaso] = useState<Paso>(1);
  const [videoEnded, setVideoEnded] = useState(false);
  const [explorados, setExplorados] = useState<Set<string>>(new Set());
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [ejercicioIdx, setEjercicioIdx] = useState(0);
  const [respuestaActual, setRespuestaActual] = useState<string | null>(null);
  const [respuestas, setRespuestas] = useState<Record<number, string>>({});
  const [cargando, setCargando] = useState(false);
  const [showResume, setShowResume] = useState(false);
  const [resumeStep, setResumeStep] = useState<Paso>(1);
  const [yaCompletado, setYaCompletado] = useState(false);
  const [liaOk, setLiaOk] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  // Avatar: props primero, pero si vienen vacíos se lee directo del backend
  // para no depender del momento en que el dashboard cargó el perfil.
  const [avatarIdxState, setAvatarIdxState] = useState(avatarIndex);
  const [avatarUrlState, setAvatarUrlState] = useState(avatarUrl);

  const nombre = userName?.trim() || 'Roberto';
  const avatarImg = (avatarUrlState?.trim() || (avatarIdxState > 0 ? AVATAR_FILES[avatarIdxState] : '')) || FALLBACK_AVATAR_IMG;
  const avatarNombre = (avatarName?.trim() || AVATARS.find(a => (a as unknown as { index?: number }).index === avatarIdxState || (a as unknown as { id?: number }).id === avatarIdxState)?.name || (avatarUrlState?.trim() ? nombre : 'Lía')).toUpperCase();

  useEffect(() => {
    if (avatarIndex > 0) setAvatarIdxState(avatarIndex);
    if (avatarUrl?.trim()) setAvatarUrlState(avatarUrl);
  }, [avatarIndex, avatarUrl]);

  useEffect(() => {
    if (avatarUrlState?.trim() || avatarIdxState > 0) return;
    let cancelled = false;
    (async () => {
      try {
        const [data, config] = await Promise.all([
          authService.getCurrentUser(),
          configuracionService.getMiConfig(),
        ]);
        if (cancelled) return;
        const idx = Number((config as unknown as { avatar_index?: number })?.avatar_index) || 0;
        if (idx > 0 && AVATAR_FILES[idx]) {
          setAvatarIdxState(idx);
        } else if ((data as unknown as { avatar_url?: string })?.avatar_url?.trim()) {
          setAvatarUrlState((data as unknown as { avatar_url: string }).avatar_url);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    matrizEisenhowerService.getProgress().then(p => {
      if (cancelled) return;
      if ((p as unknown as { status?: string })?.status === 'COMPLETADO') setYaCompletado(true);
      const last = (p as unknown as { last_step?: number })?.last_step;
      const saved = typeof last === 'number' && last >= 1 && last <= 5
        ? (last as Paso)
        : (Number(localStorage.getItem(STEP_STORAGE_KEY)) as Paso || 1);
      const st = (p as unknown as { status?: string })?.status;
      if ((st === 'EN_PROGRESO' || st === 'INCOMPLETO') && saved > 1) {
        setResumeStep(saved);
        setShowResume(true);
      }
      if ((p as unknown as { video_watched?: boolean })?.video_watched) setVideoEnded(true);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const persistStep = (s: Paso) => {
    try { localStorage.setItem(STEP_STORAGE_KEY, String(s)); } catch {}
    matrizEisenhowerService.updateProgress({ last_step: s, status: 'EN_PROGRESO' } as never).catch(() => {});
  };
  const goPaso = (s: Paso) => { setPaso(s); persistStep(s); };

  const handleVideoEnd = () => {
    setVideoEnded(true);
    matrizEisenhowerService.updateProgress({ video_watched: true, last_step: 2 } as never).catch(() => {});
  };

  const tocarCuadrante = (id: string) => {
    setSeleccionado(prev => (prev === id ? null : id));
    setExplorados(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const ejercicio = EJERCICIOS[ejercicioIdx];
  const cuadranteCorrecto = CUADRANTES.find(c => c.id === ejercicio.correcto)!;
  const respondido = respuestaActual !== null;
  const acierto = respondido && respuestaActual === ejercicio.correcto;

  const responder = (id: string) => {
    if (respondido) return;
    setRespuestaActual(id);
    setRespuestas(prev => ({ ...prev, [ejercicioIdx]: id }));
  };

  const siguienteEjercicio = () => {
    if (ejercicioIdx < EJERCICIOS.length - 1) {
      setEjercicioIdx(i => i + 1);
      setRespuestaActual(null);
    } else {
      finalizar();
    }
  };

  const finalizar = async () => {
    setCargando(true);
    const correctas = EJERCICIOS.filter((ej, i) => (i === ejercicioIdx ? respuestaActual : respuestas[i]) === ej.correcto).length;
    const incorrectas = EJERCICIOS.length - correctas;
    const errores = EJERCICIOS.filter((ej, i) => {
      const r = i === ejercicioIdx ? respuestaActual : respuestas[i];
      return r && r !== ej.correcto;
    }).map(ej => ej.correcto);
    try {
      await matrizEisenhowerService.updateProgress({
        status: 'COMPLETADO',
        video_watched: true,
        correct_count: correctas,
        incorrect_count: incorrectas,
        error_quadrants: [...new Set(errores)],
        last_step: 5,
      } as never);
    } catch {}
    try { localStorage.removeItem(STEP_STORAGE_KEY); } catch {}
    setCargando(false);
    setPaso(5);
  };

  const feedbackIncorrecto = `Esta tarea corresponde a ${cuadranteCorrecto.label.charAt(0) + cuadranteCorrecto.label.slice(1).toLowerCase()}, porque ${ejercicio.feedback.charAt(0).toLowerCase() + ejercicio.feedback.slice(1)}`;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 ${className}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-5xl max-h-[94vh] overflow-y-auto rounded-3xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Cerrar" className="absolute top-3 right-3 z-30 w-9 h-9 rounded-full bg-white shadow flex items-center justify-center hover:scale-105 transition">
          <X className="w-5 h-5 text-gray-700" />
        </button>

        {showResume && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-3 flex flex-col sm:flex-row items-center gap-3 rounded-t-3xl">
            <p className="text-sm text-amber-800 flex-1 text-center sm:text-left">Tienes este módulo en progreso. Puedes continuar donde quedaste o reiniciarlo.</p>
            <div className="flex gap-2">
              <button onClick={() => { setShowResume(false); setPaso(resumeStep); }} className="px-4 py-2 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600">Continuar</button>
              <button onClick={() => { setShowResume(false); setPaso(1); persistStep(1); }} className="px-4 py-2 border border-amber-300 text-amber-700 text-sm font-bold rounded-lg hover:bg-amber-100 flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Reiniciar</button>
            </div>
          </div>
        )}

        {/* PASO 1 — INTRO LÍA */}
        {paso === 1 && (
          <div className="relative overflow-hidden rounded-xl bg-[#060b26] text-white px-6 py-10 sm:px-12 sm:py-14">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -bottom-24 left-0 right-0 h-56 bg-gradient-to-r from-[#2b3bff] via-[#3b82f6] to-[#8b5cf6] opacity-40 blur-2xl" />
            </div>
            {yaCompletado && (
              <p className="relative text-center text-xs text-emerald-300 mb-4">Ya completaste este módulo. Puedes repasarlo de nuevo.</p>
            )}
            <h1 className="relative text-center text-3xl sm:text-3xl font-extrabold leading-tight">
              ¿Sabes distinguir lo urgente<br />
              <span className="bg-gradient-to-r from-[#c084fc] to-[#22d3ee] bg-clip-text text-transparent">de lo importante?</span>
            </h1>
            <div className="relative mt-8 grid sm:grid-cols-[240px_1fr] gap-6 items-center max-w-3xl mx-auto">
              <div className="mx-auto text-center">
                <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-full p-[3px] bg-gradient-to-r from-[#a855f7] to-[#22d3ee] mx-auto overflow-hidden">
                  {liaOk ? (
                    <img src={avatarImg} alt={avatarNombre} onError={() => setLiaOk(false)} className="w-full h-full object-cover rounded-full bg-[#0b123a]" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-[#3b2d8f] to-[#0ea5e9] flex items-center justify-center text-5xl font-extrabold">L</div>
                  )}
                </div>
                <span className="inline-block mt-3 px-8 py-1.5 rounded-full bg-gradient-to-r from-[#1e1b4b] to-[#7c3aed] border border-purple-400/60 text-sm font-extrabold tracking-widest">{avatarNombre}</span>
              </div>
              <div className="relative bg-[#0b123a]/80 border border-purple-400/40 rounded-2xl p-6 text-[15px] leading-relaxed text-white/90">
                <span className="hidden sm:block absolute left-[-10px] top-10 w-5 h-5 bg-[#0b123a] border-l border-b border-purple-400/40 rotate-45" />
                Antes de organizar tu semana, necesitas aprender a priorizar. No todas las tareas tienen el mismo peso: algunas son urgentes, otras importantes, otras pueden esperar y otras simplemente deben salir de tu camino.
              </div>
            </div>
            <div className="relative flex justify-center mt-8">
              <button onClick={() => goPaso(2)} className="group px-10 py-4 rounded-2xl bg-gradient-to-r from-[#5b2bff] to-[#1e9bff] font-extrabold tracking-wide text-lg shadow-xl hover:brightness-110 active:scale-[0.98] flex items-center gap-3">
                VER EXPLICACIÓN <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition" />
              </button>
            </div>
          </div>
        )}

        {/* PASO 2 — VIDEO */}
        {paso === 2 && (
          <div className="bg-[#f4f6fb] rounded-3xl px-4 py-6 sm:px-10 sm:py-8">
            <div className="rounded-3xl overflow-hidden border-2 border-[#4f46e5]/30 bg-white shadow">
              <div className="relative aspect-video bg-[#0b123a]">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  src="https://cdn.pixabay.com/video/2015/11/09/24-129028718_large.mp4"
                  poster={liaOk ? avatarImg : undefined}
                  onEnded={handleVideoEnd}
                  controls
                  preload="metadata"
                />
                {!videoEnded && (
                  <span className="absolute top-3 right-3 px-3 py-1 rounded-full bg-black/60 text-white text-xs font-bold">00:45</span>
                )}
              </div>
              <div className="flex items-center gap-3 px-4 py-3 bg-[#0b1b3f] text-white text-sm">
                <Play className="w-4 h-4" />
                <span className="text-white/70">00:00 / 00:45</span>
                <span className="ml-auto hidden sm:block text-white/60 text-xs">Priorizar es decidir mejor: Hacer · Planificar · Delegar · Eliminar</span>
              </div>
            </div>
            <div className="flex justify-center mt-6">
              <button
                onClick={() => goPaso(3)}
                disabled={!videoEnded}
                className={`px-12 py-4 rounded-2xl font-extrabold text-lg tracking-wide flex items-center gap-3 transition shadow-lg ${videoEnded ? 'bg-gradient-to-r from-[#5b2bff] to-[#1e9bff] text-white hover:brightness-110' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
              >
                CONTINUAR <ArrowRight className="w-6 h-6" />
              </button>
            </div>
            {!videoEnded && (
              <button onClick={() => setVideoEnded(true)} className="mx-auto mt-3 block text-xs text-gray-400 hover:text-gray-600">Ya vi la explicación, continuar</button>
            )}
          </div>
        )}

        {/* PASO 3 — MATRIZ INTERACTIVA */}
        {paso === 3 && (
          <div className="bg-white rounded-3xl px-4 py-6 sm:px-8 sm:py-8">
            <h2 className="text-center text-2xl sm:text-4xl font-extrabold text-[#0b123a] tracking-tight">MATRIZ DE EISENHOWER</h2>
            <div className="mt-6 flex gap-3 sm:gap-5">
              <div className="flex flex-col items-center justify-between py-2">
                <span className="text-sm sm:text-base text-[#0b123a]">Alta</span>
                <span className="text-[#0b123a] font-extrabold tracking-widest text-sm sm:text-lg [writing-mode:vertical-rl] rotate-180">IMPORTANCIA</span>
                <span className="text-sm sm:text-base text-[#0b123a]">Baja</span>
              </div>
              <div className="flex-1">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {CUADRANTES.map(c => {
                    const activo = seleccionado === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => tocarCuadrante(c.id)}
                        className={`relative rounded-2xl bg-gradient-to-br ${c.gradiente} text-white p-4 sm:p-6 min-h-[132px] sm:min-h-[168px] flex flex-col items-center justify-center gap-1 shadow-lg transition hover:brightness-105 active:scale-[0.99] ${activo ? 'ring-4 ring-[#0b123a]' : ''}`}
                      >
                        <IconoCuadrante id={c.id} className="w-10 h-10 sm:w-14 sm:h-14" />
                        <span className="text-lg sm:text-2xl font-extrabold tracking-wide">{c.label}</span>
                        <span className="text-[11px] sm:text-sm text-white/90">{c.criterio}</span>
                        {activo && (
                          <span className="absolute left-3 right-3 bottom-3 bg-white text-[#0b123a] text-[11px] sm:text-sm font-bold rounded-xl px-3 py-2 shadow-xl">
                            {c.explicacion}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 border-t-4 border-[#0b123a] relative">
                  <span className="absolute right-0 -top-[9px] text-[#0b123a] text-xl leading-none">▶</span>
                  <div className="flex justify-between text-[#0b123a] text-sm sm:text-base mt-1">
                    <span>Baja</span>
                    <span className="font-extrabold tracking-widest">URGENCIA</span>
                    <span className="mr-6">Alta</span>
                  </div>
                </div>
              </div>
            </div>

            {explorados.size < 4 ? (
              <div className="mt-6 text-center">
                <p className="text-[#0b123a] text-xs sm:text-sm font-extrabold tracking-widest">SELECCIONA CADA CUADRANTE PARA CONOCERLO</p>
                <div className="flex items-center justify-center gap-6 sm:gap-10 mt-3 max-w-md mx-auto">
                  <div className="flex-1 h-1 rounded-full bg-gray-200 relative overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#1e9bff] to-[#7c3aed] transition-all" style={{ width: `${(explorados.size / 4) * 100}%` }} />
                  </div>
                </div>
                <div className="flex justify-center gap-8 sm:gap-12 mt-1">
                  {[0, 1, 2, 3].map(i => (
                    <span key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < explorados.size ? 'bg-[#2f3bff] text-white' : 'bg-gray-200 text-transparent border-2 border-gray-300'}`}>
                      {i < explorados.size ? '✓' : '·'}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-[#0b123a] text-xs sm:text-sm font-extrabold tracking-widest">{explorados.size} DE 4 CUADRANTES EXPLORADOS</p>
                <button
                  onClick={() => explorados.size === 4 && goPaso(4)}
                  disabled={explorados.size < 4}
                  className={`mt-4 px-8 py-3 rounded-xl font-extrabold tracking-wide transition ${explorados.size === 4 ? 'bg-gradient-to-r from-[#1e6bff] to-[#7c3aed] text-white shadow-lg hover:brightness-110' : 'bg-gray-100 text-gray-400 cursor-not-allowed border'}`}
                >
                  EXPLORA LOS 4 CUADRANTES
                </button>
              </div>
            ) : (
              <div className="mt-6 text-center">
                <p className="text-[#0b123a] text-lg sm:text-xl font-extrabold">Ya terminaste de conocer los cuadrantes.</p>
                <p className="text-[#0b123a]/70 text-sm sm:text-base">Ahora te invito a hacer un ejercicio práctico.</p>
                <button onClick={() => goPaso(4)} className="mt-4 px-12 py-3 rounded-xl bg-gradient-to-r from-[#1e6bff] to-[#7c3aed] text-white font-extrabold tracking-widest shadow-lg hover:brightness-110 flex items-center gap-2 mx-auto">
                  COMENZAR <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* PASO 4 — EJERCICIO */}
        {paso === 4 && (
          <div className="bg-[#f4f6fb] rounded-3xl px-4 py-6 sm:px-10 sm:py-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="block w-10 h-1.5 rounded-full bg-gradient-to-r from-[#7c3aed] to-[#1e9bff] mb-3" />
                <h2 className="text-2xl sm:text-4xl font-extrabold text-[#0b123a] tracking-tight">EJERCICIO DE PRIORIZACIÓN</h2>
                <p className="text-[#3b4bd8] text-lg sm:text-2xl mt-1">¿Dónde ubicarías esta tarea?</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 pt-2">
                <span className="text-[#0b123a] font-extrabold text-sm sm:text-base">{ejercicioIdx + 1} DE 4</span>
                <span className="flex gap-1.5">
                  {EJERCICIOS.map((_, i) => (
                    <span key={i} className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full ${i < ejercicioIdx || (i === ejercicioIdx && respondido) ? 'bg-gradient-to-br from-[#1e9bff] to-[#1a2bff]' : 'bg-[#0b123a]/15'}`} />
                  ))}
                </span>
              </div>
            </div>

            <div
              draggable={!respondido}
              onDragStart={e => { e.dataTransfer.setData('text/plain', 'tarea'); }}
              className="mt-6 mx-auto max-w-2xl rounded-2xl bg-gradient-to-r from-[#081033] to-[#141b4d] text-white p-5 sm:p-6 shadow-[0_18px_40px_-12px_rgba(20,40,160,0.55)] border border-[#4f46e5]/40 cursor-grab active:cursor-grabbing"
            >
              <div className="flex items-start gap-4">
                <span className="mt-1 w-11 h-11 shrink-0 rounded-lg border-2 border-white/90 flex items-center justify-center">
                  <ClipboardCheck className="w-6 h-6" />
                </span>
                <div className="flex-1">
                  <p className="text-[#9aa3ff] text-xs font-extrabold tracking-[0.2em]">TAREA {respondido && (
                    <span className={`ml-2 px-3 py-1 rounded-full text-[11px] text-white ${cuadranteCorrecto.pastilla}`}>{cuadranteCorrecto.label}</span>
                  )}</p>
                  <p className="mt-1 text-lg sm:text-xl font-bold leading-snug">{ejercicio.tarea}</p>
                </div>
                <GripVertical className="w-6 h-6 text-white/40 shrink-0 mt-1" />
              </div>
            </div>

            {!respondido ? (
              <p className="text-center text-[#2b3a9e] mt-5 text-sm sm:text-base">Arrastra la tarea donde corresponda</p>
            ) : (
              <div className="text-center mt-5">
                {acierto ? (
                  <p className="text-[#0b123a]">
                    <span className="inline-flex items-center gap-2 text-xl font-extrabold"><span className="w-7 h-7 rounded-full bg-[#14b8a6] text-white inline-flex items-center justify-center">✓</span> Correcto.</span><br />
                    <span className="text-[#2b3a9e]">{ejercicio.feedback}</span>
                  </p>
                ) : (
                  <p className="text-[#2b3a9e] text-sm sm:text-lg max-w-2xl mx-auto">{feedbackIncorrecto}</p>
                )}
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {ORDEN_EJERCICIO.map(c => {
                const esCorrecta = respondido && c.id === ejercicio.correcto;
                const esElegidaMal = respondido && respuestaActual === c.id && c.id !== ejercicio.correcto;
                return (
                  <button
                    key={c.id}
                    onClick={() => responder(c.id)}
                    onDragOver={e => { if (!respondido) e.preventDefault(); }}
                    onDrop={e => { e.preventDefault(); responder(c.id); }}
                    disabled={respondido}
                    className={`relative rounded-2xl bg-gradient-to-br ${c.gradiente} text-white p-4 sm:p-5 min-h-[118px] sm:min-h-[150px] flex flex-col items-center justify-center gap-2 shadow-lg transition hover:brightness-105 ${esCorrecta ? 'ring-4 ring-white outline outline-2 outline-[#0b123a]' : ''} ${esElegidaMal ? 'ring-4 ring-[#ff5147]' : ''} ${!respondido ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    {esElegidaMal && <span className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[#ff5147] border-2 border-white flex items-center justify-center font-extrabold">×</span>}
                    {esCorrecta && respondido && <span className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white text-[#0b123a] flex items-center justify-center font-extrabold">✓</span>}
                    <span className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/20 flex items-center justify-center">
                      <IconoCuadrante id={c.id} className="w-8 h-8 sm:w-10 sm:h-10" />
                    </span>
                    <span className="font-extrabold tracking-wide text-sm sm:text-lg">{c.label}</span>
                  </button>
                );
              })}
            </div>

            {respondido && (
              <div className="flex justify-center mt-6">
                <button onClick={siguienteEjercicio} disabled={cargando} className="px-10 py-3 rounded-xl bg-[#0b123a] text-white font-extrabold tracking-widest hover:brightness-125 flex items-center gap-2 disabled:opacity-60">
                  {cargando ? 'GUARDANDO...' : ejercicioIdx < 3 ? 'SIGUIENTE' : 'VER RESULTADO'} <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* PASO 5 — COMPLETADO */}
        {paso === 5 && (
          <div className="bg-[#f7f9fd] rounded-3xl px-6 py-10 sm:py-14 text-center">
            <span className="inline-block w-12 h-1.5 rounded-full bg-gradient-to-r from-[#7c3aed] to-[#1e9bff]" />
            <h2 className="mt-4 text-3xl sm:text-5xl font-extrabold text-[#0b123a] tracking-tight">EJERCICIO COMPLETADO</h2>
            <div className="mx-auto mt-8 w-40 h-40 relative">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle cx="50" cy="50" r="34" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                <path d="M50 16 A34 34 0 0 1 84 50" fill="none" stroke="#1e9bff" strokeWidth="10" strokeLinecap="round" />
                <path d="M84 50 A34 34 0 0 1 50 84" fill="none" stroke="#ff6b5e" strokeWidth="10" strokeLinecap="round" />
                <path d="M50 84 A34 34 0 0 1 16 50" fill="none" stroke="#14b8a6" strokeWidth="10" strokeLinecap="round" />
                <path d="M16 50 A34 34 0 0 1 50 16" fill="none" stroke="#7c3aed" strokeWidth="10" strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center">
                <Check className="w-14 h-14 text-[#0b123a]" strokeWidth={3.5} />
              </span>
            </div>
            <p className="mt-8 text-3xl sm:text-5xl font-extrabold text-[#0b123a]">Bien hecho, {nombre}.</p>
            <p className="mt-4 text-[#2b3a9e] text-base sm:text-xl max-w-3xl mx-auto leading-relaxed">
              Ahora ya tienes una base simple para mirar tus acciones con más claridad.<br />
              El siguiente paso será ordenar tus tareas para convertir tus metas en planificación real.
            </p>
            <button onClick={() => { onClose?.(); setTimeout(() => onGoKanban?.(), 150); }} className="mt-8 px-10 py-4 rounded-2xl bg-gradient-to-r from-[#1e9bff] to-[#7c3aed] text-white font-extrabold tracking-wide text-base sm:text-lg shadow-xl hover:brightness-110 active:scale-[0.98] inline-flex items-center gap-3">
              CONTINUAR CON MI PLANIFICACIÓN <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatrizEisenhower;
