"""Recordatorios anticipados de cumpleaños (Doc 22 §III).

Lo programa django-q2 una vez al día (ver `setup_reminder_schedule`): la
tarea reprograma los Eventos Focusia al año siguiente y envía la activación
proactiva cuando llega la fecha de anticipación. También puede ejecutarse a
mano:

    python manage.py recordar_cumpleanos
"""
from django.core.management.base import BaseCommand

from ...tasks import recordar_cumpleanos


class Command(BaseCommand):
    help = 'Recordatorios anticipados de cumpleaños (Doc 22)'

    def handle(self, *args, **options):
        recordar_cumpleanos()
        self.stdout.write(self.style.SUCCESS('Recordatorios de cumpleaños revisados'))
