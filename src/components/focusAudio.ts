/* Sonido de fin de sesión / alarma del Modo Focus (WebAudio).
   El contexto se crea y reanuda desde el clic de «Iniciar» (gesto del usuario):
   así el navegador no lo deja suspendido cuando la alarma suena más tarde. */

let contexto: AudioContext | null = null;

export function desbloquearAudio() {
  try {
    if (!contexto) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      contexto = new Ctx();
    }
    if (contexto.state === 'suspended') contexto.resume().catch(() => { /* noop */ });
  } catch { /* noop */ }
}

export function sonarFin(veces = 2) {
  try {
    desbloquearAudio();
    const ctx = contexto;
    if (!ctx) return;
    for (let i = 0; i < veces; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.001, ctx.currentTime + i * 0.35);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + i * 0.35 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.35 + 0.28);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.35);
      osc.stop(ctx.currentTime + i * 0.35 + 0.3);
    }
  } catch { /* noop */ }
}
