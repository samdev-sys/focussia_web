from datetime import date
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from .models import (
    ProgramMonth, ProgramDay, UserProgramProgress, DailyPhraseViewLog,
)

User = get_user_model()


class FrasesDoc251Tests(TestCase):
    """Doc 25.1: frase diaria por ciclo personal + reinicio anual colectivo."""

    def setUp(self):
        self.user = User.objects.create_user(username='frases', password='testpass123')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.mes, _ = ProgramMonth.objects.get_or_create(
            month_number=1, defaults={
                'theme_name': 'Un nuevo comienzo',
                'training_theme': 'Reinicio personal',
                'formative_objective': 'Arrancar con foco'})
        self.dia, _ = ProgramDay.objects.update_or_create(
            month=self.mes, day_number=1, defaults={
                'phrase': 'Empieza de nuevo con foco.',
                'intention': 'decision'})

    def test_frase_hoy_sale_de_tabla_y_registra_vista(self):
        UserProgramProgress.objects.create(
            user=self.user, cycle_start_date=date.today())
        resp = self.client.get('/api/motivational/today/')
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertEqual(resp.data['phrase'], 'Empieza de nuevo con foco.')
        self.assertEqual(resp.data['month_number'], 1)
        self.assertTrue(DailyPhraseViewLog.objects.filter(
            user=self.user, shown_date=date.today()).exists())

    def test_usuario_nuevo_empieza_mes1_dia1(self):
        UserProgramProgress.objects.create(
            user=self.user, cycle_start_date=date.today())
        resp = self.client.get('/api/motivational/progress/')
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertEqual(resp.data['current_month'], 1)
        self.assertEqual(resp.data['current_day_in_month'], 1)

    def test_reinicio_anual_automatico_sincronizados(self):
        from .services.program_service import get_current_program_day
        UserProgramProgress.objects.create(
            user=self.user, cycle_start_date=date(2025, 6, 18),
            is_synced_to_collective=True)
        dia = get_current_program_day(self.user, today=date(2026, 1, 1))
        progress = UserProgramProgress.objects.get(user=self.user)
        self.assertEqual(progress.cycle_start_date, date(2026, 1, 1))
        self.assertEqual(progress.last_collective_reset_year, 2026)
        self.assertEqual(dia.month.month_number, 1)
        self.assertEqual(dia.day_number, 1)

    def test_reinicio_anual_respeta_no_sincronizados(self):
        from .services.program_service import get_current_program_day
        UserProgramProgress.objects.create(
            user=self.user, cycle_start_date=date(2025, 6, 18),
            is_synced_to_collective=False)
        get_current_program_day(self.user, today=date(2026, 3, 2))
        progress = UserProgramProgress.objects.get(user=self.user)
        self.assertEqual(progress.cycle_start_date, date(2025, 6, 18))
        self.assertIsNone(progress.last_collective_reset_year)
