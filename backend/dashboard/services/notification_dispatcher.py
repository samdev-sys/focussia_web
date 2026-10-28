"""Sistema Proactivo: un único motor de comunicación (Doc 27 §2).

Todas las comunicaciones de los módulos pasan por aquí. El motor:

  · comprueba autorización del canal y la prioridad (§2.3, §2.4);
  · respeta la ventana horaria y las excepciones configuradas (§2.3);
  · posterga avisos importantes/informativos durante Focus y fuera de horario,
    dejándolos disponibles en la campana (§2.6, §2.7);
  · revalida la vigencia del evento antes de cada entrega (§2.7, §2.8);
  · entrega por prioridad, hora del compromiso y orden de generación (§2.5);
  · deduplica por evento + momento para no insistir con el mismo aviso (§7.2).
"""
import logging
from datetime import datetime, time as dtime

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

logger = logging.getLogger(__name__)

CANALES = ('app', 'push', 'email', 'whatsapp', 'calls')

PRIORIDADES = ('critica', 'importante', 'informativa')
PRIORIDAD_ORDEN = {'critica': 0, 'importante': 1, 'informativa': 2}

# La app usa nombres legibles en la UI; el backend guarda valores canónicos.
_ESTADOS_LEGACY = {
    'activar': 'active',
    'desactivar': 'inactive',
    'criticas': 'critical_only',
    'critical_only': 'critical_only',
    'active': 'active',
    'inactive': 'inactive',
}
_CANALES_LEGACY = {
    'llamadas': 'calls',
    'calls': 'calls',
    'whatsapp': 'whatsapp',
    'app': 'app',
    'push': 'push',
    'email': 'email',
}

_DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
_DIAS_ALIASES = {
    'lun': 'lunes', 'mar': 'martes', 'mie': 'miercoles', 'mié': 'miercoles',
    'jue': 'jueves', 'vie': 'viernes', 'sab': 'sabado', 'sáb': 'sabado',
    'dom': 'domingo',
    'monday': 'lunes', 'tuesday': 'martes', 'wednesday': 'miercoles',
    'thursday': 'jueves', 'friday': 'viernes', 'saturday': 'sabado',
    'sunday': 'domingo',
}

# Límite de entregas externas por corrida según intensidad (Doc 27 §2.8).
_LIMITE_INTENSIDAD = {'suave': 1, 'equilibrada': 2, 'exigente': 3}


def normalizar_canal(channel: str) -> str:
    return _CANALES_LEGACY.get((channel or '').strip().lower(), (channel or '').strip().lower())


def normalizar_estado(state: str) -> str:
    return _ESTADOS_LEGACY.get((state or '').strip().lower(), (state or '').strip().lower())


def prioridad_de(critica: bool) -> str:
    return 'critica' if critica else 'informativa'


# ──────────────────────────────────────────────────────────────────────────
# Canales
# ──────────────────────────────────────────────────────────────────────────
def _estado_canal(user, channel: str) -> str:
    """Respeta NotificationPreference: active / inactive / critical_only."""
    from ..models import NotificationPreference
    channel = normalizar_canal(channel)
    try:
        pref = NotificationPreference.objects.get(user=user, channel=channel)
        return normalizar_estado(pref.state)
    except NotificationPreference.DoesNotExist:
        return 'active'


def puede_enviar(user, channel: str, critica: bool = False) -> bool:
    estado = _estado_canal(user, channel)
    if estado == 'inactive':
        return False
    if estado == 'critical_only' and not critica:
        return False
    return True


# ──────────────────────────────────────────────────────────────────────────
# Horarios, excepciones e intensidad
# ──────────────────────────────────────────────────────────────────────────
def _ventana(user, now):
    """Franja permitida según Onboarding/Configuración (Doc 27 §2.3)."""
    from ..models import ConfiguracionUsuario, OnboardingProfile

    profile = OnboardingProfile.objects.filter(user=user).first()
    if profile:
        tipo = profile.schedule_type
        if tipo == OnboardingProfile.Schedule.TODO_EL_DIA:
            return None
        if tipo == OnboardingProfile.Schedule.PERSONALIZADO:
            if profile.custom_schedule_start and profile.custom_schedule_end:
                return profile.custom_schedule_start, profile.custom_schedule_end
        elif tipo == OnboardingProfile.Schedule.HORARIO_LABORAL:
            return dtime(9, 0), dtime(18, 0)
        elif tipo == OnboardingProfile.Schedule.MANANA_TARDE:
            return dtime(8, 0), dtime(20, 0)

    cfg = ConfiguracionUsuario.objects.filter(user=user).first()
    if cfg and cfg.ventana_inicio and cfg.ventana_fin:
        return cfg.ventana_inicio, cfg.ventana_fin
    return None


def _parse_hora(value):
    if value is None or value == '':
        return None
    if isinstance(value, dtime):
        return value
    try:
        return dtime.fromisoformat(str(value)[:5])
    except (ValueError, TypeError):
        return None


def _en_rango(hora, desde, hasta) -> bool:
    """True si `hora` cae en el rango; soporta rangos que cruzan medianoche."""
    desde = _parse_hora(desde)
    hasta = _parse_hora(hasta)
    if desde is None or hasta is None:
        return False
    if desde <= hasta:
        return desde <= hora <= hasta
    return hora >= desde or hora <= hasta


def _normalizar_dia(value) -> str:
    dia = str(value).strip().lower()
    dia = _DIAS_ALIASES.get(dia, dia)
    return dia.replace('á', 'a').replace('é', 'e').replace('í', 'i').replace('ó', 'o')


def _dia_coincide(value, now) -> bool:
    days = value.get('days') if isinstance(value, dict) else None
    if not days:
        dia = value.get('dia') if isinstance(value, dict) else None
        days = [dia] if dia else []
    if not isinstance(days, list):
        days = [days]
    normalizados = {_normalizar_dia(d) for d in days if d}
    hoy = _DIAS[now.weekday()]
    return (
        now.date().isoformat() in normalizados
        or hoy in normalizados
        or _normalizar_dia(now.strftime('%A')) in normalizados
    )


def _excepcion_bloquea(user, prioridad: str, now) -> bool:
    """Aplica ScheduleException (incluye los nombres legados de la UI)."""
    from ..models import ScheduleException

    for exc in ScheduleException.objects.filter(user=user):
        tipo = (exc.exception_type or '').strip().lower()
        value = exc.value or {}

        if tipo in ('no_days', 'dia_semana'):
            if _dia_coincide(value, now):
                return True

        elif tipo in ('no_hours', 'horas'):
            if _en_rango(now.time(), value.get('desde'), value.get('hasta')):
                return True

        elif tipo in ('no_night', 'descanso', 'noche', 'madrugada'):
            etiqueta = tipo if tipo != 'no_night' else (value.get('etiqueta') or '')
            defaults = {
                'descanso': ('22:00', '07:00'),
                'noche': ('21:00', '06:00'),
                'madrugada': ('00:00', '06:00'),
            }
            desde_def, hasta_def = defaults.get(etiqueta, ('22:00', '07:00'))
            desde = value.get('desde') or desde_def
            hasta = value.get('hasta') or hasta_def
            if _en_rango(now.time(), desde, hasta):
                return True

    return False


def _autoriza_criticas_fuera_de_horario(user) -> bool:
    """Doc 27 §2.3: fuera de horario solo una crítica con excepción autorizada."""
    from ..models import ScheduleException

    exc = ScheduleException.objects.filter(
        user=user, exception_type__in=['critical_only_outside', 'acciones_criticas']
    ).first()
    if not exc:
        return False
    modo = str((exc.value or {}).get('modo', '')).strip().lower()
    return modo in ('permitir', 'allow', 'solo_criticas', 'critical_only', 'true', 'si', 'sí')


def focus_activo(user) -> bool:
    """Doc 27 §2.6: ¿hay una sesión de Focus en curso?

    El módulo de Focus todavía no expone un modelo propio; el hook queda listo
    para conectarse sin tocar el resto del motor.
    """
    try:
        from ..models import FocusSession  # noqa: F401
    except (ImportError, AttributeError):
        return False
    try:
        return FocusSession.objects.filter(user=user, ended_at__isnull=True).exists()
    except Exception:
        return False


def puede_entregar_ahora(user, prioridad: str = 'informativa', now=None) -> bool:
    """Autorización + horario + Focus. No altera la prioridad (Doc 27 §2.3)."""
    now = now or timezone.localtime()
    prioridad = prioridad if prioridad in PRIORIDADES else 'informativa'

    ventana = _ventana(user, now)
    dentro = ventana is None or _en_rango(now.time(), *ventana)

    if not dentro or _excepcion_bloquea(user, prioridad, now):
        if prioridad != 'critica':
            return False
        if not _autoriza_criticas_fuera_de_horario(user):
            return False

    if prioridad != 'critica' and focus_activo(user):
        return False

    return True


def _limite_corrida(user) -> int:
    from ..models import OnboardingProfile

    profile = OnboardingProfile.objects.filter(user=user).first()
    intensidad = profile.intensity if profile else 'equilibrada'
    return _LIMITE_INTENSIDAD.get(intensidad, 2)


# ──────────────────────────────────────────────────────────────────────────
# Vigencia
# ──────────────────────────────────────────────────────────────────────────
def vigente(notificacion) -> bool:
    """Doc 27 §2.7: revalida el evento de origen antes de entregar."""
    data = notificacion.data or {}
    kind = data.get('kind')

    if kind == 'report':
        from ..models import FocusiaReport
        report = FocusiaReport.objects.filter(pk=data.get('report_id')).first()
        return bool(report) and report.generation_state != FocusiaReport.GenerationState.FAILED

    if kind == 'recordatorio':
        from ..models import Recordatorio
        rec = Recordatorio.objects.filter(pk=data.get('recordatorio_id')).first()
        return bool(rec) and rec.activo and not rec.tomado

    if kind == 'accion':
        from ..models import AccionKanban
        accion = AccionKanban.objects.filter(pk=data.get('accion_id')).first()
        if not accion:
            return False
        return accion.estado_actual not in (
            AccionKanban.EstadoChoices.COMPLETADA,
            AccionKanban.EstadoChoices.ELIMINADA,
        )

    return True


# ──────────────────────────────────────────────────────────────────────────
# Entrega
# ──────────────────────────────────────────────────────────────────────────
def _enviar_externos(user, titulo: str, mensaje: str, canales, critica: bool) -> dict:
    from ..models import AgentConfig, Notification
    from .push_service import PushService
    from .whatsapp_service import WhatsAppService

    resultado = {}
    agent_cfg = AgentConfig.objects.filter(user=user).first()

    if 'push' in canales and puede_enviar(user, 'push', critica):
        resultado['push'] = PushService.enviar(user, titulo, mensaje)

    if 'email' in canales and puede_enviar(user, 'email', critica) and user.email:
        try:
            send_mail(titulo, mensaje, settings.DEFAULT_FROM_EMAIL, [user.email],
                      fail_silently=False)
            resultado['email'] = {'success': True}
        except Exception as e:
            logger.error(f'Email falló para {user.id}: {e}')
            resultado['email'] = {'success': False, 'error': str(e)}

    if 'whatsapp' in canales and puede_enviar(user, 'whatsapp', critica):
        phone = (agent_cfg.whatsapp_phone if agent_cfg else '') or ''
        if agent_cfg and agent_cfg.notificar_whatsapp and phone:
            resultado['whatsapp'] = WhatsAppService.enviar_mensaje(phone, f'{titulo}\n{mensaje}')
        else:
            resultado['whatsapp'] = {'success': False, 'error': 'WhatsApp no habilitado'}

    if 'calls' in canales and puede_enviar(user, 'calls', critica):
        # Llamada simulada: vive dentro de la app, nunca marca teléfonos reales.
        if puede_enviar(user, 'app', critica):
            Notification.objects.get_or_create(
                user=user,
                dedupe_key=f'call:{titulo[:80]}:{timezone.localtime():%Y%m%d%H%M}',
                defaults={
                    'type': 'reminder',
                    'title': '📞 Llamada simulada',
                    'message': f'{titulo}. {mensaje}',
                    'priority': 'critica' if critica else 'informativa',
                    'channel': 'calls',
                    'data': {'kind': 'llamada_simulada', 'critica': critica},
                },
            )
            resultado['calls'] = {'success': True, 'simulada': True}
        else:
            resultado['calls'] = {'success': False, 'error': 'Canal in-app desactivado'}

    return resultado


def _crear_o_actualizar(user, titulo, mensaje, data, prioridad, channel,
                        scheduled_for, dedupe_key, in_bell, pendiente, entregado):
    from ..models import Notification

    defaults = {
        'type': data.get('type', 'reminder'),
        'title': titulo[:255],
        'message': mensaje,
        'data': data,
        'priority': prioridad,
        'channel': channel,
        'scheduled_for': scheduled_for,
        'in_bell': in_bell,
        'pending_delivery': pendiente,
    }
    if entregado:
        defaults['delivered_at'] = timezone.now()

    if dedupe_key:
        notif, created = Notification.objects.get_or_create(
            user=user, dedupe_key=dedupe_key[:120], defaults=defaults)
        if not created:
            # Un reintento no duplica ni reabre un aviso ya entregado.
            actualizar = {k: v for k, v in defaults.items()
                          if k in ('priority', 'scheduled_for', 'in_bell')}
            if notif.cancelled_at is None:
                for k, v in actualizar.items():
                    setattr(notif, k, v)
                notif.save(update_fields=list(actualizar))
        return notif, created
    return Notification.objects.create(user=user, **defaults), True


def notificar(user, titulo: str, mensaje: str, critica: bool = False,
              canales=None, prioridad: str = None, scheduled_for=None,
              dedupe_key: str = '', data: dict = None) -> dict:
    """Registra y entrega un aviso respetando las reglas del Sistema Proactivo."""
    prioridad = prioridad or prioridad_de(critica)
    if prioridad not in PRIORIDADES:
        prioridad = 'informativa'
    critica = prioridad == 'critica'

    canales = [normalizar_canal(c) for c in (canales or ['app', 'push', 'whatsapp'])]

    # Doc 27 §2.3: primero se comprueba si la entrega está autorizada.
    entrega_ahora = puede_entregar_ahora(user, prioridad)
    resultado = {}

    data = dict(data or {})
    data.setdefault('kind', 'general')
    data['prioridad'] = prioridad
    if not entrega_ahora:
        data['postergado'] = True
        data['canales_pendientes'] = [
            c for c in canales if c != 'app' and puede_enviar(user, c, critica)
        ]

    puede_app = 'app' in canales and puede_enviar(user, 'app', critica)
    channel = next((c for c in canales if c != 'app'), 'app')

    notificacion = None
    if puede_app or data.get('canales_pendientes'):
        notificacion, creada = _crear_o_actualizar(
            user, titulo, mensaje, data, prioridad, channel,
            scheduled_for, dedupe_key, in_bell=puede_app,
            pendiente=not entrega_ahora,
            entregado=entrega_ahora and puede_app,
        )
        if puede_app:
            resultado['app'] = {'success': True, 'notification_id': notificacion.id}

    if entrega_ahora:
        resultado.update(_enviar_externos(
            user, titulo, mensaje,
            [c for c in canales if c != 'app'], critica))
    else:
        resultado['postponed'] = {'success': True, 'reason': 'horario_focus_o_prioridad'}
        logger.info(
            '[PROACTIVO] aviso postergado user=%s prioridad=%s: %s',
            user.id, prioridad, titulo)

    return resultado


def entregar_pendientes(user=None) -> dict:
    """Doc 27 §2.5/§2.7: entrega los avisos postergados en orden.

    Orden: prioridad → hora del compromiso → orden de generación. Los avisos sin
    hora conservan su orden de llegada. Se respeta la intensidad configurada y
    nunca se entregan dos avisos del mismo usuario a la vez.
    """
    from ..models import Notification

    qs = Notification.objects.filter(
        pending_delivery=True, cancelled_at__isnull=True)
    if user is not None:
        qs = qs.filter(user=user)

    avisos = list(qs.select_related('user'))
    avisos.sort(key=lambda n: (
        PRIORIDAD_ORDEN.get(n.priority, 2),
        n.scheduled_for is None,
        n.scheduled_for or n.created_at,
        n.created_at,
        n.id,
    ))

    resultado = {'entregados': 0, 'cancelados': 0, 'esperando': 0}
    por_usuario = {}

    for aviso in avisos:
        uid = aviso.user_id

        if not vigente(aviso):
            aviso.cancelled_at = timezone.now()
            aviso.pending_delivery = False
            data = dict(aviso.data or {})
            data['cancelado'] = True
            aviso.data = data
            aviso.save(update_fields=['cancelled_at', 'pending_delivery', 'data'])
            resultado['cancelados'] += 1
            continue

        if not puede_entregar_ahora(aviso.user, aviso.priority):
            resultado['esperando'] += 1
            continue

        if por_usuario.get(uid, 0) >= _limite_corrida(aviso.user):
            resultado['esperando'] += 1
            continue

        canales = (aviso.data or {}).get('canales_pendientes') or []
        resultado.update(_enviar_externos(
            aviso.user, aviso.title, aviso.message,
            [normalizar_canal(c) for c in canales],
            aviso.priority == 'critica'))

        aviso.pending_delivery = False
        aviso.delivered_at = timezone.now()
        data = dict(aviso.data or {})
        data.pop('postergado', None)
        data.pop('canales_pendientes', None)
        aviso.data = data
        aviso.save(update_fields=['pending_delivery', 'delivered_at', 'data'])

        por_usuario[uid] = por_usuario.get(uid, 0) + 1
        resultado['entregados'] += 1

    return resultado
