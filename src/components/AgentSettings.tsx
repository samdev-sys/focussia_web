import React, { useState, useEffect } from 'react';
import { X, Bot, Smartphone, Bell, Clock, Save, RefreshCw, MessageCircle } from 'lucide-react';
import { agentService, pushService, AgentConfigData } from '../services/api';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

interface Props {
  onClose: () => void;
}

const TONOS = [
  { value: 'FORMAL', label: 'Formal' },
  { value: 'CASUAL', label: 'Casual' },
  { value: 'MOTIVACIONAL', label: 'Motivacional' },
  { value: 'DIRECTO', label: 'Directo' },
] as const;

const FRECUENCIAS = [
  { value: 'CADA_HORA', label: 'Cada Hora' },
  { value: 'CADA_2H', label: 'Cada 2 Horas' },
  { value: 'MEDIO_DIA', label: 'Medio Día' },
  { value: 'FIN_DIA', label: 'Fin del Día' },
] as const;

const AgentSettings: React.FC<Props> = ({ onClose }) => {
  const [config, setConfig] = useState<AgentConfigData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  const [pushMsg, setPushMsg] = useState('');

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => setPushOn(!!sub))
      .catch(() => {});
  }, []);

  const togglePush = async (on: boolean) => {
    try {
      if (on) {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          setPushMsg('Este navegador no soporta push');
          return;
        }
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          setPushMsg('Permiso de notificaciones denegado');
          return;
        }
        const reg = await navigator.serviceWorker.register('/sw.js');
        const { publicKey } = await pushService.publicKey();
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
        const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
        if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error('bad-sub');
        await pushService.subscribe({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } });
        setPushOn(true);
        setPushMsg('Push activado en este dispositivo');
      } else {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await pushService.unsubscribe(sub.endpoint).catch(() => {});
          await sub.unsubscribe();
        }
        setPushOn(false);
        setPushMsg('');
      }
    } catch {
      setPushMsg('No se pudo activar push en este navegador');
    }
  };

  useEffect(() => {
    agentService.getConfig().then(setConfig).catch(() => {});
  }, []);

  const update = (field: string, value: any) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
  };

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await agentService.updateConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Error saving agent config:', e);
    } finally {
      setSaving(false);
    }
  };

  if (!config) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-xl rounded-md shadow-2xl border border-white/50 w-[650px] flex items-center justify-center h-40">
          <p className="text-sm text-gray-400">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-md shadow-2xl border border-white/50 w-[650px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#3533cd] to-[#040817] text-white">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            <h2 className="text-base font-bold">FocusIA - Configuración</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-5 max-h-[70vh] overflow-y-auto scrollbar-hide">
          {/* Activar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#3533cd]" />
              <span className="text-sm font-semibold text-gray-800">Activar Asistente</span>
            </div>
            <button
              onClick={() => update('activo', !config.activo)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                config.activo ? 'bg-[#3533cd]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                  config.activo ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Tono */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="w-4 h-4 text-[#3533cd]" />
              <span className="text-sm font-semibold text-gray-800">Tono de Comunicación</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {TONOS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => update('tono', t.value)}
                  className={`py-2 px-3 rounded-md text-[11px] font-semibold border transition-all ${
                    config.tono === t.value
                      ? 'bg-[#3533cd] text-white border-[#3533cd]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#3533cd]/30'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Frecuencia Check-in */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-[#3533cd]" />
              <span className="text-sm font-semibold text-gray-800">Frecuencia de Check-in</span>
            </div>
            <select
              value={config.frecuencia_checkin}
              onChange={(e) => update('frecuencia_checkin', e.target.value)}
              className="w-full py-2 px-3 rounded-md border border-gray-200 text-[12px] font-medium text-gray-700 bg-white"
            >
              {FRECUENCIAS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Notificaciones */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#3533cd]" />
              <span className="text-sm font-semibold text-gray-800">Notificaciones</span>
            </div>

            <div className="flex items-center justify-between pl-6">
              <span className="text-[12px] text-gray-600">Notificaciones in-app</span>
              <button
                onClick={() => update('notificar_in_app', !config.notificar_in_app)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  config.notificar_in_app ? 'bg-[#3533cd]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                    config.notificar_in_app ? 'translate-x-[18px]' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between pl-6">
              <div className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-[12px] text-gray-600">WhatsApp</span>
              </div>
              <button
                onClick={() => update('notificar_whatsapp', !config.notificar_whatsapp)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  config.notificar_whatsapp ? 'bg-[#25D366]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                    config.notificar_whatsapp ? 'translate-x-[18px]' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {config.notificar_whatsapp && (
              <div className="pl-6">
                <input
                  type="text"
                  value={config.whatsapp_phone}
                  onChange={(e) => update('whatsapp_phone', e.target.value)}
                  placeholder="+573001234567"
                  className="w-full py-2 px-3 rounded-md border border-gray-200 text-[12px] bg-white"
                />
                <p className="text-[10px] text-gray-400 mt-1">Número con código de país, sin espacios</p>
              </div>
            )}

            <div className="flex items-center justify-between pl-6">
              <div className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-[12px] text-gray-600">Push en este dispositivo</span>
              </div>
              <button
                onClick={() => togglePush(!pushOn)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  pushOn ? 'bg-[#3533cd]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                    pushOn ? 'translate-x-[18px]' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            {pushMsg && (
              <p className="text-[10px] text-gray-400 pl-6">{pushMsg}</p>
            )}
          </div>

          {/* Horario */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-[#3533cd]" />
              <span className="text-sm font-semibold text-gray-800">Horario Activo</span>
            </div>
            <div className="flex gap-3 pl-6">
              <div>
                <label className="text-[10px] text-gray-500">Desde</label>
                <input
                  type="time"
                  value={config.horario_inicio}
                  onChange={(e) => update('horario_inicio', e.target.value)}
                  className="w-full py-1.5 px-2 rounded-md border border-gray-200 text-[12px] bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500">Hasta</label>
                <input
                  type="time"
                  value={config.horario_fin}
                  onChange={(e) => update('horario_fin', e.target.value)}
                  className="w-full py-1.5 px-2 rounded-md border border-gray-200 text-[12px] bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 py-2.5 px-6 bg-gradient-to-r from-[#3533cd] to-[#040817] text-white text-[12px] font-bold rounded-md hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentSettings;
