from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0012_locker_fields'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='PracticeSlot',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('start_time', models.TimeField()),
                ('end_time', models.TimeField()),
                ('capacity', models.PositiveIntegerField(default=6)),
                ('is_active', models.BooleanField(default=True)),
                ('notes', models.CharField(blank=True, max_length=200)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('studio', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='practice_slots', to='classes.studio')),
            ],
            options={
                'ordering': ['date', 'start_time'],
                'unique_together': {('studio', 'date', 'start_time')},
            },
        ),
        migrations.CreateModel(
            name='PracticeBooking',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[('confirmed', 'Confirmed'), ('cancelled', 'Cancelled')], default='confirmed', max_length=15)),
                ('price_charged', models.DecimalField(decimal_places=2, default=0, max_digits=6)),
                ('is_free', models.BooleanField(default=False)),
                ('payment_type', models.CharField(blank=True, max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('slot', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='bookings', to='classes.practiceslot')),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='practice_bookings', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
                'unique_together': {('slot', 'student')},
            },
        ),
    ]
