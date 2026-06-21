import logging
from datetime import timedelta
from django.utils import timezone
from ..models import PropuestaIA

logger = logging.getLogger('focusia.security')


def registrar_decision(propuesta_id, decision):
    """
    FASE 5: Recepción y Registro de la Decisión del Usuario
    Actualiza la propuesta con la decisión y ejecuta el bucle de aprendizaje.
    """
    try:
        propuesta = PropuestaIA.objects.get(id=propuesta_id)
    except PropuestaIA.DoesNotExist:
        logger.error(f'PropuestaIA {propuesta_id} no encontrada.')
        return

    propuesta.respondida = True
    propuesta.decision_usuario = decision
    propuesta.save()

    logger.info(
        f'[DECISION] user={propuesta.user.id} propuesta={propuesta_id} '
        f'decision={decision} tipo={propuesta.tipo_impacto}'
    )

    ajustar_umbrales(propuesta.user, propuesta.tipo_impacto, decision)

    return propuesta


def ajustar_umbrales(user, tipo_impacto, decision):
    """
    Bucle de Aprendizaje (Segundo Plano):
    Si el usuario rechaza constantemente un tipo de ajuste específico,
    se incrementa el umbral de sensibilidad para ese tipo de alerta.
    """
    if decision not in ('mantener', 'ignorado'):
        return

    ventana = timezone.now() - timedelta(days=30)
    rechazos = PropuestaIA.objects.filter(
        user=user,
        tipo_impacto=tipo_impacto,
        decision_usuario__in=('mantener', 'ignorado'),
        creada__gte=ventana,
    ).count()

    total = PropuestaIA.objects.filter(
        user=user,
        tipo_impacto=tipo_impacto,
        creada__gte=ventana,
    ).count()

    if total >= 3 and rechazos / total >= 0.6:
        logger.info(
            f'[APRENDIZAJE] Umbral aumentado para user={user.id} '
            f'tipo={tipo_impacto} rechazos={rechazos}/{total}'
        )
        return {'umbral_aumentado': True, 'tipo': tipo_impacto, 'ratio': rechazos / total}

    return {'umbral_aumentado': False}
