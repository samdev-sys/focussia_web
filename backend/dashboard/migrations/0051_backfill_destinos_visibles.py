# Retroadaptación: acciones clasificadas ANTES del fix de destinos visibles.
# 1) POR_DELEGAR sin puente legacy → crea KanbanTask Delegar (sección dashboard).
# 2) ObjetivoMensual huérfano (meta_anual NULL) → vincula última MetaAnual
#    para que la vista mensual filtrada lo muestre.
# Idempotente en ambos casos.
from django.db import migrations


def backfill_destinos(apps, schema_editor):
    AccionKanban = apps.get_model('dashboard', 'AccionKanban')
    KanbanTask = apps.get_model('dashboard', 'KanbanTask')
    ObjetivoMensual = apps.get_model('dashboard', 'ObjetivoMensual')
    MetaAnual = apps.get_model('dashboard', 'MetaAnual')

    puentes = 0
    for acc in AccionKanban.objects.filter(estado_actual='POR_DELEGAR').iterator():
        if not KanbanTask.objects.filter(
            user_id=acc.user_id, columna='Delegar', titulo=acc.texto_accion[:255]
        ).exists():
            KanbanTask.objects.create(
                user_id=acc.user_id,
                titulo=acc.texto_accion[:255],
                descripcion=f'Delegada desde Kanban Backlog: {acc.texto_accion}',
                columna='Delegar',
            )
            puentes += 1

    vinculados = 0
    for obj in ObjetivoMensual.objects.filter(meta_anual__isnull=True).iterator():
        ultima = MetaAnual.objects.filter(user_id=obj.user_id).order_by('-creado').first()
        if ultima:
            obj.meta_anual_id = ultima.id
            obj.save(update_fields=['meta_anual'])
            vinculados += 1

    if puentes or vinculados:
        print(f'\n[kanban-destinos] puentes delegar: {puentes}, mensuales vinculados: {vinculados}.')


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0050_migrar_kanbantask_a_accionkanban'),
    ]

    operations = [
        migrations.RunPython(backfill_destinos, reverse_code=migrations.RunPython.noop),
    ]
