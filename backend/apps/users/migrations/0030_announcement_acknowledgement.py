from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0029_overdue_schedule_campaign_body'),
    ]
    operations = [
        migrations.AddField(
            model_name='announcement',
            name='requires_acknowledgement',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='announcement',
            name='acknowledged_by',
            field=models.ManyToManyField(
                blank=True,
                related_name='acknowledged_announcements',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
