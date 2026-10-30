import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, Bell, Briefcase, Cake, CalendarDays, Check, ChevronLeft, ChevronRight,
  Gift, Heart, Loader2, PartyPopper, Phone, Plus, Trash2, User, Users, X,
} from 'lucide-react';
import {
  cumpleanosService,
  type CumpleanosAccion,
  type CumpleanosCategoria,
  type CumpleanosData,
} from '../services/api';
import ModuleShell from './ModuleShell';

const CATEGORIAS: { key: CumpleanosCategoria; label: string; Icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { key: 'Familia', label: 'Familia', Icon: Heart, color: 'text-pink-500' },
  { key: 'Familiares', label: 'Familiares', Icon: Users, color: 'text-orange-500' },
  { key: 'Amigos', label: 'Amigos', Icon: User, color: 'text-orange-500' },
  { key: 'Trabajo', label: 'Compañeros de trabajo', Icon: Briefcase, color: 'text-orange-500' },
];

const PERSONALIZADO = -1;

const ANTICIPACIONES: { label: string; dias: number }[] = [
  { label: 'El mismo día', dias: 0 },
  { label: 'Un día antes', dias: 1 },
  { label: 'Tres días antes', dias: 3 },
  { label: 'Una semana antes', dias: 7 },
  { label: 'Dos semanas antes', dias: 14 },
  { label: 'Un mes antes', dias: 30 },
  { label: 'Personalizado', dias: PERSONALIZADO },
];

const ACCIONES: { key: CumpleanosAccion; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'regalo', label: 'Comprar regalo', Icon: Gift },
  { key: 'celebracion', label: 'Planificar celebración', Icon: PartyPopper },
  { key: 'llamada', label: 'Preparar llamada', Icon: Phone },
  { key: 'otra', label: 'Otra acción', Icon: Plus },
];

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const DIAS_SEMANA = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

const hoy = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const pad = (n: number) => String(n).padStart(2, '0');

const isoDe = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const diasHasta = (iso: string) =>
  Math.round((new Date(iso + 'T00:00:00').getTime() - hoy().getTime()) / 86400000);

/** "15 de agosto" a partir de la fecha ISO de la próxima ocurrencia. */
function fechaCumple(iso: string): string {
  const [, mes, dia] = iso.split('-').map(Number);
  return `${dia} de ${MESES[mes - 1]}`;
}

function categoriaLabel(key: string): string {
  return CATEGORIAS.find(c => c.key === key)?.label ?? key;
}

/** Estado del recordatorio que muestra cada tarjeta. */
function estadoRecordatorio(c: CumpleanosData): string {
  const dias = diasHasta(c.fecha_proxima);
  if (dias <= 0) return '🎉 ¡Es hoy! Felicita a quien quieres.';
  if (c.aviso_enviado) return '🔔 Recordatorio enviado por Focusia.';
  const diasAviso = diasHasta(c.fecha_aviso);
  if (diasAviso <= 0) return '🔔 El recordatorio se envía hoy.';
  if (diasAviso === 1) return '🔔 Recordatorio programado para mañana.';
  return `🔔 Recordatorio programado dentro de ${diasAviso} días.`;
}

/** Tarjeta de un cumpleaños registrado. */
function CumpleanosCard({ cumple, onEliminar, onAccion }: {
  cumple: CumpleanosData;
  onEliminar: (id: number) => void;
  onAccion: (id: number, accion: CumpleanosAccion, detalle?: string) => Promise<void>;
}) {
  const dias = diasHasta(cumple.fecha_proxima);
  const recordatorioVigente = dias <= cumple.anticipacion_dias;
  const [enviadas, setEnviadas] = useState<string[]>([]);
  const [otraAbierta, setOtraAbierta] = useState(false);
  const [otraTexto, setOtraTexto] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const ejecutar = async (accion: CumpleanosAccion, detalle?: string) => {
    setOcupado(true);
    try {
      await onAccion(cumple.id, accion, detalle);
      const label = ACCIONES.find(a => a.key === accion)?.label ?? 'Acción';
      setEnviadas(prev => [...prev, detalle?.trim() || label]);
      setOtraAbierta(false);
      setOtraTexto('');
    } finally {
      setOcupado(false);
    }
  };

  return (
    <article className="bg-white dark:bg-[#1a1a3a] rounded-2xl border border-[#ECE7F8] dark:border-white/10 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-xl leading-none shrink-0" aria-hidden>🎂</span>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-[#1B1440] dark:text-white truncate">
              {cumple.nombre}
            </h3>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-[#F1EBFF] dark:bg-white/10 text-[11px] font-semibold text-[#6236FF] dark:text-purple-300">
              {categoriaLabel(cumple.categoria)}
            </span>
          </div>
        </div>
        <button
          onClick={() => onEliminar(cumple.id)}
          title="Eliminar cumpleaños"
          className="text-slate-300 hover:text-rose-500 dark:text-gray-500 dark:hover:text-rose-400 transition-colors shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <p className="mt-3 text-sm font-medium text-[#2B2350] dark:text-gray-200">
        {fechaCumple(cumple.fecha_proxima)}
      </p>
      <p className="text-sm text-slate-500 dark:text-gray-400">
        ⏳ {dias <= 0 ? '¡Es hoy!' : dias === 1 ? 'Falta 1 día.' : `Faltan ${dias} días.`}
      </p>
      <p className="mt-1.5 text-[12.5px] text-slate-500 dark:text-gray-400">
        {estadoRecordatorio(cumple)}
      </p>

      {recordatorioVigente && (
        <div className="mt-4 pt-4 border-t border-[#ECE7F8] dark:border-white/10">
          <p className="text-[13px] font-semibold text-[#1B1440] dark:text-white">
            ¿Te gustaría comenzar a prepararlo desde ahora?
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {ACCIONES.map(({ key, label, Icon }) => (
              key === 'otra' ? (
                <button
                  key={key}
                  onClick={() => setOtraAbierta(v => !v)}
                  disabled={ocupado}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E4DEF5] dark:border-white/15 text-[12.5px] font-semibold text-[#2B2350] dark:text-gray-200 hover:bg-[#F8F5FF] dark:hover:bg-white/5 transition-colors"
                >
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ) : (
                <button
                  key={key}
                  onClick={() => ejecutar(key)}
                  disabled={ocupado}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E4DEF5] dark:border-white/15 text-[12.5px] font-semibold text-[#2B2350] dark:text-gray-200 hover:bg-[#F8F5FF] dark:hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              )
            ))}
          </div>
          {otraAbierta && (
            <form
              className="mt-2.5 flex gap-2"
              onSubmit={e => {
                e.preventDefault();
                if (otraTexto.trim()) ejecutar('otra', otraTexto);
              }}
            >
              <input
                autoFocus
                value={otraTexto}
                onChange={e => setOtraTexto(e.target.value)}
                placeholder="Describe la acción…"
                maxLength={120}
                className="flex-1 min-w-0 rounded-lg border border-[#E4DEF5] dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-[13px] text-[#1B1440] dark:text-white placeholder:text-slate-400 outline-none focus:border-[#6236FF]"
              />
              <button
                type="submit"
                disabled={ocupado || !otraTexto.trim()}
                className="px-3 py-1.5 rounded-lg bg-[#6236FF] text-white text-[12.5px] font-semibold hover:brightness-110 disabled:opacity-40"
              >
                Enviar
              </button>
            </form>
          )}
          {enviadas.length > 0 && (
            <ul className="mt-2.5 space-y-1">
              {enviadas.map((t, i) => (
                <li key={i} className="flex items-center gap-1.5 text-[12px] text-emerald-600 dark:text-emerald-400">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  «{t}» enviada al Kanban Backlog.
                </li>
              ))}
            </ul>
          )}
          {ocupado && (
            <p className="mt-2 flex items-center gap-1.5 text-[12px] text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Enviando al Kanban Backlog…
            </p>
          )}
        </div>
      )}
    </article>
  );
}

/** Calendario del paso 2 (días de meses adyacentes incluidos, como en el diseño). */
function Calendario({ fecha, onSeleccionar }: {
  fecha: string | null;
  onSeleccionar: (iso: string) => void;
}) {
  const base = fecha ? new Date(fecha + 'T00:00:00') : hoy();
  const [anio, setAnio] = useState(base.getFullYear());
  const [mes, setMes] = useState(base.getMonth());

  const celdas = useMemo(() => {
    const offset = (new Date(anio, mes, 1).getDay() + 6) % 7;
    const diasDelMes = new Date(anio, mes + 1, 0).getDate();
    const total = Math.ceil((offset + diasDelMes) / 7) * 7;
    return Array.from({ length: total }, (_, i) => {
      const d = new Date(anio, mes, 1 - offset + i);
      return { iso: isoDe(d), dia: d.getDate(), delMes: d.getMonth() === mes };
    });
  }, [anio, mes]);

  const mover = (delta: number) => {
    const f = new Date(anio, mes + delta, 1);
    setAnio(f.getFullYear());
    setMes(f.getMonth());
  };

  const nombreMes = MESES[mes].charAt(0).toUpperCase() + MESES[mes].slice(1);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => mover(-1)}
          className="p-1 text-[#6236FF] hover:opacity-70 transition-opacity"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <p className="text-sm font-semibold text-[#1B1440] dark:text-white">
          {nombreMes} {anio}
        </p>
        <button
          onClick={() => mover(1)}
          className="p-1 text-[#6236FF] hover:opacity-70 transition-opacity"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-slate-400">
        {DIAS_SEMANA.map(d => <span key={d}>{d}</span>)}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-y-1 text-center text-[13px]">
        {celdas.map(c => {
          const seleccionado = c.iso === fecha;
          return (
            <button
              key={c.iso}
              type="button"
              onClick={() => onSeleccionar(c.iso)}
              className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                seleccionado
                  ? 'bg-[#6236FF] font-semibold text-white'
                  : c.delMes
                    ? 'text-[#1B1440] dark:text-gray-200 hover:bg-[#F1EBFF] dark:hover:bg-white/10'
                    : 'text-slate-300 dark:text-gray-600 hover:bg-[#F1EBFF] dark:hover:bg-white/10'
              }`}
            >
              {c.dia}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const CONFETI: { top: string; left: string; color: string }[] = [
  { top: '4%', left: '18%', color: 'bg-pink-400' },
  { top: '0%', left: '70%', color: 'bg-amber-400' },
  { top: '14%', left: '86%', color: 'bg-sky-400' },
  { top: '30%', left: '6%', color: 'bg-violet-400' },
  { top: '34%', left: '92%', color: 'bg-emerald-400' },
  { top: '18%', left: '40%', color: 'bg-rose-300' },
];

/** Asistente de creación guiado: 5 pasos y pantalla de confirmación. */
function Asistente({ onCerrar, onListo }: {
  onCerrar: () => void;
  onListo: () => void;
}) {
  const [paso, setPaso] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [categoria, setCategoria] = useState<CumpleanosCategoria | null>(null);
  const [fecha, setFecha] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [anticipacion, setAnticipacion] = useState<number | null>(7);
  const [personalizado, setPersonalizado] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esPersonalizado = anticipacion === PERSONALIZADO;
  const personalizadoValido = /^\d+$/.test(personalizado) && Number(personalizado) <= 365;
  const diasElegidos = esPersonalizado
    ? (personalizadoValido ? Number(personalizado) : 0)
    : (anticipacion ?? 0);

  const textoAnticipacion = esPersonalizado
    ? `${diasElegidos} ${diasElegidos === 1 ? 'día' : 'días'} antes`
    : ANTICIPACIONES.find(a => a.dias === anticipacion)?.label ?? '';

  const puedeAvanzar = (): boolean => {
    if (paso === 1) return categoria !== null;
    if (paso === 2) return fecha !== null;
    if (paso === 3) return nombre.trim().length > 0;
    if (paso === 4) return esPersonalizado ? personalizadoValido : anticipacion !== null;
    return true;
  };

  const siguiente = () => {
    if (puedeAvanzar() && paso < 5) setPaso(p => (p + 1) as typeof paso);
  };

  const finalizar = async () => {
    if (!categoria || !fecha) return;
    setGuardando(true);
    setError(null);
    try {
      await cumpleanosService.crear({
        nombre: nombre.trim(),
        categoria,
        fecha,
        anticipacion_dias: diasElegidos,
      });
      setPaso(6);
    } catch (e: unknown) {
      const mensaje = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(mensaje || 'No pudimos registrar el cumpleaños. Inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const TITULOS: Record<number, string> = {
    1: 'Selecciona la categoría',
    2: 'Selecciona la fecha',
    3: '¿Cómo se llama la persona?',
    4: '¿Cuánto antes quieres que Focusia te recuerde?',
    5: 'Revisa la información',
  };

  const ICONOS: Record<number, React.ComponentType<{ className?: string }>> = {
    1: Users,
    2: CalendarDays,
    3: User,
    4: Bell,
  };

  const Icono = ICONOS[paso];

  if (paso === 6) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
        <div className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-[#1a1a3a] p-6 shadow-2xl text-center">
          {CONFETI.map((c, i) => (
            <span
              key={i}
              className={`absolute h-2 w-2 rounded-full ${c.color}`}
              style={{ top: c.top, left: c.left }}
              aria-hidden
            />
          ))}
          <div className="relative mx-auto mt-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 shadow-lg">
            <Check className="h-10 w-10 text-white" strokeWidth={3} />
          </div>
          <h2 className="mt-6 text-xl font-bold text-[#1B1440] dark:text-white">¡Listo!</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-gray-400">
            El cumpleaños ha sido registrado. Focusia te acompañará para que nunca olvides una fecha importante.
          </p>
          <button
            onClick={onListo}
            className="mt-6 w-full rounded-lg border-2 border-[#6236FF] py-3 text-sm font-semibold text-[#6236FF] hover:bg-[#F8F5FF] dark:hover:bg-white/5 transition-colors"
          >
            Ver mis cumpleaños
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
      <div className="relative w-full max-w-sm max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#1a1a3a] p-6 shadow-2xl">
        <button
          onClick={onCerrar}
          aria-label="Cerrar"
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <span className="inline-block rounded-md bg-[#4B2FE0] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
          Paso {paso}
        </span>

        <h2 className="mt-4 text-center text-lg font-bold text-[#1B1440] dark:text-white">
          {TITULOS[paso]}
        </h2>

        {Icono && (
          <div className="mt-3 flex justify-center">
            <Icono className="h-9 w-9 text-[#6236FF]" />
          </div>
        )}

        <div className="mt-5">
          {paso === 1 && (
            <div className="space-y-2.5">
              {CATEGORIAS.map(({ key, label, Icon, color }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategoria(key)}
                  className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium text-[#1B1440] dark:text-white transition-colors ${
                    categoria === key
                      ? 'border-[#6236FF] bg-[#F8F5FF] dark:bg-white/10'
                      : 'border-[#ECE7F8] dark:border-white/10 hover:border-[#C9BCFF]'
                  }`}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${color}`} />
                  {label}
                </button>
              ))}
            </div>
          )}

          {paso === 2 && <Calendario fecha={fecha} onSeleccionar={setFecha} />}

          {paso === 3 && (
            <div>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  autoFocus
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') siguiente(); }}
                  maxLength={160}
                  placeholder="Escribe el nombre"
                  className="w-full rounded-xl border-2 border-[#E4DEF5] dark:border-white/10 bg-white dark:bg-white/5 py-3 pl-12 pr-4 text-[15px] text-[#1B1440] dark:text-white placeholder:text-slate-400 outline-none focus:border-[#6236FF]"
                />
              </div>
              <p className="mt-2 text-center text-xs text-slate-400">Ejemplo: Juan, María, Carla</p>
            </div>
          )}

          {paso === 4 && (
            <div className="space-y-3">
              {ANTICIPACIONES.map(({ label, dias }) => (
                <button
                  key={dias}
                  type="button"
                  onClick={() => setAnticipacion(dias)}
                  className="flex w-full items-center gap-3 text-left text-sm text-[#1B1440] dark:text-white"
                >
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                    anticipacion === dias ? 'border-[#6236FF]' : 'border-slate-300 dark:border-white/30'
                  }`}>
                    {anticipacion === dias && <span className="h-2 w-2 rounded-full bg-[#6236FF]" />}
                  </span>
                  {label}
                </button>
              ))}
              <div className="flex items-center gap-2 pl-7 pt-1">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={365}
                  disabled={!esPersonalizado}
                  value={personalizado}
                  onChange={e => setPersonalizado(e.target.value)}
                  placeholder="0"
                  className="w-20 rounded-md border border-slate-300 dark:border-white/15 bg-white dark:bg-white/5 px-2.5 py-1.5 text-sm text-[#1B1440] dark:text-white outline-none focus:border-[#6236FF] disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-white/5"
                />
                <span className="text-sm text-slate-500 dark:text-gray-400">días antes</span>
              </div>
            </div>
          )}

          {paso === 5 && categoria && fecha && (
            <div className="divide-y divide-[#ECE7F8] dark:divide-white/10">
              {[
                { label: 'Categoría', value: categoriaLabel(categoria), Icon: Heart, color: 'text-pink-500' },
                { label: 'Nombre', value: nombre.trim(), Icon: User, color: 'text-[#6236FF]' },
                { label: 'Fecha', value: fechaCumple(fecha), Icon: CalendarDays, color: 'text-[#6236FF]' },
                { label: 'Recordar', value: textoAnticipacion, Icon: Bell, color: 'text-[#6236FF]' },
              ].map(({ label, value, Icon, color }) => (
                <div key={label} className="flex items-center justify-between gap-3 py-3">
                  <span className="flex items-center gap-2 text-sm text-[#1B1440] dark:text-gray-300">
                    <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                    {label}:
                  </span>
                  <span className="text-right text-sm font-semibold text-[#1B1440] dark:text-white">{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p className="mt-4 flex items-center gap-1.5 text-[13px] text-rose-600">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </p>
        )}

        <button
          type="button"
          onClick={paso === 5 ? finalizar : siguiente}
          disabled={!puedeAvanzar() || guardando}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#3D1FD6] to-[#7A2BE8] py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:opacity-40"
        >
          {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
          {paso === 5 ? 'Finalizar' : 'Continuar'}
        </button>

        {paso > 1 && (
          <button
            type="button"
            onClick={() => setPaso(p => (p - 1) as typeof paso)}
            disabled={guardando}
            className="mt-3 w-full py-1 text-sm font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors disabled:opacity-40"
          >
            Atrás
          </button>
        )}
      </div>
    </div>
  );
}

export default function CumpleanosScreen({ userName, onBack, onNavigate }: {
  userName?: string;
  onBack: () => void;
  onNavigate?: (section: string) => void;
}) {
  const [items, setItems] = useState<CumpleanosData[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [asistente, setAsistente] = useState(false);

  const cargar = () => {
    cumpleanosService.listar()
      .then(setItems)
      .catch(() => setError('No pudimos cargar tus cumpleaños. Vuelve a entrar en un momento.'));
  };

  useEffect(cargar, []);

  const eliminar = async (id: number) => {
    setItems(prev => prev ? prev.filter(c => c.id !== id) : prev);
    try {
      await cumpleanosService.eliminar(id);
    } catch {
      cargar();
    }
  };

  const enviarAccion = async (id: number, accion: CumpleanosAccion, detalle?: string) => {
    await cumpleanosService.enviarAccion(id, accion, detalle);
  };

  const cerrarAsistente = () => {
    setAsistente(false);
    cargar();
  };

  return (
    <ModuleShell
      activeNav="cumple"
      userName={userName}
      onBack={onBack}
      onNavigate={onNavigate}
      titulo="Cumpleaños"
      subtitulo="Prepara cada cumpleaños con tiempo y fortalece tus vínculos."
      iconoTitulo={Cake}
    >
      <div className="px-4 pb-4 md:px-4 lg:pb-4 pt-6">
        <div className="max-w-3xl mx-auto">

          <section className="w-full relative overflow-hidden rounded-md bg-[radial-gradient(circle_at_85%_20%,#8A2BE2_0%,#6236FF_45%,#2A1745_100%)] p-4 sm:p-6 text-white shadow-[0_12px_34px_rgba(58,20,90,0.25)]">
            <h2 className="flex items-center gap-3 text-xs sm:text-xs font-bold leading-snug max-w-3xl">
              <Heart className="w-10 h-10 text-white fill-white shrink-0" />
              <span>¿Cómo te sientes cuando estás de cumpleaños y te llega un saludo, un regalo, un abrazo, una llamada o un mensaje bonito?</span>
            </h2>
          </section>

          <p className="mt-3 text-sm text-black/80">
            Comencemos registrando las personas que son importantes para ti.
          </p>
          <button
            onClick={() => setAsistente(true)}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-white text-[#6236FF] text-sm font-bold shadow-md hover:brightness-95 active:scale-[0.98] transition"
          >
            <Plus className="w-4 h-4" /> Agregar cumpleaños
          </button>

          <h3 className="mt-8 mb-3 text-base font-bold text-[#1B1440] dark:text-white">
            Próximos cumpleaños
          </h3>

          {items === null && !error && (
            <div className="bg-white dark:bg-[#1a1a3a] rounded-2xl border border-[#ECE7F8] dark:border-white/10 p-8 flex items-center gap-3 text-slate-500 dark:text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" /> Preparando tus cumpleaños…
            </div>
          )}

          {error && (
            <div className="bg-white dark:bg-[#1a1a3a] rounded-2xl border border-rose-100 dark:border-rose-500/20 p-8 flex items-start gap-3 text-rose-600">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {items !== null && !error && items.length === 0 && (
            <div className="bg-white dark:bg-[#1a1a3a] rounded-2xl border border-dashed border-[#E4DEF5] dark:border-white/15 p-10 text-center">
              <Cake className="w-8 h-8 mx-auto text-[#C9BCFF]" />
              <p className="mt-3 text-sm font-semibold text-[#1B1440] dark:text-white">
                Todavía no hay cumpleaños registrados.
              </p>
              <p className="mt-1 text-[13px] text-slate-500 dark:text-gray-400">
                Agrega a las personas importantes y Focusia te recordará cada
                cumpleaños con anticipación, todos los años.
              </p>
            </div>
          )}

          {items !== null && items.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {items.map(c => (
                <CumpleanosCard
                  key={c.id}
                  cumple={c}
                  onEliminar={eliminar}
                  onAccion={enviarAccion}
                />
              ))}
            </div>
          )}

          <p className="mt-6 text-center text-[12px] text-slate-400 dark:text-gray-500">
            La lista se actualiza automáticamente cada día y cada cumpleaños se
            reprograma solo para el año siguiente.
          </p>
        </div>
      </div>

      {asistente && (
        <Asistente onCerrar={() => setAsistente(false)} onListo={cerrarAsistente} />
      )}
    </ModuleShell>
  );
}
