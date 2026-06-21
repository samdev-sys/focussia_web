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
    Workspace, WorkspaceMember, Invitation, Delegation, Notification,
    MetaAnual, ObjetivoMensual, PropuestaIA, ConfiguracionUsuario, Activacion,
    InteraccionUsuario, DiagnosticoRueda, AccionSugerida, MonthlyPlan, MonthlyGoal,
    MatrizLearningProgress,
)
from .serializers import (
    UserSerializer, UserDetailSerializer, RuedaVidaSerializer, TimeBlockSerializer,
    KanbanTaskSerializer, RecordatorioSerializer, ObjetivoSemanaSerializer,
    KeepNotaSerializer, MisionHoySerializer, CategoriaRuedaSerializer,
    RegistroRuedaSerializer, GuardarRuedaSerializer, MatrixItemSerializer,
    FacturaSerializer, WorkspaceSerializer, WorkspaceDetailSerializer,
    WorkspaceMemberSerializer, InvitationSerializer, DelegationSerializer,
    NotificationSerializer, AiMissionSerializer,
    MetaAnualSerializer, ObjetivoMensualSerializer, PropuestaIASerializer,
    ConfiguracionUsuarioSerializer, ActivacionSerializer, ContextoAnalisisInputSerializer,
    InteraccionUsuarioSerializer, GenerarDiagnosticoInputSerializer,
    DiagnosticoRuedaSerializer, AccionSugeridaSerializer,
    MonthlyPlanSerializer, MonthlyPlanCreateSerializer, MonthlyGoalSerializer,
    EditGoalInputSerializer, MatrizLearningProgressSerializer,
)
from .engine import DecisionEngine
from .engine.phase4_generator import generar_payload_coach

logger = logging.getLogger('focusia.security')


def call_groq(prompt, system_prompt=None):
    api_key = settings.GROQ_API_KEY
    if not api_key:
        return None
    messages = []
    if system_prompt:
        messages.append({'role': 'system', 'content': system_prompt})
    messages.append({'role': 'user', 'content': prompt})
    try:
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
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read())
            return data['choices'][0]['message']['content'].strip()
    except Exception as e:
        logger.error(f'Groq API error: {e}')
        return None


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

    def create(self, request, *args, **kwargs):
        obj, created = ObjetivoSemana.objects.update_or_create(
            user=request.user,
            defaults={
                'texto1': request.data.get('texto1', ''),
                'texto2': request.data.get('texto2', ''),
                'texto3': request.data.get('texto3', ''),
            }
        )
        return Response(ObjetivoSemanaSerializer(obj).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

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


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def generar_diagnostico_rueda(request):
    serializer = GenerarDiagnosticoInputSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    puntajes = serializer.validated_data['puntajes']
    comentarios = serializer.validated_data.get('comentarios', {})

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

    # Weighted focus selection: score + qualitative boost from comment length/emotion
    def peso_foco(item):
        peso_base = item['puntaje']
        comentario = item['comentario']
        bonus = min(len(comentario) / 50, 2.0) if comentario else 0
        return peso_base + bonus

    sorted_items = sorted(items, key=peso_foco)
    # Pick 3 lowest weighted scores as strategic foci (colateral benefit)
    focos = sorted_items[:3]

    foco_1, foco_2, foco_3 = focos[0]['nombre'], focos[1]['nombre'], focos[2]['nombre']

    justificacion = (
        f"Según tu diagnóstico, las áreas {foco_1}, {foco_2} y {foco_3} "
        f"presentan el mayor potencial de mejora estratégica. "
        f"Trabajarlas generará un efecto colateral positivo que elevará "
        f"orgánicamente el equilibrio de las demás áreas de tu vida."
    )

    diag, _ = DiagnosticoRueda.objects.update_or_create(
        user=request.user,
        defaults={
            'promedio_general': round(promedio, 1),
            'nivel_equilibrio': nivel_equilibrio,
            'pico_alto': f"{pico_alto['nombre']} ({pico_alto['puntaje']}/10)",
            'pico_bajo': f"{pico_bajo['nombre']} ({pico_bajo['puntaje']}/10)",
            'foco_1': foco_1,
            'foco_2': foco_2,
            'foco_3': foco_3,
            'justificacion_focos': justificacion,
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


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def generar_acciones_rueda(request):
    serializer = GenerarAccionesInputSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    area_foco = serializer.validated_data['area_foco']

    existing_count = AccionSugerida.objects.filter(user=request.user, area_foco=area_foco).count()
    if existing_count >= 20:
        return Response({'error': f'Límite alcanzado: ya tienes 20 acciones para {area_foco}',
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

    nuevas = []
    for texto in acciones_base:
        if not AccionSugerida.objects.filter(
            user=request.user, area_foco=area_foco, texto=texto
        ).exists():
            nuevas.append(AccionSugerida(user=request.user, area_foco=area_foco, texto=texto))

    if nuevas:
        creadas = AccionSugerida.objects.bulk_create(nuevas)
    else:
        creadas = []

    total = existing_count + len(creadas)
    disponibles = max(0, 20 - total)

    return Response({
        'acciones': AccionSugeridaSerializer(creadas, many=True).data,
        'total_area': total,
        'disponibles': disponibles,
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

    KanbanTask.objects.create(
        user=request.user,
        titulo=accion.texto,
        descripcion=f'Acción sugerida desde diagnóstico Rueda de la Vida — Área: {accion.area_foco}',
        columna='Backlog',
    )
    accion.enviada_kanban = True
    accion.save(update_fields=['enviada_kanban'])

    return Response({'status': 'ok', 'accion_id': accion.id})


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
    registros = RegistroRueda.objects.filter(user=request.user)
    if registros.exists():
        scores = [r.puntaje for r in registros]
        data['promedio_actual'] = round(sum(scores) / len(scores), 1)

    return Response(data)


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


class MetaAnualViewSet(BaseUserViewSet):
    queryset = MetaAnual.objects.all()
    serializer_class = MetaAnualSerializer

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        if response.status_code == 200:
            self._invalidate_monthly_plans(kwargs.get('pk'))
        return response

    def partial_update(self, request, *args, **kwargs):
        response = super().partial_update(request, *args, **kwargs)
        if response.status_code == 200:
            self._invalidate_monthly_plans(kwargs.get('pk'))
        return response

    def _invalidate_monthly_plans(self, annual_goal_id):
        try:
            annual_goal = MetaAnual.objects.get(pk=annual_goal_id)
            MonthlyPlan.objects.filter(
                user=annual_goal.user,
                annual_goal=annual_goal,
                status=MonthlyPlan.Status.APROBADA,
            ).update(status=MonthlyPlan.Status.PENDIENTE_REVISION)
        except Exception:
            pass


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


class MonthlyPlanViewSet(BaseUserViewSet):
    queryset = MonthlyPlan.objects.all()
    serializer_class = MonthlyPlanSerializer

    def get_queryset(self):
        return MonthlyPlan.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'])
    def check_status(self, request):
        approved_annual = MetaAnual.objects.filter(
            user=request.user, aprobada=True
        ).first()
        if not approved_annual:
            return Response({
                'has_approved_annual': False,
                'has_monthly_plan': False,
                'plan_status': None,
            })
        plan = MonthlyPlan.objects.filter(
            user=request.user, annual_goal=approved_annual
        ).order_by('-creado').first()
        if not plan:
            return Response({
                'has_approved_annual': True,
                'has_monthly_plan': False,
                'plan_status': None,
                'annual_goal_id': approved_annual.id,
                'annual_goal_title': approved_annual.titulo,
            })
        return Response({
            'has_approved_annual': True,
            'has_monthly_plan': True,
            'plan_status': plan.status,
            'plan_id': plan.id,
            'annual_goal_id': approved_annual.id,
            'annual_goal_title': approved_annual.titulo,
        })

    @action(detail=False, methods=['post'])
    def generate_proposals(self, request):
        serializer = MonthlyPlanCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        annual_goal = MetaAnual.objects.filter(
            user=request.user, aprobada=True
        ).first()
        if not annual_goal:
            return Response(
                {'error': 'No existe una Meta Anual aprobada'},
                status=status.HTTP_400_BAD_REQUEST
            )
        cycle_start_month = serializer.validated_data['cycle_start_month']
        cycle_start_year = serializer.validated_data['cycle_start_year']
        complexity_map = {}
        for i in range(1, 13):
            if i <= 3:
                complexity_map[i] = MonthlyGoal.ComplexityLevel.BASE
            elif i <= 6:
                complexity_map[i] = MonthlyGoal.ComplexityLevel.EJECUCION
            elif i <= 9:
                complexity_map[i] = MonthlyGoal.ComplexityLevel.CONSOLIDACION
            else:
                complexity_map[i] = MonthlyGoal.ComplexityLevel.CIERRE
        month_names = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ]
        rueda = RuedaVida.objects.filter(user=request.user).order_by('-creado').first()
        rueda_context = ''
        if rueda:
            registros = RegistroRueda.objects.filter(rueda=rueda)
            if registros.exists():
                rueda_context = 'Puntajes Rueda de la Vida: '
                for reg in registros:
                    rueda_context += f'{reg.categoria.nombre if reg.categoria else "N/A"}={reg.puntaje}/10. '
        system_prompt = (
            'Eres un coach de productividad personal experto. '
            'Genera exactamente 12 metas mensuales personalizadas para un usuario. '
            'Cada meta debe ser una frase clara, concreta y accionable. '
            'Devuelve SOLO un JSON array con 12 objetos, cada uno con: '
            '"monthly_goal_text", "brief_explanation", "annual_goal_relation". '
            'NO incluyas ningún otro texto, solo el JSON.'
        )
        prompt = (
            f'Gran Meta Anual: {annual_goal.titulo}\n'
            f'{rueda_context}\n'
            f'Ciclo: {month_names[cycle_start_month - 1]} {cycle_start_year} a {month_names[(cycle_start_month - 1 + 11) % 12]} {cycle_start_year + (1 if cycle_start_month == 12 else 0)}\n'
            f'Complejidad: meses 1-3 BASE, 4-6 EJECUCION, 7-9 CONSOLIDACION, 10-12 CIERRE\n\n'
            f'Genera las 12 metas en formato JSON array.'
        )
        llm_response = call_groq(prompt, system_prompt)
        goals_data = None
        if llm_response:
            try:
                import re
                json_match = re.search(r'\[.*\]', llm_response, re.DOTALL)
                if json_match:
                    goals_data = json.loads(json_match.group())
            except (json.JSONDecodeError, Exception):
                goals_data = None
        plan = MonthlyPlan.objects.create(
            user=request.user,
            annual_goal=annual_goal,
            cycle_start_month=cycle_start_month,
            cycle_start_year=cycle_start_year,
            status=MonthlyPlan.Status.PROPUESTA,
        )
        for order in range(1, 13):
            cal_month = ((cycle_start_month - 1 + (order - 1)) % 12) + 1
            cal_year = cycle_start_year + ((cycle_start_month - 1 + (order - 1)) // 12)
            if goals_data and order <= len(goals_data):
                g = goals_data[order - 1]
                goal_text = g.get('monthly_goal_text', f'Meta del mes de {month_names[cal_month - 1]}')
                brief = g.get('brief_explanation', f'Objetivo para el mes {order} del ciclo')
                relation = g.get('annual_goal_relation', annual_goal.titulo)
            else:
                goal_text = f'Meta del mes de {month_names[cal_month - 1]}'
                brief = f'Objetivo para el mes {order} del ciclo'
                relation = annual_goal.titulo
            MonthlyGoal.objects.create(
                plan=plan,
                month_order=order,
                calendar_month=cal_month,
                calendar_year=cal_year,
                monthly_goal_text=goal_text,
                brief_explanation=brief,
                annual_goal_relation=relation,
                complexity_level=complexity_map[order],
                status=MonthlyGoal.GoalStatus.PROPUESTA,
            )
        return Response(MonthlyPlanSerializer(plan).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'], url_path='edit-goal/(?P<month_order>[0-9]+)')
    def edit_goal(self, request, pk=None, month_order=None):
        plan = self.get_object()
        serializer = EditGoalInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user_instruction = serializer.validated_data['user_instruction']
        try:
            goal = MonthlyGoal.objects.get(plan=plan, month_order=int(month_order))
        except MonthlyGoal.DoesNotExist:
            return Response(
                {'error': 'Meta no encontrada para ese mes'},
                status=status.HTTP_404_NOT_FOUND
            )
        system_prompt = (
            'Eres un coach de productividad personal experto. '
            'El usuario quiere modificar una meta mensual. '
            'Recibirás: la meta actual, la instrucción del usuario y la meta anual de referencia. '
            'Devuelve SOLO un JSON con: "monthly_goal_text", "brief_explanation", "annual_goal_relation". '
            'NO incluyas ningún otro texto, solo el JSON.'
        )
        prompt = (
            f'Meta Anual: {plan.annual_goal.titulo}\n'
            f'Meta actual: {goal.monthly_goal_text}\n'
            f'Explicación actual: {goal.brief_explanation}\n'
            f'Instrucción del usuario: {user_instruction}\n\n'
            f'Genera la meta modificada en formato JSON.'
        )
        llm_response = call_groq(prompt, system_prompt)
        if llm_response:
            try:
                import re
                json_match = re.search(r'\{.*\}', llm_response, re.DOTALL)
                if json_match:
                    data = json.loads(json_match.group())
                    goal.monthly_goal_text = data.get('monthly_goal_text', user_instruction)
                    goal.brief_explanation = data.get('brief_explanation', goal.brief_explanation)
                    goal.annual_goal_relation = data.get('annual_goal_relation', goal.annual_goal_relation)
                else:
                    goal.monthly_goal_text = user_instruction
            except (json.JSONDecodeError, Exception):
                goal.monthly_goal_text = user_instruction
        else:
            goal.monthly_goal_text = user_instruction
        goal.status = MonthlyGoal.GoalStatus.EDITADA
        goal.edited_by_user = True
        goal.version += 1
        goal.save()
        return Response(MonthlyGoalSerializer(goal).data)

    @action(detail=True, methods=['post'])
    def approve_plan(self, request, pk=None):
        plan = self.get_object()
        now = timezone.now()
        MonthlyGoal.objects.filter(plan=plan).update(
            status=MonthlyGoal.GoalStatus.APROBADA
        )
        plan.status = MonthlyPlan.Status.APROBADA
        plan.approved_at = now
        plan.save()
        return Response(MonthlyPlanSerializer(plan).data)

    @action(detail=False, methods=['get'])
    def current_month(self, request):
        now = timezone.now()
        current_cal_month = now.month
        current_cal_year = now.year
        plans = MonthlyPlan.objects.filter(
            user=request.user,
            status=MonthlyPlan.Status.APROBADA,
        )
        for plan in plans:
            goal = MonthlyGoal.objects.filter(
                plan=plan,
                calendar_month=current_cal_month,
                calendar_year=current_cal_year,
            ).first()
            if goal:
                return Response({
                    'plan_id': plan.id,
                    'goal': MonthlyGoalSerializer(goal).data,
                    'cycle_start_month': plan.cycle_start_month,
                    'cycle_start_year': plan.cycle_start_year,
                })
        return Response({'plan_id': None, 'goal': None})

    @action(detail=False, methods=['post'])
    def create_goal(self, request):
        plan_id = request.data.get('plan_id')
        monthly_goal_text = request.data.get('monthly_goal_text', '')
        brief_explanation = request.data.get('brief_explanation', '')
        annual_goal_relation = request.data.get('annual_goal_relation', '')
        calendar_month = request.data.get('calendar_month')
        calendar_year = request.data.get('calendar_year')
        if not plan_id or not monthly_goal_text:
            return Response(
                {'error': 'plan_id y monthly_goal_text son requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            plan = MonthlyPlan.objects.get(pk=plan_id, user=request.user)
        except MonthlyPlan.DoesNotExist:
            return Response(
                {'error': 'Plan no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        last_goal = MonthlyGoal.objects.filter(plan=plan).order_by('-month_order').first()
        next_order = (last_goal.month_order + 1) if last_goal else 1
        if next_order > 12:
            return Response(
                {'error': 'El plan ya tiene 12 metas'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not calendar_month or not calendar_year:
            cal_month = ((plan.cycle_start_month - 1 + (next_order - 1)) % 12) + 1
            cal_year = plan.cycle_start_year + ((plan.cycle_start_month - 1 + (next_order - 1)) // 12)
        else:
            cal_month = int(calendar_month)
            cal_year = int(calendar_year)
        complexity_map = {
            1: MonthlyGoal.ComplexityLevel.BASE, 2: MonthlyGoal.ComplexityLevel.BASE, 3: MonthlyGoal.ComplexityLevel.BASE,
            4: MonthlyGoal.ComplexityLevel.EJECUCION, 5: MonthlyGoal.ComplexityLevel.EJECUCION, 6: MonthlyGoal.ComplexityLevel.EJECUCION,
            7: MonthlyGoal.ComplexityLevel.CONSOLIDACION, 8: MonthlyGoal.ComplexityLevel.CONSOLIDACION, 9: MonthlyGoal.ComplexityLevel.CONSOLIDACION,
            10: MonthlyGoal.ComplexityLevel.CIERRE, 11: MonthlyGoal.ComplexityLevel.CIERRE, 12: MonthlyGoal.ComplexityLevel.CIERRE,
        }
        goal = MonthlyGoal.objects.create(
            plan=plan,
            month_order=next_order,
            calendar_month=cal_month,
            calendar_year=cal_year,
            monthly_goal_text=monthly_goal_text,
            brief_explanation=brief_explanation or 'Meta creada desde Kanban Backlog',
            annual_goal_relation=annual_goal_relation or plan.annual_goal.titulo,
            complexity_level=complexity_map.get(next_order, MonthlyGoal.ComplexityLevel.BASE),
            status=MonthlyGoal.GoalStatus.PROPUESTA,
        )
        return Response(MonthlyGoalSerializer(goal).data, status=status.HTTP_201_CREATED)


class MatrizLearningProgressViewSet(BaseUserViewSet):
    queryset = MatrizLearningProgress.objects.all()
    serializer_class = MatrizLearningProgressSerializer

    def get_queryset(self):
        return MatrizLearningProgress.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get', 'patch'])
    def progress(self, request):
        obj, created = MatrizLearningProgress.objects.get_or_create(user=request.user)
        if request.method == 'PATCH':
            serializer = MatrizLearningProgressSerializer(obj, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        return Response(MatrizLearningProgressSerializer(obj).data)
