from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0007_payment_plan_pending_approval'),
    ]

    operations = [
        migrations.AddField(
            model_name='giftcard',
            name='redeemed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
