from datetime import date, timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from .models import (
    Action, WeeklyPlan, KanbanTask, MetaAnual, MonthlyPlan, MonthlyGoal,
)

User = get_user_model()


class WeeklyDoc30Tests(TestCase):
    """Doc 30 (BOTÓN SEMANAL): semana correcta, repetir, delegar, meta mensual."""

    def setUp(self):
        self.user = User.objects.create_user(username='semanal', password='testpass123')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _add(self, title='Tarea', day=None):
        day = day or date.today().isoformat()
        resp = self.client.post('/api/actions/add_action/', {
            'title': title, 'assigned_calendar_date': day}, format='json')
        self.assertEqual(resp.status_code, 201, resp.data)
        return resp.data

    def test_add_action_queda_en_plan_de_su_semana(self):
        proxima = date.today() + timedelta(days=10)
        data = self._add('Futura', proxima.isoformat())
        plan = WeeklyPlan.objects.get(pk=data['weekly_plan'])
        iso_year, semana, _ = proxima.isocalendar()
        self.assertEqual((plan.year, plan.week_number), (iso_year, semana))

    def test_repeat_crea_independiente_en_semana_destino(self):
        data = self._add('Original')
        acc_id = data['id']
        self.client.post(f'/api/actions/{acc_id}/add_subaction/', {'title': 'Sub 1'}, format='json')
        destino = date.today() + timedelta(days=9)
        resp = self.client.post(f'/api/actions/{acc_id}/repeat/', {'target_date': destino.isoformat()}, format='json')
        self.assertEqual(resp.status_code, 201, resp.data)
        copia = Action.objects.get(pk=resp.data['id'])
        self.assertNotEqual(str(copia.id), str(acc_id))
        self.assertEqual(str(copia.assigned_calendar_date), destino.isoformat())
        self.assertEqual(len(copia.subactions), 1)
        self.assertNotEqual(copia.subactions[0]['id'],
                            Action.objects.get(pk=acc_id).subactions[0]['id'])
        iso_year, semana, _ = destino.isocalendar()
        self.assertEqual((copia.weekly_plan.year, copia.weekly_plan.week_number), (iso_year, semana))

    def test_move_conserva_id_y_subacciones(self):
        data = self._add('Movible')
        self.client.post(f"/api/actions/{data['id']}/add_subaction/", {'title': 'Sub'}, format='json')
        nuevo = date.today() + timedelta(days=3)
        resp = self.client.post(f"/api/actions/{data['id']}/move/", {'new_date': nuevo.isoformat()}, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertEqual(resp.data['id'], data['id'])
        self.assertEqual(str(resp.data['assigned_calendar_date']), nuevo.isoformat())
        self.assertEqual(len(resp.data['subactions']), 1)

    def test_delegate_puentea_a_acciones_por_delegar(self):
        data = self._add('Delegable')
        resp = self.client.post(f"/api/actions/{data['id']}/delegate/")
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertEqual(resp.data['status'], 'DELEGADA')
        self.assertTrue(KanbanTask.objects.filter(
            user=self.user, columna='Delegar', titulo='Delegable').exists())

    def test_plan_trae_meta_mensual_aprobada(self):
        meta = MetaAnual.objects.create(
            user=self.user, titulo='Meta 2026', fecha_inicio=date(2026, 1, 1),
            fecha_fin=date(2026, 12, 31), aprobada=True)
        plan = MonthlyPlan.objects.create(
            user=self.user, annual_goal=meta, cycle_start_month=1,
            cycle_start_year=2026, status=MonthlyPlan.Status.APROBADA)
        MonthlyGoal.objects.create(
            plan=plan, month_order=1, calendar_month=1, calendar_year=2026,
            monthly_goal_text='Meta de enero', status=MonthlyGoal.Status.APROBADA)
        resp = self.client.get('/api/weekly-plans/current_week/')
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertEqual(resp.data['plan']['associated_monthly_goal_text'], 'Meta de enero')

    def test_week_of_navega_y_conserva_historial_semanas(self):
        vieja = date.today() - timedelta(days=14)
        self._add('Vieja', vieja.isoformat())
        resp = self.client.get('/api/weekly-plans/week_of/', {'date': vieja.isoformat()})
        self.assertEqual(resp.status_code, 200, resp.data)
        iso_year, semana, _ = vieja.isocalendar()
        self.assertEqual(resp.data['plan']['year'], iso_year)
        self.assertEqual(resp.data['plan']['week_number'], semana)
        # La semana anterior conserva su planificación.
        self.assertTrue(Action.objects.filter(
            title='Vieja', assigned_calendar_date=vieja.isoformat()).exists())
