from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0050_add_instructor_profile_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="lead",
            name="last_contact_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
