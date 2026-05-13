from django.contrib import admin
from .models import Enrolment


@admin.register(Enrolment)
class EnrolmentAdmin(admin.ModelAdmin):
    list_display = ('student', 'class_session', 'enrolment_type', 'status', 'enrolled_date')
    list_filter = ('status', 'enrolment_type', 'class_session__studio')
    search_fields = ('student__first_name', 'student__last_name', 'class_session__name')
    date_hierarchy = 'enrolled_date'
