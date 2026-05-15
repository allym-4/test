from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('users', '0028_user_auto_charge_fields'),
    ]
    operations = [
        migrations.AddField(
            model_name='studiosettings',
            name='overdue_reminder_schedule',
            field=models.JSONField(blank=True, default=list, help_text='List of {days, send_email} dicts. days=0 means first reminder; for N>0, days since prev reminder.'),
        ),
        migrations.AddField(
            model_name='emailcampaign',
            name='body',
            field=models.TextField(blank=True, default=''),
            preserve_default=False,
        ),
    ]
