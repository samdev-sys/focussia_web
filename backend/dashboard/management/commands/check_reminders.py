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
        ).exclude(categoria='Cumpleaños')

        created = 0
        for r in due:
            # Un recordatorio repetido puede compartir título; la identidad es el
            # recordatorio y su ocurrencia programada (evita re-notificar lo mismo).
            ya_notificado = Notification.objects.filter(
                user=r.user,
                type='reminder',
                data__recordatorio_id=r.id,
                data__fecha_hora=r.fecha_hora.isoformat(),
            ).exists()
            if ya_notificado:
                continue
            Notification.objects.create(
                user=r.user,
                type='reminder',
                title=r.titulo,
                message=f'{r.categoria} — {r.titulo}',
                data={
                    'recordatorio_id': r.id,
                    'categoria': r.categoria,
                    'fecha_hora': r.fecha_hora.isoformat(),
                },
            )
            created += 1

        self.stdout.write(self.style.SUCCESS(f'{created} notificaciones creadas'))
