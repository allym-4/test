from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("classes", "0011_occurrence_cover_needed"),
    ]

    operations = [
        migrations.AddField(
            model_name="locker",
            name="key_issued",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="locker",
            name="key_lost",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="locker",
            name="locker_type",
            field=models.CharField(
                choices=[("complimentary", "Complimentary"), ("paid", "Paid")],
                default="complimentary",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="locker",
            name="payment_type",
            field=models.CharField(
                blank=True,
                choices=[
                    ("4_class_perk", "4-Class Perk"),
                    ("cash", "Cash"),
                    ("card", "Card"),
                ],
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="locker",
            name="payment_status",
            field=models.CharField(
                choices=[
                    ("paid", "Paid"),
                    ("unpaid", "Unpaid"),
                    ("waived", "Waived"),
                ],
                default="unpaid",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="locker",
            name="key_lost_fee_paid",
            field=models.BooleanField(default=False),
        ),
    ]
