from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.enrolments.models import Enrolment
from apps.enrolments.signals import _cascade_season_waitlist_offer


class Command(BaseCommand):
    help = 'Cascade expired season waitlist offers to the next student in line'

    def handle(self, *args, **options):
        now = timezone.now()
        expired = list(
            Enrolment.objects.filter(
                status='waitlisted',
                waitlist_offered_at__isnull=False,
                waitlist_expires_at__lt=now,
                waitlist_offer_rejected=False,
            ).select_related('class_session')
        )

        sessions_done = set()
        count = 0
        for enrolment in expired:
            # Treat expiry the same as a rejection for cascade purposes
            enrolment.waitlist_offer_rejected = True
            enrolment.waitlist_offered_at = None
            enrolment.waitlist_expires_at = None
            enrolment.save(update_fields=['waitlist_offer_rejected', 'waitlist_offered_at', 'waitlist_expires_at'])
            self.stdout.write(
                f'Expired offer for {enrolment.student.display_name} on {enrolment.class_session}'
            )
            count += 1

            session_id = enrolment.class_session_id
            if session_id not in sessions_done:
                sessions_done.add(session_id)
                _cascade_season_waitlist_offer(enrolment.class_session)
                self.stdout.write(f'Cascaded to next for {enrolment.class_session}')

        self.stdout.write(self.style.SUCCESS(f'Processed {count} expired season waitlist offers.'))
