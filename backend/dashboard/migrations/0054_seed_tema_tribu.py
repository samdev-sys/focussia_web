# Tema inicial de Tribu para que el módulo tenga contenido desde el primer día.
# El administrador puede editarlo desde /admin. Idempotente.
from django.db import migrations


def seed_tema_default(apps, schema_editor):
    TribuTemaSemana = apps.get_model('dashboard', 'TribuTemaSemana')
    TribuTemaSemana.objects.get_or_create(
        titulo='Gestión del Tiempo',
        defaults={
            'descripcion': 'El tiempo es el recurso más valioso.',
            'reflexion': (
                'Administrar bien el tiempo no significa hacer más, sino elegir '
                'lo que realmente importa y compartirlo con quienes nos rodean.\n\n'
                'Cuando lo hacemos, inspiramos, generamos conversaciones '
                'profundas y multiplicamos nuestro impacto.'
            ),
            'pregunta': (
                '¿Qué harás esta semana para compartir con tu tribu '
                'una forma más consciente de administrar el tiempo?'
            ),
            'activo': True,
        },
    )


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0053_tributemasemana_tribucompromiso'),
    ]

    operations = [
        migrations.RunPython(seed_tema_default, reverse_code=migrations.RunPython.noop),
    ]
