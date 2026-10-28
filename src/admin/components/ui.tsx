import React, { useEffect, useRef, useState } from 'react';
import { X, Loader2, AlertTriangle, CheckCircle2, Image as ImageIcon, Upload, Link2 } from 'lucide-react';

/**
 * Piezas visuales compartidas por todas las pantallas del panel.
 * Sin dependencias fuera de Tailwind y lucide-react, igual que el resto de la app.
 */

// ── Layout ──

export function Card({
  titulo,
  descripcion,
  acciones,
  children,
}: {
  titulo?: string;
  descripcion?: string;
  acciones?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white dark:bg-[#14142e] rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm">
      {(titulo || acciones) && (
        <header className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/10">
          <div>
            {titulo && (
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">{titulo}</h2>
            )}
            {descripcion && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{descripcion}</p>
            )}
          </div>
          {acciones && <div className="flex items-center gap-2">{acciones}</div>}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function PageHeader({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string;
  descripcion: string;
  acciones?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">{titulo}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{descripcion}</p>
      </div>
      {acciones && <div className="flex items-center gap-2">{acciones}</div>}
    </div>
  );
}

// ── Botones ──

type Variant = 'primary' | 'ghost' | 'danger' | 'suave';

const VARIANTES: Record<Variant, string> = {
  primary:
    'bg-[#6236FF] text-white hover:brightness-110 shadow-md disabled:opacity-50',
  ghost:
    'border border-gray-200 dark:border-white/15 text-slate-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50',
  danger: 'border border-red-300 dark:border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50',
  suave: 'bg-gray-100 dark:bg-white/10 text-slate-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/15 disabled:opacity-50',
};

export function Button({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled,
  cargando,
  className = '',
  titulo,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: Variant;
  type?: 'button' | 'submit';
  disabled?: boolean;
  cargando?: boolean;
  className?: string;
  titulo?: string;
}) {
  return (
    <button
      type={type}
      title={titulo}
      onClick={onClick}
      disabled={disabled || cargando}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${VARIANTES[variant]} ${className}`}
    >
      {cargando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {children}
    </button>
  );
}

// ── Campos ──

export function Field({
  etiqueta,
  ayuda,
  error,
  children,
  requerido,
}: {
  etiqueta: string;
  ayuda?: string;
  error?: string;
  children: React.ReactNode;
  requerido?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold text-slate-600 dark:text-gray-300 mb-1.5">
        {etiqueta}
        {requerido && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
      {ayuda && !error && <span className="block text-[10px] text-gray-400 mt-1">{ayuda}</span>}
      {error && <span className="block text-[10px] text-red-500 mt-1">{error}</span>}
    </label>
  );
}

const BASE_INPUT =
  'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-[#6236FF] focus:ring-2 focus:ring-[#6236FF]/20 transition';

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${BASE_INPUT} ${props.className ?? ''}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${BASE_INPUT} resize-y min-h-[80px] ${props.className ?? ''}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${BASE_INPUT} ${props.className ?? ''}`} />;
}

export function Checkbox({
  etiqueta,
  checked,
  onChange,
  ayuda,
}: {
  etiqueta: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  ayuda?: string;
}) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#6236FF] accent-[#6236FF] cursor-pointer"
      />
      <span>
        <span className="block text-xs font-semibold text-slate-700 dark:text-gray-200">
          {etiqueta}
        </span>
        {ayuda && <span className="block text-[10px] text-gray-400 mt-0.5">{ayuda}</span>}
      </span>
    </label>
  );
}

/**
 * Campo de medio: URL externa o archivo subido, nunca ambos a la vez en la
 * interfaz pero ambos aceptados por el backend. La URL manda si está puesta,
 * así que avisamos cuál de los dos va a prevalecer.
 */
export function MediaField({
  etiqueta,
  url,
  archivo,
  urlResuelta,
  onUrl,
  onArchivo,
  acepta = 'image/*',
  ayuda,
}: {
  etiqueta: string;
  url: string;
  archivo: File | null;
  urlResuelta?: string;
  onUrl: (v: string) => void;
  onArchivo: (f: File | null) => void;
  acepta?: string;
  ayuda?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <Field etiqueta={etiqueta} ayuda={ayuda}>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              value={url}
              onChange={(e) => onUrl(e.target.value)}
              placeholder="https://…"
              className="pl-8"
            />
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={acepta}
            className="hidden"
            onChange={(e) => onArchivo(e.target.files?.[0] ?? null)}
          />
          <Button variant="ghost" onClick={() => inputRef.current?.click()}>
            <Upload className="w-3.5 h-3.5" />
            Subir
          </Button>
          {archivo && (
            <Button
              variant="ghost"
              titulo="Quitar el archivo seleccionado"
              onClick={() => {
                onArchivo(null);
                if (inputRef.current) inputRef.current.value = '';
              }}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </Field>

      {archivo && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3" />
          Se subirá “{archivo.name}”. Si también hay URL, gana la URL.
        </p>
      )}

      {urlResuelta && !archivo && (
        <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
          <ImageIcon className="w-3 h-3 shrink-0" />
          <a
            href={urlResuelta}
            target="_blank"
            rel="noreferrer"
            className="truncate hover:underline text-indigo-600 dark:text-indigo-400"
          >
            {urlResuelta}
          </a>
        </div>
      )}
    </div>
  );
}

// ── Modal ──

export function Modal({
  abierto,
  onCerrar,
  titulo,
  descripcion,
  ancho = 'max-w-2xl',
  children,
  pie,
}: {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  descripcion?: string;
  ancho?: string;
  children: React.ReactNode;
  pie?: React.ReactNode;
}) {
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto"
      onClick={onCerrar}
    >
      <div
        className={`bg-white dark:bg-[#14142e] rounded-2xl shadow-2xl w-full ${ancho} my-8 border border-gray-100 dark:border-white/10`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-100 dark:border-white/10 sticky top-0 bg-white dark:bg-[#14142e] rounded-t-2xl z-10">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{titulo}</h3>
            {descripcion && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{descripcion}</p>
            )}
          </div>
          <button
            onClick={onCerrar}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </header>
        <div className="px-6 py-5 space-y-4">{children}</div>
        {pie && (
          <footer className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-white/10">
            {pie}
          </footer>
        )}
      </div>
    </div>
  );
}

// ── Estados ──

export function Aviso({ tipo, children }: { tipo: 'error' | 'ok'; children: React.ReactNode }) {
  const esError = tipo === 'error';
  return (
    <div
      className={`flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs ${
        esError
          ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/20'
          : 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-500/20'
      }`}
    >
      {esError ? (
        <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
      ) : (
        <CheckCircle2 className="w-4 h-4 shrink-0 mt-px" />
      )}
      <span>{children}</span>
    </div>
  );
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-400">
      <Loader2 className="w-4 h-4 animate-spin" />
      {texto}
    </div>
  );
}

export function Vacio({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-10">{children}</p>
  );
}

/** Confirmación para borrados: el panel borra contenido que ve la gente. */
export function useConfirmacion() {
  const [pendiente, setPendiente] = useState<{
    titulo: string;
    mensaje: string;
    confirmar: () => Promise<void>;
  } | null>(null);

  const pedir = (titulo: string, mensaje: string, confirmar: () => Promise<void>) =>
    setPendiente({ titulo, mensaje, confirmar });

  const cerrar = () => setPendiente(null);

  const dialogo = pendiente ? (
    <Modal
      abierto
      onCerrar={cerrar}
      titulo={pendiente.titulo}
      descripcion={pendiente.mensaje}
      ancho="max-w-md"
      pie={
        <>
          <Button variant="ghost" onClick={cerrar}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              await pendiente.confirmar();
              setPendiente(null);
            }}
          >
            Sí, eliminar
          </Button>
        </>
      }
    >
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Esta acción no se puede deshacer. Si el contenido ya lo consumieron personas
        usuarias, el servidor lo va a rechazar y te lo va a explicar.
      </p>
    </Modal>
  ) : null;

  return { pedir, dialogo };
}

/** Carga simple con estado de error y recarga. */
export function useCarga<T>(cargar: () => Promise<T>, deps: React.DependencyList) {
  const [datos, setDatos] = useState<T | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contador, setContador] = useState(0);

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    setError(null);
    cargar()
      .then((d) => vivo && setDatos(d))
      .catch((e) => vivo && setError(e?.message ?? 'Error al cargar.'))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, contador]);

  return { datos, cargando, error, recargar: () => setContador((c) => c + 1) };
}
