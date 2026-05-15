from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Enrolment
from .serializers import EnrolmentSerializer
from apps.users.permissions import IsAdminOrInstructor


class EnrolmentListView(generics.ListCreateAPIView):
    serializer_class = EnrolmentSerializer
    permission_classes = [IsAdminOrInstructor]

    def get_queryset(self):
        qs = Enrolment.objects.select_related('student', 'class_session__studio')
        student_id = self.request.query_params.get('student')
        session_id = self.request.query_params.get('session')
        status = self.request.query_params.get('status')
        if student_id:
            qs = qs.filter(student_id=student_id)
        if session_id:
            qs = qs.filter(class_session_id=session_id)
        if status:
            qs = qs.filter(status=status)
        enrolment_type = self.request.query_params.get('enrolment_type')
        if enrolment_type:
            types = [t.strip() for t in enrolment_type.split(',') if t.strip()]
            qs = qs.filter(enrolment_type__in=types)
        return qs


class EnrolmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Enrolment.objects.select_related('student', 'class_session__studio')
    serializer_class = EnrolmentSerializer
    permission_classes = [IsAdminOrInstructor]


class ConvertTrialView(APIView):
    """Convert a trial enrolment to a full course enrolment and record the payment."""
    permission_classes = [IsAdminOrInstructor]

    def post(self, request, pk):
        try:
            enrolment = Enrolment.objects.select_related('student', 'class_session').get(pk=pk)
        except Enrolment.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if enrolment.enrolment_type != 'trial':
            return Response({'detail': 'Enrolment is not a trial.'}, status=status.HTTP_400_BAD_REQUEST)

        from apps.payments.models import Payment, PaymentPlan, PaymentPlanInstalment
        from apps.users.models import StudioSettings
        from decimal import Decimal

        studio = StudioSettings.get()
        season_price = float(studio.price_season)
        trial_price = float(studio.price_trial)

        description = request.data.get(
            'description',
            f'Season enrolment — {enrolment.class_session.name} (converted from trial)'
        )
        notes = request.data.get('notes', '')

        enrolment.enrolment_type = 'course'
        enrolment.notes = (enrolment.notes + '\n' + notes).strip() if notes else enrolment.notes
        enrolment.save(update_fields=['enrolment_type', 'notes'])

        use_plan = request.data.get('payment_plan', False)
        instalments_data = request.data.get('instalments', [])

        if use_plan and instalments_data:
            total = sum(float(i['amount']) for i in instalments_data)
            plan = PaymentPlan.objects.create(
                student=enrolment.student,
                description=description,
                total_amount=Decimal(str(total)),
                status='active',
                created_by=request.user,
            )
            for inst in instalments_data:
                PaymentPlanInstalment.objects.create(
                    plan=plan,
                    amount=Decimal(str(inst['amount'])),
                    due_date=inst['due_date'],
                    status='pending',
                )
            return Response({
                'enrolment': EnrolmentSerializer(enrolment).data,
                'plan_id': plan.id,
                'total_amount': str(plan.total_amount),
            }, status=status.HTTP_200_OK)

        # Single payment
        amount_paid = float(request.data.get('amount_paid', season_price - trial_price))
        payment_type = request.data.get('payment_type', 'payment')
        reference = request.data.get('reference', '')

        payment = Payment.objects.create(
            student=enrolment.student,
            payment_type=payment_type,
            amount=amount_paid,
            description=description,
            reference=reference,
            created_by=request.user,
        )

        return Response({
            'enrolment': EnrolmentSerializer(enrolment).data,
            'payment_id': payment.id,
            'amount_charged': str(payment.amount),
        }, status=status.HTTP_200_OK)
