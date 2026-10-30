from datetime import time

from django.db import migrations


ESTADOS = {'done': 'Completada', 'doing': 'Haciendo'}


def convertir_bloques_en_acciones(apps, schema_editor):
    """Cada bloque con texto pasa a ser una acción principal de la agenda.

    Las filas de TimeBlock se conservan; solo se crea la acción equivalente
    cuando ese bloque y hora todavía no tienen una acción.
    """
    TimeBlock = apps.get_model('dashboard', 'TimeBlock')
    AccionKanban = apps.get_model('dashboard', 'AccionKanban')

    en_ejecucion = set()
    for bloque in TimeBlock.objects.exclude(tarea='').order_by('user_id', 'fecha', 'hora'):
        ya_existe = AccionKanban.objects.filter(
            user_id=bloque.user_id,
            estado_actual='AGENDA_DIARIA',
            fecha_seleccionada=bloque.fecha,
            hora_seleccionada=time(bloque.hora, 0),
        ).exists()
        if ya_existe:
            continue

        estado = ESTADOS.get(bloque.estado, 'Pendiente')
        clave = (bloque.user_id, bloque.fecha)
        if estado == 'Haciendo':
            if clave in en_ejecucion:
                estado = 'Pendiente'
            else:
                en_ejecucion.add(clave)

        AccionKanban.objects.create(
            user_id=bloque.user_id,
            texto_accion=bloque.tarea,
            origen='MANUAL',
            clasificacion='H',
            estado_actual='AGENDA_DIARIA',
            destino_asignado='AGENDA_DIARIA',
            fecha_seleccionada=bloque.fecha,
            fecha_planificada_original=bloque.fecha,
            hora_seleccionada=time(bloque.hora, 0),
            estado=estado,
        )


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0081_eventoaccion'),
    ]

    operations = [
        migrations.RunPython(convertir_bloques_en_acciones, migrations.RunPython.noop),
    ]
