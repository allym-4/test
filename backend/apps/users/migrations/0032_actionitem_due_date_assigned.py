from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0031_user_pay_rate'),
    ]

    operations = [
        migrations.AddField(
            model_name='actionitem',
            name='due_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='actionitem',
            name='assigned_to',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='action_items_assigned',
                to='users.user',
            ),
        ),
    ]
