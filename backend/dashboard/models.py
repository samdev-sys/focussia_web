from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    # Custom users can be extended later if needed
    pass

class RuedaVida(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='rueda_vida')
    salud = models.IntegerField(default=5)
    amistad = models.IntegerField(default=5)
    dinero = models.IntegerField(default=5)

class TimeBlock(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='time_blocks')
    hora = models.IntegerField()
    tarea = models.CharField(max_length=255, blank=True)
    estado = models.BooleanField(default=False)

    class Meta:
        ordering = ['hora']

class KanbanTask(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='kanban_tasks')
    titulo = models.CharField(max_length=255)
    descripcion = models.TextField(blank=True)
    columna = models.CharField(max_length=50, default='Backlog')

class Recordatorio(models.Model):
    CATEGORIAS = (
        ('Medicamento', 'Medicamento'),
        ('Cumpleaños', 'Cumpleaños'),
        ('HoraOro', 'Hora de Oro'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='recordatorios')
    titulo = models.CharField(max_length=255)
    categoria = models.CharField(max_length=50, choices=CATEGORIAS)
    fecha_hora = models.DateTimeField()
    activo = models.BooleanField(default=True)

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

    class Meta:
        ordering = ['created_at']

class Factura(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='facturas')
    nombre = models.CharField(max_length=255)
    monto = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    fecha_vencimiento = models.DateField()
    pagado = models.BooleanField(default=False)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['fecha_vencimiento']

