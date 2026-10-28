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
