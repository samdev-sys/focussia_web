"""Tests del panel de administración de contenido (`/api/admin/`).

Lo que más importa aquí es que **un usuario normal no pueda escribir contenido**.
El proyecto servía el contenido global con endpoints de solo lectura, así que
una fuga en estos permisos publicaría material sin revisar para todo el mundo.
"""

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from .models import (
    Avatar,
    GuidedTourBlock,
    Juego,
    LearningCategory,
    LearningModuleRef,
    MonthlyTraining,
    ProgramDay,
    ProgramMonth,
    TribuTemaSemana,
    UserTrainingProgress,
)

User = get_user_model()

# Las migraciones siembran 12 meses, 7 avatares y 7 categorías de aprendizaje
# (0038_seed_avatars, 0040_seed_inicio_data, 0043_seed_program_content). Los
# tests usan el mes 99 y nombres propios para no chocar con esa semilla.
MES_DE_PRUEBA = 99
SLUG_DE_PRUEBA = 'categoria-de-prueba'

# Rutas de escritura del panel. Cada una debe rebotar a un usuario nostaff.
ESCRITURAS = [
    ('post', '/api/admin/program-months/'),
    ('post', '/api/admin/trainings/'),
    ('post', '/api/admin/program-days/'),
    ('post', '/api/admin/tribu-themes/'),
    ('post', '/api/admin/learning-categories/'),
    ('post', '/api/admin/learning-modules/'),
    ('post', '/api/admin/guided-tour-blocks/'),
    ('post', '/api/admin/avatars/'),
    ('post', '/api/admin/juegos/'),
    ('post', '/api/admin/tribu-themes/1/activar/'),
]

# Y cada lectura también: el contenido administrativo no se publica por error.
LECTURAS = [
    '/api/admin/session/',
    '/api/admin/overview/',
    '/api/admin/program-months/',
    '/api/admin/trainings/',
    '/api/admin/program-days/',
    '/api/admin/tribu-themes/',
    '/api/admin/learning-categories/',
    '/api/admin/learning-modules/',
    '/api/admin/guided-tour-blocks/',
    '/api/admin/avatars/',
    '/api/admin/juegos/',
]


class _BaseAdminTest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin', password='testpass123', is_staff=True)
        self.cliente = APIClient()
        self.cliente.force_authenticate(user=self.admin)


class PermisosAdminTests(TestCase):
    """Un usuario sin `is_staff` no entra al panel, ni a leer ni a escribir."""

    def setUp(self):
        self.user = User.objects.create_user(username='normal', password='testpass123')
        self.cliente = APIClient()
        self.cliente.force_authenticate(user=self.user)
        self.juegos_iniciales = Juego.objects.count()
        self.mes = ProgramMonth.objects.create(
            month_number=MES_DE_PRUEBA, theme_name='T',
            training_theme='TT', formative_objective='O')

    def test_escrituras_rechazadas_403(self):
        for metodo, url in ESCRITURAS:
            with self.subTest(url=url):
                resp = getattr(self.cliente, metodo)(url, {}, format='json')
                self.assertEqual(resp.status_code, 403, f'{url} debería estar cerrado')

    def test_lecturas_rechazadas_403(self):
        for url in LECTURAS:
            with self.subTest(url=url):
                resp = self.cliente.get(url)
                self.assertEqual(resp.status_code, 403, f'{url} debería estar cerrado')

    def test_sin_autenticar_rechazado_401(self):
        anonimo = APIClient()
        self.assertEqual(anonimo.get('/api/admin/overview/').status_code, 401)
        self.assertEqual(
            anonimo.post('/api/admin/juegos/', {}, format='json').status_code, 401)

    def test_no_crea_contenido_al_intentar(self):
        self.cliente.post('/api/admin/juegos/', {
            'titulo': 'Intruso', 'url': 'https://ejemplo.com'}, format='json')
        self.assertEqual(Juego.objects.count(), self.juegos_iniciales)

    def test_staff_sin_permiso_lectura_sigue_cerrado(self):
        """`is_staff` es la única puerta: un staff sí entra, y eso es lo pedido."""
        staff = User.objects.create_user(username='staff', password='x', is_staff=True)
        cliente = APIClient()
        cliente.force_authenticate(user=staff)
        self.assertEqual(cliente.get('/api/admin/overview/').status_code, 200)


class SesionYResumenTests(_BaseAdminTest):
    def setUp(self):
        super().setUp()
        self.mes = ProgramMonth.objects.create(
            month_number=MES_DE_PRUEBA, theme_name='T',
            training_theme='T', formative_objective='O')

    def test_session_devuelve_perfil(self):
        resp = self.cliente.get('/api/admin/session/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['username'], 'admin')
        self.assertTrue(resp.data['is_staff'])

    def test_overview_detecta_huecos(self):
        resp = self.cliente.get('/api/admin/overview/')
        self.assertEqual(resp.status_code, 200)
        # El mes 99 existe pero sin capacitación, así que debe reportarse.
        self.assertIn(MES_DE_PRUEBA, resp.data['programa']['meses_sin_capacitacion'])
        # Los 12 meses que siembran las migraciones sí traen capacitación.
        self.assertEqual(resp.data['programa']['meses'], 13)


class ProgramaAdminTests(_BaseAdminTest):
    def setUp(self):
        super().setUp()
        self.mes = ProgramMonth.objects.create(
            month_number=MES_DE_PRUEBA, theme_name='Enfoque',
            training_theme='Base', formative_objective='Objetivo')

    def test_crear_mes(self):
        resp = self.cliente.post('/api/admin/program-months/', {
            'month_number': 100, 'theme_name': 'Claves',
            'training_theme': 'Claves', 'formative_objective': 'Obj'}, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(ProgramMonth.objects.filter(month_number=100).exists())

    def test_editar_mes(self):
        resp = self.cliente.patch(
            f'/api/admin/program-months/{self.mes.id}/',
            {'theme_name': 'Enfoque nuevo'}, format='json')
        self.assertEqual(resp.status_code, 200)
        self.mes.refresh_from_db()
        self.assertEqual(self.mes.theme_name, 'Enfoque nuevo')

    def test_crear_capacitacion_incluye_url_resuelta(self):
        resp = self.cliente.post('/api/admin/trainings/', {
            'month': self.mes.id, 'title': 'Mi capacitación',
            'content': 'texto', 'video_url': 'https://youtube.com/watch?v=abc',
            'objetivos': [{'titulo': 'Uno', 'descripcion': 'd'}]}, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['video_resuelto'], 'https://youtube.com/watch?v=abc')
        self.assertEqual(resp.data['month_number'], MES_DE_PRUEBA)

    def test_capacitacion_rechaza_objetivos_malos(self):
        resp = self.cliente.post('/api/admin/trainings/', {
            'month': self.mes.id, 'title': 'X',
            'objetivos': [{'descripcion': 'sin titulo'}]}, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('objetivos', resp.data)

    def test_dia_duplicado_en_el_mismo_mes_rechazado(self):
        ProgramDay.objects.create(month=self.mes, day_number=1, phrase='Hola', intention='foco')
        resp = self.cliente.post('/api/admin/program-days/', {
            'month': self.mes.id, 'day_number': 1,
            'phrase': 'Otro', 'intention': 'calma'}, format='json')
        self.assertEqual(resp.status_code, 400)
        # El mensaje debe ser accionable, no el genérico de la base de datos.
        mensaje = str(resp.data)
        self.assertIn('ya existe un día', mensaje.lower())

    def test_dia_1_en_cada_mes_permitido(self):
        """La unicidad es (mes, día), no solo día."""
        otro = ProgramMonth.objects.create(
            month_number=100, theme_name='C', training_theme='C', formative_objective='O')
        ProgramDay.objects.create(month=self.mes, day_number=1, phrase='A', intention='foco')
        resp = self.cliente.post('/api/admin/program-days/', {
            'month': otro.id, 'day_number': 1,
            'phrase': 'B', 'intention': 'calma'}, format='json')
        self.assertEqual(resp.status_code, 201)

    def test_filtrar_dias_por_mes(self):
        otro = ProgramMonth.objects.create(
            month_number=100, theme_name='C', training_theme='C', formative_objective='O')
        ProgramDay.objects.create(month=self.mes, day_number=1, phrase='A', intention='foco')
        ProgramDay.objects.create(month=otro, day_number=1, phrase='B', intention='foco')
        resp = self.cliente.get(f'/api/admin/program-days/?month={otro.id}')
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['phrase'], 'B')

    def test_no_borra_mes_con_progreso_de_usuarios(self):
        """Borrar en cascada dejaría huérfano el progreso de quien ya avanzó."""
        training = MonthlyTraining.objects.create(month=self.mes, title='Cap')
        user = User.objects.create_user(username='avanzado', password='x')
        UserTrainingProgress.objects.create(user=user, training=training, completado=True)

        resp = self.cliente.delete(f'/api/admin/program-months/{self.mes.id}/')
        self.assertEqual(resp.status_code, 409)
        self.assertIn('progreso', resp.data['detail'])
        self.assertTrue(ProgramMonth.objects.filter(pk=self.mes.pk).exists())

    def test_no_borra_capacitacion_con_progreso(self):
        training = MonthlyTraining.objects.create(month=self.mes, title='Cap')
        user = User.objects.create_user(username='otro', password='x')
        UserTrainingProgress.objects.create(user=user, training=training, completado=True)

        resp = self.cliente.delete(f'/api/admin/trainings/{training.id}/')
        self.assertEqual(resp.status_code, 409)
        self.assertTrue(MonthlyTraining.objects.filter(pk=training.pk).exists())

    def test_borra_mes_sin_progreso(self):
        resp = self.cliente.delete(f'/api/admin/program-months/{self.mes.id}/')
        self.assertEqual(resp.status_code, 204)
        self.assertFalse(ProgramMonth.objects.filter(pk=self.mes.pk).exists())


class TribuAdminTests(_BaseAdminTest):
    def test_solo_un_tema_activo(self):
        primero = TribuTemaSemana.objects.create(titulo='Uno', activo=True)
        segundo = TribuTemaSemana.objects.create(titulo='Dos', activo=True)
        primero.refresh_from_db()
        self.assertFalse(primero.activo)
        self.assertTrue(segundo.activo)

    def test_crear_activo_desactiva_el_anterior(self):
        TribuTemaSemana.objects.create(titulo='Anterior', activo=True)
        resp = self.cliente.post('/api/admin/tribu-themes/', {
            'titulo': 'Nuevo', 'activo': True}, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(
            TribuTemaSemana.objects.filter(activo=True).count(), 1)

    def test_accion_activar(self):
        inactivo = TribuTemaSemana.objects.create(titulo='Inactivo', activo=False)
        TribuTemaSemana.objects.create(titulo='Activo', activo=True)
        resp = self.cliente.post(f'/api/admin/tribu-themes/{inactivo.id}/activar/')
        self.assertEqual(resp.status_code, 200)
        inactivo.refresh_from_db()
        self.assertTrue(inactivo.activo)
        self.assertEqual(TribuTemaSemana.objects.filter(activo=True).count(), 1)

    def test_crear_inactivo_no_toca_los_otros(self):
        activo = TribuTemaSemana.objects.create(titulo='Activo', activo=True)
        self.cliente.post('/api/admin/tribu-themes/', {
            'titulo': 'Borrador', 'activo': False}, format='json')
        activo.refresh_from_db()
        self.assertTrue(activo.activo)


class AprendizajeAdminTests(_BaseAdminTest):
    def test_categoria_devuelve_modulos_anidados(self):
        categoria = LearningCategory.objects.create(
            slug=SLUG_DE_PRUEBA, name='Prueba', order=99)
        LearningModuleRef.objects.create(category=categoria, name='Sueño', order=1)
        resp = self.cliente.get('/api/admin/learning-categories/')
        self.assertEqual(resp.status_code, 200)
        # La base ya trae categorías de la migración 0040; buscamos la nuestra.
        nuestra = next(c for c in resp.data if c['slug'] == SLUG_DE_PRUEBA)
        self.assertEqual([m['name'] for m in nuestra['modules']], ['Sueño'])

    def test_crear_modulo(self):
        categoria = LearningCategory.objects.create(
            slug=SLUG_DE_PRUEBA, name='Prueba', order=99)
        resp = self.cliente.post('/api/admin/learning-modules/', {
            'category': categoria.id, 'name': 'Ejercicio', 'order': 2}, format='json')
        self.assertEqual(resp.status_code, 201)

    def test_filtrar_modulos_por_categoria(self):
        primera = LearningCategory.objects.create(
            slug=SLUG_DE_PRUEBA, name='A', order=98)
        segunda = LearningCategory.objects.create(
            slug=SLUG_DE_PRUEBA + '-b', name='B', order=99)
        LearningModuleRef.objects.create(category=primera, name='M1', order=1)
        LearningModuleRef.objects.create(category=segunda, name='M2', order=1)
        resp = self.cliente.get(f'/api/admin/learning-modules/?category={segunda.id}')
        self.assertEqual([m['name'] for m in resp.data], ['M2'])

    def test_bloque_guia(self):
        resp = self.cliente.post('/api/admin/guided-tour-blocks/', {
            'slug': 'bienvenida', 'title': 'Bienvenida',
            'avatar_message': 'Hola', 'order': 1}, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(GuidedTourBlock.objects.filter(slug='bienvenida').exists())


class AvatarAdminTests(_BaseAdminTest):
    def test_crear_avatar(self):
        resp = self.cliente.post('/api/admin/avatars/', {
            'name': 'Sophya', 'gender': 'female', 'voice_id': 'sophya'}, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(Avatar.objects.filter(name='Sophya').exists())

    def test_imagen_usa_url_antes_que_archivo(self):
        resp = self.cliente.post('/api/admin/avatars/', {
            'name': 'Monroe', 'gender': 'male',
            'image': 'https://cdn.ejemplo.com/monroe.png'}, format='json')
        self.assertEqual(resp.data['image_resuelta'], 'https://cdn.ejemplo.com/monroe.png')

    def test_filtrar_por_activo(self):
        Avatar.objects.create(name='Zeta Activo', gender='male', is_active=True)
        Avatar.objects.create(name='Omega Inactivo', gender='female', is_active=False)
        activos = self.cliente.get('/api/admin/avatars/?activo=true')
        inactivos = self.cliente.get('/api/admin/avatars/?activo=false')
        nombres_activos = {a['name'] for a in activos.data}
        nombres_inactivos = {a['name'] for a in inactivos.data}
        self.assertIn('Zeta Activo', nombres_activos)
        self.assertIn('Omega Inactivo', nombres_inactivos)
        # Los dos conjuntos son disjuntos: nadie puede estar en ambos.
        self.assertFalse(nombres_activos & nombres_inactivos)


class JuegoAdminTests(_BaseAdminTest):
    def test_crear_juego(self):
        resp = self.cliente.post('/api/admin/juegos/', {
            'titulo': 'Memoria', 'url': 'https://ejemplo.com/memoria',
            'tipo': 'juego', 'orden': 1}, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(Juego.objects.filter(titulo='Memoria').exists())

    def test_url_es_obligatoria(self):
        resp = self.cliente.post('/api/admin/juegos/', {'titulo': 'Sin url'}, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('url', resp.data)

    def test_categoria_opcional(self):
        categoria = LearningCategory.objects.create(
            slug=SLUG_DE_PRUEBA, name='Salud', order=99)
        resp = self.cliente.post('/api/admin/juegos/', {
            'titulo': 'Con categoría', 'url': 'https://e.com',
            'categoria': categoria.id}, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['categoria_nombre'], 'Salud')

    def test_catalogo_solo_activos(self):
        visible = Juego.objects.create(titulo='Visible test', url='https://e.com', activo=True)
        Juego.objects.create(titulo='Oculto test', url='https://e.com', activo=False)
        resp = self.cliente.get('/api/admin/juegos/catalogo/')
        titulos = {j['titulo'] for j in resp.data}
        self.assertIn(visible.titulo, titulos)
        self.assertNotIn('Oculto test', titulos)

    def test_orden_respetado(self):
        Juego.objects.create(titulo='ZZZ Ultimo', url='https://e.com', orden=999)
        Juego.objects.create(titulo='AAA Primero', url='https://e.com', orden=0)
        resp = self.cliente.get('/api/admin/juegos/')
        titulos = [j['titulo'] for j in resp.data]
        self.assertLess(titulos.index('AAA Primero'), titulos.index('ZZZ Ultimo'))


class SubidaDeArchivosTests(_BaseAdminTest):
    """La subida va en multipart contra el propio recurso, no a un endpoint aparte."""

    def setUp(self):
        super().setUp()
        self.mes = ProgramMonth.objects.create(
            month_number=MES_DE_PRUEBA, theme_name='T',
            training_theme='T', formative_objective='O')

    def _png_minimo(self):
        # 1x1 transparente, válido para ImageField.
        return SimpleUploadedFile(
            'c.png',
            b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
            b'\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00'
            b'\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82',
            content_type='image/png',
        )

    def test_subir_imagen_de_juego(self):
        resp = self.cliente.post('/api/admin/juegos/', {
            'titulo': 'Con portada', 'url': 'https://e.com',
            'imagen_file': self._png_minimo()}, format='multipart')
        self.assertEqual(resp.status_code, 201)
        juego = Juego.objects.get(titulo='Con portada')
        self.assertTrue(juego.imagen_file)
        self.assertIn('/media/juegos/', juego.imagen_resuelta)

    def test_archivo_tiene_prioridad_sobre_url(self):
        juego = Juego.objects.create(
            titulo='P', url='https://e.com', imagen_url='https://cdn.ejemplo.com/p.png')
        self.assertEqual(juego.imagen_resuelta, 'https://cdn.ejemplo.com/p.png')

    def test_video_de_capacitacion_por_archivo(self):
        video = SimpleUploadedFile(
            'cap.mp4', b'\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42isom',
            content_type='video/mp4')
        resp = self.cliente.post('/api/admin/trainings/', {
            'month': self.mes.id, 'title': 'Con video',
            'video_file': video}, format='multipart')
        self.assertEqual(resp.status_code, 201)
        training = MonthlyTraining.objects.get(title='Con video')
        self.assertTrue(training.video_file)
        self.assertIn('/media/capacitaciones/videos/', training.video_resuelto)

    def test_rechaza_no_imagen_en_campo_de_imagen(self):
        falso = SimpleUploadedFile('no.png', b'esto no es una imagen', content_type='image/png')
        resp = self.cliente.post('/api/admin/juegos/', {
            'titulo': 'Malo', 'url': 'https://e.com',
            'imagen_file': falso}, format='multipart')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('imagen_file', resp.data)


class CatalogoPublicoTests(TestCase):
    """Lo que administra el panel tiene que ser legible por la app.

    El catálogo de juegos y los archivos subidos son de solo lectura para la
    persona usuaria: si estos endpoints no los exponen, el trabajo del
    administrador no llega a verse nunca.
    """

    def setUp(self):
        self.user = User.objects.create_user(username='normal', password='testpass123')
        self.cliente = APIClient()
        self.cliente.force_authenticate(user=self.user)

    def test_juegos_solo_publificados(self):
        visible = Juego.objects.create(
            titulo='Visible al user', url='https://e.com', activo=True, orden=1)
        Juego.objects.create(titulo='Oculto al user', url='https://e.com', activo=False)

        resp = self.cliente.get('/api/juegos/')
        self.assertEqual(resp.status_code, 200)
        titulos = {j['titulo'] for j in resp.data}
        self.assertIn(visible.titulo, titulos)
        self.assertNotIn('Oculto al user', titulos)

    def test_juegos_filtran_por_categoria_y_tipo(self):
        cat = LearningCategory.objects.create(
            slug=SLUG_DE_PRUEBA, name='Salud', order=99)
        Juego.objects.create(
            titulo='Reto de salud', url='https://e.com', tipo='reto',
            categoria=cat, activo=True)
        Juego.objects.create(titulo='Juego suelto', url='https://e.com', activo=True)

        por_cat = self.cliente.get(f'/api/juegos/?categoria={cat.id}')
        self.assertEqual([j['titulo'] for j in por_cat.data], ['Reto de salud'])

        por_tipo = self.cliente.get('/api/juegos/?tipo=reto')
        self.assertEqual([j['titulo'] for j in por_tipo.data], ['Reto de salud'])

    def test_juegos_no_expone_campos_de_administracion(self):
        """El endpoint público es un catálogo, no una vista de edición."""
        juego = Juego.objects.create(titulo='X', url='https://e.com', activo=True)
        resp = self.cliente.get('/api/juegos/')
        campos = resp.data[0].keys()
        self.assertNotIn('activo', campos)
        self.assertNotIn('imagen_file', campos)
        self.assertNotIn('creado', campos)
        self.assertNotIn('actualizado', campos)
        self.assertEqual(resp.data[0]['id'], juego.id)

    def test_juegos_requiere_sesion(self):
        anonimo = APIClient()
        self.assertEqual(anonimo.get('/api/juegos/').status_code, 401)

    def test_serializers_publicos_incluyen_los_resueltos(self):
        """`video_resuelto` / `imagen_resuelta` tienen que existir en el contrato
        público; sin ellos la app no puede mostrar lo que se subió."""
        mes = ProgramMonth.objects.create(
            month_number=MES_DE_PRUEBA, theme_name='T',
            training_theme='T', formative_objective='O')
        training = MonthlyTraining.objects.create(month=mes, title='T')

        from .serializers import (
            AvatarSerializer, MonthlyTrainingSerializer, TribuTemaSemanaSerializer,
        )

        self.assertIn('video_resuelto', MonthlyTrainingSerializer(training).data)
        self.assertIn('media_resuelto', MonthlyTrainingSerializer(training).data)

        tema = TribuTemaSemana.objects.create(titulo='Tema test')
        self.assertIn('imagen_resuelta', TribuTemaSemanaSerializer(tema).data)

        avatar = Avatar.objects.create(name='Avatar test', gender='female')
        datos = AvatarSerializer(avatar).data
        self.assertIn('image_resuelta', datos)
        self.assertIn('audio_resuelto', datos)
