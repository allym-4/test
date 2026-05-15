from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0011_occurrence_cover_needed'),
        ('users', '0026_mailchimp_xero_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='mediaitem',
            name='session',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='media_items',
                to='classes.classsession',
            ),
        ),
    ]
