from django.contrib import admin
from .models import Payment, PaymentPlan, PaymentPlanInstalment


class InstalmentInline(admin.TabularInline):
    model = PaymentPlanInstalment
    extra = 0


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('student', 'payment_type', 'amount', 'description', 'created_by', 'created_at')
    list_filter = ('payment_type',)
    search_fields = ('student__first_name', 'student__last_name', 'description')
    date_hierarchy = 'created_at'


@admin.register(PaymentPlan)
class PaymentPlanAdmin(admin.ModelAdmin):
    list_display = ('student', 'description', 'total_amount', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('student__first_name', 'student__last_name', 'description')
    inlines = [InstalmentInline]


@admin.register(PaymentPlanInstalment)
class PaymentPlanInstalmentAdmin(admin.ModelAdmin):
    list_display = ('plan', 'amount', 'due_date', 'paid_date', 'status')
    list_filter = ('status',)
    date_hierarchy = 'due_date'
