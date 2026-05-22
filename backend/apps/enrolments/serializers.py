import datetime
from rest_framework import serializers
from .models import Enrolment, ClassChangeRequest, TrialFeedback
from apps.users.serializers import UserMinimalSerializer
from apps.classes.serializers import ClassSessionSerializer


class TrialFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrialFeedback
        fields = ('id', 'enrolled', 'class_rating', 'instructor_rating', 'facilities_rating', 'structure_rating', 'reason', 'created_at')
        read_only_fields = ('id', 'created_at')


class EnrolmentSerializer(serializers.ModelSerializer):
    student_detail = UserMinimalSerializer(source='student', read_only=True)
    class_session_detail = ClassSessionSerializer(source='class_session', read_only=True)
    student_name = serializers.CharField(source='student.display_name', read_only=True)
    class_name = serializers.CharField(source='class_session.name', read_only=True)
    trial_feedback = TrialFeedbackSerializer(read_only=True)
    upcoming_occurrences = serializers.SerializerMethodField()

    def get_upcoming_occurrences(self, obj):
        from apps.classes.models import ClassOccurrence
        from apps.attendance.models import AttendanceRecord
        if not obj.class_session_id:
            return []
        today = datetime.date.today()
        occs = (
            ClassOccurrence.objects
            .filter(session_id=obj.class_session_id, date__gte=today)
            .select_related('session')
            .order_by('date')
        )
        absent_ids = set(
            AttendanceRecord.objects
            .filter(student=obj.student, occurrence__in=occs, status='absent')
            .values_list('occurrence_id', flat=True)
        )
        return [
            {
                'id': occ.id,
                'date': occ.date.isoformat(),
                'start_time': str(occ.session.start_time)[:5] if occ.session.start_time else None,
                'marked_away': occ.id in absent_ids,
            }
            for occ in occs
        ]

    class Meta:
        model = Enrolment
        fields = (
            'id', 'student', 'student_detail', 'student_name',
            'class_session', 'class_session_detail', 'class_name',
            'enrolment_type', 'status', 'enrolled_date', 'cancelled_date', 'notes',
            'is_first_visit', 'intro_email_sent', 'waiver_signed',
            'waitlist_offered_at', 'waitlist_expires_at', 'waitlist_urgent',
            'displacement_casual_booking', 'displacement_expires_at',
            'upcoming_occurrences', 'trial_feedback',
        )
        read_only_fields = (
            'id', 'enrolled_date',
            'waitlist_offered_at', 'waitlist_expires_at', 'waitlist_urgent',
            'displacement_casual_booking', 'displacement_expires_at',
            'upcoming_occurrences',
        )


class ClassChangeRequestSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.display_name', read_only=True)
    current_enrolment_detail = EnrolmentSerializer(source='current_enrolment', read_only=True)
    requested_session_detail = ClassSessionSerializer(source='requested_session', read_only=True)

    class Meta:
        model = ClassChangeRequest
        fields = (
            'id', 'student', 'student_name',
            'current_enrolment', 'current_enrolment_detail',
            'requested_session', 'requested_session_detail',
            'request_type', 'cancellation_resolution',
            'notes', 'status', 'admin_notes', 'admin_initiated',
            'created_at', 'resolved_at',
        )
        read_only_fields = ('id', 'student', 'status', 'admin_notes', 'created_at', 'resolved_at')
