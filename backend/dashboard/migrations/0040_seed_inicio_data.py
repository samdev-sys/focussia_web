from django.db import migrations


def seed_guided_tour_blocks(apps, schema_editor):
    GuidedTourBlock = apps.get_model('dashboard', 'GuidedTourBlock')
    blocks = [
        (1, 'inicio', 'Este es tu botón de inicio. Desde aquí puedes volver al punto central de Focusia, entrar al dashboard completo, revisar el tutorial o ajustar tu configuración cuando lo necesites.'),
        (2, 'rueda', 'Aquí comienza tu diagnóstico personal. La Rueda de la Vida te ayuda a observar cómo están las áreas principales de tu vida, para tomar decisiones con más claridad y no planificar desde la improvisación.'),
        (3, 'anual', 'Este es tu espacio anual. Aquí definirás tu gran meta del año: una dirección clara que servirá como guía para tus objetivos mensuales, tu planificación semanal y tus acciones diarias.'),
        (4, 'mensual', 'Aquí organizarás tu meta anual en objetivos mensuales. Cada mes será un bloque estratégico de avance, para que tu gran meta no quede como una idea lejana, sino como un camino concreto.'),
        (5, 'semanal', 'Aquí organizarás tu semana. Focusia te ayuda a convertir tu objetivo mensual en acciones concretas, para que cada semana tenga dirección, prioridad y avance real.'),
        (6, 'kanban_backlog', 'Este es tu Kanban Backlog. Aquí puedes ordenar tareas, ideas o acciones pendientes antes de decidir cuándo ejecutarlas. Te ayuda a no perder nada importante y a mantener tu planificación más limpia.'),
        (7, 'objetivo_semana', 'Este es tu Objetivo de la Semana. Aquí defines el foco principal que guiará tus próximos días, para que tus acciones no se dispersen y sigan conectadas con tu objetivo mensual.'),
        (8, 'mision_hoy', 'Esta es tu Misión de Hoy. Aquí eliges la acción más importante del día: esa tarea que realmente mueve tu avance y que conecta con lo que tú mismo definiste como prioridad.'),
        (9, 'agenda_diaria', 'Esta es tu agenda diaria. Aquí organizas lo que harás hoy, conectando tus tareas con tu misión, tu objetivo semanal y tu avance real.'),
        (10, 'time_blocking', 'Este es tu Time Blocking. Aquí puedes organizar tu día por bloques de tiempo, para que tus acciones no queden solo como pendientes, sino como espacios concretos e innegociables dentro de tu jornada.'),
        (11, 'wip_status', 'Aquí verás el estado de tus acciones. Focusia te mostrará qué está pendiente, qué está en proceso y qué ya completaste, para que tengas claridad sobre tu avance real.'),
        (12, 'fechas_importantes', 'Aquí puedes registrar tus fechas importantes. Focusia te ayudará a recordarlas con anticipación, para que no solo las tengas anotadas, sino que puedas prepararte antes de que lleguen.'),
        (13, 'acciones_delegar', 'Aquí puedes registrar acciones que no necesariamente debes hacer tú. Focusia te ayuda a identificar qué puedes delegar, para liberar carga, cuidar tu foco y avanzar con mayor claridad.'),
        (14, 'gratitud', 'Este es tu espacio de gratitud. Aquí puedes detenerte un momento y registrar algo valioso de tu día. Focusia no solo busca que avances, también que tomes conciencia de lo que ya estás construyendo.'),
        (15, 'coaching', 'Este es tu espacio de coaching. Aquí encontrarás orientación y herramientas prácticas para fortalecer tus decisiones, tu disciplina y tu capacidad de avanzar con más claridad.'),
        (16, 'tribu', 'Este es tu espacio de Tribu. Aquí podrás conectar con apoyo, comunidad e inspiración, para que tu proceso no dependa solo de ti, sino también de un entorno que refuerce tu avance.'),
        (17, 'cursos', 'Este es tu espacio de Cursos. Aquí podrás acceder a contenidos más estructurados para fortalecer tus habilidades, mejorar tu forma de organizarte y avanzar con mayor preparación.'),
        (18, 'rrss', 'Este es tu espacio de RRSS. Aquí puedes organizar tus redes sociales, ideas de contenido o presencia digital, para que tu actividad online tenga más orden, intención y dirección.'),
        (19, 'cuentas', 'Este es tu espacio de Cuentas. Aquí puedes organizar información administrativa o financiera importante, para mantener mayor claridad sobre compromisos, pagos y datos que no quieres perder de vista.'),
        (20, 'medicamentos', 'Este es tu espacio de Medicamentos. Aquí puedes registrar recordatorios relacionados con tu cuidado personal, para que Focusia te ayude a no olvidar acciones importantes de salud que tú mismo hayas definido.'),
        (21, 'cumpleanos', 'Este es tu espacio de Cumpleaños. Aquí puedes registrar fechas importantes de personas relevantes para ti, para que Focusia te ayude a recordarlas con anticipación y puedas prepararte a tiempo.'),
        (22, 'focus', 'Este es tu espacio Focus. Aquí puedes volver a centrarte en lo importante, recuperar claridad y dirigir tu atención hacia aquello que realmente necesita tu enfoque en este momento.'),
        (23, 'clima_comuna', 'Aquí puedes ver el clima de tu comuna. Focusia te ayuda a considerar esta información para planificar mejor tu día, anticipar traslados, ajustar actividades y tomar decisiones con más contexto.'),
        (24, 'notas', 'Este es tu block de notas. Aquí puedes guardar ideas, apuntes o información rápida para no perder nada importante y mantener tu mente más despejada.'),
        (25, 'bienestar_complementario', 'Estos espacios te ayudan a cuidar tu bienestar y tu vida personal. Aquí puedes organizar momentos de humor, ejercicio, hobbies, viajes, diversión y reflexión, para que tu planificación no solo sea productiva, sino también significativa.'),
    ]
    for order, slug, message in blocks:
        GuidedTourBlock.objects.get_or_create(
            slug=slug,
            defaults={'order': order, 'title': slug.replace('_', ' ').title(), 'avatar_message': message}
        )


def seed_learning_categories(apps, schema_editor):
    LearningCategory = apps.get_model('dashboard', 'LearningCategory')
    LearningModuleRef = apps.get_model('dashboard', 'LearningModuleRef')

    categories = [
        {
            'slug': 'planificacion', 'name': 'Planificación', 'order': 1,
            'modules': ['Rueda de la Vida', 'Matriz', 'Meta Anual', 'Objetivos Mensuales', 'Objetivo de la Semana', 'Planificación Semanal', 'Planificación Diaria'],
        },
        {
            'slug': 'ejecucion_diaria', 'name': 'Ejecución diaria', 'order': 2,
            'modules': ['Agenda diaria (Time blocking, Work in progress, Status)', 'Mi Misión de Hoy', 'Kanban Backlog', 'Acciones por Delegar', 'Recordatorios'],
        },
        {
            'slug': 'bienestar', 'name': 'Bienestar', 'order': 3,
            'modules': ['Gratitud', 'La Hora de Oro Familiar', 'Conjunto de cajones (Humor, Ejercicios, Hobbies, Viajes, Diversión, Reflexión, Salud)', 'Medicamentos', 'Clima en mi comuna'],
        },
        {
            'slug': 'herramientas_personales', 'name': 'Herramientas personales', 'order': 4,
            'modules': ['Cursos', 'RRSS', 'Cuentas', 'Coaching', 'Tribu', 'Cumpleaños', 'Keep/Block de notas', 'Recordatorio de fechas importantes', 'Focus'],
        },
        {
            'slug': 'configuracion', 'name': 'Configuración', 'order': 5,
            'modules': ['Avatar seleccionado', 'Intensidad del acompañamiento', 'Tipo de activaciones', 'Horarios permitidos', 'Tono del avatar', 'Notificaciones', 'Privacidad y seguridad', 'Cuenta de usuario'],
        },
        {
            'slug': 'reportes', 'name': 'Reportes', 'order': 6,
            'modules': ['Reporte semanal', 'Reporte mensual', 'Reporte anual', 'Mi Progreso', 'Indicadores de cumplimiento', 'Recomendaciones inteligentes', 'Historial de avances'],
        },
    ]
    for cat_data in categories:
        cat, _ = LearningCategory.objects.get_or_create(
            slug=cat_data['slug'],
            defaults={'name': cat_data['name'], 'order': cat_data['order']}
        )
        for i, module_name in enumerate(cat_data['modules'], start=1):
            LearningModuleRef.objects.get_or_create(
                category=cat,
                name=module_name,
                defaults={'order': i}
            )


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0039_guidedtourblock_learningcategory_scheduleexception_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_guided_tour_blocks, reverse_code=migrations.RunPython.noop),
        migrations.RunPython(seed_learning_categories, reverse_code=migrations.RunPython.noop),
    ]
