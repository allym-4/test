from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0054_instructor_shadow_cleared_block_reason'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='cleared_for_level',
            field=models.CharField(
                blank=True,
                default='',
                help_text='Level student is cleared to attend (may differ from current level)',
                max_length=50,
            ),
            preserve_default=False,
        ),
    ]
