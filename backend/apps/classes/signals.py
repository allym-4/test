from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender='classes.ClassOccurrence')
def handle_occurrence_cancelled(sender, instance, created, **kwargs):
    """Notify enrolled students when a class occurrence is cancelled."""
    if created or instance.status != 'cancelled':
        return

    from apps.enrolments.models import Enrolment
    from apps.users.models import Notification
    from django.core.mail import send_mail
    from django.conf import settings

    date_str = instance.date.strftime('%-d %B %Y') if instance.date else ''
    session = instance.session

    active_enrolments = Enrolment.objects.filter(
        class_session=session,
        status='active',
    ).select_related('student')

    for enrolment in active_enrolments:
        Notification.objects.create(
            recipient=enrolment.student,
            title=f'{session.name} cancelled — {date_str}',
            body=(
                f"This week's {session.name} on {date_str} has been cancelled. "
                f"We apologise for any inconvenience. If you have a catch-up credit it will still be valid."
            ),
            notification_type='warning',
        )
        if enrolment.student.email:
            send_mail(
                subject=f'Class cancelled — {session.name} {date_str}',
                message=(
                    f'Hi {enrolment.student.first_name},\n\n'
                    f'{session.name} on {date_str} has been cancelled.\n\n'
                    f'We apologise for the inconvenience. Your catch-up credit (if applicable) remains valid.\n\n'
                    f'Duality Pole Studio'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[enrolment.student.email],
                fail_silently=True,
            )


@receiver(post_save, sender='classes.Season')
def handle_season_status_change(sender, instance, created, **kwargs):
    if created or instance.status != 'completed':
        return

    from django.utils import timezone
    from django.core.mail import send_mail
    from django.conf import settings
    from apps.enrolments.models import Enrolment
    from apps.attendance.models import MakeupCredit
    from apps.users.models import Notification

    today = timezone.now().date()

    active_enrolments = Enrolment.objects.filter(
        class_session__season=instance,
        status='active',
    ).select_related('student', 'class_session')

    for enrolment in active_enrolments:
        enrolment.status = 'completed'
        enrolment.cancelled_date = today
        enrolment.save(update_fields=['status', 'cancelled_date'])

        Notification.objects.create(
            recipient=enrolment.student,
            title=f'{instance.name} has ended',
            body=(
                f'Your enrolment in {enrolment.class_session.name} for {instance.name} '
                f'has been marked as completed. Thanks for a great season!'
            ),
            notification_type='info',
            action_label='Book Next Season',
            action_url='/portal/book',
        )

    credits_to_expire = MakeupCredit.objects.filter(
        season=instance,
        status='available',
    ).select_related('student')

    for credit in credits_to_expire:
        credit.status = 'expired'
        credit.used_at = timezone.now()
        credit.save(update_fields=['status', 'used_at'])

        Notification.objects.create(
            recipient=credit.student,
            title='Catch-up credit expired',
            body=(
                f'Your catch-up credit ({credit.reason}) expired at the end of {instance.name}. '
                f'Catch-up credits do not carry over between seasons.'
            ),
            notification_type='info',
        )

        if credit.student.email:
            send_mail(
                subject=f'Catch-up credit expired — {instance.name} ended',
                message=(
                    f'Hi {credit.student.first_name},\n\n'
                    f'Your catch-up credit ({credit.reason}) has expired now that '
                    f'{instance.name} has ended. Catch-up credits do not carry over between seasons.\n\n'
                    f'If you think this is an error, please get in touch.\n\n'
                    f'Duality Pole Studio'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[credit.student.email],
                fail_silently=True,
            )
