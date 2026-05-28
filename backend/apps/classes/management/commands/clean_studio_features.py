from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Clean corrupted features data before migration 0022'

    def handle(self, *args, **options):
        self.stdout.write('Cleaning studio features data...')

        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    UPDATE classes_studio
                    SET features = '[]'
                """)
                count = cursor.rowcount
            self.stdout.write(self.style.SUCCESS(f'Cleaned {count} studio records'))
        except Exception:
            self.stdout.write('Table not yet created — skipping.')
