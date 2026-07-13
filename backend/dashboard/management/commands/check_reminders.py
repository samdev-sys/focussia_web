from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from dashboard.models import Recordatorio, Notification


class Command(BaseCommand):
    help = 'Revisa recordatorios vencidos y crea notificaciones'

    def handle(self, *args, **options):
        now = timezone.now()
        due = Recordatorio.objects.filter(
            activo=True,
            tomado=False,
            fecha_hora__lte=now,
            fecha_hora__gte=now - timedelta(minutes=1),
        )

        created = 0
        for r in due:
            _, was_created = Notification.objects.get_or_create(
                user=r.user,
                type='reminder',
                title=r.titulo,
                defaults={
                    'message': f'{r.categoria} — {r.titulo}',
                    'data': {
                        'recordatorio_id': r.id,
                        'categoria': r.categoria,
                        'fecha_hora': r.fecha_hora.isoformat(),
                    },
                },
            )
            if was_created:
                created += 1

        self.stdout.write(self.style.SUCCESS(f'{created} notificaciones creadas'))
