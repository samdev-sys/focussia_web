import React, { useEffect, useState } from 'react';
import {
  ChevronDown, ChevronLeft, Bell, Settings, Moon, Sun, CircleHelp,
} from 'lucide-react';
import { NAV_ICONS } from './navIcons';
import {
  authService, configService, notificationService,
  type NotificationData,
} from '../services/api';
import { AVATAR_FILES, AVATAR_VARIACIONES } from '../constants/avatars';
import { ConfiguracionPanel } from './ConfiguracionPanel';
import HelpChat from './HelpChat';

/* ──────────────────────────────────────────────────────────────────────────
   Marco compartido de las pantallas de módulo: sidebar oscura + barra
   superior. Cada módulo marca su propio elemento activo en el menú.
   ────────────────────────────────────────────────────────────────────────── */

export const NAV_ITEMS: { key: string; label: string }[] = [
  { key: 'inicio', label: 'Inicio' },
  { key: 'rueda', label: 'Rueda' },
  { key: 'matriz', label: 'Matriz' },
  { key: 'anual', label: 'Anual' },
  { key: 'mensual', label: 'Mensual' },
  { key: 'kanban', label: 'Kanban' },
  { key: 'semanal', label: 'Semanal' },
  { key: 'diaria', label: 'Diaria' },
  { key: 'delegar', label: 'Delegar' },
  { key: 'mision', label: 'Misión' },
  { key: 'fechas', label: 'Fechas' },
  { key: 'suplementos', label: 'Suplementos' },
  { key: 'hora-oro', label: 'Hora de Oro' },
  { key: 'gratitud', label: 'Gratitud' },
  { key: 'cumple', label: 'Cumpleaños' },
  { key: 'tribu', label: 'Tribu' },
  { key: 'focus', label: 'Focus' },
  { key: 'cursos', label: 'Cursos' },
  { key: 'coaching', label: 'Coaching' },
  { key: 'mas', label: 'Más' },
];

const ICONO: Record<string, React.ComponentType<{ className?: string }>> = {
  inicio: NAV_ICONS.inicio,
  rueda: NAV_ICONS.rueda,
  matriz: NAV_ICONS.matriz,
  anual: NAV_ICONS.anual,
  mensual: NAV_ICONS.mensual,
  kanban: NAV_ICONS.kanban,
  semanal: NAV_ICONS.semanal,
  diaria: NAV_ICONS.diaria,
  delegar: NAV_ICONS.delegar,
  mision: NAV_ICONS.mision,
  fechas: NAV_ICONS.fechas,
  suplementos: NAV_ICONS.suplementos,
  'hora-oro': NAV_ICONS.gratitud,
  gratitud: NAV_ICONS.gratitud,
  cumple: NAV_ICONS.cumpleanos,
  tribu: NAV_ICONS.tribu,
  focus: NAV_ICONS.focus,
  cursos: NAV_ICONS.cursos,
  coaching: NAV_ICONS.coaching,
  mas: NAV_ICONS.mas,
};

const NavItem = ({ Icon, label, active = false, onClick }: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string; active?: boolean; onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors w-full text-left ${
      active
        ? 'text-white bg-gradient-to-r from-[#6236FF] to-[#8A2BE2] shadow-md'
        : 'text-white/60 hover:text-white hover:bg-white/5'
    }`}
  >
    <Icon className="w-5 h-5 shrink-0" />
    <span className="truncate">{label}</span>
  </button>
);

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

const Sidebar = ({ activeNav, onNav, userName, photoUrl, profile, onLogout, onBack }: {
  activeNav: string; onNav: (section: string) => void;
  userName?: string; photoUrl?: string | null;
  profile?: { username?: string; email?: string } | null;
  onLogout: () => void; onBack: () => void;
}) => {
  const [showProfile, setShowProfile] = useState(false);
  return (
    <aside className="w-48 bg-[#0A0A26] h-full flex flex-col shrink-0 z-20">
      <div className="h-16 flex items-center px-4 pt-2 pb-1">
        <div className="flex items-center gap-3 text-white">
          <img src="/focussia.png" alt="Focusia" className="w-8 h-8" />
          <span className="text-xl font-bold tracking-wide">Focusia</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-2 flex flex-col gap-1">
        {NAV_ITEMS.map(item => (
          <NavItem
            key={item.key}
            Icon={ICONO[item.key] || NAV_ICONS.mas}
            label={item.label}
            active={item.key === activeNav}
            onClick={() => {
              if (item.key === activeNav || item.key === 'mas') return;
              onNav(item.key);
            }}
          />
        ))}
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
          <div className="ml-3 text-left flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{userName || 'Usuario'}</p>
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

const Header = ({ userName, photoUrl, profile, onBack, onLogout, titulo, subtitulo, IconoTitulo }: {
  userName?: string; photoUrl?: string | null;
  profile?: { username?: string; email?: string } | null;
  onBack: () => void; onLogout: () => void;
  // Título del módulo en la misma zona del botón de atrás (mockup).
  titulo?: string; subtitulo?: string;
  IconoTitulo?: React.ComponentType<{ className?: string }>;
}) => {
  const [dark, setDark] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('focusia-theme') === 'dark');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [showConfig, setShowConfig] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try { localStorage.setItem('focusia-theme', dark ? 'dark' : 'light'); } catch { /* noop */ }
  }, [dark]);

  const toggleNotifications = async () => {
    if (!showNotifications) {
      try { setNotifications(await notificationService.getAll()); } catch { /* noop */ }
    }
    setShowNotifications(v => !v);
  };

  return (
    <header className="h-15 flex items-center justify-between px-6 bg-white dark:bg-[#14142e] border-b border-gray-100 dark:border-white/10 shrink-0 z-10">
      <div className="flex items-center gap-3 min-w-0 shrink-0">
        <button
          onClick={onBack}
          title="Volver al Dashboard"
          className="hidden xl:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-[#6236FF] hover:bg-purple-50 dark:hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="w-8 h-8" />

        </button>
        {titulo && IconoTitulo && (
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-11 h-11 rounded-md bg-[#F3F0FF] dark:bg-white/10 flex items-center justify-center text-[#6236FF] dark:text-purple-300 shrink-0">
              <IconoTitulo className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-xl font-bold bg-gradient-to-r from-[#6236FF] to-[#8A2BE2] bg-clip-text text-transparent truncate">
                {titulo}
              </h1>
              <p className="hidden sm:block text-sm text-slate-500 dark:text-gray-400 truncate">
                {subtitulo}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        
      </div>

      <div className="w-40 sm:w-auto shrink-0 flex items-center justify-end gap-5">
        <button onClick={() => setShowHelp(true)} title="Ayuda de IA" className="text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white transition-colors">
          <CircleHelp className="w-5 h-5" />
        </button>

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
              <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-white dark:bg-[#1a1a3a] rounded-md shadow-xl border border-gray-100 dark:border-white/10 z-50 -ml-2">
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

        <button onClick={() => setShowConfig(true)} title="Configuración" className="hidden sm:block text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white transition-colors">
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
            <span className="hidden sm:inline text-sm font-medium text-slate-800 dark:text-gray-100">{userName || 'Usuario'}</span>
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
      <HelpChat
        open={showHelp}
        onClose={() => setShowHelp(false)}
        pasoLabel="Módulo"
        titulo={titulo || 'Focusia'}
        bienvenida="¡Hola! Soy FocusIA. Puedo explicarte cómo funciona este módulo, ayudarte con tus tareas o darte recomendaciones. ¿Qué necesitas?"
        contextoAyuda={`El usuario está en el módulo ${titulo || 'de la app'} de Focussia y pidió ayuda desde el icono de interrogación.`}
      />
    </header>
  );
};

export default function ModuleShell({ activeNav, userName, onBack, onNavigate, titulo, subtitulo, iconoTitulo, children }: {
  activeNav: string;
  userName?: string;
  onBack: () => void;
  onNavigate?: (section: string) => void;
  // Título del módulo en la cabecera, junto al botón de atrás (opcional).
  titulo?: string;
  subtitulo?: string;
  iconoTitulo?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ username?: string; email?: string } | null>(null);

  useEffect(() => {
    authService.getCurrentUser().then(u => {
      if (!u) return;
      setProfile({ username: u.username, email: u.email });
      if (u?.avatar_url) { setPhotoUrl(u.avatar_url); return; }
      return configService.getAvatar().then(a => {
        const id = a.current_avatar_id ?? 0;
        if (id > 0) setPhotoUrl(AVATAR_VARIACIONES[id] || AVATAR_FILES[id] || null);
      });
    }).catch(() => { /* noop */ });
  }, []);

  const handleLogout = async () => {
    try { await authService.logout(); } catch { /* noop */ }
    window.location.reload();
  };

  const handleNav = (section: string) => {
    if (section === activeNav) return;
    if (onNavigate) { onNavigate(section); return; }
    onBack();
  };

  return (
    <div className="flex h-full overflow-hidden text-slate-800 dark:text-gray-100 bg-[#F8F9FB] dark:bg-[#0A0A26]">
      <Sidebar
        activeNav={activeNav}
        onNav={handleNav}
        userName={userName}
        photoUrl={photoUrl}
        profile={profile}
        onLogout={handleLogout}
        onBack={onBack}
      />
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#F8F9FB] dark:bg-[#0A0A26] rounded-tl-[2rem] border-l border-gray-200 dark:border-white/10">
        <Header
          userName={userName}
          photoUrl={photoUrl}
          profile={profile}
          onBack={onBack}
          onLogout={handleLogout}
          titulo={titulo}
          subtitulo={subtitulo}
          IconoTitulo={iconoTitulo}
        />
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
