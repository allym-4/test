from django.db import migrations, models


def clean_features_data(apps, schema_editor):
    """Convert ALL features values to empty list before altering the column.

    This is a destructive operation but necessary to fix corrupted JSON data
    in production. Features can be re-configured after migration completes.
    """
    # Nuclear option: set ALL features to '[]' to guarantee no bad JSON
    schema_editor.execute("""
        UPDATE classes_studio
        SET features = '[]';
    """)


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0021_add_first_timer_fields'),
    ]

    operations = [
        migrations.RunPython(clean_features_data, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='studio',
            name='features',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
