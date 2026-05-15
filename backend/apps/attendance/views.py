from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import AttendanceRecord
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
        obj, _ = AttendanceRecord.objects.update_or_create(
            occurrence=occurrence,
            student_id=record['student'],
            defaults={
                'status': record.get('status', 'present'),
                'no_show_fee_charged': record.get('no_show_fee_charged', False),
                'no_show_fee_waived': record.get('no_show_fee_waived', False),
                'note': record.get('note', ''),
                'recorded_by': request.user,
            }
        )
        saved.append(obj)
    occurrence.register_saved = True
    occurrence.save(update_fields=['register_saved'])
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
        occurrence_id = request.data.get('occurrence_id')
        if not occurrence_id:
            return Response({'detail': 'occurrence_id required'}, status=400)
        try:
            occurrence = ClassOccurrence.objects.get(pk=occurrence_id)
        except ClassOccurrence.DoesNotExist:
            return Response({'detail': 'Occurrence not found'}, status=404)
        if occurrence.date < date.today():
            return Response({'detail': 'Cannot mark away for a past class'}, status=400)
        record, _ = AttendanceRecord.objects.update_or_create(
            occurrence=occurrence,
            student=request.user,
            defaults={'status': 'absent', 'recorded_by': request.user, 'note': 'Student marked away'}
        )
        return Response(AttendanceRecordSerializer(record).data, status=status.HTTP_200_OK)


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
