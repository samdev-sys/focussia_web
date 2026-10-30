from ..models import EventoAccion


def registrar_evento(accion, tipo, **datos):
    """Persiste un evento del módulo DIARIA – TIME BLOCKING.

    Lo usan las vistas tras validar cada operación; no depende de la interfaz,
    para que otros módulos del ecosistema puedan reutilizarlo.
    """
    return EventoAccion.objects.create(accion=accion, tipo=tipo, datos=datos)
