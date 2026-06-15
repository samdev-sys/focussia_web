# Guía Completa de Despliegue: Frontend (Netlify) + Backend (Django)

## Arquitectura del Proyecto

```
┌─────────────────────┐
│   Navegador         │
└──────────┬──────────┘
           │
           ├─────────────────────────────────┐
           │                                 │
    ┌──────▼──────┐              ┌──────────▼───────┐
    │   Netlify   │              │  Backend Service │
    │  (Frontend) │◄────────────►│   (Django API)   │
    │   React +   │              │  Heroku/Railway/ │
    │   Vite      │              │  Render/etc.     │
    └─────────────┘              └──────────────────┘
```

## 📦 Paso 1: Desplegar el Frontend en Netlify

### 1.1 Preparar el repositorio

```bash
# Asegúrate de estar en la rama main
git checkout main

# Actualizar archivos de configuración
git add netlify.toml .env.example .gitignore NETLIFY_DEPLOYMENT.md
git commit -m "feat: agregar configuración para despliegue en Netlify"
git push origin main
```

### 1.2 Conectar con Netlify

1. Ve a https://netlify.com y inicia sesión
2. Haz clic en "New site from Git"
3. Selecciona GitHub (o tu proveedor de Git)
4. Busca y selecciona el repositorio `focussia-web`
5. Netlify automáticamente detectará:
   - Comando de build: `npm run build`
   - Carpeta publish: `dist`
   - Archivo de configuración: `netlify.toml`

### 1.3 Configurar variables de entorno en Netlify

1. En el dashboard de Netlify, ve a:
   - **Site settings** → **Build & deploy** → **Environment**
2. Agrega estas variables:

```
VITE_API_URL = https://tu-api-backend.com
GEMINI_API_KEY = tu_clave_gemini
```

3. Haz clic en "Save"
4. Netlify automáticamente redesplegará el sitio con las nuevas variables

### 1.4 Verificar el despliegue del frontend

✅ El sitio debería estar disponible en: `https://tudominio.netlify.app`

---

## 🐍 Paso 2: Desplegar el Backend (Django)

El backend puede desplegarse en múltiples servicios. Aquí mostramos Railway (recomendado):

### 2.1 Preparar el backend para despliegue

#### a) Actualizar `requirements.txt`

```bash
cd backend
pip freeze > requirements.txt
```

Asegúrate de que incluya:
- `django`
- `djangorestframework`
- `django-cors-headers`
- `psycopg2-binary` (para PostgreSQL)
- `gunicorn` (para producción)
- `python-dotenv`

#### b) Crear `Procfile` en la raíz del backend

```bash
# backend/Procfile
web: gunicorn focusia_api.wsgi --log-file -
```

#### c) Crear `runtime.txt` en la raíz del backend

```bash
# backend/runtime.txt
python-3.11.7
```

### 2.2 Desplegar en Railway.app

1. Regístrate en https://railway.app
2. Conecta tu repositorio de GitHub
3. En el dashboard, selecciona "New Project" → "Deploy from GitHub"
4. Selecciona el repositorio `focussia-web`
5. Railway automáticamente detectará que es Python
6. Configura las variables de entorno:

```
SECRET_KEY = (generar una nueva segura)
DEBUG = False
ALLOWED_HOSTS = tudominio-api.railway.app, localhost
DB_ENGINE = django.db.backends.postgresql
DB_NAME = focusia_db
DB_USER = postgres
DB_PASSWORD = (contraseña segura)
DB_HOST = (host proporcionado por Railway)
DB_PORT = 5432
CORS_ALLOWED_ORIGINS = https://tudominio.netlify.app, http://localhost:3000
```

7. Railway proporciona una URL: `https://tudominio-api.railway.app`
8. Usa esta URL en `VITE_API_URL` en Netlify

### 2.3 Configurar CORS en Django

Actualiza `backend/focusia_api/settings.py`:

```python
CORS_ALLOWED_ORIGINS = [
    "https://tudominio.netlify.app",
    "http://localhost:3000",
    "http://localhost:5173",
]

CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = [
    "https://tudominio.netlify.app",
    "http://localhost:3000",
]
```

---

## 🔗 Paso 3: Conectar Frontend ↔ Backend

### 3.1 Actualizar API URL

En Netlify, configura:
```
VITE_API_URL = https://tudominio-api.railway.app
```

El archivo `src/services/api.ts` automáticamente usará esta URL:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

### 3.2 Verificar la conexión

1. Abre el dashboard en https://tudominio.netlify.app
2. Abre la consola del navegador (F12)
3. Verifica que no haya errores de CORS
4. Las llamadas a API deberían ir a `https://tudominio-api.railway.app/api/...`

---

## 📋 Checklist de Despliegue

### Frontend (Netlify)
- [ ] Repositorio Git configurado
- [ ] `netlify.toml` presente en raíz
- [ ] `.env.example` documentado
- [ ] `package.json` con script `build`
- [ ] Conectado a Netlify via GitHub
- [ ] Variables de entorno configuradas
- [ ] Build y despliegue automático funcionando

### Backend (Django)
- [ ] `requirements.txt` actualizado
- [ ] `Procfile` y `runtime.txt` presentes
- [ ] CORS configurado en `settings.py`
- [ ] Base de datos configurada en servicio de hosting
- [ ] Variables de entorno configuradas
- [ ] Health check `/api/health/` (opcional)

### Integración
- [ ] `VITE_API_URL` apunta al backend correcto
- [ ] No hay errores de CORS en consola
- [ ] Las llamadas a API funcionan correctamente
- [ ] Autenticación/tokens funcionan

---

## 🚀 Opciones Rápidas de Despliegue del Backend

| Servicio | Costo | Base de Datos | Ventajas |
|----------|-------|---------------|----------|
| **Railway** | ~$5/mes | PostgreSQL incluida | Fácil, integrado |
| **Render.com** | Gratuito (con limitaciones) | PostgreSQL gratuito | Generoso, simple |
| **Heroku** | Desde $7/mes | PostgreSQL desde $9/mes | Maduro, confiable |
| **Google Cloud** | Pago por uso | Cloud SQL | Escalable |
| **AWS** | Complejo | RDS + EC2 | Potente, flexible |

---

## 🔒 Seguridad - Checklist

- [ ] `DEBUG=False` en producción
- [ ] `SECRET_KEY` es único y seguro
- [ ] Variables sensibles NO están en `.env` (git ignora)
- [ ] CORS limitado a dominios específicos
- [ ] CSRF protegido
- [ ] HTTPS obligatorio en API
- [ ] Cookies httpOnly para tokens
- [ ] Rate limiting en backend (considerar)
- [ ] Validación de entrada en ambos lados

---

## 📝 Monitoreo Post-Despliegue

### Logs de Netlify
```bash
netlify logs
```

### Logs de Railway
Dashboard de Railway proporciona logs en tiempo real

### Verificar salud
```bash
curl https://tudominio.netlify.app
curl https://tudominio-api.railway.app/api/status/
```

---

## ❓ Troubleshooting

### "Cannot GET /api/..."
- Verificar que `VITE_API_URL` es correcto
- Verificar que el backend está corriendo

### Error 401/403
- Verificar tokens JWT/autenticación
- Revisar CORS headers

### Página blanca
- Abrir F12 y revisar console
- Verificar que `dist/` se creó correctamente
- Limpiar cache del navegador

### Variables de entorno no cargan
- Redeploy después de cambiar variables
- Verificar que estén en la sección correcta de Netlify

---

## 📚 Recursos Útiles

- [Netlify Docs](https://docs.netlify.com)
- [Railway Docs](https://docs.railway.app)
- [Django Deployment](https://docs.djangoproject.com/en/stable/howto/deployment/)
- [Gunicorn Docs](https://gunicorn.org/)
- [CORS Explained](https://developer.mozilla.org/es/docs/Web/HTTP/CORS)

---

**¡Listo! 🎉 Tu aplicación Focussia está en la nube.**
