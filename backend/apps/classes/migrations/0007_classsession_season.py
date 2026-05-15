from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0006_classcategory_studio_capacity_studio_features_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='classsession',
            name='season',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='sessions', to='classes.season'),
        ),
    ]
