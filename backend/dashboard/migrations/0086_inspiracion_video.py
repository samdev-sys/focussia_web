from django.db import migrations, models
import dashboard.models


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0085_alter_delegation_task'),
    ]

    operations = [
        migrations.CreateModel(
            name='InspiracionVideo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('categoria', models.CharField(choices=[('humor', 'Humor'), ('salud', 'Salud'), ('hobbies', 'Hobbies'), ('viajes', 'Viajes'), ('diversion', 'Diversión'), ('reflexion', 'Reflexión')], db_index=True, max_length=20)),
                ('titulo', models.CharField(max_length=200)),
                ('miniatura_url', models.URLField(blank=True, default='', help_text='URL externa de la miniatura (opcional)')),
                ('miniatura_file', models.ImageField(blank=True, help_text='Miniatura subida desde el panel. Se usa si no hay miniatura_url.', null=True, upload_to=dashboard.models.inspiracion_miniatura_path)),
                ('youtube_url', models.URLField(help_text='Link oficial del video en YouTube')),
                ('orden', models.PositiveSmallIntegerField(db_index=True, default=0)),
                ('activo', models.BooleanField(db_index=True, default=True)),
                ('creado', models.DateTimeField(auto_now_add=True)),
                ('actualizado', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Recurso de Inspiración',
                'verbose_name_plural': 'Recursos de Inspiración',
                'ordering': ['orden', 'id'],
            },
        ),
    ]
