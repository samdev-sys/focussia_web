import json
import logging
from datetime import timedelta
from django.utils import timezone
from django.db.models import Count, Q
from ..models import GranMetaAnual, KanbanTask, TimeBlock, AISuggestion, AdaptiveThreshold, User
from ..views import call_groq

logger = logging.getLogger('focusia.security')


def run_assessment(user: User) -> AISuggestion | None:
    """Entry point: runs all 5 phases. Returns the suggestion if one was generated."""
    result = phase1_viability_filter(user)
    if result is None:
        return None

    deviation = phase2_deviation_evaluation(user)
    if deviation is None:
        return None

    impact = phase3_context_analysis(user, deviation)
    suggestion = phase4_generate_intervention(user, deviation, impact)
    if suggestion:
        phase5_register_decision(suggestion)
    return suggestion


def phase1_viability_filter(user: User) -> bool | None:
    """FASE 1: Filtro de Viabilidad de Entrada"""
    has_meta = GranMetaAnual.objects.filter(user=user, is_vigente=True).exists()
    if not has_meta:
        logger.info(f'[ADAPTIVE] user={user.id} phase=1 result=no_meta')
        return None

    has_pending = AISuggestion.objects.filter(user=user, decision__isnull=True).exists()
    if has_pending:
        logger.info(f'[ADAPTIVE] user={user.id} phase=1 result=pending_exists')
        return None

    logger.info(f'[ADAPTIVE] user={user.id} phase=1 result=pass')
    return True


def phase2_deviation_evaluation(user: User) -> dict | None:
    """FASE 2: Evaluación de Desviación — analyze last 72h"""
    cutoff = timezone.now() - timedelta(hours=72)
    days_cutoff = timezone.now() - timedelta(hours=72)

    overdue_tasks = KanbanTask.objects.filter(
        user=user,
        columna__in=['Backlog', 'EnProgreso'],
        fecha_hora__lte=timezone.now(),
        fecha_hora__gte=cutoff,
    ).count()

    total_tasks_recent = KanbanTask.objects.filter(
        user=user,
        fecha_hora__gte=cutoff,
    ).count()

    if overdue_tasks == 0:
        logger.info(f'[ADAPTIVE] user={user.id} phase=2 result=no_overdue')
        return None

    is_isolated = overdue_tasks <= 2 and total_tasks_recent > 5
    is_pattern = overdue_tasks >= 3

    if not is_pattern:
        logger.info(f'[ADAPTIVE] user={user.id} phase=2 result=isolated count={overdue_tasks}')
        return None

    logger.info(f'[ADAPTIVE] user={user.id} phase=2 result=pattern count={overdue_tasks}')
    return {
        'overdue_count': overdue_tasks,
        'total_tasks': total_tasks_recent,
        'is_pattern': True,
    }


def phase3_context_analysis(user: User, deviation: dict) -> dict:
    """FASE 3: Análisis de Contexto e Impacto"""
    now = timezone.now()
    today_hours = list(range(6, 23))
    planned_blocks = TimeBlock.objects.filter(
        user=user,
        hora__in=today_hours,
    ).exclude(tarea='').count()

    available_hours = len(today_hours)
    has_saturation = planned_blocks > available_hours

    meta_anual = GranMetaAnual.objects.filter(user=user, is_vigente=True).first()
    meta_text = meta_anual.texto_meta.lower() if meta_anual else ''
    meta_words = set(meta_text.split())

    backlog_tasks = KanbanTask.objects.filter(
        user=user,
        columna__in=['Backlog', 'EnProgreso'],
    ).values_list('titulo', flat=True)

    strategic_aligned = False
    for task in backlog_tasks:
        task_words = set(task.lower().split())
        if task_words & meta_words:
            strategic_aligned = True
            break

    threshold, _ = AdaptiveThreshold.objects.get_or_create(user=user)

    if has_saturation:
        tipo = 'estructural'
        if threshold.estructural_rejections >= 3:
            logger.info(f'[ADAPTIVE] user={user.id} phase=3 result=estructural_suppressed')
            return {'tipo': tipo, 'suppressed': True}
    elif strategic_aligned:
        tipo = 'estrategico'
        if threshold.estrategico_rejections >= 3:
            logger.info(f'[ADAPTIVE] user={user.id} phase=3 result=estrategico_suppressed')
            return {'tipo': tipo, 'suppressed': True}
    else:
        tipo = 'prioridad'
        if threshold.prioridad_rejections >= 3:
            logger.info(f'[ADAPTIVE] user={user.id} phase=3 result=prioridad_suppressed')
            return {'tipo': tipo, 'suppressed': True}

    logger.info(f'[ADAPTIVE] user={user.id} phase=3 result={tipo}')
    return {
        'tipo': tipo,
        'has_saturation': has_saturation,
        'strategic_aligned': strategic_aligned,
        'planned_blocks': planned_blocks,
        'suppressed': False,
    }


def phase4_generate_intervention(user: User, deviation: dict, impact: dict) -> AISuggestion | None:
    """FASE 4: Generación e Inyección de la Intervención"""
    if impact.get('suppressed'):
        return None

    tipo = impact['tipo']
    prompt = _build_prompt(user, deviation, impact)

    meta_anual = GranMetaAnual.objects.filter(user=user, is_vigente=True).first()
    meta_context = ''
    if meta_anual:
        meta_context = f'"{meta_anual.frase_resumen}"'
        if meta_anual.desglose_smart:
            smart = meta_anual.desglose_smart
            meta_context += f' — Objetivo: {smart.get("S", "")}'

    system_prompt = (
        'Eres un Coach Estratégico Directivo. Tu rol es ayudar al usuario a reconocer '
        'desviaciones en su planificación y proponer ajustes constructivos. '
        'Prohibido usar palabras punitivas como "fallaste", "no cumpliste", "fracaso". '
        'Enfócate en las consecuencias de las decisiones de planificación del propio usuario. '
        'Responde ÚNICAMENTE con JSON válido, sin markdown.'
    )

    try:
        text = call_groq(prompt, system_prompt)
        start = text.find('{')
        end = text.rfind('}') + 1
        if start >= 0 and end > start:
            data = json.loads(text[start:end])
        else:
            data = json.loads(text)
    except Exception as e:
        logger.exception(f'[ADAPTIVE] user={user.id} phase=4 groq_error')
        return None

    suggestion = AISuggestion.objects.create(
        user=user,
        phase_reached=4,
        situacion_clara=data.get('situacion_clara', 'Se detectaron tareas acumuladas.'),
        explicacion_impacto=data.get('explicacion_impacto', 'Esto puede afectar tu progreso.'),
        propuesta_ajuste=data.get('propuesta_ajuste', 'Revisa tu planificación y ajusta prioridades.'),
        tipo_impacto=tipo,
        deviation_data={'deviation': deviation, 'impact': impact},
    )
    logger.info(f'[ADAPTIVE] user={user.id} phase=4 suggestion={suggestion.id} tipo={tipo}')
    return suggestion


def _build_prompt(user: User, deviation: dict, impact: dict) -> str:
    meta_anual = GranMetaAnual.objects.filter(user=user, is_vigente=True).first()
    meta_str = meta_anual.texto_meta if meta_anual else 'No definida'
    frase_str = meta_anual.frase_resumen if meta_anual else ''

    saturation_info = ''
    if impact.get('has_saturation'):
        saturation_info = (
            f'- El usuario tiene {impact["planned_blocks"]} bloques planificados '
            f'para {len(list(range(6,23)))} horas disponibles—sobrecarga operativa detectada.'
        )

    alignment_info = ''
    if impact.get('strategic_aligned'):
        alignment_info = '- Las tareas acumuladas están vinculadas a la Gran Meta Anual.'
    else:
        alignment_info = '- Las tareas acumuladas no están vinculadas directamente a la meta principal.'

    return f"""Eres un Coach Estratégico. Genera una intervención para un usuario con estos datos:

Gran Meta Anual del usuario: {frase_str} — {meta_str}

Detección del sistema:
- Tareas vencidas/acumuladas en las últimas 72h: {deviation['overdue_count']}
- Tipo de desviación: {'Patrón recurrente' if deviation.get('is_pattern') else 'Evento aislado'}
{saturation_info}
{alignment_info}
- Clasificación de impacto: {impact['tipo']}

Genera un JSON con estos 3 campos obligatorios:
1. "situacion_clara": Qué detectó el sistema (máx 2 oraciones, tono constructivo, sin palabras punitivas).
2. "explicacion_impacto": Qué consecuencias tiene sobre su plan anual.
3. "propuesta_ajuste": Sugerencia de solución concreta ({impact['tipo']}).
"""


def phase5_register_decision(suggestion: AISuggestion):
    """FASE 5 placeholder — decision is registered when user responds via API."""
    logger.info(f'[ADAPTIVE] suggestion={suggestion.id} phase=5 awaiting_user')


def register_user_decision(suggestion_id: int, user: User, decision: str):
    """Called from API when user responds to a suggestion."""
    try:
        suggestion = AISuggestion.objects.get(id=suggestion_id, user=user)
    except AISuggestion.DoesNotExist:
        return None

    suggestion.decision = decision
    suggestion.responded_at = timezone.now()
    suggestion.save()

    threshold, _ = AdaptiveThreshold.objects.get_or_create(user=user)
    tipo = suggestion.tipo_impacto

    if decision in ('keep', 'ignore'):
        rej_field = f'{tipo}_rejections'
        setattr(threshold, rej_field, getattr(threshold, rej_field, 0) + 1)
        threshold.save()
    elif decision == 'apply':
        setattr(threshold, f'{tipo}_rejections', 0)
        threshold.save()

    logger.info(
        f'[ADAPTIVE] user={user.id} suggestion={suggestion_id} '
        f'decision={decision} tipo={tipo} '
        f'rejections={getattr(threshold, f"{tipo}_rejections", 0)}'
    )
    return suggestion
