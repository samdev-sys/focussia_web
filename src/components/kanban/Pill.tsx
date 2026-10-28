import React from 'react';

const PALETTE = [
  { bg: '#f1eaff', border: '#7c3aed' },
  { bg: '#e7f8ef', border: '#22c55e' },
  { bg: '#fdeef6', border: '#ec4899' },
  { bg: '#e8f0ff', border: '#1f6feb' },
];

export function pillColor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997;
  return h % PALETTE.length;
}

export default function DayPill({ title, colorIdx, pending, onClick }: {
  title: string;
  colorIdx: number;
  pending?: boolean;
  onClick?: () => void;
}) {
  const c = PALETTE[colorIdx % PALETTE.length];
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-lg px-2 py-1.5 text-xs font-medium text-[#101433] leading-snug"
      style={{ background: c.bg, borderLeft: `4px solid ${c.border}` }}
    >
      <span className="flex items-center gap-1.5">
        {pending && (
          <span className="w-6 h-6 rounded-full bg-[#c026d3] text-white text-xs font-black flex items-center justify-center shrink-0">P</span>
        )}
        <span className="flex-1">{title}</span>
      </span>
      {pending && (
        <span className="inline-block mt-1 ml-8 text-[9px] font-black text-[#4f46e5] bg-[#e3e9ff] px-2 py-0.5 rounded-full">
          PLANIFICADA
        </span>
      )}
    </button>
  );
}
