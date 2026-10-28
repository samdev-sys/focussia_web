import React, { useRef, useEffect } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

function getCapsulePoint(t: number, w: number, h: number) {
  const r = h / 2;
  const straightLen = Math.max(0, w - h);
  const arcLen = Math.PI * r;
  const totalLen = 2 * arcLen + 2 * straightLen;
  const pos = ((t % 1) * totalLen + totalLen) % totalLen;

  let x: number, y: number;
  if (pos < straightLen) {
    x = r + pos; y = 0;
  } else if (pos < straightLen + arcLen) {
    const a = (pos - straightLen) / r - Math.PI / 2;
    x = w - r + r * Math.cos(a); y = r + r * Math.sin(a);
  } else if (pos < straightLen + arcLen + straightLen) {
    x = w - r - (pos - straightLen - arcLen); y = h;
  } else {
    const a = (pos - straightLen - arcLen - straightLen) / r + Math.PI / 2;
    x = r + r * Math.cos(a); y = r + r * Math.sin(a);
  }
  return { x, y };
}

export default function CyberButton({
  children,
  className = '',
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef(false);
  const particlesRef = useRef<Particle[]>([]);
  const trailRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const glow = glowRef.current;
    const button = buttonRef.current;
    if (!canvas || !glow || !button) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let w = 0, h = 0;

    const resize = () => {
      const rect = button.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(button);

    const particles: Particle[] = [];
    let trailT = 0;

    const animate = () => {
      ctx.clearRect(0, 0, w, h);
      if (w === 0 || h === 0) { animId = requestAnimationFrame(animate); return; }

      if (hoverRef.current) {
        trailT += 0.008;
        if (trailT > 1) trailT -= 1;

        const trailLen = 0.25;
        const steps = 40;

        for (let i = 0; i < steps; i++) {
          const stepT = ((trailT - (i / steps) * trailLen) % 1 + 1) % 1;
          const p = getCapsulePoint(stepT, w, h);
          const alpha = 1 - (i / steps);
          const radius = 0.5 + alpha * 2.5;

          ctx.beginPath();
          ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0, 162, 255, ${alpha * 0.9})`;
          ctx.fill();
        }

        const head = getCapsulePoint(trailT, w, h);
        ctx.shadowColor = '#00a2ff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(head.x, head.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#00a2ff';
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(head.x, head.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();

        for (let i = 0; i < 2; i++) {
          const t = Math.random();
          const p = getCapsulePoint(t, w, h);
          const angle = Math.random() * Math.PI * 2;
          const speed = 0.3 + Math.random() * 0.6;
          particles.push({
            x: p.x, y: p.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            maxLife: 60 + Math.random() * 60,
            size: 0.8 + Math.random() * 2,
          });
        }

        glow.style.opacity = '0.5';
      } else {
        const cur = parseFloat(glow.style.opacity) || 0;
        if (cur > 0) glow.style.opacity = Math.max(0, cur - 0.015).toString();
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.life -= 1 / p.maxLife;

        if (p.life <= 0) { particles.splice(i, 1); continue; }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * Math.max(0, p.life), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 220, 255, ${p.life * 0.7})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="relative inline-flex"
      onMouseEnter={() => { hoverRef.current = true; }}
      onMouseLeave={() => { hoverRef.current = false; }}
    >
      <div
        ref={glowRef}
        className="absolute -inset-3 rounded-full opacity-0 pointer-events-none"
        style={{
          filter: 'blur(20px)',
          background: 'radial-gradient(circle, rgba(0,162,255,0.25), transparent 70%)',
          transition: 'opacity 0.15s ease',
        }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ borderRadius: '9999px', zIndex: 10 }}
      />
      <button ref={buttonRef} onClick={onClick} className={className}>
        {children}
      </button>
    </div>
  );
}
