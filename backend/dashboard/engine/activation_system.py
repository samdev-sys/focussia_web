import logging
from datetime import timedelta
from django.utils import timezone
from ..models import (
    Activacion, ConfiguracionUsuario, PropuestaIA,
    MetaAnual, KanbanTask, TimeBlock,
)

logger = logging.getLogger('focusia.security')


def crear_activacion_tradicional(user, titulo, mensaje, tarea_id=None):
    """Recordatorio Tradicional: avisos simples y alarmas estándar."""
    return Activacion.objects.create(
        user=user,
        tipo='tradicional',
        titulo=titulo,
        mensaje=mensaje,
        metadata={'tarea_id': tarea_id} if tarea_id else {},
    )


def crear_activacion_simulada(user, titulo, mensaje, tipo_simulacion='llamada'):
    """
    Activación Simulada: estímulos de alto impacto psicológico
    simulando llamadas entrantes o mensajes tipo WhatsApp.
    """
    url_simulacion = f'simulated://{tipo_simulacion}/{user.id}'
    return Activacion.objects.create(
        user=user,
        tipo='simulada',
        titulo=titulo,
        mensaje=mensaje,
        metadata={
            'tipo_simulacion': tipo_simulacion,
            'url_simulacion': url_simulacion,
            'avatar': 'Ashley' if tipo_simulacion == 'llamada' else 'Lia',
        },
    )


def crear_activacion_con_intencion(user, titulo, mensaje, tarea):
    """
    Activación con Intención: vincula la tarea inmediata con un propósito mayor,
    conectando directamente con la Gran Meta Anual.
    """
    meta_anual = MetaAnual.objects.filter(user=user, aprobada=True).first()
    mensaje_intencion = ''

    if meta_anual:
        mensaje_intencion = (
            f'No es solo "{tarea}". '
            f'Esto impacta directamente tu meta anual: {meta_anual.titulo}. '
            f'Cada tarea completada es un paso más hacia tu gran objetivo.'
        )

    return Activacion.objects.create(
        user=user,
        tipo='con_intencion',
        titulo=titulo,
        mensaje=mensaje,
        mensaje_intencion=mensaje_intencion,
        metadata={
            'tarea': tarea,
            'meta_anual_id': meta_anual.id if meta_anual else None,
        },
    )


def crear_activacion_adaptativa(user, propuesta_ia):
    """
    Activación Adaptativa: estímulo calibrado por IA que ajusta
    intensidad y horarios basándose en el historial de éxito/abandono.
    """
    config = ConfiguracionUsuario.objects.filter(user=user).first()
    nivel_exigencia = config.nivel_exigencia if config else 'medio'

    intensidad_map = {
        'bajo': 1,
        'medio': 3,
        'alto': 5,
    }
    intensidad = intensidad_map.get(nivel_exigencia, 3)

    rechazos_recientes = Activacion.objects.filter(
        user=user,
        estado='ignorada',
        creada__gte=timezone.now() - timedelta(days=7),
    ).count()

    if rechazos_recientes >= 3:
        intensidad = max(1, intensidad - 1)

    now = timezone.now()
    ventana_optima = now + timedelta(hours=1)

    titulo = '🎯 Ajuste Inteligente'
    if nivel_exigencia == 'alto':
        titulo = '⚡ Atención - Ajuste Prioritario'

    return Activacion.objects.create(
        user=user,
        tipo='adaptativa',
        titulo=titulo,
        mensaje=f'{propuesta_ia.propuesta_ajuste} (Intensidad: {intensidad}/5)',
        mensaje_intencion=propuesta_ia.explicacion_impacto,
        ventana_programada=ventana_optima,
        metadata={
            'propuesta_id': propuesta_ia.id,
            'intensidad': intensidad,
            'nivel_exigencia': nivel_exigencia,
            'rechazos_recientes': rechazos_recientes,
        },
    )
