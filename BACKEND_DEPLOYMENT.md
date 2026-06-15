# Preparación del Backend Django para Despliegue

## 📂 Estructura Requerida

```
backend/
├── manage.py
├── requirements.txt          ✅ Debe existir
├── runtime.txt               ✅ Debe existir (para Railway/Heroku)
├── Procfile                  ✅ Debe existir (para Railway/Heroku)
├── focusia_api/
│   ├── settings.py
│   ├── wsgi.py
│   ├── urls.py
│   └── ...
├── dashboard/
│   ├── models.py
│   ├── views.py
│   ├── urls.py
│   └── ...
└── ...
```

## 🔧 Paso 1: Crear `requirements.txt`

```bash
cd backend

# Opción A: Si ya tienes un venv activo
pip freeze > requirements.txt

# Opción B: Manual (asegúrate de incluir todas las dependencias)
# Contenido básico:
```

**backend/requirements.txt**
```
Django==4.2.0
djangorestframework==3.14.0
django-cors-headers==4.0.0
psycopg2-binary==2.9.6
python-dotenv==1.0.0
gunicorn==21.2.0
google-generativeai==0.3.0
Pillow==10.0.0
```

## 📝 Paso 2: Crear `runtime.txt`

**backend/runtime.txt**
```
python-3.11.7
```

Verifica tu versión de Python:
```bash
python --version
```

## ⚙️ Paso 3: Crear `Procfile`

**backend/Procfile**
```
web: gunicorn focusia_api.wsgi --log-file - --access-logfile - --error-logfile -
release: python manage.py migrate
```

## 🔐 Paso 4: Actualizar `settings.py`

### Seguridad en Producción

**backend/focusia_api/settings.py**

```python
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# SECURITY SETTINGS
DEBUG = os.getenv('DEBUG', 'False') == 'True'
SECRET_KEY = os.getenv('SECRET_KEY', 'insecure-key')
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# HTTPS en producción
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True

# CORS
CORS_ALLOWED_ORIGINS = os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:3000').split(',')

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'focusia_db'),
        'USER': os.getenv('DB_USER', 'postgres'),
        'PASSWORD': os.getenv('DB_PASSWORD', ''),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}

# Static Files
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.ManifestStaticFilesStorage'

# Media Files
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
}

# INSTALLED_APPS
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'dashboard',
]

# MIDDLEWARE
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
```

## 🌐 Paso 5: Crear `wsgi.py`

Si no existe, créalo en `backend/focusia_api/wsgi.py`:

```python
"""
WSGI config for focusia_api project.
"""

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'focusia_api.settings')

application = get_wsgi_application()
```

## 📊 Paso 6: Migraciones de Base de Datos

```bash
cd backend

# Crear migraciones (si no existen)
python manage.py makemigrations

# Aplicar migraciones (se ejecutará automáticamente en despliegue)
python manage.py migrate

# Crear superuser (hacer manualmente después del despliegue)
# python manage.py createsuperuser
```

## 🧪 Paso 7: Pruebas Locales Antes del Despliegue

```bash
# Instalar gunicorn localmente
pip install gunicorn

# Ejecutar como lo haría en producción
gunicorn focusia_api.wsgi --bind 0.0.0.0:8000

# Debería estar disponible en http://localhost:8000
```

## 📤 Paso 8: Push a GitHub

```bash
git add backend/
git add -u  # Actualizar archivos existentes
git commit -m "chore: preparar backend para despliegue en Railway"
git push origin main
```

## 🚀 Paso 9: Despliegue en Railway

### 9.1 Conectar Railway
1. Ve a https://railway.app
2. Haz clic en "New Project"
3. Selecciona "Deploy from GitHub"
4. Conecta tu repositorio

### 9.2 Configurar Variables de Entorno en Railway

```
SECRET_KEY=genera-con: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
DEBUG=False
ALLOWED_HOSTS=tudominio-api.railway.app,localhost
DJANGO_SETTINGS_MODULE=focusia_api.settings

# Database (Railway crea esto automáticamente)
DATABASE_URL=postgresql://...

# O configurar manualmente:
DB_ENGINE=django.db.backends.postgresql
DB_NAME=focusia_db
DB_USER=postgres
DB_PASSWORD=contraseña_segura
DB_HOST=db
DB_PORT=5432

# CORS
CORS_ALLOWED_ORIGINS=https://tudominio.netlify.app,http://localhost:3000
```

### 9.3 Variables de Entorno en `.env.production`

Crear `backend/.env.production` (NO subir a git):
```
SECRET_KEY=tu-clave-segura
DEBUG=False
ALLOWED_HOSTS=tudominio-api.railway.app
DB_NAME=focusia_db
DB_USER=postgres
DB_PASSWORD=contraseña_db
DB_HOST=database-host
DB_PORT=5432
```

## ✅ Checklist Final

- [ ] `requirements.txt` contiene todas las dependencias
- [ ] `runtime.txt` especifica la versión correcta de Python
- [ ] `Procfile` configurado correctamente
- [ ] `settings.py` usa variables de entorno
- [ ] `SECRET_KEY` es seguro y único
- [ ] CORS configurado
- [ ] Migraciones aplicadas
- [ ] Test en local con gunicorn
- [ ] Código push a GitHub
- [ ] Despliegue en Railway completado
- [ ] Variables de entorno configuradas en Railway
- [ ] Base de datos funcionando
- [ ] API accesible desde `https://tudominio-api.railway.app`

## 🔗 Conexión con Frontend

Una vez el backend esté desplegado, en Netlify configura:
```
VITE_API_URL=https://tudominio-api.railway.app
```

## 📚 Recursos

- [Django Deployment Checklist](https://docs.djangoproject.com/en/stable/howto/deployment/checklist/)
- [Gunicorn Docs](https://gunicorn.org/)
- [Railway Docs](https://docs.railway.app)
- [PostgreSQL en Railway](https://docs.railway.app/plugins/postgresql)

---

**¡Tu backend Django está listo para producción! 🚀**
