from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet, RuedaVidaViewSet, TimeBlockViewSet, KanbanTaskViewSet,
    KanbanActionViewSet,
    RecordatorioViewSet, ObjetivoSemanaViewSet, KeepNotaViewSet, MisionHoyViewSet,
    CategoriaRuedaViewSet, RegistroRuedaViewSet, MatrixItemViewSet, FacturaViewSet,
    WorkspaceViewSet, InvitationViewSet, DelegationViewSet, NotificationViewSet,
    MetaAnualViewSet, ObjetivoMensualViewSet, PropuestaIAViewSet,
    ConfiguracionViewSet, MatrizEisenhowerViewSet, ActivacionViewSet,
    rueda_vida_completa, my_workspaces, accept_invitation, decline_invitation,
    pending_invitations, ai_mission, delegation_by_token, ejecutar_motor_decision,
    analizar_contexto, registrar_interaccion, marcar_video_visto, registrar_ingreso_hub,
    generar_diagnostico_rueda, ver_diagnostico_rueda, generar_acciones_rueda,
    listar_acciones_rueda, enviar_accion_kanban, resumen_rueda_dashboard,
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='users')
router.register(r'rueda-vida', RuedaVidaViewSet, basename='rueda-vida')
router.register(r'time-blocks', TimeBlockViewSet, basename='time-blocks')
router.register(r'kanban-tasks', KanbanTaskViewSet, basename='kanban-tasks')
router.register(r'kanban-actions', KanbanActionViewSet, basename='kanban-actions')
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
router.register(r'metas-anuales', MetaAnualViewSet, basename='metas-anuales')
router.register(r'objetivos-mensuales', ObjetivoMensualViewSet, basename='objetivos-mensuales')
router.register(r'propuestas-ia', PropuestaIAViewSet, basename='propuestas-ia')
router.register(r'matriz-eisenhower', MatrizEisenhowerViewSet, basename='matriz-eisenhower')
router.register(r'configuracion', ConfiguracionViewSet, basename='configuracion')
router.register(r'activaciones', ActivacionViewSet, basename='activaciones')

urlpatterns = [
    path('rueda-vida-completa/', rueda_vida_completa, name='rueda-vida-completa'),
    path('my-workspaces/', my_workspaces, name='my-workspaces'),
    path('workspaces/accept_invitation/', accept_invitation, name='accept-invitation'),
    path('workspaces/decline_invitation/', decline_invitation, name='decline-invitation'),
    path('pending-invitations/', pending_invitations, name='pending-invitations'),
    path('ai/mission/', ai_mission, name='ai-mission'),
    path('ai/ejecutar-motor/', ejecutar_motor_decision, name='ejecutar-motor'),
    path('ai/analizar-contexto/', analizar_contexto, name='analizar-contexto'),
    path('telemetria/interaccion/', registrar_interaccion, name='registrar-interaccion'),
    path('usuario/marcar-video-visto/', marcar_video_visto, name='marcar-video-visto'),
    path('usuario/registrar-ingreso/', registrar_ingreso_hub, name='registrar-ingreso'),
    path('rueda/generar-diagnostico/', generar_diagnostico_rueda, name='generar-diagnostico'),
    path('rueda/diagnostico/', ver_diagnostico_rueda, name='ver-diagnostico'),
    path('rueda/generar-acciones/', generar_acciones_rueda, name='generar-acciones'),
    path('rueda/acciones/', listar_acciones_rueda, name='listar-acciones'),
    path('rueda/enviar-accion-kanban/', enviar_accion_kanban, name='enviar-accion-kanban'),
    path('rueda/resumen-dashboard/', resumen_rueda_dashboard, name='resumen-dashboard'),
    path('delegations/by-token/<str:token>/', delegation_by_token, name='delegation-by-token'),
    path('', include(router.urls)),
]
