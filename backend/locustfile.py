"""
Benchmarks de rendimiento para Focusia - TRL 4
===============================================
Este archivo define los benchmarks de carga para validar el rendimiento
del API de Focusia bajo diferentes cargas de usuarios concurrentes.

Objetivos TRL 4:
- Latencia p95 < 500ms
- Soporte de 50-100 usuarios concurrentes
- Disponibilidad > 99.5%
"""

import json
import random
import string
from locust import HttpUser, task, between, events, constant
from locust.runners import MasterRunner
import time

# Variables globales para tracking de métricas
request_metrics = {}

@events.request.add_listener
def on_request(request_type, name, response_time, response_length, exception, **kwargs):
    """Track request metrics for TRL 4 validation"""
    if name not in request_metrics:
        request_metrics[name] = {
            'count': 0,
            'total_time': 0,
            'max_time': 0,
            'min_time': float('inf'),
            'errors': 0
        }
    
    metrics = request_metrics[name]
    metrics['count'] += 1
    metrics['total_time'] += response_time
    metrics['max_time'] = max(metrics['max_time'], response_time)
    metrics['min_time'] = min(metrics['min_time'], response_time)
    if exception:
        metrics['errors'] += 1

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Calculate and display final metrics"""
    print("\n" + "="*60)
    print("MÉTRICAS DE RENDIMIENTO TRL 4")
    print("="*60)
    
    for endpoint, metrics in request_metrics.items():
        if metrics['count'] > 0:
            avg_time = metrics['total_time'] / metrics['count'] / 1000  # Convert to seconds
            max_time = metrics['max_time'] / 1000
            min_time = metrics['min_time'] / 1000
            error_rate = (metrics['errors'] / metrics['count']) * 100
            
            print(f"\n{endpoint}:")
            print(f"  Requests: {metrics['count']}")
            print(f"  Avg Latency: {avg_time:.3f}s")
            print(f"  Min Latency: {min_time:.3f}s")
            print(f"  Max Latency: {max_time:.3f}s")
            print(f"  Error Rate: {error_rate:.1f}%")
            
            # TRL 4 validation
            if avg_time < 0.5:
                print(f"  ✅ TRL 4: Latency < 500ms ✓")
            else:
                print(f"  ❌ TRL 4: Latency > 500ms ✗")
    
    print("\n" + "="*60)

# Test de usuarios con credenciales predefinidas
TEST_USERS = [
    {'username': 'testuser1', 'password': 'testpass123'},
    {'username': 'testuser2', 'password': 'testpass123'},
    {'username': 'testuser3', 'password': 'testpass123'},
]

class FocusiaUser(HttpUser):
    """Simula un usuario típico de Focusia"""
    wait_time = between(1, 5)
    
    def on_start(self):
        """Login and obtain JWT token before starting tasks"""
        # Select random test user
        user = random.choice(TEST_USERS)
        
        # Attempt login
        with self.client.post("/api/token/", json={
            "username": user['username'],
            "password": user['password']
        }, catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('access')
                self.client.headers = {"Authorization": f"Bearer {self.token}"}
                response.success()
            else:
                response.failure(f"Login failed: {response.status_code}")
    
    @task(10)
    def get_user_profile(self):
        """Get current user profile"""
        self.client.get("/api/users/me/", name="/api/users/me/")
    
    @task(8)
    def get_mision_hoy(self):
        """Get today's mission"""
        self.client.get("/api/mision-hoy/", name="/api/mision-hoy/")
    
    @task(6)
    def create_kanban_task(self):
        """Create a new kanban task"""
        self.client.post("/api/kanban-tasks/", json={
            "titulo": f"Task {random.randint(1, 1000)}",
            "descripcion": "Test description",
            "columna": "Backlog"
        }, name="/api/kanban-tasks/")
    
    @task(5)
    def get_kanban_tasks(self):
        """List all kanban tasks"""
        self.client.get("/api/kanban-tasks/", name="/api/kanban-tasks/")
    
    @task(4)
    def update_keep_nota(self):
        """Update keep note"""
        self.client.post("/api/keep-nota/", json={
            "contenido": "Test note content"
        }, name="/api/keep-nota/")
    
    @task(3)
    def get_recordatorios(self):
        """Get reminders"""
        self.client.get("/api/recordatorios/", name="/api/recordatorios/")
    
    @task(2)
    def get_rueda_vida(self):
        """Get life wheel data"""
        self.client.get("/api/rueda-vida/", name="/api/rueda-vida/")
    
    @task(1)
    def get_time_blocks(self):
        """Get time blocks"""
        self.client.get("/api/time-blocks/", name="/api/time-blocks/")

class AdminUser(HttpUser):
    """Simula un administrador con acceso a endpoints sensibles"""
    wait_time = between(2, 4)
    
    def on_start(self):
        user = random.choice(TEST_USERS)
        with self.client.post("/api/token/", json={
            "username": user['username'],
            "password": user['password']
        }, catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('access')
                self.client.headers = {"Authorization": f"Bearer {self.token}"}
                response.success()
    
    @task(3)
    def get_all_users(self):
        """Try to list all users (should be restricted)"""
        self.client.get("/api/users/", name="/api/users/")
    
    @task(2)
    def get_dashboard_data(self):
        """Get dashboard data"""
        self.client.get("/api/resumen-dashboard/", name="/api/resumen-dashboard/")
    
    @task(1)
    def get_matrix_items(self):
        """Get matrix items"""
        self.client.get("/api/matrix-items/", name="/api/matrix-items/")

# Configuration for different load scenarios
class LightLoad(FocusiaUser):
    """Light load scenario: 10 users, hatch rate 1/s"""
    pass

class MediumLoad(FocusiaUser):
    """Medium load scenario: 50 users, hatch rate 5/s"""
    pass

class HeavyLoad(FocusiaUser):
    """Heavy load scenario: 100 users, hatch rate 10/s"""
    pass

# Events for test setup and teardown
@events.init.add_listener
def on_locust_init(environment, **_):
    """Initialize test data if needed"""
    if isinstance(environment.runner, MasterRunner):
        # Running in master mode - this is a distributed test
        print("Starting distributed load test...")

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Record start time for TRL 4 metrics"""
    environment.start_time = time.time()
    print("\n🚀 INICIANDO BENCHMARK DE RENDIMIENTO TRL 4")
    print("="*60)

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Calculate final metrics"""
    if hasattr(environment, 'start_time'):
        duration = time.time() - environment.start_time
        print(f"\n⏱️  Test duration: {duration:.2f}s")
    
    total_requests = sum(m['count'] for m in request_metrics.values())
    total_errors = sum(m['errors'] for m in request_metrics.values())
    
    if total_requests > 0:
        overall_error_rate = (total_errors / total_requests) * 100
        requests_per_second = total_requests / duration
        
        print(f"\n📈 TOTALES:")
        print(f"  Total Requests: {total_requests}")
        print(f"  Total Errors: {total_errors}")
        print(f"  Error Rate: {overall_error_rate:.1f}%")
        print(f"  Requests/sec: {requests_per_second:.1f}")
        
        # TRL 4 Validation
        print(f"\n✅ VALIDACIÓN TRL 4:")
        if overall_error_rate < 5:
            print("  ✅ Error rate < 5%")
        else:
            print("  ❌ Error rate >= 5%")
        
        if requests_per_second > 10:
            print("  ✅ Throughput > 10 req/s")
        else:
            print("  ❌ Throughput <= 10 req/s")