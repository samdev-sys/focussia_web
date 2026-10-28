import React, { useRef } from 'react';

export default function CyberToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const labelRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative flex flex-col items-center gap-1">
      <style>{`
        @keyframes lava-shift {
          0% { background-position: 0% 20%, 100% 80%, 50% 50%; }
          25% { background-position: 40% 80%, 60% 20%, 30% 70%; }
          50% { background-position: 100% 40%, 0% 60%, 70% 30%; }
          75% { background-position: 60% 0%, 40% 100%, 20% 80%; }
          100% { background-position: 0% 20%, 100% 80%, 50% 50%; }
        }
        @keyframes lava-pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(1.05); }
        }
        .toggle-track {
          position: relative;
          width: 44px;
          height: 24px;
          border-radius: 9999px;
          cursor: pointer;
          transition: background 0.4s ease, box-shadow 0.4s ease;
          flex-shrink: 0;
        }
        .toggle-track-off {
          background: #1e1e24;
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.4);
        }
        .toggle-track-on {
          background: #2a0a05;
          box-shadow: 0 0 18px rgba(255, 60, 0, 0.25), inset 0 0 20px rgba(255, 80, 0, 0.15);
        }
        .toggle-lava {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          opacity: 0;
          transition: opacity 0.5s ease;
          background:
            radial-gradient(ellipse at 30% 40%, #ff4500 0%, transparent 45%),
            radial-gradient(ellipse at 70% 60%, #ffcc00 0%, transparent 35%),
            radial-gradient(ellipse at 50% 50%, #8b0000 0%, transparent 55%),
            #1a0500;
          background-size: 300% 300%;
          pointer-events: none;
          z-index: 0;
        }
        .toggle-lava-on {
          opacity: 1;
          animation: lava-shift 4s ease-in-out infinite, lava-pulse 3s ease-in-out infinite;
        }
        .toggle-knob {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
                      box-shadow 0.35s ease,
                      border-color 0.35s ease,
                      background 0.35s ease;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .toggle-knob-off {
          background: #9ca3af;
          border: 2px solid #6b7280;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        .toggle-knob-on {
          transform: translateX(20px);
          background: #0a0a0a;
          border: 2px solid #ff1493;
          box-shadow: 0 0 8px rgba(255, 20, 147, 0.6), 0 0 20px rgba(255, 20, 147, 0.25);
        }
        .toggle-knob-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          transition: background 0.35s ease;
        }
        .toggle-knob-dot-off { background: #4b5563; }
        .toggle-knob-dot-on { background: #ff1493; box-shadow: 0 0 4px #ff1493; }
        .toggle-glow {
          position: absolute;
          inset: -6px;
          border-radius: 9999px;
          opacity: 0;
          transition: opacity 0.5s ease;
          pointer-events: none;
          z-index: -1;
        }
        .toggle-glow-on {
          opacity: 1;
          background: radial-gradient(ellipse at 50% 50%, rgba(255, 20, 147, 0.2), rgba(255, 80, 0, 0.15), transparent 70%);
          filter: blur(8px);
          animation: glow-pulse 2.5s ease-in-out infinite;
        }
      `}</style>

      <div
        className={`toggle-track ${checked ? 'toggle-track-on' : 'toggle-track-off'}`}
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(!checked); } }}
      >
        <div className={`toggle-glow ${checked ? 'toggle-glow-on' : ''}`} />
        <div className={`toggle-lava ${checked ? 'toggle-lava-on' : ''}`} />
        <div className={`toggle-knob ${checked ? 'toggle-knob-on' : 'toggle-knob-off'}`}>
          <div className={`toggle-knob-dot ${checked ? 'toggle-knob-dot-on' : 'toggle-knob-dot-off'}`} />
        </div>
      </div>
    </div>
  );
}
