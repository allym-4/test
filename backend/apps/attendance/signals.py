from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings


@receiver(post_save, sender='attendance.AttendanceRecord')
def handle_no_show(sender, instance, **kwargs):
    if instance.status != 'no_show':
        return
    if instance.no_show_fee_charged or instance.no_show_fee_waived:
        return

    from apps.users.models import AutomationRule, StudioSettings, Notification
    rule = AutomationRule.objects.filter(slug='noshow_fee').first()
    if rule and not rule.enabled:
        return

    studio = StudioSettings.get()
    fee = studio.no_show_fee

    from apps.payments.models import Payment
    Payment.objects.create(
        student=instance.student,
        payment_type='no_show_fee',
        amount=fee,
        description=f'No-show fee — {instance.occurrence.session.name} {instance.occurrence.date}',
        created_by=None,
    )

    sender.objects.filter(pk=instance.pk).update(no_show_fee_charged=True)

    Notification.objects.create(
        recipient=instance.student,
        title='No-show fee charged',
        body=f'A ${fee} no-show fee has been added to your account for missing {instance.occurrence.session.name} on {instance.occurrence.date}.',
        notification_type='payment',
    )

    if instance.student.email:
        send_mail(
            subject='No-show fee — Duality Pole Studio',
            message=(
                f'Hi {instance.student.first_name},\n\n'
                f'A ${fee} no-show fee has been added to your account for missing '
                f'{instance.occurrence.session.name} on {instance.occurrence.date}.\n\n'
                f'If you believe this is an error, please get in touch.\n\n'
                f'Duality Pole Studio'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[instance.student.email],
            fail_silently=True,
        )
