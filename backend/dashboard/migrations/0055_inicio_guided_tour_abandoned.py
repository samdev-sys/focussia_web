from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0054_seed_tema_tribu'),
    ]

    operations = [
        migrations.AlterField(
            model_name='inicioeventlog',
            name='event_type',
            field=models.CharField(choices=[('intro_video_shown', 'Video inicial mostrado'), ('intro_video_completed', 'Video inicial completado'), ('intro_video_abandoned', 'Video inicial abandonado'), ('dashboard_opened', 'Dashboard completo abierto'), ('tutorial_opened', 'Tutorial abierto'), ('intro_video_replayed', 'Video inicial visto desde tutorial'), ('learn_by_sections_opened', 'Aprender por secciones abierto'), ('learn_category_selected', 'Categoría de aprendizaje seleccionada'), ('guided_tour_started', 'Visita guiada iniciada'), ('guided_tour_completed', 'Visita guiada completada'), ('guided_tour_abandoned', 'Visita guiada abandonada'), ('config_opened', 'Configuración abierta desde INICIO'), ('config_video_shown', 'Video de configuración mostrado'), ('config_categories_opened', 'Configuración por categorías abierta'), ('config_changed', 'Cambios de configuración realizados'), ('returned_to_inicio', 'Usuario volvió a INICIO')], max_length=40),
        ),
    ]
