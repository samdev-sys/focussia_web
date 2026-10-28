"""Pruebas del motor proactivo y del contexto de metas en Reportes (Doc 27)."""
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import (
    AccionKanban, Action, FocusiaReport, GranMetaAnual, MonthlyGoal, MonthlyPlan,
    Notification, NotificationPreference, OnboardingProfile, ScheduleException,
    WeeklyPlan,
)
from .services.notification_dispatcher import entregar_pendientes, notificar
from .tasks import _gather_report_data, _notify_report_ready


User = get_user_model()


class MotorProactivoTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='proactivo', password='testpass123', email='p@example.com')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_aviso_postergado_queda_en_campana_y_se_entrega_despues(self):
        with patch('dashboard.services.notification_dispatcher.puede_entregar_ahora',
                   return_value=False):
            notificar(
                self.user, 'Reunión próxima', 'Tu reunión empieza en 10 minutos.',
                prioridad='importante', canales=['app'],
                dedupe_key='reunion:1',
                data={'kind': 'general'},
            )
        aviso = Notification.objects.get(user=self.user, dedupe_key='reunion:1')
        self.assertTrue(aviso.pending_delivery)
        self.assertTrue(aviso.in_bell)

        with patch('dashboard.services.notification_dispatcher.puede_entregar_ahora',
                   return_value=True):
            resultado = entregar_pendientes(self.user)
        aviso.refresh_from_db()
        self.assertEqual(resultado['entregados'], 1)
        self.assertFalse(aviso.pending_delivery)
        self.assertIsNotNone(aviso.delivered_at)

    def test_dedupe_no_duplica_el_mismo_evento_y_momento(self):
        with patch('dashboard.services.notification_dispatcher.puede_entregar_ahora',
                   return_value=True), \
             patch('dashboard.services.notification_dispatcher._enviar_externos',
                   return_value={}):
            notificar(self.user, 'Informe', 'Listo', prioridad='informativa',
                      canales=['app'], dedupe_key='report-ready:99')
            notificar(self.user, 'Informe', 'Listo', prioridad='informativa',
                      canales=['app'], dedupe_key='report-ready:99')
        self.assertEqual(
            Notification.objects.filter(user=self.user, dedupe_key='report-ready:99').count(), 1)

    def test_campana_solo_muestra_avisos_visibles_y_vigentes(self):
        Notification.objects.create(
            user=self.user, type='reminder', title='Visible', in_bell=True)
        Notification.objects.create(
            user=self.user, type='reminder', title='Oculto', in_bell=False)
        cancelada = Notification.objects.create(
            user=self.user, type='reminder', title='Cancelada', in_bell=True)
        cancelada.cancelled_at = timezone.now()
        cancelada.save(update_fields=['cancelled_at'])

        response = self.client.get('/api/notifications/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual([n['title'] for n in response.data], ['Visible'])

    def test_preferencias_aceptan_valores_legados(self):
        response = self.client.patch(
            '/api/config/notifications/',
            [{'channel': 'llamadas', 'state': 'criticas'}], format='json')
        self.assertEqual(response.status_code, 200)
        pref = NotificationPreference.objects.get(user=self.user)
        self.assertEqual(pref.channel, 'calls')
        self.assertEqual(pref.state, 'critical_only')

    def test_excepcion_de_horario_acepta_valores_legados(self):
        response = self.client.post(
            '/api/config/schedule/exception/',
            {'exception_type': 'dia_semana', 'value': {'dia': 'LUN'}},
            format='json')
        self.assertEqual(response.status_code, 201)
        exc = ScheduleException.objects.get(user=self.user)
        self.assertEqual(exc.exception_type, 'no_days')
        self.assertEqual(exc.value['days'], ['monday'])


class ContextoMetasReporteTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='metas', password='testpass123', email='m@example.com')
        OnboardingProfile.objects.create(user=self.user)
        self.hoy = timezone.localdate()

    def test_reporte_mensual_incluye_meta_mensual_y_gran_meta(self):
        GranMetaAnual.objects.create(
            user=self.user, generated_goal_text='Construir mi estudio',
            status=GranMetaAnual.Status.APROBADA, is_active=True,
            approved_at=timezone.now(),
        )
        plan = MonthlyPlan.objects.create(
            user=self.user, cycle_start_month=self.hoy.month,
            cycle_start_year=self.hoy.year,
            status=MonthlyPlan.Status.APROBADA, approved_at=timezone.now(),
        )
        MonthlyGoal.objects.create(
            plan=plan, month_order=1, calendar_month=self.hoy.month,
            calendar_year=self.hoy.year,
            monthly_goal_text='Cerrar tres clientes',
            annual_goal_relation='Financia el estudio',
            status=MonthlyGoal.Status.APROBADA,
        )

        data = _gather_report_data(
            self.user, 'monthly', self.hoy.replace(day=1), self.hoy)

        self.assertEqual(data['goal_context']['meta_mensual']['texto'], 'Cerrar tres clientes')
        self.assertEqual(data['goal_context']['gran_meta_anual']['texto'], 'Construir mi estudio')
        self.assertIn('metas', data['raw'])

    def test_reporte_sin_metas_explica_ausencia_sin_porcentajes_ficticios(self):
        data = _gather_report_data(
            self.user, 'weekly',
            self.hoy - timedelta(days=6), self.hoy)
        self.assertEqual(data['completed_count'], 0)
        self.assertEqual(data['pending_count'], 0)
        self.assertFalse(data['has_data'])

    def test_aviso_de_reporte_es_unico_e_informativo(self):
        report = FocusiaReport.objects.create(
            user=self.user, level=FocusiaReport.ReportLevel.WEEKLY,
            period_start=self.hoy - timedelta(days=6),
            period_end=self.hoy, completion_percentage=50,
            completed_count=1, pending_count=1,
            headline_message='Avanzaste', cycle_label='Semana de prueba',
        )
        with patch('dashboard.services.notification_dispatcher.puede_entregar_ahora',
                   return_value=True), \
             patch('dashboard.services.notification_dispatcher._enviar_externos',
                   return_value={}):
            _notify_report_ready(self.user, report)
            _notify_report_ready(self.user, report)
        aviso = Notification.objects.filter(
            user=self.user, dedupe_key=f'report-ready:{report.id}').first()
        self.assertIsNotNone(aviso)
        self.assertEqual(aviso.priority, 'informativa')
        self.assertEqual(aviso.data['report_id'], report.id)
        self.assertEqual(
            Notification.objects.filter(
                user=self.user, dedupe_key=f'report-ready:{report.id}').count(), 1)


class CalculoCumplimientoTests(TestCase):
    """Doc 27 §5: reprogramación, eliminación, subacciones e identidad."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='calculo', password='testpass123', email='c@example.com')
        self.hoy = timezone.localdate()
        self.inicio = self.hoy - timedelta(days=6)
        iso = self.inicio.isocalendar()
        self.plan = WeeklyPlan.objects.create(
            user=self.user, week_number=iso[1], year=iso[0])

    def _reporte(self):
        return _gather_report_data(self.user, 'weekly', self.inicio, self.hoy)

    def _accion_kanban(self, **kwargs):
        base = {
            'user': self.user,
            'texto_accion': 'Acción de prueba',
            'estado_actual': AccionKanban.EstadoChoices.AGENDA_DIARIA,
            'destino_asignado': AccionKanban.DestinoChoices.AGENDA_DIARIA,
            'fecha_seleccionada': self.hoy - timedelta(days=2),
            'fecha_planificada_original': self.hoy - timedelta(days=2),
        }
        base.update(kwargs)
        return AccionKanban.objects.create(**base)

    def test_accion_reprogramada_sigue_en_el_total_original(self):
        self._accion_kanban(
            fecha_planificada_original=self.hoy - timedelta(days=2),
            fecha_seleccionada=self.hoy + timedelta(days=5),
        )
        data = self._reporte()
        self.assertEqual(data['raw']['acciones_principales']['total'], 1)
        self.assertEqual(data['completed_count'], 0)
        self.assertEqual(data['raw']['reprogramadas'], 1)

    def test_accion_eliminada_sigue_en_el_total_y_no_completa(self):
        self._accion_kanban(
            estado_actual=AccionKanban.EstadoChoices.ELIMINADA,
            destino_asignado=AccionKanban.DestinoChoices.PAPELERA,
        )
        data = self._reporte()
        self.assertEqual(data['raw']['acciones_principales']['total'], 1)
        self.assertEqual(data['completed_count'], 0)
        self.assertEqual(data['raw']['eliminadas'], 1)

    def test_grupo_con_subacciones_pendientes_no_cuenta_completado(self):
        self._accion_kanban(
            texto_accion='Informe trimestral',
            estado_actual=AccionKanban.EstadoChoices.COMPLETADA,
            fecha_seleccionada=self.hoy,
            fecha_planificada_original=self.hoy,
        )
        Action.objects.create(
            weekly_plan=self.plan, assigned_calendar_date=self.hoy,
            fecha_planificada_original=self.hoy,
            title='Informe trimestral',
            origin_module=Action.OriginModule.KANBAN_BACKLOG,
            status=Action.ActionStatus.COMPLETADA,
            subactions=[
                {'id': 'a', 'title': 'Recopilar datos', 'is_completed': True},
                {'id': 'b', 'title': 'Redactar', 'is_completed': False},
            ],
        )
        data = self._reporte()
        self.assertEqual(data['raw']['acciones_principales']['total'], 1)
        self.assertEqual(data['completed_count'], 0)
        self.assertEqual(data['raw']['subacciones_pendientes'], 1)

    def test_grupo_espejo_no_se_duplica_y_completa_con_todas_las_subacciones(self):
        self._accion_kanban(
            texto_accion='Cerrar propuesta',
            estado_actual=AccionKanban.EstadoChoices.COMPLETADA,
            fecha_seleccionada=self.hoy,
            fecha_planificada_original=self.hoy,
        )
        Action.objects.create(
            weekly_plan=self.plan, assigned_calendar_date=self.hoy,
            fecha_planificada_original=self.hoy,
            title='Cerrar propuesta',
            origin_module=Action.OriginModule.KANBAN_BACKLOG,
            status=Action.ActionStatus.COMPLETADA,
            subactions=[{'id': 'a', 'title': 'Enviar', 'is_completed': True}],
        )
        data = self._reporte()
        self.assertEqual(data['raw']['acciones_principales']['total'], 1)
        self.assertEqual(data['completed_count'], 1)

    def test_accion_propia_del_planificador_semanal_suma_al_total(self):
        Action.objects.create(
            weekly_plan=self.plan, assigned_calendar_date=self.hoy - timedelta(days=1),
            fecha_planificada_original=self.hoy - timedelta(days=1),
            title='Llamar al contador',
            origin_module=Action.OriginModule.MANUAL,
            status=Action.ActionStatus.COMPLETADA,
        )
        data = self._reporte()
        self.assertEqual(data['raw']['acciones_principales']['total'], 1)
        self.assertEqual(data['completed_count'], 1)

    def test_serie_diaria_refleja_planificadas_y_completadas_por_fecha(self):
        completada = self._accion_kanban(
            fecha_seleccionada=self.hoy, fecha_planificada_original=self.hoy)
        completada.estado_actual = AccionKanban.EstadoChoices.COMPLETADA
        completada.save(update_fields=['estado_actual'])
        self._accion_kanban(
            texto_accion='Otra acción',
            fecha_seleccionada=self.hoy - timedelta(days=3),
            fecha_planificada_original=self.hoy - timedelta(days=3),
        )

        data = self._reporte()
        serie = {s['fecha']: s for s in data['raw']['serie_diaria']}

        self.assertEqual(serie[self.hoy.isoformat()]['planificadas'], 1)
        self.assertEqual(serie[self.hoy.isoformat()]['completadas'], 1)
        self.assertEqual(serie[(self.hoy - timedelta(days=3)).isoformat()]['planificadas'], 1)
        self.assertEqual(serie[(self.hoy - timedelta(days=3)).isoformat()]['completadas'], 0)

    def test_desglose_sin_completar_desglosa_reprogramadas_y_eliminadas(self):
        # 4 actions: 1 completada, 1 reprogramada, 1 eliminada, 1 pendiente al cierre.
        done = self._accion_kanban()
        done.estado_actual = AccionKanban.EstadoChoices.COMPLETADA
        done.save(update_fields=['estado_actual'])
        self._accion_kanban(
            texto_accion='Reprogramada',
            fecha_planificada_original=self.hoy - timedelta(days=2),
            fecha_seleccionada=self.hoy + timedelta(days=5),
        )
        self._accion_kanban(
            texto_accion='Eliminada',
            estado_actual=AccionKanban.EstadoChoices.ELIMINADA,
            destino_asignado=AccionKanban.DestinoChoices.PAPELERA,
        )
        self._accion_kanban(texto_accion='Pendiente al cierre')

        data = self._reporte()
        raw = data['raw']
        self.assertEqual(raw['reprogramadas_sin_completar'], 1)
        self.assertEqual(raw['eliminadas_sin_completar'], 1)
        self.assertEqual(raw['pendientes_al_cierre'], 1)
        self.assertEqual(data['pending_count'], 3)
