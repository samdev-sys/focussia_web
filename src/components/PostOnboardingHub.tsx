import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LayoutDashboard, BookOpen, Settings, Sparkles, Play, ArrowRight,
  ChevronRight, ChevronLeft, X, Heart, Target, CheckSquare,
  Clock, Sun, Users, MessageSquare, Bell, Shield, CreditCard, Volume2,
  Sliders, Smartphone, EyeOff, Eye, Star, Check, SkipForward, GraduationCap, Compass, MapPin,
  CalendarDays, Flower2, Briefcase, BarChart3, ClipboardList, SlidersHorizontal, TrendingUp,
} from 'lucide-react';
import { authService, inicioService, configService, usuarioService, GuidedTourBlockData, LearningCategoryData, ConfigProfileData } from '../services/api';
import { AVATAR_FILES, AVATAR_VARIACIONES, AVATAR_VARIACION_POR_NOMBRE } from '../constants/avatars';
import { ReiniciarOnboarding } from './ReiniciarOnboarding';
import ConfiguracionModule from './ConfiguracionModule';
import { requestTourAutostart } from './FocusiaTour';

interface PostOnboardingHubProps {
  onGoToDashboard: () => void;
  onComplete: () => void;
}

export default function PostOnboardingHub({ onGoToDashboard, onComplete }: PostOnboardingHubProps) {
  const [screen, setScreen] = useState<'loading' | 'video' | 'decision' | 'tutorial' | 'sections' | 'config' | 'tour'>('loading');
  const [userName, setUserName] = useState('');
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [avatarName, setAvatarName] = useState('');
  const [hubEntryCount, setHubEntryCount] = useState(0);
  const [showProactive, setShowProactive] = useState(false);
  const [videoOrigin, setVideoOrigin] = useState<'inicio' | 'tutorial'>('inicio');
  const [guidedTourBlocks, setGuidedTourBlocks] = useState<GuidedTourBlockData[]>([]);
  const [learnCategories, setLearnCategories] = useState<LearningCategoryData[]>([]);

  useEffect(() => {
    Promise.all([
      authService.getCurrentUser(),
      inicioService.getState().catch(() => null),
      inicioService.guidedTourBlocks().catch(() => [] as GuidedTourBlockData[]),
      inicioService.learnCategories().catch(() => [] as LearningCategoryData[]),
      usuarioService.registrarIngreso().catch(() => null),
    ]).then(([user, state, blocks, cats, ingreso]) => {
      setUserName(user.username);
      setGuidedTourBlocks(blocks);
      setLearnCategories(cats);
      if (ingreso && typeof ingreso.conteo_ingresos === 'number') {
        setHubEntryCount(ingreso.conteo_ingresos);
      }
      configService.getAvatar().then(a => {
        setAvatarIndex(a.current_avatar_id ?? 0);
        const nm = (a.avatar as { name?: unknown } | null)?.name;
        if (typeof nm === 'string') setAvatarName(nm);
      }).catch(() => {});
      if (!state || !state.has_seen_intro_video) {
        setScreen('video');
      } else {
        setScreen('decision');
      }
      inicioService.getState().then(s => {}).catch(() => {});
    });
  }, []);

  useEffect(() => {
    if (screen === 'decision' && hubEntryCount >= 3) {
      const t = setTimeout(() => setShowProactive(true), 1500);
      return () => clearTimeout(t);
    }
  }, [screen, hubEntryCount]);

  const handleVideoComplete = useCallback(() => {
    if (videoOrigin === 'tutorial') {
      // §11: el video visto desde el tutorial vuelve a la pantalla Tutorial
      inicioService.introVideoReplayed({ completed: true }).catch(() => {});
      setScreen('tutorial');
    } else {
      inicioService.introVideoCompleted({ origin: 'inicio', completed: true }).catch(() => {});
      setScreen('decision');
    }
  }, [videoOrigin]);

  const handleVideoSkip = useCallback(() => {
    if (videoOrigin === 'tutorial') {
      inicioService.introVideoReplayed({ completed: false }).catch(() => {});
      setScreen('tutorial');
    } else {
      inicioService.introVideoAbandoned({ origin: 'inicio', completed: false }).catch(() => {});
      setScreen('decision');
    }
  }, [videoOrigin]);

  const handleVideoShown = useCallback(() => {
    inicioService.introVideoShown().catch(() => {});
  }, []);

  const openVideoFromTutorial = useCallback(() => {
    setVideoOrigin('tutorial');
    setScreen('video');
  }, []);

  if (screen === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-[#F4F4F7]"><div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (screen === 'video') {
    return <VideoExplicativo onComplete={handleVideoComplete} onSkip={handleVideoSkip} onShown={handleVideoShown} userName={userName} />;
  }

  if (screen === 'tour') {
    return (
      <GuidedTour
        blocks={guidedTourBlocks}
        onFinish={() => setScreen('tutorial')}
        onGoToDashboard={() => { inicioService.dashboardOpen({ origin: 'visita_guiada' }).catch(() => {}); onGoToDashboard(); }}
        userName={userName}
        avatarIndex={avatarIndex}
      />
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        
      </div>

      <header className=" ">
       </header> 
       <ReiniciarOnboarding userName={userName} onResetSuccess={() => {}} />

      {screen === 'decision' && <PantallaDecision userName={userName} avatarIndex={avatarIndex} avatarName={avatarName} onGoDashboard={() => { inicioService.dashboardOpen().catch(() => {}); onGoToDashboard(); }} onGoTutorial={() => { inicioService.tutorialOpen().catch(() => {}); setScreen('tutorial'); }} onGoConfig={() => { inicioService.configOpen().catch(() => {}); setScreen('config'); }} showProactive={showProactive} proactiveMsg={getProactiveMessage(hubEntryCount)} />}

      {screen === 'tutorial' && <TutorialScreen userName={userName} avatarIndex={avatarIndex} avatarName={avatarName} onShowVideo={openVideoFromTutorial} onStartTour={() => { inicioService.guidedTourStart().catch(() => {}); requestTourAutostart(); onGoToDashboard(); }} onGoSections={() => { inicioService.learnSectionsOpened().catch(() => {}); setScreen('sections'); }} onBack={() => setScreen('decision')} />}

      {screen === 'sections' && <SectionsScreen categories={learnCategories} avatarIndex={avatarIndex} avatarName={avatarName} onBack={() => setScreen('tutorial')} />}

      {screen === 'config' && <ConfigScreen userName={userName} avatarIndex={avatarIndex} onVideoShown={() => inicioService.configVideoShown().catch(() => {})} onOpenNow={() => inicioService.configOpenNow().catch(() => {})} onBack={() => { inicioService.configVolverInicio().catch(() => {}); setScreen('decision'); }} onGoToDashboard={() => { inicioService.dashboardOpen({ origin: 'configuracion' }).catch(() => {}); onGoToDashboard(); }} />}
    </div>
  );
}

function getProactiveMessage(count: number): string {
  const msgs = [
    'Puedes comenzar entrando al dashboard completo — ahí tendrás todo tu ecosistema productivo.',
    'Si prefieres orientarte primero, el tutorial te muestra cada bloque paso a paso.',
    'Recuerda que puedes ajustar todo desde Configuración cuando lo necesites.',
  ];
  return msgs[Math.min(count - 3, msgs.length - 1)] || msgs[msgs.length - 1];
}

function VideoExplicativo({ onComplete, onSkip, onShown, userName }: { onComplete: () => void; onSkip: () => void; onShown: () => void; userName: string }) {
  const [step, setStep] = useState(0);
  const shownRef = useRef(false);
  const segments = [
    { icon: Heart, text: 'Focusia empieza conociendo tu equilibrio en la Rueda de la Vida.', sub: 'Salud, relaciones y propósito como base de todo.' },
    { icon: Target, text: 'Contigo, define una Meta Anual clara y la desglosa en objetivos.', sub: 'Cada mes, cada semana, cada día — todo conectado.' },
    { icon: Clock, text: 'Organiza tu día con Time Blocking y el tablero Kanban.', sub: 'Saber qué hacer y cuándo hacerlo elimina la fricción.' },
    { icon: Sparkles, text: 'Y cuando pierdes el rumbo, la IA adaptativa interviene.', sub: 'Sin juzgar. Solo para devolverte la perspectiva estratégica.' },
  ];

  useEffect(() => {
    if (!shownRef.current) {
      shownRef.current = true;
      onShown();
    }
  }, [onShown]);

  useEffect(() => {
    if (step >= segments.length) {
      const t = setTimeout(onComplete, 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep(s => s + 1), 12000 / segments.length);
    return () => clearTimeout(t);
  }, [step, onComplete]);

  if (step >= segments.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a0a2e] via-[#16213e] to-[#0f3460] flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-400 to-pink-300 rounded-md flex items-center justify-center mb-6 animate-bounce">
            <Heart className="w-10 h-10 text-white" />
          </div>
          <p className="text-xl text-purple-200">¡Listo, {userName}!</p>
        </div>
      </div>
    );
  }

  const Seg = segments[step];
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0a2e] via-[#16213e] to-[#0f3460] flex items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-56 h-56 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      <div className="relative text-center max-w-lg animate-fade-in" key={step}>
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-400 to-pink-300 rounded-md flex items-center justify-center mb-6 shadow-2xl">
          <Seg.icon className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">{Seg.text}</h2>
        <p className="text-sm text-purple-200/70">{Seg.sub}</p>
        <div className="flex justify-center gap-2 mt-8">
          {segments.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === step ? 'bg-purple-400 w-4' : i < step ? 'bg-purple-600' : 'bg-purple-800/40'}`} />
          ))}
        </div>
        <button onClick={onSkip} className="mt-6 text-sm text-purple-300/60 hover:text-purple-200 transition-colors flex items-center gap-1 mx-auto">
          Saltar <SkipForward className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export function PantallaDecision({ userName, avatarIndex, avatarName, onGoDashboard, onGoTutorial, onGoConfig, showProactive, proactiveMsg }: {
  userName: string; avatarIndex: number; avatarName?: string; onGoDashboard: () => void; onGoTutorial: () => void; onGoConfig: () => void; showProactive?: boolean; proactiveMsg?: string;
}) {
  const [imgOk, setImgOk] = useState(true);
  // La foto es la del avatar elegido en el onboarding: se resuelve por nombre
  // (los ids de BD pueden variar) con fallback por id y luego al jpeg base.
  const nameKey = (avatarName || '').trim().toLowerCase();
  const heroImg = AVATAR_VARIACION_POR_NOMBRE[nameKey]
    || (avatarIndex > 0 ? AVATAR_VARIACIONES[avatarIndex] : undefined)
    || (avatarIndex > 0 ? AVATAR_FILES[avatarIndex] : undefined)
    || null;
  return (
    <main className="relative z-10 px-6 pb-10 overflow-hidden">
      {/* Ondas decorativas laterales */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 -ml-16 hidden md:block">
       <img src="./onda4.png" alt="" className="w-[200px] h-[1000px] object-cover -mt-30" />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 mt-30 -mr-25 hidden md:block">
        <img src="./onda3.png" alt="" className="w-[220px] h-[800px] object-cover" />
      </div>

      <div className="max-w-5xl mx-auto">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 pt-6 pb-5">
          <img src="./focussia.png" alt="Focusia" className="w-10 h-10" />
          <span className="text-xl font-bold text-gray-800 tracking-tight">Focusia</span>
        </div>

        {showProactive && proactiveMsg && (
          <div className="mb-5 max-w-2xl mx-auto bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-4 shadow-sm">
            <p className="text-sm text-gray-700 leading-relaxed text-center">{proactiveMsg}</p>
          </div>
        )}

        {/* Hero */}
        <section className="relative bg-#3533cd rounded-xl p-4 md:p-2 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            <div className="relative rounded-xl overflow-hidden min-h-[240px] md:min-h-[550px] bg-gradient-to-br from-purple-200 via-indigo-100 to-blue-100 ml-20">
              {heroImg && imgOk ? (
                <img src={heroImg} alt="Tu acompañante Focusia" onError={() => setImgOk(false)} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-indigo-100 via-purple-100 to-blue-100">
                  <Sparkles className="w-10 h-10 text-indigo-400" />
                  <p className="text-xs text-indigo-400 font-medium">Tu acompañante Focusia</p>
                </div>
              )}
            </div>
            <div className="bg-gray rounded-xl shadow-sm p-8 md:p-10 flex flex-col justify-center h-[300px]">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                Ya estamos listos,<br />
                <span className="text-indigo-700">{userName}. ¿Dónde quieres ir?</span>
              </h1>
              <div className="w-10 h-0.5 bg-purple-400 my-5" />
              <p className="text-sm text-gray-600 leading-relaxed">
                Tu espacio ya está preparado.<br />
                Ahora tú decides hacia dónde comenzar.
              </p>
            </div>
          </div>
        </section>

        {/* Tarjetas */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <DecisionCard
            icon={LayoutDashboard}
            iconBg="bg-blue-50"
            iconColor="text-indigo-700"
            title={<>Ir al<br />Dashboard completo</>}
            desc="Accede a todas las herramientas de Focusia en un solo lugar."
            cta="Entrar"
            onClick={onGoDashboard}
          />
          <DecisionCard
            icon={GraduationCap}
            iconBg="bg-violet-50"
            iconColor="text-violet-600"
            title={<>Ir al<br />Tutorial</>}
            desc="Conoce Focusia paso a paso y a tu propio ritmo."
            cta="Abrir tutorial"
            onClick={onGoTutorial}
          />
          <DecisionCard
            icon={Settings}
            iconBg="bg-orange-50"
            iconColor="text-orange-500"
            title={<>Ir a<br />Configuración</>}
            desc="Ajusta tu avatar, acompañamiento y preferencias."
            cta="Abrir configuración"
            onClick={onGoConfig}
          />
        </section>

        {/* Franja de cierre */}
        <section className="mt-4  bg-purple-100/80 rounded-xl px-2 py-3.5 flex items-center justify-center gap-2">
          <span className="w-8 h-8 rounded-full border border-indigo-400 text-indigo-600 flex items-center justify-center shrink-0">
            <Star className="w-4 h-4" />
          </span>
          <p className="text-sm text-gray-700 font-medium">La aplicación te acompaña. Las decisiones siempre serán tuyas.</p>
        </section>
      </div>
    </main>
  );
}

function DecisionCard({ icon: Icon, iconBg, iconColor, title, desc, cta, onClick }: {
  icon: React.ComponentType<{ className?: string }>; iconBg: string; iconColor: string; title: React.ReactNode; desc: string; cta: string; onClick: () => void;
}) {
  return (
    <div className="bg-white/85 backdrop-blur-sm border border-gray-100 rounded-2xl p-6 text-center shadow-sm hover:shadow-md transition-shadow flex flex-col">
      <div className={`w-12 h-12 ${iconBg} rounded-full flex items-center justify-center mx-auto mb-3`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <h3 className="font-bold text-gray-800 leading-snug">{title}</h3>
      <p className="text-xs text-gray-500 mt-2 leading-relaxed flex-1">{desc}</p>
      <button onClick={onClick} className="mt-4 w-full py-2.5 border border-indigo-400 text-indigo-600 font-semibold text-sm rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2">
        {cta} <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

const SECTION_STYLES: Record<string, {
  Icon: React.ComponentType<{ className?: string }>;
  circle: string; icon: string; btn: string; desc: string; img?: string;
}> = {
  planificacion: { Icon: Target, circle: 'bg-purple-100', icon: 'text-purple-700', btn: 'border-purple-600 text-purple-700 hover:bg-purple-50', desc: 'Convierte tus metas en un plan anual, mensual, semanal y diario.', img: './archer.png' },
  ejecucion_diaria: { Icon: CalendarDays, circle: 'bg-blue-50', icon: 'text-blue-600', btn: 'border-blue-500 text-blue-600 hover:bg-blue-50', desc: 'Aprende cómo organizar y ejecutar las actividades de cada día.' },
  bienestar: { Icon: Flower2, circle: 'bg-red-50', icon: 'text-red-500', btn: 'border-red-500 text-red-600 hover:bg-red-50', desc: 'Descubre las herramientas que apoyan tu equilibrio personal y familiar.', img: './loto.png' },
  herramientas_personales: { Icon: Briefcase, circle: 'bg-teal-50', icon: 'text-teal-600', btn: 'border-teal-500 text-teal-600 hover:bg-teal-50', desc: 'Conoce los recursos complementarios para organizar y potenciar tu vida.', img: './bag.png' },
  configuracion: { Icon: Settings, circle: 'bg-slate-100', icon: 'text-slate-600', btn: 'border-indigo-600 text-indigo-700 hover:bg-indigo-50', desc: 'Personaliza la forma en que Focusia te acompaña.' },
  reportes: { Icon: BarChart3, circle: 'bg-indigo-50', icon: 'text-indigo-600', btn: 'border-indigo-500 text-indigo-600 hover:bg-indigo-50', desc: 'Comprende cómo visualizar tu progreso y evolución.',  },
};

// Módulos del detalle de Planificación (diseño "De la claridad a la acción")
const PLANIFICACION_MODULES = [
  'Rueda de la vida',
  'Matriz',
  'Meta anual',
  'Objetivos mensuales',
  'Mi misión semanal',
  'Planificación semanal',
  'Planificación diaria',
];

// Módulos del detalle de Ejecución diaria (diseño "De la planificación a la acción concreta del día")
const EJECUCION_MODULES = [
  'Agenda diaria con Time blocking, work in progress y status',
  'Mi misión de hoy',
  'Kanban Backlog',
  'Acciones por delegar',
  'Recordatorios',
];

// Módulos del detalle de Bienestar (diseño "Equilibrio, energía, cuidado personal y vida significativa")
const BIENESTAR_MODULES = [
  'Gratitud',
  'La Hora de Oro Familiar',
  'Medicamentos',
  'Clima en mi comuna',
  'Humor · Ejercicios · Hobbies · Viajes · Diversión · Reflexión · Salud',
];

// Módulos del detalle de Herramientas personales (diseño "Apoyo práctico, administración personal...")
const HERRAMIENTAS_MODULES = [
  'Cursos',
  'RRSS',
  'Cuentas',
  'Coaching',
  'Tribu',
  'Cumpleaños',
  'Block de notas',
  'Recordatorio de fechas importantes',
  'Focus',
];

// Módulos del detalle de Configuración (coinciden con el seed del backend)
const CONFIGURACION_MODULES = [
  'Avatar seleccionado',
  'Intensidad del acompañamiento',
  'Tipo de activaciones',
  'Horarios permitidos',
  'Tono del avatar',
  'Notificaciones',
  'Privacidad y seguridad',
  'Cuenta de usuario',
];

// Módulos del detalle de Reportes (coinciden con el seed del backend)
const REPORTES_MODULES = [
  'Reporte semanal',
  'Reporte mensual',
  'Reporte anual',
  'Mi Progreso',
  'Indicadores de cumplimiento',
  'Recomendaciones inteligentes',
  'Historial de avances',
];

const FALLBACK_SECTIONS: { slug: string; name: string; modules: string[] }[] = [
  { slug: 'planificacion', name: 'Planificación', modules: [...PLANIFICACION_MODULES] },
  { slug: 'ejecucion_diaria', name: 'Ejecución diaria', modules: [...EJECUCION_MODULES] },
  { slug: 'bienestar', name: 'Bienestar', modules: [...BIENESTAR_MODULES] },
  { slug: 'herramientas_personales', name: 'Herramientas personales', modules: [...HERRAMIENTAS_MODULES] },
  { slug: 'configuracion', name: 'Configuración', modules: [...CONFIGURACION_MODULES] },
  { slug: 'reportes', name: 'Reportes', modules: [...REPORTES_MODULES] },
];

export function TutorialScreen({ userName, avatarIndex, avatarName, onShowVideo, onStartTour, onGoSections, onBack }: {
  userName: string; avatarIndex: number; avatarName?: string; onShowVideo: () => void; onStartTour: () => void; onGoSections: () => void; onBack: () => void;
}) {
  const [imgOk, setImgOk] = useState(true);
  const nameKey = (avatarName || '').trim().toLowerCase();
  const heroImg = AVATAR_VARIACION_POR_NOMBRE[nameKey]
    || (avatarIndex > 0 ? AVATAR_VARIACIONES[avatarIndex] : undefined)
    || (avatarIndex > 0 ? AVATAR_FILES[avatarIndex] : undefined)
    || null;
  return (
    <main className="relative z-10 px-6 pb-10 overflow-hidden">
      {/* Ondas decorativas laterales */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 -ml-16 hidden md:block">
        <img src="./onda4.png" alt="" className="w-[200px] h-[1000px] object-cover" />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 -mr-16 hidden md:block">
        <img src="./onda3.png" alt="" className="w-[250px] h-[800px]  mt-30 -mr-20 object-cover" />
      </div>

      <div className="max-w-5xl mx-auto ">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 pt-6 pb-4">
          <img src="./focussia.png" alt="Focusia" className="w-10 h-10" />
          <span className="text-xl font-bold text-gray-800 tracking-tight">Focusia</span>
        </div>

        <button onClick={onBack} className="flex items-center gap-8 text-sm font-semibold text-indigo-600 hover:text-indigo-800 mb-4 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Volver
        </button>

        {/* Hero */}
        <section className="relative  rounded-xl p-4 md:p-2 overflow-hidden ml-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            <div className="relative rounded-xl overflow-hidden min-h-[240px] md:min-h-[550px] w-[400px] bg-gradient-to-br from-purple-200 via-indigo-100 to-blue-100 ml-15">
              {heroImg && imgOk ? (
                <img src={heroImg} alt="Tu acompañante Focusia" onError={() => setImgOk(false)} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-indigo-100 via-purple-100 to-blue-100">
                 
                </div>
              )}
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-8 md:p-10 flex flex-col justify-center">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                Tranquilo, {userName}.
              </h1>
              <div className="w-16 h-0.5 bg-indigo-500 my-5" />
              <p className="text-sm text-gray-600 leading-relaxed">
                No necesitas aprender todo de una vez.
              </p>
              <p className="text-base font-bold text-indigo-600 leading-snug mt-4">
                Elige cómo quieres conocer Focusia.
              </p>
            </div>
          </div>
        </section>

        {/* Opciones */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="bg-white/90 border border-gray-100 rounded-2xl p-6 text-center shadow-sm hover:shadow-md transition-shadow flex flex-col">
            <div className="w-28 h-28 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
              <span className="w-20 h-14 bg-gray-900 rounded-lg flex flex-col items-center justify-center gap-1.5 px-3">
                <Play className="w-6 h-6 text-white fill-white" />
                <span className="w-full h-1 rounded-full bg-white/25 overflow-hidden">
                  <span className="block w-1/3 h-full bg-indigo-400 rounded-full" />
                </span>
              </span>
            </div>
            <h3 className="font-bold text-gray-900 flex items-center justify-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-100 text-indigo-600 text-xs font-bold flex items-center justify-center shrink-0">1</span>
              Ver video inicial
            </h3>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed flex-1">
              Vuelve a ver la introducción general de Focusia y recuerda cómo funciona la plataforma desde el comienzo.
            </p>
            <button onClick={onShowVideo} className="mt-4 w-full py-2.5 border border-indigo-500 text-indigo-600 font-semibold text-sm rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center">
                <Play className="w-3 h-3 text-white fill-white" />
              </span>
              Ver video
            </button>
          </div>

          <div className="bg-white/90 border border-gray-100 rounded-2xl p-6 text-center shadow-sm hover:shadow-md transition-shadow flex flex-col">
            <div className="w-28 h-28 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-14 h-14 text-blue-500" strokeWidth={1.5} />
            </div>
            <h3 className="font-bold text-gray-900 flex items-center justify-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center shrink-0">2</span>
              Aprender por secciones
            </h3>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed flex-1">
              Accede a explicaciones organizadas por módulos para aprender únicamente la parte que necesitas.
            </p>
            <button onClick={onGoSections} className="mt-4 w-full py-2.5 border border-blue-500 text-blue-600 font-semibold text-sm rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2">
              <BookOpen className="w-5 h-5" />
              Comenzar
            </button>
          </div>

          <div className="bg-white/90 border border-gray-100 rounded-2xl p-6 text-center shadow-sm hover:shadow-md transition-shadow flex flex-col">
            <div className="w-28 h-28 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-4">
              <img src="./tour.png" alt="Visita guiada del dashboard" className="w-16 h-14 text-purple-700 fill-purple-100" />
            </div>
            <h3 className="font-bold text-gray-900 flex items-center justify-center gap-2">
              <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center shrink-0">3</span>
              Iniciar visita guiada del dashboard
            </h3>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed flex-1">
              Recorre el dashboard junto a Focusia y descubre la función de cada herramienta paso a paso.
            </p>
            <button onClick={onStartTour} className="mt-4 w-full py-2.5 border border-orange-500 text-orange-600 font-semibold text-sm rounded-lg hover:bg-orange-50 transition-colors flex items-center justify-center gap-2">
              <Compass className="w-5 h-5" />
              Iniciar recorrido
            </button>
          </div>
        </section>

      </div>
    </main>
  );
}

export function SectionsScreen({ categories, avatarIndex, avatarName, onBack }: {
  categories: LearningCategoryData[]; avatarIndex?: number; avatarName?: string; onBack: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detailSlug, setDetailSlug] = useState<string | null>(null);
  const sections = categories.length > 0
    ? categories.map(c => ({ slug: c.slug, name: c.name, modules: c.modules.map(m => m.name) }))
    : FALLBACK_SECTIONS;

  if (detailSlug === 'planificacion' || detailSlug === 'ejecucion_diaria' || detailSlug === 'bienestar' || detailSlug === 'herramientas_personales' || detailSlug === 'configuracion' || detailSlug === 'reportes') {
    const section = sections.find(s => s.slug === detailSlug);
    const detailConfig = {
      planificacion: {
        title: 'PLANIFICACIÓN',
        sideCaption: 'De la claridad a la acción',
        sideImg: './task-1.png' as string | undefined,
        sideIcon: undefined as 'check' | 'sliders' | undefined,
        fallback: PLANIFICACION_MODULES,
        useBackendModules: true,
        darkNumbers: false,
        threeCols: false,
        splitRows: undefined as number | undefined,
      },
      ejecucion_diaria: {
        title: 'EJECUCIÓN DIARIA',
        sideCaption: 'De la planificación a la acción concreta del día',
        sideImg: undefined as string | undefined,
        sideIcon: undefined as 'check' | 'sliders' | undefined,
        fallback: EJECUCION_MODULES,
        useBackendModules: true,
        darkNumbers: true,
        threeCols: false,
        splitRows: undefined as number | undefined,
      },
      bienestar: {
        title: 'BIENESTAR',
        sideCaption: 'Equilibrio, energía, cuidado personal y vida significativa',
        sideImg: './loto.png' as string | undefined,
        sideIcon: undefined as 'check' | 'sliders' | undefined,
        fallback: BIENESTAR_MODULES,
        useBackendModules: false,
        darkNumbers: true,
        threeCols: false,
        splitRows: undefined as number | undefined,
      },
      herramientas_personales: {
        title: 'HERRAMIENTAS PERSONALES',
        sideCaption: 'Apoyo práctico, administración personal, vínculos, aprendizaje y organización complementaria',
        sideImg: './bag.png' as string | undefined,
        sideIcon: undefined as 'check' | 'sliders' | undefined,
        fallback: HERRAMIENTAS_MODULES,
        useBackendModules: false,
        darkNumbers: true,
        threeCols: true,
        splitRows: undefined as number | undefined,
      },
      configuracion: {
        title: 'CONFIGURACIÓN',
        sideCaption: 'Comprenda y modifique cómo Focusia lo acompaña, se comunica con usted y protege su información',
        sideImg: undefined as string | undefined,
        sideIcon: 'sliders' as 'check' | 'sliders' | 'chart' | undefined,
        fallback: CONFIGURACION_MODULES,
        useBackendModules: true,
        darkNumbers: true,
        threeCols: true,
        splitRows: undefined as number | undefined,
      },
      reportes: {
        title: 'REPORTES',
        sideCaption: 'Focusia transforma sus acciones en conciencia, progreso visible y decisiones de ajuste',
        sideImg: undefined as string | undefined,
        sideIcon: 'chart' as 'check' | 'sliders' | 'chart' | undefined,
        fallback: REPORTES_MODULES,
        useBackendModules: true,
        darkNumbers: true,
        threeCols: true,
        splitRows: 3 as number | undefined,
      },
    }[detailSlug];
    return (
      <CategoryDetail
        title={detailConfig.title}
        tagline="Elige el módulo que quieres conocer"
        sideCaption={detailConfig.sideCaption}
        sideImg={detailConfig.sideImg}
        sideIcon={detailConfig.sideIcon}
        modules={detailConfig.useBackendModules && section && section.modules.length > 0 ? section.modules : [...detailConfig.fallback]}
        darkNumbers={detailConfig.darkNumbers}
        threeCols={detailConfig.threeCols}
        splitRows={detailConfig.splitRows}
        avatarIndex={avatarIndex}
        avatarName={avatarName}
        onBack={() => setDetailSlug(null)}
      />
    );
  }

  return (
    <main className="relative z-10 px-6 pb-10 overflow-hidden">
      {/* Ondas decorativas laterales */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 -ml-16 hidden md:block">
        <img src="./onda4.png" alt="" className="w-[200px] h-[1000px] object-cover" />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 -mr-16 hidden md:block">
        <img src="./onda3.png" alt="" className="w-[250px] h-[800px] mt-30 -mr-20 object-cover" />
      </div>

      <div className="max-w-5xl mx-auto">
        {/* Encabezado */}
        <div className="relative pt-6 pb-2">
          <button onClick={onBack} className="absolute left-0 top-6 flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Volver
          </button>
          <div className="flex items-center justify-center gap-2">
            <img src="./focussia.png" alt="Focusia" className="w-10 h-10" />
            <span className="text-xl font-bold tracking-tight">
              <span className="text-purple-500">F</span><span className="text-gray-800">ocusia</span>
            </span>
          </div>
        </div>

        <div className="text-center mt-4 mb-8">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900">
            APRENDER POR <span className="text-blue-700">SECCIONES</span>
          </h1>
          <p className="text-sm md:text-base text-indigo-600 font-medium mt-3">
            Elige una categoría para conocer sus módulos paso a paso.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {sections.map(s => {
            const style = SECTION_STYLES[s.slug] || {
              Icon: BookOpen, circle: 'bg-gray-100', icon: 'text-gray-500',
              btn: 'border-gray-400 text-gray-600 hover:bg-gray-50',
              desc: 'Explora los módulos de esta categoría paso a paso.',
            };
            const Icon = style.Icon;
            const isOpen = expanded === s.slug;
            return (
              <div key={s.slug} className="bg-white border border-gray-100 rounded-2xl p-6 text-center shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className={`w-16 h-16 ${style.circle} rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden`}>
                  {'img' in style && style.img ? (
                    <img src={style.img} alt={s.name} className="w-10 h-10 object-contain" />
                  ) : (
                    <Icon className={`w-8 h-8 ${style.icon}`} />
                  )}
                </div>
                <h3 className="font-bold text-slate-900">{s.name}</h3>
                <p className="text-xs text-indigo-800 mt-2 leading-relaxed flex-1">{style.desc}</p>
                <button
                  onClick={() => {
                    if (s.slug === 'planificacion' || s.slug === 'ejecucion_diaria' || s.slug === 'bienestar' || s.slug === 'herramientas_personales' || s.slug === 'configuracion' || s.slug === 'reportes') {
                      inicioService.learnCategorySelect(s.slug).catch(() => {});
                      setDetailSlug(s.slug);
                    } else {
                      setExpanded(isOpen ? null : s.slug);
                    }
                  }}
                  className={`mt-4 w-full py-2 border font-semibold text-sm rounded-lg transition-colors ${style.btn}`}
                >
                  {(s.slug === 'planificacion' || s.slug === 'ejecucion_diaria' || s.slug === 'bienestar' || s.slug === 'herramientas_personales' || s.slug === 'configuracion' || s.slug === 'reportes') ? 'Ver módulos' : (isOpen ? 'Ocultar módulos' : 'Ver módulos')}
                </button>
                {isOpen && (
                  <ul className="mt-3 pt-3 border-t border-gray-100 text-left space-y-1.5">
                    {s.modules.map(m => (
                      <li key={m} className="flex items-start gap-2 text-xs text-gray-600">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current opacity-40 shrink-0" />
                        {m}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function ModuleButton({ name, index, darkNumbers, className }: {
  name: string; index: number; darkNumbers?: boolean; className?: string;
}) {
  return (
    <button
      className={`bg-white border border-indigo-100 rounded-2xl px-5 py-5 flex items-center gap-4 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all text-left ${className || ''}`}
    >
      <span className={`w-10 h-10 rounded-full text-lg font-bold flex items-center justify-center shrink-0 ${darkNumbers ? 'bg-[#141433] text-white' : 'bg-[#ede9fe] text-[#141433]'}`}>
        {index + 1}
      </span>
      <span className="font-bold text-[#141433] text-base md:text-lg leading-snug">{name}</span>
    </button>
  );
}

function CategoryDetail({ title, tagline, sideCaption, sideImg, sideIcon, modules, darkNumbers, threeCols, splitRows, avatarIndex, avatarName, onBack }: {
  title: string; tagline: string; sideCaption: string; sideImg?: string; sideIcon?: 'check' | 'sliders' | 'chart';
  modules: string[]; darkNumbers?: boolean; threeCols?: boolean; splitRows?: number; avatarIndex?: number; avatarName?: string; onBack: () => void;
}) {
  const [imgOk, setImgOk] = useState(true);
  const nameKey = (avatarName || '').trim().toLowerCase();
  const avatarImg = AVATAR_VARIACION_POR_NOMBRE[nameKey]
    || (avatarIndex && avatarIndex > 0 ? AVATAR_VARIACIONES[avatarIndex] : undefined)
    || (avatarIndex && avatarIndex > 0 ? AVATAR_FILES[avatarIndex] : undefined)
    || null;
  const items = modules.length > 0 ? modules : [];
  return (
    <main className="relative z-10 px-6 pb-10 overflow-hidden min-h-screen">
      {/* Ondas decorativas laterales */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 -ml-10 hidden md:block">
        <img src="./onda4.png" alt="" className="w-[160px] h-full object-cover" />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 -mr-10 hidden md:block">
        <img src="./onda3.png" alt="" className="w-[200px] h-full object-cover" />
      </div>

      <div className="max-w-5xl mx-auto relative">
        {/* Encabezado */}
        <div className="relative pt-6 pb-2">
          <button onClick={onBack} className="absolute left-0 top-6 flex items-center gap-1.5 text-base font-semibold text-[#141433] hover:text-indigo-700 transition-colors">
            <ArrowRight className="w-5 h-5 rotate-180" /> Volver
          </button>
          <div className="flex items-center justify-center gap-2">
            <img src="./focussia.png" alt="Focusia" className="w-10 h-10" />
            <span className="text-xl font-bold tracking-tight">
              <span className="text-purple-500">F</span><span className="text-gray-800">ocusia</span>
            </span>
          </div>
        </div>

        <div className="text-center mt-6 mb-8">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-[#141433]">
            {title}
          </h1>
          <p className="text-sm md:text-lg text-indigo-600 font-medium mt-3">
            {tagline}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 items-start">
          {/* Tarjeta lateral */}
          <div className="bg-white border border-indigo-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="relative min-h-[280px] bg-gradient-to-br from-indigo-600 via-purple-500 to-blue-500">
              {avatarImg && imgOk ? (
                <img src={avatarImg} alt="Tu acompañante Focusia" onError={() => setImgOk(false)} className="absolute inset-0 w-full h-full object-cover object-top" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <Sparkles className="w-10 h-10 text-white/80" />
                </div>
              )}
            </div>
            <div className="p-6 text-center">
              <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4 overflow-hidden">
                {sideImg ? (
                  <img src={sideImg} alt="" className="w-12 h-12 object-contain" />
                ) : sideIcon === 'sliders' ? (
                  <SlidersHorizontal className="w-10 h-10 text-indigo-600" strokeWidth={1.5} />
                ) : sideIcon === 'chart' ? (
                  <span className="relative inline-flex">
                    <BarChart3 className="w-10 h-10 text-indigo-600" strokeWidth={1.5} />
                    <span className="absolute -top-1 -right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-indigo-600" strokeWidth={3} />
                    </span>
                  </span>
                ) : (
                  <span className="relative inline-flex">
                    <ClipboardList className="w-10 h-10 text-indigo-600" strokeWidth={1.5} />
                    <span className="absolute -bottom-1 -right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-indigo-600" strokeWidth={3} />
                    </span>
                  </span>
                )}
              </div>
              <p className="font-bold text-[#141433] text-lg leading-snug">{sideCaption}</p>
            </div>
          </div>

          {/* Módulos */}
          {threeCols && splitRows ? (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {items.slice(0, splitRows).map((m, i) => (
                  <ModuleButton key={m} name={m} index={i} darkNumbers={darkNumbers} className="" />
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                {items.slice(splitRows).map((m, k) => (
                  <ModuleButton key={m} name={m} index={splitRows + k} darkNumbers={darkNumbers} className="" />
                ))}
              </div>
            </div>
          ) : threeCols ? (
            <div className="flex flex-wrap justify-center gap-4">
              {items.map((m, i) => {
                const smFull = i === items.length - 1 && items.length % 2 === 1;
                return (
                  <ModuleButton
                    key={m}
                    name={m}
                    index={i}
                    darkNumbers={darkNumbers}
                    className={`w-full ${smFull ? 'sm:w-full' : 'sm:w-[calc(50%-0.5rem)]'} lg:w-[calc(33.333%-0.75rem)]`}
                  />
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {items.map((m, i) => (
                <ModuleButton
                  key={m}
                  name={m}
                  index={i}
                  darkNumbers={darkNumbers}
                  className={i === items.length - 1 && items.length % 2 === 1 ? 'sm:col-span-2' : ''}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function GuidedTour({ blocks, onFinish, onGoToDashboard, userName, avatarIndex }: {
  blocks: GuidedTourBlockData[]; onFinish: () => void; onGoToDashboard: () => void; userName: string; avatarIndex: number;
}) {
  const tourBlocks = blocks.length > 0 ? blocks : FALLBACK_TOUR_BLOCKS;
  const [step, setStep] = useState(0);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (step >= tourBlocks.length) {
      if (!finishedRef.current) {
        finishedRef.current = true;
        inicioService.guidedTourComplete().catch(() => {});
      }
      return;
    }
    const t = setTimeout(() => setStep(s => s + 1), 3000);
    return () => clearTimeout(t);
  }, [step, tourBlocks.length]);

  const handleSkip = useCallback(() => {
    if (!finishedRef.current) {
      finishedRef.current = true;
      inicioService.guidedTourAbandon({ paso_actual: step, total_pasos: tourBlocks.length }).catch(() => {});
    }
    onFinish();
  }, [onFinish, step, tourBlocks.length]);

  if (step >= tourBlocks.length) {
    return (
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-400 to-teal-500 rounded-md flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Visita completada</h2>
          <p className="text-sm text-gray-500 mb-6">Ya conoces las zonas principales de Focusia. Este recorrido concluye en la sección de Bienestar — el resto lo descubrirás explorando.</p>
          <div className="flex flex-col gap-3">
            <button onClick={onGoToDashboard} className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold rounded-md hover:shadow-lg transition-all">
              Ir al dashboard completo
            </button>
            <button onClick={onFinish} className="px-6 py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">
              Volver al tutorial
            </button>
          </div>
        </div>
      </main>
    );
  }

  const s = tourBlocks[step];
  return (
    <main className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-6">
      <div className="bg-white/90 backdrop-blur-md border border-white/60 rounded-md shadow-2xl p-8 max-w-lg w-full">
        <div className="flex items-center gap-2 mb-6">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full transition-all" style={{ width: `${((step + 1) / tourBlocks.length) * 100}%` }} />
          </div>
          <span className="text-xs text-gray-400 font-medium">{step + 1}/{tourBlocks.length}</span>
        </div>

        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-400 to-pink-400 rounded-md flex items-center justify-center mb-5 shadow-lg">
          <span className="text-2xl font-bold text-white">{step + 1}</span>
        </div>

        <h3 className="text-xl font-bold text-gray-800 text-center mb-2">{s.title}</h3>
        <p className="text-sm text-gray-500 text-center leading-relaxed">{s.avatar_message}</p>

        <div className="flex items-center justify-center gap-3 mt-8">
          {step > 0 && <button onClick={() => setStep(s => s - 1)} className="px-4 py-2 border border-gray-200 rounded-md text-sm text-gray-500 hover:bg-white transition-colors">Anterior</button>}
          {step < tourBlocks.length - 1 && <button onClick={() => setStep(s => s + 1)} className="px-4 py-2 bg-purple-500 text-white rounded-md text-sm font-medium hover:bg-purple-600 transition-colors">Siguiente</button>}
          <button onClick={handleSkip} className="px-4 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors">Saltar</button>
        </div>
      </div>
    </main>
  );
}

const FALLBACK_TOUR_BLOCKS: GuidedTourBlockData[] = [
  { slug: 'inicio', title: 'Inicio', avatar_message: 'Este es tu botón de inicio. Desde aquí puedes volver al punto central de Focusia, entrar al dashboard completo, revisar el tutorial o ajustar tu configuración cuando lo necesites.', order: 1 },
  { slug: 'rueda', title: 'Rueda', avatar_message: 'Aquí comienza tu diagnóstico personal. La Rueda de la Vida te ayuda a observar cómo están las áreas principales de tu vida, para tomar decisiones con más claridad y no planificar desde la improvisación.', order: 2 },
  { slug: 'anual', title: 'Anual', avatar_message: 'Este es tu espacio anual. Aquí definirás tu gran meta del año: una dirección clara que servirá como guía para tus objetivos mensuales, tu planificación semanal y tus acciones diarias.', order: 3 },
  { slug: 'mensual', title: 'Mensual', avatar_message: 'Aquí organizarás tu meta anual en objetivos mensuales. Cada mes será un bloque estratégico de avance, para que tu gran meta no quede como una idea lejana, sino como un camino concreto.', order: 4 },
  { slug: 'semanal', title: 'Semanal', avatar_message: 'Aquí organizarás tu semana. Focusia te ayuda a convertir tu objetivo mensual en acciones concretas, para que cada semana tenga dirección, prioridad y avance real.', order: 5 },
  { slug: 'kanban_backlog', title: 'Kanban Backlog', avatar_message: 'Este es tu Kanban Backlog. Aquí puedes ordenar tareas, ideas o acciones pendientes antes de decidir cuándo ejecutarlas. Te ayuda a no perder nada importante y a mantener tu planificación más limpia.', order: 6 },
  { slug: 'objetivo_semana', title: 'Objetivo Semana', avatar_message: 'Este es tu Objetivo de la Semana. Aquí defines el foco principal que guiará tus próximos días, para que tus acciones no se dispersen y sigan conectadas con tu objetivo mensual.', order: 7 },
  { slug: 'mision_hoy', title: 'Mision Hoy', avatar_message: 'Esta es tu Misión de Hoy. Aquí eliges la acción más importante del día: esa tarea que realmente mueve tu avance y que conecta con lo que tú mismo definiste como prioridad.', order: 8 },
  { slug: 'agenda_diaria', title: 'Agenda Diaria', avatar_message: 'Esta es tu agenda diaria. Aquí organizas lo que harás hoy, conectando tus tareas con tu misión, tu objetivo semanal y tu avance real.', order: 9 },
  { slug: 'time_blocking', title: 'Time Blocking', avatar_message: 'Este es tu Time Blocking. Aquí puedes organizar tu día por bloques de tiempo, para que tus acciones no queden solo como pendientes, sino como espacios concretos e innegociables dentro de tu jornada.', order: 10 },
  { slug: 'wip_status', title: 'WIP Status', avatar_message: 'Aquí verás el estado de tus acciones. Focusia te mostrará qué está pendiente, qué está en proceso y qué ya completaste, para que tengas claridad sobre tu avance real.', order: 11 },
  { slug: 'fechas_importantes', title: 'Fechas Importantes', avatar_message: 'Aquí puedes registrar tus fechas importantes. Focusia te ayudará a recordarlas con anticipación, para que no solo las tengas anotadas, sino que puedas prepararte antes de que lleguen.', order: 12 },
  { slug: 'acciones_delegar', title: 'Acciones Delegar', avatar_message: 'Aquí puedes registrar acciones que no necesariamente debes hacer tú. Focusia te ayuda a identificar qué puedes delegar, para liberar carga, cuidar tu foco y avanzar con mayor claridad.', order: 13 },
  { slug: 'gratitud', title: 'Gratitud', avatar_message: 'Este es tu espacio de gratitud. Aquí puedes detenerte un momento y registrar algo valioso de tu día. Focusia no solo busca que avances, también que tomes conciencia de lo que ya estás construyendo.', order: 14 },
  { slug: 'coaching', title: 'Coaching', avatar_message: 'Este es tu espacio de coaching. Aquí encontrarás orientación y herramientas prácticas para fortalecer tus decisiones, tu disciplina y tu capacidad de avanzar con más claridad.', order: 15 },
  { slug: 'tribu', title: 'Tribu', avatar_message: 'Este es tu espacio de Tribu. Aquí podrás conectar con apoyo, comunidad e inspiración, para que tu proceso no dependa solo de ti, sino también de un entorno que refuerce tu avance.', order: 16 },
  { slug: 'cursos', title: 'Cursos', avatar_message: 'Este es tu espacio de Cursos. Aquí podrás acceder a contenidos más estructurados para fortalecer tus habilidades, mejorar tu forma de organizarte y avanzar con mayor preparación.', order: 17 },
  { slug: 'rrss', title: 'RRSS', avatar_message: 'Este es tu espacio de RRSS. Aquí puedes organizar tus redes sociales, ideas de contenido o presencia digital, para que tu actividad online tenga más orden, intención y dirección.', order: 18 },
  { slug: 'cuentas', title: 'Cuentas', avatar_message: 'Este es tu espacio de Cuentas. Aquí puedes organizar información administrativa o financiera importante, para mantener mayor claridad sobre compromisos, pagos y datos que no quieres perder de vista.', order: 19 },
  { slug: 'medicamentos', title: 'Medicamentos', avatar_message: 'Este es tu espacio de Medicamentos. Aquí puedes registrar recordatorios relacionados con tu cuidado personal, para que Focusia te ayude a no olvidar acciones importantes de salud que tú mismo hayas definido.', order: 20 },
  { slug: 'cumpleanos', title: 'Cumpleaños', avatar_message: 'Este es tu espacio de Cumpleaños. Aquí puedes registrar fechas importantes de personas relevantes para ti, para que Focusia te ayude a recordarlas con anticipación y puedas prepararte a tiempo.', order: 21 },
  { slug: 'focus', title: 'Focus', avatar_message: 'Este es tu espacio Focus. Aquí puedes volver a centrarte en lo importante, recuperar claridad y dirigir tu atención hacia aquello que realmente necesita tu enfoque en este momento.', order: 22 },
  { slug: 'clima_comuna', title: 'Clima Comuna', avatar_message: 'Aquí puedes ver el clima de tu comuna. Focusia te ayuda a considerar esta información para planificar mejor tu día, anticipar traslados, ajustar actividades y tomar decisiones con más contexto.', order: 23 },
  { slug: 'notas', title: 'Notas', avatar_message: 'Este es tu block de notas. Aquí puedes guardar ideas, apuntes o información rápida para no perder nada importante y mantener tu mente más despejada.', order: 24 },
  { slug: 'bienestar_complementario', title: 'Bienestar Complementario', avatar_message: 'Estos espacios te ayudan a cuidar tu bienestar y tu vida personal. Aquí puedes organizar momentos de humor, ejercicio, hobbies, viajes, diversión y reflexión, para que tu planificación no solo sea productiva, sino también significativa.', order: 25 },
];

function ConfigScreen({ userName, avatarIndex, onVideoShown, onOpenNow, onBack, onGoToDashboard }: {
  userName: string; avatarIndex: number; onVideoShown: () => void; onOpenNow: () => void; onBack: () => void; onGoToDashboard: () => void;
}) {
  const [showVideo, setShowVideo] = useState(false);
  const [showPostVideo, setShowPostVideo] = useState(false);
  const [showCategories, setShowCategories] = useState(true);
  const [avatarImgOk, setAvatarImgOk] = useState(true);
  const videoShownRef = useRef(false);
  const avatarImg = avatarIndex > 0 ? AVATAR_FILES[avatarIndex] : null;

  useEffect(() => {
    if (!videoShownRef.current) {
      videoShownRef.current = true;
      onVideoShown();
    }
  }, [onVideoShown]);

  useEffect(() => {
    if (showVideo) {
      const t = setTimeout(() => { setShowVideo(false); setShowPostVideo(true); }, 8000);
      return () => clearTimeout(t);
    }
  }, [showVideo]);

  const goToCategories = useCallback(() => {
    setShowPostVideo(false);
    setShowCategories(true);
    onOpenNow();
  }, [onOpenNow]);

  if (showVideo) {
    return (
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-6">
        <div className="text-center max-w-md animate-fade-in">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-amber-400 to-orange-500 rounded-md flex items-center justify-center mb-6 shadow-2xl">
            <Settings className="w-10 h-10 text-white animate-spin-slow" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-3">Antes de configurar</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Los cambios se realizan de forma permanente mediante el icono de engranaje
            ubicado en la parte superior del dashboard, junto a la campanita de notificaciones.
          </p>
          <button onClick={() => { setShowVideo(false); setShowPostVideo(true); }}
            className="mt-6 text-sm text-purple-500 hover:text-purple-700 font-medium transition-colors">
            Continuar →
          </button>
        </div>
      </main>
    );
  }

  if (showPostVideo) {
    return (
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-6">
        <div className="text-center max-w-md animate-fade-in">
          {avatarImg && avatarImgOk ? (
            <img src={avatarImg} alt="Tu avatar" onError={() => setAvatarImgOk(false)} className="w-20 h-20 mx-auto rounded-md object-cover border-2 border-purple-200 mb-6 shadow-lg" />
          ) : (
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-amber-400 to-orange-500 rounded-md flex items-center justify-center mb-6 shadow-2xl">
              <Settings className="w-10 h-10 text-white" />
            </div>
          )}
          <p className="text-base text-gray-700 leading-relaxed">
            Listo, {userName}. Cuando quieras cambiar tu configuración, puedes hacerlo desde el
            engranaje ubicado junto a la campanita de notificaciones.
          </p>
          <div className="flex flex-col gap-3 mt-8">
            <button onClick={goToCategories}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold rounded-md hover:shadow-lg transition-all">
              Ir a configuración ahora
            </button>
            <button onClick={onBack}
              className="px-6 py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">
              Volver a inicio
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <ConfiguracionModule
      username={userName}
      pantallaInicial="menu"
      onClose={onBack}
      onLogout={() => window.location.reload()}
      avatarIndex={avatarIndex}
    />
  );
}

