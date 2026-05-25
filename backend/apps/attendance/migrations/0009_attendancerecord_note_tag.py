from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('attendance', '0008_makeupcredit_source_occurrence'),
    ]

    operations = [
        migrations.AddField(
            model_name='attendancerecord',
            name='note_tag',
            field=models.CharField(
                blank=True,
                choices=[('general', 'General'), ('injury', 'Injury'), ('vibes', 'Vibes')],
                default='',
                max_length=20,
            ),
        ),
    ]
