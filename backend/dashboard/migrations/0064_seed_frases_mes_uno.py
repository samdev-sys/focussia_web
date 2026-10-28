# Siembra Tabla Maestra Mes 1 — "Un nuevo comienzo" (doc 25.3).
# 31 frases con intención según progresión §8 del doc 25.1
# (1-7 apertura, 8-14 orden, 15-21 acción, 22-31 integración/cierre).

from django.db import migrations

FRASES_MES_1 = [
    (1, "La claridad de propósito es el punto de partida de todo logro. — W. Clement Stone", "foco"),
    (2, "Todo lo que la mente puede concebir y creer, lo puede lograr. — Napoleon Hill", "decision"),
    (3, "Donde pones tu atención, fluye tu energía y en eso te transformas. — Laín García Calvo", "foco"),
    (4, "La confianza en uno mismo es el primer secreto del éxito. — Ralph Waldo Emerson", "decision"),
    (5, "No nos atrevemos a muchas cosas porque son difíciles. Son difíciles porque no nos atrevemos a hacerlas. — Séneca", "accion"),
    (6, "La determinación transforma el pensamiento en acción y el sueño en realidad. — Zig Ziglar", "accion"),
    (7, "La disciplina es recordar lo que realmente quieres. — David Campbell", "disciplina"),
    (8, "La disciplina es el puente entre las metas y los logros. — Jim Rohn", "disciplina"),
    (9, "Somos lo que repetidamente hacemos. La excelencia, entonces, no es un acto, sino un hábito. — Aristóteles", "disciplina"),
    (10, "Cada acción que realizas es un voto por el tipo de persona en la que deseas convertirte. — James Clear", "accion"),
    (11, "El verdadero poder está en el control de uno mismo. — Marco Aurelio", "disciplina"),
    (12, "La energía sigue al pensamiento; enfoca tu mente y cambia tu vida. — Bob Proctor", "foco"),
    (13, "El enfoque es el arte de decir 'no' a todo lo que no te acerca a tus metas. — Steve Jobs", "foco"),
    (14, "Lo más importante en la vida es que lo más importante sea lo más importante. — Víctor Küppers", "decision"),
    (15, "La grandeza está en tus acciones, no en tus palabras. — Robin Sharma", "accion"),
    (16, "Cuando ya no somos capaces de cambiar una situación, nos encontramos ante el desafío de cambiarnos a nosotros mismos. — Viktor Frankl", "reflexion"),
    (17, "Ve con confianza en la dirección de tus sueños. Vive la vida que has imaginado. — Henry David Thoreau", "decision"),
    (18, "El poder no está en vencer siempre, sino en nunca rendirse. — Napoleón Bonaparte", "energia"),
    (19, "La verdadera fortaleza está en levantarse cada vez que caes. — Vince Lombardi", "energia"),
    (20, "La fortaleza no es la ausencia de miedo, sino la capacidad de seguir adelante a pesar del miedo. — Nelson Mandela", "energia"),
    (21, "El coraje no siempre ruge. A veces es la voz tranquila al final del día que dice: mañana lo intentaré de nuevo. — Mary Anne Radmacher", "calma"),
    (22, "La persistencia es el arte de mantener tu entusiasmo a pesar de las dificultades. — Brian Tracy", "disciplina"),
    (23, "No tengas miedo de renunciar a lo bueno para perseguir lo grandioso. — John D. Rockefeller", "decision"),
    (24, "La invencibilidad reside en la profundidad de tu convicción. — Tony Robbins", "foco"),
    (25, "Lo que crees profundamente con emoción se convierte en tu realidad. — Neville Goddard", "reflexion"),
    (26, "La abundancia no es algo que adquirimos, es algo con lo que nos sintonizamos. — Wayne Dyer", "calma"),
    (27, "La maestría es el arte de saber qué ignorar. — Nassim Nicholas Taleb", "foco"),
    (28, "Nuestros cerebros están diseñados para buscar patrones y significados. Usa esta habilidad para encontrar oportunidades y soluciones. — Daniel Kahneman", "reflexion"),
    (29, "La grandeza no se trata de tener poder, sino de empoderar a los demás. — John C. Maxwell", "accion"),
    (30, "La vida no se trata de encontrarte a ti mismo. La vida se trata de crearte a ti mismo. — George Bernard Shaw", "accion"),
    (31, "El secreto del cambio es enfocar toda tu energía no en luchar contra lo viejo, sino en construir lo nuevo. — Sócrates", "cierre"),
]


def sembrar_mes_uno(apps, schema_editor):
    ProgramMonth = apps.get_model('dashboard', 'ProgramMonth')
    ProgramDay = apps.get_model('dashboard', 'ProgramDay')
    mes, _ = ProgramMonth.objects.update_or_create(
        month_number=1,
        defaults={
            'theme_name': 'Un nuevo comienzo',
            'training_theme': 'Reinicio personal con foco, orden y propósito',
            'formative_objective': 'Arrancar el ciclo con decisión, claridad, hábitos y compromiso.',
        },
    )
    for day_number, phrase, intention in FRASES_MES_1:
        ProgramDay.objects.update_or_create(
            month=mes, day_number=day_number,
            defaults={'phrase': phrase, 'intention': intention},
        )


def revertir_mes_uno(apps, schema_editor):
    ProgramDay = apps.get_model('dashboard', 'ProgramDay')
    ProgramDay.objects.filter(month__month_number=1, day_number__gte=6).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0063_actiondelegation'),
    ]

    operations = [
        migrations.RunPython(sembrar_mes_uno, revertir_mes_uno),
    ]
