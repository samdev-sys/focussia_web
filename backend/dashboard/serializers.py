from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator
from .models import (User, RuedaVida, TimeBlock, KanbanTask, Recordatorio, ObjetivoSemana, KeepNota, MisionHoy, CategoriaRueda, RegistroRueda, MatrixItem, Factura, Workspace, WorkspaceMember, Invitation, Delegation, Notification, MetaAnual, GranMetaAnual, AnnualGoalConversationTurn, ObjetivoMensual, PropuestaIA, ConfiguracionUsuario, MatrizEisenhower, Activacion, InteraccionUsuario, DiagnosticoRueda, AccionSugerida, FocusArea, KanbanAction, AccionKanban, HistorialMovimiento, ObjetivoSemanal, MonthlyPlan, MonthlyGoal, WeeklyPlan, Action, ActionDelegation, AgentConversation, AgentSchedule, AgentConfig, FocusiaReport, ReportDataSource, Avatar, OnboardingProfile, InicioState, InicioEventLog, LearningCategory, LearningModuleRef, GuidedTourBlock, AccompanimentPreferences, NotificationPreference, ScheduleException, AccountChangeLog,     InicioPrivacyPreferences, ProgramMonth, MonthlyTraining, ProgramDay, UserProgramProgress, DailyPhraseViewLog,
    CoachingEntry, TribuTemaSemana, TribuCompromiso, UserTrainingProgress, Juego, Membresia,
    AsignacionContenido, CuentaColumna, CuentaRegistro, CuentaValor, Suplemento, SuplementoToma,
    HoraOroExperiencia, HoraOroAjustes, FocusSession)

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'avatar_url', 'bio']
        extra_kwargs = {'password': {'write_only': True}}

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user

class UserDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'avatar_url', 'bio']

class RuedaVidaSerializer(serializers.ModelSerializer):
    class Meta:
        model = RuedaVida
        fields = ['id', 'user', 'salud', 'amistad', 'dinero']
        read_only_fields = ['user']

class TimeBlockSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeBlock
        fields = ['id', 'user', 'fecha', 'hora', 'tarea', 'estado']
        read_only_fields = ['user']

class KanbanTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = KanbanTask
        fields = ['id', 'user', 'titulo', 'descripcion', 'columna', 'fecha_hora', 'assigned_to', 'workspace', 'uuid']
        read_only_fields = ['user']

class RecordatorioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recordatorio
        fields = ['id', 'user', 'titulo', 'categoria', 'fecha_hora', 'activo', 'tomado', 'workspace']
        read_only_fields = ['user']

class SuplementoTomaSerializer(serializers.ModelSerializer):
    class Meta:
        model = SuplementoToma
        fields = ['id', 'programada', 'tomado', 'tomado_en']

class SuplementoSerializer(serializers.ModelSerializer):
    """Suplemento/medicamento con su programación (Doc 21 §II).

    Solo se envían los datos que el usuario define en el asistente: nombre,
    tipo, frecuencia, hora de la primera toma y (medicamentos) duración.
    La programación de tomas la calcula el backend.
    """
    tomas = SuplementoTomaSerializer(many=True, read_only=True)

    class Meta:
        model = Suplemento
        fields = [
            'id', 'nombre', 'tipo', 'presentacion', 'frecuencia_horas', 'hora_primera',
            'duracion_dias', 'fecha_inicio', 'activo', 'created_at', 'tomas',
        ]
        read_only_fields = ['fecha_inicio', 'activo', 'created_at']

    def validate(self, data):
        tipo = data.get('tipo', getattr(self.instance, 'tipo', 'Suplemento'))
        frecuencia = data.get('frecuencia_horas', getattr(self.instance, 'frecuencia_horas', 24))
        duracion = data.get('duracion_dias', getattr(self.instance, 'duracion_dias', None))
        if not frecuencia or frecuencia < 1 or frecuencia > 72:
            raise serializers.ValidationError({'frecuencia_horas': 'La frecuencia debe estar entre 1 y 72 horas.'})
        if tipo == 'Medicamento':
            if not duracion or duracion < 1:
                raise serializers.ValidationError({'duracion_dias': 'Indica la duración del tratamiento en días.'})
        else:
            data['duracion_dias'] = None
        return data

class HoraOroExperienciaSerializer(serializers.ModelSerializer):
    """Doc 24 §II.3 — una experiencia familiar dentro del planificador semanal."""
    class Meta:
        model = HoraOroExperiencia
        fields = [
            'id', 'dia_semana', 'posicion', 'categoria', 'actividad',
            'realizada', 'realizada_en', 'created_at',
        ]
        read_only_fields = ['realizada', 'realizada_en', 'created_at']

    def validate_actividad(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('La experiencia no puede estar vacía.')
        return value[:160]


class HoraOroAjustesSerializer(serializers.ModelSerializer):
    """«Configurar recordatorios» del módulo Hora de Oro Familiar."""
    class Meta:
        model = HoraOroAjustes
        fields = ['recordatorio_activo', 'hora_recordatorio']

    def validate_categoria(self, value):
        from .services.hora_oro import categoria_valida
        if not categoria_valida(value):
            raise serializers.ValidationError('Categoría del catálogo no reconocida.')
        return value


class FocusSessionSerializer(serializers.ModelSerializer):
    """Doc 23 · Modo Focus — sesión de una herramienta de enfoque.

    La creación se hace por la acción `iniciar` del ViewSet (para validar la
    regla de una sola herramienta activa); el resto del estado lo maneja el
    backend al finalizar.
    """
    class Meta:
        model = FocusSession
        fields = [
            'id', 'herramienta', 'estado', 'started_at', 'ended_at',
            'planned_minutes', 'focused_minutes', 'config', 'origin',
        ]
        read_only_fields = ['estado', 'started_at', 'ended_at', 'focused_minutes']


class ObjetivoSemanaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ObjetivoSemana
        fields = ['id', 'user', 'texto1', 'texto2', 'texto3']
        read_only_fields = ['user']

class KeepNotaSerializer(serializers.ModelSerializer):
    class Meta:
        model = KeepNota
        fields = ['id', 'user', 'contenido']
        read_only_fields = ['user']

class MisionHoySerializer(serializers.ModelSerializer):
    class Meta:
        model = MisionHoy
        fields = ['id', 'user', 'texto', 'imagen_url']
        read_only_fields = ['user']

class CategoriaRuedaSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaRueda
        fields = ['id', 'nombre', 'icono', 'orden']

class RegistroRuedaSerializer(serializers.ModelSerializer):
    categoria = CategoriaRuedaSerializer(read_only=True)
    categoria_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = RegistroRueda
        fields = ['id', 'categoria', 'categoria_id', 'puntaje', 'fecha_creacion']
        read_only_fields = ['user', 'fecha_creacion']

class GuardarRuedaSerializer(serializers.Serializer):
    puntajes = serializers.DictField(child=serializers.IntegerField())

class MatrixItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MatrixItem
        fields = ['id', 'user', 'task', 'quadrant', 'is_done', 'created_at', 'workspace']
        read_only_fields = ['user', 'created_at']

class MatrizEisenhowerSerializer(serializers.ModelSerializer):
    class Meta:
        model = MatrizEisenhower
        fields = ['id', 'status', 'video_watched', 'started_at', 'completed_at',
                  'correct_count', 'incorrect_count', 'error_quadrants', 'last_step',
                  'creado', 'actualizado']
        read_only_fields = ['creado', 'actualizado']


class FacturaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Factura
        fields = ['id', 'user', 'nombre', 'monto', 'fecha_vencimiento', 'pagado', 'creado_en', 'workspace']
        read_only_fields = ['user', 'creado_en']


class CuentaColumnaSerializer(serializers.ModelSerializer):
    class Meta:
        model = CuentaColumna
        fields = ['id', 'nombre', 'orden']
        read_only_fields = ['id']


class CuentaValorSerializer(serializers.ModelSerializer):
    class Meta:
        model = CuentaValor
        fields = ['id', 'columna', 'valor']
        read_only_fields = ['id']


class CuentaRegistroSerializer(serializers.ModelSerializer):
    extras = serializers.SerializerMethodField()

    class Meta:
        model = CuentaRegistro
        fields = ['id', 'periodo_anio', 'periodo_mes', 'cuenta', 'dia_vencimiento',
                  'monto', 'pagado', 'orden', 'extras']
        read_only_fields = ['id', 'extras']

    def get_extras(self, obj):
        return {str(v.columna_id): v.valor for v in obj.valores.all()}

class WorkspaceMemberSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    avatar_url = serializers.URLField(source='user.avatar_url', read_only=True)

    class Meta:
        model = WorkspaceMember
        fields = ['id', 'user_id', 'username', 'email', 'avatar_url', 'role', 'joined_at']

class WorkspaceSerializer(serializers.ModelSerializer):
    members_count = serializers.SerializerMethodField()
    my_role = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = ['id', 'name', 'description', 'owner', 'owner_username', 'created_at', 'updated_at', 'members_count', 'my_role']
        read_only_fields = ['owner', 'created_at', 'updated_at']

    owner_username = serializers.CharField(source='owner.username', read_only=True)

    def get_members_count(self, obj):
        return obj.members.count()

    def get_my_role(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            member = obj.members.filter(user=request.user).first()
            if member:
                return member.role
        return None

class WorkspaceDetailSerializer(serializers.ModelSerializer):
    members = WorkspaceMemberSerializer(many=True, read_only=True)
    owner_username = serializers.CharField(source='owner.username', read_only=True)

    class Meta:
        model = Workspace
        fields = ['id', 'name', 'description', 'owner', 'owner_username', 'created_at', 'updated_at', 'members']
        read_only_fields = ['owner', 'created_at', 'updated_at']

class InvitationSerializer(serializers.ModelSerializer):
    workspace_name = serializers.CharField(source='workspace.name', read_only=True)
    invited_by_username = serializers.CharField(source='invited_by.username', read_only=True)

    class Meta:
        model = Invitation
        fields = ['id', 'workspace', 'workspace_name', 'email', 'role', 'token', 'status', 'invited_by', 'invited_by_username', 'created_at']
        read_only_fields = ['token', 'status', 'invited_by', 'created_at']

class DelegationSerializer(serializers.ModelSerializer):
    task_title = serializers.CharField(source='task.titulo', read_only=True)
    delegator_username = serializers.CharField(source='delegator.username', read_only=True)
    delegate_username = serializers.CharField(source='delegate.username', read_only=True)

    class Meta:
        model = Delegation
        fields = ['id', 'task', 'task_title', 'delegator', 'delegator_username', 'delegate', 'delegate_username', 'delegate_email', 'message', 'status', 'token', 'created_at']
        read_only_fields = ['token', 'created_at', 'updated_at']

class AiMissionSerializer(serializers.Serializer):
    prompt = serializers.CharField()

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'type', 'title', 'message', 'data', 'is_read', 'created_at',
            'priority', 'channel', 'scheduled_for', 'delivered_at',
            'pending_delivery', 'in_bell', 'cancelled_at', 'dedupe_key',
        ]
        read_only_fields = ['created_at']


class MetaAnualSerializer(serializers.ModelSerializer):
    class Meta:
        model = MetaAnual
        fields = ['id', 'user', 'titulo', 'descripcion', 'fecha_inicio', 'fecha_fin', 'aprobada', 'creado']
        read_only_fields = ['user', 'creado']


class GranMetaAnualSerializer(serializers.ModelSerializer):
    class Meta:
        model = GranMetaAnual
        fields = [
            'id', 'user', 'wheel_of_life_context', 'raw_responses',
            'answer_transformation_area', 'answer_desired_result', 'answer_expected_impact',
            'edit_instruction', 'generated_goal_text', 'smart_breakdown', 'status',
            'version', 'is_active', 'approved_at', 'creado', 'actualizado',
        ]
        read_only_fields = ['user', 'creado', 'actualizado', 'approved_at']


class GranMetaAnualAnswerSerializer(serializers.Serializer):
    question_number = serializers.IntegerField(min_value=1, max_value=3)
    answer_text = serializers.CharField(max_length=1000)


class GranMetaAnualEligibilitySerializer(serializers.Serializer):
    eligible = serializers.BooleanField()
    has_diagnostico = serializers.BooleanField()
    diagnostico_status = serializers.CharField(allow_blank=True)
    message = serializers.CharField()


class AnnualGoalConversationTurnSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnnualGoalConversationTurn
        fields = ['id', 'goal', 'role', 'step', 'content', 'created_at']
        read_only_fields = ['id', 'created_at']


class GranMetaAnualGenerarSerializer(serializers.Serializer):
    area = serializers.CharField(max_length=500)
    resultado = serializers.CharField(max_length=500)
    impacto = serializers.CharField(max_length=500)
    rueda_data = serializers.ListField(child=serializers.DictField(), required=False, default=[])


class MonthlyGoalSerializer(serializers.ModelSerializer):
    goal_text = serializers.CharField(source='monthly_goal_text', read_only=True)

    class Meta:
        model = MonthlyGoal
        fields = [
            'id', 'plan', 'month_order', 'calendar_month', 'calendar_year',
            'monthly_goal_text', 'goal_text', 'brief_explanation', 'annual_goal_relation',
            'complexity_level', 'status', 'edited_by_user', 'version',
            'creado', 'actualizado',
        ]
        read_only_fields = ['id', 'plan', 'creado', 'actualizado', 'version']


class MonthlyPlanSerializer(serializers.ModelSerializer):
    goals = MonthlyGoalSerializer(many=True, read_only=True)
    is_approved = serializers.SerializerMethodField()
    user_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = MonthlyPlan
        fields = [
            'id', 'user', 'user_id', 'annual_goal', 'cycle_start_month', 'cycle_start_year',
            'status', 'is_approved', 'approved_at', 'creado', 'actualizado', 'goals',
        ]
        read_only_fields = ['user', 'user_id', 'creado', 'actualizado']

    def get_is_approved(self, obj):
        return obj.status == MonthlyPlan.Status.APROBADA


class MonthlyGenerateSerializer(serializers.Serializer):
    cycle_start_month = serializers.IntegerField(min_value=1, max_value=12)
    cycle_start_year = serializers.IntegerField()


class ObjetivoMensualSerializer(serializers.ModelSerializer):
    class Meta:
        model = ObjetivoMensual
        fields = ['id', 'user', 'meta_anual', 'mes', 'titulo', 'descripcion', 'completado', 'creado']
        read_only_fields = ['user', 'creado']


class PropuestaIASerializer(serializers.ModelSerializer):
    class Meta:
        model = PropuestaIA
        fields = [
            'id', 'user', 'tipo_impacto', 'situacion_clara',
            'explicacion_impacto', 'propuesta_ajuste', 'fase_detectada',
            'respondida', 'decision_usuario', 'leida', 'resultado_json', 'creada',
        ]
        read_only_fields = ['user', 'creada']


class InteraccionUsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = InteraccionUsuario
        fields = ['id', 'tipo', 'entity_type', 'entity_id', 'action_taken', 'metadata', 'creado']
        read_only_fields = ['creado']


class ContextoAnalisisInputSerializer(serializers.Serializer):
    meta_anual = serializers.JSONField(allow_null=True, required=False, default=None)
    metricas_ejecucion = serializers.JSONField(required=False, default=dict)
    historial_alertas = serializers.JSONField(required=False, default=dict)
    tareas_detalladas_backlog = serializers.ListField(
        child=serializers.JSONField(), required=False, default=list,
    )


class ConfiguracionUsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracionUsuario
        exclude = ['user', 'creado', 'actualizado']


class ActivacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Activacion
        fields = [
            'id', 'user', 'tipo', 'estado', 'titulo', 'mensaje',
            'mensaje_intencion', 'channel_used', 'metadata', 'ventana_programada',
            'enviada_en', 'leida_en', 'respondida_en', 'creada',
        ]
        read_only_fields = ['user', 'creada']


class FocusiaReportSerializer(serializers.ModelSerializer):
    data_sources = serializers.SerializerMethodField()
    goal_context = serializers.SerializerMethodField()

    class Meta:
        model = FocusiaReport
        fields = [
            'id', 'user', 'level', 'period_start', 'period_end',
            'completion_percentage', 'completed_count', 'pending_count',
            'strong_days', 'weak_days', 'consistency_score',
            'headline_message', 'ai_interpretation', 'ai_raw_metadata',
            'status', 'notified_at', 'opened_at',
            'action_taken', 'action_taken_at',
            'generation_state', 'is_partial', 'cycle_label',
            'updated_until', 'closed_at', 'never_opened',
            'created_at', 'data_sources', 'goal_context',
        ]
        read_only_fields = ['user', 'created_at']

    def get_data_sources(self, obj):
        return FocusiaReportDataSourceSerializer(obj.data_sources.all(), many=True).data

    def get_goal_context(self, obj):
        metadata = obj.ai_raw_metadata or {}
        return metadata.get('metas') or {}


class FocusiaReportDataSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportDataSource
        fields = ['id', 'source_type', 'reference_id', 'snapshot']


class FocusiaReportActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=FocusiaReport.ActionType.choices)


class FocusAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = FocusArea
        fields = ['id', 'diagnostico', 'area', 'score', 'reason', 'priority_order']
        read_only_fields = ['diagnostico']


class DiagnosticoRuedaSerializer(serializers.ModelSerializer):
    focus_areas = FocusAreaSerializer(many=True, read_only=True)

    class Meta:
        model = DiagnosticoRueda
        fields = '__all__'
        read_only_fields = ['user', 'creado', 'actualizado']


class AccionSugeridaSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccionSugerida
        fields = ['id', 'area_foco', 'texto', 'batch_number', 'enviada_kanban', 'creado']
        read_only_fields = ['user', 'creado', 'batch_number']


class EnviarAccionKanbanSerializer(serializers.Serializer):
    accion_id = serializers.IntegerField()


class GenerarDiagnosticoInputSerializer(serializers.Serializer):
    puntajes = serializers.DictField(child=serializers.IntegerField(min_value=1, max_value=10), required=False)
    comentarios = serializers.DictField(child=serializers.CharField(allow_blank=True), required=False)


class GenerarAccionesInputSerializer(serializers.Serializer):
    area_foco = serializers.CharField(max_length=100, required=False)


class KanbanActionSerializer(serializers.ModelSerializer):
    is_double_clicked_fixed = serializers.BooleanField(source='pinned', read_only=True)

    class Meta:
        model = KanbanAction
        fields = ['id', 'title', 'source', 'classification_status', 'scheduled_date', 'pinned', 'is_double_clicked_fixed', 'created_at', 'updated_at']
        read_only_fields = ['id', 'source', 'classification_status', 'pinned', 'is_double_clicked_fixed', 'created_at', 'updated_at']


class KanbanActionClassifySerializer(serializers.Serializer):
    ACTION_MAP = {
        'H': KanbanAction.ClassificationStatus.HACER,
        'P': KanbanAction.ClassificationStatus.PLANIFICAR,
        'D': KanbanAction.ClassificationStatus.DELEGAR,
        'E': KanbanAction.ClassificationStatus.ELIMINAR,
    }
    STATUS_TO_CODE = {
        'HACER': 'H',
        'PLANIFICAR': 'P',
        'DELEGAR': 'D',
        'ELIMINAR': 'E',
    }

    decision = serializers.ChoiceField(choices=['H', 'P', 'D', 'E'], required=False)
    classification_status = serializers.ChoiceField(
        choices=['HACER', 'PLANIFICAR', 'DELEGAR', 'ELIMINAR'], required=False
    )
    scheduled_date = serializers.DateField(required=False, allow_null=True)

    def validate(self, data):
        if 'classification_status' in data and 'decision' not in data:
            code = self.STATUS_TO_CODE.get(data['classification_status'])
            if not code:
                raise serializers.ValidationError({'classification_status': 'Valor no válido'})
            data['decision'] = code
        if 'decision' not in data:
            raise serializers.ValidationError('Se requiere "decision" (H/P/D/E) o "classification_status"')
        return data


class HistorialMovimientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistorialMovimiento
        fields = ['id', 'accion', 'estado_anterior', 'estado_nuevo', 'clasificacion_anterior', 'clasificacion_nueva', 'fecha_movimiento']
        read_only_fields = ['id', 'fecha_movimiento']


class AccionKanbanSerializer(serializers.ModelSerializer):
    historial = HistorialMovimientoSerializer(many=True, read_only=True)

    class Meta:
        model = AccionKanban
        fields = [
            'id', 'user', 'texto_accion', 'origen', 'clasificacion',
            'estado_actual', 'destino_asignado', 'fecha_seleccionada',
            'hora_seleccionada', 'es_fijo', 'creado_en', 'actualizado_en', 'historial',
        ]
        read_only_fields = ['id', 'user', 'creado_en', 'actualizado_en']


class AccionKanbanCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccionKanban
        fields = ['texto_accion', 'origen']


class TribuTemaSemanaSerializer(serializers.ModelSerializer):
    imagen_resuelta = serializers.URLField(read_only=True)

    class Meta:
        model = TribuTemaSemana
        fields = ['id', 'titulo', 'descripcion', 'reflexion', 'pregunta',
                  'imagen_url', 'imagen_resuelta', 'activo', 'creado']


class TribuCompromisoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TribuCompromiso
        fields = ['id', 'year', 'week_number', 'texto', 'tribu', 'tribu_detalle',
                  'enviado_kanban', 'creado', 'actualizado']
        read_only_fields = ['id', 'year', 'week_number', 'enviado_kanban', 'creado', 'actualizado']


class ClasificarAccionSerializer(serializers.Serializer):
    CLASIFICACION_MAP = {
        'H': AccionKanban.EstadoChoices.AGENDA_DIARIA,
        'P': None,
        'D': AccionKanban.EstadoChoices.POR_DELEGAR,
        'E': AccionKanban.EstadoChoices.ELIMINADA,
    }

    clasificacion = serializers.ChoiceField(choices=AccionKanban.ClasificacionChoices.choices)
    destino_planificacion = serializers.ChoiceField(
        choices=[('SEMANAL', 'Semanal'), ('MENSUAL', 'Mensual'), ('ANUAL', 'Anual')],
        required=False, allow_null=True,
    )
    fecha_seleccionada = serializers.DateField(required=False, allow_null=True)
    hora_seleccionada = serializers.TimeField(required=False, allow_null=True)


class ObjetivoSemanalSerializer(serializers.ModelSerializer):
    class Meta:
        model = ObjetivoSemanal
        fields = ['id', 'user', 'año', 'semana', 'titulo', 'descripcion', 'completado', 'creado', 'accion_origen']
        read_only_fields = ['user', 'creado']


class WeeklyPlanSerializer(serializers.ModelSerializer):
    action_count = serializers.SerializerMethodField()

    class Meta:
        model = WeeklyPlan
        fields = ['id', 'user', 'associated_monthly_goal_text', 'weekly_mission',
                  'week_number', 'year', 'metadata', 'action_count', 'created_at', 'updated_at']
        read_only_fields = ['user', 'created_at', 'updated_at']

    def get_action_count(self, obj):
        return obj.actions.count()


class WeeklyPlanListSerializer(serializers.ModelSerializer):
    action_count = serializers.SerializerMethodField()

    class Meta:
        model = WeeklyPlan
        fields = ['id', 'week_number', 'year', 'weekly_mission', 'action_count', 'created_at']
        read_only_fields = ['created_at']

    def get_action_count(self, obj):
        return obj.actions.count()


class ActionSerializer(serializers.ModelSerializer):
    subactions = serializers.ListField(child=serializers.JSONField(), required=False, default=list)

    class Meta:
        model = Action
        fields = ['id', 'weekly_plan', 'assigned_calendar_date', 'title',
                  'origin_module', 'status', 'subactions', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class ActionMoveSerializer(serializers.Serializer):
    action_id = serializers.UUIDField()
    new_date = serializers.DateField()


class ActionRepeatSerializer(serializers.Serializer):
    action_id = serializers.UUIDField()
    target_date = serializers.DateField()


class ActionDelegateSerializer(serializers.Serializer):
    action_id = serializers.UUIDField()


class ActionDelegationSerializer(serializers.ModelSerializer):
    derivadas = serializers.SerializerMethodField()

    class Meta:
        model = ActionDelegation
        fields = ['id', 'titulo', 'origen', 'source_ref', 'responsable', 'estado',
                  'historial', 'derivadas', 'creado', 'actualizado']
        read_only_fields = ['id', 'estado', 'historial', 'derivadas', 'creado', 'actualizado']

    def get_derivadas(self, obj):
        return [h for h in (obj.historial or []) if h.get('evento') == 'derivada_creada']


class AgentConversationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentConversation
        fields = ['id', 'user', 'session_id', 'rol', 'mensaje', 'metadata', 'created_at']
        read_only_fields = ['id', 'user', 'session_id', 'created_at']


class AgentScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentSchedule
        fields = ['id', 'user', 'tipo', 'titulo', 'mensaje_plantilla',
                  'regla_programacion', 'activo', 'ultima_ejecucion',
                  'proxima_ejecucion', 'created_at']
        read_only_fields = ['id', 'user', 'ultima_ejecucion', 'created_at']


class AgentConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentConfig
        fields = ['id', 'user', 'activo', 'tono', 'frecuencia_checkin',
                  'notificar_whatsapp', 'whatsapp_phone', 'notificar_in_app',
                  'horario_inicio', 'horario_fin', 'temas_permitidos',
                  'ultimo_checkin', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'ultimo_checkin', 'created_at', 'updated_at']


class AvatarSerializer(serializers.ModelSerializer):
    # `image` / `intro_message_audio` son rutas en texto; estos dos resuelven
    # cuál de las dos (la ruta o el archivo subido) es la que se muestra.
    image_resuelta = serializers.CharField(read_only=True)
    audio_resuelto = serializers.CharField(read_only=True)

    class Meta:
        model = Avatar
        fields = ['id', 'name', 'gender', 'image', 'image_resuelta', 'voice_id',
                  'intro_message_text', 'intro_message_audio', 'audio_resuelto']


class OnboardingProfileSerializer(serializers.ModelSerializer):
    avatar_name = serializers.CharField(source='avatar.name', read_only=True, allow_null=True)
    avatar_image = serializers.CharField(source='avatar.image', read_only=True, allow_null=True)
    user_full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_first_name = serializers.CharField(source='user.first_name', read_only=True)

    class Meta:
        model = OnboardingProfile
        exclude = ['user', 'created_at', 'updated_at']


class SelectAvatarSerializer(serializers.Serializer):
    avatar_id = serializers.IntegerField()

    def validate_avatar_id(self, value):
        if not Avatar.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError('Avatar no válido o inactivo')
        return value


class IntensitySerializer(serializers.Serializer):
    intensity = serializers.ChoiceField(choices=OnboardingProfile.Intensity.choices)


class ActivationsSerializer(serializers.Serializer):
    activations_app = serializers.BooleanField(default=True)
    activations_push = serializers.BooleanField(default=True)
    activations_whatsapp = serializers.BooleanField(default=True)
    activations_calls = serializers.BooleanField(default=False)


class ScheduleSerializer(serializers.Serializer):
    schedule_type = serializers.ChoiceField(choices=OnboardingProfile.Schedule.choices)
    custom_schedule_start = serializers.TimeField(required=False, allow_null=True)
    custom_schedule_end = serializers.TimeField(required=False, allow_null=True)


class ToneSerializer(serializers.Serializer):
    tone = serializers.ChoiceField(choices=OnboardingProfile.Tone.choices)


class InicioStateSerializer(serializers.ModelSerializer):
    class Meta:
        model = InicioState
        fields = ['status', 'has_seen_intro_video', 'intro_video_completed', 'guided_tour_status', 'first_entry_at', 'updated_at']


class InicioEventLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = InicioEventLog
        fields = ['id', 'event_type', 'origin', 'metadata', 'created_at']
        read_only_fields = ['id', 'created_at']


class LearningCategorySerializer(serializers.ModelSerializer):
    modules = serializers.SerializerMethodField()

    class Meta:
        model = LearningCategory
        fields = ['slug', 'name', 'order', 'modules']

    def get_modules(self, obj):
        return [{'id': m.id, 'name': m.name, 'order': m.order} for m in obj.modules.all()]


class GuidedTourBlockSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuidedTourBlock
        fields = ['slug', 'title', 'avatar_message', 'order']


class AccompanimentPreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccompanimentPreferences
        fields = ['support_types']
        read_only_fields = ['user']


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = ['id', 'channel', 'state', 'channel_display']
        read_only_fields = ['user']

    channel_display = serializers.CharField(source='get_channel_display', read_only=True)


class ScheduleExceptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduleException
        fields = ['id', 'exception_type', 'value']
        read_only_fields = ['user']


class AccountChangeLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountChangeLog
        fields = ['id', 'change_type', 'origin', 'created_at']
        read_only_fields = ['id', 'created_at']


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField()
    new_password = serializers.CharField(min_length=8)
    new_password_confirm = serializers.CharField()

    def validate(self, data):
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError({'new_password_confirm': 'Las contraseñas no coinciden'})
        return data


class PrivacyPermissionSerializer(serializers.Serializer):
    data_collection = serializers.BooleanField(default=True)
    analytics = serializers.BooleanField(default=True)
    personalized_recommendations = serializers.BooleanField(default=True)
    third_party_sharing = serializers.BooleanField(default=False)


class InicioPrivacyPreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model = InicioPrivacyPreferences
        fields = ['data_collection', 'analytics', 'personalized_recommendations', 'third_party_sharing']


class ConfigAvatarSerializer(serializers.Serializer):
    avatar_id = serializers.IntegerField()


class OnboardingSerializer(serializers.Serializer):
    full_name = serializers.CharField(required=False, allow_blank=True)
    avatar_id = serializers.IntegerField(required=False, default=0)
    intensity_level = serializers.ChoiceField(required=False, choices=['SUAVE', 'EQUILIBRADA', 'EXIGENTE'], default='EQUILIBRADA')
    allowed_channels = serializers.ListField(required=False, child=serializers.CharField(), default=list)
    avatar_tone = serializers.ChoiceField(required=False, choices=['MOTIVATOR', 'STRATEGIC', 'DEMANDING', 'ADAPTIVE'], default='MOTIVATOR')
    onboarding_status = serializers.ChoiceField(required=False, choices=['INICIADO', 'CONFIG_CONFIRMADA', 'COMPLETADO'], default='COMPLETADO')

    def save(self, user):
        config, _ = ConfiguracionUsuario.objects.get_or_create(user=user)
        data = self.validated_data
        if data.get('full_name'):
            parts = data['full_name'].strip().split()
            user.first_name = parts[0] if parts else ''
            user.last_name = ' '.join(parts[1:]) if len(parts) > 1 else ''
            user.save(update_fields=['first_name', 'last_name'])
        if 'avatar_id' in data:
            config.avatar_index = data['avatar_id']
        if 'intensity_level' in data:
            config.nivel_exigencia = data['intensity_level']
        if 'allowed_channels' in data:
            config.canales_interaccion = data['allowed_channels']
        if 'avatar_tone' in data:
            config.estilo_comunicacion = data['avatar_tone']
        config.onboarding_completado = True
        config.save()
        return config


class ProgramMonthSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgramMonth
        fields = '__all__'


class ProgramDaySerializer(serializers.ModelSerializer):
    month_number = serializers.IntegerField(source='month.month_number', read_only=True)
    month_theme = serializers.CharField(source='month.theme_name', read_only=True)
    class Meta:
        model = ProgramDay
        fields = ['id', 'month', 'month_number', 'month_theme',
                  'day_number', 'phrase', 'intention', 'technical_note',
                  'coaching_question', 'es_integracion', 'origen_integracion']


class MonthlyTrainingSerializer(serializers.ModelSerializer):
    month_number = serializers.IntegerField(source='month.month_number', read_only=True)
    month_theme = serializers.CharField(source='month.theme_name', read_only=True)
    # El administrador puede subir el archivo en vez de pegar una URL. Estos
    # dos campos le dicen a la app cuál de los dos está en uso.
    video_resuelto = serializers.URLField(read_only=True, allow_null=True)
    media_resuelto = serializers.URLField(read_only=True, allow_null=True)

    class Meta:
        model = MonthlyTraining
        fields = ['id', 'month', 'month_number', 'month_theme',
                  'title', 'content', 'media_url', 'media_resuelto',
                  'duracion_minutos', 'video_url', 'video_resuelto', 'objetivos']


class JuegoSerializer(serializers.ModelSerializer):
    """Vista pública del catálogo de juegos: solo lo publicado y en orden."""

    imagen_resuelta = serializers.URLField(read_only=True, allow_null=True)
    categoria_nombre = serializers.CharField(source='categoria.name', read_only=True, allow_null=True)

    class Meta:
        model = Juego
        fields = ['id', 'titulo', 'descripcion', 'tipo', 'url', 'imagen_resuelta',
                  'categoria', 'categoria_nombre', 'orden']


class UserTrainingProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserTrainingProgress
        fields = ['id', 'training', 'completado', 'completado_en', 'creado']
        read_only_fields = ['id', 'creado']


class UserProgramProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProgramProgress
        fields = ['cycle_start_date', 'is_synced_to_collective', 'last_collective_reset_year', 'created_at', 'updated_at']


class DailyPhraseResponseSerializer(serializers.Serializer):
    phrase = serializers.CharField()
    intention = serializers.CharField()
    month_theme = serializers.CharField()
    month_number = serializers.IntegerField()
    day_number = serializers.IntegerField()
    day_total = serializers.IntegerField()


class ProgramProgressSerializer(serializers.Serializer):
    current_month = serializers.IntegerField()
    current_day_in_month = serializers.IntegerField()
    total_day_in_cycle = serializers.IntegerField()
    month_theme = serializers.CharField()
    cycle_start_date = serializers.DateField()


class CoachingEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = CoachingEntry
        fields = ['id', 'user', 'reflection', 'decision', 'decision_added_to_agenda', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'decision_added_to_agenda', 'created_at', 'updated_at']


# ── Serializers del panel de administración (/api/admin/) ──
# Los de lectura para el usuario final (ProgramDaySerializer,
# MonthlyTrainingSerializer, TribuTemaSemanaSerializer, AvatarSerializer) se
# mantienen intactos para no cambiar el contrato de la app. Los de abajo son
# los que usa el panel: incluyen los archivos subidos y las URL ya resueltas.

class AdminLearningModuleRefSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningModuleRef
        fields = ['id', 'category', 'name', 'order']
        read_only_fields = ['id']


class AdminLearningCategorySerializer(serializers.ModelSerializer):
    modules = AdminLearningModuleRefSerializer(many=True, read_only=True)

    class Meta:
        model = LearningCategory
        fields = ['id', 'slug', 'name', 'order', 'modules']
        read_only_fields = ['id']


class AdminGuidedTourBlockSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuidedTourBlock
        fields = ['id', 'slug', 'title', 'avatar_message', 'order']
        read_only_fields = ['id']


class AdminProgramMonthSerializer(serializers.ModelSerializer):
    training = serializers.SerializerMethodField()

    class Meta:
        model = ProgramMonth
        fields = ['id', 'month_number', 'theme_name', 'training_theme',
                  'formative_objective', 'training']
        read_only_fields = ['id']

    def get_training(self, obj):
        cap = getattr(obj, 'training', None)
        return AdminMonthlyTrainingSerializer(cap).data if cap else None


class AdminMonthlyTrainingSerializer(serializers.ModelSerializer):
    month_number = serializers.IntegerField(source='month.month_number', read_only=True)
    month_theme = serializers.CharField(source='month.theme_name', read_only=True)
    video_resuelto = serializers.URLField(read_only=True)
    media_resuelto = serializers.URLField(read_only=True)

    class Meta:
        model = MonthlyTraining
        fields = ['id', 'month', 'month_number', 'month_theme',
                  'title', 'content', 'media_url', 'media_file', 'media_resuelto',
                  'duracion_minutos', 'video_url', 'video_file', 'video_resuelto',
                  'objetivos']
        read_only_fields = ['id']

    def validate_objetivos(self, value):
        """Acepta lista vacía o lista de {titulo, descripcion}; rechaza otras formas."""
        if value in (None, ''):
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError('Debe ser una lista de objetivos.')
        for i, obj in enumerate(value):
            if not isinstance(obj, dict):
                raise serializers.ValidationError(
                    f'El objetivo {i + 1} debe ser un objeto con "titulo" y "descripcion".')
            if 'titulo' not in obj:
                raise serializers.ValidationError(f'El objetivo {i + 1} necesita "titulo".')
        return value


class AdminProgramDaySerializer(serializers.ModelSerializer):
    month_number = serializers.IntegerField(source='month.month_number', read_only=True)
    month_theme = serializers.CharField(source='month.theme_name', read_only=True)

    class Meta:
        model = ProgramDay
        fields = ['id', 'month', 'month_number', 'month_theme',
                  'day_number', 'phrase', 'intention', 'technical_note',
                  'coaching_question', 'es_integracion', 'origen_integracion']
        read_only_fields = ['id']
        # El modelo ya declara unique_together (month, day_number). Aquí
        # reemplazamos el mensaje por defecto de DRF por uno que diga qué hacer.
        validators = [
            UniqueTogetherValidator(
                queryset=ProgramDay.objects.all(),
                fields=('month', 'day_number'),
                message=('Ya existe un día con ese número en el mes elegido. '
                         'Edítalo en lugar de crear otro.'),
            ),
        ]


class AdminTribuTemaSemanaSerializer(serializers.ModelSerializer):
    imagen_file_url = serializers.SerializerMethodField()
    imagen_resuelta = serializers.URLField(read_only=True)

    class Meta:
        model = TribuTemaSemana
        fields = ['id', 'titulo', 'descripcion', 'reflexion', 'pregunta',
                  'imagen_url', 'imagen_file', 'imagen_file_url', 'imagen_resuelta',
                  'activo', 'creado', 'actualizado']
        read_only_fields = ['id', 'creado', 'actualizado']

    def get_imagen_file_url(self, obj):
        return obj.imagen_file.url if obj.imagen_file else ''


class AdminAvatarSerializer(serializers.ModelSerializer):
    image_file_url = serializers.SerializerMethodField()
    audio_file_url = serializers.SerializerMethodField()
    image_resuelta = serializers.CharField(read_only=True)
    audio_resuelto = serializers.CharField(read_only=True)

    class Meta:
        model = Avatar
        fields = ['id', 'name', 'gender', 'image', 'image_file', 'image_file_url',
                  'image_resuelta', 'voice_id', 'intro_message_text',
                  'intro_message_audio', 'intro_message_audio_file', 'audio_file_url',
                  'audio_resuelto', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_image_file_url(self, obj):
        return obj.image_file.url if obj.image_file else ''

    def get_audio_file_url(self, obj):
        return obj.intro_message_audio_file.url if obj.intro_message_audio_file else ''


class AdminJuegoSerializer(serializers.ModelSerializer):
    imagen_file_url = serializers.SerializerMethodField()
    imagen_resuelta = serializers.URLField(read_only=True)
    categoria_nombre = serializers.CharField(source='categoria.name', read_only=True)

    class Meta:
        model = Juego
        fields = ['id', 'titulo', 'descripcion', 'tipo', 'url',
                  'imagen_url', 'imagen_file', 'imagen_file_url', 'imagen_resuelta',
                  'categoria', 'categoria_nombre', 'activo', 'orden',
                  'creado', 'actualizado']
        read_only_fields = ['id', 'creado', 'actualizado']

    def get_imagen_file_url(self, obj):
        return obj.imagen_file.url if obj.imagen_file else ''


class AdminMembresiaSerializer(serializers.ModelSerializer):
    estado = serializers.CharField(read_only=True)
    dias_restantes = serializers.IntegerField(read_only=True)

    class Meta:
        model = Membresia
        fields = ['id', 'user', 'fecha_inicio', 'fecha_fin', 'nota',
                  'estado', 'dias_restantes', 'creado', 'actualizado']
        read_only_fields = ['id', 'creado', 'actualizado']

    def validate(self, datos):
        inicio = datos.get('fecha_inicio') or getattr(self.instance, 'fecha_inicio', None)
        fin = datos.get('fecha_fin') or getattr(self.instance, 'fecha_fin', None)
        if inicio and fin and fin < inicio:
            raise serializers.ValidationError(
                'La fecha de fin no puede ser anterior a la de inicio.')
        return datos


class AdminAsignacionSerializer(serializers.ModelSerializer):
    titulo = serializers.SerializerMethodField()

    class Meta:
        model = AsignacionContenido
        fields = ['id', 'user', 'tipo', 'objeto_id', 'titulo', 'creado']
        read_only_fields = ['id', 'creado']

    def get_titulo(self, obj):
        try:
            inst = AsignacionContenido.modelo_para(obj.tipo).objects.get(pk=obj.objeto_id)
        except Exception:
            return f'#{obj.objeto_id} (eliminado)'
        for campo in ('titulo', 'title', 'theme_name', 'name', 'slug'):
            if hasattr(inst, campo):
                return str(getattr(inst, campo))
        return f'#{obj.objeto_id}'
