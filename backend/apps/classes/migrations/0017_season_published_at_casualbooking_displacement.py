from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0016_casualbooking'),
    ]

    operations = [
        migrations.AddField(
            model_name='season',
            name='published_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='casualbooking',
            name='displacement_offered_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='casualbooking',
            name='displacement_expires_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
