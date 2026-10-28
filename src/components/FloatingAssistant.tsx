import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, Volume2 } from 'lucide-react';
import { agentService, ttsService } from '../services/api';

type Estado = 'idle' | 'escuchando' | 'pensando' | 'hablando';

const SESSION_KEY = 'focusia_chat_session';

export default function FloatingAssistant({ username, avatarUrl, avatarIndex }: {
  username?: string;
  avatarUrl?: string;
  avatarIndex?: number;
}) {
  const [estado, setEstado] = useState<Estado>('idle');
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [ultimoTexto, setUltimoTexto] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [errorVoz, setErrorVoz] = useState('');
  const [sessionId, setSessionId] = useState(() => {
    try {
      return localStorage.getItem(SESSION_KEY) || '';
    } catch {
      return '';
    }
  });
  const [textoManual, setTextoManual] = useState('');
  const [transcritoEnVivo, setTranscritoEnVivo] = useState('');
  const [soporteVoz] = useState(() => {
    try {
      return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    } catch {
      return false;
    }
  });
  const [soporteAudio] = useState(() => {
    try {
      return Boolean(window.speechSynthesis);
    } catch {
      return false;
    }
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recogRef = useRef<any>(null);
  const manualRef = useRef(false);
  const acumuladoRef = useRef('');
  const estadoRef = useRef<Estado>('idle');
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayName = username?.trim() || 'campeón';

  const setEstadoAll = (e: Estado) => {
    estadoRef.current = e;
    setEstado(e);
  };

  useEffect(() => () => {
    manualRef.current = true;
    audioRef.current?.pause();
    try {
      recogRef.current?.stop();
    } catch {}
    try {
      window.speechSynthesis?.cancel();
    } catch {}
    if (errorTimer.current) clearTimeout(errorTimer.current);
  }, []);

  const flashError = (msg: string) => {
    setErrorVoz(msg);
    if (errorTimer.current) clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setErrorVoz(''), 5000);
  };

  const partirEnFragmentos = (texto: string): string[] => {
    const limpio = texto.replace(/\s+/g, ' ').trim();
    if (!limpio) return [];
    if (limpio.length <= 180) return [limpio];
    const frases = limpio.match(/[^.!?]+[.!?]+["”)]?|.+$/g) || [limpio];
    const partes: string[] = [];
    let actual = '';
    for (const f of frases) {
      const s = f.trim();
      if (!s) continue;
      if ((actual + ' ' + s).trim().length <= 180) {
        actual = (actual + ' ' + s).trim();
      } else {
        if (actual) partes.push(actual);
        // Frase muy larga: cortarla por palabras.
        if (s.length > 180) {
          const palabras = s.split(' ');
          actual = '';
          for (const p of palabras) {
            if ((actual + ' ' + p).trim().length <= 180) {
              actual = (actual + ' ' + p).trim();
            } else {
              if (actual) partes.push(actual);
              actual = p;
            }
          }
        } else {
          actual = s;
        }
      }
    }
    if (actual) partes.push(actual);
    return partes.length ? partes : [limpio];
  };

  const hablarNativo = (texto: string): boolean => {
    try {
      const synth = window.speechSynthesis;
      if (!synth) return false;
      synth.cancel();
      const fragmentos = partirEnFragmentos(texto);
      if (!fragmentos.length) return false;
      let voz: SpeechSynthesisVoice | null = null;
      let idioma = 'es-ES';
      try {
        const voces = synth.getVoices().filter(v => v.lang?.toLowerCase().startsWith('es'));
        const preferida = voces.find(v => /google/i.test(v.name) && v.lang?.toLowerCase().startsWith('es-es'))
          || voces.find(v => v.lang?.toLowerCase() === 'es-es')
          || voces.find(v => /natural|neural|microsoft/i.test(v.name))
          || voces[0];
        if (preferida) {
          voz = preferida;
          idioma = preferida.lang;
        }
      } catch {}
      const sigueEscuchando = () => {
        if (!manualRef.current && estadoRef.current === 'hablando') empezarEscucha();
      };
      const leerParte = (i: number) => {
        if (manualRef.current) return;
        if (i >= fragmentos.length) {
          sigueEscuchando();
          return;
        }
        const u = new SpeechSynthesisUtterance(fragmentos[i]);
        u.lang = idioma;
        u.rate = 1.03;
        if (voz) u.voice = voz;
        u.onend = () => leerParte(i + 1);
        u.onerror = () => leerParte(i + 1);
        synth.speak(u);
      };
      leerParte(0);
      return true;
    } catch {
      return false;
    }
  };

  const hablar = async (texto: string) => {
    if (avatarIndex && avatarIndex > 0) {
      try {
        audioRef.current?.pause();
        const url = await ttsService.speakAvatar(avatarIndex, texto);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          if (!manualRef.current && estadoRef.current === 'hablando') {
            empezarEscucha();
          }
        };
        await audio.play();
        return;
      } catch {
        /* cae al sintetizador nativo */
      }
    }
    if (!hablarNativo(texto) && !manualRef.current) {
      empezarEscucha();
    }
  };

  const probarAudio = () => {
    setErrorVoz('');
    if (!soporteAudio) {
      flashError('Este navegador no tiene síntesis de voz.');
      return;
    }
    const msg = 'Hola, soy tu asistente de Focusia. Te escucho bien.';
    setRespuesta(msg);
    setEstadoAll('hablando');
    if (!hablarNativo(msg)) {
      flashError('No se pudo reproducir audio en este navegador.');
      setEstadoAll('idle');
    }
  };

  const enviarManual = () => {
    const t = textoManual.trim();
    if (!t || estado === 'pensando') return;
    try {
      recogRef.current?.stop();
    } catch {}
    recogRef.current = null;
    setTextoManual('');
    enviarAlAgente(t);
  };

  const enviarAlAgente = async (texto: string) => {
    const content = texto.trim();
    if (!content) {
      empezarEscucha();
      return;
    }
    setUltimoTexto(content);
    setRespuesta('');
    setEstadoAll('pensando');
    try {
      const res = await agentService.chat(content, sessionId || undefined, username?.trim() || '');
      if (res.session_id) {
        setSessionId(res.session_id);
        try {
          localStorage.setItem(SESSION_KEY, res.session_id);
        } catch {}
      }
      const reply = res.respuesta || 'Entendido.';
      setRespuesta(reply);
      setEstadoAll('hablando');
      hablar(reply);
      if (res.creados && Object.keys(res.creados).length > 0) {
        try {
          window.dispatchEvent(new CustomEvent('focusia:datos-actualizados', { detail: res.creados }));
        } catch {}
      }
    } catch (err: any) {
      const httpStatus = err?.response?.status;
      const backendMsg: string | undefined = err?.response?.data?.error;
      let msg = 'Tuve un problema al responder. Toca de nuevo para intentarlo.';
      if (httpStatus === 503) {
        msg = 'El servicio de voz no está configurado (falta la clave de IA). Revisa GROQ_API_KEY en el servidor.';
      } else if (httpStatus === 502) {
        msg = 'No pude contactar al servicio de IA. Inténtalo de nuevo en un momento.';
      } else if (httpStatus === 401 || httpStatus === 403) {
        msg = 'Tu sesión expiró. Inicia sesión de nuevo para usar la voz.';
      } else if (backendMsg && backendMsg.length < 200) {
        msg = backendMsg;
      }
      setRespuesta(msg);
      setEstadoAll('hablando');
      hablar(msg);
    }
  };

  const empezarEscucha = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      flashError('Tu navegador no soporta dictado por voz. Usa Chrome.');
      setEstadoAll('idle');
      return;
    }
    try {
      recogRef.current?.stop();
    } catch {}
    recogRef.current = null;
    manualRef.current = false;
    acumuladoRef.current = '';
    setUltimoTexto('');
    setRespuesta('');
    setTranscritoEnVivo('');
    const recog = new SR();
    recogRef.current = recog;
    recog.lang = 'es-ES';
    // Por turnos (no continuo): Chrome cierra solo al hacer pausa y dispara onend.
    // Con continuous=true el onend casi nunca llega y se queda en "Escuchando" para siempre.
    recog.continuous = false;
    recog.interimResults = true;
    recog.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript.trim();
        if (!t) continue;
        if (e.results[i].isFinal) {
          acumuladoRef.current += (acumuladoRef.current ? ' ' : '') + t;
        } else {
          interim += (interim ? ' ' : '') + t;
        }
      }
      setTranscritoEnVivo(interim || acumuladoRef.current);
    };
    recog.onend = () => {
      if (manualRef.current) {
        recogRef.current = null;
        setEstadoAll('idle');
        return;
      }
      // Fin del turno (pausa del usuario): enviar lo acumulado.
      const texto = acumuladoRef.current;
      recogRef.current = null;
      setTranscritoEnVivo('');
      if (texto.trim()) {
        enviarAlAgente(texto);
      } else if (estadoRef.current === 'escuchando') {
        // Sin texto: reintentar con pequeña pausa para no saturar el micrófono.
        setTimeout(() => {
          if (!manualRef.current && estadoRef.current === 'escuchando') {
            try {
              empezarEscucha();
            } catch {}
          }
        }, 400);
      }
    };
    recog.onerror = (e: any) => {
      const code = e?.error || '';
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        manualRef.current = true;
        flashError('Permite el micrófono en el navegador (ícono 🔒 en la barra).');
        setEstadoAll('idle');
      } else if (code === 'audio-capture') {
        manualRef.current = true;
        flashError('No se encontró micrófono disponible.');
        setEstadoAll('idle');
      } else if (code === 'network') {
        flashError('Sin conexión para el dictado por voz. Puedes escribir abajo.');
      } else if (code === 'no-speech') {
        // Sin voz detectada: se reintenta en onend, avisamos una vez.
        flashError('No te escuché. Habla más cerca del micrófono o escribe abajo.');
      } else if (code === 'aborted') {
        // Ignorar: suele ser stop() manual.
      } else if (code) {
        flashError(`Micrófono: ${code}. Puedes escribir abajo.`);
      }
    };
    try {
      recog.start();
      setEstadoAll('escuchando');
    } catch {
      setEstadoAll('idle');
    }
  };

  const detener = () => {
    manualRef.current = true;
    audioRef.current?.pause();
    try {
      window.speechSynthesis?.cancel();
    } catch {}
    try {
      recogRef.current?.stop();
    } catch {}
    recogRef.current = null;
    setEstadoAll('idle');
    setPanelAbierto(false);
  };

  const abrirVoz = () => {
    setUltimoTexto('');
    setRespuesta('');
    setErrorVoz('');
    setTextoManual('');
    setTranscritoEnVivo('');
    setPanelAbierto(true);
    // Saludo estilo JARVIS y luego a escuchar: el fin del saludo dispara empezarEscucha.
    manualRef.current = false;
    const saludo = `Dígame, jefe. ¿En qué trabajamos hoy?`;
    setRespuesta(saludo);
    setEstadoAll('hablando');
    if (!hablarNativo(saludo)) {
      empezarEscucha();
    }
  };

  if (!panelAbierto) {
    return (
      <button
        type="button"
        onClick={abrirVoz}
        title="Hablar con tu asistente"
        className="fixed bottom-5 right-5 z-[60] w-14 h-14 rounded-full shadow-2xl overflow-hidden ring-4 ring-white/70 hover:scale-105 active:scale-95 transition-transform bg-gradient-to-br from-[#2b44ff] to-[#a21caf]"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          <span className="w-full h-full flex items-center justify-center">
            <Mic className="w-6 h-6 text-white" />
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-[60] w-[min(92vw,340px)] bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-[#1e1b4b] to-[#4c1d95] text-white">
        <span className="relative w-9 h-9 shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <Mic className="w-4 h-4" />
            </span>
          )}
          {estado === 'escuchando' && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
          )}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black leading-tight">
            {estado === 'escuchando' && 'Escuchando...'}
            {estado === 'pensando' && 'Pensando...'}
            {estado === 'hablando' && 'Hablando...'}
          </p>
          <p className="text-[11px] opacity-70 leading-tight">
            {estado === 'escuchando' ? 'Habla y haz una pausa para enviar' : 'Tu asistente por voz'}
          </p>
        </div>
        <Volume2 className="w-4 h-4 opacity-70" />
        <button
          type="button"
          onClick={detener}
          title="Terminar"
          className="p-2 rounded-full hover:bg-white/15 transition-colors"
        >
          {estado === 'escuchando' ? <MicOff className="w-4 h-4" /> : <X className="w-4 h-4" />}
        </button>
      </div>

      <div className="p-4 space-y-2.5 max-h-[40vh] overflow-y-auto">
        {errorVoz && (
          <p className="text-[11px] text-red-500">{errorVoz}</p>
        )}
        {!soporteVoz && (
          <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
            Tu navegador no soporta dictado por voz. Usa Chrome en HTTPS o escribe abajo.
          </p>
        )}
        {estado === 'escuchando' && !ultimoTexto && (
          <div className="flex items-center justify-center gap-1.5 py-4">
            {[0, 1, 2, 3, 4].map(d => (
              <span key={d} className="w-1.5 rounded-full bg-purple-500 animate-pulse" style={{ height: `${10 + ((d * 7) % 14)}px`, animationDelay: `${d * 0.12}s` }} />
            ))}
          </div>
        )}
        {estado === 'escuchando' && transcritoEnVivo && (
          <div className="bg-[#eef3ff] rounded-2xl rounded-br-md px-3.5 py-2.5">
            <p className="text-[10px] font-bold text-[#5b6b8c] uppercase tracking-wide mb-0.5">Escucho</p>
            <p className="text-sm text-[#1b2350]">{transcritoEnVivo}</p>
          </div>
        )}
        {ultimoTexto && (
          <div className="bg-[#eef3ff] rounded-2xl rounded-br-md px-3.5 py-2.5">
            <p className="text-[10px] font-bold text-[#5b6b8c] uppercase tracking-wide mb-0.5">Dijiste</p>
            <p className="text-sm text-[#1b2350]">{ultimoTexto}</p>
          </div>
        )}
        {estado === 'pensando' && (
          <div className="flex gap-1 px-1 py-1">
            {[0, 1, 2].map(d => (
              <span key={d} className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />
            ))}
          </div>
        )}
        {respuesta && (
          <div className="bg-[#f6f7fb] border border-gray-100 rounded-2xl rounded-bl-md px-3.5 py-2.5">
            <p className="text-[10px] font-bold text-[#5b6b8c] uppercase tracking-wide mb-0.5">Focusia dice</p>
            <p className="text-sm text-gray-800 leading-relaxed">{respuesta}</p>
          </div>
        )}
        {estado !== 'idle' && (
          <button
            type="button"
            onClick={empezarEscucha}
            className="w-full py-2.5 rounded-full bg-gradient-to-r from-[#2b44ff] to-[#a855f7] text-white text-sm font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2"
          >
            <Mic className="w-4 h-4" /> Hablar de nuevo
          </button>
        )}
        {estado === 'escuchando' && (
          <button
            type="button"
            onClick={() => {
              try {
                recogRef.current?.stop();
              } catch {}
            }}
            className="w-full py-2.5 rounded-full bg-[#1e1b4b] text-white text-sm font-bold hover:brightness-125 transition-all"
          >
            Enviar lo dicho
          </button>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={textoManual}
            onChange={e => setTextoManual(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') enviarManual(); }}
            placeholder="O escribe aquí si el micrófono falla..."
            className="flex-1 min-w-0 px-3.5 py-2.5 rounded-full border border-gray-200 text-sm outline-none focus:border-purple-400"
          />
          <button
            type="button"
            onClick={enviarManual}
            disabled={!textoManual.trim() || estado === 'pensando'}
            className="px-4 py-2.5 rounded-full bg-[#1e1b4b] text-white text-sm font-bold disabled:opacity-40"
          >
            Enviar
          </button>
        </div>
        <button
          type="button"
          onClick={probarAudio}
          className="w-full py-2 rounded-full border border-gray-200 text-xs font-bold text-[#5b6b8c] hover:bg-gray-50 flex items-center justify-center gap-2"
        >
          <Volume2 className="w-3.5 h-3.5" /> Probar audio
        </button>
      </div>
    </div>
  );
}
