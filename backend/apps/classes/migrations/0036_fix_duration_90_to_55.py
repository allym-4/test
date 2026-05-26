from django.db import migrations


def fix_duration(apps, schema_editor):
    ClassSession = apps.get_model('classes', 'ClassSession')
    ClassSession.objects.filter(duration_minutes=90).update(duration_minutes=55)


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0035_defaults_duration_studio_poles'),
    ]

    operations = [
        migrations.RunPython(fix_duration, migrations.RunPython.noop),
    ]
