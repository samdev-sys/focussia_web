# -*- coding: utf-8 -*-
"""Re-siembra el contenido maestro que corre dentro de migraciones RunPython
(al quedar marcadas como aplicadas sin ejecutarse en produccion, el contenido
maestro no existia y las vistas respondian 404 "No hay contenido").

Todas las semillas son idempotentes (get_or_create / guardas de existencia).

Uso:
    python manage.py seed_content
"""
from importlib import import_module

from django.apps import apps
from django.core.management.base import BaseCommand

SEEDS = [
    ('categorias rueda v1', 'dashboard.migrations.0011_seed_categorias_rueda', 'seed_categorias'),
    ('categorias rueda v2', 'dashboard.migrations.0021_seed_10_categorias_rueda', 'seed_categorias'),
    ('avatares', 'dashboard.migrations.0038_seed_avatars', 'seed_avatars'),
    ('bloques tour inicio', 'dashboard.migrations.0040_seed_inicio_data', 'seed_guided_tour_blocks'),
    ('categorias aprendizaje', 'dashboard.migrations.0040_seed_inicio_data', 'seed_learning_categories'),
    ('contenido programa', 'dashboard.migrations.0043_seed_program_content', 'seed_program_content'),
    ('cursos meses', 'dashboard.migrations.0043_seed_program_content', 'seed_program_content'),
    ('tema tribu', 'dashboard.migrations.0054_seed_tema_tribu', 'seed_tema_default'),
    ('frases mes 1', 'dashboard.migrations.0064_seed_frases_mes_uno', 'sembrar_mes_uno'),
    ('frases gratitud', 'dashboard.migrations.0074_gratitud_frases', 'sembrar_frases'),
    ('videos inspiracion', 'dashboard.migrations.0087_seed_inspiracion_videos', 'seed'),
]


class Command(BaseCommand):
    help = 'Ejecuta las semillas de contenido idempotentes de las migraciones.'

    def handle(self, *args, **options):
        reales = apps  # registro real de modelos, no el de una migracion
        ok = 0
        for nombre, modulo, funcion in SEEDS:
            try:
                fn = getattr(import_module(modulo), funcion)
                fn(reales, None)
                self.stdout.write(self.style.SUCCESS(f'OK   {nombre}'))
                ok += 1
            except Exception as exc:
                self.stdout.write(self.style.ERROR(f'FALLO {nombre}: {exc!r}'))
        self.stdout.write(self.style.SUCCESS(f'{ok}/{len(SEEDS)} semillas ejecutadas.'))
