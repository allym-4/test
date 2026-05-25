from datetime import date
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.classes.models import Season, SeasonNotificationInterest


class Command(BaseCommand):
    help = 'Send casual-bookings-open emails to students who registered interest for upcoming season'

    def handle(self, *args, **options):
        # Find upcoming season(s) where the active season is now in week 8+
        active_season = Season.objects.filter(status='active').order_by('-start_date').first()
        if not active_season or not active_season.start_date:
            return

        active_week = (date.today() - active_season.start_date).days // 7 + 1
        if active_week < 8:
            self.stdout.write(f'Active season is in week {active_week} — not yet week 8, skipping.')
            return

        upcoming_seasons = Season.objects.filter(status='upcoming')
        if not upcoming_seasons.exists():
            return

        from apps.users.email_utils import send_branded_email
        sent = 0
        for season in upcoming_seasons:
            interests = SeasonNotificationInterest.objects.filter(
                season=season,
                notified_at__isnull=True,
            )
            for interest in interests:
                name = interest.first_name or 'hey you'
                try:
                    send_branded_email(
                        to_email=interest.email,
                        subject=f'Casuals are open — {season.name} starts next week!',
                        template_name='casual_bookings_open',
                        context={
                            'first_name': name,
                            'season_name': season.name,
                            'season_start': season.start_date.strftime('%-d %B') if season.start_date else '',
                            'booking_url': 'https://dualitypole.com.au/portal/book',
                        },
                    )
                    interest.notified_at = timezone.now()
                    interest.save(update_fields=['notified_at'])
                    sent += 1
                except Exception as e:
                    self.stderr.write(f'  Failed to email {interest.email}: {e}')

        self.stdout.write(f'Sent {sent} casual open notification(s).')
