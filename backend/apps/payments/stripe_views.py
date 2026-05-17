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
    """List saved payment methods for the current user (or a student if admin)."""
    permission_classes = [permissions.IsAuthenticated]

    def _get_target_user(self, request):
        student_id = request.query_params.get('student_id') or request.data.get('student_id')
        if student_id and request.user.role in ('admin', 'instructor', 'staff'):
            return User.objects.get(pk=student_id)
        return request.user

    def get(self, request):
        try:
            target = self._get_target_user(request)
        except User.DoesNotExist:
            return Response({'detail': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not target.stripe_customer_id:
            return Response({'payment_methods': [], 'auto_charge': target.auto_charge_saved_card, 'default_payment_method_id': target.default_payment_method_id})
        methods = stripe.PaymentMethod.list(
            customer=target.stripe_customer_id,
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
        return Response({
            'payment_methods': cards,
            'auto_charge': target.auto_charge_saved_card,
            'default_payment_method_id': target.default_payment_method_id,
        })

    def delete(self, request):
        """Detach (remove) a saved payment method."""
        pm_id = request.data.get('payment_method_id')
        if not pm_id:
            return Response({'detail': 'payment_method_id required.'}, status=status.HTTP_400_BAD_REQUEST)
        target = self._get_target_user(request)
        saved_ids = [
            pm['id'] for pm in stripe.PaymentMethod.list(customer=target.stripe_customer_id, type='card').get('data', [])
        ] if target.stripe_customer_id else []
        if pm_id not in saved_ids:
            return Response({'detail': 'Payment method not found.'}, status=status.HTTP_404_NOT_FOUND)
        stripe.PaymentMethod.detach(pm_id)
        # Clear default if this was the default
        if request.user.default_payment_method_id == pm_id:
            request.user.default_payment_method_id = ''
            request.user.save(update_fields=['default_payment_method_id'])
        return Response({'status': 'removed'})

    def patch(self, request):
        """Update auto-charge setting and/or default payment method."""
        try:
            user = self._get_target_user(request)
        except User.DoesNotExist:
            return Response({'detail': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)
        if 'auto_charge' in request.data:
            user.auto_charge_saved_card = bool(request.data['auto_charge'])
        if 'default_payment_method_id' in request.data:
            user.default_payment_method_id = request.data['default_payment_method_id'] or ''
        user.save(update_fields=['auto_charge_saved_card', 'default_payment_method_id'])
        return Response({'auto_charge': user.auto_charge_saved_card, 'default_payment_method_id': user.default_payment_method_id})


class StripeChargeSavedCardView(APIView):
    """Charge a student's saved default card off-session (admin-initiated)."""
    permission_classes = [IsAdminOrInstructor]

    def post(self, request):
        student_id = request.data.get('student_id')
        amount_cents = request.data.get('amount_cents')
        description = request.data.get('description', 'Duality Pole Studio charge')
        payment_id = request.data.get('payment_id')  # optionally link to existing Payment record

        if not student_id or not amount_cents:
            return Response({'detail': 'student_id and amount_cents required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            student = User.objects.get(pk=student_id)
        except User.DoesNotExist:
            return Response({'detail': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not student.stripe_customer_id or not student.default_payment_method_id:
            return Response({'detail': 'Student has no saved card.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            intent = stripe.PaymentIntent.create(
                amount=int(amount_cents),
                currency='aud',
                customer=student.stripe_customer_id,
                payment_method=student.default_payment_method_id,
                description=description,
                confirm=True,
                off_session=True,
                metadata={
                    'user_id': student.id,
                    'user_email': student.email,
                    'payment_id': payment_id or '',
                },
            )
        except stripe.error.CardError as e:
            return Response({'detail': f'Card declined: {e.user_message}'}, status=status.HTTP_402_PAYMENT_REQUIRED)
        except stripe.error.StripeError as e:
            return Response({'detail': str(e)}, status=status.HTTP_502_BAD_GATEWAY)

        # Record in ledger if not linking to existing payment
        if not payment_id:
            payment = Payment.objects.create(
                student=student,
                payment_type=Payment.PaymentType.PAYMENT,
                amount=int(amount_cents) / 100,
                description=description,
                reference=intent.id,
                created_by=request.user,
            )
            payment_id = payment.id

        return Response({
            'status': 'succeeded',
            'payment_intent_id': intent.id,
            'payment_id': payment_id,
        })


@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')
        webhook_secret = settings.STRIPE_WEBHOOK_SECRET

        if not webhook_secret:
            return Response({'detail': 'Webhook secret not configured.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
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

        # If this was for a payment plan instalment, mark it paid and check plan completion
        plan_instalment_id = intent.metadata.get('instalment_id')
        if plan_instalment_id:
            try:
                from django.utils import timezone
                inst = PaymentPlanInstalment.objects.get(pk=plan_instalment_id)
                inst.status = PaymentPlanInstalment.Status.PAID
                inst.paid_date = timezone.now().date()
                inst.save()
                # Check if all instalments are now paid → complete the plan
                plan = inst.plan
                if not plan.instalments.exclude(status=PaymentPlanInstalment.Status.PAID).exists():
                    plan.status = PaymentPlan.Status.COMPLETED
                    plan.save(update_fields=['status'])
                    from apps.users.models import Notification
                    Notification.objects.create(
                        recipient=plan.student,
                        title='Payment plan complete!',
                        body=f'All instalments for "{plan.description}" have been paid. Thank you!',
                        notification_type='success',
                    )
            except PaymentPlanInstalment.DoesNotExist:
                pass

    def _handle_payment_failed(self, intent):
        user_id = intent.metadata.get('user_id')
        if not user_id:
            return
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return
        from apps.users.models import Notification
        description = intent.description or 'a payment'
        Notification.objects.create(
            recipient=user,
            title='Payment failed',
            body=f'Your payment for {description} could not be processed. Please update your payment details or contact the studio.',
            notification_type='billing',
        )
        from django.core.mail import send_mail
        from django.conf import settings as django_settings
        if user.email:
            send_mail(
                subject='Payment failed — Duality Pole Studio',
                message=(
                    f'Hi {user.first_name},\n\n'
                    f'Your payment for "{description}" was declined.\n\n'
                    f'Please contact the studio or update your payment method.\n\n'
                    f'Duality Pole Studio'
                ),
                from_email=django_settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )
