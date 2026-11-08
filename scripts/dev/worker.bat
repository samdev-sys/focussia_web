@echo off
rem Focusia · Worker django-q2 — corre los crons del sistema proactivo:
rem   - "Reportes FocusIA" (generate_reports, cron 0 21-23 * * *) — doc 27 §4
rem   - Avisos de suplementos (cada 15 min), Hora de Oro (cada hora),
rem     cumpleaños (09:00), bloques próximos (cada 10 min),
rem     avisos postergados (cada 5 min), agente FocusIA (cada 60 min).
rem Registra las tareas (idempotente) y luego procesa la cola con el Cluster.
title Focusia - Worker (django-q2, crons)
cd /d "%~dp0..\..\backend" || goto :error

echo [WORKER] Registrando tareas programadas...
"%~dp0..\..\.venv\Scripts\python.exe" manage.py setup_reminder_schedule

echo [WORKER] Iniciando cluster django-q2 (cierra esta ventana para detenerlo)...
"%~dp0..\..\.venv\Scripts\python.exe" manage.py start_reminder_worker
goto :eof

:error
echo [ERROR] No se pudo entrar al directorio backend.
pause
