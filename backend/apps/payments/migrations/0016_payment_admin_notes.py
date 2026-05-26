from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0015_add_payment_plan_stripe_pm'),
    ]

    operations = [
        migrations.AddField(
            model_name='payment',
            name='admin_notes',
            field=models.TextField(blank=True),
        ),
    ]
