from django.contrib import admin
from django.conf import settings
from django.urls import path, include, re_path
from focusia_api.views import EmailTokenObtainPairView, CookieTokenRefreshView, logout_view, session_status, health, password_reset_request, password_reset_confirm, csrf_token, media_protegida
from dashboard.social_auth import google_login, microsoft_login

try:
    from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
    _HAS_SPECTACULAR = True
except Exception:
    _HAS_SPECTACULAR = False

api_patterns = [
    path('health/', health, name='health'),
    path('csrf/', csrf_token, name='csrf_token'),
    path('token/', EmailTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', CookieTokenRefreshView.as_view(), name='token_refresh'),
    path('token/logout/', logout_view, name='token_logout'),
    path('session/status/', session_status, name='session_status'),
    path('auth/google/', google_login, name='google_login'),
    path('auth/microsoft/', microsoft_login, name='microsoft_login'),
    path('password-reset/request/', password_reset_request, name='password_reset_request'),
    path('password-reset/confirm/', password_reset_confirm, name='password_reset_confirm'),
    path('', include('dashboard.urls')),
]

if _HAS_SPECTACULAR:
    api_patterns = [
        path('schema/', SpectacularAPIView.as_view(), name='schema'),
        path('docs/', SpectacularSwaggerView.as_view(url_name='v1:schema'), name='docs'),
    ] + api_patterns

urlpatterns = [
    path('admin/', admin.site.urls),
    # Contrato estable v1 (móvil/web) + compatibilidad con /api/ legado.
    path('api/v1/', include((api_patterns, 'api'), namespace='v1')),
    path('api/', include((api_patterns, 'api'))),
    # Media privada: exige sesión. Django autoriza y, en producción, delega la
    # entrega en Caddy con X-Accel-Redirect (ruta interna `/_media/`). Antes se
    # servía solo con DEBUG=True y sin comprobar quién pedía el archivo.
    re_path(r'^media/(?P<path>.+)$', media_protegida, name='media'),
]
