import React, { useEffect, useState } from 'react';
import { motivationalService, MonthlyTrainingData } from '../services/api';

export default function MonthlyTrainingCard() {
  const [training, setTraining] = useState<MonthlyTrainingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    motivationalService.getCurrentTraining()
      .then((res) => { if (!cancelled) setTraining(res); })
      .catch(() => { if (!cancelled) setTraining(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-amber-200/50 shadow-sm p-4 animate-pulse">
        <div className="h-4 w-2/3 bg-amber-200/50 rounded mb-2" />
        <div className="h-3 w-full bg-amber-100/50 rounded" />
      </div>
    );
  }

  if (!training) return null;

  const material = training.media_resuelto || training.media_url || '';

  return (
    <div className="bg-gradient-to-br from-amber-50/90 to-orange-50/90 backdrop-blur-sm rounded-2xl border border-amber-200/50 shadow-sm p-4 transition-all hover:shadow-md">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
          Capacitación del Mes {training.month_number}
        </span>
      </div>
      <h3 className="text-sm font-semibold text-gray-800 mb-1">
        {training.title}
      </h3>
      <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
        {training.content}
      </p>
      {material && (
        <a
          href={material}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-2 text-xs font-medium text-amber-600 hover:text-amber-700 underline"
        >
          Ver material
        </a>
      )}
    </div>
  );
}
