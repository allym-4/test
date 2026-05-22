from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0011_paymentchase'),
    ]

    operations = [
        migrations.AddField(
            model_name='payment',
            name='cash_promised_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='payment',
            name='cash_received',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='payment',
            name='cash_reminder_sent_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='payment',
            name='cash_auto_charge_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
