import React, { useState, useEffect, useRef } from 'react';
import {
  Home, CircleDot, LayoutGrid, Calendar, CalendarDays, Kanban,
  CalendarRange, CalendarCheck, Target, Clock, Pill, Cake,
  UserCheck, MessageSquare, Heart, Smile, GraduationCap, MoreHorizontal,
  ChevronDown, ChevronLeft, BookOpen, Play, Check, Lock, BarChart3,
  ShieldCheck, Star, Gift, Home as HomeIcon, X,
} from 'lucide-react';
import { NAV_ICONS } from './navIcons';
import { ModuleHeader } from './ModuleHeader';
import {
  cursosService, motivationalService,
  CursosMesActualData,
} from '../services/api';

const NAV_ITEMS = [
  { icon: Home, label: 'Inicio', section: 'inicio' },
  { icon: CircleDot, label: 'Rueda', section: 'rueda' },
  { icon: Calendar, label: 'Anual', section: 'anual' },
  { icon: CalendarDays, label: 'Mensual', section: 'mensual' },
  { icon: LayoutGrid, label: 'Matriz', section: 'matriz' },
  { icon: Kanban, label: 'Kanban', section: 'kanban' },
  { icon: CalendarRange, label: 'Semanal', section: 'semanal' },
  { icon: CalendarCheck, label: 'Diaria', section: 'diaria' },
  { icon: NAV_ICONS.delegar, label: 'Delegar', section: 'delegar' },
  { icon: Target, label: 'Misión', section: 'mision' },
  { icon: Clock, label: 'Fechas', section: 'fechas' },
  { icon: Pill, label: 'Suplementos', section: 'suplementos' },
  { icon: Cake, label: 'Cumpleaños', section: 'cumple' },
  { icon: UserCheck, label: 'Tribu', section: 'tribu' },
  { icon: Heart, label: 'Gratitud', section: 'gratitud' },
  { icon: Smile, label: 'Focus', section: 'focus' },
  { icon: GraduationCap, label: 'Cursos', section: 'cursos' },
  { icon: MessageSquare, label: 'Coaching', section: 'coaching' },
];

const FALLBACK_OBJETIVOS = [
  { titulo: 'Reconocer tus principales distractores', descripcion: 'Identifica los hábitos y situaciones que dispersan tu atención cada día.', Icon: Target },
  { titulo: 'Proteger bloques de tiempo importantes', descripcion: 'Crea espacios sagrados para lo que realmente impulsa tus objetivos.', Icon: ShieldCheck },
  { titulo: 'Tomar decisiones coherentes con tus prioridades', descripcion: 'Alinea tus acciones diarias con lo que más importa en tu vida.', Icon: Check },
];

export default function CursosScreen({ onBack, userName, onNavigate }: { onBack: () => void; userName?: string; onNavigate?: (section: string) => void }) {
  const [data, setData] = useState<CursosMesActualData | null>(null);
  const [loading, setLoading] = useState(true);
  const [verTodos, setVerTodos] = useState(false);
  const [completando, setCompletando] = useState(false);
  const [mesVisto, setMesVisto] = useState<number | null>(null);
  const [cargandoMes, setCargandoMes] = useState(false);
  const [showFrases, setShowFrases] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [fraseHoy, setFraseHoy] = useState('');
  const playerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    cursosService.mesActual().then(setData).catch(() => {});
    motivationalService.getToday().then(d => setFraseHoy(d.phrase || '')).catch(() => {});
  }, []);
  useEffect(() => {
    if (!loading) return;
    if (data) setLoading(false);
  }, [data, loading]);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 8000);
    return () => clearTimeout(t);
  }, []);

  const cap = data?.capacitacion;
  const completado = !!data?.completado;
  const meses = data?.meses || [];
  // El backend resuelve URL externa o archivo subido (el archivo es el
  // respaldo cuando no hay URL). Los campos viejos quedan como respaldo.
  const videoSrc = cap?.video_resuelto || cap?.video_url || '';
  const portadaSrc = cap?.media_resuelto || cap?.media_url || '';
  const anteriores = meses.filter(m => m.month_number < (data?.mes_actual || 13));
  const visibles = verTodos ? meses : anteriores.slice(-3);

  const comenzar = () => {
    playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    videoRef.current?.play().catch(() => {});
  };

  const marcarCompletada = async () => {
    if (!cap || completando || completado) return;
    setCompletando(true);
    try {
      await cursosService.completar(cap.id);
      if (mesVisto !== null) await verMes(mesVisto);
      else {
        const fresh = await cursosService.mesActual();
        setData(fresh);
      }
    } catch {}
    setCompletando(false);
  };

  const verMes = async (n: number) => {
    if (!data || cargandoMes) return;
    if (n === data.mes_actual) {
      const fresh = await cursosService.mesActual().catch(() => null);
      if (fresh) setData(fresh);
      setMesVisto(null);
      return;
    }
    setCargandoMes(true);
    try {
      const res = await cursosService.mes(n);
      setData(prev => prev ? { ...prev, capacitacion: res.capacitacion, completado: res.completado } : prev);
      setMesVisto(n);
    } catch {}
    setCargandoMes(false);
  };

  const objetivos = cap && cap.objetivos.length > 0
    ? cap.objetivos.map((o, i) => ({ ...o, Icon: FALLBACK_OBJETIVOS[i % 3].Icon }))
    : FALLBACK_OBJETIVOS;

  return (
    <div className="flex h-full overflow-hidden text-slate-800 dark:text-gray-100 bg-[#F8F9FB] dark:bg-[#0A0A26]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0A0A26] h-full hidden md:flex flex-col z-20 shrink-0">
        <div className="h-16 flex items-center px-6 pt-4 pb-2">
          <div className="flex items-center gap-3 text-white">
           
              <img src="./focussia.png" alt="Focusia" className="w-4 h-4 text-white" />
            
            <span className="text-xl font-bold tracking-wide">Focusia</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
          {NAV_ITEMS.map((item, i) => (
            <button
              key={i}
              onClick={() => { if (item.section !== 'cursos') { if (onNavigate) onNavigate(item.section); else onBack(); } }}
              className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors w-full text-left ${
                item.section === 'cursos'
                  ? 'text-white bg-gradient-to-r from-[#6236FF] to-[#8A2BE2] shadow-md'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className="w-5 h-5 text-center shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          ))}
          <button className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors w-full text-left text-white/60 hover:text-white hover:bg-white/5">
            <MoreHorizontal className="w-5 h-5 text-center shrink-0" />
            <span className="truncate">Más</span>
          </button>
        </nav>
        <div className="p-4">
          <button onClick={onBack} className="flex items-center w-full p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-sm font-bold">
              {userName?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="ml-3 text-left flex-1">
              <p className="text-sm font-semibold text-white">{userName || 'Usuario'}</p>
              <p className="text-xs text-white/50">Ver perfil</p>
            </div>
            <ChevronDown className="w-4 h-4 text-white/50" />
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#F8F9FB] dark:bg-[#0A0A26] md:rounded-tl-[2rem] md:border-l border-gray-200 dark:border-white/10">
        <ModuleHeader
          icon={GraduationCap}
          title="Cursos"
          subtitle="Tu ruta de aprendizaje progresa contigo."
          onBack={onBack}
          userName={userName}
          progress={data ? { label: `Mes ${data.mes_actual} de 12`, pct: data.progreso_pct } : null}
          onHelp={() => setShowHelp(true)}
        />

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-[1200px]  flex flex-col xl:flex-row gap-2">
            <div className="flex-1 flex flex-col gap-5 min-w-0">
              {/* Hero */}
              <section className="bg-purple-50/60 dark:bg-white/5 rounded-xl p-4 md:p-2 overflow-hidden ">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                  <div className="flex flex-col justify-center px-2 py-2 h-[310px]  w-[300px] ">
                    {mesVisto !== null && (
                      <button onClick={() => verMes(data?.mes_actual || mesVisto)}
                        className="self-start mb-2 text-[11px] font-bold text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-white/15 rounded-lg px-2.5 py-1 hover:bg-indigo-50 dark:hover:bg-white/5">
                        ← Viendo Mes {mesVisto} · Volver al mes actual
                      </button>
                    )}
                    <p className="text-[11px] font-bold tracking-widest text-indigo-600 dark:text-indigo-300">TEMA DEL MES</p>
                    <h2 className="text-xl md:text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                      {cap?.month_theme || 'Gestión del Tiempo'}
                    </h2>
                    <p className="text-[11px] font-bold tracking-widest text-indigo-600 dark:text-indigo-300 mt-5">CAPACITACIÓN DEL MES</p>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                      {cap?.title || 'Protege tu tiempo y dirige tu atención'}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mt-2">
                      {cap?.content || 'Aprende a identificar qué merece realmente tu energía y cómo organizar tus decisiones alrededor de tus prioridades.'}
                    </p>
                    <div className="flex items-center gap-5 mt-4 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" /> Duración: {cap?.duracion_minutos ?? 5} minutos
                      </span>
                      <span className="flex items-center gap-1.5">
                        <BarChart3 className="w-4 h-4" /> Microcapacitación
                      </span>
                    </div>
                    <button
                      onClick={comenzar}
                      className="mt-4 w-fit px-6 py-3 rounded-md text-white font-semibold text-sm shadow-lg transition-all hover:shadow-xl flex items-center gap-2"
                      style={{ background: 'linear-gradient(135deg, #5b21b6, #8b5cf6)' }}
                    >
                      <Play className="w-4 h-4 fill-white" /> Comenzar capacitación
                    </button>
                  </div>
                  <div className="relative rounded-xl overflow-hidden min-h-[150px] md:min-h-[190px] w-[200px]bg-gradient-to-br from-indigo-200 via-purple-100 to-blue-100 dark:from-indigo-900 dark:via-purple-900 dark:to-blue-900">
                   <img src="./cursos.png" alt="cursos" />
                  </div>
                </div>
              </section>

              {/* Qué aprenderás */}
              <section className="bg-white dark:bg-[#14142e] rounded-2xl p-5 border border-gray-100 dark:border-white/10 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">¿Qué aprenderás este mes?</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {objetivos.map((o, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="w-10 h-10 rounded-full bg-purple-100 dark:bg-white/10 text-[#6236FF] dark:text-purple-300 flex items-center justify-center shrink-0">
                        <o.Icon className="w-5 h-5" />
                      </span>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-gray-100">{o.titulo}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug mt-1">{o.descripcion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Player + anteriores */}
              <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-3 bg-white dark:bg-[#14142e] rounded-2xl p-5 border border-gray-100 dark:border-white/10 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Microcapacitación del mes</h3>
                  <div ref={playerRef} className="relative rounded-xl overflow-hidden bg-slate-900 aspect-video scroll-mt-4">
                    {videoSrc ? (
                      <video ref={videoRef} src={videoSrc} controls preload="metadata" className="absolute inset-0 w-full h-full" />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-800 to-slate-900">
                        {portadaSrc && <img src={portadaSrc} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />}
                        <span className="relative w-16 h-16 rounded-full bg-[#8b5cf6] flex items-center justify-center shadow-xl">
                          <Play className="w-7 h-7 text-white fill-white ml-1" />
                        </span>
                        <p className="relative text-[11px] text-white/60">Video próximamente</p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={marcarCompletada}
                    disabled={completado}
                    className="mt-3 w-full py-2.5 rounded-xl border border-green-500 text-green-600 dark:text-green-400 font-semibold text-sm hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    {completado ? 'Capacitación completada' : 'Marcar como completada'}
                  </button>
                </div>
                <div className="lg:col-span-2 bg-white dark:bg-[#14142e] rounded-2xl p-5 border border-gray-100 dark:border-white/10 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Cursos anteriores</h3>
                    <button onClick={() => setVerTodos(v => !v)} className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-white/15 rounded-lg px-2.5 py-1 hover:bg-indigo-50 dark:hover:bg-white/5">
                      {verTodos ? 'Ver menos' : 'Ver todos'}
                    </button>
                  </div>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {(verTodos ? meses : anteriores.slice(-3)).map(m => {
                      const done = meses.find(x => x.month_number === m.month_number)?.estado === 'completada';
                      const bloqueada = m.estado === 'bloqueada';
                      const viendo = (mesVisto ?? data?.mes_actual) === m.month_number;
                      return (
                        <div key={m.month_number}
                          onClick={() => { if (!bloqueada && !cargandoMes) verMes(m.month_number); }}
                          title={bloqueada ? 'Mes bloqueado' : 'Ver capacitación de este mes'}
                          className={`flex items-center gap-3 p-2 rounded-xl ${bloqueada ? '' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5'} ${viendo ? 'bg-indigo-50 dark:bg-white/10 ring-1 ring-indigo-200 dark:ring-white/20' : ''}`}>
                          <span className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-white/10 dark:to-white/5 flex items-center justify-center text-indigo-500 dark:text-indigo-300 shrink-0">
                            <BookOpen className="w-5 h-5" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-gray-100">Mes {m.month_number}</p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{m.theme}</p>
                          </div>
                          {done && <Check className="w-4 h-4 text-green-500 shrink-0" />}
                        </div>
                      );
                    })}
                    {meses.length === 0 && <p className="text-xs text-gray-400">Sin cursos registrados.</p>}
                  </div>
                </div>
              </section>

              {/* Frases strip */}
              <section className="bg-purple-50 dark:bg-[#1a1440] rounded-2xl p-4 border border-purple-100 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-[#6236FF] text-white flex items-center justify-center shrink-0">
                  <Star className="w-5 h-5" />
                </span>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-gray-100">Frases Motivacionales diarias</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Cada día recibirás frases que reforzarán los aprendizajes de este mes y te mantendrán enfocado en tu camino.</p>
                </div>
                <button onClick={() => setShowFrases(true)} className="px-4 py-2 rounded-lg border border-indigo-300 dark:border-white/20 text-indigo-600 dark:text-indigo-300 text-xs font-semibold hover:bg-white dark:hover:bg-white/5 whitespace-nowrap">
                  Ir a Frases Motivacionales ›
                </button>
              </section>
            </div>

            {/* Riel derecho */}
            <aside className="w-full xl:w-[300px] shrink-0 flex flex-col gap-4">
              <div className="bg-white dark:bg-[#14142e] rounded-2xl p-5 border border-gray-100 dark:border-white/10 shadow-sm">
                <p className="text-sm font-bold text-slate-900 dark:text-white">Tu ruta de aprendizaje</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">12 meses para tu mejor versión</p>
                <div className="mt-3 space-y-1 max-h-96 overflow-y-auto">
                  {meses.map(m => (
                    <div key={m.month_number}
                      onClick={() => { if (m.estado !== 'bloqueada' && !cargandoMes) verMes(m.month_number); }}
                      title={m.estado === 'bloqueada' ? 'Mes bloqueado' : 'Ver capacitación de este mes'}
                      className={`flex items-center gap-3 px-2 py-1.5 rounded-lg ${m.estado === 'actual' ? 'bg-purple-50 dark:bg-white/10' : ''} ${m.estado !== 'bloqueada' ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5' : ''} ${(mesVisto ?? data?.mes_actual) === m.month_number ? 'ring-1 ring-indigo-300 dark:ring-white/25 bg-indigo-50/60 dark:bg-white/10' : ''}`}>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        m.estado === 'completada' ? 'bg-green-500 text-white'
                        : m.estado === 'actual' ? 'bg-[#6236FF] text-white'
                        : 'bg-gray-100 dark:bg-white/10 text-gray-400'
                      }`}>
                        {m.estado === 'completada' ? <Check className="w-3.5 h-3.5" />
                        : m.estado === 'bloqueada' ? <Lock className="w-3 h-3" />
                        : m.month_number}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-slate-700 dark:text-gray-200">Mes {m.month_number}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{m.theme}</p>
                      </div>
                      {m.estado === 'actual' && (
                        <span className="text-[9px] font-bold bg-[#6236FF] text-white px-2 py-0.5 rounded-full">Actual</span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 bg-purple-50 dark:bg-white/5 rounded-xl p-3 flex items-center gap-2">
                  <Gift className="w-5 h-5 text-[#6236FF] dark:text-purple-300 shrink-0" />
                  <p className="text-[11px] font-semibold text-slate-700 dark:text-gray-200">Cada mes desbloquea una mejor versión de ti.</p>
                </div>
              </div>

              {completado ? (
                <div className="bg-green-50 dark:bg-green-500/10 rounded-2xl p-5 border border-green-100 dark:border-green-500/20">
                  <p className="text-sm font-bold text-green-700 dark:text-green-300 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                      <Check className="w-4 h-4" />
                    </span>
                    ¡Capacitación completada!
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-2">Has completado la capacitación de este mes.</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Las Frases Motivacionales continuarán reforzando estos aprendizajes durante el resto del mes.</p>
                  <button onClick={onBack} className="mt-4 w-full py-2.5 rounded-xl border border-green-500 text-green-700 dark:text-green-300 text-sm font-semibold hover:bg-green-100 dark:hover:bg-green-500/10 flex items-center justify-center gap-2">
                    <HomeIcon className="w-4 h-4" /> Volver al Dashboard
                  </button>
                </div>
              ) : (
                <div className="bg-white dark:bg-[#14142e] rounded-2xl p-5 border border-gray-100 dark:border-white/10 shadow-sm">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Completa la microcapacitación para desbloquear tu constancia de este mes.</p>
                  <button onClick={onBack} className="mt-3 w-full py-2.5 rounded-xl border border-indigo-300 dark:border-white/20 text-indigo-600 dark:text-indigo-300 text-sm font-semibold hover:bg-indigo-50 dark:hover:bg-white/5 flex items-center justify-center gap-2">
                    <HomeIcon className="w-4 h-4" /> Volver al Dashboard
                  </button>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>

      {/* Modal frases */}
      {showFrases && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowFrases(false)}>
          <div className="bg-white dark:bg-[#14142e] rounded-2xl shadow-2xl max-w-md w-full p-8 text-center" onClick={e => e.stopPropagation()}>
            <Star className="w-10 h-10 text-[#6236FF] dark:text-purple-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-900 dark:text-white">Frase de hoy</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 italic mt-3 leading-relaxed">“{fraseHoy || 'Cada día cuenta: un paso consciente te acerca a tu mejor versión.'}”</p>
            <button onClick={() => setShowFrases(false)} className="mt-5 px-6 py-2 rounded-xl bg-gradient-to-r from-[#6236FF] to-[#8A2BE2] text-white text-sm font-semibold">
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modal ayuda */}
      {showHelp && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowHelp(false)}>
          <div className="bg-white dark:bg-[#14142e] rounded-2xl shadow-2xl max-w-md w-full p-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 dark:text-white">¿Cómo funcionan los Cursos?</h3>
              <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2 leading-relaxed">
              <li>• Cada mes se desbloquea una microcapacitación de ~5 minutos.</li>
              <li>• Mírala, marca como completada y avanza en tu ruta de 12 meses.</li>
              <li>• Las frases diarias refuerzan lo aprendido durante el mes.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
