import logging
from datetime import time, datetime
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from ...models import AgentConfig, AgentSchedule

logger = logging.getLogger(__name__)

User = get_user_model()


class Command(BaseCommand):
    help = 'Ejecuta el agente FocusIA: evalúa estado y envía check-ins programados'

    def add_arguments(self, parser):
        parser.add_argument('--force-user', type=int, help='Ejecutar solo para un user_id específico')

    def handle(self, *args, **options):
        now = timezone.now()
        current_time = now.time()

        usuarios = User.objects.all()
        if options['force_user']:
            usuarios = usuarios.filter(id=options['force_user'])

        for user in usuarios:
            try:
                config = AgentConfig.objects.get(user=user)
            except AgentConfig.DoesNotExist:
                continue

            if not config.activo:
                continue

            # Respetar horario
            if current_time < config.horario_inicio or current_time > config.horario_fin:
                continue

            self._procesar_checkins(user, config, now)
            self._procesar_evaluacion(user, config)

    def _procesar_checkins(self, user, config, now):
        from ...services.agent_service import AgentService

        schedules = AgentSchedule.objects.filter(user=user, activo=True)
        service = AgentService(user)

        for schedule in schedules:
            if schedule.proxima_ejecucion and schedule.proxima_ejecucion > now:
                continue

            # Generar mensaje según tipo
            mensaje = service.generar_checkin(schedule.tipo)

            if mensaje:
                # Despacha por canales habilitados (push/email/whatsapp/in-app).
                from ...services.notification_dispatcher import notificar
                notificar(user, 'FocusIA', mensaje)

                # Registrar en conversación
                from ...models import AgentConversation
                AgentConversation.objects.create(
                    user=user, session_id='system_schedule',
                    rol='ASSISTANT', mensaje=mensaje,
                    metadata={'tipo_checkin': schedule.tipo},
                )

            # Actualizar próxima ejecución
            schedule.ultima_ejecucion = now
            # Reprogramar: +12h para CHECKIN_MANANA, +24h para otros
            if schedule.tipo == 'CHECKIN_MANANA':
                schedule.proxima_ejecucion = now + timezone.timedelta(hours=12)
            elif schedule.tipo == 'CHECKIN_TARDE':
                schedule.proxima_ejecucion = now + timezone.timedelta(hours=12)
            else:
                schedule.proxima_ejecucion = now + timezone.timedelta(hours=24)
            schedule.save(update_fields=['ultima_ejecucion', 'proxima_ejecucion'])

    def _procesar_evaluacion(self, user, config):
        from ...services.agent_service import AgentService

        service = AgentService(user)
        resultado = service.evaluar_estado()

        if resultado['necesita_intervencion'] and resultado.get('primera_del_dia'):
            alerta = resultado['alertas'][0]['mensaje']
            from ...services.notification_dispatcher import notificar
            notificar(user, '🤖 FocusIA', alerta, critica=True)

        logger.info(f"Agent evaluated for user {user.id}: {resultado['progreso']['porcentaje']}%")
