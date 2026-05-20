from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0021_add_first_timer_fields'),
    ]

    operations = [
        migrations.AlterField(
            model_name='studio',
            name='features',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
