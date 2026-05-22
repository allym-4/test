"""
Management command: auto_charge_cash

Run daily (or hourly) to:
1. Auto-charge students whose 24h reminder window has passed
2. Flag any newly overdue cash promises that haven't been emailed yet
"""
from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = 'Auto-charge overdue cash promises and flag new ones'

    def handle(self, *args, **options):
        from apps.payments.models import Payment
        import stripe as stripe_lib
        import os

        now = timezone.now()

        # Auto-charge: reminder sent, 24h window elapsed, still not received
        to_charge = Payment.objects.filter(
            payment_type='charge',
            cash_received=False,
            cash_reminder_sent_at__isnull=False,
            cash_auto_charge_at__lte=now,
        ).select_related('student')

        stripe_lib.api_key = os.environ.get('STRIPE_SECRET_KEY', '')

        for charge in to_charge:
            student = charge.student
            if not student.stripe_customer_id or not student.default_payment_method_id:
                self.stdout.write(f'  SKIP {student.display_name} — no card on file')
                continue
            try:
                stripe_lib.PaymentIntent.create(
                    amount=int(charge.amount * 100),
                    currency='aud',
                    customer=student.stripe_customer_id,
                    payment_method=student.default_payment_method_id,
                    confirm=True,
                    off_session=True,
                    description=f'Auto-charge: {charge.description}',
                    metadata={'payment_id': charge.id, 'auto_cash_charge': True},
                )
                Payment.objects.create(
                    student=student,
                    payment_type=Payment.PaymentType.PAYMENT,
                    amount=charge.amount,
                    description=f'Auto-charged (card) — {charge.description}',
                    reference='auto_charge',
                    created_by=None,
                )
                charge.cash_received = True
                charge.save(update_fields=['cash_received'])
                self.stdout.write(f'  CHARGED {student.display_name} ${charge.amount}')
            except Exception as e:
                self.stdout.write(f'  FAILED {student.display_name}: {e}')

        self.stdout.write(self.style.SUCCESS(f'auto_charge_cash complete. Processed {to_charge.count()} charges.'))
