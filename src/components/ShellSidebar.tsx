import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { NAV_ICONS } from './navIcons';

/* ──────────────────────────────────────────────────────────────────────────
   Sidebar canónica de la app: el mismo modelo en TODAS las pantallas.

   - Fondo navy #0A0A26, logo Focusia, lista completa de módulos y,
     debajo de «Delegar», el acceso directo «Acciones por delegar».
   - Footer de usuario con su foto (botón que despliega Volver al
     Dashboard / Cerrar sesión).

   La consumen ModuleShell, AppShell, AnualShell, MonthlyShell, RuedaShell
   y las pantallas que traen sidebar propia. Las pantallas mapean la
   sección que reciben aquí hacia su ruta/course en sus props onNav.
   ────────────────────────────────────────────────────────────────────────── */

export type ShellNavKey =
  | 'inicio' | 'rueda' | 'matriz' | 'anual' | 'mensual'
  | 'kanban' | 'semanal' | 'diaria' | 'delegar' | 'mision'
  | 'fechas' | 'suplementos' | 'hora-oro' | 'gratitud' | 'inspiracion'
  | 'cumple' | 'cumpleanos' | 'tribu' | 'cuentas' | 'cursos' | 'coaching'
  | 'focus' | 'redes' | 'mas';

export const SHELL_NAV_ITEMS: { key: ShellNavKey; label: string }[] = [
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
  { key: 'inspiracion', label: 'Inspiración' },
  { key: 'cumple', label: 'Cumpleaños' },
  { key: 'tribu', label: 'Tribu' },
  { key: 'focus', label: 'Focus' },
  { key: 'cursos', label: 'Cursos' },
  { key: 'coaching', label: 'Coaching' },
  { key: 'redes', label: 'Redes' },
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
  inspiracion: NAV_ICONS.inspiracion,
  cumple: NAV_ICONS.cumpleanos,
  tribu: NAV_ICONS.tribu,
  focus: NAV_ICONS.focus,
  cursos: NAV_ICONS.cursos,
  coaching: NAV_ICONS.coaching,
  redes: NAV_ICONS.redes,
  mas: NAV_ICONS.mas,
};

/** Alias históricos: varias pantallas siguen usando «cumpleanos». */
function normalizarActive(activeNav: string): string {
  if (activeNav === 'cumpleanos') return 'cumple';
  if (activeNav === 'hora_de_oro' || activeNav === 'hora_de_oro') return 'hora-oro';
  return activeNav;
}

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

function ProfileMenu({ userName, avatarImg, onBack, onLogout, onClose }: {
  userName?: string; avatarImg?: string | null;
  onBack?: () => void; onLogout?: () => void; onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="relative z-50 bg-white dark:bg-[#1a1a3a] rounded-xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
        <div className="px-4 py-4 bg-gradient-to-r from-[#6236FF] to-[#8A2BE2] text-white flex items-center gap-3">
          <span className="relative w-8 h-8 shrink-0">
            <span className="absolute inset-0 rounded-full border border-white/40 bg-[#8A2BE2] flex items-center justify-center text-white text-xs font-bold">
              {userName?.[0]?.toUpperCase() || 'U'}
            </span>
            {avatarImg && (
              <img src={avatarImg} alt={userName || 'Usuario'} className="absolute inset-0 w-full h-full rounded-full object-cover" />
            )}
          </span>
          <div className="min-w-0">
            <p className="font-bold truncate">{userName || 'Usuario'}</p>
          </div>
        </div>
        {onBack && (
          <button onClick={() => { onClose(); onBack(); }} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
            Volver al Dashboard
          </button>
        )}
        {onLogout && (
          <button onClick={() => { onClose(); onLogout(); }} className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
            Cerrar sesión
          </button>
        )}
      </div>
    </>
  );
}

export default function ShellSidebar({ activeNav, onNav, userName, avatarImg, onLogout, onBack }: {
  activeNav: string;
  /** Sección elegida en la sidebar (la pantalla la traduce a ruta). */
  onNav: (section: string) => void;
  userName?: string;
  /** Foto de avatar resuelta; si falta, se muestra la inicial. */
  avatarImg?: string | null;
  onLogout?: () => void;
  /** «Volver al Dashboard» del menú de perfil (opcional). */
  onBack?: () => void;
}) {
  const [showProfile, setShowProfile] = useState(false);
  const activa = normalizarActive(activeNav);
  const nombre = userName?.trim() || 'Usuario';

  const handleClick = (key: string) => {
    if (key === activa || key === 'mas') return;
    if (key === 'delegar' && activa === 'delegar') return;
    onNav(key);
  };

  return (
    <aside className="w-48 bg-[#0A0A26] h-full flex flex-col shrink-0 z-20">
      <div className="h-16 flex items-center px-4 pt-2 pb-1">
        <div className="flex items-center gap-3 text-white">
          <img src="/focussia.png" alt="Focusia" className="w-8 h-8" />
          <span className="text-xl font-bold tracking-wide">Focusia</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-2 flex flex-col gap-1">
        {SHELL_NAV_ITEMS.map(item => {
          const Icon = ICONO[item.key] || NAV_ICONS.mas;
          const active = item.key === activa;
          return (
            <React.Fragment key={item.key}>
              <NavItem
                Icon={Icon}
                label={item.label}
                active={active}
                onClick={() => handleClick(item.key)}
              />
              {/* Acceso directo bajo Delegar (mismo modelo en todo el sistema). */}
              {item.key === 'delegar' && (
                <button
                  onClick={() => handleClick('delegar')}
                  className={`flex items-center gap-2 pl-11 pr-3 py-1.5 text-[12px] font-medium rounded-lg transition-colors w-full text-left ${
                    activa === 'delegar'
                      ? 'text-white bg-gradient-to-r from-[#6236FF] to-[#8A2BE2] shadow'
                      : 'text-white/55 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="truncate">Acciones por delegar</span>
                </button>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      <div className="p-4 relative">
        <button onClick={() => setShowProfile(v => !v)} className="flex items-center w-full p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
          <span className="relative w-10 h-10 shrink-0">
            <span className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-sm font-bold">
              {nombre[0].toUpperCase()}
            </span>
            {avatarImg && (
              <img src={avatarImg} alt={nombre} className="absolute inset-0 w-full h-full rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}
          </span>
          <div className="ml-3 text-left flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{nombre}</p>
            <p className="text-xs text-white/50">Ver perfil</p>
          </div>
          <ChevronDown className="w-4 h-4 text-white/50" />
        </button>
        {showProfile && (
          <div className="absolute left-4 right-4 bottom-full mb-2">
            <ProfileMenu
              userName={nombre}
              avatarImg={avatarImg}
              onBack={onBack}
              onLogout={onLogout}
              onClose={() => setShowProfile(false)}
            />
          </div>
        )}
      </div>
    </aside>
  );
}
