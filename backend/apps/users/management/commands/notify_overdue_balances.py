from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = 'Send notifications to students with outstanding negative balances'

    def handle(self, *args, **options):
        from django.db.models import Sum
        from apps.users.models import User, Notification
        from apps.payments.models import Payment

        today = timezone.now().date()
        students = User.objects.filter(role='student', is_active=True)
        notified = 0

        for student in students:
            total_paid = Payment.objects.filter(
                student=student,
                payment_type__in=['payment', 'refund', 'credit'],
            ).aggregate(total=Sum('amount'))['total'] or 0

            total_owed = Payment.objects.filter(
                student=student,
                payment_type__in=['charge', 'no_show_fee'],
            ).aggregate(total=Sum('amount'))['total'] or 0

            balance = float(total_paid) - float(total_owed)
            if balance >= 0:
                continue

            already_today = Notification.objects.filter(
                recipient=student,
                title='Outstanding balance reminder',
                created_at__date=today,
            ).exists()
            if already_today:
                continue

            Notification.objects.create(
                recipient=student,
                title='Outstanding balance reminder',
                body=(
                    f'You have an outstanding balance of ${abs(balance):.2f}. '
                    f'Please contact the studio to arrange payment.'
                ),
                notification_type='billing',
            )
            notified += 1

        self.stdout.write(f'Notified {notified} student(s) with overdue balances.')
