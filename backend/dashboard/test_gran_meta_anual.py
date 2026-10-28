"""Tests de regresión para el spec 4. BOTÓN GRAN META ANUAL v1.0.

Cubre: elegibilidad por diagnóstico (§3/§22), contexto IA con focos y
comentarios (§9), versionado de borradores e historial (§18) y aprobación
con reemplazo de la vigente sin borrar historial (§13/§16).
"""
import io
import json
import urllib.request
from unittest.mock import patch

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from .models import (
    CategoriaRueda,
    RegistroRueda,
    DiagnosticoRueda,
    GranMetaAnual,
)

User = get_user_model()


class FakeCompletion:
    def __init__(self, content):
        self._content = content

    def read(self):
        return json.dumps({
            'choices': [{'message': {'content': self._content}}],
        }).encode('utf-8')

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


class GranMetaAnualSpecTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='spec_user', password='testpass123')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_eligibility_sin_diagnostico(self):
        resp = self.client.get('/api/gran-meta-anual/eligibility/')
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.data['eligible'])
        self.assertFalse(resp.data['has_diagnostico'])
        self.assertIn('Rueda', resp.data['message'])

    def test_eligibility_con_diagnostico_completado(self):
        DiagnosticoRueda.objects.create(
            user=self.user,
            status=DiagnosticoRueda.Status.COMPLETED,
            foco_1='Dinero', foco_2='Salud', foco_3='Trabajo',
        )
        resp = self.client.get('/api/gran-meta-anual/eligibility/')
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data['eligible'])
        self.assertTrue(resp.data['has_diagnostico'])

    def test_borrador_version_incremental_e_historial(self):
        GranMetaAnual.objects.create(
            user=self.user, generated_goal_text='Meta v1',
            status=GranMetaAnual.Status.APROBADA, is_active=True, version=1,
        )
        resp = self.client.post('/api/gran-meta-anual/borrador/', {
            'texto_meta': 'Meta v2',
            'frase_resumen': 'Resumen',
            'desglose_smart': {'S': 's', 'M': 'm', 'A': 'a', 'R': 'r', 'T': 't'},
            'respuestas': {'p1': 'a', 'p2': 'b', 'p3': 'c'},
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['version'], 2)
        resp = self.client.get('/api/gran-meta-anual/history/')
        self.assertEqual(resp.status_code, 200)
        items = resp.data if isinstance(resp.data, list) else resp.data.get('results', [])
        self.assertEqual(len(items), 2)
        self.assertEqual(items[0]['version'], 2)

    def test_aprobar_reemplaza_vigente_sin_borrar(self):
        vieja = GranMetaAnual.objects.create(
            user=self.user, generated_goal_text='Meta v1',
            status=GranMetaAnual.Status.APROBADA, is_active=True, version=1,
        )
        nueva = GranMetaAnual.objects.create(
            user=self.user, generated_goal_text='Meta v2',
            status=GranMetaAnual.Status.PROPUESTA, is_active=False, version=2,
        )
        resp = self.client.post(f'/api/gran-meta-anual/{nueva.id}/aprobar/')
        self.assertEqual(resp.status_code, 200)
        vieja.refresh_from_db()
        nueva.refresh_from_db()
        self.assertEqual(vieja.status, GranMetaAnual.Status.SUPERSEDIDA)
        self.assertFalse(vieja.is_active)
        self.assertEqual(nueva.status, GranMetaAnual.Status.APROBADA)
        self.assertTrue(nueva.is_active)
        self.assertEqual(GranMetaAnual.objects.filter(user=self.user).count(), 2)

    def test_generar_smart_incluye_focos_y_comentarios(self):
        DiagnosticoRueda.objects.create(
            user=self.user,
            status=DiagnosticoRueda.Status.COMPLETED,
            foco_1='Dinero', foco_2='Salud', foco_3='Trabajo',
        )
        cat = CategoriaRueda.objects.create(nombre='Dinero', icono='💰', orden=2)
        RegistroRueda.objects.create(
            user=self.user, categoria=cat, puntaje=4,
            comentario='Quiero ahorrar para emergencias',
        )
        captured = {}

        def fake_urlopen(req, timeout=30):
            captured['payload'] = json.loads(req.data.decode('utf-8'))
            content = json.dumps({
                'texto_meta': 'Meta', 'frase_resumen': 'Resumen',
                'S': 's', 'M': 'm', 'A': 'a', 'R': 'r', 'T': 't',
            })
            return FakeCompletion(content)

        with patch.object(urllib.request, 'urlopen', side_effect=fake_urlopen):
            def fake_getattr(obj, name, default=None):
                if name == 'GROQ_API_KEY':
                    return 'test-key'
                return default

            with patch('dashboard.views.getattr', side_effect=fake_getattr):
                resp = self.client.post('/api/gran-meta-anual/generar-smart/', {
                    'area': 'Dinero',
                    'resultado': 'Ahorrar',
                    'impacto': 'Tranquilidad',
                    'rueda_data': [{'nombre': 'Dinero', 'puntaje': 4}],
                }, format='json')
        self.assertEqual(resp.status_code, 200)
        prompt = captured['payload']['messages'][0]['content']
        self.assertIn('Dinero', prompt)
        self.assertIn('Salud', prompt)
        self.assertIn('Trabajo', prompt)
        self.assertIn('Quiero ahorrar para emergencias', prompt)
