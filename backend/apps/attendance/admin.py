from django.contrib import admin
from .models import AttendanceRecord


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ('student', 'occurrence', 'status', 'no_show_fee_charged', 'no_show_fee_waived', 'recorded_by')
    list_filter = ('status', 'no_show_fee_charged', 'no_show_fee_waived')
    search_fields = ('student__first_name', 'student__last_name', 'occurrence__session__name')
    date_hierarchy = 'occurrence__date'
