from django.core.management.base import BaseCommand
from apps.users.models import User


TEST_ACCOUNTS = [
    ('admin',  'admin1234'),
    ('chloe',  'chloe1234'),
    ('jess',   'student1234'),
    ('tara',   'student1234'),
    ('dana',   'student1234'),
    ('nina',   'student1234'),
    ('sophie', 'student1234'),
    ('alex',   'student1234'),
    ('riley',  'student1234'),
    ('morgan', 'student1234'),
    ('jade',   'student1234'),
    ('sam',    'student1234'),
]


class Command(BaseCommand):
    help = 'Reset passwords for demo/test accounts'

    def handle(self, *args, **options):
        updated = 0
        for username, password in TEST_ACCOUNTS:
            try:
                user = User.objects.get(username=username)
                user.set_password(password)
                user.save(update_fields=['password'])
                updated += 1
            except User.DoesNotExist:
                pass
        self.stdout.write(self.style.SUCCESS(f'Reset passwords for {updated} test account(s).'))
