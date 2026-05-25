from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0058_studiosettings_locker_carry_over_paused'),
    ]

    operations = [
        migrations.AddField(
            model_name='studentskill',
            name='instructor_status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pending Review'),
                    ('approved', 'Approved'),
                    ('not_quite', 'Not Quite Yet'),
                    ('not_approved', 'Not Approved'),
                ],
                default='pending',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='studentskill',
            name='is_focus',
            field=models.BooleanField(default=False),
        ),
    ]
