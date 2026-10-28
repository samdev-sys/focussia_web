from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core import mail
from rest_framework.test import APIClient

User = get_user_model()


class AuthRecuperacionTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='rec', email='rec@example.com', password='Clave12345!')
        self.client = APIClient()

    def test_request_no_revela_si_existe(self):
        resp = self.client.post('/api/password-reset/request/', {'email': 'nadie@example.com'}, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('message', resp.data)
        self.assertNotIn('reset_token', resp.data)
        self.assertEqual(len(mail.outbox), 0)

    def test_request_envia_email_con_enlace(self):
        resp = self.client.post('/api/password-reset/request/', {'email': 'rec@example.com'}, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertNotIn('reset_token', resp.data)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('token=', mail.outbox[0].body)
        self.assertIn('rec@example.com', mail.outbox[0].to)

    def _token_para(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        return str(RefreshToken.for_user(self.user).access_token)

    def test_confirm_actualiza_con_validadores(self):
        resp = self.client.post('/api/password-reset/confirm/', {
            'token': self._token_para(), 'new_password': '123'}, format='json')
        self.assertEqual(resp.status_code, 400)
        resp = self.client.post('/api/password-reset/confirm/', {
            'token': self._token_para(), 'new_password': 'NuevaClave123!'}, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NuevaClave123!'))

    def test_confirm_token_invalido(self):
        resp = self.client.post('/api/password-reset/confirm/', {
            'token': 'invalido', 'new_password': 'NuevaClave123!'}, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_registro_valida_password(self):
        resp = self.client.post('/api/users/', {
            'username': 'nuevo', 'email': 'nuevo@example.com', 'password': '123'}, format='json')
        self.assertEqual(resp.status_code, 400)
