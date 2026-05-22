from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0052_skilllevel_class_category'),
    ]

    operations = [
        migrations.AddField(
            model_name='studiosettings',
            name='kisi_enrolment_place_id',
            field=models.CharField(blank=True, help_text='Kisi place ID for the "Duality Babes" group — auto-granted on enrolment', max_length=200),
        ),
        migrations.AddField(
            model_name='studiosettings',
            name='kisi_practice_place_id',
            field=models.CharField(blank=True, help_text='Kisi place ID for the "Practice Time" group — auto-granted on practice booking', max_length=200),
        ),
    ]
