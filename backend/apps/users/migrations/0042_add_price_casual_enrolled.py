from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0041_add_booking_blocked'),
    ]

    operations = [
        migrations.AddField(
            model_name='studiosettings',
            name='price_casual_enrolled',
            field=models.DecimalField(decimal_places=2, default=30, max_digits=8),
        ),
    ]
