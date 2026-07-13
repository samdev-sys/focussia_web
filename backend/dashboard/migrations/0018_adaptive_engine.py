# Generated manually - Adaptive AI Engine models

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0017_security_models'),
    ]

    operations = [
        migrations.CreateModel(
            name='AISuggestion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('phase_reached', models.IntegerField(default=1)),
                ('situacion_clara', models.TextField()),
                ('explicacion_impacto', models.TextField()),
                ('propuesta_ajuste', models.TextField()),
                ('tipo_impacto', models.CharField(choices=[('estructural', 'Estructural (Alta Saturación)'), ('estrategico', 'Estratégico Crítico'), ('prioridad', 'De Prioridad (Desorden Generalizado)')], default='prioridad', max_length=20)),
                ('decision', models.CharField(blank=True, choices=[('apply', 'Aplicar Ajuste Ahora'), ('review', 'Ver Planificación / Revisar Después'), ('keep', 'Mantener Planificación Actual'), ('ignore', 'Ignorado / Sin Respuesta')], max_length=10, null=True)),
                ('is_read', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('responded_at', models.DateTimeField(blank=True, null=True)),
                ('deviation_data', models.JSONField(blank=True, default=dict)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='ai_suggestions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='AdaptiveThreshold',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('estructural_threshold', models.FloatField(default=1.0)),
                ('estrategico_threshold', models.FloatField(default=1.0)),
                ('prioridad_threshold', models.FloatField(default=1.0)),
                ('estructural_rejections', models.IntegerField(default=0)),
                ('estrategico_rejections', models.IntegerField(default=0)),
                ('prioridad_rejections', models.IntegerField(default=0)),
                ('last_adjusted', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='adaptive_threshold', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Umbral Adaptativo',
                'verbose_name_plural': 'Umbrales Adaptativos',
            },
        ),
    ]
