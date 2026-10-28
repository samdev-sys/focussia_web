import React from 'react';
import { useDeviceType } from '../hooks/useDeviceType';
import { Smartphone, RotateCcw } from 'lucide-react';

export default function MobileOrientationPrompt({ children }: { children: React.ReactNode }) {
  const { deviceType, isLandscape } = useDeviceType();
  const showPrompt = (deviceType === 'mobile' || deviceType === 'tablet') && isLandscape;

  if (showPrompt) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-[#1a0a2e] via-[#16213e] to-[#0f3460] flex items-center justify-center">
        <div className="text-center px-8 animate-fade-in">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-purple-400 to-pink-300 rounded-md flex items-center justify-center mb-8 shadow-2xl">
            <Smartphone className="w-12 h-12 text-white" />
          </div>
          <div className="animate-rotate-phone mb-6">
            <RotateCcw className="w-10 h-10 text-purple-300 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Gira tu dispositivo</h2>
          <p className="text-sm text-purple-200/70 max-w-xs mx-auto leading-relaxed">
            Focusia está optimizada para uso vertical. Por favor, gira tu teléfono para una mejor experiencia.
          </p>
        </div>
        <style>{`
          @keyframes rotate-phone {
            0%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(90deg); }
            50% { transform: rotate(0deg); }
            75% { transform: rotate(-90deg); }
          }
          .animate-rotate-phone {
            animation: rotate-phone 2s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  return <>{children}</>;
}
