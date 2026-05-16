from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from datetime import timedelta


class Command(BaseCommand):
    help = 'Send locker renewal reminders to students 2 weeks before their locker expires'

    def handle(self, *args, **options):
        from apps.users.models import AutomationRule, Notification
        rule = AutomationRule.objects.filter(slug='locker_renewal_reminder').first()
        if rule and not rule.enabled:
            self.stdout.write('Locker renewal reminder automation is disabled.')
            return

        from apps.classes.models import Locker

        today = timezone.now().date()
        cutoff = today + timedelta(days=7)

        lockers = Locker.objects.filter(
            assigned_to__isnull=False,
            expires_at__gte=today,
            expires_at__lte=cutoff,
        ).select_related('assigned_to')

        if not lockers.exists():
            self.stdout.write('No lockers expiring in the next 7 days.')
            return

        sent = 0
        for locker in lockers:
            student = locker.assigned_to

            already_notified = Notification.objects.filter(
                recipient=student,
                title__contains='Locker renewal',
                body__contains=str(locker.expires_at),
            ).exists()
            if already_notified:
                continue

            expires_str = locker.expires_at.strftime('%-d %B %Y')

            Notification.objects.create(
                recipient=student,
                title='Locker renewal coming up',
                body=f'Your locker (#{locker.number}) expires on {expires_str}. Please contact reception to renew for next season.',
                notification_type='reminder',
                action_label='Contact Us',
                action_url='/portal/support',
            )

            if student.email:
                send_mail(
                    subject=f'Locker renewal coming up — Duality Pole Studio',
                    message=(
                        f'Hi {student.first_name},\n\n'
                        f'Your locker (#{locker.number}) expires on {expires_str}.\n\n'
                        f'Please contact reception to renew for next season.\n\n'
                        f'See you in class!\n'
                        f'Duality Pole Studio'
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[student.email],
                    fail_silently=True,
                )
                sent += 1

        self.stdout.write(f'Sent {sent} locker renewal reminder emails.')
