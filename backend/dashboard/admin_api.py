"""API del panel de administración de contenido (`/api/admin/`).

Todo lo que hay aquí es de solo-lectura para el usuario final y de
lectura-escritura para el administrador. Cubre el contenido global que la app
sirve a todas las personas usuarias:

  * Tabla maestra del programa (12 meses) — `ProgramMonth`, `MonthlyTraining`, `ProgramDay`
  * Temas semanales de Tribu — `TribuTemaSemana`
  * Categorías y módulos de aprendizaje — `LearningCategory`, `LearningModuleRef`
  * Bloques de la visita guiada — `GuidedTourBlock`
  * Avatares — `Avatar`
  * Juegos y retos — `Juego`

Reglas de seguridad aplicadas aquí:

  * Cada viewset exige `IsContentAdmin` (`user.is_staff`). No hay ni un solo
    endpoint de escritura accesible para un usuario normal.
  * La subida de archivos va por el propio endpoint del recurso, en
    `multipart/form-data`, para que la validación de `FileField`/`ImageField`
    la haga Django y no quede ningún archivo huérfano en el disco.
  * Los borrados que tirarían contenido ya consumido por usuarios se bloquean
    con un 409 explicativo en vez de dejar que el `CASCADE` haga daño.
"""

from django.contrib.auth import get_user_model
from django.db.models import Count
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from .models import (
    AsignacionContenido,
    Avatar,
    GuidedTourBlock,
    Juego,
    LearningCategory,
    LearningModuleRef,
    Membresia,
    MonthlyTraining,
    ProgramDay,
    ProgramMonth,
    TribuTemaSemana,
    UserTrainingProgress,
)
from .permissions import IsContentAdmin
from .serializers import (
    AdminAsignacionSerializer,
    AdminAvatarSerializer,
    AdminGuidedTourBlockSerializer,
    AdminJuegoSerializer,
    AdminLearningCategorySerializer,
    AdminLearningModuleRefSerializer,
    AdminMembresiaSerializer,
    AdminMonthlyTrainingSerializer,
    AdminProgramDaySerializer,
    AdminProgramMonthSerializer,
    AdminTribuTemaSemanaSerializer,
)
from .services.admin_assistant import analizar_usuario, chatear, resumen_usuario

User = get_user_model()


class AdminContentViewSet(viewsets.ModelViewSet):
    """Base de todos los recursos de contenido.

    Centraliza el permiso y el parser multipart (necesario para los campos de
    archivo) para que cada viewset solo declare modelo y serializer.
    """

    permission_classes = [IsContentAdmin]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def no_borrar_si_esta_en_uso(self, instance, mensaje):
        """Devuelve un 409 si el recurso ya lo consumieron otras personas.

        Borrar en cascada un mes del programa dejaría huérfano el progreso de
        quienes ya avanzaron. Preferimos explicar el bloqueo a ejecutarlo.
        """
        if self._en_uso(instance):
            return Response(
                {'detail': mensaje},
                status=status.HTTP_409_CONFLICT,
            )
        return None

    def _en_uso(self, instance):
        raise NotImplementedError


# ── Tabla maestra del programa (cursos) ──

class AdminProgramMonthViewSet(AdminContentViewSet):
    """Los 12 meses del programa: tema, capacitación y objetivo formativo."""

    serializer_class = AdminProgramMonthSerializer

    def get_queryset(self):
        return (
            ProgramMonth.objects
            .order_by('month_number')
            .select_related('training')
        )

    def _en_uso(self, instance):
        training = getattr(instance, 'training', None)
        return bool(training) and UserTrainingProgress.objects.filter(training=training).exists()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        bloqueado = self.no_borrar_si_esta_en_uso(
            instance,
            'Este mes ya tiene capacitoraciones completadas por personas usuarias. '
            'No se puede borrar porque afectaría su progreso. '
            'Si solo quieres retirarlo de la ruta, cambia su tema o deja la capacitación sin video.',
        )
        if bloqueado:
            return bloqueado
        return super().destroy(request, *args, **kwargs)


class AdminTrainingViewSet(AdminContentViewSet):
    """Microcapacitaciones: texto, objetivos, video (URL o archivo)."""

    serializer_class = AdminMonthlyTrainingSerializer

    def get_queryset(self):
        return (
            MonthlyTraining.objects
            .order_by('month__month_number')
            .select_related('month')
        )

    def _en_uso(self, instance):
        return UserTrainingProgress.objects.filter(training=instance).exists()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        bloqueado = self.no_borrar_si_esta_en_uso(
            instance,
            'Esta capacitación ya fue completada por al menos una persona. '
            'No se puede borrar porque afectaría su progreso. '
            'Puedes editarla o quitarle el video para retirarla de la práctica.',
        )
        if bloqueado:
            return bloqueado
        return super().destroy(request, *args, **kwargs)


class AdminProgramDayViewSet(AdminContentViewSet):
    """Los 30 días de cada mes: frase del día, intención y pregunta de coaching."""

    serializer_class = AdminProgramDaySerializer

    def get_queryset(self):
        return (
            ProgramDay.objects
            .order_by('month__month_number', 'day_number')
            .select_related('month')
        )

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        month = request.query_params.get('month')
        if month:
            queryset = queryset.filter(month_id=month)
        intention = request.query_params.get('intention')
        if intention:
            queryset = queryset.filter(intention=intention)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        return Response(self.get_serializer(queryset, many=True).data)


# ── Tribu ──

class AdminTribuTemaViewSet(AdminContentViewSet):
    """Temas semanales de Tribu.

    El modelo ya garantiza que solo uno esté activo a la vez
    (`TribuTemaSemana.save()`), así que acá no hace falta repetirlo.
    """

    serializer_class = AdminTribuTemaSemanaSerializer

    def get_queryset(self):
        qs = TribuTemaSemana.objects.all().order_by('-creado')
        activo = self.request.query_params.get('activo')
        if activo in ('true', 'false'):
            qs = qs.filter(activo=(activo == 'true'))
        return qs

    @action(detail=True, methods=['post'])
    def activar(self, request, pk=None):
        """Activa este tema y desactiva el resto."""
        tema = self.get_object()
        tema.activo = True
        tema.save()  # el save() del modelo desactiva los demás
        return Response(self.get_serializer(tema).data)


# ── Contenido de aprendizaje e INICIO ──

class AdminLearningCategoryViewSet(AdminContentViewSet):
    """Categorías de aprendizaje. Sus módulos llegan anidados en la respuesta."""

    serializer_class = AdminLearningCategorySerializer

    def get_queryset(self):
        return LearningCategory.objects.order_by('order').prefetch_related('modules')


class AdminLearningModuleViewSet(AdminContentViewSet):
    """Módulos de referencia dentro de una categoría de aprendizaje."""

    serializer_class = AdminLearningModuleRefSerializer

    def get_queryset(self):
        qs = LearningModuleRef.objects.order_by('category__order', 'order')
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category_id=category)
        return qs


class AdminGuidedTourBlockViewSet(AdminContentViewSet):
    """Bloques de la visita guiada del módulo INICIO."""

    serializer_class = AdminGuidedTourBlockSerializer

    def get_queryset(self):
        return GuidedTourBlock.objects.order_by('order')


# ── Avatares ──

class AdminAvatarViewSet(AdminContentViewSet):
    """Avatares del onboarding: imagen, voz y mensaje de presentación."""

    serializer_class = AdminAvatarSerializer

    def get_queryset(self):
        qs = Avatar.objects.order_by('name')
        activo = self.request.query_params.get('activo')
        if activo in ('true', 'false'):
            qs = qs.filter(is_active=(activo == 'true'))
        return qs


# ── Juegos y retos ──

class AdminJuegoViewSet(AdminContentViewSet):
    """Catálogo de juegos y retos. El usuario final solo abre el enlace."""

    serializer_class = AdminJuegoSerializer

    def get_queryset(self):
        qs = Juego.objects.select_related('categoria').order_by('orden', 'titulo')
        activo = self.request.query_params.get('activo')
        if activo in ('true', 'false'):
            qs = qs.filter(activo=(activo == 'true'))
        categoria = self.request.query_params.get('categoria')
        if categoria:
            qs = qs.filter(categoria_id=categoria)
        return qs

    @action(detail=False, methods=['get'])
    def catalogo(self, request):
        """Vista de lo que ve la persona usuaria: solo lo activo y en orden."""
        juegos = self.get_queryset().filter(activo=True)
        return Response(self.get_serializer(juegos, many=True).data)


# ── Usuarios, niveles, membresías y asistente IA ──

class AdminUsuarioViewSet(viewsets.ReadOnlyModelViewSet):
    """Personas usuarias con su nivel (mes alcanzado) y membresía.

    Solo lectura: el admin no edita usuarios desde aquí, solo los vigila.
    La membresía se gestiona en `AdminMembresiaViewSet`.
    """

    permission_classes = [IsContentAdmin]

    def get_queryset(self):
        qs = User.objects.order_by('id').prefetch_related(
            'membresias', 'training_progress')
        staff = self.request.query_params.get('staff')
        if staff in ('true', 'false'):
            qs = qs.filter(is_staff=(staff == 'true'))
        q = self.request.query_params.get('q')
        if q:
            qs = qs.filter(username__icontains=q) | qs.filter(email__icontains=q)
        return qs

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        nivel = request.query_params.get('nivel')
        membresia = request.query_params.get('membresia')  # vigente|vencida|sin
        fichas = [resumen_usuario(u) for u in qs[:200]]
        if nivel not in (None, ''):
            fichas = [f for f in fichas if f['nivel'] == int(nivel)]
        if membresia == 'vigente':
            fichas = [f for f in fichas
                      if f['membresia'] and f['membresia']['estado'] == 'vigente']
        elif membresia == 'vencida':
            fichas = [f for f in fichas
                      if f['membresia'] and f['membresia']['estado'] == 'vencida']
        elif membresia == 'sin':
            fichas = [f for f in fichas if f['sin_membresia']]
        return Response(fichas)

    def retrieve(self, request, *args, **kwargs):
        usuario = self.get_object()
        ficha = resumen_usuario(usuario)
        ficha['membresias'] = [
            {
                'id': m.id,
                'fecha_inicio': m.fecha_inicio.isoformat(),
                'fecha_fin': m.fecha_fin.isoformat(),
                'estado': m.estado,
                'dias_restantes': m.dias_restantes,
                'nota': m.nota,
            }
            for m in usuario.membresias.order_by('-fecha_inicio')[:10]
        ]
        return Response(ficha)

    @action(detail=True, methods=['post'])
    def analizar(self, request, pk=None):
        """Análisis IA del usuario: nivel, membresía y recomendación."""
        ficha = resumen_usuario(self.get_object())
        texto, fuente = analizar_usuario(ficha)
        return Response({'analisis': texto, 'fuente': fuente, 'ficha': ficha})


class AdminMembresiaViewSet(AdminContentViewSet):
    """Membresías personalizadas: el admin fija inicio y fin por usuario."""

    serializer_class = AdminMembresiaSerializer

    def get_queryset(self):
        qs = Membresia.objects.select_related('user').order_by('-fecha_inicio')
        usuario = self.request.query_params.get('user')
        if usuario:
            qs = qs.filter(user_id=usuario)
        estado = self.request.query_params.get('estado')
        if estado in ('vigente', 'proxima', 'vencida'):
            hoy = timezone.localdate()
            if estado == 'vigente':
                qs = qs.filter(fecha_inicio__lte=hoy, fecha_fin__gte=hoy)
            elif estado == 'proxima':
                qs = qs.filter(fecha_inicio__gt=hoy)
            else:
                qs = qs.filter(fecha_fin__lt=hoy)
        return qs


class AdminAsignacionViewSet(AdminContentViewSet):
    """Reparto personalizado: qué contenido ve cada usuario.

    Regla: si el usuario tiene filas de un tipo, solo ve esos objetos; si no
    tiene ninguna, ve todo. No hay 409 aquí: quitar una asignación nunca
    borra progreso, solo oculta contenido.
    """

    serializer_class = AdminAsignacionSerializer

    def get_queryset(self):
        qs = AsignacionContenido.objects.select_related('user').order_by('tipo', 'objeto_id')
        usuario = self.request.query_params.get('user')
        if usuario:
            qs = qs.filter(user_id=usuario)
        tipo = self.request.query_params.get('tipo')
        if tipo:
            qs = qs.filter(tipo=tipo)
        return qs

    def _en_uso(self, instance):
        return False

    @action(detail=False, methods=['post'])
    def reemplazar(self, request):
        """Fija la lista completa de un tipo para un usuario (borra y crea).

        Body: {user, tipo, objeto_ids: [...][]}. Vacío = vuelve a ver todo.
        """
        from django.shortcuts import get_object_or_404
        usuario = get_object_or_404(User, pk=request.data.get('user'))
        tipo = request.data.get('tipo')
        if tipo not in dict(AsignacionContenido.Tipo.choices):
            return Response({'detail': 'Tipo inválido.'},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            ids = sorted({int(i) for i in request.data.get('objeto_ids', [])})
        except (TypeError, ValueError):
            return Response({'detail': 'objeto_ids debe ser lista de IDs.'},
                            status=status.HTTP_400_BAD_REQUEST)
        modelo = AsignacionContenido.modelo_para(tipo)
        existentes = set(modelo.objects.filter(pk__in=ids).values_list('pk', flat=True))
        faltan = [i for i in ids if i not in existentes]
        if faltan:
            return Response(
                {'detail': f'No existen {tipo} con id {faltan}.'},
                status=status.HTTP_400_BAD_REQUEST)
        AsignacionContenido.objects.filter(user=usuario, tipo=tipo).delete()
        AsignacionContenido.objects.bulk_create(
            [AsignacionContenido(user=usuario, tipo=tipo, objeto_id=i) for i in ids])
        return Response(self.get_serializer(
            AsignacionContenido.objects.filter(user=usuario, tipo=tipo),
            many=True).data)


@api_view(['POST'])
@permission_classes([IsContentAdmin])
def admin_asistente_chat(request):
    """Chat del admin con la IA, con la foto global de usuarios como contexto."""
    pregunta = (request.data.get('pregunta') or '').strip()
    if not pregunta:
        return Response({'detail': 'Escribe una pregunta.'},
                        status=status.HTTP_400_BAD_REQUEST)
    texto, fuente = chatear(pregunta, request.data.get('historial') or [])
    return Response({'respuesta': texto, 'fuente': fuente})


# ── Sesión y resumen ──
@api_view(['GET'])
@permission_classes([IsContentAdmin])
def admin_session(request):
    """Confirma que quien entra es administrador y devuelve su perfil.

    El panel la llama al arrancar: si responde 403, no hay sesión de admin.
    """
    return Response({
        'id': request.user.id,
        'username': request.user.username,
        'email': request.user.email,
        'is_staff': True,
        'is_superuser': request.user.is_superuser,
    })


@api_view(['GET'])
@permission_classes([IsContentAdmin])
def admin_overview(request):
    """Resumen para la portada del panel, con los huecos que hay que rellenar."""
    meses = ProgramMonth.objects.order_by('month_number').select_related('training')

    meses_sin_capacitacion = [m.month_number for m in meses if not hasattr(m, 'training')]
    capacitaciones_sin_video = [
        t.month.month_number for t in MonthlyTraining.objects.select_related('month')
        if not (t.video_url or t.video_file)
    ]

    total_dias = ProgramDay.objects.count()
    meses_con_dias = (
        ProgramDay.objects.values('month_id')
        .annotate(n=Count('id'))
        .filter(n__gte=30)
        .count()
    )

    tema_activo = TribuTemaSemana.objects.filter(activo=True).order_by('-creado').first()

    return Response({
        'programa': {
            'meses': len(meses),
            'dias': total_dias,
            'meses_completos': meses_con_dias,
            'meses_sin_capacitacion': meses_sin_capacitacion,
            'capacitaciones_sin_video': capacitaciones_sin_video,
        },
        'tribu': {
            'temas': TribuTemaSemana.objects.count(),
            'tema_activo': AdminTribuTemaSemanaSerializer(tema_activo).data if tema_activo else None,
        },
        'aprendizaje': {
            'categorias': LearningCategory.objects.count(),
            'modulos': LearningModuleRef.objects.count(),
            'bloques_guia': GuidedTourBlock.objects.count(),
        },
        'avatares': {
            'total': Avatar.objects.count(),
            'activos': Avatar.objects.filter(is_active=True).count(),
        },
        'juegos': {
            'total': Juego.objects.count(),
            'activos': Juego.objects.filter(activo=True).count(),
        },
        'usuarios': {
            'total': User.objects.count(),
            'completaron_mes_actual': UserTrainingProgress.objects.filter(
                completado=True,
                training__month=meses[0] if len(meses) else None,
            ).count() if len(meses) else 0,
        },
    })

