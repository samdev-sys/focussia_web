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
        """Token opaco `<uidb64>.<token>` como el que va en el enlace del correo."""
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.encoding import force_bytes
        from django.utils.http import urlsafe_base64_encode

        uidb64 = urlsafe_base64_encode(force_bytes(self.user.pk))
        return f'{uidb64}.{default_token_generator.make_token(self.user)}'

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

    def test_confirm_rechaza_un_jwt_como_token(self):
        """El enlace ya no lleva un access token: uno de esos debe rechazarse."""
        from rest_framework_simplejwt.tokens import RefreshToken

        jwt = str(RefreshToken.for_user(self.user).access_token)
        resp = self.client.post('/api/password-reset/confirm/', {
            'token': jwt, 'new_password': 'NuevaClave123!'}, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_token_es_de_un_solo_uso(self):
        token = self._token_para()
        primero = self.client.post('/api/password-reset/confirm/', {
            'token': token, 'new_password': 'NuevaClave123!'}, format='json')
        self.assertEqual(primero.status_code, 200, primero.data)

        segundo = self.client.post('/api/password-reset/confirm/', {
            'token': token, 'new_password': 'OtraClave123!'}, format='json')
        self.assertEqual(segundo.status_code, 400)

    def test_token_caduca(self):
        from django.test import override_settings

        token = self._token_para()
        # Django compara segundos enteros: con 0 el token aún vale dentro del
        # mismo segundo, así que se fuerza un plazo negativo.
        with override_settings(PASSWORD_RESET_TIMEOUT=-1):
            resp = self.client.post('/api/password-reset/confirm/', {
                'token': token, 'new_password': 'NuevaClave123!'}, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_email_avisa_del_plazo_real(self):
        self.client.post('/api/password-reset/request/', {'email': 'rec@example.com'}, format='json')
        self.assertIn('60 minutos', mail.outbox[0].body)

    def test_cierra_sesiones_y_rechaza_el_access_anterior(self):
        from rest_framework_simplejwt.tokens import AccessToken

        access_previo = str(AccessToken.for_user(self.user))
        resp = self.client.post('/api/password-reset/confirm/', {
            'token': self._token_para(), 'new_password': 'NuevaClave123!'}, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)

        self.user.refresh_from_db()
        self.assertIsNotNone(
            self.user.sessions_invalidated_at,
            'el reset debe marcar el cierre de sesiones',
        )

        # Se fuerza la marca al futuro para no depender de la resolución de 1 s
        # del claim `iat`.
        from datetime import timedelta

        from django.utils import timezone

        User.objects.filter(pk=self.user.pk).update(
            sessions_invalidated_at=timezone.now() + timedelta(minutes=1))

        cliente = APIClient()
        cliente.credentials(HTTP_AUTHORIZATION=f'Bearer {access_previo}')
        self.assertEqual(cliente.get('/api/users/me/').status_code, 401)

    def test_registro_valida_password(self):
        resp = self.client.post('/api/users/', {
            'username': 'nuevo', 'email': 'nuevo@example.com', 'password': '123'}, format='json')
        self.assertEqual(resp.status_code, 400)


class LogoutBlacklistTests(TestCase):
    """El JWT es stateless: cerrar sesión debe quemar el refresh token."""

    def setUp(self):
        # El throttling de login usa la caché local, que persiste entre tests:
        # sin limpiarla, un test agota las 5 peticiones/min del anterior y
        # responde 429 en vez de lo que se está probando.
        from django.core.cache import cache

        cache.clear()
        self.user = User.objects.create_user(
            username='logout', email='logout@example.com', password='Clave12345!')
        self.client = APIClient()

    def test_logout_quema_el_refresh(self):
        from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
        from rest_framework_simplejwt.tokens import RefreshToken

        refresh = RefreshToken.for_user(self.user)
        self.client.cookies['refresh_token'] = str(refresh)

        resp = self.client.post('/api/token/logout/')

        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertTrue(
            BlacklistedToken.objects.filter(token__jti=refresh['jti']).exists(),
            'el refresh debe quedar en la blacklist',
        )

    def test_refresh_quemado_ya_no_sirve(self):
        from rest_framework_simplejwt.tokens import RefreshToken

        refresh = RefreshToken.for_user(self.user)
        self.client.cookies['refresh_token'] = str(refresh)
        self.client.post('/api/token/logout/')

        resp = self.client.post('/api/token/refresh/')

        self.assertEqual(resp.status_code, 401)

    def test_logout_all_no_revienta_y_cierra_todas(self):
        from rest_framework_simplejwt.token_blacklist.models import (
            BlacklistedToken,
            OutstandingToken,
        )
        from rest_framework_simplejwt.tokens import RefreshToken

        RefreshToken.for_user(self.user)
        RefreshToken.for_user(self.user)
        total = OutstandingToken.objects.filter(user=self.user).count()
        self.assertEqual(total, 2)

        self.client.force_authenticate(user=self.user)
        resp = self.client.post('/api/config/devices/logout-all/')

        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertEqual(resp.data['sesiones_cerradas'], 2)
        self.assertEqual(
            BlacklistedToken.objects.filter(token__user=self.user).count(), total)


class CSRFEnforcementTests(TestCase):
    """Doble cookie: con autenticación por cookie, las escrituras exigen CSRF."""

    def setUp(self):
        from django.core.cache import cache

        cache.clear()
        self.user = User.objects.create_user(
            username='csrf', email='csrf@example.com', password='Clave12345!')
        self.client = APIClient(enforce_csrf_checks=True)

    def _autenticar_por_cookie(self):
        from rest_framework_simplejwt.tokens import AccessToken

        self.client.cookies['access_token'] = str(AccessToken.for_user(self.user))

    def test_post_con_cookie_sin_token_csrf_falla(self):
        self._autenticar_por_cookie()
        resp = self.client.post('/api/config/devices/logout-all/')
        self.assertEqual(resp.status_code, 403)

    def test_post_con_cookie_y_csrf_pasa(self):
        self._autenticar_por_cookie()
        token = self.client.get('/api/csrf/').data['csrfToken']
        resp = self.client.post(
            '/api/config/devices/logout-all/', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(resp.status_code, 200, resp.data)

    def test_get_no_exige_csrf(self):
        self._autenticar_por_cookie()
        self.assertEqual(self.client.get('/api/session/status/').status_code, 200)

    def test_bearer_no_necesita_csrf(self):
        from rest_framework_simplejwt.tokens import AccessToken

        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {AccessToken.for_user(self.user)}')
        resp = self.client.post('/api/config/devices/logout-all/')
        self.assertEqual(resp.status_code, 200, resp.data)
