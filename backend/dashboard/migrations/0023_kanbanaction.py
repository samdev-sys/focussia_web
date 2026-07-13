import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('dashboard', '0022_matrizeisenhower_only'),
    ]

    operations = [
        migrations.CreateModel(
            name='KanbanAction',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=500)),
                ('source', models.CharField(
                    choices=[('USER_INPUT', 'Usuario'), ('RUEDA_VIDA_SUGGESTION', 'Sugerencia Rueda de Vida')],
                    default='USER_INPUT',
                    max_length=30,
                )),
                ('classification_status', models.CharField(
                    choices=[
                        ('PENDIENTE', 'Pendiente'),
                        ('HACER', 'Hacer'),
                        ('PLANIFICAR', 'Planificar'),
                        ('DELEGAR', 'Delegar'),
                        ('ELIMINAR', 'Eliminar'),
                    ],
                    default='PENDIENTE',
                    max_length=20,
                )),
                ('scheduled_date', models.DateField(blank=True, null=True)),
                ('pinned', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='kanban_actions',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['-pinned', '-created_at'],
            },
        ),
    ]
