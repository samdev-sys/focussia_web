import logging
from datetime import timedelta
from django.utils import timezone
from ..models import ConfiguracionUsuario, Activacion

logger = logging.getLogger('focusia.security')


def evaluar_reglas(user, contexto):
    """
    Sistema de Reglas: Mapea las preferencias del usuario
    (exigencia, estilo, canales) con el tipo de acción a ejecutar.
    Returns: dict with tipo_activacion, canal, y mensaje_estilo
    """
    config = ConfiguracionUsuario.objects.filter(user=user).first()
    if not config:
        return {
            'puede_intervenir': True,
            'tipo_activacion': 'tradicional',
            'canal': 'notificacion',
            'estilo': 'suave',
        }

    canales = config.canales_interaccion
    if not canales:
        canales = ['notificacion']

    tipo_activacion = 'tradicional'
    canal = 'notificacion'

    if 'simulacion_llamada' in canales and contexto.get('urgencia') == 'alta':
        tipo_activacion = 'simulada'
        canal = 'simulacion_llamada'
    elif 'buzon_ia' in canales:
        tipo_activacion = 'con_intencion'
        canal = 'buzon_ia'

    ultima_activacion = Activacion.objects.filter(
        user=user,
        creada__gte=timezone.now() - timedelta(hours=config.frecuencia_intervenciones),
    ).first()

    if ultima_activacion:
        return {
            'puede_intervenir': False,
            'tipo_activacion': tipo_activacion,
            'canal': canal,
            'estilo': config.estilo_comunicacion,
            'razon': f'Esperar {config.frecuencia_intervenciones}h entre intervenciones',
        }

    now = timezone.now()
    hora_actual = now.time()
    if config.ventana_inicio and hora_actual < config.ventana_inicio:
        return {
            'puede_intervenir': False,
            'tipo_activacion': tipo_activacion,
            'canal': canal,
            'estilo': config.estilo_comunicacion,
            'razon': f'Fuera de ventana ({config.ventana_inicio}-{config.ventana_fin})',
        }
    if config.ventana_fin and hora_actual > config.ventana_fin:
        return {
            'puede_intervenir': False,
            'tipo_activacion': tipo_activacion,
            'canal': canal,
            'estilo': config.estilo_comunicacion,
            'razon': f'Fuera de ventana ({config.ventana_inicio}-{config.ventana_fin})',
        }

    return {
        'puede_intervenir': True,
        'tipo_activacion': tipo_activacion,
        'canal': canal,
        'estilo': config.estilo_comunicacion,
        'nivel_exigencia': config.nivel_exigencia,
    }
