from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Run all daily scheduled tasks: overdue instalments, season completion, credit expiry'

    def handle(self, *args, **options):
        from django.core.management import call_command

        self.stdout.write('=== Daily Tasks ===')

        self.stdout.write('-- Marking overdue instalments --')
        call_command('mark_overdue_payments')

        self.stdout.write('-- Completing past seasons --')
        call_command('complete_past_seasons')

        self.stdout.write('-- Expiring season-less makeup credits --')
        call_command('expire_makeup_credits')

        self.stdout.write('-- Sending class reminders --')
        call_command('send_class_reminders')

        self.stdout.write('-- Sending season renewal reminders --')
        call_command('send_season_reminders')

        self.stdout.write('-- Sending cover needed alerts --')
        call_command('send_cover_needed_alerts')

        self.stdout.write('-- Notifying overdue balances --')
        call_command('notify_overdue_balances')

        self.stdout.write('-- Processing waitlist offers (reminders + expiry) --')
        call_command('process_waitlist_offers')

        self.stdout.write('-- Sending locker renewal reminders --')
        call_command('send_locker_renewal_reminders')

        self.stdout.write('-- Running built-in automations (reengagement, welfare, birthday, PAR-Q) --')
        call_command('run_built_in_automations')

        self.stdout.write('-- Auto-charging overdue cash promises --')
        call_command('auto_charge_cash')

        self.stdout.write('=== Done ===')
