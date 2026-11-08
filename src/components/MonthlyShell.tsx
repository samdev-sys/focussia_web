import i18n from '../i18n';
import React from 'react';
import { X, List, Calendar } from 'lucide-react';
import { NAV_ICONS } from './navIcons';
import ShellSidebar from './ShellSidebar';

export type MonthlyNavKey =
  | 'inicio' | 'rueda' | 'matriz' | 'anual' | 'mensual' | 'kanban'
  | 'semanal' | 'diaria' | 'delegar' | 'mision' | 'fechas' | 'suplementos'
  | 'cumpleanos' | 'tribu' | 'cuentas' | 'cursos' | 'redes' | 'mas';

export default function MonthlyShell({ username, avatarUrl, onNavigate, onClose, children }: {
  username?: string;
  avatarUrl?: string;
  onNavigate?: (key: MonthlyNavKey) => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex bg-[#070b22]" onClick={onClose}>
      {/* Sidebar canónica compartida con todas las pantallas */}
      <div className="hidden md:flex" onClick={e => e.stopPropagation()}>
        <ShellSidebar
          activeNav="mensual"
          onNav={(key) => onNavigate?.(key as MonthlyNavKey)}
          userName={username}
          avatarImg={avatarUrl}
        />
      </div>

      {/* Main */}
      <div
        className="relative flex-1 min-w-0 bg-[#f2f4fa] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-1 bg-gradient-to-r from-[#2b9df4] via-[#5b5bd6] to-[#c026d3]" />
        {/* Decorative wave */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[200px] sm:w-[280px] overflow-hidden">
          <div className="absolute -right-28 sm:-right-24 top-[-12%] h-[124%] w-[260px] sm:w-[300px] rounded-[100%] bg-gradient-to-b from-[#1f6feb] via-[#5b2ee5] to-[#a21caf]" />
          <div className="absolute -right-24 sm:-right-20 top-[-12%] h-[124%] w-[260px] sm:w-[300px] rounded-[100%] border-[3px] border-white/60" />
        </div>

        <div className="relative z-10 px-4 sm:px-8 pt-5 pb-10 w-full">
          <div className="flex items-center gap-3 mb-5">
            <span className="w-11 h-11 rounded-2xl bg-[#e6e2fb] flex items-center justify-center">
              <Calendar className="w-6 h-6 text-[#5b5bd6]" />
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-[#14142b]">
              Metas <span className="bg-gradient-to-r from-[#4f46e5] to-[#c026d3] bg-clip-text text-transparent">{i18n.t('mensuales')}</span>
            </h2>
            <span className="ml-auto flex items-center gap-2">
              <span className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-500 font-bold">?</span>
              <span className="w-10 h-10 rounded-full border border-gray-200 bg-white hidden sm:flex items-center justify-center">
                <List className="w-5 h-5 text-[#5b5bd6]" />
              </span>
              <button onClick={onClose} className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors md:hidden">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
