from django.apps import AppConfig

class EnrolmentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.enrolments'

    def ready(self):
        import apps.enrolments.signals  # noqa
