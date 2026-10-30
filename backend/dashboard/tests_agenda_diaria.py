from datetime import date

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from .models import AccionKanban, SubaccionKanban

User = get_user_model()


class AgendaDiariaEstadosTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='agenda', password='testpass123')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.hoy = date(2026, 6, 5)

    def _accion(self, texto, hora='16:00'):
        return AccionKanban.objects.create(
            user=self.user, texto_accion=texto,
            estado_actual=AccionKanban.EstadoChoices.AGENDA_DIARIA,
            fecha_seleccionada=self.hoy, hora_seleccionada=hora,
        )

    def _url(self, accion, sufijo=''):
        return f'/api/acciones-kanban/{accion.pk}/{sufijo}'

    def test_crear_subaccion_y_listarla_en_clasificadas(self):
        accion = self._accion('Preparar una reunión')
        resp = self.client.post(self._url(accion, 'subacciones/'), {'texto': 'Definir agenda'}, format='json')
        self.assertEqual(resp.status_code, 201)
        resp = self.client.get('/api/acciones-kanban/clasificadas/')
        fila = next(a for a in resp.data if a['id'] == str(accion.pk))
        self.assertEqual([s['texto'] for s in fila['subacciones']], ['Definir agenda'])
        self.assertEqual(fila['estado'], 'Pendiente')

    def test_completar_subacciones_completa_el_grupo(self):
        accion = self._accion('Preparar una reunión')
        sub = SubaccionKanban.objects.create(accion=accion, texto='Reservar sala')
        resp = self.client.patch(self._url(accion, f'subacciones/{sub.pk}/'), {'estado': 'Completada'}, format='json')
        self.assertEqual(resp.status_code, 200)
        accion.refresh_from_db()
        self.assertEqual(accion.estado, 'Completada')

    def test_no_completar_grupo_con_subacciones_pendientes(self):
        accion = self._accion('Preparar una reunión')
        SubaccionKanban.objects.create(accion=accion, texto='Reservar sala')
        resp = self.client.patch(self._url(accion), {'estado': 'Completada'}, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('Reservar sala', resp.data['detail'])

    def test_solo_una_accion_en_haciendo_por_dia(self):
        primera = self._accion('Organizar carpetas', hora='09:00')
        segunda = self._accion('Pagar cuentas', hora='10:00')
        self.assertEqual(self.client.patch(self._url(primera), {'estado': 'Haciendo'}, format='json').status_code, 200)
        resp = self.client.patch(self._url(segunda), {'estado': 'Haciendo'}, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('Organizar carpetas', resp.data['detail'])

    def test_accion_en_haciendo_no_cambia_de_hora(self):
        accion = self._accion('Organizar carpetas', hora='09:00')
        self.client.patch(self._url(accion), {'estado': 'Haciendo'}, format='json')
        resp = self.client.patch(self._url(accion), {'hora_seleccionada': '11:00'}, format='json')
        self.assertEqual(resp.status_code, 400)
        accion.refresh_from_db()
        self.assertEqual(accion.hora_seleccionada.hour, 9)

    def test_crear_en_agenda_exige_hora_y_queda_pendiente(self):
        resp = self.client.post('/api/acciones-kanban/agenda/', {
            'texto_accion': 'Llamar al banco', 'fecha_seleccionada': '2026-06-05',
        }, format='json')
        self.assertEqual(resp.status_code, 400)
        resp = self.client.post('/api/acciones-kanban/agenda/', {
            'texto_accion': 'Llamar al banco', 'fecha_seleccionada': '2026-06-05', 'hora_seleccionada': '13:00',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['estado'], 'Pendiente')
        self.assertEqual(resp.data['estado_actual'], 'AGENDA_DIARIA')

    def test_un_bloque_admite_una_sola_accion(self):
        self._accion('Pagar cuentas', hora='10:00')
        resp = self.client.post('/api/acciones-kanban/agenda/', {
            'texto_accion': 'Otra', 'fecha_seleccionada': '2026-06-05', 'hora_seleccionada': '10:00',
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_mover_a_bloque_ocupado_se_rechaza(self):
        self._accion('Pagar cuentas', hora='10:00')
        movible = self._accion('Enviar propuesta', hora='11:00')
        resp = self.client.patch(self._url(movible), {'hora_seleccionada': '10:00'}, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_quitar_la_hora_se_rechaza(self):
        accion = self._accion('Pagar cuentas', hora='10:00')
        resp = self.client.patch(self._url(accion), {'hora_seleccionada': ''}, format='json')
        self.assertEqual(resp.status_code, 400)
        accion.refresh_from_db()
        self.assertEqual(accion.hora_seleccionada.hour, 10)

    def test_clasificar_en_h_exige_hora(self):
        accion = AccionKanban.objects.create(user=self.user, texto_accion='Revisar informe',
                                             estado_actual=AccionKanban.EstadoChoices.KANBAN_ACTIVO)
        resp = self.client.patch(self._url(accion, 'clasificar/'), {'clasificacion': 'H'}, format='json')
        self.assertEqual(resp.status_code, 400)
        resp = self.client.patch(self._url(accion, 'clasificar/'), {
            'clasificacion': 'H', 'fecha_seleccionada': '2026-06-05', 'hora_seleccionada': '09:00',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        accion.refresh_from_db()
        self.assertEqual(accion.estado_actual, 'AGENDA_DIARIA')
        self.assertEqual(accion.hora_seleccionada.hour, 9)

    def test_pendiente_no_puede_pasar_directo_a_completada(self):
        accion = self._accion('Pagar cuentas')
        resp = self.client.patch(self._url(accion), {'estado': 'Completada'}, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_haciendo_puede_volver_a_pendiente(self):
        accion = self._accion('Pagar cuentas')
        self.client.patch(self._url(accion), {'estado': 'Haciendo'}, format='json')
        resp = self.client.patch(self._url(accion), {'estado': 'Pendiente'}, format='json')
        self.assertEqual(resp.status_code, 200)

    def test_grupo_en_haciendo_se_completa_al_completar_subacciones(self):
        accion = self._accion('Preparar una reunión')
        sub = SubaccionKanban.objects.create(accion=accion, texto='Reservar sala')
        self.client.patch(self._url(accion), {'estado': 'Haciendo'}, format='json')
        self.client.patch(self._url(accion, f'subacciones/{sub.pk}/'), {'estado': 'Completada'}, format='json')
        accion.refresh_from_db()
        self.assertEqual(accion.estado, 'Completada')

    def test_subaccion_revertida_devuelve_grupo_a_pendiente(self):
        accion = self._accion('Preparar una reunión')
        sub = SubaccionKanban.objects.create(accion=accion, texto='Reservar sala', estado='Completada')
        accion.estado = 'Completada'
        accion.save()
        self.client.patch(self._url(accion, f'subacciones/{sub.pk}/'), {'estado': 'Pendiente'}, format='json')
        accion.refresh_from_db()
        self.assertEqual(accion.estado, 'Pendiente')

    def test_editar_subaccion_registra_evento(self):
        accion = self._accion('Preparar una reunión')
        sub = SubaccionKanban.objects.create(accion=accion, texto='Reservar sala')
        resp = self.client.patch(self._url(accion, f'subacciones/{sub.pk}/'), {'texto': 'Reservar auditorio'}, format='json')
        self.assertEqual(resp.status_code, 200)
        sub.refresh_from_db()
        self.assertEqual(sub.texto, 'Reservar auditorio')
        self.assertTrue(accion.eventos.filter(tipo='EditSubaction').exists())

    def test_eventos_de_la_accion(self):
        accion = self._accion('Pagar cuentas', hora='10:00')
        self.client.patch(self._url(accion), {'texto_accion': 'Pagar luz'}, format='json')
        self.client.patch(self._url(accion), {'hora_seleccionada': '12:00'}, format='json')
        self.client.patch(self._url(accion), {'estado': 'Haciendo'}, format='json')
        tipos = set(accion.eventos.values_list('tipo', flat=True))
        self.assertTrue({'EditAction', 'ChangeStatus', 'DropAction'} <= tipos)

    def test_eliminar_subaccion_recalcula_estado(self):
        accion = self._accion('Preparar una reunión')
        pendiente = SubaccionKanban.objects.create(accion=accion, texto='Reservar sala')
        hecha = SubaccionKanban.objects.create(accion=accion, texto='Definir agenda', estado='Completada')
        accion.refresh_from_db()
        self.client.delete(self._url(accion, f'subacciones/{pendiente.pk}/'))
        accion.refresh_from_db()
        self.assertEqual(accion.estado, 'Completada')
        self.assertFalse(SubaccionKanban.objects.filter(pk=pendiente.pk).exists())
        self.assertTrue(SubaccionKanban.objects.filter(pk=hecha.pk).exists())
