"""Tests del asistente IA del panel: usuarios, niveles y membresías.

Cubre `/api/admin/usuarios/`, `/api/admin/membresias/` y
`/api/admin/asistente/chat/`: permiso de staff, cálculo de nivel por mes
alcanzado, estados de membresía y respaldo por reglas cuando no hay Groq.
"""

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Membresia, MonthlyTraining, ProgramMonth, UserTrainingProgress

User = get_user_model()
HOY = timezone.localdate()


def crear_mes(numero, titulo='Cap'):
    mes = ProgramMonth.objects.create(
        month_number=numero, theme_name=f'Tema {numero}',
        training_theme=f'T {numero}', formative_objective='O')
    training = MonthlyTraining.objects.create(month=mes, title=titulo)
    return mes, training


class AdminUsuariosTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='adm_ia', password='x', is_staff=True)
        self.normal = User.objects.create_user(
            username='usr_ia', password='x', email='u@x.co')
        _, self.t1 = crear_mes(90, 'Uno')
        _, self.t2 = crear_mes(91, 'Dos')
        self.client = APIClient()

    def test_no_staff_403(self):
        self.client.force_authenticate(user=self.normal)
        r = self.client.get('/api/admin/usuarios/')
        self.assertEqual(r.status_code, 403)

    def test_lista_con_nivel_y_membresia(self):
        UserTrainingProgress.objects.create(
            user=self.normal, training=self.t1, completado=True,
            completado_en=timezone.now())
        Membresia.objects.create(
            user=self.normal, fecha_inicio=HOY - timedelta(days=1),
            fecha_fin=HOY + timedelta(days=30), nota='Prueba')
        self.client.force_authenticate(user=self.admin)
        r = self.client.get('/api/admin/usuarios/')
        self.assertEqual(r.status_code, 200)
        ficha = next(f for f in r.data if f['username'] == 'usr_ia')
        self.assertEqual(ficha['nivel'], 90)
        self.assertEqual(ficha['mes_alcanzado'], 90)
        self.assertEqual(ficha['membresia']['estado'], 'vigente')
        self.assertIn(1, ficha['recursos_desbloqueados'])

    def test_nivel_cero_sin_progreso(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.get(f'/api/admin/usuarios/{self.normal.id}/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['nivel'], 0)
        self.assertTrue(r.data['sin_membresia'])

    def test_filtro_membresia_vencida(self):
        Membresia.objects.create(
            user=self.normal, fecha_inicio=HOY - timedelta(days=60),
            fecha_fin=HOY - timedelta(days=1))
        self.client.force_authenticate(user=self.admin)
        r = self.client.get('/api/admin/usuarios/', {'membresia': 'vencida'})
        nombres = [f['username'] for f in r.data]
        self.assertIn('usr_ia', nombres)

    def test_membresia_fin_antes_de_inicio_400(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.post('/api/admin/membresias/', {
            'user': self.normal.id,
            'fecha_inicio': HOY.isoformat(),
            'fecha_fin': (HOY - timedelta(days=1)).isoformat(),
        }, format='json')
        self.assertEqual(r.status_code, 400)

    def test_membresia_crud(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.post('/api/admin/membresias/', {
            'user': self.normal.id,
            'fecha_inicio': HOY.isoformat(),
            'fecha_fin': (HOY + timedelta(days=15)).isoformat(),
            'nota': 'Quince días',
        }, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['estado'], 'vigente')
        self.assertEqual(r.data['dias_restantes'], 15)

    @override_settings(GROQ_API_KEY='')
    def test_analizar_sin_groq_usa_reglas(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.post(f'/api/admin/usuarios/{self.normal.id}/analizar/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['fuente'], 'reglas')
        self.assertIn('usr_ia', r.data['analisis'])

    @override_settings(GROQ_API_KEY='')
    def test_chat_sin_groq_usa_reglas(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.post('/api/admin/asistente/chat/',
                             {'pregunta': '¿Cuántos usuarios hay?'},
                             format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['fuente'], 'reglas')
        self.assertTrue(r.data['respuesta'])

    def test_chat_sin_pregunta_400(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.post('/api/admin/asistente/chat/',
                             {'pregunta': '  '}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_chat_no_staff_403(self):
        self.client.force_authenticate(user=self.normal)
        r = self.client.post('/api/admin/asistente/chat/',
                             {'pregunta': 'hola'}, format='json')
        self.assertEqual(r.status_code, 403)


class MembresiaEstadoTests(TestCase):
    def setUp(self):
        self.u = User.objects.create_user(username='mem_est', password='x')

    def test_estados(self):
        vig = Membresia.objects.create(
            user=self.u, fecha_inicio=HOY - timedelta(days=1),
            fecha_fin=HOY + timedelta(days=1))
        self.assertEqual(vig.estado, 'vigente')
        ven = Membresia.objects.create(
            user=self.u, fecha_inicio=HOY - timedelta(days=10),
            fecha_fin=HOY - timedelta(days=1))
        self.assertEqual(ven.estado, 'vencida')
        self.assertLess(ven.dias_restantes, 0)
        prox = Membresia.objects.create(
            user=self.u, fecha_inicio=HOY + timedelta(days=5),
            fecha_fin=HOY + timedelta(days=20))
        self.assertEqual(prox.estado, 'proxima')
