"""Conserva la fecha de planificación original de las acciones (Doc 27 §5).

Una acción reprogramada a otro período debe seguir integrando el total
planificado original y, en el destino, evaluarse según su nueva fecha. Para
reconstruirlo sin depender del historial se guarda la primera fecha planificada.

Se rellenan los registros existentes con su fecha actual: es la mejor
aproximación disponible antes de este cambio.
"""
from django.db import migrations, models
from django.db.models import F


def rellenar_originales(apps, schema_editor):
    AccionKanban = apps.get_model('dashboard', 'AccionKanban')
    Action = apps.get_model('dashboard', 'Action')

    AccionKanban.objects.filter(
        fecha_seleccionada__isnull=False,
        fecha_planificada_original__isnull=True,
    ).exclude(
        estado_actual='KANBAN_ACTIVO',
    ).update(fecha_planificada_original=F('fecha_seleccionada'))

    Action.objects.filter(
        fecha_planificada_original__isnull=True,
    ).update(fecha_planificada_original=F('assigned_calendar_date'))


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0076_normalize_proactive_values'),
    ]

    operations = [
        migrations.AddField(
            model_name='accionkanban',
            name='fecha_planificada_original',
            field=models.DateField(
                blank=True,
                help_text=(
                    'Primer día para el que se planificó. No cambia al '
                    'reprogramar (Doc 27 §5: el total original se conserva).'
                ),
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='action',
            name='fecha_planificada_original',
            field=models.DateField(
                blank=True,
                help_text=(
                    'Primer día planificado; se conserva al reprogramar '
                    '(Doc 27 §5).'
                ),
                null=True,
            ),
        ),
        migrations.RunPython(rellenar_originales, migrations.RunPython.noop),
    ]
