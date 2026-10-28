"""Avisa de las dosis de suplementos cuya hora ya pasó sin registrarse (Doc 21 §III).

Lo programa django-q2 cada 15 minutos (ver `setup_reminder_schedule`). También
puede ejecutarse a mano:

    python manage.py avisar_dosis_pendientes
"""
from django.core.management.base import BaseCommand

from ...tasks import avisar_dosis_pendientes


class Command(BaseCommand):
    help = 'Avisa de las dosis de suplementos pendientes (Doc 21)'

    def handle(self, *args, **options):
        avisar_dosis_pendientes()
        self.stdout.write(self.style.SUCCESS('Dosis pendientes revisadas'))
