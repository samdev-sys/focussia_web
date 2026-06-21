import json
import secrets
import logging
import urllib.request
import urllib.error
from datetime import timedelta
from django.conf import settings
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from django.db import IntegrityError, models
from django.http import Http404
from .models import (
    User, RuedaVida, TimeBlock, KanbanTask, Recordatorio, ObjetivoSemana,
    KeepNota, MisionHoy, CategoriaRueda, RegistroRueda, MatrixItem, Factura,
    Workspace, WorkspaceMember, Invitation, Delegation, Notification, MetaUsuario,
    GranMetaAnual
)
from .serializers import (
    UserSerializer, UserDetailSerializer, RuedaVidaSerializer, TimeBlockSerializer,
    KanbanTaskSerializer, RecordatorioSerializer, ObjetivoSemanaSerializer,
    KeepNotaSerializer, MisionHoySerializer, CategoriaRuedaSerializer,
    RegistroRuedaSerializer, GuardarRuedaSerializer, MatrixItemSerializer,
    FacturaSerializer, WorkspaceSerializer, WorkspaceDetailSerializer,
    WorkspaceMemberSerializer, InvitationSerializer, DelegationSerializer,
    NotificationSerializer, AiMissionSerializer, MetaUsuarioSerializer,
    GranMetaAnualSerializer, SmartMetaInputSerializer, SmartMetaEditSerializer
)

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

class KanbanTaskViewSet(BaseUserViewSet):
    queryset = KanbanTask.objects.all()
    serializer_class = KanbanTaskSerializer

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

    @action(detail=True, methods=['get'])
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
                'puntaje': reg.puntaje if reg else 5
            })
        return Response(result)

    elif request.method == 'POST':
        puntajes = request.data.get('puntajes', {})

        for cat_id, puntaje in puntajes.items():
            try:
                categoria = CategoriaRueda.objects.get(id=cat_id, activo=True)
                RegistroRueda.objects.update_or_create(
                    user=request.user,
                    categoria=categoria,
                    defaults={'puntaje': puntaje}
                )
            except CategoriaRueda.DoesNotExist:
                continue

        return Response({'status': 'ok'})


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
        return Notification.objects.filter(user=self.request.user)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def pending_invitations(request):
    invitations = Invitation.objects.filter(email=request.user.email, status='pending')
    serializer = InvitationSerializer(invitations, many=True)
    return Response(serializer.data)


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
            'model': 'llama-3.3-70b-versatile',
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


class BaseUserViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return super().get_queryset().filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class MetaUsuarioViewSet(BaseUserViewSet):
    queryset = MetaUsuario.objects.all()
    serializer_class = MetaUsuarioSerializer


def call_groq(prompt, system_prompt=None):
    api_key = settings.GROQ_API_KEY
    if not api_key:
        raise RuntimeError('GROQ_API_KEY no configurada')

    messages = []
    if system_prompt:
        messages.append({'role': 'system', 'content': system_prompt})
    messages.append({'role': 'user', 'content': prompt})

    body = json.dumps({
        'model': 'llama-3.3-70b-versatile',
        'messages': messages,
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
    return data['choices'][0]['message']['content']


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def ai_smart_meta(request):
    serializer = SmartMetaInputSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    area = serializer.validated_data['area']
    resultado = serializer.validated_data['resultado']
    impacto = serializer.validated_data['impacto']
    rueda_data = serializer.validated_data.get('rueda_data', [])

    rueda_str = ', '.join([f"{r.get('nombre','?')}: {r.get('puntaje','?')}/10" for r in rueda_data]) if rueda_data else 'No disponible'

    prompt = f"""Área de mayor transformación: {area}
Gran resultado deseado: {resultado}
Impacto emocional deseado: {impacto}
Puntajes Rueda de la Vida: {rueda_str}

Genera una meta anual SMART en el siguiente formato JSON (sin markdown, solo JSON válido):
{{"frase_resumen": "Durante este año, lograré...", "S": "Específica", "M": "Medible", "A": "Alcanzable", "R": "Relevante", "T": "Temporal", "texto_meta": "Texto completo de la meta"}}"""

    try:
        text = call_groq(prompt, 'Eres un coach experto en metodología SMART.')
        try:
            smart_data = json.loads(text)
        except json.JSONDecodeError:
            start = text.find('{')
            end = text.rfind('}') + 1
            if start >= 0 and end > start:
                smart_data = json.loads(text[start:end])
            else:
                return Response({'error': 'Respuesta IA inválida'}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(smart_data)
    except Exception as e:
        logger.exception('Error calling Groq for SMART meta')
        return Response({'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def ai_smart_meta_edit(request):
    serializer = SmartMetaEditSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    meta_id = serializer.validated_data['meta_id']
    comentario = serializer.validated_data['comentario']

    try:
        meta = GranMetaAnual.objects.get(id=meta_id, user=request.user)
    except GranMetaAnual.DoesNotExist:
        return Response({'error': 'Meta no encontrada'}, status=status.HTTP_404_NOT_FOUND)

    prompt = f"""Meta actual:
Frase: {meta.frase_resumen}
Texto: {meta.texto_meta}
S: {meta.desglose_smart.get('S','')}
M: {meta.desglose_smart.get('M','')}
A: {meta.desglose_smart.get('A','')}
R: {meta.desglose_smart.get('R','')}
T: {meta.desglose_smart.get('T','')}

El usuario quiere modificarla con este comentario: {comentario}

Genera una nueva meta anual SMART actualizada en el siguiente formato JSON (sin markdown, solo JSON válido):
{{"frase_resumen": "Durante este año, lograré...", "S": "Específica", "M": "Medible", "A": "Alcanzable", "R": "Relevante", "T": "Temporal", "texto_meta": "Texto completo de la meta"}}"""

    try:
        text = call_groq(prompt, 'Eres un coach experto en metodología SMART.')
        try:
            smart_data = json.loads(text)
        except json.JSONDecodeError:
            start = text.find('{')
            end = text.rfind('}') + 1
            if start >= 0 and end > start:
                smart_data = json.loads(text[start:end])
            else:
                return Response({'error': 'Respuesta IA inválida'}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(smart_data)
    except Exception as e:
        logger.exception('Error calling Groq for SMART edit')
        return Response({'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)


class GranMetaAnualViewSet(BaseUserViewSet):
    queryset = GranMetaAnual.objects.all()
    serializer_class = GranMetaAnualSerializer

    @action(detail=False, methods=['get'])
    def vigente(self, request):
        meta = self.get_queryset().filter(is_vigente=True).first()
        if not meta:
            return Response({'data': None})
        return Response({'data': self.get_serializer(meta).data})

    @action(detail=False, methods=['get'])
    def historial(self, request):
        qs = self.get_queryset().order_by('-fecha_creacion')
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=False, methods=['get'])
    def tiene_historial(self, request):
        count = self.get_queryset().count()
        return Response({'tiene_historial': count > 0})

    @action(detail=True, methods=['post'])
    def aprobar(self, request, pk=None):
        meta = self.get_object()
        self.get_queryset().filter(is_vigente=True).exclude(id=meta.id).update(is_vigente=False)
        meta.is_vigente = True
        meta.fecha_aprobacion = timezone.now()
        meta.save()
        return Response(self.get_serializer(meta).data)

    @action(detail=False, methods=['post'])
    def guardar_borrador(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
