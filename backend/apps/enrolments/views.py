from decimal import Decimal
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Enrolment
from .serializers import EnrolmentSerializer
from apps.users.permissions import IsAdminOrInstructor


SEASON_PRICES = {1: 270, 2: 440, 3: 580, 4: 700, 5: 800, 6: 900}


@api_view(['GET'])
@permission_classes([IsAdminOrInstructor])
def enrolment_pricing(request):
    """Return the price for adding a class to a student's schedule.

    GET /api/enrolments/pricing/?student=X&session=Y
    """
    student_id = request.query_params.get('student')
    session_id = request.query_params.get('session')

    if not student_id or not session_id:
        return Response({'detail': 'student and session params are required.'}, status=status.HTTP_400_BAD_REQUEST)

    from apps.classes.models import ClassSession

    try:
        session = ClassSession.objects.select_related('category').get(pk=session_id)
    except ClassSession.DoesNotExist:
        return Response({'detail': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)

    count = Enrolment.objects.filter(student_id=student_id, status='active').count()

    if count == 0:
        # First class — use standalone price or $270 default
        if session.category and session.category.standalone_price:
            price = Decimal(str(session.category.standalone_price))
        else:
            price = Decimal(str(SEASON_PRICES[1]))
    else:
        n = min(count, 5)  # cap at 6 classes total
        price = Decimal(str(SEASON_PRICES[n + 1] - SEASON_PRICES[n]))

    return Response({
        'price': price,
        'num_enrolments': count,
        'is_addon': count > 0,
    })


class EnrolmentListView(generics.ListCreateAPIView):
    serializer_class = EnrolmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Enrolment.objects.select_related('student', 'class_session__studio')
        # Students can only see their own enrolments
        if user.role == 'student':
            qs = qs.filter(student=user)
        else:
            student_id = self.request.query_params.get('student')
            session_id = self.request.query_params.get('session')
            status_ = self.request.query_params.get('status')
            if student_id:
                qs = qs.filter(student_id=student_id)
            if session_id:
                qs = qs.filter(class_session_id=session_id)
            if status_:
                qs = qs.filter(status=status_)
        enrolment_type = self.request.query_params.get('enrolment_type')
        if enrolment_type:
            types = [t.strip() for t in enrolment_type.split(',') if t.strip()]
            qs = qs.filter(enrolment_type__in=types)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        # Students can only enrol themselves
        if user.role == 'student':
            enrolment = serializer.save(student=user)
        else:
            enrolment = serializer.save()

        # Deduct a makeup credit for catchup enrolments
        if enrolment.enrolment_type in ('catchup', 'catch_up'):
            from apps.attendance.models import MakeupCredit
            from django.utils import timezone
            credit = MakeupCredit.objects.filter(
                student=enrolment.student, status='available'
            ).order_by('created_at').first()
            if credit:
                credit.status = 'used'
                credit.used_at = timezone.now()
                credit.save(update_fields=['status', 'used_at'])


class EnrolmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = EnrolmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Enrolment.objects.select_related('student', 'class_session__studio')
        if user.role == 'student':
            return qs.filter(student=user)
        return qs


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


class FlaggedEnrolmentsView(generics.ListAPIView):
    permission_classes = [IsAdminOrInstructor]
    serializer_class = EnrolmentSerializer

    def get_queryset(self):
        from apps.users.models import SkillLevel, StudentSkill

        # Build level rank map from DB
        level_rank = {}
        for sl in SkillLevel.objects.all():
            level_rank[sl.name.lower().strip()] = sl.order

        # Fallback if no SkillLevels configured
        FALLBACK = ['level 1', 'level 2', 'level 3', 'high tricks', 'inter floor']
        if not level_rank:
            level_rank = {name: i for i, name in enumerate(FALLBACK)}

        def rank(level_str):
            if not level_str:
                return -1
            l = level_str.lower().strip()
            if l in level_rank:
                return level_rank[l]
            for key, val in level_rank.items():
                if key in l or l in key:
                    return val
            return -1

        enrolments = Enrolment.objects.filter(
            status='active',
            flag_dismissed=False,
        ).exclude(class_session__level='').select_related('student', 'class_session')

        flagged_ids = []
        self._flag_reasons = {}

        for e in enrolments:
            session_rank = rank(e.class_session.level)
            if session_rank <= 0:
                continue  # Level 1 or unknown — no flag needed

            confirmed = StudentSkill.objects.filter(
                student=e.student, teacher_confirmed=True
            ).values_list('level', flat=True)

            if not confirmed:
                self._flag_reasons[e.id] = 'No prerequisite assessment completed'
                flagged_ids.append(e.id)
            else:
                max_rank = max((rank(lvl) for lvl in confirmed), default=-1)
                if max_rank < session_rank:
                    current = next(
                        (sl.name for sl in SkillLevel.objects.all() if rank(sl.name) == max_rank),
                        f'Level {max_rank + 1}'
                    )
                    self._flag_reasons[e.id] = f'Enrolled above assessed level (currently {current})'
                    flagged_ids.append(e.id)

        return Enrolment.objects.filter(id__in=flagged_ids).select_related('student', 'class_session')

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        data = []
        for e in qs:
            data.append({
                'id': e.id,
                'student_id': e.student_id,
                'student_name': e.student.display_name,
                'session_name': e.class_session.name,
                'session_id': e.class_session_id,
                'flag_reason': self._flag_reasons.get(e.id, ''),
            })
        return Response(data)

    def patch(self, request, pk=None):
        """Dismiss a flag."""
        enrolment = get_object_or_404(Enrolment, pk=pk)
        enrolment.flag_dismissed = True
        enrolment.save(update_fields=['flag_dismissed'])
        return Response({'status': 'dismissed'})
