import React, { useEffect, useState } from 'react';
import { motivationalService, DailyPhraseData } from '../services/api';

const INTENTION_LABELS: Record<string, string> = {
  reflexion: 'Reflexión',
  accion: 'Acción',
  gratitud: 'Gratitud',
  planificacion: 'Planificación',
  enfoque: 'Enfoque',
  constancia: 'Constancia',
  creatividad: 'Creatividad',
  superacion: 'Superación',
};

export default function DailyPhraseHeader() {
  const [data, setData] = useState<DailyPhraseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    motivationalService.getToday()
      .then((res) => { if (!cancelled) setData(res); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-[1240px] mx-auto mb-3 px-4">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-purple-200/50 shadow-sm p-4 animate-pulse">
          <div className="h-4 w-3/4 bg-purple-200/50 rounded mb-2" />
          <div className="h-3 w-1/2 bg-purple-100/50 rounded" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const intentionLabel = INTENTION_LABELS[data.intention] || data.intention;

  return (
    <div className="w-full max-w-[1240px] mx-auto mb-3 px-4">
      <div className="bg-gradient-to-r from-purple-50/90 via-white/80 to-purple-50/90 backdrop-blur-sm rounded-2xl border border-purple-200/50 shadow-sm p-4 transition-all hover:shadow-md">
        <div className="flex items-start gap-3">
          <div className="hidden sm:flex flex-col items-center justify-center min-w-[48px]">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
              Mes {data.month_number}
            </span>
            <span className="text-lg font-bold text-purple-600">
              Día {data.day_number}/{data.day_total}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm sm:text-base text-gray-800 leading-relaxed italic">
              "{data.phrase}"
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="inline-block text-[10px] sm:text-xs font-medium text-purple-500 bg-purple-100/60 px-2 py-0.5 rounded-full">
                {data.month_theme}
              </span>
              <span className="inline-block text-[10px] sm:text-xs font-medium text-amber-600 bg-amber-100/60 px-2 py-0.5 rounded-full">
                {intentionLabel}
              </span>
            </div>
          </div>
          <div className="sm:hidden flex flex-col items-center ml-2">
            <span className="text-[10px] font-bold text-purple-400">
              M{data.month_number}
            </span>
            <span className="text-xs font-bold text-purple-600">
              D{data.day_number}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
