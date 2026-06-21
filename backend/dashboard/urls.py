from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet, RuedaVidaViewSet, TimeBlockViewSet, KanbanTaskViewSet,
    RecordatorioViewSet, ObjetivoSemanaViewSet, KeepNotaViewSet, MisionHoyViewSet,
    CategoriaRuedaViewSet, RegistroRuedaViewSet, MatrixItemViewSet, FacturaViewSet,
    WorkspaceViewSet, InvitationViewSet, DelegationViewSet, NotificationViewSet,
    MetaUsuarioViewSet, GranMetaAnualViewSet,
    rueda_vida_completa, my_workspaces, accept_invitation, decline_invitation,
    pending_invitations, ai_mission, delegation_by_token,
    ai_smart_meta, ai_smart_meta_edit
)

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
router.register(r'workspaces', WorkspaceViewSet, basename='workspaces')
router.register(r'invitations', InvitationViewSet, basename='invitations')
router.register(r'delegations', DelegationViewSet, basename='delegations')
router.register(r'notifications', NotificationViewSet, basename='notifications')
router.register(r'metas', MetaUsuarioViewSet, basename='metas')
router.register(r'gran-meta-anual', GranMetaAnualViewSet, basename='gran-meta-anual')

urlpatterns = [
    path('rueda-vida-completa/', rueda_vida_completa, name='rueda-vida-completa'),
    path('my-workspaces/', my_workspaces, name='my-workspaces'),
    path('workspaces/accept_invitation/', accept_invitation, name='accept-invitation'),
    path('workspaces/decline_invitation/', decline_invitation, name='decline-invitation'),
    path('pending-invitations/', pending_invitations, name='pending-invitations'),
    path('ai/mission/', ai_mission, name='ai-mission'),
    path('ai/smart-meta/', ai_smart_meta, name='ai-smart-meta'),
    path('ai/smart-meta-editar/', ai_smart_meta_edit, name='ai-smart-meta-edit'),
    path('delegations/by-token/<str:token>/', delegation_by_token, name='delegation-by-token'),
    path('', include(router.urls)),
]
