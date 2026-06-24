import json
import logging
import urllib.request
from django.conf import settings
from ..models import PropuestaIA, MetaAnual, ObjetivoMensual, KanbanTask

logger = logging.getLogger('focusia.security')

PROMPT_TEMPLATE = """
Eres un Coach Estratégico Directivo. Tu rol es ayudar al usuario a realinear su planificación.

Contexto del usuario:
- Meta Anual: {meta_anual}
- Objetivo Mensual: {objetivo_mensual}
- Tipo de Impacto Detectado: {tipo_impacto}
- Situación Detectada: {situacion}

REGLAS ESTRICTAS:
1. NO uses palabras punitivas como "fallaste", "no cumpliste", "fracaso".
2. Enfócate en la CONSECUENCIA de la planificación elegida, no en la persona.
3. Sé directivo pero respetuoso.

Genera un objeto JSON EXACTO con estas claves:
- "situacion_clara": qué detectó el sistema (máximo 2 oraciones).
- "explicacion_impacto": qué consecuencias tiene sobre su plan (máximo 3 oraciones).
- "propuesta_ajuste": la sugerencia de solución concreta (máximo 3 oraciones).

IMPORTANTE: Responde ÚNICAMENTE con el JSON, sin texto adicional.
"""


def generar_propuesta(user, tipo_impacto, situacion):
    """
    FASE 4: Generación e Inyección de la Intervención
    Llama a la IA (Groq) y persiste la propuesta.
    Returns: PropuestaIA instance or None
    """
    meta_anual_text = 'No definida'
    objetivo_mensual_text = 'No definido'

    meta = MetaAnual.objects.filter(user=user, aprobada=True).first()
    if meta:
        meta_anual_text = f'{meta.titulo}: {meta.descripcion[:200]}'

    obj_mensual = ObjetivoMensual.objects.filter(user=user).first()
    if obj_mensual:
        objetivo_mensual_text = f'{obj_mensual.titulo}: {obj_mensual.descripcion[:200]}'

    prompt = PROMPT_TEMPLATE.format(
        meta_anual=meta_anual_text,
        objetivo_mensual=objetivo_mensual_text,
        tipo_impacto=tipo_impacto,
        situacion=situacion,
    )

    api_key = getattr(settings, 'GROQ_API_KEY', '')
    if not api_key:
        logger.warning('GROQ_API_KEY no configurada. Usando propuesta por defecto.')
        return _crear_propuesta_default(user, tipo_impacto, situacion)

    try:
        body = json.dumps({
            'model': 'llama-3.3-70b-versatile',
            'messages': [{'role': 'user', 'content': prompt}],
        }).encode()
        req = urllib.request.Request(
            'https://api.groq.com/openai/v1/chat/completions',
            data=body,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {api_key}',
                'User-Agent': 'Mozilla/5.0',
            },
            method='POST',
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
        text = data['choices'][0]['message']['content']

        import re
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            payload = json.loads(json_match.group())
            return PropuestaIA.objects.create(
                user=user,
                tipo_impacto=tipo_impacto,
                situacion_clara=payload.get('situacion_clara', situacion),
                explicacion_impacto=payload.get('explicacion_impacto', ''),
                propuesta_ajuste=payload.get('propuesta_ajuste', ''),
                fase_detectada=f'Fase 3 -> {tipo_impacto}',
            )
    except Exception as e:
        logger.exception('Error generando propuesta IA')
        return _crear_propuesta_default(user, tipo_impacto, situacion)

    return _crear_propuesta_default(user, tipo_impacto, situacion)


def _crear_propuesta_default(user, tipo_impacto, situacion):
    defaults = {
        'estructural': {
            'situacion_clara': 'Se ha detectado una sobrecarga significativa en tu planificación diaria.',
            'explicacion_impacto': 'Tener más tareas planificadas que horas disponibles genera acumulación y estrés. Esto reduce tu capacidad de enfoque en lo verdaderamente importante.',
            'propuesta_ajuste': 'Te sugiero redistribuir las tareas en los próximos días, priorizando las más críticas y moviendo las secundarias a la próxima semana.',
        },
        'estrategico_critico': {
            'situacion_clara': f'El sistema ha identificado tareas acumuladas que están directamente vinculadas con tu meta anual o mensual. {situacion}',
            'explicacion_impacto': 'Cuando las tareas estratégicas se postergan, el avance hacia tu gran meta se ve comprometido. Cada día de retraso aleja la fecha de cumplimiento.',
            'propuesta_ajuste': 'Te recomiendo bloquear tiempo específico esta semana para esas tareas estratégicas. Priorizarlas ahora evitará un efecto dominó en tu planificación.',
        },
        'de_prioridad': {
            'situacion_clara': 'Se ha detectado un grupo de tareas sin completar que no están alineadas con tus metas principales.',
            'explicacion_impacto': 'La acumulación de tareas dispersa tu atención y reduce tu productividad general. Es momento de re-evaluar qué es realmente prioritario.',
            'propuesta_ajuste': 'Sugiero revisar tu lista de tareas y eliminar, delegar o posponer las que no aporten directamente a tus objetivos del mes.',
        },
    }

    d = defaults.get(tipo_impacto, defaults['de_prioridad'])
    return PropuestaIA.objects.create(
        user=user,
        tipo_impacto=tipo_impacto,
        situacion_clara=d['situacion_clara'],
        explicacion_impacto=d['explicacion_impacto'],
        propuesta_ajuste=d['propuesta_ajuste'],
        fase_detectada=f'Fase 3 -> {tipo_impacto}',
    )


COACH_DEFAULTS = {
    'estrategico_critico': {
        'mensaje_gancho': 'Tu prioridad del año está perdiendo tracción y el tiempo no espera.',
        'texto_interpretacion': 'Las tareas que conectan directamente con tu Meta Anual se están acumulando sin resolver. Cuando lo estratégico se posterpa, el avance real se detiene aunque el resto del tablero se mueva.',
        'analisis_vector': {
            'que_hizo_bien': 'Definiste una meta anual clara y comenzaste a desglosarla.',
            'que_hizo_mal': 'Múltiples tareas conectadas a la meta quedaron sin completar.',
            'significado_avance': 'Cada tarea estratégica pendiente retrasa tu hito mensual y compromete el cierre anual.',
        },
    },
    'estructural': {
        'mensaje_gancho': 'Tu semana está sobrepasando tu capacidad real de ejecución.',
        'texto_interpretacion': 'Planificaste al menos un 30% más de lo que puedes ejecutar y el cumplimiento en las últimas 48 horas cayó por debajo del 60%. El exceso de carga no acelera resultados, los fragmenta.',
        'analisis_vector': {
            'que_hizo_bien': 'Estás usando la planificación semanal de forma activa y registrando tu avance.',
            'que_hizo_mal': 'Sobrecargaste la semana muy por encima de tu capacidad real de ejecución.',
            'significado_avance': 'Horas mal asignadas reducen tu avance real en los objetivos que importan.',
        },
    },
    'de_prioridad': {
        'mensaje_gancho': 'El backlog crece más rápido de lo que se vacía.',
        'texto_interpretacion': 'Tienes tareas acumuladas que no se están resolviendo. La acumulación dispersa tu atención y convierte lo urgente en excusa para no hacer lo importante.',
        'analisis_vector': {
            'que_hizo_bien': 'Sigues registrando tareas, lo que indica compromiso con la organización.',
            'que_hizo_mal': 'No se está cerrando el ciclo de las tareas registradas. Entran más de las que salen.',
            'significado_avance': 'Un backlog creciente absorbe energía mental que debería ir a tus metas estratégicas.',
        },
    },
}


def generar_payload_coach(user, tipo_impacto, tipo_alerta, meta_anual=None, metricas=None, tareas=None):
    """
    Genera el payload completo de intervención según la especificación del sistema.
    Llama a Groq si hay API key, o usa defaults estructurados.
    """
    meta_anual_text = 'No definida'
    if meta_anual and meta_anual.get('texto_meta'):
        meta_anual_text = meta_anual['texto_meta']

    d = COACH_DEFAULTS.get(tipo_impacto, COACH_DEFAULTS['de_prioridad'])

    api_key = getattr(settings, 'GROQ_API_KEY', '')
    if api_key:
        try:
            prompt = COACH_PROMPT_TEMPLATE.format(
                meta_anual=meta_anual_text,
                tipo_alerta=tipo_alerta,
                metricas=json.dumps(metricas or {}, indent=2, ensure_ascii=False),
                tareas_backlog=json.dumps(tareas or [], indent=2, ensure_ascii=False),
            )
            body = json.dumps({
                'model': 'llama-3.3-70b-versatile',
                'messages': [{'role': 'user', 'content': prompt}],
            }).encode()
            req = urllib.request.Request(
                'https://api.groq.com/openai/v1/chat/completions',
                data=body,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {api_key}',
                    'User-Agent': 'Mozilla/5.0',
                },
                method='POST',
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read())
            text = data['choices'][0]['message']['content']
            import re
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if json_match:
                payload = json.loads(json_match.group())
                return _validar_payload(payload, d)
        except Exception as e:
            logger.exception('Error generando payload IA coach')

    return _build_default_payload(tipo_alerta, d)


COACH_PROMPT_TEMPLATE = """
Eres el motor central de IA de Focusia, un Coach Estratégico Directivo.

DATOS DE ENTRADA:
- Meta Anual: {meta_anual}
- Tipo de Alerta Detectada: {tipo_alerta}
- Métricas de Ejecución: {metricas}
- Tareas en Backlog: {tareas_backlog}

REGLAS DE TONO:
1. PROHIBIDO: "fallaste", "no cumpliste", "debes esforzarte más", "mal" o lenguaje punitivo.
2. OBLIGATORIO: Enfocar el impacto como consecuencia de decisiones, no como fallo personal.
3. "texto_interpretacion" máximo 250 caracteres (2-3 líneas).

Genera UNICAMENTE un JSON con esta estructura exacta (sin texto adicional):
{{
  "mensaje_gancho": "[impacto inmediato, una línea contundente]",
  "texto_interpretacion": "[interpretación coach, max 250 chars]",
  "analisis_vector": {{
    "que_hizo_bien": "[lo rescatable de su ejecución]",
    "que_hizo_mal": "[causa raíz de la desviación]",
    "significado_avance": "[consecuencia directa sobre su hito mensual/anual]"
  }}
}}
"""


def _validar_payload(payload, defaults):
    return {
        'mensaje_gancho': payload.get('mensaje_gancho', defaults['mensaje_gancho']),
        'texto_interpretacion': payload.get('texto_interpretacion', defaults['texto_interpretacion'])[:250],
        'analisis_vector': {
            'que_hizo_bien': (payload.get('analisis_vector', {}) or {}).get('que_hizo_bien', defaults['analisis_vector']['que_hizo_bien']),
            'que_hizo_mal': (payload.get('analisis_vector', {}) or {}).get('que_hizo_mal', defaults['analisis_vector']['que_hizo_mal']),
            'significado_avance': (payload.get('analisis_vector', {}) or {}).get('significado_avance', defaults['analisis_vector']['significado_avance']),
        },
    }


def _build_default_payload(tipo_alerta, defaults):
    ACCIONES = {
        'ESTRATÉGICO_CRÍTICO': [
            {'accion_key': 'REORGANIZAR_SEMANA', 'texto_boton': 'Reorganizar mi semana con asistencia', 'sugiere_flujo_adaptativo': True},
            {'accion_key': 'MANTENER_PLAN', 'texto_boton': 'Mantener mi planificación actual', 'sugiere_flujo_adaptativo': False},
            {'accion_key': 'REVISAR_TARDE', 'texto_boton': 'Revisar más tarde', 'sugiere_flujo_adaptativo': False},
        ],
        'ESTRUCTURAL_SATURACIÓN': [
            {'accion_key': 'REORGANIZAR_SEMANA', 'texto_boton': 'Reorganizar mi semana con asistencia', 'sugiere_flujo_adaptativo': True},
            {'accion_key': 'MANTENER_PLAN', 'texto_boton': 'Mantener mi planificación actual', 'sugiere_flujo_adaptativo': False},
            {'accion_key': 'REVISAR_TARDE', 'texto_boton': 'Revisar más tarde', 'sugiere_flujo_adaptativo': False},
        ],
        'PRIORIDAD_REORGANIZACIÓN': [
            {'accion_key': 'REVISAR_BACKLOG', 'texto_boton': 'Revisar backlog y priorizar', 'sugiere_flujo_adaptativo': True},
            {'accion_key': 'IGNORAR', 'texto_boton': 'Ignorar sugerencia', 'sugiere_flujo_adaptativo': False},
            {'accion_key': 'REVISAR_TARDE', 'texto_boton': 'Revisar más tarde', 'sugiere_flujo_adaptativo': False},
        ],
    }

    return {
        'bloque_1_impacto_inmediato': {
            'mensaje_gancho': defaults['mensaje_gancho'],
        },
        'bloque_3_interpretacion_ia': {
            'texto_interpretacion': defaults['texto_interpretacion'],
            'analisis_vector': {
                'que_hizo_bien': defaults['analisis_vector']['que_hizo_bien'],
                'que_hizo_mal': defaults['analisis_vector']['que_hizo_mal'],
                'significado_avance': defaults['analisis_vector']['significado_avance'],
            },
        },
        'bloque_4_acciones_disponibles': ACCIONES.get(tipo_alerta, ACCIONES['PRIORIDAD_REORGANIZACIÓN']),
    }
