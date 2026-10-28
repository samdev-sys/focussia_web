import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, SkipForward, Check, ArrowRight, RotateCcw, Smartphone, Monitor, ShieldCheck } from 'lucide-react';
import { onboardingV2Service } from '../services/api';
import type { AvatarDataV2, OnboardingProfileData } from '../services/api';
import { useDeviceType } from '../hooks/useDeviceType';
import { AVATARS } from '../constants/avatars';
import HelpChat from './HelpChat';

interface Props {
  onComplete: () => void;
  isAuthenticated: boolean;
  userName?: string;
  onLogin: () => void;
  onRegister: () => void;
}

const STATUS_TO_SCREEN: Record<string, number> = {
  cuenta_creada: 1,
  avatar_seleccionado: 3,
  configuracion_recomendada_aceptada: 9,
  personalizacion_iniciada: 5,
  personalizacion_completada: 9,
  configuracion_confirmada: 10,
  onboarding_finalizado: 11,
  visita_guiada_pendiente: 11,
  visita_guiada_iniciada: 11,
};

// Contenido del chat de ayuda con IA (Groq) por pantalla del onboarding
interface HelpContent {
  paso: string;
  titulo: string;
  bienvenida: string;
  contexto: string;
}

const HELP_CONTENT: Record<string, HelpContent> = {
  personalizacion: {
    paso: 'Paso 6 de 11',
    titulo: 'Personalización del acompañamiento',
    bienvenida: 'Estás configurando cómo te acompañará Focusia. Tienes 4 bloques: 1) Intensidad del acompañamiento, 2) Tipo de activaciones, 3) Horarios permitidos y 4) Tono del avatar. Pregúntame qué significa cada opción y te la explico.',
    contexto: "Pantalla 'Personalización del acompañamiento' (Paso 6 de 11) del onboarding de Focusia. Bloques: 1) Intensidad del acompañamiento: Suave (interviene solo en momentos importantes o desviaciones significativas, baja frecuencia), Equilibrada recomendada (recordatorios estratégicos sin saturar, frecuencia media), Exigente (alta frecuencia y mensajes directos). 2) Tipo de activaciones: Notificaciones en la app, Push, WhatsApp y Llamadas; cada canal se puede activar o desactivar. 3) Horarios permitidos: Todo el día, Solo horario laboral, Mañana y tarde (recomendado), Personalizado con hora de inicio y fin. 4) Tono del avatar: Cercano y motivador, Claro y estratégico, Firme y exigente, Adaptativo (recomendado, se ajusta solo).",
  },
  activaciones: {
    paso: 'Paso 7 de 11',
    titulo: 'Tipo de activaciones',
    bienvenida: 'Aquí eliges los canales por los que Focusia puede contactarte: notificaciones en la app, push, WhatsApp o llamadas. Pregúntame por cada canal y te explico cómo funciona.',
    contexto: "Pantalla 'Tipo de activaciones' (Paso 7 de 11) del onboarding de Focusia. Canales disponibles: Notificaciones en la app (avisos dentro de Focusia), Push (notificaciones del sistema en el dispositivo), WhatsApp (mensajes en momentos clave) y Llamadas (activaciones por voz). Cada canal tiene un interruptor para activarlo o desactivarlo. Los canales elegidos determinan cómo y cuándo Focusia ayuda a mantener el enfoque.",
  },
  horarios: {
    paso: 'Paso 8 de 11',
    titulo: 'Horarios permitidos',
    bienvenida: 'Define cuándo puede interrumpirte Focusia: todo el día, solo horario laboral, mañana y tarde (recomendado) o un horario personalizado. Pregúntame y te ayudo a elegir.',
    contexto: "Pantalla 'Horarios permitidos' (Paso 8 de 11) del onboarding de Focusia. Opciones: Todo el día (Focusia puede intervenir durante toda la jornada activa); Solo horario laboral (únicamente dentro del horario de trabajo); Mañana y tarde, recomendado (bloques principales del día, evita noche, descanso y madrugada); Personalizado (el usuario define manualmente la hora de inicio y fin). Fuera de los horarios permitidos Focusia no interrumpirá.",
  },
  tono: {
    paso: 'Paso 9 de 11',
    titulo: 'Tono del avatar',
    bienvenida: 'Elige cómo te hablará tu avatar: cercano y motivador, claro y estratégico, firme y exigente, o adaptativo (recomendado). Pregúntame las diferencias y te las explico.',
    contexto: "Pantalla 'Tono del avatar' (Paso 9 de 11) del onboarding de Focusia. Tonos: Cercano y motivador (mensajes positivos y alentadores que impulsan con energía); Claro y estratégico (mensajes directos, organizados y orientados a decisiones); Firme y exigente (mayor compromiso y presión estratégica para mantener el foco); Adaptativo, recomendado (el sistema ajusta automáticamente el tono según el comportamiento). El tono influye en mensajes, sugerencias y recordatorios, y se puede cambiar más adelante.",
  },
};

export default function OnboardingWizardV2({ onComplete, isAuthenticated, userName: propUserName, onLogin, onRegister }: Props) {
  const [screen, setScreen] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState(propUserName || '');
  const [avatar, setAvatar] = useState<AvatarDataV2 | null>(null);
  const [avatars, setAvatars] = useState<AvatarDataV2[]>([]);
  const [profile, setProfile] = useState<OnboardingProfileData | null>(null);
  const [configIntensity, setConfigIntensity] = useState('equilibrada');
  const [configApp, setConfigApp] = useState(true);
  const [configPush, setConfigPush] = useState(true);
  const [configWhatsapp, setConfigWhatsapp] = useState(true);
  const [configCalls, setConfigCalls] = useState(false);
  const [configSchedule, setConfigSchedule] = useState('manana_tarde');
  const [configScheduleStart, setConfigScheduleStart] = useState('07:00');
  const [configScheduleEnd, setConfigScheduleEnd] = useState('15:00');
  const [configTone, setConfigTone] = useState('adaptativo');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [editingConfig, setEditingConfig] = useState(false);
  const [personalizationIntro, setPersonalizationIntro] = useState(false);
  const { deviceType, isPortrait } = useDeviceType();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingAvatarId, setPlayingAvatarId] = useState<number | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [helpChatKey, setHelpChatKey] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setScreen(1);
      setLoading(false);
      return;
    }
    let mounted = true;
    const timeout = setTimeout(() => {
      if (mounted) {
        setScreen(1);
        setLoading(false);
      }
    }, 5000);
    onboardingV2Service.getStatus()
      .then(statusData => {
        if (!mounted) return;
        const target = STATUS_TO_SCREEN[statusData.status] || 1;
        setScreen(target);
      })
      .catch((err: any) => {
        // 401 is expected for unauthenticated/expired sessions - handle silently without console spam
        if (!mounted) return;
        if (err?.response?.status !== 401) {
          // non-401 errors could be logged if needed
        }
        setScreen(1);
      })
      .finally(() => {
        clearTimeout(timeout);
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; clearTimeout(timeout); };
  }, [isAuthenticated]);

  useEffect(() => {
    if ((screen === 3 || screen === 4) && avatars.length === 0) {
      onboardingV2Service.getAvatars()
        .then(data => {
          setAvatars(data);
          if (!avatar && data.length > 0) setAvatar(data[0]);
        })
        .catch(() => setError('Error al cargar avatares'));
    }
  }, [screen]);

  useEffect(() => {
    return () => {
      // Guarded cleanup: ensure deferred DOM node exists before operating
      try {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.onended = null;
          audioRef.current.onloadedmetadata = null;
          audioRef.current.ontimeupdate = null;
          audioRef.current = null;
        }
        if (videoRef.current) {
          videoRef.current.pause();
        }
      } catch {}
      setAudioCurrentTime(0);
      setAudioDuration(0);
    };
  }, []);

  const goTo = useCallback((s: number) => setScreen(s), []);

  // Navegación por step points (Pasos 1-11) — usada por todos los steppers
  const goToPaso = useCallback((p: number) => {
    setError(null);
    if (p === 2) { goTo(3); return; }
    if (p <= 4) { goTo(p); return; }
    if (p === 5) { setPersonalizationIntro(true); goTo(5); return; }
    if (p === 6) { setPersonalizationIntro(false); goTo(5); return; }
    if (p === 7) { goTo(6); return; }
    if (p === 8) { goTo(7); return; }
    if (p === 9) { goTo(8); return; }
    if (p === 10) { goTo(10); return; }
    if (p === 11) { goTo(11); return; }
  }, [goTo]);

  const playAvatarVoice = useCallback((avatarId: number, avatarName: string) => {
    try {
      if (audioRef.current) {
        try { audioRef.current.pause(); } catch {}
        audioRef.current = null;
        if (playingAvatarId === avatarId) {
          setPlayingAvatarId(null);
          setIsPlaying(false);
          setAudioCurrentTime(0);
          return;
        }
      }
      const avatarConst = AVATARS.find(a => a.name.toLowerCase() === avatarName.toLowerCase());
      if (!avatarConst?.voz) return;
      // Guarded DOM node creation
      if (typeof window === 'undefined' || typeof Audio === 'undefined') return;
      const audio = new Audio(avatarConst.voz);
      if (!audio) return;
      audioRef.current = audio;
      audio.volume = 0.85;
      setAudioCurrentTime(0);
      setAudioDuration(0);
      setPlayingAvatarId(avatarId);
      setIsPlaying(true);
      audio.onloadedmetadata = () => {
        if (audioRef.current) setAudioDuration(audio.duration || 0);
      };
      audio.ontimeupdate = () => {
        if (audioRef.current) setAudioCurrentTime(audio.currentTime || 0);
      };
      audio.play().catch(() => {
        setPlayingAvatarId(null);
        setIsPlaying(false);
      });
      audio.onended = () => {
        setPlayingAvatarId(null);
        setIsPlaying(false);
        setAudioCurrentTime(0);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setPlayingAvatarId(null);
        setIsPlaying(false);
      };
    } catch {}
  }, [playingAvatarId]);

  const getProfile = useCallback(async () => {
    try {
      const p = await onboardingV2Service.getSummary();
      setProfile(p);
      setUserName(p.user_first_name || p.user_full_name || propUserName || '');
      setConfigIntensity(p.intensity);
      setConfigApp(p.activations_app);
      setConfigPush(p.activations_push);
      setConfigWhatsapp(p.activations_whatsapp);
      setConfigCalls(p.activations_calls);
      setConfigSchedule(p.schedule_type);
      setConfigTone(p.tone);
      return p;
    } catch { return null; }
  }, [propUserName]);

  const handleSelectAvatar = useCallback(async (a: AvatarDataV2) => {
    setSaving(true);
    try {
      const p = await onboardingV2Service.selectAvatar(a.id);
      setAvatar(a);
      setProfile(p);
      setUserName(p.user_first_name || p.user_full_name || propUserName || '');
      goTo(3);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Error al seleccionar avatar');
    } finally { setSaving(false); }
  }, [goTo, propUserName]);

  const handleAcceptRecommended = useCallback(async () => {
    setSaving(true);
    try {
      const p = await onboardingV2Service.acceptRecommended();
      setProfile(p);
      setConfigIntensity(p.intensity);
      setConfigApp(p.activations_app);
      setConfigPush(p.activations_push);
      setConfigWhatsapp(p.activations_whatsapp);
      setConfigCalls(p.activations_calls);
      setConfigSchedule(p.schedule_type);
      setConfigTone(p.tone);
      goTo(9);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Error al aplicar configuración');
    } finally { setSaving(false); }
  }, [goTo]);

  const handleCustomizeNow = useCallback(() => {
    setEditingConfig(false);
    setPersonalizationIntro(true);
    goTo(5);
  }, [goTo]);

  const handleSaveIntensity = useCallback(async () => {
    setSaving(true);
    try {
      await onboardingV2Service.customizeIntensity(configIntensity);
      goTo(6);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Error al guardar');
    } finally { setSaving(false); }
  }, [configIntensity, goTo]);

  const handleSaveActivations = useCallback(async () => {
    setSaving(true);
    try {
      await onboardingV2Service.customizeActivations({
        activations_app: configApp,
        activations_push: configPush,
        activations_whatsapp: configWhatsapp,
        activations_calls: configCalls,
      });
      goTo(7);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Error al guardar');
    } finally { setSaving(false); }
  }, [configApp, configPush, configWhatsapp, configCalls, goTo]);

  const handleSaveSchedule = useCallback(async () => {
    setSaving(true);
    try {
      const data: any = { schedule_type: configSchedule };
      if (configSchedule === 'personalizado') {
        data.custom_schedule_start = configScheduleStart || null;
        data.custom_schedule_end = configScheduleEnd || null;
      }
      await onboardingV2Service.customizeSchedule(data);
      goTo(8);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Error al guardar');
    } finally { setSaving(false); }
  }, [configSchedule, configScheduleStart, configScheduleEnd, goTo]);

  const handleSaveTone = useCallback(async () => {
    setSaving(true);
    try {
      await onboardingV2Service.customizeTone(configTone);
      if (!editingConfig) {
        await getProfile();
        goTo(9);
      } else {
        await getProfile();
        goTo(9);
      }
    } catch (e: any) {
      setError(e.response?.data?.error || 'Error al guardar');
    } finally { setSaving(false); }
  }, [configTone, editingConfig, getProfile, goTo]);

  const handleConfirm = useCallback(async () => {
    setSaving(true);
    try {
      await onboardingV2Service.confirm();
      goTo(10);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Error al confirmar');
    } finally { setSaving(false); }
  }, [goTo]);

  const handleEditConfig = useCallback(() => {
    setEditingConfig(true);
    goTo(5);
  }, [goTo]);

  const handleComplete = useCallback(async () => {
    setSaving(true);
    try {
      await onboardingV2Service.complete();
      goTo(11);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Error al completar');
    } finally { setSaving(false); }
  }, [goTo]);

  const handleDeferTour = useCallback(async () => {
    setSaving(true);
    try {
      await onboardingV2Service.deferGuidedTour();
      onComplete();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Error');
    } finally { setSaving(false); }
  }, [onComplete]);

  const handleStartTour = useCallback(async () => {
    setSaving(true);
    try {
      await onboardingV2Service.startGuidedTour();
      onComplete();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Error');
    } finally { setSaving(false); }
  }, [onComplete]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white font-montserrat">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Screen 1: Intro Video — pixel-faithful to photo (white + curvas, player, Paso 1 de 11)
  if (screen === 1) {
    return (
      <div className="min-h-screen bg-white relative flex flex-col items-center px-4 pt-4 pb-6 overflow-hidden font-montserrat">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <img src="/onda1.png" alt="" draggable={false} className="absolute left-0 top-0 h-full w-auto object-cover" />
          <img src="/onda2.png" alt="" draggable={false} className="absolute right-0 top-0 h-full w-auto mt-4 object-cover  " />
        </div>

        <div className="relative z-10 w-full max-w-[760px] mx-auto flex flex-col items-center flex-1">
          <div className="flex items-center gap-2 mb-5">
            <img src="/focusia-logo2.png" alt="Focusia Logo" className="w-7 h-7 object-contain" />
            <span className="font-bold text-slate-800 text-xl tracking-tight">Focusia</span>
          </div>

          <h1 className="text-[34px] md:text-[48px] font-extrabold tracking-tight text-slate-900 text-center leading-tight">
            Bienvenido a{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#2563eb] to-[#7c3aed]">
              Focusia.
            </span>
          </h1>
          <p className="text-[#1e1b4b] text-center mt-2 mb-6 text-[14px] md:text-[15px] font-medium">
            Mira este video de 15 segundos para conocer tu nueva experiencia.
          </p>

          {/* Video player — fondo dark navy idéntico a foto, video oculto hasta play */}
          <div className="w-full rounded-xl overflow-hidden shadow-[0_16px_48px_rgba(5,5,24,0.35)] border border-[#1e1b4b] bg-[#050518]">
            <div className="relative aspect-video bg-[#070722] flex items-center justify-center overflow-hidden">
              {/* ondas decorativas como la foto */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -right-10 top-0 w-[70%] h-[140%] rounded-[50%] border border-[#7c3aed]/30" style={{ transform: 'rotate(-18deg)' }} />
                <div className="absolute -right-6 top-10 w-[55%] h-[120%] rounded-[50%] border border-[#2563eb]/25" style={{ transform: 'rotate(-18deg)' }} />
                <div className="absolute -left-16 bottom-0 w-[60%] h-[90%] rounded-[50%] border border-[#7c3aed]/20" style={{ transform: 'rotate(12deg)' }} />
                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 70% 40%, rgba(124,58,237,0.22) 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(37,99,235,0.15) 0%, transparent 55%)' }} />
              </div>
              <video ref={videoRef} src="/flow_focussia.mp4" className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} playsInline preload="none" onClick={(e) => { const v = e.currentTarget; if (v.paused) v.play().catch(()=>{}); else v.pause(); }} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onError={(e) => { (e.target as HTMLVideoElement).style.display = 'none'; }} />
              <div className={`absolute inset-0 flex flex-col items-center justify-center ${isPlaying ? 'pointer-events-none opacity-0' : 'opacity-100'} transition-opacity duration-300`}>
                <div className="flex items-center gap-3">
                  <img src="/focussia.png" alt="" className="w-11 h-11 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <span className="text-white text-[36px] font-bold tracking-tight">Focusia</span>
                </div>
                <p className="text-white/80 text-[14px] mt-2">Planifica con propósito. Vive con enfoque.</p>
              </div>
              {!isPlaying && (
                <button onClick={() => { videoRef.current?.play().catch(()=>{}); }} className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-white/10 border border-white/20 backdrop-blur flex items-center justify-center hover:bg-white/20 transition-colors z-10">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><polygon points="6,4 20,12 6,20" /></svg>
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 px-4 py-2.5 bg-[#0a0a24] border-t border-white/10">
              <button onClick={() => { if (videoRef.current) { if (videoRef.current.paused) videoRef.current.play().catch(()=>{}); else videoRef.current.pause(); } }} className="text-white hover:text-white/70">
                {isPlaying ? <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polygon points="6,4 20,12 6,20" /></svg>}
              </button>
              <span className="text-white/70 text-xs font-medium whitespace-nowrap">0:00 / 0:15</span>
              <div className="flex-1 h-[3px] bg-white/15 rounded-full relative overflow-hidden">
                <div className="absolute left-0 top-0 h-full w-[8%] bg-gradient-to-r from-[#7c3aed] to-[#a78bfa] rounded-full" />
                <div className="absolute left-[8%] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#a78bfa] shadow" />
              </div>
              <button className="text-white/70 hover:text-white"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" stroke="none" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /></svg></button>
              <button className="text-white/70 hover:text-white"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg></button>
              <button className="text-white/70 hover:text-white"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" /></svg></button>
            </div>
          </div>

          <button
            onClick={() => goTo(3)}
            className="w-full mt-5 py-3.5 rounded-xl text-white font-semibold text-[16px] flex items-center justify-center gap-3 transition-all shadow-[0_8px_20px_rgba(29,47,220,0.3)] hover:shadow-[0_10px_24px_rgba(124,58,237,0.4)] bg-gradient-to-r from-[#1d2fdc] to-[#7c3aed] cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12,5 19,12 12,19" /></svg>
            Continuar
          </button>

          <div className="w-full mt-6">
            <div className="flex items-center w-full">
              {Array.from({ length: 11 }, (_, i) => {
                const n = i + 1;
                const isCompleted = n < 1;
                const isCurrent = n === 1;
                return (
                  <div key={n} className="flex-1 flex items-center">
                    <button type="button" onClick={() => goToPaso(n)} title={`Ir al paso ${n} de 11`} aria-label={`Ir al paso ${n} de 11`} className={`w-4 h-4 lg:w-5 lg:h-5 rounded-full shrink-0 border-2 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform ${isCompleted ? 'bg-[#1d2fdc] border-[#1d2fdc]' : isCurrent ? 'bg-[#7c3aed] border-[#7c3aed]' : 'bg-[#d1d5db] border-[#d1d5db] hover:border-[#7c3aed]'}`}>
                      {isCompleted ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg> : isCurrent ? <div className="w-1.5 h-1.5 bg-white rounded-full" /> : null}
                    </button>
                    {n < 11 && <div className={`flex-1 h-[2px] mx-0.5 ${n < 1 ? 'bg-[#1d2fdc]' : 'bg-[#e5e7eb]'}`} />}
                  </div>
                );
              })}
            </div>
            <p className="text-center text-slate-800 text-[14px] font-bold mt-3">Paso 1 de 11</p>
          </div>

          <div className="mt-3 flex items-center justify-center gap-2">
            <img src="./safeguard.png" alt="Safe" />
            <span className="text-slate-700 text-[12.5px]">Tu información está protegida y sincronizada en todos tus dispositivos.</span>
          </div>
        </div>
      </div>
    );
  }

  // Screen 2 (registro) eliminada del onboarding: el registro vive en Auth.
  // Si algún estado antiguo apunta aquí, se muestra el paso 3.
  if (screen === 2) {
    setScreen(3);
    return null;
  }

  // If no avatars loaded yet, show avatar selection loading
  if (screen === 3 && avatars.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white font-montserrat">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Screen 3: Avatar Selection
  if (screen === 3) {
    const avatarImages: Record<string, string> = {
      Ashley: '/avatars/Ashley.jpeg',
      Conrad: '/avatars/conrad.jpeg',
      John: '/avatars/John.jpeg',
      Lia: '/avatars/Lia.jpeg',
      Monroe: '/avatars/Monroe.jpeg',
      Sophya: '/avatars/Sophya.jpeg',
    };
    const otherAvatarImages: Record<string, string> = {
      Ashley: '/avatars/Ashley.jpeg',
      Conrad: '/avatars/conrad.jpeg',
      John: '/avatars/John.jpeg',
      Lia: '/avatars/Lia.jpeg',
      Monroe: '/avatars/Monroe.jpeg',
      Sophya: '/avatars/Sophya.jpeg',
    };
    const getAvatarImage = (name: string) => avatarImages[name] || '/avatar_lavanda/lia (2).jpeg';
    const getOtherAvatarImage = (name: string) => otherAvatarImages[name] || '/avatar_lavanda/lia (2).jpeg';
    const greetingVideos: Record<string, string> = {
      Ashley: '/avatar_greetings/Ashley.mp4',
      Conrad: '/avatar_greetings/Conrad.mp4',
      John: '/avatar_greetings/John.mp4',
      Lia: '/avatar_greetings/lia.mp4',
      Monroe: '/avatar_greetings/Monroe.mp4',
      Sophya: '/avatar_greetings/sophya.mp4',
    };
    const getGreetingVideo = (name: string) => greetingVideos[name] || '';
    const mainAvatar = avatar || (avatars.length > 0 ? avatars[0] : null);
    const otherAvatars = avatars.filter(a => a.id !== mainAvatar?.id);

    const handleConfirmAvatarAndContinue = async () => {
      if (!mainAvatar || saving) return;
      setSaving(true);
      try {
        const p = await onboardingV2Service.selectAvatar(mainAvatar.id);
        setAvatar(mainAvatar);
        setProfile(p);
        setUserName(p.user_first_name || p.user_full_name || propUserName || '');
        setError(null);
        goTo(4);
      } catch (e: any) {
        setError(e.response?.data?.error || 'Error al seleccionar avatar');
      } finally {
        setSaving(false);
      }
    };

    const AudioWaveform = () => {
      const bars = [4,8,12,6,10,14,8,16,10,18,12,20,14,16,8,12,6,14,10,8,12,6,4,8,12,10,6,4,6,8,4,2,4,6,4,2];
      const progress = audioDuration > 0 ? audioCurrentTime / audioDuration : 0;
      const progressIndex = Math.floor(progress * bars.length);
      return (
        <div className="flex items-center gap-[2px] w-30 h-8">
          {bars.map((h, i) => (
            <div key={i} className="w-[3px] rounded-full transition-all duration-100" style={{
              height: `${h * 1.2}px`,
              backgroundColor: i <= progressIndex ? '#7C3AED' : '#D8B4FE',
              opacity: i <= progressIndex ? 1 : 0.4
            }} />
          ))}
        </div>
      );
    };

    return (
      <div className="min-h-screen bg-white relative flex flex-col items-center px-4 py-8 overflow-hidden font-montserrat">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {/* Imagen curva izquierda */}
          <img src="/onda1.png" alt="" className="absolute left-0 top-0 h-full w-auto object-cover opacity-90" />
          {/* Imagen curva derecha */}
          <img src="/onda2.png" alt="" className="absolute right-0 top-0 h-[500px] w-[200px] object-cover opacity-90 mt-40" />
        </div>

        <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8">
             <img src="/focusia-logo2.png" alt="Focusia Logo" className="w-full h-full" />
            </div>
            <span className="font-bold text-slate-800 text-xl">Focusia</span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-montserrat font-[800] text-slate-900 text-center mb-2">
            Elige quién te{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">acompañará.</span>
          </h1>
          <p className="text-slate-500 text-center mb-8 text-base font-montserrat font-[500]">
            Podrás cambiarlo más adelante si lo deseas.
          </p>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4 w-full">{error}</div>}

          <div className="w-full grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8 mb-6">
            <div className="lg:col-span-3">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #312E81 40%, #1E1B4B 100%)' }}>
                <div className="absolute inset-0 opacity-30">
                  <svg className="w-[200px] h-[120px]" viewBox="0 0 600 400" preserveAspectRatio="none">
                    <circle cx="500" cy="100" r="200" fill="none" stroke="#7C3AED" strokeWidth="1" />
                    <circle cx="520" cy="120" r="150" fill="none" stroke="#3B82F6" strokeWidth="1" />
                    <circle cx="480" cy="80" r="250" fill="none" stroke="#A855F7" strokeWidth="0.5" />
                  </svg>
                </div>

                <div className="relative flex flex-col md:flex-row">
                  <div className="w-full md:w-1/2 relative">
                    {(() => {
                      const greetingVideo = getGreetingVideo(mainAvatar?.name || '');
                      return greetingVideo ? (
                        <video
                          src={greetingVideo}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="w-full h-64 md:h-full object-cover object-top"
                          onError={(e) => { (e.target as HTMLVideoElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-full h-64 md:h-full bg-gradient-to-br from-blue-900 to-purple-900" />
                      );
                    })()}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, transparent 60%, #1E1B4B)' }} />
                  </div>

                  <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="px-3 py-1 rounded-lg bg-blue-600 text-white text-sm font-bold">
                        {(mainAvatar?.name || 'AVATAR').substring(0, 3).toUpperCase()}
                      </span>
                      <h2 className="text-2xl md:text-3xl font-bold text-white">{mainAvatar?.name || 'Avatar'}</h2>
                    </div>
                    <p className="text-purple-300 text-sm mb-6">Acompañante en enfoque y propósito</p>

                    <div className="flex items-center gap-3 bg-white rounded-md px-4 py-3 mb-5 -ml-4 w-[280px] h-10">
                      <button
                        onClick={() => mainAvatar && playAvatarVoice(mainAvatar.id, mainAvatar.name)}
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-transform hover:scale-105"
                        style={{ background: playingAvatarId === mainAvatar?.id ? '#7C3AED' : '#5E22EB' }}>
                        {playingAvatarId === mainAvatar?.id ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21" /></svg>
                        )}
                      </button>
                      <AudioWaveform />
                      <span className="text-slate-500 text-sm font-medium whitespace-nowrap">
                        {Math.floor(audioCurrentTime / 60)}:{String(Math.floor(audioCurrentTime % 60)).padStart(2, '0')} / {Math.floor(audioDuration / 60)}:{String(Math.floor(audioDuration % 60)).padStart(2, '0')}
                      </span>
                    </div>

                    <div className="bg-white rounded-md rounded-tl-none p-4 mb-4 shadow-lg relative">
                      <div className="absolute -left-2 top-0 w-4 h-4 bg-white" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }} />
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0">
                          <img src="/apostrofe.png" alt="" className="w-8 h-7" />
                        </div>
                        <div>
                          <p className="text-slate-800 font-bold text-base">Hola, {userName || 'Usuario'}.</p>
                          <p className="text-slate-600 text-sm leading-relaxed mt-1">Desde ahora voy a acompañarte a construir la versión de ti que estás buscando.</p>
                        </div>
                      </div>
                    </div>

                    <button onClick={() => mainAvatar && playAvatarVoice(mainAvatar.id, mainAvatar.name)} className="flex items-center gap-2 text-white/90 text-sm font-medium hover:text-white transition-colors border border-white/40 rounded-xl px-5 py-2.5 bg-white/10 backdrop-blur-sm hover:bg-white/20">
                      <div className="flex items-center gap-2">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" stroke="none" />
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      </svg>
                      Escuchar nuevamente
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <button
                onClick={() => { if (mainAvatar) handleSelectAvatar(mainAvatar); }}
                disabled={saving}
                className="flex-1 py-4 rounded-xl text-white font-semibold text-lg flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #200013, #814B8D, #143CCC)' }}
              >
                <div className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                </div>
                {saving ? 'Guardando...' : 'Elegir este avatar'}
              </button>
              <button
                onClick={handleConfirmAvatarAndContinue}
                disabled={saving || !mainAvatar}
                className="flex-1 py-4 rounded-xl text-white font-semibold text-lg flex items-center justify-center gap-3 transition-all duration-300 hover:shadow-xl cursor-pointer disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #35166B, #7C10D4)', boxShadow: '0 8px 20px rgba(69, 14, 165, 0.3)' }}>
                {saving ? 'Guardando...' : (<>
                  Continuar
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg>
                </>)}
              </button>
              </div>
            </div>

            <div className="lg:col-span-2">
              <h3 className="text-center text-slate-800 font-semibold text-lg mb-4">Escucha a los otros avatares</h3>
              <div className="grid grid-cols-3 gap-3 md:gap-4">
                {otherAvatars.map((a) => (
                  <div key={a.id} className="flex flex-col bg-white rounded-md overflow-hidden shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer border border-slate-100">
                    <button
                      onClick={() => handleSelectAvatar(a)}
                      className="flex flex-col flex-1"
                    >
                      <div className="w-full aspect-square overflow-hidden">
                        <img src={getOtherAvatarImage(a.name) || '/avatar_lavanda/lia (2).jpeg'} alt={a.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLVideoElement).style.display = 'none'; }} />
                      </div>
                      <div className="px-3 py-0.5">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">{a.name}</span>
                      </div>
                    </button>
                    <div className="flex items-center justify-end px-3 py-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); playAvatarVoice(a.id, a.name); }}
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 border-purple-300 bg-white/80 hover:bg-purple-100 transition-colors"
                      >
                        {playingAvatarId === a.id ? (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="#4C1D95"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                        ) : (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="#4C1D95"><polygon points="5,3 19,12 5,21" /></svg>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="w-full max-w-xl mt-4">
            <div className="flex items-center justify-between relative">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -translate-y-1/2 -z-10" />
              {Array.from({ length: 11 }, (_, i) => {
                const stepNum = i + 1;
                const isCompleted = stepNum < 3;
                const isCurrent = stepNum === 3;
                return (
                  <button key={stepNum} onClick={() => goToPaso(stepNum)} title={`Ir al paso ${stepNum} de 11`} aria-label={`Ir al paso ${stepNum} de 11`} className="cursor-pointer hover:scale-110 transition-transform">
                    {isCompleted ? (
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20,6 9,17 4,12" />
                        </svg>
                      </div>
                    ) : isCurrent ? (
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300" />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-center text-slate-600 text-sm font-medium mt-4">Paso 3 de 11</p>
           </div>

          <div className="flex items-center gap-2 text-slate-500 text-sm mt-4">
            <img src="./safeguard.png" alt="Safe" className="w-5 h-5" />
            <span>Tu información está protegida y sincronizada en todos tus dispositivos.</span>
          </div>
        </div>
      </div>
    );
  }

  // Screen 4: Recommended Config - fotos desde avatar_lavanda
  if (screen === 4) {
    const avatarImageMap: Record<string, string> = {
      ashley: '/avatar_lavanda/ashley.jpeg',
      conrad: '/avatar_lavanda/conrad.jpeg',
      john: '/avatar_lavanda/John.jpeg',
      lia: '/avatar_lavanda/lia (2).jpeg',
      monroe: '/avatar_lavanda/Monroe.jpeg',
      sophya: '/avatar_lavanda/sophya.jpeg',
    };
    const avatarName = avatar?.name || profile?.avatar_name || '';
    const avatarImage = avatarName
      ? (avatarImageMap[avatarName.toLowerCase()] || AVATARS.find(a => a.name.toLowerCase() === avatarName.toLowerCase())?.file || '/avatar_lavanda/lia (2).jpeg')
      : '/avatar_lavanda/lia (2).jpeg';

    const configItems = [
      {
        id: 'intensidad',
        title: 'Intensidad moderada',
        description: 'Recibirás acompañamiento sin sentirte abrumado.',
        icon: (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
        ),
      },
      {
        id: 'activaciones',
        title: 'Activaciones en momentos clave',
        description: 'Focusia estará presente cuando realmente lo necesites.',
        icon: (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12,6 12,12 16,14" />
          </svg>
        ),
      },
      {
        id: 'tono',
        title: 'Tono adaptativo',
        description: 'El tono y estilo se adapta a tu contexto y estado.',
        icon: (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 10v3" />
            <path d="M6 6v11" />
            <path d="M10 3v18" />
            <path d="M14 8v7" />
            <path d="M18 5v13" />
            <path d="M22 10v3" />
          </svg>
        ),
      },
      {
        id: 'notificaciones',
        title: 'Notificaciones no invasivas',
        description: 'Mensajes claros, breves y al grano.',
        icon: (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9,12 11,14 15,10" />
          </svg>
        ),
      },
      {
        id: 'acompanamiento',
        title: 'Acompañamiento sin saturación',
        description: 'Menos es más. Calidad sobre cantidad.',
        icon: (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        ),
      },
    ];

    return (
      <div className="min-h-screen bg-white relative overflow-x-hidden flex flex-col items-center justify-center px-4 py-6 md:py-10 font-montserrat">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {/* Imagen curva izquierda */}
          <img src="/onda1.png" alt="" className="absolute left-0 top-0 h-full w-auto object-cover opacity-90" />
          {/* Imagen curva derecha */}
          <img src="/onda2.png" alt="" className="absolute right-0 top-0 h-[500px] w-[200px] object-cover opacity-90 mt-40" />
        </div>

        {/* Contenido */}
        <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8">
              <img src="/focusia-logo2.png" alt="Focusia Logo" className="w-full h-full" />
            </div>
            <span className="font-bold text-slate-800 text-xl">Focusia</span>
          </div>

          {/* Título */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold font-monserrat text-slate-900 text-center mb-1">
            Tu configuración <span className="text-indigo-600">recomendada.</span>
          </h1>
          <p className="text-slate-500 text-center mb-8 text-base">Puedes cambiarla cuando quieras.</p>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4 w-full">{error}</div>}

          {/* Grid principal */}
          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mb-8">
            {/* Columna izquierda: Avatar + burbuja */}
            <div className="flex justify-center lg:justify-start">
              <div className="relative w-[700px] h-[400px] rounded-md overflow-visible" style={{ background: 'linear-gradient(135deg, #FFFFFF 0%, #EAD8FE 50%, #FFFFFF 100%)' }}>
                {/* Imagen del avatar */}
                <div className="absolute left-0 top-0 w-[300px] h-full rounded-md overflow-hidden bg-purple-100">
                  <img
                    src={avatarImage || '/avatar_lavanda/lia (2).jpeg'}
                    alt={avatarName || 'Avatar'}
                    className="w-full h-full object-cover object-top"
                    onError={(e) => { (e.target as HTMLVideoElement).style.display = 'none'; }}
                  />
                </div>
                {/* Burbuja de diálogo */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[200px]">
                  <div className="bg-white rounded-md shadow-xl p-5 relative">
                    <div className="absolute -left-2 top-6 w-4 h-4 bg-white" style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} />
                    <img src="/apostrofe.png" alt="" className="w-6 h-6 mb-2" />
                    <p className="text-slate-700 text-xs leading-relaxed">
                      He preparado una configuración equilibrada para acompañarte en los momentos importantes, sin interrumpirte innecesariamente.
                    </p>
                    <p className="text-purple-600 font-bold text-xs mt-2">
                      Podrás cambiarla cuando quieras.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna derecha: Lista de configuración */}
            <div>
              <p className="text-slate-800 font-semibold text-base mb-4">Tu configuración inicial recomendada:</p>
              <div className="space-y-3">
                {configItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 hover:shadow-md transition-shadow"
                  >
                    <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-900 font-semibold text-sm">{item.title}</p>
                      <p className="text-slate-500 text-xs leading-relaxed">{item.description}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20,6 9,17 4,12" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 max-w-3xl">
            <button
              onClick={handleAcceptRecommended}
              disabled={saving}
              className="w-[350px] py-2 px-2 rounded-md text-white font-semibold text-base flex items-center justify-center gap-3 cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-50"
              style={{ background: 'linear-gradient(90deg, #0F2C6B, #6E09F1E3)' }}
            >
              <div className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12" />
                </svg>
              </div>
              {saving ? 'Aplicando...' : 'Mantener configuración equilibrada'}
            </button>
            <button
              onClick={handleCustomizeNow}
              className="w-full py-4 px-6 rounded-md text-purple-800 font-bold text-base flex items-center justify-center gap-3 cursor-pointer border border-purple-600 bg-white hover:bg-gray-50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#852BD8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="21" x2="4" y2="14" />
                <line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" />
                <line x1="20" y1="12" x2="20" y2="3" />
                <line x1="1" y1="14" x2="7" y2="14" />
                <line x1="9" y1="8" x2="15" y2="8" />
                <line x1="17" y1="16" x2="23" y2="16" />
              </svg>
              Personalizar ahora
            </button>
          </div>

          {/* Indicador de pasos */}
          <div className="w-full max-w-xl mb-4">
            <div className="flex items-center justify-between relative">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -translate-y-1/2" />
              {Array.from({ length: 11 }, (_, i) => {
                const stepNum = i + 1;
                const isCompleted = stepNum < 4;
                const isCurrent = stepNum === 4;
                return (
                  <button key={stepNum} onClick={() => goToPaso(stepNum)} title={`Ir al paso ${stepNum} de 11`} aria-label={`Ir al paso ${stepNum} de 11`} className="cursor-pointer hover:scale-110 transition-transform z-10">
                    {isCompleted ? (
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20,6 9,17 4,12" />
                        </svg>
                      </div>
                    ) : isCurrent ? (
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center ring-4 ring-blue-100">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300" />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-center text-slate-600 text-sm font-medium mt-3">Paso 4 de 11</p>
          </div>

          {/* Mensaje de seguridad */}
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9,12 11,14 15,10" />
            </svg>
            <span>Tu información está protegida y sincronizada en todos tus dispositivos.</span>
          </div>
        </div>
      </div>
    );
  }

  // Screen 5: Personalización Guiada
  if (screen === 5) {
    // Sub-screen: Personalization Intro - fotos desde avatar_lavanda
    if (personalizationIntro) {
      const avatarImagesIntro: Record<string, string> = {
        ashley: '/avatar_lavanda/ashley.jpeg',
        conrad: '/avatar_lavanda/conrad.jpeg',
        john: '/avatar_lavanda/John.jpeg',
        lia: '/avatar_lavanda/lia (2).jpeg',
        monroe: '/avatar_lavanda/Monroe.jpeg',
        sophya: '/avatar_lavanda/sophya.jpeg',
      };
      const avatarNameIntro = avatar?.name || profile?.avatar_name || '';
      const avatarImageIntro = avatarImagesIntro[avatarNameIntro.toLowerCase()] || AVATARS.find(a => a.name.toLowerCase() === avatarNameIntro.toLowerCase())?.file || '/avatar_lavanda/lia (2).jpeg';

      const configItems = [
        { id: 1, title: 'Intensidad del acompañamiento', description: '¿Qué tan presente quieres que sea Focusia en tu día a día?', icon: <img src="/campana.png" alt="" /> },
        { id: 2, title: 'Tipo de activaciones', description: '¿En qué situaciones deseas recibir acompañamiento?', icon: <img src="/storm.png" alt="" /> },
        { id: 3, title: 'Horarios permitidos', description: '¿En qué momentos del día Focusia puede activarse?', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
        { id: 4, title: 'Tono del avatar', description: 'El estilo de comunicación que prefieres para tu avatar.', icon: <img src="/wave.png" alt="" /> },
      ];

      const introSteps = configItems;

      return (
        <div className="min-h-screen bg-white relative overflow-x-hidden flex flex-col items-center justify-center px-4 py-6 md:py-10 font-montserrat">
          {/* Decorative images */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <img src="/onda1.png" alt="" className="absolute left-0 top-0 h-full w-auto object-cover opacity-90" />
            <img src="/onda2.png" alt="" className="absolute right-0 top-0 h-[450px] w-[200px] object-cover opacity-90 mt-48" />
          </div>

          <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              
              <div className="flex items-center gap-2 ml-120">
                <div className="w-8 h-8">
                  <img src="/focusia-logo2.png" alt="Focusia Logo" className="w-full h-full" />
                </div>
                <span className="font-bold text-slate-800 text-xl">Focusia</span>
              </div>
              <div className="flex gap-3">
              </div>
            </div>

            {/* Title */}
            <div className="text-center mb-10">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Personalización <span className="text-purple-600">guiada.</span></h1>
              <p className="text-slate-500 text-base">En 4 simples pasos definiremos cómo quieres que te acompañe Focusia.</p>
            </div>

            {/* Main content */}
            <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mb-8">
            {/* Columna izquierda: Avatar + burbuja */}
            <div className="flex justify-center lg:justify-start">
              <div className="relative w-[700px] h-[400px] rounded-md overflow-visible" style={{ background: 'linear-gradient(135deg, #FFFFFF 0%, #EAD8FE 50%, #FFFFFF 100%)' }}>
                {/* Imagen del avatar */}
                <div className="absolute left-0 top-0 w-[300px] h-full rounded-md overflow-hidden bg-purple-100">
                  <img
                    src={avatarImageIntro || '/avatar_lavanda/lia (2).jpeg'}
                    alt={avatarNameIntro || 'Avatar'}
                    className="w-full h-full object-cover object-top"
                    onError={(e) => { (e.target as HTMLVideoElement).style.display = 'none'; }}
                  />
                </div>
                {/* Burbuja de diálogo */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[200px]">
                  <div className="bg-white rounded-md shadow-xl p-5 relative">
                    <div className="absolute -left-2 top-6 w-4 h-4 bg-white" style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} />
                    <img src="/ballpoint.png" alt="" className="w-14 h-10 mb-2" />
                    <p className="text-slate-700 text-xs leading-relaxed">
                      Ahora vamos a personalizar cómo quieres que Focusia te acompañe.</p>
                    <p className="text-purple-600 font-bold text-xs mt-2">Este proceso tomará menos de 2 minutos</p>
                    <p className="text-slate-600 font-bold text-xs mt-2">
                      Podrás cambiarla cuando quieras.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna derecha: Steps */}
            <div className="space-y-3 relative z-10">
              {configItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 hover:shadow-md transition-shadow"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                    {item.id}
                  </div>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #ede9fe, #e0e7ff)' }}>
                    <div className="text-purple-600">{item.icon}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-900 font-semibold text-sm">{item.title}</p>
                    <p className="text-slate-500 text-xs leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

            {/* Disclaimer */}
            

            {/* Continue Button */}
            <button onClick={() => setPersonalizationIntro(false)}
              className="w-[500px] py-4 rounded-md text-white font-semibold text-lg flex items-center justify-center gap-3 mt-6 ml-60 transition-all duration-300 hover:shadow-xl cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #35166B, #7C10D4)', boxShadow: '0 8px 20px rgba(69, 14, 165, 0.3)' }}>
              Continuar
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg>
            </button>
            <p className="text-center text-slate-600 text-[13px] mt-8">Toma menos de 2 minutos y puedes cambiar todo cuando quieras.</p>

            {/* Step Indicator - tal como foto: línea degradada + círculos con checks */}
            <div className="mt-8 w-full max-w-[560px] mx-auto">
              <div className="relative flex items-center justify-between px-1">
                {/* línea base gris */}
                <div className="absolute left-3 right-3 top-1/2 h-[2px] bg-slate-200 -translate-y-1/2 rounded-full" />
                {/* línea progreso degradada hasta paso 6 */}
                <div className="absolute left-3 top-1/2 h-[2px] bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 -translate-y-1/2 rounded-full" style={{ width: 'calc(50% - 6px)' }} />
                {Array.from({ length: 11 }, (_, i) => {
                  const n = i + 1;
                  const isCompleted = n < 6;
                  const isCurrent = n === 6;
                  return (
                    <button
                      key={n}
                      onClick={() => goToPaso(n)}
                      title={`Ir al paso ${n} de 11`}
                      aria-label={`Ir al paso ${n} de 11`}
                      className={`relative z-10 w-7 h-7 lg:w-[30px] lg:h-[30px] rounded-full flex items-center justify-center shrink-0 cursor-pointer hover:scale-110 transition-transform ${
                        isCompleted
                          ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-md'
                          : isCurrent
                          ? 'bg-gradient-to-br from-blue-600 via-indigo-500 to-purple-600 text-white shadow-[0_0_0_4px_rgba(168,85,247,0.2)] ring-2 ring-white'
                          : 'bg-slate-200 text-slate-400 hover:bg-slate-300'
                      }`}
                    >
                      {isCompleted ? (
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                      ) : isCurrent ? (
                        <div className="w-2 h-2 bg-white rounded-full shadow-sm" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <p className="text-center text-slate-600 text-sm mt-3">Paso 5 de 11</p>
            </div>

            {/* Security */}
            <div className="flex items-center justify-center gap-2 mt-5 text-slate-600 text-xs">
            <img src="/safeguard.png" alt="" />
              <span>Tu información está protegida y sincronizada en todos tus dispositivos.</span>
            </div>
          </div>
        </div>
      );
    }


    // Sub-screen: Intensity Selection — pixel-faithful to mockup (dark navy, 3-column layout)
    const avatarImages: Record<string, string> = {
      ashley: '/avatars/Ashley.jpeg',
      conrad: '/avatars/conrad.jpeg',
      john: '/avatars/John.jpeg',
      lia: '/avatars/Lia.jpeg',
      monroe: '/avatars/Monroe.jpeg',
      sophya: '/avatars/Sophya.jpeg',
    };
    const avatarName = avatar?.name || profile?.avatar_name || '';
    const avatarImage = avatarImages[avatarName.toLowerCase()] || AVATARS.find(a => a.name.toLowerCase() === avatarName.toLowerCase())?.file || '/avatar_lavanda/lia (2).jpeg';
    const liaLabel = (avatarName || profile?.avatar_name || 'Lía').toLowerCase() === 'lia' ? 'LÍA' : (avatarName || profile?.avatar_name || 'Lía').toUpperCase();

    const customizationSteps = [
      { num: 1, label: 'Intensidad del\nacompañamiento', active: true },
      { num: 2, label: 'Tipo de activaciones', active: false },
      { num: 3, label: 'Horarios permitidos', active: false },
      { num: 4, label: 'Tono del avatar', active: false },
    ];

    const FrequencyBars = ({ variant }: { variant: 'suave' | 'equilibrada' | 'exigente' }) => {
      if (variant === 'suave') {
        // Baja: 2 filled teal + 6 dim
        return (
          <div className="flex items-center gap-[6px] justify-center bg-black/30 rounded-md px-4 py-2 border border-white/[0.04]">
            <span className="w-[7px] h-[7px] rounded-full bg-[#2dd4bf] shadow-[0_0_6px_rgba(45,212,191,0.8)]" />
            <span className="w-[7px] h-[7px] rounded-full bg-[#2dd4bf] shadow-[0_0_6px_rgba(45,212,191,0.8)]" />
            <span className="w-[7px] h-[7px] rounded-full bg-white/10" />
            <span className="w-[7px] h-[7px] rounded-full bg-white/10" />
            <span className="w-[7px] h-[7px] rounded-full bg-white/10" />
            <span className="w-[7px] h-[7px] rounded-full bg-white/10" />
            <span className="w-[7px] h-[7px] rounded-full bg-white/10" />
            <span className="w-[7px] h-[7px] rounded-full bg-white/10" />
          </div>
        );
      }
      if (variant === 'equilibrada') {
        return (
          <div className="flex items-center gap-[6px] justify-center bg-black/30 rounded-full px-4 py-2 border border-white/[0.04]">
            <span className="w-[7px] h-[7px] rounded-full bg-[#8b5cf6]/90" />
            <span className="w-[7px] h-[7px] rounded-full bg-[#8b5cf6]/90" />
            <span className="w-[7px] h-[7px] rounded-full bg-[#8b5cf6]/90" />
            <span className="w-[7px] h-[7px] rounded-full bg-[#8b5cf6]/90" />
            <span className="w-[7px] h-[7px] rounded-full bg-[#8b5cf6]/90" />
            <span className="w-2 h-3 rounded-full bg-[#a78bfa] shadow-[0_0_8px_rgba(167,139,250,0.9)]" />
            <span className="w-2 h-3 rounded-full bg-[#a78bfa] shadow-[0_0_8px_rgba(167,139,250,0.9)]" />
          </div>
        );
      }
      return (
        <div className="flex items-center gap-[6px] justify-center bg-black/30 rounded-full px-4 py-2 border border-white/[0.04]">
          <span className="w-2 h-3 rounded-full bg-[#fb923c] shadow-[0_0_6px_rgba(251,146,60,0.8)]" />
          <span className="w-2 h-3 rounded-full bg-[#fb923c] shadow-[0_0_6px_rgba(251,146,60,0.8)]" />
          <span className="w-2 h-3 rounded-full bg-[#fb923c] shadow-[0_0_6px_rgba(251,146,60,0.8)]" />
          <span className="w-2 h-3 rounded-full bg-[#fb923c] shadow-[0_0_6px_rgba(251,146,60,0.8)]" />
          <span className="w-2 h-3 rounded-full bg-[#fb923c] shadow-[0_0_6px_rgba(251,146,60,0.8)]" />
          <span className="w-2 h-3 rounded-full bg-[#fb923c] shadow-[0_0_6px_rgba(251,146,60,0.8)]" />
          <span className="w-2 h-3 rounded-full bg-[#fb923c] shadow-[0_0_6px_rgba(251,146,60,0.8)]" />
          <span className="w-2 h-3 rounded-full bg-[#fb923c] shadow-[0_0_6px_rgba(251,146,60,0.8)]" />
          <span className="w-2 h-3 rounded-full bg-[#fb923c] shadow-[0_0_6px_rgba(251,146,60,0.8)]" />
          <span className="w-2 h-3 rounded-full bg-[#fb923c] shadow-[0_0_6px_rgba(251,146,60,0.8)]" />
        </div>
      );
    };

    return (
      <div className="min-h-screen bg-[#020214] font-montserrat flex flex-col lg:flex-row overflow-hidden">
        {/* ===== LEFT SIDEBAR — 240px ===== */}
        <aside className="hidden lg:flex fixed left-0 top-0 h-full w-[240px] bg-[#07071a] border-r border-white/[0.06] z-50 flex-col">
          <div className="px-6 pt-6 pb-5 flex items-center gap-3">
            <img src="/focussia.png" alt="Focusia" className="w-8 h-8 object-contain" />
            <span className="text-[22px] font-bold text-white tracking-tight">Focusia</span>
          </div>

          {/* Steps */}
          <nav className="flex-1 px-4 pt-2 flex flex-col gap-0 relative">
            {/* vertical line */}
            <div className="absolute left-[40px] top-[14px] bottom-[40px] w-px bg-white/[0.08]" />
            {customizationSteps.map((step) => (
              <div key={step.num} className="flex items-center gap-3 px-2 py-3 relative">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 relative z-10 ${step.active ? 'bg-[#7c3aed] text-white shadow-[0_0_12px_rgba(124,58,237,0.6)] ring-4 ring-[#7c3aed]/20' : 'bg-[#0f0f2a] border border-white/15 text-white/40'}`}>
                  {step.num}
                </div>
                <span className={`text-[13px] leading-tight whitespace-pre-line ${step.active ? 'text-white font-semibold' : 'text-white/35 font-medium'}`}>{step.label}</span>
              </div>
            ))}
          </nav>

          {/* Info box */}
          <div className="px-4 pb-4">
            <div className="bg-[#0b0b1e] border border-white/[0.07] rounded-xl p-4 flex gap-3">
              <svg className="w-5 h-5 text-[#7c3aed] shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9,12 11,14 15,10" /></svg>
              <p className="text-[11.5px] leading-[1.6] text-white/45 m-0">Esta configuración define la frecuencia e intensidad del acompañamiento, pero <span className="text-[#a78bfa]">no modifica los canales de comunicación</span> ni los horarios de intervención.</p>
            </div>
          </div>

          {/* Help */}
          <div className="px-4 pb-6">
            <button onClick={() => setHelpChatKey('personalizacion')} title="Abrir chat de ayuda con IA" className="w-full flex items-center justify-between px-3 py-3 rounded-xl bg-white/[0.04] border border-white/[0.05] hover:bg-white/[0.07] transition-colors group text-left cursor-pointer">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-[#7c3aed]/20 border border-[#7c3aed]/30 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[#a78bfa] text-sm font-bold">?</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[13px] font-medium text-white/80 leading-none">¿Necesitas ayuda?</span>
                  <span className="text-[11px] text-white/35 leading-none mt-1">Te explicamos cada opción</span>
                </div>
              </div>
              <svg className="w-4 h-4 text-white/20 group-hover:text-white/50 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9,18 15,12 9,6" /></svg>
            </button>
          </div>
          <HelpChat
            open={helpChatKey === 'personalizacion'}
            onClose={() => setHelpChatKey(null)}
            pasoLabel={HELP_CONTENT.personalizacion.paso}
            titulo={HELP_CONTENT.personalizacion.titulo}
            bienvenida={HELP_CONTENT.personalizacion.bienvenida}
            contextoAyuda={HELP_CONTENT.personalizacion.contexto}
          />
        </aside>

        {/* ===== CENTER AVATAR PANEL — 280px ===== */}
        <div className="hidden lg:flex fixed left-[240px] top-0 h-full w-[250px] shrink-0 overflow-hidden flex-col bg-[#0a0a2a] border-r border-white/[0.06]">
          <img src={avatarImage} alt={avatarName} className="absolute inset-0 w-full h-full object-cover object-top" style={{ objectPosition: 'center top' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          {/* starry glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1aff]/20 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[320px] h-[320px] bg-[#4f46e5]/20 blur-[60px] rounded-full pointer-events-none" />
          <div className="absolute top-[14%] right-[14%] w-[3px] h-[3px] bg-white rounded-full shadow-[0_0_10px_2px_rgba(255,255,255,0.9)] opacity-90" />
          <div className="absolute top-[8%] right-[10%] w-[2px] h-[2px] bg-white rounded-full opacity-60" />
          {/* bottom gradient that fades photo into dark */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, #07071a 0%, #07071a 12%, rgba(7,7,26,0.92) 24%, rgba(7,7,26,0.55) 42%, rgba(7,7,26,0.15) 58%, transparent 72%)' }} />

          <div className="relative z-10 mt-70 px-4 pb-2 flex flex-col gap-6">
            {/* LÍA card — dark navy with subtle border */}
            <div className="rounded-xl bg-[#0e0e28]/85 backdrop-blur-xl border border-white/[0.08] p-2 shadow-[0_8px_32px_rgba(0,0,0,0.5)] w-40 ">
              <h3 className="text-[12px] font-extrabold tracking-[0.14em] text-[#a78bfa] mb-3">{liaLabel}</h3>
              <p className="text-[10px] leading-[1.6] text-white/80">Cada persona necesita un nivel distinto de acompañamiento. Elige el que mejor se adapte a tu forma de trabajar.</p>
              <p className="text-[10px] leading-[1.6] text-[#a78bfa] font-semibold mt-3">Siempre podrás cambiarlo más adelante.</p>
            </div>

            {/* Nivel de presencia */}
            <div className="flex flex-col items-center">
              <h4 className="text-[10px] tracking-[0.22em] text-white/30 font-semibold text-center mb-4">NIVEL DE PRESENCIA</h4>
               <img src="./levels.png" alt="Levels" className="w-full mt-4" />
              <div className="w-full flex items-center justify-between px-1">
                <span className="text-[#5eead4] font-semibold text-xs">Suave</span>
                <div className="flex-1 mx-3 h-px border-t border-dashed border-white/15" />
                <span className="text-[#fb923c] font-semibold text-xs">Exigente</span>
              </div>
            </div>
          </div>
        </div>

        {/* ===== MAIN CONTENT — pl-[540px] ===== */}
        <div className="flex-1 lg:pl-[540px] min-h-screen flex flex-col bg-[#020214] w-full">
          {/* Top bar */}
          <header className="h-[64px] w-[800px] flex items-center justify-between px-6 border-b  bg-[#08081e] sticky top-0 z-30 shrink-0">
            <button onClick={() => goTo(4)} className="flex items-center gap-2 text-white/70 hover:text-white text-sm font-medium transition-colors">
              <span className="w-8 h-8 rounded-full border border-white/10 bg-white/[0.04] flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6" /></svg>
              </span>
              Volver
            </button>

            <div className="hidden md:flex items-center gap-2 bg-white/[0.06] border border-white/10 px-4 py-2 rounded-full">
              <svg className="w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
              <span className="text-sm font-medium text-white/80">Personalización guiada</span>
            </div>

            <div className="flex items-center gap-2">
              <button className="w-9 h-9 rounded-full border border-white/10 bg-white/[0.04] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors">
                <span className="text-sm font-bold">?</span>
              </button>
              <button className="w-9 h-9 rounded-full border border-white/10 bg-white/[0.04] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
              </button>
            </div>
          </header>

          {/* Mobile top bar */}
          <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-[#07071e] border-b border-white/10">
            <div className="flex items-center gap-2">
              <img src="/focussia.png" alt="Focusia" className="w-6 h-6" />
              <span className="text-lg font-bold text-white">Focusia</span>
            </div>
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
              <svg className="w-3.5 h-3.5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
              <span className="text-xs font-medium text-white/80">Personalización guiada</span>
            </div>
          </div>

          <main className="flex-1 px-6 lg:px-10 py-8 lg:py-10 flex flex-col">
            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg p-3 mb-6">{error}</div>}

            {/* Title */}
            <div className="mb-8 lg:mb-10 flex items-start gap-4">
              <span className="text-[36px] lg:text-[42px] font-bold text-[#8b5cf6] leading-none">1.</span>
              <div>
                <h1 className="text-[24px] lg:text-[36px] font-bold text-white tracking-tight leading-tight">Intensidad del acompañamiento</h1>
                <p className="text-[14px] lg:text-[15px] text-white/55 mt-2">Elige qué tan presente quieres que esté Focusia en tu proceso.</p>
                <p className="text-[14px] lg:text-[15px] text-[#a78bfa] mt-0.5">Puedes cambiar esta configuración cuando quieras.</p>
              </div>
            </div>

            {/* Cards grid — exactly 3, matching mockup */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6 flex-1">
              {/* SUAVE */}
              <button onClick={() => setConfigIntensity('suave')} className="group relative flex flex-col items-center text-left">
                <div className={`w-full rounded-2xl p-[1px] transition-all duration-300 ${configIntensity === 'suave' ? 'bg-gradient-to-b from-[#14b8a6]/60 to-[#14b8a6]/20 shadow-[0_0_24px_rgba(20,184,166,0.25)]' : 'bg-white/[0.06] group-hover:bg-[#14b8a6]/30'}`}>
                  <div className={`w-full rounded-2xl flex flex-col items-center text-center px-6 py-8 h-[420px] transition-colors ${configIntensity === 'suave' ? 'bg-[#061e2a]' : 'bg-[#0a1620] group-hover:bg-[#061e2a]/80'}`}>
                    {/* Icon circle */}
                    <div className="w-[88px] h-[88px] rounded-full bg-[#0f2e3a]  flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(20,184,166,0.15)]">
                      <img src="./moon.png" alt="Suave" className="w-[88px] h-[88px] " />
                    </div>
                    <h2 className="text-[18px] font-extrabold tracking-[0.08em] text-[#2dd4bf] mb-3">SUAVE</h2>
                    <p className="text-[13px] leading-[1.6] text-white/70 flex-1">Focusia interviene solo en momentos importantes o cuando detecta una desviación significativa.</p>
                    <div className="w-full mt-6 flex flex-col items-center gap-2">
                      <FrequencyBars variant="suave" />
                      <span className="text-xs font-medium text-[#2dd4bf]">Baja frecuencia</span>
                    </div>
                  </div>
                </div>
                <div className={`mt-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${configIntensity === 'suave' ? 'border-[#2dd4bf] bg-[#2dd4bf]/20 shadow-[0_0_10px_rgba(45,212,191,0.5)]' : 'border-white/20 group-hover:border-[#2dd4bf]/50'}`}>
                  {configIntensity === 'suave' && <div className="w-2.5 h-2.5 rounded-full bg-[#2dd4bf]" />}
                </div>
              </button>

              {/* EQUILIBRADA — RECOMENDADO */}
              <button onClick={() => setConfigIntensity('equilibrada')} className="group relative flex flex-col items-center text-left">
                {/* Badge */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                  <div className="bg-gradient-to-r from-[#2563eb] to-[#7c3aed] text-white text-[10px] font-extrabold px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-[0_4px_20px_rgba(124,58,237,0.5)] border border-white/20 tracking-wider whitespace-nowrap">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                    RECOMENDADO
                  </div>
                </div>
                <div className={`w-full rounded-xl p-[1px] mt-2 transition-all duration-300 ${configIntensity === 'equilibrada' ? 'bg-gradient-to-b from-[#6366f1] via-[#8b5cf6] to-[#7c3aed] shadow-[0_0_36px_rgba(124,58,237,0.45),0_0_60px_rgba(79,70,229,0.25)]' : 'bg-gradient-to-b from-[#6366f1]/50 to-[#7c3aed]/30 shadow-[0_0_24px_rgba(124,58,237,0.2)]'}`}>
                  <div className="w-full rounded-xl bg-[#0f0a1e] flex flex-col items-center text-center px-6 py-8 h-[420px] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-[#7c3aed]/[0.08] via-transparent to-transparent pointer-events-none" />
                    <div className=" w-[88px] h-[88px] rounded-full  bg-[#1e1238]  flex items-center justify-center mb-5 relative z-10 shadow-[0_0_20px_rgba(139,92,246,0.25)]">
                      <img src="./balance.png" alt=""className="w-[88px] h-[88px] " />
                    </div>
                    <h2 className="text-[18px] font-extrabold tracking-[0.08em] text-[#a78bfa] mb-3 relative z-10">EQUILIBRADA</h2>
                    <p className="text-[13px] leading-[1.6] text-white/70 flex-1 relative z-10">Focusia acompaña mediante recordatorios estratégicos y sugerencias oportunas, sin generar saturación.</p>
                    <div className="w-full mt-6 flex flex-col items-center gap-2 relative z-10">
                     <img src="./equilibrio-1.png" alt="Suave" className="w-[150px] h-[40px] " />
                      <span className="text-xs font-medium text-[#a78bfa]">Frecuencia media</span>
                    </div>
                  </div>
                </div>
                <div className={`mt-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${configIntensity === 'equilibrada' ? 'border-[#8b5cf6] bg-[#8b5cf6]/20 shadow-[0_0_10px_rgba(139,92,246,0.5)]' : 'border-[#8b5cf6]/40 group-hover:border-[#8b5cf6]'}`}>
                  {configIntensity === 'equilibrada' && <div className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6]" />}
                </div>
              </button>

              {/* EXIGENTE */}
              <button onClick={() => setConfigIntensity('exigente')} className="group relative flex flex-col items-center text-left md:col-span-2 xl:col-span-1">
                <div className={`w-full rounded-2xl p-[1px] transition-all duration-300 ${configIntensity === 'exigente' ? 'bg-gradient-to-b from-[#f97316]/60 to-[#ea580c]/20 shadow-[0_0_24px_rgba(249,115,22,0.3)]' : 'bg-white/[0.06] group-hover:bg-[#f97316]/30'}`}>
                  <div className={`w-full rounded-2xl flex flex-col items-center text-center px-6 py-8 h-[420px] transition-colors ${configIntensity === 'exigente' ? 'bg-[#1a1208]' : 'bg-[#1a1208]/60 group-hover:bg-[#1a1208]'}`}>
                    <div className="w-[88px] h-[88px] rounded-full bg-[#2a1a08] border border-[#f97316]/30 flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(249,115,22,0.15)]">
                     <img src="./rocket.png" alt="" className="w-[88px] h-[88px]" />
                    </div>
                    <h2 className="text-[18px] font-extrabold tracking-[0.08em] text-[#fb923c] mb-3">EXIGENTE</h2>
                    <p className="text-[13px] leading-[1.6] text-white/70 flex-1">Focusia aumenta la frecuencia de las intervenciones y utiliza mensajes más directos para mantener el compromiso con los objetivos.</p>
                    <div className="w-full mt-6 flex flex-col items-center gap-2">
                      <img src="./eficiente-1.png" alt="Intenso" className="w-[150px] h-[40px]" />
                      <span className="text-xs font-medium text-[#fb923c]">Alta frecuencia</span>
                    </div>
                  </div>
                </div>
                <div className={`mt-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${configIntensity === 'exigente' ? 'border-[#f97316] bg-[#f97316]/20 shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 'border-white/20 group-hover:border-[#f97316]/50'}`}>
                  {configIntensity === 'exigente' && <div className="w-2.5 h-2.5 rounded-full bg-[#f97316]" />}
                </div>
              </button>
            </div>

            {/* Bottom bar */}
            <div className="mt-8 lg:mt-10 flex flex-col lg:flex-row items-center justify-between gap-4 bg-[#0c0c24]  rounded-xl px-4 py-2 lg:px-3">
              <div className="flex items-center gap-4 w-30 lg:w-15 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#1a1a35] flex items-center justify-center shrink-0">
                   <img src="./footer_image.png" alt="" />
                 </div>
                <span className="text-sm font-medium text-white/60 whitespace-nowrap">Paso 6 de 11</span>
                <div className="hidden sm:flex flex-1 max-w-[380px] items-center justify-between relative mx-2">
                  <div className="absolute left-0 right-0 top-1/2 h-[3px] bg-white/10 -translate-y-1/2 rounded-full" />
                  <div className="absolute left-0 top-1/2 h-[3px] bg-gradient-to-r from-[#2563eb] to-[#7c3aed] -translate-y-1/2 rounded-full" style={{ width: '45%' }} />
                  {Array.from({ length: 11 }, (_, i) => {
                    const n = i + 1;
                    const isCompleted = n < 6;
                    const isCurrent = n === 6;
                    return (
                      <button key={n} onClick={() => goToPaso(n)} title={`Ir al paso ${n} de 11`} aria-label={`Ir al paso ${n} de 11`} className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 cursor-pointer hover:scale-110 transition-transform ${isCompleted ? 'bg-[#7c3aed] border-[#7c3aed] text-white' : isCurrent ? 'bg-[#7c3aed] border-white shadow-[0_0_0_4px_rgba(124,58,237,0.35)] text-white' : 'bg-[#1e1e36] border-white/15 hover:border-white/40'}`}>
                        {isCompleted ? (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                        ) : isCurrent ? (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                {/* mobile stepper simplified */}
                <div className="flex sm:hidden flex-1 items-center justify-between relative mx-2">
                  <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-white/10 -translate-y-1/2 rounded-full" />
                  <div className="absolute left-0 top-1/2 h-[2px] bg-gradient-to-r from-[#2563eb] to-[#7c3aed] -translate-y-1/2 rounded-full" style={{ width: '45%' }} />
                  {Array.from({ length: 6 }, (_, i) => {
                    const n = i + 1;
                    const isCurrent = n === 3;
                    const isCompleted = n < 3;
                    const paso = n + 3;
                    return <button key={n} onClick={() => goToPaso(paso)} title={`Ir al paso ${paso} de 11`} aria-label={`Ir al paso ${paso} de 11`} className={`relative z-10 w-4 h-4 rounded-full cursor-pointer hover:scale-125 transition-transform ${isCompleted || isCurrent ? 'bg-[#7c3aed]' : 'bg-white/10'} ${isCurrent ? 'ring-2 ring-white' : ''}`} />;
                  })}
                </div>
              </div>

              <button onClick={handleSaveIntensity} disabled={saving} className="w-full lg:w-auto bg-gradient-to-r from-[#1d4ed8] to-[#7c3aed] hover:from-[#1e40af] hover:to-[#6d28d9] text-white px-10 py-3.5 rounded-xl font-bold text-sm tracking-wider flex items-center justify-center gap-3 shadow-[0_8px_24px_rgba(124,58,237,0.4)] transition-all disabled:opacity-50 shrink-0">
                {saving ? 'Guardando...' : 'CONTINUAR'}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12,5 19,12 12,19" /></svg>
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

    // Screen 6: Customize Activations - polished 100% photo 6. PANTALLA SEIS
  if (screen === 6) {
    const avatarName6 = avatar?.name || profile?.avatar_name || 'Lía';
    const avatarDisplayName6 = avatarName6.toLowerCase() === 'lia' ? 'LÍA' : avatarName6.toUpperCase();
    const avatarImageMap6: Record<string, string> = {
      ashley: '/Avatars_ciber/Ashley.jpeg',
      conrad: '/Avatars_ciber/Conrad.jpeg',
      john: '/Avatars_ciber/John.jpeg',
      lia: '/Avatars_ciber/Lia (3).jpeg',
      monroe: '/Avatars_ciber/Monroe (2).jpeg',
      sophya: '/Avatars_ciber/Sophya (2).jpeg',
    };
    const avatarImg6 = avatarName6
      ? (avatarImageMap6[avatarName6.toLowerCase()] || AVATARS.find(a => a.name.toLowerCase() === avatarName6.toLowerCase())?.file || '/avatars_ciber/lia (2).jpeg')
      : '/Avatars_ciber/Lia (3).jpeg';

    const customizationSteps = [
      { num: 1, label: 'Intensidad del acompañamiento' },
      { num: 2, label: 'Tipo de activaciones' },
      { num: 3, label: 'Horarios permitidos' },
      { num: 4, label: 'Tono del avatar' },
    ];

    return (
      <div className="min-h-screen bg-[#0f0e2e] font-montserrat flex overflow-hidden">
        {/* LEFT SIDEBAR 280px #0c0b24 */}
        <aside className="hidden lg:flex w-[230px]  h-[200px] shrink-0 bg-[#0c0b24] flex-col border-r border-white/[0.06] z-30">
          <div className="px-7 pt-7 pb-6 flex items-center gap-3 border-b border-white/[0.06]">
            <img src="/focussia.png" alt="Focusia" className="w-9 h-9 object-contain" />
            <span className="text-[22px] font-bold tracking-tight text-white">Focusia</span>
          </div>
          <nav className="flex-1 px-5 pt-2 flex flex-col relative">
            <div className="absolute left-[45px] top-[20px] bottom-[20px] w-px h-50 bg-gradient-to-b from-[#7c3aed]/40 via-[#7c3aed]/15 to-white/[0.04] pointer-events-none" />
            {customizationSteps.map((step) => {
              const isActive = step.num === 2;
              const isCompleted = step.num < 2;
              return (
                <div key={step.num} className={`relative flex items-center gap-3.5 px-3 py-[11px] rounded-xl mb-1 transition-all ${isActive ? 'bg-white/[0.07] border border-[#6745CC]/30 shadow-sm' : 'border border-transparent'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${isCompleted ? 'bg-[#7c3aed] text-white shadow-md' : isActive ? 'bg-gradient-to-br from-[#5018B1] to-[#6366f1] text-white shadow-[0_0_0_3px_rgba(124,58,237,0.22)]' : 'bg-white/[0.06] border border-white/10 text-white/30'}`}>
                    {isCompleted ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12" /></svg>
                    ) : (
                      step.num
                    )}
                  </div>
                  <span className={`text-[13px] leading-tight font-medium ${isActive ? 'text-white' : isCompleted ? 'text-white/60' : 'text-white/35'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
            <div className="mt-4 mx-1 bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 flex gap-3">
              <div className="">
                <svg className="w-6 h-6 text-[#4020A0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9,12 11,14 15,10" /></svg>
              </div>
              <p className="text-[11.5px] leading-[1.6] text-white/45 m-0">Los canales que elijas determinan cómo y cuándo Focusia puede ayudarte a mantener tu enfoque y avanzar hacia tus objetivos.</p>
            </div>
          </nav>
          <div className="px-5 pb-10 pt-2 mt-auto">
            <div onClick={() => setHelpChatKey('activaciones')} title="Abrir chat de ayuda con IA" className="flex items-center justify-between px-3 py-3 rounded-xl bg-white/[0.04] border border-white/[0.05] hover:bg-white/[0.06] transition-colors group cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="">
                  <img src="/question.png" alt="help" className="w-10 h-10 object-contain" />
                </div>
                <div className="flex flex-col ">
                  <span className="text-[13px] font-medium text-white/85 leading-none">¿Necesitas ayuda?</span>
                  <span className="text-[11px] text-white/35 leading-none mt-1">Te explicamos cada opción</span>
                </div>
              </div>
              <svg className="w-4 h-4 text-white/25 group-hover:text-white/50 transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9,18 15,12 9,6" /></svg>
            </div>
          </div>
          <HelpChat
            open={helpChatKey === 'activaciones'}
            onClose={() => setHelpChatKey(null)}
            pasoLabel={HELP_CONTENT.activaciones.paso}
            titulo={HELP_CONTENT.activaciones.titulo}
            bienvenida={HELP_CONTENT.activaciones.bienvenida}
            contextoAyuda={HELP_CONTENT.activaciones.contexto}
          />
        </aside>

        {/* CENTRAL PHOTO PANEL 360px */}
        <div className="hidden lg:flex w-[230px] h-[700px] shrink-0  relative overflow-hidden flex-col">
          <img
            src={avatarImg6 || '/avatars_ciber/lia (2).jpeg'}
            alt={avatarDisplayName6}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: 'center top' }}
            onError={(e) => { (e.target as HTMLImageElement).src = '/avatars/lia (2).jpeg'; }}
          />
          <div className="absolute inset-0 pointer-events-none"  />
          <div className="absolute top-[12%] right-[14%] w-[2px] h-[2px] bg-white rounded-full shadow-[0_0_8px_1px_rgba(255,255,255,0.9)] opacity-80" />
          <div className="absolute top-[16%] right-[8%] w-[3px] h-[3px] bg-white rounded-full shadow-[0_0_10px_2px_rgba(255,255,255,0.9)] opacity-70" />
            <div className="relative z-10 mt-90 px-10  flex flex-col ">
            <div className="relative bg-[#03021D] w-45 h-40  -mt-20 rounded-md px-2 py-4 pt-2 pb-2 shadow-[0_12px_32px_rgba(155, 16, 219, 0.86)]">
              <div className="absolute -top-[7px] left-7 w-[14px] h-[14px] bg-[#03021D] rotate-45" />
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-[10px] font-extrabold tracking-[0.12em] text-[#9381C9]">{avatarDisplayName6}</span>
              </div>
              <p className="text-[13px] leading-[1.6] text-white font-medium">
                Así podré comunicarme contigo cuando lo necesites, de la forma que prefieras y en el momento adecuado
              </p>
            </div>
             
          </div>
        </div>

        {/* MAIN AREA */}
        <div className="flex-1 flex flex-col min-w-0  relative">
          {/* Mobile photo - visible only on mobile, hidden on desktop where central 360px panel is shown */}
         <div className="lg:hidden bg-[#020216] relative overflow-visible h-[360px] shrink-0">
  <img 
    src={avatarImg6 || '/avatar_lavanda/lia (2).jpeg'} 
    alt={avatarDisplayName6} 
    className="absolute inset-0 w-full h-full object-cover object-top" 
    onError={(e) => { (e.target as HTMLVideoElement).style.display = 'none'; }} 
  />
  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #020216 0%, rgba(2,2,22,0.85) 35%, transparent 70%)' }} />
  
  <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col gap-3 z-10">
    {/* Tarjeta de diálogo */}
    <div className="bg-white rounded-2xl p-4 shadow-xl relative">
      <div className="absolute -top-2 left-6 w-3 h-3 bg-white rotate-45" />
      <h3 className="text-[#7c3aed] font-bold text-sm tracking-wider mb-1">
        {avatarDisplayName6 || 'LÍA'}
      </h3>
      <p className="text-[12px] leading-relaxed text-[#1e1b3a]">
        Así podré comunicarme contigo <span className="text-[#7c3aed] font-semibold">de la forma que prefieras</span> y en el momento adecuado.
      </p>
    </div>
    
  </div>
</div>
          <header className="flex items-center justify-between px-4 lg:px-8 py-4 lg:py-5   bg-[#0f0e2e]/80 backdrop-blur-md sticky top-0 z-20 gap-3 -mt-8">
            <button onClick={() => goTo(5)} className="flex items-center gap-2 text-white/55 hover:text-white text-[13px] lg:text-sm font-medium transition-colors shrink-0 ">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6" /></svg>
              <span className="hidden sm:inline">Volver</span>
            </button>
            <div className="flex items-center gap-2 bg-[#1a1a2e] border border-white/[0.08] px-4 py-1.5 rounded-full shadow-sm shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
              <span className="text-xs font-semibold text-white/85 tracking-wide whitespace-nowrap">Personalización guiada</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-colors">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
              </button>
              <button className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-colors">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col xl:flex-row gap-6 xl:gap-6 p-4 lg:p-8 pb-0">
              <div className="flex-1 min-w-0">
                <h1 className="text-[26px] lg:text-[28px] font-bold tracking-tight text-white leading-tight mb-2">
                  <span className="text-[#8b5cf6] mr-2">2.</span>Tipo de activaciones
                </h1>
                <p className="text-[13.5px] leading-relaxed text-white/45 mb-6">Elige de qué forma quieres que Focusia te ayude a volver a la acción cuando sea necesario.</p>

                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-[13px] rounded-xl px-4 py-3 mb-5">{error}</div>}

                <div className="space-y-3">
                  <div onClick={() => setConfigApp(!configApp)} className={`group flex items-center gap-4 px-5 py-4 rounded-2xl border cursor-pointer transition-all ${configApp ? 'bg-white/[0.06] border-[#8b5cf6]/25 shadow-[0_2px_12px_rgba(139,92,246,0.08)]' : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/10'}`}>
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#7c3aed]/20 to-[#6366f1]/20 border border-[#7c3aed]/15 flex items-center justify-center shrink-0">
                      <img src="/panel.png" alt="" className="w-12 h-12 object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[13.5px] font-semibold text-white leading-tight">Notificaciones dentro de la aplicación</h3>
                      <p className="text-[12px] text-white/40 leading-relaxed mt-0.5">Mensajes visibles únicamente dentro de Focusia.</p>
                    </div>
                    <div className="flex flex-col items-center gap-1 shrink-0 ml-2">
                      <button onClick={(e) => { e.stopPropagation(); setConfigApp(!configApp); }} className={`relative w-[46px] h-[26px] rounded-full transition-colors duration-200 ${configApp ? 'bg-gradient-to-r from-[#7c3aed] to-[#6366f1]' : 'bg-white/15'}`}>
                        <span className={`absolute top-[3px] w-[20px] h-[20px] rounded-full bg-white shadow-md transition-all duration-200 ${configApp ? 'left-[23px]' : 'left-[3px]'}`} />
                      </button>
                      <span className={`text-[11px] font-medium ${configApp ? 'text-[#c4b5fd]' : 'text-white/25'}`}>{configApp ? 'Activado' : 'Desactivado'}</span>
                    </div>
                  </div>

                  <div className={`flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all ${configPush ? 'bg-white/[0.06] border-[#3b82f6]/20' : 'bg-white/[0.03] border-white/[0.06]'}`}>
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#3b82f6]/20 to-[#06b6d4]/20 border border-[#3b82f6]/15 flex items-center justify-center shrink-0">
                      <img src="/ring-1.png" alt="" className="w-16 h-12 object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[13.5px] font-semibold text-white leading-tight">Notificaciones Push</h3>
                      <p className="text-[12px] text-white/40 leading-relaxed mt-0.5">Avisos enviados directamente a tu dispositivo.</p>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 shrink-0 ml-2">
                      <select value="Intensidad moderada" onClick={(e) => e.stopPropagation()} onChange={() => {}} className="bg-[#1D032E] border border-white/10 text-white/80 text-[12px] font-medium rounded-full px-3.5 py-1.5 outline-none focus:border-[#7c3aed]/40 cursor-pointer">
                        <option>Intensidad moderada</option>
                        <option>Solo urgentes</option>
                        <option>Máxima intensidad</option>
                      </select>
                      <span className="text-[11px] font-medium text-[#93c5fd]">Activado</span>
                    </div>
                  </div>

                  <div onClick={() => setConfigWhatsapp(!configWhatsapp)} className={`group flex items-center gap-4 px-5 py-4 rounded-2xl border cursor-pointer transition-all ${configWhatsapp ? 'bg-white/[0.06] border-[#22c55e]/20' : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/10'}`}>
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#22c55e]/20 to-[#16a34a]/20 border border-[#22c55e]/15 flex items-center justify-center shrink-0">
                      <img src="/whatsapp-1.png" alt="" className="w-16 h-12 object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[13.5px] font-semibold text-white leading-tight">Mensajes tipo WhatsApp</h3>
                      <p className="text-[12px] text-white/40 leading-relaxed mt-0.5">Mensajes con formato conversacional para activaciones relevantes.</p>
                    </div>
                    <div className="flex flex-col items-center gap-1 shrink-0 ml-2">
                      <button onClick={(e) => { e.stopPropagation(); setConfigWhatsapp(!configWhatsapp); }} className={`relative w-[46px] h-[26px] rounded-full transition-colors duration-200 ${configWhatsapp ? 'bg-gradient-to-r from-[#22c55e] to-[#16a34a]' : 'bg-white/15'}`}>
                        <span className={`absolute top-[3px] w-[20px] h-[20px] rounded-full bg-white shadow-md transition-all duration-200 ${configWhatsapp ? 'left-[23px]' : 'left-[3px]'}`} />
                      </button>
                      <span className={`text-[11px] font-medium ${configWhatsapp ? 'text-[#86efac]' : 'text-white/25'}`}>{configWhatsapp ? 'Activado' : 'Desactivado'}</span>
                    </div>
                  </div>

                  <div onClick={() => setConfigCalls(!configCalls)} className={`group flex items-center gap-4 px-5 py-4 rounded-2xl border cursor-pointer transition-all ${configCalls ? 'bg-white/[0.06] border-[#f97316]/20' : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/10'}`}>
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#f97316]/20 to-[#ea580c]/20 border border-[#f97316]/15 flex items-center justify-center shrink-0">
                      <img src="/phone-1.png" alt="" className="w-16 h-12 object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[13.5px] font-semibold text-white leading-tight">Llamadas simuladas</h3>
                      <p className="text-[12px] text-white/40 leading-relaxed mt-0.5">Activaciones de alta prioridad para situaciones definidas por ti.</p>
                    </div>
                    <div className="flex flex-col items-center gap-1 shrink-0 ml-2">
                      <button onClick={(e) => { e.stopPropagation(); setConfigCalls(!configCalls); }} className={`relative w-[46px] h-[26px] rounded-full transition-colors duration-200 ${configCalls ? 'bg-gradient-to-r from-[#f97316] to-[#ea580c]' : 'bg-white/15'}`}>
                        <span className={`absolute top-[3px] w-[20px] h-[20px] rounded-full bg-white shadow-md transition-all duration-200 ${configCalls ? 'left-[23px]' : 'left-[3px]'}`} />
                      </button>
                      <span className={`text-[11px] font-medium ${configCalls ? 'text-[#fdba74]' : 'text-white/25'}`}>{configCalls ? 'Activado' : 'Desactivado'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <aside className=" w-[280px] h-[400px] mt-12">
                <div className="relative bg-white/[0.04] border border-white/[0.06] rounded-2xl p-6 pt-7 overflow-hidden">
                  <div className="absolute top-0 right-0 w-[56px] h-[56px] overflow-hidden pointer-events-none">
                    <div className="">
                      <img src="./starGreen-1.png" alt="" className='w-8 h-11 ml-4' />
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 mb-5">
                   
                    <span className="text-[10px] font-bold tracking-[0.12em] text-[#86efac]">CONFIGURACIÓN RECOMENDADA</span>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${configApp ? 'bg-[#572EC7F5]/20 text-[#AE7BDF]' : 'bg-[#974ADE] text-white/20'}`}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d={configApp ? "M5 13l4 4L19 7" : "M5 12h14"} /></svg>
                      </div>
                      <div>
                        <div className="text-[13px] font-medium text-white/85 leading-tight">Notificaciones en app</div>
                        <div className={`text-[11px] mt-0.5 ${configApp ? 'text-[#86efac]' : 'text-white/25'}`}>{configApp ? 'Activadas' : 'Desactivadas'}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-4 h-4 rounded-full bg-[#7622C5]/20 text-[#4ade80] flex items-center justify-center shrink-0 mt-0.5">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <div>
                        <div className="text-[13px] font-medium text-white/85 leading-tight">Notificaciones Push</div>
                        <div className="text-[11px] text-[#86efac] mt-0.5">Intensidad moderada</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${configWhatsapp ? 'bg-[#7622C5]/20 text-[#AE7BDF]' : 'bg-white/10 text-white/20'}`}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d={configWhatsapp ? "M5 13l4 4L19 7" : "M5 12h14"} /></svg>
                      </div>
                      <div>
                        <div className="text-[13px] font-medium text-white/85 leading-tight">Mensajes WhatsApp</div>
                        <div className={`text-[11px] mt-0.5 ${configWhatsapp ? 'text-[#86efac]' : 'text-white/25'}`}>{configWhatsapp ? 'En momentos clave' : 'Desactivados'}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${configCalls ? 'bg-[#22B2C5]/20 text-[#1DBBE2]' : 'bg-white/10 text-white/20'}`}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d={configCalls ? "M5 13l4 4L19 7" : "M5 12h14"} /></svg>
                      </div>
                      <div>
                        <div className="text-[13px] font-medium text-white/85 leading-tight">Llamadas simuladas</div>
                        <div className={`text-[11px] mt-0.5 ${configCalls ? 'text-[#86efac]' : 'text-white/25'}`}>{configCalls ? 'Activadas' : 'Desactivadas'}</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 pt-4 border-t border-white/[0.06] flex gap-2.5">
                    <img src="./bomb2.png" alt="" className='w-9 h-9' />                    <p className="text-[11px] leading-[1.5] text-white/35">Esta configuración te ayudará a mantener el equilibrio ideal entre acompañamiento y enfoque.</p>
                  </div>
                </div>
              </aside>
            </div>

            <div className="mt-1 mx-4 lg:mx-8 mb-6 flex flex-col lg:flex-row items-stretch lg:items-center gap-4 ">
              <div className="flex-1 flex items-center gap-3 bg-[#1a1033]/70 lg:bg-[#0c0b24]/70 border border-white/[0.06] rounded-md lg:rounded-md px-4 py-3 backdrop-blur-sm">
                <div className="w-9 h-9 rounded-xl bg-[#1a1a2e] border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                  <img src="/footer_image.png" alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLVideoElement).style.display = 'none'; }} />
                </div>
                <span className="text-xs font-semibold text-white/70 whitespace-nowrap">Paso 7 de 11</span>
                <div className="flex-1 flex items-center">
                  <div className="relative flex items-center justify-between w-full max-w-[280px] mx-2">
                    <div className="absolute left-0 right-0 top-1/2 h-px bg-white/10 -translate-y-1/2"></div>
                    <div className="relative flex items-center gap-1.5">
                      {Array.from({ length: 11 }, (_, i) => {
                    const n = i + 1;
                    const isCompleted = n < 7;
                    const isCurrent = n === 7;
                    return (
                            <div
                              key={n}
                              className={`relative z-10 w-5 h-5 lg:w-6 lg:h-6 rounded-full flex items-center justify-center shrink-0 ${
                                isCompleted
                                  ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-sm'
                                  : isCurrent
                                  ? 'bg-gradient-to-br from-blue-600 via-indigo-500 to-purple-600 text-white shadow-[0_0_0_3px_rgba(168,85,247,0.25)] ring-2 ring-white/90'
                                  : 'bg-white/15 border border-white/10'
                              }`}
                            >
                              {isCompleted ? (
                                <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                              ) : isCurrent ? (
                                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                              ) : null}
                            </div>
                          );
                  })}
                    </div>
                  </div>
                </div>
              </div>
              <button onClick={handleSaveActivations} disabled={saving} className="w-full lg:w-[260px] h-[48px] rounded-xl bg-gradient-to-r from-[#2563eb] to-[#7c3aed] hover:from-[#1d4ed8] hover:to-[#6d28d9] text-white font-bold text-[13px] tracking-[0.08em] flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(37,99,235,0.35)] hover:shadow-[0_10px_28px_rgba(124,58,237,0.4)] transition-all disabled:opacity-50 shrink-0">
                {saving ? 'Guardando...' : 'CONTINUAR'}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12,5 19,12 12,19" /></svg>
              </button>
            </div>
          </div>
        </div>

      </div>
    );
  }

  // Screen 7: Customize Schedule — polished pixel-perfect (photo: 3. Horarios permitidos, 360px central, Lia calendar, 4 cards, Paso 8 de 11)
  if (screen === 7) {
    const avatarName7 = avatar?.name || profile?.avatar_name || 'Lía';
    const avatarDisplayName7 = avatarName7.toLowerCase() === 'lia' ? 'LÍA' : avatarName7.toUpperCase();
    const avatarLavandaMap7: Record<string, string> = {
      ashley: '/Avatar_Schedule/Ashley.jpeg',
      conrad: '/Avatar_Schedule/Conrad.jpeg',
      john: '/Avatar_Schedule/john.jpeg',
      lia: '/Avatar_Schedule/Lia (1).jpeg',
      monroe: '/Avatar_Schedule/Monroe.jpeg',
      sophya: '/Avatar_Schedule/Sophya.jpeg',
    };
    const avatarLavandaImg7 = avatarName7
      ? (avatarLavandaMap7[avatarName7.toLowerCase()] || AVATARS.find(a => a.name.toLowerCase() === avatarName7.toLowerCase())?.file || '/Avatar_Schedule/lia (2).jpeg')
      : '/Avatar_Schedule/lia (1).jpeg';

       const customizationSteps = [
      { num: 1, label: 'Intensidad del acompañamiento' },
      { num: 2, label: 'Tipo de activaciones' },
      { num: 3, label: 'Horarios permitidos' },
      { num: 4, label: 'Tono del avatar' },
    ];

    const scheduleCards = [
      {
        value: 'todo_el_dia',
        label: 'Todo el día',
        desc: 'Focusia puede intervenir durante toda la jornada activa del usuario.',
        imgSrc: './sunBlue.png',
      },
      {
        value: 'horario_laboral',
        label: 'Solo horario laboral',
        desc: 'Focusia interviene únicamente dentro del horario de trabajo definido por el usuario.',
        imgSrc: '/corporative.png',
      },
      {
        value: 'manana_tarde',
        label: 'Mañana y tarde',
        desc: 'Focusia interviene en bloques principales del día, evitando noche, descanso o madrugada.',
        recommended: true,
        imgSrc: '/sunRelax.png',
      },
      {
        value: 'personalizado',
        label: 'Personalizado',
        desc: 'El usuario define manualmente sus horarios permitidos.',
        imgSrc: '/clockBlue.png',
      },
    ];

    return (
      <div className="min-h-screen bg-[#0f0e2e] font-montserrat flex overflow-hidden">
        <style>{` 
          .s7-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
          .s7-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 999px; }
          @media (max-width: 1023px) {
            .s7-main-pad { padding-bottom: 88px; }
          }
        `}</style>

        {/* LEFT SIDEBAR 264px — steps + LÍA speech + Tú tienes el control + help */}
        <aside className="hidden lg:flex w-[230px]  h-[200px] shrink-0 bg-[#0c0b24] flex-col border-r border-white/[0.06] z-30">
          <div className="px-7 pt-7 pb-6 flex items-center gap-3">
            <img src="/focussia.png" alt="Focusia" className="w-9 h-9 object-contain" />
            <span className="text-[22px] font-bold tracking-tight text-white">Focusia</span>
          </div>
          <nav className="flex-1 px-5 pt-2 flex flex-col relative">
            <div className="absolute left-[45px] top-[20px] bottom-[20px] w-px h-50 bg-gradient-to-b from-[#7c3aed]/40 via-[#7c3aed]/15 to-white/[0.04] pointer-events-none" />
            {customizationSteps.map((step) => {
              const isActive = step.num === 3;
              const isCompleted = step.num < 3;
              return (
                <div key={step.num} className={`relative flex items-center gap-3.5 px-3 py-[11px] rounded-xl mb-1 transition-all ${isActive ? 'bg-white/[0.07] border border-[#6745CC]/30 shadow-sm' : 'border border-transparent'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${isCompleted ? 'bg-[#7c3aed] text-white shadow-md' : isActive ? 'bg-gradient-to-br from-[#5018B1] to-[#6366f1] text-white shadow-[0_0_0_3px_rgba(124,58,237,0.22)]' : 'bg-white/[0.06] border border-white/10 text-white/30'}`}>
                    {isCompleted ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12" /></svg>
                    ) : (
                      step.num
                    )}
                  </div>
                  <span className={`text-[13px] leading-tight font-medium ${isActive ? 'text-white' : isCompleted ? 'text-white/60' : 'text-white/35'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
            <div className="mt-4 mx-1 bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 flex gap-3">
              <div className="">
                <svg className="w-6 h-6 text-[#4020A0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9,12 11,14 15,10" /></svg>
              </div>
              <p className="text-[11.5px] leading-[1.6] text-white/45 m-0">Esta pantalla protege tu experiencia y evita que Focusia moleste en momentos inadecuados. Fuera de los horarios permitidos no interrumpirá.</p>
            </div>
          </nav>
          <div className="px-5 pb-10 pt-2 mt-auto">
            <div onClick={() => setHelpChatKey('horarios')} title="Abrir chat de ayuda con IA" className="flex items-center justify-between px-3 py-3 rounded-xl bg-white/[0.04] border border-white/[0.05] hover:bg-white/[0.06] transition-colors group cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="">
                  <img src="/question.png" alt="help" className="w-10 h-10 object-contain" />
                </div>
                <div className="flex flex-col ">
                  <span className="text-[13px] font-medium text-white/85 leading-none">¿Necesitas ayuda?</span>
                  <span className="text-[11px] text-white/35 leading-none mt-1">Te explicamos cada opción</span>
                </div>
              </div>
              <svg className="w-4 h-4 text-white/25 group-hover:text-white/50 transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9,18 15,12 9,6" /></svg>
            </div>
          </div>
          <HelpChat
            open={helpChatKey === 'horarios'}
            onClose={() => setHelpChatKey(null)}
            pasoLabel={HELP_CONTENT.horarios.paso}
            titulo={HELP_CONTENT.horarios.titulo}
            bienvenida={HELP_CONTENT.horarios.bienvenida}
            contextoAyuda={HELP_CONTENT.horarios.contexto}
          />
        </aside>

        {/* CENTRAL PHOTO PANEL 360px — avatar_lavanda, spech bubble lower third, purple calendar/clock icon bottom center */}
        <div className="hidden lg:flex w-[250px] shrink-0 relative overflow-hidden flex-col bg-[#08071f]">
          <img
            src={avatarLavandaImg7}
            alt={avatarDisplayName7}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: 'center top' }}
            onError={(e) => { (e.target as HTMLImageElement).src = '/Avatar_Schedule/Lia (1).jpeg'; }}
          />
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, #0c0b24 0%, rgba(12,11,36,0.92) 18%, rgba(12,11,36,0.55) 32%, rgba(12,11,36,0.15) 52%, transparent 68%)' }} />
          <div className="absolute top-[10%] right-[14%] w-[2px] h-[2px] bg-white rounded-full shadow-[0_0_8px_1px_rgba(255,255,255,0.9)] opacity-80" />
          <div className="absolute top-[13%] right-[9%] w-[3px] h-[3px] bg-white rounded-full shadow-[0_0_10px_2px_rgba(255,255,255,0.9)] opacity-70" />
          <div className="absolute top-[9%] left-[14%] w-[2px] h-[2px] bg-white rounded-full shadow-[0_0_8px_1px_rgba(255,255,255,0.8)] opacity-60" />

          {/* Speech bubble at lower third */}
          <div className="relative z-10 mt-80 mx-5 mb-[88px] flex flex-col">
            <div className="relative bg-[#1e1b3a] rounded-xl px-5 py-5 shadow-[0_12px_32px_rgba(0, 0, 0, 0.32)]">
              <div className="absolute -top-[7px] left-7 w-[14px] h-[14px] bg-[#1e1b3a] rotate-45" />
              <p className="text-[10px] font-extrabold tracking-[0.13em] text-[#7c3aed] mb-2">{avatarDisplayName7}</p>
              <p className="text-[13px] leading-[1.6] text-white">Establecer límites <span className="text-white ">también es parte del equilibrio.</span></p>
              <p className="text-[11.5px] leading-[1.55] text-white mt-2">Cuando tú defines tus horarios, Focusia respeta tus espacios de descanso.</p>
            </div>
          </div>

          
          
        </div>

        {/* MAIN COLUMN */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0f0e2e] relative">
          {/* Top nav — single header */}
          <header className="flex items-center justify-between px-4 lg:px-8 py-4 lg:py-5 bg-[#0f0e2e]/80 backdrop-blur-md sticky top-0 z-20 gap-3 border-b border-white/[0.06] lg:border-transparent">
            <button onClick={() => goTo(6)} className="flex items-center gap-2 text-white/60 hover:text-white text-[13px] lg:text-sm font-medium transition-colors shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6"/></svg>
              <span>Volver</span>
            </button>
            <div className="flex items-center gap-2 bg-[#1a1a2e] border border-white/[0.08] px-4 py-1.5 rounded-full shadow-sm shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              <span className="text-xs font-semibold text-white/85 tracking-wide whitespace-nowrap">Personalización guiada</span>
            </div>
            <div className="hidden lg:flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/40">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
            </div>
            <div className="lg:hidden w-8" />
          </header>

          {/* Mobile photo — visible only on mobile */}
          <div className="lg:hidden bg-[#020216] relative overflow-hidden h-[360px] shrink-0">
            <img
              src={avatarLavandaImg7}
              alt={avatarDisplayName7}
              className="absolute inset-0 w-full h-full object-cover object-top"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #020216 0%, rgba(2,2,22,0.85) 35%, transparent 70%)' }} />
            <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col gap-3 z-10">
              <div className="bg-[#1e1b3a] rounded-2xl p-4 shadow-xl relative">
                <div className="absolute -top-2 left-6 w-3 h-3 bg-[#1e1b3a] rotate-45" />
                <h3 className="text-[#7c3aed] font-bold text-sm tracking-wider mb-1">{avatarDisplayName7 || 'LÍA'}</h3>
                <p className="text-[12px] leading-relaxed text-white">Establecer límites <span className="text-white font-semibold">también es parte del equilibrio.</span></p>
              </div>
              <div className="flex justify-center">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#6366f1] flex items-center justify-center shadow-[0_6px_16px_rgba(124,58,237,0.4)] border border-white/20">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><circle cx="12" cy="15" r="3.2"/><polyline points="12 15 12 12.7 13.6 13.9"/></svg>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto s7-scrollbar s7-main-pad">
            <div className="flex flex-col xl:flex-row gap-6 xl:gap-6 p-4 lg:p-8 pb-0">
              {/* Main content — 4 cards */}
              <div className="flex-1 min-w-0">
                <h1 className="text-[26px] lg:text-[28px] font-bold tracking-tight text-white leading-tight mb-2">
                  <span className="text-[#8b5cf6] mr-2">3.</span>Horarios permitidos
                </h1>
                <p className="text-[13.5px] leading-relaxed text-white/45 mb-6">Define en qué horarios Focusia puede acompañarte con recordatorios, mensajes o activaciones. Fuera de estos horarios, el sistema no interrumpirá.</p>

                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-[13px] rounded-xl px-4 py-3 mb-5">{error}</div>}

                <div className="space-y-3">
                  {scheduleCards.map((opt) => {
                    const isSelected = configSchedule === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setConfigSchedule(opt.value)}
                        className={`w-full text-left flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all relative overflow-hidden ${
                          isSelected
                            ? 'bg-white/[0.06] border-[#8b5cf6]/40 shadow-[0_2px_16px_rgba(139,92,246,0.15)]'
                            : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.05] hover:border-white/10'
                        }`}
                      >
                        <div className="  flex items-center justify-center shrink-0 overflow-hidden">
                          <img src={opt.imgSrc} alt={opt.label} className="w-10 h-12 object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-[13.5px] font-semibold text-white leading-tight">{opt.label}</h3>
                            {opt.recommended && (
                              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-[#2563eb] to-[#7c3aed] text-white text-[10px] font-bold tracking-wide whitespace-nowrap">RECOMENDADO</span>
                            )}
                          </div>
                          <p className="text-[12px] text-white/60 leading-relaxed mt-0.5">{opt.desc}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'bg-[#8b5cf6]/20 border-[#8b5cf6]' : 'bg-white/10 border-white/20'}`}>
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {configSchedule === 'personalizado' && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5">
                    <div>
                      <label className="block text-xs font-semibold tracking-wide text-white/60 mb-2">Desde</label>
                      <input
                        type="time"
                        value={configScheduleStart}
                        onChange={e => setConfigScheduleStart(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#0c0b24] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#7c3aed]/50 focus:ring-2 focus:ring-[#7c3aed]/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold tracking-wide text-white/60 mb-2">Hasta</label>
                      <input
                        type="time"
                        value={configScheduleEnd}
                        onChange={e => setConfigScheduleEnd(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#0c0b24] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#7c3aed]/50 focus:ring-2 focus:ring-[#7c3aed]/20 transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT PANEL 280px — detalle dinámico según tab seleccionado */}
              <aside className="w-[280px] shrink-0 mt-12">
                <div key={configSchedule} className="relative bg-white/[0.04] border border-white/[0.06] rounded-xl p-6 pt-7 overflow-hidden transition-all duration-300">
                  <div className="absolute top-0 right-0 w-[56px] h-[56px] overflow-hidden pointer-events-none">
                    <div className="" />
                     <img src="./member.png" alt="" className='w-8 h-10 ml-5' />
                  </div>
                  <p className="text-[11px] font-semibold tracking-[0.14em] text-white mb-4">CONFIGURACIÓN RECOMENDADA</p>
                  <div className="flex items-center gap-3 mb-5">
                    <div key={`icon-${configSchedule}`} className="w-12 h-12 rounded-xl bg-[#7c3aed]/15 border border-[#7c3aed]/20 flex items-center justify-center shrink-0 overflow-hidden">
                      <img src={(scheduleCards.find((o) => o.value === configSchedule)?.imgSrc) || '/sunRelax.png'} alt="" className="w-9 h-9 object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-white leading-tight">
                        {configSchedule === 'todo_el_dia' ? 'Todo el día' : configSchedule === 'horario_laboral' ? 'Solo horario laboral' : configSchedule === 'personalizado' ? 'Horario personalizado' : 'Mañana y tarde'}
                      </p>
                      <p className="text-[11px] text-white/40">
                        {configSchedule === 'manana_tarde' ? 'Recomendado para ti' : configSchedule === 'todo_el_dia' ? 'Cobertura total activa' : configSchedule === 'horario_laboral' ? 'Lunes a viernes' : 'Definido por ti'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {configSchedule === 'manana_tarde' && (
                      <>
                        <div className="bg-white/[0.05] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#0ea5e9]/15 border border-[#0ea5e9]/20 flex items-center justify-center shrink-0">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold tracking-wide text-white/50 leading-none">MAÑANA</p>
                            <p className="text-[13px] font-bold text-white mt-1">08:00 – 12:30</p>
                          </div>
                        </div>
                        <div className="bg-white/[0.05] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#f59e0b]/15 border border-[#f59e0b]/20 flex items-center justify-center shrink-0">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold tracking-wide text-white/50 leading-none">TARDE</p>
                            <p className="text-[13px] font-bold text-white mt-1">14:30 – 20:30</p>
                          </div>
                        </div>
                        <div className="bg-white/[0.05] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold tracking-wide text-white/50 leading-none">PAUSA NOCTURNA</p>
                            <p className="text-[13px] font-bold text-white mt-1">20:30 – 08:00 sin interrupciones</p>
                          </div>
                        </div>
                      </>
                    )}
                    {configSchedule === 'todo_el_dia' && (
                      <>
                        <div className="bg-white/[0.05] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#0ea5e9]/15 border border-[#0ea5e9]/20 flex items-center justify-center shrink-0">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold tracking-wide text-white/50 leading-none">JORNADA ACTIVA</p>
                            <p className="text-[13px] font-bold text-white mt-1">07:00 – 22:00</p>
                          </div>
                        </div>
                        <div className="bg-white/[0.05] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold tracking-wide text-white/50 leading-none">DESCANSO</p>
                            <p className="text-[13px] font-bold text-white mt-1">22:00 – 07:00 silenciado</p>
                          </div>
                        </div>
                      </>
                    )}
                    {configSchedule === 'horario_laboral' && (
                      <>
                        <div className="bg-white/[0.05] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#38bdf8]/15 border border-[#38bdf8]/20 flex items-center justify-center shrink-0">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold tracking-wide text-white/50 leading-none">LABORAL</p>
                            <p className="text-[13px] font-bold text-white mt-1">09:00 – 18:00</p>
                          </div>
                        </div>
                        <div className="bg-white/[0.05] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold tracking-wide text-white/50 leading-none">FIN DE SEMANA</p>
                            <p className="text-[13px] font-bold text-white mt-1">Sin activaciones</p>
                          </div>
                        </div>
                      </>
                    )}
                    {configSchedule === 'personalizado' && (
                      <>
                        <div className="bg-[#7c3aed]/10 border border-[#7c3aed]/25 rounded-xl px-4 py-3 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#7c3aed]/20 border border-[#7c3aed]/30 flex items-center justify-center shrink-0">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold tracking-wide text-white/50 leading-none">TU BLOQUE</p>
                            <p className="text-[13px] font-bold text-white mt-1">{configScheduleStart || '07:00'} – {configScheduleEnd || '15:00'}</p>
                          </div>
                        </div>
                        <p className="text-[11px] leading-[1.5] text-white/40 px-1">Ajusta las horas con los selectores de la izquierda. El panel se actualiza al instante.</p>
                      </>
                    )}
                  </div>

                  <div className="mt-5 pt-4 border-t border-white/[0.06] flex gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#7c3aed]/10 border border-[#7c3aed]/15 flex items-center justify-center shrink-0 mt-0.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9,12 11,14 15,10"/></svg>
                    </div>
                    <p className="text-[11px] leading-[1.55] text-white/40">
                      {configSchedule === 'manana_tarde' && 'Esta franja mantiene un equilibrio entre acompañamiento constante y descanso. Puedes cambiarla cuando quieras.'}
                      {configSchedule === 'todo_el_dia' && 'Cobertura máxima durante tu jornada activa. Focusia evita la madrugada para proteger tu descanso.'}
                      {configSchedule === 'horario_laboral' && 'Ideal si quieres separar trabajo y vida personal. Fuera del horario laboral no recibirás activaciones.'}
                      {configSchedule === 'personalizado' && 'Tú tienes el control total. Focusia solo intervendrá dentro del bloque que definas.'}
                    </p>
                  </div>
                </div>
              </aside>
            </div>

            {/* Footer — Paso 8 de 11 + CONTINUAR */}
            <div className="mt-6 lg:mt-8 mx-4 lg:mx-8 mb-6 flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
              <div className="flex-1 flex items-center gap-3 bg-[#1a1033]/70 lg:bg-[#0c0b24]/70 border border-white/[0.06] rounded-xl lg:rounded-xl px-4 py-3 backdrop-blur-sm min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#1a1a2e] border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                  <img src="/footer_image.png" alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
                <span className="text-xs font-semibold text-white/70 whitespace-nowrap">Paso 8 de 11</span>
                <div className="hidden sm:flex flex-1 items-center gap-[6px] ml-2 max-w-[420px]">
                  {Array.from({ length: 11 }, (_, i) => {
                    const n = i + 1;
                    const isCompleted = n <= 7;
                    const isCurrent = n === 8;
                    if (isCompleted) {
                      return <button key={n} onClick={() => goToPaso(n)} title={`Ir al paso ${n} de 11`} aria-label={`Ir al paso ${n} de 11`} className="w-6 h-6 rounded-full bg-gradient-to-br from-[#2563eb] to-[#7c3aed] flex items-center justify-center shrink-0 shadow-sm cursor-pointer hover:scale-110 transition-transform"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg></button>;
                    }
                    if (isCurrent) {
                      return <button key={n} onClick={() => goToPaso(n)} title={`Ir al paso ${n} de 11`} aria-label={`Ir al paso ${n} de 11`} className="w-6 h-6 rounded-full bg-gradient-to-br from-[#2563eb] to-[#7c3aed] flex items-center justify-center shrink-0 shadow-[0_0_0_3px_rgba(124,58,237,0.3)] ring-2 ring-white/90 cursor-pointer hover:scale-110 transition-transform"><div className="w-2 h-2 bg-white rounded-full" /></button>;
                    }
                    return <button key={n} onClick={() => goToPaso(n)} title={`Ir al paso ${n} de 11`} aria-label={`Ir al paso ${n} de 11`} className="w-6 h-6 rounded-full bg-white/10 border border-white/10 shrink-0 cursor-pointer hover:scale-110 hover:border-white/40 transition-transform" />;
                  })}
                </div>
                <div className="flex sm:hidden flex-1 items-center gap-1.5 ml-2">
                  {Array.from({ length: 11 }, (_, i) => {
                    const n = i + 1;
                    const isCompleted = n <= 7;
                    const isCurrent = n === 8;
                    if (isCompleted) return <button key={n} onClick={() => goToPaso(n)} title={`Ir al paso ${n} de 11`} aria-label={`Ir al paso ${n} de 11`} className="w-3 h-3 rounded-full bg-[#7c3aed] shrink-0 cursor-pointer hover:scale-125 transition-transform" />;
                    if (isCurrent) return <button key={n} onClick={() => goToPaso(n)} title={`Ir al paso ${n} de 11`} aria-label={`Ir al paso ${n} de 11`} className="w-3 h-3 rounded-full bg-[#7c3aed] ring-2 ring-white/70 shrink-0 cursor-pointer hover:scale-125 transition-transform" />;
                    return <button key={n} onClick={() => goToPaso(n)} title={`Ir al paso ${n} de 11`} aria-label={`Ir al paso ${n} de 11`} className="w-3 h-3 rounded-full bg-white/15 shrink-0 cursor-pointer hover:scale-125 transition-transform" />;
                  })}
                </div>
              </div>
              <button
                onClick={handleSaveSchedule}
                disabled={saving}
                className="w-full lg:w-[260px] h-[48px] rounded-xl bg-gradient-to-r from-[#2563eb] to-[#7c3aed] hover:from-[#1d4ed8] hover:to-[#6d28d9] text-white font-bold text-[13px] tracking-[0.08em] flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(37,99,235,0.35)] hover:shadow-[0_10px_28px_rgba(124,58,237,0.4)] transition-all disabled:opacity-50 shrink-0 cursor-pointer"
              >
                {saving ? 'Guardando...' : 'CONTINUAR'}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Screen 8: Customize Tone — pixel-faithful to photo (dark navy, 4 tones)
  if (screen === 8) {
    const avatarName8 = avatar?.name || profile?.avatar_name || 'Lía';
    const avatarDisplayName8 = avatarName8.toLowerCase() === 'lia' ? 'LÍA' : avatarName8.toUpperCase();
    const avatarMap8: Record<string, string> = {
      ashley: '/Avatars_tone/Ashley.jpeg',
      conrad: '/Avatars_tone/Conrad.jpeg',
      john: '/Avatars_tone/John(2).jpeg',
      lia: '/Avatars_tone/Lia(3).jpeg',
      monroe: '/Avatars_tone/Monroe(2).jpeg',
      sophya: '/Avatars_tone/Sophya (2).jpeg',
    };
    const avatarImg8 = avatarMap8[avatarName8.toLowerCase()] || AVATARS.find(a => a.name.toLowerCase() === avatarName8.toLowerCase())?.file || '/avatar_lavanda/lia (2).jpeg';

    const toneOptions = [
      {
        id: 'cercano_motivador',
        label: 'CERCANO Y MOTIVADOR',
        desc: 'Mensajes positivos y alentadores que te impulsan a avanzar con energía y confianza.',
        color: '#22c55e',
        bg: '#061e1a',
        border: 'border-[#22c55e]/25',
        iconBg: 'bg-[#0a2e1f] border-[#22c55e]/40',
        textColor: 'text-[#22c55e]',
        dots: 'green' as const,
      },
      {
        id: 'claro_estrategico',
        label: 'CLARO Y ESTRATÉGICO',
        desc: 'Mensajes directos, organizados y orientados a la toma de decisiones efectivas.',
        color: '#3b82f6',
        bg: '#0a162e',
        border: 'border-[#3b82f6]/25',
        iconBg: 'bg-[#0f1f3a] border-[#3b82f6]/40',
        textColor: 'text-[#3b82f6]',
        dots: 'blue' as const,
      },
      {
        id: 'firme_exigente',
        label: 'FIRME Y EXIGENTE',
        desc: 'Mensajes con mayor nivel de compromiso y presión estratégica para mantener el foco en tus objetivos.',
        color: '#f97316',
        bg: '#1a1208',
        border: 'border-[#f97316]/25',
        iconBg: 'bg-[#2a1a08] border-[#f97316]/40',
        textColor: 'text-[#f97316]',
        dots: 'orange' as const,
      },
      {
        id: 'adaptativo',
        label: 'ADAPTATIVO',
        desc: 'El sistema ajusta automáticamente el tono según tu comportamiento y evolución.',
        color: '#a78bfa',
        bg: '#130f2a',
        border: 'border-[#8b5cf6]/40',
        iconBg: 'bg-[#1e1238] border-[#8b5cf6]/40',
        textColor: 'text-[#a78bfa]',
        dots: 'purple' as const,
        recommended: true,
      },
    ];

    const ToneDots = ({ variant }: { variant: 'green' | 'blue' | 'orange' | 'purple' }) => {
      const map: Record<string, string> = {
        green: 'bg-[#22c55e]',
        blue: 'bg-[#3b82f6]',
        orange: 'bg-[#f97316]',
        purple: 'bg-[#a78bfa]',
      };
      const active = map[variant];
      return (
        <div className="flex items-center gap-[6px] justify-center bg-black/25 rounded-md px-3 py-2 border border-white/[0.04]">
          {[0,1,2,3].map(i => <span key={i} className={`w-[7px] h-[7px] rounded-full ${active} ${i===3 ? 'shadow-[0_0_8px_currentColor] w-[9px] h-[9px]' : ''}`} style={i===3?{boxShadow:`0 0 8px ${variant==='green'?'#22c55e':variant==='blue'?'#3b82f6':variant==='orange'?'#f97316':'#a78bfa'}`}:undefined} />)}
          {[0,1,2].map(i => <span key={`dim-${i}`} className="w-[7px] h-[7px] rounded-full bg-white/10" />)}
        </div>
      );
    };

    return (
      <div className="min-h-screen bg-[#020214] font-montserrat flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT SIDEBAR */}
        <aside className="hidden lg:flex fixed left-0 top-0 h-full w-[240px] bg-[#07071a] border-r border-white/[0.06] z-50 flex-col">
          <div className="px-6 pt-6 pb-5 flex items-center gap-3">
            <img src="/focussia.png" alt="Focusia" className="w-8 h-8 object-contain" />
            <span className="text-[22px] font-bold text-white tracking-tight">Focusia</span>
          </div>
          <nav className="flex-1 px-4 pt-2 flex flex-col gap-0 relative">
            <div className="absolute left-[40px] top-[16px] bottom-[40px] w-px bg-white/[0.08]" />
            {[
              { num: 1, label: 'Intensidad del acompañamiento', done: true },
              { num: 2, label: 'Tipo de activaciones', done: true },
              { num: 3, label: 'Horarios permitidos', done: true },
              { num: 4, label: 'Tono del avatar', done: false, active: true },
            ].map(s => (
              <div key={s.num} className="flex items-center gap-3 px-2 py-3 relative">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 relative z-10 ${s.active ? 'bg-[#7c3aed] text-white shadow-[0_0_12px_rgba(124,58,237,0.6)] ring-4 ring-[#7c3aed]/20' : s.done ? 'bg-[#7c3aed] text-white' : 'bg-[#0f0f2a] border border-white/15 text-white/40'}`}>
                  {s.done ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg> : s.num}
                </div>
                <span className={`text-[13px] leading-tight whitespace-pre-line ${s.active ? 'text-white font-semibold' : s.done ? 'text-white/60' : 'text-white/35'}`}>{s.label}</span>
              </div>
            ))}
          </nav>
          <div className="px-4 pb-4">
            <div className="bg-[#0b0b1e] border border-white/[0.07] rounded-xl p-4 flex gap-3">
              <svg className="w-5 h-5 text-[#7c3aed] shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9,12 11,14 15,10" /></svg>
              <p className="text-[11.5px] leading-[1.6] text-white/45 m-0"><span className="text-[#a78bfa] font-medium">El tono de tu avatar</span> influye en la forma en que recibirás mensajes, sugerencias y recordatorios. El sistema podrá adaptarse a ti para acompañarte mejor.</p>
            </div>
          </div>
          <div className="px-4 pb-6">
            <button onClick={() => setHelpChatKey('tono')} title="Abrir chat de ayuda con IA" className="w-full flex items-center justify-between px-3 py-3 rounded-xl bg-white/[0.04] border border-white/[0.05] hover:bg-white/[0.07] transition-colors text-left cursor-pointer">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-[#7c3aed]/20 border border-[#7c3aed]/30 flex items-center justify-center shrink-0"><span className="text-[#a78bfa] text-sm font-bold">?</span></div>
                <div className="flex flex-col"><span className="text-[13px] font-medium text-white/80 leading-none">¿Necesitas ayuda?</span><span className="text-[11px] text-white/35 leading-none mt-1">Te explicamos cada opción</span></div>
              </div>
              <svg className="w-4 h-4 text-white/20 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9,18 15,12 9,6" /></svg>
            </button>
          </div>
          <HelpChat
            open={helpChatKey === 'tono'}
            onClose={() => setHelpChatKey(null)}
            pasoLabel={HELP_CONTENT.tono.paso}
            titulo={HELP_CONTENT.tono.titulo}
            bienvenida={HELP_CONTENT.tono.bienvenida}
            contextoAyuda={HELP_CONTENT.tono.contexto}
          />
        </aside>

        {/* CENTER AVATAR PANEL */}
        <div className="hidden lg:flex fixed left-[240px] top-0 h-full w-[250px] shrink-0 overflow-hidden flex-col bg-[#0a0a2a] border-r border-white/[0.06]">
          <img src={avatarImg8} alt={avatarDisplayName8} className="absolute inset-0 w-full h-full object-cover object-top" style={{ objectPosition: 'center top' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1aff]/15 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[200px] h-[200px] bg-[#4f46e5]/15 blur-[50px] rounded-full pointer-events-none" />
          <div className="absolute inset-0 pointer-events-none" />
          <div className="relative z-10 mt-50 px-4 pb-6 flex flex-col gap-5 w-[200px]">
            <div className="rounded-xl bg-[#0e0e28]/90 backdrop-blur-xl border border-white/[0.08] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
              <h3 className="text-[12px] font-extrabold tracking-[0.14em] text-[#a78bfa] mb-3">{avatarDisplayName8}</h3>
              <p className="text-[10px] leading-[1.6] text-white/80">El tono define cómo me comunicaré contigo en tu día a día. Elige el estilo que mejor se adapta a tu personalidad y objetivos.</p>
              <p className="text-[10px] leading-[1.6] text-[#a78bfa] font-semibold mt-3">Siempre podrás cambiarlo cuando quieras.</p>
            </div>
            {/* wave */}
           
          </div>
        </div>

        {/* MAIN */}
        <div className="flex-1 lg:pl-[540px] min-h-screen flex flex-col bg-[#020214] w-full">
          <header className="h-[64px] flex items-center justify-between px-6 border-b border-white/[0.06] bg-[#08081e] sticky top-0 z-30 shrink-0">
            <button onClick={() => goTo(7)} className="flex items-center gap-2 text-white/70 hover:text-white text-sm font-medium transition-colors">
              <span className="w-8 h-8 rounded-full border border-white/10 bg-white/[0.04] flex items-center justify-center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15,18 9,12 15,6" /></svg></span>
              Volver
            </button>
            <div className="hidden md:flex items-center gap-2 bg-white/[0.06] border border-white/10 px-4 py-2 rounded-full">
              <svg className="w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
              <span className="text-sm font-medium text-white/80">Personalización guiada</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="w-9 h-9 rounded-full border border-white/10 bg-white/[0.04] flex items-center justify-center text-white/60 hover:text-white"><span className="text-sm font-bold">?</span></button>
              <button className="w-9 h-9 rounded-full border border-white/10 bg-white/[0.04] flex items-center justify-center text-white/60 hover:text-white"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg></button>
            </div>
          </header>

          <main className="flex-1 px-6 lg:px-8 py-8 flex flex-col">
            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg p-3 mb-6">{error}</div>}

            <div className="mb-8 flex items-start gap-4">
              <span className="text-[36px] font-bold text-[#8b5cf6] leading-none">4.</span>
              <div>
                <h1 className="text-[28px] lg:text-[34px] font-bold text-white tracking-tight leading-tight">Tono del avatar</h1>
                <p className="text-[14px] text-white/55 mt-2">Elige el estilo con que tu avatar te acompañará.</p>
                <p className="text-[14px] text-[#a78bfa]">Podrás modificarlo cuando quieras.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5">
              {toneOptions.map(opt => {
                const isSelected = configTone === opt.id;
                return (
                  <button key={opt.id} onClick={() => setConfigTone(opt.id)} className="group relative flex flex-col items-center text-left">
                    {opt.recommended && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                        <div className="bg-gradient-to-r from-[#2563eb] to-[#7c3aed] text-white text-[10px] font-extrabold px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-[0_4px_20px_rgba(124,58,237,0.5)] border border-white/20 tracking-wider whitespace-nowrap">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                          RECOMENDADO
                        </div>
                      </div>
                    )}
                    <div className={`w-full rounded-xl p-[1px] transition-all duration-300 ${isSelected ? (opt.id==='adaptativo' ? 'bg-gradient-to-b from-[#6366f1] via-[#8b5cf6] to-[#7c3aed] shadow-[0_0_32px_rgba(124,58,237,0.45)]' : `shadow-[0_0_24px_${opt.color}30]` ) : 'bg-white/[0.06] group-hover:bg-white/[0.10]'}`} style={isSelected && opt.id!=='adaptativo' ? { background: `linear-gradient(to bottom, ${opt.color}60, ${opt.color}20)` } : undefined}>
                      <div className={`w-full rounded-xl flex flex-col items-center text-center px-5 py-7 h-[380px] ${opt.id==='adaptativo' && isSelected ? 'bg-[#130f2a]' : isSelected ? '' : 'bg-[#0a0f1e]'}`} style={isSelected && opt.id!=='adaptativo' ? { background: opt.bg } : opt.id==='adaptativo' && isSelected ? undefined : { background: '#0a0f1e' }}>
                        <div className={`w-[84px] h-[84px] rounded-full flex items-center justify-center mb-4 border shadow-[0_0_20px_rgba(0,0,0,0.3)] ${opt.iconBg} ${opt.recommended && isSelected ? 'mt-2' : ''}`}>
                          {opt.id === 'cercano_motivador' && (
                            <img src="./smile.png" alt=""  className='w-20 h-20 flex items-center justify-center' />
                          )}
                          {opt.id === 'claro_estrategico' && (
                            <img src="./archer.png" alt=""  className='w-20 h-20 flex items-center justify-center' />
                          )}
                          {opt.id === 'firme_exigente' && (
                            <img src="./safeOrange.png" alt=""  className='w-10 h-15 flex items-center justify-center' />
                          )}
                          {opt.id === 'adaptativo' && (
                            <img src="./stars.png" alt="" className='w-15 h-15 flex items-center justify-center' />
                          )}
                        </div>
                        <h2 className={`text-[15px] font-extrabold tracking-[0.06em] whitespace-pre-line leading-tight mb-3 ${opt.textColor}`}>{opt.label}</h2>
                        <p className="text-[12.5px] leading-[1.6] text-white/65 flex-1 whitespace-pre-line">{opt.desc}</p>
                        <div className="w-full mt-5 flex justify-center">
                          <ToneDots variant={opt.dots} />
                        </div>
                      </div>
                    </div>
                    <div className={`mt-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'shadow-[0_0_10px_rgba(0,0,0,0.4)]' : 'border-white/15 group-hover:border-white/30'}`} style={isSelected ? { borderColor: opt.color, background: `${opt.color}20` } : undefined}>
                      {isSelected && <div className="w-2.5 h-2.5 rounded-full" style={{ background: opt.color }} />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Info bar */}
            <div className="mt-6 flex items-center gap-3 bg-[#0c0c24] border border-white/[0.06] rounded-xl px-5 py-4">
              <div className="w-10 h-10 rounded-xl bg-[#1e1b4b] flex items-center justify-center shrink-0">
                  <img src="./brain.png" alt="" />
              </div>
              <p className="text-[13px] leading-[1.5] text-white/70">Focusia aprenderá contigo y ajustará su comunicación para acompañarte de la mejor forma posible.</p>
            </div>

            {/* Bottom bar — Paso 9 de 11 */}
            <div className="mt-6 flex flex-col lg:flex-row items-center justify-between gap-4 bg-[#0c0c24] border border-white/[0.06] rounded-2xl px-4 py-4 lg:px-5">
              <div className="flex items-center gap-4 w-full lg:w-auto flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#1a1a35]  flex items-center justify-center shrink-0">
                  <img src="./footer_image.png" alt="" />
                </div>
                <span className="text-sm font-medium text-white/60 whitespace-nowrap">Paso 9 de 11</span>
                <div className="hidden sm:flex flex-1 max-w-[380px] items-center justify-between relative mx-2">
                  <div className="absolute left-0 right-0 top-1/2 h-[3px] bg-white/10 -translate-y-1/2 rounded-full" />
                  <div className="absolute left-0 top-1/2 h-[3px] bg-gradient-to-r from-[#2563eb] to-[#7c3aed] -translate-y-1/2 rounded-full" style={{ width: '72%' }} />
                  {Array.from({ length: 11 }, (_, i) => {
                    const n = i + 1;
                    const isCompleted = n < 9;
                    const isCurrent = n === 9;
                    return (
                      <button key={n} onClick={() => goToPaso(n)} title={`Ir al paso ${n} de 11`} aria-label={`Ir al paso ${n} de 11`} className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 cursor-pointer hover:scale-110 transition-transform ${isCompleted ? 'bg-[#7c3aed] border-[#7c3aed] text-white' : isCurrent ? 'bg-[#7c3aed] border-white shadow-[0_0_0_4px_rgba(124,58,237,0.35)] text-white' : 'bg-[#1e1e36] border-white/15 hover:border-white/40'}`}>
                        {isCompleted ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg> : isCurrent ? <div className="w-2 h-2 bg-white rounded-full" /> : null}
                      </button>
                    );
                  })}
                </div>
                <div className="flex sm:hidden flex-1 items-center justify-between relative mx-2">
                  <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-white/10 -translate-y-1/2 rounded-full" />
                  <div className="absolute left-0 top-1/2 h-[2px] bg-gradient-to-r from-[#2563eb] to-[#7c3aed] -translate-y-1/2 rounded-full" style={{ width: '72%' }} />
                  {Array.from({ length: 6 }, (_, i) => <button key={i} onClick={() => goToPaso(i + 6)} title={`Ir al paso ${i + 6} de 11`} aria-label={`Ir al paso ${i + 6} de 11`} className={`relative z-10 w-4 h-4 rounded-full cursor-pointer hover:scale-125 transition-transform ${i<4?'bg-[#7c3aed]':i===4?'bg-[#7c3aed] ring-2 ring-white':'bg-white/10'}`} />)}
                </div>
              </div>
              <button onClick={handleSaveTone} disabled={saving} className="w-full lg:w-auto bg-gradient-to-r from-[#1d4ed8] to-[#7c3aed] hover:from-[#1e40af] hover:to-[#6d28d9] text-white px-10 py-3.5 rounded-xl font-bold text-sm tracking-wider flex items-center justify-center gap-3 shadow-[0_8px_24px_rgba(124,58,237,0.4)] transition-all disabled:opacity-50 shrink-0">
                {saving ? 'Guardando...' : 'CONTINUAR'}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12,5 19,12 12,19" /></svg>
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Screen 9: Configuration Summary — pixel-faithful to photo (white + blue curves, 4 cards)
  if (screen === 9) {
    const intensityLabel = { suave: 'Suave', equilibrada: 'Equilibrada', exigente: 'Exigente' }[configIntensity] || 'Equilibrada';
    const intensityDesc = { suave: 'Acompañamiento sutil\nsin intervenciones frecuentes.', equilibrada: 'Acompañamiento estratégico\nsin generar saturación.', exigente: 'Acompañamiento constante\ncon alta presencia.' }[configIntensity] || 'Acompañamiento estratégico\nsin generar saturación.';
    const toneLabel = { cercano_motivador: 'Cercano y motivador', claro_estrategico: 'Claro y estratégico', firme_exigente: 'Firme y exigente', adaptativo: 'Adaptativo' }[configTone] || 'Adaptativo';
    const toneDesc = configTone === 'adaptativo' ? 'El sistema ajusta automáticamente\nel tono según tu comportamiento\ny evolución.' : configTone === 'cercano_motivador' ? 'Mensajes positivos y alentadores.' : configTone === 'claro_estrategico' ? 'Mensajes directos y organizados.' : 'Mensajes con mayor nivel\nde exigencia.';
    const displayName = (userName || profile?.user_first_name || 'Don Roberto').trim() || 'Don Roberto';
    const avatarName9 = avatar?.name || profile?.avatar_name || 'Lía';
    const avatarMap9: Record<string, string> = {
      ashley: '/avatars/Ashley.jpeg',
      conrad: '/avatars/conrad.jpeg',
      john: '/avatars/John.jpeg',
      lia: '/avatars/Lia.jpeg',
      monroe: '/avatars/Monroe.jpeg',
      sophya: '/avatars/Sophya.jpeg',
    };
    const avatarImg9 = avatarMap9[avatarName9.toLowerCase()] || AVATARS.find(a => a.name.toLowerCase() === avatarName9.toLowerCase())?.file || '/avatar_lavanda/lia (2).jpeg';
    const horasLabel = configSchedule === 'todo_el_dia' ? 'Todo el día' : configSchedule === 'horario_laboral' ? 'Horario laboral' : configSchedule === 'personalizado' ? `Personalizado ${configScheduleStart} - ${configScheduleEnd}` : 'Mañana y tarde';

    return (
      <div className="min-h-screen bg-white font-montserrat relative overflow-hidden flex flex-col">
        {/* Blue curved shapes — same as foto */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <img src="/onda1.png" alt="" draggable={false} className="absolute left-0 top-0 h-full w-auto object-cover opacity-100" />
          <img src="/onda2.png" alt="" draggable={false} className="absolute right-0 top-0 h-full w-auto object-cover opacity-100"  />
        </div>

        <div className="relative z-10 w-full max-w-[1120px] mx-auto px-4 lg:px-6 pt-4 pb-6 flex flex-col flex-1">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <img src="/focusia-logo2.png" alt="Focusia" className="w-7 h-7 object-contain" />
            <span className="font-bold text-slate-800 text-xl tracking-tight">Focusia</span>
          </div>

          <h1 className="text-[32px] lg:text-[42px] font-extrabold text-center tracking-tight leading-tight">
            <span className="text-slate-900">Listo,</span> <span className="text-[#1d2fdc] to-[#7c3aed]">{displayName}.</span>
          </h1>
          <p className="text-center text-[13.5px] leading-[1.6] text-[#334155] mt-2 max-w-[560px] mx-auto">
            Tu sistema inicial ya está configurado.<br />
            Desde ahora Focusia te acompañará según estas preferencias,<br />
            y podrás modificarlas cuando quieras.
          </p>

          {/* Main grid */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">
            {/* Avatar card */}
            <div className="flex justify-center lg:justify-start">
              <div className="w-[280px] rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(30,47,220,0.25)] border border-white/20 bg-[#1e1bff]">
                <div className="relative h-[320px] overflow-hidden bg-[#1e1bff]">
                  <img src={avatarImg9} alt={avatarName9} className="absolute inset-0 w-full h-full object-cover object-top" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 30%, transparent 40%, rgba(30,27,255,0.35) 85%)' }} />
                  {/* sparkles */}
                  <div className="absolute top-[22%] left-[18%] w-[2px] h-[2px] bg-white rounded-full shadow-[0_0_6px_white]" />
                  <div className="absolute top-[28%] right-[20%] w-[2px] h-[2px] bg-white rounded-full shadow-[0_0_6px_white]" />
                  <div className="absolute top-[14%] right-[28%] w-[1.5px] h-[1.5px] bg-white rounded-full" />
                </div>
                <div className="bg-[#0a0a3a] px-5 py-5">
                  <p className="text-[13px] font-semibold text-[#a78bfa] tracking-wide">Tu avatar</p>
                  <p className="text-[18px] font-bold text-[#a78bfa] mt-0.5">{avatarName9}</p>
                  <p className="text-[13px] leading-[1.4] text-white/80 mt-1">Acompañante en enfoque<br />y propósito</p>
                </div>
              </div>
            </div>

            {/* 2x2 cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Intensidad */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] p-5 flex gap-4">
                <div className="w-[68px] h-[68px] rounded-full bg-[#5b21b6] flex items-center justify-center shrink-0">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none"><rect x="3" y="10" width="3" height="8" rx="1.5" fill="white" opacity="0.9" /><rect x="8" y="7" width="3" height="11" rx="1.5" fill="white" opacity="0.7" /><rect x="13" y="4" width="3" height="14" rx="1.5" fill="white" /><rect x="18" y="2" width="3" height="16" rx="1.5" fill="white" opacity="0.5" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800 leading-tight">Intensidad del acompañamiento</p>
                  <p className="text-[16px] font-bold text-[#5b21b6] mt-1">{intensityLabel}</p>
                  <p className="text-[12.5px] leading-[1.5] text-slate-500 mt-1 whitespace-pre-line">{intensityDesc}</p>
                </div>
              </div>

              {/* Activaciones */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] p-5 flex gap-4">
                <div className="w-[68px] h-[68px] rounded-full bg-[#0f2f9d] flex flex-col items-center justify-center shrink-0 gap-1 py-2">
                     <img src="./icons-2.png" alt="" className="w-15 h-15" />
                  
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800">Activaciones habilitadas</p>
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center gap-2 text-[12px]"><span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${configApp ? 'bg-[#5b21b6] text-white' : 'bg-slate-200'}`}>{configApp ? '✓' : ''}</span><span className={configApp ? 'text-slate-700' : 'text-slate-400 line-through'}>Notificaciones dentro de la app</span></div>
                    <div className="flex items-center gap-2 text-[12px]"><span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${configPush ? 'bg-[#5b21b6] text-white' : 'bg-slate-200'}`}>{configPush ? '✓' : ''}</span><span className={configPush ? 'text-slate-700' : 'text-slate-400 line-through'}>Notificaciones Push (moderadas)</span></div>
                    <div className="flex items-center gap-2 text-[12px]"><span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${configWhatsapp ? 'bg-[#5b21b6] text-white' : 'bg-slate-200'}`}>{configWhatsapp ? '✓' : ''}</span><span className={configWhatsapp ? 'text-slate-700' : 'text-slate-400 line-through'}>Mensajes tipo WhatsApp</span></div>
                    <div className="flex items-center gap-2 text-[12px]"><span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${!configCalls ? 'bg-slate-300 text-white' : 'bg-[#5b21b6] text-white'}`}>{!configCalls ? '–' : '✓'}</span><span className="text-slate-500">Llamadas simuladas: Desactivadas</span></div>
                  </div>
                </div>
              </div>

              {/* Horarios */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] p-5 flex gap-4">
                <div className="w-[68px] h-[68px] rounded-full bg-[#065f46] flex items-center justify-center shrink-0">
                  <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="8" /><polyline points="12,8 12,12 15,13" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800">Horarios permitidos</p>
                  <p className="text-[16px] font-bold text-[#065f46] mt-1">{horasLabel}</p>
                  {configSchedule === 'manana_tarde' ? (
                    <div className="mt-1 space-y-0.5 text-[12.5px]">
                      <div className="flex gap-4"><span className="text-slate-500 w-14">☀️ Mañana</span><span className="font-medium text-slate-700">08:00 - 12:30</span></div>
                      <div className="flex gap-4"><span className="text-slate-500 w-14">🌅 Tarde</span><span className="font-medium text-slate-700">14:30 - 20:30</span></div>
                    </div>
                  ) : <p className="text-[12.5px] text-slate-500 mt-1">{configSchedule === 'todo_el_dia' ? '24 horas activo' : configSchedule === 'personalizado' ? `${configScheduleStart} - ${configScheduleEnd}` : '08:00 - 20:30'}</p>}
                  <p className="text-[12px] leading-[1.5] text-slate-500 mt-1">Fuera de esas horas Focusia<br />no enviará activaciones.</p>
                </div>
              </div>

              {/* Tono */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] p-5 flex gap-4">
                <div className="w-[68px] h-[68px] rounded-full bg-[#5b21b6] flex items-center justify-center shrink-0">
                  <img src="./message.png" alt=""  className="w-12 h-12"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800">Tono del avatar</p>
                  <p className="text-[16px] font-bold text-[#5b21b6] mt-1">{toneLabel}</p>
                  <p className="text-[12.5px] leading-[1.5] text-slate-500 mt-1 whitespace-pre-line">{toneDesc}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Info bar */}
          <div className="mt-145 bg-[#f0f0ff] border border-[#e0e0ff] rounded-xl px-4 py-3 flex gap-3 items-center w-[800px] absolute right-1">
            <span className="w-8 h-8 rounded-full bg-white border border-[#c4b5fd] flex items-center justify-center shrink-0"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9.5 12l2 2 3-3" /><path d="M12 7l1 1.5L15 9l-1.5 1.5L12 12l-1.5-1.5L9 9l2-0.5z" /></svg></span>
            <p className="text-[12.5px] leading-[1.5] text-[#475569]">Todas estas configuraciones podrás cambiarlas<br className="hidden sm:block" /> siempre que lo necesites desde tu Centro de Configuración.</p>
          </div>

          {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>}

          {/* Dashed separator */}
          <div className="mt-8 border-t border-dashed border-slate-200" />

          {/* Bottom bar */}
          <div className="mt-6 flex flex-col lg:flex-row items-center justify-between gap-4">
            <button onClick={() => goTo(8)} className="w-full lg:w-auto px-6 py-3 rounded-xl border border-[#7c3aed] bg-white text-[#5b21b6] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#f5f3ff] transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12,19 5,12 12,5" /></svg>
              Volver
            </button>

            <div className="flex items-center gap-3 flex-1 justify-center lg:max-w-[420px]">
              <div className="flex items-center gap-2 w-full max-w-[320px]">
                {Array.from({ length: 11 }, (_, i) => {
                  const n = i + 1;
                  const isCompleted = n < 9;
                  const isCurrent = n === 9;
                  return (
                    <div key={n} className="flex-1 flex items-center">
                      <button onClick={() => goToPaso(n)} title={`Ir al paso ${n} de 11`} aria-label={`Ir al paso ${n} de 11`} className={`w-3 h-3 lg:w-3.5 lg:h-3.5 rounded-full shrink-0 border-2 flex items-center justify-center cursor-pointer hover:scale-125 transition-transform ${isCompleted ? 'bg-[#5b21b6] border-[#5b21b6]' : isCurrent ? 'bg-[#5b21b6] border-[#5b21b6] ring-4 ring-[#ddd6fe]' : 'bg-white border-slate-300 hover:border-[#5b21b6]'}`}>
                        {isCompleted ? <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg> : isCurrent ? <div className="w-1 h-1 bg-white rounded-full" /> : null}
                      </button>
                      {n < 11 && <div className={`flex-1 h-[2px] mx-1 ${n < 9 ? 'bg-[#5b21b6]' : 'bg-slate-200'}`} />}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="text-center lg:hidden w-full -mt-2">
              <p className="text-xs text-slate-500">Paso 9 de 11</p>
            </div>

            <div className="flex gap-3 w-full lg:w-auto">
              <button onClick={handleEditConfig} className="flex-1 lg:flex-none px-5 py-3 rounded-xl border border-[#c4b5fd] bg-white text-[#5b21b6] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#f5f3ff] transition-colors whitespace-nowrap">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5b21b6" strokeWidth="1.8"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                Editar configuración
              </button>
              <button onClick={handleConfirm} disabled={saving} className="flex-1 lg:flex-none px-6 py-3 rounded-xl bg-gradient-to-r from-[#1d2fdc] to-[#7c3aed] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(29,47,220,0.35)] hover:shadow-[0_10px_24px_rgba(124,58,237,0.4)] transition-all disabled:opacity-50 whitespace-nowrap">
                <span className="w-6 h-6 rounded-full border-2 border-white/80 flex items-center justify-center shrink-0"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M5 13l4 4L19 7" /></svg></span>
                {saving ? 'Confirmando...' : 'Confirmar configuración'}
              </button>
            </div>
          </div>
          <p className="hidden lg:block text-center text-xs text-slate-500 mt-2">Paso 9 de 11</p>

          {/* Security */}
          <div className="mt-6 flex justify-center">
            <div className="inline-flex items-center gap-2 bg-[#f1f0ff] rounded-full px-4 py-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5b21b6" strokeWidth="1.8"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /><circle cx="12" cy="16" r="1.5" fill="#5b21b6" /></svg>
              <span className="text-[11.5px] text-slate-600">Tu información está protegida y sincronizada en todos tus dispositivos.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Screen 10: Onboarding finalizado + video + recomendaciones — pixel-faithful to photo
  if (screen === 10) {
    const displayName10 = (userName || profile?.user_first_name || 'Don Roberto').trim() || 'Don Roberto';
    return (
      <div className="min-h-screen bg-white font-montserrat relative overflow-hidden flex flex-col">
        {/* Curvas laterales azules */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <img src="/onda1.png" alt=""   />
          <img src="/onda2.png" alt=""   />
        </div>

        <div className="relative z-10 w-full max-w-[1200px] mx-auto px-4 lg:px-8 pt-4 pb-6 flex flex-col flex-1">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => goTo(9)} className="flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12,19 5,12 12,5" /></svg>
              Volver
            </button>
            <div className="flex items-center gap-2">
              <img src="/focusia-logo2.png" alt="Focusia" className="w-7 h-7 object-contain" />
              <span className="font-bold text-slate-800 text-xl tracking-tight">Focusia</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="w-9 h-9 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-slate-800 font-bold text-sm">?</button>
              <button className="w-9 h-9 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-slate-800">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
            {/* LEFT */}
            <div>
              <p className="text-[13px] font-bold text-[#7c3aed]">¡Onboarding finalizado! 🎉</p>
              <h1 className="text-[32px] lg:text-[44px] font-extrabold tracking-tight leading-tight mt-1 ml-10">
                <span className="text-slate-900">Listo,</span> <span className="text-[#1d2fdc]">{displayName10}.</span>
              </h1>
              <p className="text-[12.5px] leading-[1.65] text-[#1e1b4b] mt-3 ml-15 max-w-[560px]">
                Tu sistema Focusia ya está configurado.<br />
                Ahora conocerás tu Dashboard mediante una visita guiada<br />
                para descubrir cómo se organiza tu planificación,<br />
                tus avances y tus herramientas de apoyo.
              </p>

              {/* Video player — dark navy, video oculto hasta play */}
              <div className="mt-6 rounded-2xl overflow-hidden bg-[#050518] border border-[#1e1b4b] shadow-[0_16px_48px_rgba(5,5,24,0.45)]">
                <div className="relative aspect-video bg-[#070722] flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute -right-10 top-0 w-[70%] h-[140%] rounded-[50%] border border-[#7c3aed]/30" style={{ transform: 'rotate(-18deg)' }} />
                    <div className="absolute -right-6 top-10 w-[55%] h-[120%] rounded-[50%] border border-[#2563eb]/25" style={{ transform: 'rotate(-18deg)' }} />
                    <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 70% 40%, rgba(124,58,237,0.22) 0%, transparent 60%)' }} />
                  </div>
                  <video ref={videoRef} src="/flow_focussia.mp4" className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} playsInline preload="none" onClick={(e) => { const v = e.currentTarget; if (v.paused) v.play().catch(()=>{}); else v.pause(); }} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onError={(e) => { (e.target as HTMLVideoElement).style.display = 'none'; }} />
                  <div className={`absolute inset-0 flex flex-col items-center justify-center ${isPlaying ? 'pointer-events-none opacity-0' : 'opacity-100'} transition-opacity duration-300`} style={{ background: 'radial-gradient(ellipse at 50% 60%, rgba(30,27,255,0.25) 0%, transparent 70%)' }}>
                    <div className="flex items-center gap-3">
                      <img src="/focussia.png" alt="" className="w-12 h-12 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <span className="text-white text-[38px] font-bold tracking-tight">Focusia</span>
                    </div>
                    <p className="text-white/80 text-[15px] mt-2">Planifica con propósito. Vive con enfoque.</p>
                  </div>
                  {!isPlaying && (
                    <button onClick={() => { videoRef.current?.play().catch(()=>{}); }} className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-white/15 border border-white/30 backdrop-blur flex items-center justify-center hover:bg-white/25 transition-colors z-10">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><polygon points="6,4 20,12 6,20" /></svg>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3 px-4 py-2.5 bg-[#0a0a24] border-t border-white/10">
                  <button onClick={() => { if (videoRef.current) { if (videoRef.current.paused) videoRef.current.play().catch(()=>{}); else videoRef.current.pause(); } }} className="text-white hover:text-white/70">
                    {isPlaying ? <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><polygon points="6,4 20,12 6,20" /></svg>}
                  </button>
                  <span className="text-white/70 text-xs font-medium whitespace-nowrap">0:00 / 0:15</span>
                  <div className="flex-1 h-[3px] bg-white/15 rounded-full relative overflow-hidden">
                    <div className="absolute left-0 top-0 h-full w-[8%] bg-gradient-to-r from-[#7c3aed] to-[#2563eb] rounded-full" />
                    <div className="absolute left-[8%] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#7c3aed] shadow" />
                  </div>
                  <button className="text-white/70 hover:text-white"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" stroke="none" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></svg></button>
                  <button className="text-white/70 hover:text-white"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg></button>
                  <button className="text-white/70 hover:text-white"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" /></svg></button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-[#1e1b4b]">
                <span className="w-5 h-5 rounded-full border border-[#7c3aed] text-[#7c3aed] flex items-center justify-center text-xs font-bold shrink-0">i</span>
                <p className="text-[12.5px]">Este video dura aproximadamente 15 segundos.</p>
              </div>
              {error && <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>}
            </div>

            {/* RIGHT */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.07)] p-5 border-l-4 border-l-[#7c3aed]">
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#f0edff] flex items-center justify-center shrink-0">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.6"><rect x="2" y="4" width="20" height="12" rx="2" /><path d="M2 20h20" /><rect x="9" y="16" width="6" height="2" rx="1" fill="#7c3aed" stroke="none" /></svg>
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-[#7c3aed] leading-tight">Recomendación de uso<br />en computador</p>
                    <p className="text-[12px] leading-[1.55] text-slate-600 mt-1.5">Para tener una visión completa de tu Dashboard, te recomendamos realizar esta primera visita guiada desde un computador.</p>
                  </div>
                </div>
                <div className="my-3 border-t border-slate-100" />
                <p className="text-[12px] leading-[1.55] text-slate-500">El dashboard de Focusia tiene una estructura visual amplia. Para comprenderlo por primera vez, es mejor verlo en pantalla grande.<br />El computador permite observar con mayor claridad:</p>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {[
                    { label: 'Secciones principales', color: '#2563eb', icon: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></> },
                    { label: 'Distribución del dashboard', color: '#7c3aed', icon: <><rect x="3" y="3" width="18" height="5" rx="1" /><rect x="3" y="10" width="8" height="11" rx="1" /><rect x="13" y="10" width="8" height="11" rx="1" /></> },
                    { label: 'Herramientas disponibles', color: '#16a34a', icon: <><rect x="2" y="7" width="20" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /></> },
                    { label: 'Relación entre módulos', color: '#f97316', img: '/puzzle.png' }
                  ].map((m: any, i) => (
                    <div key={i} className="bg-slate-50/80 border border-slate-100 rounded-xl px-1.5 py-2.5 flex flex-col items-center text-center">
                      {m.img ? (
                        <img src={m.img} alt={m.label} className="w-[22px] h-[22px] object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={m.color} strokeWidth="1.6">{m.icon}</svg>
                      )}
                      <p className="text-[9.5px] leading-[1.3] text-slate-600 font-medium mt-1.5">{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.07)] p-5 border-l-4 border-l-[#2563eb]">
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#eef2ff] flex items-center justify-center shrink-0">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1d2fdc" strokeWidth="1.6"><rect x="7" y="2" width="10" height="20" rx="2.5" /><line x1="11" y1="19" x2="13" y2="19" /></svg>
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-[#5b21b6] leading-tight">Uso desde celular o tablet</p>
                    <p className="text-[12px] leading-[1.55] text-slate-600 mt-1.5">Si estás usando un celular o una tablet, te recomendamos girar el dispositivo a posición horizontal antes de continuar.</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-center gap-4">
                  <img src="./arrow-1.png" alt=""  className='w-6 h-10'/>
                  <div className="w-[160px] h-[64px] rounded-xl bg-[#050518] border border-[#1e1b4b] flex items-center justify-center gap-2 shadow-lg">
                    <img src="/focussia.png" alt="" className="w-6 h-6 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <span className="text-white font-bold text-lg">Focusia</span>
                  </div>
                  <img src="./arrow-2.png" alt=""  className='w-6 h-10'/>
                </div>
                <div className="mt-4 bg-[#f6f4ff] rounded-xl px-4 py-3 flex gap-2.5 items-start">
                  <span className="w-6 h-6 rounded-full border-2 border-[#7c3aed] text-[#7c3aed] flex items-center justify-center shrink-0 mt-0.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" /></svg></span>
                  <p className="text-[12px] leading-[1.5] text-[#5b21b6]">Puedes continuar desde cualquier dispositivo.<br />Esto no bloquea tu acceso a Focusia.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Dashed separator */}
          <div className="mt-8 border-t border-dashed border-slate-200" />

          {/* Footer */}
          <div className="mt-5 flex flex-col lg:flex-row items-center justify-between gap-4">
            <button onClick={() => goTo(9)} className="w-full lg:w-auto px-6 py-3 rounded-xl border border-[#7c3aed] bg-white text-[#5b21b6] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#f5f3ff] transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12,19 5,12 12,5" /></svg>
              Volver
            </button>
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-0 w-full max-w-[380px]">
                {Array.from({ length: 11 }, (_, i) => {
                  const n = i + 1;
                  const isCompleted = n < 10;
                  const isCurrent = n === 10;
                  return (
                    <div key={n} className="flex-1 flex items-center">
                      <div className={`w-4 h-4 lg:w-5 lg:h-5 rounded-full shrink-0 border-2 flex items-center justify-center ${isCompleted ? 'bg-[#5b21b6] border-[#5b21b6]' : isCurrent ? 'bg-[#5b21b6] border-[#5b21b6] text-white text-[9px] font-bold' : 'bg-white border-slate-300'}`}>
                        {isCompleted ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg> : isCurrent ? <span>10</span> : null}
                      </div>
                      {n < 11 && <div className={`flex-1 h-[2px] mx-0.5 ${n < 10 ? 'bg-[#5b21b6]' : 'bg-slate-200'}`} />}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-slate-600 font-medium">Paso 10 de 11</p>
            </div>
            <button onClick={handleComplete} disabled={saving} className="w-full lg:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#1d2fdc] to-[#7c3aed] text-white font-bold text-[14px] flex items-center justify-center gap-3 shadow-[0_8px_20px_rgba(29,47,220,0.35)] hover:shadow-[0_10px_24px_rgba(124,58,237,0.4)] transition-all disabled:opacity-50 whitespace-nowrap">
              {saving ? 'Finalizando...' : 'Continuar a la visita guiada'}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12,5 19,12 12,19" /></svg>
            </button>
          </div>

          <div className="mt-5 flex justify-center">
            <div className="inline-flex items-center gap-2 bg-[#f1f0ff] rounded-full px-4 py-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5b21b6" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9,12 11,14 15,10" /></svg>
              <span className="text-[11.5px] text-slate-600">Tu información está protegida y sincronizada en todos tus dispositivos.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Screen 11: Cómo iniciar visita guiada — pixel-faithful to photo (Paso 11 de 11, 3 cards)
  if (screen === 11) {
    const displayName11 = (userName || profile?.user_first_name || 'Don Roberto').trim() || 'Don Roberto';
    return (
      <div className="min-h-screen bg-white font-montserrat relative overflow-hidden flex flex-col">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <img src="/onda1.png" alt="" draggable={false} className="absolute left-0 top-0 h-full w-auto object-cover"  />
          <img src="/onda2.png" alt="" draggable={false} className="absolute right-0 top-0 h-full w-auto object-cover mt-4"  />
        </div>

        <div className="relative z-10 w-full max-w-[1100px] mx-auto px-4 lg:px-8 pt-4 pb-6 flex flex-col flex-1">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => goTo(10)} className="flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12,19 5,12 12,5" /></svg>
              Volver
            </button>
            <div className="flex items-center gap-2">
              <img src="/focusia-logo2.png" alt="Focusia" className="w-7 h-7 object-contain" />
              <span className="font-bold text-slate-800 text-xl tracking-tight">Focusia</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="w-9 h-9 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-500 font-bold text-sm">?</button>
              <button className="w-9 h-9 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-500">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
              </button>
            </div>
          </div>

          <h1 className="text-[32px] lg:text-[44px] font-extrabold text-center tracking-tight leading-tight">
            <span className="text-slate-900">¡Listo,</span> <span className="text-[#1d2fdc]">{displayName11}!</span>
          </h1>
          <p className="text-center text-[13.5px] leading-[1.65] text-[#334155] mt-3 max-w-[640px] mx-auto">
            Tu sistema Focusia ya está configurado.<br />
            Ahora iniciamos tu primera visita guiada para que descubras cómo se organiza tu planificación, tus avances y todas las herramientas de apoyo.
          </p>
          <p className="text-center text-[15px] font-bold text-slate-900 mt-4">¿Cómo quieres iniciar tu visita guiada?</p>
          {error && <div className="mt-4 max-w-[640px] mx-auto w-full bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>}

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5 max-w-[960px] mx-auto w-full">
            {/* Card 1 — este dispositivo */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-6 flex flex-col items-center text-center">
              <div className="w-[88px] h-[88px] rounded-full bg-[#f0edff] flex items-center justify-center mb-4 relative">
                  <img src="./arrow-1.png" alt=""  className='w-6 h-10'/>
                                  <svg width="60" height="44" viewBox="0 0 24 24" fill="none" stroke="#5b21b6" strokeWidth="1.7"><rect x="8" y="3" width="8" height="18" rx="2" /><line x1="11" y1="18" x2="13" y2="18" /></svg>

                  <img src="./arrow-2.png" alt=""  className='w-6 h-10'/>
              </div>
              <p className="text-[17px] font-extrabold text-[#1d2fdc] leading-tight">Continuar desde<br />este dispositivo</p>
              <p className="text-[12.5px] leading-[1.55] text-slate-600 mt-3 flex-1">Comienza la visita guiada desde<br />tu celular o tablet.</p>
              <button onClick={handleStartTour} disabled={saving} className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-[#1d2fdc] to-[#7c3aed] text-white font-semibold text-[14px] flex items-center justify-center gap-3 shadow-[0_8px_20px_rgba(29,47,220,0.3)] hover:shadow-[0_10px_24px_rgba(124,58,237,0.4)] transition-all disabled:opacity-50">
                {saving ? 'Iniciando...' : 'Continuar'}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12,5 19,12 12,19" /></svg>
              </button>
            </div>

            {/* Card 2 — computador */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-6 flex flex-col items-center text-center">
              <div className="w-[88px] h-[88px] rounded-full bg-[#eef4ff] flex items-center justify-center mb-4">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.7"><rect x="3" y="5" width="18" height="11" rx="1.5" /><path d="M2 19h20" /><path d="M9 19l1-3M15 19l-1-3" /></svg>
              </div>
              <p className="text-[17px] font-extrabold text-[#2563eb] leading-tight">Ya estoy en<br />computador</p>
              <p className="text-[12.5px] leading-[1.55] text-slate-600 mt-3 flex-1">Explora el Dashboard en pantalla grande para aprovechar mejor la experiencia.</p>
              <button onClick={handleStartTour} disabled={saving} className="mt-6 w-full py-3 rounded-xl border border-[#2563eb] bg-white text-[#2563eb] font-semibold text-[14px] flex items-center justify-center gap-3 hover:bg-[#eff6ff] transition-all disabled:opacity-50">
                {saving ? 'Iniciando...' : 'Iniciar visita'}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12,5 19,12 12,19" /></svg>
              </button>
            </div>

            {/* Card 3 — más tarde */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-6 flex flex-col items-center text-center">
              <div className="w-[88px] h-[88px] rounded-full bg-[#eef7ee] flex items-center justify-center mb-4">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8"><circle cx="12" cy="12" r="8.5" /><polyline points="12,8 12,12 15.5,13.5" /></svg>
              </div>
              <p className="text-[17px] font-extrabold text-[#15803d] leading-tight">Lo haré<br />más tarde</p>
              <p className="text-[12.5px] leading-[1.55] text-slate-600 mt-3 flex-1">Puedes comenzar la visita guiada cuando quieras desde el Dashboard.</p>
              <button onClick={handleDeferTour} disabled={saving} className="mt-6 w-full py-3 rounded-xl border border-[#16a34a] bg-white text-[#15803d] font-semibold text-[14px] flex items-center justify-center gap-3 hover:bg-[#f0fdf4] transition-all disabled:opacity-50">
                {saving ? 'Guardando...' : 'Más tarde'}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12,5 19,12 12,19" /></svg>
              </button>
            </div>
          </div>

          <div className="mt-8 border-t border-dashed border-slate-200" />
          <div className="mt-5 flex flex-col items-center gap-1.5">
            <div className="flex items-center w-full max-w-[560px]">
              {Array.from({ length: 11 }, (_, i) => {
                const n = i + 1;
                const isCompleted = n < 11;
                const isCurrent = n === 11;
                return (
                  <div key={n} className="flex-1 flex items-center">
                    <div className={`w-4 h-4 lg:w-5 lg:h-5 rounded-full shrink-0 border-2 flex items-center justify-center ${isCompleted ? 'bg-[#1d2fdc] border-[#1d2fdc]' : isCurrent ? 'bg-[#1d2fdc] border-[#1d2fdc] text-white text-[9px] font-bold' : 'bg-white border-slate-300'}`}>
                      {isCompleted ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg> : isCurrent ? <span>11</span> : null}
                    </div>
                    {n < 11 && <div className={`flex-1 h-[2px] mx-0.5 ${n < 11 ? 'bg-[#1d2fdc]' : 'bg-slate-200'}`} />}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-600 font-medium mt-1">Paso 11 de 11</p>
          </div>

          <div className="mt-4 flex justify-center">
            <div className="inline-flex items-center gap-2 bg-[#f1f0ff] rounded-full px-4 py-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5b21b6" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9,12 11,14 15,10" /></svg>
              <span className="text-[11.5px] text-slate-600">Tu información está protegida y sincronizada en todos tus dispositivos.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function Sparkles(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  );
}
