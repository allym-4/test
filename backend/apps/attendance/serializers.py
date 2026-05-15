from rest_framework import serializers
from .models import AttendanceRecord, MakeupCredit
from apps.users.serializers import UserMinimalSerializer
from apps.classes.serializers import ClassOccurrenceSerializer


class AttendanceRecordSerializer(serializers.ModelSerializer):
    student_detail = UserMinimalSerializer(source='student', read_only=True)
    occurrence_detail = ClassOccurrenceSerializer(source='occurrence', read_only=True)
    recorded_by_name = serializers.StringRelatedField(source='recorded_by')

    class Meta:
        model = AttendanceRecord
        fields = (
            'id', 'occurrence', 'occurrence_detail', 'student', 'student_detail',
            'status', 'no_show_fee_charged', 'no_show_fee_waived',
            'note', 'recorded_by', 'recorded_by_name', 'recorded_at', 'updated_at',
        )
        read_only_fields = ('id', 'recorded_by', 'recorded_at', 'updated_at')


class MakeupCreditSerializer(serializers.ModelSerializer):
    student_name = serializers.StringRelatedField(source='student')
    issued_by_name = serializers.StringRelatedField(source='issued_by')

    class Meta:
        model = MakeupCredit
        fields = ('id', 'student', 'student_name', 'season', 'reason', 'status', 'issued_by', 'issued_by_name', 'created_at', 'used_at')
        read_only_fields = ('id', 'issued_by', 'created_at')
