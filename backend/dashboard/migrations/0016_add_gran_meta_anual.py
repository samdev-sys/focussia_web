# Generated manually for GranMetaAnual model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0015_add_meta_usuario'),
    ]

    operations = [
        migrations.CreateModel(
            name='GranMetaAnual',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('texto_meta', models.TextField()),
                ('frase_resumen', models.CharField(blank=True, default='', max_length=300)),
                ('desglose_smart', models.JSONField(blank=True, default=dict)),
                ('respuestas', models.JSONField(blank=True, default=dict)),
                ('is_vigente', models.BooleanField(default=False)),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
                ('fecha_aprobacion', models.DateTimeField(blank=True, null=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='metas_anuales', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-fecha_creacion'],
            },
        ),
    ]
