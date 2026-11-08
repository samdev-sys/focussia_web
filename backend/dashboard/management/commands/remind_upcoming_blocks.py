"""Recordatorio proactivo de bloques de tiempo próximos (Sistema Proactivo).
"""
from django.core.management.base import BaseCommand

from ...tasks import remind_upcoming_blocks


class Command(BaseCommand):
    help = 'Recuerda bloques de tiempo próximos en los siguientes 30 minutos'

    def handle(self, *args, **options):
        remind_upcoming_blocks()
        self.stdout.write(self.style.SUCCESS('Bloques próximos revisados'))
