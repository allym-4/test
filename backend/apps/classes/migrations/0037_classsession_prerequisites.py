from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0036_fix_duration_90_to_55'),
    ]

    operations = [
        migrations.AddField(
            model_name='classsession',
            name='prerequisites',
            field=models.TextField(blank=True, help_text='What students need to know or be able to do before joining this class.'),
        ),
    ]
