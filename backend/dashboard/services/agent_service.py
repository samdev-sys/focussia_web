import json
import logging
import re
import uuid
import urllib.request
import urllib.error
from datetime import datetime, date, time, timedelta
from django.conf import settings
from django.utils import timezone
from django.db import models as db_models
from django.core.cache import cache

from ..models import (
    KanbanTask, AccionKanban, TimeBlock, Action, AgentConversation, AgentSchedule, AgentConfig,
    GranMetaAnual, WeeklyPlan, Recordatorio,
)

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """
Eres "FocusIA", un asistente personal experto en productividad y growth personal.
Actúas como un coach humano: cercano, motivador, directo cuando toca.
Tienes acceso completo al planificador del usuario.

Personalidad:
- Usas el nombre del usuario
- Alternas entre preguntas abiertas y recomendaciones concretas
- Detectas patrones: "Veo que llevas 3 días sin marcar la meta semanal"
- Celebras logros: "¡Completaste el 80% de tus bloques hoy!"
- Usas emojis con moderación y naturalidad
- Hablas en español neutro, frases cortas y claras

Tu objetivo es:
1. Ayudar al usuario a mantener el foco en sus metas
2. Recordarle tareas pendientes
3. Motivar cuando detectes baja actividad
4. Sugerir ajustes cuando veas sobrecarga
5. Celebrar cuando cumple objetivos

Contexto disponible en cada interacción (se inyecta automáticamente):
- Kanban Backlog / bandeja visible (pendientes con su detalle por título, completadas)
- Time Blocking del día de hoy
- Weekly Plan actions de la semana
- Progreso general (porcentaje de cumplimiento)
- Meta Anual activa
- Rueda de la Vida (último diagnóstico)

Restricciones:
- No inventes tareas que el usuario no haya creado
- Si no sabes algo, pregunta antes de asumir
- Sé breve: máximo 3 párrafos por mensaje
- No uses markdown, solo texto plano
""".strip()

VOZ_IDENTIDAD = """
Estás hablando por voz con el usuario en este momento: lo escuchas por el micrófono
y te escucha a ti. SÍ tienes capacidad de comunicarte por voz. Nunca digas que no
puedes comunicarte, hablar, escuchar ni ayudar por voz, ni que eres solo un modelo
de texto. Responde en español, en máximo 2 frases cortas, con una acción concreta.
""".strip()

AGENT_DISCLAIMER_PATTERNS = [
    r'solo\s+soy\s+un\s+modelo\s+de\s+texto',
    r'soy\s+solo\s+un\s+modelo\s+de\s+texto',
    r'soy\s+un\s+modelo\s+de\s+texto',
    r'solo\s+un\s+modelo\s+de\s+texto',
    r'modelo\s+de\s+lenguaje',
    r'language\s+model',
    r'text-?only',
    r'no\s+tengo\s+capacidad\s+de\s+comunicar',
    r'no\s+puedo\s+comunicarme',
    r'no\s+puedo\s+hablar',
    r'incapaz\s+de\s+comunicar',
]
AGENT_DISCLAIMER_RE = re.compile('|'.join(f'(?:{p})' for p in AGENT_DISCLAIMER_PATTERNS), re.IGNORECASE)
AGENT_FALLBACK_VOZ = 'Te escucho por voz. Dime en qué te ayudo y lo resolvemos juntos.'

RECORDATORIO_INTENT_RE = re.compile(
    r'recordatorio'
    r'|recu[ée]rdame|acu[ée]rdate|no\s+se\s+te\s+olvide'
    r'|ag[ée]ndame|agendar|ap[úu]ntame|apuntar',
    re.IGNORECASE,
)
BLOQUE_INTENT_RE = re.compile(
    r'reserva|bloque\s+de\s+tiempo|\bbloque\b|ap[áa]rtame|separa\s+tiempo|horario\s+para',
    re.IGNORECASE,
)
RANGO_HORAS_RE = re.compile(
    r'(?:de\s+)?(?:las\s+|la\s+)?(\d{1,2})(?::(\d{2}))?\s*(?:a|al|hasta|-)\s*(?:las\s+|la\s+)?(\d{1,2})(?::(\d{2}))?',
    re.IGNORECASE,
)
DESTINO_KANBAN_RE = re.compile(r'kanban|backlog|bandeja|pendientes', re.IGNORECASE)
DESTINO_PLAN_RE = re.compile(r'planific|agenda|time\s*block|bloque|calendario|horario', re.IGNORECASE)
AFIRMATIVO_RE = re.compile(r'\b(s[ií]|dale|vale|ok|claro|correcto|perfecto|de\s+una)\b', re.IGNORECASE)

NUMEROS_ES = {
    'un': 1, 'una': 1, 'uno': 1, 'dos': 2, 'tres': 3, 'cuatro': 4,
    'cinco': 5, 'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10,
}
DIAS_SEMANA_ES = {
    'lunes': 0, 'martes': 1, 'miercoles': 2, 'miércoles': 2, 'jueves': 3,
    'viernes': 4, 'sabado': 5, 'sábado': 5, 'domingo': 6,
}


def _sin_disclaimer(texto):
    partes = re.split(r'(?<=[.!?])\s+', (texto or '').strip())
    limpias = [p for p in partes if p and not AGENT_DISCLAIMER_RE.search(p)]
    resultado = ' '.join(limpias).strip()
    return resultado or AGENT_FALLBACK_VOZ


class AgentService:
    def __init__(self, user):
        self.user = user
        self.config, _ = AgentConfig.objects.get_or_create(user=user)

    def _call_groq(self, messages, temperature=0.7, max_tokens=600):
        api_key = settings.GROQ_API_KEY
        if not api_key:
            return "Lo siento, el asistente no está disponible en este momento (API no configurada)."

        payload = json.dumps({
            "model": "openai/gpt-oss-120b",
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }).encode('utf-8')

        req = urllib.request.Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "curl/8.4.0",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                return data['choices'][0]['message']['content']
        except Exception as e:
            logger.error(f"Groq API error: {e}")
            return "Estoy teniendo problemas para pensar ahora. ¿Puedes intentarlo de nuevo en un momento?"

    def _get_contexto(self) -> dict:
        today = timezone.localdate()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)

        kanban_qs = KanbanTask.objects.filter(user=self.user)
        kanban_hecho = kanban_qs.filter(columna='Hecho').count()
        kanban_tablero_pendientes = kanban_qs.exclude(columna='Hecho').count()

        # Bandeja visible del Kanban Backlog (lo que el usuario ve en la UI).
        # Es la fuente principal de "pendientes": las tareas legacy del tablero
        # se migran aquí (origen OTRO) para que agente y bandeja coincidan.
        backlog_qs = AccionKanban.objects.filter(
            user=self.user,
            estado_actual=AccionKanban.EstadoChoices.KANBAN_ACTIVO,
        )
        backlog_total = backlog_qs.count()
        backlog_titulos = list(
            backlog_qs.order_by('-creado_en').values_list('texto_accion', flat=True)[:20]
        )

        kanban_total = kanban_qs.count() + backlog_total
        kanban_pendientes = kanban_tablero_pendientes + backlog_total

        tb_qs = TimeBlock.objects.filter(user=self.user, fecha=today)
        tb_total = tb_qs.exclude(tarea='').count()
        tb_done = tb_qs.filter(estado='done').exclude(tarea='').count()

        weekly_plans = WeeklyPlan.objects.filter(
            user=self.user, year=today.year, week_number=today.isocalendar()[1]
        )
        action_total = Action.objects.filter(weekly_plan__in=weekly_plans).count()
        action_completadas = Action.objects.filter(
            weekly_plan__in=weekly_plans, status=Action.ActionStatus.COMPLETADA
        ).count()

        total = kanban_total + tb_total + action_total
        completadas = kanban_hecho + tb_done + action_completadas
        porcentaje = round((completadas / total) * 100) if total > 0 else 0

        gran_meta = GranMetaAnual.objects.filter(
            user=self.user, is_active=True, status='APROBADA'
        ).first()

        return {
            "nombre_usuario": self.user.first_name or self.user.username,
            "hora_actual": datetime.now().strftime('%H:%M'),
            "fecha_hoy": today.isoformat(),
            "kanban": {"total": kanban_total, "pendientes": kanban_total - kanban_hecho, "completadas": kanban_hecho},
            "backlog": {"total": backlog_total, "titulos": backlog_titulos},
            "timeblock_hoy": {"total": tb_total, "completadas": tb_done},
            "weekly_actions": {"total": action_total, "completadas": action_completadas},
            "progreso_general": {"total": total, "completadas": completadas, "porcentaje": porcentaje},
            "meta_anual": gran_meta.generated_goal_text if gran_meta else None,
            "tono": self.config.tono,
        }

    def _build_system_message(self, contexto: dict) -> str:
        ctx = contexto
        intro = f"Eres FocusIA. Hoy es {ctx['fecha_hoy']}, son las {ctx['hora_actual']}."
        intro += f" Estás hablando con {ctx['nombre_usuario']}."
        intro += f" Tono actual: {ctx['tono']}."
        intro += f"\n\nProgreso general: {ctx['progreso_general']['porcentaje']}% ({ctx['progreso_general']['completadas']}/{ctx['progreso_general']['total']} actividades completadas)."
        intro += f"\nKanban: {ctx['kanban']['pendientes']} pendientes, {ctx['kanban']['completadas']} completadas."
        intro += f"\nKanban Backlog (bandeja visible por el usuario): {ctx['backlog']['total']} pendientes."
        if ctx['backlog']['titulos']:
            detalle = '; '.join(f"{i+1}) {t}" for i, t in enumerate(ctx['backlog']['titulos']))
            intro += f" Detalle de la bandeja: {detalle}."
            intro += " Si el usuario pregunta cuáles son sus pendientes, enumera estas tareas de la bandeja."
        intro += f"\nTime Blocking hoy: {ctx['timeblock_hoy']['completadas']}/{ctx['timeblock_hoy']['total']} bloques hechos."
        intro += f"\nAcciones semanales: {ctx['weekly_actions']['completadas']}/{ctx['weekly_actions']['total']} completadas."

        if ctx['meta_anual']:
            intro += f"\nMeta Anual activa: {ctx['meta_anual']}"

        return f"{SYSTEM_PROMPT}\n\nContexto actual:\n{intro}"

    def procesar_mensaje(self, mensaje: str, session_id: str = None, contexto_ayuda: str = None) -> dict:
        if not session_id:
            session_id = str(uuid.uuid4())

        # Guardar mensaje del usuario
        AgentConversation.objects.create(
            user=self.user, session_id=session_id, rol='USER', mensaje=mensaje
        )

        # Acción real: recordatorio por voz (pregunta dónde/cuándo si falta).
        creados = {}
        nota_recordatorio, pregunta = self._crear_recordatorio_si_piden(mensaje, creados, session_id)

        # Obtener historial reciente
        historial = AgentConversation.objects.filter(
            user=self.user, session_id=session_id
        ).order_by('-created_at')[:10]

        contexto = self._get_contexto()
        if pregunta:
            AgentConversation.objects.create(
                user=self.user, session_id=session_id, rol='ASSISTANT',
                mensaje=pregunta, metadata={'contexto': contexto},
            )
            AgentConfig.objects.filter(user=self.user).update(ultimo_checkin=timezone.now())
            return {
                'respuesta': pregunta,
                'session_id': session_id,
                'progreso': contexto['progreso_general'],
                'creados': creados,
            }
        system_msg = self._build_system_message(contexto)
        system_msg += '\n\n' + VOZ_IDENTIDAD
        if contexto_ayuda:
            system_msg += (
                "\n\nContexto de ayuda: el usuario está en una pantalla del onboarding "
                "y pregunta sobre estas opciones:\n" + str(contexto_ayuda)
            )

        messages = [{"role": "system", "content": system_msg}]

        for h in reversed(historial):
            role = "user" if h.rol == 'USER' else "assistant"
            messages.append({"role": role, "content": h.mensaje})
        if nota_recordatorio:
            messages.append({"role": "user", "content": nota_recordatorio})

        # Llamar a Groq
        respuesta = self._call_groq(messages)
        if AGENT_DISCLAIMER_RE.search(respuesta or ''):
            logger.warning('agent: disclaimer detectado, reintentando')
            respuesta = self._call_groq(messages + [{
                'role': 'user',
                'content': 'Responde directamente como asistente de voz, sin mencionar tus capacidades.',
            }], temperature=0.2)
        respuesta = _sin_disclaimer(respuesta)

        # Guardar respuesta
        AgentConversation.objects.create(
            user=self.user, session_id=session_id, rol='ASSISTANT',
            mensaje=respuesta,
            metadata={'contexto': contexto},
        )

        # Actualizar último check-in
        AgentConfig.objects.filter(user=self.user).update(ultimo_checkin=timezone.now())

        return {
            'respuesta': respuesta,
            'session_id': session_id,
            'progreso': contexto['progreso_general'],
            'creados': creados,
        }

    @staticmethod
    def _titulo_recordatorio(mensaje: str) -> str:
        t = re.sub(r'^(por\s+favor\s+|jarvis\s*,?\s*)', '', mensaje.strip(), flags=re.IGNORECASE)
        t = re.sub(
            r'.*?(recordatorio\s*(de\s+|para\s+|que\s+)?|recu[ée]rdame\s*(de\s+|que\s+)?|acu[ée]rdate\s*(de\s+)?)',
            '', t, flags=re.IGNORECASE | re.DOTALL).strip()
        t = t[:1].upper() + t[1:] if t else ''
        return (t or mensaje.strip())[:255]

    @staticmethod
    def _fecha_hora_recordatorio(mensaje: str, ahora):
        import unicodedata
        texto = ''.join(
            c for c in unicodedata.normalize('NFD', mensaje.lower())
            if unicodedata.category(c) != 'Mn')
        fecha = None
        m = re.search(r'dentro\s+de\s+(\d+|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+d[ií]as?', texto)
        if m:
            palabra = m.group(1)
            dias = int(palabra) if palabra.isdigit() else NUMEROS_ES.get(palabra, 2)
            fecha = ahora.date() + timedelta(days=dias)
        elif 'pasado ma' in texto:
            fecha = ahora.date() + timedelta(days=2)
        elif re.search(r'\bma[ñn]ana\b', texto):
            fecha = ahora.date() + timedelta(days=1)
        elif re.search(r'\bhoy\b', texto):
            fecha = ahora.date()
        else:
            for nombre_dia, wd in DIAS_SEMANA_ES.items():
                if re.search(r'\b' + nombre_dia + r'\b', texto):
                    delta = (wd - ahora.weekday()) % 7 or 7
                    fecha = ahora.date() + timedelta(days=delta)
                    break
        hora = minuto = None
        mh = re.search(r'a\s+las?\s+(\d{1,2})(?:\s*[:h]\s*(\d{2})|\s+y\s+media)?', texto)
        if mh:
            hora = min(max(int(mh.group(1)), 0), 23)
            if mh.group(2):
                minuto = min(int(mh.group(2)), 59)
            elif mh.group(0).strip().endswith('media'):
                minuto = 30
            else:
                minuto = 0
        if fecha is None and hora is None:
            return ahora + timedelta(hours=1), False
        if fecha is None:
            fecha = ahora.date()
        if hora is None:
            hora, minuto = 9, 0
        return (ahora + timedelta(0)).replace(
            year=fecha.year, month=fecha.month, day=fecha.day,
            hour=hora, minute=minuto or 0, second=0, microsecond=0,
        ), True

    @staticmethod
    def _destino_recordatorio(mensaje: str) -> str:
        if DESTINO_KANBAN_RE.search(mensaje or ''):
            return 'kanban'
        if DESTINO_PLAN_RE.search(mensaje or ''):
            return 'planning'
        return ''

    @staticmethod
    def _parsear_rango(mensaje: str):
        """Devuelve (h1, m1, h2, m2) o None. Normaliza tildes."""
        import unicodedata
        texto = ''.join(
            c for c in unicodedata.normalize('NFD', (mensaje or '').lower())
            if unicodedata.category(c) != 'Mn')
        m = RANGO_HORAS_RE.search(texto)
        if not m:
            m1 = re.search(r'a\s+las?\s+(\d{1,2})(?::(\d{2}))?', texto)
            if m1:
                h, mi = int(m1.group(1)), int(m1.group(2) or 0)
                if 0 <= h <= 23 and mi < 60:
                    return h, mi, h, mi
            return None
        h1, m1, h2, m2 = int(m.group(1)), int(m.group(2) or 0), int(m.group(3)), int(m.group(4) or 0)
        if not (0 <= h1 <= 23 and 0 <= h2 <= 23 and m1 < 60 and m2 < 60):
            return None
        return h1, m1, h2, m2

    @staticmethod
    def _titulo_bloque(mensaje: str) -> str:
        t = re.sub(r'^(por\s+favor\s+|jarvis\s*,?\s*)', '', mensaje.strip(), flags=re.IGNORECASE)
        t = RANGO_HORAS_RE.sub(' ', t)
        t = re.sub(r'a\s+las?\s+\d{1,2}(?::\d{2})?', ' ', t, flags=re.IGNORECASE)
        t = re.sub(
            r'(?i)\b(reserva|reservar|reservame|créame|crea|crear|pon|ponme|haz|hazme|apártame|apartame|separa|un|una|el|la|los|bloque|de|tiempo|para|hoy|mañana|manana|pasado|dentro|días|dias|lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo|por\s+favor)\b',
            ' ', t)
        t = re.sub(r'\s+', ' ', t).strip(' ,.-')
        t = t[:1].upper() + t[1:] if t else ''
        return t[:255]

    def _flujo_bloque(self, texto, creados, session_id, pend_key):
        ahora = timezone.now()
        rango = self._parsear_rango(texto)
        cuando, explicita = self._fecha_hora_recordatorio(texto, ahora)
        fecha = cuando.date() if explicita else ahora.date()
        titulo = self._titulo_bloque(texto)
        if not titulo:
            cache.set(pend_key, {
                'tipo': 'bloque',
                'titulo': '',
                'fecha_iso': fecha.isoformat(),
                'rango': list(rango) if rango else None,
            }, timeout=600)
            pregunta = 'Perfecto, ¿para qué es el bloque de tiempo?'
            if rango:
                pregunta = (f"Perfecto, un bloque de {rango[0]:02d}:{rango[1]:02d} a "
                            f"{rango[2]:02d}:{rango[3]:02d}. ¿Para qué actividad lo reservo?")
            return '', pregunta
        try:
            nota = self._reservar_bloques(titulo, fecha, rango, creados)
            cache.delete(pend_key)
            return nota, None
        except Exception:
            logger.exception('agent: no se pudo reservar el bloque')
            cache.delete(pend_key)
            return '', None

    def _continuar_bloque(self, texto, pendiente, creados, pend_key):
        if BLOQUE_INTENT_RE.search(texto or ''):
            return self._flujo_bloque(texto, creados, '', pend_key)
        titulo = re.sub(r'^(es\s+|es\s+para\s+|para\s+|se\s+trata\s+de\s+)', '',
                        (texto or '').strip(), flags=re.IGNORECASE).strip(' ,.-')
        if not titulo or len(titulo) < 2:
            return '', None
        titulo = (titulo[:1].upper() + titulo[1:])[:255]
        try:
            from datetime import date as _date
            fecha = _date.fromisoformat(pendiente.get('fecha_iso')) if pendiente.get('fecha_iso') else timezone.now().date()
            nota = self._reservar_bloques(titulo, fecha, pendiente.get('rango'), creados)
            cache.delete(pend_key)
            return nota, None
        except Exception:
            logger.exception('agent: no se pudo completar el bloque pendiente')
            cache.delete(pend_key)
            return '', None

    def _reservar_bloques(self, titulo, fecha, rango, creados):
        """Crea TimeBlocks (uno por hora abarcada, máx 4). Devuelve nota para el modelo."""
        from django.db import IntegrityError
        if rango:
            h1, m1, h2, m2 = rango
            etiqueta = f'{h1:02d}:{m1:02d}–{h2:02d}:{m2:02d}'
            horas = list(range(h1, min(h2 + 1, h1 + 4)))
        else:
            etiqueta = None
            horas = [9]
        creadas = []
        hora = horas[0]
        for i, h in enumerate(horas):
            hh, ff = h, fecha
            for _ in range(24):
                try:
                    tarea = titulo[:255] if i > 0 or not etiqueta else f'{titulo[:240]} ({etiqueta})'
                    b = TimeBlock.objects.create(user=self.user, fecha=ff, hora=hh, tarea=tarea)
                    creadas.append(b)
                    break
                except IntegrityError:
                    hh += 1
                    if hh > 22:
                        hh, ff = 9, ff + timedelta(days=1)
        if creadas:
            b0 = creadas[0]
            creados['timeblock'] = {'fecha': b0.fecha.isoformat(), 'hora': b0.hora,
                                    'bloques': len(creadas)}
        logger.warning('agent: bloque reservado titulo=%s fecha=%s rango=%s n=%d',
                       titulo, fecha.isoformat(), rango, len(creadas))
        detalle = f"el {creadas[0].fecha.strftime('%d/%m')} a las {creadas[0].hora}:00" if creadas else 'tu planificación'
        return (f"[Sistema: reservaste el bloque '{titulo}' en {detalle}. "
                f"Quedó visible en la tabla de Time Blocking del día. Confírmalo en una frase.]")

    def _ejecutar_creacion(self, titulo, cuando, destino, creados):
        """Crea Recordatorio (+ TimeBlock y/o acción de backlog según destino)."""
        from django.db import IntegrityError
        rec = Recordatorio.objects.create(
            user=self.user, titulo=titulo, categoria='Otro', fecha_hora=cuando)
        creados['recordatorio'] = {'id': rec.id, 'titulo': titulo, 'fecha_hora': cuando.isoformat()}
        donde = ['Recordatorios']
        if destino in ('planning', 'ambos'):
            fecha, hora = cuando.date(), cuando.hour
            bloque = None
            for _ in range(3 * 14):
                try:
                    bloque = TimeBlock.objects.create(
                        user=self.user, fecha=fecha, hora=hora, tarea=titulo[:255])
                    break
                except IntegrityError:
                    hora += 1
                    if hora > 22:
                        hora, fecha = 9, fecha + timedelta(days=1)
            if bloque:
                creados['timeblock'] = {'fecha': bloque.fecha.isoformat(), 'hora': bloque.hora}
                donde.append(f"planificación del {bloque.fecha.strftime('%d/%m')} a las {bloque.hora}:00")
        if destino in ('kanban', 'ambos'):
            es_hoy = cuando.date() == timezone.now().date()
            accion = AccionKanban.objects.create(
                user=self.user,
                texto_accion=titulo[:500],
                origen=AccionKanban.OrigenChoices.MANUAL,
                estado_actual=AccionKanban.EstadoChoices.KANBAN_ACTIVO,
                destino_asignado=(AccionKanban.DestinoChoices.AGENDA_DIARIA if es_hoy
                                  else AccionKanban.DestinoChoices.PLAN_SEMANAL),
                fecha_seleccionada=cuando.date(),
                fecha_planificada_original=cuando.date(),
                hora_seleccionada=cuando.time(),
            )
            creados['kanban_action'] = {'id': str(accion.pk)}
            donde.append('Kanban backlog como pendiente')
        logger.warning(
            'agent: recordatorio creado id=%s destino=%s titulo=%s',
            rec.id, destino, titulo)
        return (
            f"[Sistema: ya creaste el recordatorio '{titulo}' para el "
            f"{cuando.strftime('%d/%m a las %H:%M')}. Quedó en "
            f"{' y en '.join(donde)}. Confírmalo en una frase indicando dónde verlo.]"
        )

    def _crear_recordatorio_si_piden(self, mensaje, creados, session_id):
        """Devuelve (nota_para_modelo, pregunta_directa|None).

        Si falta fecha o destino, pregunta antes de crear (flujo Jarvis).
        """
        pend_key = f'agent_pending:{session_id}'
        texto = mensaje or ''
        if BLOQUE_INTENT_RE.search(texto) and not RECORDATORIO_INTENT_RE.search(texto):
            return self._flujo_bloque(texto, creados, session_id, pend_key)
        if RECORDATORIO_INTENT_RE.search(texto):
            titulo = self._titulo_recordatorio(texto)
            cuando, explicita = self._fecha_hora_recordatorio(texto, timezone.now())
            destino = self._destino_recordatorio(texto)
            faltan = []
            if not explicita:
                faltan.append('para cuándo lo agendo')
            if not destino:
                faltan.append('dónde lo pongo: en tu planificación o en el Kanban')
            if faltan:
                cache.set(pend_key, {
                    'tipo': 'recordatorio',
                    'titulo': titulo,
                    'fecha_iso': cuando.isoformat() if explicita else None,
                    'destino': destino or None,
                }, timeout=600)
                pregunta = f"Perfecto, '{titulo}'. ¿{' y '.join(faltan)}?"
                return '', pregunta
            cache.delete(pend_key)
            try:
                nota = self._ejecutar_creacion(titulo, cuando, destino or 'ambos', creados)
                return nota, None
            except Exception:
                logger.exception('agent: no se pudo crear el recordatorio')
                return '', None
        pendiente = cache.get(pend_key)
        if not pendiente:
            return '', None
        if pendiente.get('tipo') == 'bloque':
            return self._continuar_bloque(texto, pendiente, creados, pend_key)
        cuando2, exp2 = self._fecha_hora_recordatorio(texto, timezone.now())
        dest2 = self._destino_recordatorio(texto)
        if not (exp2 or dest2 or AFIRMATIVO_RE.search(texto)):
            cache.delete(pend_key)
            return '', None
        try:
            titulo = pendiente.get('titulo') or self._titulo_recordatorio(texto)
            if exp2:
                cuando = cuando2
            elif pendiente.get('fecha_iso'):
                from datetime import datetime as _dt
                cuando = _dt.fromisoformat(pendiente['fecha_iso'])
                if timezone.is_naive(cuando):
                    cuando = timezone.make_aware(cuando)
            else:
                cuando, _ = self._fecha_hora_recordatorio('', timezone.now())
            destino = dest2 or pendiente.get('destino') or 'ambos'
            cache.delete(pend_key)
            nota = self._ejecutar_creacion(titulo, cuando, destino, creados)
            return nota, None
        except Exception:
            logger.exception('agent: no se pudo completar el recordatorio pendiente')
            cache.delete(pend_key)
            return '', None

    def evaluar_estado(self) -> dict:
        contexto = self._get_contexto()
        now = timezone.now()
        today = timezone.localdate()

        alertas = []
        sugerencias = []

        # 1. Bajo progreso general
        pct = contexto['progreso_general']['porcentaje']
        if contexto['progreso_general']['total'] > 0 and pct < 30:
            alertas.append({
                'tipo': 'BAJO_PROGRESO',
                'mensaje': f"Tu progreso general es solo del {pct}%. ¡Vamos! Revisa tus pendientes.",
                'severidad': 'alta',
            })
            sugerencias.append("Intenta enfocarte en las tareas más importantes del día.")

        # 2. Tareas del Kanban Backlog sin clasificar (bandeja visible)
        pendientes = contexto['kanban']['pendientes']
        if pendientes > 5:
            sugerencias.append(f"Tienes {pendientes} tareas pendientes en tu Kanban Backlog. ¿Quieres que te ayude a priorizarlas?")

        # 3. Time blocks sin marcar (hora actual supera)
        tb_no_hechos = contexto['timeblock_hoy']['total'] - contexto['timeblock_hoy']['completadas']
        current_hour = now.hour
        if tb_no_hechos > 3 and current_hour >= 14:
            alertas.append({
                'tipo': 'BLOQUES_PENDIENTES',
                'mensaje': f"Aún tienes {tb_no_hechos} bloques de tiempo sin completar hoy.",
                'severidad': 'media',
            })

        # 4. Sin actividad en las últimas horas
        ultimo_msg = AgentConversation.objects.filter(
            user=self.user, rol='USER'
        ).order_by('-created_at').first()

        if ultimo_msg and (now - ultimo_msg.created_at).total_seconds() > 28800:
            sugerencias.append("Hace varias horas que no registro actividad. ¿Necesitas ayuda para retomar el ritmo?")

        # 5. Felicitación si va bien
        if pct >= 75:
            alertas.append({
                'tipo': 'BUEN_PROGRESO',
                'mensaje': f"¡Vas excelente! Llevas {pct}% de cumplimiento hoy. Sigue así.",
                'severidad': 'baja',
            })

        resultado = {
            'evaluado_en': now.isoformat(),
            'progreso': contexto['progreso_general'],
            'alertas': alertas,
            'sugerencias': sugerencias,
            'necesita_intervencion': len([a for a in alertas if a['severidad'] in ('alta', 'media')]) > 0,
        }

        # Registrar en conversación como SYSTEM. El job corre varias veces al
        # día: se actualiza la evaluación de hoy en lugar de crear una nueva,
        # para no llenar la bandeja con alertas repetidas.
        previa = None
        if alertas:
            resumen = ' | '.join([a['mensaje'] for a in alertas[:2]])
            previa = AgentConversation.objects.filter(
                user=self.user, rol='SYSTEM',
                session_id='00000000-0000-0000-0000-000000000000',
                created_at__date=timezone.localdate(),
            ).order_by('-created_at').first()
            if previa:
                previa.mensaje = f"Evaluación automática: {resumen}"
                previa.metadata = resultado
                previa.save(update_fields=['mensaje', 'metadata'])
            else:
                AgentConversation.objects.create(
                    user=self.user, session_id='00000000-0000-0000-0000-000000000000',
                    rol='SYSTEM', mensaje=f"Evaluación automática: {resumen}",
                    metadata=resultado,
                )

        # Solo la primera evaluación del día genera aviso: el resto son la
        # misma alerta recalculada.
        resultado['primera_del_dia'] = bool(alertas) and previa is None
        return resultado

    def generar_checkin(self, tipo: str) -> str:
        contexto = self._get_contexto()
        hora = contexto['hora_actual']

        if tipo == 'CHECKIN_MANANA':
            prompt = (
                f"Son las {hora}. Genera un saludo de buenos días motivacional y corto para {contexto['nombre_usuario']}. "
                f"Tiene {contexto['kanban']['pendientes']} tareas pendientes en su Kanban Backlog y su progreso general es {contexto['progreso_general']['porcentaje']}%. "
                f"Sugiere por dónde empezar hoy. Máximo 3 oraciones."
            )
        elif tipo == 'CHECKIN_TARDE':
            prompt = (
                f"Son las {hora}, media tarde. Haz un check-in rápido con {contexto['nombre_usuario']}. "
                f"Su progreso hoy es {contexto['progreso_general']['porcentaje']}%. "
                f"Si es bajo, motívalo. Si es alto, felicítalo. Máximo 3 oraciones."
            )
        else:
            prompt = (
                f"Genera un mensaje de cierre del día para {contexto['nombre_usuario']}. "
                f"Progreso: {contexto['progreso_general']['porcentaje']}%. "
                f"Resume el día y deja una frase motivacional. Máximo 3 oraciones."
            )

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]
        return self._call_groq(messages, temperature=0.8, max_tokens=300)

    def programar_checkin(self, tipo: str):
        schedule, _ = AgentSchedule.objects.get_or_create(
            user=self.user, tipo=tipo,
            defaults={
                'titulo': dict(AgentSchedule.TipoChoices.choices).get(tipo, tipo),
                'activo': True,
            }
        )
        return schedule
