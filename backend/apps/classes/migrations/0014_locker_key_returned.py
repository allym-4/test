from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0013_practice_time'),
    ]

    operations = [
        migrations.AddField(
            model_name='locker',
            name='key_returned',
            field=models.BooleanField(default=False),
        ),
    ]
