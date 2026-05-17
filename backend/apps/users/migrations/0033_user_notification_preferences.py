from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0032_actionitem_due_date_assigned'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='notification_preferences',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
