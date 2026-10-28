import { useState } from 'react';
import {
  LayoutDashboard, GraduationCap, Users2, BookOpen, Sparkles,
  Gamepad2, LogOut, Menu, X, ChevronDown,
} from 'lucide-react';
import type { AdminUser } from '../lib/adminApi';

export type Seccion =
  | 'resumen'
  | 'programa'
  | 'tribu'
  | 'aprendizaje'
  | 'avatares'
  | 'juegos';

const NAV: { id: Seccion; label: string; icon: typeof LayoutDashboard; grupo: string }[] = [
  { id: 'resumen', label: 'Resumen', icon: LayoutDashboard, grupo: 'General' },
  { id: 'programa', label: 'Tabla maestra', icon: GraduationCap, grupo: 'Contenido' },
  { id: 'tribu', label: 'Tribu', icon: Users2, grupo: 'Contenido' },
  { id: 'aprendizaje', label: 'Aprendizaje', icon: BookOpen, grupo: 'Contenido' },
  { id: 'avatares', label: 'Avatares', icon: Sparkles, grupo: 'Contenido' },
  { id: 'juegos', label: 'Juegos y retos', icon: Gamepad2, grupo: 'Contenido' },
];

const GRUPOS = ['General', 'Contenido'];

export default function AdminLayout({
  usuario,
  seccion,
  onCambiar,
  onSalir,
  children,
}: {
  usuario: AdminUser;
  seccion: Seccion;
  onCambiar: (s: Seccion) => void;
  onSalir: () => void;
  children: React.ReactNode;
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);

  const navegar = (s: Seccion) => {
    onCambiar(s);
    setMenuAbierto(false);
  };

  const navegacion = (
    <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-4">
      {GRUPOS.map((grupo) => (
        <div key={grupo}>
          <p className="px-3 mb-1.5 text-[10px] font-bold tracking-widest uppercase text-white/30">
            {grupo}
          </p>
          <div className="flex flex-col gap-0.5">
            {NAV.filter((n) => n.grupo === grupo).map((item) => (
              <button
                key={item.id}
                onClick={() => navegar(item.id)}
                className={`flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors w-full text-left ${
                  seccion === item.id
                    ? 'text-white bg-gradient-to-r from-[#6236FF] to-[#8A2BE2] shadow-md'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );

  const perfil = (
    <div className="p-3 border-t border-white/10">
      <div className="flex items-center gap-2.5 px-2 py-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {usuario.username?.[0]?.toUpperCase() || 'A'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-white truncate">{usuario.username}</p>
          <p className="text-[10px] text-white/40 truncate">Administrador</p>
        </div>
        <button
          onClick={onSalir}
          title="Cerrar sesión"
          className="text-white/40 hover:text-white transition-colors shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FB] dark:bg-[#0A0A26] text-slate-800 dark:text-gray-100 flex">
      {/* Sidebar de escritorio */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col bg-[#0A0A26]">
        <div className="h-14 flex items-center gap-2.5 px-5 border-b border-white/10">
          <img src="./focussia.png" alt="" className="w-4 h-4" />
          <div>
            <span className="text-sm font-bold text-white tracking-wide">Focusia</span>
            <span className="block text-[9px] text-white/40 leading-none">Panel de contenido</span>
          </div>
        </div>
        {navegacion}
        {perfil}
      </aside>

      {/* Sidebar móvil */}
      {menuAbierto && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuAbierto(false)} />
          <aside className="relative w-64 flex flex-col bg-[#0A0A26]">
            <div className="h-14 flex items-center justify-between px-5 border-b border-white/10">
              <span className="text-sm font-bold text-white">Panel de contenido</span>
              <button onClick={() => setMenuAbierto(false)} className="text-white/50">
                <X className="w-5 h-5" />
              </button>
            </div>
            {navegacion}
            {perfil}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Barra superior móvil */}
        <header className="lg:hidden h-14 flex items-center gap-3 px-4 bg-[#0A0A26] text-white">
          <button onClick={() => setMenuAbierto(true)} aria-label="Abrir menú">
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold">Panel de contenido</span>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          <SelectorSeccion seccion={seccion} onCambiar={onCambiar} />
          {children}
        </main>
      </div>
    </div>
  );
}

/** Selector compacto: en móvil la navegación vive en el menú, aquí va el contexto. */
function SelectorSeccion({
  seccion,
  onCambiar,
}: {
  seccion: Seccion;
  onCambiar: (s: Seccion) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const actual = NAV.find((n) => n.id === seccion)!;

  return (
    <div className="lg:hidden relative mb-4">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#14142e] border border-gray-100 dark:border-white/10 text-sm font-semibold"
      >
        <span className="flex items-center gap-2">
          <actual.icon className="w-4 h-4 text-[#6236FF]" />
          {actual.label}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>
      {abierto && (
        <div className="absolute z-30 mt-1 w-full rounded-xl bg-white dark:bg-[#14142e] border border-gray-100 dark:border-white/10 shadow-lg overflow-hidden py-1">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                onCambiar(n.id);
                setAbierto(false);
              }}
              className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm text-left ${
                n.id === seccion
                  ? 'text-[#6236FF] font-semibold bg-purple-50 dark:bg-white/5'
                  : 'text-slate-700 dark:text-gray-300'
              }`}
            >
              <n.icon className="w-4 h-4" />
              {n.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
