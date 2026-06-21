from django.utils import timezone
from datetime import timedelta
from ..models import TimeBlock, KanbanTask, MetaAnual


def clasificar_impacto(user):
    """
    FASE 3: Análisis de Contexto e Impacto
    Implementa los 3 casos del árbol IF/THEN en orden de prioridad:

    CASO A — ESTRATÉGICO_CRÍTICO (Urgencia CRÍTICA)
      SI (tareas_backlog_conectadas_a_meta_anual >= 3)

    CASO B — ESTRUCTURAL_SATURACIÓN (Urgencia ALTA)
      SI (horas_planificadas_semana > horas_disponibles_reales * 1.30
          Y tasa_cumplimiento_48h < 0.60)

    CASO C — PRIORIDAD_REORGANIZACIÓN (Urgencia MEDIA)
      SI (tareas_backlog >= 5)

    Returns dict with: tipo_impacto, urgencia, detalles, caso
    """
    ahora = timezone.now()
    hoy = ahora.date()

    # ─── Preparar datos comunes ─────────────────────────────────

    # CASO A: tareas incumplidas conectadas a meta anual
    metas_anuales = MetaAnual.objects.filter(user=user, aprobada=True)
    tareas_incumplidas_conectadas = 0
    for meta in metas_anuales:
        keywords = [meta.titulo.lower()]
        if meta.descripcion:
            keywords.extend(meta.descripcion.lower().split()[:5])
        conectadas = KanbanTask.objects.filter(
            user=user,
        ).exclude(columna__in=['Completado', 'Done', 'Hecho'])
        for t in conectadas:
            titulo_lower = t.titulo.lower()
            for kw in keywords:
                if len(kw) > 3 and kw in titulo_lower:
                    tareas_incumplidas_conectadas += 1
                    break

    # CASO B: horas planificadas semana actual
    inicio_semana = hoy - timedelta(days=hoy.weekday())
    time_blocks_semana = TimeBlock.objects.filter(user=user)
    horas_planificadas = time_blocks_semana.exclude(tarea='').count()

    horas_disponibles = max(1, (16 * 7) - horas_planificadas)
    tasa_sobrecarga = horas_planificadas / horas_disponibles if horas_disponibles > 0 else 0

    ventana_48h = ahora - timedelta(hours=48)
    time_blocks_48h = time_blocks_semana.filter(
        hora__gte=ventana_48h.hour if ventana_48h.date() == hoy else 0,
    )
    total_bloques_48h = time_blocks_48h.exclude(tarea='').count()
    completados_48h = time_blocks_48h.filter(estado=True).count()
    tasa_cumplimiento = completados_48h / total_bloques_48h if total_bloques_48h > 0 else 1.0

    # CASO C: tareas pendientes en backlog
    tareas_backlog = KanbanTask.objects.filter(
        user=user,
        columna__in=['Backlog', 'Por hacer'],
    )
    total_backlog = tareas_backlog.count()

    # ─── Evaluar CASOS en orden de prioridad ────────────────────

    # CASO A: ESTRATÉGICO_CRÍTICO (urgencia más alta)
    if tareas_incumplidas_conectadas >= 3:
        return {
            'tipo_impacto': 'estrategico_critico',
            'urgencia': 'CRÍTICA',
            'caso': 'A',
            'detalles': (
                f'{tareas_incumplidas_conectadas} tareas conectadas a tu Meta Anual '
                f'están pendientes — la prioridad estratégica del año pierde tracción.'
            ),
        }

    # CASO B: ESTRUCTURAL_SATURACIÓN
    if tasa_sobrecarga > 1.30 and tasa_cumplimiento < 0.60:
        return {
            'tipo_impacto': 'estructural',
            'urgencia': 'ALTA',
            'caso': 'B',
            'detalles': (
                f'{horas_planificadas}h planificadas vs {horas_disponibles:.0f}h disponibles '
                f'({tasa_sobrecarga:.0%}) con solo {tasa_cumplimiento:.0%} completado en 48h.'
            ),
        }

    # CASO C: PRIORIDAD_REORGANIZACIÓN
    if total_backlog >= 5:
        return {
            'tipo_impacto': 'de_prioridad',
            'urgencia': 'MEDIA',
            'caso': 'C',
            'detalles': (
                f'{total_backlog} tareas acumuladas en backlog sin completar — '
                f'el desorden operativo empieza a restar foco.'
            ),
        }

    # No se activó ningún caso
    return {
        'tipo_impacto': None,
        'urgencia': None,
        'caso': None,
        'detalles': 'Sin condiciones de alerta en esta evaluación.',
    }
