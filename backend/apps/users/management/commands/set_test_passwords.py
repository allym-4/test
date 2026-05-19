from django.core.management.base import BaseCommand
from apps.users.models import User


class Command(BaseCommand):
    help = 'Reset passwords for all demo/test accounts'

    def handle(self, *args, **options):
        self.stdout.write('Current users in DB:')
        for u in User.objects.all().order_by('role', 'username'):
            self.stdout.write(f'  {u.username} ({u.role})')

        updated = 0
        for user in User.objects.filter(role='student'):
            user.set_password('student1234')
            user.save(update_fields=['password'])
            self.stdout.write(f'  Reset: {user.username} -> student1234')
            updated += 1

        for user in User.objects.filter(role='instructor'):
            user.set_password('chloe1234')
            user.save(update_fields=['password'])
            self.stdout.write(f'  Reset: {user.username} -> chloe1234')
            updated += 1

        for user in User.objects.filter(role='admin'):
            user.set_password('admin1234')
            user.save(update_fields=['password'])
            self.stdout.write(f'  Reset: {user.username} -> admin1234')
            updated += 1

        self.stdout.write(self.style.SUCCESS(f'Reset passwords for {updated} account(s).'))
