from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from datetime import timedelta


class Command(BaseCommand):
    help = 'Send season renewal reminders to enrolled students 2 weeks before season end'

    def handle(self, *args, **options):
        from apps.users.models import AutomationRule, Notification
        rule = AutomationRule.objects.filter(slug='season_renewal_reminder').first()
        if rule and not rule.enabled:
            self.stdout.write('Season renewal reminder automation is disabled.')
            return

        from apps.classes.models import Season
        from apps.enrolments.models import Enrolment

        today = timezone.now().date()
        target = today + timedelta(days=14)

        seasons = Season.objects.filter(
            status='active',
            end_date__gte=target - timedelta(days=1),
            end_date__lte=target + timedelta(days=1),
        )

        if not seasons.exists():
            self.stdout.write('No seasons ending in ~14 days.')
            return

        sent = 0
        for season in seasons:
            active_enrolments = Enrolment.objects.filter(
                status='active',
            ).select_related('student', 'class_session').distinct('student')

            for enrolment in active_enrolments:
                student = enrolment.student

                already_notified = Notification.objects.filter(
                    recipient=student,
                    notification_type='reminder',
                    title__contains='season',
                ).filter(
                    body__contains=season.name,
                ).exists()
                if already_notified:
                    continue

                end_str = season.end_date.strftime('%-d %B %Y')

                Notification.objects.create(
                    recipient=student,
                    title=f'{season.name} ends soon',
                    body=f'The current season ends on {end_str}. Enrolments for the next season will open soon — keep an eye out!',
                    notification_type='reminder',
                    action_label='Book Now',
                    action_url='/portal/book',
                )

                if student.email:
                    send_mail(
                        subject=f'{season.name} ends soon — Duality Pole Studio',
                        message=(
                            f'Hi {student.first_name},\n\n'
                            f'{season.name} ends on {end_str}.\n\n'
                            f"Enrolments for the next season will open soon — we'll send you an email when they do. "
                            f"Current students get priority access for the first 48 hours.\n\n"
                            f'See you in class!\n'
                            f'Duality Pole Studio'
                        ),
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[student.email],
                        fail_silently=True,
                    )
                    sent += 1

        self.stdout.write(f'Sent {sent} renewal reminder emails.')
