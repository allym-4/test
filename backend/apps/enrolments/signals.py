from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings


@receiver(post_save, sender='enrolments.Enrolment')
def notify_waitlist(sender, instance, created, **kwargs):
    if created or instance.status not in ('cancelled', 'completed'):
        return

    from apps.users.models import AutomationRule, Notification
    rule = AutomationRule.objects.filter(slug='waitlist_notify').first()
    if rule and not rule.enabled:
        return

    next_in_line = sender.objects.filter(
        class_session=instance.class_session,
        status='waitlisted',
    ).order_by('id').first()

    if not next_in_line:
        return

    session = instance.class_session
    student = next_in_line.student

    Notification.objects.create(
        recipient=student,
        title=f'A spot opened in {session.name}!',
        body=f'A spot has opened up in {session.name}. Log in now to secure your place.',
        notification_type='waitlist',
        action_label='Book Now',
        action_url='/portal/book',
    )

    if student.email:
        send_mail(
            subject=f'A spot opened in {session.name} — Duality Pole Studio',
            message=(
                f'Hi {student.first_name},\n\n'
                f'Great news! A spot has opened up in {session.name}.\n\n'
                f'Log in to your account now to secure your place — spots fill up fast!\n\n'
                f'Duality Pole Studio'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[student.email],
            fail_silently=True,
        )
