from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0014_locker_key_returned'),
    ]

    operations = [
        migrations.AddField(
            model_name='classcategory',
            name='is_addon_type',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='classcategory',
            name='standalone_price',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True),
        ),
    ]
