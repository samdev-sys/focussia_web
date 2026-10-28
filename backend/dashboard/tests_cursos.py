from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from .models import ProgramMonth, MonthlyTraining, UserTrainingProgress

User = get_user_model()


class CursosModuleTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='cursos', password='testpass123')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.mes, _ = ProgramMonth.objects.get_or_create(
            month_number=1, defaults={
                'theme_name': 'Identidad y enfoque',
                'training_theme': 'Base', 'formative_objective': 'obj'})
        self.training, _ = MonthlyTraining.objects.get_or_create(
            month=self.mes, defaults={'title': 'Base', 'content': 'contenido'})

    def test_mes_actual_estructura(self):
        resp = self.client.get('/api/cursos/mes-actual/')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('mes_actual', resp.data)
        self.assertIn('progreso_pct', resp.data)
        self.assertIn('capacitacion', resp.data)
        self.assertFalse(resp.data['completado'])
        self.assertTrue(any(m['estado'] == 'actual' for m in resp.data['meses']))
        self.assertEqual(len(resp.data['meses']), 12)

    def test_completar_idempotente(self):
        r1 = self.client.post('/api/cursos/completar/',
                              {'training_id': self.training.id}, format='json')
        self.assertEqual(r1.status_code, 200)
        self.assertTrue(r1.data['completado'])
        r2 = self.client.post('/api/cursos/completar/',
                              {'training_id': self.training.id}, format='json')
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(UserTrainingProgress.objects.filter(
            user=self.user, training=self.training).count(), 1)
        resp = self.client.get('/api/cursos/mes-actual/')
        completados = [m for m in resp.data['meses'] if m['estado'] == 'completada']
        self.assertTrue(any(m['month_number'] == self.mes.month_number for m in completados))

    def test_completar_inexistente_404(self):
        resp = self.client.post('/api/cursos/completar/', {'training_id': 999999}, format='json')
        self.assertEqual(resp.status_code, 404)
