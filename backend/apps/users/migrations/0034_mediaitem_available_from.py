from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0033_notification_warning_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='mediaitem',
            name='available_from',
            field=models.DateField(blank=True, null=True),
        ),
    ]
