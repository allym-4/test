from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from datetime import timedelta

DAYS_AHEAD = 7


class Command(BaseCommand):
    help = 'Alert admin when upcoming classes have no instructor assigned'

    def handle(self, *args, **options):
        from apps.users.models import AutomationRule, Notification, User
        rule = AutomationRule.objects.filter(slug='cover_needed_alert').first()
        if rule and not rule.enabled:
            self.stdout.write('Cover needed alert automation is disabled.')
            return

        from apps.classes.models import ClassOccurrence

        today = timezone.now().date()
        cutoff = today + timedelta(days=DAYS_AHEAD)

        occurrences = ClassOccurrence.objects.filter(
            date__gt=today,
            date__lte=cutoff,
            status='scheduled',
            substitute_instructor__isnull=True,
            session__instructor__isnull=True,
        ).select_related('session', 'session__studio')

        admins = User.objects.filter(role='admin', is_active=True)
        alerted = 0

        for occ in occurrences:
            already_alerted = Notification.objects.filter(
                notification_type='info',
                title__contains='No instructor',
                body__contains=occ.session.name,
                body__contains=str(occ.date),
            ).exists()
            if already_alerted:
                continue

            day_str = occ.date.strftime('%-d %B')
            time_str = occ.session.start_time.strftime('%I:%M %p').lstrip('0')
            studio_str = f' at {occ.session.studio.name}' if occ.session.studio else ''

            for admin in admins:
                Notification.objects.create(
                    recipient=admin,
                    title=f'No instructor: {occ.session.name}',
                    body=(
                        f'{occ.session.name} on {day_str} at {time_str}{studio_str} '
                        f'has no instructor assigned. Please assign a teacher or find cover.'
                    ),
                    notification_type='info',
                    action_label='View Classes',
                    action_url='/admin/classes',
                )

                if admin.email:
                    send_mail(
                        subject=f'Cover needed: {occ.session.name} on {day_str}',
                        message=(
                            f'Hi {admin.first_name},\n\n'
                            f'{occ.session.name} on {day_str} at {time_str}{studio_str} '
                            f'currently has no instructor assigned.\n\n'
                            f'Please assign a teacher or arrange cover as soon as possible.\n\n'
                            f'Duality Pole Studio'
                        ),
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[admin.email],
                        fail_silently=True,
                    )

            alerted += 1

        self.stdout.write(f'Sent cover-needed alerts for {alerted} class(es) in the next {DAYS_AHEAD} days.')
