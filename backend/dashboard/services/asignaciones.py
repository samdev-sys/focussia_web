"""Reparto personalizado de contenido por usuario.

Regla única: si el usuario tiene asignaciones de un tipo, solo ve esos
objetos; si no tiene ninguna, ve todo (comportamiento histórico y default
para usuarios nuevos). Devuelve `None` cuando no hay filtro que aplicar.
"""

from ..models import AsignacionContenido


def ids_asignados(user, tipo):
    """IDs permitidos para ese usuario y tipo, o None si ve todo."""
    ids = list(
        AsignacionContenido.objects
        .filter(user=user, tipo=tipo)
        .values_list('objeto_id', flat=True)
    )
    return set(ids) if ids else None


def filtrar_queryset(qs, user, tipo, campo='id'):
    """Aplica la allowlist al queryset, o lo deja intacto si ve todo."""
    ids = ids_asignados(user, tipo)
    if ids is None:
        return qs
    return qs.filter(**{f'{campo}__in': ids})


def resumen_asignaciones(user):
    """Conteo por tipo para la ficha del panel. `{}` si ve todo."""
    from django.db.models import Count
    filas = (
        AsignacionContenido.objects
        .filter(user=user)
        .values('tipo')
        .annotate(n=Count('id'))
    )
    return {f['tipo']: f['n'] for f in filas}
