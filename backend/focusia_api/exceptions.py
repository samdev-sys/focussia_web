import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger('focusia.security')

SAFE_MESSAGES = {
    'AuthenticationFailed': 'Credenciales inválidas.',
    'NotAuthenticated': 'Autenticación requerida.',
    'PermissionDenied': 'No tienes permiso para esta acción.',
    'NotFound': 'Recurso no encontrado.',
    'MethodNotAllowed': 'Método no permitido.',
    'Throttled': 'Demasiadas solicitudes. Intenta más tarde.',
    'ValidationError': 'Datos inválidos.',
    'ParseError': 'Error al procesar la solicitud.',
    'UnsupportedMediaType': 'Tipo de medio no soportado.',
}


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    

    if response is not None:
        detail = response.data.get('detail', '')
        exc_name = type(exc).__name__
        safe_msg = SAFE_MESSAGES.get(exc_name, 'Error interno del servidor.')

        if isinstance(response.data, dict) and 'detail' in response.data:
            if exc_name in SAFE_MESSAGES:
                response.data['detail'] = safe_msg
            elif response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR:
                response.data['detail'] = 'Error interno del servidor.'

        user = getattr(context.get('request'), 'user', None)
        user_id = user.id if user and user.is_authenticated else 'anon'
        logger.info(
            f'[API_ERROR] user={user_id} path={context["request"].path} code={response.status_code} type={exc_name}'
        )

    return response
