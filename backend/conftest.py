import os

# Load .env file first
env_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, _, value = line.partition('=')
            value = value.strip()
            if (value.startswith('"') and value.endswith('"')) or \
               (value.startswith("'") and value.endswith("'")):
                value = value[1:-1]
            os.environ.setdefault(key.strip(), value)

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'focusia_api.test_settings')
django.setup()

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def user():
    return User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123'
    )

@pytest.fixture
def authenticated_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client

@pytest.fixture
def another_user():
    return User.objects.create_user(
        username='otheruser',
        email='other@example.com',
        password='otherpass123'
    )

@pytest.fixture
def another_authenticated_client(another_user):
    client = APIClient()
    client.force_authenticate(user=another_user)
    return client