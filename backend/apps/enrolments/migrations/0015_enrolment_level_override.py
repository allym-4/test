from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('enrolments', '0014_enrolment_waitlist_position'),
    ]

    operations = [
        migrations.AddField(
            model_name='enrolment',
            name='level_override',
            field=models.BooleanField(default=False),
        ),
    ]
