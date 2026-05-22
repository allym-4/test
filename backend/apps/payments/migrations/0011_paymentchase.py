from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0010_cancellation_offer'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='PaymentChase',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('step', models.PositiveSmallIntegerField(choices=[(1, '1st Chase — Friendly reminder'), (2, '2nd Chase — Firm notice'), (3, 'Final warning — Account lock')])),
                ('message', models.TextField()),
                ('locked_account', models.BooleanField(default=False)),
                ('sent_at', models.DateTimeField(auto_now_add=True)),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='payment_chases', to=settings.AUTH_USER_MODEL)),
                ('sent_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='chases_sent', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-sent_at']},
        ),
    ]
