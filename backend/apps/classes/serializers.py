from rest_framework import serializers
from .models import Studio, ClassCategory, ClassSession, ClassOccurrence, Season, Locker, KisiGrant, Workshop, WorkshopBooking, PracticeSlot, PracticeBooking
from apps.users.serializers import UserMinimalSerializer


class StudioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Studio
        fields = ('id', 'name', 'address', 'capacity', 'poles', 'features', 'kisi_place_id', 'photo', 'is_active')


class ClassCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ClassCategory
        fields = ('id', 'name', 'colour', 'is_visible', 'is_addon_type', 'standalone_price', 'created_at')
        read_only_fields = ('id', 'created_at')


class ClassSessionSerializer(serializers.ModelSerializer):
    instructor_detail = UserMinimalSerializer(source='instructor', read_only=True)
    studio_detail = StudioSerializer(source='studio', read_only=True)
    day_of_week_display = serializers.CharField(source='get_day_of_week_display', read_only=True)
    enrolled_count = serializers.ReadOnlyField()
    category_name = serializers.StringRelatedField(source='category', read_only=True)
    season_name = serializers.CharField(source='season.name', read_only=True, allow_null=True)

    class Meta:
        model = ClassSession
        fields = (
            'id', 'name', 'level', 'instructor', 'instructor_detail',
            'studio', 'studio_detail', 'day_of_week', 'day_of_week_display',
            'start_time', 'duration_minutes', 'capacity', 'enrolled_count',
            'session_type', 'is_active', 'category', 'category_name',
            'season', 'season_name',
        )


class ClassOccurrenceSerializer(serializers.ModelSerializer):
    session_detail = ClassSessionSerializer(source='session', read_only=True)
    substitute_instructor_detail = UserMinimalSerializer(source='substitute_instructor', read_only=True)
    instructor_detail = UserMinimalSerializer(source='session.instructor', read_only=True)
    studio_detail = StudioSerializer(source='session.studio', read_only=True)

    class Meta:
        model = ClassOccurrence
        fields = (
            'id', 'session', 'session_detail', 'date', 'status',
            'substitute_instructor', 'substitute_instructor_detail',
            'instructor_detail', 'studio_detail',
            'notes', 'register_saved', 'cover_needed',
        )


class SeasonSerializer(serializers.ModelSerializer):
    session_count = serializers.SerializerMethodField()
    enrolled_count = serializers.SerializerMethodField()

    class Meta:
        model = Season
        fields = ('id', 'name', 'start_date', 'end_date', 'status', 'notes', 'created_at', 'session_count', 'enrolled_count')
        read_only_fields = ('id', 'created_at', 'session_count', 'enrolled_count')

    def get_session_count(self, obj):
        return obj.sessions.filter(is_active=True).count()

    def get_enrolled_count(self, obj):
        from apps.enrolments.models import Enrolment
        session_ids = obj.sessions.values_list('id', flat=True)
        return Enrolment.objects.filter(class_session_id__in=session_ids, status='active').count()


class LockerAssignedToDetailSerializer(serializers.ModelSerializer):
    display_name = serializers.ReadOnlyField()

    class Meta:
        from apps.users.models import User
        model = User
        fields = ('id', 'display_name', 'email')


class LockerSerializer(serializers.ModelSerializer):
    assigned_to_detail = serializers.SerializerMethodField()

    class Meta:
        model = Locker
        fields = (
            'id', 'number', 'assigned_to', 'assigned_to_detail', 'notes',
            'expires_at', 'assigned_at',
            'key_issued', 'key_returned', 'key_lost', 'locker_type', 'payment_type',
            'payment_status', 'key_lost_fee_paid',
        )
        read_only_fields = ('id',)

    def get_assigned_to_detail(self, obj):
        if not obj.assigned_to:
            return None
        u = obj.assigned_to
        return {'id': u.id, 'display_name': u.display_name, 'email': u.email}


class KisiGrantSerializer(serializers.ModelSerializer):
    student_detail = UserMinimalSerializer(source='student', read_only=True)
    studio_name = serializers.StringRelatedField(source='studio')

    class Meta:
        model = KisiGrant
        fields = (
            'id', 'student', 'student_detail', 'studio', 'studio_name',
            'valid_from', 'valid_until', 'kisi_link_id', 'link_sent', 'unlocked',
            'revoked', 'created_at',
        )
        read_only_fields = ('id', 'created_at')


class WorkshopSerializer(serializers.ModelSerializer):
    instructor_detail = serializers.SerializerMethodField()
    studio_detail = serializers.SerializerMethodField()
    enrolled_count = serializers.IntegerField(read_only=True)
    spots_left = serializers.IntegerField(read_only=True)
    is_booked = serializers.SerializerMethodField()
    booking_status = serializers.SerializerMethodField()

    class Meta:
        model = Workshop
        fields = (
            'id', 'name', 'description', 'date', 'start_time', 'end_time',
            'instructor', 'instructor_detail', 'studio', 'studio_detail',
            'price', 'capacity', 'is_active', 'enrolled_count', 'spots_left',
            'is_booked', 'booking_status', 'created_at',
        )
        read_only_fields = ('id', 'created_at', 'enrolled_count', 'spots_left')

    def get_instructor_detail(self, obj):
        if not obj.instructor:
            return None
        return {'id': obj.instructor.id, 'display_name': getattr(obj.instructor, 'display_name', obj.instructor.get_full_name())}

    def get_studio_detail(self, obj):
        if not obj.studio:
            return None
        return {'id': obj.studio.id, 'name': obj.studio.name}

    def get_is_booked(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.bookings.filter(student=request.user, status='confirmed').exists()

    def get_booking_status(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        booking = obj.bookings.filter(student=request.user, status__in=['confirmed', 'waitlisted']).first()
        return booking.status if booking else None


class WorkshopBookingSerializer(serializers.ModelSerializer):
    workshop_detail = WorkshopSerializer(source='workshop', read_only=True)

    class Meta:
        model = WorkshopBooking
        fields = ('id', 'workshop', 'workshop_detail', 'student', 'status', 'created_at')
        read_only_fields = ('id', 'created_at')


class PracticeSlotSerializer(serializers.ModelSerializer):
    studio_detail = StudioSerializer(source='studio', read_only=True)
    booked_count = serializers.ReadOnlyField()
    spots_left = serializers.ReadOnlyField()
    duration_hours = serializers.ReadOnlyField()
    is_booked = serializers.SerializerMethodField()
    my_booking_status = serializers.SerializerMethodField()
    price_for_me = serializers.SerializerMethodField()

    class Meta:
        model = PracticeSlot
        fields = (
            'id', 'studio', 'studio_detail', 'date', 'start_time', 'end_time',
            'capacity', 'booked_count', 'spots_left', 'duration_hours',
            'is_active', 'notes', 'created_at',
            'is_booked', 'my_booking_status', 'price_for_me',
        )
        read_only_fields = ('id', 'created_at')

    def _get_price(self, obj, user):
        from datetime import date
        from apps.attendance.models import AttendanceRecord
        from apps.enrolments.models import Enrolment
        slot_date = obj.date
        week_start = slot_date - __import__('datetime').timedelta(days=slot_date.weekday())
        week_end = week_start + __import__('datetime').timedelta(days=6)
        attended_this_week = AttendanceRecord.objects.filter(
            student=user,
            status='present',
            occurrence__date__range=[week_start, week_end],
        ).count()
        if attended_this_week >= 3:
            return 0
        is_enrolled = Enrolment.objects.filter(student=user, status='active').exists()
        rate = obj.ENROLLED_RATE if is_enrolled else obj.NON_ENROLLED_RATE
        return round(obj.duration_hours * rate, 2)

    def get_is_booked(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.bookings.filter(student=request.user, status='confirmed').exists()

    def get_my_booking_status(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        b = obj.bookings.filter(student=request.user).first()
        return b.status if b else None

    def get_price_for_me(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        return self._get_price(obj, request.user)


class PracticeBookingSerializer(serializers.ModelSerializer):
    slot_detail = PracticeSlotSerializer(source='slot', read_only=True)
    student_detail = UserMinimalSerializer(source='student', read_only=True)

    class Meta:
        model = PracticeBooking
        fields = (
            'id', 'slot', 'slot_detail', 'student', 'student_detail',
            'status', 'price_charged', 'is_free', 'payment_type', 'created_at',
        )
        read_only_fields = ('id', 'created_at')
