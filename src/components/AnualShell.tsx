import React from 'react';
import {
  CircleHelp, Bell, Settings, ChevronDown,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { notify } from '../services/notify';
import { NAV_ICONS } from './navIcons';

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
  children,
}) => {
  const handleNav = (item: NavItem) => {
    if (item.action === 'inicio') {
      onClose();
    } else if (item.action === 'app') {
      // ya estamos aquí
    } else if (onNavigate) {
      onNavigate(item.id);
    } else {
      notify.info(`${item.label} está disponible en el panel principal`);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] flex bg-[#0a0a18]">
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
                item.action === 'app'
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
      <div className={`flex-1 min-w-0 ${dark ? 'bg-[#070718]' : 'bg-[#f2f4f7]'} lg:rounded-l-[28px] flex flex-col overflow-hidden`}>
        {!hideTopbar && (
          <div className="flex items-center justify-between px-4 sm:px-8 pt-4 sm:pt-5 pb-2 shrink-0">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-[#eceafe] flex items-center justify-center shrink-0">
                <CalendarIcon className="w-6 h-6 text-[#4f46e5]" />
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#101331]">{title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => notify.info('La ayuda contextual llegará pronto a esta sección')} className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-700 hover:bg-gray-50" title="Ayuda">
                <CircleHelp className="w-5 h-5" />
              </button>
              <button onClick={() => notify.info('Tienes 3 notificaciones pendientes en el panel principal')} className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-700 hover:bg-gray-50 relative" title="Notificaciones">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#6d28d9] text-white text-[10px] font-bold rounded-full flex items-center justify-center">3</span>
              </button>
              <button onClick={onClose} className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-700 hover:bg-gray-50" title="Volver al panel">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-5">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AnualShell;
