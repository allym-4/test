from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Sum, Q, Count
from django.db.models.functions import TruncMonth
from datetime import date
from dateutil.relativedelta import relativedelta
from .models import Payment, PaymentPlan, PaymentPlanInstalment, Package, StudentPackage, MembershipType, GiftCard, PromoCode
from .serializers import (
    PaymentSerializer, PaymentPlanSerializer,
    PaymentPlanInstalmentSerializer, StudentBalanceSerializer,
    PackageSerializer, StudentPackageSerializer, MembershipTypeSerializer, GiftCardSerializer, PromoCodeSerializer,
)
from apps.users.permissions import IsAdminOrInstructor
from apps.users.models import User


class PaymentListView(generics.ListCreateAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [IsAdminOrInstructor]

    def get_queryset(self):
        qs = Payment.objects.select_related('student', 'created_by')
        student_id = self.request.query_params.get('student')
        if student_id:
            qs = qs.filter(student_id=student_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class PaymentDetailView(generics.RetrieveAPIView):
    queryset = Payment.objects.select_related('student', 'created_by')
    serializer_class = PaymentSerializer
    permission_classes = [IsAdminOrInstructor]


class PaymentPlanListView(generics.ListCreateAPIView):
    serializer_class = PaymentPlanSerializer
    permission_classes = [IsAdminOrInstructor]

    def get_queryset(self):
        qs = PaymentPlan.objects.prefetch_related('instalments')
        student_id = self.request.query_params.get('student')
        if student_id:
            qs = qs.filter(student_id=student_id)
        return qs

    def perform_create(self, serializer):
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
    card.redeemed_by = request.user
    card.is_active = False
    card.save()
    return Response({'detail': f'Gift card redeemed! ${card.balance:.2f} credit added to your account.', 'balance': str(card.balance)})


class PromoCodeListView(generics.ListCreateAPIView):
    queryset = PromoCode.objects.all()
    serializer_class = PromoCodeSerializer
    permission_classes = [IsAdminOrInstructor]


class PromoCodeDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = PromoCode.objects.all()
    serializer_class = PromoCodeSerializer
    permission_classes = [IsAdminOrInstructor]


class PaymentStatsView(APIView):
    """Pre-aggregated payment analytics for the reporting dashboard."""
    permission_classes = [IsAdminOrInstructor]

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
                    'student__first_name', 'student__last_name', 'student__email', 'note')
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
@permission_classes([IsAdminOrInstructor])
def student_balance(request, student_pk):
    """Return running balance for a student."""
    student = User.objects.get(pk=student_pk)
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
    })
