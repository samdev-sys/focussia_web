# 📦 Estructura de Despliegue - Focussia

## Arquitectura General

```
┌────────────────────────────────────────────────────────────────┐
│                     USUARIO (Navegador)                        │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
        ┌────────────────┐
        │  INTERNET      │
        └────────┬───────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
   ┌─────────┐        ┌──────────┐
   │ NETLIFY │        │ RAILWAY  │
   │ CDN     │        │ Backend  │
   └────┬────┘        └────┬─────┘
        │                  │
        ▼                  ▼
   ┌────────────────┐  ┌──────────────┐
   │ Frontend       │  │ Django API   │
   │ • React        │  │ • PostgreSQL │
   │ • TypeScript   │  │ • REST API   │
   │ • Vite Build   │  │ • Admin      │
   │ • dist/        │  │              │
   └────────────────┘  └──────────────┘
```

## 📂 Archivos por Componente

### 🌐 FRONTEND (Netlify)

```
focussia_web/
├── 📄 netlify.toml           ← Configuración Netlify
├── 📄 vite.config.ts         ← Configuración Vite
├── 📄 package.json           ← Dependencias
├── 📄 tsconfig.json          ← TypeScript config
├── 📄 .env.example           ← Variables de ejemplo
├── 📄 .env                   ← Variables locales (NO subir)
├── 📄 .gitignore             ← Archivos a ignorar
├── 📂 src/                   ← Código fuente
│   ├── 📄 main.tsx
│   ├── 📄 App.tsx
│   ├── 📄 dashboard.tsx
│   ├── 📂 components/
│   ├── 📂 hooks/
│   ├── 📂 services/
│   │   └── 📄 api.ts         ← Conexión con backend
│   └── 📂 store/
├── 📂 public/                ← Archivos estáticos
└── 📂 dist/                  ← BUILD OUTPUT (generado)
    └── index.html
```

**Despliegue:**
```
Netlify automáticamente:
1. Lee: npm run build
2. Crea: dist/
3. Despliega en: https://tudominio.netlify.app
4. Redirige rutas a: /index.html (SPA)
```

---

### 🐍 BACKEND (Railway)

```
backend/
├── 📄 manage.py              ← Django CLI
├── 📄 requirements.txt       ← Dependencias Python
├── 📄 runtime.txt            ← Versión Python (3.11.7)
├── 📄 Procfile               ← Comandos para Railway
├── 📄 .env.production        ← Variables producción
├── 📂 focusia_api/           ← App principal
│   ├── 📄 __init__.py
│   ├── 📄 settings.py        ← Configuración Django
│   ├── 📄 urls.py            ← Rutas principales
│   ├── 📄 views.py
│   ├── 📄 wsgi.py            ← WSGI para Gunicorn
│   ├── 📄 middleware.py
│   └── 📄 authentication.py
├── 📂 dashboard/             ← App dashboard
│   ├── 📄 models.py          ← Base de datos
│   ├── 📄 views.py           ← Lógica
│   ├── 📄 serializers.py     ← Serialización API
│   ├── 📄 urls.py            ← Rutas
│   ├── 📂 migrations/        ← Historial DB
│   └── 📂 management/
├── 📂 static/                ← Archivos estáticos
└── 📂 media/                 ← Archivos subidos
```

**Despliegue:**
```
Railway automáticamente:
1. Lee: Procfile
2. Instala: requirements.txt
3. Ejecuta: python manage.py migrate
4. Inicia: gunicorn focusia_api.wsgi
5. Proporciona URL: https://tudominio-api.railway.app
6. Base de datos: PostgreSQL incluida
```

---

## 🔄 Flujo de Datos

```
USUARIO
   │
   ├─ Abre https://tudominio.netlify.app
   │       ↓
   │    Netlify CDN entrega dist/index.html
   │       ↓
   │    React carga src/
   │       ↓
   │    API Hook (useApi.ts)
   │       ├─ Lee VITE_API_URL
   │       └─ Llama a API
   │              ↓
   │         https://tudominio-api.railway.app
   │              ↓
   │         Django recibe request
   │              ├─ Valida CORS
   │              ├─ Autentica usuario
   │              ├─ Consulta PostgreSQL
   │              └─ Responde JSON
   │              ↓
   │         React renderiza datos
   │              ↓
   │         Usuario ve la app 🎉
```

---

## 🛠 Variables de Entorno por Ambiente

### 🔨 Desarrollo Local

```env
# .env (archivo local)
VITE_API_URL=http://localhost:8000
GEMINI_API_KEY=sk-...
NODE_ENV=development

SECRET_KEY=insecure-dev-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DB_NAME=focusia_db
DB_USER=postgres
DB_PASSWORD=Enero4432#
DB_HOST=localhost
DB_PORT=5432
```

### 📦 Producción (Netlify)

```
VITE_API_URL = https://tudominio-api.railway.app
GEMINI_API_KEY = sk-...
NODE_ENV = production
```

### 🚀 Producción (Railway Backend)

```
SECRET_KEY = (clave segura generada)
DEBUG = False
ALLOWED_HOSTS = tudominio-api.railway.app, localhost
DATABASE_URL = (proporcionado por Railway)
CORS_ALLOWED_ORIGINS = https://tudominio.netlify.app
```

---

## 📊 Comparativa de Servicios

| Aspecto | Netlify | Railway |
|--------|---------|---------|
| **Tipo** | Frontend + Static | Backend + Dinámico |
| **Precio** | Gratuito/desde $19 | desde $5/mes |
| **Deploy** | GitHub auto | GitHub auto |
| **Base de datos** | No incluida | PostgreSQL incluida |
| **Scale** | Automático | Manual/automático |
| **HTTPS** | Automático | Automático |
| **Logs** | Dashboard | Dashboard |

---

## ✅ Checklist de Archivos

### Frontend ✅
- [x] `netlify.toml` - Configuración Netlify
- [x] `vite.config.ts` - Configuración Vite
- [x] `package.json` - Dependencias (npm run build)
- [x] `.env.example` - Ejemplo de variables
- [x] `.gitignore` - Ignorar archivos
- [x] `src/services/api.ts` - Usa VITE_API_URL

### Backend ⚠️
- [ ] `requirements.txt` - Dependencias Python
- [ ] `Procfile` - Gunicorn config
- [ ] `runtime.txt` - Python 3.11.7
- [ ] `focusia_api/settings.py` - Configuración CORS
- [ ] `focusia_api/wsgi.py` - WSGI app

---

## 🚀 Próximas Acciones

1. **Backend:**
   ```bash
   cd backend
   pip freeze > requirements.txt
   # Crear Procfile y runtime.txt (ver BACKEND_DEPLOYMENT.md)
   ```

2. **Git:**
   ```bash
   git add .
   git commit -m "feat: agregar configuración de despliegue"
   git push origin main
   ```

3. **Netlify:**
   - Conectar repositorio
   - Configurar variables
   - Activar auto-deploy

4. **Railway:**
   - Conectar repositorio
   - Configurar PostgreSQL
   - Configurar variables
   - Iniciar despliegue

---

**📖 Leer: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) para pasos detallados**
