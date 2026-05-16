from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [('enrolments', '0006_alter_enrolment_enrolment_type')]
    operations = [migrations.AddField(model_name='enrolment', name='flag_dismissed', field=models.BooleanField(default=False))]
