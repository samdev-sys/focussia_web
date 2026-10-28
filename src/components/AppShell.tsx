import React from 'react';
import {
  X, ChevronDown,
  Bell, Settings, Moon, Sparkles, Crosshair, Smile,
} from 'lucide-react';
import { NAV_ICONS } from './navIcons';

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

function UserAvatar({ src, name }: { src?: string; name: string }) {
  if (src) {
    return <img src={src} alt={name} className="w-10 h-10 rounded-full object-cover" />;
  }
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2b44ff] to-[#a21caf] text-white font-black flex items-center justify-center">
      {(name || 'F').charAt(0).toUpperCase()}
    </div>
  );
}

export default function AppShell({ activeNav, title, subtitle, username, avatarUrl, onNavigate, onClose, decorated, children }: {
  activeNav: MonthlyNavKey;
  title: React.ReactNode;
  subtitle?: string;
  username?: string;
  avatarUrl?: string;
  onNavigate?: (key: MonthlyNavKey) => void;
  onClose: () => void;
  decorated?: boolean;
  children: React.ReactNode;
}) {
  const displayName = username?.trim() || 'Usuario';
  return (
    <div className="fixed inset-0 z-50 flex bg-[#070b22]" onClick={onClose}>
      {/* Sidebar */}
      <aside
        className="hidden md:flex w-[232px] shrink-0 flex-col bg-[#080f2e] px-3 py-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-white rounded-2xl px-3 py-2.5 mb-4 flex items-center">
          <img src="/focusia-logo.png" alt="Focusia" className="h-9 object-contain" />
        </div>
        <nav className="flex-1 overflow-y-auto space-y-0.5 pr-0.5">
          {NAV_ITEMS.map(({ key, label, Icon }) => {
            const active = key === activeNav;
            return (
              <React.Fragment key={key}>
                <button
                  onClick={() => { if (!active) onNavigate?.(key); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-semibold transition-colors ${
                    active
                      ? 'bg-gradient-to-r from-[#1f6feb] to-[#a21caf] text-white shadow-lg'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
                {key === 'delegar' && (
                  <button
                    onClick={() => { if (activeNav !== 'delegar') onNavigate?.('delegar'); }}
                    className={`w-full flex items-center gap-2 pl-11 pr-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors text-left ${
                      activeNav === 'delegar'
                        ? 'bg-gradient-to-r from-[#1f6feb] to-[#a21caf] text-white shadow'
                        : 'text-white/55 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="truncate">Acciones por Delegar</span>
                  </button>
                )}
              </React.Fragment>
            );
          })}
        </nav>
        <div className="mt-3 bg-[#101a45] rounded-2xl p-2.5 flex items-center gap-2.5">
          <UserAvatar src={avatarUrl} name={displayName} />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-bold truncate">{displayName}</p>
            <p className="text-white/50 text-[11px]">Ver perfil</p>
          </div>
          <ChevronDown className="w-4 h-4 text-white/60" />
        </div>
      </aside>

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

        <div className="relative z-10 px-4 sm:px-8 pt-6 pb-10 max-w-6xl mx-auto">
          <div className="flex items-start gap-3 mb-5">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#101433]">{title}</h1>
              {subtitle && <p className="text-[#5b6b8c] text-base sm:text-xl mt-1">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <span className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white shadow flex items-center justify-center">
                <Bell className="w-5 h-5 text-[#101433]" fill="currentColor" />
              </span>
              <span className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white shadow hidden sm:flex items-center justify-center">
                <Settings className="w-5 h-5 text-[#101433]" />
              </span>
              <span className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white shadow hidden sm:flex items-center justify-center">
                <Moon className="w-5 h-5 text-[#101433]" fill="currentColor" />
              </span>
              <button onClick={onClose} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white shadow flex md:hidden items-center justify-center">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
