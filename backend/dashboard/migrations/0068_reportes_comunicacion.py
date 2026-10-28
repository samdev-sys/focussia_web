# Generated for Focusia v1.0 - Comunicación y Reportes (doc 27)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0067_cuentas_modulo'),
    ]

    operations = [
        migrations.AddField(
            model_name='focusiareport',
            name='generation_state',
            field=models.CharField(
                choices=[
                    ('ready', 'Listo'),
                    ('analysis_pending', 'Análisis pendiente'),
                    ('failed', 'No se pudo generar'),
                ],
                default='ready',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='focusiareport',
            name='is_partial',
            field=models.BooleanField(
                default=False,
                help_text='Primer período parcial (planificación iniciada a mitad de período)',
            ),
        ),
        migrations.AddField(
            model_name='focusiareport',
            name='cycle_label',
            field=models.CharField(
                blank=True,
                default='',
                help_text='Etiqueta legible del período (ej: "Diciembre 2026", "2026")',
                max_length=60,
            ),
        ),
        migrations.AddField(
            model_name='focusiareport',
            name='updated_until',
            field=models.DateTimeField(
                blank=True,
                help_text='Fin de la ventana de actualización (00:00 del día siguiente a la publicación)',
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='focusiareport',
            name='closed_at',
            field=models.DateTimeField(
                blank=True,
                help_text='Momento en que el período quedó cerrado',
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='focusiareport',
            name='never_opened',
            field=models.BooleanField(
                default=False,
                help_text='El usuario no consultó este reporte antes de publicarse el siguiente del mismo tipo (señal "sin consultar")',
            ),
        ),
        migrations.AlterField(
            model_name='notification',
            name='type',
            field=models.CharField(
                choices=[
                    ('invitation', 'Invitación'),
                    ('delegation', 'Delegación'),
                    ('reminder', 'Recordatorio'),
                    ('report', 'Reporte'),
                ],
                max_length=20,
            ),
        ),
    ]
