import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { adminAuth, adminService, type AdminUser } from './lib/adminApi';
import AdminLayout, { type Seccion } from './components/AdminLayout';
import AdminLogin, { SinPermisos } from './screens/AdminLogin';
import OverviewScreen from './screens/OverviewScreen';
import ProgramaScreen from './screens/ProgramaScreen';
import TribuScreen from './screens/TribuScreen';
import AprendizajeScreen from './screens/AprendizajeScreen';
import AvatarsScreen from './screens/AvatarsScreen';
import GamesScreen from './screens/GamesScreen';

/**
 * Arranque del panel.
 *
 * La app de usuario ya dejó una cookie de sesión si el usuario venía logueado,
 * así que primero se intenta `/api/admin/session/`: si responde bien, no hay
 * que volver a pedir la contraseña. Un 403 acá significa "hay sesión, pero no
 * sos administrador", que es un estado distinto al de "no hay sesión".
 */

type Estado =
  | { fase: 'comprobando' }
  | { fase: 'sin-sesion' }
  | { fase: 'sin-permisos' }
  | { fase: 'listo'; usuario: AdminUser };

export default function AdminApp() {
  const [estado, setEstado] = useState<Estado>({ fase: 'comprobando' });
  const [seccion, setSeccion] = useState<Seccion>('resumen');

  useEffect(() => {
    adminService
      .session()
      .then((usuario) => setEstado({ fase: 'listo', usuario }))
      .catch(() => setEstado({ fase: 'sin-sesion' }));
  }, []);

  const entrar = useCallback((usuario: AdminUser) => {
    setEstado({ fase: 'listo', usuario });
    setSeccion('resumen');
  }, []);

  const salir = useCallback(async () => {
    await adminAuth.logout();
    setEstado({ fase: 'sin-sesion' });
  }, []);

  if (estado.fase === 'comprobando') {
    return (
      <div className="min-h-screen bg-[#0A0A26] flex items-center justify-center">
        <div className="flex items-center gap-2.5 text-white/60">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Comprobando la sesión…</span>
        </div>
      </div>
    );
  }

  if (estado.fase === 'sin-permisos') {
    return <SinPermisos onSalir={() => setEstado({ fase: 'sin-sesion' })} />;
  }

  if (estado.fase === 'sin-sesion') {
    return <AdminLogin onEntrar={entrar} onNoAutorizado={() => setEstado({ fase: 'sin-permisos' })} />;
  }

  return (
    <AdminLayout usuario={estado.usuario} seccion={seccion} onCambiar={setSeccion} onSalir={salir}>
      {seccion === 'resumen' && <OverviewScreen onIr={setSeccion} />}
      {seccion === 'programa' && <ProgramaScreen />}
      {seccion === 'tribu' && <TribuScreen />}
      {seccion === 'aprendizaje' && <AprendizajeScreen />}
      {seccion === 'avatares' && <AvatarsScreen />}
      {seccion === 'juegos' && <GamesScreen />}
    </AdminLayout>
  );
}
