from django.core.management.base import BaseCommand
from django.core.management import call_command


class Command(BaseCommand):
    help = 'Run all daily scheduled tasks'

    def handle(self, *args, **options):
        tasks = [
            'open_live_seasons',
            'check_locker_capacity',
            'send_locker_renewal_reminders',
            'send_season_reminders',
            'send_class_reminders',
            'send_cover_needed_alerts',
            'send_underenrolled_alerts',
            'send_unmarked_attendance_alerts',
            'complete_past_seasons',
            'auto_charge_cash',
            'remind_unenrolled',
            'charge_due_instalments',
            'notify_upcoming_casual_open',
        ]
        for task in tasks:
            self.stdout.write(f'→ {task}')
            try:
                call_command(task)
            except Exception as e:
                self.stderr.write(f'  ERROR: {e}')
        self.stdout.write('Daily tasks complete.')
