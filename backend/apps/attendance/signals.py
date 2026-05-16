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


@receiver(post_save, sender='attendance.AttendanceRecord')
def handle_attendance_present(sender, instance, created, **kwargs):
    if instance.status not in ('present', 'late'):
        return
    from apps.users.automation_engine import run_custom_automations
    context = {
        'class_name': instance.occurrence.session.name if instance.occurrence.session else '',
        'class_level': getattr(instance.occurrence.session, 'level', '') or '',
        'date': str(instance.occurrence.date),
    }
    if instance.status == 'present':
        run_custom_automations('attendance_present', instance.student, context)

    # Update challenge progress for all active challenges the student is opted into
    try:
        from django.utils import timezone as tz
        from apps.users.models import Challenge, ChallengeProgress
        from apps.users.views import _recalculate_challenge_progress
        today = instance.occurrence.date
        active_challenges = Challenge.objects.filter(
            is_active=True,
            start_date__lte=today,
            end_date__gte=today,
            challenge_type__in=('attendance_count', 'style_variety', 'streak'),
        )
        opted_in = ChallengeProgress.objects.filter(
            challenge__in=active_challenges,
            student=instance.student,
        ).values_list('challenge_id', flat=True)
        for challenge in active_challenges.filter(id__in=opted_in):
            _recalculate_challenge_progress(challenge, instance.student)
    except Exception:
        pass
