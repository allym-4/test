from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta


class Command(BaseCommand):
    help = 'Expire makeup credits with no season attached that are older than credit_expiry_days'

    def handle(self, *args, **options):
        from apps.users.models import StudioSettings, Notification
        from apps.attendance.models import MakeupCredit
        from django.core.mail import send_mail
        from django.conf import settings

        studio = StudioSettings.get()
        expiry_days = studio.credit_expiry_days or 60
        cutoff = timezone.now() - timedelta(days=expiry_days)

        # Only expire credits with no season set — season-linked credits are handled
        # by complete_past_seasons when the season ends
        expiring = MakeupCredit.objects.filter(
            status='available',
            season__isnull=True,
            created_at__lte=cutoff,
        ).select_related('student')

        expired = 0
        for credit in expiring:
            credit.status = 'expired'
            credit.used_at = timezone.now()
            credit.save(update_fields=['status', 'used_at'])
            expired += 1

            Notification.objects.create(
                recipient=credit.student,
                title='Catch-up credit expired',
                body=(
                    f'Your catch-up credit ({credit.reason}) has expired after '
                    f'{expiry_days} days. Contact the studio if you have questions.'
                ),
                notification_type='info',
            )

            if credit.student.email:
                send_mail(
                    subject=f'Catch-up credit expired — {studio.studio_name}',
                    message=(
                        f'Hi {credit.student.first_name},\n\n'
                        f'Your catch-up credit ({credit.reason}) has expired '
                        f'after {expiry_days} days.\n\n'
                        f'If you think this is an error, please get in touch.\n\n'
                        f'{studio.studio_name}'
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[credit.student.email],
                    fail_silently=True,
                )

        self.stdout.write(f'Expired {expired} season-less makeup credit(s).')
