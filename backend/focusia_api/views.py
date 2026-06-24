import logging
from datetime import timedelta
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import DatabaseError
from django.utils import timezone
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from dashboard.models import LoginAttempt

security_logger = logging.getLogger('focusia.security')
User = get_user_model()

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION = timedelta(minutes=15)


class LoginRateThrottle(AnonRateThrottle):
    rate = '5/minute'


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username = attrs.get('username')
        if username:
            user = User.objects.filter(email=username).first()
            if user:
                attrs['username'] = user.username
        return super().validate(attrs)


class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer
    throttle_classes = [LoginRateThrottle]

    def _get_client_ip(self, request):
        xff = request.META.get('HTTP_X_FORWARDED_FOR')
        if xff:
            return xff.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')

    def _record_attempt(self, username, request, success, user=None):
        try:
            LoginAttempt.objects.create(
                user=user,
                username=username,
                ip_address=self._get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
                success=success,
            )
        except Exception:
            pass
        if success and user:
            user.failed_login_attempts = 0
            user.locked_until = None
            user.save(update_fields=['failed_login_attempts', 'locked_until'])
            security_logger.info(f'[LOGIN_OK] user={user.id} ip={self._get_client_ip(request)}')

    def post(self, request, *args, **kwargs):
        username = request.data.get('username', '')
        try:
            response = super().post(request, *args, **kwargs)
            if response.status_code == 200:
                user = User.objects.filter(username=username).first()
                self._record_attempt(username, request, True, user)
                access = response.data.get('access')
                refresh = response.data.get('refresh')
                secure = not settings.DEBUG
                resp = Response({'status': 'ok'}, status=status.HTTP_200_OK)
                resp.set_cookie(
                    'access_token', access,
                    httponly=True, secure=True, samesite='None',
                    max_age=86400,
                )
                resp.set_cookie(
                    'refresh_token', refresh,
                    httponly=True, secure=True, samesite='None',
                    max_age=604800,
                )
                return resp
            self._record_attempt(username, request, False)
            security_logger.info(f'[LOGIN_FAIL] username={username} ip={self._get_client_ip(request)}')
            return Response({'error': 'Credenciales inválidas.'}, status=status.HTTP_401_UNAUTHORIZED)
        except DatabaseError as e:
            security_logger.exception('[LOGIN_DB_ERROR]')
            return Response(
                {'error': 'Error de conexión. Intenta de nuevo.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )


class CookieTokenRefreshView(TokenRefreshView):
    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        refresh = request.COOKIES.get('refresh_token') or request.data.get('refresh')
        if not refresh:
            return Response({'error': 'Refresh token no proporcionado'}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            serializer = self.get_serializer(data={'refresh': refresh})
            serializer.is_valid(raise_exception=True)
            response = Response({'status': 'ok'}, status=status.HTTP_200_OK)
            secure = not settings.DEBUG
            response.set_cookie(
                'access_token', serializer.validated_data.get('access'),
                httponly=True, secure=True, samesite='None',
                max_age=86400,
            )
            response.set_cookie(
                'refresh_token', serializer.validated_data.get('refresh'),
                httponly=True, secure=True, samesite='None',
                max_age=604800,
            )
            if hasattr(request, 'user') and request.user.is_authenticated:
                request.user.last_activity = timezone.now()
                request.user.save(update_fields=['last_activity'])
            return response
        except Exception as e:
            security_logger.info(f'[REFRESH_FAIL] ip={request.META.get("REMOTE_ADDR", "")}')
            return Response({'error': 'Sesión inválida o expirada.'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@permission_classes([AllowAny])
def logout_view(request):
    response = Response({'status': 'ok'})
    response.delete_cookie('access_token')
    response.delete_cookie('refresh_token')
    if hasattr(request, 'user') and request.user.is_authenticated:
        security_logger.info(f'[LOGOUT] user={request.user.id}')
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def session_status(request):
    user = request.user
    now = timezone.now()
    is_locked = user.locked_until and user.locked_until > now
    return Response({
        'user_id': user.id,
        'username': user.username,
        'last_activity': user.last_activity.isoformat() if user.last_activity else None,
        'is_locked': is_locked,
        'locked_until': user.locked_until.isoformat() if user.locked_until else None,
    })
