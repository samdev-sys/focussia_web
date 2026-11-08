import os
from pathlib import Path
from datetime import timedelta
from django.core.exceptions import ImproperlyConfigured
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

# Whitenoise usa el mismo orden que SecurityMiddleware; se resuelve aquí (y no
# en la lista) para que el arranque falle rápido y claro si falta el paquete.
try:
    import whitenoise  # noqa: F401
    WHITENOISE_CONFIGURADO = True
except ImportError:
    WHITENOISE_CONFIGURADO = False

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

# Los .env son una comodidad de desarrollo local. En el contenedor no deben
# existir —`.dockerignore` los excluye— ni servir de respaldo: si faltaba una
# variable, el proceso caía al .env de desarrollo y arrancaba con la
# GROQ_API_KEY y la clave privada VAPID de la máquina del developer dentro de
# la imagen de producción. Los compose de staging/producción fijan
# DJANGO_SKIP_DOTENV=1 para no depender de que el archivo no exista.
if os.environ.get('DJANGO_SKIP_DOTENV') != '1':
    load_env(BASE_DIR / '.env')
    load_env(BASE_DIR.parent / '.env')

def _require_env(key):
    val = os.environ.get(key)
    if not val:
        raise ImproperlyConfigured(f'Variable de entorno {key} no definida.')
    return val

SECRET_KEY = _require_env('SECRET_KEY')
DEBUG = os.environ.get('DEBUG', 'False') == 'True'

# Un SECRET_KEY de ejemplo permite firmar JWT arbitrarios: con DEBUG=False el
# arranque debe fallar en vez de aceptarlo.
_SECRET_DE_EJEMPLO = ('CHANGE_THIS', 'CHANGE_ME', 'YOUR_SECRET_KEY', 'DJANGO-INSECURE')
if not DEBUG and SECRET_KEY.upper().startswith(_SECRET_DE_EJEMPLO):
    raise ImproperlyConfigured(
        'SECRET_KEY tiene un valor de ejemplo y DEBUG=False. Genera una clave '
        'real con: python -c "from django.core.management.utils import '
        'get_random_secret_key as g; print(g())"'
    )

# ALLOWED_HOSTS: con DEBUG=True se permite cualquiera (comodidad local). En
# producción es obligatoria: antes caía a ['*'] en silencio si faltaba, lo que
# hace que el servidor acepte cualquier cabecera Host.
_allowed_hosts = [
    h.strip() for h in os.environ.get('ALLOWED_HOSTS', '').split(',') if h.strip()
]
if _allowed_hosts:
    ALLOWED_HOSTS = _allowed_hosts
elif DEBUG:
    ALLOWED_HOSTS = ['*']
else:
    raise ImproperlyConfigured(
        'ALLOWED_HOSTS es obligatoria con DEBUG=False (lista separada por comas).'
    )

GROQ_API_KEY = os.environ.get('GROQ_API_KEY', '')
GROQ_AGENT_MODEL = os.environ.get('GROQ_AGENT_MODEL', 'openai/gpt-oss-120b')

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
    # Permite quemar refresh tokens (logout real y rotación al refrescar).
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    
    # Local apps
    'dashboard.apps.DashboardConfig',
]

# Whitenoise (opcional en dev, requerido en prod): entrega /static/ del
# panel admin sin nginx ni Caddy; gunicorn no sirve estáticos por sí solo.
# Debe ir inmediatamente después de SecurityMiddleware (orden recomendado).
_whitenoise = ['whitenoise.middleware.WhiteNoiseMiddleware'] if WHITENOISE_CONFIGURADO else []

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    *_whitenoise,
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
        default=f"postgres://{os.environ.get('DB_USER', 'postgres')}:{os.environ.get('DB_PASSWORD', '')}@{os.environ.get('DB_HOST', 'localhost')}:{os.environ.get('DB_PORT', '5432')}/{os.environ.get('DB_NAME', 'focusia_db')}",
        conn_max_age=int(os.environ.get('DB_CONN_MAX_AGE', '60')),
        conn_health_checks=True,
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

STATIC_URL = '/static/'
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
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
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
        'login': os.environ.get('THROTTLE_RATE_LOGIN', '20/minute' if DEBUG else '5/minute'),
        'register': os.environ.get('THROTTLE_RATE_REGISTER', '20/hour' if DEBUG else '5/hour'),
        'password_reset_request': os.environ.get(
            'THROTTLE_RATE_PASSWORD_RESET_REQUEST', '20/hour' if DEBUG else '5/hour'),
        'password_reset_confirm': os.environ.get(
            'THROTTLE_RATE_PASSWORD_RESET_CONFIRM', '30/hour' if DEBUG else '10/hour'),
    },
    'EXCEPTION_THROTTLE_CLASSES': [],
    'EXCEPTION_HANDLER': 'focusia_api.exceptions.custom_exception_handler',
    # Nº de proxies de confianza delante de Django (Caddy). Sin esto DRF usa
    # REMOTE_ADDR, que en producción es la IP del proxy: todos los clientes
    # comparten el mismo cubo de throttling (5 logins/min para todo el mundo).
    'NUM_PROXIES': int(os.environ.get('NUM_PROXIES', '0' if DEBUG else '1')),
}

SIMPLE_JWT = {
    # Móvil + web: access corto (15-30 min) y refresh largo con rotación.
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=int(os.environ.get('ACCESS_TOKEN_MINUTES', '20'))),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=int(os.environ.get('REFRESH_TOKEN_DAYS', '30'))),
    # Al refrescar se emite un refresh nuevo y se quema el anterior: si uno se
    # filtra, deja de servir en cuanto el usuario legítimo refresque.
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_COOKIE': 'access_token',
    'AUTH_COOKIE_REFRESH': 'refresh_token',
    'AUTH_COOKIE_SECURE': not DEBUG,
    'AUTH_COOKIE_HTTP_ONLY': True,
    'AUTH_COOKIE_SAMESITE': 'None' if not DEBUG else 'Lax',
}

SESSION_COOKIE_SAMESITE = 'None' if not DEBUG else 'Lax'

CSRF_COOKIE_SAMESITE = 'None' if not DEBUG else 'Lax'

# El enlace de restablecimiento vale 60 minutos (Django usa 3 días por defecto).
PASSWORD_RESET_TIMEOUT = int(os.environ.get('PASSWORD_RESET_TIMEOUT', '3600'))

# ── TLS y proxy (Caddy delante de gunicorn) ──
# Sin SECURE_PROXY_SSL_HEADER Django no ve que la petición llegó por HTTPS:
# `request.is_secure()` es False, el CSRF de /admin/ responde 403 y las URLs
# absolutas se generan en http://.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True

# Estas tres se declaraban en `.env.production` pero settings nunca las leía:
# eran configuración muerta. Ahora son efectivas y por defecto siguen a DEBUG.
SECURE_SSL_REDIRECT = os.environ.get(
    'SECURE_SSL_REDIRECT', str(not DEBUG)).lower() == 'true'
SESSION_COOKIE_SECURE = os.environ.get(
    'SESSION_COOKIE_SECURE', str(not DEBUG)).lower() == 'true'
CSRF_COOKIE_SECURE = os.environ.get(
    'CSRF_COOKIE_SECURE', str(not DEBUG)).lower() == 'true'

# El healthcheck del compose entra por http://localhost:8000 dentro del
# contenedor; sin esta excepción el 301 a https lo dejaría marcando "unhealthy".
SECURE_REDIRECT_EXEMPT = [r'^api/health/$']

# HSTS: el middleware propio también lo emite. Se declara aquí para que
# SecurityMiddleware lo aplique y `check --deploy` no lo reporte como ausente.
SECURE_HSTS_SECONDS = int(
    os.environ.get('SECURE_HSTS_SECONDS', '0' if DEBUG else '31536000'))
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_HSTS_PRELOAD = not DEBUG

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

# OpenAPI (Fase 2) — opcional si el paquete no está instalado.
try:
    import drf_spectacular  # noqa: F401
    INSTALLED_APPS.append('drf_spectacular')
except ImportError:
    # Sin drf-spectacular, DRF usa su schema por defecto si se solicita.
    REST_FRAMEWORK.pop('DEFAULT_SCHEMA_CLASS', None)

SPECTACULAR_SETTINGS = {
    'TITLE': 'Focusia API',
    'DESCRIPTION': 'Contrato API v1 para web y móvil.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# Celery
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0')

# Cache: Redis en producción/staging (consistente entre workers de gunicorn),
# LocMemCache en desarrollo (sin Redis). El estado conversacional del agente
# (cache.set/delete en agent_service) requiere un backend compartido.
_redis_url = os.environ.get('REDIS_URL') or os.environ.get('CELERY_BROKER_URL')
if _redis_url and _redis_url.startswith('redis://'):
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': _redis_url,
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'focusia-dev',
        }
    }
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
