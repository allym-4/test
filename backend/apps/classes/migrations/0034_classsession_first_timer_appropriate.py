from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0033_add_casual_waitlist_rejected'),
    ]

    operations = [
        migrations.AddField(
            model_name='classsession',
            name='first_timer_appropriate',
            field=models.BooleanField(default=False, help_text='Mark this class as suitable for absolute first timers — no prior pole experience needed.'),
        ),
    ]
