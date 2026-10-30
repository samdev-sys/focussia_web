import uuid

from django.db import migrations, models
import django.db.models.deletion


ESTADO_CHOICES = [
    ('Pendiente', 'Pendiente'),
    ('Haciendo', 'Haciendo'),
    ('Completada', 'Completada'),
]


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0079_cumpleanos'),
    ]

    operations = [
        migrations.AddField(
            model_name='accionkanban',
            name='estado',
            field=models.CharField(choices=ESTADO_CHOICES, default='Pendiente', max_length=12),
        ),
        migrations.CreateModel(
            name='SubaccionKanban',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('texto', models.TextField()),
                ('estado', models.CharField(choices=ESTADO_CHOICES, default='Pendiente', max_length=12)),
                ('orden', models.PositiveIntegerField(default=0)),
                ('creado_en', models.DateTimeField(auto_now_add=True)),
                ('accion', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='subacciones', to='dashboard.accionkanban')),
            ],
            options={
                'verbose_name': 'Subacción',
                'verbose_name_plural': 'Subacciones',
                'ordering': ['orden', 'creado_en'],
            },
        ),
    ]
