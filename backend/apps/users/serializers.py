from rest_framework import serializers
from .models import User, StaffNote, Lead, StudioSettings, Announcement, Product, AutomationRule


class UserMinimalSerializer(serializers.ModelSerializer):
    display_name = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = ('id', 'display_name', 'first_name', 'last_name', 'pronouns', 'role')


class UserSerializer(serializers.ModelSerializer):
    display_name = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name', 'display_name',
            'role', 'pronouns', 'phone', 'date_of_birth', 'profile_photo',
            'emergency_contact_name', 'emergency_contact_phone', 'is_active',
        )
        read_only_fields = ('id',)


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
    class Meta:
        model = StudioSettings
        fields = (
            'studio_name', 'email', 'phone', 'instagram', 'timezone', 'tagline',
            'primary_colour', 'enquiries_email', 'urgent_email',
            'cancellation_window_hours', 'no_show_fee', 'late_cancel_fee',
            'credit_expiry_days', 'max_freeze_weeks', 'gst_registered', 'abn',
        )


class AnnouncementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.StringRelatedField(source='created_by')

    class Meta:
        model = Announcement
        fields = ('id', 'title', 'body', 'created_by', 'created_by_name', 'is_pinned', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_by', 'created_at', 'updated_at')


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ('id', 'name', 'sku', 'price', 'stock', 'category', 'is_active', 'created_at')
        read_only_fields = ('id', 'created_at')


class AutomationRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AutomationRule
        fields = ('id', 'slug', 'enabled')
        read_only_fields = ('id', 'slug')
