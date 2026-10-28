"""
Tests End-to-End para TRL 6
Valida la aplicación completa en entorno de producción/staging

Requiere:
- Servidor corriendo en PRODUCTION_URL
- Credenciales de test configuradas
"""

import pytest
import requests
import time
import json
import os

PRODUCTION_URL = os.getenv('PRODUCTION_URL', 'https://staging.focusia.app')
API_BASE = f"{PRODUCTION_URL}/api/"
TEST_USERNAME = os.getenv('TEST_USERNAME', 'e2e_test_user')
TEST_PASSWORD = os.getenv('TEST_PASSWORD', 'testpass123')

@pytest.fixture(scope="session")
def auth_session():
    """Crea una sesión autenticada (una sola vez por suite)"""
    session = requests.Session()
    
    # Login
    response = session.post(f"{API_BASE}token/", json={
        'username': TEST_USERNAME,
        'password': TEST_PASSWORD
    })
    
    if response.status_code == 200:
        token = response.json().get('access')
        session.headers.update({'Authorization': f'Bearer {token}'})
        return session
    return None

class TestTRL6Production:
    """Tests End-to-End para validación TRL 6"""
    
    def test_production_environment_accessible(self):
        """Verificar que la aplicación en producción es accesible"""
        response = requests.get(f"{API_BASE}session/status/", timeout=30)
        assert response.status_code == 401  # Requires auth
    
    def test_full_user_journey(self, auth_session):
        """Test journey completo de usuario: login -> crear mision -> kanban -> nota"""
        if not auth_session:
            pytest.skip("No auth available")
        
        # 1. Get user profile
        response = auth_session.get(f"{API_BASE}users/me/")
        assert response.status_code == 200
        
        # 2. Create mission
        response = auth_session.post(f"{API_BASE}mision-hoy/", json={
            'texto': 'TRL6 E2E Test Mission'
        })
        assert response.status_code == 201
        
        # 3. Create kanban task
        response = auth_session.post(f"{API_BASE}kanban-tasks/", json={
            'titulo': 'TRL6 Test Task',
            'descripcion': 'Testing production'
        })
        assert response.status_code == 201
        
        # 4. Create keep note
        response = auth_session.post(f"{API_BASE}keep-nota/", json={
            'contenido': 'TRL6 test note'
        })
        assert response.status_code == 201
        
        # 5. Get all user data
        endpoints = ['mision-hoy/', 'kanban-tasks/', 'keep-nota/', 'recordatorios/', 'rueda-vida/']
        for endpoint in endpoints:
            response = auth_session.get(f"{API_BASE}{endpoint}")
            assert response.status_code == 200
    
    def test_data_persistence(self, auth_session):
        """Test que los datos persisten entre requests"""
        if not auth_session:
            pytest.skip("No auth available")
        
        # Create data
        response = auth_session.post(f"{API_BASE}keep-nota/", json={
            'contenido': 'Persistent test data TRL6'
        })
        assert response.status_code == 201
        
        # Verify it exists
        response = auth_session.get(f"{API_BASE}keep-nota/")
        assert response.status_code == 200
        notes = response.json()
        assert any(n.get('contenido') == 'Persistent test data TRL6' for n in notes)
    
    def test_authorization_isolation(self, auth_session, another_auth_session):
        """Test aislamiento de datos entre usuarios en producción"""
        if not auth_session or not another_auth_session:
            pytest.skip("No auth available")
        
        # User 1 creates unique data
        response = auth_session.post(f"{API_BASE}mision-hoy/", json={
            'texto': 'User1_SECRET_DATA_TRL6'
        })
        assert response.status_code in (200, 201)
        
        # User 2 should not see User 1's data
        response = another_auth_session.get(f"{API_BASE}mision-hoy/")
        assert response.status_code == 200
        mision_data = response.json()
        assert not any(m.get('texto') == 'User1_SECRET_DATA_TRL6' for m in mision_data)
    
    def test_response_time_production(self, auth_session):
        """Test tiempo de respuesta en producción"""
        if not auth_session:
            pytest.skip("No auth available")
        
        # Measure response times
        times = []
        for _ in range(10):
            start = time.time()
            auth_session.get(f"{API_BASE}users/me/")
            end = time.time()
            times.append((end - start) * 1000)  # Convert to ms
        
        avg_response = sum(times) / len(times)
        print(f"\nProducción response time: {avg_response:.2f}ms")
        assert avg_response < 500  # Should be under 500ms

@pytest.fixture(scope="session")
def another_auth_session():
    """Create second authenticated session (una sola vez por suite)"""
    session = requests.Session()
    response = session.post(f"{API_BASE}token/", json={
        'username': 'e2e_test_user2',
        'password': 'testpass123'
    })
    
    if response.status_code == 200:
        token = response.json().get('access')
        session.headers.update({'Authorization': f'Bearer {token}'})
        return session
    return None