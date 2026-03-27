from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (UserViewSet, RuedaVidaViewSet, TimeBlockViewSet, KanbanTaskViewSet, 
                    RecordatorioViewSet, ObjetivoSemanaViewSet, KeepNotaViewSet, MisionHoyViewSet,
                    CategoriaRuedaViewSet, RegistroRuedaViewSet, MatrixItemViewSet, FacturaViewSet, rueda_vida_completa)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='users')
router.register(r'rueda-vida', RuedaVidaViewSet, basename='rueda-vida')
router.register(r'time-blocks', TimeBlockViewSet, basename='time-blocks')
router.register(r'kanban-tasks', KanbanTaskViewSet, basename='kanban-tasks')
router.register(r'recordatorios', RecordatorioViewSet, basename='recordatorios')
router.register(r'objetivo-semana', ObjetivoSemanaViewSet, basename='objetivo-semana')
router.register(r'keep-nota', KeepNotaViewSet, basename='keep-nota')
router.register(r'mision-hoy', MisionHoyViewSet, basename='mision-hoy')
router.register(r'categorias-rueda', CategoriaRuedaViewSet, basename='categorias-rueda')
router.register(r'registros-rueda', RegistroRuedaViewSet, basename='registros-rueda')
router.register(r'matrix-items', MatrixItemViewSet, basename='matrix-items')
router.register(r'facturas', FacturaViewSet, basename='facturas')

urlpatterns = [
    path('rueda-vida-completa/', rueda_vida_completa, name='rueda-vida-completa'),
    path('', include(router.urls)),
]
