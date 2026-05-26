from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.classes.models import CasualBooking
from apps.classes.views import _cascade_casual_waitlist_offer


class Command(BaseCommand):
    help = 'Cascade expired casual waitlist offers to the next student in line'

    def handle(self, *args, **options):
        now = timezone.now()
        expired = list(
            CasualBooking.objects.filter(
                status='waitlisted',
                waitlist_offered_at__isnull=False,
                waitlist_expires_at__lt=now,
                waitlist_offer_rejected=False,
            ).select_related('occurrence__session')
        )

        occurrences_done = set()
        count = 0
        for booking in expired:
            # Treat expiry the same as rejection for cascade purposes
            booking.waitlist_offer_rejected = True
            booking.waitlist_offered_at = None
            booking.waitlist_expires_at = None
            booking.save(update_fields=['waitlist_offer_rejected', 'waitlist_offered_at', 'waitlist_expires_at'])
            self.stdout.write(
                f'Expired offer for {booking.student.display_name} on {booking.occurrence}'
            )
            count += 1

            occ_id = booking.occurrence_id
            if occ_id not in occurrences_done:
                occurrences_done.add(occ_id)
                _cascade_casual_waitlist_offer(booking.occurrence)
                self.stdout.write(f'Cascaded to next for occurrence {occ_id}')

        self.stdout.write(self.style.SUCCESS(f'Processed {count} expired casual waitlist offers.'))
