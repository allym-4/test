from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0026_season_discount_tiers'),
    ]

    operations = [
        migrations.AlterField(
            model_name='locker',
            name='payment_status',
            field=models.CharField(
                choices=[
                    ('paid', 'Paid'),
                    ('unpaid', 'Unpaid'),
                    ('waived', 'Waived'),
                    ('invoiced', 'Invoiced'),
                ],
                default='unpaid',
                max_length=20,
            ),
        ),
    ]
