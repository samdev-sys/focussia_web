import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // El backend vive dentro del repo y escribe archivos en caliente
      // (security.log, sqlite, media). Sin esto, cada error de API que se
      // loguea dispara un reload HMR -> nueva ráfaga -> más errores: bucle.
      watch: {
        ignored: [
          '**/backend/**',
          '**/.venv/**',
          '**/node_modules/**',
          '**/dist/**',
          '**/*.log',
          '**/*.sqlite3',
        ],
      },
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
        // Los archivos subidos desde el panel se sirven desde MEDIA_URL. En
        // desarrollo también proxamos /media para no depender de CORS.
        '/media': {
          target: env.VITE_API_URL || 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      rollupOptions: {
        // Dos entradas: la app de usuario y el panel de administración. Vite
        // las emite como index.html e index-admin.html en dist/.
        input: {
          main: path.resolve(__dirname, 'index.html'),
          admin: path.resolve(__dirname, 'index-admin.html'),
        },
      },
    },
  };
});
