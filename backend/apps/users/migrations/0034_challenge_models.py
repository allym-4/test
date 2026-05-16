from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0033_user_notification_preferences'),
    ]

    operations = [
        migrations.CreateModel(
            name='Challenge',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200)),
                ('description', models.TextField(blank=True)),
                ('challenge_type', models.CharField(
                    choices=[
                        ('attendance_count', 'Attend X classes'),
                        ('style_variety', 'Try X different class styles'),
                        ('streak', 'X weeks in a row'),
                        ('custom', 'Custom (manual completion)'),
                    ],
                    default='attendance_count',
                    max_length=30,
                )),
                ('target_value', models.PositiveIntegerField(default=1)),
                ('start_date', models.DateField()),
                ('end_date', models.DateField()),
                ('reward_type', models.CharField(
                    choices=[('badge', 'Badge'), ('credit', 'Account credit'), ('none', 'No reward')],
                    default='badge',
                    max_length=20,
                )),
                ('reward_badge_name', models.CharField(blank=True, max_length=100)),
                ('reward_credit_amount', models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={'ordering': ['-start_date']},
        ),
        migrations.CreateModel(
            name='ChallengeProgress',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('current_value', models.PositiveIntegerField(default=0)),
                ('completed', models.BooleanField(default=False)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('challenge', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='progress', to='users.challenge')),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='challenge_progress', to='users.user')),
            ],
            options={'ordering': ['-current_value'], 'unique_together': {('challenge', 'student')}},
        ),
    ]
