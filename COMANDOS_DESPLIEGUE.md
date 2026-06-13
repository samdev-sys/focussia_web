# 🚀 Comandos Rápidos de Despliegue

## 1️⃣ Preparación Inicial

```bash
# Posicionarse en raíz del proyecto
cd "C:\Users\Lenovo\Desktop\Onix Solutions\clientes\HIGEA\Focussia web\focussia_web"

# Verificar estructura
ls
```

## 2️⃣ Frontend - Pruebas Locales

```bash
# Instalar dependencias
npm install

# Desarrollo local
npm run dev
# Abrir: http://localhost:5173

# Build para producción
npm run build

# Vista previa del build
npm run preview

# Limpiar dist/
npm run clean
```

## 3️⃣ Backend - Preparación Django

```bash
# Entrar a backend
cd backend

# OPCIÓN A: Si tienes venv activo
pip freeze > requirements.txt

# OPCIÓN B: Instalar manualmente
pip install django djangorestframework django-cors-headers psycopg2-binary gunicorn python-dotenv google-generativeai pillow

# Crear Procfile
echo "web: gunicorn focusia_api.wsgi --log-file - --access-logfile - --error-logfile -" > Procfile

# Crear runtime.txt
echo "python-3.11.7" > runtime.txt

# Verificar que se crearon
ls Procfile runtime.txt requirements.txt
```

## 4️⃣ Migraciones Django

```bash
cd backend

# Crear migraciones (si hay cambios en models.py)
python manage.py makemigrations

# Aplicar migraciones
python manage.py migrate

# Crear superuser (hacer después del despliegue, o:)
# python manage.py createsuperuser

# Estadísticas
python manage.py showmigrations
```

## 5️⃣ Test Local con Gunicorn

```bash
# Instalar gunicorn localmente (si no lo tienes)
pip install gunicorn

# Ejecutar servidor
gunicorn focusia_api.wsgi --bind 0.0.0.0:8000 --workers 4

# Acceder a: http://localhost:8000
# Admin: http://localhost:8000/admin
```

## 6️⃣ Git - Guardar Cambios

```bash
# Volver a raíz del proyecto
cd ..

# Ver cambios
git status

# Agregar todos los cambios
git add .

# Commit
git commit -m "feat: configurar despliegue en Netlify y Railway

- Agregar netlify.toml para configuración automática
- Crear DEPLOYMENT_GUIDE.md con instrucciones paso a paso
- Crear BACKEND_DEPLOYMENT.md para Django
- Crear Procfile y runtime.txt para Railway
- Actualizar .env.example con nuevas variables
- Actualizar .gitignore con configuración completa"

# Push a GitHub
git push origin main

# Verificar
git log --oneline -5
```

## 7️⃣ Despliegue Frontend en Netlify

### Opción A: CLI (recomendado para testing)

```bash
# Instalar Netlify CLI globalmente (una sola vez)
npm install -g netlify-cli

# Autenticarse con Netlify
netlify login

# Deploy de prueba
netlify deploy --prod

# Netlify proporciona URL: https://...netlify.app
```

### Opción B: GitHub Integration (recomendado)

```bash
# 1. Abre https://netlify.com
# 2. Login con GitHub
# 3. "New site from Git" → GitHub
# 4. Busca y selecciona: "focussia-web"
# 5. Netlify detecta: netlify.toml automáticamente
# 6. Haz clic en "Deploy site"

# Netlify automáticamente:
# - Lee netlify.toml
# - Ejecuta: npm run build
# - Despliega: dist/
# - Publica en: https://tudominio.netlify.app

# En cada push a main, Netlify automáticamente redeploya
```

## 8️⃣ Despliegue Backend en Railway

```bash
# 1. Abre https://railway.app
# 2. Login con GitHub
# 3. "New Project" → "Deploy from GitHub"
# 4. Busca: "focussia-web"
# 5. Railway detecta: Procfile y runtime.txt
# 6. Selecciona: Add PostgreSQL database
# 7. Railway configura automáticamente

# En Dashboard de Railway:
# - Ve a "Variables"
# - Agrega:
#   SECRET_KEY=...
#   DEBUG=False
#   ALLOWED_HOSTS=tudominio-api.railway.app
#   CORS_ALLOWED_ORIGINS=https://tudominio.netlify.app

# Railway proporciona:
# - URL: https://tudominio-api.railway.app
# - DATABASE_URL: postgresql://...
```

## 9️⃣ Conexión Frontend ↔ Backend

```bash
# En Netlify Dashboard:
# 1. Site settings → Build & deploy → Environment
# 2. Agrega variable:
#    VITE_API_URL = https://tudominio-api.railway.app
# 3. Haz clic en "Save"
# 4. Netlify automáticamente redeploya

# Verificar conexión:
# 1. Abre https://tudominio.netlify.app
# 2. F12 (abrir consola)
# 3. Verifica que llamadas a API van a: https://tudominio-api.railway.app/api/...
# 4. No debe haber errores de CORS
```

## 🔟 Verificación Final

```bash
# Verificar Frontend
curl https://tudominio.netlify.app
# Debería devolver HTML (200 OK)

# Verificar Backend
curl https://tudominio-api.railway.app/api/status/
# Debería devolver JSON

# Verificar CORS (desde navegador)
# F12 → Console
# fetch('https://tudominio-api.railway.app/api/...', {
#   method: 'GET',
#   headers: { 'Content-Type': 'application/json' },
#   credentials: 'include'
# })

# Ver logs en tiempo real
netlify logs              # Frontend
# Railway Dashboard       # Backend
```

## 📝 Problemas Comunes & Soluciones

### ❌ "Cannot GET /api/..."
```bash
# Verificar que VITE_API_URL es correcto
# En Netlify variables: VITE_API_URL=https://tudominio-api.railway.app
# Redeploy
netlify deploy --prod
```

### ❌ Error CORS
```bash
# Verificar settings.py en Django
# Asegurar que CORS_ALLOWED_ORIGINS incluya: https://tudominio.netlify.app
# Redeploy backend en Railway
```

### ❌ Variables de entorno no cargan
```bash
# Redeploy después de cambiar variables
netlify deploy --prod  # Frontend
# Railway: Click "Redeploy"  # Backend
```

### ❌ Base de datos vacía
```bash
cd backend
python manage.py migrate --settings=focusia_api.settings
# O Railway ejecuta automáticamente en release
```

### ❌ "Page not found" después de refresh
```bash
# Netlify ya tiene redirect en netlify.toml
# Si no funciona:
# 1. Verifica que netlify.toml esté en raíz
# 2. Redeploy: netlify deploy --prod
```

## 📊 Resumen de URLs

```
Desarrollo Local:
- Frontend:  http://localhost:5173
- Backend:   http://localhost:8000
- Admin:     http://localhost:8000/admin

Producción:
- Frontend:  https://tudominio.netlify.app
- Backend:   https://tudominio-api.railway.app
- Admin:     https://tudominio-api.railway.app/admin
```

## 🎯 Checklist Completo

- [ ] Backend: `pip freeze > requirements.txt`
- [ ] Backend: Crear `Procfile` y `runtime.txt`
- [ ] Backend: Actualizar `settings.py`
- [ ] Frontend: Variables de entorno listas
- [ ] Git: `git push origin main`
- [ ] Netlify: Conectado y desplegado
- [ ] Railway: Conectado y base de datos lista
- [ ] Variables: Configuradas en ambos
- [ ] CORS: Verificado sin errores
- [ ] API: Testeable desde navegador

## 🎉 ¡Listo! Tu app está en la nube

```bash
# Ver logs en tiempo real
netlify logs -f

# O en Railway Dashboard
# Verás los logs del backend en tiempo real
```

---

**📖 Para más detalles ver: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)**
