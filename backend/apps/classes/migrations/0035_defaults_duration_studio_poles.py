from django.db import migrations, models


def set_studio_bookable_poles(apps, schema_editor):
    Studio = apps.get_model('classes', 'Studio')
    # Rhapsody: 14 physical poles, 13 bookable (instructor keeps one)
    Studio.objects.filter(name__iexact='rhapsody').update(poles=13)
    # The Box: 11 physical poles, 10 bookable (instructor keeps one)
    Studio.objects.filter(name__iexact='the box').update(poles=10)


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0034_classsession_first_timer_appropriate'),
    ]

    operations = [
        migrations.AlterField(
            model_name='classsession',
            name='duration_minutes',
            field=models.PositiveIntegerField(default=55),
        ),
        migrations.RunPython(set_studio_bookable_poles, migrations.RunPython.noop),
    ]
