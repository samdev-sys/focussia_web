"""Asistente IA del panel de administración.

Lo usa el administrador para vigilar el progreso de las personas usuarias:
nivel alcanzado (mes del programa), capacitaciones completadas y estado de
la membresía. Todo lo que la IA dice se calcula primero con reglas sobre la
base de datos; Groq solo redacta el análisis y responde el chat. Si no hay
`GROQ_API_KEY`, se devuelve el resumen por reglas sin romper nada.
"""

import json
import logging
import urllib.request

from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


# ── Nivel por mes alcanzado ──

def mes_alcanzado(user):
    """Mes más alto con capacitación completada. 0 = aún no completa el mes 1."""
    from ..models import UserTrainingProgress
    numeros = (
        UserTrainingProgress.objects
        .filter(user=user, completado=True)
        .values_list('training__month__month_number', flat=True)
    )
    return max(numeros, default=0)


def recursos_desbloqueados(nivel):
    """Meses accesibles para ese nivel. El mes 1 siempre está abierto."""
    return list(range(1, max(nivel, 1) + 1))


# ── Resúmenes por reglas (siempre disponibles, sin IA) ──

def resumen_usuario(user):
    """Ficha de progreso de un usuario para el panel y para la IA."""
    from ..models import Membresia, MonthlyTraining
    from .asignaciones import resumen_asignaciones

    nivel = mes_alcanzado(user)
    total = MonthlyTraining.objects.count()
    hechas = user.training_progress.filter(completado=True).count()

    membresias = list(user.membresias.order_by('-fecha_inicio')[:5])
    actual = next((m for m in membresias if m.estado == 'vigente'), None)
    if actual is None and membresias:
        actual = membresias[0]

    ultima = (
        user.training_progress.filter(completado=True)
        .order_by('-completado_en').first()
    )

    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'is_staff': user.is_staff,
        'fecha_ingreso': user.date_joined.date().isoformat(),
        'nivel': nivel,
        'mes_alcanzado': nivel,
        'capacitaciones_completadas': hechas,
        'capacitaciones_totales': total,
        'recursos_desbloqueados': recursos_desbloqueados(nivel),
        'ultima_actividad': (
            ultima.completado_en.isoformat() if ultima and ultima.completado_en else None
        ),
        'membresia': (
            {
                'id': actual.id,
                'fecha_inicio': actual.fecha_inicio.isoformat(),
                'fecha_fin': actual.fecha_fin.isoformat(),
                'estado': actual.estado,
                'dias_restantes': actual.dias_restantes,
                'nota': actual.nota,
            } if actual else None
        ),
        'sin_membresia': actual is None,
        'asignaciones': resumen_asignaciones(user),
    }


def resumen_global(limite_rezagados=10):
    """Foto general para el chat de la IA: totales, niveles y alertas."""
    from django.contrib.auth import get_user_model
    from ..models import Membresia

    User = get_user_model()
    usuarios = list(User.objects.filter(is_staff=False).order_by('id'))
    fichas = [resumen_usuario(u) for u in usuarios]

    niveles: dict[int, int] = {}
    for f in fichas:
        niveles[f['nivel']] = niveles.get(f['nivel'], 0) + 1

    hoy = timezone.localdate()
    vencidas = Membresia.objects.filter(fecha_fin__lt=hoy).count()
    vigentes = Membresia.objects.filter(
        fecha_inicio__lte=hoy, fecha_fin__gte=hoy).count()
    por_vencer = Membresia.objects.filter(
        fecha_inicio__lte=hoy, fecha_fin__gte=hoy,
        fecha_fin__lte=hoy + timezone.timedelta(days=7)).count()
    sin_membresia = sum(1 for f in fichas if f['sin_membresia'])

    rezagados = sorted(
        (f for f in fichas if f['capacitaciones_completadas'] == 0),
        key=lambda f: f['fecha_ingreso'],
    )[:limite_rezagados]

    return {
        'total_usuarios': len(fichas),
        'por_nivel': niveles,
        'membresias_vigentes': vigentes,
        'membresias_vencidas': vencidas,
        'membresias_por_vencer_7d': por_vencer,
        'usuarios_sin_membresia': sin_membresia,
        'rezagados': [
            {'username': f['username'], 'ingreso': f['fecha_ingreso'],
             'membresia': f['membresia']} for f in rezagados
        ],
    }


def analisis_por_reglas(ficha):
    """Texto de respaldo cuando Groq no está disponible."""
    m = ficha['membresia']
    if m:
        mem = (f"membresía {m['estado']} hasta {m['fecha_fin']}"
               f" ({m['dias_restantes']} días restantes)")
    else:
        mem = 'sin membresía registrada'
    return (
        f"{ficha['username']} está en nivel {ficha['nivel']} "
        f"(mes alcanzado {ficha['mes_alcanzado']}, "
        f"{ficha['capacitaciones_completadas']}/{ficha['capacitaciones_totales']} "
        f"capacitaciones), con {mem}. "
        f"Recursos desbloqueados: meses {ficha['recursos_desbloqueados']}. "
        + (
            'Recomendación: revisar su actividad reciente y extender la membresía '
            'si está por vencer.' if (not m or m['estado'] != 'vigente')
            else 'Recomendación: motivar el avance al siguiente mes.'
        )
    )


# ── Groq ──

PROMPT_ASISTENTE = """
Eres el asistente del administrador de Focusia, una app de dirección
estratégica personal. Hablas español, breve y directo (máximo 3 párrafos).

Recibes la ficha de progreso de un usuario (nivel = mes del programa
alcanzado, capacitaciones completadas, membresía con inicio/fin/estado) o la
foto global de todos los usuarios. Con eso debes:

1. Decir en qué nivel está y qué recursos tiene desbloqueados.
2. Alertar si la membresía está vencida, por vencer (7 días) o ausente.
3. Recomendar una acción concreta al administrador (extender, contactar, motivar).

No inventes datos que no estén en la ficha. Si algo falta, dilo.
""".strip()


def _call_groq(messages, temperature=0.5, max_tokens=500):
    api_key = getattr(settings, 'GROQ_API_KEY', '')
    if not api_key:
        return None
    payload = json.dumps({
        'model': 'openai/gpt-oss-120b',
        'messages': messages,
        'temperature': temperature,
        'max_tokens': max_tokens,
    }).encode('utf-8')
    req = urllib.request.Request(
        'https://api.groq.com/openai/v1/chat/completions',
        data=payload,
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
            'User-Agent': 'curl/8.4.0',
        },
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return data['choices'][0]['message']['content']
    except Exception:
        logger.exception('[ADMIN-IA] Error llamando a Groq')
        return None


def analizar_usuario(ficha):
    """Análisis IA de un usuario. Devuelve (texto, fuente)."""
    texto = _call_groq([
        {'role': 'system', 'content': PROMPT_ASISTENTE},
        {'role': 'user', 'content':
         'Analiza este usuario y dame su nivel, estado de membresía y '
         f'una recomendación: {json.dumps(ficha)}'},
    ])
    if texto:
        return texto, 'groq'
    return analisis_por_reglas(ficha), 'reglas'


def chatear(pregunta, historial=None):
    """Chat del admin con la IA, con la foto global como contexto."""
    contexto = resumen_global()
    mensajes = [{'role': 'system', 'content': PROMPT_ASISTENTE},
                {'role': 'user', 'content':
                 f'Contexto actual de usuarios: {json.dumps(contexto)}'}]
    for h in (historial or [])[-6:]:
        if h.get('rol') in ('admin', 'ia') and h.get('texto'):
            mensajes.append({
                'role': 'user' if h['rol'] == 'admin' else 'assistant',
                'content': str(h['texto'])[:2000],
            })
    mensajes.append({'role': 'user', 'content': pregunta[:2000]})
    texto = _call_groq(mensajes, max_tokens=600)
    if texto:
        return texto, 'groq'
    return (
        'La IA no está disponible (sin GROQ_API_KEY). Datos actuales: '
        f"{contexto['total_usuarios']} usuarios, "
        f"{contexto['membresias_vigentes']} membresías vigentes, "
        f"{contexto['membresias_vencidas']} vencidas, "
        f"{contexto['usuarios_sin_membresia']} sin membresía.",
        'reglas',
    )
