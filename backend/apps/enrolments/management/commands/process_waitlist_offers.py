from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta


class Command(BaseCommand):
    help = 'Expire stale waitlist offers, send reminders, and cascade to next student in queue'

    def handle(self, *args, **options):
        from apps.enrolments.models import Enrolment
        from apps.enrolments.signals import _cascade_season_waitlist_offer, _send_waitlist_reminder

        now = timezone.now()
        reminder_window = now + timedelta(minutes=35)  # offer expires within 35 mins

        # Send reminder notifications to students whose offer expires soon
        expiring_soon = Enrolment.objects.filter(
            status='waitlisted',
            waitlist_offered_at__isnull=False,
            waitlist_expires_at__gt=now,
            waitlist_expires_at__lte=reminder_window,
        ).select_related('student', 'class_session')

        for enrolment in expiring_soon:
            _send_waitlist_reminder(enrolment)
            self.stdout.write(f'Sent reminder to {enrolment.student.display_name} for {enrolment.class_session}')

        # Expire stale offers and cascade to next in queue
        expired = list(
            Enrolment.objects.filter(
                status='waitlisted',
                waitlist_offered_at__isnull=False,
                waitlist_expires_at__lt=now,
                waitlist_offer_rejected=False,
            ).select_related('student', 'class_session')
        )

        sessions_done = set()
        for enrolment in expired:
            self.stdout.write(f'Expiring offer for {enrolment.student.display_name} on {enrolment.class_session}')
            # Mark as rejected so cascade skips this enrolment
            enrolment.waitlist_offer_rejected = True
            enrolment.waitlist_offered_at = None
            enrolment.waitlist_expires_at = None
            enrolment.save(update_fields=['waitlist_offer_rejected', 'waitlist_offered_at', 'waitlist_expires_at'])

            session_id = enrolment.class_session_id
            if session_id not in sessions_done:
                sessions_done.add(session_id)
                try:
                    _cascade_season_waitlist_offer(enrolment.class_session)
                    self.stdout.write(f'Cascaded to next for {enrolment.class_session}')
                except Exception as e:
                    self.stdout.write(f'Error cascading for session {session_id}: {e}')

        self.stdout.write('Waitlist processing complete.')
