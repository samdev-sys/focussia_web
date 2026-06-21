from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    avatar_url = models.CharField(max_length=500, blank=True, default='')
    bio = models.TextField(blank=True, default='')
    last_activity = models.DateTimeField(null=True, blank=True)
    locked_until = models.DateTimeField(null=True, blank=True)
    failed_login_attempts = models.IntegerField(default=0)
    onboarding_completed = models.BooleanField(default=False)
    onboarding_data = models.JSONField(default=dict, blank=True)


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
    ESTADO_CHOICES = [
        ('pending', 'Pending'),
        ('doing', 'Doing'),
        ('done', 'Done'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='time_blocks')
    hora = models.IntegerField()
    tarea = models.CharField(max_length=255, blank=True)
    estado = models.CharField(max_length=10, choices=ESTADO_CHOICES, default='pending')

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
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'categoria']
        ordering = ['categoria__orden']

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


class MetaUsuario(models.Model):
    TIPO_CHOICES = [
        ('anual', 'Anual'),
        ('mensual', 'Mensual'),
        ('semanal', 'Semanal'),
        ('diaria', 'Diaria'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='metas')
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    texto = models.CharField(max_length=500)
    completada = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['tipo', 'created_at']


class GranMetaAnual(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='metas_anuales')
    texto_meta = models.TextField()
    frase_resumen = models.CharField(max_length=300, blank=True, default='')
    desglose_smart = models.JSONField(default=dict, blank=True)
    respuestas = models.JSONField(default=dict, blank=True)
    is_vigente = models.BooleanField(default=False)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_aprobacion = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-fecha_creacion']
