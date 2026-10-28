"""Registra en django-q2 las tareas periódicas del Sistema Proactivo.

Lo ejecuta el servicio `schedule` del compose al levantar el stack. Es
idempotente: si la tarea ya está registrada solo actualiza su cadencia.

Ojo: django-q2 evalúa `args` con ast.literal_eval, así que tiene que ser un
literal de Python (una tupla con el nombre del comando), no el nombre suelto.
"""
from django.core.management.base import BaseCommand
from django_q.models import Schedule

FUNC = 'django.core.management.call_command'

# (nombre, comando, tipo de cadencia, minutos, expresión cron)
#   MINUTES / HOURLY → cada N minutos / cada hora.
#   CRON             → expresión crontab (minuto hora día mes día_semana) en la
#                      hora local del proyecto; necesita el paquete `croniter`.
TAREAS = (
    ('Recordatorios genéricos', 'check_reminders', Schedule.MINUTES, 1, None),
    ('Avisos de dosis de suplementos', 'avisar_dosis_pendientes',
     Schedule.MINUTES, 15, None),
    ('Recordatorio de Hora de Oro', 'recordar_hora_de_oro',
     Schedule.HOURLY, None, None),
    # Doc 27 §4: los reportes se publican a las 21:00 y se actualizan hasta las
    # 00:00; cada corrida decide internamente si hoy cierra el período (domingo /
    # último día del mes / 31 dic). Tres pasadas por noche, igual que el
    # calendario de Celery al que reemplazan.
    ('Reportes FocusIA', 'generate_reports', Schedule.CRON, None, '0 21-23 * * *'),
    # Doc 27 §5.1: recordatorio nocturno de acciones sin confirmar.
    ('Acciones pendientes del día', 'remind_pending_actions',
     Schedule.CRON, None, '0 20 * * *'),
    # Doc 27 §2.7: los avisos postergados (Focus, fuera de horario) se revisan
    # y entregan en cuanto se abre una franja permitida, sin ráfagas.
    ('Avisos postergados', 'flush_notificaciones', Schedule.MINUTES, 5, None),
)


class Command(BaseCommand):
    help = 'Registra las tareas programadas de recordatorios en django-q2'

    def handle(self, *args, **options):
        for nombre, comando, tipo, minutos, cron in TAREAS:
            _, created = Schedule.objects.update_or_create(
                func=FUNC,
                args=f"('{comando}',)",
                defaults={
                    'name': nombre,
                    'schedule_type': tipo,
                    'minutes': minutos,
                    'cron': cron,
                    'repeats': -1,
                },
            )
            if cron:
                cadencia = f'cron «{cron}»'
            elif minutos:
                cadencia = f'cada {minutos} min'
            else:
                cadencia = 'cada hora'
            estado = 'programada' if created else 'actualizada'
            self.stdout.write(self.style.SUCCESS(
                f'{nombre}: {estado} ({cadencia})'
            ))
