from rest_framework import serializers
from .models import User, RuedaVida, TimeBlock, KanbanTask, Recordatorio, ObjetivoSemana, KeepNota, MisionHoy, CategoriaRueda, RegistroRueda, MatrixItem, Factura, Workspace, WorkspaceMember, Invitation, Delegation, Notification

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'avatar_url', 'bio']
        extra_kwargs = {'password': {'write_only': True}}

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
        fields = '__all__'
        read_only_fields = ['user']

class TimeBlockSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeBlock
        fields = '__all__'
        read_only_fields = ['user']

class KanbanTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = KanbanTask
        fields = '__all__'
        read_only_fields = ['user']

class RecordatorioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recordatorio
        fields = '__all__'
        read_only_fields = ['user']

class ObjetivoSemanaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ObjetivoSemana
        fields = '__all__'
        read_only_fields = ['user']

class KeepNotaSerializer(serializers.ModelSerializer):
    class Meta:
        model = KeepNota
        fields = '__all__'
        read_only_fields = ['user']

class MisionHoySerializer(serializers.ModelSerializer):
    class Meta:
        model = MisionHoy
        fields = '__all__'
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
        fields = '__all__'
        read_only_fields = ['user', 'created_at']

class FacturaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Factura
        fields = '__all__'
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
