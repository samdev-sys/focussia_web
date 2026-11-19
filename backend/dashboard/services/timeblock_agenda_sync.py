"""Sincronización bidireccional entre TimeBlock (legacy) y AccionKanban en AGENDA_DIARIA.

La vista moderna de Time Blocking / Agenda Diaria opera sobre AccionKanban con
estado_actual=AGENDA_DIARIA. El módulo legacy TimeBlock sigue siendo fuente para
agente, reportes y progreso. Ambas representaciones deben reflejar la misma
realidad para un mismo (usuario, fecha, hora).
"""

from datetime import time as dt_time

from django.db.models import Q

TB_TO_ACCION_ESTADO = {
    'pending': 'Pendiente',
    'doing': 'Haciendo',
    'done': 'Completada',
    'completado': 'Completada',
    'haciendo': 'Haciendo',
}
ACCION_TO_TB_ESTADO = {
    'Pendiente': 'pending',
    'Haciendo': 'doing',
    'Completada': 'done',
}


def _hora_int(value):
    if value is None:
        return None
    if isinstance(value, int):
        return value
    # time / datetime.time
    try:
        return int(getattr(value, 'hour'))
    except Exception:
        try:
            return int(str(value).split(':', 1)[0])
        except Exception:
            return None


def _hora_time(value):
    h = _hora_int(value)
    if h is None:
        return None
    return dt_time(hour=h, minute=0)


def _get_models():
    # Import diferido para evitar ciclos en carga de apps.
    from ..models import AccionKanban, TimeBlock
    return AccionKanban, TimeBlock


def sync_timeblock_from_accion(accion):
    """Proyecta una AccionKanban de agenda diaria hacia TimeBlock.

    - Si la acción está en AGENDA_DIARIA y tiene fecha+hora, crea/actualiza el
      bloque horario equivalente.
    - En cualquier otro caso, elimina el bloque horario equivalente (si existía)
      para no dejar residuos de acciones reclasificadas/eliminadas.
    """
    AccionKanban, TimeBlock = _get_models()
    fecha = getattr(accion, 'fecha_seleccionada', None)
    hora = _hora_int(getattr(accion, 'hora_seleccionada', None))
    user = getattr(accion, 'user', None) or getattr(accion, 'user_id', None)

    # Localizar por user_id aunque `user` no esté cargado.
    user_id = getattr(user, 'id', user)

    in_agenda = (
        getattr(accion, 'estado_actual', None) == AccionKanban.EstadoChoices.AGENDA_DIARIA
        and fecha is not None
        and hora is not None
        and user_id is not None
    )

    if in_agenda:
        tarea = (getattr(accion, 'texto_accion', '') or '').strip()
        estado_accion = getattr(accion, 'estado', 'Pendiente') or 'Pendiente'
        estado_tb = ACCION_TO_TB_ESTADO.get(estado_accion, 'pending')
        TimeBlock.objects.update_or_create(
            user_id=user_id,
            fecha=fecha,
            hora=hora,
            defaults={'tarea': tarea, 'estado': estado_tb},
        )
        # Si por algún motivo existieran duplicados legacy en la misma fecha/hora
        # (no debería por unique_together), el update_or_create ya consolidó.
        return

    # Fuera de agenda: limpiar bloque previo si conocemos su slot.
    if fecha is not None and hora is not None and user_id is not None:
        TimeBlock.objects.filter(user_id=user_id, fecha=fecha, hora=hora).delete()


def remove_timeblock_slot(user_id, fecha, hora):
    """Elimina el TimeBlock de un slot concreto, si existe."""
    if user_id is None or fecha is None or hora is None:
        return
    _, TimeBlock = _get_models()
    TimeBlock.objects.filter(user_id=user_id, fecha=fecha, hora=_hora_int(hora)).delete()


def sync_accion_from_timeblock(timeblock):
    """Proyecta un TimeBlock hacia AccionKanban (AGENDA_DIARIA).

    Un bloque con texto se refleja como acción en la agenda diaria del mismo día
    y hora. Un bloque vacío se interpreta como slot libre y elimina la acción de
    agenda equivalente (si la hay) para mantener ambas vistas alineadas.
    """
    AccionKanban, _ = _get_models()
    fecha = getattr(timeblock, 'fecha', None)
    hora_int = _hora_int(getattr(timeblock, 'hora', None))
    user_id = getattr(timeblock, 'user_id', None)
    tarea = (getattr(timeblock, 'tarea', '') or '').strip()

    if fecha is None or hora_int is None or user_id is None:
        return None

    hora_t = _hora_time(hora_int)
    base_qs = AccionKanban.objects.filter(
        user_id=user_id,
        estado_actual=AccionKanban.EstadoChoices.AGENDA_DIARIA,
        fecha_seleccionada=fecha,
        hora_seleccionada=hora_t,
    )

    if not tarea:
        # Slot vacío: retirar la acción de agenda sincronizada de ese bloque.
        base_qs.delete()
        return None

    estado_tb = (getattr(timeblock, 'estado', 'pending') or 'pending').lower()
    estado_accion = TB_TO_ACCION_ESTADO.get(estado_tb, 'Pendiente')

    accion = base_qs.order_by('creado_en').first()
    if accion:
        updates = {}
        if accion.texto_accion != tarea:
            updates['texto_accion'] = tarea
        # No forzamos transiciones inválidas desde el lado legacy; solo mapeamos
        # estados terminales/compatibles de forma directa.
        if accion.estado != estado_accion:
            updates['estado'] = estado_accion
        if updates:
            for k, v in updates.items():
                setattr(accion, k, v)
            accion.save(update_fields=list(updates.keys()) + ['actualizado_en'])
        # Limpiar duplicados accidentales en el mismo slot.
        base_qs.exclude(pk=accion.pk).delete()
        return accion

    accion = AccionKanban.objects.create(
        user_id=user_id,
        texto_accion=tarea,
        origen=AccionKanban.OrigenChoices.MANUAL,
        clasificacion='H',
        estado_actual=AccionKanban.EstadoChoices.AGENDA_DIARIA,
        destino_asignado=AccionKanban.DestinoChoices.AGENDA_DIARIA,
        fecha_seleccionada=fecha,
        fecha_planificada_original=fecha,
        hora_seleccionada=hora_t,
        estado=estado_accion,
    )
    return accion


def remove_accion_slot(user_id, fecha, hora):
    """Elimina la acción de agenda diaria de un slot concreto."""
    if user_id is None or fecha is None or hora is None:
        return
    AccionKanban, _ = _get_models()
    AccionKanban.objects.filter(
        user_id=user_id,
        estado_actual=AccionKanban.EstadoChoices.AGENDA_DIARIA,
        fecha_seleccionada=fecha,
        hora_seleccionada=_hora_time(hora),
    ).delete()


def remove_accion_for_timeblock(timeblock):
    """Elimina la acción de agenda diaria asociada al slot del TimeBlock."""
    fecha = getattr(timeblock, 'fecha', None)
    hora = getattr(timeblock, 'hora', None)
    user_id = getattr(timeblock, 'user_id', None)
    remove_accion_slot(user_id, fecha, hora)
