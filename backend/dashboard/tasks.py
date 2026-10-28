"""
Tareas para generación automática de reportes Focusia (Doc 27 · Comunicación y Reportes).

Reglas de publicación (Doc 27 §4):
  - Semanal  → de lunes a domingo; se publica el domingo a las 21:00 locales.
  - Mensual  → mes calendario; se publica el último día del mes a las 21:00.
  - Anual    → ciclo de 12 meses; se publica el 31 de diciembre a las 21:00.

Entre las 21:00 y las 00:00 el mismo reporte se actualiza. A las 00:00 el período
queda cerrado y el reporte conserva los datos de ese cierre (§4.1).

El aviso de disponibilidad es único por reporte; cada acción principal cuenta una
sola vez por período, identificada por su registro único (§5, §7.2).

Cuando Celery está disponible, estas tareas se ejecutan vía Celery Beat.
También pueden llamarse con `python manage.py generate_reports`.
"""
import json
import logging
from datetime import date, datetime, time as dtime, timedelta
from urllib.request import Request, urlopen

from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

try:
    from celery import shared_task
except ImportError:
    def shared_task(func):
        return func

LEVEL_FOCUS = {
    'weekly': 'Ritmo, desorden, falta de foco o sobrecarga puntual. Recomendaciones: ajustes simples, reorganización leve, foco en continuidad.',
    'monthly': 'Si la planificación fue realista, errores estructurales, patrones repetidos. Recomendaciones: ajustes de planificación, redistribución de carga, redefinición de enfoque.',
    'annual': 'Evolución de hábitos, comparación inicio vs. cierre, crecimiento o estancamiento. Recomendaciones: aprendizajes clave, definición de nuevas metas, ajuste de enfoque para el siguiente ciclo.',
}

MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]


# ──────────────────────────────────────────────────────────────────────────
# Períodos
# ──────────────────────────────────────────────────────────────────────────
def _plan_start_date(user):
    """Fecha en que comenzó la planificación del usuario (Doc 27 §4.2, §4.3).

    Se usa el alta de su configuración y, como respaldo, la fecha de registro.
    Devuelve None cuando todavía no hay base para calcular un período parcial.
    """
    candidates = []
    try:
        from dashboard.models import ConfiguracionUsuario
        cfg = ConfiguracionUsuario.objects.filter(user=user).first()
        if cfg and cfg.creado:
            candidates.append(timezone.localtime(cfg.creado).date())
    except Exception:
        pass
    if getattr(user, 'date_joined', None):
        candidates.append(timezone.localtime(user.date_joined).date())
    return min(candidates) if candidates else None


def _updated_until(period_end):
    """00:00 local del día siguiente al cierre (fin de la ventana de actualización)."""
    naive = datetime.combine(period_end + timedelta(days=1), dtime.min)
    if timezone.is_naive(naive):
        return timezone.make_aware(naive)
    return naive


def _get_period_range(level, user):
    """Período que cierra hoy, si corresponde (Doc 27 §4).

    Devuelve (period_start, period_end, is_partial, cycle_label) o
    (None, None, False, '') cuando hoy no es un día de publicación.
    """
    today = timezone.localdate()
    plan_start = _plan_start_date(user)

    if level == 'weekly':
        if today.weekday() != 6:  # 6 = domingo
            return None, None, False, ''
        period_start = today - timedelta(days=6)
        period_end = today
        label = f'{period_start.isoformat()} — {period_end.isoformat()}'
        partial = bool(plan_start and plan_start > period_start)
        if partial:
            period_start = plan_start

    elif level == 'monthly':
        first_day = today.replace(day=1)
        next_month = (first_day + timedelta(days=32)).replace(day=1)
        last_day = next_month - timedelta(days=1)
        if today != last_day:
            return None, None, False, ''
        period_start = first_day
        period_end = today
        label = f'{MESES[today.month - 1]} {today.year}'
        partial = bool(plan_start and plan_start > period_start)
        if partial:
            period_start = plan_start

    else:  # annual
        if not (today.month == 12 and today.day == 31):
            return None, None, False, ''
        period_start = date(today.year, 1, 1)
        period_end = date(today.year, 12, 31)
        label = str(today.year)
        partial = bool(plan_start and plan_start > period_start)
        if partial:
            period_start = plan_start

    return period_start, period_end, partial, label


def proxima_publicacion(level, when=None):
    """Próxima fecha/hora local de publicación de un reporte del tipo dado (Doc 27 §4).

    Es la base de la "fecha prevista del primer reporte" de la primera pantalla.
    """
    now = when or timezone.localtime()
    today = now.date()
    if level == 'weekly':
        days_ahead = (6 - today.weekday()) % 7  # hasta domingo
        target = today + timedelta(days=days_ahead)
        pub = timezone.make_aware(datetime.combine(target, dtime(hour=21)))
        if pub <= now:
            pub += timedelta(days=7)
        return pub
    if level == 'monthly':
        first_day = today.replace(day=1)
        next_month = (first_day + timedelta(days=32)).replace(day=1)
        last_day = next_month - timedelta(days=1)
        pub = timezone.make_aware(datetime.combine(last_day, dtime(hour=21)))
        if pub <= now:
            last_day_next = (next_month + timedelta(days=32)).replace(day=1) - timedelta(days=1)
            pub = timezone.make_aware(datetime.combine(last_day_next, dtime(hour=21)))
        return pub
    # annual
    pub = timezone.make_aware(datetime.combine(date(today.year, 12, 31), dtime(hour=21)))
    if pub <= now:
        pub = timezone.make_aware(datetime.combine(date(today.year + 1, 12, 31), dtime(hour=21)))
    return pub


def _cerrar_reportes_vencidos(user=None):
    """Cierra los reportes cuya ventana de actualización (00:00) ya terminó (§4.1)."""
    from dashboard.models import FocusiaReport
    now = timezone.now()
    qs = FocusiaReport.objects.filter(closed_at__isnull=True, updated_until__lt=now)
    if user is not None:
        qs = qs.filter(user=user)
    for report in qs:
        report.closed_at = report.updated_until or now
        report.save(update_fields=['closed_at'])


def _gather_goal_context(user, level, period_start, period_end):
    """Contexto de metas para el reporte (Doc 27 §6.2, §6.3, §6.4).

    Las metas aportan contenido y fechas de vigencia, nunca determinan el cierre
    del período. Se conserva la versión vigente y, en el anual, el recorrido de
    metas mensuales aprobadas del ciclo.
    """
    from dashboard.models import GranMetaAnual, MonthlyGoal, ObjetivoMensual

    anual = (
        GranMetaAnual.objects.filter(user=user, is_active=True).first()
        or GranMetaAnual.objects.filter(
            user=user, status=GranMetaAnual.Status.APROBADA
        ).order_by('-approved_at', '-version').first()
    )
    gran_meta = None
    if anual:
        gran_meta = {
            'texto': anual.generated_goal_text,
            'version': anual.version,
            'estado': anual.status,
            'aprobada_en': anual.approved_at.isoformat() if anual.approved_at else None,
        }

    ref = period_end
    mensual = (
        MonthlyGoal.objects.filter(
            plan__user=user,
            calendar_year=ref.year,
            calendar_month=ref.month,
        )
        .select_related('plan')
        .order_by('-plan__approved_at', '-version')
        .first()
    )
    meta_mensual = None
    fuente = None
    if mensual:
        fuente = 'MonthlyGoal'
        meta_mensual = {
            'texto': mensual.monthly_goal_text,
            'explicacion': mensual.brief_explanation,
            'relacion_anual': mensual.annual_goal_relation,
            'complejidad': mensual.complexity_level,
            'version': mensual.version,
            'estado': mensual.status,
            'mes': mensual.calendar_month,
            'anio': mensual.calendar_year,
        }
    else:
        # Respaldo con el modelo anterior de objetivos mensuales.
        objetivo = ObjetivoMensual.objects.filter(
            user=user, mes=ref.month).select_related('meta_anual').first()
        if objetivo:
            fuente = 'ObjetivoMensual'
            meta_mensual = {
                'texto': objetivo.titulo,
                'explicacion': objetivo.descripcion,
                'completado': objetivo.completado,
                'mes': objetivo.mes,
                'anio': ref.year,
            }

    metas_ciclo = []
    if level == 'annual':
        for goal in MonthlyGoal.objects.filter(
            plan__user=user,
            calendar_year__gte=period_start.year,
            calendar_year__lte=period_end.year,
        ).order_by('calendar_year', 'calendar_month'):
            metas_ciclo.append({
                'mes': goal.calendar_month,
                'anio': goal.calendar_year,
                'texto': goal.monthly_goal_text,
                'estado': goal.status,
                'version': goal.version,
            })

    return {
        'gran_meta_anual': gran_meta,
        'meta_mensual': meta_mensual,
        'meta_mensual_fuente': fuente,
        'metas_mensuales_ciclo': metas_ciclo,
    }


# ──────────────────────────────────────────────────────────────────────────
# Cálculo de cumplimiento (Doc 27 §5)
# ──────────────────────────────────────────────────────────────────────────
def _norm_titulo(texto):
    """Clave de texto para reconocer el espejo Semanal de una acción de Kanban."""
    return ' '.join(str(texto or '').strip().lower().split())


def _subacciones_pendientes(action):
    """Doc 27 §5: un grupo con subacciones pendientes no está completado."""
    return any(not (sub or {}).get('is_completed') for sub in (action.subactions or []))


def _gather_report_data(user, level, period_start, period_end):
    """Recolecta el cumplimiento de acciones principales del período.

    La identidad de una acción principal es `AccionKanban` (se conserva al pasar
    por Kanban, Planificación Semanal y Agenda Diaria), por lo que cada una cuenta
    una sola vez. Las ideas sin fecha no integran el total. Una acción delegada
    solo se computa como completada si el usuario la confirmó (§5).

    Reglas del Doc 27 §5 aplicadas acá:
    - Reprogramación: se conserva el total del período original mediante
      `fecha_planificada_original` y se identifica como reprogramada.
    - Eliminación: permanece en el total original como pendiente/eliminada.
    - Subacciones: el grupo cuenta una vez y no puede estar completado con
      subacciones pendientes.
    - El planificador semanal aporta acciones propias (sin duplicar los espejos
      de Kanban) con su propio identificador.
    """
    from collections import defaultdict

    from django.db.models import Q

    from dashboard.models import AccionKanban, Action, ActionDelegation, TimeBlock

    planned = {}   # identidad → completada (bool)
    fechas = {}    # identidad → fecha del período (para días fuertes/débiles)
    reprogramadas = set()
    eliminadas = set()
    con_subacciones_pendientes = set()

    def en_periodo(fecha):
        return bool(fecha and period_start <= fecha <= period_end)

    # Confirmaciones de delegación: no completan por sí solas; requieren confirmación.
    confirmadas = set()
    for deleg in ActionDelegation.objects.filter(user=user, estado=ActionDelegation.Estado.COMPLETADA):
        ref = deleg.source_ref or {}
        ref_id = ref.get('id') if isinstance(ref, dict) else None
        if ref_id:
            confirmadas.add(str(ref_id))

    acciones = (
        AccionKanban.objects.filter(user=user)
        .filter(
            Q(fecha_seleccionada__range=(period_start, period_end))
            | Q(fecha_planificada_original__range=(period_start, period_end))
        )
        .exclude(estado_actual=AccionKanban.EstadoChoices.KANBAN_ACTIVO)
    )

    # Permite reconocer el registro espejo del planificador semanal.
    identidad_por_titulo = {}

    for accion in acciones:
        clave = f'ak:{accion.id}'
        if (en_periodo(accion.fecha_planificada_original)
                and accion.fecha_seleccionada
                and not en_periodo(accion.fecha_seleccionada)):
            reprogramadas.add(clave)

        eliminada = accion.estado_actual == AccionKanban.EstadoChoices.ELIMINADA
        completada = (
            not eliminada
            and (
                accion.estado_actual == AccionKanban.EstadoChoices.COMPLETADA
                or str(accion.id) in confirmadas
            )
        )
        planned[clave] = completada
        if eliminada:
            eliminadas.add(clave)

        fecha_ref = (
            accion.fecha_seleccionada if en_periodo(accion.fecha_seleccionada)
            else accion.fecha_planificada_original
        )
        if fecha_ref:
            fechas[clave] = fecha_ref

        for fecha in {accion.fecha_seleccionada, accion.fecha_planificada_original}:
            if fecha:
                identidad_por_titulo[(_norm_titulo(accion.texto_accion), fecha)] = clave

    # Acciones del planificador semanal: espejos de Kanban y acciones propias.
    acciones_semana = (
        Action.objects.filter(weekly_plan__user=user)
        .filter(
            Q(assigned_calendar_date__range=(period_start, period_end))
            | Q(fecha_planificada_original__range=(period_start, period_end))
        )
        .select_related('weekly_plan')
    )

    for action in acciones_semana:
        titulo = _norm_titulo(action.title)
        clave = (
            identidad_por_titulo.get((titulo, action.assigned_calendar_date))
            or identidad_por_titulo.get((titulo, action.fecha_planificada_original))
            or f'wk:{action.id}'
        )
        nueva = clave not in planned
        if nueva:
            planned[clave] = False
            fecha_ref = (
                action.assigned_calendar_date
                if en_periodo(action.assigned_calendar_date)
                else action.fecha_planificada_original
            )
            if fecha_ref:
                fechas[clave] = fecha_ref
            if (en_periodo(action.fecha_planificada_original)
                    and not en_periodo(action.assigned_calendar_date)):
                reprogramadas.add(clave)

        if _subacciones_pendientes(action):
            con_subacciones_pendientes.add(clave)

        if action.status == Action.ActionStatus.COMPLETADA or str(action.id) in confirmadas:
            planned[clave] = True

    # La regla de subacciones prevalece sobre cualquier estado de la acción.
    for clave in con_subacciones_pendientes:
        planned[clave] = False

    # Respaldo para datos previos al modelo de acciones de Kanban.
    if not planned:
        for block in TimeBlock.objects.filter(user=user, fecha__gte=period_start, fecha__lte=period_end):
            clave = f'tb:{block.id}'
            planned[clave] = block.estado == 'done'
            fechas[clave] = block.fecha

    total = len(planned)
    done = sum(1 for v in planned.values() if v)
    pending = total - done
    completion = round((done / total * 100) if total > 0 else 0, 1)

    # Desglose de acciones sin completar del período (Doc 27 §5): las
    # reprogramadas y eliminadas permanecen en el total original, por eso
    # se reportan como causas separadas del faltante.
    reprobadas_reprogramadas = sum(1 for c in reprogramadas if not planned.get(c))
    eliminadas_sin_completar = sum(1 for c in eliminadas if not planned.get(c))
    pendientes_al_cierre = max(0, pending - reprobadas_reprogramadas - eliminadas_sin_completar)

    # Días fuertes/débiles y consistencia a partir de las acciones del período.
    day_stats = defaultdict(lambda: {'total': 0, 'done': 0})
    for clave, fecha in fechas.items():
        day_name = fecha.strftime('%A').lower()
        day_stats[day_name]['total'] += 1
        if planned.get(clave):
            day_stats[day_name]['done'] += 1

    strong_days, weak_days = [], []
    for day_name, stats in day_stats.items():
        if stats['total'] > 0:
            day_completion = stats['done'] / stats['total']
            if day_completion >= 0.8:
                strong_days.append(day_name)
            elif day_completion <= 0.3:
                weak_days.append(day_name)

    consistency = None
    if day_stats:
        completions = [(s['done'] / s['total']) for s in day_stats.values() if s['total'] > 0]
        if len(completions) > 1:
            mean = sum(completions) / len(completions)
            variance = sum((c - mean) ** 2 for c in completions) / len(completions)
            consistency = round(max(0, (1 - variance ** 0.5) * 100), 1)

    # Serie por fecha del período: base del gráfico "día a día" (weekly) y de
    # las agrupaciones semana/mes (monthly/annual) en el frente.
    serie_diaria = defaultdict(lambda: {'planificadas': 0, 'completadas': 0})
    for clave, fecha in fechas.items():
        entrada = serie_diaria[fecha.isoformat()]
        entrada['planificadas'] += 1
        if planned.get(clave):
            entrada['completadas'] += 1
    serie_diaria = [
        {'fecha': fecha, **stats}
        for fecha, stats in sorted(serie_diaria.items())
    ]

    goal_context = {}
    try:
        goal_context = _gather_goal_context(user, level, period_start, period_end)
    except Exception as e:
        logger.warning(f'[REPORTS] contexto de metas no disponible user={user.id}: {e}')

    return {
        'completion_percentage': completion,
        'completed_count': done,
        'pending_count': pending,
        'strong_days': strong_days,
        'weak_days': weak_days,
        'consistency_score': consistency,
        'has_data': total > 0,
        'goal_context': goal_context,
        'raw': {
            'acciones_principales': {'total': total, 'done': done},
            'reprogramadas': len(reprogramadas),
            'eliminadas': len(eliminadas),
            'reprogramadas_sin_completar': reprobadas_reprogramadas,
            'eliminadas_sin_completar': eliminadas_sin_completar,
            'pendientes_al_cierre': pendientes_al_cierre,
            'serie_diaria': serie_diaria,
            'subacciones_pendientes': len(con_subacciones_pendientes),
            'delegaciones_confirmadas': len(confirmadas),
            'metas': goal_context,
        },
    }


def _empty_report_data():
    return {
        'completion_percentage': 0,
        'completed_count': 0,
        'pending_count': 0,
        'strong_days': [],
        'weak_days': [],
        'consistency_score': None,
        'has_data': False,
        'goal_context': {},
        'raw': {},
    }


# ──────────────────────────────────────────────────────────────────────────
# Interpretación con IA
# ──────────────────────────────────────────────────────────────────────────
def _call_groq(messages, temperature=0.7, max_tokens=300):
    api_key = getattr(settings, 'GROQ_API_KEY', '')
    if not api_key:
        return None
    try:
        payload = json.dumps({
            'model': getattr(settings, 'GROQ_AGENT_MODEL', 'openai/gpt-oss-120b'),
            'messages': messages,
            'temperature': temperature,
            'max_tokens': max_tokens,
        }).encode('utf-8')
        req = Request(
            'https://api.groq.com/openai/v1/chat/completions',
            data=payload,
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json',
                'User-Agent': 'focusia/1.0',
            },
        )
        with urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return data['choices'][0]['message']['content']
    except Exception as e:
        logger.warning(f'[REPORTS] Groq call failed: {e}')
        return None


def _generate_ai_content(level, data, tono=None):
    focus = LEVEL_FOCUS.get(level, LEVEL_FOCUS['weekly'])
    tono_txt = {
        'suave': 'El tono es suave y cercano.',
        'cercano_motivador': 'El tono es cercano y motivador.',
        'claro_estrategico': 'El tono es claro y estratégico.',
        'firme_exigente': 'El tono es firme y exigente, sin juzgar a la persona.',
        'directo': 'El tono es directo y estructurado.',
        'adaptativo': 'Usá un tono adaptativo: cercano pero estratégico.',
    }.get(tono or '', 'Usá un tono cercano pero estratégico.')

    metas = data.get('goal_context') or {}
    metas_lineas = []
    gran_meta = metas.get('gran_meta_anual')
    if gran_meta and gran_meta.get('texto'):
        metas_lineas.append(
            f"- Gran Meta Anual (v{gran_meta.get('version')}): {gran_meta['texto']}")
    meta_mensual = metas.get('meta_mensual')
    if meta_mensual and meta_mensual.get('texto'):
        relacion = meta_mensual.get('relacion_anual') or ''
        detalle = f" (relación con la anual: {relacion})" if relacion else ''
        metas_lineas.append(
            f"- Meta Mensual vigente: {meta_mensual['texto']}{detalle}")
    if level == 'annual' and metas.get('metas_mensuales_ciclo'):
        recorrido = '; '.join(
            m['texto'] for m in metas['metas_mensuales_ciclo'] if m.get('texto'))
        if recorrido:
            metas_lineas.append(f"- Metas mensuales aprobadas del ciclo: {recorrido}")
    metas_txt = '\n'.join(metas_lineas) if metas_lineas else 'Sin metas registradas para el período.'
    raw = data.get('raw') or {}
    reprogramadas = raw.get('reprogramadas', 0)
    eliminadas = raw.get('eliminadas', 0)
    subacciones_pendientes = raw.get('subacciones_pendientes', 0)
    ajustes_txt = ''
    if reprogramadas or eliminadas or subacciones_pendientes:
        ajustes_txt = (
            f"- Acciones reprogramadas: {reprogramadas}\n"
            f"- Acciones eliminadas: {eliminadas}\n"
            f"- Grupos con subacciones pendientes: {subacciones_pendientes}\n"
        )

    prompt = (
        f"Actuás como un coach estratégico dentro de Focusia. "
        f"Recibirás datos de ejecución de un usuario para un período {level}.\n\n"
        f"DATOS:\n"
        f"- Cumplimiento: {data['completion_percentage']}%\n"
        f"- Acciones completadas: {data['completed_count']}\n"
        f"- Acciones pendientes: {data['pending_count']}\n"
        f"- Días fuertes: {', '.join(data['strong_days']) or 'Ninguno'}\n"
        f"- Días débiles: {', '.join(data['weak_days']) or 'Ninguno'}\n"
        f"- Score de consistencia: {data['consistency_score']}\n"
        f"{ajustes_txt}\n"
        f"CONTEXTO DE METAS:\n{metas_txt}\n\n"
        f"CONTEXTO DE ENFOQUE: {focus}\n"
        f"TONO: {tono_txt}\n"
        f"Distinguí siempre hechos registrados de posibles explicaciones. No atribuyas causas personales.\n"
        f"Las metas son contexto: completar tareas no equivale automáticamente a alcanzar una meta personal. "
        f"No inventes porcentajes de avance de metas sin una variable medible.\n\n"
        f"Generá exactamente dos textos:\n"
        f"1. 'headline': UNA sola frase con impacto inmediato que enganche al usuario a abrir el reporte. "
        f"Máximo 140 caracteres.\n"
        f"2. 'interpretation': Máximo 3 líneas (≈400 caracteres), qué hizo bien, qué conviene revisar, "
        f"y qué significa eso. Sin listas ni bullets.\n\n"
        f"Respondé SOLO en JSON válido: {{\"headline\": \"...\", \"interpretation\": \"...\"}}"
    )
    messages = [
        {'role': 'system', 'content': 'Sos un coach estratégico de productividad. Respondés en JSON.'},
        {'role': 'user', 'content': prompt},
    ]
    raw = _call_groq(messages, temperature=0.7, max_tokens=300)
    if not raw:
        return None, None

    try:
        cleaned = raw.strip()
        if cleaned.startswith('```'):
            cleaned = cleaned.split('\n', 1)[-1].rsplit('```', 1)[0].strip()
        result = json.loads(cleaned)
        headline = result.get('headline', '')[:280]
        interpretation = result.get('interpretation', '')
        if len(interpretation) > 400:
            interpretation = interpretation[:397] + '...'
        return headline, interpretation
    except (json.JSONDecodeError, AttributeError) as e:
        logger.warning(f'[REPORTS] Failed to parse AI response: {e}')
        return None, None


# ──────────────────────────────────────────────────────────────────────────
# Generación
# ──────────────────────────────────────────────────────────────────────────
def _marcar_anterior_sin_consultar(user, level, period_start):
    """Doc 27 §7.4: al publicarse el siguiente reporte, si el anterior nunca se abrió
    se registra internamente como "sin consultar" (sin penalizar al usuario).
    """
    from dashboard.models import FocusiaReport
    anterior = (
        FocusiaReport.objects.filter(user=user, level=level, period_start__lt=period_start)
        .order_by('-period_start')
        .first()
    )
    if anterior and anterior.status in (
        FocusiaReport.ReportStatus.GENERATED,
        FocusiaReport.ReportStatus.NOTIFIED,
    ):
        anterior.never_opened = True
        anterior.save(update_fields=['never_opened'])


def _report_tone(user):
    """Tono vigente para adaptar el aviso de reporte (Doc 27 §7.1)."""
    from dashboard.models import ConfiguracionUsuario, OnboardingProfile

    profile = OnboardingProfile.objects.filter(user=user).first()
    if profile and profile.tone:
        return profile.tone
    cfg = ConfiguracionUsuario.objects.filter(user=user).first()
    return cfg.estilo_comunicacion if cfg else 'adaptativo'


def _notify_report_ready(user, report):
    """Un único aviso de disponibilidad por reporte (Doc 27 §7.2).

    La disponibilidad y la entrega son momentos distintos: el motor proactivo
    decide si corresponde entregar ahora o dejar el aviso en la campana hasta
    una franja permitida.
    """
    from dashboard.services.notification_dispatcher import notificar

    level_display = report.get_level_display().lower()
    tono = _report_tone(user)
    mensajes = {
        'cercano_motivador': 'Cuando quieras, mirá lo que lograste y elegí el próximo paso.',
        'claro_estrategico': 'Revisá los datos del período y decidí el siguiente paso.',
        'firme_exigente': 'Revisá qué funcionó y qué conviene ajustar.',
        'directo': 'Revisá los datos y definí el siguiente paso.',
        'suave': 'Cuando puedas, revisá tus avances y elegí el próximo paso.',
        'adaptativo': 'Podés revisar tus avances y decidir el siguiente paso.',
    }
    mensaje = mensajes.get(tono, mensajes['adaptativo'])
    try:
        notificar(
            user,
            f'Tu resumen {level_display} está listo',
            mensaje,
            prioridad='informativa',
            canales=['app', 'push', 'calls'],
            scheduled_for=timezone.now(),
            dedupe_key=f'report-ready:{report.id}',
            data={
                'kind': 'report',
                'type': 'report',
                'report_id': report.id,
                'level': report.level,
                'period_start': str(report.period_start),
            },
        )
    except Exception as e:
        logger.warning(f'[REPORTS] aviso falló user={user.id} report={report.id}: {e}')


def _generate_report_for_user(user, level, force=False):
    """Crea o actualiza el reporte del período que cierra hoy (Doc 27 §4, §4.4)."""
    from django.db import IntegrityError
    from dashboard.models import ConfiguracionUsuario, FocusiaReport, ReportDataSource

    period_start, period_end, is_partial, label = _get_period_range(level, user)
    if not period_start:
        return None

    existing = FocusiaReport.objects.filter(user=user, level=level, period_start=period_start).first()

    # Período ya cerrado: no se reabre ni se recalcula (§4.1).
    if existing and existing.closed_at and not force:
        return existing

    ahora = timezone.now()

    # 1. Recolectar datos. Un fallo de datos deja el estado de error explícito.
    try:
        data = _gather_report_data(user, level, period_start, period_end)
        datos_ok = True
    except Exception as e:
        logger.error(f'[REPORTS] datos fallaron user={user.id} level={level}: {e}')
        data = _empty_report_data()
        datos_ok = False

    # 2. Interpretación de IA. Un fallo de IA no bloquea el resumen de datos.
    tono = None
    try:
        cfg = ConfiguracionUsuario.objects.filter(user=user).first()
        tono = cfg.estilo_comunicacion if cfg else None
    except Exception:
        tono = None

    headline, interpretation = (None, None)
    if datos_ok:
        headline, interpretation = _generate_ai_content(level, data, tono=tono)

    if not datos_ok:
        estado = FocusiaReport.GenerationState.FAILED
    elif not headline:
        estado = FocusiaReport.GenerationState.ANALYSIS_PENDING
    else:
        estado = FocusiaReport.GenerationState.READY

    campos = dict(
        period_end=period_end,
        completion_percentage=data['completion_percentage'],
        completed_count=data['completed_count'],
        pending_count=data['pending_count'],
        strong_days=data['strong_days'],
        weak_days=data['weak_days'],
        consistency_score=data['consistency_score'],
        is_partial=is_partial,
        cycle_label=label,
        generation_state=estado,
        updated_until=_updated_until(period_end),
    )
    if headline:
        campos['headline_message'] = headline
    if interpretation:
        campos['ai_interpretation'] = interpretation
    campos['ai_raw_metadata'] = data.get('raw', {})

    if existing:
        # Actualización dentro de la ventana: no genera un aviso nuevo (§7.2).
        # No se degrada un análisis ya listo ante un fallo transitorio de IA.
        if estado == FocusiaReport.GenerationState.ANALYSIS_PENDING and existing.generation_state == FocusiaReport.GenerationState.READY:
            campos['generation_state'] = FocusiaReport.GenerationState.READY
        for key, value in campos.items():
            setattr(existing, key, value)
        existing.save()
        return existing

    if not datos_ok:
        campos['headline_message'] = ''
        campos['ai_interpretation'] = ''
    elif not headline:
        campos['headline_message'] = 'Análisis pendiente'
        campos['ai_interpretation'] = ''

    try:
        report = FocusiaReport.objects.create(
            user=user, level=level, period_start=period_start, **campos
        )
    except IntegrityError:
        return FocusiaReport.objects.filter(user=user, level=level, period_start=period_start).first()

    if datos_ok:
        ReportDataSource.objects.create(
            report=report, source_type='aggregate', snapshot=data.get('raw', {})
        )

    _marcar_anterior_sin_consultar(user, level, period_start)
    # Doc 27 §4.4: no se anuncia como listo un reporte sin datos disponibles.
    if datos_ok:
        _notify_report_ready(user, report)
        _marcar_notificado(report)
    return report


def _marcar_notificado(report):
    from dashboard.models import FocusiaReport
    if report.status == FocusiaReport.ReportStatus.GENERATED:
        report.status = FocusiaReport.ReportStatus.NOTIFIED
        report.notified_at = timezone.now()
        report.save(update_fields=['status', 'notified_at'])


def reconciliar_reportes(user=None):
    """Cierra períodos vencidos y reintenta los pendientes/fallidos (Doc 27 §4.4).

    Los reintentos conservan la identidad del reporte: no crean uno nuevo del
    mismo período ni emiten un aviso adicional.
    """
    from dashboard.models import FocusiaReport

    _cerrar_reportes_vencidos(user)
    qs = FocusiaReport.objects.filter(
        generation_state__in=[
            FocusiaReport.GenerationState.ANALYSIS_PENDING,
            FocusiaReport.GenerationState.FAILED,
        ]
    )
    if user is not None:
        qs = qs.filter(user=user)
    for report in qs:
        _generate_report_for_user(report.user, report.level, force=True)


def _run_for_all(level):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    for user in User.objects.filter(is_active=True):
        try:
            _generate_report_for_user(user, level)
        except Exception as e:
            logger.error(f'[REPORTS] {level} falló para user={user.id}: {e}')


@shared_task
def generate_weekly_reports():
    _run_for_all('weekly')


@shared_task
def generate_monthly_reports():
    _run_for_all('monthly')


@shared_task
def generate_annual_reports():
    _run_for_all('annual')


@shared_task
def remind_pending_actions():
    """Doc 27 §5.1: cada noche recuerda al usuario qué hace con las acciones del día
    que quedaron sin confirmar. No las completa ni las presupone incumplidas.
    """
    from django.contrib.auth import get_user_model
    from dashboard.models import AccionKanban
    from dashboard.services.notification_dispatcher import notificar

    User = get_user_model()
    hoy = timezone.localdate()
    for user in User.objects.filter(is_active=True):
        try:
            pendientes = AccionKanban.objects.filter(
                user=user,
                fecha_seleccionada=hoy,
            ).exclude(
                estado_actual__in=[
                    AccionKanban.EstadoChoices.COMPLETADA,
                    AccionKanban.EstadoChoices.ELIMINADA,
                    AccionKanban.EstadoChoices.KANBAN_ACTIVO,
                ]
            ).count()
            if pendientes > 0:
                recordatorio = timezone.make_aware(datetime.combine(hoy, dtime(20, 0)))
                notificar(
                    user,
                    'Acciones pendientes de hoy',
                    f'Tenés {pendientes} acción(es) sin confirmar. Indicá qué hacés con cada una.',
                    prioridad='importante',
                    canales=['app', 'push'],
                    scheduled_for=recordatorio,
                    dedupe_key=f'pending-actions:{hoy.isoformat()}',
                    data={'kind': 'acciones_pendientes', 'fecha': hoy.isoformat()},
                )
        except Exception as e:
            logger.error(f'[REPORTS] recordatorio nocturno falló user={user.id}: {e}')


# ──────────────────────────────────────────────────────────────────────────
# Suplementos y Medicamentos (Doc 21)
# ──────────────────────────────────────────────────────────────────────────
def _dentro_de_ventana(user):
    """Doc 21 §IV: los avisos respetan la ventana de intervención del Onboarding."""
    from dashboard.models import ConfiguracionUsuario

    ahora = timezone.localtime()
    config = ConfiguracionUsuario.objects.filter(user=user).first()
    if not config:
        return True
    if config.ventana_inicio and ahora.time() < config.ventana_inicio:
        return False
    if config.ventana_fin and ahora.time() > config.ventana_fin:
        return False
    return True


@shared_task
def avisar_dosis_pendientes():
    """Doc 21 §III/§IV: el Sistema Proactivo avisa de las dosis cuya hora ya pasó
    sin registrarse. Se envía un único aviso por dosis y nunca cuando el usuario
    tomó la dosis: simplemente permanece pendiente en el módulo.

    Solo mira las dosis de hoy: las de días anteriores siguen pendientes en el
    módulo, pero no se avisa de ellas (serían avisos atrasados, uno cada vez que
    corre la tarea).
    """
    from django.contrib.auth import get_user_model
    from dashboard.models import Suplemento, SuplementoToma
    from dashboard.services.notification_dispatcher import notificar, puede_enviar

    User = get_user_model()
    ahora = timezone.now()
    inicio_del_dia = timezone.localtime().replace(
        hour=0, minute=0, second=0, microsecond=0)
    for user in User.objects.filter(is_active=True):
        try:
            for suplemento in Suplemento.objects.filter(user=user, activo=True):
                toma = (
                    SuplementoToma.objects
                    .filter(suplemento=suplemento, tomado=False, avisada=False,
                            programada__gte=inicio_del_dia, programada__lte=ahora)
                    .order_by('programada')
                    .first()
                )
                if not toma:
                    continue
                # Doc 27 §2.4: medicamentos son críticos; suplementos, importantes.
                prioridad = (
                    'critica' if suplemento.tipo == 'Medicamento' else 'importante')
                resultado = notificar(
                    user,
                    'Toma pendiente',
                    f'Es la hora de tu {suplemento.tipo.lower()}: {suplemento.nombre}. '
                    'Registra la toma cuando la hayas hecho.',
                    prioridad=prioridad,
                    canales=['app', 'push', 'whatsapp', 'calls'],
                    scheduled_for=toma.programada,
                    dedupe_key=f'toma:{toma.id}',
                    data={
                        'kind': 'toma',
                        'toma_id': toma.id,
                        'suplemento_id': suplemento.id,
                        'tipo': suplemento.tipo,
                    },
                )
                # Solo se marca avisada si hubo al menos un canal disponible;
                # si no, queda pendiente para el próximo intento.
                if any(k in resultado for k in ('app', 'push', 'whatsapp', 'calls', 'postponed')):
                    toma.avisada = True
                    toma.save(update_fields=['avisada'])
        except Exception as e:
            logger.error(f'[SUPLEMENTOS] aviso de dosis falló user={user.id}: {e}')


# ──────────────────────────────────────────────────────────────────────────
# Hora de Oro Familiar (Doc 24)
# ──────────────────────────────────────────────────────────────────────────
@shared_task
def recordar_hora_de_oro():
    """Doc 24 §III «Recordatorio»: cuando llega el día programado, el Sistema
    Proactivo envía un aviso amable. Inspira, nunca genera presión: no reprocha
    ni pide confirmación, y respeta la ventana de intervención y los canales
    habilitados por el usuario.
    """
    from django.contrib.auth import get_user_model
    from dashboard.models import HoraOroExperiencia, HoraOroAjustes
    from dashboard.services.notification_dispatcher import notificar
    from dashboard.services.hora_oro import DIAS

    User = get_user_model()
    dia_hoy = DIAS[timezone.localdate().weekday()]
    ahora = timezone.localtime()
    for user in User.objects.filter(is_active=True):
        try:
            # «Configurar recordatorios»: el aviso diario y su hora son del usuario.
            ajustes = HoraOroAjustes.objects.filter(user=user).first()
            if ajustes is not None and not ajustes.recordatorio_activo:
                continue
            hora = ajustes.hora_recordatorio if ajustes is not None else dtime(18, 0)
            if ahora.hour != hora.hour:
                continue

            experiencias = HoraOroExperiencia.objects.filter(user=user, dia_semana=dia_hoy)
            if not experiencias.exists():
                continue

            ideas = ' · '.join(e.actividad for e in experiencias[:3])
            programado = timezone.make_aware(datetime.combine(
                timezone.localdate(), hora))
            notificar(
                user,
                'Hoy es tu Hora de Oro Familiar',
                'Hoy planificaste regalar una hora de calidad a tu familia. '
                f'Disfruta ese momento: {ideas}',
                prioridad='importante',
                canales=['app', 'push', 'whatsapp', 'calls'],
                scheduled_for=programado,
                dedupe_key=f'hora-oro:{timezone.localdate().isoformat()}',
                data={'kind': 'hora_oro', 'fecha': timezone.localdate().isoformat()},
            )
        except Exception as e:
            logger.error(f'[HORA-ORO] recordatorio falló user={user.id}: {e}')


# ──────────────────────────────────────────────────────────────────────────
# Avisos postergados (Doc 27 §2.7)
# ──────────────────────────────────────────────────────────────────────────
@shared_task
def flush_notificaciones():
    """Entrega los avisos postergados al terminar Focus o abrir una franja.

    Revalida la vigencia de cada evento, ordena por prioridad y hora del
    compromiso, y respeta la intensidad configurada para evitar ráfagas.
    """
    from dashboard.services.notification_dispatcher import entregar_pendientes

    resultado = entregar_pendientes()
    if resultado.get('entregados') or resultado.get('cancelados'):
        logger.info(
            '[PROACTIVO] pendientes entregados=%s cancelados=%s esperando=%s',
            resultado.get('entregados'), resultado.get('cancelados'),
            resultado.get('esperando'))
    return resultado
