/* Sonido de fin de sesión / alarma del Modo Focus (WebAudio).
   El contexto se crea y reanuda SOLO desde un gesto del usuario (clic en «Iniciar»).
   La alarma que suena después solo reproduce si el contexto ya está activo;
   así evitamos warnings de autoplay del navegador. */

let contexto: AudioContext | null = null;
let desbloqueado = false;

export function desbloquearAudio() {
  try {
    if (typeof window === 'undefined') return;
    if (!contexto) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      contexto = new Ctx();
    }
    if (contexto.state === 'suspended') {
      void contexto.resume().then(() => { desbloqueado = contexto?.state === 'running'; }).catch(() => { /* noop */ });
    } else {
      desbloqueado = contexto.state === 'running';
    }
  } catch { /* noop */ }
}

export function sonarFin(veces = 2) {
  try {
    const ctx = contexto;
    if (!ctx) return; // no desbloqueado por gesto: no crear contexto fuera de interacción
    if (ctx.state === 'suspended') {
      // intentar reanudar solo si ya fue desbloqueado antes; si falla, omitir sin warning ruidoso
      if (!desbloqueado) return;
      void ctx.resume().catch(() => { /* noop */ });
    }
    for (let i = 0; i < veces; i++) {
      const t = ctx.currentTime + i * 0.35;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.15, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    }
  } catch { /* noop */ }
}
