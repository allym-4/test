from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from datetime import timedelta


class Command(BaseCommand):
    help = 'Send 24-hour class reminder emails for classes happening tomorrow'

    def handle(self, *args, **options):
        from apps.users.models import AutomationRule, Notification
        rule = AutomationRule.objects.filter(slug='class_reminder').first()
        if rule and not rule.enabled:
            self.stdout.write('Class reminder automation is disabled.')
            return

        from apps.classes.models import ClassOccurrence
        from apps.enrolments.models import Enrolment

        tomorrow = timezone.now().date() + timedelta(days=1)
        occurrences = ClassOccurrence.objects.filter(
            date=tomorrow,
            status='scheduled',
        ).select_related('session', 'session__instructor', 'session__studio')

        sent = 0
        for occ in occurrences:
            active_enrolments = Enrolment.objects.filter(
                class_session=occ.session,
                status='active',
            ).select_related('student')

            for enrolment in active_enrolments:
                student = enrolment.student

                already_notified = Notification.objects.filter(
                    recipient=student,
                    notification_type='reminder',
                    title__contains=occ.session.name,
                    body__contains=str(tomorrow),
                ).exists()
                if already_notified:
                    continue

                day_str = tomorrow.strftime('%-d %B')
                time_str = occ.session.start_time.strftime('%I:%M %p').lstrip('0')
                studio_str = f' at {occ.session.studio.name}' if occ.session.studio else ''

                Notification.objects.create(
                    recipient=student,
                    title=f'Class tomorrow: {occ.session.name}',
                    body=f'You have {occ.session.name} tomorrow ({day_str}) at {time_str}{studio_str}. See you there!',
                    notification_type='reminder',
                    action_label='My Classes',
                    action_url='/portal/classes',
                )

                if student.email:
                    send_mail(
                        subject=f'Reminder: {occ.session.name} tomorrow',
                        message=(
                            f'Hi {student.first_name},\n\n'
                            f'Just a reminder that you have {occ.session.name} tomorrow '
                            f'({day_str}) at {time_str}{studio_str}.\n\n'
                            f'See you in class!\n'
                            f'Duality Pole Studio'
                        ),
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[student.email],
                        fail_silently=True,
                    )
                    sent += 1

        self.stdout.write(f'Sent {sent} reminder emails for {occurrences.count()} classes on {tomorrow}.')
