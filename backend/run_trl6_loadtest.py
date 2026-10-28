"""
Test de carga TRL 6 - Demostración en entorno relevante (producción)
Simula 100+ usuarios concurrentes sobre HTTP real (gunicorn + PostgreSQL)
para validar los criterios de rendimiento TRL 6.

Uso:
    PRODUCTION_URL=http://localhost:8000 python run_trl6_loadtest.py

Requiere:
    - Stack de producción levantado (docker-compose.prod.yml)
    - Archivo de tokens TRL6 (usuarios + JWT) en el path indicado
"""

import os
import json
import time
import statistics
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests

PRODUCTION_URL = os.getenv('PRODUCTION_URL', 'http://localhost:8000')
API_BASE = f"{PRODUCTION_URL}/api/"
TOKENS_FILE = os.getenv('TRL6_TOKENS_FILE', os.path.join(
    os.environ.get('TEMP', '/tmp'), 'opencode', 'trl6_tokens.json'
))
CONCURRENT_USERS = int(os.getenv('TRL6_CONCURRENT_USERS', '100'))
REQUESTS_PER_USER = int(os.getenv('TRL6_REQUESTS_PER_USER', '10'))

ENDPOINTS = [
    '/api/mision-hoy/',
    '/api/kanban-tasks/',
    '/api/keep-nota/',
    '/api/recordatorios/',
    '/api/rueda-vida/',
]


def load_tokens():
    with open(TOKENS_FILE) as f:
        data = json.load(f)
    return list(data.values())


def run_trl6_load_test():
    print("=" * 64)
    print("TEST DE CARGA TRL 6 - PRODUCCION (ENTORNO RELEVANTE)")
    print("=" * 64)
    print(f"URL: {PRODUCTION_URL}")
    print(f"Usuarios concurrentes: {CONCURRENT_USERS}")
    print(f"Requests por usuario: {REQUESTS_PER_USER}")

    tokens = load_tokens()
    print(f"Tokens JWT cargados: {len(tokens)}")

    total_requests = CONCURRENT_USERS * len(ENDPOINTS) * REQUESTS_PER_USER // len(ENDPOINTS)
    print(f"Requests totales: {total_requests}")
    print()

    results = {e: {'times': [], 'errors': 0} for e in ENDPOINTS}
    lock = threading.Lock()
    session = requests.Session()

    def make_request(user_idx, endpoint):
        token = tokens[user_idx % len(tokens)]
        headers = {'Authorization': f'Bearer {token}'}
        try:
            start = time.time()
            response = session.get(f"{PRODUCTION_URL}{endpoint}", headers=headers, timeout=30)
            elapsed = (time.time() - start) * 1000
            with lock:
                results[endpoint]['times'].append(elapsed)
                if response.status_code >= 400:
                    results[endpoint]['errors'] += 1
        except Exception:
            with lock:
                results[endpoint]['errors'] += 1

    wall_start = time.time()

    with ThreadPoolExecutor(max_workers=CONCURRENT_USERS) as executor:
        futures = []
        for i in range(total_requests):
            endpoint = ENDPOINTS[i % len(ENDPOINTS)]
            futures.append(executor.submit(make_request, i, endpoint))
        for future in as_completed(futures):
            future.result()

    wall_elapsed = time.time() - wall_start

    print("RESULTADOS DEL TEST DE CARGA TRL 6")
    print("-" * 70)
    print(f"{'Endpoint':<25} {'Avg(ms)':>8} {'P95(ms)':>9} {'Max(ms)':>8} {'Reqs':>6} {'Err%':>6}")
    print("-" * 70)

    all_times = []
    total_errors = 0
    total_reqs = 0

    for endpoint, data in results.items():
        times = data['times']
        errors = data['errors']
        total_errors += errors
        total_reqs += len(times)
        all_times.extend(times)
        if times:
            avg = statistics.mean(times)
            p95 = sorted(times)[int(len(times) * 0.95)]
            mx = max(times)
            err_pct = (errors / len(times)) * 100
            print(f"{endpoint:<25} {avg:>8.2f} {p95:>9.2f} {mx:>8.2f} {len(times):>6} {err_pct:>6.2f}")

    print("-" * 70)

    if all_times:
        overall_avg = statistics.mean(all_times)
        overall_p95 = sorted(all_times)[int(len(all_times) * 0.95)]
        overall_p99 = sorted(all_times)[int(len(all_times) * 0.99)]
        overall_max = max(all_times)
    else:
        overall_avg = overall_p95 = overall_p99 = overall_max = 0

    throughput = total_reqs / wall_elapsed if wall_elapsed > 0 else 0
    error_rate = (total_errors / total_reqs * 100) if total_reqs else 100

    print()
    print("=" * 64)
    print("VALIDACION TRL 6 - CRITERIOS DE RENDIMIENTO")
    print("=" * 64)
    print(f"Total Requests: {total_reqs}")
    print(f"Total Errors: {total_errors}")
    print(f"Latencia Avg: {overall_avg:.2f}ms")
    print(f"Latencia P95: {overall_p95:.2f}ms")
    print(f"Latencia P99: {overall_p99:.2f}ms")
    print(f"Latencia Max: {overall_max:.2f}ms")
    print(f"Throughput: {throughput:.2f} req/s")
    print(f"Error rate: {error_rate:.2f}%")
    print(f"Usuarios concurrentes: {CONCURRENT_USERS}")
    print(f"Duración wall-clock: {wall_elapsed:.2f}s")

    criteria = [
        ("Latencia P95 < 200ms", overall_p95 < 200),
        ("Throughput > 50 rps", throughput > 50),
        ("Error rate < 1%", error_rate < 1.0),
        ("100+ usuarios concurrentes", CONCURRENT_USERS >= 100),
    ]

    print()
    for criterion, passed in criteria:
        status = "[PASS]" if passed else "[FAIL]"
        print(f"  {criterion}: {status}")

    all_passed = all(p for _, p in criteria)
    print()
    if all_passed:
        print("TRL 6 CERTIFICADO - Demostración en entorno relevante completada")
    else:
        print("TRL 6 - Necesita optimización")
    print("=" * 64)

    return {
        'avg_ms': round(overall_avg, 2),
        'p95_ms': round(overall_p95, 2),
        'p99_ms': round(overall_p99, 2),
        'max_ms': round(overall_max, 2),
        'rps': round(throughput, 2),
        'error_pct': round(error_rate, 2),
        'concurrent_users': CONCURRENT_USERS,
    }


if __name__ == '__main__':
    run_trl6_load_test()
