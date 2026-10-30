import React, { useState } from 'react';
import {
  Play, Volume2, Settings, Maximize, CircleHelp, Bell, ShieldCheck, Info
} from 'lucide-react';
import { notificationService, type NotificationData } from '../services/api';
import { ConfiguracionPanel } from './ConfiguracionPanel';
import HelpChat from './HelpChat';

interface IntroVideoProps {
  userName?: string;
  onStart: () => void;
  onClose: () => void;
}

function MiniWheel() {
  return <img src="/rueda.png" alt="Rueda de la Vida" className="w-full h-full object-contain" />;
}

/** Acciones de cabecera compartidas por las pantallas del flujo Rueda. */
function RuedaHeaderActions() {
  const [showHelp, setShowHelp] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const toggleNotifications = async () => {
    if (!showNotifications) {
      try { setNotifications(await notificationService.getAll()); } catch { /* noop */ }
    }
    setShowNotifications(v => !v);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button onClick={() => setShowHelp(true)} className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-700 hover:bg-gray-50" title="Ayuda de IA">
          <CircleHelp className="w-5 h-5" />
        </button>
        <div className="relative">
          <button onClick={toggleNotifications} className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-700 hover:bg-gray-50 relative" title="Notificaciones">
            <Bell className="w-5 h-5" />
            {notifications.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#6d28d9] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {notifications.length > 9 ? '9+' : notifications.length}
              </span>
            )}
          </button>
          {showNotifications && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-xl shadow-2xl border border-gray-100 z-50">
                <p className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">Notificaciones</p>
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-gray-400 text-center">Sin notificaciones.</p>
                ) : notifications.map(n => (
                  <div key={n.id} className="px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <p className="text-sm font-semibold text-gray-800">{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <button onClick={() => setShowConfig(true)} className="w-9 h-9 rounded-full border border-gray-200 bg-white hidden sm:flex items-center justify-center text-gray-700 hover:bg-gray-50" title="Configuración">
          <Settings className="w-5 h-5" />
        </button>
      </div>
      <ConfiguracionPanel isOpen={showConfig} onClose={() => setShowConfig(false)} />
      <HelpChat
        open={showHelp}
        onClose={() => setShowHelp(false)}
        pasoLabel="Rueda de la Vida"
        titulo="Introducción y evaluación"
        bienvenida="¡Hola! Soy FocusIA. Puedo explicarte cómo funciona la Rueda de la Vida y cómo evaluar cada área. ¿En qué te ayudo?"
        contextoAyuda="El usuario está en la introducción de la Rueda de la Vida de Focussia y pidió ayuda desde el icono de interrogación."
      />
    </>
  );
}

export const RuedaIntroVideo: React.FC<IntroVideoProps> = ({ userName = 'Don Roberto', onStart, onClose }) => {
  return (
    <div className="min-h-screen bg-[#f2f4f7] overflow-y-auto">
      <div className="max-w-[1120px] mx-auto px-3 sm:px-6 py-4">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 sm:px-6 py-3 flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <path d="M 50 50 L 50 2 A 48 48 0 0 1 83.94 16.06 Z" fill="#911d33" />
                <path d="M 50 50 L 83.94 16.06 A 48 48 0 0 1 98 50 Z" fill="#0c5a75" />
                <path d="M 50 50 L 98 50 A 48 48 0 0 1 83.94 83.94 Z" fill="#00a3e0" />
                <path d="M 50 50 L 83.94 83.94 A 48 48 0 0 1 50 98 Z" fill="#4cd2e4" />
                <path d="M 50 50 L 50 98 A 48 48 0 0 1 16.06 83.94 Z" fill="#4fd1a5" />
                <path d="M 50 50 L 16.06 83.94 A 48 48 0 0 1 2 50 Z" fill="#fcd34d" />
                <path d="M 50 50 L 2 50 A 48 48 0 0 1 16.06 16.06 Z" fill="#f97316" />
                <path d="M 50 50 L 16.06 16.06 A 48 48 0 0 1 50 2 Z" fill="#f43f5e" />
              </svg>
            </div>
            <h1 className="text-lg sm:text-2xl font-extrabold text-[#101331]">Rueda de la Vida</h1>
          </div>
          <div className="flex items-center gap-2">
            <RuedaHeaderActions />
          </div>
        </div>

        {/* Body card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5">
          {/* Coach */}
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-[#2b3fd4] via-[#4b3fd6] to-[#7a5af8] min-h-[420px] flex items-end">
            <img src="/avatars/Sophya.jpeg" alt="Coach Focusia" className="absolute inset-0 w-full h-full object-cover object-top" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#2b3fd4]/30 via-transparent to-white/10" />
            {/* Speech bubble */}
            <div className="absolute top-16 right-2 left-32 sm:left-36 bg-white rounded-2xl rounded-bl-none shadow-xl p-4 text-left">
              <div className="absolute left-[-8px] top-1/2 -translate-y-1/2 w-4 h-4 bg-white rotate-45" />
              <p className="text-[15px] text-gray-800 leading-snug">Tu diagnóstico<br />comienza aquí,<br />{userName}.</p>
              <p className="mt-4 text-[15px] text-gray-800 leading-snug">La <span className="text-[#4f46e5] font-bold">Rueda de la Vida</span><br />te mostrará qué<br />áreas están fuertes<br />y cuáles necesitan<br />atención.</p>
            </div>
            <div className="relative p-3">
              <span className="inline-flex items-center gap-1 bg-white/90 rounded-full px-2 py-1 text-[10px] font-bold text-[#4f46e5]">
                <img src="/focusia-logo.png" alt="" className="w-4 h-4 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                Focusia
              </span>
            </div>
          </div>

          {/* Video player mock */}
          <div className="flex flex-col gap-4">
            <div className="rounded-xl overflow-hidden bg-[#070c2b] border border-[#1a2456] shadow-lg">
              <div className="px-3 pt-3">
                <div className="rounded-lg bg-gradient-to-r from-[#1d3de8] via-[#2b1d8f] to-[#3d0f4f] border border-[#3b3fd4]/40 text-center py-2">
                  <span className="text-white font-extrabold tracking-widest text-sm sm:text-lg">RUEDA DE LA VIDA</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-3 p-4 items-center">
                <div className="relative mx-auto w-[240px] h-[240px] sm:w-[280px] sm:h-[280px]">
                  <MiniWheel />
                  <button onClick={onStart} aria-label="Reproducir video" className="absolute right-0 bottom-8 w-16 h-16 rounded-full bg-[#8b5cf6] hover:bg-[#7c3aed] shadow-[0_8px_30px_rgba(139,92,246,0.6)] flex items-center justify-center transition-all hover:scale-105">
                    <Play className="w-8 h-8 text-white fill-white ml-1" />
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  {['SALUD', 'FAMILIA', 'DINERO'].map((t) => (
                    <div key={t} className="rounded-xl border border-white/40 bg-gradient-to-r from-[#fcd9a0] to-[#f78f8f] py-3 text-center shadow">
                      <span className="font-extrabold tracking-wide text-[#1e1b3a] text-lg">{t}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Controls */}
              <div className="bg-black/90 px-4 py-2.5 flex items-center gap-3 text-white">
                <button onClick={onStart} className="hover:opacity-80"><Play className="w-5 h-5 fill-white" /></button>
                <span className="text-xs font-medium whitespace-nowrap">0:00 / 0:25</span>
                <div className="flex-1 h-1 rounded-full bg-white/20 relative">
                  <div className="absolute left-0 top-0 h-full w-[8%] bg-white/70 rounded-full" />
                  <div className="absolute left-[8%] top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow" />
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
            <button onClick={onStart} className="w-full rounded-xl bg-gradient-to-r from-[#2547f4] to-[#6d28d9] text-white font-medium text-lg py-3.5 hover:brightness-110 active:scale-[0.99] transition-all shadow">
              Comenzar evaluación
            </button>
            <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600 mx-auto">Saltar introducción</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const LEYENDA = [
  { rango: '1 a 2: Crítico', color: '#f45252' },
  { rango: '3 a 4: Bajo', color: '#f5821f' },
  { rango: '5 a 6: Medio', color: '#fbbf12' },
  { rango: '7 a 8: Bueno', color: '#1d9bd0' },
  { rango: '9 a 10: Excelente', color: '#5cbf6a' },
];

function Rueda10() {
  return (
    <img src="/rueda.png" alt="Rueda de la Vida" className="w-full h-auto max-w-[420px] mx-auto object-contain" />
  );
}

interface GuiaProps {
  onBack: () => void;
  onContinue: () => void;
  onClose: () => void;
}

export const RuedaGuiaEvaluacion: React.FC<GuiaProps> = ({ onBack, onContinue, onClose }) => {
  return (
    <div className="min-h-screen bg-[#f2f4f7] overflow-y-auto">
      <div className="max-w-[1120px] mx-auto px-3 sm:px-6 py-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 sm:px-6 py-3 flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <path d="M 50 50 L 50 2 A 48 48 0 0 1 83.94 16.06 Z" fill="#911d33" />
                <path d="M 50 50 L 83.94 16.06 A 48 48 0 0 1 98 50 Z" fill="#0c5a75" />
                <path d="M 50 50 L 98 50 A 48 48 0 0 1 83.94 83.94 Z" fill="#00a3e0" />
                <path d="M 50 50 L 83.94 83.94 A 48 48 0 0 1 50 98 Z" fill="#4cd2e4" />
                <path d="M 50 50 L 50 98 A 48 48 0 0 1 16.06 83.94 Z" fill="#4fd1a5" />
                <path d="M 50 50 L 16.06 83.94 A 48 48 0 0 1 2 50 Z" fill="#fcd34d" />
                <path d="M 50 50 L 2 50 A 48 48 0 0 1 16.06 16.06 Z" fill="#f97316" />
                <path d="M 50 50 L 16.06 16.06 A 48 48 0 0 1 50 2 Z" fill="#f43f5e" />
              </svg>
            </div>
            <h1 className="text-lg sm:text-2xl font-extrabold text-[#101331]">Rueda de la Vida</h1>
          </div>
          <div className="flex items-center gap-2">
            <RuedaHeaderActions />
          </div>
        </div>

        {/* Info banner */}
        <div className="bg-[#f4f2ff] border border-[#e5e0ff] rounded-2xl px-4 sm:px-6 py-4 flex gap-4 items-start mb-3">
          <div className="shrink-0 w-14 flex justify-center">
            <ShieldCheck className="w-12 h-12 text-[#6d28d9]" strokeWidth={1.5} />
          </div>
          <div className="border-l border-[#d9d3ff] pl-4">
            <p className="text-[#23264d] text-[14px] sm:text-[16px] leading-relaxed">
              Evalúa cada área de tu vida del 1 al 10, donde 1 significa muy bajo y 10 significa muy alto.<br />
              Responde con total sinceridad: este diagnóstico no es para juzgarte, sino para ayudarte a identificar<br />
              dónde necesitas poner foco para recuperar equilibrio y construir tu Gran Meta Anual con dirección real.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-3">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-8 overflow-x-auto">
            <Rueda10 />
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col divide-y divide-gray-100">
            {LEYENDA.map((l) => (
              <div key={l.rango} className="flex items-center gap-4 py-5">
                <span className="w-11 h-11 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                <span className="text-[#23264d] text-[16px] font-medium">{l.rango}</span>
              </div>
            ))}
            <div className="pt-5 flex flex-col gap-2">
              <button onClick={onContinue} className="w-full rounded-xl bg-gradient-to-r from-[#2547f4] to-[#6d28d9] text-white font-semibold py-3 hover:brightness-110 transition-all">Continuar a la evaluación</button>
              <button onClick={onBack} className="w-full rounded-xl border border-gray-200 text-gray-500 text-sm py-2 hover:bg-gray-50">Volver al video</button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 text-gray-400 text-xs">
          <Info className="w-4 h-4" />
          <span>Fiel a tu diseño: 10 áreas — Trabajo, Dinero, Salud, Pareja, Familia, Espiritualidad, Diversión, Entorno, Desarrollo y Contribución.</span>
        </div>
      </div>
    </div>
  );
};
