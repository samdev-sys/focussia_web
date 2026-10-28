import React from 'react';
import {
  User, ArrowRight, CirclePlay as PlayCircle, Zap, Flag, Server, Rocket,
  MessagesSquare, PieChart, Repeat, CalendarDays, Timer, Send,
  CheckCircle2, Trash2, Filter, TrendingDown, ShieldCheck, Lock,
  GitBranch, Heart, X, Check, BadgeCheck,
} from 'lucide-react';

const DISPLAY = { fontFamily: "'Hanken Grotesk', sans-serif" };
const GEIST = { fontFamily: "Geist, 'Inter', sans-serif" };

function Pill({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider ${dark ? 'text-[#0024e0]' : ''}`}>
      {children}
    </span>
  );
}

export default function LandingPage({ onEntrar, onCrearCuenta }: {
  onEntrar: () => void;
  onCrearCuenta: () => void;
}) {
  const scrollDemo = () => {
    document.getElementById('demo-showcase')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#f9f9fe] text-[#1a1c1f] antialiased" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 w-full z-50 bg-[#f9f9fe]/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 w-full max-w-[1240px] mx-auto px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="#" onClick={e => e.preventDefault()} className="flex items-center gap-2">
              <span className="w-7 h-7 bg-[#0024e0] flex items-center justify-center rounded text-white text-xs font-black">F</span>
              <span className="text-xl font-bold tracking-tight" style={DISPLAY}>FOCUSSIA</span>
              <span className="hidden lg:inline-block text-[9px] font-black uppercase tracking-widest text-[#444657] bg-[#e7e8ed] px-1 py-0.5 rounded">ENGINE 2.0</span>
            </a>
            <nav className="hidden xl:flex items-center gap-1 text-sm">
              {[
                ['Filosofía Eisenhower', 'demo-showcase'],
                ['Time-Blocking', 'demo-showcase'],
                ['Workspaces', 'pilares'],
                ['Precios', 'cta-final'],
              ].map(([label, id]) => (
                <button key={label} onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-3 py-2 text-[#444657] hover:text-[#1a1c1f] hover:bg-[#f3f3f8] transition-colors rounded-lg text-sm font-medium">
                  {label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onEntrar} className="hidden sm:inline-flex px-3 py-2 text-[11px] font-black uppercase tracking-wider text-[#444657] hover:text-[#1a1c1f] transition-colors rounded-lg">
              Iniciar Sesión
            </button>
            <button onClick={onCrearCuenta} className="inline-flex items-center px-4 py-2 text-[11px] font-black uppercase tracking-wider bg-[#0024e0] text-white hover:bg-[#2b44ff] rounded transition-colors shadow-[0_1px_4px_rgba(0,36,224,0.15)]">
              Registrarse Gratis
            </button>
            <span className="w-8 h-8 rounded-full bg-[#0024e0] flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-white" />
            </span>
          </div>
        </div>
      </header>

      <main className="w-full pt-16 min-h-[calc(100vh-140px)]">
        {/* HERO */}
        <div className="relative w-full overflow-hidden py-8">
          <div className="pointer-events-none absolute -top-40 right-1/4 w-[540px] h-[540px] rounded-full bg-[#bcc2ff]/30 blur-3xl" />
          <div className="pointer-events-none absolute top-1/2 left-0 w-[420px] h-[420px] rounded-full bg-[#e2e2e7]/60 blur-3xl" />
          <div className="w-full max-w-[1240px] mx-auto px-4 md:px-6">
            <div className="flex flex-col gap-4 max-w-4xl pt-2 md:pt-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e7e8ed] w-fit shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#0024e0] animate-pulse" />
                <span className="text-[12px] font-black uppercase tracking-wider text-[#0024e0]" style={GEIST}>Sistema de decisión ejecutiva 3.0</span>
                <span className="text-gray-400 text-xs">/</span>
                <span className="text-[9px] font-black uppercase text-[#444657] tracking-widest" style={GEIST}>Arquitectura suiza</span>
              </div>
              <h1 className="text-[32px] leading-[40px] md:text-[54px] md:leading-[60px] tracking-tight font-bold" style={DISPLAY}>
                Menos ruido reactivo.<br className="hidden sm:inline" />
                <span className="text-[#0024e0] tracking-tight">Decisiones implacables.</span>
              </h1>
              <p className="text-[#444657] max-w-2xl text-base md:text-lg leading-relaxed">
                Focussia traslada tus prioridades estratégicas de la Matriz de Eisenhower directamente a bloques horarios ininterrumpidos. Diseñado para directivos, fundadores y mentes de alta responsabilidad.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button onClick={onCrearCuenta} className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#0024e0] text-white text-[11px] font-black uppercase tracking-wider shadow-md hover:bg-[#2b44ff] transition-all active:translate-y-0.5" style={GEIST}>
                  <span>Comenzar Gratis (14 días)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={scrollDemo} className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#ededf3] text-[11px] font-black uppercase tracking-wider shadow-sm hover:bg-[#e7e8ed] transition-colors" style={GEIST}>
                  <PlayCircle className="w-4 h-4 text-[#0024e0]" />
                  <span>Ver Demostración Ejecutiva</span>
                </button>
              </div>
              <div className="pt-4 flex flex-col sm:flex-row sm:items-center gap-3 text-[#444657]">
                <div className="flex -space-x-2">
                  <span className="w-7 h-7 rounded-full bg-[#0024e0] text-white text-[9px] font-black flex items-center justify-center ring-2 ring-[#f9f9fe] shadow-sm">VP</span>
                  <span className="w-7 h-7 rounded-full bg-[#fe932c] text-[#663500] text-[9px] font-black flex items-center justify-center ring-2 ring-[#f9f9fe] shadow-sm">CTO</span>
                  <span className="w-7 h-7 rounded-full bg-[#2e3034] text-[#f0f0f5] text-[9px] font-black flex items-center justify-center ring-2 ring-[#f9f9fe] shadow-sm">CEO</span>
                  <span className="w-7 h-7 rounded-full bg-[#e2e2e7] text-[9px] font-black flex items-center justify-center ring-2 ring-[#f9f9fe] shadow-sm">+12k</span>
                </div>
                <span className="text-xs md:text-sm font-medium">
                  Confiado por más de <span className="text-[#1a1c1f] font-semibold">12,000 ejecutivos</span> y directores de operaciones en scale-ups globales.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SHOWCASE MATRIZ */}
        <section className="w-full bg-white py-8 shadow-sm" id="demo-showcase">
          <div className="w-full max-w-[1240px] mx-auto px-4 md:px-6 flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 pb-1">
              <div>
                <span className="text-[12px] font-black uppercase text-[#0024e0]" style={GEIST}>Motor matricial bidireccional</span>
                <h2 className="text-2xl mt-1" style={DISPLAY}>De la Matriz al Calendario en &lt;1.2 Segundos</h2>
              </div>
              <div className="flex items-center gap-2 bg-[#ededf3] px-3 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-[#2b44ff] animate-ping" />
                <span className="text-[11px] font-black uppercase" style={GEIST}>Sincronización Cronos: Activa</span>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Q1 */}
                  <div className="bg-[#f3f3f8] rounded-xl p-5 flex flex-col gap-3 shadow-sm hover:-translate-y-0.5 transition-transform">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase text-[#ba1a1a] tracking-wider" style={GEIST}>Q1 · Hacer ahora</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a]" />
                    </div>
                    <h3 className="text-[12px] font-black uppercase" style={GEIST}>Urgente &amp; Importante</h3>
                    <div className="flex flex-col gap-1.5">
                      {[
                        ['Aprobación Serie A Term-Sheet', 'T-2h', Flag],
                        ['Incidente Infraestructura AWS', 'P0', Server],
                      ].map(([t, tag, Icon]: any) => (
                        <div key={t} className="p-2 bg-white rounded-lg flex items-center justify-between shadow-xs">
                          <div className="flex items-center gap-1.5">
                            <Icon className="w-4 h-4 text-[#ba1a1a]" />
                            <span className="text-xs font-semibold truncate">{t}</span>
                          </div>
                          <span className="text-[9px] font-black bg-[#ffdad6] text-[#93000a] px-1.5 py-0.5 rounded">{tag}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-[#444657] font-medium pt-1 flex items-center gap-1">
                      <Timer className="w-3 h-3 text-[#757688]" /> Resolución táctica inmediata
                    </p>
                  </div>
                  {/* Q2 */}
                  <div className="bg-[#0024e0] text-white rounded-xl p-5 flex flex-col gap-3 shadow-lg sm:scale-[1.02] relative overflow-hidden">
                    <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-[#2b44ff] rounded-full blur-2xl opacity-60" />
                    <div className="flex items-center justify-between relative z-10">
                      <span className="text-[11px] font-black uppercase text-[#dfe0ff] tracking-wider" style={GEIST}>Q2 · Zona de alto impacto</span>
                      <span className="inline-flex items-center gap-1 bg-white text-[#0024e0] text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                        <Zap className="w-3 h-3" /> AUTO-BLOCK
                      </span>
                    </div>
                    <h3 className="text-[12px] font-black uppercase text-white relative z-10" style={GEIST}>Estratégico &amp; No Reactivo</h3>
                    <div className="flex flex-col gap-1.5 relative z-10">
                      {[
                        ['Plan Expansión Q3 LATAM', '90 min', Rocket],
                        ['1-on-1 Estratégico VP Producto', '45 min', MessagesSquare],
                        ['Rueda de Vida & Carga Cognitiva', 'Salud 9.2', PieChart],
                      ].map(([t, tag, Icon]: any) => (
                        <div key={t} className="p-2 bg-white text-[#1a1c1f] rounded-lg flex items-center justify-between shadow-xs">
                          <div className="flex items-center gap-1.5">
                            <Icon className="w-4 h-4 text-[#0024e0]" />
                            <span className="text-xs font-semibold truncate">{t}</span>
                          </div>
                          <span className="text-[9px] font-black bg-[#dfe0ff] text-[#000a63] px-1.5 py-0.5 rounded">{tag}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-[#dfe0ff] font-medium relative z-10 flex items-center gap-1">
                      <Repeat className="w-3 h-3" /> Inyectado al calendario sin solapamientos
                    </p>
                  </div>
                  {/* Q3 */}
                  <div className="bg-[#f3f3f8] rounded-xl p-5 flex flex-col gap-3 shadow-sm hover:-translate-y-0.5 transition-transform">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase text-[#904d00] tracking-wider" style={GEIST}>Q3 · Delegar</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-[#fe932c]" />
                    </div>
                    <h3 className="text-[12px] font-black uppercase" style={GEIST}>Urgente &amp; No Vital</h3>
                    <div className="flex flex-col gap-1.5">
                      {[
                        ['Reporte Consolidado Semanal', 'Op', 'Delegar a: Carlos M. (VP Ops)'],
                        ['Respuesta a Prensa / Podcast', 'Comms', 'Delegar a: PR Agency Hub'],
                      ].map(([t, tag, btn]) => (
                        <div key={t as string} className="p-2 bg-white rounded-lg flex flex-col gap-1.5 shadow-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold">{t}</span>
                            <span className="text-[9px] font-black text-[#444657] bg-[#ededf3] px-1.5 py-0.5 rounded">{tag}</span>
                          </div>
                          <button onClick={onCrearCuenta} className="w-full text-left text-[9px] font-black text-[#0024e0] bg-[#dfe0ff]/40 px-1.5 py-1 rounded flex items-center justify-between hover:bg-[#dfe0ff] transition-colors">
                            <span>{btn}</span>
                            <Send className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-[#444657] font-medium pt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-[#904d00]" /> Fricción cero: asignación por token
                    </p>
                  </div>
                  {/* Q4 */}
                  <div className="bg-[#f3f3f8]/70 rounded-xl p-5 flex flex-col gap-3 opacity-85 shadow-sm hover:-translate-y-0.5 transition-transform">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase text-[#757688] tracking-wider" style={GEIST}>Q4 · Eliminar / Archivar</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-[#757688]" />
                    </div>
                    <h3 className="text-[12px] font-black uppercase text-[#444657]" style={GEIST}>Ruido Parasitario</h3>
                    <div className="flex flex-col gap-1.5">
                      {['Reunión de estatus sin agenda (30m)', 'Auditoría suscripciones inactivas', 'Newsletter catch-up no esencial'].map(t => (
                        <div key={t} className="p-2 bg-[#ededf3] rounded-lg flex items-center justify-between opacity-70">
                          <span className="text-xs line-through text-[#444657]">{t}</span>
                          <Trash2 className="w-3 h-3 text-[#ba1a1a]" />
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-[#ba1a1a] font-medium pt-1">Filtrado automático por regla de agenda</p>
                  </div>
                </div>
              </div>
              {/* Timeline */}
              <div className="lg:col-span-5 bg-[#f3f3f8] rounded-xl p-5 flex flex-col gap-3 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-[#0024e0]" />
                    <span className="text-[12px] font-black uppercase" style={GEIST}>Bloque Cronos de protección</span>
                  </div>
                  <span className="text-[11px] font-black text-[#0024e0] bg-[#dfe0ff] px-1.5 py-0.5 rounded" style={GEIST}>Hoy · 08:00 - 18:00</span>
                </div>
                <p className="text-xs text-[#444657]">Las tareas del cuadrante Q2 blindan tu agenda automáticamente en slots de alta concentración energética.</p>
                <div className="flex flex-col gap-1.5 pt-1">
                  {[
                    ['08:30', 'Deep Focus: Plan Expansión Q3', 'CUADRANTE Q2 · INMUNIDAD TOTAL', true, false],
                    ['10:00', 'Sincronización Asíncrona (Slacks/Tokens)', 'DELEGACIÓN EN CURSO', false, true],
                    ['11:00', '1-on-1 VP Producto (Alineación Q3)', 'CUADRANTE Q2 · ESTRATÉGICO', true, false],
                    ['14:00', 'Cierre de Ronda Serie A (Q1)', 'BLOQUE CRÍTICO TÁCTICO', true, false, true],
                    ['16:30', 'Rueda de la Vida: Recuperación & Decompress', 'ENERGÍA MENTAL · BIENESTAR', true, false],
                  ].map(([h, t, tag, strong, muted, critical]: any) => (
                    <div key={t} className={`flex items-center gap-3 p-2 rounded-lg ${muted ? 'bg-[#e7e8ed]/60 opacity-60' : critical ? 'bg-[#ffdad6]/40' : 'bg-white shadow-xs'}`}>
                      <span className={`text-[9px] font-black w-12 ${critical ? 'text-[#ba1a1a]' : 'text-[#757688]'}`}>{h}</span>
                      <div className={`h-6 w-1 rounded-full ${critical ? 'bg-[#ba1a1a]' : strong && !muted ? 'bg-[#0024e0]' : 'bg-[#d9dadf]'}`} />
                      <div className="flex flex-col min-w-0">
                        <span className={`text-xs truncate ${strong && !muted ? 'font-semibold' : ''}`}>{t}</span>
                        <span className={`text-[10px] ${critical ? 'text-[#ba1a1a]' : strong && !muted ? 'text-[#0024e0]' : 'text-[#444657]'}`}>{tag}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-2 bg-[#ededf3] rounded-lg flex items-center justify-between mt-1">
                  <span className="text-[9px] font-black uppercase text-[#444657]" style={GEIST}>Protección de Agenda:</span>
                  <span className="text-[11px] font-black text-[#0024e0]" style={GEIST}>87.4% Tiempo Estratégico</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PILARES */}
        <section className="w-full py-8" id="pilares">
          <div className="w-full max-w-[1240px] mx-auto px-4 md:px-6 flex flex-col gap-6">
            <div className="max-w-2xl">
              <span className="text-[12px] font-black uppercase text-[#0024e0]" style={GEIST}>Arquitectura de rendimiento</span>
              <h2 className="text-2xl mt-1" style={DISPLAY}>Cuatro pilares para líderes que no pueden permitirse fatiga por decisión.</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { mod: 'Módulo A', t: 'Filtrado Cognitivo Eisenhower', d: 'Convierte el caos de 50 emails diarios en 3 decisiones no negociables mediante algoritmos de impacto ponderado.', foot: 'Reducción de ruido: 72%', Icon: Filter, accent: false },
                { mod: 'Módulo B', t: 'Time-Blocking Automático', d: 'Tu calendario se defiende solo contra reuniones parasitarias. Bloques de trabajo profundo con protección de agenda en tiempo real.', foot: 'Inmunidad de agenda: Activa', Icon: ShieldCheck, accent: true },
                { mod: 'Módulo C', t: 'Delegación con Trazabilidad', d: 'Asigna tareas con un clic a tu workspace o equipo directivo con seguimiento por token sin fricción ni microgestión.', foot: 'Latencia de delegación: <5s', Icon: GitBranch, accent: false },
                { mod: 'Módulo D', t: 'Balance de Alto Rendimiento', d: 'Integra la Rueda de la Vida para asegurar que el avance ejecutivo no devore tu salud, vigor físico o energía mental.', foot: 'Equilibrio holístico: 8.9 / 10', Icon: Timer, accent: false },
              ].map(p => (
                <div key={p.t} className="bg-[#f3f3f8] rounded-xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${p.accent ? 'bg-[#0024e0] text-white' : 'bg-[#dfe0ff] text-[#0024e0]'}`}>
                      <p.Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#757688]" style={GEIST}>{p.mod}</span>
                    <h3 className="text-[12px] font-black uppercase" style={GEIST}>{p.t}</h3>
                    <p className="text-sm text-[#444657]">{p.d}</p>
                  </div>
                  <div className="pt-4 flex items-center gap-1 text-[#0024e0] text-[9px] font-black uppercase" style={GEIST}>
                    <span>{p.foot}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* COMPARATIVA */}
        <section className="w-full bg-white py-8 shadow-sm">
          <div className="w-full max-w-[1240px] mx-auto px-4 md:px-6 flex flex-col gap-6">
            <div className="flex flex-col gap-1 max-w-2xl">
              <span className="text-[12px] font-black uppercase text-[#ba1a1a]" style={GEIST}>El coste de la fricción cognitiva</span>
              <h2 className="text-2xl" style={DISPLAY}>Por qué las herramientas tradicionales destruyen el foco ejecutivo</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#f3f3f8] rounded-xl p-6 flex flex-col gap-4 shadow-sm">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-[12px] font-black uppercase text-[#757688]" style={GEIST}>El modelo tradicional</span>
                  <span className="text-[9px] font-black uppercase text-[#ba1a1a] bg-[#ffdad6] px-1.5 py-0.5 rounded">Ineficiente</span>
                </div>
                <h3 className="text-2xl" style={DISPLAY}>Gestores de Tareas Habituales</h3>
                <ul className="flex flex-col gap-3 text-sm text-[#444657]">
                  {[
                    ['Listas infinitas descontextualizadas:', 'Provocan ansiedad parálisis y sobrecarga cognitiva diaria.'],
                    ['Falsa sensación de progreso:', 'Completar 15 micro-tareas triviales mientras los proyectos estratégicos siguen parados.'],
                    ['Reactividad constante:', 'El correo ajeno y el chat dictan qué haces en cada instante.'],
                    ['Sin protección temporal:', 'Las tareas viven en una lista, no en el espacio real del calendario de 24 horas.'],
                  ].map(([b, r]) => (
                    <li key={b} className="flex items-start gap-2">
                      <X className="w-4 h-4 text-[#ba1a1a] shrink-0 mt-0.5" />
                      <span><strong>{b}</strong> {r}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto p-3 bg-[#ededf3] rounded-lg text-xs text-[#444657]">
                  Resultado promedio: <strong className="text-[#ba1a1a]">18.4 horas semanales</strong> perdidas en cambios de contexto.
                </div>
              </div>
              <div className="bg-[#ededf3] rounded-xl p-6 flex flex-col gap-4 shadow-md">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-[12px] font-black uppercase text-[#0024e0]" style={GEIST}>Sistema Focussia</span>
                  <span className="text-[9px] font-black uppercase text-white bg-[#0024e0] px-1.5 py-0.5 rounded">Ejecutivo</span>
                </div>
                <h3 className="text-2xl" style={DISPLAY}>Focussia Decision Engine</h3>
                <ul className="flex flex-col gap-3 text-sm">
                  {[
                    ['Priorización matemática 2x2:', 'Clasificación inmediata por urgencia y retorno de capital estratégico.'],
                    ['Tiempo blindado inquebrantable:', 'Asignación física a Cronos blocks que rechazan automáticamente reuniones vacías.'],
                    ['Ejecución deliberada:', 'Sólo 3 directrices críticas activas simultáneamente por día hábil.'],
                    ['Sincronización con Rueda de Vida:', 'Monitoreo activo de descanso, vigor y longevidad del decisor.'],
                  ].map(([b, r]) => (
                    <li key={b} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#0024e0] shrink-0 mt-0.5" />
                      <span><strong>{b}</strong> {r}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto p-3 bg-[#dfe0ff] rounded-lg text-xs text-[#000a63] font-semibold">
                  Resultado validado: <strong className="text-[#0024e0]">+15 horas de enfoque ininterrumpido</strong> recuperadas semanalmente.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="w-full py-8" id="cta-final">
          <div className="w-full max-w-[1240px] mx-auto px-4 md:px-6">
            <div className="w-full bg-[#2e3034] text-[#f0f0f5] rounded-xl p-6 md:p-8 flex flex-col items-center text-center gap-4 relative overflow-hidden shadow-xl">
              <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#0024e0]/20 rounded-full blur-3xl" />
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[#dfe0ff]">
                <BadgeCheck className="w-3.5 h-3.5" />
                <span className="text-[12px] font-black uppercase" style={GEIST}>Despliegue inmediato</span>
              </div>
              <h2 className="text-2xl md:text-[32px] leading-[40px] max-w-2xl font-bold tracking-tight" style={DISPLAY}>
                ¿Listo para recuperar 15 horas de enfoque estratégico a la semana?
              </h2>
              <p className="text-[#d9dadf] max-w-xl text-sm md:text-base">
                Integra tu calendario en menos de 2 minutos. Comienza tu periodo de prueba ejecutiva de 14 días sin compromiso ni fricción administrativa.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <button onClick={onCrearCuenta} className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#0024e0] text-white text-[11px] font-black uppercase tracking-wider shadow-md hover:bg-[#2b44ff] transition-all" style={GEIST}>
                  <span>Iniciar Prueba Ejecutiva Gratuita</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={onEntrar} className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white/10 text-[11px] font-black uppercase tracking-wider hover:bg-white/20 transition-colors" style={GEIST}>
                  <span>Ya tengo cuenta</span>
                </button>
              </div>
              <div className="pt-1 flex flex-wrap items-center justify-center gap-4 text-xs text-[#d9dadf] font-medium">
                {['Sin tarjeta de crédito requerida', 'Configuración en 2 minutos', 'Cancela cuando quieras'].map(t => (
                  <span key={t} className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-[#dfe0ff]" /> {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full bg-[#f3f3f8] py-8">
        <div className="w-full max-w-[1240px] mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-6">
            <div className="md:col-span-5 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-[#0024e0] flex items-center justify-center rounded text-white text-[12px] font-black">F</span>
                <span className="text-xl tracking-tight" style={DISPLAY}>FOCUSSIA</span>
              </div>
              <p className="text-sm text-[#444657] max-w-sm">Arquitectura de decisiones ejecutivas de alta precisión. Minimalismo suizo estructurado para líderes y estrategas cognitivos.</p>
            </div>
            <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-[12px] font-black uppercase" style={GEIST}>Framework</span>
                {[['Eisenhower Vector', 'demo-showcase'], ['Bloque Cronos', 'demo-showcase'], ['Espacios Ejecutivos', 'pilares']].map(([l, id]) => (
                  <button key={l} onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })} className="text-sm text-[#444657] hover:text-[#1a1c1f] transition-colors text-left">{l}</button>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[12px] font-black uppercase" style={GEIST}>Plataforma</span>
                <button onClick={onCrearCuenta} className="text-sm text-[#444657] hover:text-[#1a1c1f] transition-colors text-left">Planes de Acceso</button>
                <button onClick={onEntrar} className="text-sm text-[#444657] hover:text-[#1a1c1f] transition-colors text-left">Portal de Acceso</button>
                <button onClick={onCrearCuenta} className="text-sm text-[#444657] hover:text-[#1a1c1f] transition-colors text-left">Despliegue Rápido</button>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[12px] font-black uppercase" style={GEIST}>Editorial</span>
                <span className="text-sm text-[#444657]">Zúrich · Edición MMXXIV</span>
                <span className="text-sm text-[#444657]">SLA 99.99%</span>
              </div>
            </div>
          </div>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[#444657] text-[11px] font-black" style={GEIST}>
            <span className="tracking-wider">© 2024 FOCUSSIA EXECUTIVE SYSTEM. ALL RIGHTS RESERVED.</span>
            <div className="flex items-center gap-4">
              <span>SWISS EDITORIAL SYSTEM</span>
              <span>LATENCY: &lt;12MS</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
