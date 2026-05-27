from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('attendance', '0010_makeupcredit_expires_at_admin_notes'),
    ]

    operations = [
        migrations.AddField(
            model_name='attendancerecord',
            name='kisi_access_granted',
            field=models.BooleanField(default=False),
        ),
    ]
