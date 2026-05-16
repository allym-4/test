from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0013_practice_time'),
        ('payments', '0009_giftcard_buyer_details'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='CancellationOffer',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('credit_amount', models.DecimalField(decimal_places=2, max_digits=6)),
                ('status', models.CharField(
                    choices=[
                        ('pending', 'Pending'),
                        ('accepted_credit', 'Accepted — Account Credit'),
                        ('accepted_makeup', 'Accepted — Makeup Class'),
                        ('expired', 'Expired'),
                    ],
                    default='pending',
                    max_length=20,
                )),
                ('email_sent', models.BooleanField(default=False)),
                ('resolved_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('occurrence', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='cancellation_offers',
                    to='classes.classoccurrence',
                )),
                ('student', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='cancellation_offers',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['-created_at'],
                'unique_together': {('student', 'occurrence')},
            },
        ),
    ]
