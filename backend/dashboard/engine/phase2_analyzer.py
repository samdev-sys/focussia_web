from django.utils import timezone
from datetime import timedelta
from ..models import KanbanTask


def analizar_desviacion(user):
    """
    FASE 2: Evaluación de Desviación
    Analiza tareas vencidas/acumuladas en las últimas 72h.
    Returns dict with:
      - encontrado (bool)
      - es_patron (bool | None)
      - tareas_vencidas (int)
      - detalles (str)
    """
    now = timezone.now()
    ventana = now - timedelta(hours=72)

    tareas_pendientes = KanbanTask.objects.filter(
        user=user,
        columna__in=['Backlog', 'Por hacer'],
        fecha_hora__lt=now,
    )

    tareas_vencidas_recientes = tareas_pendientes.filter(
        fecha_hora__gte=ventana,
    )

    total_vencidas = tareas_vencidas_recientes.count()

    if total_vencidas == 0:
        return {
            'encontrado': False,
            'es_patron': None,
            'tareas_vencidas': 0,
            'detalles': 'No se detectaron tareas vencidas.',
        }

    if total_vencidas <= 2:
        return {
            'encontrado': True,
            'es_patron': False,
            'tareas_vencidas': total_vencidas,
            'detalles': f'Evento aislado: {total_vencidas} tarea(s) sin marcar.',
        }

    return {
        'encontrado': True,
        'es_patron': True,
        'tareas_vencidas': total_vencidas,
        'detalles': f'Patrón detectado: {total_vencidas} tareas consecutivas sin completar.',
    }
