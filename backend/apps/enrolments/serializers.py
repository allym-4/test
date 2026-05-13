from rest_framework import serializers
from .models import Enrolment
from apps.users.serializers import UserMinimalSerializer
from apps.classes.serializers import ClassSessionSerializer


class EnrolmentSerializer(serializers.ModelSerializer):
    student_detail = UserMinimalSerializer(source='student', read_only=True)
    class_session_detail = ClassSessionSerializer(source='class_session', read_only=True)

    class Meta:
        model = Enrolment
        fields = (
            'id', 'student', 'student_detail', 'class_session', 'class_session_detail',
            'enrolment_type', 'status', 'enrolled_date', 'cancelled_date', 'notes',
        )
        read_only_fields = ('id', 'enrolled_date')
