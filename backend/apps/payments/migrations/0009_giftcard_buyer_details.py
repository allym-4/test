from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0008_giftcard_redeemed_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='giftcard',
            name='purchased_by_name',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='giftcard',
            name='purchased_by_phone',
            field=models.CharField(blank=True, max_length=30),
        ),
        migrations.AddField(
            model_name='giftcard',
            name='payment_type',
            field=models.CharField(
                blank=True,
                choices=[('cash', 'Cash'), ('card', 'Card'), ('eftpos', 'EFTPOS')],
                default='',
                max_length=20,
            ),
        ),
    ]
