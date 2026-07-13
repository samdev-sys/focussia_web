from django.db import migrations

def seed_categorias(apps, schema_editor):
    CategoriaRueda = apps.get_model('dashboard', 'CategoriaRueda')
    categorias = [
        {'nombre': 'Salud', 'icono': '💪', 'orden': 1},
        {'nombre': 'Dinero', 'icono': '💰', 'orden': 2},
        {'nombre': 'Amistad', 'icono': '🤝', 'orden': 3},
        {'nombre': 'Amor', 'icono': '❤️', 'orden': 4},
        {'nombre': 'Familia', 'icono': '👨‍👩‍👧‍👦', 'orden': 5},
        {'nombre': 'Trabajo', 'icono': '💼', 'orden': 6},
        {'nombre': 'Crecimiento', 'icono': '🌱', 'orden': 7},
        {'nombre': 'Ocio', 'icono': '🎮', 'orden': 8},
    ]
    for cat in categorias:
        CategoriaRueda.objects.get_or_create(
            nombre=cat['nombre'],
            defaults=cat
        )

class Migration(migrations.Migration):
    dependencies = [
        ('dashboard', '0010_recordatorio_tomado'),
    ]
    operations = [
        migrations.RunPython(seed_categorias),
    ]
