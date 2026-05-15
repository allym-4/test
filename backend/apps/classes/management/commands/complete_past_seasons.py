from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = 'Mark seasons completed when end_date passes, complete enrolments, and expire season makeup credits'

    def handle(self, *args, **options):
        from apps.classes.models import Season
        from apps.enrolments.models import Enrolment
        from apps.attendance.models import MakeupCredit
        from apps.users.models import Notification
        from django.core.mail import send_mail
        from django.conf import settings

        today = timezone.now().date()

        past_seasons = Season.objects.filter(
            status='active',
            end_date__lt=today,
        )

        completed_seasons = 0
        completed_enrolments = 0
        expired_credits = 0

        for season in past_seasons:
            season.status = 'completed'
            season.save(update_fields=['status'])
            completed_seasons += 1

            # Complete all active enrolments in sessions belonging to this season
            active_enrolments = Enrolment.objects.filter(
                class_session__season=season,
                status='active',
            ).select_related('student')

            for enrolment in active_enrolments:
                enrolment.status = 'completed'
                enrolment.cancelled_date = today
                enrolment.save(update_fields=['status', 'cancelled_date'])
                completed_enrolments += 1

                Notification.objects.create(
                    recipient=enrolment.student,
                    title=f'{season.name} has ended',
                    body=(
                        f'Your enrolment in {enrolment.class_session.name} for {season.name} '
                        f'has been marked as completed. Thanks for a great season!'
                    ),
                    notification_type='info',
                    action_label='Book Next Season',
                    action_url='/portal/book',
                )

            # Expire all available makeup credits attached to this season
            credits_to_expire = MakeupCredit.objects.filter(
                season=season,
                status='available',
            ).select_related('student')

            for credit in credits_to_expire:
                credit.status = 'expired'
                credit.used_at = timezone.now()
                credit.save(update_fields=['status', 'used_at'])
                expired_credits += 1

                Notification.objects.create(
                    recipient=credit.student,
                    title='Catch-up credit expired',
                    body=(
                        f'Your catch-up credit ({credit.reason}) expired at the end of {season.name}. '
                        f'Catch-up credits do not carry over between seasons.'
                    ),
                    notification_type='info',
                )

                if credit.student.email:
                    send_mail(
                        subject=f'Catch-up credit expired — {season.name} ended',
                        message=(
                            f'Hi {credit.student.first_name},\n\n'
                            f'Your catch-up credit ({credit.reason}) has expired now that '
                            f'{season.name} has ended. Catch-up credits do not carry over between seasons.\n\n'
                            f"If you think this is an error, please get in touch.\n\n"
                            f'Duality Pole Studio'
                        ),
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[credit.student.email],
                        fail_silently=True,
                    )

        self.stdout.write(
            f'Completed {completed_seasons} season(s), {completed_enrolments} enrolment(s), '
            f'expired {expired_credits} makeup credit(s).'
        )
