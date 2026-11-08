# -*- coding: utf-8 -*-
from django.db import migrations


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ('dashboard', '0091_fase2_api_v1_models'),
    ]

    operations = [
        migrations.RunPython(
            lambda apps, schema_editor: None,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
