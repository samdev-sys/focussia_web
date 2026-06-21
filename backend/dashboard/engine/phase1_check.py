from ..models import MetaAnual, PropuestaIA


def check_viabilidad(user):
    """
    FASE 1: Filtro de Viabilidad de Entrada
    Returns dict with: viable (bool), razon (str)
    """
    meta_aprobada = MetaAnual.objects.filter(user=user, aprobada=True).exists()
    if not meta_aprobada:
        return {
            'viable': False,
            'razon': 'El usuario no tiene una Gran Meta Anual aprobada.',
        }

    propuesta_pendiente = PropuestaIA.objects.filter(user=user, respondida=False).exists()
    if propuesta_pendiente:
        return {
            'viable': False,
            'razon': 'Ya existe una propuesta previa del sistema sin responder.',
        }

    return {'viable': True, 'razon': ''}
