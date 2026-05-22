from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from datetime import timedelta, datetime
import pytz


SYDNEY_TZ = pytz.timezone('Australia/Sydney')


class Command(BaseCommand):
    help = 'Notify instructors when a past class has no attendance marked'

    def handle(self, *args, **options):
        from apps.classes.models import ClassOccurrence
        from apps.users.models import Notification

        now = timezone.now()
        today = now.astimezone(SYDNEY_TZ).date()
        lookback = today - timedelta(days=7)

        # Include today — we'll filter by 6-hour cutoff per occurrence
        occurrences = ClassOccurrence.objects.filter(
            date__gte=lookback,
            date__lte=today,
            register_saved=False,
            status='scheduled',
        ).select_related('session', 'session__instructor', 'substitute_instructor')

        alerted = 0

        for occ in occurrences:
            # Calculate when 6 hours after class start is (Sydney time)
            class_start = SYDNEY_TZ.localize(
                datetime.combine(occ.date, occ.session.start_time)
            )
            six_hours_after = class_start + timedelta(hours=6)

            if now < six_hours_after:
                continue  # Class hasn't been over for 6 hours yet

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

            if instructor.email:
                send_mail(
                    subject=f'Reminder: mark attendance for {occ.session.name}',
                    message=(
                        f'Hi {instructor.first_name},\n\n'
                        f'The register for {occ.session.name} on {day_str} at {time_str} '
                        f'hasn\'t been saved yet.\n\n'
                        f'Please log in and mark attendance as soon as possible.\n\n'
                        f'Duality Pole Studio'
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[instructor.email],
                    fail_silently=True,
                )

            alerted += 1

        self.stdout.write(f'Sent unmarked-attendance alerts for {alerted} class(es).')
