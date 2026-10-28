import React, { useState, useEffect } from 'react';
import {
  Home, CircleDot, LayoutGrid, Calendar, CalendarDays, Kanban,
  CalendarRange, CalendarCheck, Target, Clock, Pill, Cake,
  UserCheck, MessageSquare, Heart, Smile, GraduationCap, MoreHorizontal,
  Bell, Settings, Moon, ChevronDown, ChevronLeft, Sun, Lock, Send,
  ChevronRight, Sparkles, Check,
} from 'lucide-react';
import { NAV_ICONS } from './navIcons';
import { coachingService, CoachingEntryData, CoachingQuestionData, notificationService, NotificationData, authService, configService } from '../services/api';
import { AVATAR_FILES, AVATAR_VARIACIONES } from '../constants/avatars';
import { ConfiguracionPanel } from './ConfiguracionPanel';

const NavItem = ({ icon: Icon, label, active = false, onClick }: { icon: any; label: string; active?: boolean; onClick?: () => void }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors w-full text-left ${
      active
        ? 'text-white bg-gradient-to-r from-[#6236FF] to-[#8A2BE2] shadow-md'
        : 'text-white/60 hover:text-white hover:bg-white/5'
    }`}
  >
    <Icon className="w-5 h-5 text-center shrink-0" />
    <span className="truncate">{label}</span>
  </button>
);

const Sidebar = ({ onNav, userName, photoUrl, profile, onLogout, onBack }: { onNav: (section: string) => void; userName?: string; photoUrl?: string | null; profile?: { username?: string; email?: string } | null; onLogout: () => void; onBack: () => void }) => {
  const [showProfile, setShowProfile] = useState(false);
  const navItems = [
    { icon: Home, label: 'Inicio', section: 'inicio' },
    { icon: CircleDot, label: 'Rueda', section: 'rueda' },
    { icon: LayoutGrid, label: 'Matriz', section: 'matriz' },
    { icon: Calendar, label: 'Anual', section: 'anual' },
    { icon: CalendarDays, label: 'Mensual', section: 'mensual' },
    { icon: Kanban, label: 'Kanban', section: 'kanban' },
    { icon: CalendarRange, label: 'Semanal', section: 'semanal' },
    { icon: CalendarCheck, label: 'Diaria', section: 'diaria' },
    { icon: NAV_ICONS.delegar, label: 'Delegar', section: 'delegar' },
    { icon: Target, label: 'Misión', section: 'mision' },
    { icon: Clock, label: 'Fechas', section: 'fechas' },
    { icon: Pill, label: 'Suplementos', section: 'suplementos' },
    { icon: Cake, label: 'Cumpleaños', section: 'cumple' },
    { icon: UserCheck, label: 'Tribu', section: 'tribu' },
    { icon: MessageSquare, label: 'Coaching', active: true, section: 'coaching' },
    { icon: Heart, label: 'Gratitud', section: 'gratitud' },
    { icon: Smile, label: 'Focus', section: 'focus' },
    { icon: GraduationCap, label: 'Cursos', section: 'cursos' },
  ];

  return (
    <aside className="w-64 bg-[#0A0A26] h-full flex flex-col transition-all duration-300 z-20 shrink-0">
      <div className="h-16 flex items-center px-6 pt-4 pb-2">
        <div className="flex items-center gap-3 text-white">
         <img src="./focussia.png" alt="Focusia" className='w-8 h-8' />
          <span className="text-xl font-bold tracking-wide">Focusia</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
        {navItems.map((item, index) => (
          <NavItem key={index} {...item} onClick={() => onNav(item.section)} />
        ))}
        <NavItem icon={MoreHorizontal} label="Más" onClick={() => {}} />
      </nav>

      <div className="p-4 relative">
        <button onClick={() => setShowProfile(v => !v)} className="flex items-center w-full p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
          <span className="relative w-10 h-10 shrink-0">
            <span className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-sm font-bold">
              {userName?.[0]?.toUpperCase() || 'U'}
            </span>
            {photoUrl && (
              <img src={photoUrl} alt={userName || 'Usuario'} className="absolute inset-0 w-full h-full rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}
          </span>
          <div className="ml-3 text-left flex-1">
            <p className="text-sm font-semibold text-white">{userName || 'Usuario'}</p>
            <p className="text-xs text-white/50">Ver perfil</p>
          </div>
          <ChevronDown className="w-4 h-4 text-white/50" />
        </button>
        {showProfile && (
          <div className="absolute left-4 right-4 bottom-full mb-2">
            <ProfileMenu
              profile={profile}
              userName={userName}
              onBack={() => { setShowProfile(false); onBack(); }}
              onLogout={() => { setShowProfile(false); onLogout(); }}
              onClose={() => setShowProfile(false)}
            />
          </div>
        )}
      </div>
    </aside>
  );
};

function ProfileMenu({ profile, userName, onBack, onLogout, onClose }: {
  profile?: { username?: string; email?: string } | null;
  userName?: string; onBack: () => void; onLogout: () => void; onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="relative z-50 bg-white dark:bg-[#1a1a3a] rounded-xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
        <div className="px-4 py-4 bg-gradient-to-r from-[#6236FF] to-[#8A2BE2] text-white">
          <p className="font-bold">{profile?.username || userName || 'Usuario'}</p>
          {profile?.email && <p className="text-xs text-white/70 mt-0.5">{profile.email}</p>}
        </div>
        <button onClick={onBack} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
          Volver al Dashboard
        </button>
        <button onClick={onLogout} className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
          Cerrar sesión
        </button>
      </div>
    </>
  );
}

const Header = ({ onBack, userName, photoUrl, profile, onLogout }: { onBack: () => void; userName?: string; photoUrl?: string | null; profile?: { username?: string; email?: string } | null; onLogout: () => void }) => {
  const [dark, setDark] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('focusia-theme') === 'dark');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [showConfig, setShowConfig] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try { localStorage.setItem('focusia-theme', dark ? 'dark' : 'light'); } catch {}
  }, [dark]);

  const toggleNotifications = async () => {
    if (!showNotifications) {
      try {
        setNotifications(await notificationService.getAll());
      } catch {}
    }
    setShowNotifications(v => !v);
  };

  return (
  <header className="h-20 flex items-center justify-between px-8 bg-white dark:bg-[#14142e] border-b border-gray-100 dark:border-white/10 shrink-0 z-10">
    <div className="flex items-center gap-4">
      <button
        onClick={onBack}
        title="Volver al Dashboard"
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-[#6236FF] hover:bg-purple-50 dark:hover:bg-white/10 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        
      </button>
      <div className="w-10 h-10 rounded-xl bg-[#F3F0FF] dark:bg-white/10 flex items-center justify-center text-[#6236FF] dark:text-purple-300">
        <MessageSquare className="w-5 h-5" />
      </div>
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[#6236FF] to-[#8A2BE2] bg-clip-text text-transparent">
          Coaching
        </h1>
        <p className="text-sm text-slate-500 dark:text-gray-400">Reflexiona hoy. Decide tu acción. Mañana ejecútala.</p>
      </div>
    </div>

    <div className="flex items-center gap-6">
      <div className="relative">
        <button onClick={toggleNotifications} title="Notificaciones" className="relative text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-0.5 bg-[#6236FF] text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-[#14142e]">
              {notifications.length > 9 ? '9+' : notifications.length}
            </span>
          )}
        </button>
        {showNotifications && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
            <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-white dark:bg-[#1a1a3a] rounded-xl shadow-2xl border border-gray-100 dark:border-white/10 z-50">
              <p className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-white/10">
                Notificaciones
              </p>
              {notifications.length === 0 ? (
                <p className="px-4 py-6 text-sm text-gray-400 dark:text-gray-500 text-center">Sin notificaciones.</p>
              ) : notifications.map(n => (
                <div key={n.id} className="px-4 py-3 border-b border-gray-50 dark:border-white/5 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{n.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <button onClick={() => setShowConfig(true)} title="Configuración" className="text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white transition-colors">
        <Settings className="w-5 h-5" />
      </button>

      <button onClick={() => setDark(v => !v)} title={dark ? 'Modo claro' : 'Modo oscuro'} className="text-gray-500 dark:text-amber-300 hover:text-gray-700 dark:hover:text-amber-200 transition-colors">
        {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <div className="relative">
        <div onClick={() => setShowProfile(true)} className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-white/10 cursor-pointer">
          <span className="relative w-8 h-8 shrink-0">
            <span className="absolute inset-0 rounded-full border border-gray-200 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold">
              {userName?.[0]?.toUpperCase() || 'U'}
            </span>
            {photoUrl && (
              <img src={photoUrl} alt={userName || 'Usuario'} className="absolute inset-0 w-full h-full rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}
          </span>
          <span className="text-sm font-medium text-slate-800 dark:text-gray-100">{userName || 'Usuario'}</span>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>
        {showProfile && (
          <div className="absolute right-0 top-full mt-2 w-64">
            <ProfileMenu
              profile={profile}
              userName={userName}
              onBack={() => { setShowProfile(false); onBack(); }}
              onLogout={() => { setShowProfile(false); onLogout(); }}
              onClose={() => setShowProfile(false)}
            />
          </div>
        )}
      </div>
    </div>
    <ConfiguracionPanel isOpen={showConfig} onClose={() => setShowConfig(false)} />
  </header>
  );
};

const TimelineSidebar = () => {
  const steps = [
    {
      title: 'Aprendiste',
      desc: 'Hoy recibiste conocimiento a través de tu capacitación y frase diaria.',
      icon: GraduationCap,
      bg: 'bg-purple-50',
      color: 'text-[#6236FF]',
    },
    {
      title: 'Reflexionaste',
      desc: 'Tomaste un momento para pensar en lo que realmente importa.',
      icon: MessageSquare,
      bg: 'bg-blue-50',
      color: 'text-blue-500',
    },
    {
      title: 'Decidiste',
      desc: 'Definiste la acción más importante para acercarte a tu Gran Meta Anual.',
      icon: Target,
      bg: 'bg-green-50',
      color: 'text-green-500',
    },
    {
      title: 'Mañana lo ejecutarás',
      desc: 'Tu acción será parte de tu Agenda Diaria del día siguiente.',
      icon: Calendar,
      bg: 'bg-orange-50',
      color: 'text-orange-500',
    },
  ];

  return (
    <aside className="w-full xl:w-[250px] h-200 shrink-0 bg-white dark:bg-[#14142e] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 self-start -ml-20">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
        Tu ruta de hoy
      </h3>
      <div className="w-10 h-[3px] bg-[#6236FF] rounded-full mt-1 mb-8" />

      <div className="relative pl-6 space-y-10">
        <div className="absolute left-[1.15rem] top-2 bottom-6 w-px border-l border-dashed border-gray-300 dark:border-white/15" />

        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div key={idx} className="relative">
              <div className={`absolute -left-10 w-10 h-10 rounded-full ${step.bg} dark:bg-white/10 flex items-center justify-center border-4 border-white dark:border-[#14142e] shadow-sm z-10`}>
                <Icon className={`w-4 h-4 ${step.color} dark:text-purple-300`} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-sm">{step.title}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 bg-[#F3F0FF] dark:bg-[#1a1440] p-9 rounded-xl border border-purple-100 dark:border-white/10 relative">
        <span className="block text-3xl leading-none text-[#6236FF] dark:text-purple-300 font-serif font-bold mb-1">“</span>
        <p className="text-sm text-gray-700 dark:text-gray-200 font-medium leading-relaxed">
          La claridad en tus decisiones hoy construye los resultados que deseas mañana.
        </p>
      </div>
    </aside>
  );
};

export default function CoachingScreen({ onBack, userName, onNavigate }: { onBack: () => void; userName?: string; onNavigate?: (section: string) => void }) {
  const [reflection, setReflection] = useState('');
  const [action, setAction] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [agendaConfirmed, setAgendaConfirmed] = useState(false);
  const [savingReflection, setSavingReflection] = useState(false);
  const [question, setQuestion] = useState<CoachingQuestionData | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ username?: string; email?: string } | null>(null);

  useEffect(() => {
    // Foto y perfil del usuario: foto de perfil → avatar elegido en onboarding → inicial.
    authService.getCurrentUser().then(u => {
      if (!u) return;
      setProfile({ username: u.username, email: u.email });
      if (u?.avatar_url) { setPhotoUrl(u.avatar_url); return; }
      return configService.getAvatar().then(a => {
        const id = a.current_avatar_id ?? 0;
        if (id > 0) setPhotoUrl(AVATAR_VARIACIONES[id] || AVATAR_FILES[id] || null);
      });
    }).catch(() => {});
  }, []);

  const handleLogout = async () => {
    try { await authService.logout(); } catch {}
    window.location.reload();
  };

  useEffect(() => {
    coachingService.getToday().then(entry => {
      if (entry) {
        setReflection(entry.reflection || '');
        setAction(entry.decision || '');
        setAgendaConfirmed(entry.decision_added_to_agenda);
      }
    }).catch(() => {});
    coachingService.getQuestion().then(setQuestion).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (reflection.trim()) {
        setSavingReflection(true);
        coachingService.submitReflection(reflection).then(() => {
          setSavingReflection(false);
        }).catch(() => setSavingReflection(false));
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [reflection]);

  const canDecide = reflection.trim().length > 0;

  const handleSubmit = async () => {
    if (!action.trim() || !canDecide) return;
    setSending(true);
    try {
      const result = await coachingService.submitDecision(action);
      setAgendaConfirmed(result.decision_added_to_agenda);
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch {
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    }
    setSending(false);
  };

  const handleNav = (section: string) => {
    if (section === 'coaching') return;
    if (onNavigate) {
      onNavigate(section);
      return;
    }
    onBack();
  };

  return (
    <div className="flex h-full overflow-hidden text-slate-800 dark:text-gray-100 bg-[#F8F9FB] dark:bg-[#0A0A26]">
      {showSidebar && <Sidebar onNav={handleNav} userName={userName} photoUrl={photoUrl} profile={profile} onLogout={handleLogout} onBack={onBack} />}

      <main className={`flex-1 flex flex-col h-full overflow-hidden bg-[#F8F9FB] dark:bg-[#0A0A26] ${showSidebar ? 'rounded-tl-[2rem] border-l border-gray-200 dark:border-white/10' : ''}`}>
        <Header onBack={onBack} userName={userName} photoUrl={photoUrl} profile={profile} onLogout={handleLogout} />

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-[1400px] mx-auto flex flex-col xl:flex-row gap-8">
            {/* Columna Izquierda */}
            <div className="flex-1 flex flex-col gap-6">
              {/* Hero Banner */}
              <section className="relative h-[280px] rounded-xl overflow-hidden shadow-sm w-180">
                <img
                  src="coaching.jpeg"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute top-1/2 -translate-y-1/2 left-8 bg-white/95 dark:bg-[#1a1a3a]/95 backdrop-blur-sm p-8 rounded-xl max-w-[450px] shadow-lg border border-gray-100 dark:border-white/10">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 dark:bg-white/10 text-[#6236FF] dark:text-purple-300 text-xs font-semibold rounded-full mb-4">
                    <Sparkles className="w-3.5 h-3.5" />
                    {question?.es_integracion ? 'Pregunta de integración' : 'Pregunta de hoy'}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight mb-6 font-serif">
                    {question?.pregunta || '¿Qué aprendizaje de hoy puede acercarte un paso más a tu Gran Meta Anual?'}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300 border-t border-gray-200 dark:border-white/10 pt-4">
                    Reflexiona con honestidad. Este es tu espacio.
                  </p>
                </div>
              </section>

              {/* Paso 1: Reflexión */}
              <div>
                <section className="bg-white dark:bg-[#14142e] p-2 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 w-180 h-[250px]">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-8 h-8 rounded-full bg-[#6236FF] text-white flex items-center justify-center font-bold shrink-0 mt-1">
                    1
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Tu reflexión personal</h3>
                    <p className="text-sm text-slate-500 dark:text-gray-400">Escribe con honestidad, sin filtros. Este es tu espacio.</p>
                  </div>
                </div>
                <div className="ml-12 relative">
                  <textarea
                    maxLength={3000}
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    className="w-full h-32 p-4 bg-white dark:bg-[#0A0A26] text-slate-800 dark:text-gray-100 border border-purple-200 dark:border-white/15 rounded-xl resize-none focus:ring-2 focus:ring-[#6236FF] focus:outline-none transition-all placeholder-gray-400 dark:placeholder-gray-500 text-sm"
                    placeholder="Escribe aquí tu reflexión de hoy..."
                  />
                  <div className="absolute bottom-3 right-4 text-xs text-gray-400">
                    {reflection.length}/3000
                  </div>
                </div>
                <div className="ml-12 mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Lock className="w-3.5 h-3.5 text-gray-400" />
                  <span>{savingReflection ? 'Guardando...' : 'Tu respuesta se guarda automáticamente.'}</span>
                  <span className={`w-2 h-2 rounded-full ${savingReflection ? 'bg-amber-500' : 'bg-green-500'} ml-1`} />
                </div>
              </section>
</div>
              
              {/* Separador */}
              <div className="relative flex items-center justify-center -my-2 z-10 w-180">
                <div className="w-full border-t border-gray-200 dark:border-white/10 absolute" />
                <div className="w-8 h-8 bg-white dark:bg-[#14142e] border border-purple-200 dark:border-white/15 rounded-full flex items-center justify-center text-[#6236FF] dark:text-purple-300 relative shadow-sm">
                  <Check className="w-4 h-4" strokeWidth={3} />
                </div>
              </div>

              {/* Paso 2: Decisión (se habilita tras registrar la reflexión) */}
              <section className={`bg-[#F6F4FF] dark:bg-[#1a1440] p-2 rounded-xl shadow-sm border border-purple-100 dark:border-white/10 transition-opacity ${canDecide ? '' : 'opacity-60'} w-180 h-[350px]`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-8 h-8 rounded-full bg-[#6236FF] text-white flex items-center justify-center font-bold shrink-0 mt-1">
                    2
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Mi decisión para mañana</h3>
                    <p className="text-sm text-slate-500 dark:text-gray-400">
                      Según tu reflexión anterior, ¿cuál será la acción más importante que realizarás mañana para acercarte a tu Gran Meta Anual?
                    </p>
                  </div>
                </div>
                <div className="ml-12 relative">
                  <textarea
                    maxLength={300}
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    disabled={!canDecide}
                    className="w-full h-24 p-4 bg-white dark:bg-[#0A0A26] text-slate-800 dark:text-gray-100 border border-purple-200 dark:border-white/15 rounded-xl resize-none focus:ring-2 focus:ring-[#6236FF] focus:outline-none transition-all placeholder-gray-400 dark:placeholder-gray-500 text-sm disabled:bg-gray-50 dark:disabled:bg-white/5 disabled:text-gray-400"
                    placeholder={canDecide ? 'Escribe aquí la acción más importante que realizarás mañana...' : 'Primero registra tu reflexión para habilitar este paso...'}
                  />
                  <div className="absolute bottom-3 right-4 text-xs text-gray-400">
                    {action.length}/300
                  </div>
                </div>
                <div className="ml-12 mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-6">
                  <Lock className="w-3.5 h-3.5 text-gray-400" />
                  <span>Tu acción también se guarda automáticamente.</span>
                  <span className="w-2 h-2 rounded-full bg-green-500 ml-1" />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!action.trim() || sending || !canDecide}
                  className="ml-12 w-[calc(100%-3rem)] bg-gradient-to-r from-[#4C1D95] via-[#7C3AED] to-[#9333EA] text-white font-semibold py-4 rounded-xl shadow-md transition-all flex flex-col items-center justify-center group disabled:opacity-40"
                >
                  {sent ? (
                    <span className="text-base font-semibold">
                      {agendaConfirmed ? '¡Acción enviada a tu Agenda Diaria!' : '¡Enviado!'}
                    </span>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-base md:text-lg">
                        <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        {sending ? 'Enviando...' : 'Enviar a la planificación de mañana'}
                      </div>
                      <span className="text-xs font-normal text-purple-200 mt-1">
                        {agendaConfirmed
                          ? 'Tu decisión se integrará en tu Agenda Diaria del día siguiente.'
                          : 'Tu acción se integrará automáticamente en tu Agenda Diaria del día siguiente.'}
                      </span>
                    </>
                  )}
                </button>
              </section>

              {/* Banner Informativo */}
              <section className='w-200'>
                <div className="bg-[#F1EDFF] dark:bg-[#1a1440] p-1 rounded-xl shadow-sm border border-purple-100 dark:border-white/10 flex items-center gap-4 mt-2 overflow-hidden w-250">
                <div className="w-12 h-12 rounded-full bg-[#6236FF] text-white flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 dark:text-white">Coaching conecta tu aprendizaje con tu acción diaria.</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Reflexiona • Decide • Planifica • Ejecuta • Avanza hacia tu Gran Meta Anual.
                  </p>
                </div>
                
                <img src="./meta-1.png" alt="Ilustración de coaching" className="w-28 h-15 " />
              </div>
              </section>
                
             
            </div>

            {/* Columna Derecha */}
            <TimelineSidebar />
          </div>
        </div>
      </main>
    </div>
  );
}
