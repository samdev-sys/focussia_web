# Migración de unificación del backlog (spec BOTÓN 7 — KANBAN BACKLOG v1.0):
# las tareas del tablero legacy (KanbanTask en columnas de backlog) aterrizan
# en la bandeja visible (AccionKanban en KANBAN_ACTIVO) para que el agente
# (agent_service) y la UI muestren exactamente lo mismo. Idempotente por texto.
from django.db import migrations


BACKLOG_COLUMNAS = ('Backlog', 'Agenda', 'Por hacer')


def migrar_backlog_a_bandeja(apps, schema_editor):
    KanbanTask = apps.get_model('dashboard', 'KanbanTask')
    AccionKanban = apps.get_model('dashboard', 'AccionKanban')
    HistorialMovimiento = apps.get_model('dashboard', 'HistorialMovimiento')

    pendientes = KanbanTask.objects.filter(columna__in=BACKLOG_COLUMNAS)
    migradas = 0
    for task in pendientes.iterator():
        ya_existe = AccionKanban.objects.filter(
            user_id=task.user_id,
            estado_actual='KANBAN_ACTIVO',
            texto_accion=task.titulo,
        ).exists()
        if not ya_existe:
            accion = AccionKanban.objects.create(
                user_id=task.user_id,
                texto_accion=task.titulo,
                origen='OTRO',
                estado_actual='KANBAN_ACTIVO',
                fecha_seleccionada=task.fecha_hora.date() if task.fecha_hora else None,
            )
            HistorialMovimiento.objects.create(
                accion=accion,
                estado_anterior=f'TABLERO_LEGACY_{task.columna}',
                estado_nuevo='KANBAN_ACTIVO',
            )
            migradas += 1
        task.delete()
    if migradas:
        print(f'\n[kanban-backlog] {migradas} tareas legacy migradas a la bandeja.')


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0049_mission_photo'),
    ]

    operations = [
        migrations.RunPython(migrar_backlog_a_bandeja, reverse_code=migrations.RunPython.noop),
    ]
