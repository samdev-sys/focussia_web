from django.core.management.base import BaseCommand
from ...services.annual_reset import apply_collective_annual_reset


class Command(BaseCommand):
    help = 'Aplica el reinicio anual colectivo del programa motivacional (1 de enero)'

    def handle(self, *args, **options):
        updated = apply_collective_annual_reset()
        self.stdout.write(self.style.SUCCESS(f'Reinicio anual aplicado a {updated} usuarios'))
