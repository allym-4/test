from rest_framework import serializers
from .models import Enrolment
from apps.users.serializers import UserMinimalSerializer
from apps.classes.serializers import ClassSessionSerializer


class EnrolmentSerializer(serializers.ModelSerializer):
    student_detail = UserMinimalSerializer(source='student', read_only=True)
    class_session_detail = ClassSessionSerializer(source='class_session', read_only=True)
    student_name = serializers.CharField(source='student.display_name', read_only=True)
    class_name = serializers.CharField(source='class_session.name', read_only=True)

    class Meta:
        model = Enrolment
        fields = (
            'id', 'student', 'student_detail', 'student_name',
            'class_session', 'class_session_detail', 'class_name',
            'enrolment_type', 'status', 'enrolled_date', 'cancelled_date', 'notes',
            'is_first_visit', 'intro_email_sent', 'waiver_signed',
        )
        read_only_fields = ('id', 'enrolled_date')
