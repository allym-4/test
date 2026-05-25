import stripe
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings

logger = logging.getLogger(__name__)


@receiver(post_save, sender='payments.Payment')
def auto_charge_saved_card(sender, instance, created, **kwargs):
    """When a new 'charge' payment is created, auto-charge student's saved card if enabled."""
    if not created:
        return
    if instance.payment_type != 'charge':
        return

    student = instance.student
    if not student.auto_charge_saved_card:
        return
    if not student.stripe_customer_id or not student.default_payment_method_id:
        return

    stripe.api_key = settings.STRIPE_SECRET_KEY
    amount_cents = int(round(float(instance.amount) * 100))
    if amount_cents < 50:
        return

    try:
        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency='aud',
            customer=student.stripe_customer_id,
            payment_method=student.default_payment_method_id,
            description=instance.description or 'Duality Pole Studio charge',
            confirm=True,
            off_session=True,
            metadata={
                'user_id': student.id,
                'user_email': student.email,
                'payment_id': instance.id,
            },
        )
        if intent.status == 'succeeded':
            # Convert the charge to a payment record
            instance.payment_type = 'payment'
            instance.reference = (instance.reference + ' ' + intent.id).strip() if instance.reference else intent.id
            instance.save(update_fields=['payment_type', 'reference'])
    except stripe.error.CardError as e:
        logger.warning('Auto-charge card declined for student %s: %s', student.id, e.user_message)
        from apps.users.models import Notification
        Notification.objects.create(
            recipient=student,
            title='Payment declined',
            body=f'Your saved card was declined for: {instance.description or "a charge"}. Please contact the studio.',
            notification_type='billing',
        )
    except Exception as e:
        logger.error('Auto-charge failed for payment %s: %s', instance.id, str(e))


@receiver(post_save, sender='payments.Payment')
def credit_referrer_on_full_payment(sender, instance, created, **kwargs):
    """Credit the referrer $50 when the referred student makes their first full payment."""
    if not created:
        return
    if instance.payment_type != 'payment':
        return
    if not instance.student_id:
        return
    if float(instance.amount or 0) < 270:
        return

    from apps.users.models import Referral, Notification
    referral = Referral.objects.filter(
        referee=instance.student,
        status__in=('pending', 'active'),
    ).first()
    if not referral:
        return

    referral.status = 'credited'
    referral.save(update_fields=['status'])

    credit_amount = float(referral.credit_amount or 50)
    Payment.objects.create(
        student=referral.referrer,
        payment_type='credit',
        amount=credit_amount,
        description=f'Referral credit — {instance.student.display_name} completed their first payment',
        reference=f'referral-{referral.id}',
    )

    Notification.objects.create(
        recipient=referral.referrer,
        title=f'${credit_amount:.0f} referral credit added!',
        body=(
            f'{instance.student.display_name} made their first full payment. '
            f'Your ${credit_amount:.0f} referral credit has been added to your account.'
        ),
        notification_type='success',
        action_label='View Account',
        action_url='/portal/profile',
    )


@receiver(post_save, sender='payments.Payment')
def auto_unblock_on_payment(sender, instance, created, **kwargs):
    """When a payment/credit/refund brings a student's balance to zero or above, auto-unblock them and log a note."""
    if instance.payment_type not in ('payment', 'credit', 'refund'):
        return
    if not instance.student_id:
        return

    student = instance.student
    if not student.booking_blocked:
        return

    from django.db.models import Sum
    credit_types = ('payment', 'refund', 'credit')
    debit_types = ('charge', 'no_show_fee')
    total_paid = Payment.objects.filter(student=student, payment_type__in=credit_types).aggregate(t=Sum('amount'))['t'] or 0
    total_charged = Payment.objects.filter(student=student, payment_type__in=debit_types).aggregate(t=Sum('amount'))['t'] or 0
    balance = float(total_paid) - float(total_charged)

    if balance < 0:
        return

    from django.utils import timezone
    now = timezone.now()

    # Calculate days blocked
    days_blocked = None
    if student.blocked_at:
        delta = now - student.blocked_at
        days_blocked = delta.days

    student.booking_blocked = False
    student.block_reason = ''
    student.blocked_at = None
    student.save(update_fields=['booking_blocked', 'block_reason', 'blocked_at'])

    # Create a staff note recording the block duration
    from apps.users.models import StaffNote, Notification
    duration_str = f'{days_blocked} day{"s" if days_blocked != 1 else ""}' if days_blocked is not None else 'an unknown period'
    StaffNote.objects.create(
        student=student,
        created_by=None,
        tag='billing',
        body=(
            f'Account automatically unblocked after balance was cleared. '
            f'Account was on hold for {duration_str}. '
            f'Payment of ${float(instance.amount):.2f} received ({instance.description or "no description"}).'
        ),
    )

    Notification.objects.create(
        recipient=student,
        title='Account unblocked',
        body='Your outstanding balance has been cleared and your account is now active again. You can book classes as normal.',
        notification_type='success',
        action_label='Book a class',
        action_url='/portal/book',
    )


@receiver(post_save, sender='payments.PaymentPlanInstalment')
def check_plan_completion(sender, instance, **kwargs):
    """When an instalment is marked paid, auto-complete the plan if all instalments are now paid."""
    if instance.status != 'paid':
        return
    plan = instance.plan
    if plan.status == 'completed':
        return
    if plan.instalments.exclude(status='paid').exists():
        return
    plan.status = 'completed'
    plan.save(update_fields=['status'])
    from apps.users.models import Notification
    Notification.objects.create(
        recipient=plan.student,
        title='Payment plan complete!',
        body=f'All instalments for "{plan.description}" have been paid. Thank you!',
        notification_type='success',
    )
