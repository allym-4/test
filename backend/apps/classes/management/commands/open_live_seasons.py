from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = 'Auto-open season bookings when go_live_at datetime is reached'

    def handle(self, *args, **options):
        from apps.classes.models import Season
        from apps.users.models import Notification, User

        now = timezone.now()
        to_open = Season.objects.filter(
            go_live_at__lte=now,
            bookings_open=False,
            status__in=('upcoming', 'active'),
        )

        opened = 0
        for season in to_open:
            season.bookings_open = True
            season.save(update_fields=['bookings_open'])

            students = User.objects.filter(role='student', is_active=True)
            notifs = [
                Notification(
                    recipient=student,
                    title=f'{season.name} bookings are now open!',
                    body=(
                        f'Enrolments for {season.name} are now open. '
                        'Book your spot before classes fill up!'
                    ),
                    notification_type='info',
                    action_label='Book Now',
                    action_url='/portal/book',
                )
                for student in students
            ]
            Notification.objects.bulk_create(notifs, ignore_conflicts=True)
            opened += 1

        self.stdout.write(f'open_live_seasons: {opened} season(s) opened')
