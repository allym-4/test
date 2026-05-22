import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0051_lead_last_contact_at"),
        ("classes", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="skilllevel",
            name="class_category",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="skill_levels",
                to="classes.classcategory",
            ),
        ),
    ]
