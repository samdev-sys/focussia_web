import React, { useEffect, useState } from 'react';
import {
  X, Clock, Hourglass, Bell, Play, Target, Info,
  PlayCircle, Scan, ShieldCheck, CheckCircle2, Star, Shield, Pause, Square,
} from 'lucide-react';
import ModuleShell from './ModuleShell';
import { desbloquearAudio } from './focusAudio';

/* ──────────────────────────────────────────────────────────────────────────
   Doc 23 · Modo Focus (módulo BOTÓN FOCUS)
   Digitalización del mockup: hero «Tu atención es tu recurso más valioso»,
   4 tarjetas de herramientas, columna «Estado Focus» (dinámica) +
   «¿Cómo funciona?» + «Consejo Focusia» y vista previa de widgets flotantes.
   Al presionar Iniciar, dashboard.tsx arranca la sesión y la herramienta
   pasa a widget flotante real (FocusWidget).
   ────────────────────────────────────────────────────────────────────────── */

const PURPLE = '#7C3AED';
const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-300';

export type FocusHerramienta = 'reloj' | 'pomodoro' | 'temporizador' | 'alarma';

export interface FocusConfig {
  duracion_min?: number;
  concentracion?: number;
  descanso?: number;
  ciclos?: number;
  hora?: string;
  etiqueta?: string;
}

export const ETIQUETA_HERRAMIENTA: Record<string, string> = {
  reloj: 'Reloj',
  pomodoro: 'Pomodoro',
  temporizador: 'Temporizador',
  alarma: 'Alarma',
  descanso: 'Descanso',
};

const HERRAMIENTAS: {
  key: FocusHerramienta;
  icono: React.ReactNode;
  desc: string;
}[] = [
  {
    key: 'reloj',
    icono: <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EEF0FF] text-[#7C3AED]"><Clock className="h-7 w-7" /></span>,
    desc: 'Visualiza la hora actual mientras trabajas sin abandonar el enfoque.',
  },
  {
    key: 'pomodoro',
    icono: <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FEE9E7] text-2xl">🍅</span>,
    desc: 'Organiza sesiones de trabajo mediante ciclos de concentración y descanso.',
  },
  {
    key: 'temporizador',
    icono: <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FDF3DC] text-[#B45309]"><Hourglass className="h-7 w-7" /></span>,
    desc: 'Realiza una cuenta regresiva desde el tiempo definido hasta llegar a cero.',
  },
  {
    key: 'alarma',
    icono: <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F1FD] text-[#2563EB]"><Bell className="h-7 w-7" /></span>,
    desc: 'Programa un aviso para una hora determinada.',
  },
];

const COMO_FUNCIONA = [
  {
    Icon: PlayCircle,
    titulo: 'Abre una herramienta',
    desc: 'Selecciona la que mejor se adapte a lo que necesitas ahora.',
  },
  {
    Icon: Scan,
    titulo: 'Se convierte en widget',
    desc: 'Al iniciar, la herramienta flotará sobre tu pantalla para acompañarte.',
  },
  {
    Icon: ShieldCheck,
    titulo: 'Trabaja sin interrupciones',
    desc: 'Sigue usando Focusia mientras la sesión continúa activa.',
  },
  {
    Icon: CheckCircle2,
    titulo: 'Completa y progresa',
    desc: 'Al finalizar, registramos tu sesión y puedes continuar con tus objetivos.',
  },
];

/* ── Hora por defecto de la alarma: la próxima hora en punto ── */
function proximaHoraEnPunto(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/* Minutos que faltan hasta la hora HH:MM (hoy o, si ya pasó, mañana). */
function minutosHasta(hora: string): number {
  const [h, m] = (hora || '00:00').split(':').map(Number);
  const objetivo = new Date();
  objetivo.setHours(h || 0, m || 0, 0, 0);
  if (objetivo.getTime() <= Date.now()) objetivo.setDate(objetivo.getDate() + 1);
  return Math.max(1, Math.round((objetivo.getTime() - Date.now()) / 60000));
}

/* ── Modal de configuración (apertura centrada, Doc 23 §III) ── */
function ModalConfiguracion({ herramienta, onIniciar, onCerrar, ocupado }: {
  herramienta: FocusHerramienta;
  onIniciar: (herramienta: FocusHerramienta, config: FocusConfig) => void;
  onCerrar: () => void;
  ocupado: boolean;
}) {
  const [concentracion, setConcentracion] = useState(25);
  const [descanso, setDescanso] = useState(5);
  const [ciclos, setCiclos] = useState(4);
  const [duracion, setDuracion] = useState(15);
  const [hora, setHora] = useState(() => proximaHoraEnPunto());
  const [etiqueta, setEtiqueta] = useState('');

  const texto: Record<FocusHerramienta, { titulo: string; desc: string }> = {
    reloj: { titulo: 'Reloj', desc: 'Mostrará la hora actual en tu widget mientras trabajas.' },
    pomodoro: {
      titulo: 'Pomodoro',
      desc: 'Alternará ciclos de concentración y descanso hasta completar la cantidad de ciclos elegida.',
    },
    temporizador: { titulo: 'Temporizador', desc: 'Contará en regresivo hasta llegar a cero.' },
    alarma: { titulo: 'Alarma', desc: `Sonará a las ${hora} para avisarte el inicio de tu actividad.` },
  };

  const minConc = Math.max(1, Math.min(120, concentracion || 25));
  const minDes = Math.max(0, Math.min(60, descanso || 5));
  const minCic = Math.max(1, Math.min(8, ciclos || 4));
  const minDur = Math.max(1, Math.min(720, duracion || 15));

  const iniciar = () => {
    if (ocupado) return;
    desbloquearAudio();
    if (herramienta === 'reloj') onIniciar('reloj', {});
    else if (herramienta === 'pomodoro') onIniciar('pomodoro', { concentracion: minConc, descanso: minDes, ciclos: minCic });
    else if (herramienta === 'temporizador') onIniciar('temporizador', { duracion_min: minDur });
    else onIniciar('alarma', { hora, etiqueta: etiqueta.trim() || undefined, duracion_min: minutosHasta(hora) });
  };

  return (

    

    
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCerrar}>
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-start justify-between">
          <h3 className="text-xl font-bold text-slate-900">{texto[herramienta].titulo}</h3>
          <button onClick={onCerrar} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-5 text-sm text-slate-600">{texto[herramienta].desc}</p>

        <div className="space-y-4">
          {herramienta === 'pomodoro' && (
            <>
              <Campo label="Concentración (minutos)">
                <input type="number" min={1} max={120} value={minConc}
                  onChange={(e) => setConcentracion(Number(e.target.value))}
                  className={inputCls} />
              </Campo>
              <Campo label="Descanso (minutos)">
                <input type="number" min={0} max={60} value={minDes}
                  onChange={(e) => setDescanso(Number(e.target.value))}
                  className={inputCls} />
              </Campo>
              <Campo label="Cantidad de ciclos">
                <input type="number" min={1} max={8} value={minCic}
                  onChange={(e) => setCiclos(Number(e.target.value))}
                  className={inputCls} />
              </Campo>
            </>
          )}
          {herramienta === 'temporizador' && (
            <Campo label="Duración (minutos)">
              <input type="number" min={1} max={720} value={minDur}
                onChange={(e) => setDuracion(Number(e.target.value))}
                className={inputCls} />
            </Campo>
          )}
          {herramienta === 'alarma' && (
            <>
              <Campo label="Hora de la alarma">
                <input type="time" value={hora} onChange={(e) => setHora(e.target.value)}
                  className={inputCls} />
              </Campo>
              <Campo label="Etiqueta (opcional)">
                <input type="text" value={etiqueta} placeholder="Ej. Reunión con cliente"
                  onChange={(e) => setEtiqueta(e.target.value)}
                  className={inputCls} />
              </Campo>
            </>
          )}
          {herramienta === 'reloj' && (
            <p className="flex items-center gap-2 text-sm text-slate-500">
              <Info className="h-4 w-4 shrink-0" />
              No necesita configuración: presiona Iniciar para ver la hora en tu widget.
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button onClick={onCerrar}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">
            Cancelar
          </button>
          <button onClick={iniciar} disabled={ocupado}
            className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:brightness-110 disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, #8B5CF6, ${PURPLE})` }}>
            <Play className="h-4 w-4" />
            {ocupado ? 'Preparando…' : 'Iniciar'}
          </button>
        </div>
      </div>
    </div>
  );
}

const Campo = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="text-sm font-semibold text-slate-700">{label}</span>
    <div className="mt-1">{children}</div>
  </label>
);

/* ── Vista previa estática de los widgets flotantes (mockup de la foto) ── */
function AnilloPomodoro({ minutos, etiqueta }: { minutos: string; etiqueta: string }) {
  const r = 34;
  const circunferencia = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto h-[88px] w-[88px]">
      <svg viewBox="0 0 88 88" className="h-full w-full -rotate-90">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#ffffff1a" strokeWidth="6" />
        <circle cx="44" cy="44" r={r} fill="none" stroke="#8B5CF6" strokeWidth="6"
          strokeLinecap="round" strokeDasharray={circunferencia} strokeDashoffset={circunferencia * 0.3} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-lg font-bold text-white">{minutos}</span>
        <span className="text-[10px] text-slate-400">{etiqueta}</span>
      </div>
    </div>
  );
}

function WidgetDemo({ titulo, icono, children }: { titulo: string; icono: string; children: React.ReactNode }) {
  return (
    <div className="pointer-events-none w-[150px] shrink-0 rounded-xl bg-[#181B2C] p-3 text-white shadow-2xl shadow-purple-900/30">
      <div className="mb-2 flex items-center gap-1.5">
        <span className="text-xs">{icono}</span>
        <span className="flex-1 text-[11px] font-semibold">{titulo}</span>
        <span className="text-[10px] text-slate-500">−</span>
        <span className="text-[10px] text-slate-500">✕</span>
      </div>
      {children}
    </div>
  );
}

function VistaPreviaWidgets() {
  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-purple-100 bg-gradient-to-br from-[#F5F3FF] via-[#F8F9FB] to-[#EEF2FF] p-5">
      <h4 className="text-[15px] font-bold text-slate-900">Tus herramientas activas (widgets flotantes)</h4>
      <p className="text-xs text-slate-500">Así se verán acompañándote mientras trabajas en cualquier módulo de Focusia.</p>
      <div className="mt-4 flex flex-wrap items-start justify-center gap-6 pb-1">
        <WidgetDemo titulo="Pomodoro" icono="🍅">
          <AnilloPomodoro minutos="17:24" etiqueta="Trabajo" />
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10"><Pause className="h-3 w-3" /></span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10"><Square className="h-3 w-3" /></span>
          </div>
        </WidgetDemo>
        <WidgetDemo titulo="Temporizador" icono="⏳">
          <p className="py-2 text-center font-mono text-2xl font-bold">25:00</p>
          <p className="-mt-1 text-center text-[10px] text-slate-400">Tiempo restante</p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[10px]">↺</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9]"><Play className="h-4 w-4" /></span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[10px]">⏱</span>
          </div>
        </WidgetDemo>
        <WidgetDemo titulo="Alarma" icono="🔔">
          <p className="py-1.5 text-center font-mono text-xl font-bold">10:30 AM</p>
          <p className="text-center text-[11px] font-semibold">Reunión con cliente</p>
          <p className="mt-0.5 text-center text-[10px] text-slate-400">Lun, 12 de mayo</p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] text-slate-300">08:30</span>
            <span className="flex h-5 w-9 items-center rounded-full bg-[#8B5CF6] px-0.5">
              <span className="ml-auto h-4 w-4 rounded-full bg-white" />
            </span>
          </div>
        </WidgetDemo>
        <WidgetDemo titulo="Reloj" icono="🕐">
          <p className="py-2 text-center font-mono text-lg font-bold">10:24:15 AM</p>
          <p className="-mt-1 pb-1 text-center text-[10px] text-slate-400">Lunes, 12 de mayo</p>
        </WidgetDemo>
      </div>
    </div>
  );
}

/* ── Pantalla ENFÓCATE (digitalización del mockup) ── */
export default function FocusModeScreen({ userName, sesionActiva, onIniciar, onBack, onNavigate }: {
  userName?: string;
  sesionActiva?: FocusHerramienta | 'descanso' | null;
  onIniciar: (herramienta: FocusHerramienta, config: FocusConfig) => void;
  onBack: () => void;
  onNavigate?: (section: string) => void;
}) {
  const [configurando, setConfigurando] = useState<FocusHerramienta | null>(null);
  const [estadoVisible, setEstadoVisible] = useState(true);

  useEffect(() => { setEstadoVisible(true); }, [sesionActiva]);

  const enCurso = sesionActiva ? (ETIQUETA_HERRAMIENTA[sesionActiva] || sesionActiva) : null;

  return (
    <>
      <ModuleShell activeNav="focus" userName={userName} onBack={onBack} onNavigate={onNavigate} titulo="ENFÓCATE" subtitulo="Herramientas para proteger tu concentración y lograr más." iconoTitulo={() => <img src="./archer.png" alt="Archer" className="w-8 h-8" />}>
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="mt-6 grid items-start gap-6 xl:grid-cols-[1fr_310px]">
            {/* Columna principal */}
            <div>
              {/* Hero (mockup) */}
              <div className="relative overflow-hidden rounded-xl bg-[#101828] text-white">
                <img
                  src="./focus.jpg"
                  alt="" aria-hidden
                  className="absolute inset-0 h-full w-full h-100"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0B1023]/95 via-[#0B1023]/75 to-transparent" />
                <div className="relative z-10 flex min-h-[300px] max-w-md flex-col justify-between gap-6 p-8 sm:min-h-[340px] sm:p-10">
                  <div>
                    <h2 className="text-xs font-bold leading-snug sm:text-[28px] sm:leading-[1.25]">
                      Tu atención es<br />tu recurso más valioso.
                    </h2>
                    <p className="mt-4 text-xs leading-relaxed text-slate-300">
                      Entra en modo enfoque, elimina distracciones y avanza con claridad hacia lo que
                      realmente importa para ti.
                    </p>
                  </div>
                  <div>
                    <button onClick={() => setConfigurando('pomodoro')}
                      className="flex items-center gap-2 rounded-xl px-6 py-3 text-[15px] font-semibold text-white shadow-lg shadow-purple-900/40 transition-all hover:brightness-110 active:scale-[0.98]"
                      style={{ background: `linear-gradient(135deg, #8B5CF6, ${PURPLE})` }}>
                      <Play className="h-4 w-4" />
                      Iniciar una sesión de enfoque
                    </button>
                    <p className="mt-5 flex items-center gap-2 text-xs text-slate-400">
                      <Shield className="h-4 w-4 shrink-0" />
                      Las herramientas te acompañan mientras sigues trabajando en Focusia.
                    </p>
                  </div>
                </div>
              </div>

              {/* Herramientas (mockup) */}
              <h3 className="mt-8 text-[15px] font-bold text-slate-900">
                Elige la herramienta que mejor se adapta a tu objetivo
              </h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {HERRAMIENTAS.map(({ key, icono, desc }) => (
                  <div key={key} className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm hover:shadow-md transition-shadow">
                    {icono}
                    <h4 className="mt-3 text-lg font-bold text-slate-900">{ETIQUETA_HERRAMIENTA[key]}</h4>
                    <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-slate-600">{desc}</p>
                    <button onClick={() => setConfigurando(key)}
                      className="mt-4 w-full rounded-lg border border-purple-200 py-2 text-sm font-semibold text-purple-700 transition-colors hover:bg-purple-50">
                      Utilizar
                    </button>
                  </div>
                ))}
              </div>

              {/* Vista previa de widgets (mockup) */}
              <VistaPreviaWidgets />
            </div>

            {/* Columna derecha */}
            <div className="flex flex-col gap-5">
              {/* Estado Focus (dinámico) */}
              {estadoVisible && (
                <div className={`relative rounded-2xl border p-5 ${enCurso ? 'border-emerald-200 bg-emerald-50' : 'border-emerald-100 bg-[#F0FBF2]'}`}>
                  <button onClick={() => setEstadoVisible(false)}
                    className="absolute right-3 top-3 rounded-lg p-1 text-slate-400 hover:bg-white/70 hover:text-slate-600">
                    <X className="h-4 w-4" />
                  </button>
                  <div className="flex items-center justify-between pr-7">
                    <h4 className="text-[15px] font-bold text-slate-900">Estado Focus</h4>
                    <Info className="h-4 w-4 text-slate-300" />
                  </div>
                  <div className="mt-4 flex items-center gap-4">
                    <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white shadow-inner ${enCurso ? 'bg-[#059669]' : 'bg-[#79A7D1]'}`}>
                      <img src="./archer.png" alt="Archer" className="h-9 w-9" />
                    </span>
                    {enCurso ? (
                      <p className="text-[13px] leading-relaxed text-slate-700">
                        <strong className="text-slate-900">Sesión activa: {enCurso}.</strong>{' '}
                        Tu sesión sigue corriendo en el widget flotante; sigue trabajando con normalidad.
                      </p>
                    ) : (
                      <p className="text-[13px] leading-relaxed text-slate-700">
                        <strong className="text-slate-900">No hay sesión activa</strong><br />
                        Elige una herramienta y comienza tu sesión de enfoque.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ¿Cómo funciona? (mockup) */}
              <div className="rounded-2xl border border-purple-100 bg-[#F6F4FF] p-5">
                <h4 className="text-[15px] font-bold text-slate-900">¿Cómo funciona?</h4>
                <div className="mt-4 space-y-4">
                  {COMO_FUNCIONA.map(({ Icon, titulo, desc }) => (
                    <div key={titulo} className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-purple-600 shadow-sm">
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <p className="text-[13px] leading-snug text-slate-600">
                        <strong className="block text-slate-900">{titulo}</strong>
                        {desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Consejo Focusia (mockup) */}
              <div className="rounded-2xl border border-amber-100 bg-[#FEF7E8] p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-amber-500 shadow-sm">
                    <Star className="h-5 w-5" />
                  </span>
                  <p className="text-[13px] leading-relaxed text-slate-700">
                    <strong className="block text-[15px] text-slate-900">Consejo Focusia</strong>
                    Sesiones cortas y constantes te llevan más lejos que largas e inconsistentes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ModuleShell>

      {configurando && (
        <ModalConfiguracion
          herramienta={configurando}
          onIniciar={(h, c) => { setConfigurando(null); onIniciar(h, c); }}
          onCerrar={() => setConfigurando(null)}
          ocupado={false}
        />
      )}
    </>
  );
}
