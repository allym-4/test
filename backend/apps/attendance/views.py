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
