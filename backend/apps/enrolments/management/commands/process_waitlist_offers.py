from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta


class Command(BaseCommand):
    help = 'Expire stale waitlist offers, send reminders, and offer to next student in queue'

    def handle(self, *args, **options):
        from apps.enrolments.models import Enrolment
        from apps.enrolments.signals import _offer_waitlist_spot, _send_waitlist_reminder

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

        # Expire stale offers and offer to next in queue
        expired = Enrolment.objects.filter(
            status='waitlisted',
            waitlist_offered_at__isnull=False,
            waitlist_expires_at__lt=now,
        ).select_related('student', 'class_session')

        sessions_to_reprocess = set()
        for enrolment in expired:
            self.stdout.write(f'Expiring offer for {enrolment.student.display_name} on {enrolment.class_session}')
            sessions_to_reprocess.add(enrolment.class_session_id)
            enrolment.waitlist_offered_at = None
            enrolment.waitlist_expires_at = None
            enrolment.waitlist_urgent = False
            enrolment.save(update_fields=['waitlist_offered_at', 'waitlist_expires_at', 'waitlist_urgent'])

        # Re-offer to next person in each affected session
        from apps.classes.models import ClassSession
        for session_id in sessions_to_reprocess:
            try:
                session = ClassSession.objects.get(pk=session_id)
                # Check capacity before re-offering
                capacity = getattr(session, 'max_students', None)
                if capacity:
                    active_count = Enrolment.objects.filter(class_session=session, status='active').count()
                    if active_count < capacity:
                        _offer_waitlist_spot(session)
                        self.stdout.write(f'Re-offered spot for {session}')
            except Exception as e:
                self.stdout.write(f'Error re-offering for session {session_id}: {e}')

        self.stdout.write('Waitlist processing complete.')
