import React, { useState, useEffect } from 'react';
import { Bell, Settings, Moon, Sun, ChevronDown, ChevronLeft } from 'lucide-react';
import {
  authService, configService, notificationService, NotificationData,
} from '../services/api';
import { AVATAR_FILES, AVATAR_VARIACIONES } from '../constants/avatars';
import { ConfiguracionPanel } from './ConfiguracionPanel';

interface ModuleHeaderProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  onBack: () => void;
  userName?: string;
  progress?: { label: string; pct: number } | null;
  onHelp?: () => void;
}

/** Encabezado compartido de los módulos (notificaciones, config, tema, perfil). */
export const ModuleHeader: React.FC<ModuleHeaderProps> = ({
  icon: Icon, title, subtitle, onBack, userName, progress, onHelp,
}) => {
  const [dark, setDark] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('focusia-theme') === 'dark');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [showConfig, setShowConfig] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState<{ username?: string; email?: string } | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try { localStorage.setItem('focusia-theme', dark ? 'dark' : 'light'); } catch {}
  }, [dark]);

  useEffect(() => {
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

  const toggleNotifications = async () => {
    if (!showNotifications) {
      try {
        setNotifications(await notificationService.getAll());
      } catch {}
    }
    setShowNotifications(v => !v);
  };

  const handleLogout = async () => {
    try { await authService.logout(); } catch {}
    window.location.reload();
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
          Dashboard
        </button>
        <div className="w-10 h-10 rounded-xl bg-[#F3F0FF] dark:bg-white/10 flex items-center justify-center text-[#6236FF] dark:text-purple-300">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#6236FF] to-[#8A2BE2] bg-clip-text text-transparent">
            {title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-gray-400">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {progress && (
          <div className="hidden md:flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-purple-100 dark:bg-white/10 text-[#6236FF] dark:text-purple-300 flex items-center justify-center">
              <Icon className="w-4 h-4" />
            </span>
            <div>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{progress.label}</p>
              <div className="w-40 h-1.5 bg-gray-100 dark:bg-white/10 rounded-full mt-1 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#6236FF] to-[#8A2BE2] rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, progress.pct))}%` }} />
              </div>
            </div>
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{progress.pct}%</span>
          </div>
        )}
        {onHelp && (
          <button onClick={onHelp} title="Ayuda" className="w-9 h-9 rounded-full border border-gray-200 dark:border-white/15 text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors flex items-center justify-center text-sm font-bold">
            ?
          </button>
        )}
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
              <span className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold">
                {(profile?.username || userName)?.[0]?.toUpperCase() || 'U'}
              </span>
              {photoUrl && (
                <img src={photoUrl} alt={userName || 'Usuario'} className="absolute inset-0 w-full h-full rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )}
            </span>
            <span className="text-sm font-medium text-slate-800 dark:text-gray-100">{profile?.username || userName || 'Usuario'}</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
          {showProfile && (
            <div className="absolute right-0 top-full mt-2 w-64">
              <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
              <div className="relative z-50 bg-white dark:bg-[#1a1a3a] rounded-xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
                <div className="px-4 py-4 bg-gradient-to-r from-[#6236FF] to-[#8A2BE2] text-white">
                  <p className="font-bold">{profile?.username || userName || 'Usuario'}</p>
                  {profile?.email && <p className="text-xs text-white/70 mt-0.5">{profile.email}</p>}
                </div>
                <button onClick={() => { setShowProfile(false); onBack(); }} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  Volver al Dashboard
                </button>
                <button onClick={handleLogout} className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <ConfiguracionPanel isOpen={showConfig} onClose={() => setShowConfig(false)} />
    </header>
  );
};

export default ModuleHeader;
