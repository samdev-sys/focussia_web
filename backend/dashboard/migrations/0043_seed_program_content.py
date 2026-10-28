from django.db import migrations

MONTHS = [
    {
        'month_number': 1, 'theme_name': 'Un nuevo comienzo',
        'training_theme': 'Sentando las bases de tu planificación estratégica',
        'formative_objective': 'Que el usuario comprenda el ciclo completo de planificación y se prepare para definir su rumbo anual.',
        'title': 'Introducción a la Planificación Estratégica',
        'content': 'Este mes aprenderás a estructurar tu pensamiento estratégico. La clave no está en hacer más, sino en alinear cada acción con un propósito claro. Focusia te guiará para que definas tu Meta Anual como el faro que ilumina todos tus meses.',
        'days': [
            (1, 'reflexion', 'Hoy comienzas un ciclo de 12 meses. No necesitas tenerlo todo claro; solo necesitas empezar.'),
            (2, 'reflexion', 'Cada gran viaje comienza con un paso consciente. Este es el tuyo.'),
            (3, 'accion', 'Tómate 5 minutos para escribir qué significa para ti "un nuevo comienzo".'),
            (4, 'foco', 'La claridad no llega antes de empezar; llega mientras avanzas.'),
            (5, 'disciplina', 'No se trata de motivación eterna, sino de decisión constante.'),
        ],
    },
    {
        'month_number': 2, 'theme_name': 'Diagnóstico y autoconocimiento',
        'training_theme': 'Lectura de la Rueda de la Vida y detección de áreas de impacto',
        'formative_objective': 'Enseñar al usuario a usar su diagnóstico de Rueda de la Vida como brújula para priorizar objetivos.',
        'title': 'Conociendo tu punto de partida',
        'content': 'No puedes trazar una ruta sin saber dónde estás. La Rueda de la Vida no es un test; es una fotografía de tu presente. Este mes aprenderás a leer los patrones de tu diagnóstico y a detectar las áreas que realmente merecen tu atención estratégica.',
        'days': [
            (1, 'reflexion', 'Observa tu Rueda de la Vida. No busques equilibrio perfecto, busca dirección consciente.'),
            (2, 'calma', 'No todas las áreas necesitan atención urgente. Algunas solo necesitan ser observadas.'),
            (3, 'accion', 'Identifica el área con menor puntuación. Pregúntate: ¿qué pequeño cambio mejoraría esto?'),
            (4, 'decision', 'Elige un área para enfocarte este mes. Una sola. La que más impacto tenga en tu bienestar general.'),
            (5, 'energia', 'El autoconocimiento no es un lujo; es el cimiento de toda decisión acertada.'),
        ],
    },
    {
        'month_number': 3, 'theme_name': 'Diseñando tu meta anual',
        'training_theme': 'Cómo definir metas que realmente movilizan',
        'formative_objective': 'Capacitar al usuario en la formulación de metas anuales conectadas a su diagnóstico personal.',
        'title': 'Tu Meta Anual como norte estratégico',
        'content': 'Una meta anual no es un deseo; es una decisión. Este mes te guiaremos para que transformes lo que aprendiste de tu diagnóstico en una meta concreta, medible y conectada emocionalmente. La meta correcta no solo organiza tu año: te moviliza.',
        'days': [
            (1, 'foco', 'Una meta anual clara elimina más decisiones de las que crea.'),
            (2, 'reflexion', 'Pregúntate: ¿qué es lo único que, si logras este año, haría que todo lo demás valiera la pena?'),
            (3, 'accion', 'Escribe tu meta anual en una frase. Sin rodeos. Sin excusas.'),
            (4, 'disciplina', 'Una meta sin fecha es solo una intención. Asígnale un horizonte real.'),
            (5, 'cierre', 'No necesitas tener el plan completo. Necesitas tener el destino claro.'),
        ],
    },
    {
        'month_number': 4, 'theme_name': 'Objetivos mensuales: el puente',
        'training_theme': 'Descomposición de la meta anual en hitos mensuales',
        'formative_objective': 'Desarrollar la capacidad del usuario para fraccionar su meta anual en objetivos mensuales alcanzables.',
        'title': 'De la visión a la acción mensual',
        'content': 'Tu meta anual es el horizonte; tus objetivos mensuales son los puertos intermedios. Aprenderás a dividir el año en bloques estratégicos donde cada mes tenga un propósito claro que te acerque a tu meta sin abrumarte.',
        'days': [
            (1, 'accion', 'Divide tu meta anual en 12 partes. No necesitas que sean perfectas; necesitas que sean posibles.'),
            (2, 'foco', 'Cada mes debe tener un objetivo que, si lo cumples, sientas que avanzaste.'),
            (3, 'calma', 'No todos los meses serán igual de productivos. Eso está bien. El avance no es lineal.'),
            (4, 'decision', 'Elige el objetivo de este mes. Solo uno. El más importante.'),
            (5, 'reflexion', 'Revisa tu objetivo mensual: ¿sigue conectado con tu meta anual o te estás desviando?'),
        ],
    },
    {
        'month_number': 5, 'theme_name': 'Planificación semanal con propósito',
        'training_theme': 'Estructura semanal conectada al objetivo mensual',
        'formative_objective': 'Enseñar al usuario a planificar sus semanas como bloques de avance hacia su objetivo mensual.',
        'title': 'La semana como unidad de ejecución',
        'content': 'El mes se vive por semanas. Cada semana es una oportunidad para avanzar, ajustar y mantener el rumbo. Este mes aprenderás a planificar tus semanas no como listas de tareas, sino como bloques estratégicos que honran tu objetivo mensual.',
        'days': [
            (1, 'foco', 'Tu semana no se define por lo que tienes que hacer, sino por lo que eliges avanzar.'),
            (2, 'accion', 'Planifica tu semana con una sola prioridad: la que más acerque tu objetivo mensual.'),
            (3, 'disciplina', 'La disciplina no es hacer todo; es hacer lo importante aunque no sea urgente.'),
            (4, 'calma', 'Si tu semana está desbordada, no necesitas más tiempo: necesitas menos prioridades.'),
            (5, 'reflexion', 'Al final de la semana, pregúntate: ¿avancé hacia mi objetivo mensual o solo estuve ocupado?'),
        ],
    },
    {
        'month_number': 6, 'theme_name': 'Ejecución diaria y time blocking',
        'training_theme': 'Gestión del día a día con bloques de tiempo',
        'formative_objective': 'Dotar al usuario de herramientas prácticas para organizar su día respetando sus prioridades estratégicas.',
        'title': 'El arte de ejecutar el día',
        'content': 'La planificación más brillante fracasa si el día a día no la sostiene. El Time Blocking es tu aliado: no se trata de llenar cada hora, sino de proteger los bloques que realmente importan. Aprenderás a diseñar tu jornada para que cada día sea un paso consciente.',
        'days': [
            (1, 'accion', 'Bloquea 2 horas hoy para tu tarea más importante. Sin interrupciones. Sin excusas.'),
            (2, 'foco', 'No confundas actividad con avance. Pregúntate: ¿esto que estoy haciendo hoy acerca mi meta?'),
            (3, 'disciplina', 'El time blocking no es rigidez; es respeto por tus propias prioridades.'),
            (4, 'energia', 'Organiza tus bloques según tu energía. Lo más difícil, en tu mejor hora.'),
            (5, 'calma', 'Deja espacios en blanco en tu agenda. El descanso también es parte de la ejecución.'),
        ],
    },
    {
        'month_number': 7, 'theme_name': 'Kanban y gestión visual',
        'training_theme': 'Organización visual de tareas con el tablero Kanban',
        'formative_objective': 'Enseñar al usuario a usar el Kanban como herramienta de organización y despeje mental.',
        'title': 'Visualiza tu flujo de trabajo',
        'content': 'Tu mente no está diseñada para almacenar tareas; está diseñada para ejecutarlas. El Kanban Backlog te permite externalizar todo lo que tienes pendiente para que puedas decidir con claridad qué hacer y cuándo. Este mes dominarás el flujo visual de tu trabajo.',
        'days': [
            (1, 'accion', 'Saca de tu mente todo lo pendiente y colócalo en tu Kanban Backlog. Todo.'),
            (2, 'foco', 'El backlog no es una lista de obligaciones; es un menú de posibilidades. Elige con conciencia.'),
            (3, 'decision', 'Clasifica cada tarea: ¿es para hacer ahora, planificar, delegar o eliminar?'),
            (4, 'disciplina', 'Mantener el Kanban actualizado es más importante que tenerlo perfecto.'),
            (5, 'cierre', 'Revisa tu tablero. Cada tarea movida es una decisión tomada.'),
        ],
    },
    {
        'month_number': 8, 'theme_name': 'Delegación y enfoque',
        'training_theme': 'Identificar qué delegar y cómo hacerlo efectivamente',
        'formative_objective': 'Desarrollar la habilidad del usuario para identificar tareas delegables y liberar carga mental.',
        'title': 'Hacer menos para lograr más',
        'content': 'Delegar no es renunciar; es enfocarse. Muchas veces hacemos cosas que otros podrían hacer, solo porque "es más rápido hacerlo uno mismo". Este mes aprenderás a identificar qué tareas puedes delegar, cómo hacerlo sin perder calidad, y cómo liberar espacio para lo que realmente importa.',
        'days': [
            (1, 'reflexion', 'Pregúntate: ¿qué estoy haciendo hoy que alguien más podría hacer?'),
            (2, 'accion', 'Identifica una tarea delegable y asígnala. Suelta el control.'),
            (3, 'calma', 'Delegar no es perder control; es ganar foco.'),
            (4, 'decision', 'No todo lo urgente merece tu atención directa. Distingue entre urgente e importante.'),
            (5, 'energia', 'Cada tarea que delegas es energía que recuperas para tu propósito principal.'),
        ],
    },
    {
        'month_number': 9, 'theme_name': 'Gestión emocional y bienestar',
        'training_theme': 'Equilibrio entre productividad y salud emocional',
        'formative_objective': 'Integrar prácticas de bienestar y gratitud en la rutina del usuario para sostener su productividad a largo plazo.',
        'title': 'Productividad sostenible',
        'content': 'No puedes sostener un alto rendimiento sin cuidar tu bienestar. La productividad no se trata de hacer más, sino de mantener la energía y la claridad en el tiempo. Este mes integrarás prácticas de gratitud, pausas conscientes y autorregulación emocional en tu rutina diaria.',
        'days': [
            (1, 'calma', 'Hoy, antes de hacer, respira. La pausa no es pérdida de tiempo; es recuperación de claridad.'),
            (2, 'reflexion', 'Escribe algo por lo que estés agradecido hoy. La gratitud entrena el enfoque en lo que sí funciona.'),
            (3, 'energia', 'Tu energía es tu recurso más valioso. Protégela como protegerías tu mayor inversión.'),
            (4, 'accion', 'Tómate 10 minutos para hacer algo que no sea productivo, pero que te haga bien.'),
            (5, 'disciplina', 'Cuidar tu bienestar también requiere disciplina. Es una decisión, no una ocurrencia.'),
        ],
    },
    {
        'month_number': 10, 'theme_name': 'Revisión y ajuste de rumbo',
        'training_theme': 'Cómo evaluar el progreso y corregir sin frustración',
        'formative_objective': 'Enseñar al usuario a realizar revisiones periódicas para ajustar su plan sin perder la dirección.',
        'title': 'El poder de la revisión consciente',
        'content': 'Los planes no son estáticos; son vivos. La capacidad de revisar, ajustar y corregir es lo que separa a quienes logran sus metas de quienes se frustran en el intento. Este mes te formarás en el hábito de la revisión periódica: semanal, mensual y anual.',
        'days': [
            (1, 'reflexion', 'Revisa tu meta anual. ¿Sigue siendo tu norte o necesitas ajustarla?'),
            (2, 'accion', 'Haz una revisión semanal: ¿qué funcionó, qué no, qué aprendiste?'),
            (3, 'calma', 'Ajustar no es fracasar. Es inteligencia. Los planes rígidos se rompen; los planes flexibles prosperan.'),
            (4, 'decision', 'Identifica algo que esté fuera de tu control y suéltalo. Enfócate en lo que sí puedes cambiar.'),
            (5, 'foco', 'No se trata de volver a empezar. Se trata de retomar el rumbo desde donde estás.'),
        ],
    },
    {
        'month_number': 11, 'theme_name': 'Preparación para el cierre',
        'training_theme': 'Consolidación de hábitos y cierre consciente del ciclo',
        'formative_objective': 'Preparar al usuario para cerrar su ciclo anual de forma consciente, extrayendo aprendizajes y consolidando hábitos.',
        'title': 'Cerrando con conciencia',
        'content': 'El final del ciclo no es un fin; es una preparación para el siguiente. La forma en que cierras determina cómo empiezas. Este mes te guiaremos para que hagas una revisión profunda de tu año, consolides los hábitos que te sirvieron y sueltes lo que ya no necesitas.',
        'days': [
            (1, 'reflexion', 'Mira hacia atrás. No para juzgarte, sino para reconocer cuánto has avanzado.'),
            (2, 'accion', 'Escribe tres hábitos que este ciclo te haya dejado. Los que quieras llevar al siguiente.'),
            (3, 'calma', 'No todo lo que planeaste se cumplió. Eso no es fracaso; es vida. Aprende y suelta.'),
            (4, 'energia', 'Identifica qué te dio energía este año. Haz más de eso en el próximo ciclo.'),
            (5, 'cierre', 'El cierre no es un final; es una pausa antes del nuevo comienzo.'),
        ],
    },
    {
        'month_number': 12, 'theme_name': 'Celebración y proyección',
        'training_theme': 'Celebración de logros y preparación para el nuevo ciclo',
        'formative_objective': 'Ayudar al usuario a celebrar sus logros, proyectarse al próximo año y cerrar el ciclo con gratitud y motivación.',
        'title': 'Tu ciclo, tu cosecha',
        'content': 'Has completado un ciclo completo de 12 meses. Este mes no se trata de producir; se trata de reconocer. Celebrar lo logrado, integrar lo aprendido y proyectarte con energía hacia el nuevo año. El programa Focusia no termina aquí: se renueva contigo.',
        'days': [
            (1, 'reflexion', 'Felicitate. Has completado un ciclo de 12 meses de trabajo consciente. Eso ya es un logro.'),
            (2, 'energia', 'Celebra tus avances. No solo las metas cumplidas, también el camino recorrido.'),
            (3, 'calma', 'Tómate un momento para agradecer. A ti, a quienes te apoyaron, al proceso.'),
            (4, 'accion', 'Escribe una intención para el próximo ciclo. Una frase que te gustaría recordar al comenzar.'),
            (5, 'cierre', 'Un ciclo termina, pero el aprendizaje continúa. Nos vemos en el próximo comienzo.'),
        ],
    },
]


def seed_program_content(apps, schema_editor):
    ProgramMonth = apps.get_model('dashboard', 'ProgramMonth')
    MonthlyTraining = apps.get_model('dashboard', 'MonthlyTraining')
    ProgramDay = apps.get_model('dashboard', 'ProgramDay')

    for m in MONTHS:
        month, _ = ProgramMonth.objects.get_or_create(
            month_number=m['month_number'],
            defaults={
                'theme_name': m['theme_name'],
                'training_theme': m['training_theme'],
                'formative_objective': m['formative_objective'],
            }
        )
        MonthlyTraining.objects.get_or_create(
            month=month,
            defaults={
                'title': m['title'],
                'content': m['content'],
            }
        )
        for day_number, intention, phrase in m['days']:
            ProgramDay.objects.get_or_create(
                month=month,
                day_number=day_number,
                defaults={
                    'phrase': phrase,
                    'intention': intention,
                }
            )


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0042_motivational_models'),
    ]

    operations = [
        migrations.RunPython(seed_program_content, reverse_code=migrations.RunPython.noop),
    ]
