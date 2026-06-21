import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowRight, Check, Sparkles, Gauge, Bell, Clock,
  MessageSquare, Smartphone, Monitor, Volume2,
  SkipForward, Heart, ChevronRight,
} from 'lucide-react';
import { configuracionService } from '../services/api';

const AVATARS = [
  { index: 1, name: 'John', file: '/avartars/John.jpeg', genero: 'masculino' },
  { index: 2, name: 'conrad', file: '/avartars/conrad.jpeg', genero: 'masculino' },
  { index: 3, name: 'Ashley', file: '/avartars/Ashley.jpeg', genero: 'masculino' },
  { index: 4, name: 'Lia', file: '/avartars/Lia.jpeg', genero: 'femenino' },
  { index: 5, name: 'Monroe', file: '/avartars/Monroe.jpeg', genero: 'femenino' },
  { index: 6, name: 'Sophya', file: '/avartars/Sophya.jpeg', genero: 'femenino' },
];

interface WizardData {
  avatarIndex: number;
  vozGenero: 'masculino' | 'femenino';
  nivelExigencia: 'bajo' | 'medio' | 'alto';
  canales: string[];
  ventanaInicio: string;
  ventanaFin: string;
  estiloComunicacion: 'suave' | 'directo';
  modoRapido: boolean;
}

interface OnboardingWizardProps {
  onComplete: () => void;
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [screen, setScreen] = useState(1);
  const [data, setData] = useState<WizardData>({
    avatarIndex: 0, vozGenero: 'femenino',
    nivelExigencia: 'medio',
    canales: ['notificacion'],
    ventanaInicio: '07:00', ventanaFin: '22:00',
    estiloComunicacion: 'suave',
    modoRapido: true,
  });
  const [loading, setLoading] = useState(false);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);

  const update = useCallback((partial: Partial<WizardData>) => {
    setData(prev => ({ ...prev, ...partial }));
  }, []);

  const goTo = useCallback((s: number) => setScreen(s), []);

  const next = useCallback(() => setScreen(s => Math.min(s + 1, 10)), []);
  const prev = useCallback(() => setScreen(s => Math.max(s - 1, 1)), []);

  const saveConfig = useCallback(async () => {
    await configuracionService.updateMiConfig({
      voz_genero: data.vozGenero,
      estilo_comunicacion: data.estiloComunicacion,
      nivel_exigencia: data.nivelExigencia,
      canales_interaccion: data.canales,
      ventana_inicio: data.ventanaInicio,
      ventana_fin: data.ventanaFin,
      avatar_index: data.avatarIndex,
      onboarding_completado: true,
    } as any);
  }, [data]);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await saveConfig();
      goTo(9);
    } catch { } finally {
      setLoading(false);
    }
  };

  const INTENSITY_OPTS = [
    { value: 'bajo' as const, label: 'Suave', desc: 'Acompañamiento ligero, solo cuando sea realmente necesario' },
    { value: 'medio' as const, label: 'Equilibrada', desc: 'Balance entre recordatorios y espacio para trabajar' },
    { value: 'alto' as const, label: 'Exigente', desc: 'Seguimiento constante para mantener el rumbo' },
  ];
  const CANALES_OPTS = [
    { key: 'notificacion', label: 'Notificaciones en app', icon: Bell },
    { key: 'simulacion_llamada', label: 'Llamadas simuladas', icon: Phone },
    { key: 'whatsapp_simulado', label: 'Mensajes tipo WhatsApp', icon: MessageSquare },
  ];
  const TONO_OPTS = [
    { value: 'suave' as const, label: 'Cercano', desc: 'Empático y comprensivo' },
    { value: 'directo' as const, label: 'Firme', desc: 'Directo y sin rodeos' },
  ];
  const HORARIO_OPTS = [
    { key: 'full', label: 'Todo el día', inicio: '06:00', fin: '23:00' },
    { key: 'laboral', label: 'Horario laboral', inicio: '08:00', fin: '18:00' },
    { key: 'mix', label: 'Mañana y tarde', inicio: '07:00', fin: '22:00' },
  ] as const;

  const toggleCanal = (key: string) => {
    setData(prev => ({
      ...prev,
      canales: prev.canales.includes(key)
        ? prev.canales.filter(c => c !== key)
        : [...prev.canales, key],
    }));
  };

  const setAvatarByIndex = (idx: number) => {
    const avatar = AVATARS.find(a => a.index === idx);
    if (avatar) {
      setData(prev => ({ ...prev, avatarIndex: idx, vozGenero: avatar.genero as 'masculino' | 'femenino' }));
      setPreviewAvatar(avatar.file);
    }
  };

  if (screen <= 1) {
    return <ScreenVideoIntro next={() => goTo(2)} />;
  }
  if (screen === 9) {
    return <ScreenVideoOutro onFinish={handleConfirm} />;
  }
  if (screen === 10) {
    return <ScreenDispositivo onComplete={onComplete} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F4F4F7] relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-[#FFD1D1]/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-[#D1C4E9]/30 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#FFD1E8]/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg">
        <div className="absolute -inset-1 bg-gradient-to-r from-[#FFB5E8] via-[#D1C4E9] to-[#B5DEFF] rounded-md opacity-30 blur-xl" />
        <div className="relative bg-white/40 backdrop-blur-2xl border border-white/60 shadow-lg rounded-md p-8 md:p-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              {[2, 3, 4, 5, 6, 7, 8].map(s => (
                <div key={s} className={`h-1.5 rounded-full transition-all ${screen === s ? 'w-6 bg-purple-400' : screen > s ? 'w-3 bg-purple-300' : 'w-3 bg-gray-200'}`} />
              ))}
            </div>
            <button onClick={() => goTo(9)} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
              <SkipForward className="w-3 h-3" /> Saltar
            </button>
          </div>

          {screen === 2 && <ScreenAvatar data={data} setAvatarByIndex={setAvatarByIndex} previewAvatar={previewAvatar} onNext={next} />}
          {screen === 3 && <ScreenConfigAtajo data={data} update={update} onAccept={() => { update({ modoRapido: true }); goTo(8); }} onCustomize={() => { update({ modoRapido: false }); goTo(4); }} />}
          {screen === 4 && <ScreenIntensidad data={data} update={update} onNext={next} options={INTENSITY_OPTS} />}
          {screen === 5 && <ScreenCanales data={data} toggleCanal={toggleCanal} onNext={next} options={CANALES_OPTS} />}
          {screen === 6 && <ScreenHorarios data={data} update={update} onNext={next} options={HORARIO_OPTS} />}
          {screen === 7 && <ScreenTono data={data} update={update} onNext={next} options={TONO_OPTS} />}
          {screen === 8 && <ScreenResumen data={data} onPrev={prev} onConfirm={handleConfirm} loading={loading} onEdit={() => goTo(3)} />}
        </div>
      </div>
    </div>
  );
}

function ScreenVideoIntro({ next }: { next: () => void }) {
  useEffect(() => {
    const t = setTimeout(next, 15000);
    return () => clearTimeout(t);
  }, [next]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0a2e] via-[#16213e] to-[#0f3460] flex items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-pink-500/5 rounded-full blur-3xl" />
      </div>
      <div className="relative text-center max-w-2xl animate-fade-in">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-300 rounded-2xl flex items-center justify-center shadow-2xl">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
          Tu próximo nivel<br />de productividad<br />empieza aquí
        </h1>
        <p className="text-lg text-purple-200/80 mb-8 leading-relaxed">
          Focusia no es solo una app de tareas. Es tu acompañante estratégico<br />
          para mantener el rumbo hacia lo que realmente importa.
        </p>
        <div className="flex justify-center gap-3">
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
        </div>
        <button onClick={next} className="mt-8 text-sm text-purple-300/60 hover:text-purple-200 transition-colors flex items-center gap-1 mx-auto">
          Saltar introducción <SkipForward className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function ScreenAvatar({ data, setAvatarByIndex, previewAvatar, onNext }: {
  data: WizardData; setAvatarByIndex: (i: number) => void; previewAvatar: string | null; onNext: () => void;
}) {
  const [previewAudio, setPreviewAudio] = useState(false);
  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Elige tu acompañante</h2>
        <p className="text-sm text-gray-500 mt-1">Selecciona el avatar que te acompañará en Focusia</p>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {AVATARS.map(a => {
          const selected = data.avatarIndex === a.index;
          return (
            <button key={a.index} onClick={() => setAvatarByIndex(a.index)}
              className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all hover:scale-105 active:scale-95 ${selected ? 'border-purple-500 ring-2 ring-purple-300' : 'border-gray-100 hover:border-gray-300'}`}>
              <img src={a.file} alt={a.name} className="w-full h-full object-cover" />
              {selected && <div className="absolute inset-0 bg-purple-500/10" />}
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-medium bg-white/80 px-2 py-0.5 rounded-full">{a.name}</span>
            </button>
          );
        })}
      </div>
      {previewAvatar && (
        <div className="flex items-center gap-4 p-4 bg-white/60 rounded-xl mb-4">
          <img src={previewAvatar} alt="preview" className="w-14 h-14 rounded-xl object-cover" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700">¡Hola! Soy tu coach Focusia.</p>
            <p className="text-xs text-gray-400">Voz {data.vozGenero === 'masculino' ? 'masculina' : 'femenina'}</p>
          </div>
          <button onClick={() => setPreviewAudio(!previewAudio)}
            className="p-2 bg-purple-100 text-purple-600 rounded-xl hover:bg-purple-200 transition-colors">
            <Volume2 className="w-5 h-5" />
          </button>
        </div>
      )}
      <button onClick={onNext} disabled={data.avatarIndex === 0}
        className="w-full py-3.5 bg-gradient-to-r from-[#D1C4E9] to-[#FFD1D1] text-[#4A3B8B] font-semibold rounded-xl transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
        Continuar <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function ScreenConfigAtajo({ data, update, onAccept, onCustomize }: {
  data: WizardData; update: (p: Partial<WizardData>) => void; onAccept: () => void; onCustomize: () => void;
}) {
  return (
    <div>
      <div className="text-center mb-6">
        <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-pink-300 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Configuración del acompañamiento</h2>
        <p className="text-sm text-gray-500 mt-1">Focusia se adapta a tu forma de trabajar</p>
      </div>
      <div className="bg-white/60 rounded-2xl p-5 mb-5 border border-purple-100">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-purple-100 rounded-xl">
            <Check className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Configuración Equilibrada Recomendada</h3>
            <ul className="text-xs text-gray-500 mt-2 space-y-1">
              <li>• Intensidad: Equilibrada (ritmo constante sin presión)</li>
              <li>• Canales: Notificaciones en la app</li>
              <li>• Horario: Mañana y tarde (07:00 - 22:00)</li>
              <li>• Tono: Cercano y empático</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <button onClick={onAccept}
          className="w-full py-3.5 bg-gradient-to-r from-[#D1C4E9] to-[#FFD1D1] text-[#4A3B8B] font-semibold rounded-xl transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]">
          Usar configuración recomendada
        </button>
        <button onClick={onCustomize}
          className="w-full py-3 bg-white/70 border border-gray-200 text-gray-600 font-medium rounded-xl transition-all hover:bg-white hover:shadow-md">
          Personalizar ahora
        </button>
      </div>
    </div>
  );
}

function ScreenIntensidad({ data, update, onNext, options }: {
  data: WizardData; update: (p: Partial<WizardData>) => void; onNext: () => void;
  options: { value: 'bajo' | 'medio' | 'alto'; label: string; desc: string }[];
}) {
  return (
    <div>
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-amber-300 to-orange-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
          <Gauge className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Intensidad del acompañamiento</h2>
        <p className="text-xs text-gray-500 mt-1">¿Qué nivel de seguimiento prefieres?</p>
      </div>
      <div className="space-y-2 mb-6">
        {options.map(o => (
          <button key={o.value} onClick={() => { update({ nivelExigencia: o.value }); onNext(); }}
            className={`w-full p-4 rounded-2xl border-2 text-left transition-all hover:scale-[1.01] active:scale-[0.99] ${data.nivelExigencia === o.value ? 'border-purple-400 bg-purple-50' : 'border-gray-100 bg-white/50 hover:border-gray-200'}`}>
            <span className="block font-semibold text-gray-800">{o.label}</span>
            <span className="text-xs text-gray-500">{o.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ScreenCanales({ data, toggleCanal, onNext, options }: {
  data: WizardData; toggleCanal: (k: string) => void; onNext: () => void;
  options: { key: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
}) {
  return (
    <div>
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-cyan-300 to-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
          <Bell className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Canales de activación</h2>
        <p className="text-xs text-gray-500 mt-1">¿Cómo quieres recibir las alertas?</p>
      </div>
      <div className="space-y-2 mb-6">
        {options.map(o => {
          const Icon = o.icon;
          const active = data.canales.includes(o.key);
          return (
            <button key={o.key} onClick={() => toggleCanal(o.key)}
              className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-3 ${active ? 'border-purple-400 bg-purple-50' : 'border-gray-100 bg-white/50 hover:border-gray-200'}`}>
              <div className={`p-2 rounded-xl ${active ? 'bg-purple-200 text-purple-700' : 'bg-gray-100 text-gray-400'}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`font-medium ${active ? 'text-purple-800' : 'text-gray-600'}`}>{o.label}</span>
            </button>
          );
        })}
      </div>
      <button onClick={onNext}
        className="w-full py-3.5 bg-gradient-to-r from-[#D1C4E9] to-[#FFD1D1] text-[#4A3B8B] font-semibold rounded-xl transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2">
        Continuar <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function ScreenHorarios({ data, update, onNext, options }: {
  data: WizardData; update: (p: Partial<WizardData>) => void; onNext: () => void;
  options: readonly { key: string; label: string; inicio: string; fin: string }[];
}) {
  const [selected, setSelected] = useState('mix');
  const [customStart, setCustomStart] = useState(data.ventanaInicio);
  const [customEnd, setCustomEnd] = useState(data.ventanaFin);

  useEffect(() => {
    if (selected === 'custom') {
      update({ ventanaInicio: customStart, ventanaFin: customEnd });
    } else {
      const opt = options.find(o => o.key === selected);
      if (opt) update({ ventanaInicio: opt.inicio, ventanaFin: opt.fin });
    }
  }, [selected, customStart, customEnd, update, options]);

  return (
    <div>
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-emerald-300 to-teal-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
          <Clock className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Horario de acompañamiento</h2>
        <p className="text-xs text-gray-500 mt-1">Protege tu descanso limitando las interrupciones</p>
      </div>
      <div className="space-y-2 mb-6">
        {options.map(o => (
          <button key={o.key} onClick={() => setSelected(o.key)}
            className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${selected === o.key ? 'border-purple-400 bg-purple-50' : 'border-gray-100 bg-white/50 hover:border-gray-200'}`}>
            <span className="block font-semibold text-gray-800">{o.label}</span>
            <span className="text-xs text-gray-400">{o.inicio} - {o.fin}</span>
          </button>
        ))}
        <button onClick={() => setSelected('custom')}
          className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${selected === 'custom' ? 'border-purple-400 bg-purple-50' : 'border-gray-100 bg-white/50 hover:border-gray-200'}`}>
          <span className="block font-semibold text-gray-800">Personalizado</span>
          {selected === 'custom' && (
            <div className="flex gap-2 mt-2">
              <input type="time" value={customStart} onChange={e => setCustomStart(e.target.value)} className="flex-1 p-2 bg-white border rounded-lg text-xs" />
              <input type="time" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="flex-1 p-2 bg-white border rounded-lg text-xs" />
            </div>
          )}
        </button>
      </div>
      <button onClick={onNext}
        className="w-full py-3.5 bg-gradient-to-r from-[#D1C4E9] to-[#FFD1D1] text-[#4A3B8B] font-semibold rounded-xl transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2">
        Continuar <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function ScreenTono({ data, update, onNext, options }: {
  data: WizardData; update: (p: Partial<WizardData>) => void; onNext: () => void;
  options: { value: 'suave' | 'directo'; label: string; desc: string }[];
}) {
  return (
    <div>
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-pink-300 to-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
          <Volume2 className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Tono de comunicación</h2>
        <p className="text-xs text-gray-500 mt-1">¿Cómo prefieres que te hable Focusia?</p>
      </div>
      <div className="space-y-2 mb-6">
        {options.map(o => (
          <button key={o.value} onClick={() => { update({ estiloComunicacion: o.value }); onNext(); }}
            className={`w-full p-4 rounded-2xl border-2 text-left transition-all hover:scale-[1.01] active:scale-[0.99] ${data.estiloComunicacion === o.value ? 'border-purple-400 bg-purple-50' : 'border-gray-100 bg-white/50 hover:border-gray-200'}`}>
            <span className="block font-semibold text-gray-800">{o.label}</span>
            <span className="text-xs text-gray-500">{o.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ScreenResumen({ data, onPrev, onConfirm, loading, onEdit }: {
  data: WizardData; onPrev: () => void; onConfirm: () => void; loading: boolean; onEdit: () => void;
}) {
  const avatar = AVATARS.find(a => a.index === data.avatarIndex);
  const intLabel = { bajo: 'Suave', medio: 'Equilibrada', alto: 'Exigente' }[data.nivelExigencia];
  const tonoLabel = { suave: 'Cercano', directo: 'Firme' }[data.estiloComunicacion];
  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Resumen de preferencias</h2>
        <p className="text-xs text-gray-500 mt-1">Revisa tu configuración antes de empezar</p>
      </div>
      <div className="flex flex-col items-center gap-3 mb-5">
        {avatar && <img src={avatar.file} alt="avatar" className="w-16 h-16 rounded-2xl object-cover border-2 border-purple-200" />}
        <p className="font-semibold text-gray-800">Tu acompañante</p>
      </div>
      <div className="space-y-2 mb-5">
        {[
          { label: 'Avatar', value: avatar?.name || 'Ninguno' },
          { label: 'Voz', value: data.vozGenero === 'masculino' ? 'Masculina' : 'Femenina' },
          { label: 'Intensidad', value: intLabel },
          { label: 'Canales', value: data.canales.length > 0 ? data.canales.map(c => ({ notificacion: 'App', simulacion_llamada: 'Llamada', whatsapp_simulado: 'WhatsApp' })[c] || c).join(', ') : 'Ninguno' },
          { label: 'Horario', value: `${data.ventanaInicio} - ${data.ventanaFin}` },
          { label: 'Tono', value: tonoLabel },
        ].map(item => (
          <div key={item.label} className="flex justify-between items-center bg-white/50 rounded-xl px-4 py-2.5 border border-gray-100">
            <span className="text-xs font-medium text-gray-500">{item.label}</span>
            <span className="text-sm font-semibold text-gray-800">{item.value}</span>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <button onClick={onConfirm} disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-[#D1C4E9] to-[#FFD1D1] text-[#4A3B8B] font-semibold rounded-xl transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2">
          {loading ? <div className="w-5 h-5 border-2 border-[#4A3B8B]/30 border-t-[#4A3B8B] rounded-full animate-spin" /> : <>Confirmar y empezar <Check className="w-4 h-4" /></>}
        </button>
        <button onClick={onEdit} className="w-full py-2.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">
          Editar preferencias
        </button>
      </div>
    </div>
  );
}

function ScreenVideoOutro({ onFinish }: { onFinish: () => void }) {
  const [showContent, setShowContent] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setShowContent(true), 1500);
    const t2 = setTimeout(onFinish, 14000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onFinish]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f3460] via-[#16213e] to-[#1a0a2e] flex items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-20 right-20 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>
      <div className={`relative text-center max-w-lg transition-all duration-1000 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-300 rounded-md flex items-center justify-center shadow-2xl">
            <Heart className="w-10 h-10 text-white" />
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Estás listo</h1>
        <p className="text-base text-purple-200/80 leading-relaxed">
          Focusia ya está configurado para acompañarte. Recuerda: no se trata de hacer más, se trata de hacer lo que importa.
        </p>
        <div className="mt-8 flex justify-center gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
        <button onClick={onFinish} className="mt-6 text-sm text-purple-300/60 hover:text-purple-200 transition-colors flex items-center gap-1 mx-auto">
          Ir al inicio <SkipForward className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function ScreenDispositivo({ onComplete }: { onComplete: () => void }) {
  const [showBanner, setShowBanner] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [landscape, setLandscape] = useState(false);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setLandscape(window.innerWidth > window.innerHeight);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!showBanner) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F4F4F7] relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-64 h-64 bg-[#D1C4E9]/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-[#FFD1D1]/30 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">
        <div className="absolute -inset-1 bg-gradient-to-r from-[#FFB5E8] via-[#D1C4E9] to-[#B5DEFF] rounded-md opacity-30 blur-xl" />
        <div className="relative bg-white/40 backdrop-blur-2xl border border-white/60 shadow-lg rounded-md p-8 text-center">
          {isMobile && !landscape ? (
            <>
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">Gira tu dispositivo</h2>
              <p className="text-sm text-gray-500 mb-6">
                El Dashboard de Focusia está diseñado para verse en orientación horizontal. Por favor, gira tu dispositivo.
              </p>
              <div className="animate-pulse mb-6">
                <div className="w-20 h-20 mx-auto bg-purple-100 rounded-2xl flex items-center justify-center">
                  <svg className="w-10 h-10 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Monitor className="w-8 h-8 text-purple-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">Recomendación</h2>
              <p className="text-sm text-gray-500 mb-6">
                El Dashboard de Focusia se disfruta mejor en computador por su amplitud visual. {isMobile ? 'Ya estás en horizontal, ¡perfecto!' : 'Si puedes, continúa desde un computador.'}
              </p>
            </>
          )}
          <div className="space-y-2">
            <button onClick={() => { setShowBanner(false); onComplete(); }}
              className="w-full py-3.5 bg-gradient-to-r from-[#D1C4E9] to-[#FFD1D1] text-[#4A3B8B] font-semibold rounded-xl transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2">
              Ir al Dashboard <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => { setShowBanner(false); onComplete(); }}
              className="w-full py-2.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">
              Lo haré más tarde
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Phone(props: { className?: string }) {
  return <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>;
}
