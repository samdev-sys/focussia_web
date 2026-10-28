import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Home, CircleDot, LayoutGrid, Calendar, CalendarDays, Kanban,
  CalendarRange, CalendarCheck, Target, Clock, Pill, Cake,
  UserCheck, Wallet, Link2, MoreHorizontal, ChevronDown,
  Plus, Trash2, Pencil, X, Check, ChevronLeft, ChevronRight,
  CalendarDays as CalendarIcon, Download, History, Settings,
  Bell, Eye, RefreshCw, ShieldCheck, CloudCog, ArrowRight, ArrowUpDown,
} from 'lucide-react';
import { NAV_ICONS } from './navIcons';
import {
  cuentasService,
  type CuentaColumnaData,
  type CuentaFilaData,
} from '../services/api';

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

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MESES_CORTO = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

const COLUMNAS_SUGERIDAS = ['Banco', 'Medio de pago', 'Observaciones'];
const BANCOS = ['Banco Chile', 'BancoEstado', 'Banco Santander', 'BCI', 'Itaú', 'Scotiabank', 'Otro'];
const MEDIOS = ['PAC', 'Débito automático', 'Tarjeta', 'Transferencia', 'Efectivo', 'Otro'];

const EMOJI_CUENTA: [RegExp, string][] = [
  [/luz|el[eé]ctric|enel/i, '💡'],
  [/agua|essbio|aguas/i, '💧'],
  [/internet|wifi|fibra|telec/i, '📶'],
  [/colegio|escuela|universidad|matr[ií]cula|educaci/i, '🎓'],
  [/seguro/i, '🛡️'],
  [/gas/i, '🔥'],
  [/tel[eé]fono|celular|m[oó]vil|plan/i, '📱'],
  [/arriendo|alquiler/i, '🏠'],
  [/salud|isapre|fonasa/i, '🏥'],
  [/auto|veh[ií]culo/i, '🚗'],
];

function emojiCuenta(nombre: string): string {
  const n = nombre || '';
  for (const [re, emoji] of EMOJI_CUENTA) {
    if (re.test(n)) return emoji;
  }
  return '🧾';
}

function parseMonto(texto: string): number | null {
  const digitos = (texto || '').replace(/[^\d]/g, '');
  if (!digitos) return null;
  const n = parseInt(digitos, 10);
  return Number.isFinite(n) ? n : null;
}

function fmtMonto(n: number): string {
  return `$${n.toLocaleString('es-CL')}`;
}

function pillMedio(valor: string): string {
  const v = (valor || '').toLowerCase();
  if (/pac/.test(v)) return 'bg-emerald-100 text-emerald-700';
  if (/d[eé]bito/.test(v)) return 'bg-sky-100 text-sky-700';
  if (/tarjeta/.test(v)) return 'bg-violet-100 text-violet-700';
  if (/transferencia/.test(v)) return 'bg-orange-100 text-orange-700';
  if (/efectivo/.test(v)) return 'bg-amber-100 text-amber-700';
  if (!v.trim()) return '';
  return 'bg-slate-100 text-slate-600';
}

function inicialesBanco(nombre: string): string {
  const n = (nombre || '').toLowerCase();
  if (n.includes('chile')) return 'BC';
  if (n.includes('estado')) return 'BE';
  const palabras = nombre.trim().split(/\s+/);
  return (palabras.slice(0, 2).map(p => p[0] || '').join('') || '🏦').toUpperCase();
}

function colorBanco(nombre: string): string {
  const n = (nombre || '').toLowerCase();
  if (n.includes('chile')) return '#002464';
  if (n.includes('estado')) return '#E30613';
  return '#475569';
}

type Panel = null | 'fila' | 'columna' | 'eliminarColumna' | 'acciones' | 'historial' | 'confirmBulk';

interface Props {
  userName?: string;
  onBack: () => void;
  onNavigate?: (section: string) => void;
}

export default function CuentasScreen({ userName, onBack, onNavigate }: Props) {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [columnas, setColumnas] = useState<CuentaColumnaData[]>([]);
  const [filas, setFilas] = useState<CuentaFilaData[]>([]);
  const [historial, setHistorial] = useState<{ anio: number; mes: number; total: number; pagadas: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [panel, setPanel] = useState<Panel>(null);
  const [editCols, setEditCols] = useState(false);
  const [sort, setSort] = useState<{ key: 'cuenta' | 'dia' | 'monto'; dir: 1 | -1 } | null>(null);

  // Form fila (alta y edición)
  const [editando, setEditando] = useState<CuentaFilaData | null>(null);
  const [fCuenta, setFCuenta] = useState('');
  const [fDia, setFDia] = useState('');
  const [fMonto, setFMonto] = useState('');
  const [fExtras, setFExtras] = useState<Record<string, string>>({});
  // Form columna
  const [nuevaCol, setNuevaCol] = useState('');
  const [colAEliminar, setColAEliminar] = useState<CuentaColumnaData | null>(null);

  const tablaRef = useRef<HTMLDivElement>(null);

  const cargar = useCallback(async (a: number, m: number) => {
    setLoading(true);
    setError('');
    try {
      const t = await cuentasService.tablero(a, m);
      setColumnas(t.columnas);
      setFilas(t.filas);
    } catch {
      setError('No se pudo cargar la tabla de cuentas.');
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarHistorial = useCallback(async () => {
    try {
      setHistorial(await cuentasService.historial());
    } catch {
      /* el historial es secundario */
    }
  }, []);

  useEffect(() => {
    cargar(anio, mes);
    cargarHistorial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anio, mes]);

  const flashGuardado = () => {
    setGuardando(true);
    setTimeout(() => setGuardando(false), 1200);
  };

  const irPeriodo = (a: number, m: number) => {
    setAnio(a);
    setMes(m);
  };

  const moverMes = (delta: number) => {
    let a = anio;
    let m = mes + delta;
    while (m < 1) { m += 12; a -= 1; }
    while (m > 12) { m -= 12; a += 1; }
    irPeriodo(a, m);
  };

  const togglePagado = async (fila: CuentaFilaData) => {
    const previo = fila.pagado;
    setFilas(prev => prev.map(f => (f.id === fila.id ? { ...f, pagado: !previo } : f)));
    try {
      const upd = await cuentasService.actualizarFila(fila.id, { pagado: !previo });
      setFilas(prev => prev.map(f => (f.id === fila.id ? { ...f, ...upd } : f)));
      flashGuardado();
      cargarHistorial();
    } catch {
      setFilas(prev => prev.map(f => (f.id === fila.id ? { ...f, pagado: previo } : f)));
      setError('No se pudo actualizar el estado.');
    }
  };

  const abrirNuevaFila = () => {
    setEditando(null);
    setFCuenta('');
    setFDia('');
    setFMonto('');
    setFExtras({});
    setPanel('fila');
  };

  const abrirEditarFila = (fila: CuentaFilaData) => {
    setEditando(fila);
    setFCuenta(fila.cuenta);
    setFDia(fila.dia_vencimiento != null ? String(fila.dia_vencimiento) : '');
    setFMonto(fila.monto);
    const ex: Record<string, string> = {};
    columnas.forEach(c => { ex[String(c.id)] = fila.extras?.[String(c.id)] || ''; });
    setFExtras(ex);
    setPanel('fila');
  };

  const guardarFila = async () => {
    if (!fCuenta.trim() && !fMonto.trim()) {
      setError('Escribe al menos el nombre de la cuenta.');
      return;
    }
    const dia = fDia === '' ? null : Math.max(1, Math.min(31, parseInt(fDia, 10) || 0)) || null;
    setError('');
    try {
      setGuardando(true);
      if (editando) {
        const upd = await cuentasService.actualizarFila(editando.id, {
          cuenta: fCuenta.trim(),
          dia_vencimiento: dia,
          monto: fMonto.trim(),
          extras: fExtras,
        });
        setFilas(prev => prev.map(f => (f.id === editando.id ? { ...f, ...upd } : f)));
      } else {
        const nueva = await cuentasService.crearFila({
          periodo_anio: anio,
          periodo_mes: mes,
          cuenta: fCuenta.trim(),
          dia_vencimiento: dia,
          monto: fMonto.trim(),
        });
        if (Object.keys(fExtras).length) {
          const upd = await cuentasService.actualizarFila(nueva.id, { extras: fExtras });
          setFilas(prev => [...prev, { ...nueva, ...upd }]);
        } else {
          setFilas(prev => [...prev, nueva]);
        }
      }
      setPanel(null);
      flashGuardado();
      cargarHistorial();
    } catch {
      setError('No se pudo guardar la cuenta.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminarFila = async (fila: CuentaFilaData) => {
    if (!confirm(`¿Eliminar "${fila.cuenta || 'esta cuenta'}" de ${MESES[mes - 1]} ${anio}?`)) return;
    try {
      await cuentasService.eliminarFila(fila.id);
      setFilas(prev => prev.filter(f => f.id !== fila.id));
      cargarHistorial();
    } catch {
      setError('No se pudo eliminar la cuenta.');
    }
  };

  const eliminarCuentasMes = async () => {
    if (filas.length === 0) return;
    if (!confirm(`¿Eliminar las ${filas.length} cuentas de ${MESES[mes - 1]} ${anio}? Esta acción no se puede deshacer.`)) return;
    setPanel(null);
    try {
      await Promise.all(filas.map(f => cuentasService.eliminarFila(f.id)));
      setFilas([]);
      cargarHistorial();
    } catch {
      setError('No se pudieron eliminar todas las cuentas.');
      cargar(anio, mes);
    }
  };

  const agregarColumna = async () => {
    const nombre = nuevaCol.trim();
    if (!nombre) return;
    setError('');
    try {
      const col = await cuentasService.crearColumna(nombre);
      setColumnas(prev => [...prev, col]);
      setNuevaCol('');
      setPanel(null);
      flashGuardado();
    } catch {
      setError('No se pudo agregar la columna.');
    }
  };

  const eliminarColumna = async () => {
    if (!colAEliminar) return;
    try {
      await cuentasService.eliminarColumna(colAEliminar.id);
      const id = String(colAEliminar.id);
      setColumnas(prev => prev.filter(c => c.id !== colAEliminar.id));
      setFilas(prev => prev.map(f => {
        const extras = { ...f.extras };
        delete extras[id];
        return { ...f, extras };
      }));
      setColAEliminar(null);
      setPanel(null);
    } catch {
      setError('No se pudo eliminar la columna.');
    }
  };

  const restaurarColumnas = async () => {
    setPanel(null);
    const existentes = new Set(columnas.map(c => c.nombre.trim().toLowerCase()));
    const faltantes = COLUMNAS_SUGERIDAS.filter(n => !existentes.has(n.toLowerCase()));
    if (faltantes.length === 0) return;
    try {
      const creadas = [];
      for (const n of faltantes) {
        creadas.push(await cuentasService.crearColumna(n));
      }
      setColumnas(prev => [...prev, ...creadas]);
      flashGuardado();
    } catch {
      setError('No se pudieron restaurar las columnas.');
    }
  };

  const exportarCSV = () => {
    const head = ['Cuenta', 'Día de vencimiento', 'Monto', 'Estado', ...columnas.map(c => c.nombre)];
    const lineas = filas.map(f => [
      f.cuenta,
      f.dia_vencimiento != null ? String(f.dia_vencimiento).padStart(2, '0') : '',
      f.monto,
      f.pagado ? 'Pagada' : 'Pendiente',
      ...columnas.map(c => f.extras?.[String(c.id)] || ''),
    ]);
    const esc = (v: string) => `"${(v || '').replace(/"/g, '""')}"`;
    const csv = '﻿' + [head, ...lineas].map(r => r.map(esc).join(';')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cuentas-${anio}-${String(mes).padStart(2, '0')}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  const ordenarPor = (key: 'cuenta' | 'dia' | 'monto') => {
    setSort(prev => (prev?.key === key ? { key, dir: prev.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
  };

  const filasOrdenadas = [...filas].sort((a, b) => {
    if (!sort) return (a.orden - b.orden) || (a.id - b.id);
    const { key, dir } = sort;
    if (key === 'cuenta') return a.cuenta.localeCompare(b.cuenta, 'es') * dir;
    if (key === 'dia') {
      const x = a.dia_vencimiento ?? 99;
      const y = b.dia_vencimiento ?? 99;
      return (x - y) * dir;
    }
    const x = parseMonto(a.monto);
    const y = parseMonto(b.monto);
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    return (x - y) * dir;
  });

  const total = filas.reduce((s, f) => s + (parseMonto(f.monto) || 0), 0);
  const pagadas = filas.filter(f => f.pagado).length;
  const pendientes = filas.length - pagadas;
  const esMesActual = anio === hoy.getFullYear() && mes === hoy.getMonth() + 1;
  const vencimientos = filas
    .filter(f => !f.pagado && f.dia_vencimiento != null)
    .sort((a, b) => (a.dia_vencimiento || 99) - (b.dia_vencimiento || 99))
    .slice(0, 3);

  const textoVence = (dia: number): string => {
    if (!esMesActual) return `Día ${String(dia).padStart(2, '0')}`;
    const diff = dia - hoy.getDate();
    if (diff > 0) return `Vence en ${diff} día${diff === 1 ? '' : 's'}`;
    if (diff === 0) return 'Vence hoy';
    return `Venció hace ${-diff} día${diff === -1 ? '' : 's'}`;
  };

  const opcionesMeses: { a: number; m: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    opcionesMeses.push({ a: d.getFullYear(), m: d.getMonth() + 1 });
  }
  if (!opcionesMeses.some(o => o.a === anio && o.m === mes)) opcionesMeses.push({ a: anio, m: mes });

  const nav = (section: string) => {
    if (section === 'inicio' || section === 'cuentas') { onBack(); return; }
    if (onNavigate) onNavigate(section);
    else onBack();
  };

  const campoExtra = (col: CuentaColumnaData) => {
    const id = String(col.id);
    const esBanco = col.nombre.trim().toLowerCase() === 'banco';
    const esMedio = col.nombre.trim().toLowerCase() === 'medio de pago';
    if (esBanco) {
      return (
        <select value={fExtras[id] || ''} onChange={e => setFExtras(p => ({ ...p, [id]: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#6236FF]">
          <option value="">Selecciona un banco</option>
          {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      );
    }
    if (esMedio) {
      return (
        <select value={fExtras[id] || ''} onChange={e => setFExtras(p => ({ ...p, [id]: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#6236FF]">
          <option value="">Selecciona medio de pago</option>
          {MEDIOS.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      );
    }
    return (
      <input
        value={fExtras[id] || ''}
        onChange={e => setFExtras(p => ({ ...p, [id]: e.target.value }))}
        placeholder="Escribe una observación"
        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#6236FF] placeholder:text-slate-400"
      />
    );
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
                item.section === 'cuentas'
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
        <div className="flex items-center gap-4 px-6 pt-5 pb-3 shrink-0">
          <button onClick={onBack} className="md:hidden text-slate-500 hover:text-slate-800 font-bold">←</button>
          <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6236FF] to-[#8A2BE2] flex items-center justify-center shrink-0 shadow-md">
            <Wallet className="w-6 h-6 text-white" />
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold text-slate-900">Cuentas</h1>
            <p className="text-sm text-slate-500">Administra tus pagos recurrentes y mantén todo bajo control.</p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <button title="Ayuda" className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:shadow-md transition-shadow font-black">?</button>
            <button title="Notificaciones" className="relative w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:shadow-md transition-shadow">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#6236FF] text-white text-[10px] font-black flex items-center justify-center">3</span>
            </button>
            <button title="Configuración" className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:shadow-md transition-shadow">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="max-w-[1200px] flex flex-col xl:flex-row gap-5">
            <div className="flex-1 flex flex-col gap-5 min-w-0">
              {/* Barra de acciones */}
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={abrirNuevaFila} className="flex items-center gap-1.5 text-sm font-bold text-white bg-gradient-to-r from-[#6236FF] to-[#8A2BE2] rounded-xl px-4 py-2.5 hover:brightness-110 active:scale-95 transition-all shadow-sm">
                  <Plus className="w-4 h-4" /> Agregar fila
                </button>
                <button onClick={() => { setNuevaCol(''); setPanel('columna'); }} className="flex items-center gap-1.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-4 py-2.5 hover:shadow-md active:scale-95 transition-all">
                  <Plus className="w-4 h-4" /> Agregar columna
                </button>
                <span className="flex-1" />
                <button onClick={() => { cargarHistorial(); setPanel('historial'); }} className="flex items-center gap-1.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-4 py-2.5 hover:shadow-md active:scale-95 transition-all">
                  <CalendarIcon className="w-4 h-4" /> Historial
                </button>
                <button onClick={exportarCSV} className="flex items-center gap-1.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-4 py-2.5 hover:shadow-md active:scale-95 transition-all">
                  <Download className="w-4 h-4" /> Exportar
                </button>
                <div className="relative">
                  <button onClick={() => setPanel(panel === 'acciones' ? null : 'acciones')} title="Acciones" className="w-10 h-10 flex items-center justify-center text-slate-700 bg-white border border-slate-200 rounded-xl hover:shadow-md active:scale-95 transition-all font-black">
                    •••
                  </button>
                  {panel === 'acciones' && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setPanel(null)} />
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-slate-100 shadow-xl z-20 overflow-hidden">
                        <button onClick={() => { setEditCols(v => !v); setPanel(null); }} className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 text-left">
                          <Pencil className="w-4 h-4" /> {editCols ? 'Terminar edición' : 'Editar columnas'}
                        </button>
                        <button onClick={() => setPanel('confirmBulk')} className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 text-left">
                          <Trash2 className="w-4 h-4" /> Eliminar cuentas
                        </button>
                        <button onClick={restaurarColumnas} className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 text-left">
                          <RefreshCw className="w-4 h-4" /> Restaurar columnas
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              {error && <p className="bg-red-50 text-red-600 text-xs font-medium rounded-xl px-4 py-2">{error}</p>}

              {/* Tabla */}
              <section ref={tablaRef} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden scroll-mt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse min-w-[760px]">
                    <thead>
                      <tr className="text-left text-xs font-bold text-slate-500 border-b border-slate-100">
                        <th className="px-4 py-3 w-12">
                          <span className="inline-block w-5 h-5 rounded-md border-2 border-slate-200" />
                        </th>
                        <th className="px-2 py-3">
                          <button onClick={() => ordenarPor('cuenta')} className="inline-flex items-center gap-1.5 hover:text-slate-800">
                            Cuenta <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        </th>
                        <th className="px-2 py-3">
                          <button onClick={() => ordenarPor('dia')} className="inline-flex items-center gap-1.5 hover:text-slate-800">
                            <CalendarIcon className="w-4 h-4 text-slate-400" /> Día de vencimiento <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        </th>
                        <th className="px-2 py-3">
                          <button onClick={() => ordenarPor('monto')} className="inline-flex items-center gap-1.5 hover:text-slate-800">
                            <span className="font-black">$</span> Monto <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        </th>
                        {columnas.map(c => (
                          <th key={c.id} className="px-2 py-3">
                            <span className="inline-flex items-center gap-1.5">
                              {c.nombre}
                              {editCols && (
                                <button
                                  onClick={() => { setColAEliminar(c); setPanel('eliminarColumna'); }}
                                  title={`Eliminar columna ${c.nombre}`}
                                  className="text-slate-300 hover:text-red-500 transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </span>
                          </th>
                        ))}
                        <th className="px-2 py-3 w-12 text-right">
                          <button onClick={() => setEditCols(v => !v)} title="Editar columnas" className={`transition-colors ${editCols ? 'text-[#6236FF]' : 'text-slate-300 hover:text-slate-500'}`}>
                            <Settings className="w-4 h-4" />
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={6 + columnas.length} className="px-4 py-12 text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6236FF] mx-auto" />
                        </td></tr>
                      ) : filasOrdenadas.length === 0 ? (
                        <tr><td colSpan={6 + columnas.length} className="px-4 py-12 text-center text-slate-400 text-sm">
                          Este mes aún no tiene cuentas. Usa “Agregar fila” para empezar.
                        </td></tr>
                      ) : (
                        filasOrdenadas.map(f => (
                          <tr key={f.id} className={`border-t border-slate-100 transition-colors ${f.pagado ? 'bg-emerald-50/70' : 'bg-white hover:bg-slate-50/60'}`}>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => togglePagado(f)}
                                title={f.pagado ? 'Marcar como pendiente' : 'Marcar como pagada'}
                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${f.pagado ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-[#6236FF]'}`}
                              >
                                {f.pagado && <Check className="w-3.5 h-3.5" strokeWidth={4} />}
                              </button>
                            </td>
                            <td className="px-2 py-3">
                              <span className="inline-flex items-center gap-2.5 font-bold text-slate-800">
                                {f.cuenta.toLowerCase().includes('netflix') ? (
                                  <span className="w-7 h-7 rounded-lg bg-[#E50914] text-white font-black flex items-center justify-center text-sm shrink-0">N</span>
                                ) : (
                                  <span className="text-lg leading-none shrink-0">{emojiCuenta(f.cuenta)}</span>
                                )}
                                {f.cuenta || <span className="text-slate-300 font-medium">Sin nombre</span>}
                              </span>
                            </td>
                            <td className="px-2 py-3 font-bold text-slate-700">
                              {f.dia_vencimiento != null ? String(f.dia_vencimiento).padStart(2, '0') : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-2 py-3 font-bold text-slate-800">{f.monto || <span className="text-slate-300">—</span>}</td>
                            {columnas.map(c => {
                              const v = f.extras?.[String(c.id)] || '';
                              const esBanco = c.nombre.trim().toLowerCase() === 'banco';
                              return (
                                <td key={c.id} className="px-2 py-3">
                                  {esBanco ? (
                                    v ? (
                                      <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-slate-700">
                                        <span className="w-6 h-6 rounded-md text-white text-[10px] font-black flex items-center justify-center shrink-0" style={{ background: colorBanco(v) }}>
                                          {inicialesBanco(v)}
                                        </span>
                                        {v}
                                      </span>
                                    ) : <span className="text-slate-300">—</span>
                                  ) : v ? (
                                    c.nombre.trim().toLowerCase() === 'medio de pago' ? (
                                      <span className={`inline-block text-xs font-bold rounded-lg px-2.5 py-1 ${pillMedio(v)}`}>{v}</span>
                                    ) : f.pagado && c.nombre.trim().toLowerCase() === 'observaciones' ? (
                                      <span className="inline-flex items-center gap-1 text-[13px] font-bold text-emerald-600">
                                        <Check className="w-3.5 h-3.5" strokeWidth={3} /> {v}
                                      </span>
                                    ) : (
                                      <span className="text-[13px] text-slate-600">{v}</span>
                                    )
                                  ) : (
                                    f.pagado && c.nombre.trim().toLowerCase() === 'observaciones'
                                      ? <span className="inline-flex items-center gap-1 text-[13px] font-bold text-emerald-600"><Check className="w-3.5 h-3.5" strokeWidth={3} /> Pagada</span>
                                      : <span className="text-slate-300">—</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="px-2 py-3 whitespace-nowrap text-right">
                              <button onClick={() => abrirEditarFila(f)} title="Editar" className="text-slate-400 hover:text-[#6236FF] transition-colors mr-2">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => eliminarFila(f)} title="Eliminar" className="text-slate-400 hover:text-red-500 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="text-center text-xs text-slate-400 py-3 border-t border-slate-100">
                  Mostrando {filas.length} cuenta{filas.length === 1 ? '' : 's'} registrada{filas.length === 1 ? '' : 's'}
                  {guardando && <span className="ml-2 animate-pulse">· Guardando…</span>}
                </p>
              </section>
            </div>

            {/* Columna derecha */}
            <div className="w-full xl:w-[320px] shrink-0 flex flex-col gap-5">
              <section className="rounded-2xl bg-gradient-to-br from-[#2b3df0] via-[#6236FF] to-[#a21caf] text-white p-5 shadow-md">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold">Resumen del mes</h3>
                  <select
                    value={`${anio}-${String(mes).padStart(2, '0')}`}
                    onChange={e => { const [a, m] = e.target.value.split('-').map(Number); irPeriodo(a, m); }}
                    className="bg-white/15 border border-white/25 rounded-lg text-xs font-bold px-2 py-1.5 outline-none cursor-pointer [&>option]:text-slate-800"
                  >
                    {opcionesMeses.map(o => (
                      <option key={`${o.a}-${o.m}`} value={`${o.a}-${String(o.m).padStart(2, '0')}`}>
                        {MESES[o.m - 1]} {o.a}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs opacity-80 mt-3">Total estimado</p>
                <p className="text-3xl font-black">{fmtMonto(total)}</p>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="rounded-xl bg-black/20 p-3 text-center">
                    <p className="text-xs opacity-80">Pagadas</p>
                    <p className="text-xl font-black">{pagadas}</p>
                  </div>
                  <div className="rounded-xl bg-black/20 p-3 text-center">
                    <p className="text-xs opacity-80">Pendientes</p>
                    <p className="text-xl font-black">{pendientes}</p>
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h3 className="font-extrabold text-slate-900 text-[15px]">Próximos vencimientos</h3>
                <div className="flex flex-col gap-2 mt-3">
                  {vencimientos.length === 0 ? (
                    <p className="text-[13px] text-slate-400">Sin vencimientos pendientes.</p>
                  ) : (
                    vencimientos.map(f => (
                      <div key={f.id} className="rounded-xl bg-[#f4f6fb] p-3 flex items-center gap-3">
                        <span className="text-xl leading-none">{emojiCuenta(f.cuenta)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-extrabold text-slate-900 truncate">{f.cuenta}</p>
                          <p className="text-xs text-slate-500">{textoVence(f.dia_vencimiento || 0)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-black text-slate-900">{String(f.dia_vencimiento).padStart(2, '0')}</p>
                          <p className="text-[10px] font-black text-[#6236FF]">{MESES_CORTO[mes - 1]}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <button onClick={() => tablaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="mt-3 w-full flex items-center justify-between text-sm font-extrabold text-[#6236FF] hover:opacity-80">
                  Ver todos <ArrowRight className="w-4 h-4" />
                </button>
              </section>

              <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex gap-3">
                <span className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                  <CloudCog className="w-5 h-5 text-emerald-600" />
                </span>
                <div>
                  <p className="text-sm font-extrabold text-slate-900">Tus cambios se guardan automáticamente.</p>
                  <p className="text-[13px] text-slate-500 leading-snug">Puedes editar siempre que lo necesites.</p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      {/* Panel: agregar / editar cuenta */}
      {(panel === 'fila') && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" onClick={() => setPanel(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-slate-900">{editando ? 'Editar cuenta' : 'Agregar nueva cuenta'}</h3>
              <button onClick={() => setPanel(null)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-bold text-slate-500">Cuenta
                <input value={fCuenta} onChange={e => setFCuenta(e.target.value)} placeholder="Nombre de la cuenta" className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#6236FF] font-normal" />
              </label>
              <label className="block text-xs font-bold text-slate-500">Día de vencimiento
                <select value={fDia} onChange={e => setFDia(e.target.value)} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#6236FF] font-normal bg-white">
                  <option value="">Selecciona un día</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{String(d).padStart(2, '0')}</option>)}
                </select>
              </label>
              <label className="block text-xs font-bold text-slate-500">Monto
                <input value={fMonto} onChange={e => setFMonto(e.target.value)} placeholder="Ej: $42.000 o variable" className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#6236FF] font-normal placeholder:text-slate-400" />
              </label>
              {columnas.map(c => (
                <label key={c.id} className="block text-xs font-bold text-slate-500">{c.nombre}
                  <span className="mt-1 block font-normal">{campoExtra(c)}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setPanel(null)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={guardarFila} disabled={guardando} className="flex-1 text-sm font-bold text-white bg-gradient-to-r from-[#6236FF] to-[#8A2BE2] rounded-xl py-2.5 hover:brightness-110 active:scale-95 disabled:opacity-50">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel: agregar columna */}
      {panel === 'columna' && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" onClick={() => setPanel(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-slate-900">Agregar nueva columna</h3>
              <button onClick={() => setPanel(null)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <label className="block text-xs font-bold text-slate-500">Nombre de la columna
              <input
                autoFocus
                value={nuevaCol}
                onChange={e => setNuevaCol(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') agregarColumna(); }}
                placeholder="Ej: Banco, Medio de pago, Comprobante"
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#6236FF] font-normal placeholder:text-slate-400"
              />
            </label>
            <label className="block text-xs font-bold text-slate-500 mt-3">Tipo de dato
              <select disabled className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500">
                <option>Texto</option>
              </select>
            </label>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setPanel(null)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={agregarColumna} className="flex-1 text-sm font-bold text-white bg-gradient-to-r from-[#6236FF] to-[#8A2BE2] rounded-xl py-2.5 hover:brightness-110 active:scale-95">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Panel: eliminar columna */}
      {panel === 'eliminarColumna' && colAEliminar && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" onClick={() => setPanel(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 text-center" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <span />
              <button onClick={() => setPanel(null)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <span className="mx-auto w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-red-500" />
            </span>
            <h3 className="font-extrabold text-slate-900 mt-3">¿Eliminar columna “{colAEliminar.nombre}”?</h3>
            <p className="text-[13px] text-slate-500 mt-1">Se eliminará esta columna y toda la información asociada.</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setPanel(null)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={eliminarColumna} className="flex-1 text-sm font-bold text-white bg-red-500 rounded-xl py-2.5 hover:bg-red-600 active:scale-95">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Panel: confirmar eliminar cuentas del mes */}
      {panel === 'confirmBulk' && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" onClick={() => setPanel(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 text-center" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <span />
              <button onClick={() => setPanel(null)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <span className="mx-auto w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-red-500" />
            </span>
            <h3 className="font-extrabold text-slate-900 mt-3">¿Eliminar las {filas.length} cuentas de {MESES[mes - 1]} {anio}?</h3>
            <p className="text-[13px] text-slate-500 mt-1">Esta acción no se puede deshacer. Otros meses no se verán afectados.</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setPanel(null)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={eliminarCuentasMes} className="flex-1 text-sm font-bold text-white bg-red-500 rounded-xl py-2.5 hover:bg-red-600 active:scale-95">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Panel: historial mensual */}
      {panel === 'historial' && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" onClick={() => setPanel(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-extrabold text-slate-900">Historial mensual</h3>
              <button onClick={() => setPanel(null)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            {historial.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Aún no hay meses registrados.</p>
            ) : (
              historial.map(h => (
                <button
                  key={`${h.anio}-${h.mes}`}
                  onClick={() => { irPeriodo(h.anio, h.mes); setPanel(null); }}
                  className={`w-full flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0 text-left hover:bg-slate-50 rounded-lg px-2 ${(h.anio === anio && h.mes === mes) ? 'bg-[#f4f2ff]' : ''}`}
                >
                  <div className="flex-1">
                    <p className="text-sm font-extrabold text-slate-800">{MESES[h.mes - 1]} {h.anio}</p>
                    <p className="text-xs text-emerald-600 font-bold">{h.pagadas}/{h.total} pagadas</p>
                  </div>
                  <span className="text-right text-xs font-bold">
                    <span className="text-emerald-600">● {h.pagadas}</span><br />
                    <span className="text-red-500">● {h.total - h.pagadas}</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </button>
              ))
            )}
            <button onClick={() => setPanel(null)} className="mt-3 w-full flex items-center justify-center gap-2 text-sm font-extrabold text-[#6236FF] hover:opacity-80">
              Cerrar <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header mes móvil */}
      <div className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-1 bg-white rounded-full shadow-xl border border-slate-200 px-2 py-1.5">
        <button onClick={() => moverMes(-1)} className="p-2 text-slate-600"><ChevronLeft className="w-5 h-5" /></button>
        <span className="text-xs font-black text-slate-800 px-1">{MESES[mes - 1]} {anio}</span>
        <button onClick={() => moverMes(1)} className="p-2 text-slate-600"><ChevronRight className="w-5 h-5" /></button>
      </div>
    </div>
  );
}
