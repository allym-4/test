import stripe
import json
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from .models import Payment, PaymentPlan, PaymentPlanInstalment
from apps.users.models import User
from apps.users.permissions import IsAdminOrInstructor

stripe.api_key = settings.STRIPE_SECRET_KEY


def get_or_create_customer(user):
    """Return the Stripe customer for this user, creating one if needed."""
    if user.stripe_customer_id:
        return user.stripe_customer_id
    customer = stripe.Customer.create(
        email=user.email,
        name=user.display_name,
        metadata={'user_id': user.id},
    )
    user.stripe_customer_id = customer.id
    user.save(update_fields=['stripe_customer_id'])
    return customer.id


class StripeConfigView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({'publishable_key': settings.STRIPE_PUBLISHABLE_KEY})


class StripePaymentIntentView(APIView):
    """Create a PaymentIntent for a booking or outstanding balance payment."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        amount_cents = request.data.get('amount_cents')
        description = request.data.get('description', 'Duality Pole Studio')
        save_method = request.data.get('save_method', False)

        if not amount_cents or int(amount_cents) < 50:
            return Response({'detail': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)

        customer_id = get_or_create_customer(request.user)

        intent_params = {
            'amount': int(amount_cents),
            'currency': 'aud',
            'customer': customer_id,
            'description': description,
            'metadata': {
                'user_id': request.user.id,
                'user_email': request.user.email,
            },
        }

        if save_method:
            intent_params['setup_future_usage'] = 'off_session'

        intent = stripe.PaymentIntent.create(**intent_params)

        return Response({
            'client_secret': intent.client_secret,
            'payment_intent_id': intent.id,
        })


class StripeSetupIntentView(APIView):
    """Create a SetupIntent to save a card without charging."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        customer_id = get_or_create_customer(request.user)
        intent = stripe.SetupIntent.create(
            customer=customer_id,
            payment_method_types=['card'],
        )
        return Response({'client_secret': intent.client_secret})


class StripePaymentMethodsView(APIView):
    """List saved payment methods for the current user."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.stripe_customer_id:
            return Response({'payment_methods': []})
        methods = stripe.PaymentMethod.list(
            customer=request.user.stripe_customer_id,
            type='card',
        )
        cards = [
            {
                'id': m.id,
                'brand': m.card.brand,
                'last4': m.card.last4,
                'exp_month': m.card.exp_month,
                'exp_year': m.card.exp_year,
            }
            for m in methods.data
        ]
        return Response({'payment_methods': cards})


@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')
        webhook_secret = settings.STRIPE_WEBHOOK_SECRET

        try:
            if webhook_secret:
                event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
            else:
                event = stripe.Event.construct_from(json.loads(payload), stripe.api_key)
        except (ValueError, stripe.error.SignatureVerificationError):
            return Response(status=status.HTTP_400_BAD_REQUEST)

        if event.type == 'payment_intent.succeeded':
            self._handle_payment_succeeded(event.data.object)
        elif event.type == 'payment_intent.payment_failed':
            self._handle_payment_failed(event.data.object)

        return Response({'status': 'ok'})

    def _handle_payment_succeeded(self, intent):
        user_id = intent.metadata.get('user_id')
        if not user_id:
            return
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return

        amount_dollars = intent.amount / 100
        description = intent.description or 'Online payment'

        # Record in the local payments ledger
        Payment.objects.get_or_create(
            reference=intent.id,
            defaults={
                'student': user,
                'payment_type': Payment.PaymentType.PAYMENT,
                'amount': amount_dollars,
                'description': description,
                'created_by': None,
            }
        )

        # If this was for a payment plan instalment, mark it paid
        plan_instalment_id = intent.metadata.get('instalment_id')
        if plan_instalment_id:
            try:
                from django.utils import timezone
                inst = PaymentPlanInstalment.objects.get(pk=plan_instalment_id)
                inst.status = PaymentPlanInstalment.Status.PAID
                inst.paid_date = timezone.now().date()
                inst.save()
            except PaymentPlanInstalment.DoesNotExist:
                pass

    def _handle_payment_failed(self, intent):
        pass  # Could notify the student here
