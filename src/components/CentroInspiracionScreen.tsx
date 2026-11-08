import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Play, X, Sparkles, Heart, Users, Smile, Zap, Star } from 'lucide-react';
import ModuleShell from './ModuleShell';
import { inspiracionService, type InspiracionVideoData } from '../services/api';

type CategoriaId = 'humor' | 'salud' | 'hobbies' | 'viajes' | 'diversion' | 'reflexion';
type Orden = 'recientes' | 'sugeridos' | 'az';

const CATEGORIAS: { id: CategoriaId; label: string; emoji: string; frase: string }[] = [
  { id: 'humor', label: 'Humor', emoji: '😂', frase: 'Ideas para hacerte reir 😂' },
  { id: 'salud', label: 'Salud', emoji: '❤️', frase: 'Ideas para sentirte mejor ❤️' },
  { id: 'hobbies', label: 'Hobbies', emoji: '🎨', frase: 'Ideas para crear y disfrutar 🎨' },
  { id: 'viajes', label: 'Viajes', emoji: '✈️', frase: 'Ideas para escaparte ✈️' },
  { id: 'diversion', label: 'Diversión', emoji: '🎉', frase: 'Ideas para celebrar 🎉' },
  { id: 'reflexion', label: 'Reflexión', emoji: '💭', frase: 'Ideas para pensar 💭' },
];

const CATEGORIA_IDS = new Set(CATEGORIAS.map(c => c.id));

function categoriaDe(valor?: string | null): CategoriaId {
  const v = (valor || '').trim().toLowerCase();
  return (CATEGORIA_IDS.has(v as CategoriaId) ? v : 'humor') as CategoriaId;
}

function normalizarCategoria(valor?: string | null): CategoriaId {
  return categoriaDe(valor);
}

function labelDe(id: CategoriaId): string {
  return CATEGORIAS.find(c => c.id === id)?.label || 'Humor';
}

function youtubeIdDe(url: string, fallback: string): string {
  if (fallback) return fallback;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtu.be') return u.pathname.replace(/^\//, '').split('/')[0] || '';
    if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      if (/^\/(embed|shorts|v)\//.test(u.pathname)) return u.pathname.split('/').filter(Boolean)[1] || '';
      return u.searchParams.get('v') || '';
    }
  } catch { /* url inválida */ }
  return '';
}

/** Portada del módulo: la foto familiar grat.jpg. Si no existe, queda el degradado. */
const HERO_IMAGE = '/grat.jpg';

/* ── Piezas de la pantalla ─────────────────────────────────────────────── */

function Miniatura({ video }: { video: InspiracionVideoData }) {
  const [fallo, setFallo] = useState(false);
  const src = !fallo ? video.miniatura_resuelta : '';
  if (src) {
    return (
      <img
        src={src}
        alt={video.titulo}
        loading="lazy"
        onError={() => setFallo(true)}
        className="w-full h-full object-cover"
      />
    );
  }
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a1a4a] to-[#6236FF]/60 text-white/70">
      <Play className="w-10 h-10" />
    </div>
  );
}

/** Tarjeta de recurso: miniatura con badge de tipo, título y «Ver inspiración». */
function TarjetaVideo({ video, onAbrir }: { video: InspiracionVideoData; onAbrir: () => void }) {
  return (
    <article className="bg-white dark:bg-[#14142e] rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
      <button
        type="button"
        onClick={onAbrir}
        className="relative w-full aspect-video bg-black/5 dark:bg-white/5 group"
        aria-label={`Ver video: ${video.titulo}`}
      >
        <Miniatura video={video} />
        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-white/90 dark:bg-[#0A0A26]/80 text-[10px] font-bold text-slate-700 dark:text-gray-200 shadow-sm">
          {video.categoria_label}
        </span>
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/15 transition-colors">
          <span className="w-11 h-11 rounded-full bg-white/95 text-[#6236FF] flex items-center justify-center shadow-lg opacity-95 group-hover:scale-105 transition-transform">
            <Play className="w-4.5 h-4.5 ml-0.5" fill="currentColor" />
          </span>
        </span>
      </button>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
          {video.titulo}
        </h3>
        <button
          type="button"
          onClick={onAbrir}
          className="mt-3 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-indigo-300/70 text-indigo-600 dark:text-purple-300 dark:border-purple-400/40 text-xs font-bold hover:bg-indigo-50 dark:hover:bg-white/5 transition-colors"
        >
          <Play className="w-3.5 h-3.5" fill="currentColor" />
          Ver inspiración
        </button>
      </div>
    </article>
  );
}

/** Pulso de emoji-categoría del mockup: tarjeta blanca con emoji + label. */
function ChipCategoria({ emoji, label, sel, onClick }: {
  emoji: string; label: string; sel: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-[92px] px-4 py-3 rounded-2xl bg-white dark:bg-[#14142e] flex flex-col items-center gap-1 transition-all ${
        sel
          ? 'border-2 border-[#6236FF] shadow-sm'
          : 'border border-gray-100 dark:border-white/10 hover:border-[#6236FF]/40 hover:shadow-sm'
      }`}
    >
      <span className="text-2xl leading-none">{emoji}</span>
      <span className={`text-xs font-bold ${sel ? 'text-[#6236FF] dark:text-purple-300' : 'text-slate-700 dark:text-gray-200'}`}>
        {label}
      </span>
      <span className={`h-0.5 rounded-full mt-0.5 transition-all ${sel ? 'w-7 bg-[#6236FF]' : 'w-2 bg-transparent'}`} />
    </button>
  );
}

const POR_QUE_INSPIRARSE = [
  {
    Icono: Users,
    circulo: 'bg-[#EDE9FE] text-indigo-500',
    titulo: 'Fortalece vínculos',
    texto: 'Comparte momentos que unen.',
  },
  {
    Icono: Smile,
    circulo: 'bg-[#FCE7F3] text-pink-500',
    titulo: 'Mejora tu bienestar',
    texto: 'Reír y disfrutar reduce el estrés.',
  },
  {
    Icono: Zap,
    circulo: 'bg-[#FEF3C7] text-amber-500',
    titulo: 'Activa tu creatividad',
    texto: 'Nuevas ideas para cada día.',
  },
  {
    Icono: Star,
    circulo: 'bg-[#FEF9C3] text-yellow-500',
    titulo: 'Vive más momentos',
    texto: 'Pequeñas ideas, grandes recuerdos.',
  },
];

/* ── Pantalla ───────────────────────────────────────────────────────────── */

export default function CentroInspiracionScreen({
  onBack,
  userName,
  onNavigate,
  categoriaInicial,
}: {
  onBack: () => void;
  userName?: string;
  onNavigate?: (section: string) => void;
  categoriaInicial?: string;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [videos, setVideos] = useState<InspiracionVideoData[]>([]);
  const [cargando, setCargando] = useState(true);
  const [activa, setActiva] = useState<CategoriaId>(() =>
    normalizarCategoria(searchParams.get('categoria') || categoriaInicial));
  const [orden, setOrden] = useState<Orden>('recientes');
  const [reproduciendo, setReproduciendo] = useState<InspiracionVideoData | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    inspiracionService.catalogo()
      .then((data) => { if (vivo) setVideos(Array.isArray(data) ? data : []); })
      .catch(() => { if (vivo) setVideos([]); })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    const desdeUrl = searchParams.get('categoria');
    if (desdeUrl && categoriaDe(desdeUrl) !== activa) setActiva(normalizarCategoria(desdeUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const cambiarCategoria = (id: CategoriaId) => {
    setActiva(id);
    setSearchParams({ categoria: id }, { replace: true });
  };

  const catActiva = CATEGORIAS.find(c => c.id === activa) || CATEGORIAS[0];

  const visibles = useMemo(() => {
    const base = videos.filter(v => v.categoria === activa);
    if (orden === 'recientes') return [...base].reverse();
    if (orden === 'az') return [...base].sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'));
    return [...base].sort((a, b) => a.orden - b.orden);
  }, [videos, activa, orden]);

  // «Idea del día»: rotación determinística por fecha sobre la categoría activa.
  const ideaDelDia = useMemo(() => {
    if (visibles.length === 0) return null;
    const dia = new Date().getFullYear() * 366 + Math.floor((Date.now() / 86400000));
    return visibles[dia % visibles.length];
  }, [visibles]);

  const embedId = reproduciendo ? youtubeIdDe(reproduciendo.youtube_url, reproduciendo.youtube_video_id) : '';

  return (
    <ModuleShell
      activeNav="inspiracion"
      userName={userName}
      onBack={onBack}
      onNavigate={onNavigate}
      titulo="Centro de Inspiración"
      subtitulo="Descubre una idea para este momento."
      iconoTitulo={Sparkles}
    >
      <div ref={scrollRef} className="h-full overflow-y-auto">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-5">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">

            {/* ── Columna principal ─────────────────────────────────── */}
            <div className="flex flex-col gap-5 min-w-0">

              {/* Portada: familia + tarjeta blanca flotante (mockup) */}
              <section className="relative overflow-hidden rounded-2xl bg-[#2A1B4D] min-h-[230px] sm:min-h-[260px]">
                <img
                  src={HERO_IMAGE}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover object-center"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#150A26]/40 via-[#1D1036]/25 to-transparent" />
                <div className="absolute left-5 sm:left-8 top-1/2 -translate-y-1/2 bg-white/95 dark:bg-[#14142e]/95 rounded-2xl shadow-xl p-5 sm:p-7 max-w-[300px] sm:max-w-[340px]">
                  <span className="w-10 h-10 rounded-xl bg-[#F5F3FF] text-[#6236FF] flex items-center justify-center mb-3">
                    <Sparkles className="w-5 h-5" />
                  </span>
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                    Pequeñas ideas,<br />
                    <span className="text-[#6236FF] dark:text-purple-300">grandes momentos.</span>
                  </h2>
                  <span className="block w-10 h-[3px] bg-[#8A2BE2] rounded-full my-3" />
                  <p className="text-sm text-slate-600 dark:text-gray-300 leading-relaxed">
                    Inspírate, disfruta y crea recuerdos que quedan para siempre.
                  </p>
                </div>
              </section>

              {/* Chips de categorías */}
              <section className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#14142e] p-3 flex flex-wrap gap-2.5 justify-between">
                {CATEGORIAS.map(cat => (
                  <ChipCategoria
                    key={cat.id}
                    emoji={cat.emoji}
                    label={cat.label}
                    sel={cat.id === activa}
                    onClick={() => cambiarCategoria(cat.id)}
                  />
                ))}
              </section>

              {/* Sección de recursos */}
              <section className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#14142e] p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                    {catActiva.frase}
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-400 dark:text-gray-500">
                      {visibles.length} {visibles.length === 1 ? 'idea' : 'ideas'}
                    </span>
                    <select
                      value={orden}
                      onChange={e => setOrden(e.target.value as Orden)}
                      className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs font-semibold text-slate-700 dark:text-gray-200 px-3 py-1.5 outline-none focus:border-[#6236FF]/50"
                    >
                      <option value="recientes">Más recientes</option>
                      <option value="sugeridos">Sugeridos</option>
                      <option value="az">A — Z</option>
                    </select>
                  </div>
                </div>

                {cargando ? (
                  <div className="py-16 text-center text-sm text-slate-500 dark:text-gray-400">
                    Cargando ideas…
                  </div>
                ) : visibles.length === 0 ? (
                  <div className="py-16 text-center">
                    <Sparkles className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-sm text-slate-500 dark:text-gray-400">
                      Aún no hay ideas disponibles en {catActiva.label.toLowerCase()}.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visibles.map(video => (
                      <TarjetaVideo
                        key={video.id}
                        video={video}
                        onAbrir={() => setReproduciendo(video)}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* Banda de cierre (mockup) */}
              <div className="rounded-2xl bg-[#F3F0FF] dark:bg-white/5 px-5 py-3.5 flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-[#6236FF] dark:text-purple-300 shrink-0" />
                <p className="text-sm text-slate-700 dark:text-gray-300 text-center">
                  La inspiración <span className="font-bold text-[#6236FF] dark:text-purple-300">cambia tu día</span>. Lo que haces con ella, <span className="font-bold text-[#6236FF] dark:text-purple-300">sí</span>.
                </p>
              </div>
            </div>

            {/* ── Columna lateral ───────────────────────────────────── */}
            <aside className="flex flex-col gap-4">

              {/* ¿Por qué inspirarse? */}
              <div className="rounded-2xl bg-white dark:bg-[#14142e] border border-gray-100 dark:border-white/10 p-5">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  ¿Por qué inspirarse?
                </h3>
                <span className="block w-9 h-[3px] bg-[#6236FF] rounded-full mt-1.5 mb-4" />
                <div className="flex flex-col gap-3.5">
                  {POR_QUE_INSPIRARSE.map(({ Icono, circulo, titulo, texto }) => (
                    <div key={titulo} className="flex items-start gap-3">
                      <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${circulo}`}>
                        <Icono className="w-4 h-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-slate-900 dark:text-white">{titulo}</span>
                        <span className="block text-xs text-slate-500 dark:text-gray-400 leading-snug">{texto}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Idea del día */}
              <div className="rounded-2xl bg-[#FFF8E1] dark:bg-white/5 border border-[#FDF3C7] dark:border-white/10 p-5 relative overflow-hidden">
                <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
                  <span className="w-7 h-7 rounded-lg bg-[#FDE68A] text-amber-600 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5" />
                  </span>
                  Idea del día
                </h3>
                {ideaDelDia ? (
                  <>
                    <p className="mt-2.5 text-sm text-slate-700 dark:text-gray-300 leading-relaxed">
                      «{ideaDelDia.titulo}» — una idea de {labelDe(activa).toLowerCase()} para tu momento de hoy.
                    </p>
                    <button
                      type="button"
                      onClick={() => setReproduciendo(ideaDelDia)}
                      className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-400/70 text-amber-700 dark:text-amber-300 text-xs font-bold hover:bg-[#FDE68A]/30 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" fill="currentColor" />
                      Ver la idea
                    </button>
                  </>
                ) : (
                  <p className="mt-2.5 text-sm text-slate-700 dark:text-gray-300 leading-relaxed">
                    Una buena risa hoy puede convertirse en el mejor recuerdo de mañana.
                  </p>
                )}
                <Heart className="absolute -bottom-1 right-2 w-8 h-8 text-amber-300/70" strokeWidth={2} />
              </div>

              {/* Cita */}
              <div className="rounded-2xl bg-gradient-to-br from-[#F5F3FF] to-[#EDE9FE] dark:bg-white/5 dark:border dark:border-white/10 p-5 relative overflow-hidden">
                <span className="text-4xl text-[#6236FF] leading-none font-serif">"</span>
                <p className="text-sm text-slate-700 dark:text-gray-300 leading-relaxed mt-1">
                  La inspiración existe, pero tiene que encontrarte trabajando y jugando.
                </p>
                <p className="text-xs text-slate-500 dark:text-gray-500 mt-3">— Pablo Picasso</p>
                {/* Vela decorativa */}
                <div
                  aria-hidden
                  className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full opacity-60 blur-xl"
                  style={{ background: 'radial-gradient(circle at 30% 70%, #C4B5FD, transparent 70%)' }}
                />
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* Reproductor modal incrustado (permanece en Focusia, sin nueva pestaña) */}
      {reproduciendo && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={reproduciendo.titulo}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setReproduciendo(null)}
            aria-label="Cerrar"
            tabIndex={-1}
          />
          <div className="relative w-full max-w-4xl bg-[#0A0A26] rounded-2xl shadow-2xl overflow-hidden border border-white/10">
            <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-white/10">
              <h3 className="text-sm sm:text-base font-bold text-white truncate pr-2">
                {reproduciendo.titulo}
              </h3>
              <button
                type="button"
                onClick={() => setReproduciendo(null)}
                className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Cerrar reproductor"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative w-full aspect-video bg-black">
              {embedId ? (
                <iframe
                  title={reproduciendo.titulo}
                  src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(embedId)}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm px-6 text-center">
                  No se pudo cargar el video. Verifica el enlace en el panel administrativo.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
