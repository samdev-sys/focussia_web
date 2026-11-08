# -*- coding: utf-8 -*-
"""Entry point unico para Railway.

Ejecuta en orden, cada paso como subproceso con timeout:
  1. sync_migrations_state --apply  (repara el registro si el esquema va adelantado)
  2. migrate --noinput
  3. collectstatic --noinput
y al final reemplaza su propio proceso con Gunicorn (exec) para que el PID que
Railway vigila sea exactamente el servidor HTTP.

Start Command en Railway:  python start.py
"""
import os
import subprocess
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
STEPTIMEOUT = 900  # 15 min por paso de gestion


def log(msg):
    print(f'[start] {msg}', flush=True)


def run_step(label, args):
    log(f'==> {label} ...')
    try:
        proc = subprocess.run(
            [sys.executable, 'manage.py', *args],
            cwd=BASE,
            timeout=STEPTIMEOUT,
        )
    except subprocess.TimeoutExpired:
        log(f'{label}: TIMEOUT tras {STEPTIMEOUT}s - abortando')
        sys.exit(1)
    if proc.returncode != 0:
        # Django ya imprimo la traza; nos limitamos a abortar.
        log(f'{label}: fallo con codigo {proc.returncode} - abortando')
        sys.exit(proc.returncode or 1)
    log(f'==> {label} OK')


def main():
    run_step('sync_migrations_state', ['sync_migrations_state', '--apply'])
    run_step('migrate', ['migrate', '--noinput'])
    run_step('collectstatic', ['collectstatic', '--noinput'])

    port = os.environ.get('PORT', '8000')
    cmd = [
        'gunicorn', 'focusia_api.wsgi:application',
        '--bind', f'0.0.0.0:{port}',
        '--workers', os.environ.get('GUNICORN_WORKERS', '2'),
        '--threads', os.environ.get('GUNICORN_THREADS', '4'),
        '--timeout', os.environ.get('GUNICORN_TIMEOUT', '120'),
        '--access-logfile', '-',
        '--error-logfile', '-',
    ]
    log('==> gunicorn: ' + ' '.join(cmd))
    os.execvp(cmd[0], cmd)


if __name__ == '__main__':
    main()
