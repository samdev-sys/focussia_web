"""Doc 19 — Módulo Gratitud.

El módulo no es un diario ni una red social: es una práctica diaria de un
minuto. Cada día muestra una frase sobre la gratitud (con autor y, cuando se
conoce, obra y año) y una única pregunta fija que el usuario responde en un
campo libre que se guarda solo.

Reglas de la especificación que se respetan aquí:

* **Una frase por día.** La frase se fija en la entrada del día, así que no
  cambia aunque el catálogo se edite más tarde.
* **Cada frase, una sola vez en el ciclo anual.** El catálogo se recorre en
  orden de ``dia``; el índice avanza con los días transcurridos desde la
  primera entrada del usuario y da la vuelta cuando se agota el catálogo.
* **Sin historial visible ni botones extra.** Este servicio solo expone el
  día en curso.
"""
from django.utils import timezone

from ..models import EntradaGratitud, FraseGratitud

# Doc 19 §II.2 — la pregunta es siempre la misma.
PREGUNTA = '¿Por qué debieras estar agradecido hoy?'


def _frases_activas():
    return list(FraseGratitud.objects.filter(activa=True).order_by('dia'))


def _frase_para(user, fecha):
    """Frase que toca según el avance del ciclo personal del usuario."""
    frases = _frases_activas()
    if not frases:
        return None

    inicio = (
        EntradaGratitud.objects
        .filter(user=user)
        .order_by('fecha')
        .values_list('fecha', flat=True)
        .first()
    )
    inicio = inicio or fecha
    dias = max((fecha - inicio).days, 0)
    return frases[dias % len(frases)]


def obtener_dia(user, fecha=None):
    """Entrada de hoy, creándola con su frase si es la primera visita del día."""
    fecha = fecha or timezone.localdate()
    entrada = EntradaGratitud.objects.filter(user=user, fecha=fecha).first()
    if entrada and entrada.frase_id:
        return entrada

    if entrada is None:
        entrada = EntradaGratitud.objects.create(user=user, fecha=fecha)

    frase = _frase_para(user, fecha)
    if frase is not None:
        entrada.frase = frase
        entrada.save(update_fields=['frase'])
    return entrada


def guardar_respuesta(user, texto, fecha=None):
    """Guardado automático (§II.3): no hay botón de guardar."""
    entrada = obtener_dia(user, fecha)
    entrada.texto = (texto or '').strip()
    entrada.save(update_fields=['texto', 'actualizado'])
    return entrada


def estado(user, fecha=None):
    """Lo que consume la pantalla: frase del día, pregunta y respuesta."""
    entrada = obtener_dia(user, fecha)
    frase = entrada.frase
    return {
        'fecha': entrada.fecha.isoformat(),
        'pregunta': PREGUNTA,
        'frase': None if frase is None else {
            'id': frase.id,
            'texto': frase.texto,
            'autor': frase.autor,
            'obra': frase.obra,
            'anio': frase.anio,
        },
        'respuesta': entrada.texto,
        'guardado_en': entrada.actualizado.isoformat(),
    }
