"""Entrega los avisos postergados del Sistema Proactivo (Doc 27 §2.7).

Lo programa django-q2 cada 5 minutos (ver `setup_reminder_schedule`). También
puede ejecutarse a mano:

    python manage.py flush_notificaciones
"""
from django.core.management.base import BaseCommand

from ...tasks import flush_notificaciones


class Command(BaseCommand):
    help = 'Entrega los avisos postergados (Doc 27)'

    def handle(self, *args, **options):
        resultado = flush_notificaciones()
        self.stdout.write(self.style.SUCCESS(
            'Avisos pendientes: entregados={entregados} cancelados={cancelados} '
            'esperando={esperando}'.format(
                entregados=resultado.get('entregados', 0),
                cancelados=resultado.get('cancelados', 0),
                esperando=resultado.get('esperando', 0),
            )))
