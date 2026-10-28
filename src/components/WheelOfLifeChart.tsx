import React, { useMemo } from 'react';
import { useWheelOfLife } from '../hooks/useWheelOfLife';
import { Save, RotateCcw, AlertCircle, CheckCircle, Target, TrendingUp, Briefcase, DollarSign, Heart, Users, Sparkles, Smile, Home, BookOpen, HandHeart } from 'lucide-react';
import { WHEEL_CATEGORIES, CATEGORY_COLORS, type WheelCategoryKey } from '../types/focusia';

const SEGMENT_CONFIG: Record<WheelCategoryKey, { icon: React.FC<any>; color: string }> = {
  trabajo: { icon: Briefcase, color: '#dc2626' },
  dinero: { icon: DollarSign, color: '#1d4ed8' },
  salud: { icon: Heart, color: '#be185d' },
  pareja: { icon: Users, color: '#9333ea' },
  familia: { icon: Users, color: '#0891b2' },
  espiritualidad: { icon: Sparkles, color: '#059669' },
  diversion: { icon: Smile, color: '#d97706' },
  entorno: { icon: Home, color: '#ea580c' },
  desarrollo: { icon: BookOpen, color: '#2563eb' },
  contribucion: { icon: HandHeart, color: '#7c3aed' },
};

const CATEGORY_LABELS: Record<WheelCategoryKey, string> = {
  trabajo: 'Trabajo',
  dinero: 'Dinero',
  salud: 'Salud',
  pareja: 'Pareja',
  familia: 'Familia',
  espiritualidad: 'Espiritualidad',
  diversion: 'Diversión',
  entorno: 'Entorno',
  desarrollo: 'Desarrollo',
  contribucion: 'Contribución',
};

interface WheelOfLifeChartProps {
  className?: string;
  showControls?: boolean;
  onFocusAreasChange?: (areas: string[]) => void;
}

const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
};

export const WheelOfLifeChart: React.FC<WheelOfLifeChartProps> = ({
  className = '',
  showControls = true,
  onFocusAreasChange,
}) => {
  const {
    scores, loading, error, diagnostic, suggestedActions,
    isSaving, saveError, saveSuccess, updateScore, saveScores,
    fetchDiagnostic, fetchSuggestedActions, sendActionToKanban,
    resetScores, averageScore, focusAreas, setFocusAreas,
  } = useWheelOfLife();

  const categories = WHEEL_CATEGORIES;
  const n = categories.length;
  const sliceAngle = 360 / n;

  const CX = 160;
  const CY = 160;
  const MAX_R = 140;
  const MIN_R = 55;
  const CENTER_R = 48;

  const handleFocusToggle = (area: string) => {
    setFocusAreas((prev: string[]) => {
      const next = prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area];
      onFocusAreasChange?.(next);
      return next;
    });
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-2xl shadow-xl border border-gray-100 p-8 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden ${className}`}>
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              Rueda de la Vida
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Evalúa tu equilibrio en 10 áreas clave. Arrastra los sliders para ajustar cada valor (1-10).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchDiagnostic}
              disabled={isSaving}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Actualizar Diagnóstico
            </button>
            <button
              onClick={saveScores}
              disabled={isSaving}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-6 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {saveSuccess && (
          <div className="mb-4 px-6 py-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ¡Progreso guardado correctamente!
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 p-6">
          <section>
            <div className="aspect-square max-w-[360px] mx-auto relative">
              <img src="/rueda.png" alt="Rueda de la Vida" className="w-full h-full object-contain" />
            </div>

            <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-gray-50 rounded-xl p-4 text-center col-span-2 md:col-span-1">
                <p className="text-3xl font-bold text-purple-600">{averageScore.toFixed(1)}</p>
                <p className="text-xs text-gray-500 mt-1">Promedio Global</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{Object.values(scores).filter(v => v > 0).length}/10</p>
                <p className="text-xs text-gray-500 mt-1">Áreas Evaluadas</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{focusAreas.length}/3</p>
                <p className="text-xs text-gray-500 mt-1">Focos Seleccionados</p>
              </div>
              {diagnostic && (
                <>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{diagnostic.nivel_equilibrio}</p>
                    <p className="text-xs text-gray-500 mt-1">Nivel Equilibrio</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-orange-600">{diagnostic.promedio_general.toFixed(1)}</p>
                    <p className="text-xs text-gray-500 mt-1">Promedio Diagnóstico</p>
                  </div>
                </>
              )}
            </div>
          </section>

          {showControls && (
            <aside className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  Controles
                </h3>
                <div className="space-y-4">
                  {WHEEL_CATEGORIES.map(cat => {
                    const cfg = SEGMENT_CONFIG[cat.key];
                    return (
                      <div key={cat.key} className="group">
                        <div className="flex items-center justify-between mb-2">
                          <label
                            htmlFor={cat.key}
                            className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer"
                          >
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: cfg.color }}
                            />
                            {CATEGORY_LABELS[cat.key]}
                          </label>
                          <span className="text-lg font-bold" style={{ color: cfg.color }}>
                            {scores[cat.key]}
                          </span>
                        </div>
                        <input
                          type="range"
                          id={cat.key}
                          min="0"
                          max="10"
                          value={scores[cat.key]}
                          onChange={e => updateScore(cat.key, Number(e.target.value))}
                          className="w-full h-2 appearance-none bg-gray-200 rounded-lg cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-offset-2"
                          style={{
                            background: `linear-gradient(to right, ${cfg.color} ${scores[cat.key] * 10}%, #e5e7eb ${scores[cat.key] * 10}%)`,
                          }}
                          aria-label={`Puntaje para ${CATEGORY_LABELS[cat.key]}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {focusAreas.length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    Áreas Foco ({focusAreas.length}/3)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {focusAreas.map(area => (
                      <span
                        key={area}
                        className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1"
                      >
                        {area}
                        <button onClick={() => handleFocusToggle(area)} className="hover:text-green-500" aria-label={`Quitar ${area}`}>×</button>
                      </span>
                    ))}
                    {focusAreas.length < 3 && (
                      <button
                        onClick={() => {
                          const unevaluated = WHEEL_CATEGORIES
                            .filter(c => !focusAreas.includes(CATEGORY_LABELS[c.key]) && scores[c.key] > 0)
                            .map(c => CATEGORY_LABELS[c.key]);
                          if (unevaluated.length > 0) handleFocusToggle(unevaluated[0]);
                        }}
                        className="px-3 py-1 border-2 border-dashed border-gray-300 text-gray-500 text-xs font-medium rounded-full hover:border-green-400 hover:text-green-600 transition-colors"
                      >
                        + Agregar
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="border-t border-gray-100 pt-4 space-y-3">
                <button
                  onClick={saveScores}
                  disabled={isSaving}
                  className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Guardar Progreso
                    </>
                  )}
                </button>

                <button
                  onClick={resetScores}
                  className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restablecer
                </button>
              </div>
            </aside>
          )}

          {diagnostic && showControls && (
            <div className="lg:col-span-2 mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <h4 className="font-semibold text-gray-900 mb-3">Diagnóstico IA</h4>
              <p className="text-sm text-gray-600 mb-4">{diagnostic.justificacion_focos}</p>
              <div className="flex flex-wrap gap-2">
                {diagnostic.foco_1 && <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">{diagnostic.foco_1}</span>}
                {diagnostic.foco_2 && <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">{diagnostic.foco_2}</span>}
                {diagnostic.foco_3 && <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">{diagnostic.foco_3}</span>}
              </div>
            </div>
          )}

          {suggestedActions.length > 0 && showControls && (
            <div className="lg:col-span-2 mt-6">
              <h4 className="font-semibold text-gray-900 mb-3">Acciones Sugeridas por IA</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {suggestedActions.map(action => (
                  <div key={action.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{action.area_foco}</p>
                      <p className="text-xs text-gray-600 mt-1">{action.texto}</p>
                    </div>
                    {!action.enviada_kanban ? (
                      <button
                        onClick={() => sendActionToKanban(action.id)}
                        className="px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                      >
                        Enviar a Kanban
                      </button>
                    ) : (
                      <span className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded-lg">Enviado ✓</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WheelOfLifeChart;
