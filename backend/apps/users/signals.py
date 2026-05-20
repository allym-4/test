from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from .automation_engine import run_custom_automations


@receiver(post_save, sender='users.User')
def send_welcome_email(sender, instance, created, **kwargs):
    if not created or instance.role != 'student':
        return

    try:
        from apps.users.models import AutomationRule, Notification, StudioSettings
        rule = AutomationRule.objects.filter(slug='welcome_email').first()
        if rule and not rule.enabled:
            return

        studio = StudioSettings.get()

        Notification.objects.create(
            recipient=instance,
            title=f'Welcome to {studio.studio_name}!',
            body="Your account has been created. We're excited to have you join us!",
            notification_type='info',
            action_label='Get Started',
            action_url='/portal',
        )

        if instance.email:
            send_mail(
                subject=f'Welcome to {studio.studio_name}!',
                message=(
                    f'Hi {instance.first_name},\n\n'
                    f'Welcome to {studio.studio_name}! We\'re so excited to have you join our community.\n\n'
                    f'Your account is all set up. You can log in at any time to check your classes, '
                    f'track your progress, and manage your bookings.\n\n'
                    f'If you have any questions, reply to this email or message us through the app.\n\n'
                    f'See you in class!\n'
                    f'The {studio.studio_name} team'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[instance.email],
                fail_silently=True,
            )

        run_custom_automations('student_created', instance)
    except Exception:
        pass


@receiver(post_save, sender='attendance.AttendanceRecord')
def handle_no_show_fee(sender, instance, created, **kwargs):
    if instance.status != 'no_show':
        return
    if instance.no_show_fee_charged or instance.no_show_fee_waived:
        return

    from apps.users.models import AutomationRule, Notification, StudioSettings, AutomationRun
    from apps.payments.models import Payment

    rule = AutomationRule.objects.filter(slug='noshow_fee').first()
    if not rule or not rule.enabled:
        return

    studio_settings = StudioSettings.get()
    fee = studio_settings.no_show_fee
    student = instance.student

    Payment.objects.create(
        student=student,
        payment_type='no_show_fee',
        amount=fee,
        description=f'No-show fee for {instance.occurrence}',
        created_by=None,
    )

    Notification.objects.create(
        recipient=student,
        title='No-show Fee Applied',
        body=f'A no-show fee of ${fee} has been applied to your account for missing your class on {instance.occurrence}.',
        notification_type='payment',
    )

    # Mark fee as charged to avoid duplicate runs
    type(instance).objects.filter(pk=instance.pk).update(no_show_fee_charged=True)

    AutomationRun.objects.create(
        rule=rule,
        slug='noshow_fee',
        student=student,
        trigger_data={'attendance_record_id': instance.pk, 'occurrence': str(instance.occurrence)},
        actions_taken=[f'Charged no-show fee ${fee}', 'Sent in-app notification'],
        status='completed',
    )

    run_custom_automations('attendance_no_show', student, {'occurrence': str(instance.occurrence)})


@receiver(post_save, sender='payments.PaymentPlanInstalment')
def handle_payment_overdue(sender, instance, created, **kwargs):
    update_fields = kwargs.get('update_fields')
    if update_fields is not None and 'status' not in update_fields:
        return

    if instance.status != 'overdue':
        return

    from apps.users.models import AutomationRule, Notification, AutomationRun

    rule = AutomationRule.objects.filter(slug='payment_overdue').first()
    if not rule or not rule.enabled:
        return

    student = instance.plan.student

    Notification.objects.create(
        recipient=student,
        title='Payment Overdue',
        body=f'Your payment instalment of ${instance.amount} was due on {instance.due_date} and is now overdue. Please contact us to arrange payment.',
        notification_type='payment',
    )

    AutomationRun.objects.create(
        rule=rule,
        slug='payment_overdue',
        student=student,
        trigger_data={'instalment_id': instance.pk, 'amount': str(instance.amount), 'due_date': str(instance.due_date)},
        actions_taken=['Sent overdue payment notification'],
        status='completed',
    )

    run_custom_automations('payment_overdue', student, {'amount': str(instance.amount), 'due_date': str(instance.due_date)})
