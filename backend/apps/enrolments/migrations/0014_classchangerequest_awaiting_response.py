from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('enrolments', '0013_add_request_type_cancel_fields'),
    ]

    operations = [
        migrations.AlterField(
            model_name='classchangerequest',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pending'),
                    ('awaiting_response', 'Awaiting Response'),
                    ('approved', 'Approved'),
                    ('rejected', 'Rejected'),
                ],
                default='pending',
                max_length=20,
            ),
        ),
    ]
