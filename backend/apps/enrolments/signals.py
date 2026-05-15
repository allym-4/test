from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings


@receiver(post_save, sender='enrolments.Enrolment')
def handle_enrolment_change(sender, instance, created, **kwargs):
    from apps.users.models import AutomationRule, Notification
    from apps.users.automation_engine import run_custom_automations

    session = instance.class_session
    student = instance.student
    context = {
        'class_name': session.name if session else '',
        'class_level': getattr(session, 'level', '') or '',
    }

    # Waitlist notification when a spot opens
    if not created and instance.status in ('cancelled', 'completed'):
        rule = AutomationRule.objects.filter(slug='waitlist_notify').first()
        if not (rule and not rule.enabled):
            next_in_line = sender.objects.filter(
                class_session=session,
                status='waitlisted',
            ).order_by('id').first()

            if next_in_line:
                waitlist_student = next_in_line.student
                Notification.objects.create(
                    recipient=waitlist_student,
                    title=f'A spot opened in {session.name}!',
                    body=f'A spot has opened up in {session.name}. Log in now to secure your place.',
                    notification_type='waitlist',
                    action_label='Book Now',
                    action_url='/portal/book',
                )
                if waitlist_student.email:
                    send_mail(
                        subject=f'A spot opened in {session.name} — Duality Pole Studio',
                        message=(
                            f'Hi {waitlist_student.first_name},\n\n'
                            f'Great news! A spot has opened up in {session.name}.\n\n'
                            f'Log in to your account now to secure your place — spots fill up fast!\n\n'
                            f'Duality Pole Studio'
                        ),
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[waitlist_student.email],
                        fail_silently=True,
                    )

        run_custom_automations('enrolment_cancelled', student, context)

    # Fire enrolment_active trigger for new active enrolments
    if instance.status == 'active' and (created or not created):
        run_custom_automations('enrolment_active', student, context)
