"""Pruebas del Modo Focus (Doc 23).

Cubre el ciclo de vida de la sesión: inicio único (una sola herramienta
activa), reemplazo forzado, finalización con registro automático y el efecto
sobre el motor proactivo (posponer avisos no críticos mientras hay sesión).
"""
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Notification, FocusSession
from .services.notification_dispatcher import notificar, puede_entregar_ahora

User = get_user_model()


class FocusSessionAPITests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='focususer', password='testpass123', email='f@example.com')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def iniciar(self, herramienta, config=None, **extra):
        payload = {'herramienta': herramienta, 'origin': 'dashboard', **extra}
        if config is not None:
            payload['config'] = config
        return self.client.post('/api/focus-sessions/iniciar/', payload, format='json')

    def test_iniciar_crea_sesion_activa_con_duracion_planificada(self):
        respuesta = self.iniciar('temporizador', config={'duracion_min': 15})
        self.assertEqual(respuesta.status_code, 201)
        sesion = FocusSession.objects.get(pk=respuesta.data['id'])
        self.assertEqual(sesion.estado, 'activa')
        self.assertIsNone(sesion.ended_at)
        self.assertEqual(sesion.planned_minutes, 15)
        self.assertEqual(sesion.origin, 'dashboard')

    def test_pomodoro_suma_ciclos_en_duracion_planificada(self):
        respuesta = self.iniciar(
            'pomodoro', config={'concentracion': 25, 'descanso': 5, 'ciclos': 4})
        self.assertEqual(respuesta.status_code, 201)
        sesion = FocusSession.objects.get(pk=respuesta.data['id'])
        # 4 ciclos de 25 min + 3 descansos de 5 min = 115.
        self.assertEqual(sesion.planned_minutes, 115)

    def test_segunda_herramienta_responde_conflicto_y_conserva_la_actual(self):
        primera = self.iniciar('pomodoro', config={'concentracion': 25, 'ciclos': 2})
        self.assertEqual(primera.status_code, 201)

        segunda = self.iniciar('reloj')
        self.assertEqual(segunda.status_code, 409)
        self.assertIn('Ya existe una sesión', segunda.data['detalle'])
        primera_obj = FocusSession.objects.get(pk=primera.data['id'])
        primera_obj.refresh_from_db()
        self.assertEqual(primera_obj.estado, 'activa')
        self.assertEqual(
            FocusSession.objects.filter(user=self.user, estado='activa').count(), 1)

    def test_forzar_finaliza_la_actual_y_abre_la_nueva(self):
        primera = self.iniciar('temporizador', config={'duracion_min': 10})
        segunda = self.iniciar('alarma', config={'hora': '15:30'}, forzar='true')
        self.assertEqual(segunda.status_code, 201)
        primera_obj = FocusSession.objects.get(pk=primera.data['id'])
        self.assertEqual(primera_obj.estado, 'cancelada')
        self.assertIsNotNone(primera_obj.ended_at)
        self.assertEqual(
            FocusSession.objects.filter(user=self.user, estado='activa').count(), 1)

    def test_finalizar_completada_registra_la_sesion(self):
        respuesta = self.iniciar('temporizador', config={'duracion_min': 15})
        cierre = self.client.post(
            f"/api/focus-sessions/{respuesta.data['id']}/finalizar/",
            {'completada': 'true', 'minutos_enfocado': 15}, format='json')
        self.assertEqual(cierre.status_code, 200)
        sesion = FocusSession.objects.get(pk=respuesta.data['id'])
        self.assertEqual(sesion.estado, 'completada')
        self.assertIsNotNone(sesion.ended_at)
        self.assertEqual(sesion.focused_minutes, 15)
        # Ya no hay sesión activa.
        estado = self.client.get('/api/focus-sessions/activa/')
        self.assertFalse(estado.data['activa'])

    def test_finalizar_cancelada_no_queda_como_completada(self):
        respuesta = self.iniciar('reloj')
        self.client.post(
            f"/api/focus-sessions/{respuesta.data['id']}/finalizar/",
            {'completada': 'false'}, format='json')
        sesion = FocusSession.objects.get(pk=respuesta.data['id'])
        self.assertEqual(sesion.estado, 'cancelada')

    def test_activa_restaura_sesion_para_el_mismo_dispositivo(self):
        self.iniciar('pomodoro', config={'concentracion': 25, 'ciclos': 1})
        estado = self.client.get('/api/focus-sessions/activa/')
        self.assertTrue(estado.data['activa'])
        self.assertEqual(estado.data['sesion']['herramienta'], 'pomodoro')


class FocusMotorProactivoTests(TestCase):
    """Doc 23 §IV: durante el Modo Focus solo pasan los avisos críticos."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='focusproactivo', password='testpass123', email='fp@example.com')

    def test_focus_activo_detecta_la_sesion_en_curso(self):
        FocusSession.objects.create(user=self.user, herramienta='pomodoro')
        from .services.notification_dispatcher import focus_activo
        self.assertTrue(focus_activo(self.user))

    def test_avisos_no_criticos_se_posponen_mientras_hay_sesion(self):
        FocusSession.objects.create(user=self.user, herramienta='temporizador')
        self.assertFalse(puede_entregar_ahora(self.user, 'informativa'))
        self.assertFalse(puede_entregar_ahora(self.user, 'importante'))

    def test_avisos_criticos_pasan_aun_con_sesion_activa(self):
        FocusSession.objects.create(user=self.user, herramienta='temporizador')
        self.assertTrue(puede_entregar_ahora(self.user, 'critica'))

    def test_aviso_pospuesto_por_focus_luego_se_entrega(self):
        FocusSession.objects.create(user=self.user, herramienta='pomodoro')
        notificar(self.user, 'Informe', 'Listo', prioridad='informativa',
                  canales=['app'], dedupe_key='focus:1')
        aviso = Notification.objects.get(user=self.user, dedupe_key='focus:1')
        self.assertTrue(aviso.pending_delivery)

        sesion = FocusSession.objects.get(user=self.user)
        sesion.estado = 'completada'
        sesion.ended_at = timezone.now()
        sesion.focused_minutes = 25
        sesion.save(update_fields=['estado', 'ended_at', 'focused_minutes'])

        from .services.notification_dispatcher import entregar_pendientes
        resultado = entregar_pendientes(self.user)
        aviso.refresh_from_db()
        self.assertEqual(resultado['entregados'], 1)
        self.assertFalse(aviso.pending_delivery)
