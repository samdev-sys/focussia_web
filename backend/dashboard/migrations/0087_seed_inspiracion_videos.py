from django.db import migrations


# Video público y estable usado como marcador inicial; el administrador
# reemplaza cada enlace desde el panel con el contenido oficial de Focusia.
PLACEHOLDER_YOUTUBE = 'https://www.youtube.com/watch?v=jNQXAC9IVRw'

CATEGORIAS = [
    ('humor', 'Humor'),
    ('salud', 'Salud'),
    ('hobbies', 'Hobbies'),
    ('viajes', 'Viajes'),
    ('diversion', 'Diversión'),
    ('reflexion', 'Reflexión'),
]


def seed(apps, schema_editor):
    InspiracionVideo = apps.get_model('dashboard', 'InspiracionVideo')
    if InspiracionVideo.objects.exists():
        return
    objs = []
    for key, label in CATEGORIAS:
        for i in range(1, 7):
            objs.append(InspiracionVideo(
                categoria=key,
                titulo=f'{label} · Inspiración {i}',
                miniatura_url='',
                youtube_url=PLACEHOLDER_YOUTUBE,
                orden=i,
                activo=True,
            ))
    InspiracionVideo.objects.bulk_create(objs)


def unseed(apps, schema_editor):
    InspiracionVideo = apps.get_model('dashboard', 'InspiracionVideo')
    InspiracionVideo.objects.filter(youtube_url=PLACEHOLDER_YOUTUBE).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0086_inspiracion_video'),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
