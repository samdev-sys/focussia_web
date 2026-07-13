from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import User, RuedaVida, TimeBlock, KanbanTask, Recordatorio, ObjetivoSemana, KeepNota, MisionHoy, CategoriaRueda, RegistroRueda, MatrixItem, Factura, Workspace, WorkspaceMember, Invitation, Delegation, Notification, MetaAnual, ObjetivoMensual, PropuestaIA, ConfiguracionUsuario, MatrizEisenhower, Activacion, InteraccionUsuario, DiagnosticoRueda, AccionSugerida, KanbanAction

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
        fields = ['id', 'status', 'video_watched', 'completed_at', 'creado', 'actualizado']
        read_only_fields = ['creado', 'actualizado']


class FacturaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Factura
        fields = ['id', 'user', 'nombre', 'monto', 'fecha_vencimiento', 'pagado', 'creado_en', 'workspace']
        read_only_fields = ['user', 'creado_en']

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
        fields = ['id', 'type', 'title', 'message', 'data', 'is_read', 'created_at']
        read_only_fields = ['created_at']


class MetaAnualSerializer(serializers.ModelSerializer):
    class Meta:
        model = MetaAnual
        fields = ['id', 'user', 'titulo', 'descripcion', 'fecha_inicio', 'fecha_fin', 'aprobada', 'creado']
        read_only_fields = ['user', 'creado']


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
        fields = ['id', 'tipo', 'metadata', 'creado']
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
            'mensaje_intencion', 'metadata', 'ventana_programada',
            'enviada_en', 'leida_en', 'respondida_en', 'creada',
        ]
        read_only_fields = ['user', 'creada']


class DiagnosticoRuedaSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiagnosticoRueda
        fields = '__all__'
        read_only_fields = ['user', 'creado', 'actualizado']


class AccionSugeridaSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccionSugerida
        fields = ['id', 'area_foco', 'texto', 'enviada_kanban', 'creado']
        read_only_fields = ['user', 'creado']


class EnviarAccionKanbanSerializer(serializers.Serializer):
    accion_id = serializers.IntegerField()


class GenerarDiagnosticoInputSerializer(serializers.Serializer):
    puntajes = serializers.DictField(child=serializers.IntegerField(min_value=1, max_value=10))
    comentarios = serializers.DictField(child=serializers.CharField(allow_blank=True), required=False)


class GenerarAccionesInputSerializer(serializers.Serializer):
    area_foco = serializers.CharField(max_length=100)


class KanbanActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = KanbanAction
        fields = ['id', 'title', 'source', 'classification_status', 'scheduled_date', 'pinned', 'created_at', 'updated_at']
        read_only_fields = ['id', 'source', 'classification_status', 'pinned', 'created_at', 'updated_at']


class KanbanActionClassifySerializer(serializers.Serializer):
    ACTION_MAP = {
        'H': KanbanAction.ClassificationStatus.HACER,
        'P': KanbanAction.ClassificationStatus.PLANIFICAR,
        'D': KanbanAction.ClassificationStatus.DELEGAR,
        'E': KanbanAction.ClassificationStatus.ELIMINAR,
    }

    decision = serializers.ChoiceField(choices=['H', 'P', 'D', 'E'])
    scheduled_date = serializers.DateField(required=False, allow_null=True)
