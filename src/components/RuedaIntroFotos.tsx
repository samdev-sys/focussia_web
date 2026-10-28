import React from 'react';
// FotoIntro / FotoGuia: pantallas del flujo Rueda de la Vida (shell: RuedaShell v2).
import {
  Play, Volume2,
  Settings, Maximize, ShieldCheck,
} from 'lucide-react';

function MiniWheel() {
  return (
    <img src="/rueda.png" alt="Rueda de la Vida" className="w-full h-full object-contain" />
  );
}

interface FotoIntroProps {
  nombre: string;
  avatarImg: string | null;
  videoAvance: number;
  videoSegundos: number;
  videoListo: boolean;
  textoVideo: string;
  onPlay: () => void;
  onComenzar: () => void;
  onSaltar: () => void;
}

export const FotoIntro: React.FC<FotoIntroProps> = ({
  nombre, avatarImg, videoAvance, videoSegundos, videoListo, textoVideo, onPlay, onComenzar, onSaltar,
}) => {
  const playing = videoAvance > 0 || videoListo;
  const pct = Math.min(100, (videoAvance / videoSegundos) * 100);
  const puedeContinuar = playing;
  return (
    <div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 sm:p-5 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
        {/* Coach + burbuja (foto 1 izquierda) */}
        <div className="relative rounded-xl overflow-hidden bg-gradient-to-b from-[#2b3fd4] via-[#4b3fd6] to-[#7a5af8] min-h-[400px] flex items-end">
          <img src={avatarImg || '/avatars/Sophya.jpeg'} alt="Coach Focusia" className="absolute inset-0 w-full h-full object-cover object-top" onError={(e) => { const t = e.target as HTMLImageElement; if (!t.src.includes('Sophya.jpeg')) t.src = '/avatars/Sophya.jpeg'; else t.style.display = 'none'; }} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2b3fd4]/30 via-transparent to-white/10" />
          <div className="absolute top-14 right-2 left-32 sm:left-36 bg-white rounded-xl rounded-bl-none shadow-xl p-4 text-left mt-40">
            <div className="absolute left-[-8px] top-1/2 -translate-y-1/2 w-4 h-4 bg-white rotate-45" />
            <p className="text-[13px] text-gray-800 leading-snug">Tu diagnóstico<br />comienza aquí{nombre ? `,` : ''}<br />{nombre ? `${nombre}.` : ''}</p>
            <p className="mt-4 text-[13px] text-gray-800 leading-snug">La <span className="text-[#4f46e5] font-bold">Rueda de la Vida</span><br />te mostrará qué<br />áreas están fuertes<br />y cuáles necesitan<br />atención.</p>
          </div>
          <div className="relative p-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 bg-white/90 rounded-full px-2 py-1 text-[10px] font-bold text-[#4f46e5]">
              <img src="/focusia-logo.png" alt="" className="w-4 h-4 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              Focusia
            </span>
            {avatarImg && <img src={avatarImg} alt="tu avatar" className="w-7 h-7 rounded-full object-cover border-2 border-white shadow" title="Tu avatar" />}
          </div>
        </div>

        {/* Reproductor (foto 1 derecha) */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl overflow-hidden bg-[#070c2b] border border-[#1a2456] shadow-lg">
            <div className="px-3 pt-3">
              <div className="rounded-lg bg-gradient-to-r from-[#1d3de8] via-[#2b1d8f] to-[#3d0f4f] border border-[#3b3fd4]/40 text-center py-2">
                <span className="text-white font-extrabold tracking-widest text-sm sm:text-lg">RUEDA DE LA VIDA</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-3 p-4 items-center">
              <div className="relative mx-auto w-[230px] h-[230px] sm:w-[260px] sm:h-[260px]">
                <MiniWheel />
                {!playing ? (
                  <button onClick={onPlay} aria-label="Reproducir video" className="absolute right-0 bottom-8 w-16 h-16 rounded-full bg-[#8b5cf6] hover:bg-[#7c3aed] shadow-[0_8px_30px_rgba(139,92,246,0.6)] flex items-center justify-center transition-all hover:scale-105">
                    <Play className="w-8 h-8 text-white fill-white ml-1" />
                  </button>
                ) : (
                  <div className="absolute inset-x-2 bottom-1 bg-black/70 rounded-lg px-3 py-2">
                    <p className="text-[11px] text-purple-100/90 leading-snug line-clamp-3">{textoVideo}</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-3">
                {['SALUD', 'FAMILIA', 'DINERO'].map((t) => (
                  <div key={t} className="rounded-xl border border-white/40 bg-gradient-to-r from-[#fcd9a0] to-[#f78f8f] py-3 text-center shadow">
                    <span className="font-extrabold tracking-wide text-[#1e1b3a] text-lg">{t}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-black/90 px-4 py-2.5 flex items-center gap-3 text-white">
              <button onClick={onPlay} className="hover:opacity-80" aria-label="Play">
                <Play className="w-5 h-5 fill-white" />
              </button>
              <span className="text-xs font-medium whitespace-nowrap">0:{String(videoAvance).padStart(2, '0')} / 0:{videoSegundos}</span>
              <div className="flex-1 h-1 rounded-full bg-white/20 relative">
                <div className="absolute left-0 top-0 h-full bg-white/70 rounded-full transition-all" style={{ width: `${pct}%` }} />
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow transition-all" style={{ left: `${pct}%` }} />
              </div>
              <Volume2 className="w-5 h-5" />
              <div className="w-20 h-1 rounded-full bg-white/20 relative hidden sm:block">
                <div className="absolute left-0 top-0 h-full w-[70%] bg-[#6d5bff] rounded-full" />
                <div className="absolute left-[70%] top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full" />
              </div>
              <Settings className="w-5 h-5 opacity-90" />
              <Maximize className="w-5 h-5 opacity-90" />
            </div>
          </div>
          <button
            onClick={onComenzar}
            disabled={!puedeContinuar}
            className={`w-full rounded-xl text-lg py-3.5 transition-all shadow ${puedeContinuar ? 'bg-gradient-to-r from-[#2547f4] to-[#6d28d9] text-white hover:brightness-110 active:scale-[0.99]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            Comenzar evaluación
          </button>
          {!playing && <p className="text-xs text-gray-400 text-center -mt-2">Presiona play para ver el video de 0:{videoSegundos} seg. Podrás continuar después de iniciarlo.</p>}
          <button onClick={onSaltar} className="text-xs text-gray-400 hover:text-gray-600 mx-auto">Saltar video</button>
        </div>
      </div>
    </div>
  );
};

// ---------- Rueda 10 áreas estática (foto 2) ----------
function Rueda10() {
  return (
    <img src="/Rueda3.png" alt="Rueda de la Vida" className="w-full h-auto max-w-[480px] mx-auto object-contain" />
  );
}
const LEYENDA = [
  { rango: '1 a 2: Crítico', color: '#f45252' },
  { rango: '3 a 4: Bajo', color: '#f5821f' },
  { rango: '5 a 6: Medio', color: '#fbbf12' },
  { rango: '7 a 8: Bueno', color: '#1d9bd0' },
  { rango: '9 a 10: Excelente', color: '#5cbf6a' },
];

interface FotoGuiaProps {
  onBack: () => void;
  onContinue: () => void;
}

export const FotoGuia: React.FC<FotoGuiaProps> = ({ onBack, onContinue }) => {
  return (
    <div>
      <div className="bg-[#f4f2ff] border border-[#e5e0ff] rounded-2xl px-4 sm:px-6 py-4 flex gap-4 items-start mb-3">
        <div className="shrink-0 w-14 flex justify-center">
          <ShieldCheck className="w-12 h-12 text-[#6d28d9]" strokeWidth={1.5} />
        </div>
        <div className="border-l border-[#d9d3ff] pl-4">
          <p className="text-[#23264d] text-[14px] sm:text-[15px] leading-relaxed">
            Evalúa cada área de tu vida del 1 al 10, donde 1 significa muy bajo y 10 significa muy alto.
            Responde con total sinceridad: este diagnóstico no es para juzgarte, sino para ayudarte a identificar
            dónde necesitas poner foco para recuperar equilibrio y construir tu Gran Meta Anual con dirección real.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_290px] gap-3">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 overflow-x-auto">
          <Rueda10 />
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col divide-y divide-gray-100">
          {LEYENDA.map((l) => (
            <div key={l.rango} className="flex items-center gap-4 py-4">
              <span className="w-10 h-10 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
              <span className="text-[#23264d] text-[15px] font-medium">{l.rango}</span>
            </div>
          ))}
          <div className="pt-4 flex flex-col gap-2">
            <button onClick={onContinue} className="w-full rounded-xl bg-gradient-to-r from-[#2547f4] to-[#6d28d9] text-white font-semibold py-3 hover:brightness-110 transition-all">Continuar a la evaluación</button>
            <button onClick={onBack} className="w-full rounded-xl border border-gray-200 text-gray-500 text-sm py-2 hover:bg-gray-50">Volver al video</button>
          </div>
        </div>
      </div>
    </div>
  );
};
