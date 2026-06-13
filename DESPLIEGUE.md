# 🚀 Focussia Web - Guía Rápida de Despliegue

## 📋 Resumen Rápido

**Focussia** es una aplicación full-stack con:
- **Frontend**: React + TypeScript + Vite → **Netlify**
- **Backend**: Django + PostgreSQL → **Railway.app**

## 🎯 Para Desplegar Ahora Mismo

### 1️⃣ Frontend (Netlify)

```bash
# Conectar repositorio a Netlify
# 1. Ve a https://netlify.com
# 2. "New site from Git" → GitHub
# 3. Selecciona este repositorio
# 4. Netlify automáticamente hará deploy

# Netlify detectará:
# - Build command: npm run build
# - Publish directory: dist
# - Config file: netlify.toml
```

**Variables de entorno en Netlify:**
```
VITE_API_URL = https://tu-api-railway.app
GEMINI_API_KEY = tu_clave
```

### 2️⃣ Backend (Railway)

```bash
# 1. Ve a https://railway.app
# 2. "New Project" → "Deploy from GitHub"
# 3. Selecciona este repositorio
# 4. Railway automáticamente hará deploy

# Configurar variables de entorno en Railway:
# Ver: BACKEND_DEPLOYMENT.md
```

## 📚 Documentación Completa

- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** ← Lee esto primero
  - Guía paso a paso completa
  - Frontend + Backend
  - CORS y seguridad

- **[BACKEND_DEPLOYMENT.md](./BACKEND_DEPLOYMENT.md)** ← Para Django
  - Configuración de Django
  - Variables de entorno
  - Migraciones

- **[NETLIFY_DEPLOYMENT.md](./NETLIFY_DEPLOYMENT.md)** ← Para el frontend
  - Configuración de Netlify
  - Variables de entorno
  - Troubleshooting

## 🔧 Configuración Local (para desarrollo)

```bash
# Frontend
cd focussia_web
npm install
npm run dev
# Disponible en http://localhost:5173

# Backend
cd backend
pip install -r requirements.txt
python manage.py runserver
# Disponible en http://localhost:8000
```

## 🌐 URLs Esperadas Después del Despliegue

```
Frontend:  https://tudominio.netlify.app
Backend:   https://tudominio-api.railway.app
Admin:     https://tudominio-api.railway.app/admin
API:       https://tudominio-api.railway.app/api
```

## ✅ Checklist Pre-Despliegue

- [ ] Lees [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- [ ] Backend: Creas `requirements.txt`, `Procfile`, `runtime.txt`
- [ ] Backend: Actualizas `settings.py` con variables de entorno
- [ ] Frontend: Variables de entorno (`VITE_API_URL`, etc.)
- [ ] Git: `git push` de todos los cambios
- [ ] Netlify: Conectas repositorio
- [ ] Railway: Conectas repositorio y base de datos
- [ ] Verficas que frontend y backend se comunican

## 🆘 Problemas Comunes

| Problema | Solución |
|----------|----------|
| Error CORS | Ver `DEPLOYMENT_GUIDE.md` - Paso 3: CORS |
| Variables de entorno no cargan | Redeploy después de cambiar |
| "Cannot GET /api/..." | Verificar `VITE_API_URL` |
| Base de datos vacía | Ejecutar migraciones en Railway |

## 📞 Soporte

1. Revisar [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
2. Revisar logs: `netlify logs` y Railway dashboard
3. Abrir consola del navegador (F12) para errores

---

**🎉 ¡Listo! Sigue [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) para desplegar.**
