import React, { useEffect, useRef, useState } from 'react';
import {
  Home, CircleDot, LayoutGrid, Calendar, CalendarDays, Kanban,
  CalendarRange, CalendarCheck, Target, Clock, Pill, Cake,
  UserCheck, Wallet, MoreHorizontal, ChevronDown, Link2,
  Settings, Bell, HelpCircle, Eye, SquareArrowOutUpRight,
  RefreshCw, ShieldCheck, Star, PlayCircle, Loader2, ArrowRight,
} from 'lucide-react';
import { NAV_ICONS } from './navIcons';
import { REDES, RedIcon, normalizarUrl, validarRed, type RedId } from './RedesIcons';
import { configuracionService } from '../services/api';

const NAV_ITEMS = [
  { icon: Home, label: 'Inicio', section: 'inicio' },
  { icon: CircleDot, label: 'Rueda', section: 'rueda' },
  { icon: LayoutGrid, label: 'Matriz', section: 'matriz' },
  { icon: Calendar, label: 'Anual', section: 'anual' },
  { icon: CalendarDays, label: 'Mensual', section: 'mensual' },
  { icon: Kanban, label: 'Kanban', section: 'kanban' },
  { icon: CalendarRange, label: 'Semanal', section: 'semanal' },
  { icon: CalendarCheck, label: 'Diaria', section: 'diaria' },
  { icon: NAV_ICONS.delegar, label: 'Delegar', section: 'delegar' },
  { icon: Target, label: 'Misión', section: 'mision' },
  { icon: Clock, label: 'Fechas', section: 'fechas' },
  { icon: Pill, label: 'Suplementos', section: 'suplementos' },
  { icon: Cake, label: 'Cumpleaños', section: 'cumple' },
  { icon: UserCheck, label: 'Tribu', section: 'tribu' },
  { icon: Wallet, label: 'Cuentas', section: 'cuentas' },
  { icon: Link2, label: 'Redes Sociales', section: 'redes' },
];

const NOMBRE_MOSTRAR: Record<RedId, string> = {
  tiktok: 'TikTok',
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  x: 'X (Twitter)',
};

const FONDO_MARCA: Record<RedId, string> = {
  tiktok: '#010101',
  facebook: '#1877F2',
  instagram: 'linear-gradient(45deg,#FEDA75,#FA7E1E,#D62976,#962FBF,#4F5BD5)',
  linkedin: '#0A66C2',
  youtube: '#FF0000',
  x: '#000000',
};

const COMO_FUNCIONA = [
  { Icon: Link2, titulo: 'Configura tus enlaces', texto: 'Agrega el enlace de tus perfiles en Mis Redes Sociales.' },
  { Icon: Eye, titulo: 'Aparecen en tu Dashboard', texto: 'Solo verás las redes que tienes configuradas.' },
  { Icon: SquareArrowOutUpRight, titulo: 'Acceso rápido', texto: 'Haz clic en cualquier icono para ir directo a tu perfil.' },
  { Icon: RefreshCw, titulo: 'Todo se actualiza al instante', texto: 'Si modificas o eliminas un enlace, se refleja automáticamente.' },
];

interface Props {
  userName?: string;
  links: Record<string, string>;
  irAConfig?: boolean;
  onLinksChange?: (links: Record<string, string>) => void;
  onBack: () => void;
  onNavigate?: (section: string) => void;
}

export default function RedesSocialesScreen({ userName, links, irAConfig, onLinksChange, onBack, onNavigate }: Props) {
  const [redes, setRedes] = useState<Record<string, string>>(links || {});
  const [saving, setSaving] = useState<string | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [oks, setOks] = useState<Record<string, boolean>>({});
  const [tutAbierto, setTutAbierto] = useState<string | null>(null);
  const configRef = useRef<HTMLDivElement>(null);
  const ayudaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    configuracionService.getMiConfig()
      .then(c => {
        const l = (c.redes_sociales || {}) as Record<string, string>;
        setRedes(l);
        onLinksChange?.(l);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (irAConfig) {
      const t = setTimeout(() => configRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350);
      return () => clearTimeout(t);
    }
  }, [irAConfig]);

  const irAConfiguracion = () => configRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const guardar = async (id: RedId) => {
    const crudo = (redes[id] || '').trim();
    if (!crudo) {
      setErrs(prev => ({ ...prev, [id]: '' }));
      try {
        setSaving(id);
        const next = { ...redes, [id]: '' };
        const r = await configuracionService.updateMiConfig({ redes_sociales: next } as any);
        const l = (r.redes_sociales || next) as Record<string, string>;
        setRedes(l);
        onLinksChange?.(l);
        setOks(prev => ({ ...prev, [id]: true }));
        setTimeout(() => setOks(prev => ({ ...prev, [id]: false })), 2000);
      } catch {
        setErrs(prev => ({ ...prev, [id]: 'No se pudo eliminar. Intenta de nuevo.' }));
      } finally {
        setSaving(null);
      }
      return;
    }
    const msg = validarRed(id, crudo);
    if (msg) {
      setErrs(prev => ({ ...prev, [id]: msg }));
      return;
    }
    setErrs(prev => ({ ...prev, [id]: '' }));
    try {
      setSaving(id);
      const next = { ...redes, [id]: normalizarUrl(crudo) };
      const r = await configuracionService.updateMiConfig({ redes_sociales: next } as any);
      const l = (r.redes_sociales || next) as Record<string, string>;
      setRedes(l);
      onLinksChange?.(l);
      setOks(prev => ({ ...prev, [id]: true }));
      setTimeout(() => setOks(prev => ({ ...prev, [id]: false })), 2000);
    } catch {
      setErrs(prev => ({ ...prev, [id]: 'No se pudo guardar. Intenta de nuevo.' }));
    } finally {
      setSaving(null);
    }
  };

  const configuradas = REDES.filter(r => (redes[r.id] || '').trim() !== '');
  const abrir = (id: RedId) => {
    const url = (redes[id] || '').trim();
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };
  const nav = (section: string) => {
    if (section === 'inicio' || section === 'redes') { onBack(); return; }
    if (onNavigate) onNavigate(section);
    else onBack();
  };

  return (
    <div className="flex h-full overflow-hidden text-slate-800 bg-[#F8F9FB]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0A0A26] h-full hidden md:flex flex-col z-20 shrink-0">
        <div className="h-16 flex items-center px-6 pt-4 pb-2">
          <div className="flex items-center gap-3 text-white">
            <img src="./focussia.png" alt="Focusia" className="w-4 h-4 text-white" />
            <span className="text-xl font-bold tracking-wide">Focusia</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
          {NAV_ITEMS.map((item, i) => (
            <button
              key={i}
              onClick={() => nav(item.section)}
              className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors w-full text-left ${
                item.section === 'redes'
                  ? 'text-white bg-gradient-to-r from-[#6236FF] to-[#8A2BE2] shadow-md'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className="w-5 h-5 text-center shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          ))}
          <button className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors w-full text-left text-white/60 hover:text-white hover:bg-white/5">
            <MoreHorizontal className="w-5 h-5 text-center shrink-0" />
            <span className="truncate">Más</span>
          </button>
        </nav>
        <div className="p-4">
          <button onClick={onBack} className="flex items-center w-full p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-sm font-bold">
              {userName?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="ml-3 text-left flex-1">
              <p className="text-sm font-semibold text-white">{userName || 'Usuario'}</p>
              <p className="text-xs text-white/50">Ver perfil</p>
            </div>
            <ChevronDown className="w-4 h-4 text-white/50" />
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#F8F9FB] md:rounded-tl-[2rem]">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 pt-5 pb-3 shrink-0">
          <button onClick={onBack} className="md:hidden text-slate-500 hover:text-slate-800 font-bold">←</button>
          <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6236FF] to-[#8A2BE2] flex items-center justify-center shrink-0 shadow-md">
            <Link2 className="w-6 h-6 text-white" />
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold text-slate-900">Redes Sociales</h1>
            <p className="text-sm text-slate-500">Accede rápidamente a tus perfiles personales desde Focusia.</p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <button
              title="¿Cómo funciona?"
              onClick={() => ayudaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:shadow-md transition-shadow font-black"
            >?</button>
            <button title="Notificaciones" className="relative w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:shadow-md transition-shadow">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#6236FF] text-white text-[10px] font-black flex items-center justify-center">2</span>
            </button>
            <button title="Configuración" className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:shadow-md transition-shadow">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="max-w-[1200px] flex flex-col xl:flex-row gap-5">
            <div className="flex-1 flex flex-col gap-5 min-w-0">
              {/* Mis accesos directos */}
              <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">Mis accesos directos</h2>
                    <p className="text-sm text-slate-500">Solo se muestran las redes sociales que has configurado.</p>
                  </div>
                  <button
                    onClick={irAConfiguracion}
                    className="flex items-center gap-2 text-sm font-bold text-[#6236FF] border border-[#6236FF]/40 rounded-xl px-4 py-2 hover:bg-[#6236FF]/5 active:scale-95 transition-all"
                  >
                    <Settings className="w-4 h-4" /> Gestionar mis redes
                  </button>
                </div>
                {configuradas.length === 0 ? (
                  <div className="mt-4 rounded-xl bg-[#f4f6fb] p-6 text-center">
                    <p className="text-sm text-slate-500">Aún no tienes accesos directos.</p>
                    <p className="text-sm text-slate-500">Agrega tus enlaces abajo y aparecerán aquí.</p>
                    <button onClick={irAConfiguracion} className="mt-3 text-sm font-bold text-white bg-gradient-to-r from-[#6236FF] to-[#8A2BE2] rounded-xl px-5 py-2.5 hover:brightness-110 active:scale-95 transition-all">
                      Ir a Mis Redes Sociales
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
                    {configuradas.map(r => (
                      <button
                        key={r.id}
                        onClick={() => abrir(r.id)}
                        title={`Abrir mi ${NOMBRE_MOSTRAR[r.id]}`}
                        className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md hover:scale-[1.03] active:scale-95 transition-all"
                      >
                        <span className="w-9 h-9 rounded-full flex items-center justify-center text-white" style={{ background: FONDO_MARCA[r.id] }}>
                          <RedIcon id={r.id} className="w-10 h-10" />
                        </span>
                        <span className="text-xs font-bold text-slate-700">{NOMBRE_MOSTRAR[r.id]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              {/* Configuración */}
              <section ref={configRef} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 scroll-mt-4">
                <h2 className="text-lg font-extrabold text-slate-900">Configuración de mis redes sociales</h2>
                <p className="text-sm text-slate-500">Agrega los enlaces de tus perfiles. Solo toma unos segundos.</p>
                <div className="hidden md:grid grid-cols-[170px_210px_1fr_110px] gap-3 mt-4 pb-2 text-xs font-bold text-slate-500">
                  <span>Red social</span>
                  <span>¿Cómo obtener tu enlace?</span>
                  <span>Enlace de tu perfil</span>
                  <span className="text-center">Acción</span>
                </div>
                <div className="flex flex-col gap-2 mt-1">
                  {REDES.map(r => {
                    const valor = redes[r.id] || '';
                    const abierto = tutAbierto === r.id;
                    return (
                      <div key={r.id} className="border-b border-slate-100 last:border-0 pb-2">
                        <div className="grid md:grid-cols-[170px_210px_1fr_110px] gap-2 md:gap-3 items-center py-2">
                          <div className="flex items-center gap-2.5">
                            <span className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: FONDO_MARCA[r.id] }}>
                              <RedIcon id={r.id} className="w-5 h-5" />
                            </span>
                            <span className="text-sm font-bold text-slate-800">{NOMBRE_MOSTRAR[r.id]}</span>
                          </div>
                          <button
                            onClick={() => setTutAbierto(abierto ? null : r.id)}
                            className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#6236FF] border border-[#6236FF]/40 rounded-lg px-3 py-2 hover:bg-[#6236FF]/5 active:scale-95 transition-all w-fit md:w-full"
                          >
                            <PlayCircle className="w-4 h-4" /> {abierto ? 'Ocultar tutorial' : 'Ver tutorial (10 seg)'}
                          </button>
                          <div className="min-w-0">
                            <input
                              type="url"
                              inputMode="url"
                              value={valor}
                              onChange={e => setRedes(prev => ({ ...prev, [r.id]: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter') guardar(r.id); }}
                              placeholder={r.id === 'youtube' ? 'Pega aquí el enlace de tu canal de YouTube' : `Pega aquí el enlace de tu perfil de ${NOMBRE_MOSTRAR[r.id]}`}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#6236FF] placeholder:text-slate-400"
                            />
                            {errs[r.id] ? <p className="text-red-500 text-xs mt-1">{errs[r.id]}</p> : null}
                          </div>
                          <button
                            onClick={() => guardar(r.id)}
                            disabled={saving === r.id}
                            className="text-sm font-bold text-white bg-gradient-to-r from-[#6236FF] to-[#8A2BE2] rounded-lg px-4 py-2 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            {saving === r.id && <Loader2 className="w-4 h-4 animate-spin" />}
                            {oks[r.id] ? 'Guardado ✓' : 'Guardar'}
                          </button>
                        </div>
                        {abierto && (
                          <ol className="md:ml-[180px] rounded-xl bg-[#eef2ff] p-3 pl-8 text-[13px] text-slate-700 list-decimal space-y-1 mb-2">
                            {r.tutorial.map((paso, i) => <li key={i}>{paso}</li>)}
                            <li className="font-bold text-[#6236FF]">Tarda unos 10 segundos.</li>
                          </ol>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* Columna derecha */}
            <div className="w-full xl:w-[320px] shrink-0 flex flex-col gap-5">
              <section ref={ayudaRef} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 scroll-mt-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-10 h-10 rounded-full bg-[#ede9fe] flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-[#6236FF]" />
                  </span>
                  <h3 className="font-extrabold text-[#6236FF]">¿Cómo funciona?</h3>
                </div>
                <div className="flex flex-col gap-4 mt-4">
                  {COMO_FUNCIONA.map((c, i) => (
                    <div key={i} className="flex gap-3">
                      <c.Icon className="w-5 h-5 text-slate-700 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-extrabold text-slate-900">{c.titulo}</p>
                        <p className="text-[13px] text-slate-500 leading-snug">{c.texto}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex gap-3">
                <span className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </span>
                <div>
                  <p className="text-sm font-extrabold text-slate-900">Tus enlaces son privados</p>
                  <p className="text-[13px] text-slate-500 leading-snug">Focusia no accede ni almacena contenido de tus redes sociales.</p>
                </div>
              </section>

              <section className="rounded-2xl bg-[#f1edfd] border border-[#e2d9fb] p-5 flex flex-col">
                <div className="flex items-center gap-2.5">
                  <span className="w-10 h-10 rounded-full bg-[#e2d9fb] flex items-center justify-center">
                    <Star className="w-5 h-5 text-[#6236FF]" />
                  </span>
                  <h3 className="font-extrabold text-[#6236FF] text-[15px]">¿Aún no configuras tus redes?</h3>
                </div>
                <p className="text-[13px] text-[#6d5bd0] mt-2">Agrega tus enlaces y tendrás acceso rápido a tus perfiles desde aquí.</p>
                <div className="relative h-24 mt-3 mb-1" aria-hidden>
                  <div className="absolute left-2 top-3 w-24 h-16 rounded-lg bg-white/70 border border-[#d5c9f5]" />
                  <div className="absolute right-2 top-3 w-24 h-16 rounded-lg bg-white/70 border border-[#d5c9f5]" />
                  <div className="absolute left-1/2 -translate-x-1/2 top-0 w-28 h-20 rounded-xl bg-white border border-[#d5c9f5] shadow-sm flex items-center justify-center">
                    <Link2 className="w-7 h-7 text-[#6236FF]" />
                  </div>
                </div>
                <button
                  onClick={irAConfiguracion}
                  className="mt-2 w-full flex items-center justify-center gap-2 text-sm font-bold text-white bg-gradient-to-r from-[#6236FF] to-[#8A2BE2] rounded-xl px-4 py-3 hover:brightness-110 active:scale-95 transition-all"
                >
                  Ir a Mis Redes Sociales <ArrowRight className="w-4 h-4" />
                </button>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
