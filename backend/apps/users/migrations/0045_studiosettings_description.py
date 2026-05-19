from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0044_user_level"),
    ]

    operations = [
        migrations.AddField(
            model_name="studiosettings",
            name="description",
            field=models.TextField(blank=True),
        ),
    ]
