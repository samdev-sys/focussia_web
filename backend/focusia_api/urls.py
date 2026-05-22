from django.contrib import admin
from django.urls import path, include
from focusia_api.views import EmailTokenObtainPairView, CookieTokenRefreshView, logout_view

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', EmailTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', CookieTokenRefreshView.as_view(), name='token_refresh'),
    path('api/token/logout/', logout_view, name='token_logout'),
    path('api/', include('dashboard.urls')),
]
