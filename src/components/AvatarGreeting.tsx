import React, { useEffect, useRef, useState } from 'react';

const TTS_API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/tts/`
  : 'http://localhost:8000/api/tts/';

const AVATAR_TTS_URL = `${TTS_API_URL}avatar/`;

const GREETINGS = [
  '¡Buenos días! Listo para comenzar',
  'Hola de nuevo, ¡vamos a por ello!',
  'Qué bueno verte. ¿Qué haremos hoy?',
  '¡A darle con todo! El día nos espera',
  'Bienvenido de vuelta, aquí para ayudarte',
  'Sonríe, hoy será un gran día',
  '¿Listo para conquistar tus metas?',
];

const BADGE_LABELS: Record<number, string> = {
  1: 'Estratega',
  2: 'Motivador',
  3: 'Analítico',
  4: 'Creativo',
  5: 'Resolutivo',
  6: 'Inspirador',
};

function findBestVoice(gender: 'masculino' | 'femenino'): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const spanish = voices.filter(v => v.lang.startsWith('es'));
  const name = (v: SpeechSynthesisVoice) => v.name.toLowerCase();
  const feminineKw = ['female', 'sara', 'helena', 'maria', 'laura', 'elena', 'carolina', 'sabina', 'catherine', 'zira'];
  const masculineKw = ['male', 'pablo', 'david', 'jorge', 'alonso', 'raul', 'tomas', 'miguel', 'jose'];
  const score = (v: SpeechSynthesisVoice): number => {
    let s = 0; const n = name(v);
    if (n.includes('neural')) s += 120;
    if (n.includes('natural')) s += 110;
    if (n.includes('premium')) s += 80;
    if (n.includes('microsoft')) s += 15;
    if (v.lang === 'es-CO' || v.lang === 'es-MX') s += 20;
    if (v.lang === 'es-US') s += 12;
    if (gender === 'femenino' && feminineKw.some(k => n.includes(k))) s += 60;
    if (gender === 'masculino' && masculineKw.some(k => n.includes(k))) s += 60;
    if (!v.localService) s += 25;
    return s;
  };
  return spanish.sort((a, b) => score(b) - score(a))[0] ?? null;
}

export default function AvatarGreeting({
  avatarUrl,
  avatarIndex,
  userName,
  vozGenero,
  onDismiss,
}: {
  avatarUrl: string;
  avatarIndex: number;
  userName: string;
  vozGenero?: 'masculino' | 'femenino';
  onDismiss: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const spokenRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const retryRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const show = setTimeout(() => setVisible(true), 300);
    const hide = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 400);
    }, 4500);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, [onDismiss]);

  const greeting = GREETINGS[avatarIndex % GREETINGS.length];
  const badge = BADGE_LABELS[avatarIndex] || 'Focusia';

  useEffect(() => {
    if (!visible || spokenRef.current) return;
    spokenRef.current = true;

    const speakWithBrowser = () => {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(greeting);
      utter.lang = 'es-CO';
      utter.rate = 0.88;
      utter.volume = 0.85;
      utter.pitch = vozGenero === 'femenino' ? 1.15 : 0.92;

      const doSpeak = () => {
        const voice = findBestVoice(vozGenero || 'masculino');
        if (voice) utter.voice = voice;
        window.speechSynthesis.speak(utter);
        retryRef.current = null;
      };

      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.onvoiceschanged = null;
          doSpeak();
        };
      } else {
        doSpeak();
      }
    };

    const playAvatarSample = async () => {
      try {
        const csrfMatch = document.cookie.match(/csrftoken=([^;]+)/);
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (csrfMatch) headers['X-CSRFToken'] = csrfMatch[1];

        const res = await fetch(AVATAR_TTS_URL, {
          method: 'POST',
          credentials: 'include',
          headers,
          body: JSON.stringify({ avatar_index: avatarIndex, text: greeting }),
        });

        if (!res.ok) {
          retryRef.current = speakWithBrowser;
          speakWithBrowser();
          return;
        }

        const blob = await res.blob();
        if (blob.size === 0) { retryRef.current = speakWithBrowser; speakWithBrowser(); return; }

        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.volume = 0.85;

        try {
          const playPromise = audio.play();
          if (playPromise !== undefined) await playPromise;
          audio.onended = () => { URL.revokeObjectURL(url); };
          return;
        } catch {
          URL.revokeObjectURL(url);
          audioRef.current = null;
          retryRef.current = speakWithBrowser;
          speakWithBrowser();
        }
      } catch {
        retryRef.current = speakWithBrowser;
        speakWithBrowser();
      }
    };

    playAvatarSample();

    const onInteraction = () => {
      document.removeEventListener('click', onInteraction);
      document.removeEventListener('touchstart', onInteraction);
      if (retryRef.current) {
        retryRef.current();
        retryRef.current = null;
      }
    };

    setTimeout(() => {
      if (!audioRef.current) {
        document.addEventListener('click', onInteraction);
        document.addEventListener('touchstart', onInteraction);
      }
    }, 1000);

    return () => {
      window.speechSynthesis.cancel();
      document.removeEventListener('click', onInteraction);
      document.removeEventListener('touchstart', onInteraction);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [visible, greeting, vozGenero]);

  return (
    <div className="fixed inset-0 z-[300] pointer-events-none">
      <style>{`
        @keyframes greeting-fade-in {
          0% { opacity: 0; transform: translateY(20px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes greeting-fade-out {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-10px) scale(0.95); }
        }
        @keyframes float-y {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 15px rgba(168,85,247,0.2), 0 0 30px rgba(168,85,247,0.1); }
          50% { box-shadow: 0 0 25px rgba(168,85,247,0.4), 0 0 50px rgba(168,85,247,0.2); }
        }
      `}</style>
      <div
        className="absolute bottom-8 right-8 flex items-end gap-3 cursor-pointer pointer-events-auto"
        onClick={() => { setVisible(false); setTimeout(onDismiss, 400); }}
        style={{
          animation: visible
            ? 'greeting-fade-in 0.4s ease-out forwards'
            : 'greeting-fade-out 0.3s ease-in forwards',
        }}
      >
        <div
          className="relative rounded-2xl bg-gradient-to-br from-[#1e1b2e] to-[#2a1a3a] border border-purple-500/30 px-4 py-3 max-w-[220px] shadow-2xl"
          style={{ animation: 'float-y 3s ease-in-out infinite' }}
        >
          <div className="absolute -bottom-1.5 right-7 w-3 h-3 bg-[#1e1b2e] border-r border-b border-purple-500/30 rotate-45" />
          <p className="text-white text-xs font-bold mb-0.5">{userName}</p>
          <p className="text-purple-200 text-[11px] leading-relaxed">{greeting}</p>
          <div className="flex items-center gap-1 mt-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[8px] text-purple-300/60 font-medium tracking-wider uppercase">{badge}</span>
          </div>
        </div>
        <div
          className="w-14 h-14 rounded-full overflow-hidden border-2 border-purple-400/50 flex-shrink-0"
          style={{ animation: 'glow-pulse 2.5s ease-in-out infinite' }}
        >
          <img src={avatarUrl || undefined} alt="avatar" className="w-full h-full object-cover" />
        </div>
      </div>
    </div>
  );
}
