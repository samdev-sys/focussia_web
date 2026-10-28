import os
from pathlib import Path
from datetime import timedelta
from django.core.exceptions import ImproperlyConfigured
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

def load_env(env_path):
    if not env_path.exists():
        return
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, _, value = line.partition('=')
            value = value.strip()
            if (value.startswith('"') and value.endswith('"')) or (
                value.startswith("'") and value.endswith("'")
            ):
                value = value[1:-1]
            os.environ.setdefault(key.strip(), value)

load_env(BASE_DIR / '.env')
load_env(BASE_DIR.parent / '.env')

def _require_env(key):
    val = os.environ.get(key)
    if not val:
        raise ImproperlyConfigured(f'Variable de entorno {key} no definida.')
    return val

SECRET_KEY = _require_env('SECRET_KEY')
DEBUG = os.environ.get('DEBUG', 'False') == 'True'

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',') if os.environ.get('ALLOWED_HOSTS') else ['*']

GROQ_API_KEY = os.environ.get('GROQ_API_KEY', '')
GROQ_AGENT_MODEL = os.environ.get('GROQ_AGENT_MODEL', 'openai/gpt-oss-120b')
COQUI_TTS_URL = os.environ.get('COQUI_TTS_URL', 'http://localhost:8760')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    
    # Local apps
    'dashboard.apps.DashboardConfig',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'focusia_api.middleware.SecurityHeadersMiddleware',
]

ROOT_URLCONF = 'focusia_api.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'focusia_api.wsgi.application'

DATABASES = {
    'default': dj_database_url.config(
        default=f"postgres://{os.environ.get('DB_USER', 'postgres')}:{os.environ.get('DB_PASSWORD', '')}@{os.environ.get('DB_HOST', 'localhost')}:{os.environ.get('DB_PORT', '5432')}/{os.environ.get('DB_NAME', 'focusia_db')}"
    )
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
]

LANGUAGE_CODE = 'es-es'
TIME_ZONE = 'America/Bogota'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
# Destino de `collectstatic`; el Dockerfile lo ejecuta al construir la imagen.
STATIC_ROOT = Path(os.environ.get('STATIC_ROOT') or (BASE_DIR / 'staticfiles'))

# ── Email (vacío = consola en desarrollo) ──
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend' if os.environ.get('EMAIL_HOST') else 'django.core.mail.backends.console.EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST', '')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True') == 'True'
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'Focusia <no-reply@focusia.app>')

# ── Notificaciones: WhatsApp conmutable (log|twilio|meta) ──
WHATSAPP_PROVIDER = os.environ.get('WHATSAPP_PROVIDER', 'log')
META_WHATSAPP_TOKEN = os.environ.get('META_WHATSAPP_TOKEN', '')
META_WHATSAPP_PHONE_ID = os.environ.get('META_WHATSAPP_PHONE_ID', '')

# ── Web Push (VAPID) ──
VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY', '')
VAPID_PRIVATE_KEY_B64 = os.environ.get('VAPID_PRIVATE_KEY_B64', '')
VAPID_CLAIM_SUB = os.environ.get('VAPID_CLAIM_SUB', 'mailto:focusia@example.com')

# ── Archivos subidos por el administrador (panel /admin) ──
# El contenido (video de capacitaciones, imágenes de tribu/juegos/avatares) puede
# llegar pegando una URL externa o subiendo un archivo. Lo segundo usa MEDIA_ROOT.
MEDIA_URL = '/media/'
MEDIA_ROOT = Path(os.environ.get('MEDIA_ROOT') or (BASE_DIR / 'media'))

# Límite por archivo (200 MB por defecto) y de la petición completa.
ADMIN_UPLOAD_MAX_BYTES = int(os.environ.get('ADMIN_UPLOAD_MAX_BYTES', 200 * 1024 * 1024))
DATA_UPLOAD_MAX_MEMORY_SIZE = ADMIN_UPLOAD_MAX_BYTES
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
DATA_UPLOAD_MAX_NUMBER_FIELDS = 10_000

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

AUTH_USER_MODEL = 'dashboard.User'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'focusia_api.authentication.CookieJWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        # En desarrollo el dashboard dispara ráfagas paralelas (montaje +
        # StrictMode + HMR + polling), por eso el límite dev es amplio.
        # Producción conserva límites estrictos. Sobre-escribible por env.
        'anon': os.environ.get('THROTTLE_RATE_ANON', '120/minute' if DEBUG else '30/minute'),
        'user': os.environ.get('THROTTLE_RATE_USER', '2000/minute' if DEBUG else '300/minute'),
    },
    'EXCEPTION_THROTTLE_CLASSES': [],
    'EXCEPTION_HANDLER': 'focusia_api.exceptions.custom_exception_handler',
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_COOKIE': 'access_token',
    'AUTH_COOKIE_REFRESH': 'refresh_token',
    'AUTH_COOKIE_SECURE': not DEBUG,
    'AUTH_COOKIE_HTTP_ONLY': True,
    'AUTH_COOKIE_SAMESITE': 'None' if not DEBUG else 'Lax',
}

SESSION_COOKIE_SAMESITE = 'None' if not DEBUG else 'Lax'
SESSION_COOKIE_SECURE = not DEBUG

CSRF_COOKIE_SAMESITE = 'None' if not DEBUG else 'Lax'
CSRF_COOKIE_SECURE = not DEBUG

# CORS
CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ALLOWED_ORIGINS', 'http://localhost:5173,http://localhost:3000,http://localhost:3001,http://localhost:3002').split(',')
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS

# Logging de seguridad
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'security_file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'security.log',
            'formatter': 'verbose',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'focusia.security': {
            'handlers': ['security_file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Django Q2 (tareas programadas) — opcional
try:
    import django_q
    INSTALLED_APPS.append('django_q')
    Q_CLUSTER = {
        'name': 'focusia',
        'orm': 'default',
        'workers': 2,
        'timeout': 60,
        'retry': 120,
        'queue_limit': 50,
        'bulk': 10,
        'catch_up': False,
        'sync': False,
    }
except ImportError:
    pass

# Celery
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = os.environ.get('CELERY_TIMEZONE', 'America/Argentina/Buenos_Aires')

# Toda la programación periódica vive en django-q2 (ver
# `dashboard/management/commands/setup_reminder_schedule.py`), que el servicio
# `schedule` del compose registra al arrancar: así corre en el stack de Docker,
# que no trae el binario `celery`, y todo queda en un solo planificador.
# Lo que antes estaba aquí (reportes y avisos) se programa allí para no enviar
# los avisos dos veces. Las funciones siguen en `tasks.py` y pueden llamarse a
# mano con `python manage.py generate_reports` / `<comando>`.
CELERY_BEAT_SCHEDULE = {}

# Soporte para login con email
AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
]
