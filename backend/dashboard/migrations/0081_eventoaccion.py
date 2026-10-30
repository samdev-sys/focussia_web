import uuid

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0080_accionkanban_estado_subacciones'),
    ]

    operations = [
        migrations.CreateModel(
            name='EventoAccion',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tipo', models.CharField(choices=[
                    ('CreateAction', 'Se crea una acción principal'),
                    ('EditAction', 'Se modifica una acción principal'),
                    ('DeleteAction', 'Se elimina una acción principal'),
                    ('CreateSubaction', 'Se crea una subacción'),
                    ('EditSubaction', 'Se modifica una subacción'),
                    ('DeleteSubaction', 'Se elimina una subacción'),
                    ('ChangeStatus', 'Cambio de estado'),
                    ('DropAction', 'Reprogramación de la acción'),
                ], max_length=30)),
                ('datos', models.JSONField(blank=True, default=dict)),
                ('creado_en', models.DateTimeField(auto_now_add=True)),
                ('accion', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='eventos', to='dashboard.accionkanban')),
            ],
            options={
                'verbose_name': 'Evento de acción',
                'verbose_name_plural': 'Eventos de acción',
                'ordering': ['-creado_en'],
            },
        ),
    ]
