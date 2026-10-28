from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from .models import TribuTemaSemana, TribuCompromiso, AccionKanban

User = get_user_model()


class TribuModuleTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='tribu', password='testpass123')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_tema_actual_devuelve_tema_por_defecto(self):
        # La migración seed garantiza contenido inicial
        resp = self.client.get('/api/tribu/tema-actual/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['titulo'], 'Gestión del Tiempo')

    def test_tema_actual_devuelve_activo(self):
        TribuTemaSemana.objects.create(titulo='Viejo', activo=False)
        nuevo = TribuTemaSemana.objects.create(
            titulo='Gestión del Tiempo', descripcion='desc',
            reflexion='reflex', pregunta='¿preg?')
        resp = self.client.get('/api/tribu/tema-actual/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['id'], nuevo.id)
        self.assertEqual(resp.data['titulo'], 'Gestión del Tiempo')

    def test_compromiso_get_y_patch(self):
        resp = self.client.get('/api/tribu/compromiso/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['texto'], '')
        resp = self.client.patch('/api/tribu/compromiso/', {
            'texto': 'Compartir idea', 'tribu': 'FAMILIA'}, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['texto'], 'Compartir idea')
        self.assertEqual(
            TribuCompromiso.objects.filter(user=self.user).count(), 1)

    def test_enviar_kanban_crea_accion_y_no_duplica(self):
        payload = {'texto': 'una idea sobre cómo proteger mejor mi tiempo',
                   'tribu': 'FAMILIA'}
        r1 = self.client.post('/api/tribu/enviar-kanban/', payload, format='json')
        self.assertEqual(r1.status_code, 200)
        self.assertFalse(r1.data['repetido'])
        acc = AccionKanban.objects.get(id=r1.data['accion_id'])
        self.assertIn('mi familia', acc.texto_accion)
        self.assertEqual(acc.estado_actual, 'KANBAN_ACTIVO')
        r2 = self.client.post('/api/tribu/enviar-kanban/', payload, format='json')
        self.assertEqual(r2.status_code, 200)
        self.assertTrue(r2.data['repetido'])
        self.assertEqual(AccionKanban.objects.filter(
            user=self.user, estado_actual='KANBAN_ACTIVO').count(), 1)

    def test_enviar_sin_texto_400(self):
        resp = self.client.post('/api/tribu/enviar-kanban/', {'texto': ''}, format='json')
        self.assertEqual(resp.status_code, 400)
