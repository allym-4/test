from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0024_season_go_live_bookings_enabled_archived'),
    ]

    operations = [
        migrations.AddField(
            model_name='classsession',
            name='description',
            field=models.TextField(blank=True, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='classsession',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
    ]
