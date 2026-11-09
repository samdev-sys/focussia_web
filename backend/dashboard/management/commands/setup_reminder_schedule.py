"""Registra en django-q2 las tareas periódicas del Sistema Proactivo.

Lo ejecuta el worker/stack al levantar. Es idempotente: si la tarea ya está
registrada actualiza su cadencia.

Ojo: django-q2 evalúa `args`/`kwargs` con ast.literal_eval, así que tienen que
ser literales de Python válidos (p. ej. args="('cmd',)", kwargs="{}"). Un valor
suelto/malformado hace que el scheduler falle con "Could not create task".
"""
from django.core.management.base import BaseCommand
from django_q.models import Schedule

FUNC = 'django.core.management.call_command'

# (nombre, comando, tipo de cadencia, minutos, expresión cron)
#   MINUTES / HOURLY → cada N minutos / cada hora.
#   CRON             → expresión crontab (minuto hora día mes día_semana) en la
#                      hora local del proyecto; necesita el paquete `croniter`.
TAREAS = (
    ('Recordatorios genéricos', 'check_reminders', Schedule.MINUTES, 1, None),
    ('Avisos de dosis de suplementos', 'avisar_dosis_pendientes',
     Schedule.MINUTES, 15, None),
    ('Recordatorio de Hora de Oro', 'recordar_hora_de_oro',
     Schedule.HOURLY, None, None),
    # Doc 22 §III: activación proactiva de cumpleaños a las 09:00 del día en
    # que se alcanza la anticipación configurada por el usuario.
    ('Recordatorios de cumpleaños', 'recordar_cumpleanos',
     Schedule.CRON, None, '0 9 * * *'),
    # Doc 27 §4: los reportes se publican a las 21:00 y se actualizan hasta las
    # 00:00; cada corrida decide internamente si hoy cierra el período (domingo /
    # último día del mes / 31 dic). Tres pasadas por noche, igual que el
    # calendario de Celery al que reemplazan.
    ('Reportes FocusIA', 'generate_reports', Schedule.CRON, None, '0 21-23 * * *'),
    # Doc 27 §5.1: recordatorio nocturno de acciones sin confirmar.
    ('Acciones pendientes del día', 'remind_pending_actions',
     Schedule.CRON, None, '0 20 * * *'),
    # Recordatorios proactivos de bloques próximos
    ('Recordatorios de bloques próximos', 'remind_upcoming_blocks',
     Schedule.MINUTES, 10, None),
    # Doc 27 §2.7: los avisos postergados (Focus, fuera de horario) se revisan
    # y entregan en cuanto se abre una franja permitida, sin ráfagas.
    ('Avisos postergados', 'flush_notificaciones', Schedule.MINUTES, 5, None),
    ('Agente FocusIA', 'run_agent', Schedule.MINUTES, 60, None),
    ('Motor de decision', 'run_decision_engine', Schedule.CRON, None, '0 6 * * *'),
)


class Command(BaseCommand):
    help = 'Registra las tareas programadas de recordatorios en django-q2'

    def _literal_valido(self, value):
        import ast
        if value in (None, ''):
            return False
        try:
            ast.literal_eval(value)
            return True
        except Exception:
            return False

    def handle(self, *args, **options):
        fallidas = []
        comandos = {comando for _, comando, *_ in TAREAS}

        # Limpia filas antiguas/malformadas de nuestras tareas: si quedaron con
        # args inválidos (p. ej. un nombre suelto), el scheduler de django-q2
        # falla en TODAS las pasadas al hacer ast.literal_eval(s.args).
        qs = Schedule.objects.filter(func=FUNC)
        for s in qs:
            args_raw = (s.args or '').strip()
            kwargs_raw = (s.kwargs or '').strip()
            es_nuestra = (s.name in {n for n, *_ in TAREAS}) or any(c in args_raw for c in comandos)
            if es_nuestra and not self._literal_valido(args_raw):
                s.delete()
                self.stdout.write(self.style.WARNING(
                    f'Eliminada tarea con args inválidos: {s.name!r} args={s.args!r}'
                ))
                continue
            if es_nuestra and kwargs_raw and not self._literal_valido(kwargs_raw):
                s.kwargs = '{}'
                s.save(update_fields=['kwargs'])
                self.stdout.write(self.style.WARNING(
                    f'Normalizado kwargs inválido: {s.name!r}'
                ))

        for nombre, comando, tipo, minutos, cron in TAREAS:
            if cron:
                cadencia = f'cron «{cron}»'
            elif minutos:
                cadencia = f'cada {minutos} min'
            else:
                cadencia = 'cada hora'
            # Un fallo en una tarea no debe impedir registrar las demás: sin
            # este try/except, un entorno sin `croniter` abortaba el bucle y
            # dejaba fuera también las tareas de intervalo posteriores.
            args_literal = f"('{comando}',)"
            try:
                # Borra duplicados gestionados por nombre/función antes de upsert
                # (p. ej. filas previas con args mal formados no halladas por lookup).
                Schedule.objects.filter(func=FUNC, name=nombre).exclude(args=args_literal).delete()
                _, created = Schedule.objects.update_or_create(
                    func=FUNC,
                    args=args_literal,
                    defaults={
                        'name': nombre,
                        'schedule_type': tipo,
                        'minutes': minutos,
                        'cron': cron,
                        'repeats': -1,
                        'kwargs': '{}',
                    },
                )
            except Exception as exc:
                fallidas.append(nombre)
                self.stderr.write(self.style.ERROR(
                    f'{nombre}: FALLÓ ({cadencia}) -> {exc}'
                ))
                continue
            estado = 'programada' if created else 'actualizada'
            self.stdout.write(self.style.SUCCESS(
                f'{nombre}: {estado} ({cadencia})'
            ))

        if fallidas:
            self.stderr.write(self.style.WARNING(
                'Tareas que no se pudieron registrar: ' + ', '.join(fallidas)
            ))
