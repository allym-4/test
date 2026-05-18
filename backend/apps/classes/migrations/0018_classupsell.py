from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0017_season_published_at_casualbooking_displacement'),
    ]

    operations = [
        migrations.CreateModel(
            name='ClassUpsell',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('headline', models.CharField(max_length=200)),
                ('body', models.TextField(blank=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('source_session', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='upsells', to='classes.classsession')),
                ('suggested_session', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='upsell_suggestions', to='classes.classsession')),
            ],
            options={
                'ordering': ['created_at'],
                'unique_together': {('source_session', 'suggested_session')},
            },
        ),
    ]
