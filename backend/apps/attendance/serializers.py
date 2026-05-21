from rest_framework import serializers
from .models import AttendanceRecord, MakeupCredit, ClassPass
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
    season_end_date = serializers.SerializerMethodField()

    def get_season_end_date(self, obj):
        if obj.expires_at:
            return str(obj.expires_at)
        if obj.season and obj.season.end_date:
            return str(obj.season.end_date)
        return None

    class Meta:
        model = MakeupCredit
        fields = ('id', 'student', 'student_name', 'season', 'reason', 'status', 'issued_by', 'issued_by_name', 'created_at', 'used_at', 'expires_at', 'season_end_date')
        read_only_fields = ('id', 'issued_by', 'created_at')


class ClassPassSerializer(serializers.ModelSerializer):
    student_name = serializers.StringRelatedField(source='student')
    classes_remaining = serializers.IntegerField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = ClassPass
        fields = (
            'id', 'student', 'student_name',
            'num_classes', 'classes_used', 'classes_remaining', 'is_active',
            'price_paid', 'created_at', 'expires_at',
        )
        read_only_fields = ('id', 'created_at', 'classes_used')
