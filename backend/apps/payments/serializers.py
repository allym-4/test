from rest_framework import serializers
from django.db.models import Sum
from .models import Payment, PaymentPlan, PaymentPlanInstalment
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
            'reference', 'created_by', 'created_by_name', 'created_at',
        )
        read_only_fields = ('id', 'created_by', 'created_at')


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
