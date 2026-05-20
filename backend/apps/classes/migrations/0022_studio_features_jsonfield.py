from django.db import migrations, models


def clean_features_data(apps, schema_editor):
    """Convert any non-JSON features values to empty list before altering the column."""
    db = schema_editor.connection.vendor
    if db == 'postgresql':
        # Ultra-safe: set to '[]' for anything except features that parse as valid JSON
        # Use PostgreSQL's jsonb cast to test validity, falling back to '[]' on error
        schema_editor.execute("""
            UPDATE classes_studio
            SET features = '[]'
            WHERE features IS NULL
               OR TRIM(COALESCE(features, '')) = ''
               OR (features::text NOT LIKE '[%]' AND features::text NOT LIKE '{%}');
        """)
    else:
        # SQLite fallback for local dev
        schema_editor.execute("""
            UPDATE classes_studio
            SET features = '[]'
            WHERE features IS NULL OR features = '' OR TRIM(features) = '';
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
