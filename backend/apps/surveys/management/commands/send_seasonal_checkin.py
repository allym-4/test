import random
from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = 'Send seasonal check-in feedback nudges to enrolled students (weeks 4–7 of the active season)'

    def handle(self, *args, **options):
        from apps.classes.models import Season
        from apps.enrolments.models import Enrolment
        from apps.surveys.models import SeasonFeedback
        from apps.users.models import Notification

        # Get the currently active season
        try:
            season = Season.objects.get(status='active')
        except Season.DoesNotExist:
            self.stdout.write('send_seasonal_checkin: no active season, skipping')
            return
        except Season.MultipleObjectsReturned:
            season = Season.objects.filter(status='active').order_by('-start_date').first()

        # Calculate current week number (1-based)
        today = timezone.now().date()
        days_elapsed = (today - season.start_date).days
        week_number = days_elapsed // 7 + 1

        if week_number < 4 or week_number > 7:
            self.stdout.write(
                f'send_seasonal_checkin: week {week_number} is outside weeks 4–7 range, skipping'
            )
            return

        # Get all active season/course enrolments for this season
        enrolled_student_ids = Enrolment.objects.filter(
            class_session__season=season,
            status='active',
            enrolment_type__in=['season', 'course'],
        ).values_list('student_id', flat=True).distinct()

        # Filter to students who haven't already been sent a feedback for this season
        already_sent_ids = SeasonFeedback.objects.filter(
            season=season
        ).values_list('student_id', flat=True)

        eligible_ids = list(set(enrolled_student_ids) - set(already_sent_ids))

        if not eligible_ids:
            self.stdout.write('send_seasonal_checkin: no eligible students remaining')
            return

        # Send to ~30% of remaining eligible students
        sample_size = max(1, int(len(eligible_ids) * 0.30))
        selected_ids = random.sample(eligible_ids, min(sample_size, len(eligible_ids)))

        from apps.users.models import User
        students = User.objects.filter(id__in=selected_ids)

        sent = 0
        for student in students:
            SeasonFeedback.objects.create(student=student, season=season)
            Notification.objects.create(
                recipient=student,
                title="How's your season going?",
                body="We'd love to hear from you — tap to share your thoughts. Be spicy, we love it. 🌶️",
                notification_type='info',
                action_label='Share Feedback',
                action_url='/portal/feedback',
            )
            sent += 1

        self.stdout.write(
            f'send_seasonal_checkin: sent to {sent} students '
            f'(week {week_number}, season "{season.name}", '
            f'{len(eligible_ids)} eligible, {len(selected_ids)} sampled)'
        )
