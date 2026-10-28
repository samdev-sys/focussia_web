from datetime import date
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from .models import (
    ActionDelegation, AccionKanban, Action, WeeklyPlan, KanbanTask,
)

User = get_user_model()


class DelegarDoc32Tests(TestCase):
    """Doc 32 (ACCIONES POR DELEGAR): ciclo responsable → derivadas → cierre."""

    def setUp(self):
        self.user = User.objects.create_user(username='delegar', password='testpass123')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _delegar_kanban(self, texto='Llamar proveedor'):
        acc = AccionKanban.objects.create(
            user=self.user, texto_accion=texto, estado_actual='KANBAN_ACTIVO')
        resp = self.client.patch(
            f'/api/acciones-kanban/{acc.id}/clasificar/', {'clasificacion': 'D'}, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)
        return acc

    def test_d_crea_proceso_en_modulo(self):
        self._delegar_kanban()
        resp = self.client.get('/api/delegation-processes/', {'activas': '1'})
        self.assertEqual(resp.status_code, 200)
        procesos = resp.data if isinstance(resp.data, list) else resp.data.get('results', [])
        self.assertEqual(len(procesos), 1)
        self.assertEqual(procesos[0]['titulo'], 'Llamar proveedor')
        self.assertEqual(procesos[0]['estado'], 'PENDIENTE_DELEGAR')

    def test_responsable_habilita_y_derivada_es_independiente(self):
        self._delegar_kanban()
        proc = ActionDelegation.objects.get(user=self.user)
        # Sin responsable no hay seguimiento.
        resp = self.client.post(f'/api/delegation-processes/{proc.pk}/derivada/',
                                {'tipo': 'llamar'}, format='json')
        self.assertEqual(resp.status_code, 400)
        # Asignar responsable.
        resp = self.client.patch(f'/api/delegation-processes/{proc.pk}/responsable/',
                                 {'responsable': 'Víctor'}, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertEqual(resp.data['responsable'], 'Víctor')
        self.assertEqual(resp.data['estado'], 'DELEGADA')
        # Derivada: acción independiente en planificación + historial.
        resp = self.client.post(f'/api/delegation-processes/{proc.pk}/derivada/', {
            'tipo': 'llamar', 'fecha': date.today().isoformat()}, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertEqual(resp.data['estado'], 'EN_SEGUIMIENTO')
        self.assertEqual(len(resp.data['derivadas']), 1)
        det = resp.data['derivadas'][0]['detalle']
        self.assertIn('Víctor', det['titulo'])
        self.assertTrue(Action.objects.filter(pk=det['action_id']).exists())
        # Reasignar: futuras usan el nuevo, la derivada conserva el original.
        resp = self.client.patch(f'/api/delegation-processes/{proc.pk}/responsable/',
                                 {'responsable': 'Ana'}, format='json')
        self.assertEqual(resp.status_code, 200)
        proc.refresh_from_db()
        self.assertEqual(proc.responsable, 'Ana')
        deriv = [h for h in proc.historial if h['evento'] == 'derivada_creada'][0]
        self.assertEqual(deriv['detalle']['responsable_snapshot'], 'Víctor')

    def test_recuperar_devuelve_a_planificacion(self):
        acc = self._delegar_kanban()
        proc = ActionDelegation.objects.get(user=self.user)
        proc.responsable = 'Víctor'
        proc.save()
        resp = self.client.post(f'/api/delegation-processes/{proc.pk}/recuperar/')
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertEqual(resp.data['estado'], 'RECUPERADA')
        acc.refresh_from_db()
        self.assertEqual(acc.estado_actual, 'KANBAN_ACTIVO')
        # Ya no lista en activas.
        resp = self.client.get('/api/delegation-processes/', {'activas': '1'})
        procesos = resp.data if isinstance(resp.data, list) else resp.data.get('results', [])
        self.assertEqual(len(procesos), 0)

    def test_completar_solo_usuario_y_responsables(self):
        self._delegar_kanban()
        proc = ActionDelegation.objects.get(user=self.user)
        proc.responsable = 'Víctor'
        proc.save()
        resp = self.client.post(f'/api/delegation-processes/{proc.pk}/completar/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['estado'], 'COMPLETADA')
        resp = self.client.get('/api/delegation-processes/responsables/')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('Víctor', resp.data)

    def test_weekly_delegate_tambien_crea_proceso(self):
        plan = WeeklyPlan.objects.create(user=self.user, year=2026, week_number=40)
        act = Action.objects.create(
            weekly_plan=plan, assigned_calendar_date=date(2026, 10, 2),
            title='Informe')
        resp = self.client.post(f'/api/actions/{act.pk}/delegate/')
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(ActionDelegation.objects.filter(
            user=self.user, source_ref__kind='weekly_action').exists())
        self.assertTrue(KanbanTask.objects.filter(
            user=self.user, columna='Delegar', titulo='Informe').exists())
