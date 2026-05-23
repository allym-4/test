from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = 'Process expired displacement offers: auto-release casuals and confirm pending enrolments'

    def handle(self, *args, **options):
        from apps.classes.models import CasualBooking
        from apps.enrolments.models import Enrolment
        from apps.users.models import Notification

        now = timezone.now()
        released = 0
        confirmed = 0

        # Find casual bookings where the displacement window has expired
        expired_casuals = CasualBooking.objects.filter(
            displacement_offered_at__isnull=False,
            displacement_expires_at__lte=now,
            status='confirmed',
        ).select_related('student', 'occurrence__session')

        for casual in expired_casuals:
            session = casual.occurrence.session

            # Cancel the casual booking
            casual.status = 'cancelled'
            casual.save(update_fields=['status'])
            released += 1

            # Notify the casual student
            Notification.objects.create(
                recipient=casual.student,
                title=f'Spot released — {session.name}',
                body=(
                    f'Your casual booking for {session.name} has been released as the upgrade window expired. '
                    f'Your account has been credited ${casual.price_charged}.'
                ),
                notification_type='info',
            )

            # Confirm any pending enrolment linked to this casual booking
            pending_enrolment = casual.pending_enrolments.filter(status='pending_displacement').first()
            if pending_enrolment:
                pending_enrolment.status = 'active'
                pending_enrolment.displacement_casual_booking = None
                pending_enrolment.displacement_expires_at = None
                pending_enrolment.save(update_fields=['status', 'displacement_casual_booking', 'displacement_expires_at'])
                confirmed += 1

                Notification.objects.create(
                    recipient=pending_enrolment.student,
                    title=f"You're in! — {session.name}",
                    body=f"The casual student's upgrade window expired. You're confirmed for the full season in {session.name}!",
                    notification_type='success',
                    action_label='View My Classes',
                    action_url='/portal/classes',
                )

        # Also find any pending_displacement enrolments whose window expired
        # but whose casual booking is no longer confirmed (belt-and-suspenders)
        stale_pending = Enrolment.objects.filter(
            status='pending_displacement',
            displacement_expires_at__lte=now,
        ).select_related('student', 'class_session')

        for enrolment in stale_pending:
            enrolment.status = 'active'
            enrolment.displacement_casual_booking = None
            enrolment.displacement_expires_at = None
            enrolment.save(update_fields=['status', 'displacement_casual_booking', 'displacement_expires_at'])
            confirmed += 1

            Notification.objects.create(
                recipient=enrolment.student,
                title=f"You're in! — {enrolment.class_session.name}",
                body=f"Your spot in {enrolment.class_session.name} has been confirmed for the full season!",
                notification_type='success',
                action_label='View My Classes',
                action_url='/portal/classes',
            )

        self.stdout.write(
            f'Released {released} expired casual booking(s), confirmed {confirmed} pending enrolment(s).'
        )
