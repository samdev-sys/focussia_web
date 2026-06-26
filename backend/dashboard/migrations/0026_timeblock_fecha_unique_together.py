from django.db import migrations, models
from datetime import date


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0025_matriz_learning_progress'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='timeblock',
            options={'ordering': ['fecha', 'hora']},
        ),
        migrations.AddField(
            model_name='timeblock',
            name='fecha',
            field=models.DateField(default=date.today),
        ),
        migrations.AlterField(
            model_name='timeblock',
            name='hora',
            field=models.IntegerField(),
        ),
        migrations.AlterUniqueTogether(
            name='timeblock',
            unique_together={('user', 'fecha', 'hora')},
        ),
    ]
