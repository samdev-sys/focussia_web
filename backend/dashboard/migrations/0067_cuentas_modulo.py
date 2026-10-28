# Generated for Focusia v1.0 - Modulo Cuentas (doc 17)

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0066_redes_sociales'),
    ]

    operations = [
        migrations.CreateModel(
            name='CuentaColumna',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=100)),
                ('orden', models.PositiveIntegerField(default=0)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='cuentas_columnas', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['orden', 'id'],
                'verbose_name': 'Columna de Cuentas',
                'verbose_name_plural': 'Columnas de Cuentas',
            },
        ),
        migrations.CreateModel(
            name='CuentaRegistro',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('periodo_anio', models.PositiveIntegerField(help_text='Año del período mensual')),
                ('periodo_mes', models.PositiveSmallIntegerField(help_text='Mes del período (1-12)')),
                ('cuenta', models.CharField(blank=True, default='', max_length=255)),
                ('dia_vencimiento', models.PositiveSmallIntegerField(blank=True, help_text='Día habitual de pago (1-31)', null=True)),
                ('monto', models.CharField(blank=True, default='', help_text='Valor referencial, texto libre', max_length=100)),
                ('pagado', models.BooleanField(default=False)),
                ('orden', models.PositiveIntegerField(default=0)),
                ('creado_en', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='cuentas_registros', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['orden', 'id'],
                'verbose_name': 'Registro de Cuenta',
                'verbose_name_plural': 'Registros de Cuentas',
            },
        ),
        migrations.CreateModel(
            name='CuentaValor',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('valor', models.TextField(blank=True, default='')),
                ('columna', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='valores', to='dashboard.cuentacolumna')),
                ('registro', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='valores', to='dashboard.cuentaregistro')),
            ],
            options={
                'verbose_name': 'Valor de Celda de Cuentas',
                'verbose_name_plural': 'Valores de Celdas de Cuentas',
                'unique_together': {('registro', 'columna')},
            },
        ),
    ]
