from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from django.test import TestCase

User = get_user_model()


class Fase2ApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('u', 'u@example.com', 'ClaveSegura123!')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_v1_prefix_and_error_shape(self):
        res = self.client.get('/api/v1/user-goals/')
        self.assertEqual(res.status_code, 200)
        # recurso inexistente devuelve contrato unificado
        res = self.client.get('/api/v1/user-goals/99999/')
        self.assertEqual(res.status_code, 404)
        self.assertIn('code', res.data)
        self.assertIn('message', res.data)
        self.assertIn('fields', res.data)
        self.assertIn('detail', res.data)

    def test_device_token_register_and_list(self):
        res = self.client.post('/api/device-tokens/', {'token': 'ExponentPushToken[abc]', 'platform': 'android'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['token'], 'ExponentPushToken[abc]')
        res = self.client.get('/api/device-tokens/')
        self.assertEqual(res.status_code, 200)
        items = res.data if isinstance(res.data, list) else res.data.get('results', [])
        self.assertEqual(len(items), 1)

    def test_gamification_profile_and_xp(self):
        res = self.client.get('/api/gamification/profile/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['xp'], 0)
        res = self.client.post('/api/gamification/xp/', {'amount': 50, 'reason': 'test', 'source': 'unit'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['profile']['xp'], 50)
        self.assertEqual(res.data['profile']['level'], 1)

    def test_user_goal_crud(self):
        res = self.client.post('/api/v1/user-goals/', {'period': 'daily', 'title': 'Leer 10 min'}, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        gid = res.data['id']
        res = self.client.get('/api/v1/user-goals/?period=daily')
        self.assertEqual(res.status_code, 200)
        res = self.client.patch(f'/api/v1/user-goals/{gid}/', {'progress': 100, 'status': 'completed'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['status'], 'completed')

    def test_notification_unread_count_and_mark_read_alias(self):
        from dashboard.models import Notification
        n = Notification.objects.create(user=self.user, type='reminder', title='t', message='m')
        res = self.client.get('/api/notifications/unread-count/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['unread_count'], 1)
        res = self.client.post(f'/api/notifications/{n.id}/mark-read/')
        self.assertEqual(res.status_code, 200)
        res = self.client.get('/api/notifications/unread-count/')
        self.assertEqual(res.data['unread_count'], 0)
