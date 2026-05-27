from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from datetime import timedelta


class Command(BaseCommand):
    help = 'Send locker renewal reminders to students whose locker expires within N days'

    def _interpolate(self, text, student, extra=None):
        ctx = {
            'first_name': student.first_name or '',
            'last_name': student.last_name or '',
            'full_name': student.get_full_name() or '',
            'studio_name': 'Duality Pole Studio',
        }
        if extra:
            ctx.update(extra)
        for k, v in ctx.items():
            text = text.replace(f'{{{{{k}}}}}', str(v))
        return text

    def handle(self, *args, **options):
        from apps.users.models import AutomationRule, Notification, AutomationRun
        from apps.classes.models import Locker

        rule = AutomationRule.objects.filter(slug='locker_renewal_reminder').first()
        if rule and not rule.enabled:
            self.stdout.write('locker_renewal_reminder: disabled, skipping')
            return

        timing = rule.timing if rule else {}
        days_before = timing.get('days_before', 14)

        today = timezone.now().date()
        cutoff = today + timedelta(days=days_before)

        # Find lockers expiring within the window that are still assigned
        lockers = Locker.objects.filter(
            assigned_to__isnull=False,
            expires_at__gte=today,
            expires_at__lte=cutoff,
        ).select_related('assigned_to')

        sent = 0
        for locker in lockers:
            student = locker.assigned_to
            if not student or not student.is_active:
                continue

            # Avoid re-sending if already sent in last 7 days
            already = Notification.objects.filter(
                recipient=student,
                title__icontains='locker',
                created_at__gte=timezone.now() - timedelta(days=7),
            ).exists()
            if already:
                continue

            extra = {
                'locker_number': str(locker.number),
                'expiry_date': locker.expires_at.strftime('%d %B %Y') if locker.expires_at else '',
            }

            Notification.objects.create(
                recipient=student,
                title=self._interpolate('Your locker is expiring soon', student, extra),
                body=self._interpolate(
                    'Your locker (#{{locker_number}}) expires on {{expiry_date}}. '
                    'Please contact us if you would like to renew for the next season.',
                    student,
                    extra,
                ),
                notification_type='reminder',
                action_label='Contact Us',
                action_url='/portal/support',
            )

            if student.email:
                send_mail(
                    subject=self._interpolate(
                        'Your locker expires at the end of the season — Duality Pole Studio',
                        student,
                        extra,
                    ),
                    message=self._interpolate(
                        'Hi {{first_name}},\n\n'
                        'Just a reminder that your locker (#{{locker_number}}) is due to expire on {{expiry_date}}.\n\n'
                        'If you would like to renew your locker for the next season, '
                        'please contact us and we will get that sorted for you.\n\n'
                        'Duality Pole Studio',
                        student,
                        extra,
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[student.email],
                    fail_silently=True,
                )

            if rule:
                AutomationRun.objects.create(
                    rule=rule,
                    slug='locker_renewal_reminder',
                    student=student,
                    trigger_data={
                        'locker_number': locker.number,
                        'expires_at': str(locker.expires_at),
                        'days_before': days_before,
                    },
                    actions_taken=['Sent locker renewal reminder email + notification'],
                    status='completed',
                )
            sent += 1

        self.stdout.write(f'locker_renewal_reminder: {sent} sent')
