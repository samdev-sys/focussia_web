import logging
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from dashboard.engine import DecisionEngine

User = get_user_model()
logger = logging.getLogger('focusia.security')


class Command(BaseCommand):
    help = 'Ejecuta el motor de decisión (árbol de 5 fases) para todos los usuarios activos.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user-id',
            type=int,
            help='Ejecutar solo para un usuario específico (por ID).',
        )

    def handle(self, *args, **options):
        engine = DecisionEngine()
        user_id = options.get('user_id')

        if user_id:
            usuarios = User.objects.filter(id=user_id, is_active=True)
        else:
            usuarios = User.objects.filter(is_active=True)

        self.stdout.write(f'Iniciando motor de decisión para {usuarios.count()} usuario(s)...')

        for user in usuarios:
            try:
                resultado = engine.ejecutar_ciclo(user)
                if resultado['completo']:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'  [{user.username}] Propuesta generada (ID: {resultado["propuesta_id"]})'
                        )
                    )
                else:
                    self.stdout.write(f'  [{user.username}] {resultado["mensaje"]}')
            except Exception as e:
                logger.exception(f'Error ejecutando motor para user={user.id}')
                self.stderr.write(self.style.ERROR(f'  [{user.username}] Error: {e}'))

        self.stdout.write(self.style.SUCCESS('Motor de decisión completado.'))
