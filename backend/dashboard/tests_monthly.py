from datetime import date
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from .models import (
    MetaAnual, GranMetaAnual, DiagnosticoRueda,
    MonthlyPlan, MonthlyGoal,
)

User = get_user_model()


class MonthlyDoc27Tests(TestCase):
    """Doc 27 (BOTÓN MENSUAL): dependencias, personalización, revisión."""

    def setUp(self):
        self.user = User.objects.create_user(username='mensual', password='testpass123')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _aprobar_anual(self, titulo='Gran meta anual de prueba'):
        return MetaAnual.objects.create(
            user=self.user, titulo=titulo, descripcion=titulo,
            fecha_inicio=date(2026, 1, 1), fecha_fin=date(2026, 12, 31),
            aprobada=True)

    def test_generate_sin_meta_anual_bloquea(self):
        resp = self.client.post('/api/monthly-plan/generate/', {
            'cycle_start_month': 6, 'cycle_start_year': 2026}, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data.get('code'), 'sin_gran_meta')

    def test_generate_personaliza_con_meta_y_focos(self):
        self._aprobar_anual('Crear mi negocio online')
        DiagnosticoRueda.objects.create(
            user=self.user, promedio_general=5.5, nivel_equilibrio='Medio',
            foco_1='Dinero', foco_2='Salud', foco_3='Trabajo',
            justificacion_focos='test')
        resp = self.client.post('/api/monthly-plan/generate/', {
            'cycle_start_month': 6, 'cycle_start_year': 2026}, format='json')
        self.assertEqual(resp.status_code, 201, resp.data)
        goals = resp.data['goals']
        self.assertEqual(len(goals), 12)
        # Ciclo personalizado junio→mayo con rollover de año.
        self.assertEqual((goals[0]['calendar_month'], goals[0]['calendar_year']), (6, 2026))
        self.assertEqual((goals[11]['calendar_month'], goals[11]['calendar_year']), (5, 2027))
        # Progresión de complejidad.
        levels = [g['complexity_level'] for g in goals]
        self.assertEqual(levels[:2], ['BASE', 'BASE'])
        self.assertIn('CIERRE', levels[-4:])
        # Personalización con la meta anual y focos (no plantillas genéricas).
        textos = ' '.join(g['monthly_goal_text'] + g['annual_goal_relation'] + g['brief_explanation'] for g in goals)
        self.assertIn('Crear mi negocio online', textos)
        self.assertIn('Dinero', textos)
        # FK anual vinculada.
        plan = MonthlyPlan.objects.get(pk=resp.data['id'])
        self.assertIsNotNone(plan.annual_goal)

    def test_aprobar_gran_meta_marca_mensuales_pendientes(self):
        self._aprobar_anual('Meta original')
        plan_resp = self.client.post('/api/monthly-plan/generate/', {
            'cycle_start_month': 1, 'cycle_start_year': 2026}, format='json')
        plan_id = plan_resp.data['id']
        self.client.post(f'/api/monthly-plan/{plan_id}/approve/')
        self.assertEqual(
            MonthlyPlan.objects.get(pk=plan_id).status,
            MonthlyPlan.Status.APROBADA)
        gran = GranMetaAnual.objects.create(
            user=self.user, generated_goal_text='Nueva dirección anual')
        resp = self.client.post(f'/api/gran-meta-anual/{gran.pk}/aprobar/')
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertEqual(
            MonthlyPlan.objects.get(pk=plan_id).status,
            MonthlyPlan.Status.PENDIENTE_REVISION)

    def test_editar_meta_marca_version_y_editada(self):
        self._aprobar_anual()
        plan_resp = self.client.post('/api/monthly-plan/generate/', {
            'cycle_start_month': 1, 'cycle_start_year': 2026}, format='json')
        goal = plan_resp.data['goals'][0]
        resp = self.client.patch(
            f"/api/monthly-goal/{goal['id']}/",
            {'monthly_goal_text': 'Meta reescrita por el usuario'}, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertTrue(resp.data['edited_by_user'])
        self.assertEqual(resp.data['version'], 2)
        self.assertEqual(resp.data['status'], 'EDITADA')
        # El resto del plan intacto.
        otros = MonthlyGoal.objects.filter(plan_id=plan_resp.data['id']).exclude(pk=goal['id'])
        self.assertTrue(all(g.status == 'PROPUESTA' for g in otros))
