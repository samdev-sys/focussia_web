import django.core.validators
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('dashboard', '0045_inicio_privacy_preferences'),
    ]

    operations = [
        migrations.CreateModel(
            name='ReportDataSource',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('source_type', models.CharField(max_length=50)),
                ('reference_id', models.CharField(blank=True, default='', max_length=100)),
                ('snapshot', models.JSONField(blank=True, default=dict)),
            ],
            options={
                'verbose_name': 'Fuente de Datos del Reporte',
                'verbose_name_plural': 'Fuentes de Datos del Reporte',
            },
        ),
        migrations.RunSQL(
            sql="DROP TABLE IF EXISTS dashboard_focusiareport;",
            reverse_sql="SELECT 1;",
        ),
        migrations.CreateModel(
            name='FocusiaReport',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('level', models.CharField(choices=[
                    ('weekly', 'Semanal'),
                    ('monthly', 'Mensual'),
                    ('annual', 'Anual'),
                ], max_length=10)),
                ('period_start', models.DateField()),
                ('period_end', models.DateField()),
                ('completion_percentage', models.FloatField(default=0, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(100)])),
                ('completed_count', models.PositiveIntegerField(default=0)),
                ('pending_count', models.PositiveIntegerField(default=0)),
                ('strong_days', models.JSONField(blank=True, default=list)),
                ('weak_days', models.JSONField(blank=True, default=list)),
                ('consistency_score', models.FloatField(blank=True, null=True)),
                ('headline_message', models.CharField(blank=True, default='', max_length=280)),
                ('ai_interpretation', models.TextField(blank=True, default='')),
                ('ai_raw_metadata', models.JSONField(blank=True, default=dict)),
                ('status', models.CharField(choices=[
                    ('generated', 'Generado'),
                    ('notified', 'Usuario notificado'),
                    ('opened', 'Abierto por el usuario'),
                    ('action_taken', 'Usuario tomó acción'),
                    ('dismissed', 'Revisado más tarde'),
                ], default='generated', max_length=20)),
                ('notified_at', models.DateTimeField(blank=True, null=True)),
                ('opened_at', models.DateTimeField(blank=True, null=True)),
                ('action_taken', models.CharField(blank=True, choices=[
                    ('reorganize_week', 'Reorganizar semana'),
                    ('adjust_goal', 'Ajustar objetivo'),
                    ('keep_plan', 'Mantener plan'),
                    ('review_later', 'Revisar más tarde'),
                ], max_length=20, null=True)),
                ('action_taken_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='focusia_reports', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Reporte FocusIA',
                'verbose_name_plural': 'Reportes FocusIA',
                'ordering': ['-period_start'],
                'unique_together': {('user', 'level', 'period_start')},
            },
        ),
        migrations.AddField(
            model_name='reportdatasource',
            name='report',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='data_sources', to='dashboard.focusiareport'),
        ),
    ]
