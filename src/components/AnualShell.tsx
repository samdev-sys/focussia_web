import i18n from '../i18n';
import React, { useState } from 'react';
import {
  CircleHelp, Bell, Settings, ChevronDown,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { NAV_ICONS } from './navIcons';
import ShellSidebar from './ShellSidebar';
import { notificationService, type NotificationData } from '../services/api';
import { ConfiguracionPanel } from './ConfiguracionPanel';
import HelpChat from './HelpChat';

interface NavItem {
  id: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  action: 'inicio' | 'app' | 'externo';
}

const NAV_ITEMS: NavItem[] = [
  { id: 'inicio', label: 'Inicio', Icon: NAV_ICONS.inicio, action: 'inicio' },
  { id: 'rueda', label: 'Rueda', Icon: NAV_ICONS.rueda, action: 'externo' },
  { id: 'matriz', label: 'Matriz', Icon: NAV_ICONS.matriz, action: 'externo' },
  { id: 'anual', label: 'Anual', Icon: NAV_ICONS.anual, action: 'app' },
  { id: 'mensual', label: 'Mensual', Icon: NAV_ICONS.mensual, action: 'externo' },
  { id: 'kanban', label: 'Kanban', Icon: NAV_ICONS.kanban, action: 'externo' },
  { id: 'semanal', label: 'Semanal', Icon: NAV_ICONS.semanal, action: 'externo' },
  { id: 'diaria', label: 'Diaria', Icon: NAV_ICONS.diaria, action: 'externo' },
  { id: 'delegar', label: 'Delegar', Icon: NAV_ICONS.delegar, action: 'externo' },
  { id: 'mision', label: 'Misión', Icon: NAV_ICONS.mision, action: 'externo' },
  { id: 'fechas', label: 'Fechas', Icon: NAV_ICONS.fechas, action: 'externo' },
  { id: 'suplementos', label: 'Suplementos', Icon: NAV_ICONS.suplementos, action: 'externo' },
  { id: 'cumpleanos', label: 'Cumpleaños', Icon: NAV_ICONS.cumpleanos, action: 'externo' },
  { id: 'tribu', label: 'Tribu', Icon: NAV_ICONS.tribu, action: 'externo' },
  { id: 'cuentas', label: 'Cuentas', Icon: NAV_ICONS.cuentas, action: 'externo' },
  { id: 'cursos', label: 'Cursos', Icon: NAV_ICONS.cursos, action: 'externo' },
  { id: 'redes', label: 'Redes Sociales', Icon: NAV_ICONS.redes, action: 'externo' },
  { id: 'mas', label: 'Más', Icon: NAV_ICONS.mas, action: 'externo' },
];

interface AnualShellProps {
  userName?: string;
  avatarImg?: string | null;
  title?: string;
  onClose: () => void;
  onNavigate?: (section: string) => void;
  dark?: boolean;
  hideTopbar?: boolean;
  onOpenHelp?: () => void;
  onOpenNotifications?: () => void;
  onOpenSettings?: () => void;
  children: React.ReactNode;
}

export const AnualShell: React.FC<AnualShellProps> = ({
  userName = '',
  avatarImg,
  title = 'Gran Meta Anual',
  onClose,
  onNavigate,
  dark = false,
  hideTopbar = false,
  onOpenHelp,
  onOpenNotifications,
  onOpenSettings,
  children,
}) => {
  const [showHelpLocal, setShowHelpLocal] = useState(false);
  const [showConfigLocal, setShowConfigLocal] = useState(false);
  const [showNotificationsLocal, setShowNotificationsLocal] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const toggleNotificationsLocal = async () => {
    if (!showNotificationsLocal) {
      try { setNotifications(await notificationService.getAll()); } catch { /* noop */ }
    }
    setShowNotificationsLocal(v => !v);
  };

  const handleNavItem = (section: string) => {
    if (section === 'inicio') {
      onClose();
    } else if (section === 'anual') {
      // ya estamos aquí
    } else if (onNavigate) {
      onNavigate(section);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] flex bg-[#0a0a18]">
      {/* Sidebar canónica compartida con todas las pantallas */}
      <div className="hidden lg:flex" onClick={e => e.stopPropagation()}>
        <ShellSidebar
          activeNav="anual"
          onNav={handleNavItem}
          userName={userName}
          avatarImg={avatarImg ?? null}
        />
      </div>

      {/* Contenido */}
      <div className={`flex-1 min-w-0 ${dark ? 'bg-[#070718]' : 'bg-[#f2f4f7]'} lg:rounded-l-[28px] flex flex-col overflow-hidden`}>
        {!hideTopbar && (
          <div className="flex items-center justify-between px-4 sm:px-8 pt-4 sm:pt-5 pb-2 shrink-0">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-md bg-[#eceafe] flex items-center justify-center shrink-0">
                <CalendarIcon className="w-6 h-6 text-[#4f46e5]" />
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#101331]">{title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { if (onOpenHelp) onOpenHelp(); else setShowHelpLocal(true); }} className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-700 hover:bg-gray-50" title={i18n.t('ayuda_de_ia')}>
                <CircleHelp className="w-5 h-5" />
              </button>
              <div className="relative">
                <button onClick={() => { if (onOpenNotifications) onOpenNotifications(); else toggleNotificationsLocal(); }} className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-700 hover:bg-gray-50 relative" title={i18n.t('notificaciones_zzpz')}>
                  <Bell className="w-5 h-5" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#6d28d9] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {notifications.length > 9 ? '9+' : notifications.length}
                    </span>
                  )}
                </button>
                {showNotificationsLocal && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotificationsLocal(false)} />
                    <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-xl shadow-2xl border border-gray-100 z-50">
                      <p className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">{i18n.t('notificaciones_zzpz')}</p>
                      {notifications.length === 0 ? (
                        <p className="px-4 py-6 text-sm text-gray-400 text-center">{i18n.t('sin_notificaciones')}</p>
                      ) : notifications.map(n => (
                        <div key={n.id} className="px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50">
                          <p className="text-sm font-semibold text-gray-800">{n.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <button onClick={() => { if (onOpenSettings) onOpenSettings(); else setShowConfigLocal(true); }} className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-700 hover:bg-gray-50" title={i18n.t('configuracion_omg1')}>
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-5">
          {children}
        </div>
      </div>
      <ConfiguracionPanel isOpen={showConfigLocal} onClose={() => setShowConfigLocal(false)} />
      <HelpChat
        open={showHelpLocal}
        onClose={() => setShowHelpLocal(false)}
        pasoLabel="Gran Meta Anual"
        titulo={title}
        bienvenida="¡Hola! Soy FocusIA. Puedo ayudarte a definir, revisar o ajustar tu Gran Meta Anual. ¿Qué necesitas?"
        contextoAyuda="El usuario está en el módulo Anual de Focussia y pidió ayuda desde el icono de interrogación."
      />
    </div>
  );
};

export default AnualShell;
