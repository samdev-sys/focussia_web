# Normaliza valores históricos del Sistema Proactivo a los canales y tipos
# canónicos de Doc 27 §2.3. La UI guardó durante un tiempo nombres legibles
# (llamadas / activar / desactivar / criticas / dia_semana / horas...).

from django.db import migrations


CANALES = {'llamadas': 'calls'}
ESTADOS = {'activar': 'active', 'desactivar': 'inactive', 'criticas': 'critical_only'}
DIAS = {
    'lun': 'monday', 'mar': 'tuesday', 'mié': 'wednesday', 'mie': 'wednesday',
    'jue': 'thursday', 'vie': 'friday', 'sáb': 'saturday', 'sab': 'saturday',
    'dom': 'sunday', 'lunes': 'monday', 'martes': 'tuesday',
    'miercoles': 'wednesday', 'miércoles': 'wednesday', 'jueves': 'thursday',
    'viernes': 'friday', 'sabado': 'saturday', 'sábado': 'saturday',
    'domingo': 'sunday', 'monday': 'monday', 'tuesday': 'tuesday',
    'wednesday': 'wednesday', 'thursday': 'thursday', 'friday': 'friday',
    'saturday': 'saturday', 'sunday': 'sunday',
}
TIPOS = {
    'dia_semana': 'no_days', 'horas': 'no_hours',
    'descanso': 'no_night', 'noche': 'no_night', 'madrugada': 'no_night',
    'acciones_criticas': 'critical_only_outside',
}
_RANK = {'active': 0, 'critical_only': 1, 'inactive': 2}


def normalizar(apps, schema_editor):
    Preferencia = apps.get_model('dashboard', 'NotificationPreference')
    Excepcion = apps.get_model('dashboard', 'ScheduleException')

    for pref in list(Preferencia.objects.all()):
        canal = CANALES.get(pref.channel, pref.channel)
        estado = ESTADOS.get(pref.state, pref.state)
        if canal == pref.channel and estado == pref.state:
            continue
        existente = Preferencia.objects.filter(
            user_id=pref.user_id, channel=canal).exclude(pk=pref.pk).first()
        if existente:
            # Conserva el estado más restrictivo al fusionar duplicados.
            estado_existente = ESTADOS.get(existente.state, existente.state)
            if _RANK.get(estado, 0) > _RANK.get(estado_existente, 0):
                existente.state = estado
                existente.save(update_fields=['state'])
            pref.delete()
        else:
            pref.channel = canal
            pref.state = estado
            pref.save(update_fields=['channel', 'state'])

    for exc in list(Excepcion.objects.all()):
        tipo = TIPOS.get(exc.exception_type)
        if not tipo:
            continue
        value = exc.value if isinstance(exc.value, dict) else {}
        if tipo == 'no_days':
            days = value.get('days')
            if not days:
                dia = str(value.get('dia', '')).strip().lower()
                days = [DIAS.get(dia, dia)] if dia else []
            if isinstance(days, str):
                days = [days]
            value = {**value, 'days': [DIAS.get(str(d).strip().lower(), str(d).strip().lower()) for d in days if d]}
        elif tipo == 'no_night' and exc.exception_type in ('descanso', 'noche', 'madrugada'):
            value = {**value, 'etiqueta': exc.exception_type}
        exc.exception_type = tipo
        exc.value = value
        exc.save(update_fields=['exception_type', 'value'])


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0075_notification_proactive_engine'),
    ]

    operations = [
        migrations.RunPython(normalizar, migrations.RunPython.noop),
    ]
