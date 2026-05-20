from django.db import migrations

ROOMS = [
    {
        'name': 'RHAPSODY',
        'poles': '14',
        'features': [
            '14 × 38mm brass 3.4m spin/static poles',
            'Every pole in view of a mirror and teacher',
            '2.6m high mirrors',
            'Cushioned, shock absorbing, specialist torquet flooring',
            'Custom, colour controlled lighting',
            'Holographic windows',
            'Super spacious with at least 2.4m between each pole',
            'Ducted air conditioning',
            'State of the art speakers for crisp audio',
            'Studio mats and blocks for use',
        ],
    },
    {
        'name': 'THE BOX',
        'poles': '11',
        'features': [
            '11 × 38mm brass 3.4m spin/static poles',
            'Every pole in view of a mirror and teacher',
            '2.6m high mirrors',
            'Cushioned, shock absorbing, specialist hybrid flooring',
            'Custom, colour controlled lighting',
            'Complete blackout allowing full lighting control',
            'Super spacious with at least 2.1m between each pole',
            'Ducted air conditioning',
            'State of the art speakers for crisp audio',
            'Studio mats and blocks for use',
        ],
    },
    {
        "name": "JANITOR'S CLOSET",
        'poles': '3',
        'features': [
            '3 × 38mm brass 3.4m spin/static poles',
            'Perfect for private lessons and competition practice',
            '2.6m high mirrors',
            'Cushioned, shock absorbing, specialist hybrid flooring',
            'Custom, colour controlled lighting',
            'Holographic windows',
            'Super spacious with at least 2.1m between each pole',
            'Ducted air conditioning',
            'Studio mats and blocks for use',
        ],
    },
]


def seed_rooms(apps, schema_editor):
    Studio = apps.get_model('classes', 'Studio')
    if Studio.objects.exists():
        return
    for room in ROOMS:
        Studio.objects.create(**room)


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0022_studio_features_jsonfield'),
    ]

    operations = [
        migrations.RunPython(seed_rooms, migrations.RunPython.noop),
    ]
