from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('enrolments', '0005_add_trial_type_and_onboarding_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='enrolment',
            name='waitlist_offered_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='enrolment',
            name='waitlist_expires_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='enrolment',
            name='waitlist_urgent',
            field=models.BooleanField(default=False),
        ),
    ]
