from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('payments', '0004_membershiptype_package_giftcard_studentpackage')]
    operations = [
        migrations.CreateModel(
            name='PromoCode',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(max_length=50, unique=True)),
                ('discount_type', models.CharField(choices=[('percentage', 'Percentage'), ('fixed', 'Fixed Amount')], max_length=10)),
                ('discount_value', models.DecimalField(decimal_places=2, max_digits=8)),
                ('applies_to', models.CharField(choices=[('all', 'All Classes'), ('season', 'Season Enrolment'), ('casual', 'Casual / Drop-in'), ('workshop', 'Workshops & Events')], default='all', max_length=20)),
                ('max_uses', models.PositiveIntegerField(blank=True, null=True)),
                ('current_uses', models.PositiveIntegerField(default=0)),
                ('is_active', models.BooleanField(default=True)),
                ('expires_at', models.DateField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={'ordering': ['-created_at']},
        ),
    ]
