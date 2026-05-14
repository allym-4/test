from django.db import migrations


def set_prices(apps, schema_editor):
    StudioSettings = apps.get_model('users', 'StudioSettings')
    StudioSettings.objects.filter(pk=1).update(price_casual=40, price_trial=35)


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0010_pricing_fields'),
    ]

    operations = [
        migrations.RunPython(set_prices, migrations.RunPython.noop),
    ]
