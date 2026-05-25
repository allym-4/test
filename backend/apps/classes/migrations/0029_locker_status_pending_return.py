from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0028_merge_20260525_1254'),
    ]

    operations = [
        migrations.AddField(
            model_name='locker',
            name='status',
            field=models.CharField(
                choices=[('active', 'Active'), ('pending_return', 'Pending Return')],
                default='active',
                max_length=20,
            ),
        ),
    ]
