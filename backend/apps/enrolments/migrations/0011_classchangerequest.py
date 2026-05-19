import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("enrolments", "0010_add_trial_feedback"),
        ("classes", "0021_add_first_timer_fields"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ClassChangeRequest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("notes", models.TextField(blank=True)),
                ("status", models.CharField(
                    choices=[("pending", "Pending"), ("approved", "Approved"), ("rejected", "Rejected")],
                    default="pending",
                    max_length=10,
                )),
                ("admin_notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("resolved_at", models.DateTimeField(blank=True, null=True)),
                ("student", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="change_requests",
                    to=settings.AUTH_USER_MODEL,
                )),
                ("current_enrolment", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="change_requests",
                    to="enrolments.enrolment",
                )),
                ("requested_session", models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="incoming_change_requests",
                    to="classes.classsession",
                )),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
