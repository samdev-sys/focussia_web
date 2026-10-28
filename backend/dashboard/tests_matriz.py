from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from .models import MatrizEisenhower

User = get_user_model()


class MatrizProgressTests(TestCase):
    """Doc 6 §12: persistencia de avance y finalización del módulo MATRIZ."""

    def setUp(self):
        self.user = User.objects.create_user(username='matriz_user', password='testpass123')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_primer_contacto_deja_en_progreso_con_inicio(self):
        resp = self.client.get('/api/matriz-eisenhower/progress/')
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertEqual(resp.data['status'], 'EN_PROGRESO')
        self.assertIsNotNone(resp.data['started_at'])

    def test_patch_guarda_avance_y_practica(self):
        resp = self.client.patch(
            '/api/matriz-eisenhower/progress/',
            {'status': 'EN_PROGRESO', 'video_watched': True, 'last_step': 4,
             'correct_count': 3, 'incorrect_count': 1,
             'error_quadrants': ['delegate']},
            format='json')
        self.assertEqual(resp.status_code, 200, resp.data)
        obj = MatrizEisenhower.objects.get(user=self.user)
        self.assertEqual(obj.last_step, 4)
        self.assertEqual(obj.correct_count, 3)
        self.assertEqual(obj.incorrect_count, 1)
        self.assertEqual(obj.error_quadrants, ['delegate'])
        self.assertTrue(obj.video_watched)

    def test_completar_fija_cierre_y_permite_reingreso(self):
        resp = self.client.patch(
            '/api/matriz-eisenhower/progress/',
            {'status': 'COMPLETADO', 'correct_count': 4, 'incorrect_count': 0,
             'error_quadrants': [], 'last_step': 5},
            format='json')
        self.assertEqual(resp.status_code, 200, resp.data)
        obj = MatrizEisenhower.objects.get(user=self.user)
        self.assertEqual(obj.status, 'COMPLETADO')
        self.assertIsNotNone(obj.completed_at)
        # Reingreso: lectura sin bloqueo y repetible.
        resp = self.client.get('/api/matriz-eisenhower/progress/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['status'], 'COMPLETADO')
