import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, Clock, Pill, Check, CheckCircle2, Bell,
  X, Plus, Minus, Filter, Info, ShieldCheck, Loader2, History, Trash2,
  MoreVertical, ChevronDown,
} from 'lucide-react';
import {
  suplementoService,
  type SuplementoData,
  type SuplementoTipo,
} from '../services/api';
import ModuleShell from './ModuleShell';

/* ──────────────────────────────────────────────────────────────────────────
   Doc 21 · Suplementos y Medicamentos
   Vista digitalizada del mockup: tarjetas por estado, filtros por
   tipo/estado, panel «¿Cómo funciona?» y asistente de 5 pasos.
   ────────────────────────────────────────────────────────────────────────── */

/* ── Estados visuales (mockup: verde / ámbar / rojo) ── */
const ESTADOS = {
  al_dia: {
    label: 'Al día',
    badge: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    borde: 'border-l-emerald-400',
    thumb: 'from-emerald-50 to-emerald-100 text-emerald-500',
  },
  proxima: {
    label: 'Próxima toma',
    badge: 'bg-amber-50 text-amber-600 border-amber-200',
    borde: 'border-l-amber-400',
    thumb: 'from-amber-50 to-amber-100 text-amber-500',
  },
  pendiente: {
    label: 'Toma pendiente',
    badge: 'bg-rose-50 text-rose-600 border-rose-200',
    borde: 'border-l-rose-400',
    thumb: 'from-rose-50 to-rose-100 text-rose-500',
  },
  finalizado: {
    label: 'Finalizado',
    badge: 'bg-slate-100 text-slate-500 border-slate-200',
    borde: 'border-l-slate-300',
    thumb: 'from-slate-50 to-slate-100 text-slate-400',
  },
} as const;

const FRECUENCIAS = [
  { label: 'Cada 4 horas', horas: 4 },
  { label: 'Cada 6 horas', horas: 6 },
  { label: 'Cada 8 horas', horas: 8 },
  { label: 'Cada 12 horas', horas: 12 },
  { label: 'Cada 24 horas (1 al día)', horas: 24 },
];

const PRESENTACIONES = ['Cápsula', 'Comprimido', 'Tableta', 'Gota', 'Mililitro', 'Unidad'];

const FILTROS_ESTADO = [
  { key: 'todos', label: 'Todos' },
  { key: 'al_dia', label: 'Al día' },
  { key: 'proxima', label: 'Próxima toma' },
  { key: 'pendiente', label: 'Toma pendiente' },
];

const COMO_FUNCIONA = [
  {
    Icon: Pill,
    title: 'Agrega tus suplementos o medicamentos',
    desc: 'Focusia crea el calendario por ti. Tú solo ingresas la información básica.',
  },
  {
    Icon: Bell,
    title: 'Recibe recordatorios inteligentes',
    desc: 'Te avisaremos cuando sea momento de tomar cada dosis, según tu configuración.',
  },
  {
    Icon: CheckCircle2,
    title: 'Marca como tomado',
    desc: 'Confirma cada toma y Focusia actualizará tu calendario e informará la próxima dosis.',
  },
  {
    Icon: CalendarDays,
    title: 'Sigue tu tratamiento',
    desc: 'Te acompañamos hasta que termines.',
  },
];

function formatoRetraso(min: number) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/* ── Tarjeta ───────────────────────────────────────────────────────────── */

function Tarjeta({ s, marcando, onTomado, onEliminar }: {
  s: SuplementoData; marcando: boolean; onTomado: () => void; onEliminar: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const est = ESTADOS[s.estado] || ESTADOS.al_dia;
  const diaLabel = s.proxima_dia === 'mañana' ? 'Mañana'
    : s.proxima_dia === 'otro' && s.proxima_toma
      ? new Date(s.proxima_toma).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
      : 'Hoy';

  return (
    <div className={`relative flex flex-col sm:flex-row sm:items-center gap-3 rounded-md border border-gray-100 dark:border-white/10 border-l-4 ${est.borde} bg-white dark:bg-[#14142e] p-3.5 shadow-sm`}>
      <div className={`w-14 h-14 rounded-xl shrink-0 flex items-center justify-center bg-gradient-to-br ${est.thumb}`}>
        <Pill className="w-6 h-6" />
      </div>

      <div className="flex-1 min-w-0 sm:min-w-[170px]">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-base font-bold text-[#101433] dark:text-white truncate">{s.nombre}</h3>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-gray-400 whitespace-nowrap">
            {s.tipo}
          </span>
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-gray-400">
          <CalendarDays className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{s.detalle}</span>
        </p>
      </div>

      <div className="sm:w-[112px] shrink-0">
        <p className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">
          <Clock className="w-3 h-3 shrink-0" /> Próxima toma
        </p>
        <p className="text-lg font-bold text-[#101433] dark:text-white leading-tight">{s.proxima_toma_hora || '—'}</p>
        <p className="text-xs text-slate-500 dark:text-gray-400">{diaLabel}</p>
      </div>

      <div className="sm:w-[134px] shrink-0 flex flex-col items-start gap-1">
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${est.badge}`}>{est.label}</span>
        {s.tipo === 'Medicamento' && s.dias_totales ? (
          <span className="text-xs text-slate-500 dark:text-gray-400 whitespace-nowrap">Día {s.dia_actual} de {s.dias_totales}</span>
        ) : null}
        {s.estado === 'pendiente' && s.retraso_min > 0 && (
          <span className="text-xs font-bold text-rose-500 whitespace-nowrap">Retrasada {formatoRetraso(s.retraso_min)}</span>
        )}
      </div>

      <button
        type="button"
        disabled={marcando}
        onClick={onTomado}
        className="sm:w-[90px] shrink-0 rounded-md border-2 border-[#101433] dark:border-white/40 text-[#101433] dark:text-white font-bold py-2.0 text-sm flex items-center justify-center gap-1.5 hover:bg-[#101433] hover:text-white dark:hover:bg-white dark:hover:text-[#101433] transition-colors disabled:opacity-50 -ml-4"
      >
        {marcando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" strokeWidth={3} />}
        Tomado
      </button>

      <div className="absolute top-3 right-3 sm:static shrink-0">
        <button
          onClick={() => setMenu(v => !v)}
          title="Opciones"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
            <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-white dark:bg-[#1a1a3a] rounded-xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
              <button
                onClick={() => { setMenu(false); onEliminar(); }}
                className="w-full px-4 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Eliminar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Asistente (PASO 1 a 5 + confirmación) ─────────────────────────────── */

const DURACIONES = [3, 5, 7, 8, 10, 14, 21, 30];

function Dots({ paso, total }: { paso: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={`h-1.5 rounded-full transition-all ${i < paso ? 'w-5 bg-[#6236FF]' : 'w-3 bg-slate-200 dark:bg-white/20'}`} />
      ))}
    </div>
  );
}

function Asistente({ onClose, onCreado }: { onClose: () => void; onCreado: (s: SuplementoData) => void }) {
  const [paso, setPaso] = useState(1);
  const [tipo, setTipo] = useState<SuplementoTipo>('Suplemento');
  const [nombre, setNombre] = useState('');
  const [presentacion, setPresentacion] = useState('Cápsula');
  const [frecuencia, setFrecuencia] = useState<number | ''>(24);
  const [personalizada, setPersonalizada] = useState(false);
  const [frecuenciaCustom, setFrecuenciaCustom] = useState(8);
  const [hora, setHora] = useState('08:00');
  const [duracion, setDuracion] = useState(8);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = tipo === 'Medicamento' ? 5 : 4;
  const horas = personalizada ? frecuenciaCustom : (frecuencia === '' ? 0 : frecuencia);
  const puedeContinuar = paso === 1
    || (paso === 2 && nombre.trim().length > 0)
    || (paso === 3 && horas >= 1 && horas <= 72)
    || paso === 4
    || paso === 5;

  const elegirTipo = (t: SuplementoTipo) => {
    setTipo(t);
    setPresentacion(t === 'Medicamento' ? 'Comprimido' : 'Cápsula');
  };

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      const creado = await suplementoService.create({
        nombre: nombre.trim(),
        tipo,
        presentacion,
        frecuencia_horas: horas,
        hora_primera: hora,
        duracion_dias: tipo === 'Medicamento' ? duracion : null,
      });
      onCreado(creado);
    } catch {
      setError('No se pudo guardar. Revisa los datos e intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const siguiente = () => {
    if (paso < total) { setPaso(p => p + 1); return; }
    if (paso === 4 && tipo === 'Suplemento') { guardar(); return; }
    guardar();
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#14142e] rounded-2xl shadow-2xl w-full max-w-[380px] max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5">
          <span className="text-[11px] font-black tracking-widest text-[#6236FF] uppercase">Paso {paso}</span>
          <Dots paso={paso} total={total} />
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          {paso === 1 && (
            <>
              <h3 className="text-lg font-bold text-[#101433] dark:text-white">¿Qué deseas agregar?</h3>
              <p className="text-sm text-slate-500 dark:text-gray-400">Selecciona el tipo</p>
              <div className="mt-4 space-y-3">
                {([
                  { id: 'Suplemento' as SuplementoTipo, desc: 'Vitaminas, minerales, omega 3, proteínas, etc.' },
                  { id: 'Medicamento' as SuplementoTipo, desc: 'Tratamientos indicados por un profesional de salud.' },
                ]).map(op => (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => elegirTipo(op.id)}
                    className={`w-full text-left rounded-xl border-2 p-3.5 flex items-center gap-3 transition-all ${
                      tipo === op.id ? 'border-[#6236FF] bg-[#F3F0FF] dark:bg-white/5' : 'border-slate-200 dark:border-white/15 hover:border-slate-300'
                    }`}
                  >
                    <span className="w-10 h-10 rounded-xl bg-white dark:bg-white/10 border border-slate-100 dark:border-white/10 flex items-center justify-center text-[#6236FF] shrink-0">
                      <Pill className="w-5 h-5" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-bold text-[#101433] dark:text-white text-sm">{op.id}</span>
                      <span className="block text-xs text-slate-500 dark:text-gray-400">{op.desc}</span>
                    </span>
                    {tipo === op.id && (
                      <span className="w-6 h-6 rounded-full bg-[#6236FF] text-white flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {paso === 2 && (
            <>
              <h3 className="text-lg font-bold text-[#101433] dark:text-white">Nombre del elemento</h3>
              <p className="text-sm text-slate-500 dark:text-gray-400">Escribe el nombre del suplemento o medicamento</p>
              <label className="block mt-4 text-xs font-semibold text-slate-500 dark:text-gray-400">Nombre</label>
              <input
                autoFocus
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ejemplo: Vitamina D3"
                className="mt-1 w-full rounded-xl border border-slate-200 dark:border-white/15 dark:bg-white/5 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6236FF]"
              />
              <label className="block mt-4 text-xs font-semibold text-slate-500 dark:text-gray-400">Presentación</label>
              <select
                value={presentacion}
                onChange={e => setPresentacion(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 dark:border-white/15 dark:bg-white/5 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6236FF]"
              >
                {PRESENTACIONES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </>
          )}

          {paso === 3 && (
            <>
              <h3 className="text-lg font-bold text-[#101433] dark:text-white">Frecuencia</h3>
              <p className="text-sm text-slate-500 dark:text-gray-400">¿Con qué frecuencia lo tomas?</p>
              <label className="block mt-4 text-xs font-semibold text-slate-500 dark:text-gray-400">Frecuencia habitual</label>
              <select
                value={personalizada ? 'custom' : (frecuencia === '' ? '' : String(frecuencia))}
                onChange={e => {
                  if (e.target.value === 'custom') { setPersonalizada(true); return; }
                  setPersonalizada(false);
                  setFrecuencia(e.target.value === '' ? '' : Number(e.target.value));
                }}
                className="mt-1 w-full rounded-xl border border-slate-200 dark:border-white/15 dark:bg-white/5 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6236FF]"
              >
                <option value="">Selecciona una opción</option>
                {FRECUENCIAS.map(f => <option key={f.horas} value={f.horas}>{f.label}</option>)}
                <option value="custom">Personalizada</option>
              </select>
              <label className="block mt-4 text-xs font-semibold text-slate-500 dark:text-gray-400">Personalizada</label>
              <div className={`mt-1 flex items-center gap-2 rounded-xl border px-3 py-2.5 ${personalizada ? 'border-[#6236FF] bg-[#F3F0FF] dark:bg-white/5' : 'border-slate-200 dark:border-white/15 opacity-60'}`}>
                <span className="text-sm text-slate-500 dark:text-gray-400">Cada</span>
                <input
                  type="number"
                  min={1}
                  max={72}
                  disabled={!personalizada}
                  value={frecuenciaCustom}
                  onChange={e => setFrecuenciaCustom(parseInt(e.target.value) || 1)}
                  className="w-16 rounded-lg border border-slate-200 dark:border-white/15 dark:bg-white/5 px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#6236FF]"
                />
                <span className="text-sm text-slate-500 dark:text-gray-400">horas</span>
              </div>
            </>
          )}

          {paso === 4 && (
            <>
              <h3 className="text-lg font-bold text-[#101433] dark:text-white">Hora de la primera toma</h3>
              <p className="text-sm text-slate-500 dark:text-gray-400">¿A qué hora tomarás la primera dosis?</p>
              <label className="block mt-4 text-xs font-semibold text-slate-500 dark:text-gray-400">Hora</label>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/15 px-3 py-2.5">
                <Clock className="w-4 h-4 text-slate-400" />
                <input
                  type="time"
                  value={hora}
                  onChange={e => setHora(e.target.value)}
                  className="flex-1 bg-transparent text-sm focus:outline-none dark:text-white"
                />
              </div>
              <p className="mt-4 rounded-xl bg-[#F3F0FF] dark:bg-white/5 px-3 py-2.5 text-xs text-slate-500 dark:text-gray-400">
                Focusia calculará automáticamente todas las próximas tomas.
              </p>
            </>
          )}

          {paso === 5 && (
            <>
              <h3 className="text-lg font-bold text-[#101433] dark:text-white">Duración del tratamiento</h3>
              <p className="text-sm text-slate-500 dark:text-gray-400">¿Cuántos días durará tu tratamiento?</p>
              <label className="block mt-4 text-xs font-semibold text-slate-500 dark:text-gray-400">Días de tratamiento</label>
              <div className="mt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDuracion(d => Math.max(1, d - 1))}
                  className="w-11 h-11 rounded-xl border border-slate-200 dark:border-white/15 flex items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 shrink-0"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={duracion}
                  onChange={e => setDuracion(parseInt(e.target.value) || 1)}
                  className="flex-1 rounded-xl border border-slate-200 dark:border-white/15 dark:bg-white/5 px-3 py-2.5 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-[#6236FF]"
                />
                <button
                  type="button"
                  onClick={() => setDuracion(d => Math.min(365, d + 1))}
                  className="w-11 h-11 rounded-xl border border-slate-200 dark:border-white/15 flex items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <p className="mt-3 text-xs text-slate-500 dark:text-gray-400">Desde hoy hasta el día {duracion} incluido.</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {DURACIONES.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuracion(d)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${duracion === d ? 'border-[#6236FF] bg-[#F3F0FF] text-[#6236FF] dark:bg-white/5' : 'border-slate-200 dark:border-white/15 text-slate-500 hover:border-slate-300'}`}
                  >
                    {d} días
                  </button>
                ))}
              </div>
            </>
          )}

          {error && <p className="mt-3 text-xs text-rose-600">{error}</p>}
        </div>

        <div className="px-5 pb-5 flex items-center gap-3">
          {paso > 1 && (
            <button
              type="button"
              onClick={() => setPaso(p => p - 1)}
              className="flex-1 rounded-xl border border-slate-200 dark:border-white/15 py-3 font-bold text-sm text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5"
            >
              Volver
            </button>
          )}
          <button
            type="button"
            disabled={!puedeContinuar || guardando}
            onClick={siguiente}
            className={`${paso > 1 ? 'flex-[2]' : 'w-full'} rounded-xl bg-[#6236FF] text-white py-3 font-bold text-sm hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2`}
          >
            {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
            {paso === total ? 'Guardar' : 'Continuar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Confirmacion({ creado, onCerrar }: { creado: SuplementoData; onCerrar: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onCerrar}>
      <div className="bg-white dark:bg-[#14142e] rounded-2xl shadow-2xl w-full max-w-[360px] p-6 text-center" onClick={e => e.stopPropagation()}>
        <div className="relative w-20 h-20 mx-auto">
          <span className="absolute -top-1 left-0 w-2 h-2 rounded-full bg-amber-400" />
          <span className="absolute top-3 right-0 w-2.5 h-2.5 rounded-full bg-rose-400" />
          <span className="absolute bottom-1 left-1 w-2 h-2 rounded-full bg-emerald-400" />
          <span className="absolute -bottom-1 right-2 w-2 h-2 rounded-full bg-[#6236FF]" />
          <span className="absolute inset-2 rounded-full bg-emerald-500 flex items-center justify-center">
            <Check className="w-9 h-9 text-white" strokeWidth={3} />
          </span>
        </div>

        <h3 className="mt-4 text-xl font-black text-[#101433] dark:text-white">¡Listo!</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">Tu {creado.tipo.toLowerCase()} ha sido agregado correctamente.</p>

        <div className="mt-5 rounded-xl border border-gray-100 dark:border-white/10 p-3 text-left">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 text-amber-500 flex items-center justify-center shrink-0">
              <Pill className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="font-bold text-sm text-[#101433] dark:text-white truncate">{creado.nombre}</p>
              <p className="text-xs text-slate-500 dark:text-gray-400">{creado.frecuencia_label}</p>
              {creado.dias_totales ? (
                <p className="text-xs text-slate-500 dark:text-gray-400">Día {creado.dia_actual} de {creado.dias_totales}</p>
              ) : null}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/10 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-500 dark:text-gray-400">Próxima toma</span>
            <span className="ml-auto text-base font-black text-[#101433] dark:text-white">{creado.proxima_toma_hora || '—'}</span>
            <span className="text-xs text-slate-500 dark:text-gray-400">
              {creado.proxima_dia === 'mañana' ? 'Mañana' : 'Hoy'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onCerrar}
          className="mt-5 w-full rounded-xl bg-[#6236FF] text-white py-3 font-bold text-sm hover:brightness-110 transition-all"
        >
          Ir a mis suplementos
        </button>
      </div>
    </div>
  );
}

/* ── Pantalla ──────────────────────────────────────────────────────────── */

export default function SuplementosScreen({ onBack, userName, onNavigate }: {
  onBack: () => void; userName?: string; onNavigate?: (section: string) => void;
}) {
  const [activos, setActivos] = useState<SuplementoData[]>([]);
  const [historial, setHistorial] = useState<SuplementoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [marcando, setMarcando] = useState<number | null>(null);
  const [tab, setTab] = useState<'todos' | 'Suplemento' | 'Medicamento'>('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroAbierto, setFiltroAbierto] = useState(false);
  const [asistente, setAsistente] = useState(false);
  const [creado, setCreado] = useState<SuplementoData | null>(null);

  const cargar = useCallback(async () => {
    try {
      setError(null);
      const data = await suplementoService.tablero();
      setActivos(data.activos);
      setHistorial(data.historial);
    } catch {
      setError('No se pudo cargar el módulo de suplementos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const visibles = useMemo(() => activos.filter(s => {
    if (tab !== 'todos' && s.tipo !== tab) return false;
    if (filtroEstado !== 'todos' && s.estado !== filtroEstado) return false;
    return true;
  }), [activos, tab, filtroEstado]);

  const conteo = useMemo(() => ({
    todos: activos.length,
    Suplemento: activos.filter(s => s.tipo === 'Suplemento').length,
    Medicamento: activos.filter(s => s.tipo === 'Medicamento').length,
  }), [activos]);

  const marcarTomado = async (s: SuplementoData) => {
    setMarcando(s.id);
    setAviso(null);
    try {
      const tarjeta = await suplementoService.marcarTomado(s.id);
      setAviso(
        tarjeta.proxima_toma_hora
          ? `Toma de ${s.nombre} registrada. Próxima dosis: ${tarjeta.proxima_toma_hora}.`
          : `Toma de ${s.nombre} registrada. No quedan más dosis programadas.`,
      );
      await cargar();
    } catch {
      setError('No se pudo registrar la toma.');
    } finally {
      setMarcando(null);
    }
  };

  const eliminar = async (s: SuplementoData) => {
    try {
      await suplementoService.eliminar(s.id);
      await cargar();
    } catch {
      setError('No se pudo eliminar.');
    }
  };

  const TABS: { key: 'todos' | 'Suplemento' | 'Medicamento'; label: string; count: number }[] = [
    { key: 'todos', label: 'Todos', count: conteo.todos },
    { key: 'Suplemento', label: 'Suplementos', count: conteo.Suplemento },
    { key: 'Medicamento', label: 'Medicamentos', count: conteo.Medicamento },
  ];
  const filtroLabel = FILTROS_ESTADO.find(f => f.key === filtroEstado)?.label || 'Todos';

  return (
    <ModuleShell
      activeNav="suplementos"
      userName={userName}
      onBack={onBack}
      onNavigate={onNavigate}
    >
      <div className="p-6">
        <div className="max-w-[1500px] mx-auto flex flex-col xl:flex-row gap-6">
            {/* Columna principal */}
            <div className="flex-1 min-w-0 flex flex-col gap-6">
              <section className="bg-white dark:bg-[#14142e] rounded-xl border border-gray-100 dark:border-white/10 shadow-sm p-6">
                {/* Encabezado */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="w-12 h-12 rounded-xl bg-[#F3F0FF] dark:bg-white/5 text-[#6236FF] dark:text-purple-300 flex items-center justify-center shrink-0">
                      <img className="w-12 h-12" src="./pill-2.jpg" alt="Suplemento" />
                    </span>
                    <div className="min-w-0">
                      <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#101433] dark:text-white">
                        SUPLEMENTOS Y MEDICAMENTOS
                      </h1>
                      <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                        Organiza tus suplementos y tratamientos. Focusia te acompaña para que no olvides ninguna dosis.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setCreado(null); setAsistente(true); }}
                    className="shrink-0 w-full sm:w-auto justify-center bg-[#6236FF] text-white rounded-md px-3 py-2.5 font-bold text-xs flex items-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all"
                  >
                    <Plus className="w-4 h-4" strokeWidth={3} /> Agregar
                  </button>
                </div>

                {/* Filtros */}
                <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    {TABS.map(t => (
                      <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors ${
                          tab === t.key
                            ? 'bg-[#6236FF] text-white'
                            : 'bg-white dark:bg-white/5 border border-gray-200 dark:border-white/15 text-slate-600 dark:text-gray-300 hover:border-slate-300'
                        }`}
                      >
                        {t.label}
                        <span className={`text-[11px] font-bold min-w-5 h-5 px-1 rounded-full flex items-center justify-center ${
                          tab === t.key ? 'bg-white/25 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-gray-400'
                        }`}>
                          {t.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setFiltroAbierto(v => !v)}
                      className="flex items-center gap-2 rounded-md border border-gray-200 dark:border-white/15 px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-gray-300 hover:border-slate-300"
                    >
                      <Filter className="w-4 h-4" /> Estado: {filtroLabel}
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </button>
                    {filtroAbierto && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setFiltroAbierto(false)} />
                        <div className="absolute right-0 top-full mt-1 z-50 w-40 bg-white dark:bg-[#1a1a3a] rounded-md shadow-xl border border-gray-100 dark:border-white/10 overflow-hidden py-1">
                          {FILTROS_ESTADO.map(f => (
                            <button
                              key={f.key}
                              onClick={() => { setFiltroEstado(f.key); setFiltroAbierto(false); }}
                              className={`w-full px-4 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 ${
                                filtroEstado === f.key ? 'text-[#6236FF] font-semibold' : 'text-slate-600 dark:text-gray-300'
                              }`}
                            >
                              {f.label}
                              {filtroEstado === f.key && <Check className="w-4 h-4" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
                {aviso && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    <Check className="w-4 h-4 shrink-0" /> {aviso}
                  </div>
                )}

                {/* Tarjetas */}
                {loading ? (
                  <div className="flex items-center justify-center py-20 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : visibles.length === 0 ? (
                  <div className="mt-5 rounded-xl border border-dashed border-slate-300 dark:border-white/15 py-14 text-center">
                    <img src="./pill-1.png" alt="Placeholder" className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="mt-3 font-semibold text-slate-600 dark:text-gray-300">
                      {activos.length === 0 ? 'Aún no tienes suplementos ni medicamentos' : 'Sin resultados con este filtro'}
                    </p>
                    <p className="text-sm text-slate-400">
                      {activos.length === 0 ? 'Pulsa «Agregar» para registrar el primero.' : 'Prueba con otro estado o tipo.'}
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 flex flex-col gap-3">
                    {visibles.map(s => (
                      <Tarjeta
                        key={s.id}
                        s={s}
                        marcando={marcando === s.id}
                        onTomado={() => marcarTomado(s)}
                        onEliminar={() => eliminar(s)}
                      />
                    ))}
                  </div>
                )}

                {/* Aviso inferior */}
                <div className="mt-5 rounded-xl bg-[#F3F0FF] dark:bg-white/5 px-4 py-3 flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#6236FF] text-white flex items-center justify-center shrink-0">
                    <Info className="w-3.5 h-3.5" />
                  </span>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-gray-300 min-w-0">
                    Los medicamentos finalizarán automáticamente al completar el tratamiento. Los suplementos permanecerán activos hasta que decidas eliminarlos.
                  </p>
                  <ShieldCheck className="w-8 h-8 text-[#6236FF]/20 dark:text-white/10 ml-auto shrink-0 hidden sm:block" />
                </div>
              </section>

              {/* Historial */}
              {historial.length > 0 && (
                <section className="bg-white dark:bg-[#14142e] rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm p-6">
                  <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                    <History className="w-4 h-4" /> Historial
                  </h2>
                  <div className="mt-4 flex flex-col gap-3">
                    {historial.map(s => (
                      <div key={s.id} className="flex items-center gap-4 rounded-xl border border-gray-100 dark:border-white/10 p-3">
                        <span className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-white/5 text-slate-400 flex items-center justify-center shrink-0">
                          <Pill className="w-5 h-5" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-[#101433] dark:text-white truncate">{s.nombre}</p>
                          <p className="text-xs text-slate-500 dark:text-gray-400">
                            {s.tipo} · {s.frecuencia_label}{s.dias_totales ? ` · Tratamiento de ${s.dias_totales} días` : ''}
                          </p>
                        </div>
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border bg-slate-100 text-slate-500 border-slate-200 shrink-0">
                          Finalizado
                        </span>
                        <button
                          onClick={() => eliminar(s)}
                          title="Eliminar"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Panel ¿Cómo funciona? */}
            <aside className="w-full xl:w-[340px] shrink-0 bg-white dark:bg-[#14142e] rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm p-6 self-start">
              <h2 className="text-lg font-bold text-[#101433] dark:text-white">¿Cómo funciona?</h2>
              <div className="mt-5 flex flex-col gap-5">
                {COMO_FUNCIONA.map(({ Icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-3">
                    <span className="w-10 h-10 rounded-full bg-[#F3F0FF] dark:bg-white/5 text-[#6236FF] dark:text-purple-300 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-[#101433] dark:text-white">{title}</p>
                      <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-center gap-3 rounded-xl border border-gray-100 dark:border-white/10 px-3 py-3">
                <span className="w-9 h-9 rounded-full bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-gray-300 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <p className="text-xs text-slate-500 dark:text-gray-400">Tu información está segura y privada.</p>
              </div>
            </aside>
        </div>
      </div>

      {asistente && !creado && (
        <Asistente onClose={() => setAsistente(false)} onCreado={s => { setCreado(s); cargar(); }} />
      )}
      {creado && (
        <Confirmacion creado={creado} onCerrar={() => { setCreado(null); setAsistente(false); }} />
      )}
    </ModuleShell>
  );
}

/* Reexport de utilidades para pruebas rápidas */
export { formatoRetraso };
