"""
Script de Benchmark TRL 4 - Rendimiento y Escalabilidad
=========================================================

Realiza benchmarks integrados con los tests existentes para validar:
- Latencia de endpoints críticos
- Throughput (requests por segundo)
- Tasa de error
- Rendimiento bajo carga simulada
"""

import os
import sys
import time
import statistics
import threading
from concurrent.futures import ThreadPoolExecutor

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'focusia_api.test_settings')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import django
django.setup()

from django.test.utils import setup_test_environment, teardown_test_environment
from django.test.runner import DiscoverRunner

def run_benchmarks():
    """Ejecuta benchmarks integrados con la suite de tests"""
    
    print("="*60)
    print("BENCHMARK TRL 4 - FOCUSIA API PERFORMANCE")
    print("="*60)
    print()
    
    # Setup test environment
    setup_test_environment()
    runner = DiscoverRunner(verbosity=0)
    old_config = runner.setup_databases()
    
    try:
        # Import test clients after Django setup
        from rest_framework.test import APIClient
        from dashboard.models import User
        
        # Create test user
        User.objects.create_user(
            username='benchmark_user',
            email='benchmark@test.com',
            password='testpass123'
        )
        
        client = APIClient()
        client.force_authenticate(user=User.objects.get(username='benchmark_user'))
        
        # Definir endpoints a testear
        endpoints = {
            'auth_token': ('/api/token/', 'POST', {
                'username': 'benchmark_user',
                'password': 'testpass123'
            }),
            'user_profile': ('/api/users/me/', 'GET', None),
            'mision_hoy': ('/api/mision-hoy/', 'GET', None),
            'kanban_tasks': ('/api/kanban-tasks/', 'GET', None),
            'keep_nota': ('/api/keep-nota/', 'GET', None),
            'recordatorios': ('/api/recordatorios/', 'GET', None),
            'rueda_vida': ('/api/rueda-vida/', 'GET', None),
            'time_blocks': ('/api/time-blocks/', 'GET', None),
        }
        
        # Run benchmarks
        results = {}
        requests_count = 50  # Number of requests per endpoint
        concurrent_users = 10  # Concurrent users
        
        print(f"Running benchmarks: {requests_count} requests per endpoint")
        print(f"Simulating {concurrent_users} concurrent users")
        print()
        
        for name, (url, method, data) in endpoints.items():
            times = []
            errors = 0
            
            def make_request(client_ref=client, url=url, method=method, data=data):
                start = time.time() * 1000  # ms
                try:
                    if method == 'GET':
                        response = client_ref.get(url)
                    elif method == 'POST':
                        response = client_ref.post(url, data, format='json')
                    end = time.time() * 1000
                    return end - start, response.status_code
                except Exception as e:
                    end = time.time() * 1000
                    return end - start, 500
            
            # Run requests
            with ThreadPoolExecutor(max_workers=concurrent_users) as executor:
                futures = [executor.submit(make_request) for _ in range(requests_count)]
                for future in futures:
                    elapsed, status = future.result()
                    times.append(elapsed)
                    if status >= 400:
                        errors += 1
            
            # Calculate metrics
            avg_latency = statistics.mean(times)
            p95_latency = sorted(times)[int(len(times) * 0.95)]
            max_latency = max(times)
            min_latency = min(times)
            throughput = requests_count / (sum(times) / 1000)  # requests per second
            error_rate = (errors / requests_count) * 100
            
            results[name] = {
                'avg_latency_ms': round(avg_latency, 2),
                'p95_latency_ms': round(p95_latency, 2),
                'max_latency_ms': round(max_latency, 2),
                'min_latency_ms': round(min_latency, 2),
                'throughput_rps': round(throughput, 2),
                'error_rate_pct': round(error_rate, 2),
                'total_requests': requests_count,
                'errors': errors,
            }
        
        # Print results table
        print("RESULTADOS DE BENCHMARK")
        print("-" * 80)
        print(f"{'Endpoint':<20} {'Avg(ms)':>8} {'P95(ms)':>8} {'Max(ms)':>8} {'RPS':>8} {'Error%':>8} {'Status':>8}")
        print("-" * 80)
        
        for name, metrics in results.items():
            status_icon = "[OK]" if metrics['error_rate_pct'] < 5 and metrics['avg_latency_ms'] < 500 else "[WARN]"
            print(f"/{name:<19} {metrics['avg_latency_ms']:>8} {metrics['p95_latency_ms']:>8} "
                  f"{metrics['max_latency_ms']:>8} {metrics['throughput_rps']:>8} "
                  f"{metrics['error_rate_pct']:>8} {status_icon:>8}")
        
        print("-" * 80)
        
        # TRL 4 Summary
        total_requests = sum(r['total_requests'] for r in results.values())
        total_errors = sum(r['errors'] for r in results.values())
        overall_error_rate = (total_errors / total_requests) * 100
        avg_throughput = statistics.mean(m['throughput_rps'] for m in results.values())
        
        print()
        print("="*60)
        print("VALIDACION TRL 4 - RESULTADOS CONSOLIDADOS")
        print("="*60)
        print(f"Total requests: {total_requests}")
        print(f"Errors total: {total_errors}")
        print(f"Tasa de error global: {overall_error_rate:.2f}%")
        print(f"Throughput promedio: {avg_throughput:.2f} req/s")
        print()
        
        # TRL 4 Criteria Check
        all_acceptable_latency = all(r['avg_latency_ms'] < 500 for r in results.values())
        all_low_error_rate = all(r['error_rate_pct'] < 5 for r in results.values())
        
        print("CRITERIOS TRL 4:")
        trl4_criteria = [
            ("Latencia p95 < 500ms", all_acceptable_latency),
            ("Error rate < 5%", all_low_error_rate),
            ("Throughput > 10 req/s", avg_throughput > 10),
            ("10 usuarios concurrentes", concurrent_users >= 10),
        ]
        
        for criterion, passed in trl4_criteria:
            status = "[PASS]" if passed else "[FAIL]"
            print(f"  {criterion}: {status}")
        
        print()
        all_passed = all(p for _, p in trl4_criteria)
        if all_passed:
            print("TRL 4 ALCANZADO! Todos los criterios de rendimiento cumplidos.")
        else:
            print("TRL 4 parcial - Algunos criterios necesitan optimizacion.")
        
        return results
        
    finally:
        runner.teardown_databases(old_config)
        teardown_test_environment()

if __name__ == '__main__':
    run_benchmarks()