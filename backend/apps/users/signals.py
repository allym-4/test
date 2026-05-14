from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings


@receiver(post_save, sender='users.User')
def send_welcome_email(sender, instance, created, **kwargs):
    if not created or instance.role != 'student':
        return

    from apps.users.models import AutomationRule, Notification
    rule = AutomationRule.objects.filter(slug='welcome_email').first()
    if rule and not rule.enabled:
        return

    Notification.objects.create(
        recipient=instance,
        title='Welcome to Duality Pole Studio!',
        body="Your account has been created. We're excited to have you join us!",
        notification_type='info',
        action_label='Get Started',
        action_url='/portal',
    )

    if instance.email:
        send_mail(
            subject='Welcome to Duality Pole Studio!',
            message=(
                f'Hi {instance.first_name},\n\n'
                f"Welcome to Duality Pole Studio! We're so excited to have you join our community.\n\n"
                f'Your account is all set up. You can log in at any time to check your classes, '
                f'track your progress, and manage your bookings.\n\n'
                f'If you have any questions, reply to this email or message us through the app.\n\n'
                f'See you in class!\n'
                f'The Duality Pole Studio team'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[instance.email],
            fail_silently=True,
        )
