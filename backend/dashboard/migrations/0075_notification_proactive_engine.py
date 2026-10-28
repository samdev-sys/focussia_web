# Generated for Focusia v1.0 — Sistema Proactivo (Doc 27 §2.4, §2.5, §2.7, §7.2)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0074_gratitud_frases'),
    ]

    operations = [
        migrations.AddField(
            model_name='notification',
            name='priority',
            field=models.CharField(
                choices=[
                    ('critica', 'Crítica'),
                    ('importante', 'Importante'),
                    ('informativa', 'Informativa'),
                ],
                db_index=True,
                default='informativa',
                max_length=12,
            ),
        ),
        migrations.AddField(
            model_name='notification',
            name='channel',
            field=models.CharField(
                blank=True,
                default='',
                help_text='Canal que originó el aviso (app, push, whatsapp, calls).',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='notification',
            name='scheduled_for',
            field=models.DateTimeField(
                blank=True,
                help_text='Hora del compromiso; ordena avisos del mismo nivel.',
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='notification',
            name='delivered_at',
            field=models.DateTimeField(
                blank=True,
                help_text='Momento de entrega por canales externos.',
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='notification',
            name='pending_delivery',
            field=models.BooleanField(
                db_index=True,
                default=False,
                help_text='Aviso postergado: espera franja permitida o fin de Focus.',
            ),
        ),
        migrations.AddField(
            model_name='notification',
            name='in_bell',
            field=models.BooleanField(
                db_index=True,
                default=True,
                help_text='Visible en la campana (canal app habilitado).',
            ),
        ),
        migrations.AddField(
            model_name='notification',
            name='cancelled_at',
            field=models.DateTimeField(
                blank=True,
                help_text='El evento de origen ya no está vigente.',
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='notification',
            name='dedupe_key',
            field=models.CharField(
                blank=True,
                db_index=True,
                default='',
                help_text='Identidad del aviso para no duplicarlo (evento + momento).',
                max_length=120,
            ),
        ),
        migrations.AlterModelOptions(
            name='notification',
            options={'ordering': ['-created_at']},
        ),
    ]
