"""Genera o reconcilia los reportes FocusIA (Doc 27).

Uso habitual:
    python manage.py generate_reports                 # reconcilia todos los usuarios
    python manage.py generate_reports --user 3        # solo un usuario
    python manage.py generate_reports --level weekly  # solo un tipo
    python manage.py generate_reports --force         # recalcula aunque el período esté cerrado

Sin `--force`, solo se generan los reportes cuyo período cierra hoy (domingo,
último día del mes o 31 de diciembre) según la hora local del usuario.
"""
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from ...tasks import _generate_report_for_user, reconciliar_reportes

LEVELS = ('weekly', 'monthly', 'annual')


class Command(BaseCommand):
    help = 'Genera o reconcilia los reportes FocusIA (Doc 27)'

    def add_arguments(self, parser):
        parser.add_argument('--user', type=int, default=None, help='ID del usuario')
        parser.add_argument('--level', choices=LEVELS, default=None, help='Tipo de reporte')
        parser.add_argument('--force', action='store_true', help='Recalcular aunque el período esté cerrado')

    def handle(self, *args, **options):
        User = get_user_model()
        users = User.objects.filter(is_active=True)
        if options['user']:
            users = users.filter(id=options['user'])

        levels = [options['level']] if options['level'] else list(LEVELS)
        creados = 0
        for user in users:
            if not options['force']:
                reconciliar_reportes(user)
            for level in levels:
                report = _generate_report_for_user(user, level, force=options['force'])
                if report:
                    creados += 1
                    self.stdout.write(
                        f'user={user.id} {level} {report.period_start}→{report.period_end} '
                        f'[{report.generation_state}] {report.completion_percentage}%'
                    )

        self.stdout.write(self.style.SUCCESS(f'Reportes procesados: {creados}'))
