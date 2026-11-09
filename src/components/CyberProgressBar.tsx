import React from 'react';

export default function CyberProgressBar({
  level,
  currentXP,
  nextLevelXP,
  progress,
  activityProgress,
}: {
  level: number;
  currentXP: number;
  nextLevelXP: number;
  progress: number;
  activityProgress?: number | null;
}) {
  const cappedProgress = Math.min(100, Math.max(0, progress));
  const xpLabel = nextLevelXP > 0 ? `${currentXP}/${nextLevelXP} XP` : `${currentXP} XP`;
  const title =
    activityProgress != null
      ? `Nivel ${level} · ${xpLabel} · Actividades ${Math.round(Math.min(100, Math.max(0, activityProgress)))}%`
      : `Nivel ${level} · ${xpLabel}`;

  return (
    <div className="w-full" title={title}>
      <div className="mb-0.5 flex items-center justify-between px-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
        <span>Nv {level}</span>
        <span>{xpLabel}</span>
      </div>
      <div className="relative h-4 w-full">
        <style>{`
          @keyframes bar-shimmer {
            0% { background-position: -200% center; }
            100% { background-position: 200% center; }
          }
          @keyframes glow-pulse {
            0%, 100% { opacity: 0.2; }
            50% { opacity: 0.5; }
          }
          .xp-bar-track {
            position: absolute;
            inset: 0;
            border-radius: 6px;
            background: #1a1a22;
            overflow: hidden;
            border: 1px solid rgba(255,255,255,0.06);
          }
          .xp-bar-fill {
            height: 100%;
            border-radius: 6px;
            background: linear-gradient(90deg, #6366f1, #a855f7, #ec4899, #a855f7, #6366f1);
            background-size: 200% 100%;
            animation: bar-shimmer 3s linear infinite;
            transition: width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
            position: relative;
          }
          .xp-bar-fill::after {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: 6px;
            box-shadow: inset 0 0 8px rgba(168, 85, 247, 0.3);
          }
          .xp-bar-glow {
            position: absolute;
            top: -2px; left: -2px; right: -2px; bottom: -2px;
            border-radius: 8px;
            background: linear-gradient(90deg, #6366f1, #a855f7, #ec4899);
            filter: blur(8px);
            opacity: 0;
            transition: opacity 0.4s ease;
            pointer-events: none;
            z-index: -1;
          }
          .xp-bar-glow.active {
            opacity: 0.3;
            animation: glow-pulse 2s ease-in-out infinite;
          }
        `}</style>
        <div className="xp-bar-track">
          <div className={`xp-bar-glow ${cappedProgress > 0 ? 'active' : ''}`} />
          <div className="xp-bar-fill" style={{ width: `${cappedProgress}%` }} />
        </div>
        <span className="absolute inset-0 z-10 flex items-center justify-center text-[9px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          {Math.round(cappedProgress)}%
        </span>
      </div>
      {activityProgress != null && (
        <div className="mt-0.5 px-0.5 text-[8px] font-semibold text-slate-500 dark:text-slate-400">
          Actividades {Math.round(Math.min(100, Math.max(0, activityProgress)))}%
        </div>
      )}
    </div>
  );
}
