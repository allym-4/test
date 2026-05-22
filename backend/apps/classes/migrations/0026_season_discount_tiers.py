from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0025_classsession_description_created_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='season',
            name='discount_tiers',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
