from django.contrib import admin
from .models import (
    User, RuedaVida, TimeBlock, KanbanTask, Recordatorio, ObjetivoSemana,
    KeepNota, MisionHoy, CategoriaRueda, RegistroRueda, MatrixItem, Factura,
    CuentaColumna, CuentaRegistro, CuentaValor,
    Workspace, WorkspaceMember, Invitation, Delegation, Notification,
    MetaAnual, GranMetaAnual, ObjetivoMensual, PropuestaIA, ConfiguracionUsuario,
    MatrizEisenhower, Activacion, InteraccionUsuario, DiagnosticoRueda,
    AccionSugerida, KanbanAction, AccionKanban, HistorialMovimiento,
    ObjetivoSemanal, MonthlyPlan, MonthlyGoal, WeeklyPlan, Action,
    AgentConversation, AgentSchedule, AgentConfig, FocusiaReport, ReportDataSource, LoginAttempt,
    ProgramMonth, MonthlyTraining, ProgramDay, UserProgramProgress, DailyPhraseViewLog,
    UserTrainingProgress,
    InicioState, InicioEventLog, LearningCategory, LearningModuleRef,
    GuidedTourBlock, AccompanimentPreferences, NotificationPreference,
    ScheduleException, AccountChangeLog, InicioPrivacyPreferences,
    TribuTemaSemana, TribuCompromiso,
    Avatar, CoachingEntry, FocusArea, Juego, Membresia, AsignacionContenido,
    Suplemento, SuplementoToma,
    HoraOroExperiencia,
    HoraOroAjustes,
    FraseGratitud, EntradaGratitud,
    Cumpleanos,
)


# ── Existing registrations ──

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


# ── New registrations ──

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['id', 'username', 'email', 'first_name', 'last_name', 'is_active', 'date_joined']
    list_filter = ['is_active', 'is_staff']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    fieldsets = (
        (None, {'fields': ('username', 'email', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'avatar_url', 'bio')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )

@admin.register(RuedaVida)
class RuedaVidaAdmin(admin.ModelAdmin):
    list_display = ['user', 'salud', 'amistad', 'dinero']

@admin.register(TimeBlock)
class TimeBlockAdmin(admin.ModelAdmin):
    list_display = ['user', 'fecha', 'hora', 'tarea']
    list_filter = ['fecha']

@admin.register(KanbanTask)
class KanbanTaskAdmin(admin.ModelAdmin):
    list_display = ['user', 'titulo', 'columna', 'fecha_hora']
    list_filter = ['columna']

@admin.register(Recordatorio)
class RecordatorioAdmin(admin.ModelAdmin):
    list_display = ['user', 'titulo', 'fecha_hora', 'activo', 'tomado']
    list_filter = ['activo', 'tomado']

@admin.register(Suplemento)
class SuplementoAdmin(admin.ModelAdmin):
    list_display = ['user', 'nombre', 'tipo', 'presentacion', 'frecuencia_horas', 'hora_primera', 'duracion_dias', 'activo']
    list_filter = ['tipo', 'activo']

@admin.register(SuplementoToma)
class SuplementoTomaAdmin(admin.ModelAdmin):
    list_display = ['suplemento', 'programada', 'tomado', 'avisada']
    list_filter = ['tomado', 'avisada']

@admin.register(HoraOroExperiencia)
class HoraOroExperienciaAdmin(admin.ModelAdmin):
    list_display = ['user', 'dia_semana', 'posicion', 'categoria', 'actividad', 'realizada']
    list_filter = ['dia_semana', 'categoria', 'realizada']


@admin.register(HoraOroAjustes)
class HoraOroAjustesAdmin(admin.ModelAdmin):
    list_display = ['user', 'recordatorio_activo', 'hora_recordatorio']

@admin.register(ObjetivoSemana)
class ObjetivoSemanaAdmin(admin.ModelAdmin):
    list_display = ['user', 'texto1', 'texto2', 'texto3']

@admin.register(KeepNota)
class KeepNotaAdmin(admin.ModelAdmin):
    list_display = ['user', 'contenido']

@admin.register(MisionHoy)
class MisionHoyAdmin(admin.ModelAdmin):
    list_display = ['user', 'texto']

@admin.register(MatrixItem)
class MatrixItemAdmin(admin.ModelAdmin):
    list_display = ['user', 'task', 'quadrant', 'created_at']
    list_filter = ['quadrant']

@admin.register(Factura)
class FacturaAdmin(admin.ModelAdmin):
    list_display = ['user', 'nombre', 'monto', 'fecha_vencimiento']

@admin.register(CuentaColumna)
class CuentaColumnaAdmin(admin.ModelAdmin):
    list_display = ['user', 'nombre', 'orden']

@admin.register(CuentaRegistro)
class CuentaRegistroAdmin(admin.ModelAdmin):
    list_display = ['user', 'periodo_anio', 'periodo_mes', 'cuenta', 'dia_vencimiento', 'monto', 'pagado']
    list_filter = ['pagado', 'periodo_anio', 'periodo_mes']

@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'owner']

@admin.register(WorkspaceMember)
class WorkspaceMemberAdmin(admin.ModelAdmin):
    list_display = ['workspace', 'user', 'role']

@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
    list_display = ['workspace', 'email', 'status']

@admin.register(Delegation)
class DelegationAdmin(admin.ModelAdmin):
    list_display = ['id', 'delegator', 'delegate', 'status']
    list_filter = ['status']

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'type', 'is_read', 'created_at']
    list_filter = ['type', 'is_read']

@admin.register(GranMetaAnual)
class GranMetaAnualAdmin(admin.ModelAdmin):
    list_display = ['user', 'status', 'is_active', 'version', 'creado']
    list_filter = ['status', 'is_active']

@admin.register(MatrizEisenhower)
class MatrizEisenhowerAdmin(admin.ModelAdmin):
    list_display = ['user', 'status']

@admin.register(InteraccionUsuario)
class InteraccionUsuarioAdmin(admin.ModelAdmin):
    list_display = ['user', 'tipo', 'creado']

@admin.register(DiagnosticoRueda)
class DiagnosticoRuedaAdmin(admin.ModelAdmin):
    list_display = ['user', 'creado']

@admin.register(AccionSugerida)
class AccionSugeridaAdmin(admin.ModelAdmin):
    list_display = ['user', 'area_foco', 'creado']
    list_filter = ['area_foco']

@admin.register(KanbanAction)
class KanbanActionAdmin(admin.ModelAdmin):
    list_display = ['user', 'title', 'classification_status', 'source', 'pinned', 'created_at']
    list_filter = ['classification_status', 'source', 'pinned']

@admin.register(AccionKanban)
class AccionKanbanAdmin(admin.ModelAdmin):
    list_display = ['user', 'texto_accion', 'clasificacion', 'estado_actual', 'creado_en']
    list_filter = ['clasificacion', 'estado_actual']

@admin.register(HistorialMovimiento)
class HistorialMovimientoAdmin(admin.ModelAdmin):
    list_display = ['accion', 'fecha_movimiento']

@admin.register(ObjetivoSemanal)
class ObjetivoSemanalAdmin(admin.ModelAdmin):
    list_display = ['user', 'semana', 'año', 'titulo', 'creado']

@admin.register(MonthlyPlan)
class MonthlyPlanAdmin(admin.ModelAdmin):
    list_display = ['user', 'cycle_start_month', 'cycle_start_year', 'status', 'approved_at']
    list_filter = ['status']

@admin.register(MonthlyGoal)
class MonthlyGoalAdmin(admin.ModelAdmin):
    list_display = ['plan', 'month_order', 'monthly_goal_text', 'status']
    list_filter = ['status']

@admin.register(WeeklyPlan)
class WeeklyPlanAdmin(admin.ModelAdmin):
    list_display = ['user', 'year', 'week_number', 'created_at']

@admin.register(Action)
class ActionAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'status', 'assigned_calendar_date', 'created_at']
    list_filter = ['status']

@admin.register(AgentConversation)
class AgentConversationAdmin(admin.ModelAdmin):
    list_display = ['user', 'session_id', 'rol', 'created_at']
    list_filter = ['rol']

@admin.register(AgentSchedule)
class AgentScheduleAdmin(admin.ModelAdmin):
    list_display = ['user', 'tipo', 'activo']
    list_filter = ['tipo', 'activo']

@admin.register(AgentConfig)
class AgentConfigAdmin(admin.ModelAdmin):
    list_display = ['user', 'activo', 'tono', 'frecuencia_checkin']
    list_filter = ['activo']

@admin.register(FocusiaReport)
class FocusiaReportAdmin(admin.ModelAdmin):
    list_display = ['user', 'level', 'cycle_label', 'period_start', 'period_end', 'status', 'generation_state', 'is_partial', 'never_opened', 'created_at']
    list_filter = ['level', 'status', 'generation_state', 'is_partial']
    date_hierarchy = 'period_start'

@admin.register(ReportDataSource)
class ReportDataSourceAdmin(admin.ModelAdmin):
    list_display = ['report', 'source_type', 'reference_id']
    list_filter = ['source_type']

@admin.register(LoginAttempt)
class LoginAttemptAdmin(admin.ModelAdmin):
    list_display = ['user', 'username', 'ip_address', 'success', 'timestamp']
    list_filter = ['success', 'timestamp']


@admin.register(ProgramMonth)
class ProgramMonthAdmin(admin.ModelAdmin):
    list_display = ['month_number', 'theme_name', 'training_theme']
    list_editable = ['theme_name', 'training_theme']


@admin.register(MonthlyTraining)
class MonthlyTrainingAdmin(admin.ModelAdmin):
    list_display = ['month', 'title']
    search_fields = ['title']


@admin.register(ProgramDay)
class ProgramDayAdmin(admin.ModelAdmin):
    list_display = ['month', 'day_number', 'phrase', 'intention']
    list_filter = ['month', 'intention']
    search_fields = ['phrase']


@admin.register(UserProgramProgress)
class UserProgramProgressAdmin(admin.ModelAdmin):
    list_display = ['user', 'cycle_start_date', 'is_synced_to_collective', 'last_collective_reset_year']
    list_filter = ['is_synced_to_collective', 'last_collective_reset_year']


@admin.register(DailyPhraseViewLog)
class DailyPhraseViewLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'shown_date', 'program_day']
    list_filter = ['shown_date']


# ── INICIO Module Registrations ──

@admin.register(InicioState)
class InicioStateAdmin(admin.ModelAdmin):
    list_display = ['user', 'status', 'has_seen_intro_video', 'intro_video_completed', 'guided_tour_status', 'first_entry_at', 'updated_at']
    list_filter = ['status', 'has_seen_intro_video', 'guided_tour_status']
    search_fields = ['user__username']

@admin.register(InicioEventLog)
class InicioEventLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'event_type', 'origin', 'created_at']
    list_filter = ['event_type', 'origin']
    search_fields = ['user__username']
    ordering = ['-created_at']

@admin.register(LearningCategory)
class LearningCategoryAdmin(admin.ModelAdmin):
    list_display = ['slug', 'name', 'order']
    list_editable = ['order']
    ordering = ['order']

@admin.register(LearningModuleRef)
class LearningModuleRefAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'order']
    list_filter = ['category']
    list_editable = ['order']
    ordering = ['category', 'order']

@admin.register(GuidedTourBlock)
class GuidedTourBlockAdmin(admin.ModelAdmin):
    list_display = ['slug', 'title', 'order']
    list_editable = ['order']
    ordering = ['order']

@admin.register(AccompanimentPreferences)
class AccompanimentPreferencesAdmin(admin.ModelAdmin):
    list_display = ['user', 'support_types']
    search_fields = ['user__username']

@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ['user', 'channel', 'state']
    list_filter = ['channel', 'state']
    search_fields = ['user__username']

@admin.register(ScheduleException)
class ScheduleExceptionAdmin(admin.ModelAdmin):
    list_display = ['user', 'exception_type', 'value']
    list_filter = ['exception_type']
    search_fields = ['user__username']

@admin.register(AccountChangeLog)
class AccountChangeLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'change_type', 'origin', 'created_at']
    list_filter = ['change_type', 'origin']
    search_fields = ['user__username']
    ordering = ['-created_at']

@admin.register(InicioPrivacyPreferences)
class InicioPrivacyPreferencesAdmin(admin.ModelAdmin):
    list_display = ['user', 'data_collection', 'analytics', 'personalized_recommendations', 'third_party_sharing']
    list_filter = ['data_collection', 'analytics', 'third_party_sharing']
    search_fields = ['user__username']


@admin.register(TribuTemaSemana)
class TribuTemaSemanaAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'activo', 'creado']
    list_filter = ['activo']
    search_fields = ['titulo']


@admin.register(TribuCompromiso)
class TribuCompromisoAdmin(admin.ModelAdmin):
    list_display = ['user', 'year', 'week_number', 'tribu', 'enviado_kanban']
    list_filter = ['tribu', 'enviado_kanban']
    search_fields = ['user__username', 'texto']


@admin.register(UserTrainingProgress)
class UserTrainingProgressAdmin(admin.ModelAdmin):
    list_display = ['user', 'training', 'completado', 'completado_en']
    list_filter = ['completado']
    search_fields = ['user__username']


# ── Modelos que faltaban por registrar ──
# Estos tres solo se gestionaban por código o por el panel nuevo. El admin de
# Django queda como red de seguridad por si hay que corregir algo puntual.

@admin.register(Avatar)
class AvatarAdmin(admin.ModelAdmin):
    list_display = ['name', 'gender', 'is_active', 'voice_id', 'created_at']
    list_filter = ['gender', 'is_active']
    search_fields = ['name', 'voice_id']


@admin.register(CoachingEntry)
class CoachingEntryAdmin(admin.ModelAdmin):
    list_display = ['user', 'created_at', 'decision_added_to_agenda']
    list_filter = ['decision_added_to_agenda']
    search_fields = ['user__username', 'reflection', 'decision']


@admin.register(FocusArea)
class FocusAreaAdmin(admin.ModelAdmin):
    list_display = ['area', 'score', 'priority_order', 'diagnostico']
    search_fields = ['area', 'reason']


@admin.register(Juego)
class JuegoAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'tipo', 'activo', 'orden', 'categoria']
    list_filter = ['tipo', 'activo', 'categoria']
    list_editable = ['activo', 'orden']
    search_fields = ['titulo', 'descripcion', 'url']


@admin.register(Membresia)
class MembresiaAdmin(admin.ModelAdmin):
    list_display = ['user', 'fecha_inicio', 'fecha_fin', 'estado']
    list_filter = ['fecha_inicio', 'fecha_fin']
    search_fields = ['user__username', 'user__email', 'nota']


@admin.register(AsignacionContenido)
class AsignacionContenidoAdmin(admin.ModelAdmin):
    list_display = ['user', 'tipo', 'objeto_id', 'creado']
    list_filter = ['tipo']
    search_fields = ['user__username', 'user__email']


# ══════════════ Módulo Gratitud (Doc 19) ══════════════

@admin.register(FraseGratitud)
class FraseGratitudAdmin(admin.ModelAdmin):
    list_display = ['dia', 'autor', 'obra', 'anio', 'activa']
    list_editable = ['activa']
    list_filter = ['activa']
    search_fields = ['texto', 'autor', 'obra']
    ordering = ['dia']


@admin.register(EntradaGratitud)
class EntradaGratitudAdmin(admin.ModelAdmin):
    list_display = ['user', 'fecha', 'frase', 'actualizado']
    list_filter = ['fecha']
    search_fields = ['user__username', 'user__email', 'texto']
    readonly_fields = ['creado', 'actualizado']


# ══════════════ Módulo Cumpleaños (Doc 22) ══════════════

@admin.register(Cumpleanos)
class CumpleanosAdmin(admin.ModelAdmin):
    list_display = ['user', 'nombre', 'categoria', 'fecha',
                    'anticipacion_dias', 'aviso_enviado_para']
    list_filter = ['categoria']
    search_fields = ['user__username', 'user__email', 'nombre']
    readonly_fields = ['creado', 'actualizado']
