from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0030_announcement_acknowledgement'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='pay_rate',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Per-class pay rate for instructors',
                max_digits=8,
                null=True,
            ),
        ),
    ]
