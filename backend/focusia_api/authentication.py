"""Autenticación por JWT: cabecera `Bearer` o cookie HttpOnly.

Dos protecciones que no existían:

1. **CSRF**: cuando el token llega en una cookie, se valida el token CSRF
   (patrón doble cookie: Django emite `csrftoken`, el front lo devuelve en
   `X-CSRFToken`). Con `Bearer` no se exige, porque un cliente que manda la
   cabecera no adjunta cookies y por tanto no es vulnerable a CSRF.
2. **Cierre de sesiones**: se rechaza cualquier token emitido antes de
   `user.sessions_invalidated_at` (cambio de contraseña o "cerrar todas las
   sesiones"). Sin esto, quemar los refresh dejaba vivo el access hasta 24 h.
"""

from django.conf import settings
from rest_framework.authentication import CSRFCheck
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied
from rest_framework_simplejwt.authentication import JWTAuthentication


def _emitido_antes_del_cierre(user, validated_token) -> bool:
    """True si el token es anterior a la marca de cierre de sesiones."""
    marca = getattr(user, 'sessions_invalidated_at', None)
    if not marca:
        return False
    try:
        iat = int(validated_token.get('iat'))
    except (TypeError, ValueError):
        # Sin `iat` no hay nada que comparar: no se bloquea.
        return False
    return iat < int(marca.timestamp())


class CookieJWTAuthentication(JWTAuthentication):
    def _validar_csrf(self, request):
        def dummy_get_response(_request):
            return None

        check = CSRFCheck(dummy_get_response)
        # Deja request.META['CSRF_COOKIE'] listo para process_view.
        check.process_request(request)
        reason = check.process_view(request, None, (), {})
        if reason:
            raise PermissionDenied(f'CSRF inválido: {reason}')

    def authenticate(self, request):
        header = self.get_header(request)
        if header is not None:
            resultado = super().authenticate(request)
            if resultado and _emitido_antes_del_cierre(resultado[0], resultado[1]):
                raise AuthenticationFailed('Sesión cerrada. Inicia sesión de nuevo.')
            return resultado

        raw_token = request.COOKIES.get(
            settings.SIMPLE_JWT.get('AUTH_COOKIE', 'access_token'))
        if raw_token is None:
            return None
        try:
            validated_token = self.get_validated_token(raw_token)
            user = self.get_user(validated_token)
        except Exception:
            # Cookie inválida, expirada o de un usuario que ya no existe:
            # tratar como anónimo. Los endpoints protegidos responden 401.
            return None

        if _emitido_antes_del_cierre(user, validated_token):
            raise AuthenticationFailed('Sesión cerrada. Inicia sesión de nuevo.')

        # process_view no hace nada en GET/HEAD/OPTIONS/TRACE.
        self._validar_csrf(request)
        return user, validated_token
