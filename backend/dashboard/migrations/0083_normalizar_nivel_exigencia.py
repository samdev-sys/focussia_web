"""Normaliza `ConfiguracionUsuario.nivel_exigencia` a su vocabulario canónico.

Contexto: el onboarding escribía la intensidad del acompañamiento tal cual
('SUAVE', 'EQUILIBRADA', 'EXIGENTE') en una columna de 5 caracteres cuyos
choices son 'bajo'/'medio'/'alto'. En SQLite (desarrollo) los valores cortos
entraban sin validarse —de hecho hay filas con 'SUAVE'—, mientras que en
PostgreSQL 'EQUILIBRADA' (11 caracteres) lanzaba DataError y cortaba el alta.

Esta migración deja la columna en el vocabulario correcto. Es idempotente:
los valores ya normalizados no se tocan.
"""

from django.db import migrations

# Mismo mapa que `dashboard.models._INTENSIDAD_A_NIVEL_EXIGENCIA`. Se replica
# aquí a propósito: las migraciones no deben depender del código actual del
# modelo, que puede cambiar en el futuro.
INTENSIDAD_A_NIVEL = {
    'suave': 'bajo',
    'equilibrada': 'medio',
    'exigente': 'alto',
}


def normalizar(apps, schema_editor):
    ConfiguracionUsuario = apps.get_model('dashboard', 'ConfiguracionUsuario')

    for intensidad, nivel in INTENSIDAD_A_NIVEL.items():
        ConfiguracionUsuario.objects.filter(
            nivel_exigencia__iexact=intensidad,
        ).update(nivel_exigencia=nivel)

    # Cualquier otro valor fuera del vocabulario (p. ej. una intensidad nueva
    # que no esté mapeada) cae al nivel medio, que es el default del modelo.
    validos = list(INTENSIDAD_A_NIVEL.values())
    ConfiguracionUsuario.objects.exclude(nivel_exigencia__in=validos).update(
        nivel_exigencia='medio',
    )


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0082_timeblock_texto_a_accion'),
    ]

    operations = [
        migrations.RunPython(normalizar, migrations.RunPython.noop),
    ]
