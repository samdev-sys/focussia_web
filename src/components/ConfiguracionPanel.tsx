import React, { useState, useEffect } from 'react';
import { X, Save, Volume2, MessageSquare, Bell, Gauge, Clock, Wifi } from 'lucide-react';
import { configuracionService, ConfiguracionData } from '../services/api';
import { AVATARS } from '../constants/avatars';

interface ConfiguracionPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConfiguracionPanel: React.FC<ConfiguracionPanelProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<ConfiguracionData>({
    voz_genero: 'femenino',
    estilo_comunicacion: 'suave',
    nivel_exigencia: 'medio',
    frecuencia_intervenciones: 24,
    canales_interaccion: ['notificacion'],
    ventana_inicio: '07:00',
    ventana_fin: '22:00',
    avatar_index: 0,
    onboarding_completado: false,
    video_inicial_visto: false,
    ultimo_ingreso: null,
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) cargarConfig();
  }, [isOpen]);

  const cargarConfig = async () => {
    setLoading(true);
    try {
      const data = await configuracionService.getMiConfig();
      setConfig(data);
    } catch (err) {
      console.error('Error loading config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await configuracionService.updateMiConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Error saving config:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCanal = (canal: string) => {
    setConfig((prev) => ({
      ...prev,
      canales_interaccion: prev.canales_interaccion.includes(canal)
        ? prev.canales_interaccion.filter((c) => c !== canal)
        : [...prev.canales_interaccion, canal],
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-xl rounded-md shadow-2xl border border-white/50 w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/50 bg-gradient-to-r from-slate-700 to-slate-600 shrink-0">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-white" />
            <h2 className="text-lg font-bold uppercase text-white">Configuración del Sistema</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/30 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {loading && !config.voz_genero ? (
            <div className="text-center py-8 text-sm text-gray-500">Cargando...</div>
          ) : (
            <>
              <div className="bg-white/60 rounded-xl p-4 border border-white/50">
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5" /> Voz y Estilo
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 font-medium">Género de la Voz</label>
                    <div className="flex gap-2 mt-1">
                      {(['femenino', 'masculino'] as const).map((g) => (
                        <button
                          key={g}
                          onClick={() => setConfig((p) => ({ ...p, voz_genero: g }))}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                            config.voz_genero === g
                              ? 'bg-slate-700 text-white shadow'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {g.charAt(0).toUpperCase() + g.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium">Estilo de Comunicación</label>
                    <div className="flex gap-2 mt-1">
                      {([{ id: 'suave', label: 'Suave' }, { id: 'directo', label: 'Directo / Estructurado' }] as const).map((e) => (
                        <button
                          key={e.id}
                          onClick={() => setConfig((p) => ({ ...p, estilo_comunicacion: e.id as 'suave' | 'directo' }))}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                            config.estilo_comunicacion === e.id
                              ? 'bg-slate-700 text-white shadow'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {e.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/60 rounded-xl p-4 border border-white/50">
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5" /> Acompañante
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {AVATARS.map(a => {
                    const selected = config.avatar_index === a.index;
                    return (
                      <button key={a.index} onClick={() => setConfig(p => ({ ...p, avatar_index: a.index }))}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105 active:scale-95 ${selected ? 'border-purple-500 ring-2 ring-purple-300' : 'border-gray-100 hover:border-gray-300'}`}>
                        <img src={a.file} alt={a.name} className="w-full h-full object-cover" />
                        {selected && <div className="absolute inset-0 bg-purple-500/10" />}
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[9px] font-medium bg-white/80 px-1.5 py-0.5 rounded-full">{a.name}</span>
                      </button>
                    );
                  })}
                </div>
                {config.avatar_index > 0 && (
                  <div className="flex items-center gap-3 mt-3 p-3 bg-white/60 rounded-xl">
                    <img src={AVATARS.find(a => a.index === config.avatar_index)?.file} alt="preview" className="w-10 h-10 rounded-xl object-cover" />
                    <p className="text-xs text-gray-500">Tu coach actual</p>
                  </div>
                )}
              </div>

              <div className="bg-white/60 rounded-xl p-4 border border-white/50">
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-1">
                  <Bell className="w-3.5 h-3.5" /> Canales de Interacción
                </h3>
                <div className="space-y-2">
                  {[
                    { id: 'notificacion', label: 'Notificaciones Push', desc: 'Alertas estándar en la app' },
                    { id: 'buzon_ia', label: 'Buzón de Propuestas IA', desc: 'Sugerencias estratégicas' },
                    { id: 'simulacion_llamada', label: 'Simulación de Llamada', desc: 'Alto impacto visual' },
                    { id: 'whatsapp_simulado', label: 'WhatsApp Simulado', desc: 'Mensajes simulados externos' },
                  ].map((canal) => (
                    <button
                      key={canal.id}
                      onClick={() => toggleCanal(canal.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        config.canales_interaccion.includes(canal.id)
                          ? 'border-slate-400 bg-slate-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg ${
                        config.canales_interaccion.includes(canal.id) ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-400'
                      }`}>
                        <Wifi className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-sm font-medium text-gray-700">{canal.label}</p>
                        <p className="text-xs text-gray-400">{canal.desc}</p>
                      </div>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        config.canales_interaccion.includes(canal.id)
                          ? 'bg-slate-700 border-slate-700'
                          : 'border-gray-300'
                      }`}>
                        {config.canales_interaccion.includes(canal.id) && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white/60 rounded-xl p-4 border border-white/50">
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5" /> Frecuencia e Intensidad
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 font-medium">Nivel de Exigencia</label>
                    <div className="flex gap-2 mt-1">
                      {([{ id: 'bajo', label: 'Bajo' }, { id: 'medio', label: 'Medio' }, { id: 'alto', label: 'Alto' }] as const).map((n) => (
                        <button
                          key={n.id}
                          onClick={() => setConfig((p) => ({ ...p, nivel_exigencia: n.id as 'bajo' | 'medio' | 'alto' }))}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                            config.nivel_exigencia === n.id
                              ? 'bg-slate-700 text-white shadow'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {n.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium">
                      Frecuencia entre intervenciones: cada {config.frecuencia_intervenciones} horas
                    </label>
                    <input
                      type="range"
                      min="6"
                      max="72"
                      step="6"
                      value={config.frecuencia_intervenciones}
                      onChange={(e) => setConfig((p) => ({ ...p, frecuencia_intervenciones: parseInt(e.target.value) }))}
                      className="w-full mt-1"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>6h</span>
                      <span>24h</span>
                      <span>72h</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/60 rounded-xl p-4 border border-white/50">
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Ventana de Intervención
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 font-medium">Inicio</label>
                    <input
                      type="time"
                      value={config.ventana_inicio}
                      onChange={(e) => setConfig((p) => ({ ...p, ventana_inicio: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium">Fin</label>
                    <input
                      type="time"
                      value={config.ventana_fin}
                      onChange={(e) => setConfig((p) => ({ ...p, ventana_fin: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white text-sm mt-1"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-slate-700 to-slate-600 text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saved ? 'Guardado ✓' : loading ? 'Guardando...' : 'Guardar Configuración'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
