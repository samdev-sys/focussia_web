import React from 'react';
import { Check, X } from 'lucide-react';

export function ConfirmBanner({ text, onUndo, onClose }: {
  text: string;
  onUndo: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-3 bg-[#eef4ff] border border-[#d3e2ff] rounded-xl px-4 py-3 mb-4">
      <span className="w-9 h-9 rounded-full bg-[#1f6feb] flex items-center justify-center shrink-0">
        <Check className="w-5 h-5 text-white" strokeWidth={3} />
      </span>
      <p className="flex-1 min-w-0 text-[#1f3fb8] font-bold text-sm sm:text-base">{text}</p>
      <button
        type="button"
        onClick={onUndo}
        className="shrink-0 text-xs sm:text-sm font-black text-[#1f6feb] border-2 border-[#1f6feb] rounded-lg px-4 sm:px-6 py-2 hover:bg-white transition-colors"
      >
        DESHACER
      </button>
      <button type="button" onClick={onClose} className="shrink-0 text-[#1f3fb8] hover:text-[#101433]">
        <X className="w-5 h-5" strokeWidth={3} />
      </button>
    </div>
  );
}

export function FloatingToast({ text, onUndo, onClose }: {
  text: string;
  onUndo: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed top-4 right-4 z-[70] max-w-sm bg-white border border-green-200 rounded-xl shadow-xl px-4 py-3 flex items-center gap-3">
      <span className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center shrink-0">
        <Check className="w-4 h-4 text-white" strokeWidth={3} />
      </span>
      <p className="flex-1 text-sm text-[#101433] font-medium">{text}</p>
      <button
        type="button"
        onClick={onUndo}
        className="shrink-0 text-xs font-black text-[#7c3aed] underline hover:no-underline"
      >
        DESHACER
      </button>
      <button type="button" onClick={onClose} className="shrink-0 text-gray-400 hover:text-gray-600">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
