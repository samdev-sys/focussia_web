from django.contrib import admin
from django.conf import settings
from django.urls import path, include, re_path
from django.views.static import serve as serve_media
from focusia_api.views import EmailTokenObtainPairView, CookieTokenRefreshView, logout_view, session_status, health, password_reset_request, password_reset_confirm
from dashboard.social_auth import google_login, microsoft_login

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health, name='health'),
    path('api/token/', EmailTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', CookieTokenRefreshView.as_view(), name='token_refresh'),
    path('api/token/logout/', logout_view, name='token_logout'),
    path('api/session/status/', session_status, name='session_status'),
    path('api/auth/google/', google_login, name='google_login'),
    path('api/auth/microsoft/', microsoft_login, name='microsoft_login'),
    path('api/password-reset/request/', password_reset_request, name='password_reset_request'),
    path('api/password-reset/confirm/', password_reset_confirm, name='password_reset_confirm'),
    path('api/', include('dashboard.urls')),
]

# En desarrollo Django no sirve MEDIA automáticamente. En producción lo sirve el
# CDN/nginx, así que la ruta solo se registra con DEBUG=True.
if settings.DEBUG:
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', serve_media, {'document_root': settings.MEDIA_ROOT}),
    ]
