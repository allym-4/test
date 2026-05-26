import stripe
from datetime import date
from django.conf import settings
from django.core.management.base import BaseCommand
from apps.payments.models import PaymentPlan, PaymentPlanInstalment


class Command(BaseCommand):
    help = 'Auto-charge payment plan instalments that are due today'

    def handle(self, *args, **options):
        stripe.api_key = settings.STRIPE_SECRET_KEY

        due_instalments = PaymentPlanInstalment.objects.filter(
            due_date__lte=date.today(),
            status=PaymentPlanInstalment.Status.PENDING,
        ).select_related('plan', 'plan__student').exclude(plan__stripe_payment_method_id='')

        charged = 0
        failed = 0
        for instalment in due_instalments:
            plan = instalment.plan
            student = plan.student
            if not student.stripe_customer_id:
                continue
            try:
                stripe.PaymentIntent.create(
                    amount=int(instalment.amount * 100),
                    currency='aud',
                    customer=student.stripe_customer_id,
                    payment_method=plan.stripe_payment_method_id,
                    confirm=True,
                    off_session=True,
                    description=f'{plan.description} — instalment due {instalment.due_date}',
                    metadata={
                        'user_id': student.id,
                        'instalment_id': instalment.id,
                    },
                )
                charged += 1
            except stripe.error.StripeError as e:
                instalment.status = PaymentPlanInstalment.Status.OVERDUE
                instalment.save(update_fields=['status'])
                from apps.users.models import Notification
                Notification.objects.create(
                    recipient=student,
                    title='Payment plan — payment failed',
                    body=f'We could not charge your card for an instalment of ${instalment.amount} on {instalment.due_date}. Please update your payment details.',
                    notification_type='error',
                    action_url='/portal/billing',
                    action_label='View billing',
                )
                failed += 1
                self.stderr.write(f'  Failed instalment {instalment.id}: {e}')

        self.stdout.write(f'Charged {charged}, failed {failed}')
