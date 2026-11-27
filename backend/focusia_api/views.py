import logging
import os
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.middleware.csrf import get_token
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
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


class PasswordResetRequestThrottle(AnonRateThrottle):
    scope = 'password_reset_request'


class PasswordResetConfirmThrottle(AnonRateThrottle):
    scope = 'password_reset_confirm'

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
            # Verificación básica de intentos fallidos (bloqueo simple)
            from dashboard.models import LoginAttempt
            username = request.data.get('username') or request.data.get('email') or ''
            ip = request.META.get('REMOTE_ADDR')
            # Contar intentos fallidos en los últimos 15 minutos
            from django.utils import timezone
            from datetime import timedelta
            recent_failures = LoginAttempt.objects.filter(
                username=username,
                success=False,
                timestamp__gte=timezone.now() - timedelta(minutes=15)
            ).count()
            if recent_failures >= 5:
                LoginAttempt.objects.create(username=username, ip_address=ip, success=False)
                return Response({'error': 'Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)
            
            response = super().post(request, *args, **kwargs)
            if response.status_code == 200:
                LoginAttempt.objects.create(username=username, ip_address=ip, success=True)
                access = response.data.get('access')
                refresh = response.data.get('refresh')
                secure = not settings.DEBUG
                samesite = 'None' if not settings.DEBUG else 'Lax'
                access_max_age = int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds())
                refresh_max_age = int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds())
                response.set_cookie(
                    'access_token', access,
                    httponly=True, secure=secure, samesite=samesite,
                    max_age=access_max_age,
                )
                response.set_cookie(
                    'refresh_token', refresh,
                    httponly=True, secure=secure, samesite=samesite,
                    max_age=refresh_max_age,
                )
                # Al iniciar sesión no debe quedar ninguna sesión de Focus activa.
                try:
                    from dashboard.social_auth import cancelar_focus_activas
                    # TokenObtainPairView guarda el serializer validado en
                    # self.serializer; su atributo `user` es quien acaba de
                    # autenticarse (username ya normalizado por email).
                    user_login = getattr(getattr(self, 'serializer', None), 'user', None)
                    if user_login is None:
                        user_login = User.objects.filter(username__iexact=username).first() or User.objects.filter(email__iexact=username).first()
                    if user_login:
                        cancelar_focus_activas(user_login)
                except Exception:
                    logger.exception('No se pudo limpiar Focus activo tras login (username=%s)', username)
            else:
                LoginAttempt.objects.create(username=username, ip_address=ip, success=False)
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
        access_max_age = int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds())
        refresh_max_age = int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds())
        response.set_cookie(
            'access_token', serializer.validated_data.get('access'),
            httponly=True, secure=secure, samesite=samesite,
            max_age=access_max_age,
        )
        response.set_cookie(
            'refresh_token', serializer.validated_data.get('refresh'),
            httponly=True, secure=secure, samesite=samesite,
            max_age=refresh_max_age,
        )
        return response

@api_view(['POST'])
@permission_classes([AllowAny])
def logout_view(request):
    # Quemar el refresh antes de borrar la cookie: el JWT es stateless, así que
    # sin blacklist el token seguía siendo válido 7 días aunque el usuario
    # "cerrara sesión".
    refresh = request.COOKIES.get('refresh_token') or request.data.get('refresh')
    if refresh:
        try:
            RefreshToken(refresh).blacklist()
        except Exception:
            # Token ya expirado, inválido o repetido: el logout debe responder
            # igual, no fallar.
            pass
    response = Response({'status': 'ok'})
    response.delete_cookie('access_token')
    response.delete_cookie('refresh_token')
    return response


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetRequestThrottle])
def password_reset_request(request):
    email = request.data.get('email', '')
    # Respuesta genérica siempre: no revelar si el email existe.
    generic = Response({'message': 'Si existe una cuenta con ese email, recibirás instrucciones.'})
    if not email:
        return Response({'error': 'Email requerido'}, status=400)
    user = User.objects.filter(email=email).first()
    if not user:
        return Response(generic.data)
    # Token opaco de un solo uso, NO un JWT: caduca a los 60 min, se invalida
    # al usarlo y al cambiar la contraseña, y no sirve como credencial de API.
    # (Antes se enviaba un access token completo de 24 h, reutilizable.)
    uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
    reset_token = f'{uidb64}.{default_token_generator.make_token(user)}'
    base = os.environ.get('FRONTEND_RESET_URL', 'http://localhost:3000/reset-password')
    if not settings.DEBUG and base.startswith('http://localhost'):
        logger.warning('FRONTEND_RESET_URL usa el valor por defecto localhost; configura la URL pública en producción.')
    link = f'{base}?token={reset_token}'
    if settings.DEBUG:
        logger.info('Enlace de recuperación (solo DEBUG) user=%s: %s', user.id, link)
    try:
        from django.core.mail import send_mail
        send_mail(
            'Restablece tu contraseña de Focusia',
            f'Hola {user.username},\n\nSolicitaste restablecer tu contraseña. '
            f'Entra aquí (válido por 60 minutos):\n{link}\n\n'
            f'Si no fuiste tú, ignora este mensaje.',
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )
    except Exception:
        logger.exception('No se pudo enviar el correo de recuperación de contraseña a user=%s', user.id)
    return Response(generic.data)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetConfirmThrottle])
def password_reset_confirm(request):
    token = request.data.get('token', '')
    new_password = request.data.get('new_password', '')
    if not token or not new_password:
        return Response({'error': 'Token y nueva contraseña requeridos'}, status=400)

    # Formato del enlace: `<uidb64>.<token>`. Se usa un punto porque el token de
    # Django ya incluye un guion (`<timestamp>-<hash>`) y el uidb64 puede
    # contener `-` y `_`: el punto no aparece en ninguno de los dos.
    if '.' not in token:
        return Response({'error': 'Token inválido o expirado'}, status=400)
    uidb64, token_puro = token.split('.', 1)
    try:
        user_id = int(force_str(urlsafe_base64_decode(uidb64)))
    except (ValueError, TypeError, OverflowError):
        return Response({'error': 'Token inválido o expirado'}, status=400)

    user = User.objects.filter(pk=user_id).first()

    if len(new_password) < 8:
        return Response({'error': 'La contraseña debe tener al menos 8 caracteres'}, status=400)

    from django.contrib.auth.password_validation import validate_password
    from django.core.exceptions import ValidationError

    try:
        validate_password(new_password, user=user)
    except ValidationError as e:
        return Response({'error': ' '.join(e.messages)}, status=400)

    # check_token valida caducidad (PASSWORD_RESET_TIMEOUT) y que la contraseña
    # no haya cambiado desde que se emitió: es de un solo uso de facto.
    if user is None or not default_token_generator.check_token(user, token_puro):
        return Response({'error': 'Token inválido o expirado'}, status=400)

    user.set_password(new_password)
    user.save(update_fields=['password'])

    # Cerrar todas las sesiones: cambia la contraseña porque algo pudo
    # filtrarse, así que nada de lo emitido antes debe seguir sirviendo.
    from dashboard.services.sesiones import cerrar_sesiones

    cerradas = cerrar_sesiones(user)
    logger.info('Reset de contraseña user=%s; sesiones cerradas=%s', user.id, cerradas)

    return Response({'message': 'Contraseña actualizada correctamente'})


@api_view(['GET'])
@permission_classes([AllowAny])
def csrf_token(request):
    """Emite el token CSRF (patrón doble cookie).

    El front lo pide al arrancar: Django deja la cookie `csrftoken` (no
    HttpOnly, para que axios pueda leerla) y a partir de ahí la reenvía en
    `X-CSRFToken`. Un sitio externo no puede leer esa cookie, así que no puede
    fabricar la cabecera.
    """
    return Response({'csrfToken': get_token(request)})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def media_protegida(request, path):
    """Sirve un archivo de MEDIA_ROOT solo a usuarios autenticados.

    Antes se servían con `django.views.static.serve` y solo con DEBUG=True: en
    producción daban 404 y en desarrollo los veía cualquiera con la URL.

    La respuesta es siempre un `FileResponse` (funciona con Caddy, nginx o
    directo). Se añade además `X-Accel-Redirect` para que, si algún día ponen
    nginx delante, sea nginx quien entregue los bytes sin ocupar un worker de
    gunicorn: nginx intercepta esa cabecera y descarta el cuerpo.
    """
    import os
    from urllib.parse import quote

    from django.http import FileResponse, Http404
    from django.utils._os import safe_join

    try:
        ruta = safe_join(str(settings.MEDIA_ROOT), path)
    except Exception:
        # `safe_join` lanza ante intentos de salir de MEDIA_ROOT.
        raise Http404('Archivo no encontrado')

    if not os.path.isfile(ruta):
        raise Http404('Archivo no encontrado')

    respuesta = FileResponse(open(ruta, 'rb'))
    respuesta['X-Accel-Redirect'] = f'/_media/{quote(path)}'
    respuesta['Cache-Control'] = 'private, max-age=3600'
    return respuesta


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
