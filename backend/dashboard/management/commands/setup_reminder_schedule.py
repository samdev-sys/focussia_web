from django.core.management.base import BaseCommand
from django_q.models import Schedule


class Command(BaseCommand):
    help = 'Registra la tarea programada de recordatorios en django-q2'

    def handle(self, *args, **options):
        func = 'django.core.management.call_command'
        args = 'check_reminders'

        _, created = Schedule.objects.get_or_create(
            func=func,
            args=args,
            defaults={
                'schedule_type': Schedule.MINUTES,
                'minutes': 1,
                'repeats': -1,
            },
        )

        if created:
            self.stdout.write(self.style.SUCCESS(
                'Tarea check_reminders programada cada 1 minuto'
            ))
        else:
            self.stdout.write(self.style.WARNING(
                'La tarea ya estaba programada'
            ))
