import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Check, Play, Pause, Volume2, Moon, Scale, Rocket, Smile,
  Target, Shield, Sparkles, ClipboardList, Dumbbell, Signpost, Bell,
  Smartphone, MessageCircle, Phone, Sun, Briefcase, Sunrise, SlidersHorizontal,
  ShieldCheck, Download, Trash2, FileText, User as UserIcon, CreditCard,
  LogOut, ChevronRight, X, Loader2, Lock, KeyRound, UserCog, Leaf,
  ListChecks, CalendarDays, Heart, Settings, BarChart3, BellRing,
} from 'lucide-react';
import { configService, configuracionService, authService } from '../services/api';
import { AVATARS, AVATARS_DARK, AVATARS_CIBER } from '../constants/avatars';
import { REDES, RedIcon, normalizarUrl, validarRed, type RedId } from './RedesIcons';

export type Screen = 'menu' | 'avatar' | 'acomp' | 'notifs' | 'horarios' | 'privacidad' | 'cuenta' | 'redes';
type AcompTab = 'intensidad' | 'tono' | 'apoyo';
type HorariosTab = 'general' | 'excepciones';

const AVATAR_NOMBRES: Record<number, string> = { 1: 'Jhon', 2: 'Conrad', 3: 'Ashley', 4: 'Lía', 5: 'Monroe', 6: 'Sofía' };
const AVATAR_SUB: Record<number, string> = {
  1: 'Directo y estratégico',
  2: 'Firme y exigente',
  3: 'Cercana y motivadora',
  4: 'Acompañante en enfoque y propósito',
  5: 'Claro y estratégico',
  6: 'Cercana y motivadora',
};

const INTENSIDADES = [
  { id: 'suave', titulo: 'SUAVE', desc: 'Focusia interviene solo en momentos importantes o cuando detecta una desviación significativa.', pie: 'Baja frecuencia', img: './moon.png', color: '#2dd4bf', puntos: 3, nivel: 3 },
  { id: 'equilibrada', titulo: 'EQUILIBRADA', desc: 'Focusia acompaña mediante recordatorios estratégicos y sugerencias oportunas, sin generar saturación.', pie: 'Frecuencia media', img: './balance.png', color: '#a855f7', puntos: 5, nivel: 5, recomendado: true },
  { id: 'exigente', titulo: 'EXIGENTE', desc: 'Focusia aumenta la frecuencia de las intervenciones y utiliza mensajes más directos para mantener el compromiso con los objetivos.', pie: 'Alta frecuencia', img: './rocket.png', color: '#fb923c', puntos: 7, nivel: 7 },
];

const AVATAR_TONE: Record<number, string> = {
  1: '/Avatars_tone/john (2).jpeg',
  2: '/Avatars_tone/Conrad.jpeg',
  3: '/Avatars_tone/Ashley.jpeg',
  4: '/Avatars_tone/Lia (3).jpeg',
  5: '/Avatars_tone/Monroe (2).jpeg',
  6: '/Avatars_tone/Sophya (2).jpeg',
};

const TONOS = [
  { id: 'cercano', titulo: 'CERCANO Y MOTIVADOR', desc: 'Mensajes positivos y alentadores que te impulsan a avanzar con energía y confianza.', img: './smile.png', color: '#4ade80', nivel: 4 },
  { id: 'claro', titulo: 'CLARO Y ESTRATÉGICO', desc: 'Mensajes directos, organizados y orientados a la toma de decisiones efectivas.',  img: './archer.png', color: '#60a5fa', nivel: 5 },
  { id: 'firme', titulo: 'FIRME Y EXIGENTE', desc: 'Mensajes con mayor nivel de compromiso y presión estratégica para mantener el foco en tus objetivos.', img: './safeOrange.png', color: '#fb923c', nivel: 6 },
  { id: 'adaptativo', titulo: 'ADAPTATIVO', desc: 'El sistema ajusta automáticamente el tono según tu comportamiento y evolución.', img: './stars.png', color: '#a855f7', nivel: 7, recomendado: true },
];

const APOYOS = [
  { id: 'organizar', titulo: 'APOYO PARA ORGANIZARME MEJOR', img: './tabList.png', color: '#60a5fa' },
  { id: 'disciplina', titulo: 'APOYO PARA MANTENER DISCIPLINA Y CONSTANCIA', img: './dumbbell.png', color: '#a855f7' },
  { id: 'decisiones', titulo: 'APOYO PARA TOMAR MEJORES DECISIONES', img: './direction.png', color: '#2dd4bf' },
];

const CANALES = [
  { id: 'app', titulo: 'Notificaciones dentro de la app', desc: 'Mensajes visibles únicamente dentro de Focusia.', img:'./panel.png',  },
  { id: 'push', titulo: 'Notificaciones push', desc: 'Avisos enviados directamente a tu dispositivo.', img: './ring-1.png',  },
  { id: 'whatsapp', titulo: 'Mensajes tipo WhatsApp', desc: 'Mensajes con formato conversacional para activaciones relevantes.', img: './whatsapp-1.png', },
  { id: 'calls', titulo: 'Llamadas simuladas', desc: 'Activaciones de alta prioridad para situaciones definidas por ti.', img: './phone-1.png', },
];
const ESTADOS_CANAL = [
  { id: 'active', label: 'ACTIVAR' },
  { id: 'inactive', label: 'DESACTIVAR' },
  { id: 'critical_only', label: 'SOLO ACCIONES CRÍTICAS' },
];

// Valores canónicos del backend (Doc 27 §2.3). Se aceptan los nombres
// históricos para no perder preferencias ya guardadas.
const CANAL_CANONICO: Record<string, string> = { llamadas: 'calls' };
const ESTADO_CANONICO: Record<string, string> = {
  activar: 'active', desactivar: 'inactive', criticas: 'critical_only',
};
const DIA_CANONICO: Record<string, string> = {
  LUN: 'monday', MAR: 'tuesday', MIÉ: 'wednesday', JUE: 'thursday',
  VIE: 'friday', SÁB: 'saturday', DOM: 'sunday',
};
const DIA_DISPLAY: Record<string, string> = Object.fromEntries(
  Object.entries(DIA_CANONICO).map(([display, canon]) => [canon, display]),
);

const HORARIOS_GENERAL = [
  { id: 'todo_dia', titulo: 'Todo el día', desc: 'Puedo acompañarte en cualquier momento del día.', img:'./sunBlue.png' },
  { id: 'laboral', titulo: 'Solo horario laboral', desc: 'Activaciones solo durante tu jornada de trabajo.', img: './corporative.png' },
  { id: 'manana_tarde', titulo: 'Mañana y tarde', desc: 'Te acompaño en las franjas más productivas del día.', img: './sunRelax.png',  },
  { id: 'personalizado', titulo: 'Personalizado', desc: 'Elige los bloques de tiempo en los que deseas recibir activaciones.', img: './clockBlue.png',  },
];
const DIAS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

function Ondas({ flip }: { flip?: boolean }) {
  return (
    <div className={`pointer-events-none absolute top-0 bottom-0 w-40 overflow-hidden ${flip ? 'right-0' : 'left-0'}`} aria-hidden>
      <div className={`absolute top-[-10%] bottom-[-10%] w-64 rounded-[100%] bg-gradient-to-br from-[#2b44ff] via-[#7c3aed] to-[#d946ef] opacity-90 ${flip ? '-right-40' : '-left-40'}`} />
      <div className={`absolute top-[-10%] bottom-[-10%] w-64 rounded-[100%] border-[3px] border-white/40 ${flip ? '-right-36' : '-left-36'}`} />
      <div className={`absolute top-[-10%] bottom-[-10%] w-64 rounded-[100%] border-2 border-white/25 ${flip ? '-right-28' : '-left-28'}`} />
    </div>
  );
}

function LogoFocusia({ dark }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#22d3ee] via-[#2b44ff] to-[#d946ef] flex items-center justify-center text-white font-black text-lg">F</span>
      <span className={`text-2xl font-black ${dark ? 'text-white' : 'text-[#1e1b4b]'}`}>Focusia</span>
    </div>
  );
}

function Volver({ onClick, dark }: { onClick: () => void; dark?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`flex items-center gap-2 font-bold ${dark ? 'text-white/90 hover:text-white' : 'text-[#1e1b4b] hover:opacity-70'}`}>
      <span className={`w-9 h-9 rounded-full border flex items-center justify-center ${dark ? 'border-white/25' : 'border-transparent'}`}>
        <ArrowLeft className="w-5 h-5" />
      </span>
      Volver
    </button>
  );
}

function Guardar({ onClick, saving, saved }: { onClick: () => void; saving: boolean; saved: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className="px-10 py-3.5 rounded-xl bg-gradient-to-r from-[#2b44ff] to-[#a21caf] text-white font-bold tracking-wide hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
    >
      {saving && <Loader2 className="w-4 h-4 animate-spin" />}
      {saved ? 'GUARDADO ✓' : 'GUARDAR CAMBIOS'}
    </button>
  );
}

function NivelBarras({ nivel, color }: { nivel: number; color: string }) {
  return (
    <div className="flex items-center justify-center gap-1.5 py-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <span
          key={i}
          className="w-1.5 rounded-full"
          style={{ height: `${8 + i * 2.5}px`, background: i < nivel ? color : 'rgba(255,255,255,0.12)' }}
        />
      ))}
    </div>
  );
}

function PuntosFrecuencia({ puntos, color }: { puntos: number; color: string }) {
  return (
    <div className="mx-auto mt-4 flex items-center justify-center gap-1.5 rounded-lg bg-black/40 px-4 py-2.5 w-fit">
      {Array.from({ length: 8 }).map((_, i) => (
        <span
          key={i}
          className="rounded-full"
          style={{
            width: `${5 + i}px`, height: `${5 + i}px`,
            background: i < puntos ? color : 'rgba(255,255,255,0.12)',
            boxShadow: i < puntos ? `0 0 6px ${color}` : undefined,
          }}
        />
      ))}
    </div>
  );
}

function Radio({ activo, color }: { activo: boolean; color?: string }) {
  return (
    <span className="w-6 h-6 rounded-full border-2 border-white/40 flex items-center justify-center shrink-0" style={activo ? { borderColor: color } : undefined}>
      {activo && <span className="w-3 h-3 rounded-full" style={{ background: color || '#a855f7' }} />}
    </span>
  );
}

export default function ConfiguracionModule({ username, onClose, onLogout, pantallaInicial, avatarIndex, avatarUrl }: {
  username?: string;
  onClose: () => void;
  onLogout?: () => void;
  pantallaInicial?: Screen;
  avatarIndex?: number;
  avatarUrl?: string;
}) {
  const nombre = username?.trim() || 'Don Roberto';
  const [screen, setScreen] = useState<Screen>(pantallaInicial || 'menu');
  const [acompTab, setAcompTab] = useState<AcompTab>('intensidad');
  const [horTab, setHorTab] = useState<HorariosTab>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const indiceProp = (() => {
    if (avatarIndex && avatarIndex > 0) return avatarIndex;
    if (avatarUrl) {
      const hit = AVATARS.find(a => a.file === avatarUrl);
      if (hit) return hit.index;
    }
    return 0;
  })();
  const [avatarId, setAvatarId] = useState(indiceProp || 4);
  const [avatarDraft, setAvatarDraft] = useState(indiceProp || 4);
  const [reproduciendo, setReproduciendo] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [intensidad, setIntensidad] = useState('equilibrada');
  const [tono, setTono] = useState('adaptativo');
  const [apoyos, setApoyos] = useState<string[]>([]);
  const [notifs, setNotifs] = useState<Record<string, string>>({ app: 'active', push: 'active', whatsapp: 'critical_only', calls: 'inactive' });
  const [horarioGen, setHorarioGen] = useState('manana_tarde');
  const [horaIni, setHoraIni] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [diasOff, setDiasOff] = useState<string[]>([]);
  const [horasOff, setHorasOff] = useState({ desde: '', hasta: '' });
  const [periodos, setPeriodos] = useState<Record<string, { desde: string; hasta: string }>>({
    descanso: { desde: '', hasta: '' }, noche: { desde: '', hasta: '' }, madrugada: { desde: '', hasta: '' },
  });
  const [criticas, setCriticas] = useState('permitir');
  const [priv, setPriv] = useState({ notificaciones: true, recordatorios: true, datos_sensibles: false, funciones_especiales: true });
  const [cuenta, setCuenta] = useState({ username: '', email: '', date_joined: '' });
  const [nombreEdit, setNombreEdit] = useState('');
  const [emailEdit, setEmailEdit] = useState('');
  const [cuentaMsg, setCuentaMsg] = useState('');
  const [dispositivos, setDispositivos] = useState<any[]>([]);
  const [plan, setPlan] = useState('Premium mensual');
  const [showPass, setShowPass] = useState(false);
  const [pass, setPass] = useState({ actual: '', nueva: '', confirmar: '' });
  const [showPolitica, setShowPolitica] = useState(false);
  const [showEliminar, setShowEliminar] = useState(false);
  const [redes, setRedes] = useState<Record<string, string>>({});
  const [redesSaving, setRedesSaving] = useState<string | null>(null);
  const [redesErr, setRedesErr] = useState<Record<string, string>>({});
  const [redesOk, setRedesOk] = useState<Record<string, boolean>>({});
  const [tutAbierto, setTutAbierto] = useState<string | null>(null);

  useEffect(() => {
    if (pantallaInicial) setScreen(pantallaInicial);
  }, [pantallaInicial]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [perfil, notifList, sched, privData, acc, planData] = await Promise.all([
          configService.getProfile().catch(() => null),
          configService.getNotifications().catch(() => []),
          configService.getSchedule().catch(() => null),
          configService.getPrivacy().catch(() => null),
          configService.getAccount().catch(() => null),
          configService.getPlan().catch(() => null),
        ]);
        if (perfil) {
          const confirmado = perfil.current_avatar_id || 0;
          const elegido = confirmado || indiceProp || 4;
          setAvatarId(elegido); setAvatarDraft(elegido);
          if (perfil.intensity) setIntensidad(perfil.intensity);
          if (perfil.tone) setTono(perfil.tone);
          if (perfil.support_types) setApoyos(perfil.support_types);
          if (perfil.schedule_type) setHorarioGen(perfil.schedule_type);
        }
        if (Array.isArray(notifList) && notifList.length) {
          const m: Record<string, string> = {};
          notifList.forEach((n: any) => {
            const channel = CANAL_CANONICO[n.channel] || n.channel;
            m[channel] = ESTADO_CANONICO[n.state] || n.state;
          });
          setNotifs(prev => ({ ...prev, ...m }));
        }
        if (sched) {
          if (sched.custom_schedule_start) setHoraIni(sched.custom_schedule_start.slice(0, 5));
          if (sched.custom_schedule_end) setHoraFin(sched.custom_schedule_end.slice(0, 5));
          const dias: string[] = [];
          (sched.exceptions || []).forEach((e: any) => {
            const v = e.value || {};
            if (e.exception_type === 'no_days' || e.exception_type === 'dia_semana') {
              const days: string[] = v.days || (v.dia ? [v.dia] : []);
              days.forEach((d: string) => {
                const display = DIA_DISPLAY[DIA_CANONICO[d] || d];
                if (display) dias.push(display);
              });
            }
            if (e.exception_type === 'no_hours' || e.exception_type === 'horas') {
              setHorasOff({ desde: v.desde || '', hasta: v.hasta || '' });
            }
            if (e.exception_type === 'no_night' || ['descanso', 'noche', 'madrugada'].includes(e.exception_type)) {
              const key = e.exception_type === 'no_night' ? (v.etiqueta || 'noche') : e.exception_type;
              setPeriodos(prev => ({ ...prev, [key]: { desde: v.desde || '', hasta: v.hasta || '' } }));
            }
            if (e.exception_type === 'critical_only_outside' || e.exception_type === 'acciones_criticas') {
              if (v.modo) setCriticas(v.modo);
            }
          });
          if (dias.length) setDiasOff(dias);
        }
        if (privData) {
          setPriv({
            notificaciones: privData.notificaciones ?? true,
            recordatorios: privData.recordatorios ?? true,
            datos_sensibles: privData.datos_sensibles ?? false,
            funciones_especiales: privData.funciones_especiales ?? true,
          });
        }
        if (acc) {
          setCuenta({ username: acc.username || '', email: acc.email || '', date_joined: acc.date_joined || '' });
          setNombreEdit(acc.username || '');
          setEmailEdit(acc.email || '');
        }
        if (planData?.plan) setPlan(planData.plan);
        try {
          const mi = await configuracionService.getMiConfig().catch(() => null);
          if (mi?.redes_sociales) setRedes(mi.redes_sociales);
        } catch {}
      } catch (err) {
        console.error('Error cargando configuración:', err);
      } finally {
        setLoading(false);
      }
    })();
    return () => { try { audioRef.current?.pause(); } catch {} };
  }, []);

  const flashGuardado = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleDia = (d: string) => setDiasOff(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  const toggleApoyo = (id: string) => setApoyos(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const reproducirVoz = (id: number) => {
    try { audioRef.current?.pause(); } catch {}
    if (reproduciendo === id) { setReproduciendo(null); return; }
    const voz = AVATARS.find(a => a.index === id)?.voz;
    if (!voz) return;
    const audio = new Audio(encodeURI(voz));
    audioRef.current = audio;
    setReproduciendo(id);
    audio.onended = () => setReproduciendo(null);
    audio.onerror = () => setReproduciendo(null);
    audio.play().catch(() => setReproduciendo(null));
  };

  const guardarAvatar = async () => {
    setSaving(true); setError('');
    try {
      await configService.updateAvatar(avatarDraft);
      setAvatarId(avatarDraft);
      try {
        await configuracionService.updateMiConfig({ avatar_index: avatarDraft } as any);
      } catch {}
      flashGuardado();
    } catch { setError('No se pudo guardar el avatar.'); }
    finally { setSaving(false); }
  };

  const guardarAcomp = async () => {
    setSaving(true); setError('');
    try {
      await configService.updateAccompaniment({ intensity: intensidad, support_types: apoyos });
      await configService.updateTone(tono);
      flashGuardado();
    } catch { setError('No se pudo guardar el acompañamiento.'); }
    finally { setSaving(false); }
  };

  const guardarNotifs = async () => {
    setSaving(true); setError('');
    try {
      await configService.updateNotifications(Object.entries(notifs).map(([channel, state]) => ({ channel, state })));
      flashGuardado();
    } catch { setError('No se pudieron guardar las notificaciones.'); }
    finally { setSaving(false); }
  };

  const guardarHorarios = async () => {
    setSaving(true); setError('');
    try {
      await configService.updateSchedule({
        schedule_type: horarioGen,
        custom_schedule_start: horaIni || null,
        custom_schedule_end: horaFin || null,
      } as any);
      const actual = await configService.getSchedule().catch(() => null);
      for (const e of actual?.exceptions || []) {
        try { await configService.deleteScheduleException(e.id); } catch {}
      }
      const nuevas: { exception_type: string; value: unknown }[] = [
        ...diasOff.map(d => ({ exception_type: 'no_days', value: { days: [DIA_CANONICO[d] || d] } })),
      ];
      if (horasOff.desde || horasOff.hasta) nuevas.push({ exception_type: 'no_hours', value: horasOff });
      (Object.entries(periodos) as [string, { desde: string; hasta: string }][]).forEach(([k, v]) => {
        if (v.desde || v.hasta) nuevas.push({ exception_type: 'no_night', value: { ...v, etiqueta: k } });
      });
      nuevas.push({ exception_type: 'critical_only_outside', value: { modo: criticas } });
      for (const n of nuevas) {
        try { await configService.createScheduleException(n); } catch {}
      }
      flashGuardado();
    } catch { setError('No se pudieron guardar los horarios.'); }
    finally { setSaving(false); }
  };

  const guardarPriv = async (next?: typeof priv) => {
    setSaving(true); setError('');
    try {
      await configService.updatePrivacyPermissions((next ?? priv) as any);
      flashGuardado();
    } catch { setError('No se pudo guardar la privacidad.'); }
    finally { setSaving(false); }
  };

  const guardarCuenta = async () => {
    setSaving(true); setError(''); setCuentaMsg('');
    try {
      const r = await configService.updateAccount({ username: nombreEdit.trim(), email: emailEdit.trim() });
      setCuenta(prev => ({ ...prev, username: r.username, email: r.email }));
      setCuentaMsg('Datos actualizados.');
    } catch { setError('No se pudo actualizar la cuenta.'); }
    finally { setSaving(false); }
  };

  const cambiarPass = async () => {
    if (!pass.actual || !pass.nueva || pass.nueva !== pass.confirmar) {
      setError('Verifica la contraseña actual y la confirmación.');
      return;
    }
    setSaving(true); setError(''); setCuentaMsg('');
    try {
      await configService.changePassword(pass.actual, pass.nueva, pass.confirmar);
      setCuentaMsg('Contraseña cambiada.');
      setPass({ actual: '', nueva: '', confirmar: '' });
      setShowPass(false);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'No se pudo cambiar la contraseña.');
    }
    finally { setSaving(false); }
  };

  const guardarRed = async (id: RedId) => {
    const crudo = (redes[id] || '').trim();
    if (!crudo) {
      setRedesErr(prev => ({ ...prev, [id]: '' }));
      try {
        setRedesSaving(id);
        const next = { ...redes, [id]: '' };
        const r = await configuracionService.updateMiConfig({ redes_sociales: next } as any);
        setRedes(r.redes_sociales || next);
        setRedesOk(prev => ({ ...prev, [id]: true }));
        setTimeout(() => setRedesOk(prev => ({ ...prev, [id]: false })), 2000);
      } catch {
        setRedesErr(prev => ({ ...prev, [id]: 'No se pudo eliminar. Intenta de nuevo.' }));
      } finally {
        setRedesSaving(null);
      }
      return;
    }
    const msg = validarRed(id, crudo);
    if (msg) {
      setRedesErr(prev => ({ ...prev, [id]: msg }));
      return;
    }
    setRedesErr(prev => ({ ...prev, [id]: '' }));
    try {
      setRedesSaving(id);
      const next = { ...redes, [id]: normalizarUrl(crudo) };
      const r = await configuracionService.updateMiConfig({ redes_sociales: next } as any);
      setRedes(r.redes_sociales || next);
      setRedesOk(prev => ({ ...prev, [id]: true }));
      setTimeout(() => setRedesOk(prev => ({ ...prev, [id]: false })), 2000);
    } catch {
      setRedesErr(prev => ({ ...prev, [id]: 'No se pudo guardar. Intenta de nuevo.' }));
    } finally {
      setRedesSaving(null);
    }
  };

  const cargarDispositivos = async () => {
    try {
      setDispositivos(await configService.getDevices());
    } catch { setDispositivos([]); }
  };

  const exportarDatos = async () => {
    try {
      const r = await configService.exportData();
      const blob = new Blob([JSON.stringify((r as any).data || r, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'mis-datos-focusia.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch { setError('No se pudo exportar.'); }
  };

  const eliminarDatos = async () => {
    setSaving(true); setError('');
    try {
      await configService.deleteData(true);
      onLogout?.();
    } catch { setError('No se pudo eliminar.'); }
    finally { setSaving(false); setShowEliminar(false); }
  };

  const avatarActual = AVATARS.find(a => a.index === avatarDraft) || AVATARS[3];
  // La foto de la card del avatar usa las imágenes de la carpeta /avatars.
  const fotoAvatarCard = AVATARS_DARK.find(a => a.index === avatarDraft)?.file || AVATARS_DARK[3].file;
  const nombreAvatar = AVATAR_NOMBRES[avatarDraft] || avatarActual.name;

  const irMenu = () => { try { audioRef.current?.pause(); } catch {} setReproduciendo(null); setScreen('menu'); setError(''); };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[80] bg-[#050816] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  /* ============ MENÚ PRINCIPAL (claro) ============ */
  if (screen === 'menu') {
    const items = [
      { id: 'avatar' as Screen, label: 'Avatar' },
      { id: 'acomp' as Screen, label: 'Acompañamiento' },
      { id: 'notifs' as Screen, label: 'Notificaciones' },
      { id: 'horarios' as Screen, label: 'Horarios' },
      { id: 'privacidad' as Screen, label: 'Privacidad' },
      { id: 'cuenta' as Screen, label: 'Cuenta' }
    ];
    const fotoMenu = AVATARS.find(a => a.index === avatarId)?.file || AVATARS[3].file;
    return (
      <div className="fixed inset-0 z-[80] bg-[#f4f6fb] overflow-y-auto">
        <div className="relative min-h-full">
          <img src="./onda1.png" alt="" className="w-30 h-160" />
          <img src="./onda3.png" alt="" aria-hidden className="absolute right-0 top-0 w-30 h-160 object-cover pointer-events-none ml-8" />
          <div className="relative max-w-6xl  px-6 py-6 -mt-150 ml-25">
            <div className="flex items-center justify-between">
              <button type="button" onClick={onClose} className="flex items-center gap-2 font-bold text-[#1e1b4b] hover:opacity-70 ">
                <ArrowLeft className="w-6 h-6" /> Volver
              </button>
              <img src="./focussia.png" alt="Focusia" className="w-15" /><span className="w-20 text-center text-xl font-bold text-[#323EC0] ml-20" ><p className="text-center -ml-230 text-xl font-bold">Focusia</p> </span>
            </div>
            <h1 className="text-center text-4xl font-black text-[#14173a] mt-8 tracking-wide">CONFIGURACIÓN</h1>
            <p className="text-center text-[#2b44ff] font-medium mt-2">
              Aquí puedes ajustar Focusia a tu manera, {nombre}. Elige qué quieres modificar.
            </p>
            <div className="grid md:grid-cols-[300px_1fr] gap-6 mt-8 items-start">
              <div className="bg-white rounded-xl shadow border border-slate-100 overflow-hidden">
                <img src={fotoMenu} alt="Avatar actual" className="w-full aspect-[4/5] object-cover" />
                <div className="p-4 text-center">
                  <p className="font-black text-[#14173a]">{AVATAR_NOMBRES[avatarId] || ''}</p>
                  <p className="text-xs text-slate-500">Tu avatar actual</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                {items.map(it => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => { setError(''); setScreen(it.id); }}
                    className="bg-white rounded-2xl shadow-sm border border-slate-100 aspect-square flex items-center justify-center p-4 hover:shadow-md hover:border-[#2b44ff]/40 active:scale-95 transition-all"
                  >
                    <span className="font-bold text-[#1e1b4b] text-center">{it.label}</span>
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-center text-red-500 text-sm mt-4">{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  /* ============ AVATAR (claro) ============ */
  if (screen === 'avatar') {
    const otros = AVATARS.filter(a => a.index !== avatarDraft);
    return (
      <div className="fixed inset-0 z-[80] bg-[#f4f6fb] overflow-y-auto">
        <div className="relative min-h-full">
         <img src="./onda1.png" alt="" className="w-30 h-160" />
          <img src="./onda3.png" alt="" aria-hidden className="absolute right-0 top-0 w-30 h-160 object-cover pointer-events-none ml-8" />
          <div className="relative max-w-6xl  px-6 py-6 -mt-150 ml-25">
            <div className="flex items-center justify-between">
              <Volver onClick={irMenu} />
             <img src="./focussia.png" alt="Focusia" className="w-15" /><span className="w-20 text-center text-xl font-bold text-[#323EC0] ml-20" ><p className="text-center -ml-230 text-xl font-bold">Focusia</p> </span>
            </div>
            <h1 className="text-center text-4xl font-bold text-[#14173a] mt-6 tracking-wide">AVATAR</h1>
            <p className="text-center text-slate-500 mt-1">Revisa tu avatar actual o elige uno nuevo.</p>
            <div className="grid lg:grid-cols-2 gap-6 mt-6 items-start">
              <div>
                <div className="rounded-xl overflow-hidden text-white flex" style={{ background: 'linear-gradient(135deg, #373491 0%, #2B1C7E 55%, #170552 100%)' }}>
                  <img src={fotoAvatarCard} alt={nombreAvatar} className="w-40 sm:w-48 aspect-[3/4] object-cover shrink-0" />
                  <div className="flex-1 min-w-0 p-5 sm:p-6">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#2563eb] text-white text-xs font-black px-2.5 py-1 rounded-md">{nombreAvatar.slice(0, 3).toUpperCase()}</span>
                      <span className="text-2xl sm:text-3xl font-black">{nombreAvatar}</span>
                    </div>
                    <p className="text-sm text-[#c4b5fd] mt-1 leading-snug">{AVATAR_SUB[avatarDraft]}</p>
                    <button
                      type="button"
                      onClick={() => reproducirVoz(avatarDraft)}
                      className="mt-4 w-full bg-white rounded-full flex items-center gap-2 pl-1.5 pr-4 py-1.5 text-[#14173a]"
                    >
                      <span className="w-9 h-9 rounded-full bg-[#6d28d9] text-white flex items-center justify-center shrink-0">
                        {reproduciendo === avatarDraft ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                      </span>
                      <span className="flex-1 flex items-center gap-[3px]" aria-hidden>
                        {Array.from({ length: 28 }).map((_, i) => (
                          <span key={i} className="w-[3px] rounded-full bg-[#6d28d9]/70" style={{ height: `${6 + ((i * 7) % 16)}px` }} />
                        ))}
                      </span>
                      <span className="text-xs font-bold text-slate-500 whitespace-nowrap">0:00 / 0:00</span>
                    </button>
                    <div className="relative mt-4">
                      <span className="absolute -left-2 top-5 w-4 h-4 bg-white rotate-45 rounded-[3px]" aria-hidden />
                      <div className="relative bg-white rounded-2xl p-4 pl-5 text-sm leading-relaxed">
                        <p className="text-slate-800"><span className="text-[#6d28d9] text-2xl font-black leading-none mr-1">“</span><b>Hola, {nombre}.</b></p>
                        <p className="text-slate-500 mt-1">Desde ahora voy a acompañarte a construir la versión de ti que estás buscando.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => reproducirVoz(avatarDraft)}
                      className="mt-4 w-full border border-white/40 rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2 hover:bg-white/10"
                    >
                      <Volume2 className="w-4 h-4" /> Escuchar nuevamente
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={guardarAvatar}
                  disabled={saving}
                  className="mt-4 w-full py-3.5 rounded-xl bg-gradient-to-r from-[#0A1CA5] to-[#92089E] text-white font-black tracking-wide hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center"><Check className="w-4 h-4" /></span>}
                  {saved ? 'GUARDADO ✓' : 'CONFIRMAR CAMBIO'}
                </button>
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
              </div>
              <div>
                <p className="font-bold text-[#1e1b4b] mb-3 text-center">Escucha a los otros avatares</p>
                <div className="grid grid-cols-3 gap-3">
                  {otros.map(a => (
                    <button
                      key={a.index}
                      type="button"
                      onClick={() => setAvatarDraft(a.index)}
                      className={`bg-white rounded-xl overflow-hidden border-2 transition-all hover:shadow-md ${avatarDraft === a.index ? 'border-[#6d28d9]' : 'border-transparent shadow-sm'}`}
                    >
                      <img src={a.file} alt={a.name} className="w-full aspect-[3/4] object-cover" />
                      <span className="flex items-center justify-between px-2.5 py-2">
                        <span className="text-xs font-black text-[#14173a]">{(AVATAR_NOMBRES[a.index] || a.name).toUpperCase()}</span>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={e => { e.stopPropagation(); reproducirVoz(a.index); }}
                          onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); reproducirVoz(a.index); } }}
                          className="w-7 h-7 rounded-full border border-[#6d28d9]/40 text-[#6d28d9] flex items-center justify-center hover:bg-[#6d28d9] hover:text-white"
                        >
                          {reproduciendo === a.index ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ============ SHELL OSCURO ============ */
  const fotoLia = AVATARS_DARK.find(a => a.index === avatarId)?.file || AVATARS_DARK[3].file;
  const fotoCiber = AVATARS_CIBER[avatarId] || AVATARS_CIBER[4];
  const fotoTonoLateral = AVATAR_TONE[avatarId];
  const enTabTono = screen === 'acomp' && acompTab === 'tono' && !!fotoTonoLateral;
  const enTonoOSoporte = screen === 'acomp' && (acompTab === 'tono' || acompTab === 'apoyo');
  // Notificaciones usa las fotos de la carpeta Avatars_ciber.
  const fotoAside = enTonoOSoporte && fotoTonoLateral
    ? (fotoTonoLateral as string)
    : (screen === 'notifs' ? fotoCiber : fotoLia);
  const nombreLia = (AVATAR_NOMBRES[avatarId] || 'Lía').toUpperCase();
  const shell = (titulo: string, subtitulo: React.ReactNode, tabs: React.ReactNode, contenido: React.ReactNode, notaLia: React.ReactNode, extraLia?: React.ReactNode) => (
    <div className="fixed inset-0 z-[80] bg-[#050816] text-white overflow-y-auto">
      <div className="grid lg:grid-cols-[300px_1fr] min-h-full">
        <aside
          className="relative p-6 flex flex-col gap-10 overflow-hidden"
          style={{ backgroundImage: `url("${encodeURI(fotoAside)}")`, backgroundSize: 'cover', backgroundPosition: 'center top' }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a1030]/80 via-[#0a1030]/30 to-[#050816]/92" aria-hidden />
          <div className="relative z-10 flex items-center gap-2">
            <img src="./focussia.png" alt="Focusia" className="w-12 shrink-0" />
            <span className="text-xl font-bold text-white leading-none">Focusia</span>
          </div>
          <div className="relative z-10 mt-[32rem]  " />
          <div className="relative z-10 rounded-xl border border-[#2b44ff]/40 bg-[#0a1030]/80 p-4 text-sm leading-relaxed ">
            <p className="text-[#a855f7] font-black mb-1">{nombreLia}</p>
            {notaLia}
          </div>
          {extraLia && <div className="relative z-10">{extraLia}</div>}
          {screen === 'acomp' && acompTab === 'intensidad' && (
          <div className="relative z-20 mt-auto rounded-2xl border border-[#a855f7]/50 bg-[#0a1030]/95 p-4 shadow-[0_0_28px_rgba(168,85,247,0.35)] backdrop-blur">
            <h4 className="text-[11px] tracking-[0.22em] text-white font-black text-center mb-3">NIVEL DE PRESENCIA</h4>
            <img src="./levels.png" alt="Nivel de presencia" className="w-full drop-shadow-[0_0_12px_rgba(168,85,247,0.5)]" />
            <div className="w-full flex items-center justify-between px-1 mt-3">
              <span className="text-[#5eead4] font-black text-xs">Suave</span>
              <div className="flex-1 mx-3 h-px border-t border-dashed border-white/25" />
              <span className="text-[#fb923c] font-black text-xs">Exigente</span>
            </div>
          </div>
          )}
        </aside>
        <main className="p-6 lg:p-10 max-w-6xl w-full">
          <div className="flex items-center justify-between">
            <Volver dark onClick={irMenu} />
            <span />
          </div>
          {tabs}
          {subtitulo && <div className="mt-2 text-white/70">{subtitulo}</div>}
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
          <div className="mt-6">{contenido}</div>
        </main>
      </div>
    </div>
  );

  const tabsAcomp = (
    <div className="flex gap-8 mt-4 border-b border-white/10 text-sm font-bold">
      {([['intensidad', 'INTENSIDAD'], ['tono', 'TONO'], ['apoyo', 'TIPO DE APOYO']] as [AcompTab, string][]).map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => setAcompTab(id)}
          className={`pb-3 -mb-px ${acompTab === id ? 'text-[#c084fc] border-b-2 border-[#a855f7]' : 'text-white/50 hover:text-white/80'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  /* ============ ACOMPAÑAMIENTO ============ */
  if (screen === 'acomp') {
    const notaLia = acompTab === 'intensidad' ? (
      <><p>Cada persona necesita un nivel distinto de acompañamiento. Elige el que mejor se adapte a tu forma de trabajar.</p><p className="text-[#a855f7] mt-2">Siempre podrás cambiarlo más adelante.</p></>
    ) : acompTab === 'tono' ? (
      <><p>El tono define cómo me comunicaré contigo en tu día a día. Elige el estilo que mejor se adapta a tu personalidad y objetivos.</p><p className="text-[#a855f7] mt-2">Siempre podrás cambiarlo cuando quieras.</p></>
    ) : (
      <><p>El usuario podrá elegir una o más opciones.</p><p className="mt-2">Esta configuración permite que Focusia entienda qué tipo de acompañamiento necesita priorizar el usuario.</p></>
    );
    const contenido = acompTab === 'intensidad' ? (
      <div>
        <h2 className="text-3xl font-bold">Intensidad del acompañamiento</h2>
        <p className="text-white/70 mt-1">Elige qué tan presente quieres que esté Focusia en tu proceso. <span className="text-[#a855f7]">Puedes cambiar esta configuración cuando quieras.</span></p>
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          {INTENSIDADES.map(c => {
            const sel = intensidad === c.id;
            return (
              <div key={c.id} className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => setIntensidad(c.id)}
                  className="relative w-65 rounded-xl border p-6 pt-8 text-center transition-all hover:brightness-125"
                  style={{
                    borderColor: sel || c.recomendado ? c.color : 'rgba(255,255,255,0.1)',
                    background: 'rgba(10,10,30,0.85)',
                    boxShadow: sel || c.recomendado ? `0 0 32px ${c.color}55` : undefined,
                  }}
                >
                  {c.recomendado && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#2b44ff] to-[#a21caf] text-[10px] font-black px-4 py-1.5 rounded-lg whitespace-nowrap shadow-lg">★ RECOMENDADO</span>
                  )}
                  <span
                    className="mx-auto w-24 h-24 rounded-full flex items-center justify-center overflow-hidden"
                    style={{ background: '#0a0a1e', border: `2px solid ${c.color}88`, boxShadow: `0 0 20px ${c.color}66, inset 0 0 12px ${c.color}33` }}
                  >
                    <img src={c.img} alt={c.titulo} className="w-40 h-40 object-contain" />
                  </span>
                  <p className="font-bold text-md mt-4 tracking-wide" style={{ color: c.color }}>{c.titulo}</p>
                  <p className="text-[12px] text-white/65 mt-3 leading-relaxed">{c.desc}</p>
                   <NivelBarras nivel={c.nivel} color={c.color} />
                  <p className="text-xs font-bold mt-2" style={{ color: c.color }}>{c.pie}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setIntensidad(c.id)}
                  aria-label={c.titulo}
                  className="mt-4 w-6 h-6 rounded-full border-2 transition-all"
                  style={sel
                    ? { borderColor: '#a855f7', background: '#a855f7', boxShadow: '0 0 12px #a855f7' }
                    : { borderColor: 'rgba(255,255,255,0.3)', background: 'transparent' }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-end mt-6"><Guardar onClick={guardarAcomp} saving={saving} saved={saved} /></div>
      </div>
    ) : acompTab === 'tono' ? (
      <div>
        <h2 className="text-3xl font-bold">Tono del avatar</h2>
        <p className="text-white/70 mt-1">Elige el estilo con que tu avatar te acompañará. <span className="text-[#a855f7]">Podrás modificarlo cuando quieras.</span></p>
        <div className="grid md:grid-cols-4 gap-4 mt-6">
          {TONOS.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => setTono(c.id)}
              className="relative rounded-xl border bg-[#0a1030]/60 p-5 text-center transition-all hover:brightness-125"
              style={{ borderColor: tono === c.id ? c.color : 'rgba(255,255,255,0.12)' }}
            >
              {c.recomendado && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#2b44ff] to-[#a21caf] text-[10px] font-black px-3 py-1 rounded-md whitespace-nowrap">★ RECOMENDADO</span>
              )}
              <span className="relative mx-auto w-18 h-16 rounded-full flex items-center justify-center border overflow-hidden" style={{ borderColor: c.color + '66', background: c.color + '14' }}>
                {'img' in c && c.img ? (
                  <img
                    src={c.img}
                    alt=""
                   
                    className="absolute  w-13 h-13 "
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : null}
              </span>
              <p className="font-bold mt-3" style={{ color: c.color }}>{c.titulo}</p>
              <p className="text-xs text-white/70 mt-2 leading-relaxed">{c.desc}</p>
              <NivelBarras nivel={c.nivel} color={c.color} />
              <span className="flex justify-center mt-2"><Radio activo={tono === c.id} color={c.color} /></span>
            </button>
          ))}
        </div>
        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4 flex items-center gap-3 text-sm text-white/80">
          <span className="w-9 h-9 rounded-lg bg-[#5b21b6] flex items-center justify-center shrink-0"><Sparkles className="w-4 h-4" /></span>
          Focusia aprenderá contigo y ajustará su comunicación para acompañarte de la mejor forma posible.
        </div>
        <div className="flex justify-end mt-6"><Guardar onClick={guardarAcomp} saving={saving} saved={saved} /></div>
      </div>
    ) : (
      <div>
        <h2 className="text-3xl font-bold">Tipo de apoyo</h2>
        <p className="text-white/70 mt-1">Elige una o más opciones</p>
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          {APOYOS.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleApoyo(c.id)}
              className="rounded-xl border bg-[#0a1030]/60 p-10 text-center transition-all hover:brightness-125"
              style={{ borderColor: apoyos.includes(c.id) ? c.color : 'rgba(255,255,255,0.12)' }}
            >
              <span className="mx-auto w-20 h-20 rounded-full flex items-center justify-center border" style={{ borderColor: c.color + '66', background: c.color + '14' }}>
                 {'img' in c && c.img ? (
                  <img
                    src={c.img}
                    alt=""
                   
                    className="absolute  w-13 h-13 "
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : null}
              </span>
              <p className="font-bold mt-3" style={{ color: c.color }}>{c.titulo}</p>
              <span className="mx-auto mt-4 w-6 h-6 rounded-md border-2 flex items-center justify-center" style={{ borderColor: c.color }}>
                {apoyos.includes(c.id) && <Check className="w-4 h-4" style={{ color: c.color }} />}
              </span>
            </button>
          ))}
        </div>
        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/80">
          Ayuda a orientar el tipo de mensajes, sugerencias y recomendaciones que el sistema entregará. No cambia el avatar, los horarios ni los canales de activación.
        </div>
        <div className="flex justify-end mt-6"><Guardar onClick={guardarAcomp} saving={saving} saved={saved} /></div>
      </div>
    );
    return shell('Acompañamiento', null, tabsAcomp, contenido, notaLia);
  }

  /* ============ NOTIFICACIONES ============ */
  if (screen === 'notifs') {
    const notaLia = <p>Así podré comunicarme contigo de la forma que prefieras y en el momento adecuado.</p>;
    
    const contenido = (
      <div>
        <h2 className="text-3xl font-bold">Notificaciones</h2>
        <p className="text-white/70 mt-1">Elige qué avisos quieres recibir y cuáles aceptar solo cuando sean realmente importantes.</p>
        <div className="space-y-4 mt-6">
          {CANALES.map(c => (
            <div key={c.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col md:flex-row md:items-center gap-4">
              <span className="relative w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden bg-white/[0.06]">
                {c.img ? (
                  <img
                    src={c.img}
                    alt=""
                    className="w-full h-full object-contain"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : null}
              </span>
              <div className="flex-1">
                <p className="font-bold">{c.titulo}</p>
                <p className="text-xs text-white/60">{c.desc}</p>
              </div>
              <div className="flex rounded-xl border border-white/15 overflow-hidden text-[11px] font-bold">
                {ESTADOS_CANAL.map(e => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setNotifs(prev => ({ ...prev, [c.id]: e.id }))}
                    className={`px-4 py-2.5 transition-all ${notifs[c.id] === e.id ? 'bg-[#3F12E2] text-white' : 'text-white/50 hover:text-white'}`}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-6"><Guardar onClick={guardarNotifs} saving={saving} saved={saved} /></div>
      </div>
    );
    return shell('Notificaciones', null, null, contenido, notaLia );
  }

  /* ============ HORARIOS ============ */
  if (screen === 'horarios') {
    const tabsHor = (
      <div className="flex gap-8 mt-4 border-b border-white/10 text-sm font-bold">
        {([['general', 'HORARIO GENERAL'], ['excepciones', 'EXCEPCIONES']] as [HorariosTab, string][]).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setHorTab(id)}
            className={`pb-3 -mb-px ${horTab === id ? 'text-white border-b-2 border-[#a855f7]' : 'text-white/50 hover:text-white/80'}`}
          >
            {label}
          </button>
        ))}
      </div>
    );
    const notaLia = <><p>Establecer límites también es parte del equilibrio. Así puedo acompañarte mejor respetando tu tiempo y tus momentos.</p></>;
    const extraLia = horTab === 'general' ? (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-relaxed">
        <p className="text-[#a855f7] font-bold mb-1 flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> TÚ TIENES EL CONTROL</p>
        <p className="text-white/70">Focusia acompaña dentro de los horarios permitidos. Fuera de esos horarios, solo puede intervenir si autorizaste acciones críticas.</p>
      </div>
    ) : undefined;
    const contenido = horTab === 'general' ? (
      <div>
        <h2 className="text-3xl font-bold">Horarios</h2>
        <p className="text-white/70 mt-1">Define cuándo Focusia tiene permiso para intervenir.</p>
        <div className="space-y-4 mt-6">
          {HORARIOS_GENERAL.map(h => (
            <button
              key={h.id}
              type="button"
              onClick={() => setHorarioGen(h.id)}
              className="w-full rounded-xl border bg-white/[0.03] p-4 flex items-center gap-4 text-left transition-all hover:brightness-125"
              style={{ borderColor: horarioGen === h.id ? '#a855f7' : 'rgba(255,255,255,0.1)' }}
            >
              <span className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" >
                <img src={h.img} alt={h.titulo} className="w-14 h-14"  />
              </span>
              <span className="flex-1">
                <span className="block font-bold">{h.titulo}</span>
                <span className="block text-xs text-white/60">{h.desc}</span>
                {h.id === 'personalizado' && horarioGen === 'personalizado' && (
                  <span className="flex gap-2 mt-2" onClick={e => e.stopPropagation()}>
                    <input type="time" value={horaIni} onChange={e => setHoraIni(e.target.value)} className="bg-[#0a1030] border border-white/15 rounded-lg px-2 py-1 text-sm" />
                    <input type="time" value={horaFin} onChange={e => setHoraFin(e.target.value)} className="bg-[#0a1030] border border-white/15 rounded-lg px-2 py-1 text-sm" />
                  </span>
                )}
              </span>
              <Radio activo={horarioGen === h.id} />
            </button>
          ))}
        </div>
        <div className="flex justify-end mt-6"><Guardar onClick={guardarHorarios} saving={saving} saved={saved} /></div>
      </div>
    ) : (
      <div>
        <h2 className="text-3xl font-bold">Horarios</h2>
        <p className="text-white/70 mt-1">Configura los momentos en que Focusia no debe intervenir.</p>
        <div className="rounded-2xl border border-[#a855f7]/40 bg-white/[0.02] p-5 mt-6">
          <p className="font-bold mb-3">Días sin intervención</p>
          <div className="flex flex-wrap gap-2">
            {DIAS.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDia(d)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-all ${diasOff.includes(d) ? 'border-[#a855f7] bg-[#a855f7]/15 text-white' : 'border-white/15 text-white/60 hover:text-white'}`}
              >
                <span className={`w-4 h-4 rounded-full border-2 ${diasOff.includes(d) ? 'border-[#a855f7] bg-[#a855f7]' : 'border-white/40'}`} />
                {d}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-[#a855f7]/40 bg-white/[0.02] p-5 mt-4">
          <p className="font-bold mb-3">Horas sin intervención</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block text-xs text-white/60">DESDE
              <input type="time" value={horasOff.desde} onChange={e => setHorasOff(p => ({ ...p, desde: e.target.value }))} className="mt-1 w-full bg-transparent border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm" />
            </label>
            <label className="block text-xs text-white/60">HASTA
              <input type="time" value={horasOff.hasta} onChange={e => setHorasOff(p => ({ ...p, hasta: e.target.value }))} className="mt-1 w-full bg-transparent border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm" />
            </label>
          </div>
        </div>
        <div className="rounded-xl border border-[#a855f7]/40 bg-white/[0.02] p-5 mt-4">
          <p className="font-bold mb-3">NO INTERVENIR DURANTE</p>
          <div className="grid md:grid-cols-3 gap-3">
            {[['descanso', 'MI HORARIO DE DESCANSO'], ['noche', 'LA NOCHE'], ['madrugada', 'LA MADRUGADA']].map(([k, label]) => (
              <div key={k} className="rounded-xl border border-white/10 p-3">
                <p className="text-xs font-bold text-center mb-2">{label}</p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-[10px] text-white/60">DESDE
                    <input type="time" value={periodos[k].desde} onChange={e => setPeriodos(p => ({ ...p, [k]: { ...p[k], desde: e.target.value } }))} className="mt-1 w-full bg-transparent border border-white/15 rounded-lg px-2 py-1.5 text-white text-xs" />
                  </label>
                  <label className="block text-[10px] text-white/60">HASTA
                    <input type="time" value={periodos[k].hasta} onChange={e => setPeriodos(p => ({ ...p, [k]: { ...p[k], hasta: e.target.value } }))} className="mt-1 w-full bg-transparent border border-white/15 rounded-lg px-2 py-1.5 text-white text-xs" />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-[#a855f7]/40 bg-white/[0.02] p-5 mt-4 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <p className="font-bold">Acciones críticas</p>
            <p className="text-xs text-white/60">Permitir intervención solo si la acción es crítica.</p>
          </div>
          <div className="flex gap-2">
            {([['permitir', 'PERMITIR'], ['bloquear', 'BLOQUEAR']] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setCriticas(id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-bold ${criticas === id ? 'border-[#a855f7] text-white' : 'border-white/15 text-white/50'}`}
              >
                <Radio activo={criticas === id} /> {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end mt-6"><Guardar onClick={guardarHorarios} saving={saving} saved={saved} /></div>
      </div>
    );
    return shell('Horarios', null, tabsHor, contenido, notaLia, extraLia);
  }

  /* ============ PRIVACIDAD ============ */
  if (screen === 'privacidad') {
    const notaLia = <p>Aquí puedes revisar cómo Focusia protege tu información y decidir qué permisos quieres mantener activos. Tus datos son tuyos y tú mantienes el control.</p>;
    const Toggle = ({ id, label, icon: Icon, valor }: { id: keyof typeof priv; label: string; icon: React.ComponentType<{ className?: string }>; valor: boolean }) => (
      <div className="flex items-center gap-3 py-3">
        <span className="w-9 h-9 rounded-full border border-[#a855f7]/50 bg-[#a855f7]/10 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-[#c084fc]" />
        </span>
        <span className="text-sm text-white/80 flex-1">{label}</span>
        <button
          type="button"
          onClick={() => { const next = { ...priv, [id]: !valor }; setPriv(next); guardarPriv(next); }}
          className="flex items-center gap-2"
        >
          <span className={`w-11 h-6 rounded-full p-0.5 transition-colors ${valor ? 'bg-[#7c3aed]' : 'bg-white/15'}`}>
            <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${valor ? 'translate-x-5' : ''}`} />
          </span>
          <span className="text-xs w-20 text-left" style={{ color: valor ? '#c084fc' : '#64748b' }}>{valor ? 'Activado' : 'Desactivado'}</span>
        </button>
      </div>
    );
    const contenido = (
      <div>
        <h2 className="text-3xl font-bold">Privacidad</h2>
        <p className="text-white/70 mt-1">Revisa cómo Focusia protege tu información.</p>
        <div className="rounded-xl border border-blue-500/40 bg-white/[0.02] p-5 mt-6">
          <div className="flex items-center gap-4 mb-4">
            <img src="./SF2.png" alt="Protección de datos" className="w-18 h-20" />
            <p className="font-bold">1. Cómo Focusia protege tus datos</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-5">
            {([
              ['Privacidad', 'Respetamos tu información personal.', Lock],
              ['Seguridad', 'Protegemos tus datos con altos estándares.', ShieldCheck],
              ['Cifrado', 'Tus datos están cifrados siempre.', Lock],
              ['Control del usuario', 'Tú decides qué datos compartir y usar.', UserCog],
              ['Uso responsable', 'Utilizamos tus datos solo para mejorar tu experiencia.', Leaf],
            ] as [string, string, React.ComponentType<{ className?: string }>][]).map(([t, d, Icon]) => (
              <div key={t}>
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-[#c084fc] shrink-0" />
                  <p className="text-xs font-bold">{t}</p>
                </div>
                <p className="text-[11px] text-white/55 mt-1.5">{d}</p>
              </div>
            ))}
          </div>
         
        </div>
         
            <p className="text-[11px] text-white/50">Marco normativo: Chile · Ley N.º 19.628 | Unión Europea · RGPD/GDPR | EE. UU. · CCPA/CPRA y demás normas aplicables.</p>
          
        <div className="rounded-xl border border-[#a855f7]/40 bg-white/[0.02] p-5 mt-2">
            <div className="flex items-center gap-2 ">
            <img src="./teams.png" alt="Protección de datos" className="w-18 h-20" />
            <p className="font-bold mb-1">2. Permisos y consentimientos</p>
          </div>
          <div className="grid md:grid-cols-2 gap-x-8">
            <Toggle id="notificaciones" label="Notificaciones" icon={Bell} valor={priv.notificaciones} />
            <Toggle id="recordatorios" label="Recordatorios" icon={BellRing} valor={priv.recordatorios} />
            <Toggle id="datos_sensibles" label="Datos sensibles" icon={Lock} valor={priv.datos_sensibles} />
            <Toggle id="funciones_especiales" label="Funciones especiales" icon={Sparkles} valor={priv.funciones_especiales} />
          </div>
        </div>
        <div className="rounded-xl border border-green-500/40 bg-white/[0.02] p-5 mt-4">
         <div className="flex items-center gap-4 mb-4">
            <img src="./File.png" alt="Protección de datos" className="w-18 h-20" />
            <p className="font-bold mb-3">3. Datos guardados</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              ['Metas', Target],
              ['Objetivos', ListChecks],
              ['Planificación', CalendarDays],
              ['Preferencias', Heart],
              ['Configuraciones', Settings],
              ['Reportes', BarChart3],
              ['Registros de uso', ClipboardList],
            ] as [string, React.ComponentType<{ className?: string }>][]).map(([t, Icon]) => (
              <span key={t} className="text-xs border border-[#55F78B]/40 text-[#23F09A] rounded-full px-3 py-1.5 inline-flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5" /> {t}
              </span>
            ))}
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div className="rounded-xl border border-[#60a5fa]/40 p-5">
           <div className="flex items-center gap-4 mb-4">
            <img src="./upload.png" alt="Protección de datos" className="w-20 h-20" />
            <p className="font-bold">4. Exportar datos</p>
          </div>
            
            <p className="text-xs text-white/60 mt-1">Solicita una copia descargable de tu información personal.</p>
            <button type="button" onClick={exportarDatos} className="mt-3 w-full border border-[#60a5fa]/60 text-[#93c5fd] rounded-xl py-2.5 text-sm font-bold hover:bg-[#60a5fa]/10">Solicitar copia de mis datos</button>
          </div>
          <div className="rounded-xl border border-red-500/40 p-5">
            <div className="flex items-center gap-4 mb-4">
              <img src="./trash.png" alt="Eliminar datos" className="w-20 h-20" />
              <p className="font-bold">5. Eliminar datos</p>
            </div>
            <p className="text-xs text-white/60 mt-1">Solicita eliminar tus datos o cerrar definitivamente tu cuenta.</p>
            {!showEliminar ? (
              <button type="button" onClick={() => setShowEliminar(true)} className="mt-3 w-full border border-red-500/60 text-red-400 rounded-xl py-2.5 text-sm font-bold hover:bg-red-500/10">Gestionar eliminación</button>
            ) : (
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={eliminarDatos} disabled={saving} className="flex-1 bg-red-600 rounded-xl py-2.5 text-sm font-bold hover:bg-red-500 disabled:opacity-50">Confirmar eliminación</button>
                <button type="button" onClick={() => setShowEliminar(false)} className="flex-1 border border-white/20 rounded-xl py-2.5 text-sm font-bold">Cancelar</button>
              </div>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 mt-4 p-4 flex flex-col md:flex-row md:items-center gap-3">
          <p className="flex-1 text-sm text-white/80">Política de Privacidad y Compliance completa.</p>
          <button type="button" onClick={() => setShowPolitica(v => !v)} className="border border-white/20 rounded-xl px-5 py-2.5 text-sm font-bold text-[#93c5fd] flex items-center gap-2 hover:bg-white/5">
            <Download className="w-4 h-4" /> {showPolitica ? 'Ocultar documento' : 'Descargar documento completo (PDF)'}
          </button>
        </div>
        {showPolitica && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 mt-4 text-xs text-white/70 leading-relaxed space-y-2 max-h-72 overflow-y-auto">
            <p><b className="text-white">1. Datos que tratamos.</b> Perfil, metas, planificación, preferencias y registros de uso necesarios para el acompañamiento.</p>
            <p><b className="text-white">2. Finalidad.</b> Proveer acompañamiento, recordatorios y mejoras del servicio. Nunca vendemos tus datos.</p>
            <p><b className="text-white">3. Tus derechos.</b> Acceso, rectificación, exportación y eliminación desde esta pantalla.</p>
            <p><b className="text-white">4. Conservación.</b> Solo durante la vigencia de tu cuenta; al eliminarla se desactivan tus accesos.</p>
            <p><b className="text-white">5. Marco normativo.</b> Chile Ley N.º 19.628, RGPD/GDPR, CCPA/CPRA y normas aplicables.</p>
          </div>
        )}
      </div>
    );
    return shell('Privacidad', null, null, contenido, notaLia);
  }

  /* ============ CUENTA ============ */
  const cuentaContenido = (
    <div>
      <h2 className="text-3xl font-bold">Cuenta</h2>
      <p className="text-white/70 mt-1">Administra tu información, tus accesos y el estado de tu cuenta.</p>
      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <div className="rounded-xl border border-[#60a5fa]/50 p-5">
          <p className="font-bold flex items-center gap-2"><UserIcon className="w-5 h-5 text-[#60a5fa]" /> Perfil</p>
          <div className="mt-4 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-full overflow-hidden shadow-sm border-2 border-white/30 shrink-0">
                <img src={avatarUrl || AVATARS.find(a => a.index === avatarId)?.file} alt="profile" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <label className="text-xs text-white/60">Nombre</label>
                  <div className="flex gap-2 mt-1">
                    <input value={nombreEdit} onChange={e => setNombreEdit(e.target.value)} className="flex-1 bg-transparent border-b border-white/15 focus:border-[#60a5fa] outline-none py-1 text-sm" />
                    <button type="button" onClick={guardarCuenta} disabled={saving} className="text-xs border border-[#60a5fa]/60 text-[#93c5fd] rounded-lg px-3 py-1">Editar</button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/60">Fotografía de perfil</label>
                  <button type="button" onClick={() => setScreen('avatar')} className="mt-1 text-xs border border-[#60a5fa]/60 text-[#93c5fd] rounded-lg px-3 py-1.5 flex items-center gap-1">
                    Cambiar fotografía <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs text-white/60">Correo electrónico</label>
              <div className="flex gap-2 mt-1">
                <input value={emailEdit} onChange={e => setEmailEdit(e.target.value)} className="flex-1 bg-transparent border-b border-white/15 focus:border-[#60a5fa] outline-none py-1 text-sm" />
                <button type="button" onClick={guardarCuenta} disabled={saving} className="text-xs border border-[#60a5fa]/60 text-[#93c5fd] rounded-lg px-3 py-1">Actualizar</button>
              </div>
            </div>
            {cuentaMsg && <p className="text-xs text-emerald-300">{cuentaMsg}</p>}
          </div>
        </div>
        <div className="rounded-2xl border border-[#a855f7]/50 p-5">
          <p className="font-bold flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-[#a855f7]" /> Seguridad y accesos</p>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-white/80">Contraseña</span>
              <button type="button" onClick={() => setShowPass(v => !v)} className="text-xs border border-[#a855f7]/60 text-[#c084fc] rounded-lg px-3 py-1.5">Cambiar contraseña</button>
            </div>
            {showPass && (
              <div className="space-y-2 rounded-xl border border-white/10 p-3">
                <input type="password" placeholder="Actual" value={pass.actual} onChange={e => setPass(p => ({ ...p, actual: e.target.value }))} className="w-full bg-transparent border border-white/15 rounded-lg px-2 py-1.5 text-sm" />
                <input type="password" placeholder="Nueva" value={pass.nueva} onChange={e => setPass(p => ({ ...p, nueva: e.target.value }))} className="w-full bg-transparent border border-white/15 rounded-lg px-2 py-1.5 text-sm" />
                <input type="password" placeholder="Confirmar nueva" value={pass.confirmar} onChange={e => setPass(p => ({ ...p, confirmar: e.target.value }))} className="w-full bg-transparent border border-white/15 rounded-lg px-2 py-1.5 text-sm" />
                <button type="button" onClick={cambiarPass} disabled={saving} className="w-full bg-[#7c3aed] rounded-lg py-2 text-xs font-bold disabled:opacity-50">Guardar contraseña</button>
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <span className="text-white/80">Dispositivos conectados</span>
              <button type="button" onClick={cargarDispositivos} className="text-xs border border-[#a855f7]/60 text-[#c084fc] rounded-lg px-3 py-1.5">Ver dispositivos</button>
            </div>
            {dispositivos.length > 0 && (
              <div className="text-xs text-white/60 space-y-1">
                <p>{dispositivos.length} sesión(es) activa(s).</p>
                <button type="button" onClick={() => configService.logoutAllDevices().then(cargarDispositivos).catch(() => {})} className="text-[#c084fc] underline">Cerrar otras sesiones</button>
              </div>
            )}
            <p className="text-xs text-white/50">Revisa y cierra sesiones activas cuando lo necesites.</p>
          </div>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-4 mt-4">
        <div className="rounded-2xl border border-[#2dd4bf]/50 p-5">
          <p className="font-bold flex items-center gap-2 text-sm"><CreditCard className="w-5 h-5 text-[#2dd4bf]" /> Plan de suscripción</p>
          <p className="mt-2">{plan}</p>
          <span className="inline-block mt-2 text-xs border border-[#2dd4bf]/60 text-[#5eead4] rounded-full px-3 py-1">Plan vigente</span>
        </div>
        <div className="rounded-2xl border border-emerald-500/50 p-5">
          <p className="font-bold flex items-center gap-2 text-sm"><Check className="w-5 h-5 text-emerald-400" /> Estado de cuenta</p>
          <span className="inline-block mt-3 text-xs border border-emerald-500/60 text-emerald-300 rounded-full px-3 py-1">Cuenta activa</span>
        </div>
        <div className="rounded-2xl border border-red-500/50 p-5">
          <p className="font-bold flex items-center gap-2 text-sm"><LogOut className="w-5 h-5 text-red-400" /> Cerrar sesión</p>
          <p className="text-xs text-white/60 mt-2">Sal de la cuenta en este dispositivo.</p>
          <button type="button" onClick={() => onLogout?.()} className="mt-3 w-full border border-red-500/60 text-red-400 rounded-xl py-2 text-sm font-bold hover:bg-red-500/10">Cerrar sesión</button>
        </div>
      </div>
    </div>
  );
  if (screen === 'cuenta') {
    const notaLia = <p>Aquí puedes administrar tu información, revisar tus accesos y conocer el estado de tu plan.</p>;
    return shell('Cuenta', null, null, cuentaContenido, notaLia);
  }

  /* ============ MIS REDES SOCIALES (claro) ============ */
  if (screen === 'redes') {
    return (
      <div className="fixed inset-0 z-[80] bg-[#f4f6fb] overflow-y-auto">
        <div className="relative min-h-full">
          <img src="./onda1.png" alt="" className="w-30 h-160" />
          <img src="./onda3.png" alt="" aria-hidden className="absolute right-0 top-0 w-30 h-160 object-cover pointer-events-none ml-8" />
          <div className="relative max-w-6xl px-6 py-6 -mt-150 ml-25">
            <div className="flex items-center justify-between">
              <Volver onClick={irMenu} />
              <img src="./focussia.png" alt="Focusia" className="w-15" /><span className="w-20 text-center text-xl font-bold text-[#323EC0] ml-20"><p className="text-center -ml-230 text-xl font-bold">Focusia</p></span>
            </div>
            <h1 className="text-center text-4xl font-black text-[#14173a] mt-6 tracking-wide">MIS REDES SOCIALES</h1>
            <p className="text-center text-slate-500 mt-1">Guarda el enlace de cada perfil una sola vez. El Dashboard mostrará solo las redes configuradas.</p>
            <div className="grid md:grid-cols-2 gap-4 mt-6">
              {REDES.map(r => {
                const valor = redes[r.id] || '';
                const configurada = valor.trim() !== '';
                const abierto = tutAbierto === r.id;
                return (
                  <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                    <div className="flex items-center gap-3">
                      <span className="w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: r.color }}>
                        <RedIcon id={r.id} className="w-6 h-6" />
                      </span>
                      <div className="flex-1">
                        <p className="font-black text-[#14173a]">{r.nombre}</p>
                        <p className={`text-xs font-bold ${configurada ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {configurada ? '● Configurada' : '○ Sin configurar'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTutAbierto(abierto ? null : r.id)}
                        className="text-xs font-bold text-[#2b44ff] hover:underline whitespace-nowrap"
                      >
                        {abierto ? 'Ocultar ayuda' : '¿Cómo obtengo mi enlace?'}
                      </button>
                    </div>
                    {abierto && (
                      <ol className="mt-3 rounded-xl bg-[#eef2ff] p-3 pl-8 text-[13px] text-slate-700 list-decimal space-y-1">
                        {r.tutorial.map((paso, i) => <li key={i}>{paso}</li>)}
                        <li className="font-bold text-[#2b44ff]">Tarda unos 10 segundos.</li>
                      </ol>
                    )}
                    <div className="flex gap-2 mt-3">
                      <input
                        type="url"
                        inputMode="url"
                        value={valor}
                        onChange={e => setRedes(prev => ({ ...prev, [r.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') guardarRed(r.id); }}
                        placeholder={`https://... tu perfil de ${r.nombre}`}
                        className="flex-1 min-w-0 bg-[#f4f6fb] border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#2b44ff]"
                      />
                      <button
                        type="button"
                        onClick={() => guardarRed(r.id)}
                        disabled={redesSaving === r.id}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2b44ff] to-[#a21caf] text-white text-sm font-black tracking-wide hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        {redesSaving === r.id && <Loader2 className="w-4 h-4 animate-spin" />}
                        {redesOk[r.id] ? 'GUARDADO ✓' : 'GUARDAR'}
                      </button>
                    </div>
                    {redesErr[r.id] ? (
                      <p className="text-red-500 text-xs mt-2">{redesErr[r.id]}</p>
                    ) : configurada ? (
                      <p className="text-xs text-slate-400 mt-2">Vacía el campo y pulsa Guardar para desactivar esta red.</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

