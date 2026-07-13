from django.core.management.base import BaseCommand
from django_q.cluster import Cluster


class Command(BaseCommand):
    help = 'Inicia el worker de django-q2 para procesar recordatorios'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING(
            'Iniciando django-q2 cluster para recordatorios... '
            'Presiona Ctrl+C para detener.'
        ))
        cluster = Cluster()
        cluster.start()
