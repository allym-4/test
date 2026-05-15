from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0027_mediaitem_session'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='default_payment_method_id',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='user',
            name='auto_charge_saved_card',
            field=models.BooleanField(default=False),
        ),
    ]
