from django.core.management import call_command
from django.core.management.base import BaseCommand
from django_q.cluster import Cluster


class Command(BaseCommand):
    help = 'Inicia el worker de django-q2 y garantiza las tareas programadas'

    def _registrar_tareas(self):
        """Re-afirma los crons antes de empezar a procesar la cola.

        El worker es el único proceso del stack con `restart: always`, así que
        es el sitio correcto para garantizarlos: si el servidor se reinicia (o
        los contenedores se recrean), el worker vuelve a arrancar y las tareas
        se re-registran solas. Antes dependía del servicio `schedule`, que es
        one-shot con `restart: on-failure`: al terminar con éxito no se
        reinicia, así que tras un reinicio sin `docker compose up -d` los crons
        quedaban sin registrar y el sistema proactivo moría en silencio.

        Es idempotente (`update_or_create`), por eso se puede ejecutar en cada
        arranque sin duplicar tareas.
        """
        try:
            call_command('setup_reminder_schedule')
        except Exception as exc:  # noqa: BLE001 - el worker debe arrancar igual
            self.stderr.write(self.style.ERROR(
                f'No se pudieron registrar las tareas programadas: {exc}'))

    def handle(self, *args, **options):
        self._registrar_tareas()
        self.stdout.write(self.style.WARNING(
            'Iniciando django-q2 cluster para recordatorios... '
            'Presiona Ctrl+C para detener.'
        ))
        cluster = Cluster()
        cluster.start()
