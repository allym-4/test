from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Sum, Q, Count, F
from django.db.models.functions import TruncMonth
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from .models import Payment, PaymentPlan, PaymentPlanInstalment, Package, StudentPackage, MembershipType, StudentMembership, GiftCard, PromoCode, CancellationOffer
from .serializers import (
    PaymentSerializer, PaymentPlanSerializer,
    PaymentPlanInstalmentSerializer, StudentBalanceSerializer,
    PackageSerializer, StudentPackageSerializer, MembershipTypeSerializer, StudentMembershipSerializer, GiftCardSerializer, PromoCodeSerializer,
    CancellationOfferSerializer,
)
from apps.users.permissions import IsAdminOrInstructor, IsAdminUser
from apps.users.models import User


class PaymentListView(generics.ListCreateAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Payment.objects.select_related('student', 'created_by')
        user = self.request.user
        if user.role not in ('admin', 'instructor'):
            return qs.filter(student=user)
        student_id = self.request.query_params.get('student')
        if student_id:
            qs = qs.filter(student_id=student_id)
        return qs

    def perform_create(self, serializer):
        if self.request.user.role not in ('admin', 'instructor'):
            raise permissions.PermissionDenied
        serializer.save(created_by=self.request.user)


class PaymentDetailView(generics.RetrieveAPIView):
    queryset = Payment.objects.select_related('student', 'created_by')
    serializer_class = PaymentSerializer
    permission_classes = [IsAdminOrInstructor]


class PaymentPlanListView(generics.ListCreateAPIView):
    serializer_class = PaymentPlanSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = PaymentPlan.objects.prefetch_related('instalments').select_related('student')
        user = self.request.user
        if user.role not in ('admin', 'instructor'):
            return qs.filter(student=user)
        student_id = self.request.query_params.get('student')
        if student_id:
            qs = qs.filter(student_id=student_id)
        plan_status = self.request.query_params.get('status')
        if plan_status:
            qs = qs.filter(status=plan_status)
        return qs

    def perform_create(self, serializer):
        if self.request.user.role not in ('admin', 'instructor'):
            raise permissions.PermissionDenied
        serializer.save(created_by=self.request.user)


class PaymentPlanDetailView(generics.RetrieveUpdateAPIView):
    queryset = PaymentPlan.objects.prefetch_related('instalments')
    serializer_class = PaymentPlanSerializer
    permission_classes = [IsAdminOrInstructor]


@api_view(['POST'])
@permission_classes([IsAdminOrInstructor])
def remind_plan(request, pk):
    try:
        plan = PaymentPlan.objects.get(pk=pk)
    except PaymentPlan.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    from apps.users.models import Notification
    next_instalment = plan.instalments.filter(status__in=['pending', 'overdue']).order_by('due_date').first()
    body = f'Payment reminder: your next instalment of ${next_instalment.amount} is due on {next_instalment.due_date}.' if next_instalment else f'Payment reminder for your plan: {plan.description}.'
    Notification.objects.create(
        recipient=plan.student,
        title='Payment Reminder',
        body=body,
        notification_type='payment',
    )
    return Response({'status': 'reminder sent'})


class InstalmentListView(generics.ListCreateAPIView):
    queryset = PaymentPlanInstalment.objects.select_related('plan')
    serializer_class = PaymentPlanInstalmentSerializer
    permission_classes = [IsAdminOrInstructor]


class InstalmentDetailView(generics.RetrieveUpdateAPIView):
    queryset = PaymentPlanInstalment.objects.select_related('plan')
    serializer_class = PaymentPlanInstalmentSerializer
    permission_classes = [IsAdminOrInstructor]

    def perform_update(self, serializer):
        from django.utils.timezone import now
        instance = self.get_object()
        new_status = serializer.validated_data.get('status', instance.status)
        if new_status == 'paid' and instance.status != 'paid' and not serializer.validated_data.get('paid_date'):
            serializer.save(paid_date=now().date())
        else:
            serializer.save()


class PackageListView(generics.ListCreateAPIView):
    serializer_class = PackageSerializer
    permission_classes = [IsAdminOrInstructor]

    def get_queryset(self):
        qs = Package.objects.all()
        if self.request.query_params.get('active') == 'true':
            qs = qs.filter(is_active=True)
        return qs


class PackageDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Package.objects.all()
    serializer_class = PackageSerializer
    permission_classes = [IsAdminOrInstructor]


class StudentPackageListView(generics.ListCreateAPIView):
    serializer_class = StudentPackageSerializer
    permission_classes = [IsAdminOrInstructor]

    def get_queryset(self):
        qs = StudentPackage.objects.select_related('student', 'package')
        student_id = self.request.query_params.get('student')
        if student_id:
            qs = qs.filter(student_id=student_id)
        if self.request.query_params.get('active') == 'true':
            qs = qs.filter(is_active=True)
        return qs


class StudentPackageDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = StudentPackage.objects.select_related('student', 'package')
    serializer_class = StudentPackageSerializer
    permission_classes = [IsAdminOrInstructor]


class MembershipTypeListView(generics.ListCreateAPIView):
    queryset = MembershipType.objects.all()
    serializer_class = MembershipTypeSerializer
    permission_classes = [IsAdminOrInstructor]


class MembershipTypeDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = MembershipType.objects.all()
    serializer_class = MembershipTypeSerializer
    permission_classes = [IsAdminOrInstructor]


class StudentMembershipListView(generics.ListCreateAPIView):
    serializer_class = StudentMembershipSerializer
    permission_classes = [IsAdminOrInstructor]

    def get_queryset(self):
        qs = StudentMembership.objects.select_related('student', 'membership_type')
        student = self.request.query_params.get('student')
        if student:
            qs = qs.filter(student_id=student)
        return qs


class StudentMembershipDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = StudentMembership.objects.select_related('student', 'membership_type')
    serializer_class = StudentMembershipSerializer
    permission_classes = [IsAdminOrInstructor]


class BulkAssignMembershipView(APIView):
    permission_classes = [IsAdminOrInstructor]

    def post(self, request):
        from django.utils.dateparse import parse_date
        student_ids = request.data.get('student_ids', [])
        membership_type_id = request.data.get('membership_type_id')
        start_date = request.data.get('start_date')
        if not student_ids or not membership_type_id or not start_date:
            return Response({'detail': 'student_ids, membership_type_id and start_date are required.'}, status=400)
        try:
            membership_type = MembershipType.objects.get(pk=membership_type_id)
        except MembershipType.DoesNotExist:
            return Response({'detail': 'Membership type not found.'}, status=404)
        created = []
        for sid in student_ids:
            obj, _ = StudentMembership.objects.get_or_create(
                student_id=sid,
                membership_type=membership_type,
                defaults={'start_date': start_date, 'status': 'active'},
            )
            created.append(obj.id)
        return Response({'assigned': len(created)})


class GiftCardListView(generics.ListCreateAPIView):
    serializer_class = GiftCardSerializer
    permission_classes = [IsAdminOrInstructor]

    def get_queryset(self):
        qs = GiftCard.objects.all()
        code = self.request.query_params.get('code')
        if code:
            qs = qs.filter(code__icontains=code)
        return qs


class GiftCardDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = GiftCard.objects.all()
    serializer_class = GiftCardSerializer
    permission_classes = [IsAdminOrInstructor]


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def redeem_gift_card(request):
    code = request.data.get('code', '').strip().upper()
    if not code:
        return Response({'detail': 'Code is required.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        card = GiftCard.objects.get(code=code, is_active=True)
    except GiftCard.DoesNotExist:
        return Response({'detail': 'Invalid or already used gift card code.'}, status=status.HTTP_404_NOT_FOUND)
    if card.balance <= 0:
        return Response({'detail': 'This gift card has no remaining balance.'}, status=status.HTTP_400_BAD_REQUEST)
    from django.utils import timezone
    if card.expires_at and card.expires_at < timezone.now().date():
        return Response({'detail': 'This gift card has expired.'}, status=status.HTTP_400_BAD_REQUEST)
    card.redeemed_by = request.user
    card.redeemed_at = timezone.now()
    card.is_active = False
    card.save()
    Payment.objects.create(
        student=request.user,
        payment_type=Payment.PaymentType.CREDIT,
        amount=card.balance,
        description=f'Gift card redeemed ({card.code})',
        reference=card.code,
        created_by=request.user,
    )
    return Response({'detail': f'Gift card redeemed! ${card.balance:.2f} credit added to your account.', 'balance': str(card.balance)})


class PromoCodeListView(generics.ListCreateAPIView):
    queryset = PromoCode.objects.all()
    serializer_class = PromoCodeSerializer
    permission_classes = [IsAdminOrInstructor]


class PromoCodeDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = PromoCode.objects.all()
    serializer_class = PromoCodeSerializer
    permission_classes = [IsAdminOrInstructor]


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def validate_promo_code(request):
    code = request.data.get('code', '').strip().upper()
    item_type = request.data.get('item_type', 'all')
    amount = request.data.get('amount')

    if not code:
        return Response({'detail': 'Code is required.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        promo = PromoCode.objects.get(code=code, is_active=True)
    except PromoCode.DoesNotExist:
        return Response({'detail': 'Invalid or expired promo code.'}, status=status.HTTP_404_NOT_FOUND)

    from django.utils import timezone
    if promo.expires_at and promo.expires_at < timezone.now().date():
        return Response({'detail': 'This promo code has expired.'}, status=status.HTTP_400_BAD_REQUEST)
    if promo.max_uses and promo.current_uses >= promo.max_uses:
        return Response({'detail': 'This promo code has reached its usage limit.'}, status=status.HTTP_400_BAD_REQUEST)
    if promo.applies_to != 'all' and item_type and promo.applies_to != item_type:
        return Response({'detail': f'This code only applies to {promo.get_applies_to_display().lower()}.'}, status=status.HTTP_400_BAD_REQUEST)

    original = float(amount) if amount else None
    if promo.discount_type == 'percentage':
        discount = round(original * float(promo.discount_value) / 100, 2) if original is not None else None
    else:
        discount = float(promo.discount_value)

    final = max(0, original - discount) if original is not None and discount is not None else None

    return Response({
        'id': promo.id,
        'code': promo.code,
        'discount_type': promo.discount_type,
        'discount_value': str(promo.discount_value),
        'applies_to': promo.applies_to,
        'discount': discount,
        'final_amount': final,
        'original_amount': original,
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def use_promo_code(request):
    code = request.data.get('code', '').strip().upper()
    if not code:
        return Response({'detail': 'Code is required.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        promo = PromoCode.objects.get(code=code, is_active=True)
    except PromoCode.DoesNotExist:
        return Response({'detail': 'Invalid promo code.'}, status=status.HTTP_404_NOT_FOUND)
    PromoCode.objects.filter(pk=promo.pk).update(current_uses=F('current_uses') + 1)
    promo.refresh_from_db()
    return Response({'status': 'ok', 'current_uses': promo.current_uses})


class PaymentStatsView(APIView):
    """Pre-aggregated payment analytics for the reporting dashboard."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = Payment.objects.all()

        # Totals by type
        type_totals = {}
        for row in (
            qs.values('payment_type')
            .annotate(total=Sum('amount'), count=Count('id'))
        ):
            type_totals[row['payment_type']] = {
                'total': float(row['total'] or 0),
                'count': row['count'],
            }

        # Monthly revenue (payments only) — last 12 months
        twelve_months_ago = date.today() - relativedelta(months=12)
        monthly_qs = (
            qs.filter(payment_type='payment', created_at__date__gte=twelve_months_ago)
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(revenue=Sum('amount'), count=Count('id'))
            .order_by('month')
        )
        monthly = [
            {
                'month': row['month'].strftime('%Y-%m') if row['month'] else None,
                'label': row['month'].strftime('%b %y') if row['month'] else '',
                'revenue': float(row['revenue'] or 0),
                'count': row['count'],
            }
            for row in monthly_qs
        ]

        # Recent transactions (last 20)
        recent = list(
            qs.select_related('student')
            .order_by('-created_at')[:20]
            .values('id', 'payment_type', 'amount', 'created_at',
                    'student__first_name', 'student__last_name', 'student__email')
        )
        for r in recent:
            name = f"{r.pop('student__first_name', '')} {r.pop('student__last_name', '')}".strip()
            r['student_name'] = name or r.pop('student__email', '')
            r['amount'] = float(r['amount'])
            r['created_at'] = r['created_at'].isoformat() if r['created_at'] else None

        return Response({
            'by_type': type_totals,
            'monthly': monthly,
            'recent': recent,
        })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def student_balance(request, student_pk):
    if request.user.role not in ('admin', 'instructor') and request.user.pk != int(student_pk):
        return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        student = User.objects.get(pk=student_pk)
    except User.DoesNotExist:
        return Response({'detail': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)
    payments = Payment.objects.filter(student=student)
    credit_types = (
        Payment.PaymentType.PAYMENT,
        Payment.PaymentType.REFUND,
        Payment.PaymentType.CREDIT,
    )
    debit_types = (
        Payment.PaymentType.CHARGE,
        Payment.PaymentType.NO_SHOW_FEE,
    )
    total_paid = payments.filter(payment_type__in=credit_types).aggregate(
        t=Sum('amount'))['t'] or 0
    total_charged = payments.filter(payment_type__in=debit_types).aggregate(
        t=Sum('amount'))['t'] or 0
    balance = total_paid - total_charged
    return Response({
        'student_id': student.pk,
        'balance': balance,
        'total_charged': total_charged,
        'total_paid': total_paid,
        'booking_blocked': student.booking_blocked,
    })


@api_view(['POST'])
@permission_classes([IsAdminOrInstructor])
def send_cancellation_offers(request, occurrence_pk):
    """
    Mark an occurrence as cancelled and email every enrolled student with
    a choice: account credit (dollar value of one class) or makeup credit.
    Idempotent — skips students who already have an offer for this occurrence.
    """
    from apps.classes.models import ClassOccurrence
    from apps.enrolments.models import Enrolment
    from .models import per_class_credit_value
    from apps.users.models import Notification
    from django.core.mail import send_mail
    from django.utils.timezone import now

    try:
        occurrence = ClassOccurrence.objects.select_related('session').get(pk=occurrence_pk)
    except ClassOccurrence.DoesNotExist:
        return Response({'detail': 'Occurrence not found.'}, status=status.HTTP_404_NOT_FOUND)

    occurrence.status = ClassOccurrence.Status.CANCELLED
    occurrence.save(update_fields=['status'])

    # All active enrolments for this session
    enrolments = Enrolment.objects.filter(
        class_session=occurrence.session,
        status='active',
    ).select_related('student')

    # Count how many active sessions each student is enrolled in (for pricing tier)
    created_count = 0
    for enrolment in enrolments:
        student = enrolment.student
        # Don't create duplicate offers
        if CancellationOffer.objects.filter(student=student, occurrence=occurrence).exists():
            continue

        num_classes = Enrolment.objects.filter(
            student=student, status='active'
        ).count()
        credit_amount = per_class_credit_value(num_classes)

        offer = CancellationOffer.objects.create(
            student=student,
            occurrence=occurrence,
            credit_amount=credit_amount,
        )

        # In-app notification
        Notification.objects.create(
            recipient=student,
            title='Class Cancelled — Choose Your Option',
            body=(
                f'Your {occurrence.session.name} class on {occurrence.date} has been cancelled. '
                f'You can choose a ${credit_amount:.2f} account credit or a makeup class credit. '
                f'Please log in to your account to make your selection.'
            ),
            notification_type='payment',
        )

        # Email
        try:
            send_mail(
                subject=f'Your class on {occurrence.date} has been cancelled',
                message=(
                    f'Hi {student.first_name or student.display_name},\n\n'
                    f'Your {occurrence.session.name} class on {occurrence.date} has been cancelled.\n\n'
                    f'We\'d like to offer you one of the following:\n'
                    f'  • A ${credit_amount:.2f} account credit (the value of one class at your current enrolment)\n'
                    f'  • A makeup class credit to use in any class\n\n'
                    f'Please log in to your Duality account to choose your preference:\n'
                    f'https://dualitypole.com/portal\n\n'
                    f'If you have any questions, reply to this email or call us on (02) 9160 0223.\n\n'
                    f'The Duality team'
                ),
                from_email=None,
                recipient_list=[student.email],
                fail_silently=True,
            )
            offer.email_sent = True
            offer.save(update_fields=['email_sent'])
        except Exception:
            pass

        created_count += 1

    return Response({
        'status': 'ok',
        'offers_created': created_count,
        'occurrence': str(occurrence),
    })


class CancellationOfferListView(generics.ListAPIView):
    """Admin: list all cancellation offers, optionally filtered by occurrence."""
    serializer_class = CancellationOfferSerializer
    permission_classes = [IsAdminOrInstructor]

    def get_queryset(self):
        qs = CancellationOffer.objects.select_related('student', 'occurrence__session')
        occurrence_id = self.request.query_params.get('occurrence')
        if occurrence_id:
            qs = qs.filter(occurrence_id=occurrence_id)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs


class MyCancellationOffersView(generics.ListAPIView):
    """Student: list their own pending cancellation offers."""
    serializer_class = CancellationOfferSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CancellationOffer.objects.filter(
            student=self.request.user,
            status=CancellationOffer.Status.PENDING,
        ).select_related('occurrence__session')


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def resolve_cancellation_offer(request, pk):
    """Student chooses 'credit' or 'makeup'."""
    from django.utils.timezone import now
    from apps.attendance.models import MakeupCredit

    choice = request.data.get('choice')
    if choice not in ('credit', 'makeup'):
        return Response({'detail': "choice must be 'credit' or 'makeup'."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        offer = CancellationOffer.objects.get(pk=pk, student=request.user, status=CancellationOffer.Status.PENDING)
    except CancellationOffer.DoesNotExist:
        return Response({'detail': 'Offer not found or already resolved.'}, status=status.HTTP_404_NOT_FOUND)

    if choice == 'credit':
        Payment.objects.create(
            student=request.user,
            payment_type=Payment.PaymentType.CREDIT,
            amount=offer.credit_amount,
            description=f'Cancellation credit — {offer.occurrence}',
            created_by=None,
        )
        offer.status = CancellationOffer.Status.ACCEPTED_CREDIT
    else:
        MakeupCredit.objects.create(
            student=request.user,
            reason=f'Cancellation makeup — {offer.occurrence}',
            status='available',
        )
        offer.status = CancellationOffer.Status.ACCEPTED_MAKEUP

    offer.resolved_at = now()
    offer.save(update_fields=['status', 'resolved_at'])
    return Response(CancellationOfferSerializer(offer).data)


class DashboardStatsView(APIView):
    """Server-side aggregations for the admin dashboard KPIs."""
    permission_classes = [IsAdminOrInstructor]

    def get(self, request):
        today = date.today()
        week_start = today - timedelta(days=today.weekday())  # Monday

        # Today's revenue (payments received today)
        today_revenue = Payment.objects.filter(
            payment_type=Payment.PaymentType.PAYMENT,
            created_at__date=today,
        ).aggregate(t=Sum('amount'))['t'] or 0

        # Week bookings — trial/casual enrolments created this week
        from apps.enrolments.models import Enrolment
        week_bookings = Enrolment.objects.filter(
            enrolment_type__in=['trial', 'casual'],
            enrolled_date__gte=week_start,
        ).count()

        # Recent payments (last 8)
        recent_qs = (
            Payment.objects.select_related('student')
            .order_by('-created_at')[:8]
            .values('id', 'payment_type', 'amount', 'created_at', 'description',
                    'student__first_name', 'student__last_name', 'student__email')
        )
        recent_payments = []
        for r in recent_qs:
            name = f"{r.pop('student__first_name', '')} {r.pop('student__last_name', '')}".strip()
            r['student_name'] = name or r.pop('student__email', '')
            r['amount'] = float(r['amount'])
            r['created_at'] = r['created_at'].isoformat() if r['created_at'] else None
            recent_payments.append(r)

        # Overdue balances — top 5 students with net amount owing
        credit_types = [Payment.PaymentType.PAYMENT, Payment.PaymentType.REFUND, Payment.PaymentType.CREDIT]
        debit_types = [Payment.PaymentType.CHARGE, Payment.PaymentType.NO_SHOW_FEE]

        from django.db.models import OuterRef, Subquery
        from apps.users.models import User

        credit_agg = (
            Payment.objects.filter(student=OuterRef('pk'), payment_type__in=credit_types)
            .values('student').annotate(t=Sum('amount')).values('t')
        )
        debit_agg = (
            Payment.objects.filter(student=OuterRef('pk'), payment_type__in=debit_types)
            .values('student').annotate(t=Sum('amount')).values('t')
        )

        students_owing = (
            User.objects.filter(role='student')
            .annotate(
                total_paid=Subquery(credit_agg[:1]),
                total_charged=Subquery(debit_agg[:1]),
            )
        )
        overdue_balances = []
        for s in students_owing:
            paid = float(s.total_paid or 0)
            charged = float(s.total_charged or 0)
            owing = charged - paid
            if owing > 0:
                overdue_balances.append({
                    'key': s.pk,
                    'name': s.get_full_name() or s.email,
                    'charged': charged,
                    'paid': paid,
                    'owing': owing,
                })
        overdue_balances.sort(key=lambda x: -x['owing'])
        overdue_balances = overdue_balances[:5]

        # Pending payment plan approvals
        pending_plans_count = PaymentPlan.objects.filter(status='pending_approval').count()

        # Active student count
        active_student_count = User.objects.filter(role='student', is_active=True).count()

        # Overdue cash promises
        from datetime import date as _date
        overdue_cash = Payment.objects.filter(
            payment_type='charge',
            cash_promised_date__lte=_date.today(),
            cash_promised_date__isnull=False,
            cash_received=False,
        ).select_related('student').order_by('cash_promised_date')
        overdue_cash_list = [
            {
                'id': p.id,
                'student_id': p.student_id,
                'student_name': p.student.display_name,
                'amount': float(p.amount),
                'description': p.description,
                'cash_promised_date': str(p.cash_promised_date),
                'reminder_sent': bool(p.cash_reminder_sent_at),
                'auto_charge_at': p.cash_auto_charge_at.isoformat() if p.cash_auto_charge_at else None,
            }
            for p in overdue_cash
        ]

        return Response({
            'today_revenue': float(today_revenue),
            'week_bookings': week_bookings,
            'recent_payments': recent_payments,
            'overdue_balances': overdue_balances,
            'outstanding_balance': sum(b['owing'] for b in overdue_balances),
            'pending_plans_count': pending_plans_count,
            'active_student_count': active_student_count,
            'overdue_cash_promises': overdue_cash_list,
        })


class PaymentChaseListCreateView(generics.ListCreateAPIView):
    """List chase history for a student; create a new chase."""
    permission_classes = [IsAdminOrInstructor]

    def get_queryset(self):
        from .models import PaymentChase
        student_id = self.request.query_params.get('student_id')
        qs = PaymentChase.objects.select_related('sent_by')
        if student_id:
            qs = qs.filter(student_id=student_id)
        return qs

    def list(self, request, *args, **kwargs):
        from .models import PaymentChase
        qs = self.get_queryset()
        data = [
            {
                'id': c.id,
                'step': c.step,
                'step_label': c.get_step_display(),
                'message': c.message,
                'locked_account': c.locked_account,
                'sent_by_name': c.sent_by.display_name if c.sent_by else '—',
                'sent_at': c.sent_at.isoformat(),
            }
            for c in qs
        ]
        return Response(data)

    def create(self, request, *args, **kwargs):
        from .models import PaymentChase
        from apps.users.models import User
        student_id = request.data.get('student_id')
        message = request.data.get('message', '')
        lock_account = request.data.get('lock_account', False)

        try:
            student = User.objects.get(pk=student_id)
        except User.DoesNotExist:
            return Response({'detail': 'Student not found.'}, status=404)

        # Determine next step
        existing = PaymentChase.objects.filter(student=student).count()
        step = min(existing + 1, 3)

        chase = PaymentChase.objects.create(
            student=student,
            step=step,
            message=message,
            locked_account=bool(lock_account),
            sent_by=request.user,
        )

        if lock_account:
            from django.utils import timezone as tz
            student.booking_blocked = True
            student.blocked_at = tz.now()
            student.save(update_fields=['booking_blocked', 'blocked_at'])

        # Send in-app notification
        try:
            from apps.notifications.models import Notification
            Notification.objects.create(
                user=student,
                title='Payment reminder',
                body=message,
                notification_type='payment',
            )
        except Exception:
            pass

        return Response({
            'id': chase.id,
            'step': chase.step,
            'step_label': chase.get_step_display(),
            'locked_account': chase.locked_account,
        }, status=201)


class CashPromiseView(APIView):
    """Admin: mark cash received or send the 24h reminder email."""
    permission_classes = [IsAdminOrInstructor]

    def post(self, request, pk):
        from .models import Payment
        from django.utils import timezone
        import datetime

        try:
            charge = Payment.objects.get(pk=pk, payment_type='charge', cash_promised_date__isnull=False)
        except Payment.DoesNotExist:
            return Response({'detail': 'Cash charge not found.'}, status=404)

        action = request.data.get('action')  # 'received' or 'remind'

        if action == 'received':
            # Record cash received — create matching payment and mark resolved
            Payment.objects.create(
                student=charge.student,
                payment_type=Payment.PaymentType.PAYMENT,
                amount=charge.amount,
                description=f'Cash received — {charge.description}',
                reference='cash',
                created_by=request.user,
            )
            charge.cash_received = True
            charge.save(update_fields=['cash_received'])
            return Response({'status': 'received'})

        elif action == 'remind':
            # Send reminder email, set 24h auto-charge timer
            from apps.emails.utils import send_branded_email
            first = charge.student.first_name or 'there'
            amt = f'${charge.amount:.2f}'
            auto_charge_at = timezone.now() + datetime.timedelta(hours=24)
            charge.cash_reminder_sent_at = timezone.now()
            charge.cash_auto_charge_at = auto_charge_at
            charge.save(update_fields=['cash_reminder_sent_at', 'cash_auto_charge_at'])

            if charge.student.email:
                try:
                    send_branded_email(
                        to_email=charge.student.email,
                        subject='Payment reminder — cash not received',
                        template_name='payment_received',
                        context={
                            'first_name': first,
                            'amount': str(charge.amount),
                            'description': charge.description,
                            'plain_text': (
                                f"Hi {first}, we haven't received your cash payment of {amt} for {charge.description}. "
                                f"If this isn't resolved, your card on file will be automatically charged in 24 hours. "
                                f"Please contact us if you have any questions. — Duality Pole"
                            ),
                        },
                    )
                except Exception:
                    pass

            return Response({'status': 'reminded', 'auto_charge_at': auto_charge_at.isoformat()})

        return Response({'detail': 'action must be received or remind.'}, status=400)


class OverdueCashPromisesView(APIView):
    """Admin: list all overdue cash promises (promised date passed, not received, reminder not yet sent)."""
    permission_classes = [IsAdminOrInstructor]

    def get(self, request):
        from .models import Payment
        from datetime import date
        overdue = Payment.objects.filter(
            payment_type='charge',
            cash_promised_date__lte=date.today(),
            cash_promised_date__isnull=False,
            cash_received=False,
        ).select_related('student').order_by('cash_promised_date')

        data = [
            {
                'id': p.id,
                'student_id': p.student_id,
                'student_name': p.student.display_name,
                'amount': float(p.amount),
                'description': p.description,
                'cash_promised_date': str(p.cash_promised_date),
                'reminder_sent': bool(p.cash_reminder_sent_at),
                'reminder_sent_at': p.cash_reminder_sent_at.isoformat() if p.cash_reminder_sent_at else None,
                'auto_charge_at': p.cash_auto_charge_at.isoformat() if p.cash_auto_charge_at else None,
            }
            for p in overdue
        ]
        return Response(data)
