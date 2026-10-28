"""Tests del reparto personalizado de contenido por usuario.

Regla: si el usuario tiene asignaciones de un tipo, solo ve esos objetos;
si no tiene ninguna, ve todo (default para usuarios nuevos).
"""

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import (
    AsignacionContenido, Avatar, GuidedTourBlock, Juego,
    LearningCategory, LearningModuleRef, MonthlyTraining,
    ProgramDay, ProgramMonth, TribuTemaSemana,
)
from .services.program_service import get_current_program_day

User = get_user_model()


class AdminAsignacionesTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='adm_asig', password='x', is_staff=True)
        self.user = User.objects.create_user(
            username='usr_asig', password='x', email='a@x.co')
        self.client = APIClient()

    def test_no_staff_403(self):
        self.client.force_authenticate(user=self.user)
        r = self.client.get('/api/admin/asignaciones/')
        self.assertEqual(r.status_code, 403)

    def test_reemplazar_y_listar(self):
        j1 = Juego.objects.create(titulo='J1', url='https://e.com/1')
        j2 = Juego.objects.create(titulo='J2', url='https://e.com/2')
        self.client.force_authenticate(user=self.admin)
        r = self.client.post('/api/admin/asignaciones/reemplazar/', {
            'user': self.user.id, 'tipo': 'juego', 'objeto_ids': [j1.id, 999999],
        }, format='json')
        self.assertEqual(r.status_code, 400)
        r = self.client.post('/api/admin/asignaciones/reemplazar/', {
            'user': self.user.id, 'tipo': 'juego', 'objeto_ids': [j1.id, j2.id],
        }, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 2)
        # Reemplazar con vacío = vuelve a ver todo.
        r = self.client.post('/api/admin/asignaciones/reemplazar/', {
            'user': self.user.id, 'tipo': 'juego', 'objeto_ids': [],
        }, format='json')
        self.assertEqual(r.data, [])
        self.assertFalse(
            AsignacionContenido.objects.filter(user=self.user).exists())

    def test_reemplazar_tipo_invalido_400(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.post('/api/admin/asignaciones/reemplazar/', {
            'user': self.user.id, 'tipo': 'nave', 'objeto_ids': [],
        }, format='json')
        self.assertEqual(r.status_code, 400)

    def test_juegos_filtrados_y_default_abierto(self):
        j1 = Juego.objects.create(titulo='JA', url='https://e.com/a')
        Juego.objects.create(titulo='JB', url='https://e.com/b')
        self.client.force_authenticate(user=self.user)
        r = self.client.get('/api/juegos/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 2)
        AsignacionContenido.objects.create(user=self.user, tipo='juego', objeto_id=j1.id)
        r = self.client.get('/api/juegos/')
        self.assertEqual([j['titulo'] for j in r.data], ['JA'])

    def test_tribu_asignado_reemplaza_activo(self):
        TribuTemaSemana.objects.create(titulo='Global', activo=True)
        propio = TribuTemaSemana.objects.create(titulo='Propio', activo=False)
        self.client.force_authenticate(user=self.user)
        r = self.client.get('/api/tribu/tema-actual/')
        self.assertEqual(r.data['titulo'], 'Global')
        AsignacionContenido.objects.create(
            user=self.user, tipo='tribu', objeto_id=propio.id)
        r = self.client.get('/api/tribu/tema-actual/')
        self.assertEqual(r.data['titulo'], 'Propio')

    def test_capacitacion_bloqueada_y_permitida(self):
        mes, _ = ProgramMonth.objects.get_or_create(
            month_number=99,
            defaults={'theme_name': 'T99', 'training_theme': 'TT',
                      'formative_objective': 'O'})
        t99, _ = MonthlyTraining.objects.get_or_create(month=mes, defaults={'title': 'C99'})
        ProgramDay.objects.get_or_create(
            month=mes, day_number=1,
            defaults={'phrase': 'F', 'intention': 'foco'})
        dia = get_current_program_day(self.user)
        t_actual = MonthlyTraining.objects.get(month=dia.month)
        self.client.force_authenticate(user=self.user)
        # Abierto por defecto.
        self.assertEqual(
            self.client.get('/api/motivational/current-training/').status_code, 200)
        # Asigno otra: la actual queda bloqueada.
        AsignacionContenido.objects.create(
            user=self.user, tipo='capacitacion', objeto_id=t99.id)
        r = self.client.get('/api/motivational/current-training/')
        self.assertEqual(r.status_code, 404)
        r = self.client.post('/api/cursos/completar/',
                             {'training_id': t_actual.id}, format='json')
        self.assertEqual(r.status_code, 403)
        # Asigno la actual: vuelve a verse y se puede completar.
        AsignacionContenido.objects.filter(user=self.user).delete()
        AsignacionContenido.objects.create(
            user=self.user, tipo='capacitacion', objeto_id=t_actual.id)
        self.assertEqual(
            self.client.get('/api/motivational/current-training/').status_code, 200)
        r = self.client.post('/api/cursos/completar/',
                             {'training_id': t_actual.id}, format='json')
        self.assertEqual(r.status_code, 200)

    def test_aprendizaje_filtrado(self):
        cat = LearningCategory.objects.create(slug='c-asig', name='C', order=99)
        m1 = LearningModuleRef.objects.create(category=cat, name='M1', order=1)
        m2 = LearningModuleRef.objects.create(category=cat, name='M2', order=2)
        self.client.force_authenticate(user=self.user)
        r = self.client.get('/api/inicio/learn/categories/')
        slugs = [c['slug'] for c in r.data]
        self.assertIn('c-asig', slugs)
        AsignacionContenido.objects.create(
            user=self.user, tipo='modulo', objeto_id=m1.id)
        r = self.client.get('/api/inicio/learn/categories/')
        cat_data = next(c for c in r.data if c['slug'] == 'c-asig')
        self.assertEqual([m['name'] for m in cat_data['modules']], ['M1'])
        self.assertNotIn(m2.id, [m.get('id') for m in cat_data['modules']])

    def test_bloques_y_avatares_filtrados(self):
        b1 = GuidedTourBlock.objects.create(slug='b1', title='B1', order=99)
        GuidedTourBlock.objects.create(slug='b2', title='B2', order=100)
        a1 = Avatar.objects.create(name='A1', gender='male', is_active=True)
        Avatar.objects.create(name='A2', gender='female', is_active=True)
        self.client.force_authenticate(user=self.user)
        n_bloques = len(self.client.get('/api/inicio/guided-tour/blocks/').data)
        nombres_antes = [a['name'] for a in
                         self.client.get('/api/onboarding/avatars/').data]
        self.assertIn('A1', nombres_antes)
        AsignacionContenido.objects.create(
            user=self.user, tipo='bloque', objeto_id=b1.id)
        AsignacionContenido.objects.create(
            user=self.user, tipo='avatar', objeto_id=a1.id)
        bloques = self.client.get('/api/inicio/guided-tour/blocks/').data
        self.assertEqual(len(bloques), 1)
        self.assertLess(len(bloques), n_bloques)
        self.assertEqual(bloques[0]['slug'], 'b1')
        avatares = self.client.get('/api/onboarding/avatars/').data
        self.assertEqual([a['name'] for a in avatares], ['A1'])

    def test_ficha_incluye_asignaciones(self):
        j = Juego.objects.create(titulo='JF', url='https://e.com/f')
        AsignacionContenido.objects.create(user=self.user, tipo='juego', objeto_id=j.id)
        self.client.force_authenticate(user=self.admin)
        r = self.client.get(f'/api/admin/usuarios/{self.user.id}/')
        self.assertEqual(r.data['asignaciones'], {'juego': 1})
