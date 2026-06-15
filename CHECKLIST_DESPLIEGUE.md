# ✅ Checklist de Despliegue - Focussia en Netlify

Sigue este checklist para desplegar Focussia Web en Netlify y Railway paso a paso.

---

## 📋 Checklist Pre-Despliegue

### 🔧 Preparación Frontend

- [ ] **Limpiar proyecto**
  ```bash
  npm run clean
  npm install
  ```

- [ ] **Verificar build local**
  ```bash
  npm run build
  npm run preview
  ```
  - [ ] Sin errores de TypeScript
  - [ ] Sin advertencias críticas

- [ ] **Verificar variables de entorno**
  - [ ] `.env` contiene `VITE_API_URL`
  - [ ] `.env.example` está documentado
  - [ ] `.env` está en `.gitignore`

### 🐍 Preparación Backend

- [ ] **Instalar dependencias**
  ```bash
  cd backend
  pip install django djangorestframework django-cors-headers psycopg2-binary gunicorn
  pip freeze > requirements.txt
  ```

- [ ] **Crear archivos de configuración**
  - [ ] `Procfile` existe
  - [ ] `runtime.txt` existe (python-3.11.7)

- [ ] **Verificar settings.py**
  - [ ] CORS_ALLOWED_ORIGINS configurado
  - [ ] DEBUG=False en producción
  - [ ] SECRET_KEY es seguro
  - [ ] ALLOWED_HOSTS incluye dominio

- [ ] **Migraciones**
  ```bash
  python manage.py makemigrations
  python manage.py migrate
  ```
  - [ ] Sin errores de migración

### 📦 Git & Repositorio

- [ ] **Commit cambios**
  ```bash
  git add .
  git commit -m "feat: preparar para despliegue"
  git push origin main
  ```

- [ ] **Verificar en GitHub**
  - [ ] Todos los archivos están presentes
  - [ ] `.env` NO está subido (debería estar en .gitignore)
  - [ ] `netlify.toml` está presente

---

## 🚀 Despliegue Frontend (Netlify)

### Paso 1: Conectar Repositorio

- [ ] Ve a [https://netlify.com](https://netlify.com)
- [ ] Inicia sesión con GitHub
- [ ] Haz clic en "New site from Git"
- [ ] Selecciona GitHub como proveedor
- [ ] Busca y selecciona `focussia-web`
- [ ] Haz clic en "Install"

### Paso 2: Configuración Automática

Netlify automáticamente detectará:
- [ ] Build command: `npm run build`
- [ ] Publish directory: `dist`
- [ ] Configuration file: `netlify.toml`

### Paso 3: Variables de Entorno

En Netlify Dashboard:
1. Ve a **Site settings** → **Build & deploy** → **Environment**
2. Haz clic en "Edit variables"
3. Agrega:

```
VITE_API_URL = (URL de tu backend cuando esté listo)
GEMINI_API_KEY = (tu clave de Gemini)
```

- [ ] `VITE_API_URL` agregada
- [ ] `GEMINI_API_KEY` agregada
- [ ] Guardado cambios

### Paso 4: Hacer Deploy

- [ ] Haz clic en "Deploy site"
- [ ] Espera a que termine (2-5 minutos)
- [ ] Netlify proporciona URL: `https://tudominio.netlify.app`
- [ ] Verifica que el sitio carga sin errores (F12 → Console)

---

## 🐍 Despliegue Backend (Railway)

### Paso 1: Crear Cuenta Railway

- [ ] Ve a [https://railway.app](https://railway.app)
- [ ] Inicia sesión con GitHub
- [ ] Permite permisos de repositorio

### Paso 2: Crear Proyecto

- [ ] Haz clic en "New Project"
- [ ] Selecciona "Deploy from GitHub"
- [ ] Busca `focussia-web`
- [ ] Selecciona el repositorio

### Paso 3: Agregar Base de Datos

- [ ] Haz clic en "+" en Railway Dashboard
- [ ] Selecciona "PostgreSQL"
- [ ] Espera a que se cree (1-2 minutos)
- [ ] Railway automáticamente configura `DATABASE_URL`

### Paso 4: Configurar Variables de Entorno

En Railway Dashboard:
1. Ve a la aplicación Django (la que creó automáticamente)
2. Ve a **Variables** tab
3. Agrega estas variables:

```
SECRET_KEY=<generar-una-nueva>
DEBUG=False
ALLOWED_HOSTS=tudominio-api.railway.app,localhost
CORS_ALLOWED_ORIGINS=https://tudominio.netlify.app
```

Para generar SECRET_KEY:
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

- [ ] `SECRET_KEY` agregada
- [ ] `DEBUG=False` configurada
- [ ] `ALLOWED_HOSTS` configurada
- [ ] `CORS_ALLOWED_ORIGINS` configurada
- [ ] Guardado cambios

### Paso 5: Iniciar Despliegue

- [ ] Railway automáticamente detecta `Procfile`
- [ ] Inicia despliegue (3-10 minutos)
- [ ] Verifica logs: sin errores críticos
- [ ] Railway proporciona URL: `https://tudominio-api.railway.app`

### Paso 6: Ejecutar Migraciones

En Railway Dashboard:
- [ ] Ejecutar comando de release: `python manage.py migrate`
- [ ] O esperar a que se ejecute automáticamente

---

## 🔗 Conectar Frontend ↔ Backend

### Paso 1: Actualizar URL del Backend

En Netlify Dashboard:
1. Ve a **Site settings** → **Build & deploy** → **Environment**
2. Busca `VITE_API_URL`
3. Actualiza con la URL de Railway: `https://tudominio-api.railway.app`

- [ ] `VITE_API_URL` apunta a Railway backend

### Paso 2: Redeploy del Frontend

- [ ] Netlify automáticamente detecta cambio en variables
- [ ] Haz clic en "Deploys" → último deploy → "Retry build"
- [ ] O: `git commit --allow-empty -m "trigger rebuild"` y push
- [ ] Espera a que termine

### Paso 3: Verificar Conexión

- [ ] Abre https://tudominio.netlify.app
- [ ] Abre consola (F12)
- [ ] Haz una acción que llame a la API
- [ ] Verifica en Network tab:
  - [ ] Las requests van a `https://tudominio-api.railway.app/api/...`
  - [ ] Status 200/201 (no errores CORS 4xx/5xx)

---

## ✅ Verificación Final

### Frontend

- [ ] Sitio accesible en `https://tudominio.netlify.app`
- [ ] No hay errores en consola (F12)
- [ ] Assets cargan correctamente
- [ ] Responsive design funciona
- [ ] Todas las rutas funcionan (no errores 404)

### Backend

- [ ] API accesible en `https://tudominio-api.railway.app`
- [ ] Admin panel accesible en `/admin`
- [ ] Base de datos conectada
- [ ] Migraciones ejecutadas sin errores
- [ ] Logs sin errores críticos

### Integración

- [ ] Frontend se conecta a Backend
- [ ] Las llamadas API funcionan
- [ ] Sin errores CORS
- [ ] Autenticación funciona
- [ ] Datos se guardan en BD

### Seguridad

- [ ] HTTPS en ambos sitios
- [ ] DEBUG=False en producción
- [ ] SECRET_KEY es seguro
- [ ] CORS limitado a dominios específicos
- [ ] Variables sensibles NO están en git
- [ ] Tokens/credenciales cifrados

---

## 🎉 ¡DESPLIEGUE COMPLETADO!

Si todos los items están marcados ✅, tu aplicación Focussia está lista en producción.

### URLs Finales

```
Frontend:  https://tudominio.netlify.app
Backend:   https://tudominio-api.railway.app
Admin:     https://tudominio-api.railway.app/admin
```

---

## 📝 Notas Importantes

1. **Auto-deploy:** Cada push a `main` automáticamente redeploya en Netlify
2. **Variables de entorno:** Si cambias variables, debes redeploy
3. **Base de datos:** Railway automáticamente ejecuta migraciones
4. **Logs:** Revisa logs regularmente para detectar problemas
5. **Backups:** Railway automáticamente hace backups de PostgreSQL

---

## 🆘 Si Algo Falla

1. **Revisa los logs:**
   - Netlify: `netlify logs`
   - Railway: Dashboard → Logs tab

2. **Verifica variables de entorno:**
   - Frontend: `VITE_API_URL` apunta a URL correcta
   - Backend: `CORS_ALLOWED_ORIGINS` incluye frontend

3. **Limpia cache:**
   - Navegador: Ctrl+Shift+Delete
   - Netlify: Haz clic en "Clear cache and deploy"

4. **Busca en:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Troubleshooting

---

**Guía completa:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
**Comandos:** [COMANDOS_DESPLIEGUE.md](./COMANDOS_DESPLIEGUE.md)
**Backend:** [BACKEND_DEPLOYMENT.md](./BACKEND_DEPLOYMENT.md)

**¡Buena suerte! 🚀**
