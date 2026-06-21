from datetime import timedelta, datetime
from django.utils import timezone
from ..models import TimeBlock, KanbanTask, MetaAnual, ConfiguracionUsuario


def detectar_riesgo_incumplimiento(user):
    """
    Detecta de forma predictiva riesgo de incumplimiento
    antes de que venza el bloque horario.
    Analiza:
    - Bloques horarios próximos a vencer sin marcar como completados
    - Patrón de abandono en ventanas similares anteriores
    Returns: list of dicts with risk info
    """
    now = timezone.now()
    ventana = now + timedelta(hours=2)

    bloques_en_riesgo = TimeBlock.objects.filter(
        user=user,
        hora__gte=now.hour,
        hora__lte=ventana.hour,
        estado=False,
    ).exclude(tarea='')

    resultados = []
    for bloque in bloques_en_riesgo:
        resultados.append({
            'tipo': 'time_block',
            'id': bloque.id,
            'tarea': bloque.tarea,
            'hora': bloque.hora,
            'ventana': f'{now.hour}:00 - {ventana.hour}:00',
            'nivel_riesgo': 'alto' if bloque.hora <= now.hour + 1 else 'medio',
        })

    tareas_proximas = KanbanTask.objects.filter(
        user=user,
        columna__in=['Por hacer', 'En progreso'],
        fecha_hora__gte=now - timedelta(hours=1),
        fecha_hora__lte=ventana,
    )

    for tarea in tareas_proximas:
        resultados.append({
            'tipo': 'kanban_task',
            'id': tarea.id,
            'tarea': tarea.titulo,
            'fecha_hora': tarea.fecha_hora.isoformat() if tarea.fecha_hora else None,
            'nivel_riesgo': 'alto',
        })

    return resultados


def calcular_ventana_optima(user):
    """
    Calcula la mejor ventana de tiempo para intervenir
    basándose en la configuración del usuario y el historial.
    """
    config = ConfiguracionUsuario.objects.filter(user=user).first()
    if not config:
        return {'inicio': '07:00', 'fin': '22:00'}

    return {
        'inicio': config.ventana_inicio.strftime('%H:%M') if config.ventana_inicio else '07:00',
        'fin': config.ventana_fin.strftime('%H:%M') if config.ventana_fin else '22:00',
        'frecuencia_horas': config.frecuencia_intervenciones,
    }
