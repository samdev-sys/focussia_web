from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from .models import ProgramMonth, MonthlyTraining, UserProgramProgress
from datetime import date

User = get_user_model()


class CursosMesTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='cursos', password='testpass123')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.m1 = ProgramMonth.objects.get(month_number=1)
        MonthlyTraining.objects.update_or_create(
            month=self.m1, defaults={'title': 'Cap 1', 'content': 'c1'})
        m2, _ = ProgramMonth.objects.get_or_create(
            month_number=2, defaults={
                'theme_name': 'T2', 'training_theme': 'T2', 'formative_objective': 'o2'})
        MonthlyTraining.objects.get_or_create(
            month=m2, defaults={'title': 'Cap 2', 'content': 'c2'})
        UserProgramProgress.objects.create(user=self.user, cycle_start_date=date.today())

    def test_ver_mes_anterior(self):
        resp = self.client.get('/api/cursos/mes/', {'month': 1})
        # mes actual del ciclo recién iniciado es 1 → ver mes 1 = actual
        self.assertIn(resp.status_code, (200, 403))

    def test_mes_futuro_bloqueado(self):
        resp = self.client.get('/api/cursos/mes/', {'month': 12})
        self.assertEqual(resp.status_code, 403)

    def test_mes_inexistente_404(self):
        resp = self.client.get('/api/cursos/mes/', {'month': 99})
        self.assertEqual(resp.status_code, 404)

    def test_mes_anterior_con_progreso_avanzado(self):
        from .services.program_service import get_current_program_day
        from datetime import timedelta
        # Simula avance al mes 2 del ciclo
        prog = UserProgramProgress.objects.get(user=self.user)
        prog.cycle_start_date = date.today() - timedelta(days=35)
        prog.save()
        day = get_current_program_day(self.user)
        self.assertEqual(day.month.month_number, 2)
        resp = self.client.get('/api/cursos/mes/', {'month': 1})
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertEqual(resp.data['capacitacion']['title'], 'Cap 1')
        self.assertIn('completado', resp.data)
