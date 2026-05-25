from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta


class Command(BaseCommand):
    help = 'Auto-block booking for students whose balance has been negative for 14+ days'

    def handle(self, *args, **options):
        from apps.users.models import User, Notification
        from apps.payments.models import Payment
        from django.db.models import Sum

        cutoff = timezone.now() - timedelta(days=14)
        students = User.objects.filter(role='student', is_active=True, booking_blocked=False)
        held = 0

        for student in students:
            credit_types = ('payment', 'refund', 'credit')
            debit_types = ('charge', 'no_show_fee')

            total_paid = Payment.objects.filter(
                student=student, payment_type__in=credit_types
            ).aggregate(t=Sum('amount'))['t'] or 0

            total_charged = Payment.objects.filter(
                student=student, payment_type__in=debit_types
            ).aggregate(t=Sum('amount'))['t'] or 0

            balance = float(total_paid) - float(total_charged)
            if balance >= 0:
                continue

            # Check if there is an unpaid charge older than 14 days
            old_debt = Payment.objects.filter(
                student=student,
                payment_type__in=debit_types,
                created_at__lte=cutoff,
            ).exists()
            if not old_debt:
                continue

            student.booking_blocked = True
            if not student.block_reason:
                student.block_reason = f'Account automatically held due to outstanding balance (auto-hold {timezone.now().date()})'
            student.save(update_fields=['booking_blocked', 'block_reason'])

            Notification.objects.create(
                recipient=student,
                title='Booking access paused',
                body=(
                    f'Your account has an outstanding balance of ${abs(balance):.2f}. '
                    'Booking has been paused until the balance is cleared. '
                    'Please contact the studio to resolve this.'
                ),
                notification_type='billing',
                action_label='Contact Studio',
                action_url='/portal/support',
            )

            admins = User.objects.filter(role='admin', is_active=True)
            for admin in admins:
                Notification.objects.create(
                    recipient=admin,
                    title=f'Account auto-held: {student.display_name}',
                    body=(
                        f'{student.display_name} has an outstanding balance of ${abs(balance):.2f} '
                        f'for 14+ days. Booking has been automatically paused.'
                    ),
                    notification_type='billing',
                    action_label='View Student',
                    action_url=f'/admin/students/{student.id}',
                )

            held += 1

        self.stdout.write(f'auto_hold_accounts: {held} account(s) held')
