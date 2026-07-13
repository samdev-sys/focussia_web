import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LayoutDashboard, BookOpen, Settings, Sparkles, Play, ArrowRight,
  ChevronRight, ChevronLeft, X, Heart, Target, Calendar, CheckSquare,
  Clock, Sun, Users, MessageSquare, Bell, Shield, CreditCard, Volume2,
  Sliders, Smartphone, EyeOff, Eye, Star, Check, SkipForward,
} from 'lucide-react';
import { authService, configuracionService } from '../services/api';
import { AVATAR_FILES } from '../constants/avatars';

const SECTIONS_DATA = [
  { id: 'planificacion', icon: Target, color: 'from-purple-400 to-indigo-500', label: 'Planificación', desc: 'Rueda de la vida, Matriz, Meta anual, Objetivos mensuales/semanales/diarios' },
  { id: 'ejecucion', icon: CheckSquare, color: 'from-emerald-400 to-teal-500', label: 'Ejecución diaria', desc: 'Agenda, Time Blocking, Mi misión de hoy, Kanban, Delegaciones, Recordatorios' },
  { id: 'bienestar', icon: Heart, color: 'from-pink-400 to-rose-500', label: 'Bienestar', desc: 'Gratitud, Hora de oro familiar, Clima, Estado de ánimo, Medicamentos, Humor, Hobbies, Deportes' },
  { id: 'herramientas', icon: Star, color: 'from-amber-400 to-orange-500', label: 'Herramientas personales', desc: 'Cursos, RRSS, Cuentas, Coaching, Tribu, Notas' },
  { id: 'configuracion', icon: Sliders, color: 'from-slate-400 to-gray-600', label: 'Configuración', desc: 'Ajustes del sistema y perfil' },
  { id: 'reportes', icon: Sparkles, color: 'from-cyan-400 to-blue-500', label: 'Reportes', desc: 'Visualización de progreso e indicadores' },
];

const TOUR_STEPS = [
  { zone: 'Barra superior', desc: 'Aquí encuentras tu avatar, notificaciones y acceso directo a configuración.' },
  { zone: 'Saludo del avatar', desc: 'Tu acompañante Focusia te da la bienvenida cada vez que ingresas.' },
  { zone: 'Misión de hoy', desc: 'Espacio para definir tu objetivo principal del día.' },
  { zone: 'Fechas importantes', desc: 'Calendario mensual con tus eventos y recordatorios.' },
  { zone: 'Rueda de la vida', desc: 'Evalúa tu balance en salud, finanzas y relaciones.' },
  { zone: 'Meta anual', desc: 'Tu gran objetivo del año, el norte estratégico de todo.' },
  { zone: 'Objetivos mensuales', desc: 'Desglose mensual de tu meta anual.' },
  { zone: 'Objetivo de la semana', desc: 'Define el foco semanal para mantener la dirección.' },
  { zone: 'Métricas de ejecución', desc: 'Horas planificadas vs completadas en tiempo real.' },
  { zone: 'Keep / Notas rápidas', desc: 'Captura ideas al vuelo sin interrumpir tu flujo.' },
  { zone: 'Agenda - Time blocking', desc: 'Bloques horarios con tareas asignadas a cada hora.' },
  { zone: 'Columnas Kanban', desc: 'Tablero visual: Pendientes, En progreso, Hecho.' },
  { zone: 'Delegaciones pendientes', desc: 'Tareas que has delegado a otros miembros del equipo.' },
  { zone: 'Matriz Eisenhower', desc: 'Clasifica tareas por urgencia e importancia.' },
  { zone: 'Facturas / Gastos', desc: 'Control de pagos y facturación mensual.' },
  { zone: 'Workspaces activos', desc: 'Tus espacios de trabajo colaborativo.' },
  { zone: 'Miembros del equipo', desc: 'Personas con las que compartes workspace.' },
  { zone: 'Recordatorios', desc: 'Alertas configuradas para medicamentos, cumpleaños, etc.' },
  { zone: 'Buzón de propuestas IA', desc: 'Aquí llegan las sugerencias inteligentes de Focusia.' },
  { zone: 'Configuración de IA', desc: 'Ajusta el tono, intensidad y canales del coach.' },
  { zone: 'Activaciones', desc: 'Alertas adaptativas que Focusia programa para ti.' },
  { zone: 'Notificaciones', desc: 'Historial de alertas e invitaciones.' },
  { zone: 'Reportes y analytics', desc: 'Visualiza tu progreso y tendencias en tiempo real.' },
  { zone: 'Menú de perfil', desc: 'Edita tu foto, nombre y datos de cuenta.' },
  { zone: 'Sección de bienestar', desc: 'Gratitud, Hora de oro, Estado de ánimo, Medicamentos, Humor, Hobbies y Deportes — el cierre del recorrido.' },
];

const PROACTIVE_MESSAGES = [
  'Puedes comenzar entrando al dashboard completo — ahí tendrás todo tu ecosistema productivo.',
  'Si prefieres orientarte primero, el tutorial te muestra cada bloque paso a paso.',
  'Recuerda que puedes ajustar todo desde Configuración cuando lo necesites.',
];

interface PostOnboardingHubProps {
  onGoToDashboard: () => void;
  onComplete: () => void;
}

export default function PostOnboardingHub({ onGoToDashboard, onComplete }: PostOnboardingHubProps) {
  const [screen, setScreen] = useState<'loading' | 'video' | 'decision' | 'tutorial' | 'config' | 'tour'>('loading');
  const [userName, setUserName] = useState('');
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [showConfigVideo, setShowConfigVideo] = useState(true);
  const [hubEntryCount, setHubEntryCount] = useState(0);
  const [showProactive, setShowProactive] = useState(false);
  const [guidedTourStarted, setGuidedTourStarted] = useState(false);
  const sectionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    authService.getCurrentUser().then(async u => {
      setUserName(u.username);
      const config = await configuracionService.getMiConfig();
      setAvatarIndex(config.avatar_index || 0);
      if (!config.video_inicial_visto) {
        setScreen('video');
      } else {
        setScreen('decision');
      }
      await configuracionService.updateMiConfig({ ultimo_ingreso: new Date().toISOString() });
    });
    fetch('/api/usuario/registrar-ingreso/', { method: 'POST', credentials: 'include' })
      .then(r => r.json())
      .then(d => setHubEntryCount(d.conteo_ingresos || 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (screen === 'decision' && hubEntryCount >= 3) {
      const t = setTimeout(() => setShowProactive(true), 1500);
      return () => clearTimeout(t);
    }
  }, [screen, hubEntryCount]);

  const handleVideoEnd = useCallback(() => {
    setScreen('decision');
    fetch('/api/usuario/marcar-video-visto/', { method: 'POST', credentials: 'include' }).catch(() => {});
  }, []);

  if (screen === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-[#F4F4F7]"><div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (screen === 'video') {
    return <VideoExplicativo onEnd={handleVideoEnd} userName={userName} />;
  }

  if (screen === 'tour') {
    return <GuidedTour onFinish={() => setScreen('tutorial')} />;
  }

  return (
    <div className="min-h-screen bg-[#F4F4F7] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 right-20 w-72 h-72 bg-purple-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-pink-200/20 rounded-full blur-3xl" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          {avatarIndex > 0 && (
            <img src={AVATAR_FILES[avatarIndex]} alt="avatar" className="w-10 h-10 rounded-md object-cover border-2 border-purple-200" />
          )}
          <div>
            <p className="text-lg font-bold text-gray-800">Focusia</p>
            <p className="text-xs text-gray-400">Acompañante estratégico</p>
          </div>
        </div>
        <button onClick={onGoToDashboard} className="flex items-center gap-2 px-4 py-2 bg-white/70 border border-gray-200 rounded-md text-sm font-medium text-gray-600 hover:bg-white hover:shadow-md transition-all">
          Ir al Dashboard <ArrowRight className="w-4 h-4" />
        </button>
      </header>

      {screen === 'decision' && <PantallaDecision userName={userName} avatarIndex={avatarIndex} onGoDashboard={() => { fetch('/api/telemetria/interaccion/', { method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify({tipo:'hub_to_dashboard', metadata:{}}) }).catch(() => {}); onGoToDashboard(); }} onGoTutorial={() => setScreen('tutorial')} onGoConfig={() => { setShowConfigVideo(true); setScreen('config'); }} showProactive={showProactive} proactiveMsg={PROACTIVE_MESSAGES[Math.min(hubEntryCount - 3, PROACTIVE_MESSAGES.length - 1)]} />}

      {screen === 'tutorial' && <TutorialScreen userName={userName} avatarIndex={avatarIndex} onShowVideo={() => setScreen('video')} onStartTour={() => { setGuidedTourStarted(true); fetch('/api/telemetria/interaccion/', { method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify({tipo:'guided_tour_started', metadata:{}}) }).catch(() => {}); setScreen('tour'); }} onBack={() => setScreen('decision')} sectionsRef={sectionsRef} />}

      {screen === 'config' && <ConfigScreen userName={userName} avatarIndex={avatarIndex} showVideo={showConfigVideo} onDismissVideo={() => setShowConfigVideo(false)} onBack={() => setScreen('decision')} />}
    </div>
  );
}

function VideoExplicativo({ onEnd, userName }: { onEnd: () => void; userName: string }) {
  const [step, setStep] = useState(0);
  const segments = [
    { icon: Heart, text: 'Focusia empieza conociendo tu equilibrio en la Rueda de la Vida.', sub: 'Salud, relaciones y propósito como base de todo.' },
    { icon: Target, text: 'Contigo, define una Meta Anual clara y la desglosa en objetivos.', sub: 'Cada mes, cada semana, cada día — todo conectado.' },
    { icon: Clock, text: 'Organiza tu día con Time Blocking y el tablero Kanban.', sub: 'Saber qué hacer y cuándo hacerlo elimina la fricción.' },
    { icon: Sparkles, text: 'Y cuando pierdes el rumbo, la IA adaptativa interviene.', sub: 'Sin juzgar. Solo para devolverte la perspectiva estratégica.' },
  ];

  useEffect(() => {
    if (step >= segments.length) {
      const t = setTimeout(onEnd, 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep(s => s + 1), 12000 / segments.length);
    return () => clearTimeout(t);
  }, [step, onEnd]);

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
        <button onClick={onEnd} className="mt-6 text-sm text-purple-300/60 hover:text-purple-200 transition-colors flex items-center gap-1 mx-auto">
          Saltar <SkipForward className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function PantallaDecision({ userName, avatarIndex, onGoDashboard, onGoTutorial, onGoConfig, showProactive, proactiveMsg }: {
  userName: string; avatarIndex: number; onGoDashboard: () => void; onGoTutorial: () => void; onGoConfig: () => void; showProactive?: boolean; proactiveMsg?: string;
}) {
  return (
    <main className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-6">
      {showProactive && proactiveMsg && (
        <div className="mb-6 max-w-md w-full bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-md p-4 animate-fade-in shadow-sm">
          <div className="flex items-start gap-3">
            {avatarIndex > 0 && <img src={AVATAR_FILES[avatarIndex]} alt="" className="w-8 h-8 rounded-md object-cover mt-0.5" />}
            <p className="text-sm text-gray-700 leading-relaxed">{proactiveMsg}</p>
          </div>
        </div>
      )}
      <div className="flex flex-col items-center mb-10">
        {avatarIndex > 0 && (
          <img src={AVATAR_FILES[avatarIndex]} alt="avatar" className="w-24 h-24 rounded-md object-cover border-2 border-purple-200 shadow-lg mb-4" />
        )}
        <p className="text-sm text-purple-500 font-medium mb-1">Ya estamos listos,</p>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800">{userName}.</h1>
        <p className="text-lg text-gray-500 mt-1">¿Dónde quieres ir?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl">
        <DecisionCard icon={LayoutDashboard} title="Ir al Dashboard Completo" desc="Acceso directo a tu tablero de productividad" color="from-purple-500 to-indigo-500" onClick={onGoDashboard} />
        <DecisionCard icon={BookOpen} title="Ir al Tutorial" desc="Aprende el ecosistema Focusia a tu ritmo" color="from-emerald-500 to-teal-500" onClick={onGoTutorial} />
        <DecisionCard icon={Settings} title="Ir a Configuración" desc="Personaliza tu experiencia" color="from-amber-500 to-orange-500" onClick={onGoConfig} />
      </div>
    </main>
  );
}

function DecisionCard({ icon: Icon, title, desc, color, onClick }: {
  icon: React.ComponentType<{ className?: string }>; title: string; desc: string; color: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="group bg-white/80 backdrop-blur-sm border border-white/60 rounded-md p-6 text-left shadow-sm hover:shadow-xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]">
      <div className={`w-12 h-12 bg-gradient-to-br ${color} rounded-md flex items-center justify-center mb-4 shadow-md group-hover:shadow-lg transition-shadow`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="font-bold text-gray-800 mb-1">{title}</h3>
      <p className="text-xs text-gray-500">{desc}</p>
    </button>
  );
}

function TutorialScreen({ userName, avatarIndex, onShowVideo, onStartTour, onBack, sectionsRef }: {
  userName: string; avatarIndex: number; onShowVideo: () => void; onStartTour: () => void; onBack: () => void; sectionsRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <main className="relative z-10 max-w-3xl mx-auto px-6 py-8">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Volver
      </button>

      <div className="flex items-center gap-4 mb-8">
        {avatarIndex > 0 && <img src={AVATAR_FILES[avatarIndex]} alt="avatar" className="w-14 h-14 rounded-md object-cover border-2 border-purple-200" />}
        <div>
          <p className="text-lg font-bold text-gray-800">Tranquilo, {userName}.</p>
          <p className="text-sm text-gray-500">No necesitas aprender todo de una vez.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <button onClick={onShowVideo} className="bg-white/80 border border-white/60 rounded-md p-5 text-left shadow-sm hover:shadow-md transition-all hover:scale-[1.02]">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-md flex items-center justify-center mb-3">
            <Play className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-bold text-gray-800 text-sm mb-1">Ver video inicial</h3>
          <p className="text-xs text-gray-400">Reproduce el clip conceptual de Focusia</p>
        </button>

        <button onClick={() => { fetch('/api/telemetria/interaccion/', { method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify({tipo:'sections_clicked', metadata:{}}) }).catch(() => {}); sectionsRef?.current?.scrollIntoView({ behavior: 'smooth' }); }} className="bg-white/80 border border-white/60 rounded-md p-5 text-left shadow-sm hover:shadow-md transition-all hover:scale-[1.02]">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-md flex items-center justify-center mb-3">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-bold text-gray-800 text-sm mb-1">Aprender por secciones</h3>
          <p className="text-xs text-gray-400">Explora 6 categorías del ecosistema</p>
        </button>

        <button onClick={onStartTour} className="bg-white/80 border border-white/60 rounded-md p-5 text-left shadow-sm hover:shadow-md transition-all hover:scale-[1.02]">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-400 rounded-md flex items-center justify-center mb-3">
            <Star className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-bold text-gray-800 text-sm mb-1">Iniciar visita guiada</h3>
          <p className="text-xs text-gray-400">Recorrido automatizado de 25 bloques</p>
        </button>
      </div>

      <h3 ref={sectionsRef} className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Aprender por secciones</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {SECTIONS_DATA.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.id} className="bg-white/70 border border-gray-100 rounded-md p-4 hover:shadow-md transition-shadow cursor-default">
              <div className={`w-8 h-8 bg-gradient-to-br ${s.color} rounded-md flex items-center justify-center mb-2`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <h4 className="font-bold text-gray-800 text-xs mb-1">{s.label}</h4>
              <p className="text-[10px] text-gray-400 leading-relaxed">{s.desc}</p>
            </div>
          );
        })}
      </div>
    </main>
  );
}

function GuidedTour({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState(0);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (step >= TOUR_STEPS.length) {
      if (!finishedRef.current) {
        finishedRef.current = true;
        fetch('/api/telemetria/interaccion/', { method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify({tipo:'guided_tour_completed', metadata:{pasos: TOUR_STEPS.length}}) }).catch(() => {});
      }
      return;
    }
    const t = setTimeout(() => setStep(s => s + 1), 3000);
    return () => clearTimeout(t);
  }, [step]);

  const handleSkip = useCallback(() => {
    if (!finishedRef.current) {
      fetch('/api/telemetria/interaccion/', { method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify({tipo:'guided_tour_abandoned', metadata:{paso_actual: step, total_pasos: TOUR_STEPS.length}}) }).catch(() => {});
    }
    onFinish();
  }, [onFinish, step]);

  if (step >= TOUR_STEPS.length) {
    return (
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-400 to-teal-500 rounded-md flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Visita completada</h2>
          <p className="text-sm text-gray-500 mb-6">Ya conoces las zonas principales de Focusia. Este recorrido concluye en la sección de Bienestar — el resto lo descubrirás explorando.</p>
          <button onClick={onFinish} className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold rounded-md hover:shadow-lg transition-all">
            Volver al inicio
          </button>
        </div>
      </main>
    );
  }

  const s = TOUR_STEPS[step];
  return (
    <main className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-6">
      <div className="bg-white/90 backdrop-blur-md border border-white/60 rounded-md shadow-2xl p-8 max-w-lg w-full">
        <div className="flex items-center gap-2 mb-6">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full transition-all" style={{ width: `${((step + 1) / TOUR_STEPS.length) * 100}%` }} />
          </div>
          <span className="text-xs text-gray-400 font-medium">{step + 1}/{TOUR_STEPS.length}</span>
        </div>

        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-400 to-pink-400 rounded-md flex items-center justify-center mb-5 shadow-lg">
          <span className="text-2xl font-bold text-white">{step + 1}</span>
        </div>

        <h3 className="text-xl font-bold text-gray-800 text-center mb-2">{s.zone}</h3>
        <p className="text-sm text-gray-500 text-center leading-relaxed">{s.desc}</p>

        <div className="flex items-center justify-center gap-3 mt-8">
          {step > 0 && <button onClick={() => setStep(s => s - 1)} className="px-4 py-2 border border-gray-200 rounded-md text-sm text-gray-500 hover:bg-white transition-colors">Anterior</button>}
          {step < TOUR_STEPS.length - 1 && <button onClick={() => setStep(s => s + 1)} className="px-4 py-2 bg-purple-500 text-white rounded-md text-sm font-medium hover:bg-purple-600 transition-colors">Siguiente</button>}
          <button onClick={handleSkip} className="px-4 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors">Saltar</button>
        </div>
      </div>
    </main>
  );
}

function ConfigScreen({ userName, avatarIndex, showVideo, onDismissVideo, onBack }: {
  userName: string; avatarIndex: number; showVideo: boolean; onDismissVideo: () => void; onBack: () => void;
}) {
  const [showCategories, setShowCategories] = useState(!showVideo);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    if (showVideo) {
      const t = setTimeout(() => { onDismissVideo(); setShowCategories(true); }, 8000);
      return () => clearTimeout(t);
    }
  }, [showVideo, onDismissVideo]);

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
          <button onClick={() => { onDismissVideo(); setShowCategories(true); }} 
            className="mt-6 text-sm text-purple-500 hover:text-purple-700 font-medium transition-colors">
            Ir a configuración ahora →
          </button>
        </div>
      </main>
    );
  }

  const CATEGORIES = [
    { id: 'avatar', icon: Volume2, title: 'Avatar', desc: 'Cambiar avatar y probar voces', color: 'from-purple-400 to-pink-400' },
    { id: 'acompanamiento', icon: Sliders, title: 'Acompañamiento', desc: 'Intensidad, tono y tipo de apoyo', color: 'from-emerald-400 to-teal-400' },
    { id: 'notificaciones', icon: Bell, title: 'Notificaciones', desc: 'App, Push, WhatsApp, Llamadas', color: 'from-blue-400 to-cyan-400' },
    { id: 'horarios', icon: Clock, title: 'Horarios', desc: 'Ventanas con excepciones restrictivas', color: 'from-amber-400 to-orange-400' },
    { id: 'privacidad', icon: Shield, title: 'Privacidad', desc: 'Gestión de datos, exportación y borrado', color: 'from-rose-400 to-red-400' },
    { id: 'cuenta', icon: CreditCard, title: 'Cuenta', desc: 'Datos administrativos y suscripción', color: 'from-slate-400 to-gray-500' },
  ];

  if (activeCategory) {
    const cat = CATEGORIES.find(c => c.id === activeCategory);
    return (
      <main className="relative z-10 max-w-xl mx-auto px-6 py-8">
        <button onClick={() => setActiveCategory(null)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-6">
          <ChevronLeft className="w-4 h-4" /> Categorías
        </button>
        <div className="bg-white/80 border border-white/60 rounded-md p-6 shadow-sm">
          <div className={`w-10 h-10 bg-gradient-to-br ${cat?.color} rounded-md flex items-center justify-center mb-3`}>
            {cat && <cat.icon className="w-5 h-5 text-white" />}
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">{cat?.title}</h3>
          <p className="text-sm text-gray-500 mb-4">{cat?.desc}</p>
          <div className="bg-gray-50 rounded-md p-4 text-center">
            <p className="text-xs text-gray-400">Panel de {cat?.title?.toLowerCase()} — disponible desde Configuración en el Dashboard.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative z-10 max-w-3xl mx-auto px-6 py-8">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-6">
        <ChevronLeft className="w-4 h-4" /> Volver
      </button>

      <h2 className="text-2xl font-bold text-gray-800 mb-2">Configuración</h2>
      <p className="text-sm text-gray-500 mb-8">Selecciona una categoría para personalizar</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CATEGORIES.map(c => {
          const Icon = c.icon;
          return (
            <button key={c.id} onClick={() => setActiveCategory(c.id)}
              className="bg-white/80 border border-white/60 rounded-md p-5 text-left shadow-sm hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]">
              <div className={`w-10 h-10 bg-gradient-to-br ${c.color} rounded-md flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-gray-800 text-sm mb-1">{c.title}</h3>
              <p className="text-xs text-gray-400">{c.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3 mt-8">
        <button onClick={onBack} className="px-6 py-2.5 border border-gray-200 rounded-md text-sm text-gray-500 hover:bg-white transition-colors">Volver a inicio</button>
        <button onClick={() => {}} className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold rounded-md hover:shadow-lg transition-all">
          Ir a Configuración ahora
        </button>
      </div>
    </main>
  );
}
