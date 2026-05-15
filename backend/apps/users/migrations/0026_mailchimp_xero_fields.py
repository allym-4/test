from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0025_action_item'),
    ]

    operations = [
        migrations.AddField(
            model_name='studiosettings',
            name='mailchimp_api_key',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='studiosettings',
            name='mailchimp_list_id',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='studiosettings',
            name='xero_client_id',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='studiosettings',
            name='xero_client_secret',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='studiosettings',
            name='xero_tenant_id',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='studiosettings',
            name='xero_access_token',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='studiosettings',
            name='xero_refresh_token',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='studiosettings',
            name='xero_token_expires_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
