from datetime import date, timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from .models import (
    KanbanTask, AccionKanban, HistorialMovimiento, Action, WeeklyPlan,
    ObjetivoSemanal, ObjetivoMensual, MetaAnual,
)
from .services.agent_service import AgentService

User = get_user_model()


class KanbanBacklogUnificadoTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='roymond', password='testpass123')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_agente_cuenta_bandeja_y_da_detalle(self):
        KanbanTask.objects.create(user=self.user, titulo='Legacy 1', columna='Backlog')
        AccionKanban.objects.create(
            user=self.user, texto_accion='Pagar cuentas',
            origen='OTRO', estado_actual='KANBAN_ACTIVO',
        )
        AccionKanban.objects.create(
            user=self.user, texto_accion='Responder correos',
            origen='MANUAL', estado_actual='KANBAN_ACTIVO',
        )
        ctx = AgentService(self.user)._get_contexto()
        # 1 legacy + 2 en bandeja = 3 pendientes visibles para el agente
        self.assertEqual(ctx['kanban']['pendientes'], 3)
        self.assertEqual(ctx['backlog']['total'], 2)
        self.assertIn('Pagar cuentas', ctx['backlog']['titulos'])
        self.assertIn('Responder correos', ctx['backlog']['titulos'])

    def test_crear_en_tablero_legacy_tambien_aterriza_en_bandeja(self):
        resp = self.client.post('/api/kanban-tasks/', {
            'titulo': 'Llamar al banco', 'descripcion': '', 'columna': 'Backlog',
        })
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(AccionKanban.objects.filter(
            user=self.user, texto_accion='Llamar al banco',
            estado_actual='KANBAN_ACTIVO', origen='OTRO',
        ).exists())
        accion = AccionKanban.objects.get(user=self.user, texto_accion='Llamar al banco')
        self.assertTrue(HistorialMovimiento.objects.filter(
            accion=accion, estado_nuevo='KANBAN_ACTIVO').exists())

    def test_progreso_incluye_bandeja(self):
        KanbanTask.objects.create(user=self.user, titulo='Hecha', columna='Hecho')
        AccionKanban.objects.create(
            user=self.user, texto_accion='Pendiente bandeja',
            estado_actual='KANBAN_ACTIVO',
        )
        resp = self.client.get('/api/progreso-actividades/')
        self.assertEqual(resp.status_code, 200)
        # total = 1 legacy + 1 bandeja, completada = 1 → 50%
        self.assertEqual(resp.data['total'], 2)
        self.assertEqual(resp.data['completadas'], 1)
        self.assertEqual(resp.data['porcentaje'], 50)
        self.assertEqual(resp.data['detalle']['kanban']['backlog_bandeja'], 1)


class ClasificarDestinosTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='roymond', password='testpass123')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _nueva(self, texto='Tarea destino'):
        return AccionKanban.objects.create(
            user=self.user, texto_accion=texto, estado_actual='KANBAN_ACTIVO')

    def test_delegar_aparece_en_acciones_por_delegar(self):
        acc = self._nueva('Llamar proveedor')
        resp = self.client.patch(
            f'/api/acciones-kanban/{acc.id}/clasificar/', {'clasificacion': 'D'}, format='json')
        self.assertEqual(resp.status_code, 200)
        acc.refresh_from_db()
        self.assertEqual(acc.estado_actual, 'POR_DELEGAR')
        # Puente legacy que lee la sección del dashboard
        self.assertTrue(KanbanTask.objects.filter(
            user=self.user, columna='Delegar', titulo='Llamar proveedor').exists())

    def test_planificar_semanal_respeta_fecha_y_semana(self):
        acc = self._nueva('Informe semanal')
        # próximo jueves (semana distinta si hoy no es jueves de esa semana)
        hoy = date.today()
        dias = (3 - hoy.weekday()) % 7 or 7
        objetivo = hoy + timedelta(days=dias)
        resp = self.client.patch(
            f'/api/acciones-kanban/{acc.id}/clasificar/',
            {'clasificacion': 'P', 'destino_planificacion': 'SEMANAL',
             'fecha_seleccionada': objetivo.isoformat()}, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)
        action = Action.objects.get(title='Informe semanal')
        self.assertEqual(str(action.assigned_calendar_date), objetivo.isoformat())
        iso_year, semana, _ = objetivo.isocalendar()
        self.assertEqual(action.weekly_plan.year, iso_year)
        self.assertEqual(action.weekly_plan.week_number, semana)
        self.assertTrue(ObjetivoSemanal.objects.filter(
            user=self.user, año=iso_year, semana=semana,
            titulo='Informe semanal').exists())

    def test_planificar_mensual_vincula_meta_y_mes(self):
        meta = MetaAnual.objects.create(
            user=self.user, titulo='Meta 2026', fecha_inicio=date(2026, 1, 1),
            fecha_fin=date(2026, 12, 31), aprobada=True)
        acc = self._nueva('Revisión mensual')
        resp = self.client.patch(
            f'/api/acciones-kanban/{acc.id}/clasificar/',
            {'clasificacion': 'P', 'destino_planificacion': 'MENSUAL',
             'fecha_seleccionada': '2026-09-25'}, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)
        obj = ObjetivoMensual.objects.get(titulo='Revisión mensual')
        self.assertEqual(obj.mes, 9)
        self.assertEqual(obj.meta_anual_id, meta.id)

    def test_planificar_sin_fecha_usa_hoy(self):
        acc = self._nueva('Sin fecha')
        resp = self.client.patch(
            f'/api/acciones-kanban/{acc.id}/clasificar/',
            {'clasificacion': 'P', 'destino_planificacion': 'SEMANAL'}, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)
        action = Action.objects.get(title='Sin fecha')
        self.assertEqual(str(action.assigned_calendar_date), date.today().isoformat())


class PapeleraRestaurarTests(TestCase):
    """§7.4/§16: basurero revisable + recuperación. §17.5: aviso de duplicada."""

    def setUp(self):
        self.user = User.objects.create_user(username='roymond', password='testpass123')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_eliminar_va_a_papelera_revisable(self):
        acc = AccionKanban.objects.create(
            user=self.user, texto_accion='Idea vieja', estado_actual='KANBAN_ACTIVO')
        resp = self.client.patch(
            f'/api/acciones-kanban/{acc.id}/clasificar/', {'clasificacion': 'E'}, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)
        # Sale del Kanban activo...
        self.assertFalse(AccionKanban.objects.filter(
            pk=acc.pk, estado_actual='KANBAN_ACTIVO').exists())
        # ...y aparece en la papelera.
        resp = self.client.get('/api/acciones-kanban/papelera/')
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(any(str(a['id']) == str(acc.id) for a in resp.data))

    def test_restaurar_devuelve_al_kanban_activo(self):
        acc = AccionKanban.objects.create(
            user=self.user, texto_accion='Idea recuperable',
            estado_actual='ELIMINADA', clasificacion='E')
        resp = self.client.patch(f'/api/acciones-kanban/{acc.id}/restaurar/', {}, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)
        acc.refresh_from_db()
        self.assertEqual(acc.estado_actual, 'KANBAN_ACTIVO')
        self.assertIsNone(acc.clasificacion)
        self.assertTrue(HistorialMovimiento.objects.filter(
            accion=acc, estado_nuevo='KANBAN_ACTIVO').exists())

    def test_restaurar_rechaza_no_eliminada(self):
        acc = AccionKanban.objects.create(
            user=self.user, texto_accion='Activa', estado_actual='KANBAN_ACTIVO')
        resp = self.client.patch(f'/api/acciones-kanban/{acc.id}/restaurar/', {}, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_crear_avisa_duplicada_sin_bloquear(self):
        AccionKanban.objects.create(
            user=self.user, texto_accion='Pagar cuentas', estado_actual='KANBAN_ACTIVO')
        resp = self.client.post('/api/acciones-kanban/', {'texto_accion': 'pagar CUENTAS'}, format='json')
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertTrue(resp.data.get('similar_warning'))
        # Igual se guarda (no bloquea).
        self.assertEqual(AccionKanban.objects.filter(
            user=self.user, estado_actual='KANBAN_ACTIVO').count(), 2)

    def test_crear_sin_duplicada_no_avisa(self):
        resp = self.client.post('/api/acciones-kanban/', {'texto_accion': 'Tarea única'}, format='json')
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertFalse(resp.data.get('similar_warning'))


class DeshacerTests(TestCase):
    """§17.2: DESHACER revierte la clasificación y sus registros laterales."""

    def setUp(self):
        self.user = User.objects.create_user(username='roymond', password='testpass123')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_deshacer_h_revierte_y_borra_action(self):
        acc = AccionKanban.objects.create(
            user=self.user, texto_accion='Tarea H', estado_actual='KANBAN_ACTIVO')
        resp = self.client.patch(
            f'/api/acciones-kanban/{acc.id}/clasificar/',
            {'clasificacion': 'H', 'hora_seleccionada': '09:00'}, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertTrue(Action.objects.filter(title='Tarea H').exists())
        resp = self.client.patch(f'/api/acciones-kanban/{acc.id}/deshacer/', {}, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)
        acc.refresh_from_db()
        self.assertEqual(acc.estado_actual, 'KANBAN_ACTIVO')
        self.assertIsNone(acc.clasificacion)
        self.assertFalse(Action.objects.filter(title='Tarea H').exists())

    def test_deshacer_p_semanal_revierte_objetivo(self):
        acc = AccionKanban.objects.create(
            user=self.user, texto_accion='Tarea P', estado_actual='KANBAN_ACTIVO')
        resp = self.client.patch(
            f'/api/acciones-kanban/{acc.id}/clasificar/',
            {'clasificacion': 'P', 'destino_planificacion': 'SEMANAL',
             'fecha_seleccionada': date.today().isoformat()}, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)
        resp = self.client.patch(f'/api/acciones-kanban/{acc.id}/deshacer/', {}, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)
        acc.refresh_from_db()
        self.assertEqual(acc.estado_actual, 'KANBAN_ACTIVO')
        self.assertFalse(Action.objects.filter(title='Tarea P').exists())
        self.assertFalse(ObjetivoSemanal.objects.filter(titulo='Tarea P').exists())

    def test_deshacer_sin_clasificar_rechaza(self):
        acc = AccionKanban.objects.create(
            user=self.user, texto_accion='Activa', estado_actual='KANBAN_ACTIVO')
        resp = self.client.patch(f'/api/acciones-kanban/{acc.id}/deshacer/', {}, format='json')
        self.assertEqual(resp.status_code, 400)
