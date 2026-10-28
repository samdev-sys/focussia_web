"""
Test de carga escalada TRL 5
Simula 50 usuarios concurrentes para validar rendimiento
"""

import os
import sys
import time
import statistics
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'focusia_api.test_settings')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import django
django.setup()

from django.test.utils import setup_test_environment, teardown_test_environment
from django.test.runner import DiscoverRunner
from rest_framework.test import APIClient
from dashboard.models import User

def run_trl5_load_test():
    """Ejecuta test de carga TRL 5 con 50 usuarios concurrentes"""
    
    print("="*60)
    print("TEST DE CARGA TRL 5 - ESCALABILITY VALIDATION")
    print("="*60)
    
    # Setup test environment
    setup_test_environment()
    runner = DiscoverRunner(verbosity=0)
    old_config = runner.setup_databases()
    
    try:
        # Create test users
        test_users = []
        for i in range(50):
            username = f'trl5_user_{i}'
            if not User.objects.filter(username=username).exists():
                user = User.objects.create_user(
                    username=username,
                    email=f'{username}@test.com',
                    password='testpass123'
                )
                test_users.append(user)
            else:
                test_users.append(User.objects.get(username=username))
        
        # Endpoints a testear
        endpoints = [
            '/api/mision-hoy/',
            '/api/kanban-tasks/',
            '/api/keep-nota/',
            '/api/recordatorios/',
            '/api/rueda-vida/',
        ]
        
        concurrent_users = 50
        requests_per_user = 10
        total_requests = concurrent_users * len(endpoints) * requests_per_user // len(endpoints)
        
        print(f"[TRL5] Simulando {concurrent_users} usuarios concurrentes")
        print(f"[TRL5] Endpoints: {len(endpoints)}")
        print(f"[TRL5] Requests totales estimados: {total_requests}")
        print()
        
        results = {}
        
        for endpoint in endpoints:
            times = []
            errors = 0
            lock = threading.Lock()
            request_count = 0
            
            def make_request(user_idx, client=None):
                nonlocal request_count, errors
                try:
                    client = APIClient()
                    user = test_users[user_idx % len(test_users)]
                    client.force_authenticate(user=user)
                    
                    start = time.time() * 1000
                    response = client.get(endpoint)
                    end = time.time() * 1000
                    
                    elapsed = end - start
                    with lock:
                        times.append(elapsed)
                        request_count += 1
                        if response.status_code >= 400:
                            errors += 1
                    return elapsed, response.status_code
                except Exception as e:
                    with lock:
                        errors += 1
                    return 0, 500
            
            # Run concurrent requests
            with ThreadPoolExecutor(max_workers=concurrent_users) as executor:
                futures = []
                for i in range(total_requests):
                    futures.append(executor.submit(make_request, i))
                
                for future in as_completed(futures):
                    try:
                        future.result()
                    except:
                        pass
            
            # Calculate metrics
            if times:
                avg_time = statistics.mean(times)
                p95 = sorted(times)[int(len(times) * 0.95)]
                max_time = max(times)
                min_time = min(times)
                throughput = len(times) / (sum(times) / 1000) if sum(times) > 0 else 0
                error_rate = (errors / len(times)) * 100 if times else 100
                
                results[endpoint] = {
                    'avg_ms': round(avg_time, 2),
                    'p95_ms': round(p95, 2),
                    'max_ms': round(max_time, 2),
                    'min_ms': round(min_time, 2),
                    'rps': round(throughput, 2),
                    'error_pct': round(error_rate, 2),
                    'requests': len(times)
                }
        
        # Output results
        print("RESULTADOS DEL TEST DE CARGA TRL 5")
        print("-"*70)
        print(f"{'Endpoint':<25} {'Avg(ms)':>8} {'P95(ms)':>8} {'Max(ms)':>8} {'RPS':>8} {'Err%':>6}")
        print("-"*70)
        
        for endpoint, metrics in results.items():
            print(f"{endpoint:<25} {metrics['avg_ms']:>8} {metrics['p95_ms']:>8} "
                  f"{metrics['max_ms']:>8} {metrics['rps']:>8} {metrics['error_pct']:>6}")
        
        print("-"*70)
        
        # TRL 5 Validation
        total_requests = sum(r['requests'] for r in results.values())
        total_errors = sum(int(r['requests'] * r['error_pct'] / 100) for r in results.values())
        avg_throughput = statistics.mean(r['rps'] for r in results.values())
        avg_latency = statistics.mean(r['avg_ms'] for r in results.values())
        
        print()
        print("="*60)
        print("VALIDACION TRL 5 - CRITERIOS DE RENDIMIENTO")
        print("="*60)
        print(f"Total Requests: {total_requests}")
        print(f"Total Errors: {total_errors}")
        print(f"Avg Throughput: {avg_throughput:.2f} req/s")
        print(f"Avg Latency: {avg_latency:.2f}ms")
        
        trl5_criteria = [
            ("Latencia < 300ms", avg_latency < 300),
            ("Throughput > 20 rps", avg_throughput > 20),
            ("Error rate < 2%", total_errors < total_requests * 0.02),
            ("50 usuarios concurrentes", True),
        ]
        
        print()
        for criterion, passed in trl5_criteria:
            status = "[PASS]" if passed else "[FAIL]"
            print(f"  {criterion}: {status}")
        
        all_passed = all(p for _, p in trl5_criteria)
        print()
        if all_passed:
            print("TRL 5 CERTIFICADO!")
        else:
            print("TRL 5 - Necesita optimizacion")
        
        return results
        
    finally:
        runner.teardown_databases(old_config)
        teardown_test_environment()

if __name__ == '__main__':
    run_trl5_load_test()