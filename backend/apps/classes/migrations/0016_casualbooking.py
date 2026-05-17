from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0015_classcategory_addon_pricing'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='CasualBooking',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('enrolment_type', models.CharField(choices=[('casual', 'Casual'), ('catchup', 'Catchup')], default='casual', max_length=10)),
                ('status', models.CharField(choices=[('confirmed', 'Confirmed'), ('waitlisted', 'Waitlisted'), ('cancelled', 'Cancelled')], default='confirmed', max_length=15)),
                ('price_charged', models.DecimalField(decimal_places=2, default=0, max_digits=6)),
                ('is_free', models.BooleanField(default=False)),
                ('waitlist_offered_at', models.DateTimeField(blank=True, null=True)),
                ('waitlist_expires_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('occurrence', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='casual_bookings', to='classes.classoccurrence')),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='casual_bookings', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
                'unique_together': {('occurrence', 'student')},
            },
        ),
    ]
