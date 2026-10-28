import React, { useState, useEffect, useRef } from 'react';
import { Mail, Lock, ArrowRight, ArrowLeft } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { authService } from './services/api';

declare global {
  interface Window {
    google?: any;
    microsoft?: any;
    msal?: any;
  }
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const MICROSOFT_CLIENT_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID || '';

interface AuthPanelProps {
  onLogin: (email: string) => void;
  onRegister?: () => void;
  initialMode?: 'login' | 'register';
}

export default function AuthPanel({ onLogin, onRegister, initialMode = 'login' }: AuthPanelProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'microsoft' | null>(null);
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const microsoftBtnRef = useRef<HTMLDivElement>(null);

  // ── Google (ver BotonGoogle reutilizable más abajo) ───────────────────

  // ── Microsoft ─────────────────────────────────────────────────────
  const msReadyRef = useRef(false);
  useEffect(() => {
    if (!MICROSOFT_CLIENT_ID || msReadyRef.current) return;
    msReadyRef.current = true;
    const MS_SRC = 'https://alcdn.msauth.net/browser/2.38.3/js/msal-browser.min.js';
    if (document.querySelector(`script[src="${MS_SRC}"]`)) return;
    const script = document.createElement('script');
    script.src = MS_SRC;
    script.async = true;
    script.onload = () => initMicrosoftAuth();
    document.head.appendChild(script);
  }, []);

  const initMicrosoftAuth = () => {
    if (!window.msal) return;
    const msalConfig = {
      auth: {
        clientId: MICROSOFT_CLIENT_ID,
        redirectUri: window.location.origin,
      },
    };
    window.msal = new window.msal.PublicClientApplication(msalConfig);
  };

  const handleMicrosoftLogin = async () => {
    if (!window.msal) {
      setErrors({ social: 'Microsoft Auth no está disponible' });
      return;
    }
    setSocialLoading('microsoft');
    try {
      const response = await window.msal.loginPopup({
        scopes: ['User.Read'],
      });
      await authService.microsoftLogin(response.accessToken);
      onLogin('');
    } catch {
      setErrors({ social: 'Error al iniciar sesión con Microsoft' });
    } finally {
      setSocialLoading(null);
    }
  };

  // ── Form (login; el registro vive en RegistroCuenta) ───────────────────
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Ingresa un email válido';
    }
    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      await authService.login(formData.email, formData.password);
      onLogin(formData.email);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 429) {
        setErrors({ password: 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.' });
      } else if (status === 401 || status === 400) {
        const detail = err.response?.data?.detail || err.response?.data?.error;
        setErrors({ password: typeof detail === 'string' && detail ? detail : 'Credenciales inválidas' });
      } else {
        setErrors({ password: 'Error de conexión. Intenta de nuevo.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleResetPassword = async () => {
    if (!resetEmail.trim()) {
      setErrors({ reset: 'Ingresa tu email' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) {
      setErrors({ reset: 'Ingresa un email válido' });
      return;
    }
    setIsLoading(true);
    try {
      await authService.passwordResetRequest(resetEmail);
      setResetSent(true);
      setErrors({});
    } catch (err: any) {
      setErrors({ reset: err.response?.data?.error || 'Error al enviar solicitud' });
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === 'register' && !resetMode) {
    return (
      <RegistroCuenta
        onExito={({ email }) => { onRegister ? onRegister() : onLogin(email); }}
        onIrLogin={() => { setMode('login'); setErrors({}); }}
        onRecuperar={() => setResetMode(true)}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#ffffff]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-[#FFD1D1]/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-[#D1C4E9]/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FFD1E8]/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg">
        <div className="text-center mb-10 flex flex-col items-center">
          <img src="focusia-logo2.png" alt="Logo" className="w-32 h-32 mb-4" />
          <h1 className="text-6xl font-['Montserrat'] font-black tracking-wide text-black ">WELCOME</h1>
          <p className="text-sm md:text-base font-semibold tracking-wide mt-1">
            
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#200013] via-[#814B8D] to-[#143CCC]">
              INGRESA TUS DATOS PARA CONTINUAR
            </span>
          </p>
        </div>

        {errors.social && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 text-center">
            {errors.social}
          </div>
        )}

        {!resetMode ? (
          <>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-black uppercase tracking-wide">CORREO ELECTRÓNICO</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={cn(
                    "w-full pl-12 pr-4 py-3.5 bg-[#f2f3f5] border rounded-xl text-sm transition-all",
                    "focus:outline-none focus:ring-2 focus:ring-[#2b44ff]/30 focus:border-[#2b44ff]",
                    "placeholder:text-gray-400",
                    errors.email ? "border-red-300 focus:ring-red-200" : "border-transparent"
                  )}
                  placeholder="usuario@gmail.com"
                />
              </div>
              {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-black uppercase tracking-wide">CONTRASEÑA</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={cn(
                    "w-full pl-12 pr-12 py-3.5 bg-[#f2f3f5] border rounded-xl text-sm transition-all",
                    "focus:outline-none focus:ring-2 focus:ring-[#2b44ff]/30 focus:border-[#2b44ff]",
                    "placeholder:text-gray-400",
                    errors.password ? "border-red-300 focus:ring-red-200" : "border-transparent"
                  )}
                  placeholder="••••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
              <div className="flex justify-end mt-1">
                <button
                  type="button"
                  onClick={() => setResetMode(true)}
                  className="text-xs text-[#814B8D] hover:text-[#143CCC] transition-colors font-medium"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                "w-full py-4 bg-gradient-to-r from-[#200013] via-[#814B8D] to-[#143CCC] text-white font-bold text-sm tracking-wider uppercase rounded-xl",
                "transition-all duration-200 flex items-center justify-center gap-2",
                "hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]",
                "disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
              )}
            >
              {isLoading ? (
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-md animate-spin" />
              ) : (
                <>INICIAR SESIÓN</>
              )}
            </button>

            <p className="text-center text-xs text-gray-500">
              <>¿No tienes cuenta?{' '}
                <button type="button" onClick={() => { setMode('register'); setErrors({}); }} className="font-bold text-[#814B8D] hover:text-[#143CCC]">
                  Regístrate gratis
                </button>
              </>
            </p>
          </form>
          </>
        ) : (
          <div className="space-y-6">
            <button
              type="button"
              onClick={() => { setResetMode(false); setResetSent(false); setErrors({}); }}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Volver
            </button>

            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-800">Recuperar contraseña</h2>
              <p className="text-sm text-gray-500 mt-1">Te enviaremos un enlace para restablecer tu contraseña</p>
            </div>

            {resetSent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600">Si existe una cuenta con ese email, recibirás instrucciones para restablecer tu contraseña.</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-black uppercase tracking-wide">CORREO ELECTRÓNICO</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-[#f2f3f5] border border-transparent rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2b44ff]/30 focus:border-[#2b44ff] placeholder:text-gray-400"
                      placeholder="usuario@gmail.com"
                    />
                  </div>
                  {errors.reset && <p className="text-xs text-red-500">{errors.reset}</p>}
                </div>

                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={isLoading}
                  className={cn(
                    "w-full py-4 bg-gradient-to-r from-[#200013] via-[#814B8D] to-[#143CCC] text-white font-bold text-sm tracking-wider uppercase rounded-xl",
                    "transition-all duration-200 flex items-center justify-center gap-2",
                    "hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]",
                    "disabled:opacity-70 disabled:cursor-not-allowed"
                  )}
                >
                  {isLoading ? (
                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-md animate-spin" />
                  ) : (
                    <>ENVIAR ENLACE</>
                  )}
                </button>
              </>
            )}
          </div>
        )}

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="px-4 bg-white text-xs text-gray-400 font-medium">O continúa con</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Google */}
          <BotonGoogle
            onListo={() => onLogin('')}
            fallback={
              <button
                type="button"
                disabled
                className="w-full py-3 bg-white border border-gray-200 rounded-xl flex items-center justify-center gap-2 text-sm font-medium text-gray-400 cursor-not-allowed"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </button>
            }
          />

          {/* Microsoft */}
          <button
            type="button"
            onClick={handleMicrosoftLogin}
            disabled={!MICROSOFT_CLIENT_ID || socialLoading === 'microsoft'}
            className={cn(
              "w-full py-3 bg-white border border-gray-200 rounded-xl flex items-center justify-center gap-2 text-sm font-medium text-gray-700",
              "hover:bg-gray-50 hover:shadow-sm transition-all",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {socialLoading === 'microsoft' ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-[#0078d4] rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 23 23">
                  <rect x="1" y="1" width="10" height="10" fill="#f25022" />
                  <rect x="12" y="1" width="10" height="10" fill="#7fba00" />
                  <rect x="1" y="12" width="10" height="10" fill="#00a4ef" />
                  <rect x="12" y="12" width="10" height="10" fill="#ffb900" />
                </svg>
                Outlook
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function BotonGoogle({ onListo, fallback }: { onListo: () => void; fallback: React.ReactNode }) {
  const btnRef = useRef<HTMLDivElement>(null);
  const listoRef = useRef(onListo);
  listoRef.current = onListo;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const GSI_SRC = 'https://accounts.google.com/gsi/client';
    const init = () => {
      if (!window.google) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response: any) => {
          try {
            await authService.googleLogin(response.credential);
          } catch {
            // cae al flujo normal
          }
          listoRef.current();
        },
      });
      if (btnRef.current) {
        btnRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(btnRef.current, {
          theme: 'outline',
          size: 'large',
          width: btnRef.current.offsetWidth || 320,
          text: 'continue_with',
          shape: 'rectangular',
        });
      }
    };
    const existing = document.querySelector(`script[src="${GSI_SRC}"]`);
    if (existing) {
      if (window.google) init();
      else existing.addEventListener('load', init, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = init;
    document.head.appendChild(script);
  }, []);

  if (!GOOGLE_CLIENT_ID) return <>{fallback}</>;
  return <div ref={btnRef} className="w-full" />;
}

function IconoOjo({ abierto }: { abierto: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {abierto ? (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
          <line x1="4" y1="4" x2="20" y2="20" />
        </>
      ) : (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

// Pantalla de registro (diseño "Comencemos." del onboarding, paso 2).
// Vive aquí para reutilizarse en Auth y en el onboarding.
export function RegistroCuenta({ onExito, onIrLogin, onRecuperar, paso }: {
  onExito: (datos: { nombre: string; email: string }) => void;
  onIrLogin: () => void;
  onRecuperar?: () => void;
  paso?: { actual: number; total: number; onIrPaso: (n: number) => void };
}) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!nombre.trim()) { setError('Ingresa tu nombre'); return; }
    if (!email.trim()) { setError('Ingresa tu email'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Ingresa un email válido'); return; }
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return; }
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return; }
    setLoading(true);
    try {
      await authService.register(nombre.trim(), email.trim(), password);
      await authService.login(email.trim(), password);
      onExito({ nombre: nombre.trim(), email: email.trim() });
    } catch (err: any) {
      const msg = err.response?.data?.password?.[0] || err.response?.data?.email?.[0]
        || err.response?.data?.username?.[0] || err.response?.data?.detail || 'Error al crear cuenta';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full pl-12 pr-4 py-3.5 rounded-lg border border-[#1e1b4b]/60 bg-white text-slate-800 placeholder-slate-500 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40 focus:border-[#2563eb] transition-all';
  const inputPwCls = 'w-full pl-12 pr-12 py-3.5 rounded-lg border border-[#1e1b4b]/60 bg-white text-slate-800 placeholder-slate-500 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40 focus:border-[#2563eb] transition-all';
  const iconoCls = 'absolute left-4 top-1/2 -translate-y-1/2 text-slate-700';

  return (
    <div className="min-h-screen bg-white relative flex flex-col items-center px-4 pt-4 pb-6 overflow-hidden font-montserrat">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <img src="/onda1.png" alt="" draggable={false} className="absolute left-0 top-0 h-full w-auto object-cover" />
        <img src="/onda2.png" alt="" draggable={false} className="absolute right-0 top-0 h-full w-auto object-cover" />
      </div>

      <div className="relative z-10 w-full max-w-[600px] mx-auto flex flex-col items-center flex-1">
        <div className="flex items-center gap-2 mb-4">
          <img src="/focusia-logo2.png" alt="Focusia Logo" className="w-6 h-6 object-contain" />
          <span className="font-bold text-slate-800 text-lg tracking-tight">Focusia</span>
        </div>

        <h1 className="text-[42px] md:text-[56px] font-extrabold text-slate-900 text-center leading-tight tracking-tight">
          Comencemos<span className="text-[#1d2fdc]">.</span>
        </h1>

        <p className="text-slate-500 text-center mt-2 mb-6 text-[13px] md:text-[14px]">
          Crea tu cuenta para sincronizar tu experiencia en todos tus dispositivos.
        </p>

        <form onSubmit={submit} className="w-full space-y-3">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>}
          <div className="relative w-full">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} autoComplete="given-name"
              className={inputCls} placeholder="Nombre" />
          </div>

          <div className="relative w-full">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M2 4l10 8 10-8" />
              </svg>
            </div>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email"
              className={inputCls} placeholder="Correo electrónico" />
          </div>

          <div className="relative w-full">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="10" width="16" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                <line x1="12" y1="14" x2="12" y2="17" />
              </svg>
            </div>
            <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
              className={inputPwCls} placeholder="Contraseña" />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
              <IconoOjo abierto={showPw} />
            </button>
          </div>

          <div className="relative w-full">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="10" width="16" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                <line x1="12" y1="14" x2="12" y2="17" />
              </svg>
            </div>
            <input type={showConfirmPw ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}
              className={inputPwCls} placeholder="Confirmar contraseña" />
            <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
              <IconoOjo abierto={showConfirmPw} />
            </button>
          </div>

          <div className="w-full text-left">
            {onRecuperar ? (
              <button type="button" onClick={onRecuperar} className="text-[#1d2fdc] text-[13px] font-medium hover:underline">¿Olvidaste tu contraseña?</button>
            ) : (
              <span className="text-[#1d2fdc] text-[13px] font-medium">¿Olvidaste tu contraseña?</span>
            )}
          </div>

          <BotonGoogle
            onListo={() => onExito({ nombre: nombre.trim(), email: email.trim() })}
            fallback={
              <button type="button" title="Inicio de sesión con otras aplicaciones — disponible próximamente"
                className="w-full py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors cursor-pointer">
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continuar con Google
              </button>
            }
          />

          <div className="grid grid-cols-2 gap-4">
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-lg text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-[0_8px_20px_rgba(29,47,220,0.3)] hover:shadow-[0_10px_24px_rgba(124,58,237,0.4)] cursor-pointer disabled:opacity-50 bg-gradient-to-r from-[#1d4ed8] to-[#7c3aed]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
              {loading ? 'Creando...' : 'Crear cuenta'}
            </button>
            <button type="button" onClick={onIrLogin}
              className="w-full py-3 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors cursor-pointer">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10,17 15,12 10,7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              Iniciar sesión
            </button>
          </div>
        </form>

        {paso && (
          <div className="w-full mt-5">
            <div className="flex items-center w-full">
              {Array.from({ length: paso.total }, (_, i) => {
                const n = i + 1;
                const isCompleted = n < paso.actual;
                const isCurrent = n === paso.actual;
                return (
                  <div key={n} className="flex-1 flex items-center last:flex-none">
                    <button type="button" onClick={() => paso.onIrPaso(n)} title={`Ir al paso ${n} de ${paso.total}`} aria-label={`Ir al paso ${n} de ${paso.total}`} className={`w-3 h-3 rounded-full shrink-0 cursor-pointer hover:scale-125 transition-transform flex items-center justify-center ${isCompleted || isCurrent ? 'bg-[#1d2fdc]' : 'bg-slate-300 hover:bg-[#7c3aed]'}`}>
                      {isCompleted && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12" /></svg>}
                    </button>
                    {n < paso.total && <div className={`flex-1 h-[2px] mx-1 ${n < paso.actual ? 'bg-[#1d2fdc]' : 'bg-slate-200'}`} />}
                  </div>
                );
              })}
            </div>
            <p className="text-center text-slate-800 text-sm font-semibold mt-3">Paso {paso.actual} de {paso.total}</p>
          </div>
        )}

        <div className="mt-4 flex items-center justify-center gap-1.5">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="#1d4ed8" />
            <polyline points="9,12 11,14 15,10" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-slate-700 text-xs">Tu información está protegida y sincronizada en todos tus dispositivos.</span>
        </div>
      </div>
    </div>
  );
}

export function ResetPasswordGate({ token, onDone }: { token: string; onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authService.passwordResetConfirm(token, password);
      setOk(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'No se pudo actualizar. El enlace puede haber expirado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#ffffff]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="focusia-logo2.png" alt="Logo" className="w-24 h-24 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-black">Nueva contraseña</h1>
          <p className="text-sm text-gray-500 mt-1">Elige una contraseña segura para tu cuenta</p>
        </div>
        {ok ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-gray-600 mb-6">Contraseña actualizada. Ya puedes iniciar sesión.</p>
            <button
              type="button"
              onClick={onDone}
              className="w-full py-4 bg-gradient-to-r from-[#200013] via-[#814B8D] to-[#143CCC] text-white font-bold text-sm tracking-wider uppercase rounded-xl hover:shadow-lg transition-all"
            >
              IR A INICIAR SESIÓN
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-black uppercase tracking-wide">NUEVA CONTRASEÑA</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-[#f2f3f5] border border-transparent rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2b44ff]/30 focus:border-[#2b44ff] placeholder:text-gray-400"
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-black uppercase tracking-wide">CONFIRMAR CONTRASEÑA</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-[#f2f3f5] border border-transparent rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2b44ff]/30 focus:border-[#2b44ff] placeholder:text-gray-400"
                  placeholder="Repite tu contraseña"
                />
              </div>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-[#200013] via-[#814B8D] to-[#143CCC] text-white font-bold text-sm tracking-wider uppercase rounded-xl hover:shadow-lg transition-all disabled:opacity-70"
            >
              {loading ? 'GUARDANDO...' : 'GUARDAR CONTRASEÑA'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
