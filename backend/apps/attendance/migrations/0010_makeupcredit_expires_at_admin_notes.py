from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('attendance', '0009_attendancerecord_note_tag'),
    ]

    operations = [
        migrations.AddField(
            model_name='makeupcredit',
            name='expires_at',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='makeupcredit',
            name='admin_notes',
            field=models.TextField(blank=True),
        ),
    ]
