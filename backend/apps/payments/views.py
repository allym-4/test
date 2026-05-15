from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Sum, Q
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


class PromoCodeListView(generics.ListCreateAPIView):
    queryset = PromoCode.objects.all()
    serializer_class = PromoCodeSerializer
    permission_classes = [IsAdminOrInstructor]


class PromoCodeDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = PromoCode.objects.all()
    serializer_class = PromoCodeSerializer
    permission_classes = [IsAdminOrInstructor]


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
