import i18n from '../i18n';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Bell, Settings, Moon, Sparkles, Crosshair, Smile,
  Sun,
} from 'lucide-react';
import { notificationService, NotificationData } from '../services/api';
import { NAV_ICONS } from './navIcons';
import ShellSidebar from './ShellSidebar';

export type MonthlyNavKey =
  | 'inicio' | 'rueda' | 'matriz' | 'anual' | 'mensual' | 'kanban'
  | 'semanal' | 'diaria' | 'delegar' | 'acciones-delegar' | 'mision' | 'fechas' | 'suplementos'
  | 'cumpleanos' | 'tribu' | 'cuentas' | 'cursos' | 'redes' | 'coaching' | 'focus' | 'gratitud' | 'mas';

export const NAV_ITEMS: { key: MonthlyNavKey; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'inicio', label: 'Inicio', Icon: NAV_ICONS.inicio },
  { key: 'rueda', label: 'Rueda', Icon: NAV_ICONS.rueda },
  { key: 'matriz', label: 'Matriz', Icon: NAV_ICONS.matriz },
  { key: 'anual', label: 'Anual', Icon: NAV_ICONS.anual },
  { key: 'mensual', label: 'Mensual', Icon: NAV_ICONS.mensual },
  { key: 'kanban', label: 'Kanban', Icon: NAV_ICONS.kanban },
  { key: 'semanal', label: 'Semanal', Icon: NAV_ICONS.semanal },
  { key: 'diaria', label: 'Diaria', Icon: NAV_ICONS.diaria },
  { key: 'delegar', label: 'Delegar', Icon: NAV_ICONS.delegar },
  { key: 'mision', label: 'Misión', Icon: NAV_ICONS.mision },
  { key: 'fechas', label: 'Fechas', Icon: NAV_ICONS.fechas },
  { key: 'suplementos', label: 'Suplementos', Icon: NAV_ICONS.suplementos },
  { key: 'cumpleanos', label: 'Cumpleaños', Icon: NAV_ICONS.cumpleanos },
  { key: 'tribu', label: 'Tribu', Icon: NAV_ICONS.tribu },
  { key: 'cuentas', label: 'Cuentas', Icon: NAV_ICONS.cuentas },
  { key: 'cursos', label: 'Cursos', Icon: NAV_ICONS.cursos },
  { key: 'coaching', label: 'Coaching', Icon: NAV_ICONS.coaching },
  { key: 'focus', label: 'Focus', Icon: NAV_ICONS.focus },
  { key: 'gratitud', label: 'Gratitud', Icon: NAV_ICONS.gratitud },
  { key: 'redes', label: 'Redes Sociales', Icon: NAV_ICONS.redes },
  { key: 'mas', label: 'Más', Icon: NAV_ICONS.mas },
];

export default function AppShell({ activeNav, title, subtitle, username, avatarUrl, onNavigate, onClose, decorated, onOpenHelp, onOpenNotifications, onOpenSettings, children }: {
  activeNav: MonthlyNavKey;
  title: React.ReactNode;
  subtitle?: string;
  username?: string;
  avatarUrl?: string;
  onNavigate?: (key: MonthlyNavKey) => void;
  onClose: () => void;
  onOpenHelp?: () => void;
  onOpenNotifications?: () => void;
  onOpenSettings?: () => void;
  decorated?: boolean;
  children: React.ReactNode;
}) {
  // Modo oscuro compartido con los demás shells ('focusia-theme' en
  // localStorage): activa la clase `dark` en <html> para todas las pantallas.
  const [dark, setDark] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('focusia-theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try { localStorage.setItem('focusia-theme', dark ? 'dark' : 'light'); } catch { /* noop */ }
  }, [dark]);

  /* Notificaciones y configuración funcionan aunque el caller no pase
     callbacks (las rutas de módulo no los pasan): la campana abre un panel
     propio y el engranaje va a Configuración (o a lo que defina el caller). */
  const navigate = useNavigate();
  const [showNotif, setShowNotif] = useState(false);
  const [notifs, setNotifs] = useState<NotificationData[]>([]);
  const unread = notifs.filter(n => !n.is_read).length;

  const toggleNotif = async () => {
    if (!showNotif) {
      try {
        const data = await notificationService.getAll();
        setNotifs(Array.isArray(data) ? data : Array.isArray((data as any)?.results) ? (data as any).results : []);
      } catch { /* noop: el panel igual se abre, vacío */ }
    }
    setShowNotif(v => !v);
  };

  const marcarTodas = async () => {
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    try { await notificationService.marcarTodasLeidas(); } catch { /* noop */ }
  };

  const abrirNotificaciones = () => {
    if (onOpenNotifications) { onOpenNotifications(); return; }
    void toggleNotif();
  };

  const abrirConfiguracion = () => {
    if (onOpenSettings) { onOpenSettings(); return; }
    navigate('/app/configuracion');
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-[#070b22]" onClick={onClose}>
      {/* Sidebar canónica compartida con todas las pantallas */}
      <div className="hidden md:flex" onClick={e => e.stopPropagation()}>
        <ShellSidebar
          activeNav={activeNav}
          onNav={(key) => onNavigate?.(key as MonthlyNavKey)}
          userName={username}
          avatarImg={avatarUrl}
        />
      </div>

      {/* Main */}
      <div
        className="relative flex-1 min-w-0 bg-[#f7f8fc] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-1 bg-gradient-to-r from-[#2b9df4] via-[#5b5bd6] to-[#c026d3]" />
        {decorated && (
          <div className="pointer-events-none absolute inset-y-0 right-0 w-[200px] sm:w-[280px] overflow-hidden">
            <div className="absolute -right-28 sm:-right-24 top-[-12%] h-[124%] w-[260px] sm:w-[300px] rounded-[100%] bg-gradient-to-b from-[#1f6feb] via-[#5b2ee5] to-[#a21caf]" />
            <div className="absolute -right-24 sm:-right-20 top-[-12%] h-[124%] w-[260px] sm:w-[300px] rounded-[100%] border-[3px] border-white/60" />
          </div>
        )}

        <div className="relative z-10 px-4 sm:px-8 pt-6 pb-10 w-full">
          <div className="flex items-start gap-3 mb-5">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#101433]">{title}</h1>
              {subtitle && <p className="text-[#5b6b8c] text-base sm:text-xl mt-1">{subtitle}</p>}
            </div>
            <div className="relative flex items-center gap-2 sm:gap-3 shrink-0">
              <button onClick={abrirNotificaciones} className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white dark:bg-[#14142e] shadow flex items-center justify-center" title={i18n.t('notificaciones_3t7w')}>
                <Bell className="w-5 h-5 text-[#101433] dark:text-white" fill="currentColor" />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-[#6236FF] text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-[#14142e]">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
              <button onClick={abrirConfiguracion} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white dark:bg-[#14142e] shadow hidden sm:flex items-center justify-center" title={i18n.t('ajustes')}>
                <Settings className="w-5 h-5 text-[#101433] dark:text-white" />
              </button>
              <button onClick={() => setDark((v) => !v)} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white dark:bg-[#14142e] shadow hidden sm:flex items-center justify-center" title={dark ? 'Modo claro' : 'Modo oscuro'}>
                {dark ? <Sun className="w-5 h-5 text-[#101433] dark:text-white" /> : <Moon className="w-5 h-5 text-[#101433] dark:text-white" />}
              </button>
              <button onClick={onClose} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white shadow flex md:hidden items-center justify-center">
                <X className="w-5 h-5 text-gray-500" />
              </button>

              {/* Panel de notificaciones */}
              {showNotif && (
                <div className="absolute top-full right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-[#14142e] border border-gray-100 dark:border-white/10 rounded-2xl shadow-xl z-30 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/10">
                    <span className="text-sm font-bold text-[#101433] dark:text-white">{i18n.t('notificaciones_3t7w')}</span>
                    <button onClick={marcarTodas} className="text-xs font-semibold text-[#2563EB] hover:underline">Marcar todas como leídas</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifs.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">No tienes notificaciones nuevas</p>
                    ) : (
                      notifs.slice(0, 15).map((n) => (
                        <div key={String(n.id)} className={`px-4 py-3 border-b border-gray-50 dark:border-white/5 ${!n.is_read ? 'bg-[#f0edff]/60 dark:bg-white/5' : ''}`}>
                          <p className="text-[13px] font-semibold text-[#101433] dark:text-white leading-snug">{n.title}</p>
                          <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5 leading-snug line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-slate-400 dark:text-white/30 mt-1">{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
