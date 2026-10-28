"""Recuerda la Hora de Oro Familiar del día (Doc 24 §III).

Lo programa django-q2 cada hora (ver `setup_reminder_schedule`): la tarea compara
la hora local con la que configuró el usuario y avisa solo cuando coinciden.
También puede ejecutarse a mano:

    python manage.py recordar_hora_de_oro
"""
from django.core.management.base import BaseCommand

from ...tasks import recordar_hora_de_oro


class Command(BaseCommand):
    help = 'Recuerda la Hora de Oro Familiar (Doc 24)'

    def handle(self, *args, **options):
        recordar_hora_de_oro()
        self.stdout.write(self.style.SUCCESS('Recordatorios de Hora de Oro revisados'))
