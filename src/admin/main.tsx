import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AdminApp from './AdminApp';
import '../index.css';

/**
 * Punto de entrada del panel de administración.
 *
 * Es una app de React aparte (`index-admin.html`), no una ruta dentro de la
 * app de usuario: así el panel se despliega y se cachea por separado y no
 * carga el bundle de la app normal para quien solo administers contenido.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>,
);
