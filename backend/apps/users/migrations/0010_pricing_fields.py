from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0009_stripe_customer_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='studiosettings',
            name='price_casual',
            field=models.DecimalField(decimal_places=2, default=35, max_digits=8),
        ),
        migrations.AddField(
            model_name='studiosettings',
            name='price_season',
            field=models.DecimalField(decimal_places=2, default=270, max_digits=8),
        ),
        migrations.AddField(
            model_name='studiosettings',
            name='price_trial',
            field=models.DecimalField(decimal_places=2, default=25, max_digits=8),
        ),
    ]
