from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0023_kanbanaction'),
    ]

    operations = [
        migrations.AlterField(
            model_name='timeblock',
            name='estado',
            field=models.CharField(default='pending', max_length=10),
        ),
    ]
