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
