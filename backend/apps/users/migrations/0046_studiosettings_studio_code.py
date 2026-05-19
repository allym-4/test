from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0045_studiosettings_description'),
    ]

    operations = [
        migrations.AddField(
            model_name='studiosettings',
            name='studio_code',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
