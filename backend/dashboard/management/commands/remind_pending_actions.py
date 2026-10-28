"""Recuerda al usuario las acciones del día que quedaron sin confirmar (Doc 27 §5.1).

Lo programa django-q2 cada noche a las 20:00 (ver `setup_reminder_schedule`).
También puede ejecutarse a mano:

    python manage.py remind_pending_actions
"""
from django.core.management.base import BaseCommand

from ...tasks import remind_pending_actions


class Command(BaseCommand):
    help = 'Recuerda las acciones pendientes del día (Doc 27)'

    def handle(self, *args, **options):
        remind_pending_actions()
        self.stdout.write(self.style.SUCCESS('Acciones pendientes revisadas'))
