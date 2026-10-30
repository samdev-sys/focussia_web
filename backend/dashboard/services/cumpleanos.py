"""Doc 22 — Módulo Cumpleaños.

El módulo registra los cumpleaños de las personas importantes y transforma
cada fecha en un **Evento Focusia** (un ``Recordatorio`` de categoría
«Cumpleaños»). Su responsabilidad termina al confirmar el registro: desde ahí
los Sistemas Transversales administran el evento.

Reglas de la especificación que se respetan aquí:

* **Próximos cumpleaños ordenados por cercanía** (§II.4): la ocurrencia se
  recalcula al año siguiente sin que el usuario vuelva a registrar a la
  persona (§III «Reprogramación automática»).
* **Recordatorio inteligente** (§III): al llegar la fecha de anticipación
  elegida, el Sistema Proactivo envía la activación «¿Te gustaría comenzar a
  prepararlo desde ahora?».
* **Acciones sugeridas** (§III): regalo, celebración, llamada u otra acción
  se envían automáticamente al Kanban Backlog.
"""
from datetime import date, datetime, time as dtime, timedelta

from django.utils import timezone

from ..models import Cumpleanos, KanbanTask, Recordatorio

# Opciones del Paso 4 del asistente (§II.5). «Personalizado» es cualquier
# cantidad de días que el usuario escriba.
ANTICIPACIONES = (0, 1, 3, 7, 14, 30)

ACCIONES = {
    'regalo': 'Comprar regalo',
    'celebracion': 'Planificar celebración',
    'llamada': 'Preparar llamada',
}

HORA_EVENTO = dtime(9, 0)


def _ocurrencia(fecha, anio):
    """El cumpleaños dentro de ``anio`` (29 de febrero cae al 1 de marzo)."""
    try:
        return fecha.replace(year=anio)
    except ValueError:
        return date(anio, 3, 1)


def proxima_ocurrencia(cumpleanos, hoy=None):
    hoy = hoy or timezone.localdate()
    proximo = _ocurrencia(cumpleanos.fecha, hoy.year)
    if proximo < hoy:
        proximo = _ocurrencia(cumpleanos.fecha, hoy.year + 1)
    return proximo


def dias_restantes(cumpleanos, hoy=None):
    return (proxima_ocurrencia(cumpleanos, hoy) - (hoy or timezone.localdate())).days


def fecha_aviso(cumpleanos, hoy=None):
    return proxima_ocurrencia(cumpleanos, hoy) - timedelta(days=cumpleanos.anticipacion_dias)


def reprogramar(cumpleanos, hoy=None):
    """§III «Reprogramación automática»: pasada la fecha, el Evento Focusia
    se recorre al año siguiente y el aviso queda disponible otra vez."""
    hoy = hoy or timezone.localdate()
    proximo = proxima_ocurrencia(cumpleanos, hoy)
    if cumpleanos.recordatorio is None:
        return
    programada = timezone.make_aware(datetime.combine(proximo, HORA_EVENTO))
    if cumpleanos.recordatorio.fecha_hora != programada:
        cumpleanos.recordatorio.fecha_hora = programada
        cumpleanos.recordatorio.tomado = False
        cumpleanos.recordatorio.activo = True
        cumpleanos.recordatorio.save(update_fields=['fecha_hora', 'tomado', 'activo'])


def registrar(user, nombre, categoria, fecha, anticipacion_dias):
    """§II.5 Paso 5 «Finalizar»: crea el registro y genera el Evento Focusia."""
    cumpleanos = Cumpleanos.objects.create(
        user=user, nombre=nombre, categoria=categoria,
        fecha=fecha, anticipacion_dias=anticipacion_dias,
    )
    programada = timezone.make_aware(
        datetime.combine(proxima_ocurrencia(cumpleanos), HORA_EVENTO))
    cumpleanos.recordatorio = Recordatorio.objects.create(
        user=user,
        titulo=f'Cumpleaños de {nombre}',
        categoria='Cumpleaños',
        fecha_hora=programada,
    )
    cumpleanos.save(update_fields=['recordatorio'])
    return cumpleanos


def estado(cumpleanos, hoy=None):
    """Lo que consume cada tarjeta de la pantalla (§II.4)."""
    hoy = hoy or timezone.localdate()
    proximo = proxima_ocurrencia(cumpleanos, hoy)
    dias = (proximo - hoy).days
    return {
        'id': cumpleanos.id,
        'nombre': cumpleanos.nombre,
        'categoria': cumpleanos.categoria,
        'fecha': cumpleanos.fecha.isoformat(),
        'anticipacion_dias': cumpleanos.anticipacion_dias,
        'fecha_proxima': proximo.isoformat(),
        'dias_restantes': dias,
        'fecha_aviso': fecha_aviso(cumpleanos, hoy).isoformat(),
        # El aviso proactivo está en juego: faltan igual o menos días que la
        # anticipación configurada y aún no se envió para esta ocurrencia.
        'aviso_activo': (
            dias <= cumpleanos.anticipacion_dias
            and cumpleanos.aviso_enviado_para != proximo
        ),
        'aviso_enviado': cumpleanos.aviso_enviado_para == proximo,
    }


def listar(user):
    """Próximos cumpleaños ordenados por cercanía (§II.4)."""
    hoy = timezone.localdate()
    items = [estado(c, hoy) for c in Cumpleanos.objects.filter(user=user)]
    items.sort(key=lambda i: i['dias_restantes'])
    return items


def enviar_accion(user, cumpleanos, accion, detalle=''):
    """§III «Acciones sugeridas»: la acción elegida va directo al Backlog."""
    titulo = ACCIONES.get(accion)
    if titulo is None:
        if accion != 'otra':
            raise ValueError('Acción desconocida.')
        titulo = (detalle or '').strip() or 'Preparar cumpleaños'
    proximo = proxima_ocurrencia(cumpleanos)
    tarea = KanbanTask.objects.create(
        user=user,
        titulo=titulo,
        descripcion=(
            f'Preparación del cumpleaños de {cumpleanos.nombre} '
            f'({proximo:%d/%m}).'),
        columna='Backlog',
    )
    return tarea


def _frase_aviso(nombre, dias, anticipacion):
    if dias <= 0:
        return f'🎂 ¡Hoy es el cumpleaños de {nombre}!'
    if anticipacion == 1:
        return f'🎂 Mañana es el cumpleaños de {nombre}.'
    return f'🎂 Dentro de {dias} días es el cumpleaños de {nombre}.'


def revisar_avisos(user, hoy=None):
    """Tarea diaria del Sistema Proactivo: envía el recordatorio anticipado
    cuando llega la fecha configurada (§III «Recordatorio inteligente»)."""
    from .notification_dispatcher import notificar

    hoy = hoy or timezone.localdate()
    enviados = []
    for cumpleanos in Cumpleanos.objects.filter(user=user):
        reprogramar(cumpleanos, hoy)
        proximo = proxima_ocurrencia(cumpleanos, hoy)
        if cumpleanos.aviso_enviado_para == proximo:
            continue
        dias = (proximo - hoy).days
        if 0 <= dias <= cumpleanos.anticipacion_dias:
            notificar(
                user,
                'Se acerca un cumpleaños',
                _frase_aviso(cumpleanos.nombre, dias, cumpleanos.anticipacion_dias)
                + ' ¿Te gustaría comenzar a prepararlo desde ahora?',
                prioridad='importante',
                canales=['app', 'push', 'whatsapp'],
                scheduled_for=timezone.make_aware(datetime.combine(hoy, HORA_EVENTO)),
                dedupe_key=f'cumpleanos:{cumpleanos.id}:{proximo.isoformat()}',
                data={
                    'kind': 'cumpleanos',
                    'cumpleanos_id': cumpleanos.id,
                    'nombre': cumpleanos.nombre,
                    'fecha_proxima': proximo.isoformat(),
                },
            )
            cumpleanos.aviso_enviado_para = proximo
            cumpleanos.save(update_fields=['aviso_enviado_para'])
            enviados.append(cumpleanos.id)
    return enviados
