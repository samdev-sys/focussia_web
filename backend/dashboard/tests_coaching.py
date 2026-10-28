from datetime import timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from .models import (
    CoachingEntry, AccionKanban, HistorialMovimiento, Action,
    ProgramMonth, ProgramDay,
)

User = get_user_model()


class CoachingSpecTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='coach', password='testpass123')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_reflexion_se_guarda_en_entrada_del_dia(self):
        vieja = CoachingEntry.objects.create(user=self.user, reflection='vieja')
        CoachingEntry.objects.filter(pk=vieja.pk).update(
            created_at=timezone.now() - timedelta(days=3))
        resp = self.client.post(
            '/api/coaching-entries/submit_reflection/', {'reflection': 'hoy pienso'}, format='json')
        self.assertEqual(resp.status_code, 200)
        vieja.refresh_from_db()
        self.assertEqual(vieja.reflection, 'vieja')
        de_hoy = CoachingEntry.objects.get(
            user=self.user, created_at__date=timezone.localdate())
        self.assertEqual(de_hoy.reflection, 'hoy pienso')

    def test_pregunta_diaria_sale_de_tabla_maestra(self):
        mes, _ = ProgramMonth.objects.get_or_create(
            month_number=1, defaults={
                'theme_name': 'Inicio', 'training_theme': 'Base',
                'formative_objective': 'obj'})
        dia, _ = ProgramDay.objects.get_or_create(
            month=mes, day_number=1, defaults={
                'phrase': 'Frase del día', 'intention': 'foco'})
        dia.phrase = 'Frase del día'
        dia.intention = 'foco'
        dia.coaching_question = '¿Qué harás hoy por tu meta?'
        dia.es_integracion = True
        dia.origen_integracion = 'RUEDA_DE_VIDA'
        dia.save()
        resp = self.client.get('/api/coaching-entries/today-question/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['pregunta'], '¿Qué harás hoy por tu meta?')
        self.assertTrue(resp.data['es_integracion'])
        self.assertEqual(resp.data['origen_integracion'], 'RUEDA_DE_VIDA')
        self.assertEqual(resp.data['frase'], 'Frase del día')

    def test_pregunta_fallback_sin_tabla(self):
        resp = self.client.get('/api/coaching-entries/today-question/')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('Gran Meta Anual', resp.data['pregunta'])
        self.assertFalse(resp.data['es_integracion'])

    def test_decision_crea_accion_visible_manana_sin_duplicar(self):
        resp = self.client.post(
            '/api/coaching-entries/submit_decision/', {'decision': 'Correr 20 min'}, format='json')
        self.assertEqual(resp.status_code, 200)
        manana = timezone.localdate() + timedelta(days=1)
        # Visible en bandeja/agenda (AccionKanban)
        acc = AccionKanban.objects.get(texto_accion='[Coaching] Correr 20 min')
        self.assertEqual(acc.estado_actual, 'AGENDA_DIARIA')
        self.assertEqual(str(acc.fecha_seleccionada), manana.isoformat())
        self.assertTrue(HistorialMovimiento.objects.filter(accion=acc).exists())
        # Visible en planificador semanal
        act = Action.objects.get(title='[Coaching] Correr 20 min')
        self.assertEqual(str(act.assigned_calendar_date), manana.isoformat())
        # Reenviar no duplica
        resp2 = self.client.post(
            '/api/coaching-entries/submit_decision/', {'decision': 'Correr 20 min'}, format='json')
        self.assertEqual(resp2.status_code, 200)
        self.assertEqual(
            AccionKanban.objects.filter(texto_accion='[Coaching] Correr 20 min').count(), 1)
        self.assertEqual(Action.objects.filter(title='[Coaching] Correr 20 min').count(), 1)
        entry = CoachingEntry.objects.get(
            user=self.user, created_at__date=timezone.localdate())
        self.assertTrue(entry.decision_added_to_agenda)
