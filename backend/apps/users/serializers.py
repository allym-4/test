from rest_framework import serializers
from .models import User, StaffNote, Lead, StudioSettings, Announcement, Product, AutomationRule, Order, Notification, InstructorAvailability, InstructorUnavailableDate, StudentForm, InstructorPayRecord, StudentSkill, Tag, StudentTag, SkillLevel, SkillGroup, SkillDefinition, MediaItem, EmailCampaign, EmailList, Referral, ActionItem, Challenge, ChallengeProgress


class UserMinimalSerializer(serializers.ModelSerializer):
    display_name = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = ('id', 'display_name', 'first_name', 'last_name', 'pronouns', 'role')


class UserSerializer(serializers.ModelSerializer):
    display_name = serializers.ReadOnlyField()
    enrolled_seasons_summary = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name', 'display_name',
            'role', 'pronouns', 'phone', 'date_of_birth', 'profile_photo',
            'emergency_contact_name', 'emergency_contact_phone', 'internal_notes', 'is_active',
            'last_login', 'stripe_customer_id', 'enrolled_seasons_summary', 'pay_rate',
            'perm_billing', 'perm_edit_profiles', 'perm_approve_plans', 'perm_bulk_email', 'perm_reports',
            'notification_preferences',
        )
        read_only_fields = ('id',)

    def get_enrolled_seasons_summary(self, obj):
        from apps.enrolments.models import Enrolment
        enrolments = Enrolment.objects.filter(
            student=obj, status='active'
        ).select_related('class_session__season')

        seasons = {}
        no_season_count = 0
        for e in enrolments:
            season = e.class_session.season
            if season:
                key = season.name
                seasons[key] = seasons.get(key, 0) + 1
            else:
                no_season_count += 1

        result = [{'season_name': k, 'count': v} for k, v in seasons.items()]
        if no_season_count:
            result.append({'season_name': None, 'count': no_season_count})
        return result


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = (
            'username', 'email', 'password', 'first_name', 'last_name',
            'role', 'pronouns', 'phone', 'date_of_birth',
            'emergency_contact_name', 'emergency_contact_phone',
        )

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class StaffNoteSerializer(serializers.ModelSerializer):
    created_by_name = serializers.StringRelatedField(source='created_by')

    class Meta:
        model = StaffNote
        fields = ('id', 'student', 'created_by', 'created_by_name', 'tag', 'body', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_by', 'created_at', 'updated_at')


class LeadSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.StringRelatedField(source='assigned_to')

    class Meta:
        model = Lead
        fields = (
            'id', 'name', 'email', 'phone', 'source', 'status', 'notes',
            'assigned_to', 'assigned_to_name', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class StudioSettingsSerializer(serializers.ModelSerializer):
    xero_connected = serializers.SerializerMethodField(read_only=True)
    mailchimp_connected = serializers.SerializerMethodField(read_only=True)

    def get_xero_connected(self, obj):
        return bool(obj.xero_access_token)

    def get_mailchimp_connected(self, obj):
        return bool(obj.mailchimp_api_key)

    class Meta:
        model = StudioSettings
        fields = (
            'studio_name', 'email', 'phone', 'instagram', 'timezone', 'tagline',
            'primary_colour', 'enquiries_email', 'urgent_email',
            'cancellation_window_hours', 'no_show_fee', 'late_cancel_fee',
            'credit_expiry_days', 'max_freeze_weeks', 'gst_registered', 'abn',
            'kisi_api_key', 'kisi_org_id',
            'instagram_access_token', 'instagram_page_id', 'instagram_username', 'meta_app_id',
            'price_casual', 'price_season', 'price_trial', 'season_pricing_config',
            'form_health_enabled', 'form_photo_consent_enabled', 'form_waiver_enabled', 'form_season_agreement_enabled',
            'mailchimp_api_key', 'mailchimp_list_id', 'mailchimp_connected',
            'xero_client_id', 'xero_client_secret', 'xero_tenant_id', 'xero_connected',
            'overdue_reminder_schedule',
        )
        read_only_fields = ('xero_connected', 'mailchimp_connected')


class AnnouncementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.StringRelatedField(source='created_by')
    is_acknowledged = serializers.SerializerMethodField()
    acknowledged_count = serializers.SerializerMethodField()

    def get_is_acknowledged(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.acknowledged_by.filter(pk=request.user.pk).exists()

    def get_acknowledged_count(self, obj):
        return obj.acknowledged_by.count()

    class Meta:
        model = Announcement
        fields = (
            'id', 'title', 'body', 'note_type', 'created_by', 'created_by_name',
            'is_pinned', 'requires_acknowledgement', 'is_acknowledged', 'acknowledged_count',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_by', 'created_at', 'updated_at', 'is_acknowledged', 'acknowledged_count')


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ('id', 'name', 'sku', 'price', 'stock', 'category', 'is_active', 'created_at')
        read_only_fields = ('id', 'created_at')


class AutomationRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AutomationRule
        fields = ('id', 'slug', 'enabled', 'name', 'description', 'trigger_type', 'conditions', 'actions', 'is_custom', 'created_at')
        read_only_fields = ('id', 'created_at')


class OrderSerializer(serializers.ModelSerializer):
    student_display = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = ('id', 'student', 'student_name', 'student_display', 'items', 'total', 'status', 'location', 'notes', 'created_at')
        read_only_fields = ('id', 'created_at')

    def get_student_display(self, obj):
        if obj.student:
            return obj.student.display_name
        return obj.student_name


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ('id', 'title', 'body', 'notification_type', 'read', 'action_label', 'action_url', 'created_at')
        read_only_fields = ('id', 'created_at')


class InstructorAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = InstructorAvailability
        fields = ('id', 'instructor', 'day_of_week', 'slot', 'available')
        read_only_fields = ('id',)


class StudentFormSerializer(serializers.ModelSerializer):
    form_type_display = serializers.CharField(source='get_form_type_display', read_only=True)
    class Meta:
        model = StudentForm
        fields = ('id', 'form_type', 'form_type_display', 'completed', 'responses', 'completed_at', 'created_at')
        read_only_fields = ('id', 'created_at')


class InstructorPayRecordSerializer(serializers.ModelSerializer):
    instructor_name = serializers.StringRelatedField(source='instructor')

    class Meta:
        model = InstructorPayRecord
        fields = ('id', 'instructor', 'instructor_name', 'amount', 'description', 'period_start', 'period_end', 'status', 'paid_at', 'created_at')
        read_only_fields = ('id', 'created_at')


class StudentSkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentSkill
        fields = ('id', 'skill_name', 'level', 'self_assessed', 'teacher_confirmed', 'updated_at')
        read_only_fields = ('id', 'updated_at')


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ('id', 'name', 'colour', 'auto_rule', 'is_manual', 'created_at')
        read_only_fields = ('id', 'created_at')


class StudentTagSerializer(serializers.ModelSerializer):
    tag_name = serializers.StringRelatedField(source='tag')

    class Meta:
        model = StudentTag
        fields = ('id', 'student', 'tag', 'tag_name', 'added_at')
        read_only_fields = ('id', 'added_at')


class SkillDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillDefinition
        fields = ('id', 'name', 'order')
        read_only_fields = ('id',)


class SkillGroupSerializer(serializers.ModelSerializer):
    skills = SkillDefinitionSerializer(many=True, read_only=True)

    class Meta:
        model = SkillGroup
        fields = ('id', 'name', 'order', 'skills')
        read_only_fields = ('id',)


class SkillLevelSerializer(serializers.ModelSerializer):
    groups = SkillGroupSerializer(many=True, read_only=True)

    class Meta:
        model = SkillLevel
        fields = ('id', 'name', 'order', 'groups')
        read_only_fields = ('id',)


class MediaItemSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.StringRelatedField(source='uploaded_by')

    class Meta:
        model = MediaItem
        fields = ('id', 'name', 'media_type', 'file', 'url', 'level', 'size_display', 'uploaded_by_name', 'session', 'created_at')
        read_only_fields = ('id', 'created_at')


class EmailCampaignSerializer(serializers.ModelSerializer):
    created_by_name = serializers.StringRelatedField(source='created_by')

    class Meta:
        model = EmailCampaign
        fields = ('id', 'name', 'subject', 'list_name', 'body', 'status', 'sent_at', 'open_rate', 'created_by_name', 'created_at')
        read_only_fields = ('id', 'created_at')


class EmailListSerializer(serializers.ModelSerializer):
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = EmailList
        fields = ('id', 'name', 'is_auto', 'query_slug', 'student_count', 'created_at')
        read_only_fields = ('id', 'created_at')

    def get_student_count(self, obj):
        if obj.query_slug == 'all_active':
            return User.objects.filter(role='student', is_active=True).count()
        if obj.query_slug == 'new_30days':
            from django.utils import timezone
            from datetime import timedelta
            return User.objects.filter(role='student', date_joined__gte=timezone.now()-timedelta(days=30)).count()
        return 0


class ReferralSerializer(serializers.ModelSerializer):
    referrer_name = serializers.StringRelatedField(source='referrer')
    referee_name = serializers.StringRelatedField(source='referee')

    class Meta:
        model = Referral
        fields = ('id', 'referrer', 'referrer_name', 'referee_email', 'referee', 'referee_name', 'credit_amount', 'status', 'created_at')
        read_only_fields = ('id', 'created_at')


class InstructorUnavailableDateSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstructorUnavailableDate
        fields = ('id', 'instructor', 'date_from', 'date_to', 'reason', 'created_at')
        read_only_fields = ('id', 'instructor', 'created_at')


class ActionItemSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.StringRelatedField(source='assigned_to')

    class Meta:
        model = ActionItem
        fields = ('id', 'icon', 'title', 'body', 'meta', 'due_date', 'assigned_to', 'assigned_to_name', 'is_urgent', 'is_done', 'completed_at', 'created_at')
        read_only_fields = ('id', 'created_at')


class ChallengeProgressSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.display_name', read_only=True)
    student_id = serializers.IntegerField(source='student.id', read_only=True)

    class Meta:
        model = ChallengeProgress
        fields = ('id', 'student_id', 'student_name', 'current_value', 'completed', 'completed_at')
        read_only_fields = ('id', 'completed_at')


class ChallengeSerializer(serializers.ModelSerializer):
    my_progress = serializers.SerializerMethodField()
    participant_count = serializers.SerializerMethodField()
    completion_count = serializers.SerializerMethodField()

    class Meta:
        model = Challenge
        fields = (
            'id', 'title', 'description', 'challenge_type', 'target_value',
            'start_date', 'end_date', 'reward_type', 'reward_badge_name',
            'reward_credit_amount', 'is_active', 'created_at',
            'my_progress', 'participant_count', 'completion_count',
        )
        read_only_fields = ('id', 'created_at')

    def get_my_progress(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        try:
            p = obj.progress.get(student=request.user)
            return {'current_value': p.current_value, 'completed': p.completed, 'completed_at': p.completed_at}
        except ChallengeProgress.DoesNotExist:
            return {'current_value': 0, 'completed': False, 'completed_at': None}

    def get_participant_count(self, obj):
        return obj.progress.count()

    def get_completion_count(self, obj):
        return obj.progress.filter(completed=True).count()
