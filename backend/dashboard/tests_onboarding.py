from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from .models import Avatar, OnboardingProfile, GuidedTourBlock, LearningCategory, LearningModuleRef, InicioState, InicioEventLog, NotificationPreference, ScheduleException, UserProgramProgress

User = get_user_model()


class OnboardingProfileModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass123')
        self.profile = OnboardingProfile.objects.create(user=self.user)

    def test_default_values(self):
        self.assertEqual(self.profile.intensity, 'equilibrada')
        self.assertTrue(self.profile.activations_app)
        self.assertTrue(self.profile.activations_push)
        self.assertTrue(self.profile.activations_whatsapp)
        self.assertFalse(self.profile.activations_calls)
        self.assertEqual(self.profile.schedule_type, 'manana_tarde')
        self.assertEqual(self.profile.tone, 'adaptativo')
        self.assertFalse(self.profile.used_recommended_config)
        self.assertEqual(self.profile.guided_tour_status, 'pending')

    def test_status_transition(self):
        self.assertEqual(self.profile.status, 'onboarding_iniciado')
        self.profile.status = OnboardingProfile.Status.CUENTA_CREADA
        self.profile.save()
        self.assertEqual(self.profile.status, 'cuenta_creada')
        self.profile.status = OnboardingProfile.Status.AVATAR_SELECCIONADO
        self.profile.save()
        self.assertEqual(self.profile.status, 'avatar_seleccionado')

    def test_recommended_config_applied(self):
        self.profile.intensity = OnboardingProfile.Intensity.EQUILIBRADA
        self.profile.activations_app = True
        self.profile.activations_push = True
        self.profile.activations_whatsapp = True
        self.profile.activations_calls = False
        self.profile.schedule_type = OnboardingProfile.Schedule.MANANA_TARDE
        self.profile.tone = OnboardingProfile.Tone.ADAPTATIVO
        self.profile.used_recommended_config = True
        self.profile.save()

        self.assertEqual(self.profile.intensity, 'equilibrada')
        self.assertTrue(self.profile.activations_app)
        self.assertFalse(self.profile.activations_calls)
        self.assertTrue(self.profile.used_recommended_config)

    def test_defer_guided_tour_leaves_pending(self):
        self.profile.status = OnboardingProfile.Status.ONBOARDING_FINALIZADO
        self.profile.guided_tour_status = OnboardingProfile.GuidedTour.PENDING
        self.profile.save()
        self.assertEqual(self.profile.guided_tour_status, 'pending')
        self.assertEqual(self.profile.status, 'onboarding_finalizado')

    def test_complete_guided_tour(self):
        self.profile.guided_tour_status = OnboardingProfile.GuidedTour.STARTED
        self.profile.save()
        self.assertEqual(self.profile.guided_tour_status, 'started')
        self.profile.guided_tour_status = OnboardingProfile.GuidedTour.COMPLETED
        self.profile.save()
        self.assertEqual(self.profile.guided_tour_status, 'completed')


class OnboardingAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpass123')
        Avatar.objects.all().delete()
        Avatar.objects.create(
            name='TestAvatar', gender='male', image='/test.jpg',
            voice_id='test', intro_message_text='Hello [nombre]'
        )
        Avatar.objects.create(
            name='TestAvatar2', gender='female', image='/test2.jpg',
            voice_id='test2', intro_message_text='Hi [nombre]'
        )

    def test_get_avatars_requires_auth(self):
        response = self.client.get('/api/onboarding/avatars/')
        self.assertEqual(response.status_code, 401)

    def test_get_avatars_returns_active(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/onboarding/avatars/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)

    def test_select_avatar(self):
        self.client.force_authenticate(user=self.user)
        avatar = Avatar.objects.first()
        response = self.client.patch('/api/onboarding/profile/select-avatar/', {'avatar_id': avatar.id})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'avatar_seleccionado')

    def test_select_invalid_avatar(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch('/api/onboarding/profile/select-avatar/', {'avatar_id': 999})
        self.assertEqual(response.status_code, 400)

    def test_accept_recommended_config(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch('/api/onboarding/profile/accept-recommended/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['used_recommended_config'])
        self.assertEqual(response.data['status'], 'configuracion_recomendada_aceptada')

    def test_customize_intensity(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch('/api/onboarding/profile/customize/intensity/', {'intensity': 'exigente'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['intensity'], 'exigente')

    def test_customize_activations(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch('/api/onboarding/profile/customize/activations/', {
            'activations_app': False, 'activations_push': False,
            'activations_whatsapp': True, 'activations_calls': True,
        })
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['activations_app'])
        self.assertTrue(response.data['activations_calls'])

    def test_customize_schedule(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch('/api/onboarding/profile/customize/schedule/', {
            'schedule_type': 'todo_el_dia',
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['schedule_type'], 'todo_el_dia')

    def test_customize_personalized_schedule(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch('/api/onboarding/profile/customize/schedule/', {
            'schedule_type': 'personalizado',
            'custom_schedule_start': '09:00',
            'custom_schedule_end': '18:00',
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['schedule_type'], 'personalizado')

    def test_customize_tone(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch('/api/onboarding/profile/customize/tone/', {'tone': 'firme_exigente'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['tone'], 'firme_exigente')
        self.assertEqual(response.data['status'], 'personalizacion_completada')

    def test_customize_tone_without_avatar_returns_profile(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch('/api/onboarding/profile/customize/tone/', {'tone': 'cercano_motivador'})
        self.assertEqual(response.status_code, 200)

    def test_summary(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/onboarding/profile/summary/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('intensity', response.data)

    def test_confirm(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/onboarding/profile/confirm/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'configuracion_confirmada')

    def test_complete_onboarding(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/onboarding/profile/complete/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'onboarding_finalizado')

    def test_guided_tour_start(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/onboarding/profile/guided-tour/start/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['guided_tour_status'], 'started')

    def test_guided_tour_defer(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/onboarding/profile/guided-tour/defer/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['guided_tour_status'], 'pending')

    def test_status_endpoint(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/onboarding/profile/status/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('status', response.data)
        self.assertIn('guided_tour_status', response.data)

    def test_full_onboarding_flow(self):
        self.client.force_authenticate(user=self.user)

        # 1. Status
        response = self.client.get('/api/onboarding/profile/status/')
        self.assertEqual(response.status_code, 200)

        # 2. Select avatar
        avatar = Avatar.objects.first()
        response = self.client.patch('/api/onboarding/profile/select-avatar/', {'avatar_id': avatar.id})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'avatar_seleccionado')

        # 3. Accept recommended config (skip personalization)
        response = self.client.patch('/api/onboarding/profile/accept-recommended/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'configuracion_recomendada_aceptada')

        # 4. Confirm
        response = self.client.post('/api/onboarding/profile/confirm/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'configuracion_confirmada')

        # 5. Complete
        response = self.client.post('/api/onboarding/profile/complete/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'onboarding_finalizado')

        # 6. Defer guided tour
        response = self.client.post('/api/onboarding/profile/guided-tour/defer/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['guided_tour_status'], 'pending')

    def test_full_personalization_flow(self):
        self.client.force_authenticate(user=self.user)

        avatar = Avatar.objects.first()
        self.client.patch('/api/onboarding/profile/select-avatar/', {'avatar_id': avatar.id})

        self.client.patch('/api/onboarding/profile/customize/intensity/', {'intensity': 'exigente'})
        self.client.patch('/api/onboarding/profile/customize/activations/', {
            'activations_app': True, 'activations_push': False,
            'activations_whatsapp': False, 'activations_calls': False,
        })
        self.client.patch('/api/onboarding/profile/customize/schedule/', {'schedule_type': 'horario_laboral'})
        response = self.client.patch('/api/onboarding/profile/customize/tone/', {'tone': 'claro_estrategico'})

        self.assertEqual(response.data['intensity'], 'exigente')
        self.assertFalse(response.data['activations_push'])
        self.assertEqual(response.data['schedule_type'], 'horario_laboral')
        self.assertEqual(response.data['tone'], 'claro_estrategico')
        self.assertEqual(response.data['status'], 'personalizacion_completada')

    def test_wizard_resume_after_interruption(self):
        self.client.force_authenticate(user=self.user)

        # User completes avatar selection, closes app
        avatar = Avatar.objects.first()
        self.client.patch('/api/onboarding/profile/select-avatar/', {'avatar_id': avatar.id})

        # User returns - status should show avatar selected
        response = self.client.get('/api/onboarding/profile/status/')
        self.assertEqual(response.data['status'], 'avatar_seleccionado')

        # User continues to recommended config
        response = self.client.patch('/api/onboarding/profile/accept-recommended/')
        self.assertEqual(response.data['status'], 'configuracion_recomendada_aceptada')

        # User confirms
        response = self.client.post('/api/onboarding/profile/confirm/')
        self.assertEqual(response.data['status'], 'configuracion_confirmada')

        # User completes
        response = self.client.post('/api/onboarding/profile/complete/')
        self.assertEqual(response.data['status'], 'onboarding_finalizado')

        # Return again - should show onboarding as completed
        response = self.client.get('/api/onboarding/profile/status/')
        self.assertTrue(response.data['onboarding_completado'])


class InicioModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass123')

    def test_guided_tour_block_creation(self):
        initial_count = GuidedTourBlock.objects.count()
        block = GuidedTourBlock.objects.create(slug='test_block', title='Test', avatar_message='Msg', order=999)
        self.assertEqual(GuidedTourBlock.objects.count(), initial_count + 1)
        self.assertEqual(str(block), '999. Test')

    def test_learning_category_creation(self):
        initial_count = LearningCategory.objects.count()
        cat = LearningCategory.objects.create(slug='test_cat', name='Test Cat', order=999)
        module = LearningModuleRef.objects.create(category=cat, name='Module 1', order=1)
        self.assertEqual(cat.modules.count(), 1)
        self.assertEqual(str(module), 'Test Cat → Module 1')
        self.assertEqual(LearningCategory.objects.count(), initial_count + 1)

    def test_inicio_state_auto_created(self):
        state = InicioState.objects.create(user=self.user)
        self.assertFalse(state.has_seen_intro_video)
        self.assertEqual(state.guided_tour_status, 'pending')
        self.assertEqual(state.status, 'onboarding_finalizado')

    def test_inicio_event_log(self):
        InicioEventLog.objects.create(user=self.user, event_type='test_event', origin='test')
        self.assertEqual(InicioEventLog.objects.count(), 1)
        event = InicioEventLog.objects.first()
        self.assertEqual(event.event_type, 'test_event')
        self.assertIsNotNone(event.created_at)


class InicioAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpass123')

    def test_inicio_state_requires_auth(self):
        response = self.client.get('/api/inicio/state/')
        self.assertEqual(response.status_code, 401)

    def test_inicio_state_returns_defaults(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/inicio/state/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'onboarding_finalizado')

    def test_intro_video_shown(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/inicio/intro-video/shown/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['has_seen_intro_video'])

    def test_intro_video_completed(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/inicio/intro-video/completed/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['intro_video_completed'])
        self.assertEqual(InicioEventLog.objects.filter(event_type='intro_video_completed').count(), 1)

    def test_intro_video_abandoned(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/inicio/intro-video/abandoned/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(InicioEventLog.objects.filter(event_type='intro_video_abandoned').count(), 1)

    def test_dashboard_open(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/inicio/dashboard/open/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'dashboard_abierto_desde_inicio')
        self.assertEqual(InicioEventLog.objects.filter(event_type='dashboard_opened').count(), 1)
        self.assertIsNotNone(InicioState.objects.get(user=self.user).first_entry_at)

    def test_tutorial_open(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/inicio/tutorial/open/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'tutorial_abierto')
        self.assertEqual(InicioEventLog.objects.filter(event_type='tutorial_opened').count(), 1)

    def test_config_open(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/inicio/config/open/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'configuracion_abierta_desde_inicio')
        self.assertEqual(InicioEventLog.objects.filter(event_type='config_opened').count(), 1)

    def test_config_video_shown(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/inicio/config/video-shown/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'video_configuracion_mostrado')
        self.assertEqual(InicioEventLog.objects.filter(event_type='config_video_shown').count(), 1)

    def test_config_open_now(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/inicio/config/open-now/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'configuracion_por_categorias_abierta')
        self.assertEqual(InicioEventLog.objects.filter(event_type='config_categories_opened').count(), 1)

    def test_config_volver_inicio(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/inicio/config/volver/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'usuario_volvio_a_inicio')
        self.assertEqual(InicioEventLog.objects.filter(event_type='returned_to_inicio').count(), 1)

    def test_guided_tour_blocks_returns_seeded_data(self):
        # Migration 0040 already seeds 25 blocks
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/inicio/guided-tour/blocks/')
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data), 25)
        self.assertEqual(response.data[0]['order'], 1)

    def test_guided_tour_start(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/inicio/guided-tour/start/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['guided_tour_status'], 'started')
        self.assertEqual(InicioEventLog.objects.filter(event_type='guided_tour_started').count(), 1)

    def test_guided_tour_abandon(self):
        self.client.force_authenticate(user=self.user)
        self.client.post('/api/inicio/guided-tour/start/')
        response = self.client.post(
            '/api/inicio/guided-tour/abandon/',
            {'paso_actual': 5, 'total_pasos': 25}, format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            InicioState.objects.get(user=self.user).status, 'visita_guiada_pendiente'
        )
        event = InicioEventLog.objects.get(event_type='guided_tour_abandoned')
        self.assertEqual(event.metadata.get('paso_actual'), 5)

    def test_intro_video_replayed_from_tutorial(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            '/api/inicio/intro-video/replayed/',
            {'origin': 'tutorial', 'completed': True, 'duration_seconds': 55},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'video_visto_desde_tutorial')
        event = InicioEventLog.objects.get(event_type='intro_video_replayed')
        self.assertEqual(event.origin, 'tutorial')
        self.assertTrue(event.metadata.get('completed'))

    def test_learn_sections_opened_and_category_select(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/inicio/learn/sections/opened/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'aprender_secciones_abierto')
        response = self.client.post(
            '/api/inicio/learn/category/select/', {'slug': 'planificacion'}, format='json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'categoria_aprendizaje_seleccionada')
        event = InicioEventLog.objects.get(event_type='learn_category_selected')
        self.assertEqual(event.metadata.get('slug'), 'planificacion')

    def test_guided_tour_complete(self):
        self.client.force_authenticate(user=self.user)
        self.client.post('/api/inicio/guided-tour/start/')
        response = self.client.post('/api/inicio/guided-tour/complete/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['guided_tour_status'], 'completed')

    def test_learn_categories_returns_seeded_data(self):
        # Migration 0040 already seeds 6 categories
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/inicio/learn/categories/')
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data), 6)
        slugs = [c['slug'] for c in response.data]
        self.assertIn('planificacion', slugs)
        self.assertIn('herramientas_personales', slugs)

    def test_events_logged_and_retrieved(self):
        self.client.force_authenticate(user=self.user)
        self.client.post('/api/inicio/intro-video/completed/')
        self.client.post('/api/inicio/config/open/')
        response = self.client.get('/api/inicio/events/?limit=10')
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data), 2)

    def test_guided_tour_requires_auth(self):
        response = self.client.get('/api/inicio/guided-tour/blocks/')
        self.assertEqual(response.status_code, 401)


class ConfigAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpass123')
        self.profile = OnboardingProfile.objects.create(user=self.user)

    def test_config_avatar_requires_auth(self):
        response = self.client.get('/api/config/avatar/')
        self.assertEqual(response.status_code, 401)

    def test_config_profile_returns_onboarding_data(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/config/profile/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('intensity', response.data)
        self.assertEqual(response.data['username'], 'testuser')

    def test_config_avatar_get_returns_avatar_list(self):
        # 6 avatars seeded by migration 0038, 2 created here = 8
        Avatar.objects.create(name='A1', gender='male', image='/a1.jpg', voice_id='v1')
        Avatar.objects.create(name='A2', gender='female', image='/a2.jpg', voice_id='v2')
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/config/avatar/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('avatars', response.data)
        self.assertGreaterEqual(len(response.data['avatars']), 2)

    def test_config_avatar_patch_updates_profile(self):
        avatar = Avatar.objects.create(name='A1', gender='male', image='/a1.jpg', voice_id='v1')
        self.client.force_authenticate(user=self.user)
        response = self.client.patch('/api/config/avatar/', {'avatar_id': avatar.id}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['current_avatar_id'], avatar.id)

    def test_config_accompaniment_returns_current(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/config/accompaniment/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('intensity', response.data)

    def test_config_accompaniment_patch_changes_intensity(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch('/api/config/accompaniment/', {'intensity': 'suave'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['intensity'], 'suave')

    def test_config_notifications_get_returns_list(self):
        self.client.force_authenticate(user=self.user)
        NotificationPreference.objects.create(user=self.user, channel='app', state='active')
        response = self.client.get('/api/config/notifications/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_config_notifications_patch_replaces_all(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch('/api/config/notifications/', [
            {'channel': 'push', 'state': 'active'},
            {'channel': 'whatsapp', 'state': 'inactive'},
        ], format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)

    def test_config_schedule_get(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/config/schedule/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('schedule_type', response.data)

    def test_config_schedule_patch(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch('/api/config/schedule/', {'schedule_type': 'todo_el_dia'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['schedule_type'], 'todo_el_dia')

    def test_config_tone_get(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/config/tone/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('tone', response.data)

    def test_config_tone_patch(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch('/api/config/tone/', {'tone': 'claro_estrategico'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['tone'], 'claro_estrategico')

    def test_config_privacy_get(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/config/privacy/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['data_collection'])

    def test_config_privacy_permissions_patch(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch('/api/config/privacy/permissions/', {
            'data_collection': False, 'analytics': False,
            'personalized_recommendations': False, 'third_party_sharing': True,
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['data_collection'])
        self.assertTrue(response.data['third_party_sharing'])

    def test_config_privacy_export(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/config/privacy/export/', format='json')
        self.assertEqual(response.status_code, 200)

    def test_config_privacy_delete_data_requires_confirm(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/config/privacy/delete-data/', {'confirm': False}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_config_privacy_delete_data_with_confirm(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/config/privacy/delete-data/', {'confirm': True}, format='json')
        self.assertEqual(response.status_code, 200)

    def test_config_account_get(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/config/account/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['email'], '')

    def test_config_account_update(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch('/api/config/account/update/', {'email': 'new@test.com'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['email'], 'new@test.com')

    def test_config_change_password_invalid_old(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/config/account/change-password/', {
            'old_password': 'wrong', 'new_password': 'newpass123', 'new_password_confirm': 'newpass123',
        }, format='json')
        self.assertEqual(response.status_code, 400)

    def test_config_change_password_valid(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/config/account/change-password/', {
            'old_password': 'testpass123', 'new_password': 'newpass123', 'new_password_confirm': 'newpass123',
        }, format='json')
        self.assertEqual(response.status_code, 200)

    def test_config_devices_get(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/config/devices/')
        self.assertEqual(response.status_code, 200)

    def test_config_plan_get(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/config/plan/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['plan'], 'free')

    def test_schedule_exception_create(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/config/schedule/exception/', {
            'exception_type': 'no_days', 'value': {'days': ['2026-12-25']},
        }, format='json')
        self.assertEqual(response.status_code, 201)

    def test_schedule_exception_delete(self):
        self.client.force_authenticate(user=self.user)
        exc = ScheduleException.objects.create(user=self.user, exception_type='no_days', value={'days': ['2026-12-25']})
        response = self.client.delete(f'/api/config/schedule/exception/{exc.id}/')
        self.assertEqual(response.status_code, 204)


class InicioVideoFirstTimeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpass123')

    def test_video_not_shown_again_after_completed(self):
        self.client.force_authenticate(user=self.user)
        self.client.post('/api/inicio/intro-video/shown/')
        self.client.post('/api/inicio/intro-video/completed/')
        response = self.client.get('/api/inicio/state/')
        self.assertTrue(response.data['has_seen_intro_video'])
        self.assertTrue(response.data['intro_video_completed'])

    def test_video_flag_persists_across_state_calls(self):
        self.client.force_authenticate(user=self.user)
        self.client.post('/api/inicio/intro-video/shown/')
        r1 = self.client.get('/api/inicio/state/')
        r2 = self.client.get('/api/inicio/state/')
        self.assertTrue(r1.data['has_seen_intro_video'])
        self.assertTrue(r2.data['has_seen_intro_video'])


class ConfigDeleteDataDoubleConfirmationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpass123')
        self.profile = OnboardingProfile.objects.create(user=self.user)

    def test_delete_data_rejects_missing_confirm(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/config/privacy/delete-data/', {}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_delete_data_rejects_false_confirm(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/config/privacy/delete-data/', {'confirm': False}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_delete_data_requires_true_confirm(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/config/privacy/delete-data/', {'confirm': True}, format='json')
        self.assertEqual(response.status_code, 200)


class ConfigPersistenceTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpass123')
        self.profile = OnboardingProfile.objects.create(user=self.user)

    def test_config_changes_persist_on_profile(self):
        self.client.force_authenticate(user=self.user)
        self.client.patch('/api/config/accompaniment/', {'intensity': 'exigente'}, format='json')
        self.client.patch('/api/config/tone/', {'tone': 'claro_estrategico'}, format='json')
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.intensity, 'exigente')
        self.assertEqual(self.profile.tone, 'claro_estrategico')

    def test_config_schedule_persists(self):
        self.client.force_authenticate(user=self.user)
        self.client.patch('/api/config/schedule/', {'schedule_type': 'personalizado', 'custom_schedule_start': '08:00', 'custom_schedule_end': '20:00'}, format='json')
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.schedule_type, 'personalizado')

    def test_config_avatar_persists(self):
        self.client.force_authenticate(user=self.user)
        avatar = Avatar.objects.create(name='PersistTest', gender='male', image='/p.jpg', voice_id='vp')
        self.client.patch('/api/config/avatar/', {'avatar_id': avatar.id}, format='json')
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.avatar.id, avatar.id)


class ProgramServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='proguser', password='testpass123')

    def test_get_current_program_day_returns_day_1_for_new_user(self):
        from .services.program_service import get_current_program_day
        from datetime import date
        day = get_current_program_day(self.user, today=self.user.date_joined.date())
        self.assertIsNotNone(day)
        self.assertEqual(day.day_number, 1)
        self.assertEqual(day.month.month_number, 1)

    def test_get_current_program_day_advances_correctly(self):
        from .services.program_service import get_current_program_day
        from datetime import timedelta
        start = self.user.date_joined.date()
        day = get_current_program_day(self.user, today=start + timedelta(days=3))
        self.assertEqual(day.day_number, 4)
        self.assertEqual(day.month.month_number, 1)

    def test_get_current_program_day_crosses_month_boundary(self):
        from .services.program_service import get_current_program_day
        from datetime import timedelta
        start = self.user.date_joined.date()
        day = get_current_program_day(self.user, today=start + timedelta(days=10))
        self.assertIsNotNone(day)

    def test_annual_reset_syncs_eligible_users(self):
        from .services.annual_reset import apply_collective_annual_reset
        from datetime import date, timedelta
        start = date(2026, 1, 15)
        progress = UserProgramProgress.objects.create(user=self.user, cycle_start_date=start, is_synced_to_collective=True)
        reset_date = date(2027, 1, 1)
        updated = apply_collective_annual_reset(today=reset_date)
        self.assertEqual(updated, 1)
        progress.refresh_from_db()
        self.assertEqual(progress.cycle_start_date, reset_date)
        self.assertEqual(progress.last_collective_reset_year, 2027)

    def test_annual_reset_skips_non_synced_users(self):
        from .services.annual_reset import apply_collective_annual_reset
        from datetime import date
        start = date(2026, 3, 10)
        UserProgramProgress.objects.create(user=self.user, cycle_start_date=start, is_synced_to_collective=False)
        updated = apply_collective_annual_reset(today=date(2027, 1, 1))
        self.assertEqual(updated, 0)

    def test_annual_reset_does_not_run_twice_same_year(self):
        from .services.annual_reset import apply_collective_annual_reset
        from datetime import date
        start = date(2026, 6, 1)
        progress = UserProgramProgress.objects.create(
            user=self.user, cycle_start_date=start,
            is_synced_to_collective=True, last_collective_reset_year=2027
        )
        updated = apply_collective_annual_reset(today=date(2027, 6, 15))
        self.assertEqual(updated, 0)

    def test_fallback_after_completing_all_months(self):
        from .services.program_service import get_current_program_day, get_or_create_progress
        from datetime import timedelta
        total_days = 60
        start = self.user.date_joined.date()
        get_or_create_progress(self.user)
        day = get_current_program_day(self.user, today=start + timedelta(days=total_days + 5))
        self.assertIsNotNone(day)
        # TODO: pendiente de definición del cliente — debería devolver el último día disponible como fallback
        self.assertEqual(day.day_number, 5)
        self.assertEqual(day.month.month_number, 12)
