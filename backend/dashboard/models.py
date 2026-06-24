import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    avatar_url = models.CharField(max_length=500, blank=True, default='')
    bio = models.TextField(blank=True, default='')

class LoginAttempt(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='login_attempts')
    username = models.CharField(max_length=150)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True, default='')
    success = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

class RuedaVida(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='rueda_vida')
    salud = models.IntegerField(default=5)
    amistad = models.IntegerField(default=5)
    dinero = models.IntegerField(default=5)

class TimeBlock(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='time_blocks')
    hora = models.IntegerField()
    tarea = models.CharField(max_length=255, blank=True)
    estado = models.CharField(max_length=10, default='pending')

    class Meta:
        ordering = ['hora']

class KanbanTask(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='kanban_tasks')
    titulo = models.CharField(max_length=255)
    descripcion = models.TextField(blank=True)
    columna = models.CharField(max_length=50, default='Backlog')
    fecha_hora = models.DateTimeField(null=True, blank=True)
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tasks')
    workspace = models.ForeignKey('Workspace', on_delete=models.CASCADE, null=True, blank=True, related_name='kanban_tasks')
    uuid = models.CharField(max_length=36, blank=True, default='')

class Recordatorio(models.Model):
    CATEGORIAS = (
        ('Medicamento', 'Medicamento'),
        ('Cumpleaños', 'Cumpleaños'),
        ('HoraOro', 'Hora de Oro'),
        ('Equipo', 'Equipo'),
        ('Otro', 'Otro'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='recordatorios')
    titulo = models.CharField(max_length=255)
    categoria = models.CharField(max_length=50, choices=CATEGORIAS)
    fecha_hora = models.DateTimeField()
    activo = models.BooleanField(default=True)
    tomado = models.BooleanField(default=False)
    workspace = models.ForeignKey('Workspace', on_delete=models.CASCADE, null=True, blank=True, related_name='recordatorios')

class ObjetivoSemana(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='objetivo_semana')
    texto1 = models.CharField(max_length=255, blank=True)
    texto2 = models.CharField(max_length=255, blank=True)
    texto3 = models.CharField(max_length=255, blank=True)

class KeepNota(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='keep_nota')
    contenido = models.TextField(blank=True)

class MisionHoy(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='mision_hoy')
    texto = models.TextField(blank=True, default='')
    imagen_url = models.URLField(blank=True, default='https://images.unsplash.com/photo-1542596594-649edbc13630?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80')

class CategoriaRueda(models.Model):
    nombre = models.CharField(max_length=100)
    icono = models.CharField(max_length=50, default='⭐')
    orden = models.IntegerField(default=0)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ['orden']

    def __str__(self):
        return self.nombre

class RegistroRueda(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='registros_rueda')
    categoria = models.ForeignKey(CategoriaRueda, on_delete=models.CASCADE)
    puntaje = models.IntegerField(default=5)
    comentario = models.TextField(blank=True, default='', help_text='Comentario opcional del usuario sobre esta área')
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'categoria']
        ordering = ['categoria__orden']


class DiagnosticoRueda(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='diagnostico_rueda')
    promedio_general = models.FloatField(default=0, help_text='Promedio general de todos los puntajes')
    nivel_equilibrio = models.CharField(max_length=20, default='medio',
        help_text='Crítico | Bajo | Medio | Bueno | Excelente')
    pico_alto = models.CharField(max_length=100, blank=True, default='')
    pico_bajo = models.CharField(max_length=100, blank=True, default='')
    foco_1 = models.CharField(max_length=100, blank=True, default='', help_text='Nombre del área foco 1')
    foco_2 = models.CharField(max_length=100, blank=True, default='', help_text='Nombre del área foco 2')
    foco_3 = models.CharField(max_length=100, blank=True, default='', help_text='Nombre del área foco 3')
    justificacion_focos = models.TextField(blank=True, default='', help_text='Justificación estratégica de los 3 focos seleccionados')
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Diagnóstico de Rueda'
        verbose_name_plural = 'Diagnósticos de Rueda'

    def __str__(self):
        return f'Diagnóstico {self.user.username}'


class AccionSugerida(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='acciones_sugeridas')
    area_foco = models.CharField(max_length=100, help_text='Nombre del área foco a la que pertenece')
    texto = models.TextField(help_text='Descripción de la acción sugerida')
    enviada_kanban = models.BooleanField(default=False, help_text='Si ya fue enviada al Kanban Backlog')
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Acción Sugerida'
        verbose_name_plural = 'Acciones Sugeridas'
        ordering = ['-creado']

    def __str__(self):
        return f'{self.area_foco}: {self.texto[:50]}'

class MatrixItem(models.Model):
    QUADRANTS = (
        ('do', 'Do (Urgent & Important)'),
        ('schedule', 'Schedule (Not Urgent & Important)'),
        ('delegate', 'Delegate (Urgent & Not Important)'),
        ('eliminate', 'Eliminate (Not Urgent & Not Important)'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='matrix_items')
    task = models.CharField(max_length=255)
    quadrant = models.CharField(max_length=20, choices=QUADRANTS)
    is_done = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    workspace = models.ForeignKey('Workspace', on_delete=models.CASCADE, null=True, blank=True, related_name='matrix_items')

    class Meta:
        ordering = ['created_at']

class Factura(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='facturas')
    nombre = models.CharField(max_length=255)
    monto = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    fecha_vencimiento = models.DateField()
    pagado = models.BooleanField(default=False)
    creado_en = models.DateTimeField(auto_now_add=True)
    workspace = models.ForeignKey('Workspace', on_delete=models.CASCADE, null=True, blank=True, related_name='facturas')

    class Meta:
        ordering = ['fecha_vencimiento']

class Workspace(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_workspaces')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

class WorkspaceMember(models.Model):
    ROLES = (
        ('owner', 'Owner'),
        ('admin', 'Admin'),
        ('member', 'Member'),
        ('viewer', 'Viewer'),
    )
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='workspace_memberships')
    role = models.CharField(max_length=20, choices=ROLES, default='member')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['workspace', 'user']
        ordering = ['role', 'joined_at']

class Invitation(models.Model):
    STATUSES = (
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
        ('expired', 'Expired'),
    )
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='invitations')
    email = models.EmailField()
    role = models.CharField(max_length=20, choices=WorkspaceMember.ROLES, default='member')
    token = models.CharField(max_length=64, unique=True)
    status = models.CharField(max_length=20, choices=STATUSES, default='pending')
    invited_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_invitations')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

class Delegation(models.Model):
    STATUSES = (
        ('pending', 'Pendiente'),
        ('accepted', 'Aceptada'),
        ('completed', 'Completada'),
        ('rejected', 'Rechazada'),
    )
    task = models.ForeignKey(KanbanTask, on_delete=models.CASCADE, related_name='delegations')
    delegator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='delegations_sent')
    delegate = models.ForeignKey(User, on_delete=models.CASCADE, related_name='delegations_received')
    delegate_email = models.EmailField()
    message = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUSES, default='pending')
    token = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

class Notification(models.Model):
    TYPES = (
        ('invitation', 'Invitación'),
        ('delegation', 'Delegación'),
        ('reminder', 'Recordatorio'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=20, choices=TYPES)
    title = models.CharField(max_length=255)
    message = models.TextField(blank=True, default='')
    data = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


class MetaAnual(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='metas_anuales')
    titulo = models.CharField(max_length=255)
    descripcion = models.TextField(blank=True, default='')
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    aprobada = models.BooleanField(default=False)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creado']

    def __str__(self):
        return f'{self.titulo} ({self.user.username})'


class ObjetivoMensual(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='objetivos_mensuales')
    meta_anual = models.ForeignKey(MetaAnual, on_delete=models.SET_NULL, null=True, blank=True, related_name='objetivos_mensuales')
    mes = models.IntegerField(choices=[(i, str(i)) for i in range(1, 13)])
    titulo = models.CharField(max_length=255)
    descripcion = models.TextField(blank=True, default='')
    completado = models.BooleanField(default=False)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-meta_anual', 'mes']

    def __str__(self):
        return f'{self.titulo} (Mes {self.mes})'


class PropuestaIA(models.Model):
    class ImpactoChoices(models.TextChoices):
        ESTRUCTURAL = 'estructural', 'ESTRUCTURAL_SATURACIÓN'
        ESTRATEGICO_CRITICO = 'estrategico_critico', 'ESTRATÉGICO_CRÍTICO'
        DE_PRIORIDAD = 'de_prioridad', 'PRIORIDAD_REORGANIZACIÓN'

    class DecisionChoices(models.TextChoices):
        APLICAR = 'aplicar', 'Aplicar Ajuste Ahora'
        REVISAR = 'revisar', 'Revisar Después'
        MANTENER = 'mantener', 'Mantener Planificación Actual'
        IGNORADO = 'ignorado', 'Ignorado'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='propuestas_ia')
    tipo_impacto = models.CharField(max_length=30, choices=ImpactoChoices.choices)
    situacion_clara = models.TextField()
    explicacion_impacto = models.TextField()
    propuesta_ajuste = models.TextField()
    fase_detectada = models.CharField(max_length=50, blank=True, default='')
    respondida = models.BooleanField(default=False)
    decision_usuario = models.CharField(max_length=20, choices=DecisionChoices.choices, blank=True, default='')
    leida = models.BooleanField(default=False)
    resultado_json = models.JSONField(default=dict, blank=True,
        help_text='Payload completo de la respuesta del motor de IA según especificación del sistema')
    creada = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creada']

    def __str__(self):
        return f'Propuesta {self.tipo_impacto} para {self.user.username}'


class ConfiguracionUsuario(models.Model):
    class VozGenero(models.TextChoices):
        MASCULINO = 'masculino', 'Masculino'
        FEMENINO = 'femenino', 'Femenino'

    class EstiloComunicacion(models.TextChoices):
        SUAVE = 'suave', 'Suave'
        DIRECTO = 'directo', 'Directo / Estructurado'

    class NivelExigencia(models.TextChoices):
        BAJO = 'bajo', 'Bajo'
        MEDIO = 'medio', 'Medio'
        ALTO = 'alto', 'Alto'

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='configuracion')
    voz_genero = models.CharField(max_length=10, choices=VozGenero.choices, default=VozGenero.FEMENINO)
    estilo_comunicacion = models.CharField(max_length=10, choices=EstiloComunicacion.choices, default=EstiloComunicacion.SUAVE)
    nivel_exigencia = models.CharField(max_length=5, choices=NivelExigencia.choices, default=NivelExigencia.MEDIO)
    frecuencia_intervenciones = models.IntegerField(default=24, help_text='Horas entre intervenciones permitidas')
    canales_interaccion = models.JSONField(default=list, blank=True,
        help_text='Canales habilitados: ["notificacion", "simulacion_llamada", "whatsapp_simulado", "buzon_ia"]')
    ventana_inicio = models.TimeField(default='07:00', help_text='Inicio de ventana de intervención')
    ventana_fin = models.TimeField(default='22:00', help_text='Fin de ventana de intervención')
    avatar_index = models.IntegerField(default=0, help_text='0=sin selección, 1-6=avatar seleccionado en onboarding')
    onboarding_completado = models.BooleanField(default=False, help_text='Indica si el usuario completó el flujo de onboarding')
    video_inicial_visto = models.BooleanField(default=False, help_text='Indica si el usuario ya vio el video introductorio post-onboarding')
    ultimo_ingreso = models.DateTimeField(null=True, blank=True, help_text='Timestamp del último acceso al hub post-onboarding')
    conteo_ingresos_hub = models.IntegerField(default=0, help_text='Número de veces que el usuario ha ingresado al hub post-onboarding')
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Configuración de Usuario'
        verbose_name_plural = 'Configuraciones de Usuarios'

    def __str__(self):
        return f'Config {self.user.username}'


class InteraccionUsuario(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='interacciones')
    tipo = models.CharField(max_length=50, db_index=True,
        help_text='Tipo de evento: video_view, tutorial_click, guided_tour_step, config_change, etc.')
    metadata = models.JSONField(default=dict, blank=True,
        help_text='Datos adicionales: tiempo_visto, origen, categoria, paso, etc.')
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creado']
        verbose_name = 'Interacción de Usuario'
        verbose_name_plural = 'Interacciones de Usuarios'

    def __str__(self):
        return f'{self.tipo} - {self.user.username}'


class MatrizEisenhower(models.Model):
    class EstadoChoices(models.TextChoices):
        INCOMPLETO = 'INCOMPLETO', 'Incompleto'
        COMPLETADO = 'COMPLETADO', 'Completado'

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='matriz_eisenhower')
    status = models.CharField(max_length=20, choices=EstadoChoices.choices, default=EstadoChoices.INCOMPLETO)
    video_watched = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Matriz Eisenhower'
        verbose_name_plural = 'Matriz Eisenhower'

    def __str__(self):
        return f'MatrizEisenhower {self.user.username} - {self.status}'


class Activacion(models.Model):
    class TipoActivacion(models.TextChoices):
        TRADICIONAL = 'tradicional', 'Recordatorio Tradicional'
        SIMULADA = 'simulada', 'Activación Simulada (Llamada/WhatsApp)'
        CON_INTENCION = 'con_intencion', 'Activación con Intención (Propósito)'
        ADAPTATIVA = 'adaptativa', 'Activación Adaptativa (IA)'

    class EstadoActivacion(models.TextChoices):
        PENDIENTE = 'pendiente', 'Pendiente'
        ENVIADA = 'enviada', 'Enviada'
        VISTA = 'vista', 'Vista'
        RESPONDIDA = 'respondida', 'Respondida'
        IGNORADA = 'ignorada', 'Ignorada'
        FALLIDA = 'fallida', 'Fallida'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activaciones')
    tipo = models.CharField(max_length=20, choices=TipoActivacion.choices)
    estado = models.CharField(max_length=15, choices=EstadoActivacion.choices, default=EstadoActivacion.PENDIENTE)
    titulo = models.CharField(max_length=255)
    mensaje = models.TextField()
    mensaje_intencion = models.TextField(blank=True, default='',
        help_text='Mensaje que vincula con propósito mayor (para activaciones con intención)')
    metadata = models.JSONField(default=dict, blank=True,
        help_text='Datos extras: tarea_id, bloque_id, url_simulacion, etc.')
    ventana_programada = models.DateTimeField(null=True, blank=True,
        help_text='Momento óptimo calculado por IA para enviar')
    enviada_en = models.DateTimeField(null=True, blank=True)
    leida_en = models.DateTimeField(null=True, blank=True)
    respondida_en = models.DateTimeField(null=True, blank=True)
    creada = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creada']

    def __str__(self):
        return f'[{self.tipo}] {self.titulo} - {self.user.username}'


class KanbanAction(models.Model):
    class Source(models.TextChoices):
        USER_INPUT = 'USER_INPUT', 'Usuario'
        RUEDA_VIDA_SUGGESTION = 'RUEDA_VIDA_SUGGESTION', 'Sugerencia Rueda de Vida'

    class ClassificationStatus(models.TextChoices):
        PENDIENTE = 'PENDIENTE', 'Pendiente'
        HACER = 'HACER', 'Hacer'
        PLANIFICAR = 'PLANIFICAR', 'Planificar'
        DELEGAR = 'DELEGAR', 'Delegar'
        ELIMINAR = 'ELIMINAR', 'Eliminar'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='kanban_actions')
    title = models.CharField(max_length=500)
    source = models.CharField(max_length=30, choices=Source.choices, default=Source.USER_INPUT)
    classification_status = models.CharField(
        max_length=20, choices=ClassificationStatus.choices, default=ClassificationStatus.PENDIENTE
    )
    scheduled_date = models.DateField(null=True, blank=True)
    pinned = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-pinned', '-created_at']

    def __str__(self):
        return f'{self.title} [{self.classification_status}]'
