import json
import os
import secrets
import logging
import asyncio
import urllib.request
import urllib.error
from datetime import timedelta, datetime, time, date
from django.conf import settings
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from django.db import IntegrityError, models, transaction
from django.http import Http404, HttpResponse
from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.dateparse import parse_date, parse_time
from .models import (
    User, RuedaVida, TimeBlock, KanbanTask, Recordatorio, ObjetivoSemana,
    KeepNota, MisionHoy, CategoriaRueda, RegistroRueda, MatrixItem, Factura,
    Workspace, WorkspaceMember, Invitation, Delegation, Notification,
    MetaAnual, GranMetaAnual, AnnualGoalConversationTurn, ObjetivoMensual, PropuestaIA, ConfiguracionUsuario, MatrizEisenhower, Activacion,
    InteraccionUsuario, DiagnosticoRueda, AccionSugerida, FocusArea, KanbanAction,
    AccionKanban, SubaccionKanban, EventoAccion, HistorialMovimiento, ObjetivoSemanal, MonthlyPlan, MonthlyGoal,
    TribuTemaSemana, TribuCompromiso,
    WeeklyPlan, Action, ActionDelegation, AgentConversation, AgentSchedule, AgentConfig,
    PushSubscription,
    FocusiaReport, ReportDataSource, Avatar, OnboardingProfile, InicioState, InicioEventLog,
    GuidedTourBlock, LearningCategory, AccompanimentPreferences,
    NotificationPreference, ScheduleException, AccountChangeLog, InicioPrivacyPreferences,
    ProgramMonth, MonthlyTraining, ProgramDay, UserProgramProgress, DailyPhraseViewLog,
    UserTrainingProgress,
    CoachingEntry, Juego,
    CuentaColumna, CuentaRegistro, CuentaValor, Suplemento, SuplementoToma,
    HoraOroExperiencia, HoraOroAjustes,
    FocusSession,
)
from .serializers import (
    UserSerializer, UserDetailSerializer, RuedaVidaSerializer, TimeBlockSerializer,
    KanbanTaskSerializer, RecordatorioSerializer, ObjetivoSemanaSerializer, SuplementoSerializer, SuplementoTomaSerializer,
    HoraOroExperienciaSerializer, HoraOroAjustesSerializer, FocusSessionSerializer,
    KeepNotaSerializer, MisionHoySerializer, CategoriaRuedaSerializer,
    RegistroRuedaSerializer, GuardarRuedaSerializer, MatrixItemSerializer,
    FacturaSerializer, CuentaColumnaSerializer, CuentaRegistroSerializer, WorkspaceSerializer, WorkspaceDetailSerializer,
    WorkspaceMemberSerializer, InvitationSerializer, DelegationSerializer,
    NotificationSerializer, AiMissionSerializer,
    MetaAnualSerializer, GranMetaAnualSerializer, GranMetaAnualGenerarSerializer,
    GranMetaAnualAnswerSerializer, GranMetaAnualEligibilitySerializer,
    AnnualGoalConversationTurnSerializer,
    ObjetivoMensualSerializer, PropuestaIASerializer,
    ConfiguracionUsuarioSerializer, MatrizEisenhowerSerializer, ActivacionSerializer, ContextoAnalisisInputSerializer,
    InteraccionUsuarioSerializer, GenerarDiagnosticoInputSerializer,
    GenerarAccionesInputSerializer, EnviarAccionKanbanSerializer,
    DiagnosticoRuedaSerializer, AccionSugeridaSerializer, FocusAreaSerializer,
    MonthlyPlanSerializer, MonthlyGoalSerializer, MonthlyGenerateSerializer,
    KanbanActionSerializer, KanbanActionClassifySerializer,
    AccionKanbanSerializer, AccionKanbanCreateSerializer, ClasificarAccionSerializer,
    SubaccionKanbanSerializer,
    TribuTemaSemanaSerializer, TribuCompromisoSerializer, JuegoSerializer,
    HistorialMovimientoSerializer, ObjetivoSemanalSerializer,
    WeeklyPlanSerializer, WeeklyPlanListSerializer, ActionSerializer,
    ActionMoveSerializer, ActionRepeatSerializer, ActionDelegateSerializer,
    ActionDelegationSerializer,
    AgentConversationSerializer, AgentScheduleSerializer, AgentConfigSerializer,
    FocusiaReportSerializer, FocusiaReportActionSerializer,
    CoachingEntrySerializer,
    OnboardingSerializer,
    AvatarSerializer, OnboardingProfileSerializer,
    SelectAvatarSerializer, IntensitySerializer, ActivationsSerializer,
    ScheduleSerializer, ToneSerializer,
    InicioStateSerializer, InicioEventLogSerializer,
    LearningCategorySerializer, GuidedTourBlockSerializer,
    AccompanimentPreferencesSerializer, NotificationPreferenceSerializer,
    ScheduleExceptionSerializer, AccountChangeLogSerializer,
    ChangePasswordSerializer, PrivacyPermissionSerializer, ConfigAvatarSerializer,
    InicioPrivacyPreferencesSerializer,
    ProgramMonthSerializer, ProgramDaySerializer, MonthlyTrainingSerializer,
    UserTrainingProgressSerializer,
    UserProgramProgressSerializer,
)
from .services.program_service import (
    get_current_program_day, get_program_day_data, get_or_log_phrase_view,
    get_progress_summary, get_or_create_progress,
)
from .services.asignaciones import filtrar_queryset, ids_asignados
from .services.agenda_eventos import registrar_evento
from .engine import DecisionEngine
from .engine.phase4_generator import generar_payload_coach

logger = logging.getLogger('focusia.security')

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.action in ['retrieve', 'update', 'partial_update', 'me']:
            return UserDetailSerializer
        return UserSerializer

    def perform_create(self, serializer):
        user = serializer.save()
        OnboardingProfile.objects.get_or_create(user=user, defaults={'status': 'cuenta_creada'})
        ConfiguracionUsuario.objects.get_or_create(user=user)

    def list(self, request, *args, **kwargs):
        return Response(
            {'detail': 'Listado no disponible. Usa /me/ para tus datos.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )

    @action(detail=False, methods=['get', 'patch', 'delete'])
    def me(self, request):
        if request.method == 'GET':
            serializer = UserDetailSerializer(request.user)
            return Response(serializer.data)
        elif request.method == 'PATCH':
            serializer = UserDetailSerializer(request.user, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        elif request.method == 'DELETE':
            request.user.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get', 'post'])
    def onboarding(self, request):
        config, _ = ConfiguracionUsuario.objects.get_or_create(user=request.user)
        if request.method == 'GET':
            return Response({
                'onboarding_status': 'COMPLETADO' if config.onboarding_completado else 'INICIADO',
                'onboarding_completado': config.onboarding_completado,
                'user_id': request.user.id,
                'full_name': request.user.get_full_name(),
                'avatar_id': config.avatar_index,
                'intensity_level': config.nivel_exigencia,
                'allowed_channels': config.canales_interaccion,
                'avatar_tone': config.estilo_comunicacion,
            })
        serializer = OnboardingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return Response({'status': 'ok', 'onboarding_completado': True})

class IsMineOrReadOnly:
    def get_object(self):
        obj = super().get_object()
        if hasattr(obj, 'user') and obj.user != self.request.user:
            raise Http404
        if hasattr(obj, 'delegator') and obj.delegator != self.request.user and obj.delegate != self.request.user:
            raise Http404
        return obj

class BaseUserViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class RuedaVidaViewSet(BaseUserViewSet):
    queryset = RuedaVida.objects.all()
    serializer_class = RuedaVidaSerializer

class TimeBlockViewSet(BaseUserViewSet):
    queryset = TimeBlock.objects.all()
    serializer_class = TimeBlockSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        fecha = serializer.validated_data.get('fecha')
        hora = serializer.validated_data.get('hora')
        if fecha and hora:
            instance, created = TimeBlock.objects.update_or_create(
                user=request.user,
                fecha=fecha,
                hora=hora,
                defaults={
                    'tarea': serializer.validated_data.get('tarea', ''),
                    'estado': serializer.validated_data.get('estado', 'pending'),
                }
            )
            output_serializer = self.get_serializer(instance)
            return Response(output_serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        return super().create(request, *args, **kwargs)

class KanbanTaskViewSet(BaseUserViewSet):
    queryset = KanbanTask.objects.all()
    serializer_class = KanbanTaskSerializer

    def perform_create(self, serializer):
        super().perform_create(serializer)
        # Puente tablero legacy → bandeja visible: lo que entra al backlog del
        # tablero también aterriza en AccionKanban (KANBAN_ACTIVO) para que el
        # agente y la bandeja muestren lo mismo. Idempotente por texto.
        task = serializer.instance
        if (task.columna or 'Backlog') in ('Backlog', 'Agenda', 'Por hacer'):
            if not AccionKanban.objects.filter(
                user=task.user,
                estado_actual=AccionKanban.EstadoChoices.KANBAN_ACTIVO,
                texto_accion=task.titulo,
            ).exists():
                accion = AccionKanban.objects.create(
                    user=task.user,
                    texto_accion=task.titulo,
                    origen=AccionKanban.OrigenChoices.OTRO,
                    estado_actual=AccionKanban.EstadoChoices.KANBAN_ACTIVO,
                    fecha_seleccionada=task.fecha_hora.date() if task.fecha_hora else None,
                )
                HistorialMovimiento.objects.create(
                    accion=accion,
                    estado_anterior='TABLERO_LEGACY',
                    estado_nuevo=AccionKanban.EstadoChoices.KANBAN_ACTIVO,
                )


class KanbanActionViewSet(BaseUserViewSet):
    queryset = KanbanAction.objects.all()
    serializer_class = KanbanActionSerializer

    @action(detail=False, methods=['get'], url_path='active')
    def active(self, request):
        qs = self.get_queryset().filter(
            classification_status=KanbanAction.ClassificationStatus.PENDIENTE
        )
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='add')
    def add_action(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        action = serializer.save(
            user=request.user,
            source=KanbanAction.Source.USER_INPUT,
            classification_status=KanbanAction.ClassificationStatus.PENDIENTE,
        )
        return Response(
            KanbanActionSerializer(action).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=['patch'], url_path=r'classify/(?P<action_id>[^/.]+)')
    def classify(self, request, action_id=None):
        try:
            action = KanbanAction.objects.get(id=action_id, user=request.user)
        except KanbanAction.DoesNotExist:
            return Response(
                {'detail': 'Acción no encontrada'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if action.classification_status != KanbanAction.ClassificationStatus.PENDIENTE:
            return Response(
                {'detail': 'Esta acción ya fue clasificada'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        classify_serializer = KanbanActionClassifySerializer(data=request.data)
        classify_serializer.is_valid(raise_exception=True)

        decision = classify_serializer.validated_data['decision']
        new_status = KanbanActionClassifySerializer.ACTION_MAP[decision]

        action.classification_status = new_status
        if decision == 'P':
            action.scheduled_date = classify_serializer.validated_data.get('scheduled_date')
        action.save()

        return Response(KanbanActionSerializer(action).data)

    @action(detail=False, methods=['patch'], url_path=r'pin/(?P<action_id>[^/.]+)')
    def pin(self, request, action_id=None):
        try:
            action = KanbanAction.objects.get(id=action_id, user=request.user)
        except KanbanAction.DoesNotExist:
            return Response(
                {'detail': 'Acción no encontrada'},
                status=status.HTTP_404_NOT_FOUND,
            )
        action.pinned = not action.pinned
        action.save()
        return Response(KanbanActionSerializer(action).data)

    # V2: detail routes for frontend compatibility
    @action(detail=True, methods=['patch'], url_path='classify')
    def classify_detail(self, request, pk=None):
        return self.classify(request, action_id=pk)

    @action(detail=True, methods=['post'], url_path='pin')
    def pin_detail(self, request, pk=None):
        return self.pin(request, action_id=pk)

class RecordatorioViewSet(BaseUserViewSet):
    queryset = Recordatorio.objects.all()
    serializer_class = RecordatorioSerializer

    @action(detail=False, methods=['get'])
    def due(self, request):
        now = timezone.now()
        due = self.get_queryset().filter(
            activo=True,
            tomado=False,
            fecha_hora__lte=now + timedelta(minutes=1),
            fecha_hora__gte=now - timedelta(minutes=2),
        )
        serializer = self.get_serializer(due, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def pendientes(self, request):
        qs = self.get_queryset().filter(activo=True, tomado=False)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def marcar_tomado(self, request, pk=None):
        recordatorio = self.get_object()
        recordatorio.tomado = True
        recordatorio.activo = False
        recordatorio.save()
        return Response(self.get_serializer(recordatorio).data)

class SuplementoViewSet(BaseUserViewSet):
    """Módulo Suplementos y Medicamentos (Doc 21).

    El usuario define nombre, tipo, frecuencia, hora de la primera toma y
    (en medicamentos) la duración; el backend calcula automáticamente todas
    las tomas y las incorpora a la programación interna.
    """
    queryset = Suplemento.objects.all()
    serializer_class = SuplementoSerializer
    HORIZONTE_DIAS = 30

    # ── Programación ──────────────────────────────────────────────
    def _programadas(self, suplemento, desde, hasta):
        tz = timezone.get_current_timezone()
        inicio = timezone.make_aware(
            datetime.combine(suplemento.fecha_inicio, suplemento.hora_primera), tz
        )
        paso = timedelta(hours=suplemento.frecuencia_horas)
        if desde > inicio:
            saltos = int((desde - inicio).total_seconds() // paso.total_seconds())
            cursor = inicio + paso * max(saltos, 0)
        else:
            cursor = inicio
        tomas = []
        while cursor <= hasta:
            tomas.append(cursor)
            cursor += paso
        return tomas

    def _asegurar_tomas(self, suplemento):
        """Crea las tomas que falten hasta el horizonte (o fin del tratamiento)."""
        ahora = timezone.now()
        tz = timezone.get_current_timezone()
        hasta = ahora + timedelta(days=self.HORIZONTE_DIAS)
        if suplemento.tipo == 'Medicamento' and suplemento.duracion_dias:
            ultimo = suplemento.fecha_inicio + timedelta(days=suplemento.duracion_dias - 1)
            fin = timezone.make_aware(datetime.combine(ultimo, time(23, 59)), tz)
            if fin < hasta:
                hasta = fin
        desde = timezone.make_aware(
            datetime.combine(suplemento.fecha_inicio, time(0, 0)), tz
        )
        existentes = set(suplemento.tomas.values_list('programada', flat=True))
        nuevas = [
            SuplementoToma(suplemento=suplemento, programada=p)
            for p in self._programadas(suplemento, desde, hasta)
            if p not in existentes
        ]
        if nuevas:
            SuplementoToma.objects.bulk_create(nuevas, ignore_conflicts=True)

    def _frecuencia_label(self, horas):
        if horas == 24:
            return 'Cada 24 horas (1 al día)'
        if horas == 12:
            return 'Cada 12 horas'
        return f'Cada {horas} horas'

    def _detalle(self, suplemento):
        """Detalle de la tarjeta: «1 cápsula al día» o «Cada N horas» (mockup)."""
        if suplemento.frecuencia_horas == 24:
            unidad = (suplemento.presentacion or 'Unidad').lower()
            return f'1 {unidad} al día'
        return self._frecuencia_label(suplemento.frecuencia_horas)

    def _tarjeta(self, suplemento):
        """Datos de la tarjeta de seguimiento (Doc 21 §II.2 y §II.3)."""
        self._asegurar_tomas(suplemento)
        ahora = timezone.now()
        hoy = timezone.localdate()
        inicio_dia = timezone.make_aware(datetime.combine(hoy, time(0, 0)))
        fin_dia = inicio_dia + timedelta(days=1)

        tomas_hoy = suplemento.tomas.filter(
            programada__gte=inicio_dia, programada__lt=fin_dia
        ).order_by('programada')
        pendiente = suplemento.tomas.filter(tomado=False, programada__lte=ahora).order_by('programada').first()
        restante_hoy = tomas_hoy.filter(tomado=False).first()

        # §II.3 — Estado visual de la tarjeta.
        if pendiente:
            estado, referencia = 'pendiente', pendiente.programada
            retraso = int((ahora - pendiente.programada).total_seconds() // 60)
        elif restante_hoy and (restante_hoy.programada - ahora) <= timedelta(hours=2):
            # «Próxima toma»: la dosis programada está próxima a su horario.
            estado, referencia, retraso = 'proxima', restante_hoy.programada, 0
        else:
            # «Al día»: todas las tomas registradas y la siguiente aún no se acerca.
            proxima = suplemento.tomas.filter(tomado=False, programada__gt=ahora).order_by('programada').first()
            estado, referencia, retraso = 'al_dia', (proxima.programada if proxima else None), 0

        dia_ref = None
        if referencia:
            dias = (timezone.localtime(referencia).date() - hoy).days
            dia_ref = 'hoy' if dias <= 0 else ('mañana' if dias == 1 else 'otro')

        dia_actual = dias_totales = None
        finalizado = False
        if suplemento.tipo == 'Medicamento' and suplemento.duracion_dias:
            dias_totales = suplemento.duracion_dias
            dia_actual = (hoy - suplemento.fecha_inicio).days + 1
            finalizado = dia_actual > dias_totales
            dia_actual = min(max(dia_actual, 1), dias_totales)

        return {
            'id': suplemento.id,
            'nombre': suplemento.nombre,
            'tipo': suplemento.tipo,
            'presentacion': suplemento.presentacion,
            'frecuencia_horas': suplemento.frecuencia_horas,
            'frecuencia_label': self._frecuencia_label(suplemento.frecuencia_horas),
            'detalle': self._detalle(suplemento),
            'hora_primera': suplemento.hora_primera.strftime('%H:%M'),
            'duracion_dias': suplemento.duracion_dias,
            'dia_actual': dia_actual,
            'dias_totales': dias_totales,
            'finalizado': finalizado,
            'activo': suplemento.activo,
            'estado': estado,
            'retraso_min': retraso,
            'proxima_toma': referencia.isoformat() if referencia else None,
            'proxima_toma_hora': timezone.localtime(referencia).strftime('%H:%M') if referencia else None,
            'proxima_dia': dia_ref,
            'tomas_hoy': [
                {
                    'id': t.id,
                    'hora': timezone.localtime(t.programada).strftime('%H:%M'),
                    'tomado': t.tomado,
                }
                for t in tomas_hoy
            ],
            'total_tomado': suplemento.tomas.filter(tomado=True).count(),
        }

    # ── Endpoints ─────────────────────────────────────────────────
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        suplemento = serializer.save(user=request.user, fecha_inicio=timezone.localdate())
        self._asegurar_tomas(suplemento)
        return Response(self._tarjeta(suplemento), status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def tablero(self, request):
        activos, historial = [], []
        for suplemento in self.get_queryset():
            tarjeta = self._tarjeta(suplemento)
            if tarjeta['finalizado'] or not suplemento.activo:
                if tarjeta['finalizado'] and suplemento.activo:
                    suplemento.activo = False
                    suplemento.save(update_fields=['activo'])
                tarjeta['estado'] = 'finalizado'
                historial.append(tarjeta)
            else:
                activos.append(tarjeta)
        return Response({'activos': activos, 'historial': historial})

    @action(detail=True, methods=['post'])
    def marcar_tomado(self, request, pk=None):
        suplemento = self.get_object()
        self._asegurar_tomas(suplemento)
        ahora = timezone.now()
        toma = suplemento.tomas.filter(tomado=False, programada__lte=ahora).order_by('programada').first()
        if toma is None:
            toma = suplemento.tomas.filter(tomado=False).order_by('programada').first()
        if toma is None:
            return Response({'detail': 'No hay tomas pendientes.'}, status=status.HTTP_400_BAD_REQUEST)
        toma.tomado = True
        toma.tomado_en = ahora
        toma.save(update_fields=['tomado', 'tomado_en'])
        return Response(self._tarjeta(suplemento))

    @action(detail=True, methods=['post'])
    def eliminar(self, request, pk=None):
        suplemento = self.get_object()
        suplemento.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class FocusSessionViewSet(BaseUserViewSet):
    """Doc 23 · Modo Focus: ciclo de vida de una sesión de enfoque.

    Reglas del documento:
    · Solo una herramienta activa a la vez → `iniciar` responde 409 con la
      sesión en curso; con `forzar=true` la finaliza (cancelada) y abre la
      nueva.
    · El registro automático alimenta Reportes y estadísticas: al finalizar
      se cierra la sesión con su estado y los minutos de enfoque efectivos.
    · Las sesiones pertenecen al dispositivo donde se iniciaron; aquí solo
      se lleva la cuenta única del usuario.
    """
    queryset = FocusSession.objects.all()
    serializer_class = FocusSessionSerializer
    http_method_names = ['get', 'post']
    MAX_MINUTOS = 12 * 60

    @action(detail=False, methods=['get'])
    def activa(self, request):
        sesion = self.get_queryset().filter(estado='activa').first()
        if not sesion:
            return Response({'activa': False})
        return Response({'activa': True, 'sesion': self.get_serializer(sesion).data})

    @action(detail=False, methods=['post'])
    def iniciar(self, request):
        herramienta = (request.data.get('herramienta') or '').strip().lower()
        if herramienta not in dict(FocusSession.HERRAMIENTAS):
            return Response({'detalle': 'Herramienta de enfoque no reconocida.'},
                            status=status.HTTP_400_BAD_REQUEST)
        actual = self.get_queryset().filter(estado='activa').first()
        forzar = str(request.data.get('forzar', '')).lower() in ('true', '1', 'si', 'sí')
        if actual and not forzar:
            return Response(
                {
                    'detalle': 'Ya existe una sesión de enfoque en ejecución.',
                    'sesion': self.get_serializer(actual).data,
                },
                status=status.HTTP_409_CONFLICT,
            )
        if actual:
            actual.estado = 'cancelada'
            actual.ended_at = timezone.now()
            actual.focused_minutes = self._minutos_reales(actual)
            actual.save(update_fields=['estado', 'ended_at', 'focused_minutes'])
        config = request.data.get('config') if isinstance(request.data.get('config'), dict) else {}
        planned = self._duracion_plan(config)
        sesion = FocusSession.objects.create(
            user=request.user,
            herramienta=herramienta,
            config=config,
            planned_minutes=planned,
            origin=(request.data.get('origin') or 'dashboard')[:40],
        )
        return Response(self.get_serializer(sesion).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def finalizar(self, request, pk=None):
        sesion = self.get_object()
        if sesion.estado == 'activa':
            completada = str(request.data.get('completada', '')).lower() in ('true', '1', 'si', 'sí')
            sesion.estado = 'completada' if completada else 'cancelada'
            sesion.ended_at = timezone.now()
            minutos = request.data.get('minutos_enfocado')
            if minutos is None:
                minutos = self._minutos_reales(sesion)
            try:
                minutos = max(0, min(int(minutos), 24 * 60))
            except (TypeError, ValueError):
                minutos = self._minutos_reales(sesion)
            sesion.focused_minutes = minutos
            sesion.save(update_fields=['estado', 'ended_at', 'focused_minutes'])
        return Response(self.get_serializer(sesion).data)

    def _duracion_plan(self, config):
        """Minutos planificados según la herramienta (pomodoro suma ciclos)."""
        if not config:
            return None
        try:
            if 'ciclos' in config:
                ciclos = max(1, int(config.get('ciclos') or 1))
                concentracion = max(1, int(config.get('concentracion') or 25))
                descanso = max(0, int(config.get('descanso') or 0))
                total = ciclos * concentracion + (ciclos - 1) * descanso
                return min(total, self.MAX_MINUTOS) if total > 0 else None
            duracion = int(config.get('duracion_min') or 0)
            return min(duracion, self.MAX_MINUTOS) if duracion > 0 else None
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _minutos_reales(sesion):
        """Minutos transcurridos desde el inicio (respaldo del cliente)."""
        if not sesion.ended_at:
            return None
        segundos = (sesion.ended_at - sesion.started_at).total_seconds()
        return max(0, int(segundos // 60))


class HoraOroExperienciaViewSet(BaseUserViewSet):
    """Módulo Hora de Oro Familiar (Doc 24).

    El planificador semanal se sirve agrupado por día. Cada espacio (día +
    posición) guarda una experiencia elegida del catálogo: si el espacio ya
    estaba ocupado, elegir otra experiencia lo reemplaza sin pasos extra de
    confirmación (§III «Modificar una experiencia»).
    """
    queryset = HoraOroExperiencia.objects.all()
    serializer_class = HoraOroExperienciaSerializer
    ESPACIOS_INICIALES = 2

    def _dia(self, dia, experiencias):
        experiencias = list(experiencias)
        return {
            'dia': dia,
            'experiencias': [self.get_serializer(e).data for e in experiencias],
            # §II.3 — con los dos espacios iniciales ocupados aparece el botón
            # «Agregar experiencia» (sin límite máximo).
            'puede_agregar': len(experiencias) >= self.ESPACIOS_INICIALES,
            'siguiente_posicion': len(experiencias),
            'espacios_iniciales': self.ESPACIOS_INICIALES,
        }

    # ── Endpoints ─────────────────────────────────────────────────
    def create(self, request, *args, **kwargs):
        from .services.hora_oro import DIAS

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dia = serializer.validated_data['dia_semana']
        posicion = serializer.validated_data.get('posicion', 0)

        existente = self.get_queryset().filter(dia_semana=dia, posicion=posicion).first()
        if existente:
            # Reemplazo: no se acumulan duplicados ni hace falta confirmar.
            existente.categoria = serializer.validated_data['categoria']
            existente.actividad = serializer.validated_data['actividad']
            existente.save(update_fields=['categoria', 'actividad'])
            registro = existente
        else:
            registro = serializer.save(user=request.user)

        experiencias = self.get_queryset().filter(dia_semana=dia)
        return Response(
            {
                'experiencia': self.get_serializer(registro).data,
                'dia': self._dia(dia, experiencias),
            },
            status=status.HTTP_201_CREATED if not existente else status.HTTP_200_OK,
        )

    @action(detail=False, methods=['get'])
    def planificador(self, request):
        """Doc 24 §II.3 — los siete días, cada uno con sus espacios ocupados."""
        from .services.hora_oro import DIAS

        registros = list(self.get_queryset())
        por_dia = {dia: [] for dia in DIAS}
        for registro in registros:
            por_dia.setdefault(registro.dia_semana, []).append(registro)

        dias = []
        total = 0
        for dia in DIAS:
            experiencias = por_dia.get(dia, [])
            total += len(experiencias)
            dias.append(self._dia(dia, experiencias))
        return Response({'dias': dias, 'total': total})

    @action(detail=False, methods=['get'])
    def catalogo(self, request):
        """Doc 24 §II.5 — las ocho categorías con sus actividades visibles."""
        from .services.hora_oro import catalogo

        return Response({'categorias': catalogo()})

    @action(detail=False, methods=['post'])
    def otra_idea(self, request):
        """Doc 24 §II.6 — «Otra idea»: reemplaza una sola actividad, en su
        misma categoría y sin repetir lo ya mostrado en la sesión."""
        from .services.hora_oro import otra_idea, categoria_valida

        categoria = (request.data.get('categoria') or '').strip()
        if not categoria_valida(categoria):
            return Response(
                {'detail': 'Categoría del catálogo no reconocida.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        excluir = request.data.get('excluir') or []
        if isinstance(excluir, str):
            excluir = [excluir]
        excluir = [str(a) for a in excluir][:60]

        actividad, fuente = otra_idea(categoria, excluir)
        if not actividad:
            return Response(
                {'detail': 'No hay más ideas para esta categoría.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({'actividad': actividad, 'categoria': categoria, 'fuente': fuente})

    @action(detail=True, methods=['post'])
    def eliminar(self, request, pk=None):
        experiencia = self.get_object()
        dia = experiencia.dia_semana
        experiencia.delete()
        # Se reindexan los espacios del día para que no queden huecos.
        restantes = list(self.get_queryset().filter(dia_semana=dia).order_by('posicion', 'id'))
        for indice, registro in enumerate(restantes):
            if registro.posicion != indice:
                registro.posicion = indice
                registro.save(update_fields=['posicion'])
        return Response(
            {'dia': self._dia(dia, restantes)},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=['post'])
    def realizar(self, request, pk=None):
        """«Disfruta este momento»: marca (o desmarca) la experiencia como
        realizada. Alimenta «Tus estadísticas» y el listado de realizadas."""
        experiencia = self.get_object()
        realizada = request.data.get('realizada', True)
        if isinstance(realizada, str):
            realizada = realizada.strip().lower() not in ('false', '0', 'no')
        experiencia.realizada = bool(realizada)
        experiencia.realizada_en = timezone.now() if experiencia.realizada else None
        experiencia.save(update_fields=['realizada', 'realizada_en'])
        return Response({'experiencia': self.get_serializer(experiencia).data})

    @action(detail=False, methods=['get'])
    def realizadas(self, request):
        """«Ver mis experiencias realizadas»."""
        registros = self.get_queryset().filter(realizada=True).order_by('-realizada_en', '-id')
        return Response({
            'total': registros.count(),
            'items': [
                {
                    'id': r.id,
                    'actividad': r.actividad,
                    'categoria': r.categoria,
                    'dia_semana': r.dia_semana,
                    'realizada_en': r.realizada_en,
                }
                for r in registros[:200]
            ],
        })

    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """«Tus estadísticas»: horas de calidad y experiencias disfrutadas en el
        mes en curso, y los días de la semana en curso con una Hora de Oro.
        Cada experiencia realizada cuenta como una hora de calidad."""
        hoy = timezone.localdate()
        zona = timezone.get_current_timezone()

        def realizadas_entre(inicio, fin):
            return list(
                self.get_queryset().filter(
                    realizada=True,
                    realizada_en__date__gte=inicio,
                    realizada_en__date__lt=fin,
                ).values_list('realizada_en', flat=True)
            )

        def del_mes(anio, mes):
            inicio = date(anio, mes, 1)
            fin = date(anio + (mes == 12), 1 if mes == 12 else mes + 1, 1)
            return len(realizadas_entre(inicio, fin))

        def dias_de_la_semana(desplazamiento):
            """Días (de los siete) con al menos una Hora de Oro disfrutada."""
            lunes = hoy - timedelta(days=hoy.weekday() + 7 * desplazamiento)
            dias = {m.astimezone(zona).date() for m in realizadas_entre(lunes, lunes + timedelta(days=7))}
            return len(dias) * 100 // 7

        mes_previo = 12 if hoy.month == 1 else hoy.month - 1
        anio_previo = hoy.year - 1 if hoy.month == 1 else hoy.year

        actual = del_mes(hoy.year, hoy.month)
        anterior = del_mes(anio_previo, mes_previo)
        dias = dias_de_la_semana(0)
        dias_antes = dias_de_la_semana(1)

        def variacion(valor, antes):
            if not antes:
                return None
            return round((valor - antes) * 100 / antes)

        return Response({
            'mes': hoy.month,
            'anio': hoy.year,
            'horas': {'minutos': actual * 60, 'delta': variacion(actual, anterior)},
            'experiencias': {'total': actual, 'delta': variacion(actual, anterior)},
            'dias': {'porcentaje': dias, 'delta': variacion(dias, dias_antes)},
        })

    @action(detail=False, methods=['get', 'post'])
    def ajustes(self, request):
        """«Configurar recordatorios»: aviso diario y hora del aviso."""
        ajustes, _ = HoraOroAjustes.objects.get_or_create(user=request.user)
        if request.method == 'POST':
            serializer = HoraOroAjustesSerializer(ajustes, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        return Response(HoraOroAjustesSerializer(ajustes).data)


class ObjetivoSemanaViewSet(BaseUserViewSet):
    queryset = ObjetivoSemana.objects.all()
    serializer_class = ObjetivoSemanaSerializer

class KeepNotaViewSet(BaseUserViewSet):
    queryset = KeepNota.objects.all()
    serializer_class = KeepNotaSerializer

class MisionHoyViewSet(BaseUserViewSet):
    queryset = MisionHoy.objects.all()
    serializer_class = MisionHoySerializer

class CategoriaRuedaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CategoriaRueda.objects.filter(activo=True)
    serializer_class = CategoriaRuedaSerializer
    permission_classes = [permissions.IsAuthenticated]

class RegistroRuedaViewSet(BaseUserViewSet):
    queryset = RegistroRueda.objects.all()
    serializer_class = RegistroRuedaSerializer

class MatrixItemViewSet(BaseUserViewSet):
    queryset = MatrixItem.objects.all()
    serializer_class = MatrixItemSerializer

class FacturaViewSet(BaseUserViewSet):
    queryset = Factura.objects.all()
    serializer_class = FacturaSerializer


class CuentaColumnaViewSet(BaseUserViewSet):
    """Columnas personalizadas de la tabla de Cuentas (doc 17). Persisten entre períodos."""
    queryset = CuentaColumna.objects.all()
    serializer_class = CuentaColumnaSerializer

    def perform_create(self, serializer):
        ultimo = CuentaColumna.objects.filter(user=self.request.user).order_by('-orden').first()
        serializer.save(user=self.request.user, orden=(ultimo.orden + 1) if ultimo else 0)


class CuentaRegistroViewSet(BaseUserViewSet):
    """Filas de la tabla de Cuentas por período mensual (doc 17)."""
    queryset = CuentaRegistro.objects.all()
    serializer_class = CuentaRegistroSerializer

    def get_queryset(self):
        qs = super().get_queryset().prefetch_related('valores')
        anio = self.request.query_params.get('anio')
        mes = self.request.query_params.get('mes')
        if anio and mes:
            qs = qs.filter(periodo_anio=int(anio), periodo_mes=int(mes))
        return qs

    def perform_create(self, serializer):
        ultimo = CuentaRegistro.objects.filter(
            user=self.request.user,
            periodo_anio=serializer.validated_data.get('periodo_anio'),
            periodo_mes=serializer.validated_data.get('periodo_mes'),
        ).order_by('-orden').first()
        registro = serializer.save(
            user=self.request.user,
            orden=(ultimo.orden + 1) if ultimo else 0,
        )
        self._guardar_extras(registro, self.request.data.get('extras', {}))

    def perform_update(self, serializer):
        registro = serializer.save()
        self._guardar_extras(registro, self.request.data.get('extras', {}))

    def _guardar_extras(self, registro, extras):
        if not isinstance(extras, dict):
            return
        columnas = {
            str(c.id): c
            for c in CuentaColumna.objects.filter(user=registro.user)
        }
        for col_id, valor in extras.items():
            if str(col_id) not in columnas:
                continue
            CuentaValor.objects.update_or_create(
                registro=registro,
                columna=columnas[str(col_id)],
                defaults={'valor': str(valor or '')},
            )

    @action(detail=False, methods=['get'])
    def tablero(self, request):
        """Tablero del período mensual con rollover automático (doc 17: reinicio mensual).

        Si el período no tiene filas, se clona la estructura y las cuentas del
        período anterior más reciente con los checks en Pendiente.
        """
        hoy = timezone.now().date()
        try:
            anio = int(request.query_params.get('anio', hoy.year))
            mes = int(request.query_params.get('mes', hoy.month))
        except (TypeError, ValueError):
            return Response({'detail': 'Período inválido.'}, status=400)
        if not 1 <= mes <= 12:
            return Response({'detail': 'Período inválido.'}, status=400)

        columnas = list(CuentaColumna.objects.filter(user=request.user).order_by('orden', 'id'))
        filas = list(
            CuentaRegistro.objects.filter(
                user=request.user, periodo_anio=anio, periodo_mes=mes
            ).prefetch_related('valores').order_by('orden', 'id')
        )
        if not filas:
            anterior = (
                CuentaRegistro.objects.filter(user=request.user)
                .exclude(periodo_anio=anio, periodo_mes=mes)
                .filter(
                    models.Q(periodo_anio__lt=anio)
                    | models.Q(periodo_anio=anio, periodo_mes__lt=mes)
                )
                .order_by('-periodo_anio', '-periodo_mes')
                .first()
            )
            if anterior is not None:
                origen = list(
                    CuentaRegistro.objects.filter(
                        user=request.user,
                        periodo_anio=anterior.periodo_anio,
                        periodo_mes=anterior.periodo_mes,
                    ).prefetch_related('valores').order_by('orden', 'id')
                )
                for f in origen:
                    copia = CuentaRegistro.objects.create(
                        user=request.user,
                        periodo_anio=anio,
                        periodo_mes=mes,
                        cuenta=f.cuenta,
                        dia_vencimiento=f.dia_vencimiento,
                        monto=f.monto,
                        pagado=False,
                        orden=f.orden,
                    )
                    for v in f.valores.all():
                        if CuentaColumna.objects.filter(user=request.user, id=v.columna_id).exists():
                            CuentaValor.objects.create(registro=copia, columna_id=v.columna_id, valor=v.valor)
                filas = list(
                    CuentaRegistro.objects.filter(
                        user=request.user, periodo_anio=anio, periodo_mes=mes
                    ).prefetch_related('valores').order_by('orden', 'id')
                )
        return Response({
            'anio': anio,
            'mes': mes,
            'columnas': CuentaColumnaSerializer(columnas, many=True).data,
            'filas': CuentaRegistroSerializer(filas, many=True).data,
        })

    @action(detail=False, methods=['get'])
    def historial(self, request):
        """Historial mensual: períodos con registros y conteo de pagadas (doc 17)."""
        from django.db.models import Count, Q
        resumen = (
            CuentaRegistro.objects.filter(user=request.user)
            .values('periodo_anio', 'periodo_mes')
            .annotate(
                total=Count('id'),
                pagadas=Count('id', filter=Q(pagado=True)),
            )
            .order_by('-periodo_anio', '-periodo_mes')
        )
        return Response([
            {
                'anio': r['periodo_anio'],
                'mes': r['periodo_mes'],
                'total': r['total'],
                'pagadas': r['pagadas'],
            }
            for r in resumen
        ])


class WorkspaceViewSet(viewsets.ModelViewSet):
    serializer_class = WorkspaceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Workspace.objects.filter(members__user=self.request.user)

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return WorkspaceDetailSerializer
        return WorkspaceSerializer

    def perform_create(self, serializer):
        workspace = serializer.save(owner=self.request.user)
        WorkspaceMember.objects.create(
            workspace=workspace,
            user=self.request.user,
            role='owner'
        )

    @action(detail=True, methods=['post'])
    def invite(self, request, pk=None):
        workspace = self.get_object()
        member = workspace.members.filter(user=request.user).first()
        if not member or member.role not in ['owner', 'admin']:
            return Response({'error': 'No tienes permisos para invitar'}, status=status.HTTP_403_FORBIDDEN)

        email = request.data.get('email')
        role = request.data.get('role', 'member')
        if not email:
            return Response({'error': 'Email requerido'}, status=status.HTTP_400_BAD_REQUEST)

        token = secrets.token_urlsafe(32)
        invitation = Invitation.objects.create(
            workspace=workspace,
            email=email,
            role=role,
            token=token,
            invited_by=request.user,
            expires_at=timezone.now() + timedelta(hours=48)
        )

        Notification.objects.create(
            user=workspace.owner,
            type='invitation',
            title=f'Nueva invitación a {workspace.name}',
            message=f'Se invitó a {email} al workspace {workspace.name}',
            data={'invitation_id': invitation.id, 'workspace_id': workspace.id}
        )

        return Response({'token': token, 'email': email})

    @action(detail=True, methods=['post'])
    def remove_member(self, request, pk=None):
        workspace = self.get_object()
        member = workspace.members.filter(user=request.user).first()
        if not member or member.role not in ['owner', 'admin']:
            return Response({'error': 'No tienes permisos'}, status=status.HTTP_403_FORBIDDEN)

        user_id = request.data.get('user_id')
        target = workspace.members.filter(user_id=user_id).first()
        if not target:
            return Response({'error': 'Miembro no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        if target.role == 'owner':
            return Response({'error': 'No puedes eliminar al propietario'}, status=status.HTTP_400_BAD_REQUEST)
        target.delete()
        return Response({'status': 'ok'})

    @action(detail=True, methods=['post'])
    def update_member_role(self, request, pk=None):
        workspace = self.get_object()
        member = workspace.members.filter(user=request.user).first()
        if not member or member.role not in ['owner', 'admin']:
            return Response({'error': 'No tienes permisos'}, status=status.HTTP_403_FORBIDDEN)

        user_id = request.data.get('user_id')
        new_role = request.data.get('role')
        target = workspace.members.filter(user_id=user_id).first()
        if not target:
            return Response({'error': 'Miembro no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        if target.role == 'owner':
            return Response({'error': 'No puedes cambiar el rol del propietario'}, status=status.HTTP_400_BAD_REQUEST)
        target.role = new_role
        target.save()
        return Response({'status': 'ok'})

    @action(detail=True, methods=['get'], url_path='members-for-delegation')
    def members_for_delegation(self, request, pk=None):
        workspace = self.get_object()
        members = workspace.members.exclude(user=request.user)
        data = [{
            'user_id': m.user.id,
            'username': m.user.username,
            'email': m.user.email,
            'avatar_url': m.user.avatar_url,
            'role': m.role
        } for m in members]
        return Response(data)


class InvitationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = InvitationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Invitation.objects.filter(email=self.request.user.email)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_workspaces(request):
    workspaces = Workspace.objects.filter(members__user=request.user)
    serializer = WorkspaceSerializer(workspaces, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def accept_invitation(request):
    token = request.data.get('token')
    try:
        invitation = Invitation.objects.get(token=token, status='pending')
    except Invitation.DoesNotExist:
        return Response({'error': 'Invitación no válida o expirada'}, status=status.HTTP_404_NOT_FOUND)

    if invitation.expires_at and invitation.expires_at < timezone.now():
        invitation.status = 'expired'
        invitation.save()
        return Response({'error': 'Invitación expirada'}, status=status.HTTP_410_GONE)

    if invitation.email != request.user.email:
        return Response({'error': 'Esta invitación no es para tu email'}, status=status.HTTP_403_FORBIDDEN)

    try:
        WorkspaceMember.objects.create(
            workspace=invitation.workspace,
            user=request.user,
            role=invitation.role
        )
    except IntegrityError:
        return Response({'error': 'Ya eres miembro de este workspace'}, status=status.HTTP_400_BAD_REQUEST)

    invitation.status = 'accepted'
    invitation.save()

    Notification.objects.create(
        user=invitation.workspace.owner,
        type='invitation',
        title=f'{request.user.username} aceptó la invitación',
        message=f'{request.user.username} se unió a {invitation.workspace.name}',
        data={'workspace_id': invitation.workspace.id}
    )

    return Response({'workspace_id': invitation.workspace.id})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def decline_invitation(request):
    token = request.data.get('token')
    try:
        invitation = Invitation.objects.get(token=token, status='pending')
    except Invitation.DoesNotExist:
        return Response({'error': 'Invitación no encontrada'}, status=status.HTTP_404_NOT_FOUND)

    invitation.status = 'declined'
    invitation.save()
    return Response({'status': 'ok'})


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def rueda_vida_completa(request):
    if request.method == 'GET':
        categorias = CategoriaRueda.objects.filter(activo=True).order_by('orden')
        registros = RegistroRueda.objects.filter(user=request.user)

        result = []
        for cat in categorias:
            reg = registros.filter(categoria=cat).first()
            result.append({
                'id': cat.id,
                'nombre': cat.nombre,
                'icono': cat.icono,
                'puntaje': reg.puntaje if reg else 5,
                'comentario': reg.comentario if reg else '',
            })
        return Response(result)

    elif request.method == 'POST':
        puntajes = request.data.get('puntajes', {})
        comentarios = request.data.get('comentarios', {})

        for cat_id, puntaje in puntajes.items():
            try:
                categoria = CategoriaRueda.objects.get(id=cat_id, activo=True)
                defaults = {'puntaje': puntaje}
                if str(cat_id) in comentarios:
                    defaults['comentario'] = comentarios[str(cat_id)]
                RegistroRueda.objects.update_or_create(
                    user=request.user,
                    categoria=categoria,
                    defaults=defaults
                )
            except CategoriaRueda.DoesNotExist:
                continue

        return Response({'status': 'ok'})


NIVELES = [
    (1, 2, 'Crítico'),
    (3, 4, 'Bajo'),
    (5, 6, 'Medio'),
    (7, 8, 'Bueno'),
    (9, 10, 'Excelente'),
]

def _nivel_str(puntaje):
    for lo, hi, label in NIVELES:
        if lo <= puntaje <= hi:
            return label
    return 'Medio'

def _calcular_nivel_equilibrio(promedio):
    return _nivel_str(round(promedio))


def _generar_sumario_ia(items, promedio, nivel_equilibrio, focos):
    """Generate AI summary for diagnosis using Groq LLM."""
    areas_str = "\n".join(
        f"- {i['nombre']}: {i['puntaje']}/10" for i in items
    )
    focos_str = ", ".join(f['nombre'] for f in focos)

    prompt = (
        "Eres un coach profesional de rueda de la vida. "
        "Genera un reporte sintético (máximo 4 párrafos) basado en el siguiente diagnóstico:\n\n"
        f"Puntajes por área:\n{areas_str}\n\n"
        f"Promedio general: {promedio:.1f}/10\n"
        f"Nivel de equilibrio: {nivel_equilibrio}\n"
        f"Áreas foco (peor puntuadas y/o con mayor potencial de mejora): {focos_str}\n\n"
        "Incluye:\n"
        "- Observación general del equilibrio de vida\n"
        "- Reconocimiento del área más fuerte (pico alto)\n"
        "- Análisis de por qué las áreas foco fueron seleccionadas\n"
        "- Recomendación estratégica inicial\n"
        "Responde como un coach empático y motivador."
    )

    try:
        from urllib.request import Request, urlopen
        from django.conf import settings
        import json

        api_key = settings.GROQ_API_KEY
        if not api_key:
            return None

        payload = json.dumps({
            "model": "openai/gpt-oss-120b",
            "messages": [
                {"role": "system", "content": "Eres un coach profesional experto en rueda de la vida."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.7,
            "max_tokens": 500,
        }).encode('utf-8')

        req = Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "focusia/1.0",
            },
        )
        with urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return data['choices'][0]['message']['content']
    except Exception as e:
        logger.warning(f"Groq summary generation failed: {e}")
        return None


def _reporte_sintetico_local(items, promedio, nivel_equilibrio, focos):
    """Reporte sintético determinista (spec §Reporte sintético de IA).

    Se usa cuando el LLM no está disponible, garantizando siempre los
    6 puntos aprobados: altas, bajas, promedio, equilibrio, focos y
    explicación del efecto colateral.
    """
    ordenados = sorted(items, key=lambda x: x['puntaje'])
    bajas = ordenados[:3]
    altas = sorted(items, key=lambda x: x['puntaje'], reverse=True)[:3]
    focos_nombres = [f['nombre'] for f in focos]
    altas_txt = ', '.join(['%s (%s/10)' % (a['nombre'], a['puntaje']) for a in altas])
    bajas_txt = ', '.join(['%s (%s/10)' % (a['nombre'], a['puntaje']) for a in bajas])
    return (
        'Areas mas altas: ' + altas_txt + '. '
        'Areas mas bajas: ' + bajas_txt + '. '
        'Promedio general: %.1f/10 con un nivel de equilibrio %s. ' % (promedio, nivel_equilibrio) +
        'Tus tres areas foco prioritarias son ' + ', '.join(focos_nombres) + '. '
        'Trabajarlas primero genera un efecto colateral positivo: al elevarlas, '
        'arrastran al resto de areas hacia el equilibrio general de tu vida.'
    )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def generar_diagnostico_rueda(request):
    serializer = GenerarDiagnosticoInputSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    puntajes = serializer.validated_data.get('puntajes')
    comentarios = serializer.validated_data.get('comentarios', {})
    if puntajes is None:
        registros = RegistroRueda.objects.filter(user=request.user).select_related('categoria')
        puntajes = {}
        for r in registros:
            puntajes[str(r.categoria.id)] = r.puntaje
        comentarios = {}

    categorias = CategoriaRueda.objects.filter(activo=True).order_by('orden')
    items = []
    for cat in categorias:
        pts = puntajes.get(str(cat.id), puntajes.get(cat.id, 5))
        cmt = comentarios.get(str(cat.id), '')
        items.append({'nombre': cat.nombre, 'puntaje': int(pts), 'comentario': cmt})

    if not items:
        return Response({'error': 'No hay categorías activas'}, status=400)

    promedio = sum(i['puntaje'] for i in items) / len(items)
    pico_alto = max(items, key=lambda x: x['puntaje'])
    pico_bajo = min(items, key=lambda x: x['puntaje'])
    nivel_equilibrio = _calcular_nivel_equilibrio(promedio)

    # Criterio doc 2: puntaje bajo + comentario del usuario + efecto colateral.
    # Un comentario resta peso (más prioridad): el usuario ya señaló tensión
    # en esa área, así que conviene trabajarla aunque no sea la más baja.
    def peso_foco(item):
        peso_base = item['puntaje']
        comentario = (item['comentario'] or '').strip()
        bonus = min(len(comentario) / 50, 2.0) if comentario else 0
        return peso_base - bonus

    sorted_items = sorted(items, key=peso_foco)
    focos = sorted_items[:3]

    foco_1, foco_2, foco_3 = focos[0]['nombre'], focos[1]['nombre'], focos[2]['nombre']

    detalle_focos = '; '.join(
        f"{f['nombre']} ({f['puntaje']}/10"
        + (f" — señalaste: {(f['comentario'] or '').strip()[:80]}" if (f['comentario'] or '').strip()
           else ' — elegida por puntaje bajo')
        + ')'
        for f in focos
    )
    justificacion = (
        f"Según tu diagnóstico, las áreas {foco_1}, {foco_2} y {foco_3} "
        f"presentan el mayor potencial de mejora estratégica. "
        f"Trabajarlas generará un efecto colateral positivo que elevará "
        f"orgánicamente el equilibrio de las demás áreas de tu vida. "
        f"Detalle: {detalle_focos}."
    )

    # Generate AI summary (con fallback local garantizado por spec)
    ai_summary = _generar_sumario_ia(items, promedio, nivel_equilibrio, focos)
    if not ai_summary:
        ai_summary = _reporte_sintetico_local(items, promedio, nivel_equilibrio, focos)

    diag, _ = DiagnosticoRueda.objects.update_or_create(
        user=request.user,
        defaults={
            'status': DiagnosticoRueda.Status.COMPLETED,
            'promedio_general': round(promedio, 1),
            'nivel_equilibrio': nivel_equilibrio,
            'pico_alto': f"{pico_alto['nombre']} ({pico_alto['puntaje']}/10)",
            'pico_bajo': f"{pico_bajo['nombre']} ({pico_bajo['puntaje']}/10)",
            'foco_1': foco_1,
            'foco_2': foco_2,
            'foco_3': foco_3,
            'justificacion_focos': justificacion,
            'ai_summary': ai_summary or '',
        }
    )

    # Populate FocusArea model
    from django.utils import timezone as tz
    for i, item in enumerate(focos, start=1):
        FocusArea.objects.update_or_create(
            diagnostico=diag,
            area=item['nombre'],
            defaults={
                'score': item['puntaje'],
                'reason': f"Seleccionada como #{i} por su puntaje de {item['puntaje']}/10 y potencial de mejora."
                           if not item.get('comentario')
                           else f"Seleccionada como #{i}. Puntaje: {item['puntaje']}/10. Comentario: {item['comentario'][:100]}",
                'priority_order': i,
            }
        )

    return Response(DiagnosticoRuedaSerializer(diag).data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def ver_diagnostico_rueda(request):
    try:
        diag = DiagnosticoRueda.objects.get(user=request.user)
        return Response(DiagnosticoRuedaSerializer(diag).data)
    except DiagnosticoRueda.DoesNotExist:
        return Response({'diagnostico': None})


# Tandas adicionales de acciones por área (spec: hasta 4 tandas de 5 = 20 máx).
# Tanda 1 vive en CAT_ACCIONES dentro de cada endpoint; aquí van las tandas 2-4.
_ACCIONES_TANDAS_EXTRA = {
    'Trabajo': {
        2: [
            'Define tus 3 prioridades del día antes de abrir el correo',
            'Agrupa reuniones similares en un solo bloque de la agenda',
            'Crea una plantilla para tus tareas repetitivas',
            'Pide claridad sobre tu objetivo principal del trimestre',
            'Apaga notificaciones durante tu primera hora de trabajo',
        ],
        3: [
            'Haz una revisión de 15 minutos cada viernes de tus avances',
            'Aprende un atajo o herramienta que acelere tu trabajo diario',
            'Comparte semanalmente tus 3 logros con tu equipo',
            'Establece una hora fija de cierre para respetar tu descanso',
            'Identifica tu hora más productiva y protégela para lo importante',
        ],
        4: [
            'Mide cuántas de tus 3 prioridades diarias cumpliste esta semana',
            'Documenta un proceso que solo tú sabes hacer',
            'Mentorea a alguien en algo que dominas',
            'Evalúa tu carga mensual y negocia lo que excede tu capacidad',
            'Celebra un logro laboral con tu equipo o familia',
        ],
    },
    'Dinero': {
        2: [
            'Automatiza una transferencia a tu ahorro al recibir ingresos',
            'Compara precios antes de cualquier compra mayor semanal',
            'Vende algo que no uses y suma ese dinero a tu meta',
            'Registra tus gastos 7 días seguidos sin excepción',
            'Define un monto máximo semanal para gastos no esenciales',
        ],
        3: [
            'Revisa tu presupuesto el primer día de cada mes',
            'Crea un fondo de emergencia con una meta inicial pequeña',
            'Aprende un concepto financiero nuevo cada semana',
            'Negocia o mejora una de tus cuentas o tarifas actuales',
            'Destina cualquier ingreso extra directamente al ahorro',
        ],
        4: [
            'Calcula tu tasa de ahorro del mes y compárala con la anterior',
            'Define tu meta financiera del próximo trimestre por escrito',
            'Elimina una deuda pequeña por completo',
            'Aplica un consejo de alguien con buenas finanzas',
            'Registra tu racha de semanas ahorrando sin romperla',
        ],
    },
    'Salud': {
        2: [
            'Agenda tus chequeos médicos pendientes esta semana',
            'Prepara tus comidas del día con anticipación una vez por semana',
            'Estira 5 minutos al levantarte y antes de dormir',
            'Cambia una bebida azucarada al día por agua',
            'Camina 10 minutos después de tu comida principal',
        ],
        3: [
            'Registra tu sueño durante una semana para detectar patrones',
            'Prueba una actividad física nueva este mes',
            'Reduce a la mitad un alimento poco saludable',
            'Practica respiración profunda 3 minutos al día',
            'Pasa un día a la semana sin comida ultraprocesada',
        ],
        4: [
            'Compara tu energía actual con la de hace un mes',
            'Fija tu horario de sueño y cúmplelo 5 de 7 días',
            'Hazte los exámenes de rutina del año',
            'Enseña a alguien un hábito saludable que adoptaste',
            'Define tu próxima meta de salud por escrito con fecha',
        ],
    },
    'Pareja': {
        2: [
            'Establezcan un ritual diario de 10 minutos para conversar',
            'Sorprende a tu pareja con su comida o detalle favorito',
            'Hablen de sus metas individuales y cómo apoyarse',
            'Apaguen los celulares durante las comidas juntos',
            'Recuerden juntos un buen momento del pasado',
        ],
        3: [
            'Planifiquen una salida mensual solo para ustedes dos',
            'Practiquen pedir perdón rápido y sin orgullo',
            'Lean juntos algo breve y comenten qué les dejó',
            'Dividan una tarea del hogar de forma justa y explícita',
            'Celebren mensualmente algo bueno de su relación',
        ],
        4: [
            'Evalúen juntos su comunicación del 1 al 10',
            'Escriban cada uno una carta de agradecimiento al otro',
            'Planeen un proyecto común para los próximos 3 meses',
            'Perdonen explícitamente una vieja molestia',
            'Renueven un compromiso concreto el uno con el otro',
        ],
    },
    'Familia': {
        2: [
            'Crea un chat solo para coordinar y celebrar en familia',
            'Visita o videollama a un familiar mayor esta semana',
            'Cocinen juntos una receta nueva este fin de semana',
            'Pregunta a tus hijos o sobrinos por sus sueños y anótalos',
            'Organiza las fotos familiares en un álbum compartido',
        ],
        3: [
            'Instaura una noche familiar fija cada semana',
            'Llama a un familiar distinto cada domingo',
            'Enseña a un familiar algo que sabes hacer bien',
            'Pide a tus padres o abuelos que te cuenten una historia y grábala',
            'Haz una videollamada grupal familiar una vez al mes',
        ],
        4: [
            'Organiza un encuentro familiar presencial este trimestre',
            'Resuelve un pendiente o malentendido con un familiar',
            'Crea una tradición familiar nueva y repítela',
            'Agradece en persona a quien sostiene a la familia',
            'Planifica las próximas vacaciones o celebración familiar',
        ],
    },
    'Espiritualidad': {
        2: [
            'Escribe tu definición personal de paz interior',
            'Dedica 10 minutos diarios a estar en silencio total',
            'Lee un texto sagrado o filosófico cada mañana',
            'Practica la gratitud escribiendo 5 cosas cada noche',
            'Desconéctate de redes un día completo cada semana',
        ],
        3: [
            'Únete a un grupo o comunidad con tus mismos valores',
            'Medita 10 minutos seguidos sin interrupciones',
            'Haz una caminata contemplativa en la naturaleza',
            'Perdona de corazón a alguien que te hirió',
            'Define tus 3 valores innegociables por escrito',
        ],
        4: [
            'Haz un retiro personal de medio día en silencio',
            'Comparte tu práctica espiritual con alguien cercano',
            'Evalúa si tus decisiones diarias honran tus valores',
            'Crea un rincón personal de calma en casa',
            'Escribe una carta a tu yo del futuro sobre tu propósito',
        ],
    },
    'Diversión': {
        2: [
            'Agenda 1 hora semanal solo para divertirte sin culpa',
            'Retoma contacto con un amigo divertido que extrañas',
            'Prueba un juego, deporte o actividad que nunca hiciste',
            'Baila 3 canciones seguidas en casa',
            'Mira un atardecer completo sin pantallas',
        ],
        3: [
            'Planifica una escapada corta de un día este mes',
            'Aprende algo solo por diversión, sin meta productiva',
            'Organiza una noche de juegos con amigos o familia',
            'Ríe a carcajadas con alguien al menos una vez por semana',
            'Guarda una foto feliz por semana como colección',
        ],
        4: [
            'Haz la actividad divertida que más pospones',
            'Viaja a un lugar nuevo aunque sea cercano',
            'Celebra tus avances con una recompensa divertida',
            'Invita a alguien a tu actividad favorita',
            'Crea una lista de 10 diversiones pendientes y tacha una al mes',
        ],
    },
    'Entorno': {
        2: [
            'Limpia a fondo un cajón o clóset olvidado',
            'Repara algo pequeño de tu casa esta semana',
            'Organiza tus archivos digitales en carpetas claras',
            'Mejora la iluminación de tu espacio de trabajo',
            'Elimina 10 objetos que ya no necesitas',
        ],
        3: [
            'Haz limpieza profunda de una zona distinta cada semana',
            'Mantén tu cama tendida y tu cocina recogida a diario',
            'Crea un sistema simple para llaves, papeles y cargadores',
            'Decora un rincón que te inspire al llegar a casa',
            'Reduce el ruido visual: quita lo que no usas ni amas',
        ],
        4: [
            'Evalúa tu hogar del 1 al 10 y mejora el punto más bajo',
            'Haz mantenimiento preventivo a algo importante de casa',
            'Renueva un espacio con bajo presupuesto',
            'Invita a alguien a tu casa y disfruta tu entorno',
            'Define tu estándar mínimo de orden y cúmplelo a diario',
        ],
    },
    'Desarrollo': {
        2: [
            'Dedica 20 minutos diarios a leer sobre tu área de interés',
            'Toma notas de todo lo que aprendes esta semana',
            'Busca un mentor o referente y estudia su camino',
            'Practica deliberadamente una habilidad 3 veces por semana',
            'Termina ese curso o libro que dejaste a medias',
        ],
        3: [
            'Comparte lo aprendido enseñando a otra persona',
            'Fija una meta de aprendizaje mensual medible',
            'Únete a una comunidad de tu área de interés',
            'Aplica esta semana algo nuevo que aprendiste',
            'Escribe tus ideas para no perderlas',
        ],
        4: [
            'Evalúa tu progreso del trimestre en tu habilidad foco',
            'Sube de nivel: busca un reto mayor en lo que aprendes',
            'Crea un registro visible de tu avance',
            'Pide una evaluación honesta a tu mentor',
            'Define tu siguiente habilidad a desarrollar con fecha de inicio',
        ],
    },
    'Contribución': {
        2: [
            'Dona ropa o alimentos que no uses esta semana',
            'Ayuda a un vecino con algo concreto',
            'Reconoce públicamente el trabajo de alguien',
            'Dedica una hora semanal a una causa',
            'Escucha con atención a quien necesite desahogarse',
        ],
        3: [
            'Haz voluntariado una vez al mes de forma constante',
            'Apoya económicamente una causa pequeña',
            'Organiza una colecta o ayuda entre tus conocidos',
            'Comparte tus habilidades gratis con quien las necesite',
            'Agradece por escrito a 3 personas que te formaron',
        ],
        4: [
            'Convierte tu ayuda en un compromiso fijo del mes',
            'Invita a otros a sumarse a tu causa',
            'Mide el impacto de tu contribución este trimestre',
            'Crea algo que siga ayudando aunque tú no estés',
            'Celebra las vidas que tocaste este año',
        ],
    },
}


def _textos_tanda(area, tanda, base):
    """Devuelve los 5 textos de la tanda solicitada (spec: 4 tandas de 5).

    Tanda 1 = lista base del endpoint; tandas 2-4 = contenido nuevo por área.
    """
    if tanda <= 1:
        return list(base)
    extra = _ACCIONES_TANDAS_EXTRA.get(area, {}).get(tanda)
    if extra:
        return list(extra)
    temas = {2: 'profundizar', 3: 'dar constancia', 4: 'consolidar'}
    tema = temas.get(tanda, 'avanzar')
    return [
        f'Dedica 15 minutos a {tema} tu avance en {area}',
        f'Escribe un paso concreto para mejorar en {area} esta semana',
        f'Comparte con alguien tu compromiso con {area}',
        f'Revisa qué funcionó esta semana en {area} y repítelo',
        f'Define la próxima micro-meta de {area} con fecha clara',
    ]


def _limite_tandas_response():
    from rest_framework.response import Response
    return Response({'error': 'Focusia recomienda no generar más acciones por ahora, para evitar saturación y ayudarte a avanzar con foco.',
                     'code': 'limite_20'}, status=400)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def generar_acciones_rueda(request):
    serializer = GenerarAccionesInputSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    area_foco = serializer.validated_data.get('area_foco')
    if area_foco is None:
        diag = DiagnosticoRueda.objects.filter(user=request.user).first()
        if diag and diag.foco_1:
            area_foco = diag.foco_1
        else:
            return Response({'error': 'Indica un área de foco o completa primero el diagnóstico'},
                            status=status.HTTP_400_BAD_REQUEST)

    existing_count = AccionSugerida.objects.filter(user=request.user, area_foco=area_foco).count()
    if existing_count >= 20:
        return Response({'error': 'Focusia recomienda no generar más acciones por ahora, para evitar saturación y ayudarte a avanzar con foco.',
                         'code': 'limite_20'}, status=400)

    CAT_ACCIONES = {
        'Trabajo': [
            'Revisa tu carga laboral y prioriza 3 tareas clave para esta semana',
            'Establece un bloque de 2 horas sin interrupciones para trabajo profundo',
            'Identifica una tarea que puedas delegar y asígnala a alguien del equipo',
            'Actualiza tu lista de pendientes y elimina lo que ya no aporta valor',
            'Programa una pausa activa de 10 minutos entre cada bloque de trabajo',
        ],
        'Dinero': [
            'Registra todos tus gastos de la semana para tener visibilidad financiera',
            'Revisa tus suscripciones mensuales y cancela las que no uses',
            'Destina al menos el 10 % de tus ingresos a una meta de ahorro',
            'Crea un presupuesto simple para el próximo mes',
            'Identifica un gasto hormiga y sustitúyelo por un hábito financiero sano',
        ],
        'Salud': [
            'Programa una caminata de 20 minutos al aire libre hoy',
            'Bebe 8 vasos de agua durante el día',
            'Reduce el consumo de pantallas 30 minutos antes de dormir',
            'Incorpora una porción extra de verduras en tu comida principal',
            'Duerme al menos 7 horas esta noche',
        ],
        'Pareja': [
            'Envía un mensaje inesperado a tu pareja solo para decirle que la/lo aprecias',
            'Propón una cita sencilla sin pantallas: cocinar juntos o caminar',
            'Pregunta a tu pareja cómo se siente y escucha sin interrumpir',
            'Escribe una nota con algo que agradezcas de tu relación',
            'Planeen juntos una actividad que hayan pospuesto por mucho tiempo',
        ],
        'Familia': [
            'Llama a un familiar con el que no hayas hablado en más de una semana',
            'Propón una comida familiar sin teléfonos celulares',
            'Pregunta a cada miembro de tu familia cómo fue su día',
            'Escribe un mensaje de agradecimiento a un familiar',
            'Organiza una actividad breve para hacer en familia este fin de semana',
        ],
        'Espiritualidad': [
            'Dedica 5 minutos a la meditación o respiración consciente',
            'Escribe tres cosas por las que estés agradecido hoy',
            'Lee un pasaje que te inspire o motive',
            'Sal a caminar en silencio y conecta con tu entorno',
            'Reflexiona sobre tu propósito personal y escríbelo en una frase',
        ],
        'Diversión': [
            'Escucha tu canción favorita y cántala a todo volumen',
            'Dedica 30 minutos a un hobby que hayas abandonado',
            'Ve un episodio de una serie o película que te haga reír',
            'Juega un juego de mesa o videojuego durante 20 minutos',
            'Sal a hacer algo que no hagas habitualmente: un museo, un parque, un café nuevo',
        ],
        'Entorno': [
            'Ordena tu escritorio o espacio de trabajo durante 10 minutos',
            'Abre las ventanas para ventilar tu habitación',
            'Cambia de lugar un mueble o elemento decorativo para renovar el ambiente',
            'Dona o guarda algo que ya no uses para liberar espacio',
            'Incorpora una planta o elemento natural a tu espacio',
        ],
        'Desarrollo': [
            'Lee un artículo o capítulo de un libro sobre un tema que te interese',
            'Inscríbete en un curso corto en línea (gratuito o accesible)',
            'Escribe una habilidad que te gustaría desarrollar y el primer paso para lograrlo',
            'Escucha un podcast de crecimiento personal mientras haces otra actividad',
            'Pide retroalimentación a alguien de confianza sobre tu desempeño',
        ],
        'Contribución': [
            'Realiza un acto de amabilidad al azar hoy (ayudar a alguien, ceder el paso, donar)',
            'Escribe un mensaje de agradecimiento a alguien que te haya apoyado',
            'Identifica una causa que te importe y destina 30 minutos a apoyarla',
            'Comparte un conocimiento útil con alguien de tu equipo o comunidad',
            'Ofrece tu tiempo para escuchar a alguien que lo necesite',
        ],
    }

    acciones_base = CAT_ACCIONES.get(area_foco, [
        f'Establece una acción concreta para mejorar en {area_foco}',
        f'Revisa tu progreso en {area_foco} esta semana',
        f'Identifica un obstáculo en {area_foco} y busca una solución',
        f'Consulta a un experto o referencia sobre {area_foco}',
        f'Dedica 15 minutos a reflexionar sobre {area_foco}',
    ])

    next_batch = (existing_count // 5) + 1
    if next_batch > 4:
        return _limite_tandas_response()

    nuevas = []
    for texto in _textos_tanda(area_foco, next_batch, acciones_base):
        if not AccionSugerida.objects.filter(
            user=request.user, area_foco=area_foco, texto=texto
        ).exists():
            nuevas.append(AccionSugerida(user=request.user, area_foco=area_foco, texto=texto, batch_number=next_batch))

    if nuevas:
        AccionSugerida.objects.bulk_create(nuevas)

    todas = AccionSugerida.objects.filter(user=request.user, area_foco=area_foco)
    total = todas.count()
    disponibles = max(0, 20 - total)

    return Response({
        'acciones': AccionSugeridaSerializer(todas, many=True).data,
        'total_area': total,
        'disponibles': disponibles,
        'batch_generado': next_batch,
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def listar_acciones_rueda(request):
    area_foco = request.query_params.get('area_foco')
    qs = AccionSugerida.objects.filter(user=request.user)
    if area_foco:
        qs = qs.filter(area_foco=area_foco)
    return Response(AccionSugeridaSerializer(qs, many=True).data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def enviar_accion_kanban(request):
    serializer = EnviarAccionKanbanSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        accion = AccionSugerida.objects.get(
            id=serializer.validated_data['accion_id'], user=request.user
        )
    except AccionSugerida.DoesNotExist:
        return Response({'error': 'Acción no encontrada'}, status=404)

    if accion.enviada_kanban:
        return Response({'error': 'Esta acción ya fue enviada al Kanban',
                         'code': 'duplicado'}, status=400)

    kanban_accion = AccionKanban.objects.create(
        user=request.user,
        texto_accion=accion.texto,
        origen=AccionKanban.OrigenChoices.RUEDA_VIDA,
        estado_actual=AccionKanban.EstadoChoices.KANBAN_ACTIVO,
    )
    accion.enviada_kanban = True
    accion.kanban_accion = kanban_accion
    accion.save(update_fields=['enviada_kanban', 'kanban_accion'])

    return Response({
        'status': 'ok',
        'accion_id': accion.id,
        'kanban_accion_id': str(kanban_accion.id),
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def resumen_rueda_dashboard(request):
    try:
        diag = DiagnosticoRueda.objects.get(user=request.user)
        data = {
            'foco_1': diag.foco_1,
            'foco_2': diag.foco_2,
            'foco_3': diag.foco_3,
            'nivel_equilibrio': diag.nivel_equilibrio,
            'promedio_general': diag.promedio_general,
            'tiene_diagnostico': True,
        }
    except DiagnosticoRueda.DoesNotExist:
        data = {'tiene_diagnostico': False}

    # Include simple average from current scores
    registros = RegistroRueda.objects.filter(user=request.user).select_related('categoria').order_by('categoria__orden')
    if registros.exists():
        scores = [r.puntaje for r in registros]
        data['promedio_actual'] = round(sum(scores) / len(scores), 1)
        # Mini rueda del dashboard (spec: bloque FOCO con mini rueda visual)
        data['puntajes'] = [{'nombre': r.categoria.nombre, 'puntaje': r.puntaje} for r in registros]

    return Response(data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def ver_detalle_foco(request, area):
    diag = DiagnosticoRueda.objects.filter(user=request.user).first()
    if not diag:
        return Response({'error': 'Completa primero un diagnóstico'}, status=404)

    try:
        focus_area = FocusArea.objects.get(diagnostico=diag, area=area)
    except FocusArea.DoesNotExist:
        return Response({'error': f'Área "{area}" no encontrada en tu diagnóstico'}, status=404)

    acciones = AccionSugerida.objects.filter(user=request.user, area_foco=area)

    return Response({
        'focus_area': FocusAreaSerializer(focus_area).data,
        'acciones': AccionSugeridaSerializer(acciones, many=True).data,
        'total_acciones': acciones.count(),
        'disponibles': max(0, 20 - acciones.count()),
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def recomendar_acciones_foco(request, area):
    diag = DiagnosticoRueda.objects.filter(user=request.user).first()
    if not diag:
        return Response({'error': 'Completa primero un diagnóstico'}, status=400)

    area_names = [diag.foco_1, diag.foco_2, diag.foco_3]
    if area not in area_names:
        return Response({'error': f'"{area}" no es un área foco activa'}, status=400)

    existing_count = AccionSugerida.objects.filter(user=request.user, area_foco=area).count()
    if existing_count >= 20:
        return Response({'error': 'Focusia recomienda no generar más acciones por ahora, para evitar saturación y ayudarte a avanzar con foco.',
                         'code': 'limite_20'}, status=400)

    next_batch = (existing_count // 5) + 1
    if next_batch > 4:
        return _limite_tandas_response()

    CAT_ACCIONES = {
        'Trabajo': [
            'Revisa tu carga laboral y prioriza 3 tareas clave para esta semana',
            'Establece un bloque de 2 horas sin interrupciones para trabajo profundo',
            'Identifica una tarea que puedas delegar y asígnala a alguien del equipo',
            'Actualiza tu lista de pendientes y elimina lo que ya no aporta valor',
            'Programa una pausa activa de 10 minutos entre cada bloque de trabajo',
        ],
        'Dinero': [
            'Registra todos tus gastos de la semana para tener visibilidad financiera',
            'Revisa tus suscripciones mensuales y cancela las que no uses',
            'Destina al menos el 10 % de tus ingresos a una meta de ahorro',
            'Crea un presupuesto simple para el próximo mes',
            'Identifica un gasto hormiga y sustitúyelo por un hábito financiero sano',
        ],
        'Salud': [
            'Programa una caminata de 20 minutos al aire libre hoy',
            'Bebe 8 vasos de agua durante el día',
            'Reduce el consumo de pantallas 30 minutos antes de dormir',
            'Incorpora una porción extra de verduras en tu comida principal',
            'Duerme al menos 7 horas esta noche',
        ],
        'Pareja': [
            'Envía un mensaje inesperado a tu pareja solo para decirle que la/lo aprecias',
            'Propón una cita sencilla sin pantallas: cocinar juntos o caminar',
            'Pregunta a tu pareja cómo se siente y escucha sin interrumpir',
            'Escribe una nota con algo que agradezcas de tu relación',
            'Planeen juntos una actividad que hayan pospuesto por mucho tiempo',
        ],
        'Familia': [
            'Llama a un familiar con el que no hayas hablado en más de una semana',
            'Propón una comida familiar sin teléfonos celulares',
            'Pregunta a cada miembro de tu familia cómo fue su día',
            'Escribe un mensaje de agradecimiento a un familiar',
            'Organiza una actividad breve para hacer en familia este fin de semana',
        ],
        'Espiritualidad': [
            'Dedica 5 minutos a la meditación o respiración consciente',
            'Escribe tres cosas por las que estés agradecido hoy',
            'Lee un pasaje que te inspire o motive',
            'Sal a caminar en silencio y conecta con tu entorno',
            'Reflexiona sobre tu propósito personal y escríbelo en una frase',
        ],
        'Diversión': [
            'Escucha tu canción favorita y cántala a todo volumen',
            'Dedica 30 minutos a un hobby que hayas abandonado',
            'Ve un episodio de una serie o película que te haga reír',
            'Juega un juego de mesa o videojuego durante 20 minutos',
            'Sal a hacer algo que no hagas habitualmente: un museo, un parque, un café nuevo',
        ],
        'Entorno': [
            'Ordena tu escritorio o espacio de trabajo durante 10 minutos',
            'Abre las ventanas para ventilar tu habitación',
            'Cambia de lugar un mueble o elemento decorativo para renovar el ambiente',
            'Dona o guarda algo que ya no uses para liberar espacio',
            'Incorpora una planta o elemento natural a tu espacio',
        ],
        'Desarrollo': [
            'Lee un artículo o capítulo de un libro sobre un tema que te interese',
            'Inscríbete en un curso corto en línea (gratuito o accesible)',
            'Escribe una habilidad que te gustaría desarrollar y el primer paso para lograrlo',
            'Escucha un podcast de crecimiento personal mientras haces otra actividad',
            'Pide retroalimentación a alguien de confianza sobre tu desempeño',
        ],
        'Contribución': [
            'Realiza un acto de amabilidad al azar hoy (ayudar a alguien, ceder el paso, donar)',
            'Escribe un mensaje de agradecimiento a alguien que te haya apoyado',
            'Identifica una causa que te importe y destina 30 minutos a apoyarla',
            'Comparte un conocimiento útil con alguien de tu equipo o comunidad',
            'Ofrece tu tiempo para escuchar a alguien que lo necesite',
        ],
    }

    acciones_base = CAT_ACCIONES.get(area, [
        f'Establece una acción concreta para mejorar en {area}',
        f'Revisa tu progreso en {area} esta semana',
        f'Identifica un obstáculo en {area} y busca una solución',
        f'Consulta a un experto o referencia sobre {area}',
        f'Dedica 15 minutos a reflexionar sobre {area}',
    ])

    focus_area = FocusArea.objects.filter(diagnostico=diag, area=area).first()

    nuevas = []
    for texto in _textos_tanda(area, next_batch, acciones_base):
        if not AccionSugerida.objects.filter(
            user=request.user, area_foco=area, texto=texto
        ).exists():
            nuevas.append(AccionSugerida(
                user=request.user,
                area_foco=area,
                texto=texto,
                batch_number=next_batch,
                focus_area=focus_area,
            ))

    if nuevas:
        AccionSugerida.objects.bulk_create(nuevas)

    todas = AccionSugerida.objects.filter(user=request.user, area_foco=area)
    total = todas.count()

    return Response({
        'acciones': AccionSugeridaSerializer(todas, many=True).data,
        'total_area': total,
        'disponibles': max(0, 20 - total),
        'batch_generado': next_batch,
    })


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def eliminar_accion_rueda(request, accion_id):
    try:
        accion = AccionSugerida.objects.get(id=accion_id, user=request.user)
    except AccionSugerida.DoesNotExist:
        return Response({'error': 'Acción no encontrada'}, status=404)

    if accion.enviada_kanban:
        return Response({'error': 'No puedes eliminar una acción ya enviada al Kanban'}, status=400)

    accion.delete()
    return Response({'status': 'ok'})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def aprobar_objetivo_mensual(request):
    plan = MonthlyPlan.objects.filter(user=request.user).first()
    if not plan:
        return Response({'error': 'No hay plan mensual activo'}, status=status.HTTP_404_NOT_FOUND)
    plan.status = MonthlyPlan.Status.APROBADA
    plan.approved_at = timezone.now()
    plan.save()
    plan.goals.all().update(status=MonthlyGoal.Status.APROBADA)
    return Response(MonthlyPlanSerializer(plan).data)


class DelegationViewSet(IsMineOrReadOnly, viewsets.GenericViewSet):
    serializer_class = DelegationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        now = timezone.now()
        return Delegation.objects.filter(
            models.Q(delegator=self.request.user) | models.Q(delegate=self.request.user),
            models.Q(expires_at__isnull=True) | models.Q(expires_at__gt=now),
        )

    def list(self, request):
        qs = self.get_queryset()
        sent = qs.filter(delegator=request.user)
        received = qs.filter(delegate=request.user)
        return Response({
            'sent': DelegationSerializer(sent, many=True).data,
            'received': DelegationSerializer(received, many=True).data,
        })

    def create(self, request):
        task_id = request.data.get('task_id')
        email = request.data.get('email')
        message = request.data.get('message', '')

        if not task_id or not email:
            return Response({'error': 'task_id y email requeridos'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            task = KanbanTask.objects.get(id=task_id, user=request.user)
        except KanbanTask.DoesNotExist:
            return Response({'error': 'Tarea no encontrada'}, status=status.HTTP_404_NOT_FOUND)

        delegate = User.objects.filter(email=email).first()
        token = secrets.token_urlsafe(32)

        delegation = Delegation.objects.create(
            task=task,
            delegator=request.user,
            delegate=delegate if delegate else request.user,
            delegate_email=email,
            message=message,
            token=token,
            expires_at=timezone.now() + timedelta(hours=72),
        )

        log_security_event(request.user, 'delegation_created', f'task={task_id} email={email}')

        if delegate:
            Notification.objects.create(
                user=delegate,
                type='delegation',
                title=f'{request.user.username} te delegó una tarea',
                message=task.titulo,
                data={'delegation_id': delegation.id, 'token': token}
            )

        delegation_link = f'/delegation/{token}'
        return Response({
            'token': token,
            'delegate_email': email,
            'delegate_registered': delegate is not None,
            'delegation_link': delegation_link
        })

    def retrieve(self, request, pk=None):
        delegation = Delegation.objects.filter(token=pk).first()
        if not delegation:
            return Response({'error': 'Delegación no encontrada'}, status=status.HTTP_404_NOT_FOUND)
        if delegation.expires_at and delegation.expires_at < timezone.now():
            return Response({'error': 'Delegación expirada'}, status=status.HTTP_410_GONE)
        serializer = DelegationSerializer(delegation)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='(?P<token>[^/.]+)')
    def handle_action(self, request, token=None):
        delegation = Delegation.objects.filter(token=token).first()
        if not delegation:
            return Response({'error': 'Delegación no encontrada'}, status=status.HTTP_404_NOT_FOUND)
        if delegation.expires_at and delegation.expires_at < timezone.now():
            return Response({'error': 'Delegación expirada'}, status=status.HTTP_410_GONE)

        action = request.data.get('action')
        if action == 'accept':
            delegation.status = 'accepted'
        elif action == 'reject':
            delegation.status = 'rejected'
        elif action == 'complete':
            delegation.status = 'completed'
        else:
            return Response({'error': 'Acción no válida'}, status=status.HTTP_400_BAD_REQUEST)

        delegation.save()
        log_security_event(request.user, f'delegation_{action}', f'token={token}')
        return Response(DelegationSerializer(delegation).data)


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Doc 27 §2.7: la campana solo muestra avisos vigentes. Los postergados
        # aparecen acá aunque su entrega externa esté esperando una franja.
        return Notification.objects.filter(
            user=self.request.user,
            in_bell=True,
            cancelled_at__isnull=True,
        )

    @action(detail=True, methods=['post'])
    def leer(self, request, pk=None):
        """Marca una notificación como leída."""
        notificacion = self.get_object()
        if not notificacion.is_read:
            notificacion.is_read = True
            notificacion.save(update_fields=['is_read'])
        return Response({'ok': True, 'is_read': True})

    @action(detail=False, methods=['post'], url_path='leer-todas')
    def leer_todas(self, request):
        """Marca como leídas las del usuario (el panel lo hace al abrirse)."""
        actualizadas = self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'ok': True, 'actualizadas': actualizadas})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def pending_invitations(request):
    invitations = Invitation.objects.filter(email=request.user.email, status='pending')
    serializer = InvitationSerializer(invitations, many=True)
    return Response(serializer.data)


class MetaAnualViewSet(BaseUserViewSet):
    queryset = MetaAnual.objects.all()
    serializer_class = MetaAnualSerializer


class GranMetaAnualViewSet(BaseUserViewSet):
    queryset = GranMetaAnual.objects.all()
    serializer_class = GranMetaAnualSerializer

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    @action(detail=False, methods=['get'], url_path='eligibility')
    def eligibility(self, request):
        diagnostico = DiagnosticoRueda.objects.filter(user=request.user).first()
        has_diagnostico = diagnostico is not None
        is_completed = has_diagnostico and diagnostico.status == DiagnosticoRueda.Status.COMPLETED
        return Response(GranMetaAnualEligibilitySerializer({
            'eligible': is_completed,
            'has_diagnostico': has_diagnostico,
            'diagnostico_status': diagnostico.status if diagnostico else '',
            'message': (
                'Puedes crear tu Gran Meta Anual.'
                if is_completed
                else 'Completa el diagnóstico de la Rueda de la Vida primero.'
                if not has_diagnostico
                else 'El diagnóstico de la Rueda de la Vida aún no está completado.'
            ),
        }).data)

    @action(detail=True, methods=['post'], url_path='answer')
    def answer(self, request, pk=None):
        try:
            meta = GranMetaAnual.objects.get(pk=pk, user=request.user)
        except GranMetaAnual.DoesNotExist:
            return Response({'detail': 'Meta no encontrada'}, status=status.HTTP_404_NOT_FOUND)

        serializer = GranMetaAnualAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        qn = serializer.validated_data['question_number']
        text = serializer.validated_data['answer_text']

        step_map = {1: 'question_1', 2: 'question_2', 3: 'question_3'}
        step = step_map[qn]

        AnnualGoalConversationTurn.objects.create(
            goal=meta, role='user', step=step, content=text
        )

        validations = [
            'Gracias, {name}. Esta respuesta nos ayuda a construir una meta más clara y conectada contigo.',
            'Entendido, {name}. Cada respuesta acerca más tu meta a lo que realmente necesitas.',
            'Gracias, {name}. Este detalle hará que tu meta sea más poderosa y auténtica.',
        ]
        idx = min(qn - 1, len(validations) - 1)
        reply = validations[idx].format(name=request.user.first_name or request.user.username)

        AnnualGoalConversationTurn.objects.create(
            goal=meta, role='avatar', step=f'validation_{qn}', content=reply
        )

        setattr(meta, f'answer_{["transformation_area", "desired_result", "expected_impact"][qn - 1]}', text)
        meta.save(update_fields=[f'answer_{["transformation_area", "desired_result", "expected_impact"][qn - 1]}'])

        return Response({'validation': reply, 'step': step})

    @action(detail=False, methods=['get'], url_path='current')
    def current(self, request):
        meta = self.get_queryset().filter(is_active=True).first()
        if not meta:
            return Response({'detail': 'No hay una meta activa'}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.get_serializer(meta)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='history')
    def history(self, request):
        metas = self.get_queryset().order_by('-version', '-creado')
        page = self.paginate_queryset(metas)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(metas, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='generar-smart')
    def generar_smart(self, request):
        serializer = GranMetaAnualGenerarSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        rueda_context = data.get('rueda_data', [])
        rueda_summary = ', '.join([f"{r.get('nombre', '?')}: {r.get('puntaje', '?')}/10" for r in rueda_context]) if rueda_context else 'No disponible'

        # Spec §9: la IA también debe considerar las 3 áreas foco y los comentarios de la Rueda
        focos_list = []
        comentarios_list = []
        try:
            diag = DiagnosticoRueda.objects.filter(user=request.user).order_by('-creado').first()
            if diag:
                focos_list = [f for f in [diag.foco_1, diag.foco_2, diag.foco_3] if f]
            regs = RegistroRueda.objects.filter(user=request.user).select_related('categoria')
            for r in regs:
                if (r.comentario or '').strip():
                    comentarios_list.append(f"{r.categoria.nombre}: {r.comentario.strip()}")
        except Exception:
            pass
        focos_summary = ', '.join(focos_list) if focos_list else 'No disponible'
        comentarios_summary = ' | '.join(comentarios_list) if comentarios_list else 'Sin comentarios'

        prompt = f"""Eres un coach de vida experto en metas SMART. Genera una Gran Meta Anual SMART basada en:

Área de vida a transformar: {data['area']}
Gran resultado deseado: {data['resultado']}
Impacto emocional: {data['impacto']}
Rueda de la Vida del usuario: {rueda_summary}
Tres áreas foco del diagnóstico: {focos_summary}
Comentarios del usuario en la Rueda de la Vida: {comentarios_summary}

Responde EXACTAMENTE en este formato JSON (sin markdown, sin ```):
{{
  "texto_meta": "Descripción completa de la meta anual en una oración clara",
  "frase_resumen": "Frase motivacional corta (máx 15 palabras)",
  "S": "Específica: qué exactamente lograrás",
  "M": "Medible: cómo medirás el progreso",
  "A": "Alcanzable: por qué es realista para ti",
  "R": "Relevante": por qué esto importa en tu vida",
  "T": "Temporal": fecha límite o plazo"
}}"""

        smart_result = {'texto_meta': '', 'frase_resumen': '', 'S': '', 'M': '', 'A': '', 'R': '', 'T': ''}

        try:
            api_key = getattr(settings, 'GROQ_API_KEY', '') or ''
            if api_key:
                payload = json.dumps({
                    "model": "openai/gpt-oss-120b",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.7,
                    "max_tokens": 1000,
                }).encode('utf-8')

                req = urllib.request.Request(
                    'https://api.groq.com/openai/v1/chat/completions',
                    data=payload,
                    headers={
                        'Authorization': f'Bearer {api_key}',
                        'Content-Type': 'application/json',
                        'User-Agent': 'curl/8.4.0',
                    },
                )
                with urllib.request.urlopen(req, timeout=30) as resp:
                    result = json.loads(resp.read().decode('utf-8'))
                    content = result['choices'][0]['message']['content']
                    smart_result = json.loads(content)
            else:
                smart_result = {
                    "texto_meta": f"Lograr {data['resultado']} en el área de {data['area']} para generar {data['impacto']}",
                    "frase_resumen": f"Transformar mi {data['area']} logrando {data['resultado']}",
                    "S": f"Lograr específicamente: {data['resultado']}",
                    "M": "Mediré el progreso con hitos mensuales y evaluación trimestral",
                    "A": f"Es alcanzable porque estoy comprometido/a con mi {data['area']}",
                    "R": f"Es relevante porque transformará mi {data['area']} y mi bienestar general",
                    "T": "Lograrlo antes del 31 de diciembre de este año",
                }
        except Exception as e:
            logger.error(f'Error generando SMART: {e}')
            smart_result = {
                "texto_meta": f"Lograr {data['resultado']} en {data['area']}",
                "frase_resumen": f"Meta: {data['resultado']}",
                "S": data['resultado'],
                "M": "Con hitos mensuales",
                "A": f"Comprometido con {data['area']}",
                "R": data['impacto'],
                "T": "31 de diciembre",
            }

        return Response(smart_result)

    @action(detail=True, methods=['patch'], url_path='editar-smart')
    def editar_smart(self, request, pk=None):
        try:
            meta = GranMetaAnual.objects.get(pk=pk, user=request.user)
        except GranMetaAnual.DoesNotExist:
            return Response({'detail': 'Meta no encontrada'}, status=status.HTTP_404_NOT_FOUND)

        comment = request.data.get('comment', '')
        if not comment:
            return Response({'detail': 'Se requiere un comentario'}, status=status.HTTP_400_BAD_REQUEST)

        AnnualGoalConversationTurn.objects.create(
            goal=meta, role='user', step='edit_prompt', content=comment
        )

        meta.status = GranMetaAnual.Status.RECONSTRUYENDO
        meta.edit_instruction = comment
        meta.save()

        context_text = f"""Meta anterior: {meta.generated_goal_text}
Desglose anterior: {json.dumps(meta.smart_breakdown)}
Solicitud de cambio: {comment}

Reconstruye la meta SMART aplicando este cambio."""

        smart_result = {
            'texto_meta': meta.generated_goal_text,
            'frase_resumen': meta.smart_breakdown.get('frase_resumen', ''),
            'S': meta.smart_breakdown.get('S', ''),
            'M': meta.smart_breakdown.get('M', ''),
            'A': meta.smart_breakdown.get('A', ''),
            'R': meta.smart_breakdown.get('R', ''),
            'T': meta.smart_breakdown.get('T', ''),
        }

        try:
            api_key = getattr(settings, 'GROQ_API_KEY', '') or ''
            if api_key:
                payload = json.dumps({
                    "model": "openai/gpt-oss-120b",
                    "messages": [{"role": "user", "content": f"Reconstruye esta meta SMART aplicando el cambio del usuario:\n{context_text}\n\nResponde EXACTAMENTE en formato JSON (sin markdown): {{\"texto_meta\": \"...\", \"frase_resumen\": \"...\", \"S\": \"...\", \"M\": \"...\", \"A\": \"...\", \"R\": \"...\", \"T\": \"...\"}}"}],
                    "temperature": 0.7,
                    "max_tokens": 1000,
                }).encode('utf-8')

                req = urllib.request.Request(
                    'https://api.groq.com/openai/v1/chat/completions',
                    data=payload,
                    headers={
                        'Authorization': f'Bearer {api_key}',
                        'Content-Type': 'application/json',
                        'User-Agent': 'curl/8.4.0',
                    },
                )
                with urllib.request.urlopen(req, timeout=30) as resp:
                    result = json.loads(resp.read().decode('utf-8'))
                    content = result['choices'][0]['message']['content']
                    smart_result = json.loads(content)
        except Exception as e:
            logger.error(f'Error reconstruyendo SMART: {e}')

        meta.generated_goal_text = smart_result.get('texto_meta', meta.generated_goal_text)
        meta.smart_breakdown = {
            'frase_resumen': smart_result.get('frase_resumen', ''),
            'S': smart_result.get('S', ''),
            'M': smart_result.get('M', ''),
            'A': smart_result.get('A', ''),
            'R': smart_result.get('R', ''),
            'T': smart_result.get('T', ''),
        }
        meta.status = GranMetaAnual.Status.PROPUESTA
        meta.save()

        AnnualGoalConversationTurn.objects.create(
            goal=meta, role='avatar', step='edit_reply', content=meta.generated_goal_text
        )

        return Response(smart_result)

    @action(detail=False, methods=['post'], url_path='borrador')
    def borrador(self, request):
        texto_meta = request.data.get('texto_meta', '')
        frase_resumen = request.data.get('frase_resumen', '')
        desglose_smart = request.data.get('desglose_smart', {})
        respuestas = request.data.get('respuestas', {})

        # Spec §18: el historial conserva versiones; la nueva parte de max+1
        ultima_version = GranMetaAnual.objects.filter(user=request.user).aggregate(
            models.Max('version'))['version__max'] or 0

        meta = GranMetaAnual.objects.create(
            user=request.user,
            generated_goal_text=texto_meta,
            smart_breakdown={
                'frase_resumen': frase_resumen,
                **desglose_smart,
            },
            raw_responses=respuestas,
            status=GranMetaAnual.Status.PROPUESTA,
            version=ultima_version + 1,
        )

        return Response(GranMetaAnualSerializer(meta).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='aprobar')
    def aprobar(self, request, pk=None):
        try:
            meta = GranMetaAnual.objects.get(pk=pk, user=request.user)
        except GranMetaAnual.DoesNotExist:
            return Response({'detail': 'Meta no encontrada'}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            GranMetaAnual.objects.filter(user=request.user, is_active=True).exclude(pk=meta.pk).update(
                status=GranMetaAnual.Status.SUPERSEDIDA, is_active=False
            )
            meta.status = GranMetaAnual.Status.APROBADA
            meta.is_active = True
            meta.approved_at = timezone.now()
            meta.save()

            # §23 doc MENSUAL: si la Gran Meta Anual cambia, las Metas
            # Mensuales aprobadas quedan pendientes de revisión/regeneración.
            MonthlyPlan.objects.filter(
                user=request.user, status=MonthlyPlan.Status.APROBADA
            ).update(status=MonthlyPlan.Status.PENDIENTE_REVISION)

            MetaAnual.objects.update_or_create(
                user=request.user,
                aprobada=True,
                defaults={
                    'titulo': meta.generated_goal_text[:255],
                    'descripcion': meta.generated_goal_text,
                    'fecha_inicio': timezone.now().date(),
                    'fecha_fin': timezone.now().date().replace(year=timezone.now().year + 1),
                    'aprobada': True,
                }
            )

        AnnualGoalConversationTurn.objects.create(
            goal=meta, role='avatar', step='approval',
            content=f'Felicitaciones, {request.user.first_name or request.user.username}. Acabas de definir una dirección clara para tu año.'
        )

        return Response(GranMetaAnualSerializer(meta).data)


class MonthlyPlanViewSet(BaseUserViewSet):
    queryset = MonthlyPlan.objects.all()
    serializer_class = MonthlyPlanSerializer

    def get_serializer_class(self):
        if self.action == 'generate':
            return MonthlyGenerateSerializer
        return super().get_serializer_class()

    @action(detail=False, methods=['get'], url_path='check')
    def check_status(self, request):
        plan = MonthlyPlan.objects.filter(user=request.user).first()
        return Response({
            'has_plan': plan is not None,
            'has_monthly_plan': plan is not None,
            'plan_id': plan.id if plan else None,
            'status': plan.status if plan else None,
        })

    @action(detail=False, methods=['post'], url_path='generate')
    def generate(self, request):
        serializer = MonthlyGenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        start_month = data['cycle_start_month']
        start_year = data['cycle_start_year']

        # §5: sin Gran Meta Anual aprobada no se permite crear Metas Mensuales.
        meta_anual = MetaAnual.objects.filter(user=request.user, aprobada=True).order_by('-creado').first()
        gran_meta = GranMetaAnual.objects.filter(user=request.user, is_active=True).order_by('-actualizado').first()
        annual_titulo = ''
        if gran_meta and gran_meta.generated_goal_text:
            annual_titulo = gran_meta.generated_goal_text.strip()
        if not annual_titulo and meta_anual and meta_anual.titulo:
            annual_titulo = meta_anual.titulo.strip()
        if not annual_titulo:
            return Response(
                {'error': 'Para crear tus Metas Mensuales, primero debes aprobar tu Gran Meta Anual.',
                 'code': 'sin_gran_meta'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # §6: contexto interno (no se muestra saturando la tarjeta).
        diagnostico = DiagnosticoRueda.objects.filter(user=request.user).order_by('-actualizado').first()
        focos = []
        if diagnostico:
            focos = [f for f in [diagnostico.foco_1, diagnostico.foco_2, diagnostico.foco_3] if f]
        respuestas = []
        if gran_meta:
            for r in [gran_meta.answer_transformation_area, gran_meta.answer_desired_result,
                      gran_meta.answer_expected_impact]:
                if r and r.strip():
                    respuestas.append(r.strip())
        annual_corto = annual_titulo[:90]

        # Desactivar plan anterior no-aprobado si existe
        MonthlyPlan.objects.filter(user=request.user).exclude(status=MonthlyPlan.Status.APROBADA).delete()

        plan = MonthlyPlan.objects.create(
            user=request.user,
            annual_goal=meta_anual,
            cycle_start_month=start_month,
            cycle_start_year=start_year,
            status=MonthlyPlan.Status.PROPUESTA,
        )

        # Generar 12 metas con niveles de complejidad progresivos
        complexity_cycle = ['BASE', 'BASE', 'EJECUCION', 'EJECUCION', 'CONSOLIDACION', 'CONSOLIDACION',
                            'CONSOLIDACION', 'CONSOLIDACION', 'CIERRE', 'CIERRE', 'CIERRE', 'CIERRE']
        month_templates = [
            ('Diagnóstico y organización', 'Analizar situación actual, definir métricas base y organizar recursos'),
            ('Planificación detallada', 'Desglosar la meta anual en acciones mensurables y establecer hitos claros'),
            ('Primeros pasos operativos', 'Ejecutar las actividades fundacionales que habilitan el resto del plan'),
            ('Consolidación de procesos', 'Reforzar hábitos y procesos iniciados en los primeros meses'),
            ('Profundización estratégica', 'Expandir el alcance de las acciones con mayor enfoque en resultados'),
            ('Optimización de recursos', 'Identificar y corregir desviaciones en tiempo y recursos'),
            ('Escalabilidad y crecimiento', 'Aplicar mejoras para escalar resultados de forma sostenida'),
            ('Innovación y ajuste fino', 'Incorporar nuevas estrategias basadas en aprendizajes adquiridos'),
            ('Revisión y cierre parcial', 'Evaluar metas cumplidas y preparar el cierre del ciclo'),
            ('Consolidación de logros', 'Asegurar que los logros sean sostenibles y medibles'),
            ('Preparación de cierre', 'Documentar resultados, lecciones aprendidas y preparar informe final'),
            ('Cierre y proyección anual', 'Cerrar el ciclo con una evaluación completa y proyectar el próximo año'),
        ]

        for i in range(12):
            cal_month = ((start_month - 1 + i) % 12) + 1
            cal_year = start_year + ((start_month - 1 + i) // 12)
            base_texto, base_justify = month_templates[i]
            # Personalización §6/§21: la meta anual y los focos tiñen la
            # redacción; las respuestas del usuario orientan el porqué.
            # Cada trimestre rota un área foco (base→ejecución→consolidación→cierre).
            foco_txt = focos[(i // 3) % len(focos)] if focos else ''
            goal_text = f'{base_texto} hacia "{annual_corto}"' if annual_corto else base_texto
            brief = base_justify
            if respuestas and i % 4 == 1:
                brief = f'{base_justify} Parte de tu motivación: {respuestas[(i // 4) % len(respuestas)][:120]}.'
            if foco_txt and i % 3 == 2:
                brief = f'{brief} Con foco en {foco_txt}.'
            relation = f'Aporta directamente a tu Gran Meta Anual: {annual_titulo[:160]}.'
            MonthlyGoal.objects.create(
                plan=plan,
                month_order=i + 1,
                calendar_month=cal_month,
                calendar_year=cal_year,
                monthly_goal_text=goal_text[:500],
                brief_explanation=brief,
                annual_goal_relation=relation,
                complexity_level=complexity_cycle[i],
                status=MonthlyGoal.Status.PROPUESTA,
            )

        # Recargar con relaciones
        plan = MonthlyPlan.objects.prefetch_related('goals').get(pk=plan.pk)
        return Response(MonthlyPlanSerializer(plan).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        plan = self.get_object()
        plan.status = MonthlyPlan.Status.APROBADA
        plan.approved_at = timezone.now()
        plan.save()
        plan.goals.all().update(status=MonthlyGoal.Status.APROBADA)
        return Response(MonthlyPlanSerializer(plan).data)

    @action(detail=False, methods=['post'], url_path='approve')
    def approve_current(self, request):
        plan = MonthlyPlan.objects.filter(user=request.user).first()
        if not plan:
            return Response({'error': 'No hay plan mensual activo'}, status=status.HTTP_404_NOT_FOUND)
        plan.status = MonthlyPlan.Status.APROBADA
        plan.approved_at = timezone.now()
        plan.save()
        plan.goals.all().update(status=MonthlyGoal.Status.APROBADA)
        return Response(MonthlyPlanSerializer(plan).data)


class MonthlyGoalViewSet(BaseUserViewSet):
    queryset = MonthlyGoal.objects.all()
    serializer_class = MonthlyGoalSerializer

    def get_queryset(self):
        return self.queryset.filter(plan__user=self.request.user)

    def partial_update(self, request, *args, **kwargs):
        goal = self.get_object()
        serializer = self.get_serializer(goal, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # Marcar como editada por usuario
        goal.refresh_from_db()
        goal.edited_by_user = True
        goal.version += 1
        if goal.status == MonthlyGoal.Status.PROPUESTA:
            goal.status = MonthlyGoal.Status.EDITADA
        goal.save()

        return Response(MonthlyGoalSerializer(goal).data)


class ObjetivoMensualViewSet(BaseUserViewSet):
    queryset = ObjetivoMensual.objects.all()
    serializer_class = ObjetivoMensualSerializer


class PropuestaIAViewSet(BaseUserViewSet):
    queryset = PropuestaIA.objects.all()
    serializer_class = PropuestaIASerializer

    @action(detail=True, methods=['post'])
    def decidir(self, request, pk=None):
        propuesta = self.get_object()
        decision = request.data.get('decision')
        if decision not in ('aplicar', 'revisar', 'mantener', 'ignorado'):
            return Response({'error': 'Decisión no válida'}, status=status.HTTP_400_BAD_REQUEST)
        engine = DecisionEngine()
        resultado = engine.procesar_decision(propuesta.id, decision)
        return Response(PropuestaIASerializer(propuesta).data)

    @action(detail=True, methods=['post'])
    def marcar_leida(self, request, pk=None):
        propuesta = self.get_object()
        propuesta.leida = True
        propuesta.save()
        return Response(PropuestaIASerializer(propuesta).data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def registrar_interaccion(request):
    serializer = InteraccionUsuarioSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    interaccion = serializer.save(user=request.user)
    return Response(InteraccionUsuarioSerializer(interaccion).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def marcar_video_visto(request):
    config, _ = ConfiguracionUsuario.objects.get_or_create(user=request.user)
    config.video_inicial_visto = True
    config.save(update_fields=['video_inicial_visto'])
    return Response({'video_inicial_visto': True})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def registrar_ingreso_hub(request):
    config, _ = ConfiguracionUsuario.objects.get_or_create(user=request.user)
    from django.utils import timezone
    config.ultimo_ingreso = timezone.now()
    config.conteo_ingresos_hub = (config.conteo_ingresos_hub or 0) + 1
    config.save(update_fields=['ultimo_ingreso', 'conteo_ingresos_hub'])
    return Response({'ultimo_ingreso': config.ultimo_ingreso.isoformat() if config.ultimo_ingreso else None, 'conteo_ingresos': config.conteo_ingresos_hub})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def ejecutar_motor_decision(request):
    """
    Endpoint manual para ejecutar el motor de decisión para el usuario autenticado.
    Se puede llamar desde un cron/tarea programada o manualmente.
    """
    engine = DecisionEngine()
    resultado = engine.ejecutar_ciclo(request.user)
    return Response(resultado)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def analizar_contexto(request):
    """
    Endpoint principal del motor central de IA de Focusia.
    Recibe contexto JSON (meta_anual, metricas_ejecucion, historial_alertas,
    tareas_detalladas_backlog) y retorna intervención estructurada según
    el árbol de decisiones IF/THEN de la especificación del sistema.

    Casos en orden de prioridad: A (ESTRATÉGICO_CRÍTICO) → B (ESTRUCTURAL_SATURACIÓN) → C (PRIORIDAD_REORGANIZACIÓN)
    """
    serializer = ContextoAnalisisInputSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    meta_anual = data.get('meta_anual')
    historial = data.get('historial_alertas', {})

    # ─── FILTRO DE VIABILIDAD ─────────────────────────────────
    if not meta_anual or not meta_anual.get('id'):
        return Response({
            'intervencion_necesaria': False,
            'tipo_alerta_detectada': None,
            'payload': None,
        })

    if not historial.get('ultima_alerta_respondida', True):
        return Response({
            'intervencion_necesaria': False,
            'tipo_alerta_detectada': None,
            'payload': None,
        })

    # ─── DETECCIÓN (prioridad A → B → C) ──────────────────────
    metricas = data.get('metricas_ejecucion', {})
    tareas = data.get('tareas_detalladas_backlog', [])

    # CASO A: ESTRATÉGICO_CRÍTICO
    tareas_conectadas = [t for t in tareas if t.get('conectada_a_meta_anual')]
    if len(tareas_conectadas) >= 3:
        tipo_alerta = 'ESTRATÉGICO_CRÍTICO'
        tipo_impacto = 'estrategico_critico'
    # CASO B: ESTRUCTURAL_SATURACIÓN
    elif (metricas.get('horas_planificadas', 0)
          > metricas.get('horas_disponibles_reales', 1) * 1.30
          and metricas.get('tasa_cumplimiento_48h', 1) < 0.60):
        tipo_alerta = 'ESTRUCTURAL_SATURACIÓN'
        tipo_impacto = 'estructural'
    # CASO C: PRIORIDAD_REORGANIZACIÓN
    elif metricas.get('tareas_backlog', 0) >= 5:
        tipo_alerta = 'PRIORIDAD_REORGANIZACIÓN'
        tipo_impacto = 'de_prioridad'
    else:
        return Response({
            'intervencion_necesaria': False,
            'tipo_alerta_detectada': None,
            'payload': None,
        })

    # ─── GENERAR PAYLOAD (Groq o defaults) ────────────────────
    payload = generar_payload_coach(
        user=request.user,
        tipo_impacto=tipo_impacto,
        tipo_alerta=tipo_alerta,
        meta_anual=meta_anual,
        metricas=metricas,
        tareas=tareas,
    )

    # ─── PERSISTIR PROPUESTA ──────────────────────────────────
    analisis = payload.get('bloque_3_interpretacion_ia', {})
    vector = analisis.get('analisis_vector', {})
    acciones = payload.get('bloque_4_acciones_disponibles', [])

    propuesta = PropuestaIA.objects.create(
        user=request.user,
        tipo_impacto=tipo_impacto,
        situacion_clara=payload.get('bloque_1_impacto_inmediato', {}).get('mensaje_gancho', ''),
        explicacion_impacto=vector.get('significado_avance', ''),
        propuesta_ajuste=acciones[0].get('texto_boton', '') if acciones else '',
        fase_detectada=f'CASO {tipo_alerta}',
        resultado_json={
            'intervencion_necesaria': True,
            'tipo_alerta_detectada': tipo_alerta,
            'payload': payload,
        },
    )

    return Response({
        'intervencion_necesaria': True,
        'tipo_alerta_detectada': tipo_alerta,
        'payload': payload,
        'propuesta_id': propuesta.id,
    })


class MatrizEisenhowerViewSet(BaseUserViewSet):
    queryset = MatrizEisenhower.objects.all()
    serializer_class = MatrizEisenhowerSerializer

    def get_queryset(self):
        return MatrizEisenhower.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get', 'patch'])
    def progress(self, request):
        obj, created = MatrizEisenhower.objects.get_or_create(user=request.user)
        if created and not obj.started_at:
            # §14: el primer contacto deja el módulo "en progreso" con inicio fechado.
            obj.started_at = timezone.now()
            if obj.status == MatrizEisenhower.EstadoChoices.INCOMPLETO:
                obj.status = MatrizEisenhower.EstadoChoices.EN_PROGRESO
            obj.save(update_fields=['started_at', 'status', 'actualizado'])
        if request.method == 'GET':
            return Response(MatrizEisenhowerSerializer(obj).data)
        serializer = MatrizEisenhowerSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        if 'status' in request.data and request.data['status'] == 'COMPLETADO':
            obj.completed_at = timezone.now()
        serializer.save()
        return Response(MatrizEisenhowerSerializer(obj).data)


class ConfiguracionViewSet(BaseUserViewSet):
    queryset = ConfiguracionUsuario.objects.all()
    serializer_class = ConfiguracionUsuarioSerializer

    def get_queryset(self):
        return ConfiguracionUsuario.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get', 'patch'])
    def mi_config(self, request):
        config, created = ConfiguracionUsuario.objects.get_or_create(user=request.user)
        if request.method == 'GET':
            return Response(ConfiguracionUsuarioSerializer(config).data)
        serializer = ConfiguracionUsuarioSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ActivacionViewSet(BaseUserViewSet):
    queryset = Activacion.objects.all()
    serializer_class = ActivacionSerializer

    @action(detail=False, methods=['get'])
    def pendientes(self, request):
        qs = self.get_queryset().filter(estado__in=['pendiente', 'enviada'])
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def marcar_vista(self, request, pk=None):
        activacion = self.get_object()
        from django.utils import timezone
        activacion.estado = 'vista'
        activacion.leida_en = timezone.now()
        activacion.save()
        return Response(ActivacionSerializer(activacion).data)

    @action(detail=True, methods=['post'])
    def marcar_respondida(self, request, pk=None):
        activacion = self.get_object()
        from django.utils import timezone
        activacion.estado = 'respondida'
        activacion.respondida_en = timezone.now()
        activacion.save()
        return Response(ActivacionSerializer(activacion).data)


def log_security_event(user, action, detail=''):
    logger.info(f'[SECURITY] user={user.id} action={action} detail={detail}')


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def ai_mission(request):
    serializer = AiMissionSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    prompt = serializer.validated_data['prompt']

    api_key = settings.GROQ_API_KEY
    if not api_key:
        return Response({'error': 'GROQ_API_KEY no configurada'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    try:
        body = json.dumps({
            'model': 'openai/gpt-oss-120b',
            'messages': [{'role': 'user', 'content': prompt}],
        }).encode()
        req = urllib.request.Request(
            'https://api.groq.com/openai/v1/chat/completions',
            data=body,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {api_key}',
                'User-Agent': 'Mozilla/5.0',
            },
            method='POST',
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
        text = data['choices'][0]['message']['content']
        return Response({'text': text})
    except Exception as e:
        logger.exception('Error calling Groq API')
        return Response({'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def delegation_by_token(request, token):
    delegation = Delegation.objects.filter(token=token).first()
    if not delegation:
        return Response({'error': 'Delegación no encontrada'}, status=status.HTTP_404_NOT_FOUND)
    if delegation.expires_at and delegation.expires_at < timezone.now():
        return Response({'error': 'Delegación expirada'}, status=status.HTTP_410_GONE)
    serializer = DelegationSerializer(delegation)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def progreso_actividades(request):
    user = request.user
    today = timezone.localdate()

    kanban_qs = KanbanTask.objects.filter(user=user)
    kanban_legacy_total = kanban_qs.count()
    kanban_completadas = kanban_qs.filter(columna='Hecho').count()

    # Bandeja visible del Kanban Backlog (AccionKanban en KANBAN_ACTIVO).
    # Se suma al total para que el % coincida con lo que el agente reporta
    # y con lo que el usuario ve en la bandeja.
    backlog_total = AccionKanban.objects.filter(
        user=user, estado_actual=AccionKanban.EstadoChoices.KANBAN_ACTIVO
    ).count()
    kanban_total = kanban_legacy_total + backlog_total

    timeblock_qs = TimeBlock.objects.filter(user=user, fecha=today)
    timeblock_total = timeblock_qs.exclude(tarea='').count()
    timeblock_completadas = timeblock_qs.filter(estado='done').exclude(tarea='').count()

    action_qs = Action.objects.filter(weekly_plan__user=user)
    action_total = action_qs.count()
    action_completadas = action_qs.filter(status=Action.ActionStatus.COMPLETADA).count()

    total = kanban_total + timeblock_total + action_total
    completadas = kanban_completadas + timeblock_completadas + action_completadas
    porcentaje = round((completadas / total) * 100) if total > 0 else 0

    return Response({
        'completadas': completadas,
        'total': total,
        'porcentaje': porcentaje,
        'detalle': {
            'kanban': {'total': kanban_total, 'completadas': kanban_completadas, 'backlog_bandeja': backlog_total},
            'timeblock': {'total': timeblock_total, 'completadas': timeblock_completadas},
            'action': {'total': action_total, 'completadas': action_completadas},
        },
    })


class AccionKanbanViewSet(BaseUserViewSet):
    queryset = AccionKanban.objects.all()
    serializer_class = AccionKanbanSerializer

    def get_serializer_class(self):
        if self.action == 'create':
            return AccionKanbanCreateSerializer
        return AccionKanbanSerializer

    def get_queryset(self):
        return self.queryset.filter(
            user=self.request.user,
            estado_actual=AccionKanban.EstadoChoices.KANBAN_ACTIVO,
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save(
            user=self.request.user,
            estado_actual=AccionKanban.EstadoChoices.KANBAN_ACTIVO,
        )
        HistorialMovimiento.objects.create(
            accion=instance,
            estado_anterior='',
            estado_nuevo=AccionKanban.EstadoChoices.KANBAN_ACTIVO,
            clasificacion_anterior=None,
            clasificacion_nueva=None,
        )
        # §17.5: advertir si ya existe una acción activa muy similar, sin bloquear.
        similar_exists = AccionKanban.objects.filter(
            user=request.user,
            estado_actual=AccionKanban.EstadoChoices.KANBAN_ACTIVO,
            texto_accion__iexact=(instance.texto_accion or '').strip(),
        ).exclude(pk=instance.pk).exists()
        output_serializer = AccionKanbanSerializer(instance)
        data = dict(output_serializer.data)
        data['similar_warning'] = similar_exists
        return Response(data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'], url_path='clasificar')
    def clasificar(self, request, pk=None):
        try:
            accion = AccionKanban.objects.get(pk=pk, user=request.user)
        except AccionKanban.DoesNotExist:
            return Response(
                {'detail': 'Acción no encontrada'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if accion.estado_actual != AccionKanban.EstadoChoices.KANBAN_ACTIVO:
            return Response(
                {'detail': 'Esta acción ya no está en el Kanban activo'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ClasificarAccionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        clasificacion = serializer.validated_data['clasificacion']
        destino_planificacion = serializer.validated_data.get('destino_planificacion')
        fecha_seleccionada = serializer.validated_data.get('fecha_seleccionada')
        hora_seleccionada = serializer.validated_data.get('hora_seleccionada')

        if clasificacion == 'H':
            from datetime import date as _date
            fecha_agenda = fecha_seleccionada or _date.today()
            if not hora_seleccionada:
                return Response(
                    {'detail': 'La hora es obligatoria para enviar una acción a la agenda diaria.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            error = self._validar_bloque_libre(request.user, fecha_agenda, hora_seleccionada, accion.pk)
            if error:
                return Response({'detail': error}, status=status.HTTP_400_BAD_REQUEST)

        estado_anterior = accion.estado_actual
        clasificacion_anterior = accion.clasificacion

        with transaction.atomic():
            accion.clasificacion = clasificacion
            lado = {
                'actions': [],
                'objetivos_semanales': [],
                'objetivos_mensuales': [],
                'metas_anuales': [],
                'kanbantask_creados': [],
            }
            # Fecha elegida por el usuario en la bandeja (fallback: hoy).
            # Sin esto todo caía en "hoy" y lo planificado no aparecía en su destino.
            from datetime import date
            hoy = date.today()
            fecha_destino = fecha_seleccionada or hoy
            accion.fecha_seleccionada = fecha_destino
            if hora_seleccionada:
                accion.hora_seleccionada = hora_seleccionada

            if clasificacion == 'H':
                accion.estado_actual = AccionKanban.EstadoChoices.AGENDA_DIARIA
                accion.destino_asignado = AccionKanban.DestinoChoices.AGENDA_DIARIA
                pk_semanal = self._reflejar_en_semanal(request.user, accion.texto_accion, fecha_destino)
                if pk_semanal:
                    lado['actions'].append(pk_semanal)
            elif clasificacion == 'P':
                if not destino_planificacion:
                    return Response(
                        {'detail': 'Debe especificar destino de planificación (SEMANAL, MENSUAL, ANUAL)'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                destino_map = {
                    'SEMANAL': (AccionKanban.EstadoChoices.PLANIFICADA_SEMANAL, AccionKanban.DestinoChoices.PLAN_SEMANAL),
                    'MENSUAL': (AccionKanban.EstadoChoices.PLANIFICADA_MENSUAL, AccionKanban.DestinoChoices.PLAN_MENSUAL),
                    'ANUAL': (AccionKanban.EstadoChoices.PLANIFICADA_ANUAL, AccionKanban.DestinoChoices.PLAN_ANUAL),
                }
                estado, destino = destino_map[destino_planificacion]
                accion.estado_actual = estado
                accion.destino_asignado = destino
                if fecha_seleccionada:
                    accion.fecha_seleccionada = fecha_seleccionada
                if hora_seleccionada:
                    accion.hora_seleccionada = hora_seleccionada

                # Crear acción en el nuevo sistema WeeklyPlan si el destino es SEMANAL
                if destino_planificacion == 'SEMANAL':
                    iso_year, semana, _ = fecha_destino.isocalendar()
                    obj_sem, obj_created = ObjetivoSemanal.objects.get_or_create(
                        user=request.user,
                        año=iso_year,
                        semana=semana,
                        titulo=accion.texto_accion[:255],
                        defaults={
                            'descripcion': accion.texto_accion,
                            'accion_origen': accion,
                        }
                    )
                    if obj_created:
                        lado['objetivos_semanales'].append(obj_sem.pk)
                    service = WeeklyPlanService(request.user)
                    plan, _ = service.get_or_create_week_of(fecha_destino)
                    act = Action.objects.create(
                        weekly_plan=plan,
                        assigned_calendar_date=fecha_destino,
                        fecha_planificada_original=fecha_destino,
                        title=accion.texto_accion,
                        origin_module=Action.OriginModule.KANBAN_BACKLOG,
                    )
                    lado['actions'].append(str(act.pk))
                elif destino_planificacion == 'MENSUAL':
                    # Se vincula a la última meta anual para que el destino
                    # mensual (filtrado por meta_anual) muestre la tarea.
                    ultima_meta = MetaAnual.objects.filter(user=request.user).order_by('-creado').first()
                    obj_men = ObjetivoMensual.objects.create(
                        user=request.user,
                        meta_anual=ultima_meta,
                        mes=fecha_destino.month,
                        titulo=accion.texto_accion[:255],
                        descripcion=accion.texto_accion,
                    )
                    lado['objetivos_mensuales'].append(obj_men.pk)
                elif destino_planificacion == 'ANUAL':
                    fin_year = fecha_destino.year
                    meta_anual = MetaAnual.objects.create(
                        user=request.user,
                        titulo=accion.texto_accion[:255],
                        descripcion=f'Creada desde Kanban: {accion.texto_accion}',
                        fecha_inicio=date(fin_year, 1, 1),
                        fecha_fin=date(fin_year, 12, 31),
                    )
                    lado['metas_anuales'].append(meta_anual.pk)
            elif clasificacion == 'D':
                accion.estado_actual = AccionKanban.EstadoChoices.POR_DELEGAR
                accion.destino_asignado = AccionKanban.DestinoChoices.DELEGACION
                # Puente con la sección "Acciones por Delegar" del dashboard,
                # que lee el tablero legacy (KanbanTask columna Delegar).
                if not KanbanTask.objects.filter(
                    user=request.user, columna='Delegar', titulo=accion.texto_accion[:255]
                ).exists():
                    kt = KanbanTask.objects.create(
                        user=request.user,
                        titulo=accion.texto_accion[:255],
                        descripcion=f'Delegada desde Kanban Backlog: {accion.texto_accion}',
                        columna='Delegar',
                    )
                    lado['kanbantask_creados'].append(kt.pk)
                # Doc 32: el proceso de delegación nace en el módulo dedicado.
                if not ActionDelegation.objects.filter(
                    user=request.user,
                    source_ref__kind='accion_kanban',
                    source_ref__id=str(accion.pk),
                ).exclude(estado__in=[
                    ActionDelegation.Estado.COMPLETADA,
                    ActionDelegation.Estado.RECUPERADA,
                ]).exists():
                    deleg = ActionDelegation.objects.create(
                        user=request.user,
                        titulo=accion.texto_accion[:500],
                        origen=ActionDelegation.Origen.KANBAN_BACKLOG,
                        source_ref={'kind': 'accion_kanban', 'id': str(accion.pk)},
                    )
                    deleg.push_historial('trasladada', {'origen': 'KANBAN_BACKLOG'})
                    deleg.save(update_fields=['historial'])
            elif clasificacion == 'E':
                accion.estado_actual = AccionKanban.EstadoChoices.ELIMINADA
                accion.destino_asignado = AccionKanban.DestinoChoices.PAPELERA

            accion.revert_data = lado
            # Doc 27 §5: el día de la primera planificación queda registrado y
            # no se modifica al reprogramar la acción.
            if accion.fecha_seleccionada and not accion.fecha_planificada_original:
                accion.fecha_planificada_original = accion.fecha_seleccionada
            accion.save()
            if clasificacion == 'H':
                registrar_evento(accion, EventoAccion.Tipo.CREATE_ACTION,
                                 origen='kanban', fecha=str(fecha_destino), hora=str(hora_seleccionada))

            HistorialMovimiento.objects.create(
                accion=accion,
                estado_anterior=estado_anterior,
                estado_nuevo=accion.estado_actual,
                clasificacion_anterior=clasificacion_anterior,
                clasificacion_nueva=clasificacion,
            )

        return Response(AccionKanbanSerializer(accion).data)

    @action(detail=True, methods=['patch'], url_path='fijar')
    def fijar(self, request, pk=None):
        try:
            accion = AccionKanban.objects.get(pk=pk, user=request.user)
        except AccionKanban.DoesNotExist:
            return Response(
                {'detail': 'Acción no encontrada'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if accion.estado_actual != AccionKanban.EstadoChoices.AGENDA_DIARIA:
            return Response(
                {'detail': 'Solo se pueden fijar acciones en la agenda diaria'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        accion.es_fijo = not accion.es_fijo
        accion.save()

        return Response(AccionKanbanSerializer(accion).data)

    @action(detail=False, methods=['get'], url_path='papelera')
    def papelera(self, request):
        """§7.4/§16: basurero de ideas desechadas, revisable sin borrado definitivo."""
        qs = self.queryset.filter(
            user=request.user,
            estado_actual=AccionKanban.EstadoChoices.ELIMINADA,
        )
        serializer = AccionKanbanSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'], url_path='restaurar')
    def restaurar(self, request, pk=None):
        """§7.4/§16: recuperar una acción desechada al Kanban activo."""
        try:
            accion = AccionKanban.objects.get(pk=pk, user=request.user)
        except AccionKanban.DoesNotExist:
            return Response(
                {'detail': 'Acción no encontrada'},
                status=status.HTTP_404_NOT_FOUND,
            )
        if accion.estado_actual != AccionKanban.EstadoChoices.ELIMINADA:
            return Response(
                {'detail': 'Solo se pueden recuperar ideas desechadas'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        estado_anterior = accion.estado_actual
        clasificacion_anterior = accion.clasificacion
        accion.estado_actual = AccionKanban.EstadoChoices.KANBAN_ACTIVO
        accion.clasificacion = None
        accion.destino_asignado = AccionKanban.DestinoChoices.SIN_DESTINO
        accion.fecha_seleccionada = None
        accion.hora_seleccionada = None
        accion.fecha_planificada_original = None
        accion.save()
        HistorialMovimiento.objects.create(
            accion=accion,
            estado_anterior=estado_anterior,
            estado_nuevo=accion.estado_actual,
            clasificacion_anterior=clasificacion_anterior,
            clasificacion_nueva=None,
        )
        return Response(AccionKanbanSerializer(accion).data)

    @action(detail=True, methods=['patch'], url_path='deshacer')
    def deshacer(self, request, pk=None):
        """§17.2: revierte la última clasificación al Kanban activo,
        eliminando solo los registros laterales creados por ella."""
        try:
            accion = AccionKanban.objects.get(pk=pk, user=request.user)
        except AccionKanban.DoesNotExist:
            return Response(
                {'detail': 'Acción no encontrada'},
                status=status.HTTP_404_NOT_FOUND,
            )
        if accion.estado_actual == AccionKanban.EstadoChoices.KANBAN_ACTIVO:
            return Response(
                {'detail': 'No hay clasificación que deshacer'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        lado = accion.revert_data or {}
        with transaction.atomic():
            for aid in lado.get('actions', []):
                Action.objects.filter(pk=aid, weekly_plan__user=request.user).delete()
            for oid in lado.get('objetivos_semanales', []):
                ObjetivoSemanal.objects.filter(pk=oid, user=request.user).delete()
            for oid in lado.get('objetivos_mensuales', []):
                ObjetivoMensual.objects.filter(pk=oid, user=request.user).delete()
            for mid in lado.get('metas_anuales', []):
                MetaAnual.objects.filter(pk=mid, user=request.user).delete()
            for kid in lado.get('kanbantask_creados', []):
                KanbanTask.objects.filter(pk=kid, user=request.user).delete()
            estado_anterior = accion.estado_actual
            clasificacion_anterior = accion.clasificacion
            accion.estado_actual = AccionKanban.EstadoChoices.KANBAN_ACTIVO
            accion.clasificacion = None
            accion.destino_asignado = AccionKanban.DestinoChoices.SIN_DESTINO
            accion.fecha_seleccionada = None
            accion.hora_seleccionada = None
            accion.fecha_planificada_original = None
            accion.es_fijo = False
            accion.revert_data = {}
            accion.save()
            HistorialMovimiento.objects.create(
                accion=accion,
                estado_anterior=estado_anterior,
                estado_nuevo=accion.estado_actual,
                clasificacion_anterior=clasificacion_anterior,
                clasificacion_nueva=None,
            )
        return Response(AccionKanbanSerializer(accion).data)

    @action(detail=False, methods=['get'], url_path='clasificadas')
    def clasificadas(self, request):
        qs = self.queryset.filter(
            user=request.user,
        ).exclude(
            estado_actual=AccionKanban.EstadoChoices.KANBAN_ACTIVO,
        )
        serializer = AccionKanbanSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='board')
    def board(self, request):
        qs = AccionKanban.objects.filter(
            user=request.user,
            estado_actual__in=[
                AccionKanban.EstadoChoices.KANBAN_ACTIVO,
                AccionKanban.EstadoChoices.POR_DELEGAR,
            ],
        )
        serializer = AccionKanbanSerializer(qs, many=True)
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        try:
            instance = AccionKanban.objects.get(pk=kwargs['pk'], user=request.user)
        except AccionKanban.DoesNotExist:
            return Response({'detail': 'Acción no encontrada'}, status=status.HTTP_404_NOT_FOUND)

        Estado = AccionKanban.EstadoEjecucionChoices
        cambia_bloque = 'hora_seleccionada' in request.data or 'fecha_seleccionada' in request.data
        if instance.estado == Estado.HACIENDO and cambia_bloque:
            return Response(
                {'detail': 'La acción está en «Haciendo». No puede cambiar de hora ni de día mientras esté en ejecución.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        anterior = {
            'texto': instance.texto_accion,
            'estado': instance.estado,
            'fecha': instance.fecha_seleccionada,
            'hora': instance.hora_seleccionada,
        }

        if 'texto_accion' in request.data:
            texto = (request.data.get('texto_accion') or '').strip()
            if not texto:
                return Response({'detail': 'El texto de la acción no puede estar vacío'}, status=status.HTTP_400_BAD_REQUEST)
            instance.texto_accion = texto

        if 'estado' in request.data:
            error = self._validar_transicion(instance, request.data['estado'])
            if error:
                return Response({'detail': error}, status=status.HTTP_400_BAD_REQUEST)
            instance.estado = request.data['estado']

        if 'hora_seleccionada' in request.data:
            hora = parse_time(str(request.data.get('hora_seleccionada') or ''))
            if hora is None:
                return Response({'detail': 'La hora es obligatoria (formato HH:MM)'}, status=status.HTTP_400_BAD_REQUEST)
            instance.hora_seleccionada = hora

        if 'fecha_seleccionada' in request.data:
            fecha = parse_date(str(request.data.get('fecha_seleccionada') or ''))
            if fecha is None:
                return Response({'detail': 'La fecha es obligatoria'}, status=status.HTTP_400_BAD_REQUEST)
            instance.fecha_seleccionada = fecha

        if instance.estado_actual == AccionKanban.EstadoChoices.AGENDA_DIARIA and cambia_bloque:
            error = self._validar_bloque_libre(
                request.user, instance.fecha_seleccionada, instance.hora_seleccionada, instance.pk,
            )
            if error:
                return Response({'detail': error}, status=status.HTTP_400_BAD_REQUEST)

        for field in ('es_fijo', 'estado_actual'):
            if field in request.data:
                setattr(instance, field, request.data[field])
        # Doc 27 §5: reprogramar conserva la fecha de planificación original.
        if (instance.fecha_seleccionada and not instance.fecha_planificada_original
                and instance.estado_actual != AccionKanban.EstadoChoices.KANBAN_ACTIVO):
            instance.fecha_planificada_original = instance.fecha_seleccionada
        instance.save()

        if instance.texto_accion != anterior['texto']:
            registrar_evento(instance, EventoAccion.Tipo.EDIT_ACTION,
                             desde=anterior['texto'], hasta=instance.texto_accion)
        if instance.estado != anterior['estado']:
            registrar_evento(instance, EventoAccion.Tipo.CHANGE_STATUS, origen='usuario',
                             desde=anterior['estado'], hasta=instance.estado)
        if instance.fecha_seleccionada != anterior['fecha'] or instance.hora_seleccionada != anterior['hora']:
            registrar_evento(instance, EventoAccion.Tipo.DROP_ACTION,
                             desde_fecha=str(anterior['fecha']), desde_hora=str(anterior['hora']),
                             hasta_fecha=str(instance.fecha_seleccionada), hasta_hora=str(instance.hora_seleccionada))
        return Response(AccionKanbanSerializer(instance).data)

    def _validar_bloque_libre(self, user, fecha, hora, excluir_pk=None):
        if not fecha or not hora:
            return 'La fecha y la hora son obligatorias'
        qs = AccionKanban.objects.filter(
            user=user,
            estado_actual=AccionKanban.EstadoChoices.AGENDA_DIARIA,
            fecha_seleccionada=fecha,
            hora_seleccionada=hora,
        )
        if excluir_pk:
            qs = qs.exclude(pk=excluir_pk)
        if qs.exists():
            return f'Ya hay una acción en el bloque de las {hora.strftime("%H:%M")}.'
        return None

    def _validar_transicion(self, accion, nuevo):
        Estado = AccionKanban.EstadoEjecucionChoices
        if nuevo not in Estado.values:
            return 'Estado no válido'
        actual = accion.estado
        if nuevo == actual:
            return None
        if nuevo == Estado.COMPLETADA:
            pendiente = accion.subacciones.filter(estado=Estado.PENDIENTE).first()
            if pendiente:
                return f'No se puede completar la acción. La subacción «{pendiente.texto}» sigue pendiente.'
        # Transiciones de usuario permitidas (Doc 9, §5). Completada se alcanza
        # solo desde Haciendo y los grupos se completan por consistencia.
        permitidas = {
            ('Pendiente', 'Haciendo'),
            ('Haciendo', 'Completada'),
            ('Haciendo', 'Pendiente'),
        }
        if (actual, nuevo) not in permitidas:
            return f'No se puede pasar la acción de {actual} a {nuevo}.'
        if nuevo == Estado.HACIENDO:
            otra = AccionKanban.objects.filter(
                user=accion.user,
                estado=Estado.HACIENDO,
                estado_actual=AccionKanban.EstadoChoices.AGENDA_DIARIA,
                fecha_seleccionada=accion.fecha_seleccionada,
            ).exclude(pk=accion.pk).first()
            if otra:
                return (f'Ya hay una acción en «Haciendo». Finalice «{otra.texto_accion}» '
                        f'para iniciar «{accion.texto_accion}».')
        return None

    def _sincronizar_estado(self, accion):
        Estado = AccionKanban.EstadoEjecucionChoices
        subs = list(accion.subacciones.all())
        if not subs:
            return
        anterior = accion.estado
        if all(s.estado == Estado.COMPLETADA for s in subs):
            nuevo = Estado.COMPLETADA
        elif anterior == Estado.COMPLETADA:
            nuevo = Estado.PENDIENTE
        else:
            nuevo = anterior
        if nuevo != anterior:
            accion.estado = nuevo
            accion.save(update_fields=['estado', 'actualizado_en'])
            registrar_evento(accion, EventoAccion.Tipo.CHANGE_STATUS, origen='sistema',
                             desde=anterior, hasta=nuevo)

    def _reflejar_en_semanal(self, user, texto, fecha):
        plan, _ = WeeklyPlanService(user).get_or_create_week_of(fecha)
        action_obj, created = Action.objects.get_or_create(
            weekly_plan=plan,
            title=texto,
            assigned_calendar_date=fecha,
            origin_module=Action.OriginModule.KANBAN_BACKLOG,
            defaults={'fecha_planificada_original': fecha},
        )
        return str(action_obj.pk) if created else None

    @action(detail=False, methods=['post'], url_path='agenda')
    def crear_en_agenda(self, request):
        texto = (request.data.get('texto_accion') or '').strip()
        if not texto:
            return Response({'detail': 'La acción necesita un nombre'}, status=status.HTTP_400_BAD_REQUEST)
        fecha = parse_date(str(request.data.get('fecha_seleccionada') or ''))
        if fecha is None:
            return Response({'detail': 'La fecha es obligatoria'}, status=status.HTTP_400_BAD_REQUEST)
        hora = parse_time(str(request.data.get('hora_seleccionada') or ''))
        if hora is None:
            return Response({'detail': 'La hora es obligatoria (formato HH:MM)'}, status=status.HTTP_400_BAD_REQUEST)
        error = self._validar_bloque_libre(request.user, fecha, hora)
        if error:
            return Response({'detail': error}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            accion = AccionKanban.objects.create(
                user=request.user,
                texto_accion=texto,
                origen=AccionKanban.OrigenChoices.MANUAL,
                clasificacion='H',
                estado_actual=AccionKanban.EstadoChoices.AGENDA_DIARIA,
                destino_asignado=AccionKanban.DestinoChoices.AGENDA_DIARIA,
                fecha_seleccionada=fecha,
                fecha_planificada_original=fecha,
                hora_seleccionada=hora,
                estado=AccionKanban.EstadoEjecucionChoices.PENDIENTE,
            )
            HistorialMovimiento.objects.create(
                accion=accion,
                estado_anterior='',
                estado_nuevo=AccionKanban.EstadoChoices.AGENDA_DIARIA,
                clasificacion_anterior=None,
                clasificacion_nueva='H',
            )
            self._reflejar_en_semanal(request.user, texto, fecha)
            registrar_evento(accion, EventoAccion.Tipo.CREATE_ACTION,
                             origen='agenda', fecha=str(fecha), hora=str(hora))
        return Response(AccionKanbanSerializer(accion).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='subacciones')
    def crear_subaccion(self, request, pk=None):
        try:
            accion = AccionKanban.objects.get(pk=pk, user=request.user)
        except (AccionKanban.DoesNotExist, DjangoValidationError):
            return Response({'detail': 'Acción no encontrada'}, status=status.HTTP_404_NOT_FOUND)

        texto = (request.data.get('texto') or '').strip()
        if not texto:
            return Response({'detail': 'La subacción necesita un texto'}, status=status.HTTP_400_BAD_REQUEST)

        sub = SubaccionKanban.objects.create(
            accion=accion,
            texto=texto,
            orden=accion.subacciones.count(),
        )
        registrar_evento(accion, EventoAccion.Tipo.CREATE_SUBACTION, subaccion=str(sub.pk), texto=texto)
        self._sincronizar_estado(accion)
        return Response(SubaccionKanbanSerializer(sub).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch', 'delete'], url_path=r'subacciones/(?P<sub_id>[^/.]+)')
    def subaccion_detalle(self, request, pk=None, sub_id=None):
        try:
            accion = AccionKanban.objects.get(pk=pk, user=request.user)
            sub = accion.subacciones.get(pk=sub_id)
        except (AccionKanban.DoesNotExist, SubaccionKanban.DoesNotExist, DjangoValidationError):
            return Response({'detail': 'Subacción no encontrada'}, status=status.HTTP_404_NOT_FOUND)

        if request.method == 'DELETE':
            registrar_evento(accion, EventoAccion.Tipo.DELETE_SUBACTION, subaccion=str(sub.pk), texto=sub.texto)
            sub.delete()
            self._sincronizar_estado(accion)
            return Response(status=status.HTTP_204_NO_CONTENT)

        Estado = AccionKanban.EstadoEjecucionChoices
        if 'texto' in request.data:
            texto = (request.data.get('texto') or '').strip()
            if not texto:
                return Response({'detail': 'La subacción necesita un texto'}, status=status.HTTP_400_BAD_REQUEST)
            if texto != sub.texto:
                registrar_evento(accion, EventoAccion.Tipo.EDIT_SUBACTION,
                                 subaccion=str(sub.pk), desde=sub.texto, hasta=texto)
                sub.texto = texto
        if 'estado' in request.data:
            nuevo = request.data['estado']
            if nuevo not in (Estado.PENDIENTE, Estado.COMPLETADA):
                return Response({'detail': 'Estado de subacción no válido'}, status=status.HTTP_400_BAD_REQUEST)
            if nuevo != sub.estado:
                registrar_evento(accion, EventoAccion.Tipo.CHANGE_STATUS, origen='usuario',
                                 subaccion=str(sub.pk), desde=sub.estado, hasta=nuevo)
                sub.estado = nuevo
        sub.save()
        self._sincronizar_estado(accion)
        return Response(SubaccionKanbanSerializer(sub).data)

    def destroy(self, request, *args, **kwargs):
        try:
            instance = AccionKanban.objects.get(pk=kwargs['pk'], user=request.user)
        except AccionKanban.DoesNotExist:
            return Response({'detail': 'Acción no encontrada'}, status=status.HTTP_404_NOT_FOUND)

        estado_anterior = instance.estado_actual
        instance.estado_actual = AccionKanban.EstadoChoices.ELIMINADA
        instance.destino_asignado = AccionKanban.DestinoChoices.PAPELERA
        instance.save()

        HistorialMovimiento.objects.create(
            accion=instance,
            estado_anterior=estado_anterior,
            estado_nuevo=AccionKanban.EstadoChoices.ELIMINADA,
        )
        if estado_anterior == AccionKanban.EstadoChoices.AGENDA_DIARIA:
            registrar_evento(instance, EventoAccion.Tipo.DELETE_ACTION,
                             texto=instance.texto_accion, subacciones=instance.subacciones.count())
        return Response(status=status.HTTP_204_NO_CONTENT)


class ObjetivoSemanalViewSet(BaseUserViewSet):
    queryset = ObjetivoSemanal.objects.all()
    serializer_class = ObjetivoSemanalSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        año = self.request.query_params.get('año')
        semana = self.request.query_params.get('semana')
        if año:
            qs = qs.filter(año=año)
        if semana:
            qs = qs.filter(semana=semana)
        return qs


class WeeklyPlanService:
    def __init__(self, user):
        self.user = user

    def get_or_create_current_week(self):
        from datetime import date
        return self.get_or_create_week_of(date.today())

    def get_or_create_week_of(self, target_date):
        from datetime import date as date_cls
        if isinstance(target_date, str):
            target_date = date_cls.fromisoformat(target_date)
        iso_year, week_number, _ = target_date.isocalendar()
        plan, created = WeeklyPlan.objects.get_or_create(
            user=self.user,
            year=iso_year,
            week_number=week_number,
            defaults={'associated_monthly_goal_text': self._get_monthly_goal_text()},
        )
        return plan, created

    def _get_monthly_goal_text(self):
        monthly = MonthlyPlan.objects.filter(user=self.user, status='APROBADA').first()
        if monthly:
            goals = monthly.goals.all()[:1]
            if goals:
                return goals[0].monthly_goal_text
        return ''

    def add_action(self, title, assigned_date, origin_module='MANUAL', subactions=None):
        plan, _ = self.get_or_create_week_of(assigned_date)
        return Action.objects.create(
            weekly_plan=plan,
            assigned_calendar_date=assigned_date,
            fecha_planificada_original=assigned_date,
            title=title,
            origin_module=origin_module,
            subactions=subactions or [],
        )

    def repeat_action(self, action_id, target_date):
        import uuid
        original = Action.objects.get(id=action_id, weekly_plan__user=self.user)
        plan, _ = self.get_or_create_week_of(target_date)
        return Action.objects.create(
            weekly_plan=plan,
            assigned_calendar_date=target_date,
            fecha_planificada_original=target_date,
            title=original.title,
            origin_module=original.origin_module,
            subactions=[{**s, 'id': str(uuid.uuid4())} for s in original.subactions] if original.subactions else [],
        )

    def move_action(self, action_id, new_date):
        action = Action.objects.get(id=action_id, weekly_plan__user=self.user)
        action.assigned_calendar_date = new_date
        action.save(update_fields=['assigned_calendar_date'])
        return action

    def delegate_action(self, action_id):
        action = Action.objects.get(id=action_id, weekly_plan__user=self.user)
        action.status = Action.ActionStatus.DELEGADA
        action.save(update_fields=['status'])
        # Puente con "Acciones por Delegar" (lee KanbanTask columna Delegar).
        if not KanbanTask.objects.filter(
            user=self.user, columna='Delegar', titulo=action.title[:255]
        ).exists():
            KanbanTask.objects.create(
                user=self.user,
                titulo=action.title[:255],
                descripcion=f'Delegada desde Planificación Semanal: {action.title}',
                columna='Delegar',
            )
        # Doc 32: el proceso nace también en el módulo dedicado.
        if not ActionDelegation.objects.filter(
            user=self.user,
            source_ref__kind='weekly_action',
            source_ref__id=str(action.pk),
        ).exclude(estado__in=[
            ActionDelegation.Estado.COMPLETADA,
            ActionDelegation.Estado.RECUPERADA,
        ]).exists():
            deleg = ActionDelegation.objects.create(
                user=self.user,
                titulo=action.title[:500],
                origen=ActionDelegation.Origen.PLANIFICADOR_SEMANAL,
                source_ref={'kind': 'weekly_action', 'id': str(action.pk)},
            )
            deleg.push_historial('trasladada', {'origen': 'PLANIFICADOR_SEMANAL'})
            deleg.save(update_fields=['historial'])
        return action

    def complete_action(self, action_id):
        action = Action.objects.get(id=action_id, weekly_plan__user=self.user)
        action.status = Action.ActionStatus.COMPLETADA
        action.save(update_fields=['status'])
        return action

    def add_subaction(self, action_id, title):
        import uuid
        action = Action.objects.get(id=action_id, weekly_plan__user=self.user)
        subs = list(action.subactions or [])
        subs.append({'id': str(uuid.uuid4()), 'title': title, 'is_completed': False})
        action.subactions = subs
        action.save(update_fields=['subactions'])
        return action

    def edit_subaction(self, action_id, subaction_id, title=None, is_completed=None):
        action = Action.objects.get(id=action_id, weekly_plan__user=self.user)
        subs = list(action.subactions or [])
        for s in subs:
            if s['id'] == subaction_id:
                if title is not None:
                    s['title'] = title
                if is_completed is not None:
                    s['is_completed'] = is_completed
                break
        action.subactions = subs
        action.save(update_fields=['subactions'])
        return action

    def delete_subaction(self, action_id, subaction_id):
        action = Action.objects.get(id=action_id, weekly_plan__user=self.user)
        subs = [s for s in (action.subactions or []) if s['id'] != subaction_id]
        action.subactions = subs
        action.save(update_fields=['subactions'])
        return action

    def delete_action(self, action_id):
        action = Action.objects.get(id=action_id, weekly_plan__user=self.user)
        action.delete()
        return True


class WeeklyPlanViewSet(BaseUserViewSet):
    queryset = WeeklyPlan.objects.all()
    serializer_class = WeeklyPlanSerializer

    def get_serializer_class(self):
        if self.action == 'list':
            return WeeklyPlanListSerializer
        return WeeklyPlanSerializer

    @action(detail=False, methods=['get'])
    def current_week(self, request):
        service = WeeklyPlanService(request.user)
        plan, created = service.get_or_create_current_week()
        serializer = self.get_serializer(plan)
        return Response({'plan': serializer.data, 'created': created})

    @action(detail=False, methods=['post'])
    def generate_week(self, request):
        service = WeeklyPlanService(request.user)
        plan, _ = service.get_or_create_current_week()
        serializer = self.get_serializer(plan)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='week_of')
    def week_of(self, request):
        """Planificación de la semana que contiene la fecha dada (navegación)."""
        from datetime import date as date_cls
        raw = request.query_params.get('date')
        try:
            target = date_cls.fromisoformat(raw) if raw else date_cls.today()
        except ValueError:
            return Response({'error': 'date inválida (YYYY-MM-DD)'}, status=400)
        service = WeeklyPlanService(request.user)
        plan, created = service.get_or_create_week_of(target)
        serializer = self.get_serializer(plan)
        return Response({'plan': serializer.data, 'created': created})


class ActionViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ActionSerializer

    def get_queryset(self):
        return Action.objects.filter(weekly_plan__user=self.request.user)

    def perform_create(self, serializer):
        # Doc 27 §5: registrar la fecha de planificación original.
        serializer.save(fecha_planificada_original=serializer.validated_data.get(
            'assigned_calendar_date'))

    @action(detail=False, methods=['post'])
    def add_action(self, request):
        title = request.data.get('title')
        assigned_date = request.data.get('assigned_calendar_date')
        origin_module = request.data.get('origin_module', 'MANUAL')
        subactions = request.data.get('subactions', [])
        if not title or not assigned_date:
            return Response({'error': 'title and assigned_calendar_date required'}, status=400)
        service = WeeklyPlanService(request.user)
        action = service.add_action(title, assigned_date, origin_module, subactions)
        return Response(ActionSerializer(action).data, status=201)

    @action(detail=True, methods=['post'])
    def repeat(self, request, pk=None):
        target_date = request.data.get('target_date')
        if not target_date:
            return Response({'error': 'target_date required'}, status=400)
        service = WeeklyPlanService(request.user)
        action = service.repeat_action(pk, target_date)
        return Response(ActionSerializer(action).data, status=201)

    @action(detail=True, methods=['post'])
    def move(self, request, pk=None):
        new_date = request.data.get('new_date')
        if not new_date:
            return Response({'error': 'new_date required'}, status=400)
        service = WeeklyPlanService(request.user)
        action = service.move_action(pk, new_date)
        return Response(ActionSerializer(action).data)

    @action(detail=True, methods=['post'])
    def delegate(self, request, pk=None):
        service = WeeklyPlanService(request.user)
        action = service.delegate_action(pk)
        return Response(ActionSerializer(action).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        service = WeeklyPlanService(request.user)
        action = service.complete_action(pk)
        return Response(ActionSerializer(action).data)

    @action(detail=True, methods=['post'])
    def add_subaction(self, request, pk=None):
        title = request.data.get('title')
        if not title:
            return Response({'error': 'title required'}, status=400)
        service = WeeklyPlanService(request.user)
        action = service.add_subaction(pk, title)
        return Response(ActionSerializer(action).data)

    @action(detail=True, methods=['patch'])
    def edit_subaction(self, request, pk=None):
        subaction_id = request.data.get('subaction_id')
        if not subaction_id:
            return Response({'error': 'subaction_id required'}, status=400)
        service = WeeklyPlanService(request.user)
        action = service.edit_subaction(
            pk, subaction_id,
            title=request.data.get('title'),
            is_completed=request.data.get('is_completed'),
        )
        return Response(ActionSerializer(action).data)

    @action(detail=True, methods=['post'])
    def delete_subaction(self, request, pk=None):
        subaction_id = request.data.get('subaction_id')
        if not subaction_id:
            return Response({'error': 'subaction_id required'}, status=400)
        service = WeeklyPlanService(request.user)
        action = service.delete_subaction(pk, subaction_id)
        return Response(ActionSerializer(action).data)

    @action(detail=True, methods=['post'])
    def drop_action(self, request, pk=None):
        new_date = request.data.get('new_date')
        if not new_date:
            return Response({'error': 'new_date required'}, status=400)
        service = WeeklyPlanService(request.user)
        action = service.move_action(pk, new_date)
        return Response(ActionSerializer(action).data)


class ActionDelegationViewSet(BaseUserViewSet):
    """Doc 32: ciclo de vida de acciones delegadas (responsable + seguimiento)."""
    queryset = ActionDelegation.objects.all()
    serializer_class = ActionDelegationSerializer

    TIPOS_DERIVADA = {
        'llamar': 'Llamar a {resp} por: {titulo}',
        'correo': 'Enviar correo a {resp} por: {titulo}',
        'whatsapp': 'Enviar WhatsApp a {resp} por: {titulo}',
        'reunion': 'Reunirse con {resp} por: {titulo}',
    }
    ESTADOS_ACTIVOS = [
        ActionDelegation.Estado.PENDIENTE_DELEGAR,
        ActionDelegation.Estado.DELEGADA,
        ActionDelegation.Estado.EN_SEGUIMIENTO,
    ]

    def get_queryset(self):
        qs = self.queryset.filter(user=self.request.user)
        if self.request.query_params.get('activas') == '1':
            qs = qs.filter(estado__in=self.ESTADOS_ACTIVOS)
        return qs

    def perform_create(self, serializer):
        obj = serializer.save(user=self.request.user)
        obj.push_historial('trasladada', {'origen': obj.origen})
        obj.save(update_fields=['historial'])

    @action(detail=True, methods=['patch'], url_path='responsable')
    def asignar_responsable(self, request, pk=None):
        deleg = self.get_object()
        if deleg.estado not in self.ESTADOS_ACTIVOS:
            return Response({'error': 'La delegación ya no está activa'}, status=400)
        responsable = (request.data.get('responsable') or '').strip()
        if not responsable:
            return Response({'error': 'El responsable es obligatorio'}, status=400)
        anterior = deleg.responsable
        deleg.responsable = responsable[:255]
        tiene_derivadas = any(
            h.get('evento') == 'derivada_creada' for h in (deleg.historial or []))
        deleg.estado = (ActionDelegation.Estado.EN_SEGUIMIENTO if tiene_derivadas
                        else ActionDelegation.Estado.DELEGADA)
        deleg.push_historial(
            'responsable_reasignado' if anterior else 'responsable_asignado',
            {'anterior': anterior, 'nuevo': deleg.responsable})
        deleg.save()
        return Response(ActionDelegationSerializer(deleg).data)

    @action(detail=True, methods=['post'], url_path='derivada')
    def crear_derivada(self, request, pk=None):
        deleg = self.get_object()
        if deleg.estado not in self.ESTADOS_ACTIVOS:
            return Response({'error': 'La delegación ya no está activa'}, status=400)
        if not deleg.responsable:
            return Response(
                {'error': 'Asigna un responsable antes de crear seguimiento'}, status=400)
        tipo = request.data.get('tipo')
        if tipo not in self.TIPOS_DERIVADA:
            return Response(
                {'error': 'tipo debe ser: llamar, correo, whatsapp o reunion'}, status=400)
        from datetime import date as date_cls
        fecha_raw = request.data.get('fecha')
        try:
            fecha = date_cls.fromisoformat(fecha_raw) if fecha_raw else date_cls.today()
        except ValueError:
            return Response({'error': 'fecha inválida (YYYY-MM-DD)'}, status=400)
        titulo = self.TIPOS_DERIVADA[tipo].format(resp=deleg.responsable, titulo=deleg.titulo)
        with transaction.atomic():
            service = WeeklyPlanService(request.user)
            plan, _ = service.get_or_create_week_of(fecha)
            derivada = Action.objects.create(
                weekly_plan=plan,
                assigned_calendar_date=fecha,
                title=titulo[:500],
                origin_module=Action.OriginModule.MANUAL,
            )
            hora_raw = request.data.get('hora')
            if hora_raw:
                try:
                    from datetime import datetime as dt_cls
                    hora_dt = dt_cls.strptime(str(hora_raw)[:5], '%H:%M').time()
                    TimeBlock.objects.get_or_create(
                        user=request.user, fecha=fecha, hora=hora_dt.hour,
                        defaults={'tarea': titulo[:255], 'estado': 'pending'})
                except ValueError:
                    pass
            deleg.estado = ActionDelegation.Estado.EN_SEGUIMIENTO
            deleg.push_historial('derivada_creada', {
                'action_id': str(derivada.pk),
                'titulo': titulo,
                'tipo': tipo,
                'fecha': fecha.isoformat(),
                'responsable_snapshot': deleg.responsable,
            })
            deleg.save()
        return Response(ActionDelegationSerializer(deleg).data)

    @action(detail=True, methods=['post'], url_path='recuperar')
    def recuperar(self, request, pk=None):
        deleg = self.get_object()
        if deleg.estado not in self.ESTADOS_ACTIVOS:
            return Response({'error': 'La delegación ya no está activa'}, status=400)
        ref = deleg.source_ref or {}
        kind, rid = ref.get('kind'), ref.get('id')
        with transaction.atomic():
            if kind == 'accion_kanban':
                acc = AccionKanban.objects.filter(pk=rid, user=request.user).first()
                if acc:
                    acc.estado_actual = AccionKanban.EstadoChoices.KANBAN_ACTIVO
                    acc.clasificacion = None
                    acc.destino_asignado = AccionKanban.DestinoChoices.SIN_DESTINO
                    acc.save()
                    HistorialMovimiento.objects.create(
                        accion=acc, estado_anterior='POR_DELEGAR',
                        estado_nuevo='KANBAN_ACTIVO')
            elif kind == 'weekly_action':
                Action.objects.filter(pk=rid, weekly_plan__user=request.user).update(
                    status=Action.ActionStatus.PENDIENTE)
            elif kind == 'kanbantask':
                KanbanTask.objects.filter(pk=rid, user=request.user).update(columna='Backlog')
            deleg.estado = ActionDelegation.Estado.RECUPERADA
            deleg.push_historial('recuperada', {})
            deleg.save()
        return Response(ActionDelegationSerializer(deleg).data)

    @action(detail=True, methods=['post'], url_path='completar')
    def completar(self, request, pk=None):
        deleg = self.get_object()
        if deleg.estado not in self.ESTADOS_ACTIVOS:
            return Response({'error': 'La delegación ya no está activa'}, status=400)
        deleg.estado = ActionDelegation.Estado.COMPLETADA
        deleg.push_historial('completada', {'responsable': deleg.responsable})
        deleg.save()
        return Response(ActionDelegationSerializer(deleg).data)

    @action(detail=False, methods=['get'], url_path='responsables')
    def responsables(self, request):
        nombres = (ActionDelegation.objects.filter(user=request.user)
                   .exclude(responsable='').order_by('responsable')
                   .values_list('responsable', flat=True).distinct())
        return Response(list(nombres))


# ──────────────────────────────────────────────
# AGENTE IA — FocusIA
# ──────────────────────────────────────────────

class AgentConversationViewSet(BaseUserViewSet):
    queryset = AgentConversation.objects.all()
    serializer_class = AgentConversationSerializer

    def get_queryset(self):
        session_id = self.request.query_params.get('session_id')
        # La bandeja del chat muestra solo la conversación real: las
        # evaluaciones automáticas (rol SYSTEM) se consultan como registro y
        # llegan al usuario por notificaciones, no como mensajes del chat.
        qs = self.queryset.filter(user=self.request.user).exclude(rol='SYSTEM')
        if session_id:
            qs = qs.filter(session_id=session_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class AgentScheduleViewSet(BaseUserViewSet):
    queryset = AgentSchedule.objects.all()
    serializer_class = AgentScheduleSerializer

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class AgentConfigViewSet(BaseUserViewSet):
    queryset = AgentConfig.objects.all()
    serializer_class = AgentConfigSerializer

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get', 'patch'])
    def mi_config(self, request):
        config, created = AgentConfig.objects.get_or_create(user=request.user)
        if request.method == 'GET':
            return Response(AgentConfigSerializer(config).data)
        serializer = AgentConfigSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        if 'whatsapp_phone' in request.data and request.data['whatsapp_phone']:
            config.notificar_whatsapp = True
        serializer.save()
        return Response(AgentConfigSerializer(config).data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def agent_chat(request):
    from .services.agent_service import AgentService

    mensaje = request.data.get('mensaje', '')
    session_id = request.data.get('session_id')
    contexto_ayuda = request.data.get('contexto_ayuda')

    service = AgentService(request.user)
    respuesta = service.procesar_mensaje(mensaje, session_id=session_id, contexto_ayuda=contexto_ayuda)
    return Response(respuesta)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def agent_evaluate(request):
    from .services.agent_service import AgentService

    service = AgentService(request.user)
    resultado = service.evaluar_estado()
    return Response(resultado)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def tts(request):
    text = request.data.get('text', '').strip()
    gender = request.data.get('gender', 'masculino')

    if not text:
        return Response({'error': 'Texto requerido'}, status=status.HTTP_400_BAD_REQUEST)

    from groq import Groq
    groq_client = Groq(api_key=settings.GROQ_API_KEY)
    voice = 'troy' if gender == 'masculino' else 'hannah'
    groq_response = groq_client.audio.speech.create(
        model='canopylabs/orpheus-v1-english',
        voice=voice,
        input=text[:200],
        response_format='wav',
    )
    audio_data = groq_response.read()
    if not audio_data:
        return Response({'error': 'Error generando audio'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return HttpResponse(audio_data, content_type='audio/wav')


AVATAR_VOICE_MAP = {
    1: 'john.mp3',
    2: 'conrad_voice.mp3',
    3: 'ashley_voice.mp3',
    4: 'lia_voice.mp3',
    5: 'monroe_voice.mp3',
    6: 'sophya_voice.mp3',
}

AVATAR_GROQ_VOICE_MAP = {
    1: 'troy',
    2: 'troy',
    3: 'hannah',
    4: 'hannah',
    5: 'troy',
    6: 'hannah',
}

COQUI_TTS_URL = getattr(settings, 'COQUI_TTS_URL', 'http://localhost:8760')

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def avatar_tts(request):
    avatar_index = request.data.get('avatar_index')
    text = request.data.get('text', '').strip()

    if not avatar_index or avatar_index not in AVATAR_VOICE_MAP:
        return Response({'error': 'Avatar no válido'}, status=status.HTTP_400_BAD_REQUEST)
    if not text:
        return Response({'error': 'Texto requerido'}, status=status.HTTP_400_BAD_REQUEST)

    from groq import Groq
    groq_client = Groq(api_key=settings.GROQ_API_KEY)
    voice = AVATAR_GROQ_VOICE_MAP.get(avatar_index, 'hannah')
    groq_response = groq_client.audio.speech.create(
        model='canopylabs/orpheus-v1-english',
        voice=voice,
        input=text[:200],
        response_format='wav',
    )
    audio_data = groq_response.read()
    if not audio_data:
        return Response({'error': 'Error generando audio'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return HttpResponse(audio_data, content_type='audio/wav')


class FocusiaReportViewSet(BaseUserViewSet):
    queryset = FocusiaReport.objects.all()
    serializer_class = FocusiaReportSerializer

    def _cerrar(self, user):
        from dashboard.tasks import _cerrar_reportes_vencidos
        try:
            _cerrar_reportes_vencidos(user)
        except Exception:
            pass

    def list(self, request, *args, **kwargs):
        level = request.query_params.get('level')
        self._cerrar(request.user)
        qs = self.get_queryset()
        if level:
            qs = qs.filter(level=level)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def latest(self, request):
        self._cerrar(request.user)
        results = []
        for level in ['weekly', 'monthly', 'annual']:
            report = self.get_queryset().filter(level=level).order_by('-period_start').first()
            if report:
                results.append(FocusiaReportSerializer(report).data)
        return Response(results)

    @action(detail=False, methods=['get'])
    def resumen(self, request):
        """Primera pantalla de Reportes (Doc 27 §3.2 y §3.3).

        Devuelve, para cada tipo, el último reporte disponible y la fecha prevista
        del primer reporte cuando puede calcularse.
        """
        from dashboard.tasks import proxima_publicacion

        self._cerrar(request.user)
        results = []
        for level in ['weekly', 'monthly', 'annual']:
            report = self.get_queryset().filter(level=level).order_by('-period_start').first()
            try:
                fecha_prevista = proxima_publicacion(level).isoformat()
            except Exception:
                fecha_prevista = None
            results.append({
                'level': level,
                'has_report': report is not None,
                'report': FocusiaReportSerializer(report).data if report else None,
                'fecha_prevista': fecha_prevista,
            })
        return Response(results)

    @action(detail=True, methods=['post'])
    def open(self, request, pk=None):
        report = self.get_object()
        if report.status == FocusiaReport.ReportStatus.GENERATED:
            report.status = FocusiaReport.ReportStatus.NOTIFIED
        if report.status in [FocusiaReport.ReportStatus.NOTIFIED, FocusiaReport.ReportStatus.DISMISSED]:
            report.status = FocusiaReport.ReportStatus.OPENED
            report.opened_at = timezone.now()
            report.save(update_fields=['status', 'opened_at'])
        return Response(FocusiaReportSerializer(report).data)

    @action(detail=True, methods=['post'])
    def action(self, request, pk=None):
        report = self.get_object()
        serializer = FocusiaReportActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        report.action_taken = serializer.validated_data['action']
        report.action_taken_at = timezone.now()
        report.status = FocusiaReport.ReportStatus.ACTION_TAKEN
        report.save(update_fields=['action_taken', 'action_taken_at', 'status'])
        return Response(FocusiaReportSerializer(report).data)


class CoachingEntryViewSet(BaseUserViewSet):
    queryset = CoachingEntry.objects.all()
    serializer_class = CoachingEntrySerializer

    # Spec I: pregunta por defecto si el día del ciclo aún no tiene una
    # definida en la Tabla Maestra.
    PREGUNTA_DEFAULT = (
        '¿Qué aprendizaje de hoy puede acercarte un paso más a tu Gran Meta Anual?'
    )

    @action(detail=False, methods=['post'])
    def submit_reflection(self, request):
        # Spec II.2/II.7: la reflexión se guarda en la entrada DEL DÍA
        # (antes caía en la primera entrada histórica del usuario).
        # localdate: __date filtra en zona local; now().date() es UTC y
        # rompe el "hoy" durante la madrugada.
        today = timezone.localdate()
        entry, _ = CoachingEntry.objects.get_or_create(
            user=request.user,
            created_at__date=today,
            defaults={'reflection': request.data.get('reflection', '')},
        )
        if entry.reflection != request.data.get('reflection', ''):
            entry.reflection = request.data.get('reflection', '')
            entry.save(update_fields=['reflection'])
        return Response(CoachingEntrySerializer(entry).data)

    @action(detail=False, methods=['post'])
    def submit_decision(self, request):
        decision = request.data.get('decision', '')
        if not decision.strip():
            return Response({'error': 'La decisión es obligatoria'}, status=status.HTTP_400_BAD_REQUEST)

        today = timezone.localdate()
        entry, _ = CoachingEntry.objects.get_or_create(
            user=request.user,
            created_at__date=today,
            defaults={'decision': decision},
        )
        if entry.decision != decision:
            entry.decision = decision
            entry.save(update_fields=['decision'])

        # Spec II.5/III: el compromiso se integra a la planificación de MAÑANA
        # como acción pendiente (visible en el planificador semanal/agenda).
        action_text = f'[Coaching] {decision.strip()}'
        tomorrow = today + timedelta(days=1)
        try:
            with transaction.atomic():
                accion, creada = AccionKanban.objects.get_or_create(
                    user=request.user,
                    texto_accion=action_text,
                    fecha_seleccionada=tomorrow,
                    estado_actual=AccionKanban.EstadoChoices.AGENDA_DIARIA,
                    defaults={
                        'origen': 'MANUAL',
                        'clasificacion': 'H',
                        'destino_asignado': AccionKanban.DestinoChoices.AGENDA_DIARIA,
                        'fecha_planificada_original': tomorrow,
                    },
                )
                if creada:
                    HistorialMovimiento.objects.create(
                        accion=accion,
                        estado_anterior=AccionKanban.EstadoChoices.KANBAN_ACTIVO,
                        estado_nuevo=AccionKanban.EstadoChoices.AGENDA_DIARIA,
                        clasificacion_nueva='H',
                    )
                service = WeeklyPlanService(request.user)
                plan, _ = service.get_or_create_week_of(tomorrow)
                Action.objects.get_or_create(
                    weekly_plan=plan,
                    title=action_text,
                    assigned_calendar_date=tomorrow,
                    origin_module=Action.OriginModule.KANBAN_BACKLOG,
                    defaults={'fecha_planificada_original': tomorrow},
                )
            entry.decision_added_to_agenda = True
            entry.save(update_fields=['decision_added_to_agenda'])
        except Exception:
            pass

        return Response(CoachingEntrySerializer(entry).data)

    @action(detail=False, methods=['get'])
    def today(self, request):
        today = timezone.localdate()
        entry = self.get_queryset().filter(created_at__date=today).first()
        if entry:
            return Response(CoachingEntrySerializer(entry).data)
        return Response(None)

    @action(detail=False, methods=['get'], url_path='today-question')
    def today_question(self, request):
        """Spec I/II.1/II.6: pregunta del día desde el MISMO registro de la
        Tabla Maestra que genera la Frase Motivacional (o de integración)."""
        from .services.program_service import (
            get_current_program_day, get_or_log_phrase_view)
        program_day = get_current_program_day(request.user)
        if program_day is None:
            return Response({
                'pregunta': self.PREGUNTA_DEFAULT,
                'es_integracion': False,
                'origen_integracion': '',
                'frase': '', 'intention': '',
            })
        get_or_log_phrase_view(request.user, program_day)
        return Response({
            'pregunta': program_day.coaching_question.strip() or self.PREGUNTA_DEFAULT,
            'es_integracion': program_day.es_integracion,
            'origen_integracion': program_day.origen_integracion,
            'frase': program_day.phrase,
            'intention': program_day.intention,
            'month_number': program_day.month.month_number,
            'day_number': program_day.day_number,
        })


TRIBU_PREP = {
    'FAMILIA': 'mi familia',
    'PAREJA': 'mi pareja',
    'HIJOS': 'mis hijos',
    'AMIGOS': 'mis amigos',
    'TRABAJO': 'mi trabajo',
    'COMUNIDAD': 'mi comunidad',
    'CLUB_DEPORTE': 'mi club',
    'JUNTA_EDUCATIVA': 'mi junta educativa',
    'VOLUNTARIADO': 'mi voluntariado',
}


def _tribu_current_week(user):
    from datetime import date
    hoy = date.today()
    iso_year, semana, _ = hoy.isocalendar()
    return iso_year, semana


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def tribu_tema_actual(request):
    asignados = ids_asignados(request.user, 'tribu')
    if asignados is not None:
        tema = TribuTemaSemana.objects.filter(id__in=asignados).order_by('-creado').first()
        if tema is None:
            return Response({'detail': 'No tienes tema de tribu asignado.'}, status=404)
        return Response(TribuTemaSemanaSerializer(tema).data)
    tema = TribuTemaSemana.objects.filter(activo=True).order_by('-creado').first()
    if tema is None:
        tema = TribuTemaSemana.objects.order_by('-creado').first()
    if tema is None:
        return Response({'detail': 'Aún no hay tema semanal definido.'}, status=404)
    return Response(TribuTemaSemanaSerializer(tema).data)


@api_view(['GET', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def tribu_compromiso(request):
    iso_year, semana = _tribu_current_week(request.user)
    compromiso, _ = TribuCompromiso.objects.get_or_create(
        user=request.user, year=iso_year, week_number=semana)
    if request.method == 'PATCH':
        serializer = TribuCompromisoSerializer(compromiso, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        compromiso.refresh_from_db()
    return Response(TribuCompromisoSerializer(compromiso).data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def tribu_enviar_kanban(request):
    iso_year, semana = _tribu_current_week(request.user)
    compromiso, _ = TribuCompromiso.objects.get_or_create(
        user=request.user, year=iso_year, week_number=semana)
    texto = (request.data.get('texto') or compromiso.texto or '').strip()
    tribu = request.data.get('tribu') or compromiso.tribu or ''
    detalle = (request.data.get('tribu_detalle') or compromiso.tribu_detalle or '').strip()
    if not texto:
        return Response({'error': 'Escribe tu compromiso antes de enviarlo.'}, status=400)
    if tribu == 'OTRO' and detalle:
        con_quien = detalle
    elif tribu:
        con_quien = TRIBU_PREP.get(tribu, detalle or 'tu tribu')
    else:
        con_quien = 'tu tribu'
    compromiso.texto = texto
    compromiso.tribu = tribu
    compromiso.tribu_detalle = detalle
    if compromiso.enviado_kanban and compromiso.accion_id:
        compromiso.save(update_fields=['texto', 'tribu', 'tribu_detalle'])
        return Response({'status': 'ok', 'accion_id': str(compromiso.accion_id), 'repetido': True})
    texto_accion = f'Compartir con {con_quien} {texto}'
    accion = AccionKanban.objects.create(
        user=request.user,
        texto_accion=texto_accion[:2000],
        origen='OTRO',
        estado_actual=AccionKanban.EstadoChoices.KANBAN_ACTIVO,
    )
    HistorialMovimiento.objects.create(
        accion=accion,
        estado_anterior='TRIBU',
        estado_nuevo=AccionKanban.EstadoChoices.KANBAN_ACTIVO,
    )
    compromiso.enviado_kanban = True
    compromiso.accion = accion
    compromiso.save()
    return Response({'status': 'ok', 'accion_id': str(accion.id), 'repetido': False})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def avatar_voice_sample(request, avatar_index):
    filename = AVATAR_VOICE_MAP.get(avatar_index)
    if not filename:
        return Response({'error': 'Avatar no válido'}, status=status.HTTP_404_NOT_FOUND)

    filepath = os.path.join(settings.BASE_DIR, 'dashboard', 'voices', filename)
    if not os.path.exists(filepath):
        return Response({'error': 'Archivo de voz no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    with open(filepath, 'rb') as f:
        audio_data = f.read()

    return HttpResponse(audio_data, content_type='audio/mpeg')


def _get_or_create_onboarding(user):
    profile, created = OnboardingProfile.objects.get_or_create(
        user=user,
        defaults={'status': 'cuenta_creada'}
    )
    return profile


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def onboarding_avatars(request):
    avatars = filtrar_queryset(
        Avatar.objects.filter(is_active=True), request.user, 'avatar')
    return Response(AvatarSerializer(avatars, many=True).data)


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def onboarding_select_avatar(request):
    profile = _get_or_create_onboarding(request.user)
    serializer = SelectAvatarSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    avatar = Avatar.objects.get(id=serializer.validated_data['avatar_id'])
    asignados = ids_asignados(request.user, 'avatar')
    if asignados is not None and avatar.id not in asignados:
        return Response(
            {'error': 'Ese avatar no está asignado a tu usuario.'}, status=403)
    profile.avatar = avatar
    profile.status = OnboardingProfile.Status.AVATAR_SELECCIONADO
    profile.save(update_fields=['avatar', 'status'])
    return Response(OnboardingProfileSerializer(profile).data)


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def onboarding_accept_recommended(request):
    profile = _get_or_create_onboarding(request.user)
    profile.intensity = OnboardingProfile.Intensity.EQUILIBRADA
    profile.activations_app = True
    profile.activations_push = True
    profile.activations_whatsapp = True
    profile.activations_calls = False
    profile.schedule_type = OnboardingProfile.Schedule.MANANA_TARDE
    profile.custom_schedule_start = None
    profile.custom_schedule_end = None
    profile.tone = OnboardingProfile.Tone.ADAPTATIVO
    profile.used_recommended_config = True
    profile.status = OnboardingProfile.Status.CONFIG_RECOMENDADA_ACEPTADA
    profile.save()
    return Response(OnboardingProfileSerializer(profile).data)


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def onboarding_customize_intensity(request):
    profile = _get_or_create_onboarding(request.user)
    serializer = IntensitySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    profile.intensity = serializer.validated_data['intensity']
    if profile.status == OnboardingProfile.Status.AVATAR_SELECCIONADO:
        profile.status = OnboardingProfile.Status.PERSONALIZACION_INICIADA
    profile.save(update_fields=['intensity', 'status'])
    return Response(OnboardingProfileSerializer(profile).data)


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def onboarding_customize_activations(request):
    profile = _get_or_create_onboarding(request.user)
    serializer = ActivationsSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    profile.activations_app = serializer.validated_data['activations_app']
    profile.activations_push = serializer.validated_data['activations_push']
    profile.activations_whatsapp = serializer.validated_data['activations_whatsapp']
    profile.activations_calls = serializer.validated_data['activations_calls']
    profile.save(update_fields=['activations_app', 'activations_push', 'activations_whatsapp', 'activations_calls'])
    return Response(OnboardingProfileSerializer(profile).data)


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def onboarding_customize_schedule(request):
    profile = _get_or_create_onboarding(request.user)
    serializer = ScheduleSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    profile.schedule_type = serializer.validated_data['schedule_type']
    profile.custom_schedule_start = serializer.validated_data.get('custom_schedule_start')
    profile.custom_schedule_end = serializer.validated_data.get('custom_schedule_end')
    profile.save(update_fields=['schedule_type', 'custom_schedule_start', 'custom_schedule_end'])
    return Response(OnboardingProfileSerializer(profile).data)


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def onboarding_customize_tone(request):
    profile = _get_or_create_onboarding(request.user)
    serializer = ToneSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    profile.tone = serializer.validated_data['tone']
    profile.status = OnboardingProfile.Status.PERSONALIZACION_COMPLETADA
    profile.save(update_fields=['tone', 'status'])
    return Response(OnboardingProfileSerializer(profile).data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def onboarding_summary(request):
    profile = _get_or_create_onboarding(request.user)
    return Response(OnboardingProfileSerializer(profile).data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def onboarding_confirm(request):
    profile = _get_or_create_onboarding(request.user)
    profile.status = OnboardingProfile.Status.CONFIGURACION_CONFIRMADA
    profile.confirmed_at = timezone.now()
    profile.save(update_fields=['status', 'confirmed_at'])
    return Response({'status': 'configuracion_confirmada', 'confirmed_at': profile.confirmed_at})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def onboarding_complete(request):
    profile = _get_or_create_onboarding(request.user)
    profile.status = OnboardingProfile.Status.ONBOARDING_FINALIZADO
    profile.onboarding_completed_at = timezone.now()
    profile.guided_tour_status = OnboardingProfile.GuidedTour.PENDING
    profile.save(update_fields=['status', 'onboarding_completed_at', 'guided_tour_status'])
    # Sync legacy config
    config, _ = ConfiguracionUsuario.objects.get_or_create(user=request.user)
    config.onboarding_completado = True
    if profile.avatar:
        config.avatar_index = profile.avatar.id
    config.nivel_exigencia = profile.intensity.upper() if profile.intensity else 'MEDIO'
    config.save(update_fields=['onboarding_completado', 'avatar_index', 'nivel_exigencia'])
    return Response({'status': 'onboarding_finalizado'})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def onboarding_guided_tour_start(request):
    profile = _get_or_create_onboarding(request.user)
    profile.guided_tour_status = OnboardingProfile.GuidedTour.STARTED
    profile.status = OnboardingProfile.Status.VISITA_GUIADA_INICIADA
    profile.save(update_fields=['guided_tour_status', 'status'])
    return Response({'guided_tour_status': 'started'})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def onboarding_guided_tour_defer(request):
    profile = _get_or_create_onboarding(request.user)
    profile.guided_tour_status = OnboardingProfile.GuidedTour.PENDING
    profile.status = OnboardingProfile.Status.ONBOARDING_FINALIZADO
    if not profile.onboarding_completed_at:
        profile.onboarding_completed_at = timezone.now()
    profile.save(update_fields=['guided_tour_status', 'status', 'onboarding_completed_at'])
    # Sync legacy config
    config, _ = ConfiguracionUsuario.objects.get_or_create(user=request.user)
    config.onboarding_completado = True
    config.save(update_fields=['onboarding_completado'])
    return Response({'guided_tour_status': 'pending'})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def onboarding_status(request):
    profile = _get_or_create_onboarding(request.user)
    return Response({
        'status': profile.status,
        'guided_tour_status': profile.guided_tour_status,
        'onboarding_completed_at': profile.onboarding_completed_at,
        'onboarding_completado': profile.status in [
            OnboardingProfile.Status.ONBOARDING_FINALIZADO,
            OnboardingProfile.Status.VISITA_GUIADA_PENDIENTE,
            OnboardingProfile.Status.VISITA_GUIADA_INICIADA,
            OnboardingProfile.Status.VISITA_GUIADA_COMPLETADA,
        ],
    })


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def onboarding_reset(request):
    """Reinicia el perfil de onboarding al estado inicial (cuenta creada),
    permitiendo volver a visualizar el flujo de onboarding desde el inicio
    como si la aplicación no hubiera sido configurada."""
    profile = _get_or_create_onboarding(request.user)
    profile.status = OnboardingProfile.Status.CUENTA_CREADA
    profile.onboarding_completed_at = None
    profile.avatar = None
    profile.intensity = OnboardingProfile.Intensity.EQUILIBRADA
    profile.activations_app = True
    profile.activations_push = True
    profile.activations_whatsapp = True
    profile.activations_calls = False
    profile.schedule_type = OnboardingProfile.Schedule.MANANA_TARDE
    profile.custom_schedule_start = None
    profile.custom_schedule_end = None
    profile.tone = OnboardingProfile.Tone.ADAPTATIVO
    profile.used_recommended_config = False
    profile.guided_tour_status = OnboardingProfile.GuidedTour.PENDING
    profile.save(update_fields=[
        'status', 'onboarding_completed_at', 'avatar', 'intensity',
        'activations_app', 'activations_push', 'activations_whatsapp',
        'activations_calls', 'schedule_type', 'custom_schedule_start',
        'custom_schedule_end', 'tone', 'used_recommended_config',
        'guided_tour_status',
    ])
    # Reset de la configuración de usuario relacionada al onboarding
    try:
        config = request.user.configuracion
        config.onboarding_completado = False
        config.save(update_fields=['onboarding_completado'])
    except Exception:
        pass
    return Response({
        'status': profile.status,
        'onboarding_completado': False,
        'message': 'Onboarding reiniciado al estado inicial.',
    })


# ---------------------------------------------------------------------------
# INICIO module – Pantalla INICIO, Tutorial, Visita Guiada, Aprendizaje
# ---------------------------------------------------------------------------

def _get_or_create_inicio_state(user):
    state, _ = InicioState.objects.get_or_create(user=user)
    if not state.first_entry_at:
        state.first_entry_at = timezone.now()
        state.save(update_fields=['first_entry_at'])
    return state


def _log_inicio_event(user, event_type, origin, metadata=None):
    InicioEventLog.objects.create(
        user=user, event_type=event_type, origin=origin, metadata=metadata or {}
    )


def _set_inicio_status(state, new_status):
    state.status = new_status
    state.save(update_fields=['status'])
    return state


def _log_config_change(user, categoria, metadata=None):
    """Registra cambios de configuración (§25-29, §32): evento + estado."""
    data = {'categoria': categoria}
    if metadata:
        data.update(metadata)
    _log_inicio_event(user, 'config_changed', 'configuracion', data)
    state = _get_or_create_inicio_state(user)
    _set_inicio_status(state, 'cambios_configuracion_realizados')


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def inicio_state(request):
    state = _get_or_create_inicio_state(request.user)
    return Response(InicioStateSerializer(state).data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def inicio_intro_video_shown(request):
    state = _get_or_create_inicio_state(request.user)
    state.has_seen_intro_video = True
    state.save(update_fields=['has_seen_intro_video'])
    _set_inicio_status(state, 'video_inicial_mostrado')
    _log_inicio_event(request.user, 'intro_video_shown', 'inicio')
    return Response(InicioStateSerializer(state).data)


def _video_metadata(request):
    """Metadata del video inicial (§11.4): origen, duración, completitud."""
    data = request.data if isinstance(request.data, dict) else {}
    metadata = {}
    for key in ('origin', 'duration_seconds', 'completed', 'percent'):
        if key in data:
            metadata[key] = data[key]
    return metadata


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def inicio_intro_video_completed(request):
    state = _get_or_create_inicio_state(request.user)
    state.intro_video_completed = True
    state.save(update_fields=['intro_video_completed'])
    _set_inicio_status(state, 'video_inicial_completado')
    _log_inicio_event(request.user, 'intro_video_completed', 'inicio', _video_metadata(request))
    return Response(InicioStateSerializer(state).data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def inicio_intro_video_abandoned(request):
    state = _get_or_create_inicio_state(request.user)
    _set_inicio_status(state, 'video_inicial_abandonado')
    _log_inicio_event(request.user, 'intro_video_abandoned', 'inicio', _video_metadata(request))
    return Response({'status': 'abandoned'})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def inicio_intro_video_replayed(request):
    """Video inicial visto desde el tutorial (§11): vuelve a Tutorial al terminar."""
    state = _get_or_create_inicio_state(request.user)
    _set_inicio_status(state, 'video_visto_desde_tutorial')
    _log_inicio_event(request.user, 'intro_video_replayed', 'tutorial', _video_metadata(request))
    return Response(InicioStateSerializer(state).data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def inicio_dashboard_open(request):
    state = _get_or_create_inicio_state(request.user)
    data = request.data if isinstance(request.data, dict) else {}
    first = InicioEventLog.objects.filter(
        user=request.user, event_type='dashboard_opened'
    ).exists()
    metadata = {
        'origen_boton': 'inicio',
        'es_primer_acceso': not first,
    }
    if 'origin' in data:
        metadata['origen_detalle'] = data['origin']
    _set_inicio_status(state, 'dashboard_abierto_desde_inicio')
    _log_inicio_event(request.user, 'dashboard_opened', 'inicio', metadata)
    return Response(InicioStateSerializer(state).data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def inicio_tutorial_open(request):
    state = _get_or_create_inicio_state(request.user)
    _set_inicio_status(state, 'tutorial_abierto')
    _log_inicio_event(request.user, 'tutorial_opened', 'inicio')
    return Response(InicioStateSerializer(state).data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def inicio_config_open(request):
    """'Ir a configuración' – primero muestra video + mensaje del avatar"""
    state = _get_or_create_inicio_state(request.user)
    _set_inicio_status(state, 'configuracion_abierta_desde_inicio')
    _log_inicio_event(request.user, 'config_opened', 'inicio')
    return Response(InicioStateSerializer(state).data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def inicio_config_video_shown(request):
    """El avatar video se mostró – ahora puede entrar a config"""
    state = _get_or_create_inicio_state(request.user)
    _set_inicio_status(state, 'video_configuracion_mostrado')
    _log_inicio_event(request.user, 'config_video_shown', 'inicio')
    return Response(InicioStateSerializer(state).data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def inicio_config_open_now(request):
    """Usuario decide entrar a configuración después del video"""
    state = _get_or_create_inicio_state(request.user)
    _set_inicio_status(state, 'configuracion_por_categorias_abierta')
    _log_inicio_event(request.user, 'config_categories_opened', 'inicio')
    return Response(InicioStateSerializer(state).data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def inicio_config_volver_inicio(request):
    """Usuario vuelve al inicio desde la pantalla de config"""
    state = _get_or_create_inicio_state(request.user)
    _set_inicio_status(state, 'usuario_volvio_a_inicio')
    _log_inicio_event(request.user, 'returned_to_inicio', 'configuracion')
    return Response(InicioStateSerializer(state).data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def inicio_guided_tour_blocks(request):
    blocks = filtrar_queryset(
        GuidedTourBlock.objects.all().order_by('order'), request.user, 'bloque')
    return Response(GuidedTourBlockSerializer(blocks, many=True).data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def inicio_guided_tour_start(request):
    state = _get_or_create_inicio_state(request.user)
    state.guided_tour_status = 'started'
    state.save(update_fields=['guided_tour_status'])
    _set_inicio_status(state, 'visita_guiada_iniciada')
    profile = OnboardingProfile.objects.filter(user=request.user).first()
    if profile:
        profile.guided_tour_status = OnboardingProfile.GuidedTour.STARTED
        profile.status = OnboardingProfile.Status.VISITA_GUIADA_INICIADA
        profile.save(update_fields=['guided_tour_status', 'status'])
    _log_inicio_event(request.user, 'guided_tour_started', 'inicio')
    return Response({'guided_tour_status': 'started'})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def inicio_guided_tour_complete(request):
    state = _get_or_create_inicio_state(request.user)
    state.guided_tour_status = 'completed'
    state.save(update_fields=['guided_tour_status'])
    _set_inicio_status(state, 'visita_guiada_completada')
    profile = OnboardingProfile.objects.filter(user=request.user).first()
    if profile:
        profile.guided_tour_status = OnboardingProfile.GuidedTour.COMPLETED
        profile.status = OnboardingProfile.Status.VISITA_GUIADA_COMPLETADA
        profile.save(update_fields=['guided_tour_status', 'status'])
    _log_inicio_event(request.user, 'guided_tour_completed', 'inicio')
    return Response({'guided_tour_status': 'completed'})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def inicio_guided_tour_abandon(request):
    """Visita guiada abandonada antes de terminar (§37): queda pendiente."""
    state = _get_or_create_inicio_state(request.user)
    data = request.data if isinstance(request.data, dict) else {}
    metadata = {}
    if 'paso_actual' in data:
        metadata['paso_actual'] = data['paso_actual']
    if 'total_pasos' in data:
        metadata['total_pasos'] = data['total_pasos']
    _set_inicio_status(state, 'visita_guiada_pendiente')
    _log_inicio_event(request.user, 'guided_tour_abandoned', 'inicio', metadata)
    return Response({'guided_tour_status': state.guided_tour_status})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def inicio_learn_categories(request):
    cats = filtrar_queryset(
        LearningCategory.objects.all().order_by('order')
        .prefetch_related('modules'), request.user, 'categoria')
    modulos = ids_asignados(request.user, 'modulo')
    data = LearningCategorySerializer(cats, many=True).data
    if modulos is not None:
        filtradas = []
        for cat in data:
            visibles = [m for m in cat['modules'] if m['id'] in modulos]
            if visibles:
                cat['modules'] = visibles
                filtradas.append(cat)
        data = filtradas
    return Response(data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def inicio_learn_sections_opened(request):
    """Aprender por secciones abierto (§12, §32)."""
    state = _get_or_create_inicio_state(request.user)
    _set_inicio_status(state, 'aprender_secciones_abierto')
    _log_inicio_event(request.user, 'learn_by_sections_opened', 'tutorial')
    return Response(InicioStateSerializer(state).data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def inicio_learn_category_select(request):
    """Categoría de aprendizaje seleccionada (§12, §32)."""
    state = _get_or_create_inicio_state(request.user)
    data = request.data if isinstance(request.data, dict) else {}
    slug = data.get('slug', '')
    _set_inicio_status(state, 'categoria_aprendizaje_seleccionada')
    _log_inicio_event(request.user, 'learn_category_selected', 'aprender_secciones', {'slug': slug})
    return Response(InicioStateSerializer(state).data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def inicio_events(request):
    limit = request.query_params.get('limit', 50)
    events = InicioEventLog.objects.filter(user=request.user).order_by('-created_at')[:int(limit)]
    return Response(InicioEventLogSerializer(events, many=True).data)


# ---------------------------------------------------------------------------
# CONFIG module
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def config_profile(request):
    profile = _get_or_create_onboarding(request.user)
    data = OnboardingProfileSerializer(profile).data
    data['email'] = request.user.email
    data['username'] = request.user.username
    data['date_joined'] = request.user.date_joined
    return Response(data)


@api_view(['GET', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def config_avatar(request):
    """Cambiar avatar desde Configuración"""
    if request.method == 'GET':
        profile = _get_or_create_onboarding(request.user)
        return Response({
            'current_avatar_id': profile.avatar_id,
            'avatar': AvatarSerializer(profile.avatar).data if profile.avatar else None,
            'avatars': AvatarSerializer(
                filtrar_queryset(Avatar.objects.all(), request.user, 'avatar'),
                many=True).data,
        })
    serializer = ConfigAvatarSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    avatar = get_object_or_404(Avatar, id=serializer.validated_data['avatar_id'])
    profile = _get_or_create_onboarding(request.user)
    previous_id = profile.avatar_id
    profile.avatar = avatar
    profile.save(update_fields=['avatar'])
    _log_config_change(request.user, 'avatar', {
        'avatar_anterior': previous_id,
        'nuevo_avatar': avatar.id,
    })
    return Response({'current_avatar_id': avatar.id, 'avatar': AvatarSerializer(avatar).data})


@api_view(['GET', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def config_accompaniment(request):
    profile = _get_or_create_onboarding(request.user)
    if request.method == 'GET':
        data = OnboardingProfileSerializer(profile).data
        prefs = AccompanimentPreferences.objects.filter(user=request.user).first()
        data['support_types'] = prefs.support_types if prefs else []
        return Response(data)
    serializer = IntensitySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    profile.intensity = serializer.validated_data['intensity']
    profile.save(update_fields=['intensity'])
    support_types = None
    raw_support = request.data.get('support_types') if isinstance(request.data, dict) else None
    if isinstance(raw_support, list):
        valid = {c for c, _ in AccompanimentPreferences.SupportType.choices}
        support_types = [s for s in raw_support if s in valid]
        prefs, _ = AccompanimentPreferences.objects.get_or_create(user=request.user)
        prefs.support_types = support_types
        prefs.save(update_fields=['support_types'])
    _log_config_change(request.user, 'acompanamiento', {
        'intensidad': profile.intensity,
        'tipos_apoyo': support_types,
    })
    return Response(OnboardingProfileSerializer(profile).data)


@api_view(['GET', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def config_notifications(request):
    prefs = NotificationPreference.objects.filter(user=request.user)
    if request.method == 'GET':
        if not prefs.exists():
            return Response([])
        return Response(NotificationPreferenceSerializer(prefs, many=True).data)
    # PATCH – reemplaza todas las preferencias.
    # La UI usó durante un tiempo nombres legibles (llamadas / activar /
    # desactivar / criticas); se aceptan y se guardan con los valores canónicos.
    canales = {'llamadas': 'calls', 'calls': 'calls', 'app': 'app',
               'push': 'push', 'whatsapp': 'whatsapp'}
    estados = {'activar': 'active', 'active': 'active',
               'desactivar': 'inactive', 'inactive': 'inactive',
               'criticas': 'critical_only', 'critical_only': 'critical_only'}
    prefs.delete()
    saved = []
    for item in request.data:
        if not isinstance(item, dict) or 'channel' not in item or 'state' not in item:
            continue
        channel = canales.get(str(item['channel']).strip().lower())
        state = estados.get(str(item['state']).strip().lower())
        if not channel or not state:
            continue
        NotificationPreference.objects.update_or_create(
            user=request.user, channel=channel, defaults={'state': state})
        saved.append({'channel': channel, 'state': state})
    _log_config_change(request.user, 'notificaciones', {'preferencias': saved})
    prefs = NotificationPreference.objects.filter(user=request.user)
    return Response(NotificationPreferenceSerializer(prefs, many=True).data)


@api_view(['GET', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def config_schedule(request):
    profile = _get_or_create_onboarding(request.user)
    exceptions = ScheduleException.objects.filter(user=request.user)
    if request.method == 'GET':
        return Response({
            'schedule_type': profile.schedule_type,
            'custom_schedule_start': profile.custom_schedule_start,
            'custom_schedule_end': profile.custom_schedule_end,
            'exceptions': ScheduleExceptionSerializer(exceptions, many=True).data,
        })
    data = request.data
    changed = {}
    if 'schedule_type' in data:
        profile.schedule_type = data['schedule_type']
        changed['schedule_type'] = data['schedule_type']
    if 'custom_schedule_start' in data:
        profile.custom_schedule_start = data.get('custom_schedule_start')
        changed['custom_schedule_start'] = data.get('custom_schedule_start')
    if 'custom_schedule_end' in data:
        profile.custom_schedule_end = data.get('custom_schedule_end')
        changed['custom_schedule_end'] = data.get('custom_schedule_end')
    profile.save(update_fields=['schedule_type', 'custom_schedule_start', 'custom_schedule_end'])
    _log_config_change(request.user, 'horarios', changed)
    return Response({
        'schedule_type': profile.schedule_type,
        'custom_schedule_start': profile.custom_schedule_start,
        'custom_schedule_end': profile.custom_schedule_end,
        'exceptions': ScheduleExceptionSerializer(exceptions, many=True).data,
    })


@api_view(['GET', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def config_tone(request):
    profile = _get_or_create_onboarding(request.user)
    if request.method == 'GET':
        return Response({'tone': profile.tone})
    serializer = ToneSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    profile.tone = serializer.validated_data['tone']
    profile.save(update_fields=['tone'])
    _log_config_change(request.user, 'tono', {'tono': profile.tone})
    return Response({'tone': profile.tone})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def config_schedule_exception(request):
    # La UI histórica enviaba tipos y valores en castellano; se traducen a los
    # valores canónicos del modelo antes de validar (Doc 27 §2.3).
    dias = {
        'lun': 'monday', 'mar': 'tuesday', 'mié': 'wednesday', 'mie': 'wednesday',
        'jue': 'thursday', 'vie': 'friday', 'sáb': 'saturday', 'sab': 'saturday',
        'dom': 'sunday', 'lunes': 'monday', 'martes': 'tuesday',
        'miercoles': 'wednesday', 'miércoles': 'wednesday', 'jueves': 'thursday',
        'viernes': 'friday', 'sabado': 'saturday', 'sábado': 'saturday',
        'domingo': 'sunday',
    }
    tipos = {
        'dia_semana': 'no_days', 'no_days': 'no_days',
        'horas': 'no_hours', 'no_hours': 'no_hours',
        'descanso': 'no_night', 'noche': 'no_night', 'madrugada': 'no_night',
        'no_night': 'no_night',
        'acciones_criticas': 'critical_only_outside',
        'critical_only_outside': 'critical_only_outside',
    }
    payload = dict(request.data)
    tipo_original = str(payload.get('exception_type', '')).strip().lower()
    tipo = tipos.get(tipo_original, tipo_original)
    value = payload.get('value') if isinstance(payload.get('value'), dict) else {}

    if tipo == 'no_days':
        days = value.get('days')
        if not days:
            dia = str(value.get('dia', '')).strip().lower()
            days = [dias.get(dia, dia)] if dia else []
        if isinstance(days, str):
            days = [days]
        value = {**value, 'days': [dias.get(str(d).strip().lower(), str(d).strip().lower()) for d in days if d]}

    elif tipo == 'no_night' and tipo_original in ('descanso', 'noche', 'madrugada'):
        value = {**value, 'etiqueta': tipo_original}

    payload['exception_type'] = tipo
    payload['value'] = value
    payload['user'] = request.user.id
    serializer = ScheduleExceptionSerializer(data=payload)
    serializer.is_valid(raise_exception=True)
    serializer.save(user=request.user)
    return Response(serializer.data, status=201)


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def config_schedule_exception_delete(request, pk):
    exc = get_object_or_404(ScheduleException, pk=pk, user=request.user)
    exc.delete()
    return Response(status=204)


# Privacy & Security
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def config_privacy(request):
    prefs, _ = InicioPrivacyPreferences.objects.get_or_create(user=request.user)
    return Response({
        'data_collection': prefs.data_collection,
        'analytics': prefs.analytics,
        'personalized_recommendations': prefs.personalized_recommendations,
        'third_party_sharing': prefs.third_party_sharing,
    })


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def config_privacy_permissions(request):
    serializer = PrivacyPermissionSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    prefs, _ = InicioPrivacyPreferences.objects.get_or_create(user=request.user)
    for field, value in serializer.validated_data.items():
        setattr(prefs, field, value)
    prefs.save()
    AccountChangeLog.objects.create(
        user=request.user, change_type='privacy_permissions_updated',
        origin='configuracion/privacidad', metadata=serializer.validated_data,
    )
    return Response(InicioPrivacyPreferencesSerializer(prefs).data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def config_privacy_export(request):
    """Exporta (de forma síncrona) toda la información personal del usuario
    en un formato descargable (JSON)."""
    user = request.user
    export_data = {
        'exported_at': timezone.now().isoformat(),
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'date_joined': user.date_joined,
            'last_login': user.last_login,
        },
    }

    def _add(key, qs):
        try:
            export_data[key] = list(qs.values())
        except Exception:
            export_data[key] = []

    _add('rueda_vida', RuedaVida.objects.filter(user=user))
    _add('registros_rueda', RegistroRueda.objects.filter(user=user))
    _add('diagnosticos_rueda', DiagnosticoRueda.objects.filter(user=user))
    _add('focus_areas', FocusArea.objects.filter(diagnostico__user=user))
    _add('time_blocks', TimeBlock.objects.filter(user=user))
    _add('kanban_tasks', KanbanTask.objects.filter(user=user))
    _add('recordatorios', Recordatorio.objects.filter(user=user))
    _add('suplementos', Suplemento.objects.filter(user=user))
    _add('suplemento_tomas', SuplementoToma.objects.filter(suplemento__user=user))
    _add('keep_notas', KeepNota.objects.filter(user=user))
    _add('matrix_items', MatrixItem.objects.filter(user=user))
    _add('metas_anuales', MetaAnual.objects.filter(user=user))
    _add('gran_metas_anuales', GranMetaAnual.objects.filter(user=user))
    _add('objetivos_mensuales', ObjetivoMensual.objects.filter(user=user))
    _add('objetivos_semanales', ObjetivoSemanal.objects.filter(user=user))
    _add('propuestas_ia', PropuestaIA.objects.filter(user=user))
    _add('kanban_actions', KanbanAction.objects.filter(user=user))
    _add('acciones_kanban', AccionKanban.objects.filter(user=user))
    _add('subacciones_kanban', SubaccionKanban.objects.filter(accion__user=user))
    _add('eventos_accion', EventoAccion.objects.filter(accion__user=user))
    _add('historial_movimiento', HistorialMovimiento.objects.filter(accion__user=user))
    _add('monthly_plans', MonthlyPlan.objects.filter(user=user))
    _add('monthly_goals', MonthlyGoal.objects.filter(plan__user=user))
    _add('weekly_plans', WeeklyPlan.objects.filter(user=user))
    _add('actions', Action.objects.filter(weekly_plan__user=user))
    _add('action_delegations', ActionDelegation.objects.filter(user=user))
    _add('accompanied_preferences', AccompanimentPreferences.objects.filter(user=user))
    _add('notification_preferences', NotificationPreference.objects.filter(user=user))
    _add('schedule_exceptions', ScheduleException.objects.filter(user=user))
    _add('privacy_preferences', InicioPrivacyPreferences.objects.filter(user=user))
    _add('account_change_logs', AccountChangeLog.objects.filter(user=user))
    _add('inicio_state', InicioState.objects.filter(user=user))
    try:
        _add('inicio_events', InicioEventLog.objects.filter(user=user).order_by('-created_at')[:1000])
    except Exception:
        export_data['inicio_events'] = []
    _add('configuracion_usuario', ConfiguracionUsuario.objects.filter(user=user))
    _add('activaciones', Activacion.objects.filter(user=user))
    _add('cuentas_columnas', CuentaColumna.objects.filter(user=user))
    _add('cuentas_registros', CuentaRegistro.objects.filter(user=user))
    _add('cuentas_valores', CuentaValor.objects.filter(registro__user=user))
    _add('hora_oro_experiencias', HoraOroExperiencia.objects.filter(user=user))
    _add('hora_oro_ajustes', HoraOroAjustes.objects.filter(user=user))
    _add('focus_sessions', FocusSession.objects.filter(user=user))
    _add('coaching_entries', CoachingEntry.objects.filter(user=user))
    _add('tribu_compromisos', TribuCompromiso.objects.filter(user=user))
    _add('push_subscriptions', PushSubscription.objects.filter(user=user))
    _add('agent_conversations', AgentConversation.objects.filter(user=user))
    _add('agent_schedules', AgentSchedule.objects.filter(user=user))
    _add('agent_config', AgentConfig.objects.filter(user=user))
    _add('focusia_reports', FocusiaReport.objects.filter(user=user))

    _log_inicio_event(request.user, 'data_export_requested', 'config')
    return Response(export_data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def config_privacy_delete_data(request):
    """Eliminar todos los datos del usuario (irreversible). Requiere doble confirmación."""
    confirm = request.data.get('confirm', False)
    if not confirm:
        return Response(
            {'error': 'Debe confirmar la eliminación de datos. Esta acción es irreversible.'},
            status=400,
        )
    _log_inicio_event(request.user, 'data_deletion_executed', 'config')
    user = request.user
    InicioEventLog.objects.filter(user=user).delete()
    InicioState.objects.filter(user=user).delete()
    InicioPrivacyPreferences.objects.filter(user=user).delete()
    AccompanimentPreferences.objects.filter(user=user).delete()
    NotificationPreference.objects.filter(user=user).delete()
    ScheduleException.objects.filter(user=user).delete()
    AccountChangeLog.objects.filter(user=user).delete()
    RuedaVida.objects.filter(user=user).delete()
    RegistroRueda.objects.filter(user=user).delete()
    DiagnosticoRueda.objects.filter(user=user).delete()
    FocusArea.objects.filter(diagnostico__user=user).delete()
    TimeBlock.objects.filter(user=user).delete()
    KanbanTask.objects.filter(user=user).delete()
    Recordatorio.objects.filter(user=user).delete()
    KeepNota.objects.filter(user=user).delete()
    MatrixItem.objects.filter(user=user).delete()
    MetaAnual.objects.filter(user=user).delete()
    GranMetaAnual.objects.filter(user=user).delete()
    ObjetivoMensual.objects.filter(user=user).delete()
    ObjetivoSemanal.objects.filter(user=user).delete()
    PropuestaIA.objects.filter(user=user).delete()
    KanbanAction.objects.filter(user=user).delete()
    AccionKanban.objects.filter(user=user).delete()
    MonthlyPlan.objects.filter(user=user).delete()
    WeeklyPlan.objects.filter(user=user).delete()
    Action.objects.filter(weekly_plan__user=user).delete()
    ConfiguracionUsuario.objects.filter(user=user).delete()
    AgentConversation.objects.filter(user=user).delete()
    FocusiaReport.objects.filter(user=user).delete()
    InteraccionUsuario.objects.filter(user=user).delete()
    AccountChangeLog.objects.create(
        user=user, change_type='data_deleted',
        origin='configuracion/privacidad', metadata={'confirmed': True},
    )
    return Response({'status': 'data_deleted'})


# Account
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def config_account(request):
    return Response({
        'email': request.user.email,
        'username': request.user.username,
        'date_joined': request.user.date_joined,
        'last_login': request.user.last_login,
    })


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def config_account_update(request):
    if 'email' in request.data:
        request.user.email = request.data['email']
    if 'username' in request.data:
        request.user.username = request.data['username']
    request.user.save(update_fields=set(request.data.keys()) & {'email', 'username'})
    AccountChangeLog.objects.create(
        user=request.user,
        change_type='profile_updated',
        origin='config',
        metadata={'fields': list(request.data.keys())},
    )
    return Response({
        'email': request.user.email,
        'username': request.user.username,
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def config_change_password(request):
    serializer = ChangePasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    if not request.user.check_password(serializer.validated_data['old_password']):
        return Response({'old_password': 'Contraseña actual incorrecta'}, status=400)
    request.user.set_password(serializer.validated_data['new_password'])
    request.user.save(update_fields=['password'])
    AccountChangeLog.objects.create(
        user=request.user, change_type='password_changed', origin='config'
    )
    return Response({'status': 'password_changed'})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def config_devices(request):
    sessions = request.user.session_set.all() if hasattr(request.user, 'session_set') else []
    devices = []
    for s in sessions:
        data = s.get_decoded()
        devices.append({
            'session_key': s.session_key[:8] + '...',
            'last_activity': data.get('_session_expiry'),
            'user_agent': data.get('user_agent', 'Desconocido'),
            'ip_address': data.get('ip_address', 'Desconocido'),
        })
    return Response(devices)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def config_devices_logout_all(request):
    request.user.session_set.all().delete()
    _log_inicio_event(request.user, 'logout_all_devices', 'config')
    return Response({'status': 'all_devices_logged_out'})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def config_plan(request):
    user = request.user
    return Response({
        'plan': 'free',
        'features': {
            'max_workspaces': 1,
            'max_members': None,
            'storage_mb': 100,
        },
        'since': user.date_joined,
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def config_modify_plan_availability(request):
    has_approved = GranMetaAnual.objects.filter(
        user=request.user, status=GranMetaAnual.Status.APROBADA
    ).exists()
    return Response({'available': has_approved})


# ── Frases Motivacionales y Capacitaciones Mensuales ──

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def motivational_today(request):
    data = get_program_day_data(request.user)
    if data is None:
        return Response({'error': 'No hay contenido disponible'}, status=404)
    get_or_log_phrase_view(request.user, get_current_program_day(request.user))
    return Response(data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def motivational_current_training(request):
    program_day = get_current_program_day(request.user)
    if program_day is None:
        return Response({'error': 'No hay contenido disponible'}, status=404)
    month = program_day.month
    training = MonthlyTraining.objects.filter(month=month).first()
    if not training:
        return Response({'error': 'No hay capacitación para este mes'}, status=404)
    asignadas = ids_asignados(request.user, 'capacitacion')
    if asignadas is not None and training.id not in asignadas:
        return Response(
            {'error': 'Esta capacitación no está asignada a tu usuario.'}, status=404)
    return Response(MonthlyTrainingSerializer(training).data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def motivational_progress(request):
    summary = get_progress_summary(request.user)
    return Response(summary)


# ── Web Push (VAPID) ──

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def push_public_key(request):
    from django.conf import settings as dj_settings
    return Response({'publicKey': getattr(dj_settings, 'VAPID_PUBLIC_KEY', '')})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def push_subscribe(request):
    endpoint = (request.data.get('endpoint') or '').strip()
    keys = request.data.get('keys') or {}
    if not endpoint or not keys.get('p256dh') or not keys.get('auth'):
        return Response({'error': 'Suscripción incompleta.'}, status=400)
    sub, _ = PushSubscription.objects.update_or_create(
        endpoint=endpoint,
        defaults={'user': request.user, 'p256dh': keys['p256dh'], 'auth': keys['auth']},
    )
    return Response({'ok': True, 'id': sub.id})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def push_unsubscribe(request):
    endpoint = (request.data.get('endpoint') or '').strip()
    PushSubscription.objects.filter(user=request.user, endpoint=endpoint).delete()
    return Response({'ok': True})


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def motivational_master_table(request):
    months = ProgramMonth.objects.order_by("month_number").prefetch_related("days", "training")
    data = []
    for m in months:
        days = [ProgramDaySerializer(d).data for d in m.days.all()]
        training = MonthlyTrainingSerializer(m.training).data if hasattr(m, 'training') and m.training else None
        data.append({
            'month': ProgramMonthSerializer(m).data,
            'training': training,
            'days': days,
        })
    return Response(data)


@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def motivational_master_months(request):
    serializer = ProgramMonthSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=201)


@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def motivational_master_days(request):
    serializer = ProgramDaySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=201)


# ── Módulo Cursos ──

def _cursos_estado_meses(user, mes_actual):
    completados = set(UserTrainingProgress.objects.filter(
        user=user, completado=True).values_list('training__month__month_number', flat=True))
    meses = []
    for m in ProgramMonth.objects.order_by('month_number'):
        if m.month_number > mes_actual:
            estado = 'bloqueada'
        elif m.month_number == mes_actual:
            estado = 'completada' if m.month_number in completados else 'actual'
        else:
            estado = 'completada' if m.month_number in completados else 'disponible'
        meses.append({'month_number': m.month_number, 'theme': m.theme_name, 'estado': estado})
    return meses, completados


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def cursos_mes_actual(request):
    from .services.program_service import get_current_program_day
    program_day = get_current_program_day(request.user)
    if program_day is None:
        return Response({'detail': 'Aún no hay contenido del programa.'}, status=404)
    month = program_day.month
    training = MonthlyTraining.objects.filter(month=month).first()
    if training is None:
        return Response({'detail': 'Sin capacitación para este mes.'}, status=404)
    asignadas = ids_asignados(request.user, 'capacitacion')
    if asignadas is not None and training.id not in asignadas:
        return Response(
            {'detail': 'Esta capacitación no está asignada a tu usuario.'}, status=404)
    summary = get_progress_summary(request.user)
    mes_actual = summary.get('current_month', month.month_number)
    meses, _ = _cursos_estado_meses(request.user, mes_actual)
    completado = UserTrainingProgress.objects.filter(
        user=request.user, training=training, completado=True).exists()
    data = MonthlyTrainingSerializer(training).data
    return Response({
        'mes_actual': mes_actual,
        'progreso_pct': round(mes_actual / 12 * 100),
        'capacitacion': data,
        'completado': completado,
        'meses': meses,
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def cursos_mes(request):
    """Capacitación de un mes específico del programa (meses anteriores)."""
    from .services.program_service import get_progress_summary
    try:
        month_number = int(request.query_params.get('month', ''))
    except (TypeError, ValueError):
        return Response({'error': 'Parámetro month inválido.'}, status=400)
    try:
        month = ProgramMonth.objects.get(month_number=month_number)
    except ProgramMonth.DoesNotExist:
        return Response({'error': 'Mes no encontrado.'}, status=404)
    summary = get_progress_summary(request.user)
    mes_actual = summary.get('current_month', month_number)
    if month_number > mes_actual:
        return Response({'error': 'Ese mes aún está bloqueado.'}, status=403)
    training = MonthlyTraining.objects.filter(month=month).first()
    if training is None:
        return Response({'error': 'Sin capacitación para este mes.'}, status=404)
    asignadas = ids_asignados(request.user, 'capacitacion')
    if asignadas is not None and training.id not in asignadas:
        return Response(
            {'error': 'Esta capacitación no está asignada a tu usuario.'}, status=404)
    completado = UserTrainingProgress.objects.filter(
        user=request.user, training=training, completado=True).exists()
    data = MonthlyTrainingSerializer(training).data
    return Response({
        'mes': month_number,
        'mes_actual': mes_actual,
        'capacitacion': data,
        'completado': completado,
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def juegos_catalogo(request):
    """Catálogo de juegos y retos: lo que administra el panel y ve la app.

    Solo lectura y solo lo publicado. Se puede filtrar por categoría, que es
    el mismo criterio que usa el panel para agrupar.
    """
    qs = Juego.objects.filter(activo=True).select_related('categoria')
    categoria = request.query_params.get('categoria')
    if categoria:
        qs = qs.filter(categoria_id=categoria)
    tipo = request.query_params.get('tipo')
    if tipo in dict(Juego.Tipo.choices):
        qs = qs.filter(tipo=tipo)
    qs = filtrar_queryset(qs, request.user, 'juego')
    return Response(JuegoSerializer(qs, many=True).data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def cursos_completar(request):
    training_id = request.data.get('training_id')
    try:
        training = MonthlyTraining.objects.get(id=training_id)
    except (MonthlyTraining.DoesNotExist, TypeError, ValueError):
        return Response({'error': 'Capacitación no encontrada.'}, status=404)
    asignadas = ids_asignados(request.user, 'capacitacion')
    if asignadas is not None and training.id not in asignadas:
        return Response(
            {'error': 'Esta capacitación no está asignada a tu usuario.'}, status=403)
    prog, _ = UserTrainingProgress.objects.get_or_create(
        user=request.user, training=training)
    if not prog.completado:
        prog.completado = True
        prog.completado_en = timezone.now()
        prog.save(update_fields=['completado', 'completado_en'])
    return Response(UserTrainingProgressSerializer(prog).data)


# ══════════════ Módulo Gratitud (Doc 19) ══════════════

@api_view(['GET', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def gratitud_hoy(request):
    """Doc 19 — frase del día, pregunta fija y respuesta con guardado automático.

    GET   → frase que corresponde a hoy más la respuesta ya guardada.
    PATCH → guarda el texto del campo libre, sin botón de guardar (§II.3).
    """
    from .services.gratitud import estado, guardar_respuesta

    if request.method == 'PATCH':
        if 'texto' not in request.data:
            return Response({'error': 'Falta el campo texto.'}, status=400)
        guardar_respuesta(request.user, request.data.get('texto'))

    return Response(estado(request.user))


# ══════════════ Módulo Cumpleaños (Doc 22) ══════════════

def _cumpleanos_o_404(user, pk):
    from .models import Cumpleanos
    try:
        return Cumpleanos.objects.get(user=user, pk=pk)
    except Cumpleanos.DoesNotExist:
        from rest_framework.exceptions import NotFound
        raise NotFound('Cumpleaños no encontrado.')


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def cumpleanos_lista(request):
    """Doc 22 — pantalla principal del módulo.

    GET  → próximos cumpleaños ordenados por cercanía (§II.4).
    POST → finaliza el asistente (§II.5): registra la persona y genera el
           Evento Focusia en Fechas Importantes.
    """
    from .services import cumpleanos as svc

    if request.method == 'POST':
        from .models import Cumpleanos

        nombre = (request.data.get('nombre') or '').strip()
        categoria = request.data.get('categoria') or ''
        fecha_raw = request.data.get('fecha') or ''
        try:
            anticipacion = int(request.data.get('anticipacion_dias', 3))
        except (TypeError, ValueError):
            anticipacion = -1
        try:
            fecha = date.fromisoformat(fecha_raw)
        except ValueError:
            return Response({'error': 'Fecha inválida.'}, status=400)
        if not nombre:
            return Response({'error': 'Falta el nombre de la persona.'}, status=400)
        if categoria not in dict(Cumpleanos.CATEGORIAS):
            return Response({'error': 'Categoría inválida.'}, status=400)
        if not 0 <= anticipacion <= 365:
            return Response({'error': 'Anticipación inválida.'}, status=400)

        cumpleanos = svc.registrar(
            request.user, nombre, categoria, fecha, anticipacion)
        return Response(svc.estado(cumpleanos), status=201)

    return Response(svc.listar(request.user))


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def cumpleanos_detalle(request, pk):
    """Elimina el cumpleaños y su Evento Focusia asociado."""
    cumpleanos = _cumpleanos_o_404(request.user, pk)
    recordatorio = cumpleanos.recordatorio
    cumpleanos.delete()
    if recordatorio is not None:
        recordatorio.delete()
    return Response(status=204)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def cumpleanos_accion(request, pk):
    """Doc 22 §III — acciones sugeridas tras el recordatorio.

    Cada acción elegida (regalo, celebración, llamada u otra) se envía
    automáticamente al Kanban Backlog.
    """
    from .services import cumpleanos as svc

    cumpleanos = _cumpleanos_o_404(request.user, pk)
    accion = request.data.get('accion') or ''
    detalle = request.data.get('detalle') or ''
    if accion not in (*svc.ACCIONES, 'otra'):
        return Response({'error': 'Acción inválida.'}, status=400)
    tarea = svc.enviar_accion(request.user, cumpleanos, accion, detalle)
    return Response(
        {'id': tarea.id, 'titulo': tarea.titulo, 'columna': tarea.columna},
        status=201)
