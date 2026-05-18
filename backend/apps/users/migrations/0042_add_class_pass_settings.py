from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0041_add_booking_blocked"),
    ]

    operations = [
        migrations.AddField(
            model_name="studiosettings",
            name="class_pass_size",
            field=models.PositiveIntegerField(default=4),
        ),
        migrations.AddField(
            model_name="studiosettings",
            name="price_class_pass",
            field=models.DecimalField(decimal_places=2, default=120, max_digits=8),
        ),
    ]
