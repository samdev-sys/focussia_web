from django.db import migrations


def seed_avatars(apps, schema_editor):
    Avatar = apps.get_model('dashboard', 'Avatar')
    avatars = [
        {
            'name': 'John',
            'gender': 'male',
            'image': '/avartars/John.jpeg',
            'voice_id': 'troy',
            'intro_message_text': 'Hola, [nombre]. Desde ahora voy a acompañarte a construir la versión de ti que estás buscando.',
            'intro_message_audio': '/voces%20avatar/john.mp3',
        },
        {
            'name': 'Conrad',
            'gender': 'male',
            'image': '/avartars/conrad.jpeg',
            'voice_id': 'troy',
            'intro_message_text': 'Hola, [nombre]. Desde ahora voy a acompañarte a construir la versión de ti que estás buscando.',
            'intro_message_audio': '/voces%20avatar/conrad_voice.mp3',
        },
        {
            'name': 'Ashley',
            'gender': 'male',
            'image': '/avartars/Ashley.jpeg',
            'voice_id': 'hannah',
            'intro_message_text': 'Hola, [nombre]. Desde ahora voy a acompañarte a construir la versión de ti que estás buscando.',
            'intro_message_audio': '/voces%20avatar/ashley_voice.mp3',
        },
        {
            'name': 'Lia',
            'gender': 'female',
            'image': '/avartars/Lia.jpeg',
            'voice_id': 'hannah',
            'intro_message_text': 'Hola, [nombre]. Desde ahora voy a acompañarte a construir la versión de ti que estás buscando.',
            'intro_message_audio': '/voces%20avatar/lia_voice.mp3',
        },
        {
            'name': 'Monroe',
            'gender': 'female',
            'image': '/avartars/Monroe.jpeg',
            'voice_id': 'troy',
            'intro_message_text': 'Hola, [nombre]. Desde ahora voy a acompañarte a construir la versión de ti que estás buscando.',
            'intro_message_audio': '/voces%20avatar/monroe_voice.mp3',
        },
        {
            'name': 'Sophya',
            'gender': 'female',
            'image': '/avartars/Sophya.jpeg',
            'voice_id': 'hannah',
            'intro_message_text': 'Hola, [nombre]. Desde ahora voy a acompañarte a construir la versión de ti que estás buscando.',
            'intro_message_audio': '/voces%20avatar/sophya_voice.mp3',
        },
    ]
    for data in avatars:
        Avatar.objects.get_or_create(name=data['name'], defaults=data)


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0037_avatar_onboardingprofile'),
    ]

    operations = [
        migrations.RunPython(seed_avatars, reverse_code=migrations.RunPython.noop),
    ]
