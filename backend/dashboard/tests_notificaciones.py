from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from .models import NotificationPreference, Notification, PushSubscription
from .services.notification_dispatcher import notificar, puede_enviar

User = get_user_model()


class NotificacionesTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='notif', password='testpass123', email='n@example.com')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_canal_inactivo_no_envia(self):
        NotificationPreference.objects.create(
            user=self.user, channel='push', state='inactive')
        self.assertFalse(puede_enviar(self.user, 'push'))
        res = notificar(self.user, 'T', 'M', canales=['push'])
        self.assertNotIn('push', res)

    def test_critical_only_solo_criticas(self):
        NotificationPreference.objects.create(
            user=self.user, channel='email', state='critical_only')
        self.assertFalse(puede_enviar(self.user, 'email', critica=False))
        self.assertTrue(puede_enviar(self.user, 'email', critica=True))
        res = notificar(self.user, 'T', 'M', critica=True, canales=['email'])
        self.assertTrue(res['email']['success'])

    def test_app_crea_notificacion_campanita(self):
        res = notificar(self.user, 'Hola', 'Mundo', canales=['app'])
        self.assertTrue(res['app']['success'])
        self.assertTrue(Notification.objects.filter(
            user=self.user, title='Hola', type='reminder').exists())

    def test_whatsapp_log_por_defecto(self):
        res = notificar(self.user, 'T', 'M', canales=['whatsapp'])
        # Sin habilitar en AgentConfig → se omite con motivo.
        self.assertFalse(res['whatsapp']['success'])

    @override_settings(WHATSAPP_PROVIDER='meta')
    def test_whatsapp_meta_sin_credenciales_falla_claro(self):
        from .services.whatsapp_service import WhatsAppService
        res = WhatsAppService.enviar_mensaje('+573001234567', 'hola')
        self.assertFalse(res['success'])
        self.assertIn('Meta', res['error'])

    def test_push_sin_suscripcion(self):
        res = notificar(self.user, 'T', 'M', canales=['push'])
        self.assertFalse(res['push']['success'])

    def test_push_subscribe_valida(self):
        resp = self.client.post('/api/push/subscribe/', {}, format='json')
        self.assertEqual(resp.status_code, 400)
        resp = self.client.post('/api/push/subscribe/', {
            'endpoint': 'https://example.com/push/1',
            'keys': {'p256dh': 'AAA', 'auth': 'BBB'}}, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(PushSubscription.objects.filter(
            user=self.user, endpoint='https://example.com/push/1').exists())
        resp = self.client.post('/api/push/unsubscribe/',
                                {'endpoint': 'https://example.com/push/1'}, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(PushSubscription.objects.filter(user=self.user).exists())

    def test_push_public_key(self):
        resp = self.client.get('/api/push/public-key/')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('publicKey', resp.data)


class AvisosDosisTests(TestCase):
    """Doc 21 §III: la campana debe reflejar las dosis pendientes de ahora."""

    def setUp(self):
        from datetime import time as dtime, timedelta

        from django.utils import timezone

        from .models import Suplemento, SuplementoToma

        self.user = User.objects.create_user(
            username='dosis', password='testpass123', email='d@example.com')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.suplemento = Suplemento.objects.create(
            user=self.user,
            nombre='AZEC',
            tipo='Medicamento',
            frecuencia_horas=8,
            # Hora futura a propósito: así el generador no crea dosis pasadas
            # propias y las únicas vencidas son las de este test.
            hora_primera=dtime(23, 59),
            fecha_inicio=timezone.localdate(),
        )
        ahora = timezone.now()
        self.tomas = [
            SuplementoToma.objects.create(
                suplemento=self.suplemento, programada=ahora - timedelta(hours=h))
            for h in (18, 10, 2)
        ]

    def _avisar(self):
        from .tasks import avisar_dosis_pendientes
        avisar_dosis_pendientes()

    def test_avisa_todas_las_dosis_pendientes_de_la_ventana(self):
        self._avisar()
        avisos = Notification.objects.filter(
            user=self.user, dedupe_key__startswith='toma:')
        self.assertEqual(avisos.count(), 3)
        self.assertTrue(all(n.in_bell for n in avisos))

    def test_es_idempotente_entre_corridas(self):
        self._avisar()
        self._avisar()
        self.assertEqual(
            Notification.objects.filter(
                user=self.user, dedupe_key__startswith='toma:').count(),
            3,
        )

    def test_marcar_tomado_retira_el_aviso_de_la_campana(self):
        self._avisar()
        vieja = self.tomas[0]
        self.assertTrue(Notification.objects.filter(
            user=self.user, dedupe_key=f'toma:{vieja.id}',
            cancelled_at__isnull=True).exists())

        resp = self.client.post(f'/api/suplementos/{self.suplemento.id}/marcar_tomado/')

        self.assertEqual(resp.status_code, 200, resp.data)
        vieja.refresh_from_db()
        self.assertTrue(vieja.tomado)
        self.assertFalse(Notification.objects.filter(
            user=self.user, dedupe_key=f'toma:{vieja.id}',
            cancelled_at__isnull=True).exists())


class CampanaActualTests(TestCase):
    """La campana debe mostrar siempre lo más reciente y no cachearse."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='campana', password='testpass123', email='c@example.com')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_lo_mas_reciente_primero_y_sin_cache(self):
        from datetime import timedelta

        from django.utils import timezone

        notificar(self.user, 'Aviso viejo', 'hace días', canales=['app'])
        vieja = Notification.objects.get(user=self.user, title='Aviso viejo')
        # Se envejece explícitamente: creadas en el mismo segundo, el orden
        # sería ambiguo.
        Notification.objects.filter(pk=vieja.pk).update(
            created_at=timezone.now() - timedelta(days=4))
        notificar(self.user, 'Aviso nuevo', 'ahora', canales=['app'])

        resp = self.client.get('/api/notifications/')

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp['Cache-Control'], 'no-store')
        titulos = [n['title'] for n in resp.data]
        self.assertEqual(titulos[:2], ['Aviso nuevo', 'Aviso viejo'])
