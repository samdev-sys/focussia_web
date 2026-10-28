import logging
import os
from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import DatabaseError, connection
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
                samesite = 'None' if not settings.DEBUG else 'Lax'
                response.set_cookie(
                    'access_token', access,
                    httponly=True, secure=secure, samesite=samesite,
                    max_age=86400,
                )
                response.set_cookie(
                    'refresh_token', refresh,
                    httponly=True, secure=secure, samesite=samesite,
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
        try:
            serializer.is_valid(raise_exception=True)
        except Exception:
            return Response(
                {'error': 'Sesión expirada. Inicia sesión de nuevo.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        response = Response(serializer.validated_data, status=status.HTTP_200_OK)
        secure = not settings.DEBUG
        samesite = 'None' if not settings.DEBUG else 'Lax'
        response.set_cookie(
            'access_token', serializer.validated_data.get('access'),
            httponly=True, secure=secure, samesite=samesite,
            max_age=86400,
        )
        response.set_cookie(
            'refresh_token', serializer.validated_data.get('refresh'),
            httponly=True, secure=secure, samesite=samesite,
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


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request(request):
    email = request.data.get('email', '')
    # Respuesta genérica siempre: no revelar si el email existe.
    generic = Response({'message': 'Si existe una cuenta con ese email, recibirás instrucciones.'})
    if not email:
        return Response({'error': 'Email requerido'}, status=400)
    user = User.objects.filter(email=email).first()
    if not user:
        return Response(generic.data)
    token = RefreshToken.for_user(user)
    reset_token = str(token.access_token)
    base = os.environ.get('FRONTEND_RESET_URL', 'http://localhost:3000/reset-password')
    link = f'{base}?token={reset_token}'
    try:
        from django.core.mail import send_mail
        from django.conf import settings as dj_settings
        send_mail(
            'Restablece tu contraseña de Focusia',
            f'Hola {user.username},\n\nSolicitaste restablecer tu contraseña. '
            f'Entra aquí (válido por 24 horas):\n{link}\n\n'
            f'Si no fuiste tú, ignora este mensaje.',
            dj_settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )
    except Exception:
        pass
    return Response(generic.data)


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm(request):
    token = request.data.get('token', '')
    new_password = request.data.get('new_password', '')
    if not token or not new_password:
        return Response({'error': 'Token y nueva contraseña requeridos'}, status=400)
    if len(new_password) < 8:
        return Response({'error': 'La contraseña debe tener al menos 8 caracteres'}, status=400)
    try:
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError
        try:
            validate_password(new_password)
        except ValidationError as e:
            return Response({'error': ' '.join(e.messages)}, status=400)
        from rest_framework_simplejwt.tokens import AccessToken
        access = AccessToken(token)
        user_id = access.payload.get('user_id')
        if not user_id:
            return Response({'error': 'Token inválido'}, status=400)
        user = get_user_model().objects.get(id=user_id)
        user.set_password(new_password)
        user.save()
        return Response({'message': 'Contraseña actualizada correctamente'})
    except Exception:
        return Response({'error': 'Token inválido o expirado'}, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def session_status(request):
    user = request.user
    return Response({
        'user_id': user.id,
        'username': user.username,
        'is_locked': False,
        'locked_until': None,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def health(request):
    """Sonda de salud que consulta el healthcheck de Docker."""
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
    except DatabaseError:
        return Response(
            {'status': 'error', 'database': 'unreachable'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    return Response({'status': 'ok'})
