from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from datetime import timedelta

UNDERENROLLED_THRESHOLD = 3
DAYS_AHEAD = 3


class Command(BaseCommand):
    help = 'Alert admin when upcoming classes are under-enrolled'

    def handle(self, *args, **options):
        from apps.users.models import AutomationRule, Notification, User
        rule = AutomationRule.objects.filter(slug='underenrolled_alert').first()
        if rule and not rule.enabled:
            self.stdout.write('Under-enrolled alert automation is disabled.')
            return

        from apps.classes.models import ClassOccurrence
        from apps.enrolments.models import Enrolment

        check_date = timezone.now().date() + timedelta(days=DAYS_AHEAD)
        occurrences = ClassOccurrence.objects.filter(
            date=check_date,
            status='scheduled',
        ).select_related('session', 'session__studio')

        admins = User.objects.filter(role='admin', is_active=True)
        alerted = 0

        for occ in occurrences:
            count = Enrolment.objects.filter(
                class_session=occ.session,
                status='active',
            ).count()

            if count >= UNDERENROLLED_THRESHOLD:
                continue

            already_alerted = Notification.objects.filter(
                notification_type='info',
                title__contains='Under-enrolled',
                body__contains=occ.session.name,
                body__contains=str(check_date),
            ).exists()
            if already_alerted:
                continue

            day_str = check_date.strftime('%-d %B')
            time_str = occ.session.start_time.strftime('%I:%M %p').lstrip('0')
            studio_str = f' at {occ.session.studio.name}' if occ.session.studio else ''

            for admin in admins:
                Notification.objects.create(
                    recipient=admin,
                    title=f'Under-enrolled: {occ.session.name}',
                    body=(
                        f'{occ.session.name} on {day_str} at {time_str}{studio_str} '
                        f'only has {count} student{"s" if count != 1 else ""} enrolled '
                        f'(minimum {UNDERENROLLED_THRESHOLD}). Consider promoting the class or cancelling.'
                    ),
                    notification_type='info',
                    action_label='View Classes',
                    action_url='/admin/classes',
                )

                if admin.email:
                    send_mail(
                        subject=f'Under-enrolled class: {occ.session.name} on {day_str}',
                        message=(
                            f'Hi {admin.first_name},\n\n'
                            f'{occ.session.name} on {day_str} at {time_str}{studio_str} '
                            f'currently has only {count} student{"s" if count != 1 else ""} enrolled.\n\n'
                            f'You may want to promote the class or consider cancelling.\n\n'
                            f'Duality Pole Studio'
                        ),
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[admin.email],
                        fail_silently=True,
                    )

            alerted += 1

        self.stdout.write(f'Sent under-enrolled alerts for {alerted} class(es) on {check_date}.')
