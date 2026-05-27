from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('enrolments', '0019_add_enrolment_auto_promote_rejected'),
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='classchangerequest',
            name='submitted_by',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='change_requests_submitted',
                to='users.user',
            ),
        ),
    ]
