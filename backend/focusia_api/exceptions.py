import logging

from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.views import exception_handler

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


def _field_errors(data):
    if isinstance(data, dict):
        return data
    if isinstance(data, list):
        return {'non_field_errors': data}
    return {}


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        exc_name = type(exc).__name__
        user = getattr(context.get('request'), 'user', None)
        user_id = user.id if user and user.is_authenticated else 'anon'
        logger.info(
            f'[API_ERROR] user={user_id} path={context["request"].path} '
            f'code={response.status_code} type={exc_name}'
        )

        # Contrato único: {code, message, fields}. Se conserva `detail` por
        # compatibilidad con clientes existentes.
        if isinstance(exc, ValidationError):
            fields = _field_errors(response.data)
            payload = {
                'code': 'validation_error',
                'message': SAFE_MESSAGES['ValidationError'],
                'fields': fields,
                'detail': SAFE_MESSAGES['ValidationError'],
            }
            response.data = payload
            return response

        code = getattr(getattr(exc, 'default_code', None), '__str__', lambda: None)()
        if not code or code == 'error':
            code = exc_name.lower()
        message = SAFE_MESSAGES.get(exc_name)
        if not message:
            detail = response.data.get('detail') if isinstance(response.data, dict) else None
            message = str(detail) if detail else 'Error interno del servidor.'

        payload = {'code': code, 'message': message, 'fields': {}, 'detail': message}
        # Preserva metadatos útiles (p.ej. Retry-After en throttling) sin romper el contrato.
        if isinstance(response.data, dict):
            for key, value in response.data.items():
                if key not in payload and key != 'messages':
                    payload[key] = value
        response.data = payload

    return response
