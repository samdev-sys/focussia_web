from django.core.management.base import BaseCommand

from dashboard.models import AccionKanban, TimeBlock
from dashboard.services.timeblock_agenda_sync import (
    sync_accion_from_timeblock,
    sync_timeblock_from_accion,
)


class Command(BaseCommand):
    help = (
        'Sincroniza TimeBlock <-> AccionKanban (AGENDA_DIARIA) para alinear '
        'Time Blocking y Agenda diaria en datos existentes.'
    )

    def handle(self, *args, **options):
        # 1) Toda acción en agenda diaria debe tener su bloque horario.
        agenda_qs = AccionKanban.objects.filter(
            estado_actual=AccionKanban.EstadoChoices.AGENDA_DIARIA,
            fecha_seleccionada__isnull=False,
            hora_seleccionada__isnull=False,
        )
        agenda_count = 0
        for accion in agenda_qs.iterator():
            sync_timeblock_from_accion(accion)
            agenda_count += 1

        # 2) Todo bloque con tarea debe existir como acción de agenda diaria.
        #    Si ya hay una acción en ese slot, se respeta (fuente canónica UI).
        promoted = 0
        for bloque in TimeBlock.objects.exclude(tarea='').exclude(tarea__isnull=True).iterator():
            hora = bloque.hora
            try:
                from datetime import time as dt_time
                hora_t = dt_time(hour=int(hora), minute=0)
            except Exception:
                continue
            exists = AccionKanban.objects.filter(
                user_id=bloque.user_id,
                estado_actual=AccionKanban.EstadoChoices.AGENDA_DIARIA,
                fecha_seleccionada=bloque.fecha,
                hora_seleccionada=hora_t,
            ).exists()
            if not exists:
                sync_accion_from_timeblock(bloque)
                promoted += 1

        self.stdout.write(self.style.SUCCESS(
            f'Sincronización completa: {agenda_count} acciones de agenda revisadas, '
            f'{promoted} bloques promovidos a agenda diaria.'
        ))