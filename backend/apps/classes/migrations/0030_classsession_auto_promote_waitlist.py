from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0029_locker_status_pending_return'),
    ]

    operations = [
        migrations.AddField(
            model_name='classsession',
            name='auto_promote_waitlist',
            field=models.BooleanField(default=False, help_text='When enabled, the next waitlisted student is automatically enrolled when a spot opens instead of receiving an offer to claim.'),
        ),
    ]
