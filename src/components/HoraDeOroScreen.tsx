import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Heart, Plus, X, Check, Loader2, CalendarDays, Info, ChevronRight,
  Play, Clock, BookOpen, Target, BarChart3, Bell, RefreshCw,
} from 'lucide-react';
import {
  horaOroService,
  type HoraOroAjustes,
  type HoraOroCategoria,
  type HoraOroDia,
  type HoraOroEstadisticas,
  type HoraOroExperienciaData,
  type HoraOroRealizadas,
} from '../services/api';
import ModuleShell from './ModuleShell';

/* ──────────────────────────────────────────────────────────────────────────
   Doc 24 · Hora de Oro Familiar — pantalla digitalizada del mockup.

   La página se lee de arriba a abajo: encabezado, portada, el plan semanal de
   los siete días y el catálogo de experiencias; a la derecha, la columna con
   las tarjetas de inspiración, recordatorio, estadísticas y configuración.
   El usuario no escribe la actividad: elige una del catálogo.
   ────────────────────────────────────────────────────────────────────────── */

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** Portada del módulo: la foto familiar de grat.jpg. Si no existe, se usa el degradado. */
const HERO_IMAGE = '/grat.jpg';

// La primera experiencia del día se lee en morado y la segunda en ámbar, tal
// como explica la leyenda de «Tu plan semanal».
const TINTES = [
  { fondo: '#EFEBFF', color: '#6236FF' },
  { fondo: '#FFF3E0', color: '#F59E0B' },
  { fondo: '#E4F6F8', color: '#0891B2' },
];

const QUIEN = 'Cada experiencia elegida es una hora de calidad que le regalas a tu familia.';

/** Los siete días de la semana en curso, de lunes a domingo. */
function semanaEnCurso() {
  const hoy = new Date();
  const lunes = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - ((hoy.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, indice) => {
    const dia = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + indice);
    return {
      corta: `${dia.getDate()} ${MESES_CORTOS[dia.getMonth()]}`,
      esHoy: indice === (hoy.getDay() + 6) % 7,
    };
  });
}

function minutosLegibles(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (!horas) return `${resto} min`;
  if (!resto) return `${horas} h`;
  return `${horas} h ${resto} min`;
}

function fechaLarga(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  } catch {
    return iso;
  }
}

/* ── Piezas de la pantalla ─────────────────────────────────────────────── */

function Delta({ valor }: { valor: number | null }) {
  if (valor === null || valor === undefined) return null;
  const sube = valor >= 0;
  return (
    <span className={`text-[11px] font-bold ${sube ? 'text-emerald-500' : 'text-rose-500'}`}>
      {sube ? '+' : ''}{valor}%
    </span>
  );
}

function Estadistica({ Icono, etiqueta, valor, delta }: {
  Icono: React.ComponentType<{ className?: string }>;
  etiqueta: string; valor: string; delta: number | null;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="w-8 h-8 rounded-lg bg-[#F1EFFF] text-[#6236FF] flex items-center justify-center shrink-0">
        <Icono className="w-4 h-4" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[11px] text-slate-500 dark:text-gray-400 leading-tight">{etiqueta}</span>
        <span className="block text-sm font-black text-[#101433] dark:text-white">{valor}</span>
      </span>
      <Delta valor={delta} />
    </div>
  );
}

function TarjetaExperiencia({ experiencia, emoji, indice, activo, onElegir, onQuitar }: {
  experiencia: HoraOroExperienciaData;
  emoji: string;
  indice: number;
  activo: boolean;
  onElegir: () => void;
  onQuitar: () => void;
}) {
  const tinte = TINTES[indice] || TINTES[2];
  return (
    <div
      className={`group relative rounded-xl border bg-white dark:bg-white/5 transition-colors ${
        activo ? 'border-[#6236FF] ring-1 ring-[#6236FF]/30' : 'border-[#EDEFF5] dark:border-white/10 hover:border-[#6236FF]/40'
      }`}
    >
      <button
        type="button"
        onClick={onElegir}
        title="Cambiar por otra experiencia"
        className="w-full text-left px-2 py-2 flex items-start gap-2"
      >
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm leading-none shrink-0"
          style={{ backgroundColor: tinte.fondo, color: tinte.color }}
        >
          {emoji}
        </span>
        <span className="min-w-0 flex-1 pt-0.5">
          <span className="block text-[11px] font-semibold leading-tight text-[#101433] dark:text-gray-100">
            {experiencia.actividad}
          </span>
          <span className="block text-[9px] font-medium text-slate-400 truncate">{experiencia.categoria}</span>
        </span>
        {experiencia.realizada && (
          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-1" strokeWidth={3} />
        )}
      </button>
      <button
        type="button"
        title="Quitar"
        onClick={onQuitar}
        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white dark:bg-[#1a1a3a] border border-rose-200 text-rose-500 items-center justify-center hidden group-hover:flex hover:bg-rose-50"
      >
        <X className="w-3 h-3" strokeWidth={3} />
      </button>
    </div>
  );
}

function CatalogoCategoria({ categoria, cargando, onElegir, onOtraIdea }: {
  categoria: HoraOroCategoria;
  cargando: boolean;
  onElegir: (categoria: string, actividad: string) => void;
  onOtraIdea: (categoria: string) => void;
}) {
  return (
    <div
      className="rounded-2xl border p-3 flex flex-col bg-white dark:bg-white/5"
      style={{ borderColor: `${categoria.color}33`, backgroundColor: `${categoria.color}0A` }}
    >
      <h3 className="flex items-center gap-1.5 text-[12px] font-bold leading-tight" style={{ color: categoria.color }}>
        <span className="text-sm">{categoria.emoji}</span>
        {categoria.nombre}
      </h3>
      <ul className="mt-2 flex-1 flex flex-col">
        {categoria.actividades.map((actividad, indice) => (
          <li key={`${categoria.nombre}-${indice}-${actividad}`}>
            <button
              type="button"
              onClick={() => onElegir(categoria.nombre, actividad)}
              className="w-full text-left text-[11px] leading-snug text-slate-600 dark:text-gray-300 py-0.5 hover:font-semibold transition-all truncate"
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = categoria.color; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = ''; }}
            >
              {actividad}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={cargando}
        onClick={() => onOtraIdea(categoria.nombre)}
        className="mt-2 w-full rounded-lg border py-1.5 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60"
        style={{ borderColor: `${categoria.color}55`, color: categoria.color }}
      >
        {cargando
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <RefreshCw className="w-3.5 h-3.5" />}
        Otra idea
      </button>
    </div>
  );
}

/* ── Pantalla ──────────────────────────────────────────────────────────── */

export default function HoraDeOroScreen({ onBack, userName, onNavigate, slotInicial }: {
  onBack: () => void; userName?: string; onNavigate?: (section: string) => void;
  slotInicial?: { dia: string; posicion: number } | null;
}) {
  const [dias, setDias] = useState<HoraOroDia[]>([]);
  const [categorias, setCategorias] = useState<HoraOroCategoria[]>([]);
  const [estadisticas, setEstadisticas] = useState<HoraOroEstadisticas | null>(null);
  const [ajustes, setAjustes] = useState<HoraOroAjustes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [slot, setSlot] = useState<{ dia: string; posicion: number } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [otraIdeaEn, setOtraIdeaEn] = useState<string | null>(null);
  const [showAjustes, setShowAjustes] = useState(false);
  const [guardandoAjustes, setGuardandoAjustes] = useState(false);
  const [realizadas, setRealizadas] = useState<HoraOroRealizadas | null>(null);
  const [showRealizadas, setShowRealizadas] = useState(false);

  // §II.6 — «Otra idea» no repite lo ya mostrado durante la sesión.
  const vistas = useRef<Record<string, Set<string>>>({});
  const catalogoRef = useRef<HTMLDivElement>(null);
  const slotAbierto = useRef(false);

  const semana = useMemo(semanaEnCurso, []);
  const hoyIndice = useMemo(() => (new Date().getDay() + 6) % 7, []);

  const cargar = useCallback(async () => {
    try {
      setError(null);
      const [plan, cats, stats, conf] = await Promise.all([
        horaOroService.planificador(),
        horaOroService.catalogo(),
        horaOroService.estadisticas(),
        horaOroService.ajustes(),
      ]);
      setDias(plan.dias);
      setCategorias(cats);
      setEstadisticas(stats);
      setAjustes(conf);
      cats.forEach(c => { vistas.current[c.nombre] = new Set(c.actividades); });
    } catch {
      setError('No se pudo cargar la Hora de Oro Familiar.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // El aviso se retira solo para no dejar ruido en pantalla.
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 4500);
    return () => clearTimeout(t);
  }, [aviso]);

  const refrescarEstadisticas = useCallback(async () => {
    try { setEstadisticas(await horaOroService.estadisticas()); } catch { /* noop */ }
  }, []);

  const irAlCatalogo = useCallback((suave = true) => {
    catalogoRef.current?.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'start' });
  }, []);

  const seleccionar = useCallback((dia: string, posicion: number) => {
    setAviso(null);
    setSlot({ dia, posicion });
    irAlCatalogo();
  }, [irAlCatalogo]);

  // Al llegar desde un espacio del widget de Inicio se preselecciona ese espacio
  // y se baja al catálogo. El salto espera a que la semana ya esté pintada; el
  // temporizador no se cancela porque StrictMode vuelve a montar el efecto.
  useEffect(() => {
    if (slotAbierto.current || loading || !slotInicial) return;
    slotAbierto.current = true;
    setSlot({ dia: slotInicial.dia, posicion: slotInicial.posicion });
    setTimeout(() => irAlCatalogo(false), 400);
  }, [slotInicial, loading, irAlCatalogo]);

  const emojiDe = (nombre: string) => categorias.find(c => c.nombre === nombre)?.emoji || '⭐';

  const aplicarDia = (dia: HoraOroDia) => {
    setDias(prev => prev.map(d => (d.dia === dia.dia ? { ...d, ...dia } : d)));
  };

  /** Primer espacio libre del plan, para cuando no hay un día seleccionado. */
  const primerEspacioLibre = (plan: HoraOroDia[]) => {
    for (const dia of plan) {
      if (dia.experiencias.length < dia.espacios_iniciales) {
        return { dia: dia.dia, posicion: dia.experiencias.length };
      }
    }
    const primero = plan[0];
    return primero ? { dia: primero.dia, posicion: primero.siguiente_posicion } : null;
  };

  const elegir = async (categoriaNombre: string, actividad: string) => {
    const destino = slot || primerEspacioLibre(dias);
    if (!destino) return;
    setGuardando(true);
    setError(null);
    try {
      const { dia } = await horaOroService.guardar({
        dia_semana: destino.dia,
        posicion: destino.posicion,
        categoria: categoriaNombre,
        actividad,
      });
      vistas.current[categoriaNombre]?.add(actividad);
      aplicarDia(dia);
      setSlot(null);
      setAviso(`«${actividad}» quedó registrada para el ${dia.dia.toLowerCase()}.`);
      refrescarEstadisticas();
    } catch {
      setError('No se pudo registrar la experiencia.');
    } finally {
      setGuardando(false);
    }
  };

  const otraIdea = async (categoriaNombre: string) => {
    setOtraIdeaEn(categoriaNombre);
    setError(null);
    try {
      const excluir = Array.from(vistas.current[categoriaNombre] || []);
      const { actividad } = await horaOroService.otraIdea(categoriaNombre, excluir);
      vistas.current[categoriaNombre]?.add(actividad);
      setCategorias(prev => prev.map(cat => (
        cat.nombre === categoriaNombre
          ? { ...cat, actividades: [...cat.actividades, actividad] }
          : cat
      )));
    } catch {
      setError('No hay más ideas para esa categoría en este momento.');
    } finally {
      setOtraIdeaEn(null);
    }
  };

  const quitar = async (experiencia: HoraOroExperienciaData, dia: string) => {
    setAviso(null);
    try {
      const { dia: actualizado } = await horaOroService.eliminar(experiencia.id);
      setDias(prev => prev.map(d => (d.dia === dia ? { ...d, ...actualizado } : d)));
      refrescarEstadisticas();
    } catch {
      setError('No se pudo quitar la experiencia.');
    }
  };

  const marcar = async (
    objetivo: { id: number; dia_semana: string; actividad: string },
    realizada: boolean,
  ) => {
    setAviso(null);
    try {
      await horaOroService.realizar(objetivo.id, realizada);
      setDias(prev => prev.map(d => (
        d.dia === objetivo.dia_semana
          ? { ...d, experiencias: d.experiencias.map(e => (e.id === objetivo.id ? { ...e, realizada } : e)) }
          : d
      )));
      setAviso(realizada
        ? `¡Disfruten «${objetivo.actividad}»! Quedó en tus estadísticas.`
        : `«${objetivo.actividad}» volvió a quedar pendiente.`);
      refrescarEstadisticas();
      if (showRealizadas) setRealizadas(await horaOroService.realizadas());
    } catch {
      setError('No se pudo actualizar la experiencia.');
    }
  };

  const abrirRealizadas = async () => {
    setShowRealizadas(true);
    try { setRealizadas(await horaOroService.realizadas()); } catch { setError('No se pudo cargar el historial.'); }
  };

  const guardarAjustes = async (cambios: Partial<HoraOroAjustes>) => {
    if (!ajustes) return;
    const previos = ajustes;
    setAjustes({ ...ajustes, ...cambios });
    setGuardandoAjustes(true);
    try {
      setAjustes(await horaOroService.guardarAjustes(cambios));
      setAviso('Tus recordatorios de Hora de Oro quedaron guardados.');
    } catch {
      setAjustes(previos);
      setError('No se pudieron guardar los recordatorios.');
    } finally {
      setGuardandoAjustes(false);
    }
  };

  // ── Recordatorio del día ────────────────────────────────────────────
  const diaDeHoy = dias[hoyIndice];
  const deHoy = diaDeHoy?.experiencias || [];
  const pendienteHoy = deHoy.find(e => !e.realizada);
  const realizadoHoy = [...deHoy].reverse().find(e => e.realizada);

  const total = useMemo(
    () => dias.reduce((suma, dia) => suma + dia.experiencias.length, 0),
    [dias],
  );

  return (
    <ModuleShell activeNav="hora-oro" userName={userName} onBack={onBack} onNavigate={onNavigate}>
      <div className="p-5 lg:p-8">
        <div className="max-w-[1650px] mx-auto">

          {/* Encabezado (§II.1, §II.2) */}
          <header className="flex items-start gap-4 mb-6">
            <span className="w-14 h-14 rounded-2xl bg-[#FFE3EE] text-[#EC2C6B] flex items-center justify-center shrink-0">
              <Heart className="w-7 h-7 fill-current" />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-[#101433] dark:text-white">
                HORA DE ORO FAMILIAR
              </h1>
              <p className="text-sm sm:text-[15px] font-semibold text-slate-600 dark:text-gray-300 mt-1">
                Cada día disponemos de poco tiempo para compartir con quienes más queremos.
              </p>
              <p className="text-sm text-slate-500 dark:text-gray-400">
                No pierdas esos momentos pensando qué hacer. Elige una experiencia y regálale una hora
                de calidad a tu familia.
              </p>
            </div>
          </header>

          {error && (
            <div className="mb-5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <X className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600 text-xs font-bold">Cerrar</button>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">

            {/* ── Columna principal ─────────────────────────────────── */}
            <div className="flex flex-col gap-6 min-w-0">

              {/* Portada */}
              <section className="relative overflow-hidden rounded-2xl bg-[#2A1B4D] min-h-[210px] sm:min-h-[240px] flex items-center">
                <img
                  src={HERO_IMAGE}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover object-center"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                {/* Velo solo sobre el texto: la familia de la foto queda a la vista. */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#150A26]/92 via-[#1D1036]/60 to-transparent" />
                <div className="relative p-6 sm:p-8 max-w-xl">
                  <h2 className="text-2xl sm:text-[32px] font-bold leading-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]">
                    Pequeños momentos<br />crean grandes recuerdos.
                  </h2>
                  <p className="mt-3 text-sm sm:text-base text-white/85 drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)]">
                    Una hora de calidad hoy, fortalece el vínculo para toda la vida.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const destino = primerEspacioLibre(dias);
                      if (destino) seleccionar(destino.dia, destino.posicion);
                      else irAlCatalogo();
                    }}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white bg-gradient-to-r from-[#8B5CF6] to-[#6236FF] shadow-lg shadow-purple-900/40 hover:brightness-110 active:scale-[0.98] transition"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Elegir una experiencia
                  </button>
                </div>
              </section>

              {/* Tu plan semanal (§II.3) */}
              <section>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <h2 className="flex items-center gap-2 text-base sm:text-lg font-black text-[#101433] dark:text-white">
                    Tu plan semanal
                    <span title="Cada día tiene dos espacios. Puedes agregar tantos como quieras.">
                      <Info className="w-4 h-4 text-slate-400" />
                    </span>
                  </h2>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-gray-400">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TINTES[0].color }} />
                      1ª experiencia
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-gray-400">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TINTES[1].color }} />
                      2ª experiencia
                    </span>
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-16 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <div className="grid gap-3 grid-cols-2 md:grid-cols-4 2xl:grid-cols-7">
                    {dias.map((dia, indiceDia) => {
                      const espacios = Math.max(dia.espacios_iniciales, dia.experiencias.length);
                      const esHoy = indiceDia === hoyIndice;
                      return (
                        <div
                          key={dia.dia}
                          className={`rounded-2xl border bg-white dark:bg-[#14142e] p-3 flex flex-col min-w-0 ${
                            esHoy ? 'border-[#6236FF]/40 shadow-sm' : 'border-[#EDEFF5] dark:border-white/10'
                          }`}
                        >
                          <div className="text-center pb-2 border-b border-dashed border-[#EDEFF5] dark:border-white/10">
                            <p className="text-[11px] font-black tracking-wide text-[#101433] dark:text-white uppercase">
                              {dia.dia}
                            </p>
                            <p className="text-[10px] font-medium text-slate-400">
                              {semana[indiceDia]?.corta}
                              {esHoy && <span className="ml-1 text-[#6236FF] font-bold">· hoy</span>}
                            </p>
                          </div>

                          <div className="mt-2.5 flex flex-col gap-2 flex-1">
                            {Array.from({ length: espacios }).map((_, indice) => {
                              const experiencia = dia.experiencias[indice];
                              if (!experiencia) {
                                return (
                                  <button
                                    key={indice}
                                    type="button"
                                    onClick={() => seleccionar(dia.dia, indice)}
                                    className={`w-full rounded-xl border border-dashed py-3 text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors ${
                                      slot?.dia === dia.dia && slot?.posicion === indice
                                        ? 'border-[#6236FF] text-[#6236FF] bg-[#F5F3FF]'
                                        : 'border-[#DDE1EC] dark:border-white/15 text-slate-400 hover:border-[#6236FF] hover:text-[#6236FF]'
                                    }`}
                                  >
                                    <Plus className="w-3 h-3" strokeWidth={3} />
                                    Elegir experiencia
                                  </button>
                                );
                              }
                              return (
                                <TarjetaExperiencia
                                  key={experiencia.id}
                                  experiencia={experiencia}
                                  emoji={emojiDe(experiencia.categoria)}
                                  indice={indice}
                                  activo={slot?.dia === dia.dia && slot?.posicion === indice}
                                  onElegir={() => seleccionar(dia.dia, indice)}
                                  onQuitar={() => quitar(experiencia, dia.dia)}
                                />
                              );
                            })}
                          </div>

                          {/* §II.3 — espacio extra, sin límite */}
                          <button
                            type="button"
                            title="Agregar experiencia"
                            onClick={() => seleccionar(dia.dia, dia.siguiente_posicion)}
                            className={`mt-2 w-full rounded-xl border border-dashed py-1.5 flex items-center justify-center gap-1 text-[10px] font-bold transition-colors ${
                              dia.puede_agregar
                                ? 'border-[#6236FF]/40 text-[#6236FF] hover:bg-[#F5F3FF] dark:hover:bg-white/5'
                                : 'border-[#DDE1EC] dark:border-white/15 text-slate-400 hover:border-[#6236FF] hover:text-[#6236FF]'
                            }`}
                          >
                            <Plus className="w-3 h-3" strokeWidth={3} />
                            {dia.puede_agregar && 'Agregar experiencia'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Catálogo de experiencias (§II.5, §II.6) */}
              <section ref={catalogoRef} className="scroll-mt-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-[#101433] dark:text-white">
                      Catálogo de experiencias
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">
                      Elige una experiencia para agregar a tu plan. ¡Tu selección, Focusia inspira!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={abrirRealizadas}
                    className="rounded-xl border border-[#6236FF]/40 text-[#6236FF] text-[11px] sm:text-xs font-bold px-3.5 py-2 flex items-center gap-1 hover:bg-[#F5F3FF] dark:hover:bg-white/5 transition-colors shrink-0"
                  >
                    Ver mis experiencias realizadas
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div
                  className={`mt-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold flex items-center gap-2 ${
                    slot
                      ? 'bg-[#F3F0FF] text-[#6236FF] dark:bg-white/5 dark:text-purple-300'
                      : 'bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-gray-400'
                  }`}
                >
                  <Target className="w-4 h-4 shrink-0" />
                  {slot
                    ? <>Agregando a <strong className="mx-1">{slot.dia}</strong> · espacio {slot.posicion + 1}. Toca una actividad.</>
                    : <span>Sin día seleccionado: la experiencia entra en el primer espacio libre.</span>}
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-16 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <div className="mt-3 grid gap-3 grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
                    {categorias.map(cat => (
                      <CatalogoCategoria
                        key={cat.nombre}
                        categoria={cat}
                        cargando={otraIdeaEn === cat.nombre}
                        onElegir={elegir}
                        onOtraIdea={otraIdea}
                      />
                    ))}
                  </div>
                )}
              </section>

              <p className="text-[11px] text-slate-400 dark:text-gray-500">
                {total} {total === 1 ? 'experiencia' : 'experiencias'} en tu plan. {QUIEN}
              </p>
            </div>

            {/* ── Columna lateral ──────────────────────────────────── */}
            <aside className="flex flex-col gap-4">

              {/* ¿Sabías que? */}
              <div className="rounded-2xl border border-[#FBD5E4] bg-[#FFF5F8] dark:bg-white/5 dark:border-white/10 p-5">
                <h3 className="flex items-center gap-2 text-sm font-black text-[#C2185B] dark:text-pink-300">
                  <Heart className="w-4 h-4 fill-current" />
                  ¿Sabías que?
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-gray-300">
                  Una hora de calidad en familia puede mejorar la comunicación, la confianza y la
                  felicidad de todos los miembros.
                </p>
              </div>

              {/* Recordatorio del día */}
              <div className="rounded-2xl border border-[#EDEFF5] dark:border-white/10 bg-white dark:bg-[#14142e] p-5">
                <h3 className="flex items-center gap-2 text-sm font-black text-[#101433] dark:text-white">
                  <CalendarDays className="w-4 h-4 text-[#EC2C6B]" />
                  Recordatorio del día
                </h3>

                {deHoy.length > 0 ? (
                  <>
                    <p className="mt-2 text-xs text-slate-600 dark:text-gray-300">
                      Hoy tienes una hora de oro programada para tu familia.
                    </p>
                    <p className="mt-2 text-xs italic text-[#C2185B] dark:text-pink-300">
                      “Lo más importante no es cuánto tiempo pasamos juntos, sino cómo lo pasamos.”
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (pendienteHoy) marcar(pendienteHoy, true);
                        else if (realizadoHoy) marcar(realizadoHoy, false);
                      }}
                      className="mt-3 w-full rounded-xl bg-gradient-to-r from-[#F0447F] to-[#E11D48] text-white text-xs font-bold py-2.5 flex items-center justify-center gap-1.5 hover:brightness-110 active:scale-[0.99] transition"
                    >
                      {pendienteHoy
                        ? <>Disfruta este momento <Heart className="w-3.5 h-3.5 fill-current" /></>
                        : <>Realizada ✓ — toca para deshacer</>}
                    </button>
                    <p className="mt-2 text-[10px] text-center text-slate-400">
                      Hoy: {deHoy.map(e => e.actividad).join(' · ')}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-xs text-slate-600 dark:text-gray-300">
                      Hoy todavía no tienes una hora de oro programada para tu familia.
                    </p>
                    <p className="mt-2 text-xs italic text-[#C2185B] dark:text-pink-300">
                      “Lo más importante no es cuánto tiempo pasamos juntos, sino cómo lo pasamos.”
                    </p>
                    <button
                      type="button"
                      onClick={() => seleccionar(diaDeHoy?.dia || 'Lunes', diaDeHoy?.siguiente_posicion || 0)}
                      className="mt-3 w-full rounded-xl border border-[#EC2C6B]/30 text-[#C2185B] dark:text-pink-300 text-xs font-bold py-2.5 hover:bg-[#FFF5F8] dark:hover:bg-white/5 transition-colors"
                    >
                      Disfruta ese momento
                    </button>
                  </>
                )}
              </div>

              {/* Tus estadísticas */}
              <div className="rounded-2xl border border-[#EDEFF5] dark:border-white/10 bg-white dark:bg-[#14142e] p-5">
                <h3 className="flex items-center gap-2 text-sm font-black text-[#101433] dark:text-white">
                  <BarChart3 className="w-4 h-4 text-[#6236FF]" />
                  Tus estadísticas
                </h3>
                <div className="mt-1 divide-y divide-slate-50 dark:divide-white/5">
                  <Estadistica
                    Icono={Clock}
                    etiqueta="Horas de calidad este mes"
                    valor={minutosLegibles(estadisticas?.horas.minutos || 0)}
                    delta={estadisticas?.horas.delta ?? null}
                  />
                  <Estadistica
                    Icono={BookOpen}
                    etiqueta="Experiencias realizadas"
                    valor={String(estadisticas?.experiencias.total || 0)}
                    delta={estadisticas?.experiencias.delta ?? null}
                  />
                  <Estadistica
                    Icono={Target}
                    etiqueta="Días con hora de oro"
                    valor={`${estadisticas?.dias.porcentaje || 0}%`}
                    delta={estadisticas?.dias.delta ?? null}
                  />
                </div>
                <p className="mt-2 text-[10px] text-slate-400">
                  {MESES_LARGOS[(estadisticas?.mes || 1) - 1]} {estadisticas?.anio || ''} · cada
                  experiencia cuenta como una hora de calidad; los días son los de esta semana.
                </p>
              </div>

              {/* Inspírate cada día */}
              <div className="rounded-2xl border border-[#DDD6FE] bg-[#F7F5FF] dark:bg-white/5 dark:border-white/10 p-5">
                <h3 className="flex items-center gap-2 text-sm font-black text-[#101433] dark:text-white">
                  <Bell className="w-4 h-4 text-[#6236FF]" />
                  Inspírate cada día
                </h3>
                <p className="mt-2 text-xs text-slate-600 dark:text-gray-300">
                  Recibe ideas y recordatorios para fortalecer tus vínculos familiares.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAjustes(true)}
                  className="mt-3 w-full rounded-xl border border-[#6236FF]/40 bg-white dark:bg-transparent text-[#6236FF] text-xs font-bold py-2.5 hover:bg-white/70 transition-colors"
                >
                  Configurar recordatorios
                </button>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* «Ver mis experiencias realizadas» */}
      {showRealizadas && (
        <div className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowRealizadas(false)}>
          <div
            className="bg-white dark:bg-[#14142e] rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-100 dark:border-white/10 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-[#101433] dark:text-white">Mis experiencias realizadas</h2>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                  {realizadas?.total || 0} {(realizadas?.total || 0) === 1 ? 'momento disfrutado' : 'momentos disfrutados'}
                </p>
              </div>
              <button
                onClick={() => setShowRealizadas(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {!realizadas ? (
                <div className="flex items-center justify-center py-12 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : realizadas.items.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-400">
                  Aún no has marcado ninguna Hora de Oro como realizada.<br />
                  Cuando disfruten un momento, tócalo en «Disfruta este momento».
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {realizadas.items.map(item => (
                    <li key={item.id} className="flex items-start gap-3 rounded-xl border border-[#EDEFF5] dark:border-white/10 px-3 py-2.5">
                      <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4" strokeWidth={3} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-[#101433] dark:text-gray-100">{item.actividad}</span>
                        <span className="block text-[11px] text-slate-400">
                          {item.categoria} · {fechaLarga(item.realizada_en)}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => marcar(item, false)}
                        className="text-[11px] font-bold text-slate-400 hover:text-rose-500 shrink-0"
                        title="Deshacer"
                      >
                        Deshacer
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* «Configurar recordatorios» */}
      {showAjustes && ajustes && (
        <div className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAjustes(false)}>
          <div
            className="bg-white dark:bg-[#14142e] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-100 dark:border-white/10 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-[#101433] dark:text-white">Configurar recordatorios</h2>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                  Un aviso amable el día que programaste tu Hora de Oro.
                </p>
              </div>
              <button
                onClick={() => setShowAjustes(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-semibold text-[#101433] dark:text-gray-100">Recordatorio diario</span>
                <button
                  type="button"
                  disabled={guardandoAjustes}
                  onClick={() => guardarAjustes({ recordatorio_activo: !ajustes.recordatorio_activo })}
                  className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                    ajustes.recordatorio_activo ? 'bg-[#6236FF]' : 'bg-slate-300 dark:bg-white/20'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                      ajustes.recordatorio_activo ? 'left-6' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              <label className="flex items-center justify-between gap-4">
                <span className="text-sm font-semibold text-[#101433] dark:text-gray-100">Hora del aviso</span>
                <select
                  value={ajustes.hora_recordatorio.slice(0, 2)}
                  disabled={guardandoAjustes || !ajustes.recordatorio_activo}
                  onChange={e => guardarAjustes({ hora_recordatorio: `${e.target.value}:00` })}
                  className="rounded-xl border border-[#DDE1EC] dark:border-white/15 px-3 py-2 text-sm font-semibold text-[#101433] dark:text-gray-100 bg-white dark:bg-white/5 disabled:opacity-50"
                >
                  {Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}`).map(h => (
                    <option key={h} value={h}>{h}:00</option>
                  ))}
                </select>
              </label>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                El aviso respeta tu ventana de intervención y tus canales habilitados en Configuración.
                Inspira, nunca presiona.
              </p>

              <button
                type="button"
                onClick={() => setShowAjustes(false)}
                className="w-full rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6236FF] text-white text-sm font-bold py-2.5 hover:brightness-110 transition"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {guardando && (
        <div className="fixed bottom-6 right-6 z-[95] rounded-xl bg-[#101433] text-white text-xs font-semibold px-4 py-2.5 flex items-center gap-2 shadow-xl">
          <Loader2 className="w-4 h-4 animate-spin" /> Registrando…
        </div>
      )}

      {aviso && (
        <div className="fixed bottom-6 right-6 z-[95] max-w-sm rounded-xl bg-emerald-600 text-white text-xs font-semibold px-4 py-2.5 flex items-center gap-2 shadow-xl">
          <Check className="w-4 h-4 shrink-0" strokeWidth={3} /> {aviso}
        </div>
      )}
    </ModuleShell>
  );
}
