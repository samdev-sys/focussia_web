import logging
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import DatabaseError
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

logger = logging.getLogger(__name__)
User = get_user_model()

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

    def post(self, request, *args, **kwargs):
        try:
            response = super().post(request, *args, **kwargs)
            if response.status_code == 200:
                access = response.data.get('access')
                refresh = response.data.get('refresh')
                secure = not settings.DEBUG
                response.set_cookie(
                    'access_token', access,
                    httponly=True, secure=secure, samesite='Strict',
                    max_age=86400,
                )
                response.set_cookie(
                    'refresh_token', refresh,
                    httponly=True, secure=secure, samesite='Strict',
                    max_age=604800,
                )
            return response
        except DatabaseError as e:
            logger.exception('Error de base de datos en login')
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
        serializer = self.get_serializer(data={'refresh': refresh})
        serializer.is_valid(raise_exception=True)
        response = Response(serializer.validated_data, status=status.HTTP_200_OK)
        secure = not settings.DEBUG
        response.set_cookie(
            'access_token', serializer.validated_data.get('access'),
            httponly=True, secure=secure, samesite='Strict',
            max_age=86400,
        )
        response.set_cookie(
            'refresh_token', serializer.validated_data.get('refresh'),
            httponly=True, secure=secure, samesite='Strict',
            max_age=604800,
        )
        return response

@api_view(['POST'])
@permission_classes([AllowAny])
def logout_view(request):
    response = Response({'status': 'ok'})
    response.delete_cookie('access_token')
    response.delete_cookie('refresh_token')
    return response
