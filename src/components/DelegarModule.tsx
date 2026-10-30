import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  UserPlus, Phone, Mail, MessageCircle, Users, Undo2, Check,
  ChevronDown, ChevronRight, Search, ListFilter, CheckCircle2,
  Clock, Quote, MoreVertical, RefreshCw, User,
} from 'lucide-react';
import AppShell, { MonthlyNavKey } from './AppShell';
import { delegacionProcesoService, DelegacionProcesoData, api } from '../services/api';
import { isoToday } from './kanban/types';

const TIPOS = [
  {
    key: 'llamar',
    label: 'Llamar',
    renderIcon: (cls: string) => <Phone className={cls} />,
    iconCls: 'text-[#2563eb]',
  },
  {
    key: 'correo',
    label: 'Correo',
    renderIcon: (cls: string) => <Mail className={cls} />,
    iconCls: 'text-[#6d28d9]',
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    renderIcon: (cls: string) => <img src="./whatsapp-2.png" alt="" className={cls} />,
    iconCls: 'text-[#16a34a]',
  },
  {
    key: 'reunion',
    label: 'Reunión',
    renderIcon: (cls: string) => <Users className={cls} />,
    iconCls: 'text-[#ea580c]',
  },
] as const;

const BUENAS_PRACTICAS = [
  { t: 'Define claramente', d: 'Quién será responsable y qué esperas como resultado.', f: <img src="./User-1.png" alt="Spin" className="w-7 h-6" /> },
  { t: 'Realiza seguimiento', d: 'Comienza registrando la primera acción de control.', f: <img src="./t1.png" alt="Spin" className="w-6 h-6" /> },
  { t: 'Confirma el resultado', d: 'Solo tú puedes marcar una delegación como cumplida.', f: <img src="./KAN.png" alt="Spin" className="w-6 h-6" /> },
  { t: 'Recupera si es necesario', d: 'Si no avanza, recupera y reasigna o ejecútala tú.', f: <img src="./Spin-1.png" alt="Spin" className="w-7 h-8" /> },
];

function fmtAt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) +
      ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function fmtFechaCorta(iso?: string | null): string {
  if (!iso) return '';
  try {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

function estadoPill(estado: string): { label: string; cls: string } {
  switch (estado) {
    case 'EN_SEGUIMIENTO':
      return { label: 'En seguimiento', cls: 'text-emerald-600 bg-emerald-50' };
    case 'DELEGADA':
      return { label: 'Delegada', cls: 'text-blue-600 bg-blue-50' };
    case 'COMPLETADA':
      return { label: 'Completada', cls: 'text-violet-600 bg-violet-50' };
    case 'RECUPERADA':
      return { label: 'Recuperada', cls: 'text-amber-600 bg-amber-50' };
    default:
      return { label: 'Pendiente de asignación', cls: 'text-[#2563eb] bg-[#e8f0fe]' };
  }
}

const ORIGEN_LABEL: Record<string, string> = {
  KANBAN_BACKLOG: 'Kanban',
  PLANIFICADOR_SEMANAL: 'Semana',
  AGENDA_DIARIA: 'Diaria',
  MANUAL: 'Manual',
};

function DelegationRow({ deleg, expanded, responsables, onToggle, onChanged }: {
  deleg: DelegacionProcesoData;
  expanded: boolean;
  responsables: string[];
  onToggle: () => void;
  onChanged: () => void;
}) {
  const [respDraft, setRespDraft] = useState(deleg.responsable);
  const [editingResp, setEditingResp] = useState(false);
  const [fecha] = useState(isoToday());
  const [showHistory, setShowHistory] = useState(false);
  const [busy, setBusy] = useState(false);
  const respRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setRespDraft(deleg.responsable); }, [deleg.responsable]);

  const commitResp = async () => {
    setEditingResp(false);
    const v = respDraft.trim();
    if (!v || v === deleg.responsable) {
      setRespDraft(deleg.responsable);
      return;
    }
    setBusy(true);
    try {
      await delegacionProcesoService.assignResponsible(deleg.id, v);
      onChanged();
    } catch (err) {
      console.error('Error assigning responsable:', err);
      setRespDraft(deleg.responsable);
    } finally {
      setBusy(false);
    }
  };

  const doFollowup = async (tipo: string) => {
    setBusy(true);
    try {
      await delegacionProcesoService.followup(deleg.id, {
        tipo, fecha: fecha || undefined,
      });
      onChanged();
    } catch (err) {
      console.error('Error creating followup:', err);
    } finally {
      setBusy(false);
    }
  };

  const pill = estadoPill(deleg.estado);
  const creada = fmtFechaCorta(deleg.creado?.slice(0, 10));

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="w-100 flex items-center gap-3 bg-white rounded-md border border-[#e3e8f5] px-4 py-3 hover:border-[#1f6feb] hover:shadow-sm transition-all text-left"
      >
        <ChevronRight className="w-4 h-4 text-[#8a93b2] shrink-0" />
        <span className="w-8 h-8 rounded-lg bg-[#eef3ff] flex items-center justify-center shrink-0 text-[#1f6feb] font-bold text-sm">
          {deleg.titulo.charAt(0).toUpperCase()}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-bold text-[#101433] text-sm truncate">{deleg.titulo}</span>
          <span className="block text-[11px] text-[#8a93b2]">Delegada el {creada || fmtAt(deleg.creado)}</span>
        </span>
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${pill.cls}`}>{pill.label}</span>
      </button>
    );
  }

  return (
    <div className="bg-white rounded-md w-190 border border-[#e3e8f5] shadow-sm overflow-hidden -ml-4">
      {/* Cabecera */}
      <div className="flex items-center gap-4 px-6 pt-5">
        <span className="w-8 h-8 rounded-full bg-[#1e1b4b] text-white font-bold text-xl flex items-center justify-center shrink-0">
          {deleg.titulo.charAt(0).toUpperCase()}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-extrabold text-[#1e1b4b] text-xl leading-snug truncate">{deleg.titulo}</h3>
          <p className="text-sm text-[#8a93b2]">Enviada desde {ORIGEN_LABEL[deleg.origen] || deleg.origen}</p>
        </div>
        <span className={`text-xs font-medium px-3 py-1.5 rounded-lg shrink-0 ${pill.cls}`}>{pill.label}</span>
        <button type="button" onClick={onToggle} className="text-[#1e1b4b] hover:text-[#4338ca] p-1" title="Contraer">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Cuerpo en 3 columnas */}
      <div className="grid md:grid-cols-[1fr_1.5fr_1.2fr] px-3 py-2 gap-4 md:gap-0 md:divide-x md:divide-[#eef1f7]">
        {/* Responsable */}
        <div className="md:pr-6">
          <p className="text-xs font-bold text-[#4338ca] mb-3">Responsable</p>
          <div className="flex items-center gap-2 bg-[#f8fafc] border border-[#e3e8f5] rounded-md px-1 py-1">
            <User className="w-5 h-5 text-[#8a93b2] shrink-0" />
            <input
              ref={respRef}
              type="text"
              value={editingResp ? respDraft : (deleg.responsable || '')}
              list={`responsables-${deleg.id}`}
              placeholder="Sin responsable"
              onFocus={() => { setEditingResp(true); setRespDraft(deleg.responsable); }}
              onChange={e => setRespDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); commitResp(); }
                if (e.key === 'Escape') { setRespDraft(deleg.responsable); setEditingResp(false); }
              }}
              onBlur={() => { if (editingResp) commitResp(); }}
              disabled={busy}
              className="flex-1 min-w-0 text-sm font-bold text-[#1e1b4b] placeholder:text-[#1e1b4b] placeholder:font-bold outline-none bg-transparent"
            />
            <datalist id={`responsables-${deleg.id}`}>
              {responsables.map(r => <option key={r} value={r} />)}
            </datalist>
            <ChevronDown className="w-4 h-4 text-[#1e1b4b] shrink-0" />
          </div>
        </div>

        {/* Qué haremos a continuación */}
        <div className="md:px-6">
          <button type="button" onClick={onToggle} className="flex items-center gap-2 mb-3 group">
            <span className="text-sm font-bold text-[#4338ca]">¿Qué haremos a continuación?</span>
            <ChevronDown className="w-4 h-4 text-[#4338ca] group-hover:translate-y-0.5 transition-transform" />
          </button>
          <div className="grid grid-cols-4 gap-2">
            {TIPOS.map(({ key, label, renderIcon, iconCls }) => (
              <button
                key={key}
                type="button"
                onClick={() => doFollowup(key)}
                disabled={busy || !deleg.responsable}
                title={deleg.responsable ? label : 'Asigna un responsable primero'}
                className="flex flex-col items-center gap-2 py-1 px-1 rounded-md border border-[#e3e8f5] bg-white text-[#1e1b4b] hover:border-[#4338ca] hover:shadow-sm transition-all disabled:opacity-40"
              >
                {renderIcon(`w-8 h-6 ${iconCls}`)}
                <span className="text-[8px] font-bold leading-tight">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Seguimiento realizado */}
        <div className="md:pl-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-[#4338ca]">Seguimiento realizado</p>
            <button type="button" onClick={() => setShowHistory(v => !v)} className="flex items-center gap-1 text-xs font-medium text-[#4338ca] hover:underline">
              Ver historial
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          {deleg.derivadas.length === 0 ? (
            <div className="flex items-start gap-3">
              <Clock className="w-6 h-6 text-[#2563eb] shrink-0" strokeWidth={2} />
              <p className="text-xs text-[#5b6b8c] leading-relaxed">
                Aún no hay seguimiento.<br />Comienza registrando la primera acción.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {deleg.derivadas.map((h, i) => (
                <p key={i} className="text-xs text-[#101433] font-medium">
                  {h.detalle?.titulo || 'Seguimiento'}
                  <span className="block text-[11px] font-normal text-[#8a93b2]">
                    {h.detalle?.fecha || ''}{h.detalle?.responsable_snapshot ? ` · ${h.detalle.responsable_snapshot}` : ''}
                  </span>
                </p>
              ))}
            </div>
          )}
          {showHistory && (
            <div className="mt-3 pt-2 border-t border-[#e3e8f5] space-y-1">
              {deleg.historial.map((h, i) => (
                <p key={i} className="text-[11px] text-[#5b6b8c]">
                  <span className="font-bold text-[#101433]">{h.evento}</span> · {fmtAt(h.at)}
                  {h.detalle?.nuevo ? ` · ${h.detalle.nuevo}` : ''}
                  {h.detalle?.titulo ? ` · ${h.detalle.titulo}` : ''}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

          {/* Acciones del proceso */}
      <div className="grid md:grid-cols-3 px-6 py-5 border-t border-[#eef1f7] gap-6 md:gap-0 md:divide-x md:divide-[#eef1f7]">
        <ProcessActionButton
          onClick={async () => { setBusy(true); try { await delegacionProcesoService.recover(deleg.id); onChanged(); } finally { setBusy(false); } }}
          disabled={busy}
          Img="./Spin-1.png"
          iconCls="text-[#6d28d9]"
          label="Recuperar acción"
          desc="Aparecerá nuevamente en mi planificación."
          className="md:pr-6 "
        />
        <ProcessActionButton
          onClick={() => { setEditingResp(true); setTimeout(() => respRef.current?.focus(), 60); }}
          disabled={busy}
          Icon={User}
          iconCls="text-[#2563eb]"
          label="Cambiar responsable"
          desc="Asigna esta acción a otra persona."
          className="md:px-6"
        />
        <ProcessActionButton
          onClick={async () => { setBusy(true); try { await delegacionProcesoService.complete(deleg.id); onChanged(); } finally { setBusy(false); } }}
          disabled={busy}
          Icon={CheckCircle2}
          iconCls="text-[#16a34a]"
          label="Marcar como completada"
          desc="La acción será cerrada y registrada como cumplida."
          className="md:pl-6"
        />
      </div>
    </div>
  );
}

function ProcessActionButton({ onClick, disabled, Icon, Img, iconCls, label, desc, className }: {
  onClick: () => void | Promise<void>; disabled?: boolean; Icon?: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  Img?: string; iconCls: string; label: string; desc: string; className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-start gap-3 text-left transition-all disabled:opacity-50 hover:opacity-80 ${className || ''}`}
    >
      <span className="shrink-0 mt-0.5">
        {Img ? (
          <img src={Img} alt="" className={`w-20 h-20 object-contain ${iconCls}`} />
        ) : Icon ? (
          <Icon className={`w-8 h-8 ${iconCls}`} strokeWidth={1.8} />
        ) : null}
      </span>
      <span>
        <span className="block text-sm font-bold text-[#4338ca]">{label}</span>
        <span className="block text-xs text-[#5b6b8c] mt-1 leading-relaxed">{desc}</span>
      </span>
    </button>
  );
}

export default function DelegarModule({ username, avatarUrl, onNavigate, onClose, onOpenHelp, onOpenNotifications, onOpenSettings }: {
  username?: string;
  avatarUrl?: string;
  onNavigate?: (key: MonthlyNavKey) => void;
  onClose: () => void;
  onOpenHelp?: () => void;
  onOpenNotifications?: () => void;
  onOpenSettings?: () => void;
}) {
  const [items, setItems] = useState<DelegacionProcesoData[]>([]);
  const [responsables, setResponsables] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filtro, setFiltro] = useState<'todas' | 'pendientes' | 'seguimiento' | 'completadas'>('todas');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get('/api/delegation-processes/');
      const list: DelegacionProcesoData[] = Array.isArray(res.data) ? res.data : res.data?.results || [];
      setItems(list);
      setExpandedId(prev => prev || (list.find(d => ['PENDIENTE_DELEGAR', 'DELEGADA', 'EN_SEGUIMIENTO'].includes(d.estado))?.id || null));
      const resp = await delegacionProcesoService.responsables();
      setResponsables(resp || []);
    } catch (err) {
      console.error('Error loading delegations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const enSeguimiento = items.filter(d => d.estado === 'EN_SEGUIMIENTO').length;
  const pendientes = items.filter(d => ['PENDIENTE_DELEGAR', 'DELEGADA'].includes(d.estado)).length;
  const porRecuperar = items.filter(d => d.estado === 'RECUPERADA').length;
  const completadas = items.filter(d => d.estado === 'COMPLETADA').length;

  const visibles = items.filter(d => {
    if (query.trim() && !d.titulo.toLowerCase().includes(query.trim().toLowerCase())) return false;
    if (filtro === 'pendientes') return ['PENDIENTE_DELEGAR', 'DELEGADA'].includes(d.estado);
    if (filtro === 'seguimiento') return d.estado === 'EN_SEGUIMIENTO';
    if (filtro === 'completadas') return d.estado === 'COMPLETADA';
    return true;
  });

  const shellNav = (key: MonthlyNavKey) => {
    if (key === 'delegar') return;
    onNavigate?.(key);
  };

  return (
    <AppShell
      activeNav="delegar"
      title="Acciones por Delegar"
      subtitle="Supervisa las tareas que has delegado y acompaña el proceso hasta su culminación."
      username={username}
      avatarUrl={avatarUrl}
      onNavigate={shellNav}
      onClose={onClose}
      onOpenHelp={onOpenHelp}
      onOpenNotifications={onOpenNotifications}
      onOpenSettings={onOpenSettings}
    >
      {/* Hero */}
      <div className="relative mb-6 overflow-hidden rounded-xl h-50">
        <img src="./delegar.jpg" alt="" className="absolute inset-0 h-80 w-250 object-cover" />
        <div className="absolute inset-0 bg-[#101433]/20" />
        <div className="absolute -right-16 -top-24 w-72 h-72 rounded-full bg-white/10 mt-2" />
        <div className="absolute right-24 -bottom-28 w-80 h-80 rounded-full border-[3px] border-white/15" />
        <div className="relative max-w-md bg-white/95 backdrop-blur rounded-xl p-5 sm:p-6 shadow-xl mt-2 ml-2">
          <p className="font-black text-[#101433] text-lg sm:text-xl leading-snug">
            Delegar no es desentenderse.<br />Es acompañar con confianza.
          </p>
          <p className="text-xs text-[#5b6b8c] mt-2 leading-relaxed">
            Cada acción delegada avanza porque tú sigues guiando el proceso.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-3">
          {/* Buscador */}
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-white border border-[#e3e8f5] rounded-xl px-3 py-2.5">
              <Search className="w-4 h-4 text-[#8a93b2]" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar acción delegada..."
                className="flex-1 min-w-0 text-sm text-[#101433] placeholder:text-[#8a93b2] outline-none bg-transparent"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-white border border-[#e3e8f5] rounded-xl px-3 py-2.5">
              <ListFilter className="w-4 h-4 text-[#8a93b2]" />
              <select value={filtro} onChange={e => setFiltro(e.target.value as any)}
                className="text-xs font-bold text-[#101433] outline-none bg-transparent">
                <option value="todas">Todas las acciones</option>
                <option value="pendientes">Pendientes</option>
                <option value="seguimiento">En seguimiento</option>
                <option value="completadas">Completadas</option>
              </select>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-gray-400 text-center py-10">Cargando delegaciones...</p>
          ) : visibles.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#e3e8f5] p-10 text-center">
              <UserPlus className="w-10 h-10 text-[#c6d2f5] mx-auto mb-3" />
              <p className="font-bold text-[#101433]">Sin acciones delegadas</p>
              <p className="text-sm text-[#8a93b2] mt-1">Marca una acción con D en el Kanban o delégala desde tu semana y aparecerá aquí.</p>
            </div>
          ) : (
            visibles.map(d => (
              <DelegationRow
                key={d.id}
                deleg={d}
                expanded={expandedId === d.id}
                responsables={responsables}
                onToggle={() => setExpandedId(prev => prev === d.id ? null : d.id)}
                onChanged={refresh}
              />
            ))
          )}
        </div>

        {/* Resumen lateral */}
        <div className="space-y-4">
          <div className="bg-white rounded-md w-72 border border-[#e3e8f5] p-5 ml-13">
            <p className="text-[11px] font-bold tracking-widest text-[#5b6b8c] mb-3">Resumen de delegaciones</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#f0fdf4] rounded-md p-3 text-center">
                <p className="text-xl font-bold text-[#16a34a] flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> {enSeguimiento}
                </p>
                <p className="text-[10px] font-bold text-[#5b6b8c] mt-0.5">En seguimiento</p>
              </div>
              <div className="bg-[#eef4ff] rounded-md p-3 text-center">
                <p className="text-xl font-bold text-[#1f6feb] flex items-center justify-center gap-1">
                  <img className="w-6 h-7" src="./wait.png" alt="Spin" /> {pendientes}
                </p>
                <p className="text-[10px] font-bold text-[#5b6b8c] mt-0.5">Pendientes</p>
              </div>
              <div className="bg-[#fff7ed] rounded-md p-3 text-center">
                <p className="text-xl font-bold text-[#ea580c] flex items-center justify-center gap-1">
                  <img className="w-4 h-4" src="./Spin-2.png" alt="Spin" /> {porRecuperar}
                </p>
                <p className="text-[10px] font-bold text-[#5b6b8c] mt-0.5">Por recuperar</p>
              </div>
              <div className="bg-[#faf5ff] rounded-md p-3 text-center">
                <p className="text-xl font-bold text-[#9333ea] flex items-center justify-center gap-1">
                  <Check className="w-4 h-4" /> {completadas}
                </p>
                <p className="text-[10px] font-bold text-[#5b6b8c] mt-0.5">Completadas</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-md  w-72 border border-[#e3e8f5] p-5 ml-13">
            <p className="text-[11px] font-bold tracking-widest text-black mb-3">Buenas prácticas de delegación</p>
            <div className="space-y-2.5">
              {BUENAS_PRACTICAS.map(b => (
                <div key={b.t} className="flex items-start gap-2">
                  <div className="w-8 h-8" >
                    {b.f}
                  </div>
                  <p className="text-xs text-[#101433]"><span className="font-bold">{b.t}</span><br /><span className="text-[#8a93b2]">{b.d}</span></p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md bg-gradient-to-br from-[#DFE2EB]  w-72 p-5 text-indigo text-center ml-13">
            <img src="./apostrofe.png" alt="" className='w-10 h-10' />
            <p className="text-sm font-bold leading-relaxed text-[#7C0DA8]">La confianza construye equipos: supervisa sin controlar y celebra cada avance.</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
