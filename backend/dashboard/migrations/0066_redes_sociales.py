# Generated for Focusia v1.0 - Modulo Redes Sociales (doc 16)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0065_pushsubscription'),
    ]

    operations = [
        migrations.AddField(
            model_name='configuracionusuario',
            name='redes_sociales',
            field=models.JSONField(blank=True, default=dict, help_text='Enlaces de redes sociales del usuario: {"tiktok": "https://...", "facebook": "", "instagram": "", "linkedin": "", "youtube": "", "x": ""}'),
        ),
    ]
