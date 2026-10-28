import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface EditGoalWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function EditGoalWarningModal({ isOpen, onClose, onConfirm }: EditGoalWarningModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[95] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 sm:p-10 text-center relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 transition-colors">
          <X className="w-5 h-5 text-gray-400" />
        </button>
        <div className="w-20 h-20 mx-auto rounded-full border-[3px] border-[#5b5bd6] flex items-center justify-center mb-6">
          <AlertTriangle className="w-10 h-10 text-[#5b5bd6]" />
        </div>
        <p className="text-xl sm:text-2xl text-[#1a1446] leading-relaxed mb-2">
          Tu Gran Meta Anual orienta tus objetivos mensuales, tu planificación semanal y tus acciones diarias.
        </p>
        <p className="text-xl sm:text-2xl text-[#1a1446] leading-relaxed mb-8">
          Si la modificas, Focusia podría ajustar futuras recomendaciones. ¿Quieres continuar?
        </p>
        <div className="grid sm:grid-cols-2 gap-4 max-w-xl mx-auto">
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-xl border-2 border-[#1a1446] text-[#1a1446] font-bold hover:bg-gray-50 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#2b5cff] to-[#7c3aed] text-white font-bold hover:brightness-110 transition-all shadow-lg"
          >
            Sí, quiero editarla
          </button>
        </div>
      </div>
    </div>
  );
}
