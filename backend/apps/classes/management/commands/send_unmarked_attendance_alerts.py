from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta


class Command(BaseCommand):
    help = 'Notify instructors when a past class has no attendance marked'

    def handle(self, *args, **options):
        from apps.classes.models import ClassOccurrence
        from apps.users.models import Notification

        today = timezone.now().date()
        # Check classes that ended in the past 7 days (re-remind each day until marked)
        lookback = today - timedelta(days=7)

        occurrences = ClassOccurrence.objects.filter(
            date__gte=lookback,
            date__lt=today,
            register_saved=False,
            status='scheduled',
        ).select_related('session', 'session__instructor', 'substitute_instructor')

        alerted = 0

        for occ in occurrences:
            instructor = occ.substitute_instructor or occ.session.instructor
            if not instructor:
                continue

            already_notified = Notification.objects.filter(
                recipient=instructor,
                notification_type='reminder',
                title__contains='Attendance not marked',
                body__contains=occ.session.name,
                body__contains=str(occ.date),
            ).exists()
            if already_notified:
                continue

            day_str = occ.date.strftime('%-d %B')
            time_str = occ.session.start_time.strftime('%I:%M %p').lstrip('0')

            Notification.objects.create(
                recipient=instructor,
                title='Attendance not marked',
                body=(
                    f'The register for {occ.session.name} on {day_str} at {time_str} '
                    f'has not been saved. Please mark attendance as soon as possible.'
                ),
                notification_type='reminder',
                action_label='View Classes',
                action_url='/classes',
            )
            alerted += 1

        self.stdout.write(f'Sent unmarked-attendance alerts for {alerted} class(es).')
