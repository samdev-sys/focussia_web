from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet, RuedaVidaViewSet, TimeBlockViewSet, KanbanTaskViewSet,
    KanbanActionViewSet, AccionKanbanViewSet, ObjetivoSemanalViewSet,
    RecordatorioViewSet, ObjetivoSemanaViewSet, KeepNotaViewSet, MisionHoyViewSet,
    SuplementoViewSet, HoraOroExperienciaViewSet, FocusSessionViewSet,
    CategoriaRuedaViewSet, RegistroRuedaViewSet, MatrixItemViewSet, FacturaViewSet,
    CuentaColumnaViewSet, CuentaRegistroViewSet,
    WorkspaceViewSet, InvitationViewSet, DelegationViewSet, NotificationViewSet,
    MetaAnualViewSet, GranMetaAnualViewSet, MonthlyPlanViewSet, MonthlyGoalViewSet,
    ObjetivoMensualViewSet, PropuestaIAViewSet,
    ConfiguracionViewSet, MatrizEisenhowerViewSet, ActivacionViewSet,
    WeeklyPlanViewSet, ActionViewSet, ActionDelegationViewSet, FocusiaReportViewSet, CoachingEntryViewSet,
    rueda_vida_completa, my_workspaces, accept_invitation, decline_invitation,
    pending_invitations, ai_mission, delegation_by_token, ejecutar_motor_decision,
    analizar_contexto, registrar_interaccion, marcar_video_visto, registrar_ingreso_hub,
    generar_diagnostico_rueda, ver_diagnostico_rueda, generar_acciones_rueda,
    listar_acciones_rueda, enviar_accion_kanban, resumen_rueda_dashboard,
    ver_detalle_foco, recomendar_acciones_foco, eliminar_accion_rueda,
    progreso_actividades, tribu_tema_actual, tribu_compromiso, tribu_enviar_kanban,
    agent_chat, agent_evaluate, tts, avatar_tts, avatar_voice_sample,
    aprobar_objetivo_mensual,
    AgentConversationViewSet, AgentScheduleViewSet, AgentConfigViewSet,
    onboarding_avatars, onboarding_select_avatar, onboarding_accept_recommended,
    onboarding_customize_intensity, onboarding_customize_activations,
    onboarding_customize_schedule, onboarding_customize_tone,
    onboarding_summary, onboarding_confirm, onboarding_complete,
    onboarding_guided_tour_start, onboarding_guided_tour_defer, onboarding_status, onboarding_reset,
    inicio_state, inicio_intro_video_shown, inicio_intro_video_completed,
    inicio_intro_video_abandoned, inicio_intro_video_replayed, inicio_dashboard_open,
    inicio_tutorial_open,
    inicio_config_open, inicio_config_video_shown, inicio_config_open_now,
    inicio_config_volver_inicio, inicio_guided_tour_blocks, inicio_guided_tour_start,
    inicio_guided_tour_complete, inicio_guided_tour_abandon,
    inicio_learn_categories, inicio_learn_sections_opened, inicio_learn_category_select,
    inicio_events,
    config_profile, config_avatar, config_accompaniment, config_notifications,
    config_schedule, config_tone, config_schedule_exception,
    config_schedule_exception_delete, config_privacy, config_privacy_permissions,
    config_privacy_export, config_privacy_delete_data,
    config_account, config_account_update, config_change_password,
    config_devices, config_devices_logout_all, config_plan,
    config_modify_plan_availability,
    motivational_today, motivational_current_training, motivational_progress,
    gratitud_hoy,
    cumpleanos_lista, cumpleanos_detalle, cumpleanos_accion,
    push_public_key, push_subscribe, push_unsubscribe,
    cursos_mes_actual, cursos_mes, cursos_completar, juegos_catalogo,
    motivational_master_table, motivational_master_months, motivational_master_days,
)
from .admin_api import (
    AdminProgramMonthViewSet, AdminTrainingViewSet, AdminProgramDayViewSet,
    AdminTribuTemaViewSet, AdminLearningCategoryViewSet, AdminLearningModuleViewSet,
    AdminGuidedTourBlockViewSet, AdminAvatarViewSet, AdminJuegoViewSet,
    AdminUsuarioViewSet, AdminMembresiaViewSet, AdminAsignacionViewSet,
    admin_session, admin_overview, admin_asistente_chat,
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='users')
router.register(r'rueda-vida', RuedaVidaViewSet, basename='rueda-vida')
router.register(r'time-blocks', TimeBlockViewSet, basename='time-blocks')
router.register(r'kanban-tasks', KanbanTaskViewSet, basename='kanban-tasks')
router.register(r'kanban-actions', KanbanActionViewSet, basename='kanban-actions')
router.register(r'acciones-kanban', AccionKanbanViewSet, basename='acciones-kanban')
router.register(r'objetivos-semanales', ObjetivoSemanalViewSet, basename='objetivos-semanales')
router.register(r'recordatorios', RecordatorioViewSet, basename='recordatorios')
router.register(r'suplementos', SuplementoViewSet, basename='suplementos')
router.register(r'hora-oro', HoraOroExperienciaViewSet, basename='hora-oro')
router.register(r'focus-sessions', FocusSessionViewSet, basename='focus-sessions')
router.register(r'objetivo-semana', ObjetivoSemanaViewSet, basename='objetivo-semana')
router.register(r'keep-nota', KeepNotaViewSet, basename='keep-nota')
router.register(r'mision-hoy', MisionHoyViewSet, basename='mision-hoy')
router.register(r'categorias-rueda', CategoriaRuedaViewSet, basename='categorias-rueda')
router.register(r'registros-rueda', RegistroRuedaViewSet, basename='registros-rueda')
router.register(r'matrix-items', MatrixItemViewSet, basename='matrix-items')
router.register(r'facturas', FacturaViewSet, basename='facturas')
router.register(r'cuentas-columnas', CuentaColumnaViewSet, basename='cuentas-columnas')
router.register(r'cuentas-registros', CuentaRegistroViewSet, basename='cuentas-registros')
router.register(r'workspaces', WorkspaceViewSet, basename='workspaces')
router.register(r'invitations', InvitationViewSet, basename='invitations')
router.register(r'delegations', DelegationViewSet, basename='delegations')
router.register(r'notifications', NotificationViewSet, basename='notifications')
router.register(r'metas-anuales', MetaAnualViewSet, basename='metas-anuales')
router.register(r'gran-meta-anual', GranMetaAnualViewSet, basename='gran-meta-anual')
router.register(r'monthly-plan', MonthlyPlanViewSet, basename='monthly-plan')
router.register(r'monthly-goal', MonthlyGoalViewSet, basename='monthly-goal')
router.register(r'objetivos-mensuales', ObjetivoMensualViewSet, basename='objetivos-mensuales')
router.register(r'propuestas-ia', PropuestaIAViewSet, basename='propuestas-ia')
router.register(r'matriz-eisenhower', MatrizEisenhowerViewSet, basename='matriz-eisenhower')
router.register(r'configuracion', ConfiguracionViewSet, basename='configuracion')
router.register(r'activaciones', ActivacionViewSet, basename='activaciones')
router.register(r'weekly-plans', WeeklyPlanViewSet, basename='weekly-plans')
router.register(r'actions', ActionViewSet, basename='actions')
router.register(r'delegation-processes', ActionDelegationViewSet, basename='delegation-processes')
router.register(r'agent-conversations', AgentConversationViewSet, basename='agent-conversations')
router.register(r'agent-schedules', AgentScheduleViewSet, basename='agent-schedules')
router.register(r'agent-config', AgentConfigViewSet, basename='agent-config')
router.register(r'focusia-reports', FocusiaReportViewSet, basename='focusia-reports')
router.register(r'coaching-entries', CoachingEntryViewSet, basename='coaching-entries')

# ── Panel de administración de contenido ──
# Router aparte para que las rutas del panel queden agrupadas bajo /api/admin/
# y no se mezclen con las de la app. Todas exigen `user.is_staff`.
admin_router = DefaultRouter()
admin_router.register(r'program-months', AdminProgramMonthViewSet, basename='admin-program-months')
admin_router.register(r'trainings', AdminTrainingViewSet, basename='admin-trainings')
admin_router.register(r'program-days', AdminProgramDayViewSet, basename='admin-program-days')
admin_router.register(r'tribu-themes', AdminTribuTemaViewSet, basename='admin-tribu-themes')
admin_router.register(r'learning-categories', AdminLearningCategoryViewSet, basename='admin-learning-categories')
admin_router.register(r'learning-modules', AdminLearningModuleViewSet, basename='admin-learning-modules')
admin_router.register(r'guided-tour-blocks', AdminGuidedTourBlockViewSet, basename='admin-guided-tour-blocks')
admin_router.register(r'avatars', AdminAvatarViewSet, basename='admin-avatars')
admin_router.register(r'juegos', AdminJuegoViewSet, basename='admin-juegos')
admin_router.register(r'usuarios', AdminUsuarioViewSet, basename='admin-usuarios')
admin_router.register(r'membresias', AdminMembresiaViewSet, basename='admin-membresias')
admin_router.register(r'asignaciones', AdminAsignacionViewSet, basename='admin-asignaciones')

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
    path('rueda/acciones-sugeridas/', listar_acciones_rueda, name='listar-acciones-sugeridas'),
    path('rueda/enviar-accion-kanban/', enviar_accion_kanban, name='enviar-accion-kanban'),
    path('rueda/resumen-dashboard/', resumen_rueda_dashboard, name='resumen-dashboard'),
    path('rueda/foco/<str:area>/', ver_detalle_foco, name='ver-detalle-foco'),
    path('rueda/foco/<str:area>/acciones/', recomendar_acciones_foco, name='recomendar-acciones-foco'),
    path('rueda/accion/<int:accion_id>/eliminar/', eliminar_accion_rueda, name='eliminar-accion-rueda'),
    path('delegations/by-token/<str:token>/', delegation_by_token, name='delegation-by-token'),
    path('progreso-actividades/', progreso_actividades, name='progreso-actividades'),
    path('tribu/tema-actual/', tribu_tema_actual, name='tribu-tema-actual'),
    path('tribu/compromiso/', tribu_compromiso, name='tribu-compromiso'),
    path('tribu/enviar-kanban/', tribu_enviar_kanban, name='tribu-enviar-kanban'),
    path('cursos/mes-actual/', cursos_mes_actual, name='cursos-mes-actual'),
    path('cursos/mes/', cursos_mes, name='cursos-mes'),
    path('cursos/completar/', cursos_completar, name='cursos-completar'),
    path('juegos/', juegos_catalogo, name='juegos-catalogo'),
    path('agent/chat/', agent_chat, name='agent-chat'),
    path('agent/evaluate/', agent_evaluate, name='agent-evaluate'),
    path('tts/', tts, name='tts'),
    path('tts/avatar/', avatar_tts, name='avatar-tts'),
    path('tts/avatar-sample/<int:avatar_index>/', avatar_voice_sample, name='avatar-voice-sample'),
    path('objetivo-mensual/aprobar/', aprobar_objetivo_mensual, name='aprobar-objetivo-mensual'),
    path('onboarding/avatars/', onboarding_avatars, name='onboarding-avatars'),
    path('onboarding/profile/select-avatar/', onboarding_select_avatar, name='onboarding-select-avatar'),
    path('onboarding/profile/accept-recommended/', onboarding_accept_recommended, name='onboarding-accept-recommended'),
    path('onboarding/profile/customize/intensity/', onboarding_customize_intensity, name='onboarding-customize-intensity'),
    path('onboarding/profile/customize/activations/', onboarding_customize_activations, name='onboarding-customize-activations'),
    path('onboarding/profile/customize/schedule/', onboarding_customize_schedule, name='onboarding-customize-schedule'),
    path('onboarding/profile/customize/tone/', onboarding_customize_tone, name='onboarding-customize-tone'),
    path('onboarding/profile/summary/', onboarding_summary, name='onboarding-summary'),
    path('onboarding/profile/confirm/', onboarding_confirm, name='onboarding-confirm'),
    path('onboarding/profile/complete/', onboarding_complete, name='onboarding-complete'),
    path('onboarding/profile/guided-tour/start/', onboarding_guided_tour_start, name='onboarding-guided-tour-start'),
    path('onboarding/profile/guided-tour/defer/', onboarding_guided_tour_defer, name='onboarding-guided-tour-defer'),
    path('onboarding/profile/status/', onboarding_status, name='onboarding-status'),
    path('onboarding/profile/reset/', onboarding_reset, name='onboarding-reset'),
    # INICIO
    path('inicio/state/', inicio_state, name='inicio-state'),
    path('inicio/intro-video/shown/', inicio_intro_video_shown, name='inicio-intro-video-shown'),
    path('inicio/intro-video/completed/', inicio_intro_video_completed, name='inicio-intro-video-completed'),
    path('inicio/intro-video/abandoned/', inicio_intro_video_abandoned, name='inicio-intro-video-abandoned'),
    path('inicio/intro-video/replayed/', inicio_intro_video_replayed, name='inicio-intro-video-replayed'),
    path('inicio/dashboard/open/', inicio_dashboard_open, name='inicio-dashboard-open'),
    path('inicio/tutorial/open/', inicio_tutorial_open, name='inicio-tutorial-open'),
    path('inicio/config/open/', inicio_config_open, name='inicio-config-open'),
    path('inicio/config/video-shown/', inicio_config_video_shown, name='inicio-config-video-shown'),
    path('inicio/config/open-now/', inicio_config_open_now, name='inicio-config-open-now'),
    path('inicio/config/volver/', inicio_config_volver_inicio, name='inicio-config-volver'),
    path('inicio/guided-tour/blocks/', inicio_guided_tour_blocks, name='inicio-guided-tour-blocks'),
    path('inicio/guided-tour/start/', inicio_guided_tour_start, name='inicio-guided-tour-start'),
    path('inicio/guided-tour/complete/', inicio_guided_tour_complete, name='inicio-guided-tour-complete'),
    path('inicio/guided-tour/abandon/', inicio_guided_tour_abandon, name='inicio-guided-tour-abandon'),
    path('inicio/learn/categories/', inicio_learn_categories, name='inicio-learn-categories'),
    path('inicio/learn/sections/opened/', inicio_learn_sections_opened, name='inicio-learn-sections-opened'),
    path('inicio/learn/category/select/', inicio_learn_category_select, name='inicio-learn-category-select'),
    path('inicio/events/', inicio_events, name='inicio-events'),
    # CONFIG
    path('config/profile/', config_profile, name='config-profile'),
    path('config/avatar/', config_avatar, name='config-avatar'),
    path('config/accompaniment/', config_accompaniment, name='config-accompaniment'),
    path('config/notifications/', config_notifications, name='config-notifications'),
    path('config/schedule/', config_schedule, name='config-schedule'),
    path('config/schedule/exception/', config_schedule_exception, name='config-schedule-exception'),
    path('config/schedule/exception/<int:pk>/', config_schedule_exception_delete, name='config-schedule-exception-delete'),
    path('config/tone/', config_tone, name='config-tone'),
    path('config/privacy/', config_privacy, name='config-privacy'),
    path('config/privacy/permissions/', config_privacy_permissions, name='config-privacy-permissions'),
    path('config/privacy/export/', config_privacy_export, name='config-privacy-export'),
    path('config/privacy/delete-data/', config_privacy_delete_data, name='config-privacy-delete-data'),
    path('config/account/', config_account, name='config-account'),
    path('config/account/update/', config_account_update, name='config-account-update'),
    path('config/account/change-password/', config_change_password, name='config-change-password'),
    path('config/devices/', config_devices, name='config-devices'),
    path('config/devices/logout-all/', config_devices_logout_all, name='config-devices-logout-all'),
    path('config/plan/', config_plan, name='config-plan'),
    path('config/modify-plan/availability/', config_modify_plan_availability, name='config-modify-plan-availability'),
    # MOTIVACIONAL
    path('motivational/today/', motivational_today, name='motivational-today'),
    path('motivational/current-training/', motivational_current_training, name='motivational-current-training'),
    path('motivational/progress/', motivational_progress, name='motivational-progress'),
    path('motivational/master-table/', motivational_master_table, name='motivational-master-table'),
    path('motivational/master-table/months/', motivational_master_months, name='motivational-master-months'),
    path('motivational/master-table/days/', motivational_master_days, name='motivational-master-days'),
    path('push/public-key/', push_public_key, name='push-public-key'),
    path('push/subscribe/', push_subscribe, name='push-subscribe'),
    path('push/unsubscribe/', push_unsubscribe, name='push-unsubscribe'),
    # ── Panel de administración de contenido (/api/admin/) ──
    path('admin/session/', admin_session, name='admin-session'),
    path('admin/overview/', admin_overview, name='admin-overview'),
    path('admin/asistente/chat/', admin_asistente_chat, name='admin-asistente-chat'),
    path('gratitud/hoy/', gratitud_hoy, name='gratitud-hoy'),
    # Módulo Cumpleaños (Doc 22)
    path('cumpleanos/', cumpleanos_lista, name='cumpleanos-lista'),
    path('cumpleanos/<int:pk>/', cumpleanos_detalle, name='cumpleanos-detalle'),
    path('cumpleanos/<int:pk>/accion/', cumpleanos_accion, name='cumpleanos-accion'),
    path('admin/', include(admin_router.urls)),
    path('', include(router.urls)),
]
