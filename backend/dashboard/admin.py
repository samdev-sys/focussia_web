from django.contrib import admin
from .models import CategoriaRueda, RegistroRueda, MetaAnual, ObjetivoMensual, PropuestaIA, ConfiguracionUsuario, Activacion

@admin.register(CategoriaRueda)
class CategoriaRuedaAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'icono', 'orden', 'activo']
    list_editable = ['orden', 'activo']

@admin.register(RegistroRueda)
class RegistroRuedaAdmin(admin.ModelAdmin):
    list_display = ['user', 'categoria', 'puntaje', 'fecha_creacion']
    list_filter = ['categoria', 'puntaje']

@admin.register(MetaAnual)
class MetaAnualAdmin(admin.ModelAdmin):
    list_display = ['user', 'titulo', 'aprobada', 'fecha_inicio', 'fecha_fin', 'creado']
    list_filter = ['aprobada']
    search_fields = ['titulo', 'user__username']

@admin.register(ObjetivoMensual)
class ObjetivoMensualAdmin(admin.ModelAdmin):
    list_display = ['user', 'titulo', 'mes', 'meta_anual', 'completado']
    list_filter = ['mes', 'completado']
    search_fields = ['titulo', 'user__username']

@admin.register(PropuestaIA)
class PropuestaIAAdmin(admin.ModelAdmin):
    list_display = ['user', 'tipo_impacto', 'respondida', 'decision_usuario', 'leida', 'creada']
    list_filter = ['tipo_impacto', 'respondida', 'decision_usuario']

@admin.register(ConfiguracionUsuario)
class ConfiguracionUsuarioAdmin(admin.ModelAdmin):
    list_display = ['user', 'voz_genero', 'estilo_comunicacion', 'nivel_exigencia', 'frecuencia_intervenciones']
    list_filter = ['voz_genero', 'estilo_comunicacion', 'nivel_exigencia']

@admin.register(Activacion)
class ActivacionAdmin(admin.ModelAdmin):
    list_display = ['user', 'tipo', 'estado', 'titulo', 'ventana_programada', 'creada']
    list_filter = ['tipo', 'estado']
