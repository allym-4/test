from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings


class Command(BaseCommand):
    help = 'Mark overdue payment plan instalments and notify students and admins'

    def handle(self, *args, **options):
        from apps.users.models import AutomationRule, Notification, User
        rule = AutomationRule.objects.filter(slug='overdue_payment_alert').first()
        if rule and not rule.enabled:
            self.stdout.write('Overdue payment alert automation is disabled.')
            return

        from apps.payments.models import PaymentPlanInstalment

        today = timezone.now().date()
        overdue = PaymentPlanInstalment.objects.filter(
            due_date__lt=today,
            status='pending',
        ).select_related('plan', 'plan__student')

        admins = User.objects.filter(role='admin', is_active=True)
        notified = 0

        for instalment in overdue:
            instalment.status = 'overdue'
            instalment.save(update_fields=['status'])

            student = instalment.plan.student
            due_str = instalment.due_date.strftime('%-d %B %Y')
            amount_str = f'${instalment.amount:.2f}'

            already_notified = Notification.objects.filter(
                recipient=student,
                notification_type='payment',
                title__contains='Payment overdue',
                body__contains=due_str,
            ).exists()

            if not already_notified:
                Notification.objects.create(
                    recipient=student,
                    title='Payment overdue',
                    body=(
                        f'Your instalment of {amount_str} for "{instalment.plan.description}" '
                        f'was due on {due_str} and has not been received. '
                        f'Please contact the studio to arrange payment.'
                    ),
                    notification_type='payment',
                    action_label='Contact Studio',
                    action_url='/portal/profile',
                )

                if student.email:
                    send_mail(
                        subject=f'Payment overdue: {amount_str} was due {due_str}',
                        message=(
                            f'Hi {student.first_name},\n\n'
                            f'Your instalment of {amount_str} for "{instalment.plan.description}" '
                            f'was due on {due_str} and has not been received.\n\n'
                            f'Please contact us as soon as possible to arrange payment.\n\n'
                            f'Duality Pole Studio\n'
                            f'{settings.DEFAULT_FROM_EMAIL}'
                        ),
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[student.email],
                        fail_silently=True,
                    )

            for admin in admins:
                Notification.objects.create(
                    recipient=admin,
                    title=f'Overdue payment: {student.display_name}',
                    body=(
                        f'{student.display_name} has an overdue instalment of {amount_str} '
                        f'for "{instalment.plan.description}" (due {due_str}).'
                    ),
                    notification_type='payment',
                    action_label='View Student',
                    action_url=f'/admin/students/{student.id}',
                )

            notified += 1

        self.stdout.write(f'Marked {notified} instalment(s) as overdue and sent notifications.')
