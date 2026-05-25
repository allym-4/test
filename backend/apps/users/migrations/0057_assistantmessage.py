from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0056_user_blocked_at'),
    ]

    operations = [
        migrations.CreateModel(
            name='AssistantMessage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('role', models.CharField(max_length=10)),
                ('content', models.TextField()),
                ('escalated', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='assistant_messages', to='users.user')),
            ],
            options={
                'ordering': ['created_at'],
            },
        ),
    ]
