from rest_framework import serializers
from .models import Studio, ClassCategory, ClassSession, ClassOccurrence, Season, Locker, KisiGrant, Workshop, WorkshopBooking, PracticeSlot, PracticeBooking, PracticeCredit, CasualBooking, ClassUpsell
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
    season_start_date = serializers.DateField(source='season.start_date', read_only=True, allow_null=True)
    season_base_price = serializers.SerializerMethodField()
    skill_level_name = serializers.CharField(source='skill_level.name', read_only=True, allow_null=True)

    class Meta:
        model = ClassSession
        fields = (
            'id', 'name', 'level', 'instructor', 'instructor_detail',
            'studio', 'studio_detail', 'day_of_week', 'day_of_week_display',
            'start_time', 'duration_minutes', 'capacity', 'enrolled_count',
            'session_type', 'is_active', 'category', 'category_name',
            'season', 'season_name', 'season_start_date', 'season_bookings_open',
            'catchup_cutoff_weeks',
            'first_timer_headline', 'first_timer_body',
            'description', 'created_at',
            'season_base_price',
            'skill_level', 'skill_level_name',
        )
        read_only_fields = ('id', 'enrolled_count', 'instructor_detail', 'studio_detail', 'day_of_week_display', 'category_name', 'season_name', 'season_start_date', 'season_bookings_open', 'season_base_price', 'created_at', 'skill_level_name')

    def get_season_base_price(self, obj):
        if obj.category and obj.category.standalone_price is not None:
            return float(obj.category.standalone_price)
        from apps.users.models import StudioSettings
        s = StudioSettings.objects.first()
        return float(s.price_season) if s else 270.0

    season_bookings_open = serializers.SerializerMethodField()

    def get_season_bookings_open(self, obj):
        if obj.season_id is None:
            return True  # no season = always open
        return obj.season.bookings_open


class ClassOccurrenceSerializer(serializers.ModelSerializer):
    session_detail = ClassSessionSerializer(source='session', read_only=True)
    substitute_instructor_detail = UserMinimalSerializer(source='substitute_instructor', read_only=True)
    instructor_detail = UserMinimalSerializer(source='session.instructor', read_only=True)
    studio_detail = StudioSerializer(source='session.studio', read_only=True)
    spots_left = serializers.SerializerMethodField()
    casual_booked_count = serializers.SerializerMethodField()
    my_booking = serializers.SerializerMethodField()
    session_name = serializers.SerializerMethodField()
    start_time = serializers.SerializerMethodField()
    studio_name = serializers.SerializerMethodField()
    enrolled_count = serializers.SerializerMethodField(method_name='get_enrolled_count_flat')

    class Meta:
        model = ClassOccurrence
        fields = (
            'id', 'session', 'session_detail', 'date', 'status',
            'substitute_instructor', 'substitute_instructor_detail',
            'instructor_detail', 'studio_detail',
            'notes', 'register_saved', 'cover_needed',
            'spots_left', 'casual_booked_count', 'my_booking',
            'session_name', 'start_time', 'studio_name', 'enrolled_count',
        )

    def get_session_name(self, obj):
        return obj.session.name if obj.session else ''

    def get_start_time(self, obj):
        if obj.session and obj.session.start_time:
            return str(obj.session.start_time)[:5]
        return ''

    def get_studio_name(self, obj):
        if obj.session and obj.session.studio:
            return obj.session.studio.name
        return ''

    def get_enrolled_count_flat(self, obj):
        from apps.enrolments.models import Enrolment
        return Enrolment.objects.filter(class_session=obj.session, status='active').count() if obj.session else 0

    def get_casual_booked_count(self, obj):
        return obj.casual_bookings.filter(status='confirmed').count()

    def get_spots_left(self, obj):
        from apps.enrolments.models import Enrolment
        season_enrolled = Enrolment.objects.filter(
            class_session=obj.session, status='active', enrolment_type='course'
        ).count()
        casual_confirmed = obj.casual_bookings.filter(status='confirmed').count()
        return max(0, obj.session.capacity - season_enrolled - casual_confirmed)

    def get_my_booking(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        booking = obj.casual_bookings.filter(student=request.user).exclude(status='cancelled').first()
        if not booking:
            return None
        return {
            'id': booking.id,
            'status': booking.status,
            'enrolment_type': booking.enrolment_type,
            'waitlist_offered_at': booking.waitlist_offered_at,
            'waitlist_expires_at': booking.waitlist_expires_at,
        }


class CasualBookingSerializer(serializers.ModelSerializer):
    occurrence_detail = serializers.SerializerMethodField()

    class Meta:
        model = CasualBooking
        fields = (
            'id', 'occurrence', 'occurrence_detail', 'enrolment_type', 'status',
            'price_charged', 'is_free', 'waitlist_offered_at', 'waitlist_expires_at',
            'displacement_offered_at', 'displacement_expires_at', 'created_at',
        )
        read_only_fields = ('id', 'price_charged', 'is_free', 'created_at')

    def get_occurrence_detail(self, obj):
        occ = obj.occurrence
        s = occ.session
        return {
            'id': occ.id,
            'date': str(occ.date),
            'session_id': s.id,
            'session_name': s.name,
            'day_of_week': s.day_of_week,
            'start_time': str(s.start_time),
            'studio_name': s.studio.name if s.studio else None,
        }


class SeasonSerializer(serializers.ModelSerializer):
    session_count = serializers.SerializerMethodField()
    enrolled_count = serializers.SerializerMethodField()

    class Meta:
        model = Season
        fields = ('id', 'name', 'start_date', 'end_date', 'status', 'bookings_open', 'go_live_at', 'bookings_enabled', 'archived', 'notes', 'published_at', 'created_at', 'session_count', 'enrolled_count')
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
        from apps.enrolments.models import Enrolment
        from apps.classes.models import Season, PracticeBooking
        from django.utils import timezone
        import datetime
        active_season = Season.objects.filter(status__in=['active', 'upcoming']).order_by('-start_date').first()
        course_enrolments = Enrolment.objects.filter(
            student=user,
            status='active',
            enrolment_type='course',
            class_session__season=active_season,
        ).count() if active_season else 0
        if course_enrolments >= 4:
            # 4+ classes: unlimited free practice
            return 0
        if course_enrolments == 3:
            # 3 classes: 1 free practice per week (Mon–Sun)
            today = timezone.localdate()
            week_start = today - datetime.timedelta(days=today.weekday())
            week_end = week_start + datetime.timedelta(days=6)
            used_free_this_week = PracticeBooking.objects.filter(
                student=user,
                status='confirmed',
                is_free=True,
                slot__date__range=(week_start, week_end),
            ).count()
            if used_free_this_week == 0:
                return 0
            # Already used free slot this week — charge enrolled rate
        is_enrolled = course_enrolments > 0
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


class ClassUpsellSerializer(serializers.ModelSerializer):
    suggested_session_name = serializers.CharField(source='suggested_session.name', read_only=True)
    suggested_session_day = serializers.CharField(source='suggested_session.get_day_of_week_display', read_only=True)
    suggested_session_time = serializers.TimeField(source='suggested_session.start_time', read_only=True)
    suggested_session_category = serializers.CharField(source='suggested_session.category.name', read_only=True, allow_null=True)

    class Meta:
        model = ClassUpsell
        fields = (
            'id', 'source_session', 'suggested_session',
            'suggested_session_name', 'suggested_session_day',
            'suggested_session_time', 'suggested_session_category',
            'headline', 'body', 'is_active', 'created_at',
        )
        read_only_fields = ('id', 'created_at')


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


class PracticeCreditSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.display_name', read_only=True, default=None)

    class Meta:
        model = PracticeCredit
        fields = ('id', 'student', 'status', 'notes', 'created_by', 'created_by_name', 'used_for_booking', 'created_at', 'used_at')
        read_only_fields = ('id', 'created_at', 'used_at', 'used_for_booking', 'created_by', 'created_by_name')
