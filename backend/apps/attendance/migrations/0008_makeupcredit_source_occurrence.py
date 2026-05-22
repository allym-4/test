from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('attendance', '0007_add_pending_attendance_status'),
        ('classes', '0026_practicecredit'),
    ]

    operations = [
        migrations.AddField(
            model_name='makeupcredit',
            name='source_occurrence',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='issued_credits',
                to='classes.classoccurrence',
            ),
        ),
    ]
