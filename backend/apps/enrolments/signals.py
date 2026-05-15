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
                # Auto-promote: move straight from waitlisted → active
                next_in_line.status = 'active'
                next_in_line.save(update_fields=['status'])

                waitlist_student = next_in_line.student
                Notification.objects.create(
                    recipient=waitlist_student,
                    title=f"You're in! {session.name}",
                    body=f"A spot opened in {session.name} and you've been automatically enrolled. See you in class!",
                    notification_type='waitlist',
                    action_label='View My Classes',
                    action_url='/portal/my-classes',
                )
                if waitlist_student.email:
                    send_mail(
                        subject=f"You're in! — {session.name}",
                        message=(
                            f'Hi {waitlist_student.first_name},\n\n'
                            f'Great news! A spot opened up in {session.name} and you\'ve been '
                            f'automatically moved from the waitlist into the class.\n\n'
                            f'See you there!\n'
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
