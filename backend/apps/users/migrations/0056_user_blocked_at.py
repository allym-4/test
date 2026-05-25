from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0055_cleared_for_level'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='blocked_at',
            field=models.DateTimeField(blank=True, null=True, help_text='When booking_blocked was last set to True'),
        ),
    ]
