from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0023_seed_rooms'),
    ]

    operations = [
        migrations.AddField(
            model_name='season',
            name='go_live_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='season',
            name='bookings_enabled',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='season',
            name='archived',
            field=models.BooleanField(default=False),
        ),
    ]
