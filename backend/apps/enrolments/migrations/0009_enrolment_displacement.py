import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0017_season_published_at_casualbooking_displacement'),
        ('enrolments', '0008_merge_20260517_1643'),
    ]

    operations = [
        migrations.AlterField(
            model_name='enrolment',
            name='status',
            field=models.CharField(
                choices=[
                    ('active', 'Active'),
                    ('waitlisted', 'Waitlisted'),
                    ('completed', 'Completed'),
                    ('cancelled', 'Cancelled'),
                    ('suspended', 'Suspended'),
                    ('exemption_requested', 'Exemption Requested'),
                    ('pending_displacement', 'Pending Displacement'),
                ],
                default='active',
                max_length=22,
            ),
        ),
        migrations.AddField(
            model_name='enrolment',
            name='displacement_casual_booking',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='pending_enrolments',
                to='classes.casualbooking',
            ),
        ),
        migrations.AddField(
            model_name='enrolment',
            name='displacement_expires_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
