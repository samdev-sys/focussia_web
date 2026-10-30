import React, { useState } from 'react';
import {
  CircleHelp, Bell, Settings, ChevronDown,
} from 'lucide-react';
import { NAV_ICONS } from './navIcons';
import { notificationService, type NotificationData } from '../services/api';
import { ConfiguracionPanel } from './ConfiguracionPanel';
import HelpChat from './HelpChat';

interface NavItem {
  id: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
  action: 'inicio' | 'rueda' | 'externo';
}

const NAV_ITEMS: NavItem[] = [
  { id: 'inicio', label: 'Inicio', Icon: NAV_ICONS.inicio, action: 'inicio' },
  { id: 'rueda', label: 'Rueda', Icon: NAV_ICONS.rueda, active: true, action: 'rueda' },
  { id: 'matriz', label: 'Matriz', Icon: NAV_ICONS.matriz, action: 'externo' },
  { id: 'anual', label: 'Anual', Icon: NAV_ICONS.anual, action: 'externo' },
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

interface RuedaShellProps {
  userName?: string;
  avatarImg?: string | null;
  onClose: () => void;
  onNavigate?: (section: string) => void;
  children: React.ReactNode;
}

export const RuedaShell: React.FC<RuedaShellProps> = ({ userName = '', avatarImg, onClose, onNavigate, children }) => {
  const [showHelp, setShowHelp] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const toggleNotifications = async () => {
    if (!showNotifications) {
      try { setNotifications(await notificationService.getAll()); } catch { /* noop */ }
    }
    setShowNotifications(v => !v);
  };

  const handleNav = (item: NavItem) => {
    if (item.action === 'inicio') {
      onClose();
    } else if (item.action === 'rueda') {
      // ya estamos aquí
    } else if (onNavigate) {
      onNavigate(item.id);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex bg-[#0a0a18]">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col bg-gradient-to-b from-[#0b0b22] to-[#060614] text-white py-5 px-4 overflow-y-auto">
        <div className="flex items-center gap-2 px-2 mb-6">
          <img src="/focusia-logo.png" alt="Focusia" className="w-8 h-8 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <span className="text-xl font-extrabold tracking-tight">Focusia</span>
        </div>
        <nav className="flex flex-col gap-0.5 flex-1">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => handleNav(item)}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[14px] font-medium transition-all text-left ${
                item.active
                  ? 'bg-gradient-to-r from-[#2b5cff] to-[#7c3aed] text-white shadow-lg'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <item.Icon className="w-5 h-5 shrink-0" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-4 flex items-center gap-2.5 bg-white/5 hover:bg-white/10 transition-colors rounded-2xl p-2.5 cursor-pointer">
          {avatarImg ? (
            <img src={avatarImg} alt={userName} className="w-10 h-10 rounded-full object-cover border border-white/20" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2b5cff] to-[#7c3aed] flex items-center justify-center font-bold">
              {(userName || 'U').slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{userName || 'Usuario'}</p>
            <p className="text-[11px] text-white/50">Ver perfil</p>
          </div>
          <ChevronDown className="w-4 h-4 text-white/40" />
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex-1 min-w-0 bg-[#f2f4f7] lg:rounded-l-[28px] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-8 pt-4 sm:pt-5 pb-2 shrink-0">
          <div className="flex items-center gap-3">
            <img src="/rueda.png" alt="Rueda" className="w-10 h-10 object-contain" />
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#101331]">Rueda de la Vida</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowHelp(true)} className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-700 hover:bg-gray-50" title="Ayuda de IA">
              <CircleHelp className="w-5 h-5" />
            </button>
            <div className="relative">
              <button onClick={toggleNotifications} className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-700 hover:bg-gray-50 relative" title="Notificaciones">
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#6d28d9] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {notifications.length > 9 ? '9+' : notifications.length}
                  </span>
                )}
              </button>
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-xl shadow-2xl border border-gray-100 z-50">
                    <p className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">Notificaciones</p>
                    {notifications.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-gray-400 text-center">Sin notificaciones.</p>
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
            <button onClick={() => setShowConfig(true)} className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-700 hover:bg-gray-50" title="Configuración">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-6">
          {children}
        </div>
      </div>
      <ConfiguracionPanel isOpen={showConfig} onClose={() => setShowConfig(false)} />
      <HelpChat
        open={showHelp}
        onClose={() => setShowHelp(false)}
        pasoLabel="Rueda de la Vida"
        titulo="Diagnóstico y planificación"
        bienvenida="¡Hola! Soy FocusIA. Puedo explicarte cómo completar tu Rueda de la Vida y qué hacer con los resultados. ¿En qué te ayudo?"
        contextoAyuda="El usuario está en el módulo Rueda de la Vida de Focussia y pidió ayuda desde el icono de interrogación."
      />
    </div>
  );
};

export default RuedaShell;
