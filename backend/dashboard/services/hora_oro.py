"""Doc 24 — Catálogo de experiencias familiares (Hora de Oro Familiar).

El módulo no es un formulario de planificación: es un catálogo inteligente de
experiencias listas para elegir. Este servicio concentra dos responsabilidades:

* el **catálogo** de las ocho categorías con sus actividades;
* la generación de **«Otra idea»** dentro de una misma categoría, con IA
  (Groq) y una reserva curada cuando la IA no está disponible.
"""
import json
import logging
import urllib.request

from django.conf import settings

logger = logging.getLogger(__name__)

# Ocho categorías (Doc 24 §II.5). Las ocho se muestran juntas en una sola
# pantalla; cada una muestra de inmediato sus actividades.
CATEGORIAS = [
    {
        'nombre': 'Juegos',
        'emoji': '🎲',
        'color': '#6236FF',
        'actividades': [
            'UNO', 'Dominó', 'Jenga', 'Cartas', 'Stop', 'Charadas',
            'Pictionary', 'Ajedrez', 'Bingo', 'Damas', 'Rompecabezas',
            'Tutti Frutti', 'Veo veo', 'Juego de memoria', 'Parqués',
            'Batalla naval', 'Mímica', 'Adivinanzas',
        ],
    },
    {
        'nombre': 'Películas y series',
        'emoji': '🎬',
        'color': '#E11D48',
        'actividades': [
            'Ver una película', 'Ver un capítulo', 'Maratón familiar',
            'Documental', 'Comedia', 'Animación', 'Cine clásico',
            'Ciencia ficción', 'Película de aventuras', 'Serie de misterio',
            'Película de la infancia', 'Noche de palomitas',
            'Elegir la película por votación', 'Tráiler y estreno en casa',
        ],
    },
    {
        'nombre': 'Conversaciones',
        'emoji': '💬',
        'color': '#F04438',
        'actividades': [
            'Contar cómo fue el día', 'Preguntas para conocernos mejor',
            'Anécdotas de la infancia', 'Planes para las próximas vacaciones',
            'Un café sin pantallas', 'Historia familiar y raíces',
            'Agradecer algo del día', 'Hablar de un sueño pendiente',
            'Recordar cómo nos conocimos', 'Escuchar música y comentarla',
            'Preguntar por lo que más disfrutaron esta semana',
            'Contar un recuerdo divertido',
        ],
    },
    {
        'nombre': 'Aire libre',
        'emoji': '🌳',
        'color': '#22C55E',
        'actividades': [
            'Caminar por el barrio', 'Ir a un parque', 'Ver el atardecer',
            'Picnic en el jardín', 'Paseo en bicicleta',
            'Caminata con la mascota', 'Observar las estrellas',
            'Sembrar algo juntos', 'Visitar un mirador', 'Tarde de cometas',
            'Recoger hojas y clasificarlas', 'Paseo al aire libre sin destino',
        ],
    },
    {
        'nombre': 'Salidas',
        'emoji': '🍽',
        'color': '#F59E0B',
        'actividades': [
            'Desayuno fuera de casa', 'Helado en familia',
            'Almuerzo en un lugar nuevo', 'Visitar un mercado local',
            'Feria o plaza de comida', 'Ir al cine', 'Museo o exposición',
            'Paseo por el centro', 'Comida favorita para llevar',
            'Visitar a un familiar', 'Café de especialidad', 'Tarde de postres',
        ],
    },
    {
        'nombre': 'Creatividad',
        'emoji': '🎨',
        'color': '#3B82F6',
        'actividades': [
            'Dibujar o pintar juntos', 'Cocinar una receta nueva',
            'Manualidades con lo que haya', 'Inventar un cuento',
            'Karaoke en casa', 'Tomar fotos temáticas',
            'Armar un álbum familiar', 'Escribir una carta a mano',
            'Decorar la casa', 'Tocar un instrumento juntos',
            'Crear un collage de recuerdos', 'Inventar un juego nuevo',
        ],
    },
    {
        'nombre': 'Deportes',
        'emoji': '🏃',
        'color': '#06B6D4',
        'actividades': [
            'Partido en el parque', 'Salir a trotar', 'Baile en la sala',
            'Yoga o estiramientos', 'Ir a nadar', 'Patinar',
            'Jugar fútbol', 'Ping pong', 'Saltar lazo',
            'Reto de ejercicios en casa', 'Montar en bicicleta',
            'Rutina de calentamiento juntos',
        ],
    },
    {
        'nombre': 'Espiritualidad y reflexión',
        'emoji': '🙏',
        'color': '#7C3AED',
        'actividades': [
            'Agradecer en voz alta', 'Meditar juntos', 'Leer una reflexión',
            'Momento de oración', 'Escribir en un diario familiar',
            'Perdonar algo pendiente', 'Escuchar música tranquila',
            'Caminar en silencio', 'Compartir una enseñanza',
            'Preguntar por los sueños de cada uno', 'Respirar con calma',
            'Hablar de lo que queremos soltar',
        ],
    },
]

# Actividades que se muestran de entrada en cada categoría (Doc 24: la mayor
# cantidad posible sin abrir nuevas pantallas). El resto queda como reserva
# para «Otra idea» cuando la IA no está disponible.
VISIBLES_POR_CATEGORIA = 8

DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

_INDICE = {c['nombre']: c for c in CATEGORIAS}


def catalogo():
    """Catálogo completo para pintar todas las categorías en una pantalla."""
    return [
        {
            'nombre': c['nombre'],
            'emoji': c['emoji'],
            'color': c.get('color', '#6236FF'),
            'actividades': c['actividades'][:VISIBLES_POR_CATEGORIA],
        }
        for c in CATEGORIAS
    ]


def categoria_valida(nombre):
    return nombre in _INDICE


def _normalizar(texto):
    return ' '.join((texto or '').strip().lower().split())


def _limpiar_idea(texto):
    """La IA a veces devuelve comillas, numeración o varias líneas."""
    if not texto:
        return ''
    linea = texto.strip().splitlines()[0].strip()
    linea = linea.lstrip('-•*0123456789. ').strip()
    linea = linea.strip('"\'“”«»')
    linea = linea.rstrip('. ')
    return linea[:160]


def _otra_idea_ia(categoria, excluir):
    """Pide a la IA una experiencia nueva dentro de la misma categoría."""
    api_key = getattr(settings, 'GROQ_API_KEY', '')
    if not api_key:
        return None

    evitar = ', '.join(excluir[:40]) if excluir else '(ninguna)'
    payload = json.dumps({
        'model': 'openai/gpt-oss-120b',
        'messages': [
            {
                'role': 'system',
                'content': (
                    'Eres Focusia, y propones experiencias familiares sencillas '
                    'para personas adultas con poco tiempo. Respondes SIEMPRE en '
                    'español, con una sola idea, de máximo 60 caracteres, sin '
                    'numeración, sin comillas y sin explicaciones.'
                ),
            },
            {
                'role': 'user',
                'content': (
                    f'Categoría: {categoria}. Propon una experiencia familiar '
                    f'distinta a estas: {evitar}. Responde solo con la idea.'
                ),
            },
        ],
        'temperature': 0.9,
        'max_tokens': 250,
        'reasoning_effort': 'low',
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
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode('utf-8'))
        return _limpiar_idea(data['choices'][0]['message']['content'])
    except Exception:
        logger.exception('[HORA-ORO] Error pidiendo «Otra idea» a Groq')
        return None


def otra_idea(categoria, excluir=None):
    """Devuelve (actividad, fuente). Nunca repite lo ya mostrado en la sesión."""
    excluir = excluir or []
    ya_vistas = {_normalizar(a) for a in excluir}

    idea = _otra_idea_ia(categoria, excluir)
    if idea and _normalizar(idea) not in ya_vistas:
        return idea, 'ia'

    # Reserva curada: el resto del catálogo de esa categoría.
    pool = _INDICE.get(categoria, {}).get('actividades', [])
    for actividad in pool:
        if _normalizar(actividad) not in ya_vistas:
            return actividad, 'catalogo'

    # Si la IA propuso algo aunque fuese repetido, es mejor que nada.
    if idea:
        return idea, 'ia'

    return None, 'agotado'
