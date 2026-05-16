from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0032_actionitem_due_date_assigned'),
    ]

    operations = [
        migrations.AlterField(
            model_name='notification',
            name='notification_type',
            field=models.CharField(
                choices=[
                    ('reminder', 'Reminder'),
                    ('waitlist', 'Waitlist'),
                    ('payment', 'Payment'),
                    ('form', 'Form'),
                    ('info', 'Info'),
                    ('message', 'Message'),
                    ('cancellation', 'Cancellation'),
                    ('warning', 'Warning'),
                ],
                default='info',
                max_length=20,
            ),
        ),
    ]
