import { useState } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import { onboardingV2Service } from '../services/api';

interface ReiniciarOnboardingProps {
  userName?: string;
  onResetSuccess?: () => void;
}

export function ReiniciarOnboarding({ userName, onResetSuccess }: ReiniciarOnboardingProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleReset = async () => {
    const confirmed = window.confirm(
      `¿Estás seguro de reiniciar el onboarding de Focusia?\n\n` +
      `Esta acción restablecerá tu perfil a la configuración inicial, ` +
      `como si la aplicación aún no hubiera sido configurada. Podrás volver a recorrer el asistente de bienvenida.`
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    try {
      await onboardingV2Service.resetOnboarding();
      setSuccess(true);
      // Limpiar cualquier flag de hub completado para forzar el onboarding al recargar
      localStorage.setItem('focusia_forzar_onboarding', 'true');
      setTimeout(() => {
        onResetSuccess?.();
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'No se pudo reiniciar el onboarding.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleReset}
        disabled={loading}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-[#6236FF] bg-white/60 hover:bg-white/90 border border-[#D1C4E9] rounded-full transition-all disabled:opacity-60 shadow-sm"
        title="Reiniciar el asistente de onboarding"
      >
        {loading ? (
          <div className="w-3 h-3 border-2 border-[#6236FF]/30 border-t-[#6236FF] rounded-full animate-spin" />
        ) : (
          <RotateCcw className="w-3.5 h-3.5" />
        )}
        <span>Reiniciar Onboarding</span>
      </button>

      {success && (
        <span className="text-xs text-green-600 font-medium flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> ¡Listo! Recargando...
        </span>
      )}

      {error && (
        <span className="text-xs text-red-500">{error}</span>
      )}
    </div>
  );
}

export default ReiniciarOnboarding;
