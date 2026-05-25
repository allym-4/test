from datetime import timedelta
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Modal reminder for students who haven't enrolled 2 weeks after bookings opened"

    def handle(self, *args, **options):
        from apps.classes.models import Season
        from apps.users.models import User, Announcement
        from apps.enrolments.models import Enrolment
        from django.utils import timezone

        now = timezone.now()
        # Seasons where bookings opened ~14 days ago
        target_seasons = Season.objects.filter(
            bookings_open=True,
            go_live_at__lte=now - timedelta(days=14),
            go_live_at__gte=now - timedelta(days=15),
            status__in=('upcoming', 'active'),
        )
        for season in target_seasons:
            title = f'Still time to book {season.name}!'
            if Announcement.objects.filter(title=title).exists():
                continue
            enrolled_ids = Enrolment.objects.filter(
                class_session__season=season, status='active'
            ).values_list('student_id', flat=True).distinct()
            unenrolled = User.objects.filter(
                role='student', is_active=True
            ).exclude(id__in=enrolled_ids)
            if not unenrolled.exists():
                continue
            ann = Announcement.objects.create(
                title=title,
                body=(
                    f"Don't miss out — there are still spots available in **{season.name}**. "
                    f"Tap below to book your classes."
                ),
                note_type='announcement',
                show_as_modal=True,
                cta_label='Book Now',
                cta_url='/portal/book',
                audience='specific',
            )
            ann.audience_students.set(unenrolled)
            self.stdout.write(
                f'remind_unenrolled: created reminder for {unenrolled.count()} students for {season.name}'
            )
