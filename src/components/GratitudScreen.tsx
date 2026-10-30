import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Heart, Loader2, Check, AlertCircle, Quote, Sunrise, Clock, Lock,
  Image,
} from 'lucide-react';
import { gratitudService, type GratitudHoy } from '../services/api';
import ModuleShell from './ModuleShell';

/* ─────────────────────────────────────────────────────────────
   Doc 19 — Módulo Gratitud: pantalla digitalizada sobre el mockup.

   Dos columnas: a la izquierda la práctica del día (frase, pregunta y
   campo libre con guardado automático); a la derecha las tarjetas que
   explican cómo funciona la práctica. No hay botones propios de envío
   ni evaluaciones (§II y §III).
   ───────────────────────────────────────────────────────────── */

/** Foto de portada del mockup. Si no existe, queda el atardecer en CSS. */
const HERO_IMAGE = '/gratitud-hero.jpg';

/** Tope del campo libre, tal como muestra el contador del mockup. */
const LIMITE_TEXTO = 1000;

/** «miércoles, 21 de octubre» a partir de la fecha ISO del backend. */
function fechaLarga(iso: string): string {
  const [anio, mes, dia] = iso.split('-').map(Number);
  if (!anio || !mes || !dia) return iso;
  return new Date(anio, mes - 1, dia).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

/** Tarjetas de la columna «Tu práctica diaria» del mockup. */
const PRACTICAS = [
  {
    img: './Up-3.png',
    fondo: '#F1EBFF',
    titulo: 'Tu respuesta se guarda automáticamente',
    detalle: 'No tienes que hacer nada más.',
  },
  {
    img: './book-2.png',
    fondo: '#FDEBDD',
    titulo: 'Cada día recibirás una nueva frase',
    detalle: 'Una frase distinta para descubrir cada mañana.',
  },
  {
    img: './hoja.png',
    fondo: '#E9F7EC',
    titulo: 'Un minuto al día fortalece tu bienestar',
    detalle: 'Pequeños hábitos, grandes cambios.',
  },
];

export default function GratitudScreen({ userName, onBack, onNavigate }: {
  userName?: string;
  onBack: () => void;
  onNavigate?: (section: string) => void;
}) {
  const [datos, setDatos] = useState<GratitudHoy | null>(null);
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState<'inactivo' | 'guardando' | 'guardado' | 'error'>('inactivo');

  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Último texto escrito que todavía no llegó al servidor.
  const pendiente = useRef<string | null>(null);

  useEffect(() => {
    let vivo = true;
    gratitudService.hoy()
      .then(d => {
        if (!vivo) return;
        setDatos(d);
        setTexto(d.respuesta || '');
      })
      .catch(() => {
        if (vivo) setError('No pudimos cargar la frase de hoy. Vuelve a entrar en un momento.');
      })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, []);

  const guardar = useCallback(async (valor: string) => {
    pendiente.current = null;
    setEstado('guardando');
    try {
      await gratitudService.guardar(valor);
      setEstado('guardado');
    } catch {
      setEstado('error');
    }
  }, []);

  const cambiar = (valor: string) => {
    setTexto(valor);
    pendiente.current = valor;
    setEstado('guardando');
    if (temporizador.current) clearTimeout(temporizador.current);
    // Se espera a que el usuario deje de escribir para no mandar una petición
    // por cada tecla (§II.3: la respuesta queda almacenada automáticamente).
    temporizador.current = setTimeout(() => {
      if (pendiente.current !== null) guardar(pendiente.current);
    }, 900);
  };

  // Si el usuario abandona el módulo en cualquier momento (§III), lo último
  // escrito se envía igual: no hay botón de guardar.
  useEffect(() => () => {
    if (temporizador.current) clearTimeout(temporizador.current);
    if (pendiente.current !== null) {
      gratitudService.guardar(pendiente.current).catch(() => { /* noop */ });
    }
  }, []);

  const marca = () => {
    if (estado === 'guardando') {
      return (
        <span className="flex items-center gap-1.5 text-slate-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando…
        </span>
      );
    }
    if (estado === 'guardado') {
      return (
        <span className="flex items-center gap-1.5 text-emerald-500 font-semibold">
          <Check className="w-3.5 h-3.5" /> Guardado
        </span>
      );
    }
    if (estado === 'error') {
      return (
        <span className="flex items-center gap-1.5 text-rose-500 font-semibold">
          <AlertCircle className="w-3.5 h-3.5" /> No se pudo guardar
        </span>
      );
    }
    return null;
  };

  return (
    <ModuleShell
      activeNav="gratitud"
      userName={userName}
      onBack={onBack}
      onNavigate={onNavigate}
      titulo="Gratitud"
      subtitulo="Un minuto de gratitud puede cambiar tu día."
      iconoTitulo={Heart}
    >
      <div className="px-4 pb-4 md:px-4 lg:pb-4 pt-6">
        <div className="max-w-6xl mx-auto">
          {cargando && (
            <div className="bg-white dark:bg-[#1a1a3a] rounded-2xl border border-[#ECE7F8] dark:border-white/10 p-8 flex items-center gap-3 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" /> Preparando la frase de hoy…
            </div>
          )}

          {!cargando && error && (
            <div className="bg-white dark:bg-[#1a1a3a] rounded-2xl border border-rose-100 dark:border-rose-500/20 p-8 flex items-start gap-3 text-rose-600">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {!cargando && !error && (
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_290px] gap-5 xl:gap-6 items-start">

              {/* ── Columna principal ── */}
              <div className="min-w-0">

                {/* §II.1 — frase del día sobre la portada del mockup */}
                <article className="relative overflow-hidden rounded-xl min-h-[220px] sm:min-h-[260px] flex items-center shadow-[0_12px_34px_rgba(58,20,90,0.20)]">
                  {/* Atardecer de respaldo (se ve si no hay foto cargada) */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_82%,#FFD79A_0%,#F4A573_16%,#C9635F_38%,#6B2F5E_64%,#2A1745_100%)]" />
                  <img
                    src="./gratitud.jpg"
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover object-center"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#140C22]/92 via-[#140C22]/55 to-transparent" />

                  <div className="relative p-6 sm:p-8 max-w-[34rem]">
                    <div className="bg-white dark:bg-[#1a1a3a] rounded-xl border border-[#ECE7F8] dark:border-white/10 p-8 min-h-[9.5rem] flex items-start gap-2 shadow-[0_1px_2px_rgba(27,20,64,0.04)]">
                      <img src="./apostrofe.png" alt="" className="w-6 h-6 shrink-0" />
                      <div className="min-w-0">
                        <blockquote className="font-serif italic text-xl sm:text-[26px] leading-snug text-[#1B1440] dark:text-white">
                          {datos?.frase?.texto || 'Hoy no hay una frase cargada en el catálogo.'}
                        </blockquote>
                        {datos?.frase && (
                          <p className="mt-5 text-[13px] sm:text-sm text-[#5B5670] dark:text-gray-300">
                            <span className="font-semibold text-[#1B1440] dark:text-white">
                              {datos.frase.autor || 'Autor desconocido'}
                            </span>
                            {datos.frase.obra && (
                              <span className="text-[#7C7793] dark:text-gray-400"> · {datos.frase.obra}</span>
                            )}
                            {datos.frase.anio && (
                              <span className="text-slate-400 dark:text-gray-500"> · {datos.frase.anio}</span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                    
                </article>

                {/* §II.2 y §II.3 — pregunta fija + campo libre con guardado automático */}
                <section className="bg-white dark:bg-[#1a1a3a] rounded-2xl border border-[#ECE7F8] dark:border-white/10 p-5 sm:p-7 mt-5 shadow-sm">
                  <label
                    htmlFor="gratitud-respuesta"
                    className="block text-base sm:text-lg font-bold text-[#1B1440] dark:text-white"
                  >
                   <span> 
                    <img src="./hearth.png" alt="" className='w-5 h-5' />{datos?.pregunta || '¿Por qué debieras estar agradecido hoy?'}</span> 
                  </label>

                  <div className="relative mt-4">
                    <textarea
                      id="gratitud-respuesta"
                      value={texto}
                      onChange={e => cambiar(e.target.value)}
                      rows={7}
                      maxLength={LIMITE_TEXTO}
                      placeholder="Escribe aquí tu respuesta…"
                      className="w-full resize-y rounded-xl border border-[#E4DEF5] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 pb-9 text-[15px] leading-relaxed text-[#1B1440] dark:text-white placeholder:text-slate-400 outline-none transition focus:border-[#6236FF] focus:ring-2 focus:ring-[#6236FF]/15"
                    />
                    <span className="pointer-events-none absolute bottom-3 right-4 text-[11px] tabular-nums text-slate-400">
                      {texto.length}/{LIMITE_TEXTO}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                    <span className="flex items-center gap-1.5 text-slate-500 dark:text-gray-400">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      Tu respuesta se guarda automáticamente mientras escribes.
                    </span>
                    {marca()}
                  </div>
                </section>

                {/* Reaseguro del cierre (igual que el mockup) */}
                <section className="mt-4 rounded-2xl border border-[#ECE7F8] dark:border-white/10 bg-[#FBFAFF] dark:bg-white/5 px-5 py-4 flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-[#EFE8FF] text-[#6236FF] flex items-center justify-center shrink-0">
                    <img src="./stars.png" alt="" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#6C17BD] dark:text-white">
                      Tu reflexion de hoy se guardará automáticamente.
                    </p>
                    <p className="text-xs text-slate-500 dark:text-gray-400">
                      Gracias por reconocer lo positivo de ti vida cada día.
                    </p>
                  </div>
                  <img src="./olivo.png" alt="" className="w-50 h-16 " />
                </section>
              </div>

              {/* ── Columna derecha: Tu práctica diaria ── */}
              <aside className="bg-white dark:bg-[#1a1a3a] rounded-2xl border border-[#ECE7F8] dark:border-white/10 p-5 shadow-[0_1px_2px_rgba(27,20,64,0.04)]">
                <span className="w-11 h-11 rounded-full bg-[#F1EBFF] text-[#6236FF] flex items-center justify-center">
                  <Heart className="w-5 h-5" />
                </span>
                <p className="mt-3.5 text-[15px] font-bold text-[#2B2350] dark:text-white">
                  Tu práctica diaria
                </p>
                <span className="mt-2 block h-[2px] w-7 rounded-full bg-[#6236FF]" aria-hidden />

                <div className="mt-6 space-y-6">
                  {PRACTICAS.map(({ img, fondo, titulo, detalle }) => (
                    <div key={titulo} className="flex items-start gap-3.5">
                      <span
                        className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: fondo }}
                      >
                        <img src={img} alt="" className="w-[30px] h-[30px] object-contain" />
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <p className="text-[13px] font-bold leading-snug text-[#1B1440] dark:text-white">
                          {titulo}
                        </p>
                        <p className="mt-1.5 text-[11.5px] leading-snug text-[#8A8699] dark:text-gray-400">
                          {detalle}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Firma manuscrita del cierre, como en el mockup */}
                <div className="mt-8 flex flex-col items-center">
                  <p className="font-caveat text-[20px] leading-[1.15] text-[#6B4BE0] text-center">
                    Gracias por dedicarte<br />este momento.
                  </p>
                  <div className="mt-1 flex items-center gap-1">
                    <svg width="86" height="7" viewBox="0 0 86 7" fill="none" aria-hidden>
                      <path
                        d="M1 4.6C10 1.9 18 1.1 27 3.6c9 2.5 17 1.2 26-0.7 9-1.9 19-1 32 1"
                        stroke="#6B4BE0"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                        opacity="0.55"
                      />
                    </svg>
                    <Heart className="w-3.5 h-3.5 text-[#6B4BE0]/60" aria-hidden />
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>
    </ModuleShell>
  );
}