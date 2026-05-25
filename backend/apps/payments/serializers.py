from rest_framework import serializers
from django.db.models import Sum
from .models import Payment, PaymentPlan, PaymentPlanInstalment, Package, StudentPackage, MembershipType, StudentMembership, GiftCard, PromoCode, CancellationOffer
from apps.users.serializers import UserMinimalSerializer


class PaymentSerializer(serializers.ModelSerializer):
    created_by_name = serializers.StringRelatedField(source='created_by')
    student_name = serializers.SerializerMethodField()

    def get_student_name(self, obj):
        if not obj.student_id:
            return None
        return obj.student.get_full_name() or obj.student.username

    class Meta:
        model = Payment
        fields = (
            'id', 'student', 'student_name', 'payment_type', 'amount', 'description',
            'reference', 'payment_method', 'stripe_payment_intent_id',
            'created_by', 'created_by_name', 'created_at',
            'cash_promised_date', 'cash_received', 'cash_reminder_sent_at', 'cash_auto_charge_at',
        )
        read_only_fields = ('id', 'created_by', 'created_at', 'cash_reminder_sent_at', 'cash_auto_charge_at')


class PaymentPlanInstalmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentPlanInstalment
        fields = ('id', 'plan', 'amount', 'due_date', 'paid_date', 'status')
        read_only_fields = ('id',)


class PaymentPlanSerializer(serializers.ModelSerializer):
    instalments = PaymentPlanInstalmentSerializer(many=True, read_only=True)
    amount_paid = serializers.ReadOnlyField()
    amount_remaining = serializers.ReadOnlyField()
    created_by_name = serializers.StringRelatedField(source='created_by')
    student_name = serializers.SerializerMethodField()

    def get_student_name(self, obj):
        if not obj.student_id:
            return None
        return obj.student.get_full_name() or obj.student.username

    class Meta:
        model = PaymentPlan
        fields = (
            'id', 'student', 'student_name', 'description', 'total_amount', 'status',
            'amount_paid', 'amount_remaining',
            'created_by', 'created_by_name', 'created_at', 'notes',
            'instalments',
        )
        read_only_fields = ('id', 'created_by', 'created_at')


class StudentBalanceSerializer(serializers.Serializer):
    student_id = serializers.IntegerField()
    balance = serializers.DecimalField(max_digits=8, decimal_places=2)
    total_charged = serializers.DecimalField(max_digits=8, decimal_places=2)
    total_paid = serializers.DecimalField(max_digits=8, decimal_places=2)


class PackageSerializer(serializers.ModelSerializer):
    active_count = serializers.SerializerMethodField()

    class Meta:
        model = Package
        fields = ('id', 'name', 'num_classes', 'price', 'expiry_days', 'is_active', 'is_intro', 'description', 'created_at', 'active_count')
        read_only_fields = ('id', 'created_at', 'active_count')

    def get_active_count(self, obj):
        return obj.purchases.filter(is_active=True).count()


class StudentPackageSerializer(serializers.ModelSerializer):
    package_name = serializers.StringRelatedField(source='package')

    class Meta:
        model = StudentPackage
        fields = ('id', 'student', 'package', 'package_name', 'classes_remaining', 'purchased_at', 'expires_at', 'is_active')
        read_only_fields = ('id', 'purchased_at')


class MembershipTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MembershipType
        fields = ('id', 'name', 'price', 'duration', 'classes_per_week', 'is_active', 'created_at')
        read_only_fields = ('id', 'created_at')


class StudentMembershipSerializer(serializers.ModelSerializer):
    membership_type_name = serializers.CharField(source='membership_type.name', read_only=True)
    student_name = serializers.CharField(source='student.display_name', read_only=True)

    class Meta:
        model = StudentMembership
        fields = ('id', 'student', 'student_name', 'membership_type', 'membership_type_name', 'status', 'start_date', 'end_date', 'created_at')
        read_only_fields = ('id', 'created_at')


class GiftCardSerializer(serializers.ModelSerializer):
    class Meta:
        model = GiftCard
        fields = (
            'id', 'code', 'value', 'balance', 'issued_to_name', 'issued_to_email',
            'purchased_by_name', 'purchased_by_phone', 'payment_type',
            'purchased_by', 'redeemed_by', 'redeemed_at', 'is_active', 'created_at', 'expires_at',
        )
        read_only_fields = ('id', 'created_at')


class PromoCodeSerializer(serializers.ModelSerializer):
    uses_display = serializers.SerializerMethodField()

    class Meta:
        model = PromoCode
        fields = ('id', 'code', 'discount_type', 'discount_value', 'applies_to', 'max_uses', 'current_uses', 'uses_display', 'is_active', 'expires_at', 'created_at')
        read_only_fields = ('id', 'current_uses', 'created_at')

    def get_uses_display(self, obj):
        if obj.max_uses is None:
            return f'{obj.current_uses} / unlimited'
        return f'{obj.current_uses} / {obj.max_uses}'


class CancellationOfferSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    occurrence_label = serializers.SerializerMethodField()
    session_name = serializers.SerializerMethodField()
    occurrence_date = serializers.SerializerMethodField()

    def get_student_name(self, obj):
        return obj.student.display_name

    def get_occurrence_label(self, obj):
        return str(obj.occurrence)

    def get_session_name(self, obj):
        return obj.occurrence.session.name

    def get_occurrence_date(self, obj):
        return str(obj.occurrence.date)

    class Meta:
        model = CancellationOffer
        fields = (
            'id', 'student', 'student_name', 'occurrence', 'occurrence_label',
            'session_name', 'occurrence_date', 'credit_amount', 'status',
            'email_sent', 'resolved_at', 'created_at',
        )
        read_only_fields = ('id', 'created_at', 'resolved_at', 'email_sent')
