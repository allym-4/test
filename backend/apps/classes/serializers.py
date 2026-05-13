from rest_framework import serializers
from .models import Studio, ClassSession, ClassOccurrence, Season
from apps.users.serializers import UserMinimalSerializer


class StudioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Studio
        fields = ('id', 'name', 'address')


class ClassSessionSerializer(serializers.ModelSerializer):
    instructor_detail = UserMinimalSerializer(source='instructor', read_only=True)
    studio_detail = StudioSerializer(source='studio', read_only=True)
    day_of_week_display = serializers.CharField(source='get_day_of_week_display', read_only=True)
    enrolled_count = serializers.ReadOnlyField()

    class Meta:
        model = ClassSession
        fields = (
            'id', 'name', 'level', 'instructor', 'instructor_detail',
            'studio', 'studio_detail', 'day_of_week', 'day_of_week_display',
            'start_time', 'duration_minutes', 'capacity', 'enrolled_count',
            'session_type', 'is_active',
        )


class ClassOccurrenceSerializer(serializers.ModelSerializer):
    session_detail = ClassSessionSerializer(source='session', read_only=True)
    substitute_instructor_detail = UserMinimalSerializer(source='substitute_instructor', read_only=True)

    class Meta:
        model = ClassOccurrence
        fields = (
            'id', 'session', 'session_detail', 'date', 'status',
            'substitute_instructor', 'substitute_instructor_detail',
            'notes', 'register_saved',
        )


class SeasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Season
        fields = ('id', 'name', 'start_date', 'end_date', 'status', 'notes', 'created_at')
        read_only_fields = ('id', 'created_at')
