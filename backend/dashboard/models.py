import uuid
from datetime import date, time
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth.models import AbstractUser


# ── Rutas de archivos subidos por el administrador ──
# SeOrganizan por año/mes para no saturar un solo directorio cuando el panel
# lleva años acumulando video e imágenes.

def _upload_path(carpeta, filename):
    from django.utils import timezone
    ahora = timezone.now()
    return f'{carpeta}/{ahora:%Y/%m}/{uuid.uuid4().hex}_{filename}'


def training_video_path(instance, filename):
    return _upload_path('capacitaciones/videos', filename)


def training_media_path(instance, filename):
    return _upload_path('capacitaciones/imagenes', filename)


def tribu_imagen_path(instance, filename):
    return _upload_path('tribu', filename)


def juego_imagen_path(instance, filename):
    return _upload_path('juegos', filename)


def avatar_imagen_path(instance, filename):
    return _upload_path('avatares/imagenes', filename)


def avatar_audio_path(instance, filename):
    return _upload_path('avatares/audio', filename)


class User(AbstractUser):
    avatar_url = models.TextField(blank=True, default='')
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
    fecha = models.DateField(default=date.today)
    hora = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(23)])
    tarea = models.CharField(max_length=255, blank=True)
    estado = models.CharField(max_length=10, default='pending')

    class Meta:
        ordering = ['fecha', 'hora']
        unique_together = ['user', 'fecha', 'hora']

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

class Suplemento(models.Model):
    """Suplemento o medicamento con su programación de tomas (Doc 21)."""
    TIPOS = (
        ('Suplemento', 'Suplemento'),
        ('Medicamento', 'Medicamento'),
    )
    PRESENTACIONES = (
        ('Cápsula', 'Cápsula'),
        ('Comprimido', 'Comprimido'),
        ('Tableta', 'Tableta'),
        ('Gota', 'Gota'),
        ('Mililitro', 'Mililitro'),
        ('Unidad', 'Unidad'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='suplementos')
    nombre = models.CharField(max_length=255)
    tipo = models.CharField(max_length=20, choices=TIPOS, default='Suplemento')
    presentacion = models.CharField(max_length=30, choices=PRESENTACIONES, blank=True, default='')
    frecuencia_horas = models.PositiveIntegerField(default=24)
    hora_primera = models.TimeField()
    duracion_dias = models.PositiveIntegerField(null=True, blank=True)  # solo medicamentos
    fecha_inicio = models.DateField()
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.nombre} ({self.tipo})'

    def limite_dias(self):
        """Último día del tratamiento (medicamentos) o None si es indefinido."""
        if self.tipo == 'Medicamento' and self.duracion_dias:
            return self.duracion_dias
        return None


class SuplementoToma(models.Model):
    suplemento = models.ForeignKey(Suplemento, on_delete=models.CASCADE, related_name='tomas')
    programada = models.DateTimeField()
    tomado = models.BooleanField(default=False)
    tomado_en = models.DateTimeField(null=True, blank=True)
    # Doc 21 §III: evita repetir el aviso proactivo de una misma dosis.
    avisada = models.BooleanField(default=False)

    class Meta:
        ordering = ['programada']
        unique_together = ('suplemento', 'programada')

    def __str__(self):
        return f'{self.suplemento.nombre} @ {self.programada:%Y-%m-%d %H:%M}'


class HoraOroExperiencia(models.Model):
    """Doc 24 §II.3 — Experiencia familiar registrada en el planificador semanal.

    El usuario no escribe la actividad: la elige del catálogo. Cada registro
    ocupa un espacio (posicion) de un día de la semana. Los dos primeros
    espacios de cada día son los visibles por defecto; a partir de ahí se
    agregan sin límite.
    """
    DIAS = (
        ('Lunes', 'Lunes'),
        ('Martes', 'Martes'),
        ('Miércoles', 'Miércoles'),
        ('Jueves', 'Jueves'),
        ('Viernes', 'Viernes'),
        ('Sábado', 'Sábado'),
        ('Domingo', 'Domingo'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='hora_oro')
    dia_semana = models.CharField(max_length=12, choices=DIAS)
    posicion = models.PositiveIntegerField(default=0)
    categoria = models.CharField(max_length=60)
    actividad = models.CharField(max_length=160)
    # «Disfruta este momento»: la experiencia se marca como realizada y alimenta
    # las estadísticas del módulo.
    realizada = models.BooleanField(default=False)
    realizada_en = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['posicion', 'id']
        unique_together = ('user', 'dia_semana', 'posicion')

    def __str__(self):
        return f'{self.dia_semana} · {self.actividad}'


class HoraOroAjustes(models.Model):
    """Preferencias del recordatorio de Hora de Oro («Configurar recordatorios»)."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='hora_oro_ajustes')
    recordatorio_activo = models.BooleanField(default=True)
    hora_recordatorio = models.TimeField(default='18:00')

    class Meta:
        verbose_name = 'Ajustes de Hora de Oro'
        verbose_name_plural = 'Ajustes de Hora de Oro'

    def __str__(self):
        return f'Ajustes Hora de Oro · {self.user.username}'

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
    class Status(models.TextChoices):
        IN_PROGRESS = 'in_progress', 'En progreso'
        COMPLETED = 'completed', 'Completado'

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='diagnostico_rueda')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.IN_PROGRESS,
        help_text='Estado del diagnóstico (en_progreso o completado)')
    promedio_general = models.FloatField(default=0, help_text='Promedio general de todos los puntajes')
    nivel_equilibrio = models.CharField(max_length=20, default='medio',
        help_text='Crítico | Bajo | Medio | Bueno | Excelente')
    pico_alto = models.CharField(max_length=100, blank=True, default='')
    pico_bajo = models.CharField(max_length=100, blank=True, default='')
    foco_1 = models.CharField(max_length=100, blank=True, default='', help_text='Nombre del área foco 1')
    foco_2 = models.CharField(max_length=100, blank=True, default='', help_text='Nombre del área foco 2')
    foco_3 = models.CharField(max_length=100, blank=True, default='', help_text='Nombre del área foco 3')
    justificacion_focos = models.TextField(blank=True, default='', help_text='Justificación estratégica de los 3 focos seleccionados')
    ai_summary = models.TextField(blank=True, default='', help_text='Reporte sintético generado por IA')
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Diagnóstico de Rueda'
        verbose_name_plural = 'Diagnósticos de Rueda'

    def __str__(self):
        return f'Diagnóstico {self.user.username} [{self.status}]'

    def completar(self):
        self.status = self.Status.COMPLETED
        from django.utils import timezone as tz
        self.save(update_fields=['status'])


class FocusArea(models.Model):
    diagnostico = models.ForeignKey(DiagnosticoRueda, on_delete=models.CASCADE, related_name='focus_areas')
    area = models.CharField(max_length=100, help_text='Nombre del área foco')
    score = models.IntegerField(default=0, help_text='Puntaje del área (1-10)')
    reason = models.TextField(blank=True, default='', help_text='Explicación de por qué fue elegida')
    priority_order = models.PositiveSmallIntegerField(help_text='Orden de prioridad (1, 2, 3)')

    class Meta:
        ordering = ['priority_order']
        unique_together = ['diagnostico', 'area']
        verbose_name = 'Área Foco'
        verbose_name_plural = 'Áreas Foco'

    def __str__(self):
        return f'{self.area} (#{self.priority_order})'


class AccionSugerida(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='acciones_sugeridas')
    area_foco = models.CharField(max_length=100, help_text='Nombre del área foco a la que pertenece')
    texto = models.TextField(help_text='Descripción de la acción sugerida')
    batch_number = models.PositiveSmallIntegerField(default=1, help_text='Número de tanda (1-4, máximo 4 tandas)')
    focus_area = models.ForeignKey(FocusArea, on_delete=models.SET_NULL, null=True, blank=True, related_name='acciones_sugeridas',
        help_text='Área foco asociada (opcional)')
    enviada_kanban = models.BooleanField(default=False, help_text='Si ya fue enviada al Kanban Backlog')
    kanban_accion = models.ForeignKey('AccionKanban', on_delete=models.SET_NULL, null=True, blank=True, related_name='acciones_sugeridas_origen',
        help_text='Referencia a la acción kanban creada')
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Acción Sugerida'
        verbose_name_plural = 'Acciones Sugeridas'
        ordering = ['-creado']

    def __str__(self):
        return f'{self.area_foco} (batch {self.batch_number}): {self.texto[:50]}'

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


class CuentaColumna(models.Model):
    """Columna personalizada de la tabla de Cuentas (doc 17). Persiste entre períodos."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cuentas_columnas')
    nombre = models.CharField(max_length=100)
    orden = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['orden', 'id']
        verbose_name = 'Columna de Cuentas'
        verbose_name_plural = 'Columnas de Cuentas'

    def __str__(self):
        return f'{self.user.username} / {self.nombre}'


class CuentaRegistro(models.Model):
    """Fila de la tabla de Cuentas para un período mensual (doc 17)."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cuentas_registros')
    periodo_anio = models.PositiveIntegerField(help_text='Año del período mensual')
    periodo_mes = models.PositiveSmallIntegerField(help_text='Mes del período (1-12)')
    cuenta = models.CharField(max_length=255, blank=True, default='')
    dia_vencimiento = models.PositiveSmallIntegerField(null=True, blank=True, help_text='Día habitual de pago (1-31)')
    monto = models.CharField(max_length=100, blank=True, default='', help_text='Valor referencial, texto libre')
    pagado = models.BooleanField(default=False)
    orden = models.PositiveIntegerField(default=0)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['orden', 'id']
        verbose_name = 'Registro de Cuenta'
        verbose_name_plural = 'Registros de Cuentas'

    def __str__(self):
        return f'{self.user.username} {self.periodo_anio}-{self.periodo_mes:02d} / {self.cuenta}'


class CuentaValor(models.Model):
    """Valor de una columna personalizada para una fila (doc 17)."""
    registro = models.ForeignKey(CuentaRegistro, on_delete=models.CASCADE, related_name='valores')
    columna = models.ForeignKey(CuentaColumna, on_delete=models.CASCADE, related_name='valores')
    valor = models.TextField(blank=True, default='')

    class Meta:
        unique_together = [('registro', 'columna')]
        verbose_name = 'Valor de Celda de Cuentas'
        verbose_name_plural = 'Valores de Celdas de Cuentas'

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
        ('report', 'Reporte'),
    )

    # Doc 27 §2.4: niveles de prioridad del Sistema Proactivo.
    PRIORITIES = (
        ('critica', 'Crítica'),
        ('importante', 'Importante'),
        ('informativa', 'Informativa'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=20, choices=TYPES)
    title = models.CharField(max_length=255)
    message = models.TextField(blank=True, default='')
    data = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    # Doc 27 §2.5, §2.7 y §7.2: prioridad, momento del compromiso, entrega
    # diferida y clave de deduplicación (un evento + un momento = un aviso).
    priority = models.CharField(
        max_length=12, choices=PRIORITIES, default='informativa', db_index=True)
    channel = models.CharField(
        max_length=20, blank=True, default='',
        help_text='Canal que originó el aviso (app, push, whatsapp, calls).')
    scheduled_for = models.DateTimeField(
        null=True, blank=True, help_text='Hora del compromiso; ordena avisos del mismo nivel.')
    delivered_at = models.DateTimeField(
        null=True, blank=True, help_text='Momento de entrega por canales externos.')
    pending_delivery = models.BooleanField(
        default=False, db_index=True,
        help_text='Aviso postergado: espera franja permitida o fin de Focus.')
    in_bell = models.BooleanField(
        default=True, db_index=True,
        help_text='Visible en la campana (canal app habilitado).')
    cancelled_at = models.DateTimeField(
        null=True, blank=True, help_text='El evento de origen ya no está vigente.')
    dedupe_key = models.CharField(
        max_length=120, blank=True, default='', db_index=True,
        help_text='Identidad del aviso para no duplicarlo (evento + momento).')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'[{self.priority}] {self.title} - {self.user.username}'


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


class GranMetaAnual(models.Model):
    class Status(models.TextChoices):
        PROPUESTA = 'PROPUESTA', 'Meta propuesta'
        RECONSTRUYENDO = 'RECONSTRUYENDO', 'Meta en edición'
        APROBADA = 'APROBADA', 'Meta aprobada'
        SUPERSEDIDA = 'SUPERSEDIDA', 'Reemplazada'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='gran_meta_anual')
    wheel_of_life_context = models.JSONField(default=dict, blank=True)
    raw_responses = models.JSONField(default=dict, blank=True)
    answer_transformation_area = models.TextField(blank=True, default='')
    answer_desired_result = models.TextField(blank=True, default='')
    answer_expected_impact = models.TextField(blank=True, default='')
    edit_instruction = models.TextField(blank=True, null=True)
    generated_goal_text = models.TextField(blank=True, default='')
    smart_breakdown = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PROPUESTA)
    version = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=False)
    approved_at = models.DateTimeField(null=True, blank=True)
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-creado']
        verbose_name = 'Gran Meta Anual'
        verbose_name_plural = 'Grans Metas Anuales'
        constraints = [
            models.UniqueConstraint(
                fields=['user'], condition=models.Q(is_active=True),
                name='unique_active_annual_goal_per_user',
            )
        ]

    def __str__(self):
        return f'{self.generated_goal_text[:60]}... [{self.status}]'


class AnnualGoalConversationTurn(models.Model):
    class Role(models.TextChoices):
        AVATAR = 'avatar', 'Avatar'
        USER = 'user', 'Usuario'

    goal = models.ForeignKey(GranMetaAnual, on_delete=models.CASCADE, related_name='conversation_turns')
    role = models.CharField(max_length=10, choices=Role.choices)
    step = models.CharField(max_length=30, help_text='e.g. intro, question_1, question_2, question_3, validation, smart_intro, edit_prompt, edit_reply, approval')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Turno de conversación'
        verbose_name_plural = 'Turnos de conversación'

    def __str__(self):
        return f'{self.role} @ {self.step}'


class MonthlyPlan(models.Model):
    class Status(models.TextChoices):
        PROPUESTA = 'PROPUESTA', 'Propuesta'
        EDITADA = 'EDITADA', 'Editada'
        APROBADA = 'APROBADA', 'Aprobada'
        PENDIENTE_REVISION = 'PENDIENTE_REVISION', 'Pendiente de revisión'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='monthly_plans')
    annual_goal = models.ForeignKey(MetaAnual, on_delete=models.CASCADE, null=True, blank=True, related_name='monthly_plans')
    cycle_start_month = models.IntegerField(help_text='Mes de inicio del ciclo (1-12)')
    cycle_start_year = models.IntegerField(help_text='Año de inicio del ciclo')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PROPUESTA)
    approved_at = models.DateTimeField(null=True, blank=True)
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-creado']

    def __str__(self):
        return f'Plan Mensual ciclo {self.cycle_start_month}/{self.cycle_start_year} [{self.status}]'


class MonthlyGoal(models.Model):
    class Complexity(models.TextChoices):
        BASE = 'BASE', 'Base'
        EJECUCION = 'EJECUCION', 'Ejecución'
        CONSOLIDACION = 'CONSOLIDACION', 'Consolidación'
        CIERRE = 'CIERRE', 'Cierre'

    class Status(models.TextChoices):
        PROPUESTA = 'PROPUESTA', 'Propuesta'
        EDITADA = 'EDITADA', 'Editada'
        APROBADA = 'APROBADA', 'Aprobada'
        PENDIENTE = 'PENDIENTE', 'Pendiente'

    plan = models.ForeignKey(MonthlyPlan, on_delete=models.CASCADE, related_name='goals')
    month_order = models.IntegerField(help_text='Posición en el ciclo personalizado (1-12)')
    calendar_month = models.IntegerField(help_text='Mes real del calendario gregoriano (1-12)')
    calendar_year = models.IntegerField(help_text='Año real del calendario gregoriano')
    monthly_goal_text = models.CharField(max_length=500, help_text='Frase de la meta mensual')
    brief_explanation = models.TextField(blank=True, default='', help_text='Justificación de 1-2 líneas')
    annual_goal_relation = models.TextField(blank=True, default='', help_text='Conexión con la meta anual')
    complexity_level = models.CharField(max_length=15, choices=Complexity.choices, default=Complexity.BASE)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.PROPUESTA)
    edited_by_user = models.BooleanField(default=False, help_text='Flag de auditoría para métricas de IA')
    version = models.IntegerField(default=1, help_text='Contador de control de cambios')
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['month_order']
        unique_together = [['plan', 'month_order']]

    def __str__(self):
        return f'Meta Mes {self.month_order}: {self.monthly_goal_text[:50]}'


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


class ObjetivoSemanal(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='objetivos_semanales')
    meta_anual = models.ForeignKey(MetaAnual, on_delete=models.SET_NULL, null=True, blank=True, related_name='objetivos_semanales')
    año = models.IntegerField()
    semana = models.IntegerField(choices=[(i, str(i)) for i in range(1, 54)])
    titulo = models.CharField(max_length=255)
    descripcion = models.TextField(blank=True, default='')
    completado = models.BooleanField(default=False)
    accion_origen = models.ForeignKey('AccionKanban', on_delete=models.SET_NULL, null=True, blank=True, related_name='objetivos_semanales_creados')
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-año', '-semana']
        unique_together = ['user', 'año', 'semana', 'titulo']

    def __str__(self):
        return f'{self.titulo} (Semana {self.semana}/{self.año})'


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
    annual_report_month = models.PositiveSmallIntegerField(default=12, help_text='Mes para reporte anual (1-12, default 12=diciembre)')
    annual_report_day = models.PositiveSmallIntegerField(default=31, help_text='Día del mes para reporte anual (1-31, default 31)')
    mission_photo_url = models.TextField(blank=True, default='', help_text='Foto personalizada para Misión Semanal (base64)')
    redes_sociales = models.JSONField(default=dict, blank=True,
        help_text='Enlaces de redes sociales del usuario: {"tiktok": "https://...", "facebook": "", "instagram": "", "linkedin": "", "youtube": "", "x": ""}')
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Configuración de Usuario'
        verbose_name_plural = 'Configuraciones de Usuarios'

    def __str__(self):
        return f'Config {self.user.username}'


class InteraccionUsuario(models.Model):
    class TipoEntidad(models.TextChoices):
        ACTIVACION = 'ACTIVACION', 'Activación'
        PROPUESTA_IA = 'PROPUESTA_IA', 'Propuesta IA'
        REPORTE_SEMANAL = 'REPORTE_SEMANAL', 'Reporte Semanal'
        REPORTE_MENSUAL = 'REPORTE_MENSUAL', 'Reporte Mensual'
        REPORTE_ANUAL = 'REPORTE_ANUAL', 'Reporte Anual'
        AGENTE = 'AGENTE', 'Agente'
        ONBOARDING = 'ONBOARDING', 'Onboarding'
        TAREA = 'TAREA', 'Tarea'

    class AccionTomada(models.TextChoices):
        CREADO = 'CREADO', 'Creado'
        VISTO = 'VISTO', 'Visto'
        RESPONDIDO = 'RESPONDIDO', 'Respondido'
        DESCARTADO = 'DESCARTADO', 'Descartado'
        COMPLETADO = 'COMPLETADO', 'Completado'
        CLICK = 'CLICK', 'Click'
        REPRODUCIDO = 'REPRODUCIDO', 'Reproducido'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='interacciones')
    tipo = models.CharField(max_length=50, db_index=True,
        help_text='Tipo de evento: video_view, tutorial_click, guided_tour_step, config_change, etc.')
    entity_type = models.CharField(max_length=20, choices=TipoEntidad.choices, blank=True, default='',
        help_text='Tipo de entidad con la que se interactuó')
    entity_id = models.CharField(max_length=36, blank=True, default='',
        help_text='ID de la entidad (UUID o entero como string)')
    action_taken = models.CharField(max_length=15, choices=AccionTomada.choices, blank=True, default='',
        help_text='Acción realizada sobre la entidad')
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
        EN_PROGRESO = 'EN_PROGRESO', 'En progreso'
        COMPLETADO = 'COMPLETADO', 'Completado'

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='matriz_eisenhower')
    status = models.CharField(max_length=20, choices=EstadoChoices.choices, default=EstadoChoices.INCOMPLETO)
    video_watched = models.BooleanField(default=False)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    correct_count = models.IntegerField(default=0)
    incorrect_count = models.IntegerField(default=0)
    error_quadrants = models.JSONField(default=list, blank=True)
    last_step = models.IntegerField(default=1)
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
    channel_used = models.CharField(max_length=30, blank=True, default='',
        help_text='Canal usado: in_app, push, whatsapp, simulacion_llamada, etc.')
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


class FocusiaReport(models.Model):
    class ReportLevel(models.TextChoices):
        WEEKLY = 'weekly', 'Semanal'
        MONTHLY = 'monthly', 'Mensual'
        ANNUAL = 'annual', 'Anual'

    class ReportStatus(models.TextChoices):
        GENERATED = 'generated', 'Generado'
        NOTIFIED = 'notified', 'Usuario notificado'
        OPENED = 'opened', 'Abierto por el usuario'
        ACTION_TAKEN = 'action_taken', 'Usuario tomó acción'
        DISMISSED = 'dismissed', 'Revisado más tarde'

    class ActionType(models.TextChoices):
        REORGANIZE_WEEK = 'reorganize_week', 'Reorganizar semana'
        ADJUST_GOAL = 'adjust_goal', 'Ajustar objetivo'
        KEEP_PLAN = 'keep_plan', 'Mantener plan'
        REVIEW_LATER = 'review_later', 'Revisar más tarde'

    class GenerationState(models.TextChoices):
        READY = 'ready', 'Listo'
        ANALYSIS_PENDING = 'analysis_pending', 'Análisis pendiente'
        FAILED = 'failed', 'No se pudo generar'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='focusia_reports')
    level = models.CharField(max_length=10, choices=ReportLevel.choices)
    period_start = models.DateField()
    period_end = models.DateField()

    completion_percentage = models.FloatField(default=0, validators=[MinValueValidator(0), MaxValueValidator(100)])
    completed_count = models.PositiveIntegerField(default=0)
    pending_count = models.PositiveIntegerField(default=0)
    strong_days = models.JSONField(default=list, blank=True)
    weak_days = models.JSONField(default=list, blank=True)
    consistency_score = models.FloatField(null=True, blank=True)

    headline_message = models.CharField(max_length=280, blank=True, default='')
    ai_interpretation = models.TextField(blank=True, default='')
    ai_raw_metadata = models.JSONField(default=dict, blank=True)

    status = models.CharField(max_length=20, choices=ReportStatus.choices, default=ReportStatus.GENERATED)
    notified_at = models.DateTimeField(null=True, blank=True)
    opened_at = models.DateTimeField(null=True, blank=True)
    action_taken = models.CharField(max_length=20, choices=ActionType.choices, null=True, blank=True)
    action_taken_at = models.DateTimeField(null=True, blank=True)

    # Doc 27 §4, §6 y §7: estado de generación, ventana de actualización y
    # registro de consulta para la señal "sin consultar" (ignorado).
    generation_state = models.CharField(
        max_length=20, choices=GenerationState.choices, default=GenerationState.READY
    )
    is_partial = models.BooleanField(
        default=False, help_text='Primer período parcial (planificación iniciada a mitad de período)'
    )
    cycle_label = models.CharField(max_length=60, blank=True, default='',
        help_text='Etiqueta legible del período (ej: "Diciembre 2026", "2026")')
    updated_until = models.DateTimeField(
        null=True, blank=True, help_text='Fin de la ventana de actualización (00:00 del día siguiente a la publicación)'
    )
    closed_at = models.DateTimeField(null=True, blank=True, help_text='Momento en que el período quedó cerrado')
    never_opened = models.BooleanField(
        default=False,
        help_text='El usuario no consultó este reporte antes de publicarse el siguiente del mismo tipo (señal "sin consultar")',
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'level', 'period_start')
        ordering = ['-period_start']
        verbose_name = 'Reporte FocusIA'
        verbose_name_plural = 'Reportes FocusIA'

    def __str__(self):
        return f'{self.get_level_display()} {self.period_start} — {self.user.username}'


class ReportDataSource(models.Model):
    report = models.ForeignKey(FocusiaReport, on_delete=models.CASCADE, related_name='data_sources')
    source_type = models.CharField(max_length=50)
    reference_id = models.CharField(max_length=100, blank=True, default='')
    snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = 'Fuente de Datos del Reporte'
        verbose_name_plural = 'Fuentes de Datos del Reporte'

    def __str__(self):
        return f'{self.source_type} → Reporte #{self.report_id}'


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


class AccionKanban(models.Model):
    class OrigenChoices(models.TextChoices):
        MANUAL = 'MANUAL', 'Manual'
        RUEDA_VIDA = 'RUEDA_VIDA', 'Rueda de Vida'
        OTRO = 'OTRO', 'Otro'

    class ClasificacionChoices(models.TextChoices):
        HACER = 'H', 'Hacer'
        PLANIFICAR = 'P', 'Planificar'
        DELEGAR = 'D', 'Delegar'
        ELIMINAR = 'E', 'Eliminar'

    class EstadoChoices(models.TextChoices):
        KANBAN_ACTIVO = 'KANBAN_ACTIVO', 'Kanban Activo'
        AGENDA_DIARIA = 'AGENDA_DIARIA', 'Agenda Diaria'
        PLANIFICADA_SEMANAL = 'PLANIFICADA_SEMANAL', 'Planificada Semanal'
        PLANIFICADA_MENSUAL = 'PLANIFICADA_MENSUAL', 'Planificada Mensual'
        PLANIFICADA_ANUAL = 'PLANIFICADA_ANUAL', 'Planificada Anual'
        POR_DELEGAR = 'POR_DELEGAR', 'Por Delegar'
        ELIMINADA = 'ELIMINADA', 'Eliminada'
        COMPLETADA = 'COMPLETADA', 'Completada'
        HISTORICA = 'HISTORICA', 'Histórica'

    class DestinoChoices(models.TextChoices):
        AGENDA_DIARIA = 'AGENDA_DIARIA', 'Agenda Diaria'
        PLAN_SEMANAL = 'PLAN_SEMANAL', 'Planificación Semanal'
        PLAN_MENSUAL = 'PLAN_MENSUAL', 'Planificación Mensual'
        PLAN_ANUAL = 'PLAN_ANUAL', 'Planificación Anual'
        DELEGACION = 'DELEGACION', 'Delegación'
        PAPELERA = 'PAPELERA', 'Papelera'
        SIN_DESTINO = 'SIN_DESTINO', 'Sin Destino'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='acciones_kanban')
    texto_accion = models.TextField()
    origen = models.CharField(max_length=20, choices=OrigenChoices.choices, default=OrigenChoices.MANUAL)
    clasificacion = models.CharField(
        max_length=1, choices=ClasificacionChoices.choices, null=True, blank=True
    )
    estado_actual = models.CharField(
        max_length=25, choices=EstadoChoices.choices, default=EstadoChoices.KANBAN_ACTIVO
    )
    destino_asignado = models.CharField(
        max_length=20, choices=DestinoChoices.choices, default=DestinoChoices.SIN_DESTINO
    )
    fecha_seleccionada = models.DateField(null=True, blank=True)
    fecha_planificada_original = models.DateField(
        null=True, blank=True,
        help_text='Primer día para el que se planificó. No cambia al reprogramar '
                  '(Doc 27 §5: el total original se conserva).',
    )
    hora_seleccionada = models.TimeField(null=True, blank=True)
    es_fijo = models.BooleanField(default=False)
    revert_data = models.JSONField(
        default=dict, blank=True,
        help_text='IDs laterales creados al clasificar (para DESHACER preciso)',
    )
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-creado_en']
        verbose_name = 'Acción Kanban'
        verbose_name_plural = 'Acciones Kanban'

    def __str__(self):
        return f'{self.texto_accion[:50]} [{self.get_clasificacion_display() or "Sin clasificar"}]'


class HistorialMovimiento(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    accion = models.ForeignKey(AccionKanban, on_delete=models.CASCADE, related_name='historial')
    estado_anterior = models.CharField(max_length=25)
    estado_nuevo = models.CharField(max_length=25)
    clasificacion_anterior = models.CharField(max_length=1, null=True, blank=True)
    clasificacion_nueva = models.CharField(max_length=1, null=True, blank=True)
    fecha_movimiento = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha_movimiento']
        verbose_name = 'Historial de Movimiento'
        verbose_name_plural = 'Historial de Movimientos'

    def __str__(self):
        return f'Movimiento {self.estado_anterior} → {self.estado_nuevo}'


class WeeklyPlan(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='weekly_plans')
    associated_monthly_goal_text = models.TextField(blank=True, default='')
    weekly_mission = models.TextField(blank=True, default='')
    week_number = models.IntegerField()
    year = models.IntegerField()
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Plan Semanal'
        verbose_name_plural = 'Planes Semanales'
        unique_together = ['user', 'year', 'week_number']
        ordering = ['-year', '-week_number']

    def __str__(self):
        return f'Semana {self.week_number}/{self.year}'


class Action(models.Model):
    class OriginModule(models.TextChoices):
        KANBAN_BACKLOG = 'KANBAN_BACKLOG', 'Kanban Backlog'
        MANUAL = 'MANUAL', 'Manual'
        INTEGRATIONS_WHATSAPP = 'INTEGRATIONS_WHATSAPP', 'Integrations WhatsApp'

    class ActionStatus(models.TextChoices):
        PENDIENTE = 'PENDIENTE', 'Pendiente'
        COMPLETADA = 'COMPLETADA', 'Completada'
        DELEGADA = 'DELEGADA', 'Delegada'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    weekly_plan = models.ForeignKey(WeeklyPlan, on_delete=models.CASCADE, related_name='actions')
    assigned_calendar_date = models.DateField()
    fecha_planificada_original = models.DateField(
        null=True, blank=True,
        help_text='Primer día planificado; se conserva al reprogramar (Doc 27 §5).',
    )
    title = models.CharField(max_length=500)
    origin_module = models.CharField(max_length=50, choices=OriginModule.choices, default=OriginModule.MANUAL)
    status = models.CharField(max_length=20, choices=ActionStatus.choices, default=ActionStatus.PENDIENTE)
    subactions = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Acción'
        verbose_name_plural = 'Acciones'
        ordering = ['assigned_calendar_date', 'created_at']

    def __str__(self):
        return f'{self.title[:50]} - {self.assigned_calendar_date}'


class ActionDelegation(models.Model):
    """Doc 32: proceso de delegación de una acción (responsable + seguimiento).

    No administra personas: administra el ciclo traslado → responsable →
    derivadas → cumplimiento/recuperación/reasignación.
    """

    class Origen(models.TextChoices):
        KANBAN_BACKLOG = 'KANBAN_BACKLOG', 'Kanban Backlog'
        PLANIFICADOR_SEMANAL = 'PLANIFICADOR_SEMANAL', 'Planificación Semanal'
        AGENDA_DIARIA = 'AGENDA_DIARIA', 'Agenda Diaria'
        MANUAL = 'MANUAL', 'Manual'

    class Estado(models.TextChoices):
        PENDIENTE_DELEGAR = 'PENDIENTE_DELEGAR', 'Pendiente de delegar'
        DELEGADA = 'DELEGADA', 'Delegada'
        EN_SEGUIMIENTO = 'EN_SEGUIMIENTO', 'En seguimiento'
        COMPLETADA = 'COMPLETADA', 'Completada'
        RECUPERADA = 'RECUPERADA', 'Recuperada'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='action_delegations')
    titulo = models.CharField(max_length=500)
    origen = models.CharField(max_length=25, choices=Origen.choices, default=Origen.MANUAL)
    source_ref = models.JSONField(default=dict, blank=True,
        help_text='Origen trazable: {kind: accion_kanban|weekly_action|kanbantask, id}')
    responsable = models.CharField(max_length=255, blank=True, default='')
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.PENDIENTE_DELEGAR)
    historial = models.JSONField(default=list, blank=True,
        help_text='Eventos con fecha/hora: traslados, responsables, derivadas, etc.')
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Delegación de acción'
        verbose_name_plural = 'Delegaciones de acciones'
        ordering = ['-creado']

    def __str__(self):
        return f'{self.titulo[:50]} → {self.responsable or "sin responsable"} [{self.estado}]'

    def push_historial(self, evento, detalle=None):
        from django.utils import timezone
        entry = {'evento': evento, 'at': timezone.now().isoformat()}
        if detalle:
            entry['detalle'] = detalle
        hist = list(self.historial or [])
        hist.append(entry)
        self.historial = hist


class AgentConversation(models.Model):
    class RolChoices(models.TextChoices):
        USER = 'USER', 'Usuario'
        ASSISTANT = 'ASSISTANT', 'Asistente'
        SYSTEM = 'SYSTEM', 'System'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='agent_conversations')
    session_id = models.UUIDField(default=uuid.uuid4, editable=False)
    rol = models.CharField(max_length=20, choices=RolChoices.choices)
    mensaje = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Conversación del Agente'
        verbose_name_plural = 'Conversaciones del Agente'


class AgentSchedule(models.Model):
    class TipoChoices(models.TextChoices):
        CHECKIN_MANANA = 'CHECKIN_MANANA', 'Check-in Mañana'
        CHECKIN_TARDE = 'CHECKIN_TARDE', 'Check-in Tarde'
        RECORDATORIO_TAREA = 'RECORDATORIO_TAREA', 'Recordatorio de Tarea'
        ALERTA_BAJO_PROGRESO = 'ALERTA_BAJO_PROGRESO', 'Alerta Bajo Progreso'
        FELICITACION_META = 'FELICITACION_META', 'Felicitación Meta'
        TOQUE_QUEDADA = 'TOQUE_QUEDADA', 'Toque de Quedada'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='agent_schedules')
    tipo = models.CharField(max_length=30, choices=TipoChoices.choices)
    titulo = models.CharField(max_length=255)
    mensaje_plantilla = models.TextField(blank=True, default='')
    regla_programacion = models.JSONField(default=dict, blank=True)
    activo = models.BooleanField(default=True)
    ultima_ejecucion = models.DateTimeField(null=True, blank=True)
    proxima_ejecucion = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-proxima_ejecucion']
        verbose_name = 'Programación del Agente'
        verbose_name_plural = 'Programaciones del Agente'


class Avatar(models.Model):
    class Gender(models.TextChoices):
        MALE = 'male', 'Masculino'
        FEMALE = 'female', 'Femenino'

    name = models.CharField(max_length=50)
    gender = models.CharField(max_length=10, choices=Gender.choices)
    image = models.CharField(max_length=200, blank=True, default='', help_text='Ruta de imagen del avatar')
    image_file = models.ImageField(
        upload_to=avatar_imagen_path, blank=True, null=True,
        help_text='Imagen subida desde el panel. Se usa si no hay ruta en "image".')
    voice_id = models.CharField(max_length=100, blank=True, default='', help_text='Referencia al motor de voz/TTS')
    intro_message_text = models.TextField(blank=True, default='')
    intro_message_audio = models.CharField(max_length=200, blank=True, default='', help_text='Ruta del archivo de audio')
    intro_message_audio_file = models.FileField(
        upload_to=avatar_audio_path, blank=True, null=True,
        help_text='Audio de presentación subido desde el panel.')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Avatar'
        verbose_name_plural = 'Avatares'
        ordering = ['name']

    def __str__(self):
        return self.name

    @property
    def image_resuelta(self):
        """URL de la imagen: la ruta en texto si existe, si no el archivo subido."""
        if self.image:
            return self.image
        if self.image_file:
            return self.image_file.url
        return ''

    @property
    def audio_resuelto(self):
        """URL del audio de presentación: la ruta en texto o el archivo subido."""
        if self.intro_message_audio:
            return self.intro_message_audio
        if self.intro_message_audio_file:
            return self.intro_message_audio_file.url
        return ''


class OnboardingProfile(models.Model):
    class Intensity(models.TextChoices):
        SUAVE = 'suave', 'Suave'
        EQUILIBRADA = 'equilibrada', 'Equilibrada'
        EXIGENTE = 'exigente', 'Exigente'

    class Schedule(models.TextChoices):
        TODO_EL_DIA = 'todo_el_dia', 'Todo el día'
        HORARIO_LABORAL = 'horario_laboral', 'Solo horario laboral'
        MANANA_TARDE = 'manana_tarde', 'Mañana y tarde'
        PERSONALIZADO = 'personalizado', 'Personalizado'

    class Tone(models.TextChoices):
        CERCANO_MOTIVADOR = 'cercano_motivador', 'Cercano y motivador'
        CLARO_ESTRATEGICO = 'claro_estrategico', 'Claro y estratégico'
        FIRME_EXIGENTE = 'firme_exigente', 'Firme y exigente'
        ADAPTATIVO = 'adaptativo', 'Adaptativo'

    class Status(models.TextChoices):
        ONBOARDING_INICIADO = 'onboarding_iniciado', 'Onboarding iniciado'
        CUENTA_CREADA = 'cuenta_creada', 'Cuenta creada'
        AVATAR_SELECCIONADO = 'avatar_seleccionado', 'Avatar seleccionado'
        CONFIG_RECOMENDADA_ACEPTADA = 'configuracion_recomendada_aceptada', 'Configuración recomendada aceptada'
        PERSONALIZACION_INICIADA = 'personalizacion_iniciada', 'Personalización iniciada'
        PERSONALIZACION_COMPLETADA = 'personalizacion_completada', 'Personalización completada'
        CONFIGURACION_CONFIRMADA = 'configuracion_confirmada', 'Configuración confirmada'
        ONBOARDING_FINALIZADO = 'onboarding_finalizado', 'Onboarding finalizado'
        VISITA_GUIADA_PENDIENTE = 'visita_guiada_pendiente', 'Visita guiada pendiente'
        VISITA_GUIADA_INICIADA = 'visita_guiada_iniciada', 'Visita guiada iniciada'
        VISITA_GUIADA_COMPLETADA = 'visita_guiada_completada', 'Visita guiada completada'

    class GuidedTour(models.TextChoices):
        PENDING = 'pending', 'Pendiente'
        STARTED = 'started', 'Iniciada'
        COMPLETED = 'completed', 'Completada'

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='onboarding_profile')
    avatar = models.ForeignKey(Avatar, null=True, blank=True, on_delete=models.SET_NULL)

    intensity = models.CharField(max_length=20, choices=Intensity.choices, default=Intensity.EQUILIBRADA)
    activations_app = models.BooleanField(default=True)
    activations_push = models.BooleanField(default=True)
    activations_whatsapp = models.BooleanField(default=True)
    activations_calls = models.BooleanField(default=False)

    schedule_type = models.CharField(max_length=20, choices=Schedule.choices, default=Schedule.MANANA_TARDE)
    custom_schedule_start = models.TimeField(null=True, blank=True)
    custom_schedule_end = models.TimeField(null=True, blank=True)

    tone = models.CharField(max_length=20, choices=Tone.choices, default=Tone.ADAPTATIVO)

    used_recommended_config = models.BooleanField(default=False)
    status = models.CharField(max_length=40, choices=Status.choices, default=Status.ONBOARDING_INICIADO)

    confirmed_at = models.DateTimeField(null=True, blank=True)
    onboarding_completed_at = models.DateTimeField(null=True, blank=True)
    guided_tour_status = models.CharField(
        max_length=20,
        choices=GuidedTour.choices,
        default=GuidedTour.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Perfil de Onboarding'
        verbose_name_plural = 'Perfiles de Onboarding'

    def __str__(self):
        return f'Onboarding {self.user.username} - {self.get_status_display()}'


class AgentConfig(models.Model):
    class TonoChoices(models.TextChoices):
        FORMAL = 'FORMAL', 'Formal'
        CASUAL = 'CASUAL', 'Casual'
        MOTIVACIONAL = 'MOTIVACIONAL', 'Motivacional'
        DIRECTO = 'DIRECTO', 'Directo'

    class FrecuenciaChoices(models.TextChoices):
        CADA_HORA = 'CADA_HORA', 'Cada Hora'
        CADA_2H = 'CADA_2H', 'Cada 2 Horas'
        MEDIO_DIA = 'MEDIO_DIA', 'Medio Día'
        FIN_DIA = 'FIN_DIA', 'Fin del Día'

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='agent_config')
    activo = models.BooleanField(default=False)
    tono = models.CharField(max_length=20, choices=TonoChoices.choices, default=TonoChoices.MOTIVACIONAL)
    frecuencia_checkin = models.CharField(max_length=20, choices=FrecuenciaChoices.choices, default=FrecuenciaChoices.MEDIO_DIA)
    notificar_whatsapp = models.BooleanField(default=False)
    whatsapp_phone = models.CharField(max_length=20, blank=True, default='')
    notificar_in_app = models.BooleanField(default=True)
    horario_inicio = models.TimeField(default=time(7, 0))
    horario_fin = models.TimeField(default=time(22, 0))
    temas_permitidos = models.JSONField(default=list, blank=True)
    ultimo_checkin = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Configuración del Agente'
        verbose_name_plural = 'Configuraciones del Agente'


class InicioState(models.Model):
    class Status(models.TextChoices):
        ONBOARDING_FINALIZADO = 'onboarding_finalizado', 'Onboarding finalizado'
        PRIMERA_ENTRADA_PENDIENTE = 'primera_entrada_pendiente', 'Primera entrada a INICIO pendiente'
        VIDEO_INICIAL_MOSTRADO = 'video_inicial_mostrado', 'Video inicial de INICIO mostrado'
        VIDEO_INICIAL_COMPLETADO = 'video_inicial_completado', 'Video inicial de INICIO completado'
        VIDEO_INICIAL_ABANDONADO = 'video_inicial_abandonado', 'Video inicial de INICIO abandonado'
        PANTALLA_INICIO_MOSTRADA = 'pantalla_inicio_mostrada', 'Pantalla INICIO mostrada'
        DASHBOARD_ABIERTO = 'dashboard_abierto_desde_inicio', 'Dashboard completo abierto desde INICIO'
        TUTORIAL_ABIERTO = 'tutorial_abierto', 'Tutorial abierto desde INICIO'
        VIDEO_VISTO_DESDE_TUTORIAL = 'video_visto_desde_tutorial', 'Video inicial visto desde Tutorial'
        APRENDER_SECCIONES_ABIERTO = 'aprender_secciones_abierto', 'Aprender por secciones abierto'
        CATEGORIA_APRENDIZAJE_SELECCIONADA = 'categoria_aprendizaje_seleccionada', 'Categoría de aprendizaje seleccionada'
        VISITA_GUIADA_INICIADA = 'visita_guiada_iniciada', 'Visita guiada iniciada'
        VISITA_GUIADA_COMPLETADA = 'visita_guiada_completada', 'Visita guiada completada'
        VISITA_GUIADA_PENDIENTE = 'visita_guiada_pendiente', 'Visita guiada pendiente'
        CONFIG_ABIERTA = 'configuracion_abierta_desde_inicio', 'Configuración abierta desde INICIO'
        VIDEO_CONFIG_MOSTRADO = 'video_configuracion_mostrado', 'Video de configuración mostrado'
        CONFIG_POR_CATEGORIAS_ABIERTA = 'configuracion_por_categorias_abierta', 'Configuración por categorías abierta'
        CAMBIOS_CONFIG_REALIZADOS = 'cambios_configuracion_realizados', 'Cambios de configuración realizados'
        USUARIO_VOLVIO_A_INICIO = 'usuario_volvio_a_inicio', 'Usuario volvió a INICIO'

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='inicio_state')
    status = models.CharField(max_length=50, choices=Status.choices, default=Status.ONBOARDING_FINALIZADO)
    first_entry_at = models.DateTimeField(null=True, blank=True)
    has_seen_intro_video = models.BooleanField(default=False)
    intro_video_completed = models.BooleanField(default=False)
    guided_tour_status = models.CharField(
        max_length=20,
        choices=[('pending', 'Pendiente'), ('started', 'Iniciada'), ('completed', 'Completada')],
        default='pending',
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Estado de INICIO'
        verbose_name_plural = 'Estados de INICIO'

    def __str__(self):
        return f'INICIO {self.user.username} - {self.get_status_display()}'


class InicioEventLog(models.Model):
    class EventType(models.TextChoices):
        INTRO_VIDEO_SHOWN = 'intro_video_shown', 'Video inicial mostrado'
        INTRO_VIDEO_COMPLETED = 'intro_video_completed', 'Video inicial completado'
        INTRO_VIDEO_ABANDONED = 'intro_video_abandoned', 'Video inicial abandonado'
        DASHBOARD_OPENED = 'dashboard_opened', 'Dashboard completo abierto'
        TUTORIAL_OPENED = 'tutorial_opened', 'Tutorial abierto'
        INTRO_VIDEO_REPLAYED = 'intro_video_replayed', 'Video inicial visto desde tutorial'
        LEARN_BY_SECTIONS_OPENED = 'learn_by_sections_opened', 'Aprender por secciones abierto'
        LEARN_CATEGORY_SELECTED = 'learn_category_selected', 'Categoría de aprendizaje seleccionada'
        GUIDED_TOUR_STARTED = 'guided_tour_started', 'Visita guiada iniciada'
        GUIDED_TOUR_COMPLETED = 'guided_tour_completed', 'Visita guiada completada'
        GUIDED_TOUR_ABANDONED = 'guided_tour_abandoned', 'Visita guiada abandonada'
        CONFIG_OPENED = 'config_opened', 'Configuración abierta desde INICIO'
        CONFIG_VIDEO_SHOWN = 'config_video_shown', 'Video de configuración mostrado'
        CONFIG_CATEGORIES_OPENED = 'config_categories_opened', 'Configuración por categorías abierta'
        CONFIG_CHANGED = 'config_changed', 'Cambios de configuración realizados'
        RETURNED_TO_INICIO = 'returned_to_inicio', 'Usuario volvió a INICIO'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='inicio_events')
    event_type = models.CharField(max_length=40, choices=EventType.choices)
    origin = models.CharField(max_length=60, blank=True, default='')
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Evento de INICIO'
        verbose_name_plural = 'Eventos de INICIO'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.get_event_type_display()} - {self.user.username}'


class LearningCategory(models.Model):
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=100)
    order = models.PositiveSmallIntegerField()

    class Meta:
        verbose_name = 'Categoría de Aprendizaje'
        verbose_name_plural = 'Categorías de Aprendizaje'
        ordering = ['order']

    def __str__(self):
        return f'{self.order}. {self.name}'


class LearningModuleRef(models.Model):
    category = models.ForeignKey(LearningCategory, on_delete=models.CASCADE, related_name='modules')
    name = models.CharField(max_length=150)
    order = models.PositiveSmallIntegerField()

    class Meta:
        verbose_name = 'Módulo de Referencia'
        verbose_name_plural = 'Módulos de Referencia'
        ordering = ['category__order', 'order']

    def __str__(self):
        return f'{self.category.name} → {self.name}'


class GuidedTourBlock(models.Model):
    slug = models.SlugField(unique=True)
    title = models.CharField(max_length=100)
    avatar_message = models.TextField()
    order = models.PositiveSmallIntegerField()

    class Meta:
        verbose_name = 'Bloque de Visita Guiada'
        verbose_name_plural = 'Bloques de Visita Guiada'
        ordering = ['order']

    def __str__(self):
        return f'{self.order}. {self.title}'


class AccompanimentPreferences(models.Model):
    class SupportType(models.TextChoices):
        ORGANIZACION = 'organizacion', 'Apoyo para organizarme mejor'
        DISCIPLINA = 'disciplina', 'Apoyo para mantener disciplina y constancia'
        DECISIONES = 'decisiones', 'Apoyo para tomar mejores decisiones'

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='accompaniment_preferences')
    support_types = models.JSONField(default=list, blank=True)

    class Meta:
        verbose_name = 'Preferencias de Acompañamiento'
        verbose_name_plural = 'Preferencias de Acompañamiento'

    def __str__(self):
        return f'Acompañamiento {self.user.username}'


class NotificationPreference(models.Model):
    class Channel(models.TextChoices):
        APP = 'app', 'Notificaciones dentro de la app'
        PUSH = 'push', 'Notificaciones push'
        WHATSAPP = 'whatsapp', 'Mensajes tipo WhatsApp'
        CALLS = 'calls', 'Llamadas simuladas'

    class State(models.TextChoices):
        ACTIVE = 'active', 'Activa'
        INACTIVE = 'inactive', 'Desactivada'
        CRITICAL_ONLY = 'critical_only', 'Solo crítica'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notification_preferences')
    channel = models.CharField(max_length=20, choices=Channel.choices)
    state = models.CharField(max_length=20, choices=State.choices, default=State.ACTIVE)

    class Meta:
        verbose_name = 'Preferencia de Notificación'
        verbose_name_plural = 'Preferencias de Notificación'
        unique_together = ('user', 'channel')

    def __str__(self):
        return f'{self.user.username} - {self.get_channel_display()}: {self.get_state_display()}'


class ScheduleException(models.Model):
    class ExceptionType(models.TextChoices):
        NO_DAYS = 'no_days', 'No intervenir en ciertos días'
        NO_HOURS = 'no_hours', 'No intervenir en ciertas horas'
        NO_NIGHT = 'no_night', 'No intervenir en descanso/noche/madrugada'
        CRITICAL_ONLY_OUTSIDE = 'critical_only_outside', 'Permitir solo acciones críticas fuera de horario'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='schedule_exceptions')
    exception_type = models.CharField(max_length=30, choices=ExceptionType.choices)
    value = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = 'Excepción de Horario'
        verbose_name_plural = 'Excepciones de Horario'

    def __str__(self):
        return f'{self.user.username} - {self.get_exception_type_display()}'


class PushSubscription(models.Model):
    """Suscripción Web Push de un dispositivo (VAPID)."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='push_subscriptions')
    endpoint = models.URLField(max_length=500, unique=True)
    p256dh = models.CharField(max_length=255)
    auth = models.CharField(max_length=255)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Suscripción Push'
        verbose_name_plural = 'Suscripciones Push'

    def __str__(self):
        return f'{self.user.username} - {self.endpoint[:60]}'


class AccountChangeLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='account_changes')
    change_type = models.CharField(max_length=40)
    origin = models.CharField(max_length=40, default='configuracion/cuenta')
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Registro de Cambio de Cuenta'
        verbose_name_plural = 'Registros de Cambios de Cuenta'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.username} - {self.change_type}'


class InicioPrivacyPreferences(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='privacy_preferences')
    data_collection = models.BooleanField(default=True, help_text='Permitir recopilación de datos de uso')
    analytics = models.BooleanField(default=True, help_text='Permitir análisis de comportamiento')
    personalized_recommendations = models.BooleanField(default=True, help_text='Permitir recomendaciones personalizadas por IA')
    third_party_sharing = models.BooleanField(default=False, help_text='Compartir datos con terceros')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Preferencia de Privacidad'
        verbose_name_plural = 'Preferencias de Privacidad'

    def __str__(self):
        return f'Privacidad {self.user.username}'


class ProgramMonth(models.Model):
    month_number = models.PositiveSmallIntegerField(unique=True)
    theme_name = models.CharField(max_length=150)
    training_theme = models.CharField(max_length=150)
    formative_objective = models.TextField()

    class Meta:
        ordering = ["month_number"]
        verbose_name = 'Mes del Programa'
        verbose_name_plural = 'Meses del Programa'

    def __str__(self):
        return f'Mes {self.month_number}: {self.theme_name}'


class MonthlyTraining(models.Model):
    month = models.OneToOneField(ProgramMonth, on_delete=models.CASCADE, related_name="training")
    title = models.CharField(max_length=200)
    content = models.TextField(blank=True)
    media_url = models.URLField(blank=True, null=True)
    duracion_minutos = models.PositiveIntegerField(
        default=5, help_text='Duración estimada de la microcapacitación')
    video_url = models.URLField(
        blank=True, default='', help_text='Video de la microcapacitación (opcional)')
    # El administrador puede pegar una URL externa o subir el archivo. La URL
    # tiene prioridad: el archivo es el respaldo cuando no hay URL.
    video_file = models.FileField(
        upload_to=training_video_path, blank=True, null=True,
        help_text='Video subido desde el panel. Se usa si no hay video_url.')
    media_file = models.ImageField(
        upload_to=training_media_path, blank=True, null=True,
        help_text='Imagen de portada subida desde el panel. Se usa si no hay media_url.')
    objetivos = models.JSONField(
        default=list, blank=True,
        help_text='Lo que aprenderás: [{"titulo": "...", "descripcion": "..."}]')

    class Meta:
        verbose_name = 'Capacitación Mensual'
        verbose_name_plural = 'Capacitaciones Mensuales'

    def __str__(self):
        return f'{self.month.theme_name} — {self.title}'

    @property
    def video_resuelto(self):
        """URL del video a reproducir: la externa si existe, si no el archivo."""
        if self.video_url:
            return self.video_url
        if self.video_file:
            return self.video_file.url
        return ''

    @property
    def media_resuelto(self):
        """URL de la imagen de portada: la externa si existe, si no el archivo."""
        if self.media_url:
            return self.media_url
        if self.media_file:
            return self.media_file.url
        return ''


class UserTrainingProgress(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='training_progress')
    training = models.ForeignKey(MonthlyTraining, on_delete=models.CASCADE, related_name='progress')
    completado = models.BooleanField(default=False)
    completado_en = models.DateTimeField(null=True, blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'training']
        verbose_name = 'Progreso de Capacitación'
        verbose_name_plural = 'Progresos de Capacitaciones'

    def __str__(self):
        return f'{self.user.username} — {self.training.title} ({"✓" if self.completado else "…"})'


class ProgramDay(models.Model):
    INTENTION_CHOICES = [
        ("reflexion", "Reflexión"), ("accion", "Acción"), ("disciplina", "Disciplina"),
        ("calma", "Calma"), ("foco", "Foco"), ("decision", "Decisión"),
        ("energia", "Energía"), ("cierre", "Cierre"),
    ]
    month = models.ForeignKey(ProgramMonth, on_delete=models.CASCADE, related_name="days")
    day_number = models.PositiveSmallIntegerField()
    phrase = models.CharField(max_length=280)
    intention = models.CharField(max_length=20, choices=INTENTION_CHOICES)
    technical_note = models.TextField(blank=True)
    # Spec BOTÓN COACHING v1.0: la pregunta diaria sale del mismo registro de
    # la Tabla Maestra que genera la Frase Motivacional del día.
    coaching_question = models.TextField(
        blank=True, default='',
        help_text='Pregunta de coaching del día. Vacío = pregunta por defecto.')
    es_integracion = models.BooleanField(
        default=False,
        help_text='Pregunta especial de integración (contrasta prioridades con acciones reales).')
    origen_integracion = models.CharField(
        max_length=30, blank=True, default='',
        help_text='Módulo origen de la integración (p. ej. RUEDA_DE_VIDA).')

    class Meta:
        unique_together = ("month", "day_number")
        ordering = ["month__month_number", "day_number"]
        verbose_name = 'Día del Programa'
        verbose_name_plural = 'Días del Programa'

    def __str__(self):
        return f'Mes {self.month.month_number} · Día {self.day_number}: {self.phrase[:60]}'


class UserProgramProgress(models.Model):
    user = models.OneToOneField('User', on_delete=models.CASCADE, related_name="program_progress")
    cycle_start_date = models.DateField()
    is_synced_to_collective = models.BooleanField(default=True)
    last_collective_reset_year = models.PositiveSmallIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Progreso del Programa'
        verbose_name_plural = 'Progresos del Programa'

    def __str__(self):
        return f'{self.user.username} — ciclo iniciado {self.cycle_start_date}'


class DailyPhraseViewLog(models.Model):
    user = models.ForeignKey('User', on_delete=models.CASCADE, related_name="phrase_views")
    program_day = models.ForeignKey(ProgramDay, on_delete=models.CASCADE)
    shown_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "shown_date")
        verbose_name = 'Registro de Frase Vista'
        verbose_name_plural = 'Registros de Frases Vistas'

    def __str__(self):
        return f'{self.user.username} — {self.shown_date} — {self.program_day}'


class CoachingEntry(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='coaching_entries')
    reflection = models.TextField(blank=True, default='')
    decision = models.TextField(blank=True, default='')
    decision_added_to_agenda = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Entrada de Coaching'
        verbose_name_plural = 'Entradas de Coaching'

    def __str__(self):
        return f'Coaching {self.created_at.strftime("%Y-%m-%d")} — {self.user.username}'


class TribuTemaSemana(models.Model):
    titulo = models.CharField(max_length=200, help_text='Tema de la semana (p. ej. Gestión del Tiempo)')
    descripcion = models.TextField(blank=True, default='')
    reflexion = models.TextField(blank=True, default='', help_text='Reflexión de la semana')
    pregunta = models.TextField(blank=True, default='', help_text='Pregunta de la semana')
    imagen_url = models.URLField(blank=True, default='', help_text='Foto del héroe (opcional)')
    imagen_file = models.ImageField(
        upload_to=tribu_imagen_path, blank=True, null=True,
        help_text='Foto subida desde el panel. Se usa si no hay imagen_url.')
    activo = models.BooleanField(default=True, help_text='Solo un tema activo a la vez')
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-creado']
        verbose_name = 'Tema Semanal de Tribu'
        verbose_name_plural = 'Temas Semanales de Tribu'

    def __str__(self):
        return f'{self.titulo} ({"activo" if self.activo else "inactivo"})'

    def save(self, *args, **kwargs):
        """Mantiene el invariante "un solo tema activo a la vez".

        Va en el modelo y no en la API para que también se cumpla cuando se
        edita desde el admin de Django o desde una tarea de consola.
        """
        super().save(*args, **kwargs)
        if self.activo:
            TribuTemaSemana.objects.exclude(pk=self.pk).filter(activo=True).update(activo=False)

    @property
    def imagen_resuelta(self):
        """URL de la imagen: la externa si existe, si no el archivo subido."""
        if self.imagen_url:
            return self.imagen_url
        if self.imagen_file:
            return self.imagen_file.url
        return ''


class TribuCompromiso(models.Model):
    class TribuChoices(models.TextChoices):
        FAMILIA = 'FAMILIA', 'Familia'
        PAREJA = 'PAREJA', 'Pareja'
        HIJOS = 'HIJOS', 'Hijos'
        AMIGOS = 'AMIGOS', 'Amigos'
        TRABAJO = 'TRABAJO', 'Trabajo'
        COMUNIDAD = 'COMUNIDAD', 'Comunidad'
        CLUB_DEPORTE = 'CLUB_DEPORTE', 'Club / Deporte'
        JUNTA_EDUCATIVA = 'JUNTA_EDUCATIVA', 'Junta educativa'
        VOLUNTARIADO = 'VOLUNTARIADO', 'Voluntariado'
        OTRO = 'OTRO', 'Otro'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tribu_compromisos')
    year = models.IntegerField()
    week_number = models.IntegerField()
    texto = models.TextField(blank=True, default='', help_text='Idea que compartirá esta semana')
    tribu = models.CharField(max_length=20, choices=TribuChoices.choices, blank=True, default='')
    tribu_detalle = models.CharField(max_length=200, blank=True, default='')
    enviado_kanban = models.BooleanField(default=False)
    accion = models.ForeignKey(
        'AccionKanban', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='tribu_origen')
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['user', 'year', 'week_number']
        ordering = ['-year', '-week_number']
        verbose_name = 'Compromiso de Tribu'
        verbose_name_plural = 'Compromisos de Tribu'

    def __str__(self):
        return f'Tribu {self.user.username} S{self.week_number}/{self.year}'


class Juego(models.Model):
    """Juego o reto enlazado desde la app. Lo gestiona el administrador.

    Solo es un catálogo: el usuario final abre el enlace, no se guarda progreso.
    """

    class Tipo(models.TextChoices):
        JUEGO = 'juego', 'Juego'
        RETO = 'reto', 'Reto'
        VIDEO = 'video', 'Video'
        INTERACTIVO = 'interactivo', 'Interactivo'

    titulo = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True, default='')
    tipo = models.CharField(max_length=20, choices=Tipo.choices, default=Tipo.JUEGO)
    url = models.URLField(help_text='Enlace externo al juego o reto')
    imagen_url = models.URLField(blank=True, default='', help_text='Imagen de portada (URL externa)')
    imagen_file = models.ImageField(
        upload_to=juego_imagen_path, blank=True, null=True,
        help_text='Portada subida desde el panel. Se usa si no hay imagen_url.')
    categoria = models.ForeignKey(
        'LearningCategory', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='juegos',
        help_text='Opcional. Agrupa el juego dentro de una categoría de aprendizaje.')
    activo = models.BooleanField(default=True)
    orden = models.PositiveSmallIntegerField(default=0)
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['orden', 'titulo']
        verbose_name = 'Juego'
        verbose_name_plural = 'Juegos'

    def __str__(self):
        return self.titulo

    @property
    def imagen_resuelta(self):
        """URL de la portada: la externa si existe, si no el archivo subido."""
        if self.imagen_url:
            return self.imagen_url
        if self.imagen_file:
            return self.imagen_file.url
        return ''


class Membresia(models.Model):
    """Membresía personalizada de un usuario, definida por el administrador.

    No hay planes fijos: el admin fija fecha de inicio y fin por usuario.
    Se guarda historial (un usuario puede tener varias en distintos períodos).
    """

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='membresias')
    fecha_inicio = models.DateField(help_text='Desde cuándo tiene acceso')
    fecha_fin = models.DateField(help_text='Hasta cuándo tiene acceso')
    nota = models.CharField(max_length=280, blank=True, default='')
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-fecha_inicio']
        verbose_name = 'Membresía'
        verbose_name_plural = 'Membresías'

    def __str__(self):
        return f'{self.user.username} · {self.fecha_inicio} → {self.fecha_fin}'

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.fecha_fin < self.fecha_inicio:
            raise ValidationError('La fecha de fin no puede ser anterior a la de inicio.')

    @property
    def estado(self):
        """vigente | proxima | vencida, según la fecha local del servidor."""
        from django.utils import timezone
        hoy = timezone.localdate()
        if hoy < self.fecha_inicio:
            return 'proxima'
        if hoy > self.fecha_fin:
            return 'vencida'
        return 'vigente'

    @property
    def dias_restantes(self):
        """Días hasta el fin (negativo si venció)."""
        from django.utils import timezone
        return (self.fecha_fin - timezone.localdate()).days


class AsignacionContenido(models.Model):
    """Contenido asignado a un usuario concreto.

    Lista de permitidos por módulo: si el usuario tiene filas de un tipo, solo
    ve esos objetos; si no tiene ninguna, ve todo (usuarios nuevos ven todo).
    Así el admin reparte tribu, capacitaciones, aprendizaje, juegos, etc.
    """

    class Tipo(models.TextChoices):
        TRIBU = 'tribu', 'Tribu'
        CAPACITACION = 'capacitacion', 'Capacitación'
        CATEGORIA = 'categoria', 'Categoría de aprendizaje'
        MODULO = 'modulo', 'Módulo de aprendizaje'
        BLOQUE = 'bloque', 'Bloque de visita guiada'
        JUEGO = 'juego', 'Juego'
        AVATAR = 'avatar', 'Avatar'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='asignaciones')
    tipo = models.CharField(max_length=20, choices=Tipo.choices)
    objeto_id = models.PositiveIntegerField(help_text='ID dentro de su tabla')
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'tipo', 'objeto_id']
        ordering = ['tipo', 'objeto_id']
        verbose_name = 'Asignación de contenido'
        verbose_name_plural = 'Asignaciones de contenido'

    def __str__(self):
        return f'{self.user.username} · {self.tipo} #{self.objeto_id}'

    @staticmethod
    def modelo_para(tipo):
        return {
            'tribu': TribuTemaSemana,
            'capacitacion': MonthlyTraining,
            'categoria': LearningCategory,
            'modulo': LearningModuleRef,
            'bloque': GuidedTourBlock,
            'juego': Juego,
            'avatar': Avatar,
        }[tipo]

    def clean(self):
        from django.core.exceptions import ValidationError
        modelo = self.modelo_para(self.tipo)
        if not modelo.objects.filter(pk=self.objeto_id).exists():
            raise ValidationError(f'No existe {self.tipo} con id {self.objeto_id}.')


# ══════════════ Módulo Gratitud (Doc 19) ══════════════

class FraseGratitud(models.Model):
    """Doc 19 §II.1 — frase del día del módulo Gratitud.

    El catálogo es global (no por usuario) y se recorre en orden de ``dia``:
    cada frase aparece una sola vez dentro del ciclo anual del usuario.
    ``obra`` y ``anio`` quedan vacíos cuando el dato no existe o no se conoce,
    tal como indica la especificación.
    """
    dia = models.PositiveIntegerField(
        unique=True,
        help_text='Posición dentro del ciclo anual (1–365).',
    )
    texto = models.TextField()
    autor = models.CharField(max_length=160, blank=True, default='')
    obra = models.CharField(max_length=220, blank=True, default='')
    anio = models.CharField(
        max_length=40, blank=True, default='',
        help_text='Año de publicación, cuando se conoce.',
    )
    activa = models.BooleanField(default=True)

    class Meta:
        ordering = ['dia']
        verbose_name = 'Frase de Gratitud'
        verbose_name_plural = 'Frases de Gratitud'

    def __str__(self):
        return f'{self.dia}. {self.texto[:60]}'


class EntradaGratitud(models.Model):
    """Doc 19 §II.3 — reflexión diaria del usuario.

    Una sola entrada por usuario y fecha. Guarda la frase que se le mostró ese
    día (para que no cambie si el catálogo se edita) y la respuesta libre, que
    se almacena automáticamente sin botón de guardar.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='gratitud_entradas')
    fecha = models.DateField(default=date.today)
    frase = models.ForeignKey(
        FraseGratitud, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='apariciones',
    )
    texto = models.TextField(blank=True, default='')
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'fecha')
        ordering = ['-fecha']
        verbose_name = 'Entrada de Gratitud'
        verbose_name_plural = 'Entradas de Gratitud'

    def __str__(self):
        return f'{self.user.username} · {self.fecha}'


class FocusSession(models.Model):
    """Doc 23 · Modo Focus — sesión de una herramienta de enfoque.

    El módulo permite una sola herramienta activa a la vez (reloj, pomodoro,
    temporizador o alarma; «descanso» es el bloque breve tras completar una
    sesión). Una sesión se crea al presionar «Iniciar» y vive como widget
    flotante en el dispositivo donde fue iniciada (sin sincronización entre
    dispositivos en el MVP); al terminar correctamente queda registrada
    automáticamente para el Sistema de Reportes y las estadísticas.

    Mientras `ended_at` esté vacío la sesión está activa y el motor
    proactivo (Doc 27 §2.6) pospone las comunicaciones de baja prioridad,
    dejando pasar solo las críticas.
    """
    HERRAMIENTAS = (
        ('reloj', 'Reloj'),
        ('pomodoro', 'Pomodoro'),
        ('temporizador', 'Temporizador'),
        ('alarma', 'Alarma'),
        ('descanso', 'Descanso'),
    )
    ESTADOS = (
        ('activa', 'Activa'),
        ('completada', 'Completada'),
        ('cancelada', 'Cancelada'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='focus_sessions')
    herramienta = models.CharField(max_length=20, choices=HERRAMIENTAS)
    estado = models.CharField(max_length=12, choices=ESTADOS, default='activa')
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    # Duración planificada en minutos (temporizador, pomodoro, alarma,
    # descanso). Null = sin límite (el reloj corre hasta que el usuario cierre).
    planned_minutes = models.PositiveIntegerField(null=True, blank=True)
    # Minutos de enfoque efectivo al cerrar la sesión (reportes/estadísticas).
    focused_minutes = models.PositiveIntegerField(null=True, blank=True)
    # Configuración elegida, p. ej. {'concentracion': 25, 'descanso': 5,
    # 'ciclos': 4} para pomodoro, {'duracion_min': 15} para temporizador,
    # {'hora': '15:30'} para alarma.
    config = models.JSONField(default=dict, blank=True)
    # Módulo desde el cual se inició la sesión; Focusia devuelve al usuario
    # allí al finalizar.
    origin = models.CharField(max_length=40, blank=True, default='dashboard')

    class Meta:
        ordering = ['-started_at']
        verbose_name = 'Sesión de Focus'
        verbose_name_plural = 'Sesiones de Focus'

    def __str__(self):
        return f'{self.get_herramienta_display()} · {self.user.username} · {self.estado}'
