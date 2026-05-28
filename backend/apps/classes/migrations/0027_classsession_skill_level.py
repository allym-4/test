from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0026_practicecredit'),
        ('users', '0013_skillgroup_skilllevel_tag_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='classsession',
            name='skill_level',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='class_sessions',
                to='users.skilllevel',
            ),
        ),
    ]
