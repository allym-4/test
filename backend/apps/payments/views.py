from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Sum, Q
from .models import Payment, PaymentPlan, PaymentPlanInstalment
from .serializers import (
    PaymentSerializer, PaymentPlanSerializer,
    PaymentPlanInstalmentSerializer, StudentBalanceSerializer
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


class InstalmentDetailView(generics.RetrieveUpdateAPIView):
    queryset = PaymentPlanInstalment.objects.select_related('plan')
    serializer_class = PaymentPlanInstalmentSerializer
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
