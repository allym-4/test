from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0057_assistantmessage'),
    ]

    operations = [
        migrations.AddField(
            model_name='studiosettings',
            name='locker_carry_over_paused',
            field=models.BooleanField(
                default=False,
                help_text='When True, the automatic locker carry-over reminder is paused (e.g. capacity issue detected).',
            ),
        ),
    ]
