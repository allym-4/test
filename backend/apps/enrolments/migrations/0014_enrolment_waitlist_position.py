from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('enrolments', '0013_add_request_type_cancel_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='enrolment',
            name='waitlist_position',
            field=models.PositiveIntegerField(null=True, blank=True),
        ),
    ]
