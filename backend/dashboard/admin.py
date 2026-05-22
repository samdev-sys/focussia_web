from django.contrib import admin
from .models import CategoriaRueda, RegistroRueda

@admin.register(CategoriaRueda)
class CategoriaRuedaAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'icono', 'orden', 'activo']
    list_editable = ['orden', 'activo']

@admin.register(RegistroRueda)
class RegistroRuedaAdmin(admin.ModelAdmin):
    list_display = ['user', 'categoria', 'puntaje', 'fecha_creacion']
    list_filter = ['categoria', 'puntaje']
