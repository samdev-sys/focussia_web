"""Pruebas de regresión de los dos fallos de seguridad corregidos.

1. IDOR en `UserViewSet`: `/api/users/<id>/` servía cualquier cuenta del
   sistema porque el queryset era `User.objects.all()`.
2. `nivel_exigencia` desbordado: el onboarding escribía la intensidad
   ('EQUILIBRADA', 11 caracteres) en una columna de 5, lo que en PostgreSQL
   abortaba el alta con DataError.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from dashboard.models import (
    ConfiguracionUsuario,
    OnboardingProfile,
    normalizar_nivel_exigencia,
)

User = get_user_model()


class UserViewSetAislamientoTests(TestCase):
    """Un usuario autenticado solo puede operar sobre su propia cuenta."""

    def setUp(self):
        self.victima = User.objects.create_user(
            username='victima', email='victima@example.com', password='Clave12345!')
        self.atacante = User.objects.create_user(
            username='atacante', email='atacante@example.com', password='Clave12345!')
        self.client = APIClient()
        self.client.force_authenticate(user=self.atacante)

    def test_no_puede_leer_otro_usuario(self):
        resp = self.client.get(f'/api/users/{self.victima.pk}/')
        self.assertEqual(resp.status_code, 404, resp.data)

    def test_no_puede_modificar_otro_usuario(self):
        resp = self.client.patch(
            f'/api/users/{self.victima.pk}/',
            {'email': 'secuestrado@example.com'}, format='json')
        self.assertEqual(resp.status_code, 404, resp.data)
        self.victima.refresh_from_db()
        self.assertEqual(self.victima.email, 'victima@example.com')

    def test_no_puede_borrar_otro_usuario(self):
        resp = self.client.delete(f'/api/users/{self.victima.pk}/')
        self.assertEqual(resp.status_code, 404, resp.data)
        self.assertTrue(User.objects.filter(pk=self.victima.pk).exists())

    def test_si_puede_leer_su_propia_cuenta(self):
        resp = self.client.get(f'/api/users/{self.atacante.pk}/')
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertEqual(resp.data['username'], 'atacante')

    def test_listado_sigue_deshabilitado(self):
        self.assertEqual(self.client.get('/api/users/').status_code, 405)

    def test_alta_sigue_abierta(self):
        anonimo = APIClient()
        resp = anonimo.post('/api/users/', {
            'username': 'nuevo', 'email': 'nuevo@example.com',
            'password': 'Clave12345!'}, format='json')
        self.assertEqual(resp.status_code, 201, resp.data)


class NivelExigenciaNormalizacionTests(TestCase):
    """La intensidad del onboarding debe caber en `nivel_exigencia` (5 chars)."""

    def test_helper_traduce_los_tres_valores(self):
        self.assertEqual(normalizar_nivel_exigencia('suave'), 'bajo')
        self.assertEqual(normalizar_nivel_exigencia('equilibrada'), 'medio')
        self.assertEqual(normalizar_nivel_exigencia('exigente'), 'alto')

    def test_helper_acepta_mayusculas_del_cliente(self):
        self.assertEqual(normalizar_nivel_exigencia('SUAVE'), 'bajo')
        self.assertEqual(normalizar_nivel_exigencia('EQUILIBRADA'), 'medio')
        self.assertEqual(normalizar_nivel_exigencia('EXIGENTE'), 'alto')

    def test_helper_es_idempotente_y_tolerante(self):
        self.assertEqual(normalizar_nivel_exigencia('alto'), 'alto')
        self.assertEqual(normalizar_nivel_exigencia(None), 'medio')
        self.assertEqual(normalizar_nivel_exigencia(''), 'medio')
        self.assertEqual(normalizar_nivel_exigencia('valor-inventado'), 'medio')

    def test_helper_nunca_devuelve_algo_mas_largo_que_la_columna(self):
        for entrada in ('SUAVE', 'EQUILIBRADA', 'EXIGENTE', 'otra-cosa', None):
            self.assertLessEqual(len(normalizar_nivel_exigencia(entrada)), 5)

    def test_onboarding_complete_normaliza(self):
        user = User.objects.create_user(
            username='onb', email='onb@example.com', password='Clave12345!')
        OnboardingProfile.objects.update_or_create(
            user=user, defaults={'intensity': 'equilibrada'})
        cliente = APIClient()
        cliente.force_authenticate(user=user)

        resp = cliente.post('/api/onboarding/profile/complete/', {}, format='json')

        self.assertEqual(resp.status_code, 200, resp.data)
        config = ConfiguracionUsuario.objects.get(user=user)
        self.assertEqual(config.nivel_exigencia, 'medio')

    def test_endpoint_legacy_users_onboarding_normaliza(self):
        """Segunda ruta con el mismo fallo: POST /api/users/onboarding/."""
        user = User.objects.create_user(
            username='legacy', email='legacy@example.com', password='Clave12345!')
        cliente = APIClient()
        cliente.force_authenticate(user=user)

        resp = cliente.post(
            '/api/users/onboarding/', {'intensity_level': 'EXIGENTE'}, format='json')

        self.assertEqual(resp.status_code, 200, resp.data)
        config = ConfiguracionUsuario.objects.get(user=user)
        self.assertEqual(config.nivel_exigencia, 'alto')


class MediaProtegidaTests(TestCase):
    """`/media/` ya no es público: exige sesión y no permite salir del directorio."""

    def setUp(self):
        import os
        import pathlib
        import shutil

        from django.conf import settings
        from django.test import override_settings

        # Se usa una carpeta del proyecto (no %TEMP%): el sandbox del entorno
        # de desarrollo restringe la escritura en el directorio temporal.
        self.media_root = os.path.join(str(settings.BASE_DIR), '.test_media')
        shutil.rmtree(self.media_root, ignore_errors=True)
        os.makedirs(self.media_root, exist_ok=True)
        pathlib.Path(self.media_root, 'prueba.txt').write_text('hola', encoding='utf-8')

        self._override = override_settings(MEDIA_ROOT=self.media_root)
        self._override.enable()
        self.addCleanup(shutil.rmtree, self.media_root, ignore_errors=True)
        self.addCleanup(self._override.disable)

        self.user = User.objects.create_user(
            username='media', email='media@example.com', password='Clave12345!')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_anonimo_no_puede_leer_el_archivo(self):
        anonimo = APIClient()
        self.assertEqual(anonimo.get('/media/prueba.txt').status_code, 401)

    def test_autenticado_recibe_el_archivo(self):
        resp = self.client.get('/media/prueba.txt')
        self.assertEqual(resp.status_code, 200)
        contenido = b''.join(resp.streaming_content)
        self.assertEqual(contenido, b'hola')

    def test_archivo_inexistente_da_404(self):
        self.assertEqual(self.client.get('/media/no-existe.png').status_code, 404)

    def test_no_permite_salir_de_media_root(self):
        resp = self.client.get('/media/%2e%2e%2f%2e%2e%2fmanage.py')
        self.assertIn(resp.status_code, (400, 404))
