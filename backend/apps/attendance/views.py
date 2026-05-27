from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import AttendanceRecord, MakeupCredit, ClassPass
from .serializers import AttendanceRecordSerializer
from apps.users.permissions import IsAdminOrInstructor
from apps.classes.models import ClassOccurrence
from apps.enrolments.models import Enrolment


class AttendanceListView(generics.ListCreateAPIView):
    serializer_class = AttendanceRecordSerializer
    permission_classes = [IsAdminOrInstructor]

    def get_queryset(self):
        qs = AttendanceRecord.objects.select_related(
            'student', 'occurrence__session__studio', 'recorded_by'
        )
        occurrence_id = self.request.query_params.get('occurrence')
        student_id = self.request.query_params.get('student')
        if occurrence_id:
            qs = qs.filter(occurrence_id=occurrence_id)
        if student_id:
            qs = qs.filter(student_id=student_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)


class AttendanceDetailView(generics.RetrieveUpdateAPIView):
    queryset = AttendanceRecord.objects.select_related('student', 'occurrence__session')
    serializer_class = AttendanceRecordSerializer
    permission_classes = [IsAdminOrInstructor]

    def perform_update(self, serializer):
        serializer.save(recorded_by=self.request.user)


@api_view(['POST'])
@permission_classes([IsAdminOrInstructor])
def bulk_save_register(request, occurrence_pk):
    """Save the full attendance register for a class occurrence in one call."""
    occurrence = get_object_or_404(ClassOccurrence, pk=occurrence_pk)
    records = request.data.get('records', [])
    saved = []
    for record in records:
        prev_status = None
        try:
            prev_status = AttendanceRecord.objects.get(
                occurrence=occurrence, student_id=record['student']
            ).status
        except AttendanceRecord.DoesNotExist:
            pass

        new_status = record.get('status', 'present')
        obj, created = AttendanceRecord.objects.update_or_create(
            occurrence=occurrence,
            student_id=record['student'],
            defaults={
                'status': new_status,
                'no_show_fee_charged': record.get('no_show_fee_charged', False),
                'no_show_fee_waived': record.get('no_show_fee_waived', False),
                'note': record.get('note', ''),
                'note_tag': record.get('note_tag', ''),
                'kisi_access_granted': record.get('kisi_access_granted', False),
                'recorded_by': request.user,
            }
        )

        # Auto-issue makeup credit for absent (proper notice) only — not no_show
        if new_status == 'absent' and prev_status != 'absent':
            session = getattr(occurrence, 'session', None)
            session_name = session.name if session else 'class'
            season = getattr(session, 'season', None) if session else None
            MakeupCredit.objects.get_or_create(
                student_id=record['student'],
                reason=f'Absent: {session_name} on {occurrence.date}',
                defaults={'issued_by': request.user, 'status': 'available', 'season': season, 'source_occurrence': occurrence},
            )

        saved.append(obj)
    # Credit instructor fee if the session has one and it hasn't been credited yet
    session = occurrence.session
    if (
        not occurrence.instructor_credited
        and session.instructor_fee
        and session.instructor
    ):
        attending_count = sum(1 for r in saved if r.status in ('present', 'late'))
        if attending_count > 0:
            from apps.payments.models import Payment
            Payment.objects.create(
                student=session.instructor,
                amount=session.instructor_fee,
                payment_type='credit',
                description=f'Instructor fee — {session.name} {occurrence.date}',
                recorded_by=request.user,
            )
            occurrence.instructor_credited = True

    occurrence.register_saved = True
    occurrence.save(update_fields=['register_saved', 'instructor_credited'])
    return Response(AttendanceRecordSerializer(saved, many=True).data, status=status.HTTP_200_OK)


from rest_framework.views import APIView
from django.utils import timezone
from datetime import date, timedelta
from django.db.models import Count, Q
from django.db.models.functions import TruncWeek

class StudentMarkAwayView(APIView):
    """Student self-service: mark away from an upcoming occurrence."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from datetime import datetime, time as dt_time
        import pytz
        from apps.users.models import StudioSettings

        if request.user.booking_blocked:
            return Response(
                {'detail': 'Your account is on hold. Please come in and settle your balance.'},
                status=403,
            )

        occurrence_id = request.data.get('occurrence_id')
        enrolment_id = request.data.get('enrolment_id')
        if not occurrence_id and not enrolment_id:
            return Response({'detail': 'occurrence_id or enrolment_id required'}, status=400)
        if enrolment_id:
            from apps.enrolments.models import Enrolment
            try:
                enrolment = Enrolment.objects.get(pk=enrolment_id, student=request.user)
            except Enrolment.DoesNotExist:
                return Response({'detail': 'Enrolment not found'}, status=404)
            occurrence = ClassOccurrence.objects.select_related('session__season').filter(
                session=enrolment.class_session, date__gte=date.today()
            ).order_by('date').first()
            if not occurrence:
                return Response({'detail': 'No upcoming class found for this enrolment'}, status=400)
        else:
            try:
                occurrence = ClassOccurrence.objects.select_related('session__season').get(pk=occurrence_id)
            except ClassOccurrence.DoesNotExist:
                return Response({'detail': 'Occurrence not found'}, status=404)
            if occurrence.date < date.today():
                return Response({'detail': 'Cannot mark away for a past class'}, status=400)

        record, _ = AttendanceRecord.objects.update_or_create(
            occurrence=occurrence,
            student=request.user,
            defaults={'status': 'absent', 'recorded_by': request.user, 'note': 'Student marked away'}
        )

        # Check notice period and issue makeup credit if eligible
        credit_issued = False
        try:
            studio = StudioSettings.objects.first()
            window_hours = getattr(studio, 'cancellation_window_hours', 4)
            session = occurrence.session
            start_time = session.start_time
            class_dt = datetime.combine(occurrence.date, start_time)
            if timezone.is_naive(class_dt):
                class_dt = timezone.make_aware(class_dt)
            hours_notice = (class_dt - timezone.now()).total_seconds() / 3600
            if hours_notice >= window_hours:
                season = session.season
                _, created = MakeupCredit.objects.get_or_create(
                    student=request.user,
                    reason=f'Marked away: {session.name} on {occurrence.date}',
                    defaults={'issued_by': request.user, 'status': 'available', 'season': season, 'source_occurrence': occurrence},
                )
                credit_issued = created
        except Exception:
            pass

        data = AttendanceRecordSerializer(record).data
        data['credit_issued'] = credit_issued
        return Response(data, status=status.HTTP_200_OK)


class StudentCancelAwayView(APIView):
    """Student self-service: undo a marked absence and return to class (if spot available)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        occurrence_id = request.data.get('occurrence_id')
        if not occurrence_id:
            return Response({'detail': 'occurrence_id required'}, status=400)
        try:
            occurrence = ClassOccurrence.objects.get(pk=occurrence_id)
        except ClassOccurrence.DoesNotExist:
            return Response({'detail': 'Occurrence not found'}, status=404)
        if occurrence.date < date.today():
            return Response({'detail': 'Cannot undo absence for a past class'}, status=400)

        try:
            record = AttendanceRecord.objects.get(
                occurrence=occurrence, student=request.user, status='absent'
            )
        except AttendanceRecord.DoesNotExist:
            return Response({'detail': 'No absence record found'}, status=400)

        session = occurrence.session
        # Count non-absent confirmed enrolments + casual/catchup bookings for this occurrence
        # to determine if the spot was filled
        confirmed_present = AttendanceRecord.objects.filter(
            occurrence=occurrence
        ).exclude(status='absent').exclude(student=request.user).count()
        capacity = session.capacity

        if confirmed_present < capacity:
            # Spot still available — delete the absence record
            record.delete()
            return Response({'status': 'restored', 'message': "You're back in! See you in class."})
        else:
            # Class is full — add to session waitlist if not already on it
            from apps.enrolments.models import Enrolment
            already_waitlisted = Enrolment.objects.filter(
                student=request.user, class_session=session, status='waitlisted'
            ).exists()
            if not already_waitlisted:
                Enrolment.objects.update_or_create(
                    student=request.user,
                    class_session=session,
                    defaults={'status': 'waitlisted', 'enrolment_type': 'season'},
                )
            return Response({
                'status': 'waitlisted',
                'message': "Oops — someone has taken your spot, but we've added you to the waitlist!"
            })


class AttendanceStatsView(APIView):
    """Pre-aggregated attendance analytics for the reporting dashboard."""
    permission_classes = [IsAdminOrInstructor]

    def get(self, request):
        qs = AttendanceRecord.objects.select_related(
            'student', 'occurrence__session'
        )

        # Overall counts
        totals = qs.aggregate(
            present=Count('id', filter=Q(status='present')),
            absent=Count('id', filter=Q(status='absent')),
            no_show=Count('id', filter=Q(status='no_show')),
            total=Count('id'),
        )

        # By class session
        by_session_qs = (
            qs.values('occurrence__session__name')
            .annotate(
                total=Count('id'),
                present=Count('id', filter=Q(status='present')),
                absent=Count('id', filter=Q(status='absent')),
                no_show=Count('id', filter=Q(status='no_show')),
            )
            .order_by('-total')[:10]
        )
        by_class = [
            {
                'name': row['occurrence__session__name'] or 'Unknown',
                'total': row['total'],
                'present': row['present'],
                'absent': row['absent'],
                'no_show': row['no_show'],
                'rate': round((row['present'] / row['total']) * 100) if row['total'] else 0,
            }
            for row in by_session_qs
        ]

        # Weekly trend — last 8 complete weeks
        eight_weeks_ago = date.today() - timedelta(weeks=8)
        weekly_qs = (
            qs.filter(occurrence__date__gte=eight_weeks_ago)
            .annotate(week=TruncWeek('occurrence__date'))
            .values('week')
            .annotate(
                present=Count('id', filter=Q(status='present')),
                absent=Count('id', filter=Q(status='absent')),
                no_show=Count('id', filter=Q(status='no_show')),
            )
            .order_by('week')
        )
        weekly = [
            {
                'week': row['week'].strftime('%Y-%m-%d') if row['week'] else None,
                'present': row['present'],
                'absent': row['absent'],
                'no_show': row['no_show'],
            }
            for row in weekly_qs
        ]

        # At-risk students: ≥3 records, <60% attendance
        student_qs = (
            qs.values('student__id', 'student__first_name', 'student__last_name', 'student__email')
            .annotate(
                total=Count('id'),
                present=Count('id', filter=Q(status='present')),
            )
            .filter(total__gte=3)
            .order_by('student__first_name')
        )
        at_risk = [
            {
                'id': row['student__id'],
                'name': f"{row['student__first_name']} {row['student__last_name']}".strip() or row['student__email'],
                'total': row['total'],
                'present': row['present'],
                'rate': round((row['present'] / row['total']) * 100) if row['total'] else 0,
            }
            for row in student_qs
            if row['total'] and round((row['present'] / row['total']) * 100) < 60
        ]

        return Response({
            'totals': totals,
            'by_class': by_class,
            'weekly': weekly,
            'at_risk': at_risk,
        })


@api_view(['POST'])
@permission_classes([IsAdminOrInstructor])
def kiosk_checkin(request):
    """Kiosk: mark a student present for their next occurrence today."""
    student_id = request.data.get('student_id')
    if not student_id:
        return Response({'detail': 'student_id required'}, status=400)
    today = date.today()
    occurrences = ClassOccurrence.objects.filter(
        date=today,
        enrolments__student_id=student_id,
        enrolments__status='active',
    ).distinct()
    if not occurrences.exists():
        return Response({'detail': 'No class found for this student today'}, status=404)
    occurrence = occurrences.first()
    record, _ = AttendanceRecord.objects.update_or_create(
        occurrence=occurrence,
        student_id=student_id,
        defaults={'status': 'present', 'recorded_by': request.user},
    )
    return Response(AttendanceRecordSerializer(record).data, status=status.HTTP_200_OK)


class MakeupCreditListView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        from .serializers import MakeupCreditSerializer
        return MakeupCreditSerializer

    def get_queryset(self):
        from .models import MakeupCredit
        user = self.request.user
        if user.role in ('admin', 'instructor', 'staff'):
            qs = MakeupCredit.objects.select_related('student', 'issued_by')
            student_id = self.request.query_params.get('student')
            if student_id:
                qs = qs.filter(student_id=student_id)
            return qs
        return MakeupCredit.objects.filter(student=user)

    def perform_create(self, serializer):
        serializer.save(issued_by=self.request.user)


class MakeupCreditDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminOrInstructor]

    def get_serializer_class(self):
        from .serializers import MakeupCreditSerializer
        return MakeupCreditSerializer

    def get_queryset(self):
        from .models import MakeupCredit
        return MakeupCredit.objects.all()

    def perform_update(self, serializer):
        from .models import MakeupCredit
        instance = self.get_object()
        new_status = serializer.validated_data.get('status', instance.status)
        if new_status == MakeupCredit.Status.USED and instance.status != MakeupCredit.Status.USED:
            serializer.save(used_at=timezone.now())
        else:
            serializer.save()


class ClassPassListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        from .serializers import ClassPassSerializer
        return ClassPassSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role in ('admin', 'instructor', 'staff'):
            qs = ClassPass.objects.select_related('student')
            student_id = self.request.query_params.get('student')
            if student_id:
                qs = qs.filter(student_id=student_id)
            return qs
        return ClassPass.objects.filter(student=user)


class ClassPassPurchaseView(generics.CreateAPIView):
    """Student purchases a class pass. Payment is handled client-side via Stripe."""
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        from .serializers import ClassPassSerializer
        return ClassPassSerializer

    def create(self, request, *args, **kwargs):
        from apps.users.models import StudioSettings
        from datetime import date, timedelta

        settings = StudioSettings.get()
        num_classes = settings.class_pass_size
        price = settings.price_class_pass
        expiry_days = settings.credit_expiry_days

        class_pass = ClassPass.objects.create(
            student=request.user,
            num_classes=num_classes,
            classes_used=0,
            price_paid=price,
            expires_at=date.today() + timedelta(days=expiry_days),
        )
        from .serializers import ClassPassSerializer
        return Response(ClassPassSerializer(class_pass).data, status=status.HTTP_201_CREATED)


class ClassPassDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminOrInstructor]

    def get_serializer_class(self):
        from .serializers import ClassPassSerializer
        return ClassPassSerializer

    def get_queryset(self):
        return ClassPass.objects.select_related('student').all()
