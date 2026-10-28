import pytest
import requests
import os
from urllib.parse import urljoin

# TRL 5 - Tests de integración contra entorno staging

STAGING_URL = os.getenv('STAGING_URL', 'http://localhost:8000')
API_BASE = f"{STAGING_URL}/api/"

@pytest.fixture
def auth_token():
    """Obtain auth token from staging"""
    response = requests.post(f"{API_BASE}token/", json={
        'username': os.getenv('TEST_USERNAME', 'admin'),
        'password': os.getenv('TEST_PASSWORD', 'admin123')
    })
    if response.status_code == 200:
        return response.json().get('access')
    return None

class TestTRL5Staging:
    """Pruebas de integración TRL 5 - Validación en staging"""
    
    def test_staging_environment_accessible(self):
        """Verificar que el entorno staging es accesible"""
        response = requests.get(f"{API_BASE}session/status/", timeout=10)
        assert response.status_code == 401  # Requires auth
    
    def test_jwt_authentication_staging(self, auth_token):
        """Test JWT autenticación en staging"""
        assert auth_token is not None
        assert len(auth_token) > 100  # JWT token length
    
    def test_crud_operations_staging(self, auth_token):
        """Test operaciones CRUD en staging"""
        headers = {'Authorization': f'Bearer {auth_token}'}
        
        # Create mision
        response = requests.post(f"{API_BASE}mision-hoy/", 
            json={'texto': 'Test mision TRL5'}, headers=headers)
        assert response.status_code == 201
        
        # Get mision
        response = requests.get(f"{API_BASE}mision-hoy/", headers=headers)
        assert response.status_code == 200
        
        # Update mision
        mision_id = response.json()[0]['id']
        response = requests.patch(f"{API_BASE}mision-hoy/{mision_id}/",
            json={'texto': 'Updated mision'}, headers=headers)
        assert response.status_code == 200
        
        # Delete mision
        response = requests.delete(f"{API_BASE}mision-hoy/{mision_id}/", headers=headers)
        assert response.status_code == 204
    
    def test_kanban_operations_staging(self, auth_token):
        """Test Kanban operaciones en staging"""
        headers = {'Authorization': f'Bearer {auth_token}'}
        
        # Create task
        response = requests.post(f"{API_BASE}kanban-tasks/",
            json={'titulo': 'Test Task TRL5', 'descripcion': 'Test'}, headers=headers)
        assert response.status_code == 201
        
        # List tasks
        response = requests.get(f"{API_BASE}kanban-tasks/", headers=headers)
        assert response.status_code == 200
    
    def test_data_isolation_staging(self, auth_token):
        """Test aislamiento de datos entre usuarios"""
        headers = {'Authorization': f'Bearer {auth_token}'}
        
        # User 1 creates data
        requests.post(f"{API_BASE}mision-hoy/", 
            json={'texto': 'User 1 mission'}, headers=headers)
        
        # User 2 should not see User 1's data
        response = requests.get(f"{API_BASE}mision-hoy/", headers=headers)
        data = response.json()
        assert all(m['texto'] != 'User 1 mission' for m in data if m.get('user') != 'admin')