from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("enrolments", "0011_classchangerequest"),
        ("helpdesk", "0005_faq"),
    ]
    operations = [
        migrations.AddField(
            model_name="classchangerequest",
            name="ticket",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="change_requests",
                to="helpdesk.ticket",
            ),
        ),
    ]
