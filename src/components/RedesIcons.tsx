import React from 'react';

export type RedId = 'tiktok' | 'facebook' | 'instagram' | 'linkedin' | 'youtube' | 'x';

export const REDES: { id: RedId; nombre: string; color: string; dominios: string[]; tutorial: string[] }[] = [
  {
    id: 'tiktok',
    nombre: 'TikTok',
    color: '#FFFFFF',
    dominios: ['tiktok.com'],
    tutorial: [
      'Abre TikTok y entra a tu perfil (ícono “Yo”).',
      'Toca “Compartir perfil” y luego “Copiar enlace”.',
      'Pega el enlace aquí abajo y pulsa Guardar.',
    ],
  },
  {
    id: 'facebook',
    nombre: 'Facebook',
    color: '#FFFFFF',
    dominios: ['facebook.com', 'fb.com'],
    tutorial: [
      'Abre Facebook y entra a tu perfil.',
      'Toca los tres puntos (···) junto a tu nombre y elige “Copiar enlace del perfil”.',
      'Pega el enlace aquí abajo y pulsa Guardar.',
    ],
  },
  {
    id: 'instagram',
    nombre: 'Instagram',
    color: '#E1306C',
    dominios: ['instagram.com'],
    tutorial: [
      'Abre Instagram y entra a tu perfil.',
      'Tu enlace es instagram.com/tu_usuario: cópialo de la barra del navegador o compártelo.',
      'Pega el enlace aquí abajo y pulsa Guardar.',
    ],
  },
  {
    id: 'linkedin',
    nombre: 'LinkedIn',
    color: '#0A66C2',
    dominios: ['linkedin.com'],
    tutorial: [
      'Abre LinkedIn y entra a tu perfil.',
      'Toca “Más” y luego “Compartir perfil” o copia la URL de la barra del navegador.',
      'Pega el enlace aquí abajo y pulsa Guardar.',
    ],
  },
  {
    id: 'youtube',
    nombre: 'YouTube',
    color: '#FF0000',
    dominios: ['youtube.com', 'youtu.be'],
    tutorial: [
      'Abre YouTube y entra a tu canal (tu foto → “Tu canal”).',
      'Toca los tres puntos (···) y elige “Compartir” → “Copiar vínculo”.',
      'Pega el enlace aquí abajo y pulsa Guardar.',
    ],
  },
  {
    id: 'x',
    nombre: 'X',
    color: '#000000',
    dominios: ['x.com', 'twitter.com'],
    tutorial: [
      'Abre X y entra a tu perfil.',
      'Copia la URL de la barra del navegador (x.com/tu_usuario).',
      'Pega el enlace aquí abajo y pulsa Guardar.',
    ],
  },
];

function base(props: React.SVGProps<SVGSVGElement>, children: React.ReactNode) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      {children}
    </svg>
  );
}

export const RedIcon: React.FC<{ id: RedId; className?: string }> = ({ id, className = 'w-10 h-10' }) => {
  switch (id) {
    case 'tiktok':
      return img({ className }, './tiktok-1.png');
    case 'facebook':
      return img({ className }, './face.png');
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'linkedin':
      return img ({ className }, './link.png');
    case 'youtube':
      return base({ className }, <path d="M21.6 7.2c-.2-1.4-1-2.3-2.4-2.5C17.2 4.5 12 4.5 12 4.5s-5.2 0-7.2.2c-1.4.2-2.2 1.1-2.4 2.5C2.2 8.7 2.2 12 2.2 12s0 3.3.2 4.8c.2 1.4 1 2.3 2.4 2.5 2 .2 7.2.2 7.2.2s5.2 0 7.2-.2c1.4-.2 2.2-1.1 2.4-2.5.2-1.5.2-4.8.2-4.8s0-3.3-.2-4.8zM10 15.2V8.8l5.2 3.2L10 15.2z" />);
    case 'x':
      return base({ className }, <path d="M17.7 3H21l-7.3 8.3L22.2 21h-6.7l-5.2-6.3L4.4 21H1l7.8-8.9L1.8 3h6.9l4.7 5.7L17.7 3zm-1.2 16h1.9L7 4.7H5L16.5 19z" />);
  }
};

export function normalizarUrl(raw: string): string {
  const v = raw.trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

export function validarRed(id: RedId, raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  let host = '';
  try {
    host = new URL(normalizarUrl(v)).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return 'Enlace no válido. Revisa que esté bien copiado.';
  }
  const red = REDES.find(r => r.id === id);
  const ok = red?.dominios.some(d => host === d || host.endsWith(`.${d}`));
  if (!ok) return `Ese enlace no parece de ${red?.nombre}. Verifica que sea tu perfil.`;
  return null;
}
function img(arg0: { className: string; }, arg1: string): React.ReactNode | Promise<React.ReactNode> {
  return <img src={arg1} className={arg0.className} alt="" aria-hidden="true" />;
}

