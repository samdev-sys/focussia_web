"""Cierre de sesiones: quema los refresh tokens y los access vigentes.

El JWT es stateless: borrar la cookie en el cliente no invalida nada, y
blacklistear los refresh solo impide renovar — el access emitido sigue
funcionando hasta su expiración (1 día). Por eso, además de la blacklist, se
marca al usuario con `sessions_invalidated_at`: la autenticación rechaza
cualquier token con `iat` anterior a esa marca.
"""

from django.utils import timezone


def cerrar_sesiones(user) -> int:
    """Invalida todas las sesiones del usuario.

    Devuelve cuántos refresh tokens se quemaron. El acceso deja de valer de
    inmediato gracias a `sessions_invalidated_at`.
    """
    from rest_framework_simplejwt.token_blacklist.models import (
        BlacklistedToken,
        OutstandingToken,
    )

    cerradas = 0
    for token in OutstandingToken.objects.filter(user=user):
        _, creada = BlacklistedToken.objects.get_or_create(token=token)
        if creada:
            cerradas += 1

    user.sessions_invalidated_at = timezone.now()
    user.save(update_fields=['sessions_invalidated_at'])
    return cerradas
