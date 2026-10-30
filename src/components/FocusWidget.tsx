import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X, Minus, CheckCircle2, Coffee,
  Pause, Play, Square, RotateCcw,
} from 'lucide-react';
import type { FocusConfig } from './FocusModeScreen';
import { ETIQUETA_HERRAMIENTA } from './FocusModeScreen';
import { sonarFin } from './focusAudio';

/* ──────────────────────────────────────────────────────────────────────────
   Doc 23 · Modo Focus — widget flotante y modales del ciclo de sesión.

   Una vez iniciada, la herramienta vive como widget flotante: se desplaza
   libremente, permanece visible sobre cualquier módulo y se minimiza.
   Cerrarlo no finaliza la sesión: Focusia lo pregunta. Al terminar
   correctamente (cuenta en cero, alarma o fin de ciclos) se registra la
   sesión y se muestran las acciones posteriores.
   ────────────────────────────────────────────────────────────────────────── */

const PURPLE = '#7C3AED';
const DARK = '#181B2C';
const STORAGE_SESION = 'focusia_focus_sesion';
const STORAGE_MIN = 'focusia_focus_minimizado';

export type FocusHerramientaSesion = 'reloj' | 'pomodoro' | 'temporizador' | 'alarma' | 'descanso';

export interface FocusSesionLocal {
  id: number | null;
  herramienta: FocusHerramientaSesion;
  config: FocusConfig;
  startedAtMs: number;
  planoMin: number | null;
  // Pausa: instante en que se pausó (null = corriendo) y ms ya pausados.
  pausedAt?: number | null;
  pausedAccum?: number;
}

export const guardarSesionLocal = (sesion: FocusSesionLocal | null) => {
  try {
    if (sesion) localStorage.setItem(STORAGE_SESION, JSON.stringify(sesion));
    else localStorage.removeItem(STORAGE_SESION);
  } catch { /* noop */ }
};

export const leerSesionLocal = (): FocusSesionLocal | null => {
  try {
    const crudo = localStorage.getItem(STORAGE_SESION);
    return crudo ? (JSON.parse(crudo) as FocusSesionLocal) : null;
  } catch { return null; }
};

export const guardarMinimizadoLocal = (min: boolean) => {
  try { localStorage.setItem(STORAGE_MIN, JSON.stringify(min)); } catch { /* noop */ }
};

export const leerMinimizadoLocal = (): boolean => {
  try { return JSON.parse(localStorage.getItem(STORAGE_MIN) || 'false') === true; } catch { return false; }
};

/* Línea de tiempo de pomodoro: [concentración, descanso, … , concentración]. */
interface Fase { tipo: 'concentracion' | 'descanso'; dur: number }
function planPomodoro(config: FocusConfig): Fase[] {
  const ciclos = Math.max(1, Math.min(8, Math.round(config.ciclos || 4)));
  const conc = Math.max(1, Math.min(120, Math.round(config.concentracion || 25)));
  const des = Math.max(0, Math.min(60, Math.round(config.descanso ?? 5)));
  const fases: Fase[] = [];
  for (let i = 1; i <= ciclos; i++) {
    fases.push({ tipo: 'concentracion', dur: conc * 60 });
    if (i < ciclos) fases.push({ tipo: 'descanso', dur: des * 60 });
  }
  return fases;
}

function objetivoAlarmaMs(hora: string, startedAtMs: number): number {
  const [h, m] = (hora || '00:00').split(':').map(Number);
  const objetivo = new Date(startedAtMs);
  objetivo.setHours(h || 0, m || 0, 0, 0);
  // Si la hora ya pasó al iniciar la alarma, programar para mañana
  if (objetivo.getTime() <= startedAtMs) objetivo.setDate(objetivo.getDate() + 1);
  return objetivo.getTime();
}

function formatear(segundos: number): string {
  const s = Math.max(0, Math.ceil(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  const dos = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${dos(m)}:${dos(seg)}` : `${dos(m)}:${dos(seg)}`;
}

/* Hora HH:MM (24h) → «10:30 AM». */
function formatearHora12(hora: string): string {
  const [h, m] = (hora || '00:00').split(':').map(Number);
  const horas = h || 0;
  const sufijo = horas < 12 ? 'AM' : 'PM';
  const h12 = ((horas + 11) % 12) + 1;
  return `${h12}:${String(m || 0).padStart(2, '0')} ${sufijo}`;
}

/* Fecha estilo mockup: «Lun, 12 de mayo». */
function formatearFecha(ms: number): string {
  return new Date(ms).toLocaleDateString('es-ES', {
    weekday: 'short', day: 'numeric', month: 'long',
  });
}

/* Hora actual con segundos, estilo mockup: «10:24:15 AM». */
function formatearReloj(d: Date): string {
  const horas = d.getHours();
  const sufijo = horas < 12 ? 'AM' : 'PM';
  const h12 = ((horas + 11) % 12) + 1;
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${h12}:${dos(d.getMinutes())}:${dos(d.getSeconds())} ${sufijo}`;
}

const EMOJIS: Record<FocusHerramientaSesion, string> = {
  reloj: '🕐',
  pomodoro: '🍅',
  temporizador: '⏳',
  alarma: '🔔',
  descanso: '☕',
};

const btnCircular = 'flex items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 active:scale-95';

/* ── Widget flotante ── */
export default function FocusWidget({ sesion, minimizado, onMinimizar, onCerrarSolicitado, onFinalizoNatural, onUpdateSesion }: {
  sesion: FocusSesionLocal | null;
  minimizado: boolean;
  onMinimizar: () => void;
  onCerrarSolicitado: () => void;
  onFinalizoNatural: (minutosEnfocado: number) => void;
  onUpdateSesion: (sesion: FocusSesionLocal) => void;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [silencio, setSilencio] = useState(false);
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const arrastroDist = useRef(0);
  const finalAvisado = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Al arrancar sin posición previa: esquina inferior derecha.
  useEffect(() => {
    if (!pos && sesion) {
      setPos({
        x: Math.max(12, window.innerWidth - 260),
        y: Math.max(12, window.innerHeight - 230),
      });
    }
  }, [sesion, pos]);

  // Reanuda desde cero cuando cambia la sesión.
  useEffect(() => {
    if (sesion) { finalAvisado.current = false; setPos(null); setSilencio(false); }
  }, [sesion?.id, sesion?.herramienta, sesion?.startedAtMs]);

  const pausado = !!sesion?.pausedAt;

  const calculo = useMemo(() => {
    if (!sesion) return null;
    // El reloj siempre corre en tiempo real; el resto respeta la pausa.
    const referencia = sesion.pausedAt ?? now;
    const transcurrido = Math.max(0, (referencia - sesion.startedAtMs - (sesion.pausedAccum || 0)) / 1000);
    const herramienta = sesion.herramienta;

    if (herramienta === 'reloj') {
      const d = new Date(now);
      return {
        principal: formatearReloj(d),
        secundario: formatearFecha(now),
        restante: null as number | null,
        enfocadoMin: null as number | null,
        fase: 'Reloj en marcha',
        progreso: null as number | null,
      };
    }

    if (herramienta === 'pomodoro') {
      const fases = planPomodoro(sesion.config);
      const total = fases.reduce((a, f) => a + f.dur, 0);
      let cursor = 0;
      let faseActual: Fase = fases[0];
      let restante = 0;
      let indice = 0;
      for (let i = 0; i < fases.length; i++) {
        if (transcurrido < cursor + fases[i].dur) { faseActual = fases[i]; restante = cursor + fases[i].dur - transcurrido; indice = i; break; }
        cursor += fases[i].dur;
        indice = i;
      }
      const ciclosTotales = fases.filter(f => f.tipo === 'concentracion').length;
      const enfocadoMin = Math.round(((fases[0]?.dur || 0) * ciclosTotales) / 60);
      const termino = transcurrido >= total;
      const numeroCiclo = fases.slice(0, indice + 1).filter(f => f.tipo === 'concentracion').length;
      const durFase = termino ? 1 : faseActual.dur;
      return {
        principal: formatear(termino ? 0 : restante),
        secundario: faseActual.tipo === 'concentracion' ? 'Trabajo' : 'Descanso',
        detalle: `Ciclo ${Math.min(numeroCiclo, ciclosTotales)} de ${ciclosTotales}`,
        restante: termino ? 0 : restante,
        enfocadoMin,
        fase: faseActual.tipo,
        progreso: termino ? 1 : Math.min(1, Math.max(0, 1 - restante / durFase)),
      };
    }

    if (herramienta === 'alarma') {
      const objetivoMs = objetivoAlarmaMs(sesion.config.hora || '', sesion.startedAtMs);
      const restante = (objetivoMs - now) / 1000;
      return {
        principal: formatearHora12(sesion.config.hora || ''),
        secundario: sesion.config.etiqueta || 'Alarma',
        detalle: formatearFecha(objetivoMs),
        restante: Math.max(0, restante),
        enfocadoMin: Math.round(transcurrido / 60),
        fase: 'Alarma programada',
        progreso: null as number | null,
      };
    }

    // temporizador / descanso
    const plano = (sesion.planoMin || sesion.config.duracion_min || 15) * 60;
    const restante = plano - transcurrido;
    return {
      principal: formatear(Math.max(0, restante)),
      secundario: herramienta === 'descanso' ? 'Tiempo restante' : 'Tiempo restante',
      restante: Math.max(0, restante),
      enfocadoMin: Math.round(plano / 60),
      fase: 'En marcha',
      progreso: Math.min(1, Math.max(0, transcurrido / plano)),
    };
  }, [sesion, now]);

  // Fin natural: la herramienta terminó correctamente (Doc 23 §III).
  useEffect(() => {
    if (!calculo || !sesion || pausado) return;
    const termino =
      calculo.restante !== null && calculo.restante <= 0 && sesion.herramienta !== 'reloj';
    if (termino && !finalAvisado.current) {
      finalAvisado.current = true;
      if (!(sesion.herramienta === 'alarma' && silencio)) {
        sonarFin(sesion.herramienta === 'alarma' ? 4 : 2);
      }
      onFinalizoNatural(calculo.enfocadoMin ?? Math.round((now - sesion.startedAtMs) / 60000));
    }
  }, [calculo, sesion, onFinalizoNatural, now, pausado, silencio]);

  // Pausar / reanudar (temporizador, pomodoro y descanso).
  const alternarPausa = () => {
    if (!sesion || sesion.herramienta === 'reloj' || sesion.herramienta === 'alarma') return;
    if (sesion.pausedAt) {
      const acumulado = (sesion.pausedAccum || 0) + (Date.now() - sesion.pausedAt);
      onUpdateSesion({ ...sesion, pausedAt: null, pausedAccum: acumulado });
    } else {
      onUpdateSesion({ ...sesion, pausedAt: Date.now() });
    }
  };

  // Reiniciar la cuenta desde cero (temporizador y descanso).
  const reiniciar = () => {
    if (!sesion || sesion.herramienta === 'reloj' || sesion.herramienta === 'alarma') return;
    finalAvisado.current = false;
    onUpdateSesion({ ...sesion, startedAtMs: Date.now(), pausedAt: null, pausedAccum: 0 });
  };

  // Arrastre libre del widget (Doc 23 §III): todo el widget es arrastrable
  // menos sus botones. El seguimiento va sobre window para que no se pierda
  // el gesto al salir del widget (más fiable que pointer capture).
  const onDragStart = (e: React.PointerEvent, permitirDentroDeBoton = false) => {
    if (!pos) return;
    if (!permitirDentroDeBoton && (e.target as HTMLElement).closest('button')) return;
    arrastroDist.current = 0;
    setDrag({ dx: e.clientX - pos.x, dy: e.clientY - pos.y });
  };

  useEffect(() => {
    if (!drag) return;
    const mover = (e: PointerEvent) => {
      arrastroDist.current += 1;
      const x = Math.min(Math.max(8, e.clientX - drag.dx), window.innerWidth - 60);
      const y = Math.min(Math.max(8, e.clientY - drag.dy), window.innerHeight - 40);
      setPos({ x, y });
    };
    const soltar = () => setDrag(null);
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);
    return () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', soltar);
    };
  }, [drag]);

  if (!sesion || !calculo) return null;

  // Minimizado: píldora flotante que mantiene la sesión visible.
  if (minimizado) {
    return (
      <div className="fixed z-[60]" style={{ left: pos?.x, top: pos?.y }}>
        <button
          onClick={() => { if (arrastroDist.current > 3) return; onMinimizar(); }}
          onPointerDown={(e) => onDragStart(e, true)}
          className="flex touch-none cursor-grab active:cursor-grabbing items-center gap-2 rounded-full border border-white/10 px-3.5 py-2 text-white text-sm font-bold shadow-lg"
          style={{ background: DARK }}
          title={`Modo Focus: ${ETIQUETA_HERRAMIENTA[sesion.herramienta]} en curso`}
        >
          <span>{EMOJIS[sesion.herramienta]}</span>
          <span>{ETIQUETA_HERRAMIENTA[sesion.herramienta]}</span>
          {calculo.restante !== null && sesion.herramienta !== 'reloj' && (
            <span className="font-mono">{calculo.principal}</span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed z-[60] w-52 select-none" style={{ left: pos?.x, top: pos?.y }}>
      <div
        onPointerDown={(e) => onDragStart(e)}
        className="touch-none cursor-grab active:cursor-grabbing rounded-2xl shadow-2xl shadow-purple-900/30 overflow-hidden"
        style={{ background: DARK }}
      >
        {/* Cabecera: icono + título + minimizar/cerrar */}
        <div className="flex items-center gap-1.5 px-3 py-2.5">
          <span className="text-[13px]">{EMOJIS[sesion.herramienta]}</span>
          <span className="flex-1 truncate text-[12px] font-semibold text-white">
            {ETIQUETA_HERRAMIENTA[sesion.herramienta]}
          </span>
          {pausado && <span className="text-[9px] font-bold uppercase text-amber-400">Pausa</span>}
          <button onClick={onMinimizar} title="Minimizar" className="rounded p-0.5 text-slate-500 hover:bg-white/10 hover:text-white">
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button onClick={onCerrarSolicitado} title="Cerrar widget" className="rounded p-0.5 text-slate-500 hover:bg-white/10 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Contenido por herramienta */}
        {sesion.herramienta === 'pomodoro' && (
          <div className="px-4 pb-4 pt-0.5">
            <AnilloProgreso
              valor={calculo.progreso ?? 0}
              color={calculo.fase === 'concentracion' ? '#8B5CF6' : '#34D399'}
            >
              <span className="font-mono text-[17px] font-bold text-white">{calculo.principal}</span>
              <span className="text-[10px] text-slate-400">{calculo.secundario}</span>
            </AnilloProgreso>
            <p className="mt-1 text-center text-[10px] text-slate-500">{calculo.detalle}</p>
            <div className="mt-2 flex items-center justify-center gap-2.5">
              <button onClick={alternarPausa} title={pausado ? 'Reanudar' : 'Pausar'}
                className={`${btnCircular} h-8 w-8`}>
                {pausado ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              </button>
              <button onClick={onCerrarSolicitado} title="Detener"
                className={`${btnCircular} h-8 w-8`}>
                <Square className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {(sesion.herramienta === 'temporizador' || sesion.herramienta === 'descanso') && (
          <div className="px-4 pb-4 pt-0.5">
            <p className="pt-1 text-center font-mono text-[26px] font-bold text-white tabular-nums">
              {calculo.principal}
            </p>
            <p className="text-center text-[10px] text-slate-400">{calculo.secundario}</p>
            <div className="mt-2.5 flex items-center justify-center gap-2">
              {sesion.herramienta === 'temporizador' && (
                <button onClick={reiniciar} title="Reiniciar" className={`${btnCircular} h-7 w-7`}>
                  <RotateCcw className="h-3 w-3" />
                </button>
              )}
              <button onClick={alternarPausa} title={pausado ? 'Reanudar' : 'Pausar'}
                className="flex h-9 w-9 items-center justify-center rounded-full text-white shadow-md shadow-purple-900/40 transition hover:brightness-110 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}>
                {pausado ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </button>
              <button onClick={onCerrarSolicitado} title="Detener" className={`${btnCircular} h-7 w-7`}>
                <Square className="h-2.5 w-2.5" />
              </button>
            </div>
          </div>
        )}

        {sesion.herramienta === 'alarma' && (
          <div className="px-4 pb-4 pt-0.5">
            <p className="pt-1 text-center font-mono text-xl font-bold text-white">{calculo.principal}</p>
            <p className="text-center text-[11px] font-semibold text-white">{calculo.secundario}</p>
            <p className="mt-0.5 text-center text-[10px] text-slate-400">{calculo.detalle}</p>
            <div className="mt-2.5 flex items-center justify-center gap-2">
              <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-[9px] text-slate-300" title="Tiempo restante">
                {formatear(calculo.restante || 0)}
              </span>
              <button
                onClick={() => setSilencio(v => !v)}
                title={silencio ? 'Alarma silenciada' : 'Alarma con sonido'}
                className={`flex h-5 w-9 items-center rounded-full px-0.5 transition-colors ${silencio ? 'bg-slate-600' : 'bg-[#8B5CF6]'}`}
              >
                <span className={`h-4 w-4 rounded-full bg-white transition-transform ${silencio ? '' : 'ml-auto'}`} />
              </button>
            </div>
          </div>
        )}

        {sesion.herramienta === 'reloj' && (
          <div className="px-4 pb-4 pt-0.5">
            <p className="pt-1.5 text-center font-mono text-lg font-bold text-white">{calculo.principal}</p>
            <p className="pb-1 text-center text-[10px] text-slate-400">{calculo.secundario}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* Anillo de progreso del pomodoro (estilo mockup). */
function AnilloProgreso({ valor, color, children }: {
  valor: number;
  color: string;
  children: React.ReactNode;
}) {
  const r = 34;
  const circunferencia = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto h-[88px] w-[88px]">
      <svg viewBox="0 0 88 88" className="h-full w-full -rotate-90">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#ffffff1a" strokeWidth="6" />
        <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round" strokeDasharray={circunferencia}
          strokeDashoffset={circunferencia * (1 - valor)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}

/* ── Modales del ciclo de sesión (Doc 23 §III) ── */
export interface FocusFinData { herramienta: FocusHerramientaSesion; minutos: number; hora?: string }

export function FocusModales({ guardNueva, sesionActual, confirmCerrar, fin, ocupado, onGuardarCancelar, onGuardarFinalizarNueva, onCerrarConfirm, onSegundoPlano, onFinalizarConfirm, onFinCerrar, onFinOtraSesion, onFinDescanso }: {
  guardNueva: { herramienta: FocusHerramientaSesion; config: FocusConfig } | null;
  sesionActual: FocusSesionLocal | null;
  confirmCerrar: boolean;
  fin: FocusFinData | null;
  ocupado: boolean;
  onGuardarCancelar: () => void;
  onGuardarFinalizarNueva: () => void;
  onCerrarConfirm: () => void;
  onSegundoPlano: () => void;
  onFinalizarConfirm: () => void;
  onFinCerrar: () => void;
  onFinOtraSesion: () => void;
  onFinDescanso: () => void;
}) {
  if (guardNueva) {
    return (
      <Dialogo>
        <h3 className="text-lg font-bold text-slate-900">Ya existe una sesión de enfoque en ejecución.</h3>
        <p className="mt-2 text-sm text-slate-600">
          Está corriendo <strong>{ETIQUETA_HERRAMIENTA[sesionActual?.herramienta || 'reloj']}</strong>.
          ¿Qué quieres hacer con ella para iniciar{' '}
          <strong>{ETIQUETA_HERRAMIENTA[guardNueva.herramienta]}</strong>?
        </p>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button onClick={onGuardarCancelar} className="px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100">
            Cancelar
          </button>
          <button onClick={onGuardarFinalizarNueva} disabled={ocupado}
            className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-md hover:brightness-110 disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, #8B5CF6, ${PURPLE})` }}>
            Finalizar la sesión actual e iniciar la nueva
          </button>
        </div>
      </Dialogo>
    );
  }

  if (confirmCerrar) {
    return (
      <Dialogo>
        <h3 className="text-lg font-bold text-slate-900">Cerrar el widget</h3>
        <p className="mt-2 text-sm text-slate-600">
          La sesión de <strong>{ETIQUETA_HERRAMIENTA[sesionActual?.herramienta || 'reloj']}</strong> sigue
          en ejecución. Cerrar el widget no finaliza la sesión automáticamente.
        </p>
        <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
          <button onClick={onCerrarConfirm} className="px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100">
            Cancelar
          </button>
          <button onClick={onFinalizarConfirm} disabled={ocupado}
            className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-md disabled:opacity-60">
            Finalizar sesión
          </button>
          <button onClick={onSegundoPlano} disabled={ocupado}
            className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-md hover:brightness-110 disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, #8B5CF6, ${PURPLE})` }}>
            Continuar ejecutándose en segundo plano
          </button>
        </div>
      </Dialogo>
    );
  }

  if (fin) {
    const mensaje: Record<FocusHerramientaSesion, { titulo: string; cuerpo: string }> = {
      pomodoro: { titulo: '¡Excelente trabajo!', cuerpo: 'Has completado una sesión de concentración.' },
      temporizador: { titulo: '¡Excelente trabajo!', cuerpo: 'Has completado una sesión de concentración.' },
      alarma: { titulo: '¡Está en hora!', cuerpo: `Tu alarma sonó a las ${fin.hora || ''}. Tu sesión quedó registrada.` },
      descanso: { titulo: '¡Listo!', cuerpo: 'Terminó tu descanso. Cuando quieras, volvemos a enfocar.' },
      reloj: { titulo: 'Sesión cerrada', cuerpo: 'Tu tiempo de enfoque quedó registrado.' },
    };
    const m = mensaje[fin.herramienta];
    return (
      <Dialogo>
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </span>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{m.titulo}</h3>
            <p className="text-sm text-slate-600">{m.cuerpo}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Sesión registrada automáticamente en tus Reportes y estadísticas ({fin.minutos} min de enfoque).
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          <button onClick={onFinCerrar} className="px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100">
            Continuar donde estaba
          </button>
          <button onClick={onFinDescanso} disabled={ocupado}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border-2 hover:shadow disabled:opacity-60"
            style={{ borderColor: PURPLE, color: PURPLE }}>
            <Coffee className="w-4 h-4" />
            Tomar un descanso
          </button>
          <button onClick={onFinOtraSesion} disabled={ocupado}
            className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-md hover:brightness-110 disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, #8B5CF6, ${PURPLE})` }}>
            Iniciar otra sesión
          </button>
        </div>
      </Dialogo>
    );
  }

  return null;
}

function Dialogo({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/30">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
        {children}
      </div>
    </div>
  );
}
