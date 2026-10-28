from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from .models import CategoriaRueda, DiagnosticoRueda

User = get_user_model()


class DiagnosticoFocosTests(TestCase):
    """Doc 2: focos por puntaje bajo + comentario (no solo las 3 más bajas)."""

    def setUp(self):
        self.user = User.objects.create_user(username='rueda_user', password='testpass123')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.cats = list(CategoriaRueda.objects.filter(activo=True).order_by('orden')[:10])
        self.assertEqual(len(self.cats), 10)

    def _post(self, puntajes, comentarios=None):
        payload = {'puntajes': {str(c.id): p for c, p in zip(self.cats, puntajes)}}
        if comentarios:
            payload['comentarios'] = comentarios
        return self.client.post('/api/rueda/generar-diagnostico/', payload, format='json')

    def test_comentario_da_prioridad_sobre_puntaje_levemente_menor(self):
        # Todas en 8 salvo: A=3 sin comentario, B=4 con comentario largo.
        puntajes = [8] * 10
        puntajes[0] = 3
        puntajes[1] = 4
        comentario_largo = 'Me preocupa mucho esta área, siento tensión cada día. ' * 4
        resp = self._post(puntajes, {str(self.cats[1].id): comentario_largo})
        self.assertEqual(resp.status_code, 200, resp.data)
        # B (4 con comentario → peso 2) debe ir antes que A (3 sin comentario → peso 3).
        self.assertEqual(resp.data['foco_1'], self.cats[1].nombre)
        self.assertIn('Detalle:', resp.data['justificacion_focos'])
        self.assertIn(self.cats[1].nombre, resp.data['justificacion_focos'])

    def test_sin_comentarios_elige_las_mas_bajas(self):
        puntajes = [9, 9, 2, 9, 9, 9, 4, 9, 9, 3]
        resp = self._post(puntajes)
        self.assertEqual(resp.status_code, 200, resp.data)
        focos = {resp.data['foco_1'], resp.data['foco_2'], resp.data['foco_3']}
        bajos = {self.cats[2].nombre, self.cats[6].nombre, self.cats[9].nombre}
        self.assertEqual(focos, bajos)
        self.assertTrue(DiagnosticoRueda.objects.filter(user=self.user).exists())
