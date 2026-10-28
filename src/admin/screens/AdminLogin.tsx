import { useState } from 'react';
import { Lock, Mail, LogIn, ShieldAlert } from 'lucide-react';
import { adminAuth, adminService, leerError, type AdminUser } from '../lib/adminApi';
import { Button, Field, Input, Aviso } from '../components/ui';

export default function AdminLogin({
  onEntrar,
  onNoAutorizado,
}: {
  onEntrar: (usuario: AdminUser) => void;
  /** El login fue válido pero la cuenta no es administradora. */
  onNoAutorizado: () => void;
}) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [mostrarPass, setMostrarPass] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Ingresá tu correo y tu contraseña.');
      return;
    }

    setCargando(true);
    setError(null);
    try {
      const usuario = await adminAuth.login(form.email, form.password);
      onEntrar(usuario);
    } catch (err) {
      const mensaje = leerError(err);
      // 403 = la contraseña era correcta pero no hay permisos de staff.
      if (mensaje.includes('permisos de administrador')) {
        onNoAutorizado();
        return;
      }
      setError(
        mensaje.includes('400') || mensaje.toLowerCase().includes('credenciales')
          ? 'Correo o contraseña incorrectos.'
          : mensaje,
      );
    } finally {
      setCargando(false);
    }
  };

  /** Comprobación al abrir el panel: si la cookie sigue viva, entramos directo. */
  const reintentarSesion = async () => {
    setCargando(true);
    try {
      onEntrar(await adminService.session());
    } catch {
      onNoAutorizado();
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A26] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <img src="./focussia.png" alt="" className="w-6 h-6" />
            <span className="text-lg font-bold text-white tracking-wide">Focusia</span>
          </div>
          <h1 className="text-xl font-extrabold text-white">Panel de contenido</h1>
          <p className="text-xs text-white/50 mt-2">
            Entrá con una cuenta de administrador para gestionar cursos, tribù, juegos y avatares.
          </p>
        </div>

        <form
          onSubmit={enviar}
          className="bg-white dark:bg-[#14142e] rounded-2xl p-6 shadow-2xl space-y-4 border border-white/10"
        >
          {error && <Aviso tipo="error">{error}</Aviso>}

          <Field etiqueta="Correo" requerido>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="admin@focusia.co"
                className="pl-9"
                autoComplete="username"
              />
            </div>
          </Field>

          <Field etiqueta="Contraseña" requerido>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type={mostrarPass ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="pl-9 pr-16"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setMostrarPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-gray-400 hover:text-gray-600"
              >
                {mostrarPass ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </Field>

          <Button type="submit" cargando={cargando} className="w-full justify-center py-2.5">
            {!cargando && <LogIn className="w-4 h-4" />}
            Entrar al panel
          </Button>

          <p className="text-[10px] text-gray-400 text-center leading-relaxed">
            Esta cuenta necesita <code className="text-gray-500">is_staff</code> activa. Si no la
            tenés, pedí que te la activen desde el admin de Django.
          </p>
        </form>

        <p className="text-center mt-6">
          <button
            onClick={reintentarSesion}
            className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
          >
            Ya tengo una sesión abierta · reintentar
          </button>
        </p>
      </div>
    </div>
  );
}

/** Pantalla para cuando la cuenta existe pero no es administradora. */
export function SinPermisos({ onSalir }: { onSalir: () => void }) {
  return (
    <div className="min-h-screen bg-[#0A0A26] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#14142e] rounded-2xl p-8 max-w-md text-center shadow-2xl border border-white/10">
        <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-7 h-7 text-amber-600 dark:text-amber-400" />
        </div>
        <h1 className="text-base font-bold text-slate-900 dark:text-white">Cuenta sin permisos</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
          Iniciaste sesión correctamente, pero tu usuario no tiene el permiso de administrador.
          Para entrar al panel de contenido hace falta que alguien active
          <code className="text-gray-600 dark:text-gray-300 mx-1">is_staff</code>
          en tu cuenta.
        </p>
        <Button variant="ghost" onClick={onSalir} className="mt-6">
          Volver al inicio de sesión
        </Button>
      </div>
    </div>
  );
}
